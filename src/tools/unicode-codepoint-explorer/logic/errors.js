const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  INVALID_ESCAPE: 'INVALID_ESCAPE',
  OUT_OF_RANGE_CODE_POINT: 'OUT_OF_RANGE_CODE_POINT',
  PROPERTY_LOOKUP_FAILED: 'PROPERTY_LOOKUP_FAILED',
  EMPTY_INPUT: 'EMPTY_INPUT',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入为 null 或 undefined',
  [ERROR_CODES.INVALID_ESCAPE]: '无效的转义序列',
  [ERROR_CODES.OUT_OF_RANGE_CODE_POINT]: '码点超出 Unicode 有效范围（0x0000-0x10FFFF）',
  [ERROR_CODES.PROPERTY_LOOKUP_FAILED]: '属性查找失败',
  [ERROR_CODES.EMPTY_INPUT]: '输入为空',
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

export { ERROR_CODES, ERROR_MESSAGES, getErrorMessage, createError }
