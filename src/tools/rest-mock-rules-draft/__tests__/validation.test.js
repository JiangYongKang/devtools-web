import { describe, test, expect } from 'vitest'
import {
  validateJson,
  validateRegex,
  validatePath,
  validateMethods,
  validateStatusCode,
  validateDelay,
  validateProbability,
  validateRule,
  validateRules,
  validateDraft,
  validateJsonBodyPrecheck,
} from '../logic/validation.js'
import {
  ERROR_CODES,
  PATH_MATCH_TYPES,
  MAX_DELAY_MS,
} from '../logic/constants.js'
import { createDefaultRule } from '../logic/normalization.js'

describe('validation', () => {
  describe('validateJson', () => {
    test('should validate valid JSON', () => {
      const result = validateJson('{"key": "value"}')
      expect(result.valid).toBe(true)
      expect(result.data).toEqual({ key: 'value' })
    })

    test('should reject invalid JSON', () => {
      const result = validateJson('{invalid json')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_JSON)
    })

    test('should reject empty string', () => {
      const result = validateJson('')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_JSON)
    })

    test('should reject whitespace only', () => {
      const result = validateJson('   ')
      expect(result.valid).toBe(false)
    })

    test('should accept JSON array', () => {
      const result = validateJson('[1, 2, 3]')
      expect(result.valid).toBe(true)
      expect(result.data).toEqual([1, 2, 3])
    })
  })

  describe('validateRegex', () => {
    test('should validate valid regex', () => {
      expect(validateRegex('/api/.*').valid).toBe(true)
      expect(validateRegex('^[a-z]+$').valid).toBe(true)
    })

    test('should reject invalid regex', () => {
      const result = validateRegex('[invalid')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_REGEX)
    })

    test('should reject empty regex', () => {
      const result = validateRegex('')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_REGEX)
    })
  })

  describe('validatePath', () => {
    test('should accept valid exact path', () => {
      const result = validatePath('/api/users', PATH_MATCH_TYPES.EXACT)
      expect(result.valid).toBe(true)
    })

    test('should reject path without leading slash', () => {
      const result = validatePath('api/users', PATH_MATCH_TYPES.EXACT)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_PATH)
    })

    test('should reject empty path', () => {
      const result = validatePath('', PATH_MATCH_TYPES.EXACT)
      expect(result.valid).toBe(false)
    })

    test('should validate regex path', () => {
      const result = validatePath('/api/.*', PATH_MATCH_TYPES.REGEX)
      expect(result.valid).toBe(true)
    })

    test('should reject invalid regex in path', () => {
      const result = validatePath('[invalid', PATH_MATCH_TYPES.REGEX)
      expect(result.valid).toBe(false)
      const hasRegexError = result.errors.some((e) => e.code === ERROR_CODES.INVALID_REGEX)
      expect(hasRegexError).toBe(true)
    })

    test('should accept root path', () => {
      const result = validatePath('/', PATH_MATCH_TYPES.EXACT)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateMethods', () => {
    test('should accept valid HTTP methods', () => {
      const result = validateMethods(['GET', 'POST', 'PUT'])
      expect(result.valid).toBe(true)
    })

    test('should accept lowercase methods', () => {
      const result = validateMethods(['get', 'post'])
      expect(result.valid).toBe(true)
    })

    test('should reject empty array', () => {
      const result = validateMethods([])
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_METHOD)
    })

    test('should reject invalid methods', () => {
      const result = validateMethods(['INVALID'])
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_METHOD)
    })

    test('should reject non-array input', () => {
      const result = validateMethods('GET')
      expect(result.valid).toBe(false)
    })
  })

  describe('validateStatusCode', () => {
    test('should accept valid status codes', () => {
      expect(validateStatusCode(200).valid).toBe(true)
      expect(validateStatusCode(201).valid).toBe(true)
      expect(validateStatusCode(404).valid).toBe(true)
      expect(validateStatusCode(500).valid).toBe(true)
      expect(validateStatusCode(100).valid).toBe(true)
      expect(validateStatusCode(599).valid).toBe(true)
    })

    test('should reject out of range status codes', () => {
      expect(validateStatusCode(99).valid).toBe(false)
      expect(validateStatusCode(600).valid).toBe(false)
      expect(validateStatusCode(0).valid).toBe(false)
    })

    test('should reject non-integer status codes', () => {
      expect(validateStatusCode(200.5).valid).toBe(false)
      expect(validateStatusCode('200').valid).toBe(false)
      expect(validateStatusCode(null).valid).toBe(false)
    })
  })

  describe('validateDelay', () => {
    test('should accept valid delay values', () => {
      expect(validateDelay(0).valid).toBe(true)
      expect(validateDelay(100).valid).toBe(true)
      expect(validateDelay(MAX_DELAY_MS).valid).toBe(true)
    })

    test('should reject negative delay', () => {
      expect(validateDelay(-1).valid).toBe(false)
    })

    test('should reject delay exceeding max', () => {
      expect(validateDelay(MAX_DELAY_MS + 1).valid).toBe(false)
    })

    test('should reject non-integer delay', () => {
      expect(validateDelay(100.5).valid).toBe(false)
      expect(validateDelay('100').valid).toBe(false)
    })
  })

  describe('validateProbability', () => {
    test('should accept valid probability values', () => {
      expect(validateProbability(1).valid).toBe(true)
      expect(validateProbability(50).valid).toBe(true)
      expect(validateProbability(100).valid).toBe(true)
    })

    test('should reject out of range probability', () => {
      expect(validateProbability(0).valid).toBe(false)
      expect(validateProbability(101).valid).toBe(false)
      expect(validateProbability(150).valid).toBe(false)
    })

    test('should reject non-integer probability', () => {
      expect(validateProbability(50.5).valid).toBe(false)
      expect(validateProbability('50').valid).toBe(false)
    })
  })

  describe('validateRule', () => {
    test('should validate valid rule', () => {
      const rule = createDefaultRule(0)
      rule.path = '/api/users'
      rule.methods = ['GET', 'POST']
      rule.statusCode = 200
      rule.delayMs = 0
      rule.probability = 100

      const result = validateRule(rule)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should detect invalid path', () => {
      const rule = createDefaultRule(0)
      rule.path = 'invalid/path'

      const result = validateRule(rule)
      expect(result.valid).toBe(false)
      const pathErrors = result.errors.filter((e) => e.details?.field === 'path')
      expect(pathErrors).toHaveLength(1)
    })

    test('should detect invalid methods', () => {
      const rule = createDefaultRule(0)
      rule.methods = ['INVALID']

      const result = validateRule(rule)
      expect(result.valid).toBe(false)
      const methodErrors = result.errors.filter((e) => e.details?.field === 'methods')
      expect(methodErrors).toHaveLength(1)
    })

    test('should detect invalid status code', () => {
      const rule = createDefaultRule(0)
      rule.statusCode = 999

      const result = validateRule(rule)
      expect(result.valid).toBe(false)
      const statusErrors = result.errors.filter((e) => e.details?.field === 'statusCode')
      expect(statusErrors).toHaveLength(1)
    })

    test('should detect multiple errors', () => {
      const rule = createDefaultRule(0)
      rule.path = 'invalid'
      rule.methods = ['INVALID']
      rule.statusCode = 999

      const result = validateRule(rule)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('validateRules', () => {
    test('should validate empty array', () => {
      const result = validateRules([])
      expect(result.valid).toBe(true)
    })

    test('should validate array of valid rules', () => {
      const rule1 = createDefaultRule(0)
      rule1.path = '/api/users'

      const rule2 = createDefaultRule(1)
      rule2.path = '/api/orders'

      const result = validateRules([rule1, rule2])
      expect(result.valid).toBe(true)
    })

    test('should reject non-array input', () => {
      const result = validateRules('not an array')
      expect(result.valid).toBe(false)
    })

    test('should detect invalid rules in array', () => {
      const validRule = createDefaultRule(0)
      validRule.path = '/api/users'

      const invalidRule = createDefaultRule(1)
      invalidRule.path = 'invalid'
      invalidRule.statusCode = 999

      const result = validateRules([validRule, invalidRule])
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('validateDraft', () => {
    test('should validate valid draft', () => {
      const rule = createDefaultRule(0)
      rule.path = '/api/users'

      const draft = {
        rules: [rule],
        metadata: { createdAt: Date.now() },
      }

      const result = validateDraft(draft)
      expect(result.valid).toBe(true)
    })

    test('should reject null draft', () => {
      const result = validateDraft(null)
      expect(result.valid).toBe(false)
    })

    test('should detect invalid rules in draft', () => {
      const invalidRule = createDefaultRule(0)
      invalidRule.path = 'invalid'

      const draft = {
        rules: [invalidRule],
      }

      const result = validateDraft(draft)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateJsonBodyPrecheck', () => {
    test('should skip validation when disabled', () => {
      const result = validateJsonBodyPrecheck('{invalid', false)
      expect(result.valid).toBe(true)
    })

    test('should validate valid JSON body string', () => {
      const result = validateJsonBodyPrecheck('{"key": "value"}', true)
      expect(result.valid).toBe(true)
    })

    test('should reject invalid JSON body string', () => {
      const result = validateJsonBodyPrecheck('{invalid', true)
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_JSON)
    })

    test('should accept empty body', () => {
      expect(validateJsonBodyPrecheck('', true).valid).toBe(true)
      expect(validateJsonBodyPrecheck(null, true).valid).toBe(true)
    })

    test('should validate JSON object body', () => {
      const result = validateJsonBodyPrecheck({ key: 'value' }, true)
      expect(result.valid).toBe(true)
    })

    test('should accept whitespace only body', () => {
      const result = validateJsonBodyPrecheck('   ', true)
      expect(result.valid).toBe(true)
    })
  })
})
