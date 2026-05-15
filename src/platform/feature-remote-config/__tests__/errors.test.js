import { describe, expect, test } from 'vitest'
import {
  createError,
  wrapError,
  isFeatureConfigError,
  toSerializable,
  getErrorMessage,
} from '../logic/errors.js'
import { ERROR_CODES, ERROR_MESSAGES } from '../logic/constants.js'

describe('errors module', () => {
  describe('getErrorMessage', () => {
    test('should return message for known error code', () => {
      expect(getErrorMessage(ERROR_CODES.NETWORK)).toBe(ERROR_MESSAGES.NETWORK)
      expect(getErrorMessage(ERROR_CODES.TIMEOUT)).toBe(ERROR_MESSAGES.TIMEOUT)
      expect(getErrorMessage(ERROR_CODES.UNKNOWN)).toBe(ERROR_MESSAGES.UNKNOWN)
    })

    test('should return unknown message for unknown error code', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toBe(ERROR_MESSAGES.UNKNOWN)
    })
  })

  describe('createError', () => {
    test('should create error with errorCode and diagnostic', () => {
      const error = createError(ERROR_CODES.NETWORK)

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('FeatureConfigError')
      expect(error.errorCode).toBe(ERROR_CODES.NETWORK)
      expect(error.diagnostic).toBeDefined()
      expect(error.diagnostic.errorCode).toBe(ERROR_CODES.NETWORK)
      expect(error.diagnostic.timestamp).toBeDefined()
    })

    test('should use custom message if provided', () => {
      const customMessage = 'Custom network error'
      const error = createError(ERROR_CODES.NETWORK, customMessage)

      expect(error.message).toBe(customMessage)
    })

    test('should use default message if not provided', () => {
      const error = createError(ERROR_CODES.NETWORK)
      expect(error.message).toBe(ERROR_MESSAGES.NETWORK)
    })

    test('should include context in diagnostic', () => {
      const context = { url: 'http://example.com', retryCount: 3 }
      const error = createError(ERROR_CODES.HTTP_ERROR, 'HTTP 500', context)

      expect(error.diagnostic.context).toEqual(context)
    })
  })

  describe('wrapError', () => {
    test('should wrap original error', () => {
      const originalError = new Error('Original error message')
      const wrapped = wrapError(originalError, ERROR_CODES.NETWORK)

      expect(wrapped).toBeInstanceOf(Error)
      expect(wrapped.name).toBe('FeatureConfigError')
      expect(wrapped.errorCode).toBe(ERROR_CODES.NETWORK)
      expect(wrapped.cause).toBe(originalError)
    })

    test('should return original error if already a FeatureConfigError', () => {
      const original = createError(ERROR_CODES.NETWORK)
      const wrapped = wrapError(original, ERROR_CODES.TIMEOUT)

      expect(wrapped).toBe(original)
      expect(wrapped.errorCode).toBe(ERROR_CODES.NETWORK)
    })

    test('should include context in diagnostic', () => {
      const originalError = new Error('Original error')
      const context = { extra: 'info' }
      const wrapped = wrapError(originalError, ERROR_CODES.NETWORK, context)

      expect(wrapped.diagnostic.context).toEqual(context)
    })
  })

  describe('isFeatureConfigError', () => {
    test('should return true for FeatureConfigError', () => {
      const error = createError(ERROR_CODES.NETWORK)
      expect(isFeatureConfigError(error)).toBe(true)
    })

    test('should return false for regular Error', () => {
      const error = new Error('Regular error')
      expect(isFeatureConfigError(error)).toBe(false)
    })

    test('should return false for null/undefined', () => {
      expect(isFeatureConfigError(null)).toBe(false)
      expect(isFeatureConfigError(undefined)).toBe(false)
    })

    test('should return false for non-objects', () => {
      expect(isFeatureConfigError('string')).toBe(false)
      expect(isFeatureConfigError(123)).toBe(false)
    })
  })

  describe('toSerializable', () => {
    test('should convert FeatureConfigError to serializable', () => {
      const error = createError(ERROR_CODES.NETWORK)
      const serializable = toSerializable(error)

      expect(serializable).toBe(error.diagnostic)
    })

    test('should convert regular error to serializable', () => {
      const error = new Error('Regular error')
      const serializable = toSerializable(error)

      expect(serializable).toBeDefined()
      expect(serializable.errorCode).toBe(ERROR_CODES.UNKNOWN)
      expect(serializable.message).toBe('Regular error')
      expect(serializable.timestamp).toBeDefined()
    })

    test('should return null for null/undefined', () => {
      expect(toSerializable(null)).toBe(null)
      expect(toSerializable(undefined)).toBe(null)
    })
  })
})
