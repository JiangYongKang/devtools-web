const PRESET_DELIMITERS = {
  COMMA: ',',
  SEMICOLON: ';',
  TAB: '\t',
  PIPE: '|',
}

const COLUMN_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
}

const ERROR_CODES = {
  EMPTY_FILE: 'EMPTY_FILE',
  HEADER_ONLY: 'HEADER_ONLY',
  UNTERMINATED_QUOTE: 'UNTERMINATED_QUOTE',
  INCONSISTENT_COL_COUNT: 'INCONSISTENT_COL_COUNT',
  UTF8_REPLACEMENT_CHAR: 'UTF8_REPLACEMENT_CHAR',
  NUMBER_OVERFLOW: 'NUMBER_OVERFLOW',
  DUPLICATE_PRIMARY_KEY: 'DUPLICATE_PRIMARY_KEY',
  INVALID_ESCAPE_SEQUENCE: 'INVALID_ESCAPE_SEQUENCE',
  PARSING_INTERRUPTED: 'PARSING_INTERRUPTED',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_FILE]: '文件内容为空',
  [ERROR_CODES.HEADER_ONLY]: '文件仅包含表头，无数据行',
  [ERROR_CODES.UNTERMINATED_QUOTE]: '引号未闭合',
  [ERROR_CODES.INCONSISTENT_COL_COUNT]: '列数不一致',
  [ERROR_CODES.UTF8_REPLACEMENT_CHAR]: '检测到 UTF-8 替换字符，可能存在编码问题',
  [ERROR_CODES.NUMBER_OVERFLOW]: '数值超出 JavaScript 安全整数范围',
  [ERROR_CODES.DUPLICATE_PRIMARY_KEY]: '主键列存在重复值',
  [ERROR_CODES.INVALID_ESCAPE_SEQUENCE]: '无效的转义序列',
  [ERROR_CODES.PARSING_INTERRUPTED]: '解析被中断',
}

const DEFAULT_PREVIEW_ROWS = 50
const LARGE_FILE_BYTE_THRESHOLD = 5 * 1024 * 1024
const LARGE_FILE_ROW_THRESHOLD = 10000
const CHUNK_PARSE_ROWS = 500
const BOM_CHAR = '\uFEFF'
const UTF8_REPLACEMENT_CHAR = '\uFFFD'
const QUOTE_CHAR = '"'
const ESCAPE_CHAR = '"'

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER
const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER

const NUMBER_PATTERNS = {
  US: /^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/,
  EU: /^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$/,
  STANDARD: /^-?\d+(?:\.\d+)?$/,
}

const BOOLEAN_VALUES = {
  true: ['true', 'yes', '1', '是', '对'],
  false: ['false', 'no', '0', '否', '错'],
}

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/,
]

const XLSX_LIBRARY_INFO = {
  name: 'SheetJS/xlsx',
  url: 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
  bundleImpact: '约 400KB (gzipped)',
  supportedFormats: ['.xlsx', '.xls', '.xlsb', '.xlsm'],
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
}
