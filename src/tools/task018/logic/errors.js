const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_INDENT: 'INVALID_INDENT',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  NESTING_TOO_DEEP: 'NESTING_TOO_DEEP',
  TRUNCATED_INPUT: 'TRUNCATED_INPUT',
  PARSE_FAILED: 'PARSE_FAILED',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: 'SQL 输入为 null 或 undefined',
  [ERROR_CODES.EMPTY_INPUT]: 'SQL 输入为空',
  [ERROR_CODES.INVALID_INDENT]: '缩进配置无效，空格缩进宽度应为 1-8',
  [ERROR_CODES.INPUT_TOO_LARGE]: 'SQL 输入过大，超出最大限制',
  [ERROR_CODES.NESTING_TOO_DEEP]: 'SQL 嵌套过深，超出最大限制',
  [ERROR_CODES.TRUNCATED_INPUT]: 'SQL 输入可能被截断（未闭合的字符串或括号）',
  [ERROR_CODES.PARSE_FAILED]: 'SQL 解析失败',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
}

function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || '未知错误'
}

function createError(errorCode, extraMessage = '') {
  return {
    errorCode,
    errorMessage: extraMessage ? `${getErrorMessage(errorCode)}：${extraMessage}` : getErrorMessage(errorCode),
  }
}

export { ERROR_CODES, ERROR_MESSAGES, getErrorMessage, createError }
