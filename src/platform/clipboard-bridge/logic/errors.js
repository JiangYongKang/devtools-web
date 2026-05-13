import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
}

function createError(code, customMessage = null, originalError = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
    originalError: originalError ? (originalError.message || String(originalError)) : null,
    originalName: originalError?.name || null,
  }
}

function isValidErrorCode(code) {
  return Object.values(ERROR_CODES).includes(code)
}

function classifyClipboardError(error, operation = 'unknown') {
  if (!error) {
    return createError(ERROR_CODES.UNKNOWN_ERROR, '未知错误')
  }

  const name = error.name || ''
  const message = error.message || ''
  const lowerName = name.toLowerCase()
  const lowerMsg = message.toLowerCase()

  if (lowerName === 'notallowederror' || lowerMsg.includes('not allowed')) {
    return createError(ERROR_CODES.NOT_ALLOWED, null, error)
  }

  if (lowerName === 'securityerror' || lowerMsg.includes('security')) {
    return createError(ERROR_CODES.SECURITY_ERROR, null, error)
  }

  if (lowerName === 'permissiondenied' || lowerName === 'notallowederror' ||
      lowerMsg.includes('permission denied') || lowerMsg.includes('user denied') ||
      lowerMsg.includes('user cancelled')) {
    return createError(ERROR_CODES.PERMISSION_DENIED, null, error)
  }

  if (lowerMsg.includes('user gesture') || lowerMsg.includes('transient user activation')) {
    return createError(ERROR_CODES.USER_GESTURE_REQUIRED, null, error)
  }

  if (lowerMsg.includes('not supported') || lowerMsg.includes('not implemented')) {
    return createError(ERROR_CODES.API_NOT_AVAILABLE, null, error)
  }

  if (lowerName === 'aborterror' || lowerMsg.includes('abort')) {
    return createError(ERROR_CODES.ABORTED, null, error)
  }

  const defaultMsg = operation === 'write'
    ? '写入剪贴板失败'
    : operation === 'read'
      ? '读取剪贴板失败'
      : '剪贴板操作失败'

  return createError(ERROR_CODES.UNKNOWN_ERROR, defaultMsg, error)
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isValidErrorCode,
  classifyClipboardError,
}
