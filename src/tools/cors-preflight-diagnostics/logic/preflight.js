import { getNonSafelistHeaders } from './classifier.js'
import { ERROR_TYPES } from './constants.js'

function buildPreflightRequest(request) {
  const { origin, method, headers = [] } = request
  const nonSafelistHeaders = getNonSafelistHeaders(headers)
  const headerNames = nonSafelistHeaders.map(h => h.name.toLowerCase())

  const contentTypeHeader = headers.find(h =>
    h && h.name && h.name.toLowerCase() === 'content-type'
  )
  if (contentTypeHeader) {
    const hasContentType = headerNames.includes('content-type')
    if (!hasContentType) {
      headerNames.push('content-type')
    }
  }

  return {
    method: 'OPTIONS',
    url: request.url || '',
    headers: {
      Origin: origin || '',
      'Access-Control-Request-Method': method || '',
      'Access-Control-Request-Headers': headerNames.sort().join(', '),
    },
    description: '浏览器自动发送的预检请求',
  }
}

function buildPreflightResponseHeaders(responseConfig) {
  const {
    allowOrigin = '',
    allowMethods = [],
    allowHeaders = [],
    allowCredentials = false,
    maxAge = null,
    exposeHeaders = [],
  } = responseConfig

  const headers = {}

  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin
  }

  if (allowMethods.length > 0) {
    headers['Access-Control-Allow-Methods'] = allowMethods.join(', ')
  }

  if (allowHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = allowHeaders.join(', ')
  }

  if (allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  if (maxAge !== null && maxAge > 0) {
    headers['Access-Control-Max-Age'] = String(maxAge)
  }

  if (exposeHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = exposeHeaders.join(', ')
  }

  if (allowOrigin && allowOrigin !== '*') {
    headers['Vary'] = 'Origin'
  }

  return headers
}

function isOriginAllowed(requestOrigin, allowOrigin) {
  if (!allowOrigin) return false
  if (allowOrigin === '*') return true
  if (allowOrigin === 'null') return requestOrigin === 'null'
  return requestOrigin === allowOrigin
}

function isMethodAllowed(requestMethod, allowMethods) {
  if (!Array.isArray(allowMethods) || allowMethods.length === 0) return false
  const upperMethod = requestMethod?.toUpperCase() || ''
  return allowMethods.some(m => m.toUpperCase() === upperMethod || m === '*')
}

function isHeadersAllowed(requestHeaders, allowHeaders) {
  if (!Array.isArray(requestHeaders)) return true
  if (!Array.isArray(allowHeaders)) return false

  const allowHeadersLower = allowHeaders.map(h => h.toLowerCase().trim())

  if (allowHeadersLower.includes('*')) {
    return { allowed: true, missingHeaders: [] }
  }

  const nonSafelistHeaders = getNonSafelistHeaders(requestHeaders)
  const headerNames = nonSafelistHeaders.map(h => h.name.toLowerCase().trim())

  const contentTypeHeader = requestHeaders.find(h =>
    h && h.name && h.name.toLowerCase() === 'content-type'
  )
  if (contentTypeHeader && !headerNames.includes('content-type')) {
    headerNames.push('content-type')
  }

  const missingHeaders = headerNames.filter(h => !allowHeadersLower.includes(h))

  return {
    allowed: missingHeaders.length === 0,
    missingHeaders,
  }
}

function validatePreflightResponse(request, responseConfig) {
  const { origin, method, headers = [], withCredentials = false } = request
  const {
    allowOrigin = '',
    allowMethods = [],
    allowHeaders = [],
    allowCredentials = false,
  } = responseConfig

  const errors = []

  if (!allowOrigin) {
    errors.push({
      type: ERROR_TYPES.MISSING_ALLOW_ORIGIN,
      message: '缺少 Access-Control-Allow-Origin 响应头',
      severity: 'error',
    })
  } else if (!isOriginAllowed(origin, allowOrigin)) {
    errors.push({
      type: ERROR_TYPES.ORIGIN_NOT_ALLOWED,
      message: `Origin "${origin}" 不在允许列表中`,
      detail: `当前允许的 Origin: ${allowOrigin}`,
      severity: 'error',
    })
  }

  if (withCredentials && allowOrigin === '*') {
    errors.push({
      type: ERROR_TYPES.CREDENTIALS_WILDCARD_CONFLICT,
      message: '携带凭证时不允许使用通配符 (*)',
      detail: '当 withCredentials 为 true 时，Access-Control-Allow-Origin 必须指定具体的 Origin',
      severity: 'error',
    })
  }

  if (withCredentials && !allowCredentials) {
    errors.push({
      type: ERROR_TYPES.CREDENTIALS_REQUIRED_BUT_MISSING,
      message: '请求携带凭证但响应未允许',
      detail: '需要设置 Access-Control-Allow-Credentials: true',
      severity: 'error',
    })
  }

  if (!isMethodAllowed(method, allowMethods)) {
    errors.push({
      type: ERROR_TYPES.METHOD_NOT_ALLOWED,
      message: `方法 "${method}" 不在允许列表中`,
      detail: `当前允许的方法: ${allowMethods.join(', ') || '(未设置)'}`,
      severity: 'error',
    })
  }

  const headersCheck = isHeadersAllowed(headers, allowHeaders)
  if (!headersCheck.allowed) {
    errors.push({
      type: ERROR_TYPES.HEADERS_NOT_ALLOWED,
      message: `请求头不在允许列表中: ${headersCheck.missingHeaders.join(', ')}`,
      detail: `当前允许的请求头: ${allowHeaders.join(', ') || '(未设置)'}`,
      severity: 'error',
      missingHeaders: headersCheck.missingHeaders,
    })
  }

  const passed = errors.filter(e => e.severity === 'error').length === 0

  return {
    passed,
    errors,
    warnings: [],
    summary: passed ? '预检通过，浏览器将放行实际请求' : '预检失败，浏览器将阻止实际请求',
  }
}

function validateSimpleRequest(request, responseConfig) {
  const { origin, withCredentials = false } = request
  const { allowOrigin = '', allowCredentials = false } = responseConfig

  const errors = []

  if (!allowOrigin) {
    errors.push({
      type: ERROR_TYPES.MISSING_ALLOW_ORIGIN,
      message: '缺少 Access-Control-Allow-Origin 响应头',
      severity: 'error',
    })
  } else if (!isOriginAllowed(origin, allowOrigin)) {
    errors.push({
      type: ERROR_TYPES.ORIGIN_NOT_ALLOWED,
      message: `Origin "${origin}" 不在允许列表中`,
      detail: `当前允许的 Origin: ${allowOrigin}`,
      severity: 'error',
    })
  }

  if (withCredentials && allowOrigin === '*') {
    errors.push({
      type: ERROR_TYPES.CREDENTIALS_WILDCARD_CONFLICT,
      message: '携带凭证时不允许使用通配符 (*)',
      severity: 'error',
    })
  }

  if (withCredentials && !allowCredentials) {
    errors.push({
      type: ERROR_TYPES.CREDENTIALS_REQUIRED_BUT_MISSING,
      message: '请求携带凭证但响应未允许',
      severity: 'error',
    })
  }

  const passed = errors.length === 0

  return {
    passed,
    errors,
    summary: passed ? 'CORS 检查通过' : 'CORS 检查失败，浏览器将阻止响应',
  }
}

export {
  buildPreflightRequest,
  buildPreflightResponseHeaders,
  isOriginAllowed,
  isMethodAllowed,
  isHeadersAllowed,
  validatePreflightResponse,
  validateSimpleRequest,
}
