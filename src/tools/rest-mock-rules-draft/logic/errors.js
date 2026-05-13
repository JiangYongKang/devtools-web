import { ERROR_CODES } from './constants.js'

export function createError(code, message, details = {}) {
  const error = new Error(message || getDefaultMessage(code))
  error.code = code
  error.details = details
  return error
}

export function getDefaultMessage(code) {
  const messages = {
    [ERROR_CODES.INVALID_JSON]: '无效的 JSON 格式',
    [ERROR_CODES.INVALID_YAML]: '无效的 YAML 格式',
    [ERROR_CODES.INVALID_PATH]: '路径格式无效',
    [ERROR_CODES.INVALID_REGEX]: '正则表达式无效',
    [ERROR_CODES.INVALID_STATUS_CODE]: '状态码必须在 100-599 之间',
    [ERROR_CODES.INVALID_DELAY]: '延迟必须是非负整数，最大 60000ms',
    [ERROR_CODES.INVALID_PROBABILITY]: '概率必须在 1-100 之间',
    [ERROR_CODES.INVALID_METHOD]: '方法不在允许的 HTTP 方法列表中',
    [ERROR_CODES.CONFLICT_PATH_METHOD]: '存在路径和方法冲突的规则',
    [ERROR_CODES.MISSING_REQUIRED_FIELD]: '缺少必填字段',
    [ERROR_CODES.IMPORT_FAILED]: '导入解析失败',
    [ERROR_CODES.SHARE_URL_TOO_LONG]: '分享链接过长，超过长度限制',
  }
  return messages[code] || '未知错误'
}

export function isError(obj) {
  return obj instanceof Error && obj.code !== undefined
}

export function formatValidationErrors(errors) {
  if (!errors || errors.length === 0) return null
  return {
    hasErrors: true,
    errors: errors.map((e) => ({
      code: e.code,
      message: e.message,
      field: e.details?.field,
      ruleId: e.details?.ruleId,
    })),
  }
}
