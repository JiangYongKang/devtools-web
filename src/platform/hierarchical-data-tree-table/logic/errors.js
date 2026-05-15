import { ERROR_CODES } from './constants.js'

class TreeTableError extends Error {
  constructor(code, message, cause) {
    super(message)
    this.name = 'TreeTableError'
    this.code = code
    this.cause = cause
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      cause: this.cause?.message,
    }
  }
}

const createError = (code, message, cause) => {
  return new TreeTableError(code, message, cause)
}

const wrapError = (code, message, cause) => {
  if (cause instanceof TreeTableError) {
    return cause
  }
  return createError(code, message, cause)
}

const getErrorMessage = (error) => {
  if (error instanceof TreeTableError) {
    return error.message
  }
  return error?.message || 'Unknown error'
}

const isTreeTableError = (error) => {
  return error instanceof TreeTableError
}

const getErrorCode = (error) => {
  if (error instanceof TreeTableError) {
    return error.code
  }
  return ERROR_CODES.UNKNOWN_ERROR
}

export {
  TreeTableError,
  createError,
  wrapError,
  getErrorMessage,
  isTreeTableError,
  getErrorCode,
}
