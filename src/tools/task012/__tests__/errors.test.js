import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES_ZH,
  ERROR_MESSAGES_EN,
  SUPPORTED_LANGUAGES,
  getErrorMessage,
  createError,
} from '../logic/errors.js'

describe('errors', () => {
  describe('ERROR_CODES', () => {
    test('should contain all required error codes', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
      expect(ERROR_CODES.INVALID_FIELD_COUNT).toBe('INVALID_FIELD_COUNT')
      expect(ERROR_CODES.INVALID_FIELD).toBe('INVALID_FIELD')
      expect(ERROR_CODES.INVALID_VALUE).toBe('INVALID_VALUE')
      expect(ERROR_CODES.INVALID_TIMEZONE).toBe('INVALID_TIMEZONE')
      expect(ERROR_CODES.UNSUPPORTED_LANGUAGE).toBe('UNSUPPORTED_LANGUAGE')
      expect(ERROR_CODES.UNSUPPORTED_COMBINATION).toBe('UNSUPPORTED_COMBINATION')
    })
  })

  describe('ERROR_MESSAGES', () => {
    test('should have Chinese messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES_ZH[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES_ZH[code]).toBe('string')
        expect(ERROR_MESSAGES_ZH[code].length).toBeGreaterThan(0)
      })
    })

    test('should have English messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES_EN[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES_EN[code]).toBe('string')
        expect(ERROR_MESSAGES_EN[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('SUPPORTED_LANGUAGES', () => {
    test('should contain zh and en', () => {
      expect(SUPPORTED_LANGUAGES).toContain('zh')
      expect(SUPPORTED_LANGUAGES).toContain('en')
    })
  })

  describe('getErrorMessage', () => {
    test('should return Chinese message by default', () => {
      const msg = getErrorMessage(ERROR_CODES.INVALID_FIELD)
      expect(msg).toBe(ERROR_MESSAGES_ZH[ERROR_CODES.INVALID_FIELD])
    })

    test('should return English message when language is en', () => {
      const msg = getErrorMessage(ERROR_CODES.INVALID_FIELD, 'en')
      expect(msg).toBe(ERROR_MESSAGES_EN[ERROR_CODES.INVALID_FIELD])
    })

    test('should prepend field name when provided', () => {
      const msg = getErrorMessage(ERROR_CODES.INVALID_VALUE, 'zh', '秒')
      expect(msg).toContain('秒：')
    })
  })

  describe('createError', () => {
    test('should create error object with code', () => {
      const error = createError(ERROR_CODES.INVALID_FIELD)
      expect(error.code).toBe(ERROR_CODES.INVALID_FIELD)
    })

    test('should include fieldName when provided', () => {
      const error = createError(ERROR_CODES.INVALID_VALUE, '分')
      expect(error.code).toBe(ERROR_CODES.INVALID_VALUE)
      expect(error.fieldName).toBe('分')
    })

    test('should include details when provided', () => {
      const error = createError(ERROR_CODES.INVALID_VALUE, null, 'value must be between 0 and 59')
      expect(error.details).toBe('value must be between 0 and 59')
    })
  })
})
