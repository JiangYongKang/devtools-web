const VERSION = '1.0.0'

const ERROR_CODES = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  ABORTED: 'ABORTED',
  HTTP_ERROR: 'HTTP_ERROR',
  INVALID_URL: 'INVALID_URL',
  INTERCEPTOR_REJECTED: 'INTERCEPTOR_REJECTED',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
  CORS_PREFLIGHT_FAILED: 'CORS_PREFLIGHT_FAILED',
  INVALID_BASE_URL: 'INVALID_BASE_URL',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  UNKNOWN: 'UNKNOWN',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK]: '网络错误',
  [ERROR_CODES.TIMEOUT]: '请求超时',
  [ERROR_CODES.ABORTED]: '请求被取消',
  [ERROR_CODES.HTTP_ERROR]: 'HTTP 状态码错误',
  [ERROR_CODES.INVALID_URL]: '无效的 URL',
  [ERROR_CODES.INTERCEPTOR_REJECTED]: '拦截器拒绝请求',
  [ERROR_CODES.SERIALIZATION_ERROR]: '序列化错误',
  [ERROR_CODES.CORS_PREFLIGHT_FAILED]: 'CORS 预检失败',
  [ERROR_CODES.INVALID_BASE_URL]: '无效的 baseURL',
  [ERROR_CODES.INVALID_RESPONSE]: '无效的响应',
  [ERROR_CODES.UNKNOWN]: '未知错误',
}

const DEFAULT_TIMEOUT_MS = 30000
const MAX_TIMEOUT_MS = 600000
const MIN_TIMEOUT_MS = 0

const MAX_CAUSE_CHAIN_LENGTH = 5
const MAX_ERROR_MESSAGE_LENGTH = 2000

const DEFAULT_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
}

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
])

const PRESET_ENVIRONMENTS = {
  development: {
    name: 'Development',
    baseURL: 'http://localhost:3000/api',
    headers: {},
  },
  staging: {
    name: 'Staging',
    baseURL: 'https://staging.example.com/api',
    headers: {},
  },
  production: {
    name: 'Production',
    baseURL: 'https://api.example.com',
    headers: {},
  },
  httpbin: {
    name: 'HTTPBin',
    baseURL: 'https://httpbin.org',
    headers: {},
  },
}

const QUERY_ARRAY_FORMATS = {
  INDICES: 'indices',
  BRACKETS: 'brackets',
  REPEAT: 'repeat',
  COMMA: 'comma',
}

const DEFAULT_QUERY_ARRAY_FORMAT = QUERY_ARRAY_FORMATS.BRACKETS

const DEFAULT_DEDUPE_TTL_MS = 500

const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
}

const BODY_METHODS = new Set([
  HTTP_METHODS.POST,
  HTTP_METHODS.PUT,
  HTTP_METHODS.PATCH,
])

export {
  VERSION,
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
  MAX_CAUSE_CHAIN_LENGTH,
  MAX_ERROR_MESSAGE_LENGTH,
  DEFAULT_HEADERS,
  SENSITIVE_HEADER_NAMES,
  PRESET_ENVIRONMENTS,
  QUERY_ARRAY_FORMATS,
  DEFAULT_QUERY_ARRAY_FORMAT,
  DEFAULT_DEDUPE_TTL_MS,
  HTTP_METHODS,
  BODY_METHODS,
}
