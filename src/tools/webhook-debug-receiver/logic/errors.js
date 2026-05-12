import { EVENT_ERROR_CODES } from './constants.js'

const ERROR_MESSAGES = {
  [EVENT_ERROR_CODES.INVALID_HTTP]: '无效的 HTTP 报文格式',
  [EVENT_ERROR_CODES.EMPTY_BODY]: '请求体为空',
  [EVENT_ERROR_CODES.INVALID_JSON]: '无效的 JSON 格式',
  [EVENT_ERROR_CODES.INVALID_FORM]: '无效的表单数据格式',
  [EVENT_ERROR_CODES.INVALID_MULTIPART]: '无效的 multipart 数据格式',
  [EVENT_ERROR_CODES.INVALID_IMPORT]: '导入数据格式无效，请检查 JSON 结构',
  [EVENT_ERROR_CODES.TOO_MANY_EVENTS]: '事件数量超出限制',
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function createError(code, customMessage) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
  }
}

export {
  EVENT_ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
}
