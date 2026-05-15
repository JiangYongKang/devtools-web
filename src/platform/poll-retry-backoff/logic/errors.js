import {
    ERROR_CODES,
    ERROR_MESSAGES
} from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN]
}

function createError(errorCode, message, context = {}) {
  const msg = message || getErrorMessage(errorCode)
  const error = new Error(msg)
  error.name = 'PollRetryBackoffError'
  error.errorCode = errorCode
  error.context = { ...context }
  error.timestamp = Date.now()
  return error
}

function wrapError(originalError, errorCode, context = {}) {
  if (originalError && originalError.errorCode && originalError.name === 'PollRetryBackoffError') {
    return originalError
  }

  const error = new Error(originalError?.message || getErrorMessage(errorCode))
  error.name = 'PollRetryBackoffError'
  error.errorCode = errorCode
  error.cause = originalError
  error.context = { ...context }
  error.timestamp = Date.now()
  return error
}

function isPollRetryBackoffError(error) {
  if (error == null) return false
  if (typeof error !== 'object') return false
  return (
    error.name === 'PollRetryBackoffError' &&
    typeof error.errorCode === 'string'
  )
}

function isAbortError(error) {
  if (!error) return false
  if (error.name === 'AbortError') return true
  if (error.name === 'PollRetryBackoffError' && error.errorCode === ERROR_CODES.ABORTED) return true
  if (error.code === 20) return true
  return false
}

function createAbortError(reason) {
  const error = new DOMException(reason || getErrorMessage(ERROR_CODES.ABORTED), 'AbortError')
  error.errorCode = ERROR_CODES.ABORTED
  return error
}

export {
    createAbortError, createError, getErrorMessage, isAbortError, isPollRetryBackoffError, wrapError
}

