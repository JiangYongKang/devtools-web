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
} from './constants.js'

export {
  getErrorMessage,
  truncateString,
  createError,
  wrapError,
  isRequestCorrelationError,
} from './errors.js'

export {
  generateUUIDv4,
  generate32BitHex,
  generateRequestId,
  isValidUUIDv4,
  isValid32Hex,
  isValidRequestId,
  normalizeRequestId,
  generateTraceId,
  generateSpanId,
  isValidTraceId,
  isValidSpanId,
  parseTraceParent,
  formatTraceParent,
  deriveSpanId,
  detectSpanIdCollision,
  hasCryptoRandomUUID,
  hasCryptoGetRandomValues,
} from './idGenerator.js'

export {
  createMemorySessionProvider,
  createLocalStorageSessionProvider,
  createNoopSessionProvider,
} from './sessionProvider.js'

export {
  sanitizeUrl,
  sanitizeQueryString,
  sanitizeHeaders,
  RingBuffer,
  LogBuffer,
  createLogBuffer,
  MASK_VALUE,
} from './logBuffer.js'

export {
  createRequestContext,
  applyHeaders,
  createRequestCorrelationInterceptor,
} from './interceptors.js'

export {
  mockFetch,
  createMockHttpClient,
} from './mockFetch.js'
