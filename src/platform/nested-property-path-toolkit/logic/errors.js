import { ERROR_CODES } from './constants.js'

class PathError extends Error {
  constructor(message, code, offset = null, path = null) {
    super(message)
    this.name = 'PathError'
    this.code = code
    this.offset = offset
    this.path = path
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      offset: this.offset,
      path: this.path,
    }
  }
}

class ValidationError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message)
    this.name = 'ValidationError'
    this.code = ERROR_CODES.VALIDATION_ERROR
    this.fieldErrors = fieldErrors
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      fieldErrors: this.fieldErrors,
    }
  }
}

class PrototypePollutionError extends Error {
  constructor(key) {
    super(`Prototype pollution attempt detected for key: ${key}`)
    this.name = 'PrototypePollutionError'
    this.code = ERROR_CODES.PROTOTYPE_POLLUTION_ATTEMPT
    this.key = key
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      key: this.key,
    }
  }
}

export { PathError, ValidationError, PrototypePollutionError }
