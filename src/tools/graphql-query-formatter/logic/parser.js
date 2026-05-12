import { TOKEN_TYPES, isKeyword, isBuiltinType } from './constants.js'

function tokenize(source) {
  const tokens = []
  let i = 0
  let line = 1
  let column = 1
  const len = source.length

  const addToken = (type, value, startLine, startColumn) => {
    tokens.push({
      type,
      value,
      startLine,
      startColumn,
      endLine: line,
      endColumn: column,
    })
  }

  while (i < len) {
    const ch = source[i]
    const startLine = line
    const startColumn = column

    if (ch === '\n') {
      line++
      column = 1
      i++
      addToken(TOKEN_TYPES.WHITESPACE, '\n', startLine, startColumn)
      continue
    }

    if (ch === ' ' || ch === '\t' || ch === '\r') {
      let whitespace = ''
      while (i < len && (source[i] === ' ' || source[i] === '\t' || source[i] === '\r')) {
        if (source[i] === '\r') {
          if (i + 1 < len && source[i + 1] === '\n') {
            line++
            column = 1
            i++
          }
        } else {
          column++
        }
        whitespace += source[i]
        i++
      }
      addToken(TOKEN_TYPES.WHITESPACE, whitespace, startLine, startColumn)
      continue
    }

    if (ch === '#') {
      let comment = ''
      while (i < len && source[i] !== '\n') {
        comment += source[i]
        column++
        i++
      }
      addToken(TOKEN_TYPES.COMMENT_LINE, comment, startLine, startColumn)
      continue
    }

    if (ch === '"') {
      let str = ''
      const isBlock = i + 2 < len && source[i + 1] === '"' && source[i + 2] === '"'

      if (isBlock) {
        str += '"""'
        i += 3
        column += 3

        while (i < len) {
          if (i + 2 < len && source[i] === '"' && source[i + 1] === '"' && source[i + 2] === '"') {
            str += '"""'
            i += 3
            column += 3
            break
          }
          if (source[i] === '\n') {
            line++
            column = 1
          } else {
            column++
          }
          str += source[i]
          i++
        }
      } else {
        str += '"'
        i++
        column++

        while (i < len && source[i] !== '\n' && source[i] !== '"') {
          if (source[i] === '\\' && i + 1 < len) {
            str += source[i]
            str += source[i + 1]
            i += 2
            column += 2
          } else {
            str += source[i]
            column++
            i++
          }
        }

        if (i < len && source[i] === '"') {
          str += '"'
          column++
          i++
        }
      }

      addToken(TOKEN_TYPES.STRING, str, startLine, startColumn)
      continue
    }

    if (ch === '$') {
      let name = '$'
      i++
      column++

      while (i < len && /[a-zA-Z0-9_]/.test(source[i])) {
        name += source[i]
        column++
        i++
      }

      addToken(TOKEN_TYPES.VARIABLE, name, startLine, startColumn)
      continue
    }

    if (ch === '@') {
      let directive = '@'
      i++
      column++

      while (i < len && /[a-zA-Z0-9_]/.test(source[i])) {
        directive += source[i]
        column++
        i++
      }

      addToken(TOKEN_TYPES.DIRECTIVE, directive, startLine, startColumn)
      continue
    }

    if (ch === '.') {
      if (i + 2 < len && source[i + 1] === '.' && source[i + 2] === '.') {
        i += 3
        column += 3
        addToken(TOKEN_TYPES.SPREAD, '...', startLine, startColumn)
        continue
      }
      addToken(TOKEN_TYPES.PUNCTUATION, '.', startLine, startColumn)
      column++
      i++
      continue
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let name = ''
      while (i < len && /[a-zA-Z0-9_]/.test(source[i])) {
        name += source[i]
        column++
        i++
      }

      let type = TOKEN_TYPES.IDENTIFIER
      if (isKeyword(name)) {
        type = TOKEN_TYPES.KEYWORD
      } else if (isBuiltinType(name)) {
        type = TOKEN_TYPES.BUILTIN_TYPE
      }

      addToken(type, name, startLine, startColumn)
      continue
    }

    if (ch === '-' || /[0-9]/.test(ch)) {
      let num = ''

      if (ch === '-') {
        num += '-'
        i++
        column++
      }

      while (i < len && /[0-9]/.test(source[i])) {
        num += source[i]
        column++
        i++
      }

      if (i < len && source[i] === '.') {
        num += '.'
        column++
        i++
        while (i < len && /[0-9]/.test(source[i])) {
          num += source[i]
          column++
          i++
        }
      }

      if (i < len && (source[i] === 'e' || source[i] === 'E')) {
        num += source[i]
        column++
        i++
        if (i < len && (source[i] === '+' || source[i] === '-')) {
          num += source[i]
          column++
          i++
        }
        while (i < len && /[0-9]/.test(source[i])) {
          num += source[i]
          column++
          i++
        }
      }

      addToken(TOKEN_TYPES.NUMBER, num, startLine, startColumn)
      continue
    }

    const punctuations = ['{', '}', '[', ']', '(', ')', ':', ',', '!', '=', '|', '&']
    if (punctuations.includes(ch)) {
      addToken(TOKEN_TYPES.PUNCTUATION, ch, startLine, startColumn)
      column++
      i++
      continue
    }

    addToken(TOKEN_TYPES.PUNCTUATION, ch, startLine, startColumn)
    column++
    i++
  }

  return tokens
}

function findNextNonWhitespace(tokens, startIndex) {
  for (let i = startIndex; i < tokens.length; i++) {
    if (tokens[i].type !== TOKEN_TYPES.WHITESPACE) {
      return tokens[i]
    }
  }
  return null
}

export { tokenize, findNextNonWhitespace }
