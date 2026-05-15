import { describe, expect, test } from 'vitest'
import {
  clampDuration,
  maskText,
  maskTextWithRange,
  shouldSuppressReveal,
} from '../logic/masking.js'
import { MASK_CHAR, MIN_REVEAL_DURATION_SECONDS, MAX_REVEAL_DURATION_SECONDS, DEFAULT_REVEAL_DURATION_SECONDS } from '../logic/constants.js'

describe('masking', () => {
  describe('clampDuration', () => {
    test('should return DEFAULT for invalid inputs', () => {
      expect(clampDuration(null)).toBe(DEFAULT_REVEAL_DURATION_SECONDS)
      expect(clampDuration(undefined)).toBe(DEFAULT_REVEAL_DURATION_SECONDS)
      expect(clampDuration(NaN)).toBe(DEFAULT_REVEAL_DURATION_SECONDS)
      expect(clampDuration('5')).toBe(DEFAULT_REVEAL_DURATION_SECONDS)
    })

    test('should clamp values below MIN to MIN', () => {
      expect(clampDuration(0)).toBe(MIN_REVEAL_DURATION_SECONDS)
      expect(clampDuration(1)).toBe(MIN_REVEAL_DURATION_SECONDS)
      expect(clampDuration(2)).toBe(MIN_REVEAL_DURATION_SECONDS)
      expect(clampDuration(MIN_REVEAL_DURATION_SECONDS - 1)).toBe(MIN_REVEAL_DURATION_SECONDS)
    })

    test('should clamp values above MAX to MAX', () => {
      expect(clampDuration(20)).toBe(MAX_REVEAL_DURATION_SECONDS)
      expect(clampDuration(100)).toBe(MAX_REVEAL_DURATION_SECONDS)
      expect(clampDuration(MAX_REVEAL_DURATION_SECONDS + 1)).toBe(MAX_REVEAL_DURATION_SECONDS)
    })

    test('should return value within bounds unchanged', () => {
      expect(clampDuration(3)).toBe(3)
      expect(clampDuration(5)).toBe(5)
      expect(clampDuration(10)).toBe(10)
      expect(clampDuration(15)).toBe(15)
    })
  })

  describe('maskText', () => {
    test('should return empty string for empty input', () => {
      expect(maskText('')).toBe('')
      expect(maskText(null)).toBe('')
      expect(maskText(undefined)).toBe('')
    })

    test('should mask each character with the default mask char', () => {
      expect(maskText('abc')).toBe(MASK_CHAR.repeat(3))
      expect(maskText('password123')).toBe(MASK_CHAR.repeat(11))
    })

    test('should use custom mask char when provided', () => {
      expect(maskText('abc', '*')).toBe('***')
      expect(maskText('test', 'x')).toBe('xxxx')
    })

    test('should handle unicode and multi-byte characters', () => {
      const test = '密码测试'
      expect(maskText(test).length).toBe(test.length)
    })
  })

  describe('maskTextWithRange', () => {
    test('should return masked text when no range provided', () => {
      expect(maskTextWithRange('password', null)).toBe(maskText('password'))
    })

    test('should mask only the specified range', () => {
      const result = maskTextWithRange('password', { start: 2, end: 5 })
      expect(result.length).toBe(8)
      expect(result.startsWith('pa')).toBe(true)
      expect(result.endsWith('ord')).toBe(true)
      const middle = result.slice(2, 5)
      expect(middle).toBe(MASK_CHAR.repeat(3))
    })

    test('should clamp range bounds to text length', () => {
      const result = maskTextWithRange('pass', { start: -1, end: 10 })
      expect(result).toBe(maskText('pass'))
    })

    test('should handle inverted range (start >= end)', () => {
      expect(maskTextWithRange('password', { start: 5, end: 2 })).toBe(maskText('password'))
    })
  })

  describe('shouldSuppressReveal', () => {
    test('should return true for compositionstart events', () => {
      const event = { type: 'compositionstart' }
      expect(shouldSuppressReveal(event)).toBe(true)
    })

    test('should return true for compositionupdate events', () => {
      const event = { type: 'compositionupdate' }
      expect(shouldSuppressReveal(event)).toBe(true)
    })

    test('should return true when isComposing flag is set', () => {
      const event = { type: 'input', isComposing: true }
      expect(shouldSuppressReveal(event)).toBe(true)
    })

    test('should return false for normal events', () => {
      expect(shouldSuppressReveal({ type: 'click' })).toBe(false)
      expect(shouldSuppressReveal({ type: 'input' })).toBe(false)
      expect(shouldSuppressReveal({ type: 'keydown' })).toBe(false)
    })

    test('should return false for null/undefined events', () => {
      expect(shouldSuppressReveal(null)).toBe(false)
      expect(shouldSuppressReveal(undefined)).toBe(false)
    })
  })
})
