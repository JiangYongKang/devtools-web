import {
  SAFELIST_METHODS,
  SAFELIST_HEADERS_LOWERCASE,
  SAFELIST_CONTENT_TYPES_LOWERCASE,
  PREFLIGHT_TRIGGER_REASONS,
} from './constants.js'

function isSafelistMethod(method) {
  if (!method) return false
  return SAFELIST_METHODS.has(method.toUpperCase())
}

function normalizeContentType(contentType) {
  if (!contentType) return ''
  const lower = contentType.toLowerCase()
  const semicolonIndex = lower.indexOf(';')
  if (semicolonIndex !== -1) {
    return lower.slice(0, semicolonIndex).trim()
  }
  return lower.trim()
}

function isSafelistContentType(contentType) {
  if (!contentType) return true
  const normalized = normalizeContentType(contentType)
  return SAFELIST_CONTENT_TYPES_LOWERCASE.has(normalized)
}

function isSafelistHeader(headerName) {
  if (!headerName) return false
  const lower = headerName.toLowerCase().trim()
  return SAFELIST_HEADERS_LOWERCASE.has(lower)
}

function getNonSafelistHeaders(headers) {
  if (!Array.isArray(headers)) return []
  return headers.filter(header => {
    if (!header || !header.name) return false
    return !isSafelistHeader(header.name)
  })
}

function getRequestContentType(headers) {
  if (!Array.isArray(headers)) return null
  const contentTypeHeader = headers.find(h =>
    h && h.name && h.name.toLowerCase() === 'content-type'
  )
  return contentTypeHeader ? contentTypeHeader.value : null
}

function getPreflightTriggerReasons(request) {
  const { origin, method, headers = [] } = request
  const reasons = []

  if (!isSafelistMethod(method)) {
    reasons.push({
      type: PREFLIGHT_TRIGGER_REASONS.NON_SAFELIST_METHOD,
      message: `方法 ${method || '(未设置)'} 不在 safelist 中`,
      detail: 'safelist 方法：GET, HEAD, POST',
    })
  }

  const nonSafelistHeaders = getNonSafelistHeaders(headers)
  if (nonSafelistHeaders.length > 0) {
    const headerNames = nonSafelistHeaders.map(h => h.name).join(', ')
    reasons.push({
      type: PREFLIGHT_TRIGGER_REASONS.NON_SAFELIST_HEADER,
      message: `存在非 safelist 请求头：${headerNames}`,
      detail: 'safelist 请求头：Accept, Accept-Language, Content-Language, Content-Type',
    })
  }

  const contentType = getRequestContentType(headers)
  if (contentType && !isSafelistContentType(contentType)) {
    reasons.push({
      type: PREFLIGHT_TRIGGER_REASONS.NON_SAFELIST_CONTENT_TYPE,
      message: `Content-Type ${contentType} 不在 safelist 中`,
      detail: 'safelist Content-Type：application/x-www-form-urlencoded, multipart/form-data, text/plain',
    })
  }

  return reasons
}

function classifyRequest(request) {
  const { origin, method, headers = [], withCredentials = false } = request

  const triggerReasons = getPreflightTriggerReasons(request)
  const requiresPreflight = triggerReasons.length > 0

  return {
    isSimpleRequest: !requiresPreflight,
    requiresPreflight,
    triggerReasons,
    method: method || '',
    origin: origin || '',
    headersCount: headers.length,
    withCredentials,
    summary: requiresPreflight
      ? `需要预检：${triggerReasons.length} 个触发条件`
      : '简单请求，无需预检',
  }
}

export {
  isSafelistMethod,
  normalizeContentType,
  isSafelistContentType,
  isSafelistHeader,
  getNonSafelistHeaders,
  getRequestContentType,
  getPreflightTriggerReasons,
  classifyRequest,
}
