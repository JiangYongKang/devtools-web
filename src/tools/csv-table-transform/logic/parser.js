import { QUOTE_CHAR, ESCAPE_CHAR, PRESET_DELIMITERS, AUTO_DETECT_FALLBACK } from './constants.js'
import { ERROR_CODES, createError } from './errors.js'

function parseCsv(input, options = {}) {
  const {
    delimiter = PRESET_DELIMITERS.COMMA,
    hasHeader = true,
    quoteChar = QUOTE_CHAR,
    escapeChar = ESCAPE_CHAR,
  } = options

  if (!input || input.length === 0) {
    return {
      table: [],
      header: null,
      rowCount: 0,
      colCount: 0,
    }
  }

  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false
  let i = 0
  const len = input.length

  while (i < len) {
    const char = input[i]
    const nextChar = i + 1 < len ? input[i + 1] : null

    if (inQuotes) {
      if (char === quoteChar) {
        if (nextChar === escapeChar) {
          currentField += escapeChar
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        currentField += char
        i++
      }
    } else {
      if (char === quoteChar) {
        inQuotes = true
        i++
      } else if (char === delimiter) {
        currentRow.push(currentField)
        currentField = ''
        i++
      } else if (char === '\n') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i++
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i += 2
      } else if (char === '\r') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i++
      } else {
        currentField += char
        i++
      }
    }
  }

  if (inQuotes) {
    return {
      error: createError(ERROR_CODES.UNTERMINATED_QUOTE, { position: i }),
      errorCode: ERROR_CODES.UNTERMINATED_QUOTE,
      table: null,
      header: null,
      rowCount: 0,
      colCount: 0,
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  let header = null
  let dataRows = rows
  if (hasHeader && rows.length > 0) {
    header = rows[0]
    dataRows = rows.slice(1)
  }

  return {
    table: dataRows,
    header,
    rowCount: dataRows.length,
    colCount: header ? header.length : (dataRows.length > 0 ? dataRows[0].length : 0),
  }
}

function stringifyCsv(table, options = {}) {
  const {
    delimiter = PRESET_DELIMITERS.COMMA,
    header = null,
    quoteChar = QUOTE_CHAR,
    escapeChar = ESCAPE_CHAR,
  } = options

  const lines = []

  if (header) {
    lines.push(header.map((cell) => escapeCell(cell, quoteChar, escapeChar, delimiter)).join(delimiter))
  }

  for (const row of table) {
    lines.push(row.map((cell) => escapeCell(cell, quoteChar, escapeChar, delimiter)).join(delimiter))
  }

  return lines.join('\n')
}

function escapeCell(value, quoteChar, escapeChar, delimiter) {
  if (value == null) return ''
  const str = String(value)

  const needsQuoting =
    str.includes(quoteChar) ||
    str.includes(delimiter) ||
    str.includes('\n') ||
    str.includes('\r')

  if (!needsQuoting) {
    return str
  }

  const escaped = str.split(quoteChar).join(escapeChar + quoteChar)
  return quoteChar + escaped + quoteChar
}

function detectDelimiter(input, candidates = null) {
  if (!input || input.length === 0) {
    return {
      delimiter: PRESET_DELIMITERS.COMMA,
      confidence: 0,
      wasFallback: true,
      fallbackReason: '空输入',
    }
  }

  const delimitersToTry = candidates || [
    PRESET_DELIMITERS.TAB,
    PRESET_DELIMITERS.COMMA,
    PRESET_DELIMITERS.SEMICOLON,
    PRESET_DELIMITERS.PIPE,
  ]

  const firstFewLines = getFirstFewLines(input, 5)

  let bestDelimiter = null
  let bestScore = -1

  for (const delimiter of delimitersToTry) {
    const score = scoreDelimiter(firstFewLines, delimiter)
    if (score > bestScore) {
      bestScore = score
      bestDelimiter = delimiter
    }
  }

  if (bestScore <= 0) {
    return {
      delimiter: PRESET_DELIMITERS.COMMA,
      confidence: 0,
      wasFallback: true,
      fallbackReason: AUTO_DETECT_FALLBACK.MESSAGE,
    }
  }

  return {
    delimiter: bestDelimiter,
    confidence: bestScore,
    wasFallback: false,
    fallbackReason: null,
  }
}

function getFirstFewLines(input, count) {
  const lines = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < input.length && lines.length < count; i++) {
    const char = input[i]
    if (char === QUOTE_CHAR) {
      inQuotes = !inQuotes
      current += char
    } else if (!inQuotes && char === '\n') {
      lines.push(current)
      current = ''
    } else if (!inQuotes && char === '\r') {
      if (input[i + 1] === '\n') i++
      lines.push(current)
      current = ''
    } else {
      current += char
    }
  }

  if (current.length > 0 && lines.length < count) {
    lines.push(current)
  }

  return lines
}

function scoreDelimiter(lines, delimiter) {
  if (lines.length === 0) return -1

  let totalCols = 0
  let consistentCount = 0
  let maxCols = -1

  for (const line of lines) {
    const colCount = countColsIgnoringQuotes(line, delimiter)
    if (colCount > maxCols) {
      maxCols = colCount
    }
    totalCols += colCount
  }

  if (maxCols <= 1) {
    return -1
  }

  const firstLineCols = countColsIgnoringQuotes(lines[0], delimiter)

  for (const line of lines) {
    const colCount = countColsIgnoringQuotes(line, delimiter)
    if (colCount === firstLineCols && colCount > 1) {
      consistentCount++
    }
  }

  const consistencyScore = lines.length > 0 ? consistentCount / lines.length : 0
  const colsScore = Math.min(firstLineCols / 10, 1)

  return consistencyScore * 0.7 + colsScore * 0.3
}

function countColsIgnoringQuotes(line, delimiter) {
  let count = 1
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === QUOTE_CHAR) {
      inQuotes = !inQuotes
    } else if (!inQuotes && char === delimiter) {
      count++
    }
  }

  return count
}

function transposeTable(table, header = null) {
  if (!table || table.length === 0) {
    return {
      transposed: [],
      newHeader: null,
      newRowCount: 0,
      newColCount: 0,
    }
  }

  const maxCols = Math.max(...table.map(row => row.length))
  const paddedTable = table.map(row => {
    const padded = [...row]
    while (padded.length < maxCols) {
      padded.push('')
    }
    return padded
  })

  const transposed = []
  for (let col = 0; col < maxCols; col++) {
    const newRow = []
    for (let row = 0; row < paddedTable.length; row++) {
      newRow.push(paddedTable[row][col])
    }
    transposed.push(newRow)
  }

  let newHeader = null
  let transposedData = transposed

  if (header) {
    const paddedHeader = [...header]
    while (paddedHeader.length < maxCols) {
      paddedHeader.push('')
    }
    newHeader = table.map((_, rowIndex) => header[rowIndex] || `Row ${rowIndex + 1}`)
    transposedData = transposed
  }

  return {
    transposed: transposedData,
    newHeader,
    newRowCount: transposedData.length,
    newColCount: transposedData.length > 0 ? transposedData[0].length : 0,
  }
}

function normalizeCols(table, mode, expectedCols = null) {
  if (!table || table.length === 0) {
    return {
      normalized: [],
      rowCount: 0,
      maxCols: 0,
      issues: [],
    }
  }

  const maxCols = expectedCols !== null ? expectedCols : Math.max(...table.map(row => row.length))
  const minCols = Math.min(...table.map(row => row.length))
  const issues = []
  const normalized = []

  for (let rowIndex = 0; rowIndex < table.length; rowIndex++) {
    const row = table[rowIndex]
    if (row.length !== maxCols) {
      issues.push({
        row: rowIndex,
        expected: maxCols,
        actual: row.length,
      })
    }
  }

  let targetCols = maxCols
  if (mode === 'truncate') {
    targetCols = expectedCols !== null ? expectedCols : minCols
  }

  for (let rowIndex = 0; rowIndex < table.length; rowIndex++) {
    const row = table[rowIndex]

    if (mode === 'padWithEmpty') {
      const padded = [...row]
      while (padded.length < targetCols) {
        padded.push('')
      }
      normalized.push(padded)
    } else if (mode === 'truncate') {
      normalized.push(row.slice(0, targetCols))
    } else {
      normalized.push(row)
    }
  }

  return {
    normalized,
    rowCount: normalized.length,
    maxCols: targetCols,
    issues,
  }
}

export {
  parseCsv,
  stringifyCsv,
  detectDelimiter,
  transposeTable,
  normalizeCols,
  escapeCell,
}
