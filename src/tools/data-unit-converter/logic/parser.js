import {
  ERROR_CODES,
  createError,
} from './errors.js'
import {
  ALL_UNITS,
  UNIT_MAP,
  CATEGORIES,
  getUnitByCode,
  MAX_BATCH_SIZE,
} from './constants.js'
import { convertAndFormat } from './converter.js'
import { checkValueBounds } from './formatter.js'

const UNIT_PATTERNS = []

ALL_UNITS.forEach((unit) => {
  const codes = [unit.code, unit.symbol, ...(unit.aliases || [])]
  const uniqueCodes = [...new Set(codes)]
  uniqueCodes.forEach((code) => {
    if (code && code.length > 0) {
      UNIT_PATTERNS.push({
        pattern: code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        unit,
      })
    }
  })
})

UNIT_PATTERNS.sort((a, b) => b.pattern.length - a.pattern.length)

const COMBINED_UNIT_PATTERN = UNIT_PATTERNS.map((p) => p.pattern).join('|')

const NUMBER_PATTERN = [
  '[-+]?',
  '(?:',
  '(?:\\d+(?:[.,]\\d+)?)',
  '|',
  '(?:[.,]\\d+)',
  '|',
  '(?:\\d+(?:[.,]\\d+)?[eE][-+]?\\d+)',
  ')',
].join('')

const FULL_PATTERN = new RegExp(
  `^\\s*(${NUMBER_PATTERN})\\s*(${COMBINED_UNIT_PATTERN})?\\s*$`,
  'i'
)

const LOOSE_PATTERN = new RegExp(
  `(${NUMBER_PATTERN})\\s*(${COMBINED_UNIT_PATTERN})`,
  'gi'
)

const MAX_EXPONENT = 308

function normalizeNumberString(str) {
  let normalized = str
  normalized = normalized.replace(/[.,](?=\d{3})/g, '')
  normalized = normalized.replace(/,/g, '.')
  return normalized
}

function parseNumberString(str, options = {}) {
  const { maxExponent = MAX_EXPONENT } = options

  if (str == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }

  const trimmed = String(str).trim()

  if (trimmed === '') {
    return { error: createError(ERROR_CODES.EMPTY_VALUE) }
  }

  const normalized = normalizeNumberString(trimmed)

  try {
    const value = parseFloat(normalized)

    if (isNaN(value)) {
      return { error: createError(ERROR_CODES.INVALID_NUMBER, `无效的数值: ${trimmed}`) }
    }

    if (!isFinite(value)) {
      return { error: createError(ERROR_CODES.NOT_FINITE) }
    }

    const expMatch = normalized.match(/[eE][+-]?(\d+)/)
    if (expMatch) {
      const exponent = parseInt(expMatch[1], 10)
      if (Math.abs(exponent) > maxExponent) {
        return { error: createError(ERROR_CODES.EXPONENT_TOO_LARGE, `指数过大: ${expMatch[1]}`) }
      }
    }

    const bounds = checkValueBounds(value)
    if (!bounds.valid) {
      return { error: bounds.error }
    }

    return { value }
  } catch (e) {
    return { error: createError(ERROR_CODES.INVALID_NUMBER, e.message) }
  }
}

function matchUnit(unitStr) {
  if (!unitStr) {
    return { matched: false, unit: null, matchedText: '' }
  }

  const upper = unitStr.toUpperCase()
  const lower = unitStr.toLowerCase()

  if (UNIT_MAP[unitStr]) {
    return { matched: true, unit: UNIT_MAP[unitStr], matchedText: unitStr }
  }
  if (UNIT_MAP[upper]) {
    return { matched: true, unit: UNIT_MAP[upper], matchedText: upper }
  }
  if (UNIT_MAP[lower]) {
    return { matched: true, unit: UNIT_MAP[lower], matchedText: lower }
  }

  for (const pattern of UNIT_PATTERNS) {
    const regex = new RegExp(`^${pattern.pattern}$`, 'i')
    if (regex.test(unitStr)) {
      return { matched: true, unit: pattern.unit, matchedText: unitStr }
    }
  }

  return { matched: false, unit: null, matchedText: '' }
}

function parseWithUnit(inputString, options = {}) {
  const { defaultUnit = null, allowNegative = true } = options

  if (inputString == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }

  const trimmed = String(inputString).trim()

  if (trimmed === '') {
    return { error: createError(ERROR_CODES.EMPTY_VALUE) }
  }

  const match = trimmed.match(FULL_PATTERN)

  if (!match) {
    return { error: createError(ERROR_CODES.UNRECOGNIZED_INPUT) }
  }

  const [, numberPart, unitPart] = match

  const numberResult = parseNumberString(numberPart)
  if (numberResult.error) {
    return { error: numberResult.error }
  }

  const value = numberResult.value

  if (!allowNegative && value < 0) {
    return { error: createError(ERROR_CODES.NEGATIVE_NOT_ALLOWED) }
  }

  let unit = null

  if (unitPart) {
    const unitMatch = matchUnit(unitPart)
    if (!unitMatch.matched) {
      return { error: createError(ERROR_CODES.INVALID_UNIT, `无法识别单位: ${unitPart}`) }
    }
    unit = unitMatch.unit
  } else if (defaultUnit) {
    const defaultMatch = matchUnit(defaultUnit)
    if (!defaultMatch.matched) {
      return { error: createError(ERROR_CODES.INVALID_UNIT, `默认单位无效: ${defaultUnit}`) }
    }
    unit = defaultMatch.unit
  } else {
    return { error: createError(ERROR_CODES.INVALID_UNIT, '未提供单位且无默认单位') }
  }

  return {
    value,
    unit,
    unitCode: unit.code,
    rawInput: inputString,
    numberPart,
    unitPart: unitPart || '',
  }
}

function extractMultipleWithUnits(inputString, options = {}) {
  const { maxItems = MAX_BATCH_SIZE, allowNegative = true } = options

  if (inputString == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }

  const trimmed = String(inputString).trim()

  if (trimmed === '') {
    return { error: createError(ERROR_CODES.EMPTY_VALUE) }
  }

  const parts = trimmed.split(/[,\n;]+/)

  const results = []
  const failedItems = []

  for (let i = 0; i < parts.length && results.length < maxItems; i++) {
    const part = parts[i].trim()

    if (part === '') {
      continue
    }

    const parsed = parseWithUnit(part, { allowNegative })

    if (parsed.error) {
      failedItems.push({
        index: i,
        rawInput: part,
        error: parsed.error,
      })
    } else {
      results.push({
        ...parsed,
        index: i,
      })
    }
  }

  if (results.length === 0 && failedItems.length === 0) {
    return { error: createError(ERROR_CODES.UNRECOGNIZED_INPUT) }
  }

  return {
    results,
    failedItems,
    totalCount: results.length + failedItems.length,
    successCount: results.length,
    failureCount: failedItems.length,
  }
}

function parseBatchLines(inputText, targetUnit, options = {}) {
  const { maxLines = MAX_BATCH_SIZE, allowNegative = true, formatOptions = {} } = options

  if (inputText == null) {
    return { error: createError(ERROR_CODES.NULL_INPUT) }
  }

  const lines = String(inputText).split('\n')

  const items = []

  for (let i = 0; i < lines.length && i < maxLines; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    const result = {
      lineNumber: i + 1,
      rawLine: line,
      originalInput: trimmed,
    }

    if (trimmed === '') {
      result.success = false
      result.error = createError(ERROR_CODES.EMPTY_VALUE)
      items.push(result)
      continue
    }

    const parsed = parseWithUnit(trimmed, { allowNegative })

    if (parsed.error) {
      result.success = false
      result.error = parsed.error
      items.push(result)
      continue
    }

    const conversion = convertAndFormat(
      parsed.value,
      parsed.unitCode,
      targetUnit,
      formatOptions
    )

    if (conversion.error) {
      result.success = false
      result.error = conversion.error
      result.sourceValue = parsed.value
      result.sourceUnit = parsed.unitCode
      items.push(result)
      continue
    }

    result.success = true
    result.sourceValue = parsed.value
    result.sourceUnit = parsed.unitCode
    result.result = conversion
    items.push(result)
  }

  return {
    items,
    aggregated: aggregateResults(items),
  }
}

function aggregateResults(items) {
  const sortedItems = [...items].sort((a, b) => a.lineNumber - b.lineNumber)

  const successCount = sortedItems.filter((item) => item.success).length
  const failureCount = sortedItems.length - successCount

  return {
    items: sortedItems,
    totalCount: sortedItems.length,
    successCount,
    failureCount,
    allSuccessful: failureCount === 0,
    successRate: sortedItems.length > 0 ? successCount / sortedItems.length : 0,
  }
}

async function parseFromClipboard() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return { error: createError(ERROR_CODES.CLIPBOARD_READ_FAILED, '剪贴板 API 不可用') }
    }

    const text = await navigator.clipboard.readText()
    const extracted = extractMultipleWithUnits(text)

    if (extracted.error) {
      return {
        error: extracted.error,
        rawText: text,
      }
    }

    return {
      rawText: text,
      ...extracted,
    }
  } catch (err) {
    return {
      error: createError(ERROR_CODES.CLIPBOARD_READ_FAILED, err?.message || '剪贴板读取失败'),
    }
  }
}

function buildParserRegexDebug() {
  return {
    numberPattern: NUMBER_PATTERN,
    combinedUnitPattern: COMBINED_UNIT_PATTERN,
    fullPattern: FULL_PATTERN.source,
    loosePattern: LOOSE_PATTERN.source,
    unitCount: UNIT_PATTERNS.length,
  }
}

export {
  parseNumberString,
  matchUnit,
  parseWithUnit,
  extractMultipleWithUnits,
  parseBatchLines,
  parseFromClipboard,
  buildParserRegexDebug,
  NUMBER_PATTERN,
  COMBINED_UNIT_PATTERN,
}
