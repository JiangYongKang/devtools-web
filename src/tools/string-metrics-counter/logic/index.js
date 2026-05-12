import {
  utf8ByteLength,
  hasBOM,
  countCodePoints,
  countUtf16Units,
  countGraphemes,
  countLines,
  countTokens,
  normalizeText,
  utf16RangeToColumnRow,
} from './metrics.js'
import { ERROR_CODES, MAX_SAFE_INPUT_SIZE, createError } from './errors.js'
import { NEWLINE_MODES, TOKENIZATION_PROFILES } from './constants.js'

function buildInputParams(params) {
  return {
    text: params.text ?? null,
    newlineMode: params.newlineMode ?? NEWLINE_MODES.AUTO,
    tokenizationProfile: params.tokenizationProfile ?? TOKENIZATION_PROFILES.WHITESPACE,
    normalizeFlags: params.normalizeFlags ?? {},
    selectionRange: params.selectionRange ?? null,
  }
}

function calculateMetrics(text, params) {
  const { newlineMode, tokenizationProfile } = params
  const normalizedText = normalizeText(text, params.normalizeFlags)
  const { lineCount, nonEmptyLines } = countLines(normalizedText, newlineMode)
  const graphemeCount = countGraphemes(normalizedText)
  const scalarCount = countCodePoints(normalizedText)
  const utf16Units = countUtf16Units(normalizedText)
  const utf8Bytes = utf8ByteLength(normalizedText)
  const tokenCount = countTokens(normalizedText, tokenizationProfile)
  const hasBom = hasBOM(text)
  const byteCharRatio = scalarCount > 0 ? (utf8Bytes / scalarCount).toFixed(3) : '0.000'
  return {
    graphemeCount,
    scalarCount,
    utf16Units,
    utf8Bytes,
    lineCount,
    nonEmptyLines,
    tokenCount,
    hasBOM: hasBom,
    byteCharRatio,
    normalizedText,
  }
}

function validateSelectionRange(text, selectionRange) {
  if (!selectionRange) return true
  const { start, end } = selectionRange
  if (start < 0 || end < 0) return false
  if (start > text.length || end > text.length) return false
  if (start > end) return false
  return true
}

function analyzeStringMetrics(rawParams) {
  const params = buildInputParams(rawParams)
  if (params.text === null || params.text === undefined) {
    return {
      errorCode: ERROR_CODES.NULL_INPUT,
      error: createError(ERROR_CODES.NULL_INPUT),
      result: null,
    }
  }
  const text = String(params.text)
  let warningCode = null
  if (text.length > MAX_SAFE_INPUT_SIZE) {
    warningCode = ERROR_CODES.INPUT_TOO_LARGE
  }
  if (params.selectionRange && !validateSelectionRange(text, params.selectionRange)) {
    return {
      errorCode: ERROR_CODES.SELECTION_OUT_OF_RANGE,
      error: createError(ERROR_CODES.SELECTION_OUT_OF_RANGE),
      result: null,
    }
  }
  const fullMetrics = calculateMetrics(text, params)
  let selectionMetrics = null
  let columnRowPointer = null
  if (params.selectionRange) {
    const { start, end } = params.selectionRange
    const selectedText = text.slice(start, end)
    selectionMetrics = calculateMetrics(selectedText, params)
    columnRowPointer = utf16RangeToColumnRow(text, start, end)
  }
  const digestReport = generateDigestReport(fullMetrics, selectionMetrics, columnRowPointer, text.length)
  return {
    errorCode: null,
    warningCode,
    error: null,
    result: {
      ...fullMetrics,
      columnRowPointer,
      digestReport,
      selectionMetrics,
    },
  }
}

function generateDigestReport(fullMetrics, selectionMetrics, columnRowPointer) {
  const lines = []
  lines.push(`=== 文本指标统计报告 ===`)
  lines.push(`生成时间: ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push(`【整体统计】`)
  lines.push(`  Grapheme 数量: ${fullMetrics.graphemeCount}`)
  lines.push(`  Unicode 码点: ${fullMetrics.scalarCount}`)
  lines.push(`  UTF-16 单元: ${fullMetrics.utf16Units}`)
  lines.push(`  UTF-8 字节: ${fullMetrics.utf8Bytes}`)
  lines.push(`  行数: ${fullMetrics.lineCount}`)
  lines.push(`  非空行: ${fullMetrics.nonEmptyLines}`)
  lines.push(`  词数: ${fullMetrics.tokenCount}`)
  lines.push(`  字节/字符比: ${fullMetrics.byteCharRatio}`)
  lines.push(`  含 BOM: ${fullMetrics.hasBOM ? '是' : '否'}`)
  if (columnRowPointer) {
    lines.push('')
    lines.push(`【选中文本】`)
    lines.push(`  起始: 第 ${columnRowPointer.start.row} 行, 第 ${columnRowPointer.start.column} 列`)
    lines.push(`  结束: 第 ${columnRowPointer.end.row} 行, 第 ${columnRowPointer.end.column} 列`)
    if (selectionMetrics) {
      lines.push(`  Grapheme 数量: ${selectionMetrics.graphemeCount}`)
      lines.push(`  Unicode 码点: ${selectionMetrics.scalarCount}`)
      lines.push(`  UTF-16 单元: ${selectionMetrics.utf16Units}`)
      lines.push(`  UTF-8 字节: ${selectionMetrics.utf8Bytes}`)
    }
  }
  return lines.join('\n')
}

export {
  buildInputParams,
  calculateMetrics,
  validateSelectionRange,
  analyzeStringMetrics,
  generateDigestReport,
}
