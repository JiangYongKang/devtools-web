import { TOKEN_TYPES, isKeyword } from './keywords.js'

function tokenize(sql, dialect = 'standard') {
  const tokens = []
  let i = 0
  const len = sql.length
  let line = 1
  let column = 1

  while (i < len) {
    const char = sql[i]
    const startLine = line
    const startColumn = column

    if (char === '-' && sql[i + 1] === '-') {
      let j = i + 2
      while (j < len && sql[j] !== '\n') {
        j++
      }
      tokens.push({
        type: TOKEN_TYPES.COMMENT_LINE,
        value: sql.slice(i, j),
        start: i,
        end: j,
        startLine,
        startColumn,
        endLine: line,
        endColumn: column + (j - i),
      })
      i = j
      if (sql[i] === '\n') {
        line++
        column = 1
        i++
      }
      continue
    }

    if (char === '/' && sql[i + 1] === '*') {
      let j = i + 2
      let nestedLevel = 1
      let endLine = line
      let endColumn = column + 2

      while (j < len && nestedLevel > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') {
          nestedLevel++
          j += 2
          endColumn += 2
        } else if (sql[j] === '*' && sql[j + 1] === '/') {
          nestedLevel--
          j += 2
          endColumn += 2
          if (nestedLevel === 0) break
        } else if (sql[j] === '\n') {
          endLine++
          endColumn = 1
          j++
        } else {
          endColumn++
          j++
        }
      }

      if (nestedLevel > 0) {
        throw new Error('未闭合的注释')
      }

      tokens.push({
        type: TOKEN_TYPES.COMMENT,
        value: sql.slice(i, j),
        start: i,
        end: j,
        startLine,
        startColumn,
        endLine,
        endColumn,
      })
      i = j
      line = endLine
      column = endColumn
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      let j = i + 1
      let endLine = line
      let endColumn = column + 1

      while (j < len) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            j += 2
            endColumn += 2
            continue
          }
          j++
          endColumn++
          break
        }
        if (sql[j] === '\\' && j + 1 < len) {
          j += 2
          endColumn += 2
          continue
        }
        if (sql[j] === '\n') {
          endLine++
          endColumn = 1
          j++
          continue
        }
        j++
        endColumn++
      }

      tokens.push({
        type: TOKEN_TYPES.STRING,
        value: sql.slice(i, j),
        start: i,
        end: j,
        startLine,
        startColumn,
        endLine,
        endColumn,
      })
      i = j
      line = endLine
      column = endColumn
      continue
    }

    if (/\d/.test(char) || (char === '.' && /\d/.test(sql[i + 1]))) {
      let j = i
      let hasDot = false
      let hasExp = false

      while (j < len) {
        if (/\d/.test(sql[j])) {
          j++
        } else if (sql[j] === '.' && !hasDot) {
          hasDot = true
          j++
        } else if ((sql[j] === 'e' || sql[j] === 'E') && !hasExp && /\d/.test(sql[j - 1])) {
          hasExp = true
          j++
          if (sql[j] === '+' || sql[j] === '-') j++
        } else {
          break
        }
      }

      tokens.push({
        type: TOKEN_TYPES.NUMBER,
        value: sql.slice(i, j),
        start: i,
        end: j,
        startLine,
        startColumn,
        endLine: line,
        endColumn: column + (j - i),
      })
      i = j
      column = column + (j - i)
      continue
    }

    if (/\s/.test(char)) {
      let j = i
      let endLine = line
      let endColumn = column

      while (j < len && /\s/.test(sql[j])) {
        if (sql[j] === '\n') {
          endLine++
          endColumn = 1
        } else {
          endColumn++
        }
        j++
      }

      tokens.push({
        type: TOKEN_TYPES.WHITESPACE,
        value: sql.slice(i, j),
        start: i,
        end: j,
        startLine,
        startColumn,
        endLine,
        endColumn,
      })
      i = j
      line = endLine
      column = endColumn
      continue
    }

    if (/[a-zA-Z_]/.test(char)) {
      let j = i
      while (j < len && /[a-zA-Z0-9_]/.test(sql[j])) {
        j++
      }

      const word = sql.slice(i, j)
      const isKeywordMatch = isKeyword(word, dialect)
      const isFunction = isKeywordMatch && /^[a-zA-Z_]/.test(sql[j]) === false && sql[j] === '('

      tokens.push({
        type: isFunction ? TOKEN_TYPES.FUNCTION : isKeywordMatch ? TOKEN_TYPES.KEYWORD : TOKEN_TYPES.IDENTIFIER,
        value: word,
        start: i,
        end: j,
        startLine,
        startColumn,
        endLine: line,
        endColumn: column + (j - i),
      })
      i = j
      column = column + (j - i)
      continue
    }

    const twoCharOperators = ['<>', '!=', '<=', '>=', ':=', '||', '&&', '**', '::']
    if (i + 1 < len) {
      const twoChar = sql.slice(i, i + 2)
      if (twoCharOperators.includes(twoChar)) {
        tokens.push({
          type: TOKEN_TYPES.OPERATOR,
          value: twoChar,
          start: i,
          end: i + 2,
          startLine,
          startColumn,
          endLine: line,
          endColumn: column + 2,
        })
        i += 2
        column += 2
        continue
      }
    }

    const singleCharOperators = ['+', '-', '*', '/', '=', '<', '>', '%', '^', '~', '|', '&', '?', '@', '#']
    const punctuation = ['(', ')', '[', ']', '{', '}', ',', ';', '.', ':']

    if (singleCharOperators.includes(char)) {
      tokens.push({
        type: TOKEN_TYPES.OPERATOR,
        value: char,
        start: i,
        end: i + 1,
        startLine,
        startColumn,
        endLine: line,
        endColumn: column + 1,
      })
      i++
      column++
      continue
    }

    if (punctuation.includes(char)) {
      tokens.push({
        type: TOKEN_TYPES.PUNCTUATION,
        value: char,
        start: i,
        end: i + 1,
        startLine,
        startColumn,
        endLine: line,
        endColumn: column + 1,
      })
      i++
      column++
      continue
    }

    tokens.push({
      type: TOKEN_TYPES.IDENTIFIER,
      value: char,
      start: i,
      end: i + 1,
      startLine,
      startColumn,
      endLine: line,
      endColumn: column + 1,
    })
    i++
    column++
  }

  return tokens
}

function buildSyntaxTree(tokens) {
  const statements = []
  let currentStatement = []
  let braceDepth = 0
  let parenDepth = 0

  for (const token of tokens) {
    if (token.type === TOKEN_TYPES.WHITESPACE) continue

    currentStatement.push(token)

    if (token.value === '(') {
      parenDepth++
    } else if (token.value === ')') {
      parenDepth--
    } else if (token.value === '[') {
      braceDepth++
    } else if (token.value === ']') {
      braceDepth--
    }

    if (token.value === ';' && parenDepth === 0 && braceDepth === 0) {
      if (currentStatement.length > 0) {
        statements.push(currentStatement)
      }
      currentStatement = []
    }
  }

  if (currentStatement.length > 0) {
    statements.push(currentStatement)
  }

  return statements
}

export { tokenize, buildSyntaxTree }
