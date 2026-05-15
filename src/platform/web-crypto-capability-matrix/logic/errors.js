import { ERROR_CODES } from './constants.js'

function createError(errorCode, message = '', details = {}) {
  return {
    success: false,
    error: {
      errorCode,
      errorMessage: message || getErrorMessageForCode(errorCode),
      userMessage: getUserMessageForCode(errorCode),
      recoveryHint: getRecoveryHintForCode(errorCode),
      details,
    },
  }
}

function getErrorMessageForCode(errorCode) {
  const messages = {
    [ERROR_CODES.NOT_SUPPORTED_ERROR]: '该算法或操作不被当前环境支持',
    [ERROR_CODES.INVALID_ACCESS_ERROR]: '无权执行该操作',
    [ERROR_CODES.SYNTAX_ERROR]: '算法参数语法错误',
    [ERROR_CODES.DATA_ERROR]: '数据格式或长度错误',
    [ERROR_CODES.OPERATION_ERROR]: '操作执行失败',
    [ERROR_CODES.SECURITY_ERROR]: '安全策略限制',
    [ERROR_CODES.ABORT_ERROR]: '操作已被取消',
    [ERROR_CODES.TYPE_ERROR]: '参数类型错误',
    [ERROR_CODES.UNKNOWN_ERROR]: '未知错误',
    [ERROR_CODES.INSECURE_CONTEXT]: '需要安全上下文 (HTTPS)',
    [ERROR_CODES.WORKER_NOT_SUPPORTED]: 'Worker 不可用',
  }
  return messages[errorCode] || '未知错误'
}

function getUserMessageForCode(errorCode) {
  const messages = {
    [ERROR_CODES.INSECURE_CONTEXT]: 'Web Crypto API 仅在安全上下文 (HTTPS/localhost) 下可用',
    [ERROR_CODES.NOT_SUPPORTED_ERROR]: '您的浏览器不支持该加密算法',
    [ERROR_CODES.SECURITY_ERROR]: '安全策略阻止了此操作',
    [ERROR_CODES.WORKER_NOT_SUPPORTED]: 'Web Worker 不可用',
  }
  return messages[errorCode] || '加密操作遇到问题'
}

function getRecoveryHintForCode(errorCode) {
  const hints = {
    [ERROR_CODES.INSECURE_CONTEXT]: '请迁移到 HTTPS 或在 localhost 环境下测试',
    [ERROR_CODES.NOT_SUPPORTED_ERROR]: '考虑使用更广泛支持的算法，如 AES-GCM',
    [ERROR_CODES.SECURITY_ERROR]: '检查 iframe 的 allow="crypto-key" 权限',
    [ERROR_CODES.WORKER_NOT_SUPPORTED]: '降级到主线程执行',
  }
  return hints[errorCode] || null
}

function classifyCryptoError(error, operation = 'unknown') {
  let errorCode = ERROR_CODES.UNKNOWN_ERROR

  if (error && error.name) {
    const name = error.name
    if (name === 'NotSupportedError') {
      errorCode = ERROR_CODES.NOT_SUPPORTED_ERROR
    } else if (name === 'InvalidAccessError') {
      errorCode = ERROR_CODES.INVALID_ACCESS_ERROR
    } else if (name === 'SyntaxError') {
      errorCode = ERROR_CODES.SYNTAX_ERROR
    } else if (name === 'DataError') {
      errorCode = ERROR_CODES.DATA_ERROR
    } else if (name === 'OperationError') {
      errorCode = ERROR_CODES.OPERATION_ERROR
    } else if (name === 'SecurityError') {
      errorCode = ERROR_CODES.SECURITY_ERROR
    } else if (name === 'AbortError') {
      errorCode = ERROR_CODES.ABORT_ERROR
    } else if (name === 'TypeError') {
      errorCode = ERROR_CODES.TYPE_ERROR
    }
  }

  return createError(errorCode, error?.message, { operation, originalError: error?.name })
}

function isAbortError(error) {
  if (!error) return false
  if (error.errorCode === ERROR_CODES.ABORT_ERROR) return true
  if (error.name === 'AbortError') return true
  return false
}

export {
  createError,
  classifyCryptoError,
  isAbortError,
  getErrorMessageForCode,
  getUserMessageForCode,
  getRecoveryHintForCode,
}
