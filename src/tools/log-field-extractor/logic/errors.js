const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  LINE_TOO_LONG: 'LINE_TOO_LONG',
  TOO_MANY_LINES: 'TOO_MANY_LINES',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  INVALID_TIMEZONE: 'INVALID_TIMEZONE',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_INPUT]: '输入不能为空，请粘贴至少一行日志',
  [ERROR_CODES.LINE_TOO_LONG]: '存在超长单行日志（超过 {max} 字符），请检查后重试',
  [ERROR_CODES.TOO_MANY_LINES]: '总行数超过上限（最多 {max} 行），请分批处理',
  [ERROR_CODES.INPUT_TOO_LARGE]: '输入内容过大（超过 {max}MB），可能导致性能问题',
  [ERROR_CODES.INVALID_TIMEZONE]: '无效的时区设置',
}

const MAX_SAFE_INPUT_SIZE = 10 * 1024 * 1024
const MAX_LINE_LENGTH = 100000
const MAX_LINE_COUNT = 100000

function createError(code, details = null) {
  let message = ERROR_MESSAGES[code] || '未知错误'
  if (code === ERROR_CODES.LINE_TOO_LONG && details?.maxLineLength) {
    message = message.replace('{max}', details.maxLineLength)
  } else if (code === ERROR_CODES.TOO_MANY_LINES && details?.maxLines) {
    message = message.replace('{max}', details.maxLines)
  } else if (code === ERROR_CODES.INPUT_TOO_LARGE && details?.maxSizeMB) {
    message = message.replace('{max}', details.maxSizeMB)
  }
  return {
    code,
    message,
    details,
  }
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_SAFE_INPUT_SIZE,
  MAX_LINE_LENGTH,
  MAX_LINE_COUNT,
  createError,
}
