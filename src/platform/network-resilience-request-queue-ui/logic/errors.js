import { ERROR_CODES } from './constants.js'

class NetworkResilienceError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'NetworkResilienceError'
    this.code = code
    this.details = details
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

const createError = (code, message, details = {}) => {
  return new NetworkResilienceError(code, message, details)
}

const wrapError = (originalError, code, details = {}) => {
  const message = originalError?.message || 'Unknown error'
  const error = new NetworkResilienceError(code, message, {
    ...details,
    originalError: originalError?.toJSON ? originalError.toJSON() : String(originalError),
  })
  error.stack = originalError?.stack
  return error
}

const isNetworkResilienceError = (error) => {
  return error instanceof NetworkResilienceError
}

const isObservationError = (error) => {
  return isNetworkResilienceError(error) && error.code === ERROR_CODES.OBSERVATION_FAILED
}

export {
  NetworkResilienceError,
  createError,
  wrapError,
  isNetworkResilienceError,
  isObservationError,
}
