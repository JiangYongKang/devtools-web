const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  UNBALANCED_BRACKETS: 'UNBALANCED_BRACKETS',
  UNTERMINATED_STRING: 'UNTERMINATED_STRING',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NULL_INPUT: 'NULL_INPUT',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  DUPLICATE_OPERATION: 'DUPLICATE_OPERATION',
  PARSE_ERROR: 'PARSE_ERROR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_INPUT]: 'GraphQL 查询输入为空',
  [ERROR_CODES.UNBALANCED_BRACKETS]: '括号/大括号不平衡',
  [ERROR_CODES.UNTERMINATED_STRING]: '字符串未正确结束',
  [ERROR_CODES.VALIDATION_FAILED]: '验证失败',
  [ERROR_CODES.NULL_INPUT]: 'GraphQL 查询输入为 null 或 undefined',
  [ERROR_CODES.INPUT_TOO_LARGE]: 'GraphQL 查询输入过大',
  [ERROR_CODES.DUPLICATE_OPERATION]: '存在重复的操作名称',
  [ERROR_CODES.PARSE_ERROR]: '解析错误',
}

function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || '未知错误'
}

function createError(errorCode, extraMessage = '') {
  return {
    errorCode,
    errorMessage: extraMessage
      ? `${getErrorMessage(errorCode)}：${extraMessage}`
      : getErrorMessage(errorCode),
  }
}

export { ERROR_CODES, ERROR_MESSAGES, getErrorMessage, createError }
