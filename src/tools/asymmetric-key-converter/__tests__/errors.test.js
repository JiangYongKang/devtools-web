import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  isWebCryptoAvailable,
} from '../logic/errors.js'

describe('errors - 错误处理', () => {
  describe('ERROR_CODES', () => {
    test('包含所有必要的错误码', () => {
      expect(ERROR_CODES.INVALID_ALGORITHM).toBe('INVALID_ALGORITHM')
      expect(ERROR_CODES.INVALID_KEY_SIZE).toBe('INVALID_KEY_SIZE')
      expect(ERROR_CODES.INVALID_CURVE).toBe('INVALID_CURVE')
      expect(ERROR_CODES.INVALID_PEM_FORMAT).toBe('INVALID_PEM_FORMAT')
      expect(ERROR_CODES.INVALID_PEM_BEGIN).toBe('INVALID_PEM_BEGIN')
      expect(ERROR_CODES.INVALID_PEM_END).toBe('INVALID_PEM_END')
      expect(ERROR_CODES.INVALID_JWK_FORMAT).toBe('INVALID_JWK_FORMAT')
      expect(ERROR_CODES.INVALID_SPKI_FORMAT).toBe('INVALID_SPKI_FORMAT')
      expect(ERROR_CODES.KEY_GENERATION_FAILED).toBe('KEY_GENERATION_FAILED')
      expect(ERROR_CODES.KEY_EXPORT_FAILED).toBe('KEY_EXPORT_FAILED')
      expect(ERROR_CODES.KEY_IMPORT_FAILED).toBe('KEY_IMPORT_FAILED')
      expect(ERROR_CODES.FINGERPRINT_FAILED).toBe('FINGERPRINT_FAILED')
      expect(ERROR_CODES.UNSUPPORTED_OPERATION).toBe('UNSUPPORTED_OPERATION')
      expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
      expect(ERROR_CODES.WEB_CRYPTO_NOT_AVAILABLE).toBe('WEB_CRYPTO_NOT_AVAILABLE')
    })
  })

  describe('ERROR_MESSAGES', () => {
    test('所有错误码都有对应的错误消息', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('getErrorMessage', () => {
    test('已知错误码返回正确消息', () => {
      expect(getErrorMessage(ERROR_CODES.INVALID_ALGORITHM)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_ALGORITHM])
      expect(getErrorMessage(ERROR_CODES.INVALID_PEM_FORMAT)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_PEM_FORMAT])
    })

    test('未知错误码返回默认消息', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })

  describe('createError', () => {
    test('创建包含错误码和默认消息的错误对象', () => {
      const result = createError(ERROR_CODES.INVALID_ALGORITHM)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ALGORITHM)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_ALGORITHM])
    })

    test('创建包含自定义消息的错误对象', () => {
      const customMessage = '自定义错误消息'
      const result = createError(ERROR_CODES.INVALID_ALGORITHM, customMessage)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ALGORITHM)
      expect(result.errorMessage).toBe(customMessage)
    })
  })

  describe('isWebCryptoAvailable', () => {
    test('返回布尔值', () => {
      const result = isWebCryptoAvailable()
      expect(typeof result).toBe('boolean')
    })
  })
})
