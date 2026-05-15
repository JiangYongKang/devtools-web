import { ERROR_CODES, ERROR_MESSAGES, RECOVERY_HINTS } from './constants.js'

function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
}

function getRecoveryHint(errorCode) {
  return RECOVERY_HINTS[errorCode] || ''
}

function createError(errorCode, customMessage = null, details = {}) {
  const message = customMessage || getErrorMessage(errorCode)
  return {
    errorCode,
    errorMessage: message,
    userMessage: message,
    recoveryHint: getRecoveryHint(errorCode),
    details,
    timestamp: Date.now(),
  }
}

function createSuccess(data = {}) {
  return {
    success: true,
    ...data,
  }
}

function createFailure(errorCode, customMessage = null, details = {}) {
  return {
    success: false,
    error: createError(errorCode, customMessage, details),
  }
}

function isValidErrorCode(errorCode) {
  return Object.values(ERROR_CODES).includes(errorCode)
}

function wrapError(error, fallbackCode = ERROR_CODES.UNKNOWN_ERROR) {
  if (error && error.errorCode && isValidErrorCode(error.errorCode)) {
    return error
  }

  return createError(
    fallbackCode,
    error?.message || null,
    { originalError: String(error) }
  )
}

export {
  getErrorMessage,
  getRecoveryHint,
  createError,
  createSuccess,
  createFailure,
  isValidErrorCode,
  wrapError,
}
