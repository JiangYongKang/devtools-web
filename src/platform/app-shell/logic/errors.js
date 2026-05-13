import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.INVALID_TOOL_ID]
}

function createError(errorCode, message, extra = {}) {
  const msg = message || getErrorMessage(errorCode)
  return {
    errorCode,
    errorMessage: msg,
    ...extra,
  }
}

function isAppShellError(error) {
  if (!error || typeof error !== 'object') {
    return false
  }
  return !!(error.errorCode && error.errorMessage)
}

export {
  getErrorMessage,
  createError,
  isAppShellError,
}
