const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  DEPTH_TOO_DEEP: 'DEPTH_TOO_DEEP',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_INPUT]: '输入为空，请提供要校验的 JSON 文本',
  [ERROR_CODES.INPUT_TOO_LARGE]: '输入文本过大，超出安全校验上限',
  [ERROR_CODES.DEPTH_TOO_DEEP]: 'JSON 嵌套深度超出安全上限',
  [ERROR_CODES.SYNTAX_ERROR]: 'JSON 语法错误',
}

const MAX_SAFE_INPUT_SIZE = 10 * 1024 * 1024
const MAX_NESTING_DEPTH = 1000
const LARGE_TEXT_THRESHOLD = 100 * 1024

function createError(code, details = null) {
  return {
    code,
    message: ERROR_MESSAGES[code] || '未知错误',
    details,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_SAFE_INPUT_SIZE,
  MAX_NESTING_DEPTH,
  LARGE_TEXT_THRESHOLD,
  createError,
}
