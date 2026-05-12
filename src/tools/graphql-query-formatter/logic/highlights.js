import { TOKEN_TYPES } from './constants.js'
import { tokenize } from './parser.js'

function escapeHtml(text) {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getTokenCssClass(tokenType) {
  switch (tokenType) {
    case TOKEN_TYPES.KEYWORD:
      return 'highlight-keyword'
    case TOKEN_TYPES.BUILTIN_TYPE:
      return 'highlight-type'
    case TOKEN_TYPES.STRING:
      return 'highlight-string'
    case TOKEN_TYPES.NUMBER:
      return 'highlight-number'
    case TOKEN_TYPES.VARIABLE:
      return 'highlight-variable'
    case TOKEN_TYPES.DIRECTIVE:
      return 'highlight-directive'
    case TOKEN_TYPES.COMMENT:
    case TOKEN_TYPES.COMMENT_LINE:
      return 'highlight-comment'
    case TOKEN_TYPES.SPREAD:
      return 'highlight-spread'
    default:
      return null
  }
}

function calculateHighlights(source) {
  try {
    const tokens = tokenize(source)
    const highlights = []

    for (const token of tokens) {
      const cssClass = getTokenCssClass(token.type)
      if (cssClass) {
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
  } catch {
    return []
  }
}

function renderHighlightedHtml(text, highlights) {
  if (!highlights || highlights.length === 0) {
    return escapeHtml(text)
  }

  const lines = text.split('\n')
  const result = []

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    const lineHighlights = highlights.filter(h => h.startLine === lineNum + 1)

    if (lineHighlights.length === 0) {
      result.push(escapeHtml(line))
    } else {
      lineHighlights.sort((a, b) => a.startColumn - b.startColumn)

      let currentPos = 0
      const lineResult = []

      for (const highlight of lineHighlights) {
        if (highlight.startColumn - 1 > currentPos) {
          lineResult.push(escapeHtml(line.slice(currentPos, highlight.startColumn - 1)))
        }

        const text = line.slice(highlight.startColumn - 1, highlight.endColumn - 1)
        const className = getTokenCssClass(highlight.type)
        if (className) {
          lineResult.push(`<span class="${className}">${escapeHtml(text)}</span>`)
        } else {
          lineResult.push(escapeHtml(text))
        }

        currentPos = highlight.endColumn - 1
      }

      if (currentPos < line.length) {
        lineResult.push(escapeHtml(line.slice(currentPos)))
      }

      result.push(lineResult.join(''))
    }
  }

  return result.join('\n')
}

export { escapeHtml, calculateHighlights, renderHighlightedHtml, getTokenCssClass }
