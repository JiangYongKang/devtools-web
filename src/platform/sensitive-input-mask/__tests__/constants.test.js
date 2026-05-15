import { describe, expect, test } from 'vitest'
import {
  ERROR_CODES,
  DEFAULT_REVEAL_DURATION_SECONDS,
  MIN_REVEAL_DURATION_SECONDS,
  MAX_REVEAL_DURATION_SECONDS,
  SENSITIVE_KEY_PATTERNS,
  MAX_CLIPBOARD_LENGTH,
} from '../logic/constants.js'

describe('constants', () => {
  describe('ERROR_CODES', () => {
    test('should have all expected error codes', () => {
      expect(ERROR_CODES).toEqual(expect.objectContaining({
        INVALID_KEY_NAME: expect.any(String),
        SENSITIVE_KEY_REJECTED: expect.any(String),
        STORAGE_WRITE_DENIED: expect.any(String),
        CONTENT_TOO_LARGE: expect.any(String),
        USER_GESTURE_REQUIRED: expect.any(String),
      }))
    })
  })

  describe('reveal duration bounds', () => {
    test('should have MIN_REVEAL_DURATION_SECONDS = 3', () => {
      expect(MIN_REVEAL_DURATION_SECONDS).toBe(3)
    })

    test('should have MAX_REVEAL_DURATION_SECONDS = 15', () => {
      expect(MAX_REVEAL_DURATION_SECONDS).toBe(15)
    })

    test('should have DEFAULT_REVEAL_DURATION_SECONDS = 5', () => {
      expect(DEFAULT_REVEAL_DURATION_SECONDS).toBe(5)
    })

    test('should have correct bounds: MIN <= DEFAULT <= MAX', () => {
      expect(MIN_REVEAL_DURATION_SECONDS).toBeLessThanOrEqual(DEFAULT_REVEAL_DURATION_SECONDS)
      expect(DEFAULT_REVEAL_DURATION_SECONDS).toBeLessThanOrEqual(MAX_REVEAL_DURATION_SECONDS)
    })
  })

  describe('SENSITIVE_KEY_PATTERNS', () => {
    test('should include common sensitive key patterns', () => {
      const patterns = SENSITIVE_KEY_PATTERNS.map((p) => p.toString())
      expect(patterns.some((p) => p.includes('password'))).toBe(true)
      expect(patterns.some((p) => p.includes('token'))).toBe(true)
      expect(patterns.some((p) => p.includes('secret'))).toBe(true)
    })

    test('should be case insensitive', () => {
      const passwordPattern = SENSITIVE_KEY_PATTERNS.find((p) => p.test('password'))
      expect(passwordPattern).toBeDefined()
      expect(passwordPattern.test('PASSWORD')).toBe(true)
      expect(passwordPattern.test('Password')).toBe(true)
    })
  })

  describe('clipboard constants', () => {
    test('should have MAX_CLIPBOARD_LENGTH as a positive number', () => {
      expect(MAX_CLIPBOARD_LENGTH).toBeGreaterThan(0)
      expect(typeof MAX_CLIPBOARD_LENGTH).toBe('number')
    })
  })
})
