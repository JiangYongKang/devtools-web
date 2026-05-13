import { describe, expect, test } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
  QUERY_ARRAY_FORMATS,
  DEFAULT_QUERY_ARRAY_FORMAT,
  DEFAULT_DEDUPE_TTL_MS,
  HTTP_METHODS,
  BODY_METHODS,
} from '../logic/constants.js'

describe('constants module', () => {
  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.NETWORK).toBe('NETWORK')
      expect(ERROR_CODES.TIMEOUT).toBe('TIMEOUT')
      expect(ERROR_CODES.ABORTED).toBe('ABORTED')
      expect(ERROR_CODES.HTTP_ERROR).toBe('HTTP_ERROR')
      expect(ERROR_CODES.INVALID_URL).toBe('INVALID_URL')
      expect(ERROR_CODES.INTERCEPTOR_REJECTED).toBe('INTERCEPTOR_REJECTED')
      expect(ERROR_CODES.CORS_PREFLIGHT_FAILED).toBe('CORS_PREFLIGHT_FAILED')
      expect(ERROR_CODES.INVALID_BASE_URL).toBe('INVALID_BASE_URL')
      expect(ERROR_CODES.UNKNOWN).toBe('UNKNOWN')
    })

    test('should have messages for all error codes', () => {
      Object.values(ERROR_CODES).forEach((code) => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(typeof ERROR_MESSAGES[code]).toBe('string')
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
      })
    })
  })

  describe('timeout constants', () => {
    test('should have reasonable timeout defaults', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(30000)
      expect(MAX_TIMEOUT_MS).toBe(600000)
      expect(MIN_TIMEOUT_MS).toBe(0)
    })

    test('MAX_TIMEOUT_MS should be greater than DEFAULT_TIMEOUT_MS', () => {
      expect(MAX_TIMEOUT_MS).toBeGreaterThan(DEFAULT_TIMEOUT_MS)
    })
  })

  describe('query array formats', () => {
    test('should have all array format options', () => {
      expect(QUERY_ARRAY_FORMATS.INDICES).toBe('indices')
      expect(QUERY_ARRAY_FORMATS.BRACKETS).toBe('brackets')
      expect(QUERY_ARRAY_FORMATS.REPEAT).toBe('repeat')
      expect(QUERY_ARRAY_FORMATS.COMMA).toBe('comma')
    })

    test('default format should be brackets', () => {
      expect(DEFAULT_QUERY_ARRAY_FORMAT).toBe(QUERY_ARRAY_FORMATS.BRACKETS)
    })
  })

  describe('deduplication', () => {
    test('should have default dedupe TTL', () => {
      expect(DEFAULT_DEDUPE_TTL_MS).toBe(500)
    })
  })

  describe('HTTP methods', () => {
    test('should have all HTTP methods', () => {
      expect(HTTP_METHODS.GET).toBe('GET')
      expect(HTTP_METHODS.POST).toBe('POST')
      expect(HTTP_METHODS.PUT).toBe('PUT')
      expect(HTTP_METHODS.PATCH).toBe('PATCH')
      expect(HTTP_METHODS.DELETE).toBe('DELETE')
      expect(HTTP_METHODS.HEAD).toBe('HEAD')
      expect(HTTP_METHODS.OPTIONS).toBe('OPTIONS')
    })

    test('BODY_METHODS should include POST, PUT, PATCH', () => {
      expect(BODY_METHODS.has(HTTP_METHODS.POST)).toBe(true)
      expect(BODY_METHODS.has(HTTP_METHODS.PUT)).toBe(true)
      expect(BODY_METHODS.has(HTTP_METHODS.PATCH)).toBe(true)
      expect(BODY_METHODS.has(HTTP_METHODS.GET)).toBe(false)
      expect(BODY_METHODS.has(HTTP_METHODS.DELETE)).toBe(false)
    })
  })
})
