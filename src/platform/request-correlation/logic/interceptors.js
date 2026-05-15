import {
  DEFAULT_REQUEST_ID_HEADER_NAME,
  DEFAULT_SESSION_ID_HEADER_NAME,
  DEFAULT_TRACE_HEADER_NAME,
  ID_MODES,
  SPAN_SHARE_MODES,
} from './constants.js'
import {
  generateRequestId,
  generateTraceId,
  generateSpanId,
  formatTraceParent,
  parseTraceParent,
  deriveSpanId,
  detectSpanIdCollision,
  normalizeRequestId,
  isValidRequestId,
} from './idGenerator.js'
import {
  createNoopSessionProvider,
} from './sessionProvider.js'

function createRequestContext(options = {}) {
  const {
    requestId,
    sessionId,
    traceId,
    spanId,
    traceParent,
    spanShareMode = SPAN_SHARE_MODES.DERIVE,
    idMode = ID_MODES.UUID_V4,
    usedSpanIds = new Set(),
  } = options

  let currentRequestId = requestId || generateRequestId(idMode)
  let currentTraceId = traceId
  let currentSpanId = spanId
  let parentSpanId = null
  const usedSpans = new Set(usedSpanIds)

  if (traceParent) {
    const parsed = parseTraceParent(traceParent)
    if (parsed) {
      currentTraceId = currentTraceId || parsed.traceId
      parentSpanId = parsed.parentSpanId
      if (!currentSpanId) {
        let derived = deriveSpanId(parsed.parentSpanId)
        let attempts = 0
        while (detectSpanIdCollision(derived, usedSpans) && attempts < 10) {
          derived = generateSpanId()
          attempts++
        }
        currentSpanId = derived
      }
    }
  }

  if (!currentTraceId) {
    currentTraceId = generateTraceId()
  }
  if (!currentSpanId) {
    currentSpanId = generateSpanId()
  }
  usedSpans.add(currentSpanId)

  return {
    requestId: currentRequestId,
    sessionId,
    traceId: currentTraceId,
    spanId: currentSpanId,
    parentSpanId,
    spanShareMode,
    idMode,
    usedSpanIds: usedSpans,
    getTraceParent: (flags = '01') => {
      return formatTraceParent({
        traceId: currentTraceId,
        spanId: currentSpanId,
        traceFlags: flags,
      })
    },
    deriveNext: (options = {}) => {
      const nextMode = options.spanShareMode || spanShareMode
      let nextSpanId = currentSpanId

      if (nextMode === SPAN_SHARE_MODES.DERIVE) {
        let derived = deriveSpanId(currentSpanId, options.salt || '')
        let attempts = 0
        while (detectSpanIdCollision(derived, usedSpans) && attempts < 10) {
          derived = generateSpanId()
          attempts++
        }
        nextSpanId = derived
        usedSpans.add(nextSpanId)
      }

      return createRequestContext({
        requestId: options.requestId || currentRequestId,
        sessionId: options.sessionId || sessionId,
        traceId: currentTraceId,
        spanId: nextSpanId,
        spanShareMode: nextMode,
        idMode,
        usedSpanIds: usedSpans,
      })
    },
    clone: (override = {}) => {
      return createRequestContext({
        requestId: override.requestId || currentRequestId,
        sessionId: override.sessionId || sessionId,
        traceId: override.traceId || currentTraceId,
        spanId: override.spanId || currentSpanId,
        spanShareMode: override.spanShareMode || spanShareMode,
        idMode,
        usedSpanIds: usedSpans,
      })
    },
  }
}

function applyHeaders(init, context, options = {}) {
  const result = init ? { ...init } : {}
  result.headers = result.headers ? { ...result.headers } : {}

  const {
    requestIdHeaderName = DEFAULT_REQUEST_ID_HEADER_NAME,
    sessionIdHeaderName = DEFAULT_SESSION_ID_HEADER_NAME,
    traceHeaderName = DEFAULT_TRACE_HEADER_NAME,
    includeSessionId = false,
    includeTraceParent = true,
    allowOverride = true,
  } = options

  const existingRequestId = result.headers[requestIdHeaderName] ||
    result.headers[requestIdHeaderName.toLowerCase()]

  if (existingRequestId && allowOverride) {
    const normalized = normalizeRequestId(existingRequestId)
    context = context.clone({ requestId: normalized })
  }

  result.headers[requestIdHeaderName] = context.requestId

  if (includeTraceParent) {
    result.headers[traceHeaderName] = context.getTraceParent()
  }

  if (includeSessionId && context.sessionId) {
    result.headers[sessionIdHeaderName] = context.sessionId
  }

  return result
}

function createRequestCorrelationInterceptor(options = {}) {
  const {
    sessionProvider = createNoopSessionProvider(),
    idMode = ID_MODES.UUID_V4,
    spanShareMode = SPAN_SHARE_MODES.DERIVE,
    requestIdHeaderName = DEFAULT_REQUEST_ID_HEADER_NAME,
    sessionIdHeaderName = DEFAULT_SESSION_ID_HEADER_NAME,
    traceHeaderName = DEFAULT_TRACE_HEADER_NAME,
    includeSessionId = false,
    includeTraceParent = true,
    logBuffer = null,
    emitLogForToast = null,
  } = options

  async function requestInterceptor(config) {
    const url = config.url || config.input
    const init = config.init || {}

    const contextOptions = {
      idMode,
      spanShareMode,
    }

    const existingHeaders = init.headers || {}
    const existingRequestId = existingHeaders[requestIdHeaderName] ||
      existingHeaders[requestIdHeaderName.toLowerCase()]

    if (existingRequestId && isValidRequestId(existingRequestId)) {
      contextOptions.requestId = existingRequestId
    }

    const existingTraceParent = existingHeaders[traceHeaderName] ||
      existingHeaders[traceHeaderName.toLowerCase()]

    if (existingTraceParent) {
      contextOptions.traceParent = existingTraceParent
    }

    if (includeSessionId && sessionProvider) {
      try {
        contextOptions.sessionId = await sessionProvider.getSessionId()
      } catch {
        contextOptions.sessionId = null
      }
    }

    const context = createRequestContext(contextOptions)

    const modifiedInit = applyHeaders(init, context, {
      requestIdHeaderName,
      sessionIdHeaderName,
      traceHeaderName,
      includeSessionId,
      includeTraceParent,
      allowOverride: true,
    })

    const startTime = Date.now()

    const result = {
      ...config,
      init: modifiedInit,
      correlationContext: context,
      _correlation: {
        startTime,
        requestId: context.requestId,
        url,
        method: init.method || 'GET',
      },
    }

    return result
  }

  function responseInterceptor(responseData, config) {
    const correlation = config?._correlation || responseData?._correlation

    if (!correlation) {
      return responseData
    }

    const endTime = Date.now()
    const durationMs = endTime - correlation.startTime

    if (logBuffer) {
      logBuffer.add({
        timestamp: endTime,
        level: responseData.status >= 400 ? 'warn' : 'info',
        requestId: correlation.requestId,
        method: correlation.method,
        url: correlation.url,
        status: responseData.status,
        durationMs,
      })
    }

    if (emitLogForToast && (
      responseData.status >= 500 ||
      responseData.errorCode === 'NETWORK'
    )) {
      emitLogForToast({
        requestId: correlation.requestId,
        status: responseData.status,
        errorCode: responseData.errorCode,
        message: responseData.message,
        metadata: {
          durationMs,
          method: correlation.method,
          url: correlation.url,
        },
      })
    }

    return responseData
  }

  function errorInterceptor(error, config) {
    const correlation = config?._correlation || error?._correlation

    if (!correlation) {
      throw error
    }

    const endTime = Date.now()
    const durationMs = endTime - correlation.startTime

    if (logBuffer) {
      logBuffer.add({
        timestamp: endTime,
        level: 'error',
        requestId: correlation.requestId,
        method: correlation.method,
        url: correlation.url,
        status: error.status,
        durationMs,
      })
    }

    if (emitLogForToast) {
      emitLogForToast({
        requestId: correlation.requestId,
        status: error.status,
        errorCode: error.errorCode || 'NETWORK',
        message: error.message,
        metadata: {
          durationMs,
          method: correlation.method,
          url: correlation.url,
        },
      })
    }

    error.requestId = correlation.requestId
    throw error
  }

  return {
    request: requestInterceptor,
    response: responseInterceptor,
    error: errorInterceptor,
  }
}

export {
  createRequestContext,
  applyHeaders,
  createRequestCorrelationInterceptor,
}
