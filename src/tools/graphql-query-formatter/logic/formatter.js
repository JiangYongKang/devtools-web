import { TOKEN_TYPES, getIndentString } from './constants.js'
import { tokenize, findNextNonWhitespace } from './parser.js'
import { ERROR_CODES, createError } from './errors.js'

function formatGraphQL(source, params) {
  if (source == null) {
    return {
      formattedText: '',
      compressedText: '',
      highlights: [],
      outline: [],
      diagnostics: [],
      ...createError(ERROR_CODES.NULL_INPUT),
    }
  }

  if (typeof source !== 'string') {
    source = String(source)
  }

  const trimmed = source.trim()
  if (trimmed === '') {
    return {
      formattedText: '',
      compressedText: '',
      highlights: [],
      outline: [],
      diagnostics: [],
      ...createError(ERROR_CODES.EMPTY_INPUT),
    }
  }

  const inputSizeBytes = new Blob([source]).size
  const maxInputBytes = params.maxInputSizeKb * 1024
  if (inputSizeBytes > maxInputBytes) {
    return {
      formattedText: source,
      compressedText: source,
      highlights: [],
      outline: [],
      diagnostics: [],
      ...createError(ERROR_CODES.INPUT_TOO_LARGE),
    }
  }

  try {
    const tokens = tokenize(source)
    const { diagnostics, error } = validateTokens(tokens)

    if (error && error.errorCode === ERROR_CODES.VALIDATION_FAILED) {
      return {
        formattedText: source,
        compressedText: source,
        highlights: [],
        outline: [],
        diagnostics,
        ...error,
      }
    }

    const outline = extractOutline(tokens)
    const formattedText = formatTokens(tokens, params)
    const compressedText = compressTokens(tokens, params)
    const highlights = extractHighlights(tokens, formattedText)

    return {
      formattedText,
      compressedText,
      highlights,
      outline,
      diagnostics,
      errorCode: null,
      errorMessage: null,
    }
  } catch (err) {
    return {
      formattedText: source,
      compressedText: source,
      highlights: [],
      outline: [],
      diagnostics: [],
      ...createError(ERROR_CODES.PARSE_ERROR, err?.message || '未知错误'),
    }
  }
}

function validateTokens(tokens) {
  const diagnostics = []
  const braceStack = []
  const parenStack = []
  const bracketStack = []
  const operationNames = new Set()

  for (const token of tokens) {
    if (token.type === TOKEN_TYPES.STRING) {
      const value = token.value
      if (value.startsWith('"""')) {
        if (!value.endsWith('"""') || value.length === 3) {
          diagnostics.push({
            line: token.startLine,
            column: token.startColumn,
            message: '未结束的块字符串',
            severity: 'error',
          })
        }
      } else {
        if (!value.endsWith('"') || value.length < 2) {
          diagnostics.push({
            line: token.startLine,
            column: token.startColumn,
            message: '未结束的字符串',
            severity: 'error',
          })
        }
      }
    }

    if (token.type === TOKEN_TYPES.PUNCTUATION) {
      if (token.value === '{') {
        braceStack.push({ line: token.startLine, column: token.startColumn })
      } else if (token.value === '}') {
        if (braceStack.length === 0) {
          diagnostics.push({
            line: token.startLine,
            column: token.startColumn,
            message: '多余的闭合大括号',
            severity: 'error',
          })
        } else {
          braceStack.pop()
        }
      } else if (token.value === '(') {
        parenStack.push({ line: token.startLine, column: token.startColumn })
      } else if (token.value === ')') {
        if (parenStack.length === 0) {
          diagnostics.push({
            line: token.startLine,
            column: token.startColumn,
            message: '多余的闭合括号',
            severity: 'error',
          })
        } else {
          parenStack.pop()
        }
      } else if (token.value === '[') {
        bracketStack.push({ line: token.startLine, column: token.startColumn })
      } else if (token.value === ']') {
        if (bracketStack.length === 0) {
          diagnostics.push({
            line: token.startLine,
            column: token.startColumn,
            message: '多余的闭合方括号',
            severity: 'error',
          })
        } else {
          bracketStack.pop()
        }
      }
    }
  }

  if (braceStack.length > 0) {
    const first = braceStack[0]
    diagnostics.push({
      line: first.line,
      column: first.column,
      message: '未闭合的大括号',
      severity: 'error',
    })
  }

  if (parenStack.length > 0) {
    const first = parenStack[0]
    diagnostics.push({
      line: first.line,
      column: first.column,
      message: '未闭合的括号',
      severity: 'error',
    })
  }

  if (bracketStack.length > 0) {
    const first = bracketStack[0]
    diagnostics.push({
      line: first.line,
      column: first.column,
      message: '未闭合的方括号',
      severity: 'error',
    })
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (
      token.type === TOKEN_TYPES.KEYWORD &&
      (token.value === 'query' || token.value === 'mutation' || token.value === 'subscription')
    ) {
      const nextToken = findNextNonWhitespace(tokens, i + 1)
      if (nextToken && nextToken.type === TOKEN_TYPES.IDENTIFIER) {
        if (operationNames.has(nextToken.value)) {
          diagnostics.push({
            line: nextToken.startLine,
            column: nextToken.startColumn,
            message: `重复的操作名称: ${nextToken.value}`,
            severity: 'error',
          })
        } else {
          operationNames.add(nextToken.value)
        }
      }
    }
  }

  const hasErrors = diagnostics.some(d => d.severity === 'error')

  return {
    diagnostics,
    error: hasErrors
      ? createError(
          ERROR_CODES.VALIDATION_FAILED,
          '发现 ' + diagnostics.length + ' 个问题'
        )
      : null,
  }
}

function extractOutline(tokens) {
  const outline = []
  let braceDepth = 0
  let expectDefinitionBrace = false

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === TOKEN_TYPES.WHITESPACE) continue

    if (token.type === TOKEN_TYPES.KEYWORD) {
      if (token.value === 'query' || token.value === 'mutation' || token.value === 'subscription') {
        const nextToken = findNextNonWhitespace(tokens, i + 1)
        const name = nextToken && nextToken.type === TOKEN_TYPES.IDENTIFIER
          ? nextToken.value
          : '(匿名)'
        outline.push({
          type: 'operation',
          operationType: token.value,
          name,
          line: token.startLine,
          column: token.startColumn,
        })
        expectDefinitionBrace = true
      } else if (token.value === 'fragment') {
        const nextToken = findNextNonWhitespace(tokens, i + 1)
        if (nextToken && nextToken.type === TOKEN_TYPES.IDENTIFIER) {
          outline.push({
            type: 'fragment',
            name: nextToken.value,
            line: token.startLine,
            column: token.startColumn,
          })
        }
        expectDefinitionBrace = true
      }
    }

    if (token.type === TOKEN_TYPES.PUNCTUATION) {
      if (token.value === '{') {
        if (expectDefinitionBrace) {
          expectDefinitionBrace = false
        } else if (braceDepth === 0) {
          outline.push({
            type: 'operation',
            operationType: 'query',
            name: '(匿名)',
            line: token.startLine,
            column: token.startColumn,
          })
        }
        braceDepth++
      } else if (token.value === '}') {
        if (braceDepth > 0) braceDepth--
      }
    }
  }
  return outline
}

function formatTokens(tokens, params) {
  const indentStr = getIndentString(params)
  const stripComments = params.stripComments

  const result = []
  let currentIndent = 0
  let atLineStart = true
  let lastToken = null

  const shouldAddSpaceBefore = (token, last) => {
    if (!last) return false
    if (
      last.type === TOKEN_TYPES.WHITESPACE) return false
    if (last.value === '{' || last.value === '[' || last.value === '(') return false
    if (token.value === '}' || token.value === ']' || token.value === ')') return false
    if (last.value === ':' || last.value === '!' || last.value === ',') return false
    if (token.value === ':') return false
    if (last.type === TOKEN_TYPES.PUNCTUATION && token.type === TOKEN_TYPES.PUNCTUATION) {
      return false
    }
    if (last.type === TOKEN_TYPES.SPREAD) {
      if (token.type === TOKEN_TYPES.KEYWORD && token.value === 'on') {
        return true
      }
      if (token.type === TOKEN_TYPES.IDENTIFIER) {
        return false
      }
      return false
    }
    return true
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === TOKEN_TYPES.WHITESPACE) {
      continue
    }

    if (
      token.type === TOKEN_TYPES.COMMENT ||
      token.type === TOKEN_TYPES.COMMENT_LINE
    ) {
      if (stripComments) continue

      if (!atLineStart) {
        result.push('\n')
        atLineStart = true
      }
      if (atLineStart) {
        result.push(indentStr.repeat(currentIndent))
      }
      result.push(token.value)
      if (token.type === TOKEN_TYPES.COMMENT_LINE) {
        result.push('\n')
        atLineStart = true
      } else {
        atLineStart = false
      }
      lastToken = token
      continue
    }

    if (token.value === '{') {
      if (!atLineStart) {
        result.push(' ')
      }
      result.push('{')
      result.push('\n')
      currentIndent++
      atLineStart = true
      lastToken = token
      continue
    }

    if (token.value === '}') {
      if (currentIndent > 0) currentIndent--
      if (!atLineStart) {
        result.push('\n')
        atLineStart = true
      }
      if (atLineStart) {
        result.push(indentStr.repeat(currentIndent))
      }
      result.push('}')
      lastToken = token

      const nextToken = findNextNonWhitespace(tokens, i + 1)
      if (nextToken && nextToken.value !== ',' && nextToken.value !== ')') {
        result.push('\n')
        atLineStart = true
      }
      continue
    }

    if (token.value === '[') {
      if (shouldAddSpaceBefore(token, lastToken)) {
        result.push(' ')
      }
      result.push('[')
      lastToken = token
      continue
    }

    if (token.value === ']') {
      result.push(']')
      lastToken = token
      continue
    }

    if (token.value === '(') {
      if (shouldAddSpaceBefore(token, lastToken)) {
        result.push(' ')
      }
      result.push('(')
      lastToken = token
      continue
    }

    if (token.value === ')') {
      result.push(')')
      lastToken = token
      continue
    }

    if (token.value === ',') {
      result.push(',')
      result.push('\n')
      atLineStart = true
      lastToken = token
      continue
    }

    if (atLineStart) {
      result.push(indentStr.repeat(currentIndent))
    } else if (shouldAddSpaceBefore(token, lastToken)) {
      result.push(' ')
    }

    result.push(token.value)
    atLineStart = false
    lastToken = token
  }

  return result.join('').trim()
}

function compressTokens(tokens, params) {
  const stripComments = params.stripComments
  const result = []
  let lastToken = null

  const shouldAddSpace = (token, last) => {
    if (!last) return false
    if (last.type === TOKEN_TYPES.WHITESPACE) return false
    if (
      last.value === '{' || last.value === '[' || last.value === '(') return false
    if (token.value === '}' || token.value === ']' || token.value === ')') return false
    if (last.value === ':' || last.value === '!' || last.value === ',') return false
    if (token.value === ':') return false
    if (last.type === TOKEN_TYPES.PUNCTUATION && token.type === TOKEN_TYPES.PUNCTUATION) {
      return false
    }
    if (last.type === TOKEN_TYPES.SPREAD) return false
    if (last.type === TOKEN_TYPES.DIRECTIVE && token.type === TOKEN_TYPES.PUNCTUATION) {
      return false
    }
    return true
  }

  for (const token of tokens) {
    if (token.type === TOKEN_TYPES.WHITESPACE) continue

    if (
      token.type === TOKEN_TYPES.COMMENT ||
      token.type === TOKEN_TYPES.COMMENT_LINE
    ) {
      if (stripComments) continue
      result.push(' ')
      result.push(token.value)
      if (token.type === TOKEN_TYPES.COMMENT_LINE) {
        result.push('\n')
      }
      lastToken = token
      continue
    }

    if (shouldAddSpace(token, lastToken)) {
      result.push(' ')
    }

    result.push(token.value)
    lastToken = token
  }

  return result.join('').trim()
}

function extractHighlights(tokens, formattedText) {
  const formattedTokens = tokenize(formattedText)
  const highlights = []

  for (const token of formattedTokens) {
    if (token.type === TOKEN_TYPES.KEYWORD ||
        token.type === TOKEN_TYPES.BUILTIN_TYPE ||
        token.type === TOKEN_TYPES.STRING ||
        token.type === TOKEN_TYPES.NUMBER ||
        token.type === TOKEN_TYPES.VARIABLE ||
        token.type === TOKEN_TYPES.DIRECTIVE ||
        token.type === TOKEN_TYPES.COMMENT ||
        token.type === TOKEN_TYPES.COMMENT_LINE ||
        token.type === TOKEN_TYPES.SPREAD) {
      highlights.push({
        type: token.type,
        startLine: token.startLine,
        startColumn: token.startColumn,
        endLine: token.endLine,
        endColumn: token.endColumn,
        originalText: token.value,
        formattedText: token.value,
      })
    }
  }

  return highlights
}

export { formatGraphQL }
