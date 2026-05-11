import { tokenize } from './parser.js'
import { TOKEN_TYPES } from './keywords.js'

function calculateHighlights(sql, dialect = 'standard') {
  try {
    const tokens = tokenize(sql, dialect)
    const highlights = []

    for (const token of tokens) {
      if (token.type === TOKEN_TYPES.KEYWORD || token.type === TOKEN_TYPES.FUNCTION) {
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

function mapHighlightsToFormatted(formattedSql, originalHighlights, params) {
  try {
    const tokens = tokenize(formattedSql, params.dialect)
    const highlights = []

    for (const token of tokens) {
      if (token.type === TOKEN_TYPES.KEYWORD || token.type === TOKEN_TYPES.FUNCTION) {
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

function renderHighlightedHtml(sql, highlights) {
  if (!highlights || highlights.length === 0) {
    return escapeHtml(sql)
  }

  const lines = sql.split('\n')
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
        const className = highlight.type === TOKEN_TYPES.KEYWORD ? 'highlight-keyword' : 'highlight-function'
        lineResult.push(`<span class="${className}">${escapeHtml(text)}</span>`)
        
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

function escapeHtml(text) {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export { calculateHighlights, mapHighlightsToFormatted, renderHighlightedHtml, escapeHtml }
