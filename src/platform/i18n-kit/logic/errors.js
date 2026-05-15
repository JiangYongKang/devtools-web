import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

export { ERROR_CODES, ERROR_MESSAGES }

export function createError(code, details = null) {
  return {
    errorCode: code,
    errorMessage: details
      ? `${ERROR_MESSAGES[code] || '未知错误'}: ${details}`
      : ERROR_MESSAGES[code] || '未知错误',
  }
}

export function isI18nError(obj) {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.errorCode === 'string' &&
    typeof obj.errorMessage === 'string'
  )
}

export function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}
