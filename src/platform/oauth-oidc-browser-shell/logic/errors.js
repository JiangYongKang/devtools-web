import { ERROR_CODES, ERROR_MESSAGES, ERROR_RECOVERY_SUGGESTIONS } from './constants.js'

export class OAuthUiError extends Error {
  constructor(errorCode, details = {}) {
    const message = ERROR_MESSAGES[errorCode] || errorCode
    super(message)
    this.name = 'OAuthUiError'
    this.errorCode = errorCode
    this.details = details
    this.recoverySuggestion = ERROR_RECOVERY_SUGGESTIONS[errorCode] || ''
    this.timestamp = Date.now()
  }

  toJSON() {
    return {
      name: this.name,
      errorCode: this.errorCode,
      message: this.message,
      recoverySuggestion: this.recoverySuggestion,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

export const createError = (errorCode, details = {}) => {
  return new OAuthUiError(errorCode, details)
}

export const isOAuthError = (error) => {
  return error instanceof OAuthUiError
}

export const getErrorByCode = (code) => {
  if (ERROR_CODES[code]) {
    return createError(code)
  }
  return null
}

export const mapCallbackError = (errorParams) => {
  const { error, error_description } = errorParams

  if (!error) {
    return null
  }

  const errorMap = {
    'access_denied': ERROR_CODES.CANCELED,
    'invalid_request': ERROR_CODES.INVALID_REQUEST,
    'invalid_scope': ERROR_CODES.INVALID_SCOPE,
    'server_error': ERROR_CODES.SERVER_ERROR,
    'temporarily_unavailable': ERROR_CODES.TEMPORARILY_UNAVAILABLE,
    'unauthorized_client': ERROR_CODES.UNAUTHORIZED_CLIENT,
    'unsupported_response_type': ERROR_CODES.UNSUPPORTED_RESPONSE_TYPE,
  }

  const errorCode = errorMap[error] || ERROR_CODES.IDP_ERROR

  return createError(errorCode, {
    error_description,
    originalError: error,
  })
}

export const getAllErrorCodes = () => {
  return Object.values(ERROR_CODES)
}

export const getErrorMetadata = (errorCode) => {
  return {
    code: errorCode,
    message: ERROR_MESSAGES[errorCode] || '',
    recoverySuggestion: ERROR_RECOVERY_SUGGESTIONS[errorCode] || '',
  }
}
