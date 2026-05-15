import {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_CAUSE_CHAIN_LENGTH,
  MAX_ERROR_MESSAGE_LENGTH,
} from './constants.js'

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN]
}

function truncateString(str, maxLen) {
  if (!str || typeof str !== 'string') return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

function extractCauseChain(error, maxDepth = MAX_CAUSE_CHAIN_LENGTH) {
  const chain = []
  let current = error
  let depth = 0

  while (current && depth < maxDepth) {
    const causeInfo = {
      message: truncateString(
        current.message || String(current),
        MAX_ERROR_MESSAGE_LENGTH
      ),
      name: current.name || 'Error',
    }

    if (current.errorCode) {
      causeInfo.errorCode = current.errorCode
    }

    if (current.code) {
      causeInfo.code = current.code
    }

    chain.push(causeInfo)

    if (current.cause) {
      current = current.cause
      depth++
    } else if (current.originalError) {
      current = current.originalError
      depth++
    } else {
      break
    }
  }

  return chain
}

function createSerializableDiagnostic(error, errorCode = ERROR_CODES.UNKNOWN, context = {}) {
  const baseError =
    error instanceof Error ? error : new Error(String(error || 'Unknown error'))

  const diagnostic = {
    errorCode,
    message: truncateString(baseError.message, MAX_ERROR_MESSAGE_LENGTH),
    name: baseError.name,
    timestamp: Date.now(),
    causeChain: extractCauseChain(baseError),
    context: { ...context },
  }

  if (baseError.stack) {
    diagnostic.stack = truncateString(baseError.stack, 5000)
  }

  return diagnostic
}

function createError(errorCode, message, context = {}) {
  const msg = message || getErrorMessage(errorCode)
  const error = new Error(msg)
  error.name = 'FeatureConfigError'
  error.errorCode = errorCode
  error.diagnostic = createSerializableDiagnostic(error, errorCode, context)
  return error
}

function wrapError(originalError, errorCode, context = {}) {
  if (
    originalError &&
    originalError.errorCode &&
    originalError.diagnostic
  ) {
    return originalError
  }

  const error = new Error(
    originalError?.message || getErrorMessage(errorCode)
  )
  error.name = 'FeatureConfigError'
  error.errorCode = errorCode
  error.cause = originalError
  error.diagnostic = createSerializableDiagnostic(error, errorCode, context)
  return error
}

function isFeatureConfigError(error) {
  if (error == null) return false
  if (typeof error !== 'object') return false
  return (
    error.name === 'FeatureConfigError' &&
    typeof error.errorCode === 'string' &&
    typeof error.diagnostic === 'object' &&
    error.diagnostic !== null
  )
}

function toSerializable(error) {
  if (!error) {
    return null
  }

  if (isFeatureConfigError(error)) {
    return error.diagnostic
  }

  return createSerializableDiagnostic(error, ERROR_CODES.UNKNOWN)
}

export {
  getErrorMessage,
  truncateString,
  extractCauseChain,
  createSerializableDiagnostic,
  createError,
  wrapError,
  isFeatureConfigError,
  toSerializable,
}
