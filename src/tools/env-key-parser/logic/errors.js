const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  LINE_COUNT_EXCEEDED: 'LINE_COUNT_EXCEEDED',
  LINE_LENGTH_EXCEEDED: 'LINE_LENGTH_EXCEEDED',
  UNICODE_DECODE_ERROR: 'UNICODE_DECODE_ERROR',
  UNCLOSED_QUOTE: 'UNCLOSED_QUOTE',
  INVALID_KEY_FORMAT: 'INVALID_KEY_FORMAT',
  INVALID_LINE_FORMAT: 'INVALID_LINE_FORMAT',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_INPUT]: '输入不能为空',
  [ERROR_CODES.LINE_COUNT_EXCEEDED]: '行数超过限制',
  [ERROR_CODES.LINE_LENGTH_EXCEEDED]: '单行长度超过限制',
  [ERROR_CODES.UNICODE_DECODE_ERROR]: '非 UTF-8 编码的二进制内容',
  [ERROR_CODES.UNCLOSED_QUOTE]: '存在未闭合的引号',
  [ERROR_CODES.INVALID_KEY_FORMAT]: '键名格式无效，应为字母数字下划线且不以数字开头',
  [ERROR_CODES.INVALID_LINE_FORMAT]: '行格式无效',
}

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || '未知错误'
}

function createError(code, customMessage = null, details = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
    ...(details !== null && { details }),
  }
}

export { ERROR_CODES, ERROR_MESSAGES, getErrorMessage, createError }
