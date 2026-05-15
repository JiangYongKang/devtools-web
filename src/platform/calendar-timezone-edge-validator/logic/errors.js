const ERROR_CODES = {
  INVALID_DATE: 'InvalidDateError',
  INVALID_TIMEZONE: 'InvalidTimezoneError',
  INVALID_OFFSET: 'InvalidOffsetError',
  OUT_OF_RANGE: 'OutOfRangeError',
  PRE_GREGORIAN: 'PreGregorianError',
  TEMPORAL_NOT_AVAILABLE: 'TemporalNotAvailableError',
}

class CalendarValidationError extends Error {
  constructor(message, errorCode, details = {}) {
    super(message)
    this.name = 'CalendarValidationError'
    this.errorCode = errorCode
    this.details = details
  }
}

class TemporalPolyfillError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TemporalPolyfillError'
  }
}

export { ERROR_CODES, CalendarValidationError, TemporalPolyfillError }
