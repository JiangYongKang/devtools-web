const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  MALFORMED: 'MALFORMED',
  PARTIAL_PARSE: 'PARTIAL_PARSE',
  INPUT_TOO_LONG: 'INPUT_TOO_LONG',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_INPUT]: 'User-Agent 字符串不能为空',
  [ERROR_CODES.MALFORMED]: 'User-Agent 字符串格式异常，无法完全解析',
  [ERROR_CODES.PARTIAL_PARSE]: '部分字段解析失败，已尽力提取可识别内容',
  [ERROR_CODES.INPUT_TOO_LONG]: 'User-Agent 字符串过长，已截断处理',
}

const MAX_SAFE_INPUT_LENGTH = 4096

function createError(code, details = null) {
  return {
    code,
    message: ERROR_MESSAGES[code] || '未知错误',
    details,
  }
}

function getErrorMessage(code, language = 'zh') {
  return ERROR_MESSAGES[code] || '未知错误'
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_SAFE_INPUT_LENGTH,
  createError,
  getErrorMessage,
}
