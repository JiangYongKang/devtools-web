import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN]
}

function createError(errorCode, message, context = {}) {
  const msg = message || getErrorMessage(errorCode)
  const error = new Error(msg)
  error.name = 'LargeContentPerformanceError'
  error.errorCode = errorCode
  error.context = { ...context }
  return error
}

function wrapError(originalError, errorCode, context = {}) {
  if (originalError && originalError.name === 'LargeContentPerformanceError') {
    return originalError
  }

  const error = new Error(originalError?.message || getErrorMessage(errorCode))
  error.name = 'LargeContentPerformanceError'
  error.errorCode = errorCode
  error.cause = originalError
  error.context = { ...context }
  return error
}

function isLargeContentError(error) {
  if (error == null) return false
  if (typeof error !== 'object') return false
  return (
    error.name === 'LargeContentPerformanceError' &&
    typeof error.errorCode === 'string'
  )
}

function getErrorCode(error) {
  if (isLargeContentError(error)) {
    return error.errorCode
  }
  return ERROR_CODES.UNKNOWN
}

export {
  createError,
  wrapError,
  getErrorMessage,
  isLargeContentError,
  getErrorCode,
}
