import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.INVALID_REQUEST]
}

function truncateString(str, maxLen) {
  if (!str || typeof str !== 'string') return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

function createError(errorCode, message, context = {}) {
  const msg = message || getErrorMessage(errorCode)
  const error = new Error(msg)
  error.name = 'RequestCorrelationError'
  error.errorCode = errorCode
  error.context = { ...context }
  return error
}

function wrapError(originalError, errorCode, context = {}) {
  if (originalError && originalError.errorCode && originalError.name === 'RequestCorrelationError') {
    return originalError
  }

  const error = new Error(originalError?.message || getErrorMessage(errorCode))
  error.name = 'RequestCorrelationError'
  error.errorCode = errorCode
  error.cause = originalError
  error.context = { ...context }
  return error
}

function isRequestCorrelationError(error) {
  if (error == null) return false
  if (typeof error !== 'object') return false
  return (
    error.name === 'RequestCorrelationError' &&
    typeof error.errorCode === 'string'
  )
}

export {
  getErrorMessage,
  truncateString,
  createError,
  wrapError,
  isRequestCorrelationError,
}
