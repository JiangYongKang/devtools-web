import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

export { ERROR_CODES, ERROR_MESSAGES }

export function createError(code, details = null) {
  return {
    errorCode: code,
    errorMessage: details ? `${ERROR_MESSAGES[code]}: ${details}` : ERROR_MESSAGES[code],
  }
}

export function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

export function isError(result) {
  return result && typeof result === 'object' && 'errorCode' in result
}
