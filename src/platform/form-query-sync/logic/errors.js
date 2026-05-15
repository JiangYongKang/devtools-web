import { ERROR_CODES, WARNING_CODES } from './constants.js'

const WARNING_MESSAGES = {
  [WARNING_CODES.INVALID_PARAM]: '参数格式无效',
  [WARNING_CODES.INVALID_PERCENT_SEQUENCE]: 'URL 编码中包含非法的百分号序列',
  [WARNING_CODES.INVALID_BOOLEAN]: '布尔值格式无效',
  [WARNING_CODES.INVALID_NUMBER]: '数值格式无效',
  [WARNING_CODES.INVALID_ENUM_VALUE]: '枚举值不在允许范围内',
  [WARNING_CODES.INVALID_KEY_FORMAT]: '字段名格式无效',
  [WARNING_CODES.UNKNOWN_FIELD]: '未知字段名',
  [WARNING_CODES.VALUE_TRUNCATED]: '值被截断',
  [WARNING_CODES.URL_LENGTH_EXCEEDED]: 'URL 长度超过限制',
  [WARNING_CODES.HISTORY_API_UNAVAILABLE]: '浏览器 History API 不可用',
  [WARNING_CODES.VALIDATION_FAILED]: '参数校验失败',
  [WARNING_CODES.HISTORY_PUSH_THRESHOLD_EXCEEDED]: '连续 push 次数超过阈值，可能污染后退栈',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.FILE_FIELD_NOT_ALLOWED]: 'File 类型字段不允许写入 URL 查询参数',
  [ERROR_CODES.BLOB_FIELD_NOT_ALLOWED]: 'Blob 类型字段不允许写入 URL 查询参数',
  [ERROR_CODES.URL_LENGTH_EXCEEDED]: 'URL 查询参数总长度超过配置限制',
  [ERROR_CODES.INVALID_SCHEMA]: 'Schema 格式无效',
  [ERROR_CODES.SYNC_LOCKED]: '表单编辑中，URL 回写已暂停',
}

function getWarningMessage(code) {
  return WARNING_MESSAGES[code] || '未知警告'
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function createWarning(code, field = null, value = null, customMessage = null) {
  return {
    code,
    field,
    value,
    message: customMessage || getWarningMessage(code) + (field ? `: ${field}` : ''),
  }
}

function createError(code, field = null, value = null, customMessage = null) {
  return {
    code,
    field,
    value,
    message: customMessage || getErrorMessage(code) + (field ? `: ${field}` : ''),
  }
}

export {
    createError, createWarning, ERROR_CODES, ERROR_MESSAGES, getErrorMessage, getWarningMessage, WARNING_CODES, WARNING_MESSAGES
}

