const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_VALUE: 'EMPTY_VALUE',
  INVALID_RADIX: 'INVALID_RADIX',
  INVALID_CHAR: 'INVALID_CHAR',
  NEGATIVE_NOT_ALLOWED: 'NEGATIVE_NOT_ALLOWED',
  LEADING_ZEROS_NOT_ALLOWED: 'LEADING_ZEROS_NOT_ALLOWED',
  OVERFLOW: 'OVERFLOW',
  VALUE_TOO_LONG: 'VALUE_TOO_LONG',
  BATCH_TOO_LARGE: 'BATCH_TOO_LARGE',
  BATCH_PRODUCT_EXCEEDED: 'BATCH_PRODUCT_EXCEEDED',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入值为 null 或 undefined',
  [ERROR_CODES.EMPTY_VALUE]: '输入值为空',
  [ERROR_CODES.INVALID_RADIX]: '进制值无效，应在 2~36 范围内',
  [ERROR_CODES.INVALID_CHAR]: '输入值包含源进制不支持的字符',
  [ERROR_CODES.NEGATIVE_NOT_ALLOWED]: '负数未被允许',
  [ERROR_CODES.LEADING_ZEROS_NOT_ALLOWED]: '前导零未被允许',
  [ERROR_CODES.OVERFLOW]: '数值超出安全整数范围',
  [ERROR_CODES.VALUE_TOO_LONG]: '输入值长度超限，可能导致精度丢失',
  [ERROR_CODES.BATCH_TOO_LARGE]: '批量转换条目数超出限制',
  [ERROR_CODES.BATCH_PRODUCT_EXCEEDED]: '批量转换任务总量超出限制',
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function createError(code, customMessage = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
  }
}

function isRadixValid(radix) {
  const num = Number(radix)
  return Number.isInteger(num) && num >= 2 && num <= 36
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isRadixValid,
}
