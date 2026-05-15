import { TOKEN_TYPES, MAX_BLOCK_DEPTH } from './constants'
import {
  createUnexpectedTokenError,
  createUnclosedTagError,
  createUnexpectedEOFError,
} from './errors'

export const NODE_TYPES = {
  ROOT: 'ROOT',
  TEXT: 'TEXT',
  VARIABLE: 'VARIABLE',
  IF_BLOCK: 'IF_BLOCK',
  EACH_BLOCK: 'EACH_BLOCK',
}

export function parse(tokens) {
  let pos = 0
  const warnings = []

  function peek(offset = 0) {
    return tokens[pos + offset]
  }

  function advance() {
    return tokens[pos++]
  }

  function expect(type) {
    const token = advance()
    if (!token || token.type !== type) {
      throw createUnexpectedTokenError(token || { line: token?.line || 1, column: token?.column || 1, value: '' }, type)
    }
    return token
  }

  function parseBlock(stopTypes = [], depth = 0) {
    if (depth > MAX_BLOCK_DEPTH) {
      throw new Error(`超过最大嵌套深度: ${MAX_BLOCK_DEPTH}`)
    }

    const nodes = []

    while (pos < tokens.length) {
      const current = peek()

      if (stopTypes.includes(current.type)) {
        break
      }

      switch (current.type) {
        case TOKEN_TYPES.TEXT: {
          advance()
          nodes.push({
            type: NODE_TYPES.TEXT,
            value: current.value,
            line: current.line,
            column: current.column,
          })
          break
        }

        case TOKEN_TYPES.VARIABLE: {
          advance()
          const { path, filters } = parseVariableExpression(current.value)
          nodes.push({
            type: NODE_TYPES.VARIABLE,
            path,
            filters,
            line: current.line,
            column: current.column,
          })
          break
        }

        case TOKEN_TYPES.IF_OPEN: {
          advance()
          const condition = current.value
          const openLine = current.line
          const openColumn = current.column

          const children = parseBlock([TOKEN_TYPES.IF_CLOSE], depth + 1)

          if (pos >= tokens.length) {
            throw createUnclosedTagError('if', openLine, openColumn)
          }

          expect(TOKEN_TYPES.IF_CLOSE)

          nodes.push({
            type: NODE_TYPES.IF_BLOCK,
            condition,
            children,
            line: openLine,
            column: openColumn,
          })
          break
        }

        case TOKEN_TYPES.EACH_OPEN: {
          advance()
          const listPath = current.value
          const openLine = current.line
          const openColumn = current.column

          const children = parseBlock([TOKEN_TYPES.EACH_CLOSE], depth + 1)

          if (pos >= tokens.length) {
            throw createUnclosedTagError('each', openLine, openColumn)
          }

          expect(TOKEN_TYPES.EACH_CLOSE)

          nodes.push({
            type: NODE_TYPES.EACH_BLOCK,
            listPath,
            children,
            line: openLine,
            column: openColumn,
          })
          break
        }

        default:
          throw createUnexpectedTokenError(current)
      }
    }

    return nodes
  }

  const children = parseBlock([])

  if (pos < tokens.length) {
    throw createUnexpectedTokenError(peek())
  }

  return {
    type: NODE_TYPES.ROOT,
    children,
    warnings,
  }
}

export function parseVariableExpression(expression) {
  const parts = expression.split('|')
  const path = parts[0].trim()
  const filters = []

  for (let i = 1; i < parts.length; i++) {
    const filterPart = parts[i].trim()
    const filterMatch = filterPart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:\((.*)\))?$/)
    
    if (filterMatch) {
      const [, filterName, argsStr] = filterMatch
      const args = argsStr
        ? argsStr.split(',').map((a) => a.trim().replace(/^["']|["']$/g, ''))
        : []
      filters.push({ name: filterName, args })
    } else {
      filters.push({ name: filterPart, args: [] })
    }
  }

  return { path, filters }
}
