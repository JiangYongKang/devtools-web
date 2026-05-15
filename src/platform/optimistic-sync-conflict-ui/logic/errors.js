import { ERROR_TYPES } from './constants.js'

class OptimisticSyncError extends Error {
  constructor(message, code, details = {}) {
    super(message)
    this.name = 'OptimisticSyncError'
    this.code = code
    this.details = details
    this.timestamp = Date.now()
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

class TimeoutError extends OptimisticSyncError {
  constructor(message = '请求超时', details = {}) {
    super(message, ERROR_TYPES.TIMEOUT, details)
    this.name = 'TimeoutError'
  }
}

class NetworkError extends OptimisticSyncError {
  constructor(message = '网络错误', details = {}) {
    super(message, ERROR_TYPES.NETWORK, details)
    this.name = 'NetworkError'
  }
}

class ServerError extends OptimisticSyncError {
  constructor(message = '服务器错误', statusCode = 500, details = {}) {
    super(message, ERROR_TYPES.SERVER_5XX, { ...details, statusCode })
    this.name = 'ServerError'
    this.statusCode = statusCode
  }
}

class ConflictError extends OptimisticSyncError {
  constructor(message = '版本冲突', localRevision, remoteRevision, details = {}) {
    super(message, ERROR_TYPES.CONFLICT_412, {
      ...details,
      localRevision,
      remoteRevision,
    })
    this.name = 'ConflictError'
    this.localRevision = localRevision
    this.remoteRevision = remoteRevision
  }
}

class BusinessValidationError extends OptimisticSyncError {
  constructor(message = '业务验证失败', validationErrors = [], details = {}) {
    super(message, ERROR_TYPES.BUSINESS_422, {
      ...details,
      validationErrors,
    })
    this.name = 'BusinessValidationError'
    this.validationErrors = validationErrors
  }
}

class IdempotencyViolationError extends OptimisticSyncError {
  constructor(message = '幂等性冲突', mutationId, details = {}) {
    super(message, 'IDEMPOTENCY_VIOLATION', {
      ...details,
      mutationId,
    })
    this.name = 'IdempotencyViolationError'
    this.mutationId = mutationId
  }
}

const createErrorByHttpStatus = (statusCode, message, details = {}) => {
  if (statusCode === 412) {
    return new ConflictError(
      message || '前置条件失败，版本可能已过期',
      details.localRevision,
      details.remoteRevision,
      details
    )
  }

  if (statusCode === 422) {
    return new BusinessValidationError(
      message || '请求数据验证失败',
      details.validationErrors || [],
      details
    )
  }

  if (statusCode >= 500 && statusCode < 600) {
    return new ServerError(
      message || `服务器错误 ${statusCode}`,
      statusCode,
      details
    )
  }

  if (statusCode === 408) {
    return new TimeoutError(message || '请求超时', details)
  }

  return new OptimisticSyncError(
    message || `HTTP 错误 ${statusCode}`,
    `HTTP_${statusCode}`,
    details
  )
}

const isRetryableError = (error) => {
  if (!error) return false

  const retryableCodes = [
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.NETWORK,
    ERROR_TYPES.SERVER_5XX,
  ]

  return retryableCodes.includes(error.code)
}

const wrapError = (error) => {
  if (error instanceof OptimisticSyncError) {
    return error
  }

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError('网络连接失败', { originalError: error.message })
  }

  if (error.name === 'AbortError') {
    return new TimeoutError('请求被取消', { originalError: error.message })
  }

  return new OptimisticSyncError(
    error.message || '未知错误',
    ERROR_TYPES.UNKNOWN,
    { originalError: error }
  )
}

export {
  OptimisticSyncError,
  TimeoutError,
  NetworkError,
  ServerError,
  ConflictError,
  BusinessValidationError,
  IdempotencyViolationError,
  createErrorByHttpStatus,
  isRetryableError,
  wrapError,
}
