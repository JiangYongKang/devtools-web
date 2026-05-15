import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

export class PoolError extends Error {
  constructor(message, errorCode, cause = null) {
    super(message)
    this.name = 'PoolError'
    this.errorCode = errorCode
    this.cause = cause
  }
}

export function createError(errorCode, message = null, cause = null) {
  return new PoolError(
    message || ERROR_MESSAGES[errorCode] || 'Unknown error',
    errorCode,
    cause
  )
}

export function isPoolError(error) {
  return error instanceof PoolError
}

export function isAbortError(error) {
  return error && (
    error.name === 'AbortError' ||
    error.code === DOMException.ABORT_ERR
  )
}

export function wrapError(error, errorCode) {
  if (isPoolError(error)) {
    return error
  }
  return createError(errorCode, error?.message, error)
}

export function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || 'Unknown error'
}
