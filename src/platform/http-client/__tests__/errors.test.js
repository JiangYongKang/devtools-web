import { describe, expect, test } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_CAUSE_CHAIN_LENGTH,
  MAX_ERROR_MESSAGE_LENGTH,
} from '../logic/constants.js'
import {
  getErrorMessage,
  truncateString,
  extractCauseChain,
  createError,
  wrapError,
  isHttpClientError,
  toSerializable,
} from '../logic/errors.js'

describe('errors module', () => {
  describe('getErrorMessage', () => {
    test('should return correct message for known codes', () => {
      expect(getErrorMessage(ERROR_CODES.TIMEOUT)).toBe(ERROR_MESSAGES[ERROR_CODES.TIMEOUT])
      expect(getErrorMessage(ERROR_CODES.NETWORK)).toBe(ERROR_MESSAGES[ERROR_CODES.NETWORK])
    })

    test('should return default for unknown codes', () => {
      expect(getErrorMessage('UNKNOWN_CODE')).toBe(ERROR_MESSAGES[ERROR_CODES.UNKNOWN])
    })
  })

  describe('truncateString', () => {
    test('should return original string if shorter than max', () => {
      expect(truncateString('hello', 10)).toBe('hello')
    })

    test('should truncate longer strings', () => {
      expect(truncateString('hello world', 5)).toBe('hello...')
    })

    test('should handle null/undefined', () => {
      expect(truncateString(null, 10)).toBe('')
      expect(truncateString(undefined, 10)).toBe('')
    })

    test('should respect MAX_ERROR_MESSAGE_LENGTH', () => {
      const longString = 'a'.repeat(MAX_ERROR_MESSAGE_LENGTH + 100)
      const result = truncateString(longString, MAX_ERROR_MESSAGE_LENGTH)
      expect(result.length).toBeLessThanOrEqual(MAX_ERROR_MESSAGE_LENGTH + 3)
    })
  })

  describe('extractCauseChain', () => {
    test('should extract single error', () => {
      const error = new Error('test error')
      const chain = extractCauseChain(error)
      expect(chain.length).toBe(1)
      expect(chain[0].message).toBe('test error')
      expect(chain[0].name).toBe('Error')
    })

    test('should extract cause chain', () => {
      const error1 = new Error('error 1')
      const error2 = Object.assign(new Error('error 2'), { cause: error1 })
      const error3 = Object.assign(new Error('error 3'), { cause: error2 })

      const chain = extractCauseChain(error3)
      expect(chain.length).toBe(3)
      expect(chain[0].message).toBe('error 3')
      expect(chain[1].message).toBe('error 2')
      expect(chain[2].message).toBe('error 1')
    })

    test('should respect maxDepth limit', () => {
      let error = new Error('level 0')
      for (let i = 1; i < 10; i++) {
        error = Object.assign(new Error(`level ${i}`), { cause: error })
      }

      const chain = extractCauseChain(error, MAX_CAUSE_CHAIN_LENGTH)
      expect(chain.length).toBe(MAX_CAUSE_CHAIN_LENGTH)
    })

    test('should handle originalError property', () => {
      const inner = new Error('inner')
      const outer = Object.assign(new Error('outer'), { originalError: inner })
      const chain = extractCauseChain(outer)
      expect(chain.length).toBe(2)
    })
  })

  describe('createError', () => {
    test('should create error with correct structure', () => {
      const error = createError(ERROR_CODES.TIMEOUT)
      expect(error.name).toBe('HttpClientError')
      expect(error.errorCode).toBe(ERROR_CODES.TIMEOUT)
      expect(error.diagnostic).toBeDefined()
      expect(error.diagnostic.errorCode).toBe(ERROR_CODES.TIMEOUT)
    })

    test('should use custom message', () => {
      const error = createError(ERROR_CODES.TIMEOUT, 'Custom timeout message')
      expect(error.message).toBe('Custom timeout message')
      expect(error.diagnostic.message).toBe('Custom timeout message')
    })

    test('should include context in diagnostic', () => {
      const error = createError(ERROR_CODES.HTTP_ERROR, null, { status: 404, url: '/test' })
      expect(error.diagnostic.context.status).toBe(404)
      expect(error.diagnostic.context.url).toBe('/test')
    })

    test('should have timestamp in diagnostic', () => {
      const error = createError(ERROR_CODES.NETWORK)
      expect(typeof error.diagnostic.timestamp).toBe('number')
    })
  })

  describe('wrapError', () => {
    test('should return original HttpClientError unchanged', () => {
      const original = createError(ERROR_CODES.TIMEOUT)
      const wrapped = wrapError(original, ERROR_CODES.NETWORK)
      expect(wrapped).toBe(original)
    })

    test('should wrap regular errors', () => {
      const original = new TypeError('Original error')
      const wrapped = wrapError(original, ERROR_CODES.NETWORK)
      expect(wrapped.errorCode).toBe(ERROR_CODES.NETWORK)
      expect(wrapped.cause).toBe(original)
      expect(wrapped.diagnostic).toBeDefined()
    })
  })

  describe('isHttpClientError', () => {
    test('should return true for HttpClientError', () => {
      const error = createError(ERROR_CODES.TIMEOUT)
      expect(isHttpClientError(error)).toBe(true)
    })

    test('should return false for regular errors', () => {
      expect(isHttpClientError(new Error('test'))).toBe(false)
      expect(isHttpClientError(new TypeError('test'))).toBe(false)
    })

    test('should return false for null/undefined', () => {
      expect(isHttpClientError(null)).toBe(false)
      expect(isHttpClientError(undefined)).toBe(false)
    })
  })

  describe('toSerializable', () => {
    test('should return diagnostic for HttpClientError', () => {
      const error = createError(ERROR_CODES.TIMEOUT)
      const result = toSerializable(error)
      expect(result).toBe(error.diagnostic)
    })

    test('should create diagnostic for regular errors', () => {
      const error = new Error('test')
      const result = toSerializable(error)
      expect(result).toBeDefined()
      expect(result.errorCode).toBe(ERROR_CODES.UNKNOWN)
      expect(result.message).toBe('test')
    })

    test('should handle null/undefined', () => {
      expect(toSerializable(null)).toBeNull()
      expect(toSerializable(undefined)).toBeNull()
    })
  })
})
