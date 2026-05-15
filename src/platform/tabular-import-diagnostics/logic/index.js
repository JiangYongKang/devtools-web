import {
  PRESET_DELIMITERS,
  COLUMN_TYPES,
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_PREVIEW_ROWS,
  LARGE_FILE_BYTE_THRESHOLD,
  LARGE_FILE_ROW_THRESHOLD,
  CHUNK_PARSE_ROWS,
  BOM_CHAR,
  UTF8_REPLACEMENT_CHAR,
  QUOTE_CHAR,
  ESCAPE_CHAR,
  MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER,
  NUMBER_PATTERNS,
  BOOLEAN_VALUES,
  DATE_PATTERNS,
  XLSX_LIBRARY_INFO,
} from './constants.js'

import {
  createError,
  createRowError,
  getErrorMessage,
  groupErrorsByColumn,
  groupErrorsByCode,
  exportErrorsToCsv,
} from './errors.js'

import {
  stripBOM,
  detectUTF8ReplacementChars,
  scoreDelimiterByConsistency,
  detectDecimalSeparator,
  detectDelimiter,
  inferColumnType,
  parseCellValue,
  checkLargeFileStatus,
  parseCsvSync,
  parseCsvAsync,
  createCancelToken,
  getFirstNLines,
} from './parser.js'

import {
  STANDARD_CSV,
  EUROPEAN_CSV,
  MIXED_WITH_ERRORS,
  getExample,
} from './examples.js'

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function checkFileSize(file) {
  return {
    isLarge: file.size > LARGE_FILE_BYTE_THRESHOLD,
    size: file.size,
    threshold: LARGE_FILE_BYTE_THRESHOLD,
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export {
  PRESET_DELIMITERS,
  COLUMN_TYPES,
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_PREVIEW_ROWS,
  LARGE_FILE_BYTE_THRESHOLD,
  LARGE_FILE_ROW_THRESHOLD,
  CHUNK_PARSE_ROWS,
  BOM_CHAR,
  UTF8_REPLACEMENT_CHAR,
  QUOTE_CHAR,
  ESCAPE_CHAR,
  MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER,
  NUMBER_PATTERNS,
  BOOLEAN_VALUES,
  DATE_PATTERNS,
  XLSX_LIBRARY_INFO,
  createError,
  createRowError,
  getErrorMessage,
  groupErrorsByColumn,
  groupErrorsByCode,
  exportErrorsToCsv,
  stripBOM,
  detectUTF8ReplacementChars,
  scoreDelimiterByConsistency,
  detectDecimalSeparator,
  detectDelimiter,
  inferColumnType,
  parseCellValue,
  checkLargeFileStatus,
  parseCsvSync,
  parseCsvAsync,
  createCancelToken,
  getFirstNLines,
  STANDARD_CSV,
  EUROPEAN_CSV,
  MIXED_WITH_ERRORS,
  getExample,
  readFileAsText,
  checkFileSize,
  formatFileSize,
}
