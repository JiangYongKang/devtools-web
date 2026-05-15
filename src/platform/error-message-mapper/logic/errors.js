import {
  ERROR_CODES,
  MAX_ERROR_MESSAGE_LENGTH,
} from './constants.js'

const ERROR_MESSAGES = {
  [ERROR_CODES.UNKNOWN_BUSINESS]: '未知业务错误',
  [ERROR_CODES.UNKNOWN_DOMAIN]: '未知错误域',
  [ERROR_CODES.INVALID_PATCH]: '远程补丁格式无效',
  [ERROR_CODES.NETWORK_ERROR]: '网络连接失败',
  [ERROR_CODES.TIMEOUT_ERROR]: '请求超时',
  [ERROR_CODES.ABORTED]: '操作已取消',
  [ERROR_CODES.HTTP_400]: '请求参数错误',
  [ERROR_CODES.HTTP_401]: '未授权，请先登录',
  [ERROR_CODES.HTTP_403]: '没有权限访问该资源',
  [ERROR_CODES.HTTP_404]: '请求的资源不存在',
  [ERROR_CODES.HTTP_429]: '请求过于频繁，请稍后再试',
  [ERROR_CODES.HTTP_500]: '服务器内部错误',
  [ERROR_CODES.HTTP_503]: '服务暂时不可用',
  [ERROR_CODES.WS_CONNECTION_FAILED]: 'WebSocket 连接失败',
  [ERROR_CODES.WS_PROTOCOL_ERROR]: 'WebSocket 协议错误',
  [ERROR_CODES.CLIPBOARD_PERMISSION_DENIED]: '剪贴板权限被拒绝',
  [ERROR_CODES.CLIPBOARD_NOT_SUPPORTED]: '浏览器不支持剪贴板操作',
  [ERROR_CODES.STORAGE_QUOTA_EXCEEDED]: '存储空间已满',
  [ERROR_CODES.STORAGE_DISABLED]: '浏览器存储功能已禁用',
}

function truncateString(str, maxLen = MAX_ERROR_MESSAGE_LENGTH) {
  if (!str || typeof str !== 'string') return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

function createError(errorCode, message, context = {}) {
  const msg = message || ERROR_MESSAGES[errorCode] || '未知错误'
  const error = new Error(msg)
  error.name = 'ErrorMessageMapperError'
  error.errorCode = errorCode
  error.diagnostic = {
    errorCode,
    message: truncateString(msg),
    timestamp: Date.now(),
    context: { ...context },
  }
  return error
}

function isErrorMessageMapperError(error) {
  if (error == null) return false
  if (typeof error !== 'object') return false
  return (
    error.name === 'ErrorMessageMapperError' &&
    typeof error.errorCode === 'string' &&
    typeof error.diagnostic === 'object' &&
    error.diagnostic !== null
  )
}

export {
  ERROR_MESSAGES,
  truncateString,
  createError,
  isErrorMessageMapperError,
}
