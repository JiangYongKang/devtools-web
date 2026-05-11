const VERSION = '1.0.0'

const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  PARSE_FAILED: 'PARSE_FAILED',
  INVALID_INDENT: 'INVALID_INDENT',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  UNSUPPORTED_ANCHOR: 'UNSUPPORTED_ANCHOR',
  UNSUPPORTED_ALIAS: 'UNSUPPORTED_ALIAS',
  UNSUPPORTED_TAG: 'UNSUPPORTED_TAG',
  UNSUPPORTED_MULTIDOC: 'UNSUPPORTED_MULTIDOC',
  NESTING_DEPTH_EXCEEDED: 'NESTING_DEPTH_EXCEEDED',
  INPUT_TOO_LARGE: 'INPUT_TOO_LARGE',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入不能为空',
  [ERROR_CODES.EMPTY_INPUT]: '输入内容为空',
  [ERROR_CODES.PARSE_FAILED]: '解析失败',
  [ERROR_CODES.INVALID_INDENT]: '缩进值无效，应使用 2、4、8 或 "tab"',
  [ERROR_CODES.DUPLICATE_KEY]: '检测到重复键',
  [ERROR_CODES.UNSUPPORTED_ANCHOR]: '不支持 YAML 锚点',
  [ERROR_CODES.UNSUPPORTED_ALIAS]: '不支持 YAML 别名',
  [ERROR_CODES.UNSUPPORTED_TAG]: '不支持 YAML 标签',
  [ERROR_CODES.UNSUPPORTED_MULTIDOC]: '不支持多文档 YAML',
  [ERROR_CODES.NESTING_DEPTH_EXCEEDED]: '嵌套深度超出限制',
  [ERROR_CODES.INPUT_TOO_LARGE]: '输入内容过大',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
}

const MAX_INPUT_SIZE_BYTES = 1 * 1024 * 1024
const DEFAULT_MAX_NESTING_DEPTH = 100

const INDENT_STYLES = ['space', 'tab']
const INDENT_WIDTHS = [2, 4, 8]
const QUOTE_STYLES = ['single', 'double', 'none']
const INLINE_STYLES = ['min', 'standard', 'max']
const KEY_ORDERS = ['preserve', 'alphabetical']

function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || '未知错误'
}

function getByteSize(str) {
  if (typeof str !== 'string') return 0
  return new TextEncoder().encode(str).length
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const safeIndex = Math.min(i, units.length - 1)
  return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(2)) + ' ' + units[safeIndex]
}

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function validateIndent(indentStyle, indentWidth) {
  if (!INDENT_STYLES.includes(indentStyle)) {
    return false
  }
  if (indentStyle === 'tab') {
    return true
  }
  return INDENT_WIDTHS.includes(indentWidth)
}

function normalizeOptions(options) {
  return {
    indentStyle: INDENT_STYLES.includes(options.indentStyle) ? options.indentStyle : 'space',
    indentWidth: INDENT_WIDTHS.includes(options.indentWidth) ? options.indentWidth : 2,
    quoteStyle: QUOTE_STYLES.includes(options.quoteStyle) ? options.quoteStyle : 'none',
    inlineStyle: INLINE_STYLES.includes(options.inlineStyle) ? options.inlineStyle : 'standard',
    keyOrder: KEY_ORDERS.includes(options.keyOrder) ? options.keyOrder : 'preserve',
    maxNestingDepth: Number.isFinite(options.maxNestingDepth) && options.maxNestingDepth > 0
      ? options.maxNestingDepth
      : DEFAULT_MAX_NESTING_DEPTH,
  }
}

function createSuccessResult(output, processedBytes, nestingDepth) {
  return {
    success: true,
    output,
    processedBytes,
    nestingDepth,
    version: VERSION,
  }
}

function createErrorResult(errorCode, errorMessage, line = null, column = null, jsonPath = null) {
  return {
    success: false,
    errorCode,
    errorMessage: errorMessage || getErrorMessage(errorCode),
    line,
    column,
    jsonPath,
    version: VERSION,
  }
}

function calculateNestingDepth(obj) {
  let maxDepth = 0

  function traverse(value, currentDepth) {
    if (currentDepth > maxDepth) {
      maxDepth = currentDepth
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        traverse(item, currentDepth + 1)
      }
    } else if (value && typeof value === 'object') {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          traverse(value[key], currentDepth + 1)
        }
      }
    }
  }

  traverse(obj, 0)
  return maxDepth
}

function validateMaxNestingDepth(obj, maxDepth) {
  function traverse(value, currentDepth) {
    if (currentDepth > maxDepth) {
      return false
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (!traverse(item, currentDepth + 1)) {
          return false
        }
      }
    } else if (value && typeof value === 'object') {
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (!traverse(value[key], currentDepth + 1)) {
            return false
          }
        }
      }
    }

    return true
  }

  return traverse(obj, 0)
}

function extractLineColumnFromYamlError(error) {
  if (!error || !error.message) {
    return { line: null, column: null }
  }

  const message = error.message

  const lineMatch = message.match(/line\s+(\d+)/i) || message.match(/at\s+line\s+(\d+)/i)
  const columnMatch = message.match(/column\s+(\d+)/i) || message.match(/col:\s*(\d+)/i)

  return {
    line: lineMatch ? parseInt(lineMatch[1], 10) : null,
    column: columnMatch ? parseInt(columnMatch[1], 10) : null,
  }
}

function extractLineColumnFromJsonError(error, input) {
  if (!error || !error.message) {
    return { line: null, column: null, jsonPath: null }
  }

  const message = error.message

  const positionMatch = message.match(/position\s+(\d+)/i) || message.match(/at\s+position\s+(\d+)/i)
  let line = null
  let column = null

  if (positionMatch && input) {
    const position = parseInt(positionMatch[1], 10)
    const beforeError = input.substring(0, position)
    line = (beforeError.match(/\n/g) || []).length + 1

    const lastNewline = beforeError.lastIndexOf('\n')
    column = position - lastNewline
  }

  return { line, column, jsonPath: null }
}

function classifyYamlError(error) {
  if (!error) {
    return { code: ERROR_CODES.PARSE_FAILED, jsonPath: null }
  }

  const message = (error.message || '').toLowerCase()

  if (message.includes('duplicate') || message.includes('duplicated')) {
    return { code: ERROR_CODES.DUPLICATE_KEY, jsonPath: null }
  }

  if (message.includes('anchor')) {
    return { code: ERROR_CODES.UNSUPPORTED_ANCHOR, jsonPath: null }
  }

  if (message.includes('alias')) {
    return { code: ERROR_CODES.UNSUPPORTED_ALIAS, jsonPath: null }
  }

  if (message.includes('tag') || message.includes('!')) {
    return { code: ERROR_CODES.UNSUPPORTED_TAG, jsonPath: null }
  }

  if (message.includes('multiple') || message.includes('multidoc') || message.includes('---')) {
    return { code: ERROR_CODES.UNSUPPORTED_MULTIDOC, jsonPath: null }
  }

  return { code: ERROR_CODES.PARSE_FAILED, jsonPath: null }
}

function formatErrorLocation(error) {
  if (!error) {
    return null
  }

  const parts = []

  if (error.line !== null && error.line !== undefined) {
    parts.push(`第 ${error.line} 行`)
  }

  if (error.column !== null && error.column !== undefined) {
    parts.push(`第 ${error.column} 列`)
  }

  if (error.jsonPath) {
    parts.push(`路径: ${error.jsonPath}`)
  }

  if (parts.length === 0) {
    return null
  }

  return parts.join('，')
}

function validateInput(input, direction) {
  if (input === null || input === undefined) {
    return createErrorResult(ERROR_CODES.NULL_INPUT)
  }

  if (typeof input !== 'string') {
    return createErrorResult(ERROR_CODES.INVALID_PARAMETER)
  }

  const trimmed = input.trim()

  if (!trimmed) {
    return createErrorResult(ERROR_CODES.EMPTY_INPUT)
  }

  const byteSize = getByteSize(input)
  if (byteSize > MAX_INPUT_SIZE_BYTES) {
    return createErrorResult(
      ERROR_CODES.INPUT_TOO_LARGE,
      `输入内容过大（${formatBytes(byteSize)}），最大支持 ${formatBytes(MAX_INPUT_SIZE_BYTES)}`
    )
  }

  return null
}

export {
  VERSION,
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_INPUT_SIZE_BYTES,
  DEFAULT_MAX_NESTING_DEPTH,
  INDENT_STYLES,
  INDENT_WIDTHS,
  QUOTE_STYLES,
  INLINE_STYLES,
  KEY_ORDERS,
  getErrorMessage,
  getByteSize,
  formatBytes,
  escapeHtml,
  validateIndent,
  normalizeOptions,
  createSuccessResult,
  createErrorResult,
  calculateNestingDepth,
  validateMaxNestingDepth,
  extractLineColumnFromYamlError,
  extractLineColumnFromJsonError,
  classifyYamlError,
  formatErrorLocation,
  validateInput,
}
