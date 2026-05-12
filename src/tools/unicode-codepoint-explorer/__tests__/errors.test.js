import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
} from '../logic/errors.js'

describe('ERROR_CODES', () => {
  test('should have all required error codes', () => {
    expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
    expect(ERROR_CODES.INVALID_ESCAPE).toBe('INVALID_ESCAPE')
    expect(ERROR_CODES.OUT_OF_RANGE_CODE_POINT).toBe('OUT_OF_RANGE_CODE_POINT')
    expect(ERROR_CODES.PROPERTY_LOOKUP_FAILED).toBe('PROPERTY_LOOKUP_FAILED')
    expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
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
    expect(getErrorMessage(ERROR_CODES.INVALID_ESCAPE)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_ESCAPE])
    expect(getErrorMessage(ERROR_CODES.OUT_OF_RANGE_CODE_POINT)).toBe(ERROR_MESSAGES[ERROR_CODES.OUT_OF_RANGE_CODE_POINT])
  })

  test('should return default message for unknown error codes', () => {
    expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
  })
})

describe('createError', () => {
  test('should create error object with correct code and default message', () => {
    const result = createError(ERROR_CODES.INVALID_ESCAPE)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_ESCAPE)
    expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_ESCAPE])
  })

  test('should create error object with custom message', () => {
    const customMessage = 'Custom error message'
    const result = createError(ERROR_CODES.INVALID_ESCAPE, customMessage)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_ESCAPE)
    expect(result.errorMessage).toBe(customMessage)
  })
})
