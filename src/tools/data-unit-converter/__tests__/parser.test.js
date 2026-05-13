import { describe, test, expect } from 'vitest'
import {
  parseNumberString,
  matchUnit,
  parseWithUnit,
  extractMultipleWithUnits,
  parseBatchLines,
} from '../logic/parser.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('parseNumberString', () => {
  test('should parse simple integer', () => {
    const result = parseNumberString('123')
    expect(result.value).toBe(123)
    expect(result.error).toBeUndefined()
  })

  test('should parse decimal with dot', () => {
    const result = parseNumberString('123.45')
    expect(result.value).toBe(123.45)
  })

  test('should parse decimal with comma', () => {
    const result = parseNumberString('123,45')
    expect(result.value).toBe(123.45)
  })

  test('should parse scientific notation', () => {
    const result = parseNumberString('1e5')
    expect(result.value).toBe(100000)

    const result2 = parseNumberString('1.5e-3')
    expect(result2.value).toBe(0.0015)
  })

  test('should parse negative numbers', () => {
    const result = parseNumberString('-123.45')
    expect(result.value).toBe(-123.45)
  })

  test('should parse numbers with thousands separator', () => {
    const result = parseNumberString('1,000,000')
    expect(result.value).toBe(1000000)

    const result2 = parseNumberString('1.000.000')
    expect(result2.value).toBe(1000000)
  })

  test('should return error for empty string', () => {
    const result = parseNumberString('')
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_VALUE)
  })

  test('should return error for invalid number', () => {
    const result = parseNumberString('abc')
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_NUMBER)
  })

  test('should return error for Infinity', () => {
    const result = parseNumberString('Infinity')
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.NOT_FINITE)
  })

  test('should respect maxExponent', () => {
    const result = parseNumberString('1e100', { maxExponent: 50 })
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.EXPONENT_TOO_LARGE)
  })
})

describe('matchUnit', () => {
  test('should match exact unit code', () => {
    const result = matchUnit('GB')
    expect(result.matched).toBe(true)
    expect(result.unit.code).toBe('GB')
    expect(result.matchedText).toBe('GB')
  })

  test('should match case-insensitive unit', () => {
    const result = matchUnit('gb')
    expect(result.matched).toBe(true)
    expect(result.unit.code).toBe('GB')
  })

  test('should match IEC units', () => {
    const result = matchUnit('GiB')
    expect(result.matched).toBe(true)
    expect(result.unit.system).toBe('iec')
  })

  test('should match bitrate units', () => {
    const result = matchUnit('Mbps')
    expect(result.matched).toBe(true)
    expect(result.unit.category).toBe('bitrate')
  })

  test('should match time units', () => {
    const result = matchUnit('h')
    expect(result.matched).toBe(true)
    expect(result.unit.category).toBe('time')
  })

  test('should match aliases', () => {
    const result = matchUnit('byte')
    expect(result.matched).toBe(true)
    expect(result.unit.code).toBe('B')
  })

  test('should return not matched for invalid unit', () => {
    const result = matchUnit('XYZ')
    expect(result.matched).toBe(false)
    expect(result.unit).toBeNull()
  })
})

describe('parseWithUnit', () => {
  test('should parse "value unit" format', () => {
    const result = parseWithUnit('1 GB')
    expect(result.value).toBe(1)
    expect(result.unit.code).toBe('GB')
    expect(result.error).toBeUndefined()
  })

  test('should parse "valueunit" format (no space)', () => {
    const result = parseWithUnit('1GB')
    expect(result.value).toBe(1)
    expect(result.unit.code).toBe('GB')
  })

  test('should parse with decimal values', () => {
    const result = parseWithUnit('1.5 GiB')
    expect(result.value).toBe(1.5)
    expect(result.unit.code).toBe('GiB')
  })

  test('should parse with scientific notation', () => {
    const result = parseWithUnit('1e3 MB')
    expect(result.value).toBe(1000)
    expect(result.unit.code).toBe('MB')
  })

  test('should parse negative values', () => {
    const result = parseWithUnit('-1 GB')
    expect(result.value).toBe(-1)
  })

  test('should parse bitrate units', () => {
    const result = parseWithUnit('100 Mbps')
    expect(result.value).toBe(100)
    expect(result.unit.code).toBe('Mbps')
  })

  test('should parse time units', () => {
    const result = parseWithUnit('2.5 h')
    expect(result.value).toBe(2.5)
    expect(result.unit.code).toBe('h')
  })

  test('should handle extra whitespace', () => {
    const result = parseWithUnit('  1   GB  ')
    expect(result.value).toBe(1)
    expect(result.unit.code).toBe('GB')
  })

  test('should return error for empty input', () => {
    const result = parseWithUnit('')
    expect(result.error).toBeDefined()
  })

  test('should return error for input without number', () => {
    const result = parseWithUnit('GB')
    expect(result.error).toBeDefined()
  })

  test('should return error for input without unit', () => {
    const result = parseWithUnit('123')
    expect(result.error).toBeDefined()
  })

  test('should return error for unrecognized input', () => {
    const result = parseWithUnit('abc def')
    expect(result.error).toBeDefined()
  })

  test('should reject negative values when disallowed', () => {
    const result = parseWithUnit('-1 GB', { allowNegative: false })
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.NEGATIVE_NOT_ALLOWED)
  })
})

describe('extractMultipleWithUnits', () => {
  test('should extract single value with unit', () => {
    const result = extractMultipleWithUnits('1 GB')
    expect(result.results.length).toBe(1)
    expect(result.results[0].value).toBe(1)
    expect(result.results[0].unit.code).toBe('GB')
  })

  test('should extract multiple values separated by comma', () => {
    const result = extractMultipleWithUnits('1 GB, 2 MB, 3 KiB')
    expect(result.results.length).toBe(3)
    expect(result.results[0].value).toBe(1)
    expect(result.results[1].value).toBe(2)
    expect(result.results[2].value).toBe(3)
  })

  test('should extract values separated by newline', () => {
    const result = extractMultipleWithUnits('1 GB\n2 MB\n3 KiB')
    expect(result.results.length).toBe(3)
  })

  test('should extract values separated by semicolon', () => {
    const result = extractMultipleWithUnits('1 GB; 2 MB; 3 KiB')
    expect(result.results.length).toBe(3)
  })

  test('should handle partial success', () => {
    const result = extractMultipleWithUnits('1 GB, invalid, 2 MB')
    expect(result.results.length).toBe(2)
    expect(result.failedItems.length).toBe(1)
  })

  test('should respect max items limit', () => {
    const input = '1 GB, 2 GB, 3 GB, 4 GB, 5 GB'
    const result = extractMultipleWithUnits(input, { maxItems: 3 })
    expect(result.results.length).toBe(3)
  })
})

describe('parseBatchLines', () => {
  test('should parse single line', () => {
    const result = parseBatchLines('1 GB', 'MB')
    expect(result.items.length).toBe(1)
    expect(result.items[0].success).toBe(true)
  })

  test('should parse multiple lines', () => {
    const lines = ['1 GB', '2 GB', '3 GB'].join('\n')
    const result = parseBatchLines(lines, 'MB')
    expect(result.items.length).toBe(3)
    expect(result.items.every((item) => item.success)).toBe(true)
  })

  test('should return error for each invalid line', () => {
    const lines = ['1 GB', 'invalid', '2 GB'].join('\n')
    const result = parseBatchLines(lines, 'MB')
    expect(result.items.length).toBe(3)
    expect(result.items[0].success).toBe(true)
    expect(result.items[1].success).toBe(false)
    expect(result.items[2].success).toBe(true)
  })

  test('should include line numbers', () => {
    const lines = ['1 GB', '2 GB'].join('\n')
    const result = parseBatchLines(lines, 'MB')
    expect(result.items[0].lineNumber).toBe(1)
    expect(result.items[1].lineNumber).toBe(2)
  })

  test('should include conversion result', () => {
    const result = parseBatchLines('1 GB', 'MB')
    expect(result.items[0].result.value).toBe(1000)
    expect(result.items[0].result.targetUnit.code).toBe('MB')
  })

  test('should handle empty lines', () => {
    const lines = ['1 GB', '', '2 GB'].join('\n')
    const result = parseBatchLines(lines, 'MB')
    expect(result.items.length).toBe(3)
    expect(result.items[1].success).toBe(false)
  })

  test('should aggregate results', () => {
    const lines = ['1 GB', '2 GB', 'invalid'].join('\n')
    const result = parseBatchLines(lines, 'MB')
    expect(result.aggregated.totalCount).toBe(3)
    expect(result.aggregated.successCount).toBe(2)
    expect(result.aggregated.failureCount).toBe(1)
  })

  test('should respect max lines limit', () => {
    const lines = Array(100).fill('1 GB').join('\n')
    const result = parseBatchLines(lines, 'MB', { maxLines: 50 })
    expect(result.items.length).toBe(50)
  })
})
