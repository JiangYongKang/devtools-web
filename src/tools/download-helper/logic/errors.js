import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function createError(code, customMessage = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
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
