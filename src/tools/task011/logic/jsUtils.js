const MAX_SAFE_INPUT_SIZE = 500 * 1024
const MAX_NESTING_DEPTH = 100

const ErrorCode = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_INDENT: 'INVALID_INDENT',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  TRUNCATED_INPUT: 'TRUNCATED_INPUT',
  NESTING_TOO_DEEP: 'NESTING_TOO_DEEP',
  PARSE_FAILED: 'PARSE_FAILED',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
}

const ErrorMessages = {
  [ErrorCode.NULL_INPUT]: '输入为空',
  [ErrorCode.EMPTY_INPUT]: '输入内容为空',
  [ErrorCode.INVALID_INDENT]: '缩进值无效，应使用 2、4、8 或 "tab"',
  [ErrorCode.INPUT_TOO_LARGE]: '输入内容过大',
  [ErrorCode.TRUNCATED_INPUT]: '输入内容已被截断',
  [ErrorCode.NESTING_TOO_DEEP]: '代码嵌套层级过深',
  [ErrorCode.PARSE_FAILED]: 'JavaScript 语法错误',
  [ErrorCode.INVALID_PARAMETER]: '参数无效',
}

function getErrorMessage(code) {
  return ErrorMessages[code] || '未知错误'
}

function createError(code, message, snippet = null) {
  return {
    success: false,
    errorCode: code,
    errorMessage: message || getErrorMessage(code),
    snippet,
  }
}

function createSuccess(result, mode, originalSize, outputSize) {
  return {
    success: true,
    output: result,
    originalSize,
    outputSize,
    mode,
  }
}

function getByteSize(str) {
  if (typeof str !== 'string') return 0
  return new TextEncoder().encode(str).length
}

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const safeIndex = Math.min(i, units.length - 1)
  return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(2)) + ' ' + units[safeIndex]
}

function validateIndent(indent) {
  if (indent === 'tab' || indent === '\t') return true
  if (typeof indent === 'number') {
    return indent === 2 || indent === 4 || indent === 8
  }
  return false
}

function getIndentString(indent) {
  if (indent === 'tab' || indent === '\t') return '\t'
  if (validateIndent(indent)) {
    if (typeof indent === 'number') {
      return ' '.repeat(indent)
    }
    return '\t'
  }
  return '  '
}

const TokenType = {
  STRING: 'string',
  NUMBER: 'number',
  IDENTIFIER: 'identifier',
  KEYWORD: 'keyword',
  OPERATOR: 'operator',
  PUNCTUATOR: 'punctuator',
  COMMENT: 'comment',
  WHITESPACE: 'whitespace',
  NEWLINE: 'newline',
  REGEX: 'regex',
  JSX_OPEN_TAG: 'jsx_open_tag',
  JSX_CLOSE_TAG: 'jsx_close_tag',
  JSX_SELF_CLOSING_TAG: 'jsx_self_closing_tag',
  JSX_FRAGMENT_OPEN: 'jsx_fragment_open',
  JSX_FRAGMENT_CLOSE: 'jsx_fragment_close',
  JSX_EXPRESSION_OPEN: 'jsx_expression_open',
  JSX_EXPRESSION_CLOSE: 'jsx_expression_close',
}

const KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
  'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'yield', 'let', 'async', 'await',
  'of', 'null', 'true', 'false', 'undefined',
])

const OPERATORS = new Set([
  '===', '!==', '==', '!=', '<=', '>=', '&&', '||', '++', '--',
  '=>', '**', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
  '<<=', '>>=', '>>>=', '??=', '&&=', '||=', '...', '?.',
  '+', '-', '*', '/', '%', '<', '>', '!', '~', '&', '|',
  '^', '?', ':', '=',
])

function tokenizeJs(code) {
  const tokens = []
  let index = 0
  const length = code.length
  let line = 1
  let column = 1
  let inJsx = 0

  function createToken(type, value, start, end) {
    return {
      type,
      value,
      line,
      column,
      start,
      end,
    }
  }

  function parseString(quote) {
    const startIndex = index - 1
    let string = quote
    let templateDepth = 0

    while (index < length) {
      const c = code[index]
      string += c
      index++
      column++

      if (c === '\\') {
        if (index < length) {
          string += code[index]
          if (code[index] === '\n') {
            line++
            column = 1
          } else {
            column++
          }
          index++
        }
        continue
      }

      if (quote === '`') {
        if (c === '$' && index < length && code[index] === '{') {
          string += code[index]
          index++
          column++
          templateDepth++
          continue
        }
        if (c === '}' && templateDepth > 0) {
          templateDepth--
          continue
        }
      }

      if (c === quote && templateDepth === 0) {
        break
      }
    }

    tokens.push(createToken(TokenType.STRING, string, startIndex, index))
  }

  function parseJsxTag() {
    const startIndex = index - 1
    let tag = '<'
    let inString = null
    let bracketDepth = 0

    while (index < length) {
      const c = code[index]

      if (inString) {
        tag += c
        index++
        column++
        if (c === '\\' && index < length) {
          tag += code[index]
          index++
          column++
          continue
        }
        if (c === inString) {
          inString = null
        }
        continue
      }

      if (c === '"' || c === "'") {
        inString = c
        tag += c
        index++
        column++
        continue
      }

      if (c === '{') {
        bracketDepth++
        tag += c
        index++
        column++
        continue
      }

      if (c === '}') {
        if (bracketDepth > 0) {
          bracketDepth--
          tag += c
          index++
          column++
          continue
        }
        break
      }

      if (c === '>') {
        tag += c
        index++
        column++
        break
      }

      if (c === '\n') {
        tag += c
        index++
        line++
        column = 1
        continue
      }

      tag += c
      index++
      column++
    }

    if (tag.startsWith('<>')) {
      tokens.push(createToken(TokenType.JSX_FRAGMENT_OPEN, tag, startIndex, index))
    } else if (tag.startsWith('</>')) {
      tokens.push(createToken(TokenType.JSX_FRAGMENT_CLOSE, tag, startIndex, index))
    } else if (tag.startsWith('</')) {
      tokens.push(createToken(TokenType.JSX_CLOSE_TAG, tag, startIndex, index))
    } else if (tag.endsWith('/>')) {
      tokens.push(createToken(TokenType.JSX_SELF_CLOSING_TAG, tag, startIndex, index))
    } else {
      tokens.push(createToken(TokenType.JSX_OPEN_TAG, tag, startIndex, index))
    }
  }

  while (index < length) {
    const startIndex = index
    const char = code[index]

    if (char === ' ' || char === '\t') {
      let whitespace = ''
      while (index < length && (code[index] === ' ' || code[index] === '\t')) {
        whitespace += code[index]
        index++
        column++
      }
      tokens.push(createToken(TokenType.WHITESPACE, whitespace, startIndex, index))
      continue
    }

    if (char === '\n' || (char === '\r' && code[index + 1] === '\n')) {
      if (char === '\r') {
        index += 2
      } else {
        index++
      }
      line++
      column = 1
      tokens.push(createToken(TokenType.NEWLINE, '\n', startIndex, index))
      continue
    }

    if (char === '\r') {
      index++
      line++
      column = 1
      tokens.push(createToken(TokenType.NEWLINE, '\n', startIndex, index))
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      index++
      column++
      parseString(char)
      continue
    }

    if (char === '<') {
      const nextChar = code[index + 1]
      const isClosingTag = nextChar === '/'
      const afterSlash = isClosingTag ? code[index + 2] : null
      const isFragmentStart = nextChar === '>'
      const isFragmentEnd = isClosingTag && afterSlash === '>'
      const isOpenTag = /[a-zA-Z]/.test(nextChar)
      const isCloseTag = isClosingTag && /[a-zA-Z]/.test(afterSlash)
      const isTag = isOpenTag || isCloseTag || isFragmentStart || isFragmentEnd

      if (isTag) {
        index++
        column++
        parseJsxTag()
        continue
      }
    }

    if (char === '/') {
      if (code[index + 1] === '/') {
        let comment = ''
        while (index < length && code[index] !== '\n' && code[index] !== '\r') {
          comment += code[index]
          index++
          column++
        }
        tokens.push(createToken(TokenType.COMMENT, comment, startIndex, index))
        continue
      }

      if (code[index + 1] === '*') {
        let comment = '/*'
        index += 2
        column += 2
        while (index < length) {
          if (code[index] === '*' && code[index + 1] === '/') {
            comment += '*/'
            index += 2
            column += 2
            break
          }
          if (code[index] === '\n') {
            comment += '\n'
            index++
            line++
            column = 1
          } else {
            comment += code[index]
            index++
            column++
          }
        }
        tokens.push(createToken(TokenType.COMMENT, comment, startIndex, index))
        continue
      }

      let regex = '/'
      index++
      column++
      let inCharClass = false

      while (index < length) {
        const c = code[index]
        regex += c
        index++
        column++

        if (c === '\\') {
          if (index < length) {
            regex += code[index]
            index++
            column++
          }
          continue
        }

        if (c === '[') {
          inCharClass = true
          continue
        }

        if (c === ']') {
          inCharClass = false
          continue
        }

        if (c === '/' && !inCharClass) {
          while (index < length && /[gimsuy]/.test(code[index])) {
            regex += code[index]
            index++
            column++
          }
          break
        }
      }

      tokens.push(createToken(TokenType.REGEX, regex, startIndex, index))
      continue
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(code[index + 1]))) {
      let number = ''
      const isHex = char === '0' && (code[index + 1] === 'x' || code[index + 1] === 'X')
      const isOct = char === '0' && (code[index + 1] === 'o' || code[index + 1] === 'O')
      const isBin = char === '0' && (code[index + 1] === 'b' || code[index + 1] === 'B')

      while (index < length) {
        const c = code[index]
        const allowed = isHex
          ? /[0-9a-fA-FxX]/
          : isOct
          ? /[0-7oO]/
          : isBin
          ? /[01bB]/
          : /[0-9.eE+\-]/

        if (!allowed.test(c)) break

        number += c
        index++
        column++
      }

      if (index < length && (code[index] === 'n' || code[index] === 'N')) {
        number += code[index]
        index++
        column++
      }

      tokens.push(createToken(TokenType.NUMBER, number, startIndex, index))
      continue
    }

    if (/[a-zA-Z_$]/.test(char)) {
      let identifier = ''
      while (index < length && /[a-zA-Z0-9_$]/.test(code[index])) {
        identifier += code[index]
        index++
        column++
      }

      const type = KEYWORDS.has(identifier) ? TokenType.KEYWORD : TokenType.IDENTIFIER
      tokens.push(createToken(type, identifier, startIndex, index))
      continue
    }

    let matched = false
    for (let len = 4; len >= 1; len--) {
      if (index + len <= length) {
        const op = code.slice(index, index + len)
        if (OPERATORS.has(op)) {
          tokens.push(createToken(TokenType.OPERATOR, op, startIndex, index + len))
          index += len
          column += len
          matched = true
          break
        }
      }
    }

    if (matched) continue

    if (/[{}()\[\];,.]/.test(char)) {
      tokens.push(createToken(TokenType.PUNCTUATOR, char, startIndex, index + 1))
      index++
      column++
      continue
    }

    index++
    column++
  }

  return tokens
}

const JSX_TOKEN_TYPES = new Set([
  TokenType.JSX_OPEN_TAG,
  TokenType.JSX_CLOSE_TAG,
  TokenType.JSX_SELF_CLOSING_TAG,
  TokenType.JSX_FRAGMENT_OPEN,
  TokenType.JSX_FRAGMENT_CLOSE,
  TokenType.JSX_EXPRESSION_OPEN,
  TokenType.JSX_EXPRESSION_CLOSE,
])

function formatJs(code, options = {}) {
  const indent = getIndentString(options.indent || 2)
  const result = []
  let indentLevel = 0
  let jsxIndentLevel = 0
  let lastToken = null

  const tokens = tokenizeJs(code)

  for (const token of tokens) {
    if (token.type === TokenType.WHITESPACE) continue

    if (token.type === TokenType.NEWLINE) {
      if (result.length > 0 && result[result.length - 1] !== '\n') {
        result.push('\n')
      }
      continue
    }

    if (token.type === TokenType.COMMENT) {
      if (result.length > 0) {
        result.push('\n')
      }
      result.push(indent.repeat(indentLevel + jsxIndentLevel) + token.value)
      result.push('\n')
      continue
    }

    if (JSX_TOKEN_TYPES.has(token.type)) {
      if (token.type === TokenType.JSX_OPEN_TAG || token.type === TokenType.JSX_FRAGMENT_OPEN) {
        if (lastToken && lastToken.type !== TokenType.OPERATOR && lastToken.type !== TokenType.KEYWORD) {
          if (lastToken.type !== TokenType.PUNCTUATOR || (lastToken.value !== '(' && lastToken.value !== '=' && lastToken.value !== ',')) {
            result.push(' ')
          }
        }
        result.push(token.value)
        jsxIndentLevel++
      } else if (token.type === TokenType.JSX_CLOSE_TAG || token.type === TokenType.JSX_FRAGMENT_CLOSE) {
        jsxIndentLevel = Math.max(0, jsxIndentLevel - 1)
        result.push(token.value)
      } else if (token.type === TokenType.JSX_SELF_CLOSING_TAG) {
        if (lastToken && lastToken.type !== TokenType.OPERATOR && lastToken.type !== TokenType.KEYWORD) {
          if (lastToken.type !== TokenType.PUNCTUATOR || (lastToken.value !== '(' && lastToken.value !== '=' && lastToken.value !== ',')) {
            result.push(' ')
          }
        }
        result.push(token.value)
      } else {
        result.push(token.value)
      }
      lastToken = token
      continue
    }

    if (token.type === TokenType.PUNCTUATOR) {
      if (token.value === '{') {
        if (lastToken && lastToken.type !== TokenType.OPERATOR && lastToken.value !== ':') {
          result.push(' ')
        }
        result.push('{')
        indentLevel++
      } else if (token.value === '}') {
        indentLevel = Math.max(0, indentLevel - 1)
        if (lastToken && lastToken.value !== '{') {
          result.push('\n' + indent.repeat(indentLevel + jsxIndentLevel))
        }
        result.push('}')
      } else if (token.value === '[') {
        result.push('[')
      } else if (token.value === ']') {
        result.push(']')
      } else if (token.value === '(') {
        if (lastToken && lastToken.type === TokenType.KEYWORD) {
          result.push(' ')
        }
        result.push('(')
      } else if (token.value === ')') {
        result.push(')')
      } else if (token.value === ';') {
        result.push(';')
      } else if (token.value === ',') {
        result.push(', ')
      } else if (token.value === '.') {
        result.push('.')
      }
    } else if (token.type === TokenType.OPERATOR) {
      if (token.value === ':' && lastToken && lastToken.type === TokenType.KEYWORD) {
        result.push(': ')
      } else if (token.value === '++' || token.value === '--' || token.value === '!') {
        result.push(token.value)
      } else {
        result.push(' ' + token.value + ' ')
      }
    } else {
      if (lastToken) {
        if (
          (lastToken.type === TokenType.IDENTIFIER || lastToken.type === TokenType.KEYWORD) &&
          (token.type === TokenType.IDENTIFIER || token.type === TokenType.KEYWORD ||
           token.type === TokenType.NUMBER || token.type === TokenType.STRING)
        ) {
          result.push(' ')
        }
        if (
          lastToken.type === TokenType.NUMBER &&
          (token.type === TokenType.IDENTIFIER || token.type === TokenType.KEYWORD)
        ) {
          result.push(' ')
        }
        if (
          lastToken.type === TokenType.PUNCTUATOR &&
          (lastToken.value === ')' || lastToken.value === ']' || lastToken.value === '}') &&
          (token.type === TokenType.IDENTIFIER || token.type === TokenType.KEYWORD ||
           token.type === TokenType.NUMBER || token.type === TokenType.STRING)
        ) {
          result.push(' ')
        }
      }
      result.push(token.value)
    }

    if (token.type === TokenType.PUNCTUATOR && (token.value === ';' || token.value === ',')) {
      result.push('\n' + indent.repeat(indentLevel + jsxIndentLevel))
    }

    lastToken = token
  }

  let output = result.join('')
  output = output.replace(/\n{3,}/g, '\n\n')
  output = output.replace(/[ \t]+\n/g, '\n')
  output = output.trim()

  return output
}

function minifyJs(code, options = {}) {
  const removeComments = options.removeComments !== false
  const result = []
  let lastToken = null

  const tokens = tokenizeJs(code)

  for (const token of tokens) {
    if (token.type === TokenType.WHITESPACE || token.type === TokenType.NEWLINE) continue

    if (token.type === TokenType.COMMENT) {
      if (!removeComments) {
        result.push(token.value)
      }
      continue
    }

    if (lastToken) {
      const needsSpace = (
        (lastToken.type === TokenType.IDENTIFIER || lastToken.type === TokenType.KEYWORD) &&
        (token.type === TokenType.IDENTIFIER || token.type === TokenType.KEYWORD ||
         token.type === TokenType.NUMBER)
      ) || (
        lastToken.type === TokenType.NUMBER &&
        (token.type === TokenType.IDENTIFIER || token.type === TokenType.KEYWORD)
      ) || (
        lastToken.type === TokenType.OPERATOR &&
        (token.value === '+' || token.value === '-') &&
        (lastToken.value === '+' || lastToken.value === '-')
      ) || (
        lastToken.type === TokenType.KEYWORD &&
        token.type === TokenType.NUMBER
      ) || (
        (lastToken.type === TokenType.IDENTIFIER || lastToken.type === TokenType.KEYWORD || lastToken.type === TokenType.STRING || lastToken.type === TokenType.NUMBER || lastToken.type === TokenType.REGEX) &&
        JSX_TOKEN_TYPES.has(token.type)
      ) || (
        JSX_TOKEN_TYPES.has(lastToken.type) &&
        (token.type === TokenType.IDENTIFIER || token.type === TokenType.KEYWORD || token.type === TokenType.NUMBER)
      ) || (
        JSX_TOKEN_TYPES.has(lastToken.type) &&
        JSX_TOKEN_TYPES.has(token.type)
      )

      if (needsSpace) {
        result.push(' ')
      }
    }

    result.push(token.value)
    lastToken = token
  }

  let output = result.join('')
  output = output.trim()

  return output
}

function processJs(input, options = {}) {
  const { mode = 'format', indent = 2, removeComments = true, maxInputSize = MAX_SAFE_INPUT_SIZE } = options

  if (input === null || input === undefined) {
    return createError(ErrorCode.NULL_INPUT)
  }

  if (typeof input !== 'string') {
    return createError(ErrorCode.INVALID_PARAMETER, '输入必须是字符串')
  }

  const originalSize = getByteSize(input)

  if (originalSize === 0 || !input.trim()) {
    return createError(ErrorCode.EMPTY_INPUT)
  }

  if (originalSize > maxInputSize * 2) {
    return createError(ErrorCode.INPUT_TOO_LARGE, `输入内容过大（${formatBytes(originalSize)}），建议使用小于 ${formatBytes(maxInputSize)} 的内容`)
  }

  if (mode === 'format' && !validateIndent(indent)) {
    return createError(ErrorCode.INVALID_INDENT)
  }

  let nestingDepth = 0
  let bracketDepth = 0
  let parenDepth = 0
  const tokens = tokenizeJs(input)

  for (const token of tokens) {
    if (token.type === TokenType.PUNCTUATOR) {
      if (token.value === '{') {
        nestingDepth++
        bracketDepth++
      } else if (token.value === '}') {
        nestingDepth--
        bracketDepth--
      } else if (token.value === '[') {
        nestingDepth++
      } else if (token.value === ']') {
        nestingDepth--
      } else if (token.value === '(') {
        parenDepth++
      } else if (token.value === ')') {
        parenDepth--
      }
    }

    if (nestingDepth > MAX_NESTING_DEPTH) {
      return createError(ErrorCode.NESTING_TOO_DEEP, `代码嵌套层级超过最大限制（${MAX_NESTING_DEPTH}层）`)
    }
  }

  let output
  try {
    if (mode === 'format') {
      output = formatJs(input, { indent })
    } else {
      output = minifyJs(input, { removeComments })
    }
  } catch (e) {
    let snippet = null
    if (tokens.length > 0) {
      const lastToken = tokens[tokens.length - 1]
      const snippetStart = Math.max(0, lastToken.start - 20)
      const snippetEnd = Math.min(input.length, lastToken.end + 20)
      snippet = input.slice(snippetStart, snippetEnd)
    }
    return createError(ErrorCode.PARSE_FAILED, e?.message || 'JavaScript 语法错误', snippet)
  }

  const outputSize = getByteSize(output)

  return createSuccess(output, mode, originalSize, outputSize)
}

export {
  MAX_SAFE_INPUT_SIZE,
  MAX_NESTING_DEPTH,
  ErrorCode,
  ErrorMessages,
  getErrorMessage,
  TokenType,
  KEYWORDS,
  OPERATORS,
  getByteSize,
  escapeHtml,
  formatBytes,
  validateIndent,
  getIndentString,
  tokenizeJs,
  formatJs,
  minifyJs,
  processJs,
}
