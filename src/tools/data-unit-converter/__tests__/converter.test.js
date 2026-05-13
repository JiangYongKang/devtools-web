import { describe, test, expect } from 'vitest'
import {
  getUnitFactor,
  normalizeToBase,
  convertValue,
  convertAndFormat,
  convertToMultipleUnits,
  calculateBandwidthTime,
  calculateStorageCost,
  aggregateBatchResults,
  exportToTSV,
  buildConversionFormula,
  getCompatibleUnits,
} from '../logic/converter.js'
import { CATEGORIES } from '../logic/constants.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('getUnitFactor', () => {
  test('should return 1 for base unit', () => {
    expect(getUnitFactor('B')).toBe(1)
    expect(getUnitFactor('bit')).toBe(1)
    expect(getUnitFactor('s')).toBe(1)
  })

  test('should return correct SI factors (1000 base)', () => {
    expect(getUnitFactor('KB')).toBe(1000)
    expect(getUnitFactor('MB')).toBe(1000 * 1000)
    expect(getUnitFactor('GB')).toBe(1000 * 1000 * 1000)
  })

  test('should return correct IEC factors (1024 base)', () => {
    expect(getUnitFactor('KiB')).toBe(1024)
    expect(getUnitFactor('MiB')).toBe(1024 * 1024)
    expect(getUnitFactor('GiB')).toBe(1024 * 1024 * 1024)
  })

  test('should return correct time factors', () => {
    expect(getUnitFactor('min')).toBe(60)
    expect(getUnitFactor('h')).toBe(3600)
  })

  test('should return 0 for unknown unit', () => {
    expect(getUnitFactor('INVALID')).toBe(0)
  })
})

describe('normalizeToBase', () => {
  test('should normalize bytes to base unit', () => {
    const result = normalizeToBase(1, 'KB')
    expect(result.value).toBe(1000)
    expect(result.category).toBe(CATEGORIES.BYTE)
  })

  test('should normalize IEC units', () => {
    const result = normalizeToBase(1, 'MiB')
    expect(result.value).toBe(1024 * 1024)
    expect(result.category).toBe(CATEGORIES.BYTE)
  })

  test('should normalize time units', () => {
    const result = normalizeToBase(1, 'h')
    expect(result.value).toBe(3600)
    expect(result.category).toBe(CATEGORIES.TIME)
  })

  test('should return error for invalid unit', () => {
    const result = normalizeToBase(1, 'INVALID')
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_UNIT)
  })

  test('should return error for non-finite value', () => {
    const result = normalizeToBase(Infinity, 'KB')
    expect(result.error).toBeDefined()
  })
})

describe('convertValue', () => {
  test('should convert between same category units', () => {
    const result = convertValue(1, 'GB', 'MB')
    expect(result.value).toBe(1000)
  })

  test('should convert between IEC and SI units', () => {
    const result = convertValue(1, 'MiB', 'MB')
    expect(result.value).toBeCloseTo(1.048576, 5)
  })

  test('should convert between bytes and bits', () => {
    const result = convertValue(1, 'B', 'bit')
    expect(result.value).toBe(8)
  })

  test('should convert between bits and bytes', () => {
    const result = convertValue(8, 'bit', 'B')
    expect(result.value).toBe(1)
  })

  test('should handle zero', () => {
    const result = convertValue(0, 'GB', 'MB')
    expect(result.value).toBe(0)
  })

  test('should return error for incompatible categories', () => {
    const result = convertValue(1, 'GB', 's')
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.INCOMPATIBLE_CATEGORIES)
  })

  test('should return error for invalid source unit', () => {
    const result = convertValue(1, 'INVALID', 'GB')
    expect(result.error).toBeDefined()
  })

  test('should return error for invalid target unit', () => {
    const result = convertValue(1, 'GB', 'INVALID')
    expect(result.error).toBeDefined()
  })

  test('should return error for non-finite value', () => {
    const result = convertValue(Infinity, 'GB', 'MB')
    expect(result.error).toBeDefined()
  })

  test('should reject negative values when disallowed', () => {
    const result = convertValue(-1, 'GB', 'MB', { allowNegative: false })
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.NEGATIVE_NOT_ALLOWED)
  })
})

describe('convertAndFormat', () => {
  test('should convert and format with default options', () => {
    const result = convertAndFormat(1, 'GB', 'MB')
    expect(result.value).toBe(1000)
    expect(result.formatted).toBeDefined()
  })

  test('should use custom decimal places', () => {
    const result = convertAndFormat(1, 'MiB', 'MB', { decimals: 3 })
    expect(result.roundedValue).toBeCloseTo(1.049, 3)
  })

  test('should use custom rounding mode', () => {
    const floorResult = convertAndFormat(1.9, 'GB', 'MB', { roundingMode: 'floor', decimals: 0 })
    expect(floorResult.value).toBe(1900)
  })

  test('should return error on conversion failure', () => {
    const result = convertAndFormat(1, 'INVALID', 'MB')
    expect(result.error).toBeDefined()
  })
})

describe('convertToMultipleUnits', () => {
  test('should convert to multiple target units', () => {
    const result = convertToMultipleUnits(1, 'GB', ['MB', 'KB', 'B'])
    expect(result.results.length).toBe(3)
    expect(result.results[0].targetUnit).toBe('MB')
    expect(result.results[0].value).toBe(1000)
    expect(result.results[1].value).toBe(1000000)
    expect(result.results[2].value).toBe(1000000000)
  })

  test('should return sourceUnit code string', () => {
    const result = convertToMultipleUnits(1, 'GB', ['MB'])
    expect(typeof result.results[0].targetUnit).toBe('string')
  })

  test('should include IEC and SI units', () => {
    const result = convertToMultipleUnits(1, 'GB', ['GB', 'GiB'])
    expect(result.results.length).toBe(2)
  })

  test('should handle invalid target units', () => {
    const result = convertToMultipleUnits(1, 'GB', ['MB', 'INVALID'])
    expect(result.results.length).toBe(1)
  })

  test('should return error for invalid source unit', () => {
    const result = convertToMultipleUnits(1, 'INVALID', ['MB'])
    expect(result.error).toBeDefined()
  })
})

describe('calculateBandwidthTime', () => {
  test('should calculate transfer amount', () => {
    const result = calculateBandwidthTime(1, 'Mbps', 1, 's')
    expect(result.bits).toBe(1000000)
    expect(result.bytes).toBe(125000)
  })

  test('should calculate with minute time unit', () => {
    const result = calculateBandwidthTime(1, 'Mbps', 1, 'min')
    expect(result.bytes).toBe(7500000)
  })

  test('should calculate with hour time unit', () => {
    const result = calculateBandwidthTime(1, 'Mbps', 1, 'h')
    expect(result.bytes).toBe(450000000)
  })

  test('should return formatted values', () => {
    const result = calculateBandwidthTime(100, 'Mbps', 1, 's')
    expect(result.formatted).toBeDefined()
  })

  test('should return error for invalid bandwidth unit', () => {
    const result = calculateBandwidthTime(1, 'INVALID', 1, 's')
    expect(result.error).toBeDefined()
  })

  test('should return error for invalid time unit', () => {
    const result = calculateBandwidthTime(1, 'Mbps', 1, 'INVALID')
    expect(result.error).toBeDefined()
  })
})

describe('calculateStorageCost', () => {
  test('should calculate storage cost', () => {
    const result = calculateStorageCost(100, 'GB', 0.05)
    expect(result.cost).toBe(5)
  })

  test('should handle different unit sizes', () => {
    const result = calculateStorageCost(1, 'TB', 0.05)
    expect(result.cost).toBe(50)
  })

  test('should handle zero storage', () => {
    const result = calculateStorageCost(0, 'GB', 0.05)
    expect(result.cost).toBe(0)
  })

  test('should return formatted values', () => {
    const result = calculateStorageCost(100, 'GB', 0.05, { currencyCode: 'USD' })
    expect(result.formattedCost).toBeDefined()
  })

  test('should return error for invalid unit', () => {
    const result = calculateStorageCost(100, 'INVALID', 0.05)
    expect(result.error).toBeDefined()
  })

  test('should reject negative price', () => {
    const result = calculateStorageCost(100, 'GB', -0.05)
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.NEGATIVE_NOT_ALLOWED)
  })
})

describe('aggregateBatchResults', () => {
  test('should aggregate successful results', () => {
    const items = [
      { lineNumber: 1, success: true, result: { value: 1000 } },
      { lineNumber: 2, success: true, result: { value: 2000 } },
      { lineNumber: 3, success: false, error: { errorCode: 'ERROR' } },
    ]

    const result = aggregateBatchResults(items)
    expect(result.totalCount).toBe(3)
    expect(result.successCount).toBe(2)
    expect(result.failureCount).toBe(1)
    expect(result.allSuccessful).toBe(false)
  })

  test('should handle all successful', () => {
    const items = [
      { lineNumber: 1, success: true, result: { value: 1000 } },
      { lineNumber: 2, success: true, result: { value: 2000 } },
    ]

    const result = aggregateBatchResults(items)
    expect(result.allSuccessful).toBe(true)
  })

  test('should sort by line number', () => {
    const items = [
      { lineNumber: 3, success: true },
      { lineNumber: 1, success: true },
      { lineNumber: 2, success: false },
    ]

    const result = aggregateBatchResults(items)
    expect(result.items[0].lineNumber).toBe(1)
    expect(result.items[1].lineNumber).toBe(2)
    expect(result.items[2].lineNumber).toBe(3)
  })
})

describe('exportToTSV', () => {
  test('should export successful results to TSV', () => {
    const items = [
      { lineNumber: 1, success: true, originalInput: '1 GB', result: { value: 1000, targetUnit: 'MB' } },
      { lineNumber: 2, success: true, originalInput: '2 GB', result: { value: 2000, targetUnit: 'MB' } },
    ]

    const tsv = exportToTSV(items)
    expect(tsv).toContain('1 GB')
    expect(tsv).toContain('1000')
    expect(tsv).toContain('2 GB')
    expect(tsv).toContain('2000')
    expect(tsv).toContain('\t')
  })

  test('should include headers', () => {
    const items = [{ lineNumber: 1, success: true, originalInput: '1 GB', result: { value: 1000 } }]
    const tsv = exportToTSV(items)
    const lines = tsv.split('\n')
    expect(lines[0]).toContain('Line')
    expect(lines[0]).toContain('Input')
  })

  test('should handle custom headers', () => {
    const items = [{ lineNumber: 1, success: true, originalInput: 'test', result: { value: 1 } }]
    const tsv = exportToTSV(items, { headers: ['Custom1', 'Custom2'] })
    expect(tsv).toContain('Custom1\tCustom2')
  })
})

describe('buildConversionFormula', () => {
  test('should build formula for same category conversion', () => {
    const formula = buildConversionFormula(1, 'GB', 'MB')
    expect(formula).toContain('1')
    expect(formula).toContain('GB')
    expect(formula).toContain('MB')
  })

  test('should build formula for bytes to bits conversion', () => {
    const formula = buildConversionFormula(1, 'B', 'bit')
    expect(formula).toContain('8')
  })

  test('should build formula for IEC to SI conversion', () => {
    const formula = buildConversionFormula(1, 'MiB', 'MB')
    expect(formula).toContain('1048576')
    expect(formula).toContain('1000000')
  })

  test('should include substituted values', () => {
    const formula = buildConversionFormula(100, 'GB', 'TB')
    expect(formula).toContain('100')
  })
})

describe('getCompatibleUnits', () => {
  test('should return compatible units for byte', () => {
    const units = getCompatibleUnits('GB')
    expect(units.length).toBeGreaterThan(0)
    expect(units.some((u) => u.code === 'MB')).toBe(true)
    expect(units.some((u) => u.code === 'GiB')).toBe(true)
    expect(units.some((u) => u.code === 'Mbit')).toBe(true)
  })

  test('should return compatible units for bit', () => {
    const units = getCompatibleUnits('Mbit')
    expect(units.some((u) => u.code === 'MB')).toBe(true)
  })

  test('should return empty array for invalid unit', () => {
    const units = getCompatibleUnits('INVALID')
    expect(units).toEqual([])
  })
})
