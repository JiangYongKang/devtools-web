import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.INVALID_PAYLOAD]
}

function createError(errorCode, message, context = {}) {
  const msg = message || getErrorMessage(errorCode)
  const error = new Error(msg)
  error.name = 'CrossPanelEventBusError'
  error.errorCode = errorCode
  error.context = { ...context }
  return error
}

function wrapError(originalError, errorCode, context = {}) {
  if (originalError && originalError.errorCode && originalError.name === 'CrossPanelEventBusError') {
    return originalError
  }

  const error = new Error(originalError?.message || getErrorMessage(errorCode))
  error.name = 'CrossPanelEventBusError'
  error.errorCode = errorCode
  error.cause = originalError
  error.context = { ...context }
  return error
}

function isCrossPanelEventBusError(error) {
  if (error == null) return false
  if (typeof error !== 'object') return false
  return (
    error.name === 'CrossPanelEventBusError' &&
    typeof error.errorCode === 'string'
  )
}

export {
  getErrorMessage,
  createError,
  wrapError,
  isCrossPanelEventBusError,
}
