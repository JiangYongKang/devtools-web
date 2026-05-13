import { describe, expect, test } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../logic/constants.js'
import {
  getErrorMessage,
  createError,
  isValidErrorCode,
  classifyClipboardError,
} from '../logic/errors.js'

describe('errors module', () => {
  describe('getErrorMessage', () => {
    test('should return correct message for known codes', () => {
      expect(getErrorMessage(ERROR_CODES.NOT_ALLOWED)).toBe(ERROR_MESSAGES[ERROR_CODES.NOT_ALLOWED])
    })

    test('should return UNKNOWN_ERROR message for unknown codes', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toBe(ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR])
    })
  })

  describe('createError', () => {
    test('should create error with default message', () => {
      const result = createError(ERROR_CODES.NOT_ALLOWED)
      expect(result.errorCode).toBe(ERROR_CODES.NOT_ALLOWED)
      expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.NOT_ALLOWED])
      expect(result.originalError).toBeNull()
      expect(result.originalName).toBeNull()
    })

    test('should accept custom message', () => {
      const customMsg = 'Custom error message'
      const result = createError(ERROR_CODES.NOT_ALLOWED, customMsg)
      expect(result.errorCode).toBe(ERROR_CODES.NOT_ALLOWED)
      expect(result.errorMessage).toBe(customMsg)
    })

    test('should capture original error', () => {
      const original = new Error('Original error')
      const result = createError(ERROR_CODES.UNKNOWN_ERROR, null, original)
      expect(result.originalError).toBe('Original error')
      expect(result.originalName).toBe('Error')
    })
  })

  describe('isValidErrorCode', () => {
    test('should return true for valid codes', () => {
      expect(isValidErrorCode(ERROR_CODES.NOT_ALLOWED)).toBe(true)
      expect(isValidErrorCode(ERROR_CODES.SECURITY_ERROR)).toBe(true)
    })

    test('should return false for invalid codes', () => {
      expect(isValidErrorCode('INVALID_CODE')).toBe(false)
      expect(isValidErrorCode(null)).toBe(false)
      expect(isValidErrorCode(undefined)).toBe(false)
    })
  })

  describe('classifyClipboardError', () => {
    test('should classify NotAllowedError', () => {
      const error = new DOMException('Permission denied', 'NotAllowedError')
      const result = classifyClipboardError(error, 'write')
      expect(result.errorCode).toBe(ERROR_CODES.NOT_ALLOWED)
    })

    test('should classify SecurityError', () => {
      const error = new DOMException('Security policy', 'SecurityError')
      const result = classifyClipboardError(error, 'write')
      expect(result.errorCode).toBe(ERROR_CODES.SECURITY_ERROR)
    })

    test('should classify permission denied via message', () => {
      const error = { name: 'Error', message: 'User denied permission' }
      const result = classifyClipboardError(error, 'write')
      expect(result.errorCode).toBe(ERROR_CODES.PERMISSION_DENIED)
    })

    test('should classify user gesture required', () => {
      const error = { name: 'Error', message: 'Requires transient user activation' }
      const result = classifyClipboardError(error, 'write')
      expect(result.errorCode).toBe(ERROR_CODES.USER_GESTURE_REQUIRED)
    })

    test('should classify not supported', () => {
      const error = { name: 'Error', message: 'Not supported' }
      const result = classifyClipboardError(error, 'write')
      expect(result.errorCode).toBe(ERROR_CODES.API_NOT_AVAILABLE)
    })

    test('should classify AbortError', () => {
      const error = new DOMException('Aborted', 'AbortError')
      const result = classifyClipboardError(error, 'write')
      expect(result.errorCode).toBe(ERROR_CODES.ABORTED)
    })

    test('should handle null error', () => {
      const result = classifyClipboardError(null, 'write')
      expect(result.errorCode).toBe(ERROR_CODES.UNKNOWN_ERROR)
    })
  })
})
