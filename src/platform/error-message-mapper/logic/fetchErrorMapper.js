import {
  DOMAINS,
  ERROR_CODES,
  DEFAULT_RETRYABLE_HTTP_STATUS,
  DEFAULT_RETRY_DELAY_SECONDS,
  SEVERITY,
} from './constants.js'
import {
  buildMergedMappings,
  mapError,
  parseRetryAfter,
  extractCauseChain,
} from './mappingLogic.js'

function isAbortError(error) {
  if (!error) return false
  if (error.name === 'AbortError') return true
  if (error.constructor && error.constructor.name === 'AbortError') return true
  if (error.code === DOMException.ABORT_ERR) return true
  return false
}

function isNetworkError(error) {
  if (!error) return false

  if (error instanceof TypeError) {
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('fetch') ||
        msg.includes('network') ||
        msg.includes('xmlhttprequest') ||
        msg.includes('failed to load')) {
      return true
    }
  }

  if (error instanceof DOMException && error.name === 'NetworkError') {
    return true
  }

  return false
}

function classifyError(error) {
  if (isAbortError(error)) {
    return {
      domain: DOMAINS.HTTP,
      businessCode: 'ABORTED',
      httpStatus: null,
    }
  }

  if (isNetworkError(error)) {
    return {
      domain: DOMAINS.HTTP,
      businessCode: 'NETWORK',
      httpStatus: null,
    }
  }

  if (error && error.name === 'TimeoutError') {
    return {
      domain: DOMAINS.HTTP,
      businessCode: 'TIMEOUT',
      httpStatus: null,
    }
  }

  if (error && error instanceof DOMException) {
    return {
      domain: DOMAINS.HTTP,
      businessCode: error.name,
      httpStatus: null,
    }
  }

  return {
    domain: DOMAINS.HTTP,
    businessCode: null,
    httpStatus: null,
  }
}

function mapFetchError(error, responseMeta, options = {}) {
  const {
    locale = 'en',
    fallbackLocale = 'en',
    mergedMappings = buildMergedMappings(),
  } = options

  let input = {
    domain: DOMAINS.HTTP,
    httpStatus: null,
    businessCode: null,
  }

  if (responseMeta && typeof responseMeta === 'object') {
    if (typeof responseMeta.status === 'number') {
      input.httpStatus = responseMeta.status
    }

    if (typeof responseMeta.statusText === 'string') {
    }

    if (typeof responseMeta.businessCode === 'string') {
      input.businessCode = responseMeta.businessCode
    }
  }

  if (error) {
    const classified = classifyError(error)
    
    if (classified.businessCode) {
      input.businessCode = classified.businessCode
    }
  }

  const result = mapError(input, {
    mergedMappings,
    locale,
    fallbackLocale,
    cause: error,
  })

  if (responseMeta && typeof responseMeta === 'object' && responseMeta.headers) {
    const retryAfterSeconds = parseRetryAfter(responseMeta.headers)
    if (retryAfterSeconds !== null) {
      result.retryable = true
      result.suggestedRetryDelaySeconds = retryAfterSeconds
    }
  }

  if (result.retryable === false && input.httpStatus !== null) {
    if (DEFAULT_RETRYABLE_HTTP_STATUS.has(input.httpStatus)) {
      result.retryable = true
    }
  }

  return result
}

export {
  isAbortError,
  isNetworkError,
  classifyError,
  mapFetchError,
}
