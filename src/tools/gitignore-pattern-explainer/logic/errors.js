import { ERROR_CODES, ERROR_MESSAGES, MAX_PATTERNS, MAX_PATTERN_LENGTH } from './constants.js'

function buildError(code, customMessage = null) {
  return {
    errorCode: code,
    errorMessage: customMessage || ERROR_MESSAGES[code] || '未知错误',
  }
}

function validateInput(input, maxPatterns = MAX_PATTERNS, maxPatternLength = MAX_PATTERN_LENGTH) {
  if (input === null || input === undefined) {
    return { valid: false, ...buildError(ERROR_CODES.NULL_INPUT) }
  }

  const str = String(input)

  if (!str.trim()) {
    return { valid: false, ...buildError(ERROR_CODES.EMPTY_INPUT) }
  }

  const lines = str.split(/\r?\n/)
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)

  if (nonEmptyLines.length === 0) {
    return { valid: false, ...buildError(ERROR_CODES.EMPTY_INPUT) }
  }

  const nonCommentLines = nonEmptyLines.filter((line) => !line.trim().startsWith('#'))

  if (nonCommentLines.length === 0) {
    return { valid: false, ...buildError(ERROR_CODES.ALL_COMMENTS) }
  }

  if (lines.length > maxPatterns) {
    return {
      valid: false,
      ...buildError(
        ERROR_CODES.TOO_MANY_LINES,
        `模式条数超出上限：当前 ${lines.length} 条，最大 ${maxPatterns} 条`,
      ),
    }
  }

  for (const line of lines) {
    if (line.length > maxPatternLength) {
      return {
        valid: false,
        ...buildError(
          ERROR_CODES.LINE_TOO_LONG,
          `单条模式长度超出上限：当前 ${line.length} 字符，最大 ${maxPatternLength} 字符`,
        ),
      }
    }
  }

  return { valid: true, errorCode: null, errorMessage: null }
}

export { validateInput, buildError }
