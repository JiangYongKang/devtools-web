const ERROR_CODES = {
  EMPTY: 'EMPTY',
  INVALID_CHAR: 'INVALID_CHAR',
  AMBIGUOUS_ACRONYM: 'AMBIGUOUS_ACRONYM',
  NO_ALPHANUMERIC: 'NO_ALPHANUMERIC',
  INPUT_TOO_LONG: 'INPUT_TOO_LONG',
  TOO_MANY_LINES: 'TOO_MANY_LINES',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY]: '输入为空',
  [ERROR_CODES.INVALID_CHAR]: '包含非法字符',
  [ERROR_CODES.AMBIGUOUS_ACRONYM]: '缩略词解析存在歧义',
  [ERROR_CODES.NO_ALPHANUMERIC]: '未包含任何字母数字字符',
  [ERROR_CODES.INPUT_TOO_LONG]: '单行长度过长',
  [ERROR_CODES.TOO_MANY_LINES]: '行数超出限制',
}

function getErrorMessage(code, customDetails = null) {
  const baseMessage = ERROR_MESSAGES[code] || '未知错误'
  return customDetails ? `${baseMessage}：${customDetails}` : baseMessage
}

function createError(code, customMessage = null, details = {}) {
  return {
    errorCode: code,
    errorMessage: customMessage || getErrorMessage(code),
    details,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
}
