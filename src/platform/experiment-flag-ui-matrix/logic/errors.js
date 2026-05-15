import { ERROR_CODES, ERROR_MESSAGES } from './constants.js'

class FeatureFlagError extends Error {
  constructor(errorCode, message, details = null) {
    const baseMessage = message || ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN]
    super(baseMessage)
    
    this.name = 'FeatureFlagError'
    this.errorCode = errorCode
    this.details = details
    this.timestamp = Date.now()
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FeatureFlagError)
    }
  }

  toJSON() {
    return {
      name: this.name,
      errorCode: this.errorCode,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    }
  }

  toString() {
    return `[${this.errorCode}] ${this.message}`
  }
}

function createError(errorCode, message = null, details = null) {
  return new FeatureFlagError(errorCode, message, details)
}

function isFeatureFlagError(error) {
  return error instanceof FeatureFlagError
}

export {
  FeatureFlagError,
  createError,
  isFeatureFlagError,
}
