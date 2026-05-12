import {
  parseCsv,
  stringifyCsv,
  detectDelimiter,
  transposeTable,
  normalizeCols,
} from './parser.js'
import {
  ERROR_CODES,
  MAX_ROWS,
  MAX_COLS,
  MAX_CELL_BYTES,
  MAX_INPUT_BYTES,
  createError,
} from './errors.js'
import { PRESET_DELIMITERS, INCONSISTENT_COLS_MODES, EXAMPLES } from './constants.js'

function utf8ByteLength(str) {
  let bytes = 0
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes += 1
    } else if (code < 0x800) {
      bytes += 2
    } else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
      const nextCode = str.charCodeAt(i + 1)
      if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
        bytes += 4
        i++
      } else {
        bytes += 3
      }
    } else {
      bytes += 3
    }
  }
  return bytes
}

function validateInput(input) {
  if (input == null) {
    return {
      errorCode: ERROR_CODES.NULL_INPUT,
      error: createError(ERROR_CODES.NULL_INPUT),
    }
  }

  const inputBytes = utf8ByteLength(input)
  if (inputBytes > MAX_INPUT_BYTES) {
    return {
      errorCode: ERROR_CODES.INPUT_TOO_LARGE,
      error: createError(ERROR_CODES.INPUT_TOO_LARGE, {
        actualBytes: inputBytes,
        maxBytes: MAX_INPUT_BYTES,
      }),
    }
  }

  return null
}

function validateTable(table, header = null) {
  const allRows = header ? [header, ...table] : table

  if (allRows.length === 0) {
    return null
  }

  if (allRows.length > MAX_ROWS) {
    return {
      errorCode: ERROR_CODES.TOO_MANY_ROWS,
      error: createError(ERROR_CODES.TOO_MANY_ROWS, {
        actual: allRows.length,
        max: MAX_ROWS,
      }),
    }
  }

  for (const row of allRows) {
    if (row.length > MAX_COLS) {
      return {
        errorCode: ERROR_CODES.TOO_MANY_COLS,
        error: createError(ERROR_CODES.TOO_MANY_COLS, {
          actual: row.length,
          max: MAX_COLS,
        }),
      }
    }

    for (const cell of row) {
      const cellBytes = utf8ByteLength(cell)
      if (cellBytes > MAX_CELL_BYTES) {
        return {
          errorCode: ERROR_CODES.CELL_TOO_LARGE,
          error: createError(ERROR_CODES.CELL_TOO_LARGE, {
            actualBytes: cellBytes,
            maxBytes: MAX_CELL_BYTES,
          }),
        }
      }
    }
  }

  return null
}

function processInput(rawParams) {
  const {
    input,
    delimiter = 'auto',
    hasHeader = true,
    inconsistentColsMode = INCONSISTENT_COLS_MODES.ERROR,
  } = rawParams

  const inputValidation = validateInput(input)
  if (inputValidation) {
    return {
      success: false,
      ...inputValidation,
      result: null,
    }
  }

  const text = String(input || '')

  if (text.trim().length === 0) {
    return {
      success: true,
      errorCode: null,
      result: {
        table: [],
        header: null,
        rowCount: 0,
        colCount: 0,
        detectedDelimiter: null,
        autoDetectUsed: false,
        fallbackMessage: null,
      },
    }
  }

  let finalDelimiter = delimiter
  let autoDetectUsed = false
  let fallbackMessage = null

  if (delimiter === 'auto') {
    autoDetectUsed = true
    const detectResult = detectDelimiter(text)
    finalDelimiter = detectResult.delimiter
    if (detectResult.wasFallback) {
      fallbackMessage = detectResult.fallbackReason
    }
  }

  const parseResult = parseCsv(text, {
    delimiter: finalDelimiter,
    hasHeader,
  })

  if (parseResult.errorCode) {
    return {
      success: false,
      errorCode: parseResult.errorCode,
      error: parseResult.error,
      result: null,
    }
  }

  const { table, header, rowCount, colCount } = parseResult

  const expectedCols = hasHeader && header ? header.length : null
  const normalizeResult = normalizeCols(table, inconsistentColsMode, expectedCols)

  if (inconsistentColsMode === INCONSISTENT_COLS_MODES.ERROR && normalizeResult.issues.length > 0) {
    return {
      success: false,
      errorCode: ERROR_CODES.INCONSISTENT_COLS,
      error: createError(ERROR_CODES.INCONSISTENT_COLS, {
        issues: normalizeResult.issues,
        maxCols: normalizeResult.maxCols,
      }),
      result: null,
    }
  }

  const normalizedTable = normalizeResult.normalized
  const normalizedHeader = hasHeader && header ? header : null

  const tableValidation = validateTable(normalizedTable, normalizedHeader)
  if (tableValidation) {
    return {
      success: false,
      ...tableValidation,
      result: null,
    }
  }

  return {
    success: true,
    errorCode: null,
    result: {
      table: normalizedTable,
      header: normalizedHeader,
      rowCount: normalizedTable.length,
      colCount: normalizedHeader
        ? normalizedHeader.length
        : (normalizedTable.length > 0 ? normalizedTable[0].length : 0),
      detectedDelimiter: autoDetectUsed ? finalDelimiter : null,
      autoDetectUsed,
      fallbackMessage,
      inconsistentColsIssues: normalizeResult.issues,
    },
  }
}

function processTranspose(params) {
  const { table, header = null } = params

  if (!table || table.length === 0) {
    return {
      success: false,
      errorCode: ERROR_CODES.EMPTY_TABLE,
      error: createError(ERROR_CODES.EMPTY_TABLE),
      result: null,
    }
  }

  const transposeResult = transposeTable(table, header)

  return {
    success: true,
    errorCode: null,
    result: transposeResult,
  }
}

function processGenerateCsv(params) {
  const { table, header = null, delimiter = PRESET_DELIMITERS.COMMA } = params

  const csv = stringifyCsv(table || [], {
    delimiter,
    header,
  })

  return {
    success: true,
    errorCode: null,
    result: {
      csv,
      delimiter,
    },
  }
}

export {
  processInput,
  processTranspose,
  processGenerateCsv,
  validateInput,
  validateTable,
  utf8ByteLength,
  EXAMPLES,
  PRESET_DELIMITERS,
  INCONSISTENT_COLS_MODES,
  MAX_ROWS,
  MAX_COLS,
  MAX_CELL_BYTES,
  MAX_INPUT_BYTES,
  ERROR_CODES,
}
