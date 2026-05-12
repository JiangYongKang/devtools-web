import { describe, test, expect } from 'vitest'
import {
  analyzeStringMetrics,
  validateSelectionRange,
  buildInputParams,
} from '../logic/index.js'
import { ERROR_CODES } from '../logic/errors.js'
import { TOKENIZATION_PROFILES, NORMALIZE_FLAGS } from '../logic/constants.js'
import { BOM } from '../logic/metrics.js'

describe('index.js', () => {
  describe('buildInputParams', () => {
    test('should use defaults when params are missing', () => {
      const result = buildInputParams({ text: 'Hello' })
      expect(result.text).toBe('Hello')
      expect(result.normalizeFlags).toEqual({})
      expect(result.selectionRange).toBeNull()
    })

    test('should handle null text', () => {
      const result = buildInputParams({})
      expect(result.text).toBeNull()
    })
  })

  describe('validateSelectionRange', () => {
    test('should return true for null range', () => {
      expect(validateSelectionRange('Hello', null)).toBe(true)
    })

    test('should return true for valid range', () => {
      expect(validateSelectionRange('Hello', { start: 0, end: 3 })).toBe(true)
      expect(validateSelectionRange('Hello', { start: 0, end: 5 })).toBe(true)
      expect(validateSelectionRange('Hello', { start: 2, end: 2 })).toBe(true)
    })

    test('should return false for invalid ranges', () => {
      expect(validateSelectionRange('Hello', { start: -1, end: 3 })).toBe(false)
      expect(validateSelectionRange('Hello', { start: 0, end: 10 })).toBe(false)
      expect(validateSelectionRange('Hello', { start: 4, end: 2 })).toBe(false)
    })
  })

  describe('analyzeStringMetrics', () => {
    test('should return NULL_INPUT error for null text', () => {
      const result = analyzeStringMetrics({ text: null })
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      expect(result.result).toBeNull()
    })

    test('should return SELECTION_OUT_OF_RANGE error for invalid range', () => {
      const result = analyzeStringMetrics({
        text: 'Hello',
        selectionRange: { start: 0, end: 100 },
      })
      expect(result.errorCode).toBe(ERROR_CODES.SELECTION_OUT_OF_RANGE)
    })

    test('should analyze empty string', () => {
      const result = analyzeStringMetrics({ text: '' })
      expect(result.errorCode).toBeNull()
      expect(result.result.graphemeCount).toBe(0)
      expect(result.result.scalarCount).toBe(0)
      expect(result.result.utf16Units).toBe(0)
      expect(result.result.utf8Bytes).toBe(0)
      expect(result.result.lineCount).toBe(0)
      expect(result.result.nonEmptyLines).toBe(0)
    })

    test('should analyze simple string', () => {
      const result = analyzeStringMetrics({ text: 'Hello World' })
      expect(result.errorCode).toBeNull()
      expect(result.result.scalarCount).toBe(11)
      expect(result.result.utf16Units).toBe(11)
      expect(result.result.utf8Bytes).toBe(11)
      expect(result.result.lineCount).toBe(1)
    })

    test('should detect BOM', () => {
      const result = analyzeStringMetrics({ text: BOM + 'Hello' })
      expect(result.result.hasBOM).toBe(true)
    })

    test('should include selectionMetrics when range provided', () => {
      const result = analyzeStringMetrics({
        text: 'Hello World',
        selectionRange: { start: 0, end: 5 },
      })
      expect(result.result.selectionMetrics).toBeDefined()
      expect(result.result.selectionMetrics.scalarCount).toBe(5)
      expect(result.result.columnRowPointer).toBeDefined()
    })

    test('should respect normalizeFlags for metrics', () => {
      const text = '  HELLO   WORLD  '
      const flags = {
        [NORMALIZE_FLAGS.TRIM]: true,
        [NORMALIZE_FLAGS.TO_LOWER]: true,
        [NORMALIZE_FLAGS.COLLAPSE_SPACES]: true,
      }
      const result = analyzeStringMetrics({ text, normalizeFlags: flags })
      expect(result.result.normalizedText).toBe('hello world')
      expect(result.result.scalarCount).toBe(11)
    })

    test('should calculate token count based on profile', () => {
      const result = analyzeStringMetrics({
        text: 'Hello World 你好',
        tokenizationProfile: TOKENIZATION_PROFILES.CHINESE,
      })
      expect(result.result.tokenCount).toBe(2 + 2)
    })

    test('should generate digestReport', () => {
      const result = analyzeStringMetrics({ text: 'Hello' })
      expect(result.result.digestReport).toBeDefined()
      expect(result.result.digestReport).toContain('文本指标统计报告')
    })

    test('should calculate byteCharRatio', () => {
      const result = analyzeStringMetrics({ text: 'Hello' })
      expect(parseFloat(result.result.byteCharRatio)).toBeCloseTo(1.0, 2)
    })
  })
})
