import { ERROR_CODES, ERROR_NAMES } from './constants.js'

/**
 * 创建归一化的弹性策略错误对象
 * @param {string} errorCode - 错误码（来自 ERROR_CODES）
 * @param {string} message - 错误消息
 * @param {Object} context - 附加上下文
 * @returns {Error} 增强的 Error 对象
 */
function createResilienceError(errorCode, message, context = {}) {
  const error = new Error(message)
  error.name = ERROR_NAMES[errorCode] || 'ResilienceError'
  error.errorCode = errorCode
  error.context = context
  return error
}

/**
 * 创建超时错误
 * @param {string} message - 错误消息
 * @param {Object} context - 附加上下文
 * @returns {Error} TimeoutError 对象
 */
function createTimeoutError(message = 'Request timeout', context = {}) {
  return createResilienceError(ERROR_CODES.TIMEOUT, message, context)
}

/**
 * 创建取消错误
 * @param {string} message - 错误消息
 * @param {Object} context - 附加上下文
 * @returns {Error} AbortError 对象
 */
function createAbortError(message = 'Request aborted', context = {}) {
  return createResilienceError(ERROR_CODES.ABORT, message, context)
}

/**
 * 创建 HTTP 错误
 * @param {string} message - 错误消息
 * @param {number} status - HTTP 状态码
 * @param {Response} response - 原始 Response 对象
 * @param {Object} context - 附加上下文
 * @returns {Error} HttpError 对象
 */
function createHttpError(message = 'HTTP error occurred', status, response, context = {}) {
  const error = createResilienceError(ERROR_CODES.HTTP_ERROR, message, { status, ...context })
  error.status = status
  error.response = response
  return error
}

/**
 * 创建网络错误
 * @param {string} message - 错误消息
 * @param {Error} originalError - 原始错误
 * @param {Object} context - 附加上下文
 * @returns {Error} NetworkError 对象
 */
function createNetworkError(message = 'Network error occurred', originalError, context = {}) {
  const error = createResilienceError(ERROR_CODES.NETWORK_ERROR, message, context)
  error.originalError = originalError
  return error
}

/**
 * 创建重试耗尽错误
 * @param {string} message - 错误消息
 * @param {Error} lastError - 最后一次尝试的错误
 * @param {number} attempts - 总尝试次数
 * @param {Object} context - 附加上下文
 * @returns {Error} RetryExhaustedError 对象
 */
function createRetryExhaustedError(message = 'Retry attempts exhausted', lastError, attempts, context = {}) {
  const error = createResilienceError(ERROR_CODES.RETRY_EXHAUSTED, message, { attempts, ...context })
  error.lastError = lastError
  error.attempts = attempts
  return error
}

/**
 * 判断是否为超时错误
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否为超时错误
 */
function isTimeoutError(error) {
  return error && error.errorCode === ERROR_CODES.TIMEOUT
}

/**
 * 判断是否为取消错误
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否为取消错误
 */
function isAbortError(error) {
  return error && error.errorCode === ERROR_CODES.ABORT
}

/**
 * 判断是否为 HTTP 错误
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否为 HTTP 错误
 */
function isHttpError(error) {
  return error && error.errorCode === ERROR_CODES.HTTP_ERROR
}

/**
 * 判断是否为网络错误
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否为网络错误
 */
function isNetworkError(error) {
  return error && error.errorCode === ERROR_CODES.NETWORK_ERROR
}

/**
 * 判断是否为重试耗尽错误
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否为重试耗尽错误
 */
function isRetryExhaustedError(error) {
  return error && error.errorCode === ERROR_CODES.RETRY_EXHAUSTED
}

export {
  createTimeoutError,
  createAbortError,
  createHttpError,
  createNetworkError,
  createRetryExhaustedError,
  isTimeoutError,
  isAbortError,
  isHttpError,
  isNetworkError,
  isRetryExhaustedError,
}
