import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

export { ERROR_CODES, ERROR_MESSAGES }

function createError(code, message, details = {}) {
  const error = new Error(message || ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN])
  error.code = code
  error.details = details
  error.isOtpRateLimitError = true
  return error
}

function createInvalidConfigError(message, details) {
  return createError(ERROR_CODES.INVALID_CONFIG, message, details)
}

function createInvalidStateTransitionError(fromState, event, details) {
  return createError(
    ERROR_CODES.INVALID_STATE_TRANSITION,
    `无法从状态 "${fromState}" 执行事件 "${event}"`,
    { fromState, event, ...details }
  )
}

function createRateLimitExceededError(details) {
  return createError(ERROR_CODES.RATE_LIMIT_EXCEEDED, null, details)
}

function createMaxAttemptsExceededError(details) {
  return createError(ERROR_CODES.MAX_ATTEMPTS_EXCEEDED, null, details)
}

function createNetworkError(originalError, details) {
  return createError(ERROR_CODES.NETWORK_ERROR, null, { originalError, ...details })
}

function createTooManyRequestsError(retryAfterSeconds, details) {
  return createError(
    ERROR_CODES.TOO_MANY_REQUESTS,
    `请求过于频繁，请 ${retryAfterSeconds} 秒后重试`,
    { retryAfterSeconds, ...details }
  )
}

function createClockRollbackError(details) {
  return createError(ERROR_CODES.CLOCK_ROLLBACK, null, details)
}

function createInvalidParameterError(paramName, details) {
  return createError(
    ERROR_CODES.INVALID_PARAMETER,
    `参数 "${paramName}" 无效`,
    { paramName, ...details }
  )
}

function isOtpRateLimitError(error) {
  return error && error.isOtpRateLimitError === true
}

function getErrorMessage(error) {
  if (isOtpRateLimitError(error)) {
    return error.message
  }
  return error?.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN]
}

function getErrorCode(error) {
  if (isOtpRateLimitError(error)) {
    return error.code
  }
  return ERROR_CODES.UNKNOWN
}

export {
  createClockRollbackError,
  createError,
  createInvalidConfigError,
  createInvalidParameterError,
  createInvalidStateTransitionError,
  createMaxAttemptsExceededError,
  createNetworkError,
  createRateLimitExceededError,
  createTooManyRequestsError,
  getErrorCode,
  getErrorMessage,
  isOtpRateLimitError,
}
