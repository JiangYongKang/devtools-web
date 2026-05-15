import { ERROR_CODES, ERROR_MESSAGES, RECOVERY_HINTS } from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function getRecoveryHint(code) {
  return RECOVERY_HINTS[code] || null
}

function createError(code, customMessage = null, filename = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
    userMessage: customMessage || getErrorMessage(code),
    recoveryHint: getRecoveryHint(code),
    filename,
    recoverable: !!getRecoveryHint(code),
  }
}

function createDiagnostic(code, filename, details = {}) {
  return {
    errorCode: code,
    errorMessage: getErrorMessage(code),
    filename,
    details,
    recoveryHint: getRecoveryHint(code),
  }
}

function isValidErrorCode(code) {
  return Object.values(ERROR_CODES).includes(code)
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  RECOVERY_HINTS,
  getErrorMessage,
  getRecoveryHint,
  createError,
  createDiagnostic,
  isValidErrorCode,
}
