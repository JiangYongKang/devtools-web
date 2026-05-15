import { describe, expect, test } from 'vitest'
import {
  VERSION,
  ERROR_CODES,
  ERROR_MESSAGES,
  SOURCES,
  ENVIRONMENTS,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
  MAX_PAYLOAD_DEPTH,
  MAX_PAYLOAD_KEYS,
  DEFAULT_REFRESH_INTERVAL_MS,
  MAX_REFRESH_INTERVAL_MS,
  EXPONENTIAL_BACKOFF,
  SENSITIVE_KEY_PATTERN,
  DEFAULT_API_PATH,
  SCRIPT_KEY_PATTERNS,
} from '../logic/constants.js'

describe('constants module', () => {
  describe('VERSION', () => {
    test('should have a version string', () => {
      expect(typeof VERSION).toBe('string')
      expect(VERSION.length).toBeGreaterThan(0)
    })
  })

  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CODES.NETWORK).toBe('NETWORK')
      expect(ERROR_CODES.TIMEOUT).toBe('TIMEOUT')
      expect(ERROR_CODES.ABORTED).toBe('ABORTED')
      expect(ERROR_CODES.HTTP_ERROR).toBe('HTTP_ERROR')
      expect(ERROR_CODES.INVALID_JSON).toBe('INVALID_JSON')
      expect(ERROR_CODES.INVALID_CONFIG).toBe('INVALID_CONFIG')
      expect(ERROR_CODES.SCRIPT_FIELD_DETECTED).toBe('SCRIPT_FIELD_DETECTED')
      expect(ERROR_CODES.PAYLOAD_TOO_DEEP).toBe('PAYLOAD_TOO_DEEP')
      expect(ERROR_CODES.PAYLOAD_TOO_MANY_KEYS).toBe('PAYLOAD_TOO_MANY_KEYS')
      expect(ERROR_CODES.CIRCULAR_REF).toBe('CIRCULAR_REF')
      expect(ERROR_CODES.TYPE_MISMATCH).toBe('TYPE_MISMATCH')
      expect(ERROR_CODES.CONFIG_EXPIRED).toBe('CONFIG_EXPIRED')
      expect(ERROR_CODES.SSR_NO_FETCH).toBe('SSR_NO_FETCH')
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

  describe('SOURCES', () => {
    test('should have all source types', () => {
      expect(SOURCES.REMOTE).toBe('remote')
      expect(SOURCES.STATIC).toBe('static')
      expect(SOURCES.DEFAULT).toBe('default')
    })
  })

  describe('ENVIRONMENTS', () => {
    test('should have all environment types', () => {
      expect(ENVIRONMENTS.DEV).toBe('dev')
      expect(ENVIRONMENTS.STAGING).toBe('staging')
      expect(ENVIRONMENTS.PROD).toBe('prod')
    })
  })

  describe('timeout constants', () => {
    test('should have reasonable timeout defaults', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(8000)
      expect(MAX_TIMEOUT_MS).toBe(60000)
      expect(MIN_TIMEOUT_MS).toBe(0)
    })

    test('MAX_TIMEOUT_MS should be greater than DEFAULT_TIMEOUT_MS', () => {
      expect(MAX_TIMEOUT_MS).toBeGreaterThan(DEFAULT_TIMEOUT_MS)
    })
  })

  describe('payload limits', () => {
    test('should have reasonable payload limits', () => {
      expect(MAX_PAYLOAD_DEPTH).toBe(5)
      expect(MAX_PAYLOAD_KEYS).toBe(100)
    })
  })

  describe('refresh interval', () => {
    test('should have reasonable refresh intervals', () => {
      expect(DEFAULT_REFRESH_INTERVAL_MS).toBe(60000)
      expect(MAX_REFRESH_INTERVAL_MS).toBe(3600000)
    })
  })

  describe('exponential backoff', () => {
    test('should have reasonable backoff parameters', () => {
      expect(EXPONENTIAL_BACKOFF.INITIAL_DELAY_MS).toBe(1000)
      expect(EXPONENTIAL_BACKOFF.MAX_DELAY_MS).toBe(60000)
      expect(EXPONENTIAL_BACKOFF.MULTIPLIER).toBe(2)
      expect(EXPONENTIAL_BACKOFF.MAX_ATTEMPTS).toBe(5)
      expect(EXPONENTIAL_BACKOFF.JITTER_FACTOR).toBe(0.1)
    })
  })

  describe('patterns', () => {
    test('SENSITIVE_KEY_PATTERN should match sensitive keys', () => {
      expect(SENSITIVE_KEY_PATTERN.test('token')).toBe(true)
      expect(SENSITIVE_KEY_PATTERN.test('Token')).toBe(true)
      expect(SENSITIVE_KEY_PATTERN.test('TOKEN')).toBe(true)
      expect(SENSITIVE_KEY_PATTERN.test('secret')).toBe(true)
      expect(SENSITIVE_KEY_PATTERN.test('password')).toBe(true)
      expect(SENSITIVE_KEY_PATTERN.test('api_token')).toBe(true)
      expect(SENSITIVE_KEY_PATTERN.test('normal_key')).toBe(false)
      expect(SENSITIVE_KEY_PATTERN.test('username')).toBe(false)
    })

    test('SCRIPT_KEY_PATTERNS should match script keys', () => {
      const testCases = [
        { key: 'script', expected: true },
        { key: 'Script', expected: true },
        { key: 'SCRIPT', expected: true },
        { key: 'onclick', expected: true },
        { key: 'onload', expected: true },
        { key: 'onClick', expected: true },
        { key: 'normal', expected: false },
        { key: 'data', expected: false },
      ]

      testCases.forEach(({ key, expected }) => {
        const matches = SCRIPT_KEY_PATTERNS.some((pattern) => pattern.test(key))
        expect(matches).toBe(expected)
      })
    })
  })

  describe('API path', () => {
    test('should have default API path', () => {
      expect(DEFAULT_API_PATH).toBe('/api/devtools/config')
    })
  })
})
