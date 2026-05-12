import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  CLOSE_CODE_DESCRIPTIONS,
  CLOSE_CODE_FALLBACK,
} from '../logic/constants.js'
import {
  ERROR_MESSAGES,
  ERROR_SUGGESTIONS,
  getErrorMessage,
  getErrorSuggestion,
  getCloseCodeDescription,
  isCloseCodeNormal,
  isCloseCodeError,
  createError,
} from '../logic/errors.js'

describe('errors', () => {
  describe('ERROR_MESSAGES', () => {
    test('should have message for every error code', () => {
      for (const code of Object.values(ERROR_CODES)) {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
        expect(ERROR_MESSAGES[code]).toContain(code)
      }
    })
  })

  describe('ERROR_SUGGESTIONS', () => {
    test('should have suggestion for every error code', () => {
      for (const code of Object.values(ERROR_CODES)) {
        expect(ERROR_SUGGESTIONS[code]).toBeDefined()
        expect(typeof ERROR_SUGGESTIONS[code]).toBe('string')
        expect(ERROR_SUGGESTIONS[code].length).toBeGreaterThan(0)
      }
    })
  })

  describe('getErrorMessage', () => {
    test('should return correct message for known codes', () => {
      expect(getErrorMessage(ERROR_CODES.NULL_URL)).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_URL])
      expect(getErrorMessage(ERROR_CODES.INVALID_URL)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_URL])
      expect(getErrorMessage(ERROR_CODES.CONNECT_FAILED)).toBe(ERROR_MESSAGES[ERROR_CODES.CONNECT_FAILED])
    })

    test('should return default message for unknown codes', () => {
      const message = getErrorMessage('UNKNOWN_CODE')
      expect(message).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER])
    })
  })

  describe('getErrorSuggestion', () => {
    test('should return correct suggestion for known codes', () => {
      expect(getErrorSuggestion(ERROR_CODES.NULL_URL)).toBe(ERROR_SUGGESTIONS[ERROR_CODES.NULL_URL])
      expect(getErrorSuggestion(ERROR_CODES.MIXED_CONTENT_BLOCKED)).toBe(ERROR_SUGGESTIONS[ERROR_CODES.MIXED_CONTENT_BLOCKED])
    })

    test('should return default suggestion for unknown codes', () => {
      const suggestion = getErrorSuggestion('UNKNOWN_CODE')
      expect(suggestion).toBe(ERROR_SUGGESTIONS[ERROR_CODES.INVALID_PARAMETER])
    })
  })

  describe('CLOSE_CODE_DESCRIPTIONS', () => {
    test('should include standard close codes', () => {
      expect(CLOSE_CODE_DESCRIPTIONS[1000]).toBeDefined()
      expect(CLOSE_CODE_DESCRIPTIONS[1001]).toBeDefined()
      expect(CLOSE_CODE_DESCRIPTIONS[1006]).toBeDefined()
      expect(CLOSE_CODE_DESCRIPTIONS[1015]).toBeDefined()
    })

    test('should have required fields for each close code', () => {
      for (const [code, desc] of Object.entries(CLOSE_CODE_DESCRIPTIONS)) {
        expect(typeof code).toBe('string')
        expect(parseInt(code)).not.toBeNaN()
        expect(typeof desc.name).toBe('string')
        expect(typeof desc.meaning).toBe('string')
        expect(typeof desc.suggestion).toBe('string')
        expect(desc.name.length).toBeGreaterThan(0)
        expect(desc.meaning.length).toBeGreaterThan(0)
        expect(desc.suggestion.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getCloseCodeDescription', () => {
    test('should return description for known code', () => {
      const desc = getCloseCodeDescription(1000)
      expect(desc.name).toBe('CLOSE_NORMAL')
      expect(desc.meaning).toBeDefined()
      expect(desc.suggestion).toBeDefined()
    })

    test('should return fallback for unknown code', () => {
      const desc = getCloseCodeDescription(99999)
      expect(desc.name).toBe(CLOSE_CODE_FALLBACK.name)
      expect(desc.meaning).toBe(CLOSE_CODE_FALLBACK.meaning)
    })

    test('should include mixed content hint in 1006 suggestion', () => {
      const desc = getCloseCodeDescription(1006)
      expect(desc.suggestion.toLowerCase()).toContain('混合内容')
    })

    test('should include TLS hint in 1015 suggestion', () => {
      const desc = getCloseCodeDescription(1015)
      expect(desc.suggestion.toLowerCase()).toContain('ssl')
      expect(desc.suggestion.toLowerCase()).toContain('证书')
    })
  })

  describe('isCloseCodeNormal', () => {
    test('should return true for 1000', () => {
      expect(isCloseCodeNormal(1000)).toBe(true)
    })

    test('should return true for 1001', () => {
      expect(isCloseCodeNormal(1001)).toBe(true)
    })

    test('should return false for error codes', () => {
      expect(isCloseCodeNormal(1002)).toBe(false)
      expect(isCloseCodeNormal(1006)).toBe(false)
      expect(isCloseCodeNormal(1015)).toBe(false)
    })

    test('should return false for custom codes', () => {
      expect(isCloseCodeNormal(4000)).toBe(false)
    })
  })

  describe('isCloseCodeError', () => {
    test('should return false for normal codes', () => {
      expect(isCloseCodeError(1000)).toBe(false)
      expect(isCloseCodeError(1001)).toBe(false)
    })

    test('should return true for protocol error codes', () => {
      expect(isCloseCodeError(1002)).toBe(true)
      expect(isCloseCodeError(1003)).toBe(true)
      expect(isCloseCodeError(1007)).toBe(true)
      expect(isCloseCodeError(1008)).toBe(true)
      expect(isCloseCodeError(1009)).toBe(true)
      expect(isCloseCodeError(1011)).toBe(true)
    })

    test('should return true for abnormal close 1006', () => {
      expect(isCloseCodeError(1006)).toBe(true)
    })

    test('should return true for TLS error 1015', () => {
      expect(isCloseCodeError(1015)).toBe(true)
    })

    test('should return false for custom codes (4000+)', () => {
      expect(isCloseCodeError(4000)).toBe(false)
      expect(isCloseCodeError(4999)).toBe(false)
    })
  })

  describe('createError', () => {
    test('should create error object with required fields', () => {
      const error = createError(ERROR_CODES.CONNECT_FAILED)
      expect(error.code).toBe(ERROR_CODES.CONNECT_FAILED)
      expect(error.message).toBe(getErrorMessage(ERROR_CODES.CONNECT_FAILED))
      expect(error.suggestion).toBe(getErrorSuggestion(ERROR_CODES.CONNECT_FAILED))
    })

    test('should include extra info when provided', () => {
      const error = createError(ERROR_CODES.SEND_FAILED, { reason: 'Network error', code: 1006 })
      expect(error.code).toBe(ERROR_CODES.SEND_FAILED)
      expect(error.reason).toBe('Network error')
      expect(error.code).toBe(ERROR_CODES.SEND_FAILED)
    })

    test('should use message format with code', () => {
      const error = createError(ERROR_CODES.NULL_URL)
      expect(error.message).toContain(ERROR_CODES.NULL_URL)
    })
  })

  describe('error code mapping to readable messages', () => {
    test('should provide suggestion for mixed content blocking', () => {
      const suggestion = getErrorSuggestion(ERROR_CODES.MIXED_CONTENT_BLOCKED)
      expect(suggestion.toLowerCase()).toContain('wss')
      expect(suggestion.toLowerCase()).toContain('http')
    })

    test('should provide suggestion for handshake failure', () => {
      const suggestion = getErrorSuggestion(ERROR_CODES.HANDSHAKE_FAILED)
      expect(suggestion.toLowerCase()).toContain('url')
    })

    test('should provide suggestion for connection timeout', () => {
      const suggestion = getErrorSuggestion(ERROR_CODES.CONNECTION_TIMEOUT)
      expect(suggestion.toLowerCase()).toContain('超时')
    })

    test('should provide suggestion for max retries exceeded', () => {
      const suggestion = getErrorSuggestion(ERROR_CODES.MAX_RETRIES_EXCEEDED)
      expect(suggestion.toLowerCase()).toContain('重试')
    })
  })
})
