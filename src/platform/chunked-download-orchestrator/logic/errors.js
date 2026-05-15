import { ERROR_CODES } from './constants.js'

export function createError(errorCode, message = null, cause = null) {
  const error = new Error(message || getErrorMessage(errorCode))
  error.errorCode = errorCode
  error.cause = cause
  return error
}

export function getErrorMessage(errorCode) {
  const messages = {
    [ERROR_CODES.SUCCESS]: '操作成功',
    [ERROR_CODES.EMPTY_INPUT]: '输入源不能为空',
    [ERROR_CODES.INVALID_SOURCE_TYPE]: '不支持的数据源类型',
    [ERROR_CODES.EXCEEDS_MAX_BYTES]: '数据大小超过最大允许值',
    [ERROR_CODES.USER_ABORTED]: '用户取消了导出',
    [ERROR_CODES.QUOTA_EXCEEDED]: '存储空间不足，无法完成导出',
    [ERROR_CODES.NETWORK_ERROR]: '网络错误，下载失败',
    [ERROR_CODES.INVALID_FILENAME]: '文件名无效',
    [ERROR_CODES.UNSUPPORTED_BROWSER]: '当前浏览器不支持此功能',
    [ERROR_CODES.SSR_ENVIRONMENT]: '服务端渲染环境不支持 Blob 操作',
    [ERROR_CODES.RETRY_FAILED]: '重试后仍然失败',
  }
  return messages[errorCode] || '未知错误'
}

export function isAbortError(error) {
  return error?.name === 'AbortError' || error?.errorCode === ERROR_CODES.USER_ABORTED
}

export function isQuotaExceededError(error) {
  return error?.name === 'QuotaExceededError' ||
    error?.errorCode === ERROR_CODES.QUOTA_EXCEEDED ||
    (error?.message && error.message.toLowerCase().includes('quota'))
}

export function wrapError(error, fallbackErrorCode) {
  if (error?.errorCode) {
    return error
  }
  return createError(fallbackErrorCode, error?.message, error)
}
