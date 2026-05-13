import { describe, test, expect, beforeEach } from 'vitest'
import {
  ALGORITHM_TYPES,
  JITTER_TYPES,
  UNIT_TYPES,
  DEFAULT_PARAMS,
  ERROR_CODES,
  MAX_ALLOWED,
  isFiniteNumber,
  convertToUnit,
  formatDecimal,
  alignToGrid,
  applyJitter,
  validateParams,
  generateSequence,
  inverseCalculateInitial,
  inverseCalculateMultiplier,
  generateRandomParams,
  compareConfigs,
  exportToCSV,
  exportToJSON,
  generateSleepCode,
} from '../logic/index.js'

describe('exponential backoff calculator logic', () => {
  describe('isFiniteNumber', () => {
    test('should return true for finite numbers', () => {
      expect(isFiniteNumber(0)).toBe(true)
      expect(isFiniteNumber(42)).toBe(true)
      expect(isFiniteNumber(-100)).toBe(true)
      expect(isFiniteNumber(3.14)).toBe(true)
      expect(isFiniteNumber(Number.MAX_SAFE_INTEGER)).toBe(true)
    })

    test('should return false for non-finite values', () => {
      expect(isFiniteNumber(Infinity)).toBe(false)
      expect(isFiniteNumber(-Infinity)).toBe(false)
      expect(isFiniteNumber(NaN)).toBe(false)
    })

    test('should return false for non-number types', () => {
      expect(isFiniteNumber(null)).toBe(false)
      expect(isFiniteNumber(undefined)).toBe(false)
      expect(isFiniteNumber('42')).toBe(false)
      expect(isFiniteNumber({})).toBe(false)
      expect(isFiniteNumber([])).toBe(false)
    })
  })

  describe('convertToUnit', () => {
    test('should return same value when units are same', () => {
      expect(convertToUnit(1000, UNIT_TYPES.MS, UNIT_TYPES.MS)).toBe(1000)
      expect(convertToUnit(1000, UNIT_TYPES.SECONDS, UNIT_TYPES.SECONDS)).toBe(1000)
    })

    test('should convert ms to seconds', () => {
      expect(convertToUnit(1000, UNIT_TYPES.MS, UNIT_TYPES.SECONDS)).toBe(1)
      expect(convertToUnit(500, UNIT_TYPES.MS, UNIT_TYPES.SECONDS)).toBe(0.5)
      expect(convertToUnit(3000, UNIT_TYPES.MS, UNIT_TYPES.SECONDS)).toBe(3)
    })

    test('should convert seconds to ms', () => {
      expect(convertToUnit(1, UNIT_TYPES.SECONDS, UNIT_TYPES.MS)).toBe(1000)
      expect(convertToUnit(0.5, UNIT_TYPES.SECONDS, UNIT_TYPES.MS)).toBe(500)
      expect(convertToUnit(3, UNIT_TYPES.SECONDS, UNIT_TYPES.MS)).toBe(3000)
    })

    test('should pass through non-finite values', () => {
      expect(convertToUnit(Infinity, UNIT_TYPES.MS, UNIT_TYPES.SECONDS)).toBe(Infinity)
      expect(convertToUnit(NaN, UNIT_TYPES.MS, UNIT_TYPES.SECONDS)).toBe(NaN)
    })
  })

  describe('formatDecimal', () => {
    test('should round to integer when decimalPlaces is 0', () => {
      expect(formatDecimal(1000.4, 0)).toBe('1000')
      expect(formatDecimal(1000.5, 0)).toBe('1001')
      expect(formatDecimal(3.14159, 0)).toBe('3')
    })

    test('should format with specified decimal places', () => {
      expect(formatDecimal(3.14159, 2)).toBe('3.14')
      expect(formatDecimal(3.14159, 4)).toBe('3.1416')
      expect(formatDecimal(100, 3)).toBe('100.000')
    })

    test('should stringify non-finite values', () => {
      expect(formatDecimal(Infinity, 2)).toBe('Infinity')
      expect(formatDecimal(NaN, 2)).toBe('NaN')
    })
  })

  describe('alignToGrid', () => {
    test('should return original value when grid is 0 or negative', () => {
      expect(alignToGrid(1234, 0)).toBe(1234)
      expect(alignToGrid(1234, -100)).toBe(1234)
    })

    test('should align to specified grid', () => {
      expect(alignToGrid(1234, 1000)).toBe(1000)
      expect(alignToGrid(1500, 1000)).toBe(2000)
      expect(alignToGrid(1234, 100)).toBe(1200)
      expect(alignToGrid(1250, 100)).toBe(1300)
      expect(alignToGrid(1234, 500)).toBe(1000)
      expect(alignToGrid(1400, 500)).toBe(1500)
    })

    test('should align to second when grid is 1000', () => {
      expect(alignToGrid(1000, 1000)).toBe(1000)
      expect(alignToGrid(1234, 1000)).toBe(1000)
      expect(alignToGrid(2750, 1000)).toBe(3000)
    })

    test('should pass through non-finite values', () => {
      expect(alignToGrid(Infinity, 1000)).toBe(Infinity)
      expect(alignToGrid(NaN, 1000)).toBe(NaN)
    })
  })

  describe('applyJitter', () => {
    test('should return same values for no jitter', () => {
      const result = applyJitter(1000, JITTER_TYPES.NONE, 0.5, 1.5)
      expect(result.min).toBe(1000)
      expect(result.max).toBe(1000)
      expect(result.nominal).toBe(1000)
      expect(result.jittered).toBeUndefined()
    })

    test('should return null for invalid jitter range', () => {
      const result = applyJitter(1000, JITTER_TYPES.FULL, 2, 1)
      expect(result).toBeNull()
    })

    test('should apply full jitter within range', () => {
      const randomFn = () => 0.5
      const result = applyJitter(1000, JITTER_TYPES.FULL, 0.5, 1.5, randomFn)
      expect(result.min).toBe(500)
      expect(result.max).toBe(1500)
      expect(result.nominal).toBe(1000)
      expect(result.jittered).toBe(1000)
    })

    test('should apply full jitter at min when random is 0', () => {
      const randomFn = () => 0
      const result = applyJitter(1000, JITTER_TYPES.FULL, 0.5, 1.5, randomFn)
      expect(result.jittered).toBe(500)
    })

    test('should apply full jitter at max when random is 1', () => {
      const randomFn = () => 1
      const result = applyJitter(1000, JITTER_TYPES.FULL, 0.5, 1.5, randomFn)
      expect(result.jittered).toBe(1500)
    })

    test('should apply equal jitter', () => {
      const randomFn = () => 0.5
      const result = applyJitter(1000, JITTER_TYPES.EQUAL, 0.5, 1.5, randomFn)
      expect(result.min).toBe(500)
      expect(result.max).toBe(1500)
      expect(result.nominal).toBe(1000)
    })
  })

  describe('validateParams', () => {
    test('should return null for valid parameters', () => {
      const result = validateParams({
        initial: 1000,
        multiplier: 2,
        max: 30000,
        maxSteps: 5,
        jitter: JITTER_TYPES.NONE,
        jitterMin: 0.5,
        jitterMax: 1.5,
        algorithm: ALGORITHM_TYPES.EXPONENTIAL,
      })
      expect(result).toBeNull()
    })

    test('should reject negative initial', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        initial: -100,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })

    test('should reject negative multiplier', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        multiplier: -2,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })

    test('should reject zero multiplier', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        multiplier: 0,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.ZERO_MULTIPLIER)
    })

    test('should reject negative max', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        max: -1000,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })

    test('should reject negative maxSteps', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        maxSteps: -5,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })

    test('should reject maxSteps exceeding limit', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        maxSteps: MAX_ALLOWED.MAX_STEPS + 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.MAX_STEPS_EXCEEDED)
    })

    test('should reject invalid algorithm', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        algorithm: 'invalid',
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_ALGORITHM)
    })

    test('should reject invalid jitter type', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        jitter: 'invalid',
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_JITTER_TYPE)
    })

    test('should reject invalid jitter range when jitter is enabled', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        jitter: JITTER_TYPES.FULL,
        jitterMin: 2,
        jitterMax: 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_JITTER_RANGE)
    })

    test('should reject negative jitter values', () => {
      const result = validateParams({
        ...DEFAULT_PARAMS,
        jitter: JITTER_TYPES.FULL,
        jitterMin: -0.5,
        jitterMax: 1.5,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })
  })

  describe('generateSequence', () => {
    test('should generate exponential sequence correctly', () => {
      const result = generateSequence({
        initial: 1000,
        multiplier: 2,
        max: 0,
        maxSteps: 5,
        jitter: JITTER_TYPES.NONE,
        jitterMin: 0.5,
        jitterMax: 1.5,
        algorithm: ALGORITHM_TYPES.EXPONENTIAL,
        alignToSecond: false,
        alignGridMs: 0,
      })

      expect(result.success).toBe(true)
      expect(result.sequence).toHaveLength(5)
      expect(result.sequence[0].value).toBe(1000)
      expect(result.sequence[1].value).toBe(2000)
      expect(result.sequence[2].value).toBe(4000)
      expect(result.sequence[3].value).toBe(8000)
      expect(result.sequence[4].value).toBe(16000)
      expect(result.totalWait).toBe(1000 + 2000 + 4000 + 8000 + 16000)
    })

    test('should generate linear sequence correctly', () => {
      const result = generateSequence({
        initial: 1000,
        multiplier: 500,
        max: 0,
        maxSteps: 5,
        jitter: JITTER_TYPES.NONE,
        jitterMin: 0.5,
        jitterMax: 1.5,
        algorithm: ALGORITHM_TYPES.LINEAR,
        alignToSecond: false,
        alignGridMs: 0,
      })

      expect(result.success).toBe(true)
      expect(result.sequence).toHaveLength(5)
      expect(result.sequence[0].value).toBe(1000)
      expect(result.sequence[1].value).toBe(1500)
      expect(result.sequence[2].value).toBe(2000)
      expect(result.sequence[3].value).toBe(2500)
      expect(result.sequence[4].value).toBe(3000)
      expect(result.totalWait).toBe(1000 + 1500 + 2000 + 2500 + 3000)
    })

    test('should cap values at max interval', () => {
      const result = generateSequence({
        initial: 1000,
        multiplier: 2,
        max: 3000,
        maxSteps: 5,
        jitter: JITTER_TYPES.NONE,
        jitterMin: 0.5,
        jitterMax: 1.5,
        algorithm: ALGORITHM_TYPES.EXPONENTIAL,
        alignToSecond: false,
        alignGridMs: 0,
      })

      expect(result.success).toBe(true)
      expect(result.sequence).toHaveLength(5)
      expect(result.sequence[0].value).toBe(1000)
      expect(result.sequence[1].value).toBe(2000)
      expect(result.sequence[2].value).toBe(3000)
      expect(result.sequence[3].value).toBe(3000)
      expect(result.sequence[4].value).toBe(3000)
      expect(result.clippedCount).toBe(3)
      expect(result.sequence[2].clipped).toBe(true)
    })

    test('should apply alignment to grid', () => {
      const result = generateSequence({
        initial: 1234,
        multiplier: 1,
        max: 0,
        maxSteps: 3,
        jitter: JITTER_TYPES.NONE,
        jitterMin: 0.5,
        jitterMax: 1.5,
        algorithm: ALGORITHM_TYPES.EXPONENTIAL,
        alignToSecond: false,
        alignGridMs: 1000,
      })

      expect(result.success).toBe(true)
      expect(result.sequence).toHaveLength(3)
      expect(result.sequence[0].value).toBe(1000)
      expect(result.sequence[1].value).toBe(1000)
      expect(result.sequence[2].value).toBe(1000)
    })

    test('should apply alignment to second', () => {
      const result = generateSequence({
        initial: 1234,
        multiplier: 1,
        max: 0,
        maxSteps: 3,
        jitter: JITTER_TYPES.NONE,
        jitterMin: 0.5,
        jitterMax: 1.5,
        algorithm: ALGORITHM_TYPES.EXPONENTIAL,
        alignToSecond: true,
        alignGridMs: 0,
      })

      expect(result.success).toBe(true)
      expect(result.sequence).toHaveLength(3)
      expect(result.sequence[0].value).toBe(1000)
    })

    test('should apply jitter to sequence', () => {
      const randomFn = () => 0.5
      const result = generateSequence({
        initial: 1000,
        multiplier: 2,
        max: 0,
        maxSteps: 3,
        jitter: JITTER_TYPES.FULL,
        jitterMin: 0.5,
        jitterMax: 1.5,
        algorithm: ALGORITHM_TYPES.EXPONENTIAL,
        alignToSecond: false,
        alignGridMs: 0,
      }, randomFn)

      expect(result.success).toBe(true)
      expect(result.sequence).toHaveLength(3)
      expect(result.sequence[0].jittered).toBe(1000)
      expect(result.sequence[1].jittered).toBe(2000)
      expect(result.sequence[2].jittered).toBe(4000)
    })

    test('should return error for invalid parameters', () => {
      const result = generateSequence({
        ...DEFAULT_PARAMS,
        multiplier: 0,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.ZERO_MULTIPLIER)
    })

    test('should return error for invalid jitter range', () => {
      const result = generateSequence({
        ...DEFAULT_PARAMS,
        jitter: JITTER_TYPES.FULL,
        jitterMin: 2,
        jitterMax: 1,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_JITTER_RANGE)
    })
  })

  describe('inverseCalculateInitial', () => {
    test('should calculate initial for exponential with multiplier 1', () => {
      const result = inverseCalculateInitial(5000, 1, 5, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(true)
      expect(result.initial).toBe(1000)
    })

    test('should calculate initial for exponential with multiplier 2', () => {
      const result = inverseCalculateInitial(31000, 2, 5, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(true)
      expect(result.initial).toBeCloseTo(1000, 3)
    })

    test('should reject negative target total', () => {
      const result = inverseCalculateInitial(-1000, 2, 5, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })

    test('should reject negative maxSteps', () => {
      const result = inverseCalculateInitial(1000, 2, -5, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })

    test('should reject zero multiplier for exponential', () => {
      const result = inverseCalculateInitial(1000, 0, 5, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.ZERO_MULTIPLIER)
    })
  })

  describe('inverseCalculateMultiplier', () => {
    test('should return multiplier 1 when maxSteps is 1', () => {
      const result = inverseCalculateMultiplier(1000, 1000, 1, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(true)
      expect(result.multiplier).toBe(1)
    })

    test('should reject zero initial', () => {
      const result = inverseCalculateMultiplier(1000, 0, 5, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NO_SOLUTION)
    })

    test('should reject negative target total', () => {
      const result = inverseCalculateMultiplier(-1000, 100, 5, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })

    test('should reject negative initial', () => {
      const result = inverseCalculateMultiplier(1000, -100, 5, ALGORITHM_TYPES.EXPONENTIAL)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NEGATIVE_PARAMETER)
    })
  })

  describe('generateRandomParams', () => {
    test('should generate valid parameters', () => {
      const params = generateRandomParams()
      expect(Object.values(ALGORITHM_TYPES)).toContain(params.algorithm)
      expect(Object.values(JITTER_TYPES)).toContain(params.jitter)
      expect(params.initial).toBeGreaterThan(0)
      expect(params.maxSteps).toBeGreaterThan(0)
      expect(params.max).toBeGreaterThan(0)
    })

    test('should generate valid exponential params', () => {
      let foundExponential = false
      for (let i = 0; i < 100 && !foundExponential; i++) {
        const params = generateRandomParams()
        if (params.algorithm === ALGORITHM_TYPES.EXPONENTIAL) {
          foundExponential = true
          expect(params.multiplier).toBeGreaterThan(1)
          expect(params.multiplier).toBeLessThan(3)
        }
      }
    })

    test('should generate valid linear params', () => {
      let foundLinear = false
      for (let i = 0; i < 100 && !foundLinear; i++) {
        const params = generateRandomParams()
        if (params.algorithm === ALGORITHM_TYPES.LINEAR) {
          foundLinear = true
          expect(params.multiplier).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('compareConfigs', () => {
    test('should detect no changes for identical configs', () => {
      const configA = { initial: 1000, multiplier: 2, maxSteps: 5 }
      const configB = { initial: 1000, multiplier: 2, maxSteps: 5 }
      const diffs = compareConfigs(configA, configB)

      diffs.forEach(diff => {
        expect(diff.changed).toBe(false)
      })
    })

    test('should detect changes', () => {
      const configA = { initial: 1000, multiplier: 2, maxSteps: 5 }
      const configB = { initial: 2000, multiplier: 2, maxSteps: 10 }
      const diffs = compareConfigs(configA, configB)

      const initialDiff = diffs.find(d => d.key === 'initial')
      const maxStepsDiff = diffs.find(d => d.key === 'maxSteps')
      const multiplierDiff = diffs.find(d => d.key === 'multiplier')

      expect(initialDiff.changed).toBe(true)
      expect(maxStepsDiff.changed).toBe(true)
      expect(multiplierDiff.changed).toBe(false)
    })

    test('should handle keys present in only one config', () => {
      const configA = { initial: 1000, onlyA: 'value' }
      const configB = { initial: 1000, onlyB: 'value' }
      const diffs = compareConfigs(configA, configB)

      expect(diffs.find(d => d.key === 'onlyA')).toBeDefined()
      expect(diffs.find(d => d.key === 'onlyB')).toBeDefined()
    })
  })

  describe('export functions', () => {
    const testParams = { ...DEFAULT_PARAMS, decimalPlaces: 0 }

    test('exportToCSV should return empty string for empty sequence', () => {
      const result = exportToCSV([], testParams)
      expect(result).toBe('')
    })

    test('exportToCSV should generate valid CSV', () => {
      const sequence = [
        { step: 1, base: 1000, min: 1000, max: 1000, nominal: 1000, value: 1000, total: 1000 },
        { step: 2, base: 2000, min: 2000, max: 2000, nominal: 2000, value: 2000, total: 3000 },
      ]
      const result = exportToCSV(sequence, testParams)
      expect(result).toContain('Step,Base')
      expect(result).toContain('1000')
      expect(result).toContain('2000')
      expect(result).toContain('3000')
    })

    test('exportToJSON should generate valid JSON', () => {
      const sequence = [
        { step: 1, value: 1000, total: 1000 },
      ]
      const result = exportToJSON(sequence, testParams)
      const parsed = JSON.parse(result)
      expect(parsed.params).toBeDefined()
      expect(parsed.sequence).toBeDefined()
      expect(parsed.generatedAt).toBeDefined()
    })

    test('generateSleepCode should return empty string for empty sequence', () => {
      const result = generateSleepCode([], testParams, 'bash')
      expect(result).toBe('')
    })

    test('generateSleepCode should generate bash code', () => {
      const sequence = [
        { step: 1, value: 1000, total: 1000 },
        { step: 2, value: 2000, total: 3000 },
      ]
      const result = generateSleepCode(sequence, testParams, 'bash')
      expect(result).toContain('#!/bin/bash')
      expect(result).toContain('sleep')
      expect(result).toContain('1')
      expect(result).toContain('2')
    })

    test('generateSleepCode should generate powershell code', () => {
      const sequence = [
        { step: 1, value: 1000, total: 1000 },
        { step: 2, value: 2000, total: 3000 },
      ]
      const result = generateSleepCode(sequence, testParams, 'powershell')
      expect(result).toContain('Start-Sleep')
      expect(result).toContain('Milliseconds')
      expect(result).toContain('1000')
      expect(result).toContain('2000')
    })
  })
})
