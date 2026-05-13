import { ERROR_CODES, ERROR_MESSAGES, MAX_LINES, MAX_LINE_LENGTH } from './constants.js'

function buildError(code, customMessage = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || ERROR_MESSAGES[code] || '未知错误',
  }
}

function validateInput(input, maxLines = MAX_LINES, maxLineLength = MAX_LINE_LENGTH) {
  if (input === null || input === undefined) {
    return { valid: false, ...buildError(ERROR_CODES.NULL_INPUT) }
  }

  const str = String(input)

  if (str.length === 0) {
    return { valid: false, ...buildError(ERROR_CODES.EMPTY_INPUT) }
  }

  if (!str.trim()) {
    return { valid: false, ...buildError(ERROR_CODES.ALL_WHITESPACE) }
  }

  const lines = str.split(/\r?\n/)

  if (lines.length > maxLines) {
    return {
      valid: false,
      ...buildError(
        ERROR_CODES.TOO_MANY_LINES,
        `路径数量超出上限：当前 ${lines.length} 行，最大 ${maxLines} 行`,
      ),
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxLineLength) {
      return {
        valid: false,
        ...buildError(
          ERROR_CODES.LINE_TOO_LONG,
          `第 ${i + 1} 行路径长度超出上限：当前 ${lines[i].length} 字符，最大 ${maxLineLength} 字符`,
        ),
      }
    }
  }

  return { valid: true, errorCode: null, errorMessage: null }
}

export { validateInput, buildError }
