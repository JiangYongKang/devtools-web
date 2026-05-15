const VERSION = '1.0.0'

const ERROR_CODES = {
  INVALID_ID_FORMAT: 'INVALID_ID_FORMAT',
  INVALID_ID_LENGTH: 'INVALID_ID_LENGTH',
  SESSION_PROVIDER_ERROR: 'SESSION_PROVIDER_ERROR',
  LOG_BUFFER_OVERFLOW: 'LOG_BUFFER_OVERFLOW',
  INVALID_REQUEST: 'INVALID_REQUEST',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_ID_FORMAT]: '无效的 ID 格式',
  [ERROR_CODES.INVALID_ID_LENGTH]: '无效的 ID 长度',
  [ERROR_CODES.SESSION_PROVIDER_ERROR]: 'SessionProvider 执行错误',
  [ERROR_CODES.LOG_BUFFER_OVERFLOW]: '日志缓冲溢出',
  [ERROR_CODES.INVALID_REQUEST]: '无效的请求',
}

const DEFAULT_LOG_BUFFER_SIZE = 1000

const DEFAULT_MAX_LOG_ENTRY_JSON_LENGTH = 4096

const DEFAULT_SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'api_token',
  'secret',
  'password',
  'passwd',
  'pwd',
  'credit_card',
  'cc',
  'ssn',
  'sin',
  'auth',
  'authorization',
  'session',
  'session_id',
  'cookie',
])

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-session-id',
])

const DEFAULT_TRACE_HEADER_NAME = 'traceparent'

const DEFAULT_REQUEST_ID_HEADER_NAME = 'X-Request-Id'

const DEFAULT_SESSION_ID_HEADER_NAME = 'X-Session-Id'

const ID_MODES = {
  UUID_V4: 'uuid_v4',
  HEX_32: 'hex_32',
}

const SPAN_SHARE_MODES = {
  SHARE: 'share',
  DERIVE: 'derive',
}

const TRACE_VERSION = '00'

export {
  VERSION,
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_LOG_BUFFER_SIZE,
  DEFAULT_MAX_LOG_ENTRY_JSON_LENGTH,
  DEFAULT_SENSITIVE_QUERY_KEYS,
  SENSITIVE_HEADER_NAMES,
  DEFAULT_TRACE_HEADER_NAME,
  DEFAULT_REQUEST_ID_HEADER_NAME,
  DEFAULT_SESSION_ID_HEADER_NAME,
  ID_MODES,
  SPAN_SHARE_MODES,
  TRACE_VERSION,
}
