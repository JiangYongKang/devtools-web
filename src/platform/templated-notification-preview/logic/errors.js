import { ERROR_TYPES } from './constants'

export class TemplateError extends Error {
  constructor(message, type, line, column, source = '') {
    super(message)
    this.name = 'TemplateError'
    this.type = type
    this.line = line
    this.column = column
    this.source = source
  }

  toString() {
    return `[${this.type}] 行${this.line}列${this.column}: ${this.message}`
  }
}

export function createUnexpectedTokenError(token, expected = null) {
  const message = expected
    ? `期望 "${expected}"，但遇到了 "${token.value}"`
    : `意外的标记 "${token.value}"`
  return new TemplateError(
    message,
    ERROR_TYPES.UNEXPECTED_TOKEN,
    token.line,
    token.column,
    token.value
  )
}

export function createUnclosedTagError(tagName, openLine, openColumn) {
  return new TemplateError(
    `标签 "${tagName}" 未闭合`,
    ERROR_TYPES.UNCLOSED_TAG,
    openLine,
    openColumn,
    tagName
  )
}

export function createSyntaxError(message, line, column, source = '') {
  return new TemplateError(
    message,
    ERROR_TYPES.INVALID_SYNTAX,
    line,
    column,
    source
  )
}

export function createUnexpectedEOFError(line, column) {
  return new TemplateError(
    '模板意外结束，可能存在未闭合的标签',
    ERROR_TYPES.UNEXPECTED_EOF,
    line,
    column
  )
}
