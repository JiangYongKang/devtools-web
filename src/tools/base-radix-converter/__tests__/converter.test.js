import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isRadixValid,
} from '../logic/errors.js'
import {
  buildParams,
  convertSingle,
  aggregateBatchResults,
  validateBatchInput,
  parseInput,
  formatOutput,
  isCharValid,
  charToDigit,
  digitToChar,
} from '../logic/converter.js'

describe('errors', () => {
  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.EMPTY_VALUE).toBe('EMPTY_VALUE')
      expect(ERROR_CODES.INVALID_RADIX).toBe('INVALID_RADIX')
      expect(ERROR_CODES.INVALID_CHAR).toBe('INVALID_CHAR')
      expect(ERROR_CODES.NEGATIVE_NOT_ALLOWED).toBe('NEGATIVE_NOT_ALLOWED')
      expect(ERROR_CODES.LEADING_ZEROS_NOT_ALLOWED).toBe('LEADING_ZEROS_NOT_ALLOWED')
      expect(ERROR_CODES.OVERFLOW).toBe('OVERFLOW')
      expect(ERROR_CODES.VALUE_TOO_LONG).toBe('VALUE_TOO_LONG')
      expect(ERROR_CODES.BATCH_TOO_LARGE).toBe('BATCH_TOO_LARGE')
      expect(ERROR_CODES.BATCH_PRODUCT_EXCEEDED).toBe('BATCH_PRODUCT_EXCEEDED')
    })
  })

  describe('ERROR_MESSAGES', () => {
    test('should have messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('getErrorMessage', () => {
    test('should return correct message for known error codes', () => {
      expect(getErrorMessage(ERROR_CODES.NULL_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT])
      expect(getErrorMessage(ERROR_CODES.EMPTY_VALUE)).toBe(ERROR_MESSAGES[ERROR_CODES.EMPTY_VALUE])
      expect(getErrorMessage(ERROR_CODES.INVALID_RADIX)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_RADIX])
    })

    test('should return default message for unknown error codes', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })

  describe('createError', () => {
    test('should create error object with correct code and default message', () => {
      const result = createError(ERROR_CODES.INVALID_RADIX)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_RADIX)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_RADIX])
    })

    test('should create error object with custom message', () => {
      const customMessage = 'Custom error message'
      const result = createError(ERROR_CODES.INVALID_RADIX, customMessage)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_RADIX)
      expect(result.errorMessage).toBe(customMessage)
    })
  })

  describe('isRadixValid', () => {
    test('should return true for valid radix values', () => {
      expect(isRadixValid(2)).toBe(true)
      expect(isRadixValid(8)).toBe(true)
      expect(isRadixValid(10)).toBe(true)
      expect(isRadixValid(16)).toBe(true)
      expect(isRadixValid(36)).toBe(true)
    })

    test('should return true for valid radix as string', () => {
      expect(isRadixValid('10')).toBe(true)
      expect(isRadixValid('16')).toBe(true)
    })

    test('should return false for radix less than 2', () => {
      expect(isRadixValid(1)).toBe(false)
      expect(isRadixValid(0)).toBe(false)
      expect(isRadixValid(-1)).toBe(false)
    })

    test('should return false for radix greater than 36', () => {
      expect(isRadixValid(37)).toBe(false)
      expect(isRadixValid(100)).toBe(false)
    })

    test('should return false for non-integer radix', () => {
      expect(isRadixValid(10.5)).toBe(false)
      expect(isRadixValid(16.1)).toBe(false)
    })

    test('should return false for invalid string radix', () => {
      expect(isRadixValid('abc')).toBe(false)
      expect(isRadixValid('')).toBe(false)
    })
  })
})

describe('converter utility functions', () => {
  describe('charToDigit', () => {
    test('should convert digit characters correctly', () => {
      expect(charToDigit('0')).toBe(0)
      expect(charToDigit('5')).toBe(5)
      expect(charToDigit('9')).toBe(9)
    })

    test('should convert letter characters correctly', () => {
      expect(charToDigit('a')).toBe(10)
      expect(charToDigit('A')).toBe(10)
      expect(charToDigit('f')).toBe(15)
      expect(charToDigit('F')).toBe(15)
      expect(charToDigit('z')).toBe(35)
      expect(charToDigit('Z')).toBe(35)
    })
  })

  describe('digitToChar', () => {
    test('should convert digits 0-9 correctly', () => {
      expect(digitToChar(0)).toBe('0')
      expect(digitToChar(5)).toBe('5')
      expect(digitToChar(9)).toBe('9')
    })

    test('should convert digits 10-35 to lowercase letters by default', () => {
      expect(digitToChar(10)).toBe('a')
      expect(digitToChar(15)).toBe('f')
      expect(digitToChar(35)).toBe('z')
    })

    test('should convert to uppercase when upperCase is true', () => {
      expect(digitToChar(10, true)).toBe('A')
      expect(digitToChar(15, true)).toBe('F')
      expect(digitToChar(35, true)).toBe('Z')
    })
  })

  describe('isCharValid', () => {
    test('should validate characters for binary', () => {
      expect(isCharValid('0', 2)).toBe(true)
      expect(isCharValid('1', 2)).toBe(true)
      expect(isCharValid('2', 2)).toBe(false)
    })

    test('should validate characters for decimal', () => {
      expect(isCharValid('0', 10)).toBe(true)
      expect(isCharValid('9', 10)).toBe(true)
      expect(isCharValid('a', 10)).toBe(false)
    })

    test('should validate characters for hexadecimal', () => {
      expect(isCharValid('0', 16)).toBe(true)
      expect(isCharValid('9', 16)).toBe(true)
      expect(isCharValid('a', 16)).toBe(true)
      expect(isCharValid('F', 16)).toBe(true)
      expect(isCharValid('g', 16)).toBe(false)
    })

    test('should validate characters for base 36', () => {
      expect(isCharValid('0', 36)).toBe(true)
      expect(isCharValid('9', 36)).toBe(true)
      expect(isCharValid('a', 36)).toBe(true)
      expect(isCharValid('z', 36)).toBe(true)
      expect(isCharValid('A', 36)).toBe(true)
      expect(isCharValid('Z', 36)).toBe(true)
    })
  })
})

describe('buildParams', () => {
  test('should use default values when not provided', () => {
    const params = buildParams({})
    expect(params.value).toBe('')
    expect(params.sourceRadix).toBe(10)
    expect(params.targetRadix).toBe(16)
    expect(params.allowNegative).toBe(true)
    expect(params.allowLeadingZeros).toBe(false)
    expect(params.separator).toBe('')
    expect(params.outputMinLength).toBe(0)
    expect(params.outputUpperCase).toBe(false)
  })

  test('should use provided values', () => {
    const params = buildParams({
      value: 'FF',
      sourceRadix: 16,
      targetRadix: 2,
      allowNegative: false,
      allowLeadingZeros: true,
      separator: ' ',
      outputMinLength: 8,
      outputUpperCase: true,
    })
    expect(params.value).toBe('FF')
    expect(params.sourceRadix).toBe(16)
    expect(params.targetRadix).toBe(2)
    expect(params.allowNegative).toBe(false)
    expect(params.allowLeadingZeros).toBe(true)
    expect(params.separator).toBe(' ')
    expect(params.outputMinLength).toBe(8)
    expect(params.outputUpperCase).toBe(true)
  })

  test('should convert numeric string values to numbers', () => {
    const params = buildParams({
      sourceRadix: '16',
      targetRadix: '2',
      outputMinLength: '8',
    })
    expect(params.sourceRadix).toBe(16)
    expect(params.targetRadix).toBe(2)
    expect(params.outputMinLength).toBe(8)
  })
})

describe('convertSingle', () => {
  test('should convert decimal to hexadecimal', () => {
    const result = convertSingle({
      value: '255',
      sourceRadix: 10,
      targetRadix: 16,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('ff')
    expect(result.originalValue).toBe('255')
    expect(result.sourceRadix).toBe(10)
    expect(result.targetRadix).toBe(16)
    expect(result.numericValue).toBe(255)
    expect(result.isNegative).toBe(false)
  })

  test('should convert hexadecimal to decimal', () => {
    const result = convertSingle({
      value: 'FF',
      sourceRadix: 16,
      targetRadix: 10,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('255')
    expect(result.numericValue).toBe(255)
  })

  test('should convert binary to octal', () => {
    const result = convertSingle({
      value: '11111111',
      sourceRadix: 2,
      targetRadix: 8,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('377')
  })

  test('should output uppercase when enabled', () => {
    const result = convertSingle({
      value: '255',
      sourceRadix: 10,
      targetRadix: 16,
      outputUpperCase: true,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('FF')
  })

  test('should pad to minimum length', () => {
    const result = convertSingle({
      value: '255',
      sourceRadix: 10,
      targetRadix: 16,
      outputMinLength: 6,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('0000ff')
  })

  test('should add separators', () => {
    const result = convertSingle({
      value: '4294967295',
      sourceRadix: 10,
      targetRadix: 16,
      separator: ' ',
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('ffff ffff')
  })

  test('should handle negative numbers', () => {
    const result = convertSingle({
      value: '-255',
      sourceRadix: 10,
      targetRadix: 16,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('-ff')
    expect(result.isNegative).toBe(true)
    expect(result.numericValue).toBe(-255)
  })

  test('should return error for invalid radix', () => {
    const result = convertSingle({
      value: '255',
      sourceRadix: 1,
      targetRadix: 16,
    })
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_RADIX)
  })

  test('should return error for null input', () => {
    const result = convertSingle({
      value: null,
      sourceRadix: 10,
      targetRadix: 16,
    })
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  test('should return error for empty value', () => {
    const result = convertSingle({
      value: '',
      sourceRadix: 10,
      targetRadix: 16,
    })
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_VALUE)
  })

  test('should return error for invalid characters', () => {
    const result = convertSingle({
      value: '12G',
      sourceRadix: 10,
      targetRadix: 16,
    })
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_CHAR)
  })

  test('should return error for negative when not allowed', () => {
    const result = convertSingle({
      value: '-255',
      sourceRadix: 10,
      targetRadix: 16,
      allowNegative: false,
    })
    expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_NOT_ALLOWED)
  })

  test('should return error for leading zeros when not allowed', () => {
    const result = convertSingle({
      value: '00255',
      sourceRadix: 10,
      targetRadix: 16,
      allowLeadingZeros: false,
    })
    expect(result.errorCode).toBe(ERROR_CODES.LEADING_ZEROS_NOT_ALLOWED)
  })

  test('should allow leading zeros when enabled', () => {
    const result = convertSingle({
      value: '00255',
      sourceRadix: 10,
      targetRadix: 16,
      allowLeadingZeros: true,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('ff')
  })

  test('should return error for very long values', () => {
    const longValue = '1'.repeat(20)
    const result = convertSingle({
      value: longValue,
      sourceRadix: 10,
      targetRadix: 16,
    })
    expect(result.errorCode).toBe(ERROR_CODES.VALUE_TOO_LONG)
  })

  test('should convert zero correctly', () => {
    const result = convertSingle({
      value: '0',
      sourceRadix: 10,
      targetRadix: 2,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('0')
    expect(result.numericValue).toBe(0)
  })

  test('should handle positive sign', () => {
    const result = convertSingle({
      value: '+255',
      sourceRadix: 10,
      targetRadix: 16,
    })
    expect(result.errorCode).toBeNull()
    expect(result.convertedValue).toBe('ff')
  })
})

describe('aggregateBatchResults', () => {
  test('should aggregate all successful conversions', () => {
    const items = [
      { value: '255', sourceRadix: 10, targetRadix: 16 },
      { value: '1024', sourceRadix: 10, targetRadix: 16 },
      { value: 'FF', sourceRadix: 16, targetRadix: 10 },
    ]

    const result = aggregateBatchResults(items)

    expect(result.totalCount).toBe(3)
    expect(result.successCount).toBe(3)
    expect(result.failureCount).toBe(0)
    expect(result.allSuccess).toBe(true)
    expect(result.items.every(item => item.success)).toBe(true)
  })

  test('should aggregate mixed success and failure', () => {
    const items = [
      { value: '255', sourceRadix: 10, targetRadix: 16 },
      { value: 'INVALID', sourceRadix: 10, targetRadix: 16 },
      { value: 'FF', sourceRadix: 16, targetRadix: 10 },
    ]

    const result = aggregateBatchResults(items)

    expect(result.totalCount).toBe(3)
    expect(result.successCount).toBe(2)
    expect(result.failureCount).toBe(1)
    expect(result.allSuccess).toBe(false)
    expect(result.items[0].success).toBe(true)
    expect(result.items[1].success).toBe(false)
    expect(result.items[2].success).toBe(true)
  })

  test('should handle empty input array', () => {
    const result = aggregateBatchResults([])

    expect(result.totalCount).toBe(0)
    expect(result.successCount).toBe(0)
    expect(result.failureCount).toBe(0)
    expect(result.allSuccess).toBe(true)
    expect(result.items.length).toBe(0)
  })

  test('should return correct indices for each item', () => {
    const items = [
      { value: '1', sourceRadix: 10, targetRadix: 2 },
      { value: '2', sourceRadix: 10, targetRadix: 2 },
      { value: '3', sourceRadix: 10, targetRadix: 2 },
    ]

    const result = aggregateBatchResults(items)

    result.items.forEach((item, idx) => {
      expect(item.index).toBe(idx)
    })
  })

  test('should include error details for failed items', () => {
    const items = [
      { value: 'INVALID', sourceRadix: 10, targetRadix: 16 },
    ]

    const result = aggregateBatchResults(items)

    expect(result.items[0].success).toBe(false)
    expect(result.items[0].errorCode).toBe(ERROR_CODES.INVALID_CHAR)
    expect(result.items[0].errorMessage).toBeDefined()
  })

  test('should include conversion result for successful items', () => {
    const items = [
      { value: '255', sourceRadix: 10, targetRadix: 16 },
    ]

    const result = aggregateBatchResults(items)

    expect(result.items[0].success).toBe(true)
    expect(result.items[0].result).toBeDefined()
    expect(result.items[0].result.convertedValue).toBe('ff')
  })
})

describe('validateBatchInput', () => {
  test('should return valid for valid array', () => {
    const result = validateBatchInput([
      { value: '1' },
      { value: '2' },
      { value: '3' },
    ])
    expect(result.valid).toBe(true)
  })

  test('should return invalid for non-array input', () => {
    const result = validateBatchInput('not an array')
    expect(result.valid).toBe(false)
  })

  test('should return invalid for empty array', () => {
    const result = validateBatchInput([])
    expect(result.valid).toBe(true)
  })
})

describe('parseInput', () => {
  test('should parse positive integer', () => {
    const result = parseInput('255', 10)
    expect(result.error).toBeUndefined()
    expect(result.numericValue.toString()).toBe('255')
    expect(result.isNegative).toBe(false)
  })

  test('should parse negative integer', () => {
    const result = parseInput('-255', 10)
    expect(result.error).toBeUndefined()
    expect(result.numericValue.toString()).toBe('-255')
    expect(result.isNegative).toBe(true)
  })

  test('should return error for invalid character', () => {
    const result = parseInput('12G', 10)
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_CHAR)
  })
})

describe('formatOutput', () => {
  test('should format zero', () => {
    const result = formatOutput(BigInt(0), 2)
    expect(result).toBe('0')
  })

  test('should format negative number', () => {
    const result = formatOutput(BigInt(-255), 16)
    expect(result).toBe('-ff')
  })

  test('should format with uppercase', () => {
    const result = formatOutput(BigInt(255), 16, { outputUpperCase: true })
    expect(result).toBe('FF')
  })

  test('should format with padding', () => {
    const result = formatOutput(BigInt(255), 16, { outputMinLength: 8 })
    expect(result).toBe('000000ff')
  })
})
