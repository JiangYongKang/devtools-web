import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.SANITIZATION_ERROR]
}

function createError(code, customMessage = null, details = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
    details,
    timestamp: Date.now(),
  }
}

function isValidErrorCode(code) {
  return Object.values(ERROR_CODES).includes(code)
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isValidErrorCode,
}
