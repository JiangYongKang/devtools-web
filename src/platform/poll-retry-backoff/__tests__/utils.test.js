import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ERROR_CODES } from '../logic/constants.js'
import {
    applyJitter,
    calculateExponentialBackoff,
    clamp,
    isFiniteNumber,
    parseRetryAfter,
    shouldRetryOnError,
    sleep,
    validatePollOptions,
} from '../logic/utils.js'

describe('utils', () => {
  describe('isFiniteNumber', () => {
    test('should return true for finite numbers', () => {
      expect(isFiniteNumber(0)).toBe(true)
      expect(isFiniteNumber(1)).toBe(true)
      expect(isFiniteNumber(-1)).toBe(true)
      expect(isFiniteNumber(3.14)).toBe(true)
    })

    test('should return false for non-finite numbers', () => {
      expect(isFiniteNumber(Infinity)).toBe(false)
      expect(isFiniteNumber(-Infinity)).toBe(false)
      expect(isFiniteNumber(NaN)).toBe(false)
    })

    test('should return false for non-number types', () => {
      expect(isFiniteNumber('1')).toBe(false)
      expect(isFiniteNumber(null)).toBe(false)
      expect(isFiniteNumber(undefined)).toBe(false)
      expect(isFiniteNumber({})).toBe(false)
    })
  })

  describe('clamp', () => {
    test('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(15, 0, 10)).toBe(10)
      expect(clamp(-5, 0, 10)).toBe(0)
    })
  })

  describe('applyJitter', () => {
    test('should apply jitter within expected bounds', () => {
      const baseValue = 1000
      const jitterRatio = 0.1
      
      for (let i = 0; i < 100; i++) {
        const result = applyJitter(baseValue, jitterRatio)
        expect(result).toBeGreaterThanOrEqual(900)
        expect(result).toBeLessThanOrEqual(1100)
      }
    })

    test('should return base value for zero jitter', () => {
      expect(applyJitter(1000, 0)).toBe(1000)
    })

    test('should respect custom random function', () => {
      const mockRandom = vi.fn(() => 0)
      const result = applyJitter(1000, 0.5, mockRandom)
      expect(result).toBe(500)

      mockRandom.mockReturnValue(1)
      const result2 = applyJitter(1000, 0.5, mockRandom)
      expect(result2).toBe(1500)
    })

    test('should handle invalid base values', () => {
      expect(applyJitter(0, 0.5)).toBe(0)
      expect(applyJitter(-100, 0.5)).toBe(-100)
      expect(applyJitter(NaN, 0.5)).toBe(NaN)
    })
  })

  describe('calculateExponentialBackoff', () => {
    test('should calculate exponential backoff', () => {
      expect(calculateExponentialBackoff(100, 0, 2, 10000)).toBe(100)
      expect(calculateExponentialBackoff(100, 1, 2, 10000)).toBe(200)
      expect(calculateExponentialBackoff(100, 2, 2, 10000)).toBe(400)
      expect(calculateExponentialBackoff(100, 3, 2, 10000)).toBe(800)
    })

    test('should respect maxDelayMs', () => {
      expect(calculateExponentialBackoff(100, 5, 2, 500)).toBe(500)
    })

    test('should handle edge cases', () => {
      expect(calculateExponentialBackoff(100, -1, 2, 10000)).toBe(100)
      expect(calculateExponentialBackoff(0, 1, 2, 10000)).toBe(0)
    })
  })

  describe('parseRetryAfter', () => {
    test('should parse seconds from Headers', () => {
      const headers = {
        get: (name) => name.toLowerCase() === 'retry-after' ? '30' : null,
      }
      expect(parseRetryAfter(headers)).toBe(30000)
    })

    test('should parse seconds from object', () => {
      const headers = { 'retry-after': '60' }
      expect(parseRetryAfter(headers)).toBe(60000)
    })

    test('should parse HTTP date', () => {
      const futureDate = new Date(Date.now() + 5000).toUTCString()
      const headers = {
        get: (name) => name.toLowerCase() === 'retry-after' ? futureDate : null,
      }
      const result = parseRetryAfter(headers)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(5000)
    })

    test('should return null for missing header', () => {
      expect(parseRetryAfter(null)).toBeNull()
      expect(parseRetryAfter({})).toBeNull()
      expect(parseRetryAfter({ get: () => null })).toBeNull()
    })

    test('should return null for invalid values', () => {
      const headers = { 'retry-after': 'invalid' }
      expect(parseRetryAfter(headers)).toBeNull()
    })
  })

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('should resolve after specified delay', async () => {
      let resolved = false
      sleep(100).then(() => {
        resolved = true
      })

      expect(resolved).toBe(false)
      vi.advanceTimersByTime(50)
      expect(resolved).toBe(false)
      vi.advanceTimersByTime(50)
      await Promise.resolve()
      expect(resolved).toBe(true)
    })

    test('should reject if signal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort(new Error('aborted'))

      await expect(sleep(100, controller.signal)).rejects.toThrow('aborted')
    })

    test('should reject if signal aborts during sleep', async () => {
      const controller = new AbortController()
      let error = null

      const promise = sleep(100, controller.signal).catch((e) => {
        error = e
      })

      vi.advanceTimersByTime(50)
      controller.abort(new Error('test abort'))
      await Promise.resolve()
      await promise
      expect(error.message).toBe('test abort')
    })
  })

  describe('shouldRetryOnError', () => {
    test('should retry on null retryOn', () => {
      expect(shouldRetryOnError(new Error('test'), null)).toBe(true)
      expect(shouldRetryOnError(new Error('test'), undefined)).toBe(true)
    })

    test('should retry on matching HTTP status in array', () => {
      const error = { status: 503 }
      expect(shouldRetryOnError(error, [500, 502, 503])).toBe(true)
      expect(shouldRetryOnError(error, [400, 404])).toBe(false)
    })

    test('should retry on matching predicate', () => {
      const error = { status: 503 }
      const predicate = (e) => e.status >= 500
      expect(shouldRetryOnError(error, predicate)).toBe(true)
    })

    test('should retry on single number', () => {
      const error = { status: 429 }
      expect(shouldRetryOnError(error, 429)).toBe(true)
      expect(shouldRetryOnError(error, 500)).toBe(false)
    })

    test('should handle mixed array', () => {
      const error = { status: 503 }
      const predicate = (e) => e.status === 503
      expect(shouldRetryOnError(error, [429, predicate])).toBe(true)
    })
  })

  describe('validatePollOptions', () => {
    test('should reject invalid intervalMs', () => {
      expect(validatePollOptions({ intervalMs: 0 })).not.toBeNull()
      expect(validatePollOptions({ intervalMs: -1 })).not.toBeNull()
      expect(validatePollOptions({ intervalMs: NaN })).not.toBeNull()
      expect(validatePollOptions({ intervalMs: Infinity })).not.toBeNull()
    })

    test('should accept valid intervalMs', () => {
      expect(validatePollOptions({ intervalMs: 100 })).toBeNull()
      expect(validatePollOptions({ intervalMs: 1000 })).toBeNull()
    })

    test('should set correct error code', () => {
      const result = validatePollOptions({ intervalMs: 0 })
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_INTERVAL)
    })
  })
})
