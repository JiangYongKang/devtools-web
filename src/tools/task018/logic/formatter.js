import { TOKEN_TYPES, applyKeywordCase } from './keywords.js'
import { tokenize, buildSyntaxTree } from './parser.js'
import { getIndentString } from './params.js'
import { createError, ERROR_CODES } from './errors.js'

const LINE_BREAK_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER', 'BY', 'GROUP', 'HAVING',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'UNION',
  'INTERSECT', 'EXCEPT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN', 'LIMIT',
  'OFFSET', 'FETCH', 'WITH',
])

function formatSql(sql, params) {
  if (sql == null) {
    return {
      formattedSql: '',
      highlights: [],
      statementCount: 0,
      originalLineCount: 0,
      formattedLineCount: 0,
      ...createError(ERROR_CODES.NULL_INPUT),
    }
  }

  if (typeof sql !== 'string') {
    sql = String(sql)
  }

  if (sql.trim() === '') {
    return {
      formattedSql: '',
      highlights: [],
      statementCount: 0,
      originalLineCount: 0,
      formattedLineCount: 0,
      ...createError(ERROR_CODES.EMPTY_INPUT),
    }
  }

  if (params.indentType === 'space' && (params.indentWidth < 1 || params.indentWidth > 8)) {
    return {
      formattedSql: sql,
      highlights: [],
      statementCount: 0,
      originalLineCount: sql.split('\n').length,
      formattedLineCount: sql.split('\n').length,
      ...createError(ERROR_CODES.INVALID_INDENT),
    }
  }

  const inputSizeBytes = new Blob([sql]).size
  const maxInputBytes = params.maxInputSizeKb * 1024
  if (inputSizeBytes > maxInputBytes) {
    return {
      formattedSql: sql,
      highlights: [],
      statementCount: 0,
      originalLineCount: sql.split('\n').length,
      formattedLineCount: sql.split('\n').length,
      ...createError(ERROR_CODES.INPUT_TOO_LARGE),
    }
  }

  try {
    const tokens = tokenize(sql, params.dialect)

    let braceDepth = 0
    let parenDepth = 0
    for (const token of tokens) {
      if (token.value === '(') parenDepth++
      else if (token.value === ')') parenDepth--
      else if (token.value === '[') braceDepth++
      else if (token.value === ']') braceDepth--
    }

    if (parenDepth !== 0 || braceDepth !== 0) {
      return {
        formattedSql: sql,
        highlights: [],
        statementCount: 0,
        originalLineCount: sql.split('\n').length,
        formattedLineCount: sql.split('\n').length,
        ...createError(ERROR_CODES.TRUNCATED_INPUT),
      }
    }

    const statements = buildSyntaxTree(tokens)

    let maxNesting = 0
    let currentNesting = 0
    for (const token of tokens) {
      if (token.value === '(' || token.value === '[' || token.value === '{') {
        currentNesting++
        maxNesting = Math.max(maxNesting, currentNesting)
      } else if (token.value === ')' || token.value === ']' || token.value === '}') {
        currentNesting--
      }
    }

    if (maxNesting > params.maxNestingDepth) {
      return {
        formattedSql: sql,
        highlights: [],
        statementCount: statements.length,
        originalLineCount: sql.split('\n').length,
        formattedLineCount: sql.split('\n').length,
        ...createError(ERROR_CODES.NESTING_TOO_DEEP),
      }
    }

    const indentStr = getIndentString(params)
    const lineBreak = params.lineBreakStyle === 'windows' ? '\r\n' : '\n'

    let formattedParts = []
    let currentIndent = 0
    let atLineStart = true
    let lastToken = null
    const highlights = []
    let formattedLine = 1
    let formattedColumn = 1

    const shouldRemoveComment = (token) => {
      if (params.commentPolicy === 'preserve') return false
      if (params.commentPolicy === 'removeAll') return true
      if (params.commentPolicy === 'remove') {
        if (token.type === TOKEN_TYPES.COMMENT_LINE) return true
        if (token.type === TOKEN_TYPES.COMMENT) {
          return !token.value.startsWith('/*!')
        }
      }
      return false
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (token.type === TOKEN_TYPES.WHITESPACE) continue

      if (token.type === TOKEN_TYPES.COMMENT || token.type === TOKEN_TYPES.COMMENT_LINE) {
        if (shouldRemoveComment(token)) continue

        if (!atLineStart) {
          formattedParts.push(lineBreak)
          formattedLine++
          formattedColumn = 1
          atLineStart = true
        }

        if (atLineStart) {
          formattedParts.push(indentStr.repeat(currentIndent))
          formattedColumn += indentStr.length * currentIndent
        }

        formattedParts.push(token.value)
        const commentLines = token.value.split('\n')
        formattedLine += commentLines.length - 1
        formattedColumn = commentLines[commentLines.length - 1].length + 1

        if (token.type === TOKEN_TYPES.COMMENT_LINE) {
          formattedParts.push(lineBreak)
          formattedLine++
          formattedColumn = 1
          atLineStart = true
        } else {
          atLineStart = false
        }

        lastToken = token
        continue
      }

      const keywordUpper = token.value.toUpperCase()

      if (token.value === '(' || token.value === '[' || token.value === '{') {
        if (!atLineStart && lastToken && lastToken.type !== TOKEN_TYPES.PUNCTUATION) {
          formattedParts.push(' ')
          formattedColumn++
        }
        formattedParts.push(token.value)
        formattedColumn++
        currentIndent++
        atLineStart = false
        lastToken = token
        continue
      }

      if (token.value === ')' || token.value === ']' || token.value === '}') {
        if (currentIndent > 0) currentIndent--

        if (!atLineStart && formattedParts.length > 0) {
          const lastChar = formattedParts[formattedParts.length - 1]
          if (lastChar !== ' ' && lastChar !== lineBreak && lastChar !== '(' && lastChar !== '[') {
            if (lastChar === lineBreak) {
              formattedParts.push(indentStr.repeat(currentIndent))
              formattedColumn = indentStr.length * currentIndent + 1
            }
          }
        }

        formattedParts.push(token.value)
        formattedColumn++
        atLineStart = false
        lastToken = token
        continue
      }

      if (token.value === ',') {
        formattedParts.push(',')
        formattedColumn++

        const nextNonWhitespace = findNextNonWhitespace(tokens, i + 1)
        if (nextNonWhitespace && nextNonWhitespace.value !== ')') {
          formattedParts.push(lineBreak)
          formattedLine++
          formattedColumn = 1
          formattedParts.push(indentStr.repeat(currentIndent))
          formattedColumn += indentStr.length * currentIndent
          atLineStart = true
        }
        lastToken = token
        continue
      }

      if (token.value === ';') {
        formattedParts.push(';')
        formattedColumn++

        const nextNonWhitespace = findNextNonWhitespace(tokens, i + 1)
        if (nextNonWhitespace) {
          formattedParts.push(lineBreak)
          formattedParts.push(lineBreak)
          formattedLine += 2
          formattedColumn = 1
          currentIndent = 0
          atLineStart = true
        }
        lastToken = token
        continue
      }

      if (token.type === TOKEN_TYPES.KEYWORD) {
        if (LINE_BREAK_KEYWORDS.has(keywordUpper) && lastToken && lastToken.value !== '(' && lastToken.value !== ',') {
          const prevKeywordUpper = lastToken.type === TOKEN_TYPES.KEYWORD ? lastToken.value.toUpperCase() : ''
          
          if (!((prevKeywordUpper === 'ORDER' && keywordUpper === 'BY') ||
                (prevKeywordUpper === 'GROUP' && keywordUpper === 'BY') ||
                (prevKeywordUpper === 'INNER' && keywordUpper === 'JOIN') ||
                (prevKeywordUpper === 'LEFT' && keywordUpper === 'JOIN') ||
                (prevKeywordUpper === 'RIGHT' && keywordUpper === 'JOIN') ||
                (prevKeywordUpper === 'OUTER' && keywordUpper === 'JOIN') ||
                (prevKeywordUpper === 'FULL' && keywordUpper === 'JOIN') ||
                (prevKeywordUpper === 'CROSS' && keywordUpper === 'JOIN'))) {
            
            if (!atLineStart) {
              formattedParts.push(lineBreak)
              formattedLine++
              formattedColumn = 1
              atLineStart = true
            }
          }
        }

        if (atLineStart) {
          formattedParts.push(indentStr.repeat(currentIndent))
          formattedColumn += indentStr.length * currentIndent
        } else if (lastToken && lastToken.type !== TOKEN_TYPES.PUNCTUATION) {
          formattedParts.push(' ')
          formattedColumn++
        }

        const keywordStartLine = formattedLine
        const keywordStartColumn = formattedColumn
        const formattedKeyword = applyKeywordCase(token.value, params.keywordCase)

        formattedParts.push(formattedKeyword)
        formattedColumn += formattedKeyword.length

        if (params.includeHighlight) {
          highlights.push({
            type: TOKEN_TYPES.KEYWORD,
            startLine: keywordStartLine,
            startColumn: keywordStartColumn,
            endLine: formattedLine,
            endColumn: formattedColumn,
            originalText: token.value,
            formattedText: formattedKeyword,
          })
        }

        atLineStart = false
        lastToken = token
        continue
      }

      if (token.type === TOKEN_TYPES.FUNCTION) {
        if (atLineStart) {
          formattedParts.push(indentStr.repeat(currentIndent))
          formattedColumn += indentStr.length * currentIndent
        } else if (lastToken && lastToken.type !== TOKEN_TYPES.PUNCTUATION) {
          formattedParts.push(' ')
          formattedColumn++
        }

        const funcStartLine = formattedLine
        const funcStartColumn = formattedColumn
        const formattedFunc = applyKeywordCase(token.value, params.keywordCase)

        formattedParts.push(formattedFunc)
        formattedColumn += formattedFunc.length

        if (params.includeHighlight) {
          highlights.push({
            type: TOKEN_TYPES.FUNCTION,
            startLine: funcStartLine,
            startColumn: funcStartColumn,
            endLine: formattedLine,
            endColumn: formattedColumn,
            originalText: token.value,
            formattedText: formattedFunc,
          })
        }

        atLineStart = false
        lastToken = token
        continue
      }

      if (atLineStart) {
        formattedParts.push(indentStr.repeat(currentIndent))
        formattedColumn += indentStr.length * currentIndent
      } else if (lastToken && 
                 lastToken.type !== TOKEN_TYPES.PUNCTUATION && 
                 lastToken.value !== '(' && 
                 lastToken.value !== '[') {
        formattedParts.push(' ')
        formattedColumn++
      }

      formattedParts.push(token.value)
      formattedColumn += token.value.length

      if (params.includeHighlight && token.type === TOKEN_TYPES.IDENTIFIER) {
        highlights.push({
          type: TOKEN_TYPES.IDENTIFIER,
          startLine: formattedLine,
          startColumn: formattedColumn - token.value.length,
          endLine: formattedLine,
          endColumn: formattedColumn,
          originalText: token.value,
          formattedText: token.value,
        })
      }

      atLineStart = false
      lastToken = token
    }

    const formattedSql = formattedParts.join('').replace(/\n{3,}/g, '\n\n').trim()
    const originalLineCount = sql.split('\n').length
    const formattedLineCount = formattedSql ? formattedSql.split('\n').length : 0

    return {
      formattedSql,
      highlights: params.includeHighlight ? highlights : [],
      statementCount: statements.length,
      originalLineCount,
      formattedLineCount,
      errorCode: null,
      errorMessage: null,
    }
  } catch (err) {
    return {
      formattedSql: sql,
      highlights: [],
      statementCount: 0,
      originalLineCount: sql.split('\n').length,
      formattedLineCount: sql.split('\n').length,
      ...createError(ERROR_CODES.PARSE_FAILED, err?.message || 'Unknown error'),
    }
  }
}

function findNextNonWhitespace(tokens, startIndex) {
  for (let i = startIndex; i < tokens.length; i++) {
    if (tokens[i].type !== TOKEN_TYPES.WHITESPACE) {
      return tokens[i]
    }
  }
  return null
}

export { formatSql }
