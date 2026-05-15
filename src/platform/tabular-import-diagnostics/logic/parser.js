import {
  PRESET_DELIMITERS,
  COLUMN_TYPES,
  ERROR_CODES,
  BOM_CHAR,
  UTF8_REPLACEMENT_CHAR,
  QUOTE_CHAR,
  ESCAPE_CHAR,
  MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER,
  NUMBER_PATTERNS,
  BOOLEAN_VALUES,
  DATE_PATTERNS,
  DEFAULT_PREVIEW_ROWS,
  LARGE_FILE_BYTE_THRESHOLD,
  LARGE_FILE_ROW_THRESHOLD,
  CHUNK_PARSE_ROWS,
} from './constants.js'
import { createRowError } from './errors.js'

function stripBOM(input) {
  if (input.startsWith(BOM_CHAR)) {
    return {
      stripped: input.slice(1),
      hadBOM: true,
    }
  }
  return {
    stripped: input,
    hadBOM: false,
  }
}

function detectUTF8ReplacementChars(input) {
  const positions = []
  let index = input.indexOf(UTF8_REPLACEMENT_CHAR)
  while (index !== -1) {
    positions.push(index)
    index = input.indexOf(UTF8_REPLACEMENT_CHAR, index + 1)
  }
  return positions
}

function scoreDelimiterByConsistency(input, delimiter, sampleLines = 10) {
  const lines = getFirstNLines(input, sampleLines)
  if (lines.length < 2) return 0

  const colCounts = []
  for (const line of lines) {
    let inQuotes = false
    let count = 1
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === QUOTE_CHAR) {
        inQuotes = !inQuotes
      } else if (!inQuotes && char === delimiter) {
        count++
      }
    }
    colCounts.push(count)
  }

  const firstCount = colCounts[0]
  if (firstCount <= 1) return 0

  let consistent = 0
  for (const count of colCounts) {
    if (count === firstCount) consistent++
  }

  return consistent / colCounts.length
}

function detectDecimalSeparator(input, sampleLines = 20) {
  const lines = getFirstNLines(input, sampleLines)
  let commaDecimal = 0
  let dotDecimal = 0

  for (const line of lines) {
    const cells = line.split(/[,;\t]/)
    for (const cell of cells) {
      const trimmed = cell.trim()
      if (NUMBER_PATTERNS.EU.test(trimmed) && trimmed.includes(',')) {
        commaDecimal++
      }
      if (NUMBER_PATTERNS.US.test(trimmed) && trimmed.includes('.')) {
        dotDecimal++
      }
    }
  }

  if (commaDecimal > dotDecimal) {
    return { separator: ',', confidence: commaDecimal / (commaDecimal + dotDecimal || 1) }
  }
  return { separator: '.', confidence: dotDecimal / (commaDecimal + dotDecimal || 1) }
}

function detectDelimiter(input) {
  const candidates = [PRESET_DELIMITERS.TAB, PRESET_DELIMITERS.COMMA, PRESET_DELIMITERS.SEMICOLON]
  let bestDelimiter = PRESET_DELIMITERS.COMMA
  let bestScore = 0

  for (const delimiter of candidates) {
    const score = scoreDelimiterByConsistency(input, delimiter)
    if (score > bestScore) {
      bestScore = score
      bestDelimiter = delimiter
    }
  }

  return {
    delimiter: bestDelimiter,
    confidence: bestScore,
    wasFallback: bestScore === 0,
  }
}

function getFirstNLines(input, n) {
  const lines = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < input.length && lines.length < n; i++) {
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

  if (current.length > 0 && lines.length < n) {
    lines.push(current)
  }

  return lines
}

function inferColumnType(value) {
  if (value == null || value === '') {
    return COLUMN_TYPES.STRING
  }

  const trimmed = String(value).trim()
  const lower = trimmed.toLowerCase()

  if (BOOLEAN_VALUES.true.includes(lower) || BOOLEAN_VALUES.false.includes(lower)) {
    return COLUMN_TYPES.BOOLEAN
  }

  for (const pattern of DATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return COLUMN_TYPES.DATE
    }
  }

  if (NUMBER_PATTERNS.STANDARD.test(trimmed) ||
      NUMBER_PATTERNS.US.test(trimmed) ||
      NUMBER_PATTERNS.EU.test(trimmed)) {
    return COLUMN_TYPES.NUMBER
  }

  return COLUMN_TYPES.STRING
}

function parseCellValue(rawValue, type) {
  if (rawValue == null || rawValue === '') {
    return null
  }

  const trimmed = String(rawValue).trim()

  if (type === COLUMN_TYPES.BOOLEAN) {
    const lower = trimmed.toLowerCase()
    return BOOLEAN_VALUES.true.includes(lower)
  }

  if (type === COLUMN_TYPES.NUMBER) {
    const normalized = trimmed.replace(/,(\d{3})/g, '$1').replace(/\.(\d{3})/g, '$1').replace(',', '.')
    return parseFloat(normalized)
  }

  if (type === COLUMN_TYPES.DATE) {
    return new Date(trimmed.replace(/\//g, '-'))
  }

  return trimmed
}

function checkLargeFileStatus(input, byteThreshold, rowThreshold) {
  const byteLength = typeof Blob !== 'undefined' ? new Blob([input]).size : Buffer.from(input).length
  const estimatedRows = Math.floor(input.split('\n').length * 1.1)

  return {
    isLarge: byteLength > byteThreshold || estimatedRows > rowThreshold,
    byteLength,
    estimatedRows,
    exceededThreshold: byteLength > byteThreshold ? 'byte' : estimatedRows > rowThreshold ? 'row' : null,
  }
}

function parseCsvSync(input, options = {}) {
  const {
    delimiter: forcedDelimiter,
    hasHeader = true,
    previewRows = DEFAULT_PREVIEW_ROWS,
    primaryKeyColumn = null,
    largeFileByteThreshold = LARGE_FILE_BYTE_THRESHOLD,
    largeFileRowThreshold = LARGE_FILE_ROW_THRESHOLD,
  } = options

  const errors = []
  const rows = []
  let rawHeaders = []
  let inQuotes = false
  let currentField = ''
  let currentRow = []
  let rowIndex = 0
  let expectedColCount = null
  let totalErrorsDetected = 0
  let sampledCount = 0
  const sampleInterval = 10

  const bomResult = stripBOM(input)
  const processedInput = bomResult.stripped

  const largeFileStatus = checkLargeFileStatus(processedInput, largeFileByteThreshold, largeFileRowThreshold)
  const isSamplingMode = largeFileStatus.isLarge

  const delimiterResult = forcedDelimiter
    ? { delimiter: forcedDelimiter, confidence: 1, wasFallback: false }
    : detectDelimiter(processedInput)
  const delimiter = delimiterResult.delimiter

  const decimalInfo = detectDecimalSeparator(processedInput)

  const utf8Positions = detectUTF8ReplacementChars(processedInput)
  for (const pos of utf8Positions) {
    errors.push(createRowError(ERROR_CODES.UTF8_REPLACEMENT_CHAR, -1, null, null, { position: pos }))
  }

  for (let i = 0; i < processedInput.length; i++) {
    const char = processedInput[i]
    const nextChar = i + 1 < processedInput.length ? processedInput[i + 1] : null

    if (inQuotes) {
      if (char === QUOTE_CHAR) {
        if (nextChar === ESCAPE_CHAR) {
          currentField += ESCAPE_CHAR
          i++
        } else if (nextChar === QUOTE_CHAR) {
          currentField += QUOTE_CHAR
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === QUOTE_CHAR) {
        inQuotes = true
      } else if (char === delimiter) {
        currentRow.push(currentField)
        currentField = ''
      } else if (char === '\n') {
        currentRow.push(currentField)
        if (hasHeader && rowIndex === 0) {
          rawHeaders = [...currentRow]
          expectedColCount = currentRow.length
        } else {
          const shouldSample = !isSamplingMode ||
            rowIndex <= previewRows ||
            (rowIndex > 0 && rowIndex % sampleInterval === 0)

          if (shouldSample && rows.length < previewRows) {
            if (expectedColCount !== null && currentRow.length !== expectedColCount) {
              errors.push(createRowError(
                ERROR_CODES.INCONSISTENT_COL_COUNT,
                hasHeader ? rowIndex - 1 : rowIndex,
                null,
                currentRow.length,
                { expected: expectedColCount, actual: currentRow.length, sampled: isSamplingMode }
              ))
              totalErrorsDetected++
            }
            rows.push([...currentRow])
            if (isSamplingMode) sampledCount++
          }
        }
        currentRow = []
        currentField = ''
        rowIndex++
      } else if (char === '\r' && nextChar === '\n') {
        i++
        currentRow.push(currentField)
        if (hasHeader && rowIndex === 0) {
          rawHeaders = [...currentRow]
          expectedColCount = currentRow.length
        } else {
          const shouldSample = !isSamplingMode ||
            rowIndex <= previewRows ||
            (rowIndex > 0 && rowIndex % sampleInterval === 0)

          if (shouldSample && rows.length < previewRows) {
            if (expectedColCount !== null && currentRow.length !== expectedColCount) {
              errors.push(createRowError(
                ERROR_CODES.INCONSISTENT_COL_COUNT,
                hasHeader ? rowIndex - 1 : rowIndex,
                null,
                currentRow.length,
                { expected: expectedColCount, actual: currentRow.length, sampled: isSamplingMode }
              ))
              totalErrorsDetected++
            }
            rows.push([...currentRow])
            if (isSamplingMode) sampledCount++
          }
        }
        currentRow = []
        currentField = ''
        rowIndex++
      } else {
        currentField += char
      }
    }
  }

  if (inQuotes) {
    errors.push(createRowError(ERROR_CODES.UNTERMINATED_QUOTE, rowIndex, null, null))
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    if (hasHeader && rowIndex === 0) {
      rawHeaders = [...currentRow]
      expectedColCount = currentRow.length
    } else {
      const shouldSample = !isSamplingMode || rows.length < previewRows
      if (shouldSample && rows.length < previewRows) {
        if (expectedColCount !== null && currentRow.length !== expectedColCount) {
          errors.push(createRowError(
            ERROR_CODES.INCONSISTENT_COL_COUNT,
            hasHeader ? rowIndex - 1 : rowIndex,
            null,
            currentRow.length,
            { expected: expectedColCount, actual: currentRow.length, sampled: isSamplingMode }
          ))
          totalErrorsDetected++
        }
        rows.push([...currentRow])
        if (isSamplingMode) sampledCount++
      }
    }
    rowIndex++
  }

  const headers = hasHeader && rawHeaders.length > 0 ? rawHeaders : rows[0]?.map((_, i) => `col_${i}`) || []

  const columnTypes = []
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const typeCounts = { string: 0, number: 0, boolean: 0, date: 0 }
    for (const row of rows.slice(0, Math.min(100, rows.length))) {
      const value = row[colIndex]
      if (value != null && value !== '') {
        const type = inferColumnType(value)
        typeCounts[type]++
      }
    }
    let bestType = COLUMN_TYPES.STRING
    let maxCount = 0
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count
        bestType = type
      }
    }
    columnTypes.push(bestType)
  }

  const columnSchema = headers.map((name, index) => ({
    name,
    index,
    type: columnTypes[index],
  }))

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]
    for (let colIdx = 0; colIdx < Math.min(row.length, columnTypes.length); colIdx++) {
      const type = columnTypes[colIdx]
      const value = row[colIdx]
      if (type === COLUMN_TYPES.NUMBER && value) {
        const num = parseCellValue(value, type)
        if (num > MAX_SAFE_INTEGER || num < MIN_SAFE_INTEGER) {
          errors.push(createRowError(
            ERROR_CODES.NUMBER_OVERFLOW,
            rowIdx,
            headers[colIdx],
            value
          ))
        }
      }
    }
  }

  if (primaryKeyColumn !== null) {
    const pkIndex = headers.findIndex(h => h === primaryKeyColumn)
    if (pkIndex !== -1) {
      const seen = new Set()
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const pkValue = rows[rowIdx][pkIndex]
        if (pkValue != null && pkValue !== '') {
          if (seen.has(pkValue)) {
            errors.push(createRowError(
              ERROR_CODES.DUPLICATE_PRIMARY_KEY,
              rowIdx,
              primaryKeyColumn,
              pkValue
            ))
          }
          seen.add(pkValue)
        }
      }
    }
  }

  const objects = rows.map(row => {
    const obj = {}
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] ?? ''
    }
    return obj
  })

  let successRowCount = rowIndex - (hasHeader ? 1 : 0)
  if (hasHeader && successRowCount < 0) successRowCount = 0

  return {
    success: true,
    headers,
    columnSchema,
    rows: objects,
    rawRowCount: rowIndex,
    successRowCount,
    skippedRowCount: 0,
    errors,
    hadBOM: bomResult.hadBOM,
    detectedDelimiter: delimiterResult.delimiter,
    delimiterConfidence: delimiterResult.confidence,
    decimalSeparator: decimalInfo.separator,
    decimalConfidence: decimalInfo.confidence,
    isLargeFile: largeFileStatus.isLarge,
    isSampled: isSamplingMode,
    fileSize: largeFileStatus.byteLength,
    estimatedTotalRows: largeFileStatus.estimatedRows,
    exceededThreshold: largeFileStatus.exceededThreshold,
    sampledRowsCount: sampledCount,
    sampleInterval: isSamplingMode ? sampleInterval : null,
  }
}

function createCancelToken() {
  let cancelled = false
  return {
    cancel: () => { cancelled = true },
    isCancelled: () => cancelled,
  }
}

async function parseCsvAsync(input, options = {}) {
  const {
    delimiter: forcedDelimiter,
    hasHeader = true,
    previewRows = DEFAULT_PREVIEW_ROWS,
    primaryKeyColumn = null,
    chunkSize = CHUNK_PARSE_ROWS,
    cancelToken = createCancelToken(),
    onProgress = null,
    largeFileByteThreshold = LARGE_FILE_BYTE_THRESHOLD,
    largeFileRowThreshold = LARGE_FILE_ROW_THRESHOLD,
  } = options

  const errors = []
  const rows = []
  let rawHeaders = []
  let inQuotes = false
  let currentField = ''
  let currentRow = []
  let rowIndex = 0
  let expectedColCount = null
  let rowsSinceYield = 0
  let totalErrorsDetected = 0
  let sampledCount = 0
  const sampleInterval = 10

  const bomResult = stripBOM(input)
  const processedInput = bomResult.stripped

  const largeFileStatus = checkLargeFileStatus(processedInput, largeFileByteThreshold, largeFileRowThreshold)
  const isSamplingMode = largeFileStatus.isLarge

  const delimiterResult = forcedDelimiter
    ? { delimiter: forcedDelimiter, confidence: 1, wasFallback: false }
    : detectDelimiter(processedInput)
  const delimiter = delimiterResult.delimiter

  const decimalInfo = detectDecimalSeparator(processedInput)

  const utf8Positions = detectUTF8ReplacementChars(processedInput)
  for (const pos of utf8Positions) {
    errors.push(createRowError(ERROR_CODES.UTF8_REPLACEMENT_CHAR, -1, null, null, { position: pos }))
  }

  for (let i = 0; i < processedInput.length; i++) {
    if (cancelToken.isCancelled()) {
      return {
        success: false,
        errorCode: ERROR_CODES.PARSING_INTERRUPTED,
        errors: [...errors, createRowError(ERROR_CODES.PARSING_INTERRUPTED, rowIndex)],
      }
    }

    const char = processedInput[i]
    const nextChar = i + 1 < processedInput.length ? processedInput[i + 1] : null

    if (inQuotes) {
      if (char === QUOTE_CHAR) {
        if (nextChar === ESCAPE_CHAR) {
          currentField += ESCAPE_CHAR
          i++
        } else if (nextChar === QUOTE_CHAR) {
          currentField += QUOTE_CHAR
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === QUOTE_CHAR) {
        inQuotes = true
      } else if (char === delimiter) {
        currentRow.push(currentField)
        currentField = ''
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        if (char === '\r') i++

        currentRow.push(currentField)
        if (hasHeader && rowIndex === 0) {
          rawHeaders = [...currentRow]
          expectedColCount = currentRow.length
        } else {
          const shouldSample = !isSamplingMode ||
            rowIndex <= previewRows ||
            (rowIndex > 0 && rowIndex % sampleInterval === 0)

          if (shouldSample && rows.length < previewRows) {
            if (expectedColCount !== null && currentRow.length !== expectedColCount) {
              errors.push(createRowError(
                ERROR_CODES.INCONSISTENT_COL_COUNT,
                hasHeader ? rowIndex - 1 : rowIndex,
                null,
                currentRow.length,
                { expected: expectedColCount, actual: currentRow.length, sampled: isSamplingMode }
              ))
              totalErrorsDetected++
            }
            rows.push([...currentRow])
            if (isSamplingMode) sampledCount++
          }
        }
        currentRow = []
        currentField = ''
        rowIndex++
        rowsSinceYield++

        if (rowsSinceYield >= chunkSize && typeof requestIdleCallback !== 'undefined') {
          await new Promise(resolve => requestIdleCallback(resolve))
          rowsSinceYield = 0
          if (onProgress) onProgress(rowIndex)
        }
      } else {
        currentField += char
      }
    }
  }

  if (inQuotes) {
    errors.push(createRowError(ERROR_CODES.UNTERMINATED_QUOTE, rowIndex, null, null))
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    if (hasHeader && rowIndex === 0) {
      rawHeaders = [...currentRow]
      expectedColCount = currentRow.length
    } else {
      const shouldSample = !isSamplingMode || rows.length < previewRows
      if (shouldSample && rows.length < previewRows) {
        if (expectedColCount !== null && currentRow.length !== expectedColCount) {
          errors.push(createRowError(
            ERROR_CODES.INCONSISTENT_COL_COUNT,
            hasHeader ? rowIndex - 1 : rowIndex,
            null,
            currentRow.length,
            { expected: expectedColCount, actual: currentRow.length, sampled: isSamplingMode }
          ))
          totalErrorsDetected++
        }
        rows.push([...currentRow])
        if (isSamplingMode) sampledCount++
      }
    }
    rowIndex++
  }

  const headers = hasHeader && rawHeaders.length > 0 ? rawHeaders : rows[0]?.map((_, i) => `col_${i}`) || []

  const columnTypes = []
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const typeCounts = { string: 0, number: 0, boolean: 0, date: 0 }
    for (const row of rows.slice(0, Math.min(100, rows.length))) {
      const value = row[colIndex]
      if (value != null && value !== '') {
        const type = inferColumnType(value)
        typeCounts[type]++
      }
    }
    let bestType = COLUMN_TYPES.STRING
    let maxCount = 0
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count
        bestType = type
      }
    }
    columnTypes.push(bestType)
  }

  const columnSchema = headers.map((name, index) => ({
    name,
    index,
    type: columnTypes[index],
  }))

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]
    for (let colIdx = 0; colIdx < Math.min(row.length, columnTypes.length); colIdx++) {
      const type = columnTypes[colIdx]
      const value = row[colIdx]
      if (type === COLUMN_TYPES.NUMBER && value) {
        const num = parseCellValue(value, type)
        if (num > MAX_SAFE_INTEGER || num < MIN_SAFE_INTEGER) {
          errors.push(createRowError(
            ERROR_CODES.NUMBER_OVERFLOW,
            rowIdx,
            headers[colIdx],
            value
          ))
        }
      }
    }
  }

  if (primaryKeyColumn !== null) {
    const pkIndex = headers.findIndex(h => h === primaryKeyColumn)
    if (pkIndex !== -1) {
      const seen = new Set()
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const pkValue = rows[rowIdx][pkIndex]
        if (pkValue != null && pkValue !== '') {
          if (seen.has(pkValue)) {
            errors.push(createRowError(
              ERROR_CODES.DUPLICATE_PRIMARY_KEY,
              rowIdx,
              primaryKeyColumn,
              pkValue
            ))
          }
          seen.add(pkValue)
        }
      }
    }
  }

  const objects = rows.map(row => {
    const obj = {}
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] ?? ''
    }
    return obj
  })

  let successRowCount = rowIndex - (hasHeader ? 1 : 0)
  if (hasHeader && successRowCount < 0) successRowCount = 0

  return {
    success: true,
    headers,
    columnSchema,
    rows: objects,
    rawRowCount: rowIndex,
    successRowCount,
    skippedRowCount: 0,
    errors,
    hadBOM: bomResult.hadBOM,
    detectedDelimiter: delimiterResult.delimiter,
    delimiterConfidence: delimiterResult.confidence,
    decimalSeparator: decimalInfo.separator,
    decimalConfidence: decimalInfo.confidence,
    isLargeFile: largeFileStatus.isLarge,
    isSampled: isSamplingMode,
    fileSize: largeFileStatus.byteLength,
    estimatedTotalRows: largeFileStatus.estimatedRows,
    exceededThreshold: largeFileStatus.exceededThreshold,
    sampledRowsCount: sampledCount,
    sampleInterval: isSamplingMode ? sampleInterval : null,
  }
}

export {
  stripBOM,
  detectUTF8ReplacementChars,
  scoreDelimiterByConsistency,
  detectDecimalSeparator,
  detectDelimiter,
  inferColumnType,
  parseCellValue,
  parseCsvSync,
  parseCsvAsync,
  createCancelToken,
  getFirstNLines,
}
