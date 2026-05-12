import {
    BODY_MODES,
    BROWSER_FORBIDDEN_HEADERS,
    CORS_SAFELISTED_RESPONSE_HEADERS,
    DEFAULT_PARAMS,
    DEFAULT_TIMEOUT_MS,
    ERROR_CODES,
    ERROR_MESSAGES,
    HTTP_METHODS,
    MAX_BODY_PREVIEW_LENGTH,
    MAX_TIMEOUT_MS,
    PRESET_TEMPLATES,
    SENSITIVE_HEADERS,
    VERSION,
} from './constants.js'

function isSensitiveHeader(name) {
  const lower = name?.toLowerCase() || ''
  return SENSITIVE_HEADERS.has(lower)
}

function isForbiddenHeader(name) {
  const lower = name?.toLowerCase() || ''
  return BROWSER_FORBIDDEN_HEADERS.has(lower)
}

function maskSensitiveValue(key, value, mask = '••••••••') {
  if (!isSensitiveHeader(key)) return value
  if (!value) return value
  return mask
}

function isValidHeaderName(name) {
  if (!name || typeof name !== 'string') return false
  if (name.includes('\n') || name.includes('\r') || name.includes('\0')) return false
  const trimmed = name.trim()
  if (!trimmed) return false
  if (trimmed.includes(' ')) return false
  return /^[!#$%&'*+\-.^_`|~0-9a-zA-Z]+$/.test(trimmed)
}

function isValidHeaderValue(value) {
  if (value == null) return false
  const str = String(value)
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    if (
      charCode === 0 ||
      charCode === 10 ||
      charCode === 13 ||
      charCode > 255
    ) {
      return false
    }
  }
  return true
}

function hasJavascriptSchema(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim().toLowerCase()
  return trimmed.startsWith('javascript:')
}

function buildUrl(baseUrl, queryParams = []) {
  let url = baseUrl || ''

  if (!url) {
    return { url: '', error: ERROR_CODES.INVALID_URL }
  }

  if (hasJavascriptSchema(url)) {
    return { url, error: ERROR_CODES.JAVASCRIPT_SCHEMA_DETECTED }
  }

  try {
    const urlObj = new URL(url)

    const enabledParams = queryParams.filter(
      (p) => p && p.enabled !== false && p.key
    )

    enabledParams.forEach((param) => {
      if (param.key && param.value != null) {
        urlObj.searchParams.append(param.key, String(param.value))
      }
    })

    return { url: urlObj.toString(), error: null }
  } catch {
    return { url, error: ERROR_CODES.INVALID_URL }
  }
}

function buildHeaders(headers) {
  const result = {}
  const warnings = []
  const errors = []

  const safeHeaders = headers || []
  const enabledHeaders = safeHeaders.filter(
    (h) => h && h.enabled !== false && h.key
  )

  for (const header of enabledHeaders) {
    const name = header.key.trim()
    const value = header.value

    if (!isValidHeaderName(name)) {
      errors.push({ header: name, reason: 'INVALID_NAME' })
      continue
    }

    if (!isValidHeaderValue(value)) {
      errors.push({ header: name, reason: 'INVALID_VALUE' })
      continue
    }

    if (isForbiddenHeader(name)) {
      warnings.push({
        header: name,
        reason: 'FORBIDDEN',
        message: `Header "${name}" 被浏览器禁止设置，将被忽略`,
      })
      continue
    }

    result[name] = String(value)

    if (isSensitiveHeader(name)) {
      warnings.push({
        header: name,
        reason: 'SENSITIVE',
        message: `检测到敏感头 "${name}"，请注意安全`,
      })
    }
  }

  return { headers: result, warnings, errors }
}

function buildJsonBody(body) {
  if (!body || typeof body !== 'string') {
    return { body: null, error: null }
  }

  const trimmed = body.trim()
  if (!trimmed) {
    return { body: null, error: null }
  }

  try {
    JSON.parse(trimmed)
    return { body: trimmed, error: null }
  } catch {
    return { body: null, error: ERROR_CODES.INVALID_JSON }
  }
}

function buildFormUrlEncoded(params = []) {
  const enabledParams = params.filter(
    (p) => p && p.enabled !== false && p.key
  )

  const searchParams = new URLSearchParams()
  enabledParams.forEach((param) => {
    if (param.key && param.value != null) {
      searchParams.append(param.key, String(param.value))
    }
  })

  const body = searchParams.toString()
  return {
    body: body || null,
  }
}

function buildFormData(params = []) {
  const enabledParams = params.filter(
    (p) => p && p.enabled !== false && p.key
  )

  return {
    entries: enabledParams.map((p) => ({
      key: p.key,
      value: p.value != null ? String(p.value) : '',
    })),
  }
}

function buildFetchInit(params) {
  const {
    method = 'GET',
    url: baseUrl,
    queryParams = [],
    headers = [],
    bodyMode = 'none',
    rawBody = '',
    jsonBody = '',
    formData = [],
    formUrlEncoded = [],
    timeout = DEFAULT_TIMEOUT_MS,
  } = params || {}

  const result = {
    url: '',
    init: {},
    warnings: [],
    errors: [],
  }

  const urlResult = buildUrl(baseUrl, queryParams)
  result.url = urlResult.url
  if (urlResult.error) {
    result.errors.push({ field: 'url', code: urlResult.error })
  }

  const headersResult = buildHeaders(headers)
  result.init.headers = headersResult.headers
  result.warnings.push(...headersResult.warnings)
  if (headersResult.errors.length > 0) {
    result.errors.push({
      field: 'headers',
      code: ERROR_CODES.INVALID_HEADER,
      details: headersResult.errors,
    })
  }

  const upperMethod = (method || 'GET').toUpperCase()
  result.init.method = upperMethod

  if (
    upperMethod !== 'GET' &&
    upperMethod !== 'HEAD' &&
    upperMethod !== 'OPTIONS'
  ) {
    switch (bodyMode) {
      case 'raw':
        result.init.body = rawBody || undefined
        break
      case 'json': {
        const jsonResult = buildJsonBody(jsonBody)
        if (jsonResult.error) {
          result.errors.push({ field: 'body', code: jsonResult.error })
        } else if (jsonResult.body) {
            result.init.body = jsonResult.body
            if (!result.init.headers['Content-Type'] && !result.init.headers['content-type']) {
              result.init.headers['Content-Type'] = 'application/json'
            }
          }
        break
      }
      case 'form-data': {
        const formResult = buildFormData(formData)
        if (formResult.entries.length > 0) {
          const fd = new FormData()
          formResult.entries.forEach((e) => {
            fd.append(e.key, e.value)
          })
          result.init.body = fd
        }
        break
      }
      case 'x-www-form-urlencoded': {
        const formResult = buildFormUrlEncoded(formUrlEncoded)
        if (formResult.body) {
          result.init.body = formResult.body
          if (!result.init.headers['Content-Type'] && !result.init.headers['content-type']) {
            result.init.headers['Content-Type'] = 'application/x-www-form-urlencoded'
          }
        }
        break
      }
      case 'none':
      default:
        break
    }
  }

  result.warnings = result.warnings || []
  result.errors = result.errors || []

  return result
}

function classifyFetchError(error) {
  if (!error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    }
  }

  const name = error.name || ''
  const message = error.message || ''
  const lowerMessage = message.toLowerCase()

  if (name === 'AbortError') {
    return {
      code: ERROR_CODES.ABORTED,
      message: ERROR_MESSAGES[ERROR_CODES.ABORTED],
    }
  }

  if (name === 'TimeoutError') {
    return {
      code: ERROR_CODES.TIMEOUT_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT_ERROR],
    }
  }

  if (name === 'TypeError') {
    if (
      lowerMessage.includes('cors') ||
      lowerMessage.includes('cross-origin') ||
      lowerMessage.includes('cross origin')
    ) {
      return {
        code: ERROR_CODES.CORS_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.CORS_ERROR],
      }
    }

    if (
      lowerMessage.includes('dns') ||
      lowerMessage.includes('failed to fetch') ||
      lowerMessage.includes('networkerror')
    ) {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
      }
    }

    return {
      code: ERROR_CODES.NETWORK_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
    }
  }

  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
  }
}

function headersToObject(headers) {
  const result = {}
  if (!headers) return result

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value
    })
  } else if (typeof headers.forEach === 'function') {
    headers.forEach((value, key) => {
      result[key] = value
    })
  } else if (typeof headers === 'object') {
    return { ...headers }
  }

  return result
}

function parseContentType(contentType) {
  if (!contentType) return { type: null, charset: null, boundary: null }

  const lower = contentType.toLowerCase()
  const parts = lower.split(';')
  const type = parts[0]?.trim() || null

  let charset = null
  let boundary = null

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim()
    if (part.startsWith('charset=')) {
      charset = part.slice('charset='.length)
    } else if (part.startsWith('boundary=')) {
      boundary = part.slice('boundary='.length)
    }
  }

  return { type, charset, boundary }
}

function isJsonContentType(contentType) {
  const { type } = parseContentType(contentType)
  if (!type) return false
  return (
    type === 'application/json' ||
    type.endsWith('+json') ||
    type.includes('/json')
  )
}

function isTextContentType(contentType) {
  const { type } = parseContentType(contentType)
  if (!type) return true
  return (
    type.startsWith('text/') ||
    type === 'application/json' ||
    type === 'application/xml' ||
    type === 'application/javascript' ||
    type === 'application/x-www-form-urlencoded'
  )
}

async function readResponseBody(response, maxLength = MAX_BODY_PREVIEW_LENGTH) {
  if (!response) {
    return {
      text: '',
      truncated: false,
      tooLarge: false,
      error: null,
      blob: null,
    }
  }

  try {
    const blob = await response.clone().blob()
    const size = blob.size

    const isText = isTextContentType(response.headers.get('content-type'))

    if (!isText) {
      return {
        text: '',
        truncated: false,
        tooLarge: false,
        error: null,
        blob,
        isBinary: true,
        size,
      }
    }

    if (size > maxLength) {
      const text = await blob.text()
      return {
        text: text.slice(0, maxLength),
        truncated: true,
        tooLarge: true,
        error: null,
        blob,
        size,
      }
    }

    const text = await blob.text()
    return {
      text,
      truncated: false,
      tooLarge: false,
      error: null,
      blob,
      size,
    }
  } catch (err) {
    return {
      text: '',
      truncated: false,
      tooLarge: false,
      error: {
        code: ERROR_CODES.BODY_PARSE_ERROR,
        message: err?.message || '响应体读取失败',
      },
      blob: null,
    }
  }
}

function tryParseJson(text) {
  if (!text || typeof text !== 'string') {
    return { json: null, error: null }
  }

  try {
    const parsed = JSON.parse(text)
    return { json: parsed, error: null }
  } catch (err) {
    return {
      json: null,
      error: {
        code: ERROR_CODES.BODY_PARSE_ERROR,
        message: err?.message || 'JSON 解析失败',
      },
    }
  }
}

function summarizeResponse(meta) {
  const {
    response,
    bodyText,
    bodyBlob,
    tooLarge,
    truncated,
    durationMs,
    redirected,
    redirectChain = [],
  } = meta || {}

  const result = {
    ok: false,
    status: response?.status || 0,
    statusText: response?.statusText || '',
    headers: {},
    body: {
      text: bodyText || '',
      json: null,
      blob: bodyBlob || null,
      truncated: truncated || false,
      tooLarge: tooLarge || false,
      size: bodyBlob?.size || (bodyText?.length || 0),
    },
    durationMs: durationMs || 0,
    redirected: redirected || false,
    redirectChain: redirectChain || [],
    contentType: null,
    isJson: false,
    hiddenHeaders: [],
    corsLimitations: [],
  }

  if (response) {
    result.ok = response.ok
    result.status = response.status
    result.statusText = response.statusText
    result.redirected = response.redirected
    result.type = response.type

    result.headers = headersToObject(response.headers)
    result.contentType = response.headers.get('content-type')
    result.isJson = isJsonContentType(result.contentType)

    if (result.isJson && bodyText) {
      const parseResult = tryParseJson(bodyText)
      if (parseResult.json) {
        result.body.json = parseResult.json
      }
    }

    const headerKeys = Object.keys(result.headers).map((k) => k.toLowerCase())
    const isCrossOrigin = response.type === 'cors'
    if (isCrossOrigin) {
      for (const key of headerKeys) {
        if (!CORS_SAFELISTED_RESPONSE_HEADERS.has(key)) {
          result.hiddenHeaders.push(key)
        }
      }
      if (result.hiddenHeaders.length > 0) {
        result.corsLimitations.push(
          '由于跨域限制，部分响应头可能无法访问，请确保服务器返回 Access-Control-Expose-Headers'
        )
      }
    }
  }

  return result
}

function buildHarEntry(params, responseSummary, startTime, endTime) {
  return {
    startedDateTime: new Date(startTime).toISOString(),
    time: endTime - startTime,
    request: {
      method: params?.method || 'GET',
      url: params?.url || '',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: Object.entries(params?.init?.headers || {}).map(([name, value]) => ({
        name,
        value,
      })),
      queryString: [],
      headersSize: -1,
      bodySize: -1,
    },
    response: {
      status: responseSummary?.status || 0,
      statusText: responseSummary?.statusText || '',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: Object.entries(responseSummary?.headers || {}).map(([name, value]) => ({
        name,
        value,
      })),
      headersSize: -1,
      bodySize: responseSummary?.body?.size || 0,
      redirectURL: '',
      body: {
        size: responseSummary?.body?.size || 0,
        mimeType: responseSummary?.contentType || '',
        text: responseSummary?.body?.text || '',
      },
    },
    cache: {},
    timings: {
      blocked: -1,
      dns: -1,
      connect: -1,
      send: -1,
      wait: -1,
      receive: -1,
      ssl: -1,
    },
  }
}

function exportHar(params, responseSummary, startTime, endTime) {
  return {
    log: {
      version: '1.2',
      creator: {
        name: 'HTTP Request Playground',
        version: VERSION,
      },
      pages: [],
      entries: [buildHarEntry(params, responseSummary, startTime, endTime)],
    },
  }
}

function requestParamsToTemplate(responseSummary) {
  if (!responseSummary || !responseSummary.headers) {
    return null
  }

  return {
    method: 'GET',
    url: '',
    queryParams: [],
    headers: [],
    bodyMode: 'none',
    rawBody: '',
    jsonBody: '',
    formData: [],
    formUrlEncoded: [],
    timeout: DEFAULT_TIMEOUT_MS,
  }
}

function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    if (!text) {
      reject(new Error('没有可复制的内容'))
      return
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(resolve).catch(reject)
      return
    }

    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.width = '1px'
      textarea.style.height = '1px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      resolve()
    } catch (err) {
      reject(err)
    }
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`
  }
  const seconds = (ms / 1000).toFixed(2)
  return `${seconds}s`
}

function getStatusCategory(status) {
  if (status >= 100 && status < 200) return 'info'
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'redirect'
  if (status >= 400 && status < 500) return 'client-error'
  if (status >= 500 && status < 600) return 'server-error'
  return 'unknown'
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
}

function getPresetTemplates() {
  return [...PRESET_TEMPLATES]
}

function getDefaultParams() {
  return { ...DEFAULT_PARAMS }
}

export {
    BODY_MODES, BROWSER_FORBIDDEN_HEADERS, buildFetchInit, buildFormData, buildFormUrlEncoded, buildHarEntry, buildHeaders,
    buildJsonBody, buildUrl, classifyFetchError, copyToClipboard, CORS_SAFELISTED_RESPONSE_HEADERS, DEFAULT_TIMEOUT_MS, downloadBlob, ERROR_CODES,
    ERROR_MESSAGES, exportHar, formatDuration, getDefaultParams, getErrorMessage,
    getPresetTemplates, getStatusCategory, hasJavascriptSchema, headersToObject, HTTP_METHODS, isForbiddenHeader, isJsonContentType, isSensitiveHeader, isTextContentType, isValidHeaderName,
    isValidHeaderValue, maskSensitiveValue, MAX_BODY_PREVIEW_LENGTH, MAX_TIMEOUT_MS, parseContentType, readResponseBody, requestParamsToTemplate, SENSITIVE_HEADERS, summarizeResponse, tryParseJson, VERSION
}

