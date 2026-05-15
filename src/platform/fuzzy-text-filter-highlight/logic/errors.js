import {
  ERROR_CODES,
} from './constants.js'

/**
 * 模糊搜索自定义错误类
 * @class
 * @extends {Error}
 */
class FuzzySearchError extends Error {
  constructor(code, message, cause) {
    super(message)
    this.name = 'FuzzySearchError'
    this.code = code
    this.cause = cause
  }

  /**
   * 转换为 JSON 格式
   * @returns {{name: string, code: string, message: string, cause: string}} 错误信息对象
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      cause: this.cause?.message,
    }
  }
}

/**
 * 创建 FuzzySearchError 实例
 * @param {string} code - 错误代码
 * @param {string} [message] - 自定义错误消息
 * @param {Error} [cause] - 原始错误对象
 * @returns {FuzzySearchError} 新的错误实例
 */
function createError(code, message, cause) {
  const errorMessages = {
    [ERROR_CODES.INDEX_TOO_LARGE]: message || '索引条目数超出限制',
    [ERROR_CODES.WORKER_INIT_FAILED]: message || 'Worker 初始化失败',
    [ERROR_CODES.WORKER_TIMEOUT]: message || 'Worker 超时',
    [ERROR_CODES.INVALID_PAYLOAD]: message || '无效的负载数据',
  }

  return new FuzzySearchError(
    code,
    errorMessages[code] || message || '未知错误',
    cause
  )
}

/**
 * 包装现有错误为 FuzzySearchError（如果还不是的话）
 * @param {Error} error - 要包装的错误
 * @param {string} code - 错误代码
 * @param {string} [message] - 自定义错误消息
 * @returns {FuzzySearchError} 包装后的错误实例
 */
function wrapError(error, code, message) {
  if (error instanceof FuzzySearchError) {
    return error
  }
  return createError(code, message, error)
}

/**
 * 检查是否是 FuzzySearchError 实例
 * @param {any} error - 要检查的对象
 * @returns {boolean} 是否是模糊搜索错误
 */
function isFuzzySearchError(error) {
  return error instanceof FuzzySearchError
}

export {
  FuzzySearchError,
  createError,
  wrapError,
  isFuzzySearchError,
}
