import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  generatePasswords,
  validateRules,
  filterCharacters,
  buildCharacterPool,
  calculateEntropy,
  calculateStrength,
  CHARACTER_CLASSES,
  ERROR_CODES,
  CONFUSING_CHARACTERS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_BATCH_COUNT,
  MAX_BATCH_COUNT,
  MAX_TOTAL_OUTPUT_LENGTH,
} from '../logic/index.js'

describe('password generator logic', () => {
  let originalGetRandomValues

  beforeEach(() => {
    if (!global.crypto) {
      global.crypto = {}
    }
    originalGetRandomValues = global.crypto.getRandomValues
    global.crypto.getRandomValues = (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 4294967296)
      }
      return arr
    }
  })

  afterEach(() => {
    if (originalGetRandomValues !== undefined) {
      global.crypto.getRandomValues = originalGetRandomValues
    }
  })

  describe('filterCharacters', () => {
    test('should return original characters when no exclusions', () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const result = filterCharacters(chars, false, [])
      expect(result).toBe(chars)
    })

    test('should exclude confusing characters when excludeConfusing is true', () => {
      const chars = '0O1lIABCDEFG'
      const result = filterCharacters(chars, true, [])
      for (const char of CONFUSING_CHARACTERS) {
        expect(result).not.toContain(char)
      }
      expect(result).toContain('A')
      expect(result).toContain('B')
    })

    test('should exclude custom single characters', () => {
      const chars = 'ABCDEFG'
      const result = filterCharacters(chars, false, ['A', 'C', 'E'])
      expect(result).not.toContain('A')
      expect(result).not.toContain('C')
      expect(result).not.toContain('E')
      expect(result).toContain('B')
      expect(result).toContain('D')
    })

    test('should handle both excludeConfusing and custom exclusions', () => {
      const chars = '0O1lIABCDEFG@#'
      const result = filterCharacters(chars, true, ['A', '@'])
      for (const char of CONFUSING_CHARACTERS) {
        expect(result).not.toContain(char)
      }
      expect(result).not.toContain('A')
      expect(result).not.toContain('@')
      expect(result).toContain('B')
      expect(result).toContain('#')
    })
  })

  describe('buildCharacterPool', () => {
    test('should build pool for single character class', () => {
      const pool = buildCharacterPool(
        [CHARACTER_CLASSES.UPPERCASE],
        [],
        false,
        []
      )
      expect(pool).toHaveProperty(CHARACTER_CLASSES.UPPERCASE)
      expect(pool[CHARACTER_CLASSES.UPPERCASE].length).toBeGreaterThan(0)
    })

    test('should build pool for multiple character classes', () => {
      const pool = buildCharacterPool(
        [CHARACTER_CLASSES.UPPERCASE, CHARACTER_CLASSES.LOWERCASE],
        [CHARACTER_CLASSES.DIGITS],
        false,
        []
      )
      expect(pool).toHaveProperty(CHARACTER_CLASSES.UPPERCASE)
      expect(pool).toHaveProperty(CHARACTER_CLASSES.LOWERCASE)
      expect(pool).toHaveProperty(CHARACTER_CLASSES.DIGITS)
    })

    test('should exclude confusing characters from all classes', () => {
      const pool = buildCharacterPool(
        [CHARACTER_CLASSES.DIGITS, CHARACTER_CLASSES.UPPERCASE],
        [],
        true,
        []
      )
      for (const char of CONFUSING_CHARACTERS) {
        expect(pool[CHARACTER_CLASSES.DIGITS]).not.toContain(char)
        expect(pool[CHARACTER_CLASSES.UPPERCASE]).not.toContain(char)
      }
    })
  })

  describe('validateRules', () => {
    test('should return null for valid rules', () => {
      const result = validateRules({
        minLength: 8,
        maxLength: 16,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE, CHARACTER_CLASSES.LOWERCASE],
        optionalClasses: [],
        excludeConfusing: true,
        customExclusions: [],
        batchCount: 5,
      })
      expect(result).toBeNull()
    })

    test('should return ZERO_LENGTH error when both min and max are zero', () => {
      const result = validateRules({
        minLength: 0,
        maxLength: 0,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.ZERO_LENGTH)
    })

    test('should return MIN_LENGTH_GREATER_THAN_MAX error', () => {
      const result = validateRules({
        minLength: 20,
        maxLength: 10,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.MIN_LENGTH_GREATER_THAN_MAX)
    })

    test('should return LENGTH_OUT_OF_RANGE error for too small length', () => {
      const result = validateRules({
        minLength: 1,
        maxLength: 2,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.LENGTH_OUT_OF_RANGE)
    })

    test('should return LENGTH_OUT_OF_RANGE error for too large length', () => {
      const result = validateRules({
        minLength: MAX_PASSWORD_LENGTH + 10,
        maxLength: MAX_PASSWORD_LENGTH + 20,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.LENGTH_OUT_OF_RANGE)
    })

    test('should return NO_CHARACTER_CLASSES_SELECTED error', () => {
      const result = validateRules({
        minLength: 8,
        maxLength: 16,
        requiredClasses: [],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.NO_CHARACTER_CLASSES_SELECTED)
    })

    test('should return INSUFFICIENT_LENGTH_FOR_REQUIRED_CLASSES error', () => {
      const result = validateRules({
        minLength: 5,
        maxLength: 10,
        requiredClasses: [
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
          CHARACTER_CLASSES.DIGITS,
          CHARACTER_CLASSES.SYMBOLS,
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
        ],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.INSUFFICIENT_LENGTH_FOR_REQUIRED_CLASSES)
    })

    test('should return ALL_CHARACTERS_EXCLUDED when required class has no characters left', () => {
      const allDigits = '0123456789'.split('')
      const result = validateRules({
        minLength: 4,
        maxLength: 8,
        requiredClasses: [CHARACTER_CLASSES.DIGITS],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: allDigits,
        batchCount: 1,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.ALL_CHARACTERS_EXCLUDED)
    })

    test('should return BATCH_COUNT_OUT_OF_RANGE for too small batch', () => {
      const result = validateRules({
        minLength: 8,
        maxLength: 16,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 0,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.BATCH_COUNT_OUT_OF_RANGE)
    })

    test('should return BATCH_COUNT_OUT_OF_RANGE for too large batch', () => {
      const result = validateRules({
        minLength: 8,
        maxLength: 16,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: MAX_BATCH_COUNT + 10,
      })
      expect(result).not.toBeNull()
      expect(result.errorCode).toBe(ERROR_CODES.BATCH_COUNT_OUT_OF_RANGE)
    })

    test('should return TOTAL_OUTPUT_TOO_LARGE when total exceeds limit', () => {
      const result = validateRules({
        minLength: MAX_PASSWORD_LENGTH,
        maxLength: MAX_PASSWORD_LENGTH,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: MAX_BATCH_COUNT,
      })
      const maxTotal = MAX_BATCH_COUNT * MAX_PASSWORD_LENGTH
      if (maxTotal > MAX_TOTAL_OUTPUT_LENGTH) {
        expect(result).not.toBeNull()
        expect(result.errorCode).toBe(ERROR_CODES.TOTAL_OUTPUT_TOO_LARGE)
      }
    })

    test('should allow optional classes in validation', () => {
      const result = validateRules({
        minLength: 4,
        maxLength: 8,
        requiredClasses: [],
        optionalClasses: [CHARACTER_CLASSES.UPPERCASE, CHARACTER_CLASSES.LOWERCASE],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result).toBeNull()
    })
  })

  describe('generatePasswords', () => {
    test('should generate single password successfully', () => {
      const result = generatePasswords({
        minLength: 8,
        maxLength: 12,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE, CHARACTER_CLASSES.LOWERCASE],
        optionalClasses: [],
        excludeConfusing: true,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result.success).toBe(true)
      expect(result.passwords).toHaveLength(1)
      expect(result.passwords[0].password.length).toBeGreaterThanOrEqual(8)
      expect(result.passwords[0].password.length).toBeLessThanOrEqual(12)
    })

    test('should generate multiple passwords in batch', () => {
      const batchSize = 5
      const result = generatePasswords({
        minLength: 10,
        maxLength: 10,
        requiredClasses: [
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
          CHARACTER_CLASSES.DIGITS,
        ],
        optionalClasses: [],
        excludeConfusing: true,
        customExclusions: [],
        batchCount: batchSize,
      })
      expect(result.success).toBe(true)
      expect(result.passwords).toHaveLength(batchSize)
      result.passwords.forEach((p) => {
        expect(p.password.length).toBe(10)
        expect(p.entropy).toBeDefined()
        expect(p.strength).toBeDefined()
      })
    })

    test('should include all required character classes in password', () => {
      const result = generatePasswords({
        minLength: 8,
        maxLength: 8,
        requiredClasses: [
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
          CHARACTER_CLASSES.DIGITS,
          CHARACTER_CLASSES.SYMBOLS,
        ],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result.success).toBe(true)
      const password = result.passwords[0].password
      expect(/[A-Z]/.test(password)).toBe(true)
      expect(/[a-z]/.test(password)).toBe(true)
      expect(/[0-9]/.test(password)).toBe(true)
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true)
    })

    test('should exclude confusing characters when enabled', () => {
      const result = generatePasswords({
        minLength: 20,
        maxLength: 20,
        requiredClasses: [
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
          CHARACTER_CLASSES.DIGITS,
        ],
        optionalClasses: [],
        excludeConfusing: true,
        customExclusions: [],
        batchCount: 10,
      })
      expect(result.success).toBe(true)
      result.passwords.forEach((p) => {
        for (const char of CONFUSING_CHARACTERS) {
          expect(p.password).not.toContain(char)
        }
      })
    })

    test('should exclude custom characters', () => {
      const result = generatePasswords({
        minLength: 10,
        maxLength: 10,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
        batchCount: 5,
      })
      expect(result.success).toBe(true)
      result.passwords.forEach((p) => {
        expect(p.password).not.toContain('A')
        expect(p.password).not.toContain('B')
        expect(p.password).not.toContain('C')
      })
    })

    test('should return error for invalid rules', () => {
      const result = generatePasswords({
        minLength: 20,
        maxLength: 10,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.MIN_LENGTH_GREATER_THAN_MAX)
      expect(result.passwords).toBeUndefined()
    })

    test('should generate different passwords on multiple calls', () => {
      const options = {
        minLength: 16,
        maxLength: 16,
        requiredClasses: [
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
          CHARACTER_CLASSES.DIGITS,
        ],
        optionalClasses: [],
        excludeConfusing: true,
        customExclusions: [],
        batchCount: 1,
      }

      const result1 = generatePasswords(options)
      const result2 = generatePasswords(options)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.passwords[0].password).not.toBe(result2.passwords[0].password)
    })

    test('should calculate entropy and strength for each password', () => {
      const result = generatePasswords({
        minLength: 16,
        maxLength: 16,
        requiredClasses: [
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
          CHARACTER_CLASSES.DIGITS,
          CHARACTER_CLASSES.SYMBOLS,
        ],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 3,
      })
      expect(result.success).toBe(true)
      result.passwords.forEach((p) => {
        expect(p.entropy).toBeDefined()
        expect(typeof p.entropy).toBe('string')
        expect(parseFloat(p.entropy)).toBeGreaterThan(0)
        expect(p.strength).toBeDefined()
        expect(['极弱', '弱', '中等', '强', '极强']).toContain(p.strength)
      })
    })

    test('should track used character classes', () => {
      const result = generatePasswords({
        minLength: 8,
        maxLength: 8,
        requiredClasses: [
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
        ],
        optionalClasses: [CHARACTER_CLASSES.DIGITS],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result.success).toBe(true)
      const usedClasses = result.passwords[0].usedClasses
      expect(usedClasses).toContain(CHARACTER_CLASSES.UPPERCASE)
      expect(usedClasses).toContain(CHARACTER_CLASSES.LOWERCASE)
    })
  })

  describe('calculateEntropy and calculateStrength', () => {
    test('should calculate entropy correctly', () => {
      const pools = {
        [CHARACTER_CLASSES.UPPERCASE]: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        [CHARACTER_CLASSES.LOWERCASE]: 'abcdefghijklmnopqrstuvwxyz',
      }
      const entropy = calculateEntropy('AbCdEfGh', pools, [
        CHARACTER_CLASSES.UPPERCASE,
        CHARACTER_CLASSES.LOWERCASE,
      ])
      expect(entropy).toBeGreaterThan(0)
    })

    test('should return 0 entropy for empty pools', () => {
      const entropy = calculateEntropy('test', {}, [])
      expect(entropy).toBe(0)
    })

    test('should calculate strength based on entropy and length', () => {
      const veryStrong = calculateStrength(150, 20, 4)
      expect(veryStrong).toBe('极强')

      const strong = calculateStrength(100, 16, 3)
      expect(strong).toBe('强')

      const medium = calculateStrength(70, 12, 2)
      expect(medium).toBe('中等')
    })

    test('should penalize short passwords', () => {
      const veryWeak = calculateStrength(50, 4, 1)
      expect(veryWeak).toBe('极弱')
    })
  })

  describe('edge cases', () => {
    test('should handle exact length (min === max)', () => {
      const exactLength = 12
      const result = generatePasswords({
        minLength: exactLength,
        maxLength: exactLength,
        requiredClasses: [CHARACTER_CLASSES.UPPERCASE, CHARACTER_CLASSES.LOWERCASE],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 5,
      })
      expect(result.success).toBe(true)
      result.passwords.forEach((p) => {
        expect(p.password.length).toBe(exactLength)
      })
    })

    test('should handle minimum allowed length', () => {
      const result = generatePasswords({
        minLength: MIN_PASSWORD_LENGTH,
        maxLength: MIN_PASSWORD_LENGTH,
        requiredClasses: [CHARACTER_CLASSES.DIGITS],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: 1,
      })
      expect(result.success).toBe(true)
      expect(result.passwords[0].password.length).toBe(MIN_PASSWORD_LENGTH)
    })

    test('should handle maximum allowed batch count', () => {
      const result = generatePasswords({
        minLength: 4,
        maxLength: 4,
        requiredClasses: [CHARACTER_CLASSES.DIGITS],
        optionalClasses: [],
        excludeConfusing: false,
        customExclusions: [],
        batchCount: MAX_BATCH_COUNT,
      })
      const maxTotal = MAX_BATCH_COUNT * 4
      if (maxTotal <= MAX_TOTAL_OUTPUT_LENGTH) {
        expect(result.success).toBe(true)
        expect(result.passwords).toHaveLength(MAX_BATCH_COUNT)
      }
    })

    test('should work with only optional classes', () => {
      const result = generatePasswords({
        minLength: 8,
        maxLength: 12,
        requiredClasses: [],
        optionalClasses: [
          CHARACTER_CLASSES.UPPERCASE,
          CHARACTER_CLASSES.LOWERCASE,
          CHARACTER_CLASSES.DIGITS,
        ],
        excludeConfusing: true,
        customExclusions: [],
        batchCount: 3,
      })
      expect(result.success).toBe(true)
      result.passwords.forEach((p) => {
        expect(p.password.length).toBeGreaterThanOrEqual(8)
        expect(p.password.length).toBeLessThanOrEqual(12)
      })
    })
  })
})
