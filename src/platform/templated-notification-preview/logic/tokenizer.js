import { TOKEN_TYPES } from './constants'
import { createSyntaxError } from './errors'

export function tokenize(template) {
  const tokens = []
  let pos = 0
  let line = 1
  let column = 1

  while (pos < template.length) {
    const char = template[pos]

    if (char === '{' && template[pos + 1] === '{') {
      const tokenStart = { pos, line, column }
      pos += 2
      column += 2

      while (pos < template.length && /\s/.test(template[pos])) {
        if (template[pos] === '\n') {
          line++
          column = 1
        } else {
          column++
        }
        pos++
      }

      if (template[pos] === '#') {
        pos++
        column++
        const tagResult = parseTagName(template, pos, line, column)
        const tagName = tagResult.name
        pos = tagResult.pos
        column = tagResult.column

        while (pos < template.length && /\s/.test(template[pos])) {
          if (template[pos] === '\n') {
            line++
            column = 1
          } else {
            column++
          }
          pos++
        }

        const argResult = parseUntilClose(template, pos, line, column)
        const argument = argResult.value.trim()
        pos = argResult.pos
        line = argResult.line
        column = argResult.column

        let type
        if (tagName === 'if') {
          type = TOKEN_TYPES.IF_OPEN
        } else if (tagName === 'each') {
          type = TOKEN_TYPES.EACH_OPEN
        } else {
          throw createSyntaxError(`未知的块标签: ${tagName}`, tokenStart.line, tokenStart.column)
        }

        tokens.push({
          type,
          value: argument,
          line: tokenStart.line,
          column: tokenStart.column,
          raw: template.slice(tokenStart.pos, pos),
        })
      } else if (template[pos] === '/') {
        pos++
        column++
        const tagResult = parseTagName(template, pos, line, column)
        const tagName = tagResult.name
        pos = tagResult.pos
        column = tagResult.column

        while (pos < template.length && /\s/.test(template[pos])) {
          if (template[pos] === '\n') {
            line++
            column = 1
          } else {
            column++
          }
          pos++
        }

        if (template[pos] !== '}' || template[pos + 1] !== '}') {
          throw createSyntaxError('期望 }}', line, column)
        }
        pos += 2
        column += 2

        let type
        if (tagName === 'if') {
          type = TOKEN_TYPES.IF_CLOSE
        } else if (tagName === 'each') {
          type = TOKEN_TYPES.EACH_CLOSE
        } else {
          throw createSyntaxError(`未知的结束标签: ${tagName}`, tokenStart.line, tokenStart.column)
        }

        tokens.push({
          type,
          value: tagName,
          line: tokenStart.line,
          column: tokenStart.column,
          raw: template.slice(tokenStart.pos, pos),
        })
      } else {
        const varResult = parseUntilClose(template, pos, line, column)
        const varContent = varResult.value.trim()
        pos = varResult.pos
        line = varResult.line
        column = varResult.column

        tokens.push({
          type: TOKEN_TYPES.VARIABLE,
          value: varContent,
          line: tokenStart.line,
          column: tokenStart.column,
          raw: template.slice(tokenStart.pos, pos),
        })
      }
    } else {
      const textStart = { pos, line, column }
      let textValue = ''

      while (pos < template.length && !(template[pos] === '{' && template[pos + 1] === '{')) {
        if (template[pos] === '\n') {
          line++
          column = 1
        } else {
          column++
        }
        textValue += template[pos]
        pos++
      }

      if (textValue) {
        tokens.push({
          type: TOKEN_TYPES.TEXT,
          value: textValue,
          line: textStart.line,
          column: textStart.column,
          raw: textValue,
        })
      }
    }
  }

  return tokens
}

function parseTagName(template, startPos, startLine, startColumn) {
  let pos = startPos
  let column = startColumn
  let name = ''

  while (pos < template.length && /[a-zA-Z0-9_-]/.test(template[pos])) {
    name += template[pos]
    pos++
    column++
  }

  if (!name) {
    throw createSyntaxError('期望标签名', startLine, startColumn)
  }

  return { name, pos, column }
}

function parseUntilClose(template, startPos, startLine, startColumn) {
  let pos = startPos
  let line = startLine
  let column = startColumn
  let value = ''
  let braceCount = 0

  while (pos < template.length) {
    if (template[pos] === '}' && template[pos + 1] === '}' && braceCount === 0) {
      pos += 2
      column += 2
      break
    }

    if (template[pos] === '{') {
      braceCount++
    } else if (template[pos] === '}') {
      braceCount--
    }

    if (template[pos] === '\n') {
      line++
      column = 1
    } else {
      column++
    }

    value += template[pos]
    pos++
  }

  return { value, pos, line, column }
}
