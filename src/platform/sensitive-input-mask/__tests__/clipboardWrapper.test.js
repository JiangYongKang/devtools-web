import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  sanitizeSensitiveValue,
  createClipboardWrapper,
  createUserGestureToken,
  isValidUserGestureToken,
  verifyUserGesture,
} from '../logic/clipboardWrapper.js'
import { ERROR_CODES, MAX_CLIPBOARD_LENGTH } from '../logic/constants.js'

describe('clipboard wrapper', () => {
  describe('sanitizeSensitiveValue', () => {
    test('should convert non-string values to string', () => {
      expect(sanitizeSensitiveValue(123).sanitized).toBe('123')
      expect(sanitizeSensitiveValue(null).wasEmpty).toBe(true)
      expect(sanitizeSensitiveValue(undefined).wasEmpty).toBe(true)
    })

    test('should trim value when trim option is true', () => {
      const result = sanitizeSensitiveValue('  token  ', { trim: true })
      expect(result.sanitized).toBe('token')
    })

    test('should not trim by default', () => {
      const result = sanitizeSensitiveValue('  token  ')
      expect(result.sanitized).toBe('  token  ')
    })

    test('should truncate values exceeding max length', () => {
      const maxLength = 10
      const value = 'x'.repeat(20)
      const result = sanitizeSensitiveValue(value, { maxLength })

      expect(result.wasTruncated).toBe(true)
      expect(result.sanitized.length).toBe(maxLength)
      expect(result.originalLength).toBe(20)
      expect(result.finalLength).toBe(maxLength)
    })

    test('should not truncate values within max length', () => {
      const maxLength = 20
      const value = 'x'.repeat(10)
      const result = sanitizeSensitiveValue(value, { maxLength })

      expect(result.wasTruncated).toBe(false)
      expect(result.sanitized.length).toBe(10)
    })

    test('should use MAX_CLIPBOARD_LENGTH as default max length', () => {
      const result = sanitizeSensitiveValue('test')
      expect(result.maxAllowed).toBe(MAX_CLIPBOARD_LENGTH)
    })

    test('should report empty values', () => {
      expect(sanitizeSensitiveValue('').wasEmpty).toBe(true)
      expect(sanitizeSensitiveValue(null).wasEmpty).toBe(true)
      expect(sanitizeSensitiveValue(undefined).wasEmpty).toBe(true)
    })

    test('should not report non-empty values as empty', () => {
      expect(sanitizeSensitiveValue('a').wasEmpty).toBe(false)
      expect(sanitizeSensitiveValue(' ').wasEmpty).toBe(false)
    })
  })

  describe('createClipboardWrapper', () => {
    test('should sanitize and call write function', async () => {
      const mockWriteFn = vi.fn().mockResolvedValue({ success: true })
      const wrapper = createClipboardWrapper({ maxLength: 20 })

      const result = await wrapper.writeText(mockWriteFn, 'test-value', {})

      expect(mockWriteFn).toHaveBeenCalledWith('test-value', {})
      expect(result.success).toBe(true)
      expect(result.sanitizeResult).toBeDefined()
    })

    test('should truncate before writing', async () => {
      const mockWriteFn = vi.fn().mockResolvedValue({ success: true })
      const wrapper = createClipboardWrapper({ maxLength: 10 })

      const value = 'x'.repeat(20)
      await wrapper.writeText(mockWriteFn, value, {})

      const writtenValue = mockWriteFn.mock.calls[0][0]
      expect(writtenValue.length).toBe(10)
    })

    test('should return error for empty values', async () => {
      const mockWriteFn = vi.fn().mockResolvedValue({ success: true })
      const wrapper = createClipboardWrapper()

      const result = await wrapper.writeText(mockWriteFn, '', {})

      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.VALUE_EMPTY)
      expect(mockWriteFn).not.toHaveBeenCalled()
    })

    test('should expose sanitize function', () => {
      const wrapper = createClipboardWrapper({ maxLength: 10 })
      const result = wrapper.sanitize('x'.repeat(20))
      expect(result.wasTruncated).toBe(true)
      expect(result.finalLength).toBe(10)
    })

    test('should expose maxLength', () => {
      const wrapper = createClipboardWrapper({ maxLength: 50 })
      expect(wrapper.maxLength).toBe(50)
    })
  })

  describe('user gesture tokens', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('should create valid tokens', () => {
      const token = createUserGestureToken()
      expect(token).toHaveProperty('timestamp')
      expect(token).toHaveProperty('id')
      expect(typeof token.timestamp).toBe('number')
      expect(typeof token.id).toBe('string')
    })

    test('should validate tokens within age limit', () => {
      const token = createUserGestureToken()
      expect(isValidUserGestureToken(token, 5000)).toBe(true)
    })

    test('should reject expired tokens', () => {
      const token = createUserGestureToken()

      vi.advanceTimersByTime(6000)

      expect(isValidUserGestureToken(token, 5000)).toBe(false)
    })

    test('should reject invalid token formats', () => {
      expect(isValidUserGestureToken(null)).toBe(false)
      expect(isValidUserGestureToken(undefined)).toBe(false)
      expect(isValidUserGestureToken('string')).toBe(false)
      expect(isValidUserGestureToken({})).toBe(false)
    })

    test('should verify explicit gesture tokens', () => {
      const token = createUserGestureToken()
      expect(verifyUserGesture(token, true, 5000)).toBe(true)
    })

    test('should reject without explicit token when required', () => {
      expect(verifyUserGesture(null, true, 5000)).toBe(false)
      expect(verifyUserGesture(undefined, true, 5000)).toBe(false)
    })
  })
})
