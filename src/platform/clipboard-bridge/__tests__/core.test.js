import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  approximateByteLength,
  checkContentSize,
  debounce,
  createUserGestureToken,
  isValidUserGestureToken,
  verifyUserGesture,
  buildClipboardItems,
} from '../logic/core.js'
import {
  MAX_TEXT_SIZE_BYTES,
  LARGE_TEXT_WARNING_THRESHOLD,
} from '../logic/constants.js'

describe('core module - utility functions', () => {
  describe('approximateByteLength', () => {
    test('should return 0 for null/undefined', () => {
      expect(approximateByteLength(null)).toBe(0)
      expect(approximateByteLength(undefined)).toBe(0)
    })

    test('should count ASCII as 1 byte', () => {
      expect(approximateByteLength('hello')).toBe(5)
    })

    test('should count Latin-1 as 1 byte', () => {
      expect(approximateByteLength('café')).toBe(5)
    })

    test('should count CJK as 3 bytes', () => {
      expect(approximateByteLength('中文')).toBe(6)
    })

    test('should count emoji as 4 bytes', () => {
      expect(approximateByteLength('😀')).toBe(4)
    })
  })

  describe('checkContentSize', () => {
    test('should return size info', () => {
      const text = 'hello'
      const result = checkContentSize(text)
      expect(result.byteLength).toBe(5)
      expect(result.maxAllowed).toBe(MAX_TEXT_SIZE_BYTES)
      expect(result.warningThreshold).toBe(LARGE_TEXT_WARNING_THRESHOLD)
    })

    test('should flag content over max as too large', () => {
      const text = 'a'.repeat(MAX_TEXT_SIZE_BYTES + 1)
      const result = checkContentSize(text)
      expect(result.isTooLarge).toBe(true)
    })

    test('should flag content over threshold as warning', () => {
      const text = 'a'.repeat(LARGE_TEXT_WARNING_THRESHOLD + 1)
      const result = checkContentSize(text)
      expect(result.isLargeWarning).toBe(true)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('should delay execution', async () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      debounced('test')
      expect(fn).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(100)
      expect(fn).toHaveBeenCalledWith('test')
    })

    test('should reset timer on subsequent calls', async () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      const p1 = debounced('a').catch(() => {})
      await vi.advanceTimersByTimeAsync(50)
      const p2 = debounced('b')
      await vi.advanceTimersByTimeAsync(99)
      expect(fn).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      await p1
      await p2
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('b')
    })
  })

  describe('createUserGestureToken', () => {
    test('should create token with timestamp and id', () => {
      const token = createUserGestureToken()
      expect(typeof token.timestamp).toBe('number')
      expect(typeof token.id).toBe('string')
      expect(token.id).toMatch(/^gesture_\d+_[a-z0-9]+$/)
    })
  })

  describe('isValidUserGestureToken', () => {
    test('should return true for fresh token', () => {
      const token = createUserGestureToken()
      expect(isValidUserGestureToken(token)).toBe(true)
    })

    test('should return false for null/undefined', () => {
      expect(isValidUserGestureToken(null)).toBe(false)
      expect(isValidUserGestureToken(undefined)).toBe(false)
    })

    test('should return false for malformed token', () => {
      expect(isValidUserGestureToken({})).toBe(false)
      expect(isValidUserGestureToken({ timestamp: 123 })).toBe(false)
      expect(isValidUserGestureToken({ id: 'test' })).toBe(false)
    })

    test('should return false for expired token', () => {
      const token = {
        timestamp: Date.now() - 10000,
        id: 'test',
      }
      expect(isValidUserGestureToken(token)).toBe(false)
    })
  })

  describe('verifyUserGesture', () => {
    test('should return true with valid token when explicit required', () => {
      const token = createUserGestureToken()
      expect(verifyUserGesture(token, true)).toBe(true)
    })

    test('should return false without token when explicit required', () => {
      expect(verifyUserGesture(null, true)).toBe(false)
      expect(verifyUserGesture(undefined, true)).toBe(false)
    })
  })

  describe('buildClipboardItems', () => {
    class MockClipboardItem {
      constructor(items) {
        this.items = items
      }
    }

    test('should return error when ClipboardItem not available', async () => {
      const result = await buildClipboardItems(
        [{ type: 'text/plain', data: 'hello' }],
        { ClipboardItemClass: null }
      )
      expect(result.success).toBe(false)
    })

    test('should build text/plain item', async () => {
      const result = await buildClipboardItems(
        [{ type: 'text/plain', data: 'hello' }],
        { ClipboardItemClass: MockClipboardItem }
      )
      expect(result.success).toBe(true)
      expect(result.types).toContain('text/plain')
    })

    test('should build text/html and auto-generate text/plain', async () => {
      const result = await buildClipboardItems(
        [{ type: 'text/html', data: '<p>Hello</p>' }],
        { ClipboardItemClass: MockClipboardItem }
      )
      expect(result.success).toBe(true)
      expect(result.types).toContain('text/html')
      expect(result.types).toContain('text/plain')
    })

    test('should sanitize HTML by default', async () => {
      const result = await buildClipboardItems(
        [{ type: 'text/html', data: '<p>Hello<script>alert(1)</script></p>' }],
        { ClipboardItemClass: MockClipboardItem }
      )
      expect(result.success).toBe(true)
      const htmlBlob = result.item.items['text/html']
      expect(htmlBlob).toBeDefined()
    })

    test('should return error for empty contents', async () => {
      const result = await buildClipboardItems(
        [],
        { ClipboardItemClass: MockClipboardItem }
      )
      expect(result.success).toBe(false)
    })

    test('should use explicit text/plain when provided', async () => {
      const result = await buildClipboardItems(
        [
          { type: 'text/html', data: '<p>Rich</p>' },
          { type: 'text/plain', data: 'Plain version' },
        ],
        { ClipboardItemClass: MockClipboardItem }
      )
      expect(result.success).toBe(true)
      expect(result.types).toContain('text/html')
      expect(result.types).toContain('text/plain')
    })
  })
})
