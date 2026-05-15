import { describe, expect, test } from 'vitest'
import {
  getPoolSize,
  calculateRawEntropy,
  calculateAdjustedEntropy,
  estimateStrength,
  analyzePassword,
  createMetadata,
  detectRepeatingChars,
  detectSequentialChars,
  containsCommonPattern,
  getCharacteristics,
} from '../logic/entropy.js'
import { PASSWORD_STRENGTH_LEVELS } from '../logic/constants.js'

describe('entropy', () => {
  describe('getPoolSize', () => {
    test('should return 0 for empty/null/undefined', () => {
      expect(getPoolSize('')).toBe(0)
      expect(getPoolSize(null)).toBe(0)
      expect(getPoolSize(undefined)).toBe(0)
    })

    test('should calculate pool for lowercase only', () => {
      expect(getPoolSize('abc')).toBe(26)
    })

    test('should calculate pool for uppercase only', () => {
      expect(getPoolSize('ABC')).toBe(26)
    })

    test('should calculate pool for digits only', () => {
      expect(getPoolSize('123')).toBe(10)
    })

    test('should calculate pool for mixed case', () => {
      expect(getPoolSize('aBc')).toBe(52)
    })

    test('should calculate pool for mixed case + digits', () => {
      expect(getPoolSize('aB3')).toBe(62)
    })

    test('should calculate pool with symbols', () => {
      expect(getPoolSize('a!B')).toBe(84)
    })
  })

  describe('calculateRawEntropy', () => {
    test('should return 0 for empty/null/undefined', () => {
      expect(calculateRawEntropy('')).toBe(0)
      expect(calculateRawEntropy(null)).toBe(0)
      expect(calculateRawEntropy(undefined)).toBe(0)
    })

    test('should calculate entropy = length * log2(pool)', () => {
      const password = 'abcd'
      const pool = 26
      const expected = 4 * Math.log2(pool)
      expect(calculateRawEntropy(password)).toBeCloseTo(expected, 5)
    })

    test('should give higher entropy for longer passwords', () => {
      const short = calculateRawEntropy('abc')
      const long = calculateRawEntropy('abcdefgh')
      expect(long).toBeGreaterThan(short)
    })

    test('should give higher entropy for larger character pools', () => {
      const simple = calculateRawEntropy('abcd')
      const complex = calculateRawEntropy('aB3!')
      expect(complex).toBeGreaterThan(simple)
    })
  })

  describe('detectRepeatingChars', () => {
    test('should detect consecutive repeating characters', () => {
      const result = detectRepeatingChars('aaabbb')
      expect(result.maxSequence).toBe(3)
      expect(result.count).toBeGreaterThan(0)
    })

    test('should not detect non-repeating characters', () => {
      const result = detectRepeatingChars('abcde')
      expect(result.maxSequence).toBe(1)
      expect(result.count).toBe(0)
    })

    test('should handle empty strings', () => {
      const result = detectRepeatingChars('')
      expect(result.count).toBe(0)
      expect(result.maxSequence).toBe(0)
    })
  })

  describe('detectSequentialChars', () => {
    test('should detect ascending sequences', () => {
      const result = detectSequentialChars('abcde')
      expect(result.maxRun).toBe(5)
    })

    test('should detect descending sequences', () => {
      const result = detectSequentialChars('edcba')
      expect(result.maxRun).toBe(5)
    })

    test('should not detect non-sequential', () => {
      const result = detectSequentialChars('adbecf')
      expect(result.maxRun).toBeLessThan(3)
    })
  })

  describe('containsCommonPattern', () => {
    test('should detect common passwords', () => {
      expect(containsCommonPattern('password')).toBe(true)
      expect(containsCommonPattern('123456')).toBe(true)
      expect(containsCommonPattern('qwerty')).toBe(true)
      expect(containsCommonPattern('letmein')).toBe(true)
    })

    test('should be case insensitive', () => {
      expect(containsCommonPattern('PASSWORD')).toBe(true)
      expect(containsCommonPattern('Password')).toBe(true)
    })

    test('should return false for non-common patterns', () => {
      expect(containsCommonPattern('kjhgfds')).toBe(false)
      expect(containsCommonPattern('xY3!pQ')).toBe(false)
    })
  })

  describe('calculateAdjustedEntropy', () => {
    test('should apply deductions for repeating characters', () => {
      const result = calculateAdjustedEntropy('aaaaaaaa')
      expect(result.adjustedEntropy).toBeLessThan(result.rawEntropy)
      expect(result.deductions.some((d) => d.type === 'repeating')).toBe(true)
    })

    test('should apply deductions for sequential characters', () => {
      const result = calculateAdjustedEntropy('abcdefgh')
      expect(result.deductions.some((d) => d.type === 'sequential')).toBe(true)
    })

    test('should apply deductions for common patterns', () => {
      const result = calculateAdjustedEntropy('password123')
      expect(result.deductions.some((d) => d.type === 'common_pattern')).toBe(true)
    })

    test('should not apply deductions when accountForPatterns is false', () => {
      const result = calculateAdjustedEntropy('aaaaaaaa', { accountForPatterns: false })
      expect(result.adjustedEntropy).toBe(result.rawEntropy)
      expect(result.deductions).toEqual([])
    })

    test('should never return negative entropy', () => {
      const result = calculateAdjustedEntropy('aaaaaaa')
      expect(result.adjustedEntropy).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getCharacteristics', () => {
    test('should return all characteristics', () => {
      const result = getCharacteristics('aB3!')
      expect(result.length).toBe(4)
      expect(result.hasLowercase).toBe(true)
      expect(result.hasUppercase).toBe(true)
      expect(result.hasDigit).toBe(true)
      expect(result.hasSymbol).toBe(true)
    })

    test('should correctly classify each characteristic', () => {
      expect(getCharacteristics('abc').hasLowercase).toBe(true)
      expect(getCharacteristics('abc').hasUppercase).toBe(false)
      expect(getCharacteristics('ABC').hasUppercase).toBe(true)
      expect(getCharacteristics('123').hasDigit).toBe(true)
      expect(getCharacteristics('!@#').hasSymbol).toBe(true)
    })
  })

  describe('estimateStrength', () => {
    test('should classify weak passwords (< 28 bits)', () => {
      const result = estimateStrength(20)
      expect(result.level).toBe(PASSWORD_STRENGTH_LEVELS.WEAK)
      expect(result.score).toBe(0)
    })

    test('should classify fair passwords (28-36 bits)', () => {
      const result = estimateStrength(30)
      expect(result.level).toBe(PASSWORD_STRENGTH_LEVELS.FAIR)
      expect(result.score).toBe(1)
    })

    test('should classify strong passwords (36-60 bits)', () => {
      const result = estimateStrength(50)
      expect(result.level).toBe(PASSWORD_STRENGTH_LEVELS.STRONG)
      expect(result.score).toBe(2)
    })

    test('should classify very strong passwords (>= 60 bits)', () => {
      const result = estimateStrength(80)
      expect(result.level).toBe(PASSWORD_STRENGTH_LEVELS.VERY_STRONG)
      expect(result.score).toBe(3)
    })

    test('should include min/max entropy bounds', () => {
      const weak = estimateStrength(10)
      expect(weak.minEntropy).toBe(0)
      expect(weak.maxEntropy).toBe(28)

      const strong = estimateStrength(80)
      expect(strong.minEntropy).toBe(60)
      expect(strong.maxEntropy).toBe(Infinity)
    })
  })

  describe('analyzePassword', () => {
    test('should return complete analysis', () => {
      const result = analyzePassword('TestPass123!')

      expect(result).toHaveProperty('length')
      expect(result).toHaveProperty('poolSize')
      expect(result).toHaveProperty('rawEntropy')
      expect(result).toHaveProperty('adjustedEntropy')
      expect(result).toHaveProperty('characteristics')
      expect(result).toHaveProperty('strength')
      expect(result.strength).toHaveProperty('level')
      expect(result.strength).toHaveProperty('score')
    })

    test('should classify complex passwords as strong or better', () => {
      const result = analyzePassword('Kj9$mP2@xQ7!')
      expect([
        PASSWORD_STRENGTH_LEVELS.STRONG,
        PASSWORD_STRENGTH_LEVELS.VERY_STRONG,
      ]).toContain(result.strength.level)
    })

    test('should classify simple passwords as weak or fair', () => {
      const result = analyzePassword('password')
      expect([
        PASSWORD_STRENGTH_LEVELS.WEAK,
        PASSWORD_STRENGTH_LEVELS.FAIR,
      ]).toContain(result.strength.level)
    })
  })

  describe('createMetadata', () => {
    test('should create metadata without storing password', () => {
      const password = 'MySecretPassword123!'
      const metadata = createMetadata(password)

      expect(metadata).not.toHaveProperty('password')
      expect(metadata).not.toHaveProperty('value')
      expect(metadata).not.toHaveProperty('text')
    })

    test('should include only safe metadata fields', () => {
      const metadata = createMetadata('Test123!')

      expect(metadata).toHaveProperty('length')
      expect(metadata).toHaveProperty('rawEntropy')
      expect(metadata).toHaveProperty('adjustedEntropy')
      expect(metadata).toHaveProperty('strengthLevel')
      expect(metadata).toHaveProperty('strengthScore')
      expect(metadata).toHaveProperty('hasLowercase')
      expect(metadata).toHaveProperty('hasUppercase')
      expect(metadata).toHaveProperty('hasDigit')
      expect(metadata).toHaveProperty('hasSymbol')
    })

    test('should return empty metadata for empty input', () => {
      const metadata = createMetadata('')
      expect(metadata.length).toBe(0)
      expect(metadata.rawEntropy).toBe(0)
      expect(metadata.adjustedEntropy).toBe(0)
      expect(metadata.strengthLevel).toBeNull()
      expect(metadata.strengthScore).toBe(-1)
    })

    test('should correctly capture character type presence', () => {
      const metadata = createMetadata('aB3!')
      expect(metadata.hasLowercase).toBe(true)
      expect(metadata.hasUppercase).toBe(true)
      expect(metadata.hasDigit).toBe(true)
      expect(metadata.hasSymbol).toBe(true)
    })
  })
})
