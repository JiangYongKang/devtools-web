import {
  ERROR_CODES,
  MAX_SAFE_INPUT_SIZE,
  MAX_LINE_LENGTH,
  MAX_LINE_COUNT,
  createError,
} from './errors.js'
import { TIMEZONE_OPTIONS, UNMATCHED_REASONS } from './constants.js'
import { parseLogLine, parseTimestamp } from './parser.js'

function buildInputParams(params) {
  return {
    text: params.text ?? null,
    timezone: params.timezone ?? TIMEZONE_OPTIONS.UTC,
  }
}

function splitLines(text) {
  if (!text) return []
  return text.split(/\r?\n/)
}

function validateInput(text, options = {}) {
  const { maxLines = MAX_LINE_COUNT, maxLineLength = MAX_LINE_LENGTH } = options
  const lines = splitLines(text)
  const trimmed = text.trim()

  if (!trimmed) {
    return {
      valid: false,
      errorCode: ERROR_CODES.EMPTY_INPUT,
      error: createError(ERROR_CODES.EMPTY_INPUT),
    }
  }

  if (text.length > MAX_SAFE_INPUT_SIZE) {
    return {
      valid: false,
      errorCode: ERROR_CODES.INPUT_TOO_LARGE,
      error: createError(ERROR_CODES.INPUT_TOO_LARGE, { maxSizeMB: 10 }),
    }
  }

  if (lines.length > maxLines) {
    return {
      valid: false,
      errorCode: ERROR_CODES.TOO_MANY_LINES,
      error: createError(ERROR_CODES.TOO_MANY_LINES, { maxLines }),
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxLineLength) {
      return {
        valid: false,
        errorCode: ERROR_CODES.LINE_TOO_LONG,
        error: createError(ERROR_CODES.LINE_TOO_LONG, { maxLineLength }),
      }
    }
  }

  return { valid: true }
}

function extractLogFields(rawParams) {
  const params = buildInputParams(rawParams)

  if (params.text === null || params.text === undefined) {
    return {
      errorCode: ERROR_CODES.EMPTY_INPUT,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      result: null,
    }
  }

  const text = String(params.text)

  const validation = validateInput(text)
  if (!validation.valid) {
    return {
      errorCode: validation.errorCode,
      error: validation.error,
      result: null,
    }
  }

  const lines = splitLines(text)
  const results = []
  let matchedCount = 0
  let unmatchedCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const parsed = parseLogLine(line, { timezone: params.timezone })
    const result = {
      lineNumber: i + 1,
      rawLine: parsed.rawLine,
      level: parsed.level,
      timeRaw: parsed.time?.raw ?? null,
      timeParsed: parsed.time?.formatted ?? null,
      timeTimestamp: parsed.time?.timestamp ?? null,
      isTimeValid: parsed.time?.isValid ?? false,
      unmatchedReason: parsed.unmatchedReason,
      unmatchedReasonText: parsed.unmatchedReason ? UNMATCHED_REASONS[parsed.unmatchedReason] : null,
      matched: parsed.matched,
    }

    if (parsed.matched) {
      matchedCount++
    } else {
      unmatchedCount++
    }

    results.push(result)
  }

  const stats = {
    totalLines: lines.length,
    matchedLines: matchedCount,
    unmatchedLines: unmatchedCount,
    matchRate: lines.length > 0 ? (matchedCount / lines.length * 100).toFixed(1) : '0.0',
  }

  return {
    errorCode: null,
    error: null,
    result: {
      lines: results,
      stats,
      timezone: params.timezone,
    },
  }
}

function generateTSV(result) {
  if (!result || !result.lines) return ''

  const headers = ['行号', '级别', '时间(解析后)', '时间(原始)', '匹配状态', '原始日志']
  const rows = result.lines.map((line) => {
    return [
      line.lineNumber,
      line.level || '',
      line.timeParsed || '',
      line.timeRaw || '',
      line.matched ? '匹配' : '未匹配',
      line.rawLine.replace(/\t/g, '    '),
    ]
  })

  return [headers, ...rows].map((row) => row.join('\t')).join('\n')
}

function generateTableText(result) {
  if (!result || !result.lines) return ''

  const lines = []
  lines.push(`=== 日志字段提取结果 ===`)
  lines.push(`生成时间: ${new Date().toLocaleString()}`)
  lines.push(`时区: ${result.timezone === 'UTC' ? 'UTC' : '本地时区'}`)
  lines.push('')
  lines.push(`统计信息:`)
  lines.push(`  总行数: ${result.stats.totalLines}`)
  lines.push(`  匹配行数: ${result.stats.matchedLines}`)
  lines.push(`  未匹配行数: ${result.stats.unmatchedLines}`)
  lines.push(`  匹配率: ${result.stats.matchRate}%`)
  lines.push('')
  lines.push('--- 详情 ---')
  lines.push('')

  result.lines.forEach((line) => {
    lines.push(`[行 ${line.lineNumber}]`)
    lines.push(`  级别: ${line.level || '-'}`)
    lines.push(`  时间: ${line.timeParsed || line.timeRaw || '-'}`)
    if (!line.matched) {
      lines.push(`  未匹配原因: ${line.unmatchedReasonText || '-'}`)
    }
    lines.push(`  原始: ${line.rawLine}`)
    lines.push('')
  })

  return lines.join('\n')
}

export {
  buildInputParams,
  splitLines,
  validateInput,
  extractLogFields,
  generateTSV,
  generateTableText,
  parseLogLine,
  parseTimestamp,
}
