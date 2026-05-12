import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
} from '../logic/errors.js'

describe('errors', () => {
  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.CRYPTO_NOT_AVAILABLE).toBe('CRYPTO_NOT_AVAILABLE')
      expect(ERROR_CODES.INVALID_ALGORITHM).toBe('INVALID_ALGORITHM')
      expect(ERROR_CODES.INVALID_KEY).toBe('INVALID_KEY')
      expect(ERROR_CODES.INVALID_IV).toBe('INVALID_IV')
      expect(ERROR_CODES.INVALID_INPUT_FORMAT).toBe('INVALID_INPUT_FORMAT')
      expect(ERROR_CODES.EMPTY_PLAINTEXT).toBe('EMPTY_PLAINTEXT')
      expect(ERROR_CODES.EMPTY_CIPHERTEXT).toBe('EMPTY_CIPHERTEXT')
      expect(ERROR_CODES.TEXT_TOO_LONG).toBe('TEXT_TOO_LONG')
      expect(ERROR_CODES.INVALID_BASE64).toBe('INVALID_BASE64')
      expect(ERROR_CODES.INVALID_HEX).toBe('INVALID_HEX')
      expect(ERROR_CODES.KEY_LENGTH_MISMATCH).toBe('KEY_LENGTH_MISMATCH')
      expect(ERROR_CODES.IV_LENGTH_MISMATCH).toBe('IV_LENGTH_MISMATCH')
      expect(ERROR_CODES.ENCRYPTION_FAILED).toBe('ENCRYPTION_FAILED')
      expect(ERROR_CODES.DECRYPTION_FAILED).toBe('DECRYPTION_FAILED')
      expect(ERROR_CODES.TAG_MISMATCH).toBe('TAG_MISMATCH')
      expect(ERROR_CODES.INVALID_PARAMETER).toBe('INVALID_PARAMETER')
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
      expect(getErrorMessage(ERROR_CODES.INVALID_ALGORITHM)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_ALGORITHM])
      expect(getErrorMessage(ERROR_CODES.CRYPTO_NOT_AVAILABLE)).toBe(ERROR_MESSAGES[ERROR_CODES.CRYPTO_NOT_AVAILABLE])
    })

    test('should return default message for unknown error codes', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })

  describe('createError', () => {
    test('should create error object with correct code and default message', () => {
      const result = createError(ERROR_CODES.INVALID_KEY)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_KEY)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_KEY])
    })

    test('should create error object with custom message', () => {
      const customMessage = 'Custom error message'
      const result = createError(ERROR_CODES.INVALID_KEY, customMessage)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_KEY)
      expect(result.errorMessage).toBe(customMessage)
    })
  })
})
