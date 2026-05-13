import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isBaseValid,
  isRoundingModeValid,
  isDecimalsValid,
} from '../logic/errors.js'

describe('ERROR_CODES', () => {
  test('should have all required error codes', () => {
    expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
    expect(ERROR_CODES.EMPTY_VALUE).toBe('EMPTY_VALUE')
    expect(ERROR_CODES.INVALID_NUMBER).toBe('INVALID_NUMBER')
    expect(ERROR_CODES.INVALID_UNIT).toBe('INVALID_UNIT')
    expect(ERROR_CODES.UNRECOGNIZED_INPUT).toBe('UNRECOGNIZED_INPUT')
    expect(ERROR_CODES.NEGATIVE_NOT_ALLOWED).toBe('NEGATIVE_NOT_ALLOWED')
    expect(ERROR_CODES.NOT_FINITE).toBe('NOT_FINITE')
    expect(ERROR_CODES.OVERFLOW).toBe('OVERFLOW')
    expect(ERROR_CODES.UNDERFLOW).toBe('UNDERFLOW')
    expect(ERROR_CODES.EXPONENT_TOO_LARGE).toBe('EXPONENT_TOO_LARGE')
    expect(ERROR_CODES.BATCH_TOO_LARGE).toBe('BATCH_TOO_LARGE')
    expect(ERROR_CODES.INVALID_BASE).toBe('INVALID_BASE')
    expect(ERROR_CODES.INVALID_ROUNDING_MODE).toBe('INVALID_ROUNDING_MODE')
    expect(ERROR_CODES.INVALID_DECIMALS).toBe('INVALID_DECIMALS')
    expect(ERROR_CODES.INCOMPATIBLE_CATEGORIES).toBe('INCOMPATIBLE_CATEGORIES')
    expect(ERROR_CODES.CLIPBOARD_READ_FAILED).toBe('CLIPBOARD_READ_FAILED')
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
    expect(getErrorMessage(ERROR_CODES.INVALID_NUMBER)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_NUMBER])
  })

  test('should return default message for unknown error codes', () => {
    expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
  })
})

describe('createError', () => {
  test('should create error object with correct code and default message', () => {
    const result = createError(ERROR_CODES.INVALID_UNIT)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_UNIT)
    expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_UNIT])
  })

  test('should create error object with custom message', () => {
    const customMessage = 'Custom error message'
    const result = createError(ERROR_CODES.INVALID_UNIT, customMessage)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_UNIT)
    expect(result.errorMessage).toBe(customMessage)
  })
})

describe('isBaseValid', () => {
  test('should return true for valid bases (1000 and 1024)', () => {
    expect(isBaseValid(1000)).toBe(true)
    expect(isBaseValid(1024)).toBe(true)
  })

  test('should return false for invalid bases', () => {
    expect(isBaseValid(2)).toBe(false)
    expect(isBaseValid(10)).toBe(false)
    expect(isBaseValid(100)).toBe(false)
    expect(isBaseValid(0)).toBe(false)
    expect(isBaseValid(-1)).toBe(false)
    expect(isBaseValid(1000.5)).toBe(false)
  })
})

describe('isRoundingModeValid', () => {
  test('should return true for valid rounding modes', () => {
    expect(isRoundingModeValid('round')).toBe(true)
    expect(isRoundingModeValid('floor')).toBe(true)
    expect(isRoundingModeValid('ceil')).toBe(true)
    expect(isRoundingModeValid('bankers')).toBe(true)
  })

  test('should return false for invalid rounding modes', () => {
    expect(isRoundingModeValid('truncate')).toBe(false)
    expect(isRoundingModeValid('invalid')).toBe(false)
    expect(isRoundingModeValid(null)).toBe(false)
    expect(isRoundingModeValid(undefined)).toBe(false)
    expect(isRoundingModeValid(123)).toBe(false)
  })
})

describe('isDecimalsValid', () => {
  test('should return true for valid decimal values', () => {
    expect(isDecimalsValid(0)).toBe(true)
    expect(isDecimalsValid(1)).toBe(true)
    expect(isDecimalsValid(2)).toBe(true)
    expect(isDecimalsValid(10)).toBe(true)
    expect(isDecimalsValid(20)).toBe(true)
    expect(isDecimalsValid('0')).toBe(true)
    expect(isDecimalsValid('5')).toBe(true)
  })

  test('should return false for invalid decimal values', () => {
    expect(isDecimalsValid(-1)).toBe(false)
    expect(isDecimalsValid(21)).toBe(false)
    expect(isDecimalsValid(100)).toBe(false)
    expect(isDecimalsValid(2.5)).toBe(false)
    expect(isDecimalsValid('invalid')).toBe(false)
    expect(isDecimalsValid(null)).toBe(false)
    expect(isDecimalsValid(undefined)).toBe(false)
  })
})
