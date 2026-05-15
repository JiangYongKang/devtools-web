
import { ERROR_TYPES } from './constants.js'

export const ERROR_CODES = {
  INVALID_URL: 'INVALID_URL',
  FORBIDDEN_PROTOCOL: 'FORBIDDEN_PROTOCOL',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  TIMEOUT: 'TIMEOUT',
  ABORTED: 'ABORTED',
  INVALID_CONFIG: 'INVALID_CONFIG',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CORS_ERROR: 'CORS_ERROR',
}

export class ServiceHealthError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'ServiceHealthError'
    this.code = code
    this.details = details
    this.timestamp = Date.now()
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

export function createError(code, message, details = {}) {
  return new ServiceHealthError(code, message, details)
}

export function wrapError(originalError, code, message) {
  const error = createError(
    code,
    message || originalError.message,
    {
      originalMessage: originalError.message,
      originalStack: originalError.stack,
      originalName: originalError.name,
    }
  )
  return error
}

export function isServiceHealthError(error) {
  return error instanceof ServiceHealthError
}

export function classifyError(error) {
  if (!error) {
    return ERROR_TYPES.UNKNOWN
  }

  if (isServiceHealthError(error)) {
    switch (error.code) {
      case ERROR_CODES.TIMEOUT:
      case ERROR_CODES.ABORTED:
        return ERROR_TYPES.TIMEOUT
      case ERROR_CODES.CORS_ERROR:
        return ERROR_TYPES.CORS
      case ERROR_CODES.FORBIDDEN_PROTOCOL:
      case ERROR_CODES.SECURITY_VIOLATION:
        return ERROR_TYPES.SECURITY
      case ERROR_CODES.NETWORK_ERROR:
        return ERROR_TYPES.NETWORK
      default:
        return ERROR_TYPES.UNKNOWN
    }
  }

  const message = (error.message || '').toLowerCase()
  const name = (error.name || '').toLowerCase()

  if (name === 'aborterror' || message.includes('abort') || message.includes('cancelled')) {
    return ERROR_TYPES.ABORT
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return ERROR_TYPES.TIMEOUT
  }

  if (message.includes('cors') || message.includes('cross-origin') || message.includes('preflight')) {
    return ERROR_TYPES.CORS
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return ERROR_TYPES.NETWORK
  }

  if (error.status || (error.response && error.response.status)) {
    return ERROR_TYPES.HTTP
  }

  return ERROR_TYPES.UNKNOWN
}

export function getErrorMessageByType(errorType) {
  const messages = {
    [ERROR_TYPES.HTTP]: 'HTTP 状态码错误',
    [ERROR_TYPES.NETWORK]: '网络连接失败',
    [ERROR_TYPES.CORS]: '跨域请求被阻止 (CORS 策略)',
    [ERROR_TYPES.TIMEOUT]: '请求超时',
    [ERROR_TYPES.ABORT]: '请求被取消',
    [ERROR_TYPES.SECURITY]: '安全策略违规',
    [ERROR_TYPES.UNKNOWN]: '未知错误',
  }
  return messages[errorType] || messages[ERROR_TYPES.UNKNOWN]
}
