import { describe, expect, test } from 'vitest'
import { ERROR_CODES } from '../logic/errors.js'
import {
    checkValueBounds,
    formatNumber,
    formatScientific,
    roundBankers,
    roundWithMode,
    shouldUseScientific,
} from '../logic/formatter.js'

describe('roundBankers', () => {
  test('should round down when fractional part is less than 0.5', () => {
    expect(roundBankers(2.4)).toBe(2)
    expect(roundBankers(2.49)).toBe(2)
  })

  test('should round up when fractional part is greater than 0.5', () => {
    expect(roundBankers(2.51)).toBe(3)
    expect(roundBankers(2.6)).toBe(3)
  })

  test('should round to nearest even when fractional part is exactly 0.5', () => {
    expect(roundBankers(2.5)).toBe(2)
    expect(roundBankers(3.5)).toBe(4)
    expect(roundBankers(4.5)).toBe(4)
    expect(roundBankers(5.5)).toBe(6)
  })

  test('should handle negative numbers', () => {
    expect(roundBankers(-2.5)).toBe(-2)
    expect(roundBankers(-3.5)).toBe(-4)
  })

  test('should respect decimal places', () => {
    expect(roundBankers(2.345, 2)).toBeCloseTo(2.34, 2)
    expect(roundBankers(2.355, 2)).toBeCloseTo(2.36, 2)
  })

  test('should handle zero', () => {
    expect(roundBankers(0)).toBe(0)
    expect(roundBankers(-0)).toBe(0)
  })
})

describe('roundWithMode', () => {
  test('should round with standard rounding mode', () => {
    expect(roundWithMode(2.5, 'round', 0).value).toBe(3)
    expect(roundWithMode(2.4, 'round', 0).value).toBe(2)
  })

  test('should round with floor mode', () => {
    expect(roundWithMode(2.9, 'floor', 0).value).toBe(2)
    expect(roundWithMode(-2.1, 'floor', 0).value).toBe(-3)
  })

  test('should round with ceil mode', () => {
    expect(roundWithMode(2.1, 'ceil', 0).value).toBe(3)
    expect(roundWithMode(-2.9, 'ceil', 0).value).toBe(-2)
  })

  test('should round with bankers mode', () => {
    expect(roundWithMode(2.5, 'bankers', 0).value).toBe(2)
    expect(roundWithMode(3.5, 'bankers', 0).value).toBe(4)
  })

  test('should respect decimal places', () => {
    expect(roundWithMode(2.345, 'round', 2).value).toBe(2.35)
    expect(roundWithMode(2.344, 'round', 2).value).toBe(2.34)
  })

  test('should return error for invalid rounding mode', () => {
    const result = roundWithMode(2.5, 'invalid', 0)
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_ROUNDING_MODE)
  })

  test('should return error for invalid decimals', () => {
    const result = roundWithMode(2.5, 'round', -1)
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_DECIMALS)
  })

  test('should return error for non-finite numbers', () => {
    expect(roundWithMode(Infinity, 'round', 0).error).toBeDefined()
    expect(roundWithMode(-Infinity, 'round', 0).error).toBeDefined()
    expect(roundWithMode(NaN, 'round', 0).error).toBeDefined()
  })
})

describe('shouldUseScientific', () => {
  test('should return false for numbers in normal range', () => {
    expect(shouldUseScientific(100)).toBe(false)
    expect(shouldUseScientific(1000000)).toBe(false)
    expect(shouldUseScientific(0.001)).toBe(false)
  })

  test('should return true for very large numbers', () => {
    expect(shouldUseScientific(1e16)).toBe(true)
    expect(shouldUseScientific(1e20)).toBe(true)
  })

  test('should return true for very small positive numbers', () => {
    expect(shouldUseScientific(1e-7)).toBe(true)
    expect(shouldUseScientific(1e-10)).toBe(true)
  })

  test('should return false for zero', () => {
    expect(shouldUseScientific(0)).toBe(false)
  })

  test('should respect custom threshold', () => {
    expect(shouldUseScientific(1000, 1000)).toBe(true)
    expect(shouldUseScientific(999, 1000)).toBe(false)
  })
})

describe('formatScientific', () => {
  test('should format positive number in scientific notation', () => {
    const result = formatScientific(1000000, 2)
    expect(result.isScientific).toBe(true)
    expect(result.formatted).toMatch(/1e\+?6/)
  })

  test('should format small number in scientific notation', () => {
    const result = formatScientific(0.000001, 2)
    expect(result.isScientific).toBe(true)
    expect(result.formatted).toMatch(/1e-6/)
  })

  test('should return non-scientific for zero', () => {
    const result = formatScientific(0, 2)
    expect(result.isScientific).toBe(false)
    expect(result.formatted).toBe('0')
  })

  test('should respect decimal places', () => {
    const result = formatScientific(1234567, 3)
    expect(result.formatted).toMatch(/1\.235e\+?6/)
  })
})

describe('formatNumber', () => {
  test('should format number with standard options', () => {
    const result = formatNumber(1234.567, { decimals: 2 })
    expect(result.error).toBeUndefined()
    expect(result.roundedValue).toBe(1234.57)
    expect(result.formatted).toBeDefined()
  })

  test('should use rounding mode', () => {
    const floorResult = formatNumber(1234.567, { roundingMode: 'floor', decimals: 2 })
    expect(floorResult.roundedValue).toBe(1234.56)

    const ceilResult = formatNumber(1234.561, { roundingMode: 'ceil', decimals: 2 })
    expect(ceilResult.roundedValue).toBe(1234.57)
  })

  test('should use scientific notation when requested', () => {
    const result = formatNumber(1234567, { useScientific: true, decimals: 2 })
    expect(result.isScientific).toBe(true)
  })

  test('should return error for non-finite numbers', () => {
    expect(formatNumber(Infinity).error).toBeDefined()
    expect(formatNumber(NaN).error).toBeDefined()
  })
})

describe('checkValueBounds', () => {
  test('should return valid for normal numbers', () => {
    expect(checkValueBounds(100).valid).toBe(true)
    expect(checkValueBounds(0).valid).toBe(true)
    expect(checkValueBounds(-100).valid).toBe(true)
  })

  test('should return invalid for non-finite numbers', () => {
    expect(checkValueBounds(Infinity).valid).toBe(false)
    expect(checkValueBounds(-Infinity).valid).toBe(false)
    expect(checkValueBounds(NaN).valid).toBe(false)
  })

  test('should return NOT_FINITE for Infinity', () => {
    const result = checkValueBounds(Number.MAX_VALUE * 2)
    expect(result.valid).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.NOT_FINITE)
  })
})
