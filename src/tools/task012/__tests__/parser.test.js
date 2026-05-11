import { describe, test, expect } from 'vitest'
import {
  normalizeParams,
  validateLanguage,
  validateTimezone,
  splitExpression,
  parseCronExpression,
  expandSingleField,
} from '../logic/parser.js'
import { FIELD_DEFINITIONS, DEFAULT_PARAMS } from '../logic/constants.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('parser', () => {
  describe('normalizeParams', () => {
    test('should return defaults when no params provided', () => {
      const result = normalizeParams()
      expect(result.expression).toBe(DEFAULT_PARAMS.expression)
      expect(result.timezoneId).toBe(DEFAULT_PARAMS.timezoneId)
      expect(result.language).toBe(DEFAULT_PARAMS.language)
      expect(result.expandSteps).toBe(DEFAULT_PARAMS.expandSteps)
      expect(result.includeNextTriggers).toBe(DEFAULT_PARAMS.includeNextTriggers)
      expect(result.nextTriggerCount).toBe(DEFAULT_PARAMS.nextTriggerCount)
    })

    test('should use provided values over defaults', () => {
      const result = normalizeParams({
        expression: '0 0 12 * * ?',
        timezoneId: 'America/New_York',
        language: 'en',
        expandSteps: true,
        includeNextTriggers: true,
        nextTriggerCount: 10,
      })
      expect(result.expression).toBe('0 0 12 * * ?')
      expect(result.timezoneId).toBe('America/New_York')
      expect(result.language).toBe('en')
      expect(result.expandSteps).toBe(true)
      expect(result.includeNextTriggers).toBe(true)
      expect(result.nextTriggerCount).toBe(10)
    })

    test('should handle partial params', () => {
      const result = normalizeParams({
        expression: '0 0 * * * ?',
        includeNextTriggers: true,
      })
      expect(result.expression).toBe('0 0 * * * ?')
      expect(result.includeNextTriggers).toBe(true)
      expect(result.timezoneId).toBe(DEFAULT_PARAMS.timezoneId)
      expect(result.language).toBe(DEFAULT_PARAMS.language)
    })

    test('should treat undefined explicitly as default', () => {
      const result = normalizeParams({
        expression: undefined,
        language: undefined,
      })
      expect(result.expression).toBe(DEFAULT_PARAMS.expression)
      expect(result.language).toBe(DEFAULT_PARAMS.language)
    })
  })

  describe('validateLanguage', () => {
    test('should return null for zh', () => {
      expect(validateLanguage('zh')).toBeNull()
    })

    test('should return null for en', () => {
      expect(validateLanguage('en')).toBeNull()
    })

    test('should return error for unsupported language', () => {
      const result = validateLanguage('fr')
      expect(result).not.toBeNull()
      expect(result.code).toBe(ERROR_CODES.UNSUPPORTED_LANGUAGE)
    })
  })

  describe('validateTimezone', () => {
    test('should return null for valid timezone', () => {
      expect(validateTimezone('Asia/Shanghai')).toBeNull()
      expect(validateTimezone('America/New_York')).toBeNull()
      expect(validateTimezone('UTC')).toBeNull()
    })

    test('should return error for invalid timezone', () => {
      const result = validateTimezone('Invalid/Timezone')
      expect(result).not.toBeNull()
      expect(result.code).toBe(ERROR_CODES.INVALID_TIMEZONE)
    })

    test('should return error for empty timezone', () => {
      const result = validateTimezone('')
      expect(result).not.toBeNull()
      expect(result.code).toBe(ERROR_CODES.INVALID_TIMEZONE)
    })
  })

  describe('splitExpression', () => {
    test('should return NULL_INPUT error for null', () => {
      const result = splitExpression(null)
      expect(result.error.code).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return NULL_INPUT error for non-string', () => {
      const result = splitExpression(123)
      expect(result.error.code).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return EMPTY_INPUT error for empty string', () => {
      const result = splitExpression('')
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return EMPTY_INPUT error for whitespace only', () => {
      const result = splitExpression('   ')
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return INVALID_FIELD_COUNT for 4 fields', () => {
      const result = splitExpression('0 12 * *')
      expect(result.error.code).toBe(ERROR_CODES.INVALID_FIELD_COUNT)
    })

    test('should return INVALID_FIELD_COUNT for 7 fields', () => {
      const result = splitExpression('0 0 12 * * ? *')
      expect(result.error.code).toBe(ERROR_CODES.INVALID_FIELD_COUNT)
    })

    test('should split 5-field expression correctly', () => {
      const result = splitExpression('0 12 * * ?')
      expect(result.error).toBeNull()
      expect(result.fields).toEqual(['0', '12', '*', '*', '?'])
    })

    test('should split 6-field expression correctly', () => {
      const result = splitExpression('0 0 12 * * ?')
      expect(result.error).toBeNull()
      expect(result.fields).toEqual(['0', '0', '12', '*', '*', '?'])
    })

    test('should handle multiple spaces between fields', () => {
      const result = splitExpression('0  0   12  *    *   ?')
      expect(result.error).toBeNull()
      expect(result.fields).toEqual(['0', '0', '12', '*', '*', '?'])
    })

    test('should trim leading and trailing whitespace', () => {
      const result = splitExpression('  0 0 12 * * ?  ')
      expect(result.error).toBeNull()
      expect(result.fields).toEqual(['0', '0', '12', '*', '*', '?'])
    })
  })

  describe('expandSingleField', () => {
    const minutesDef = FIELD_DEFINITIONS.minutes
    const dayOfWeekDef = FIELD_DEFINITIONS.dayOfWeek
    const monthDef = FIELD_DEFINITIONS.month

    test('should expand wildcard (*) correctly', () => {
      const result = expandSingleField('*', minutesDef)
      expect(result.error).toBeNull()
      expect(result.values.length).toBe(60)
      expect(result.values[0]).toBe(0)
      expect(result.values[59]).toBe(59)
    })

    test('should expand question mark (?) as wildcard', () => {
      const result = expandSingleField('?', FIELD_DEFINITIONS.dayOfMonth)
      expect(result.error).toBeNull()
      expect(result.isWildcard).toBe(true)
    })

    test('should expand single value', () => {
      const result = expandSingleField('30', minutesDef)
      expect(result.error).toBeNull()
      expect(result.values).toEqual([30])
    })

    test('should expand range', () => {
      const result = expandSingleField('10-20', minutesDef)
      expect(result.error).toBeNull()
      expect(result.values).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    })

    test('should expand wildcard with step', () => {
      const result = expandSingleField('*/5', minutesDef)
      expect(result.error).toBeNull()
      expect(result.values).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
    })

    test('should expand range with step', () => {
      const result = expandSingleField('10-30/5', minutesDef)
      expect(result.error).toBeNull()
      expect(result.values).toEqual([10, 15, 20, 25, 30])
    })

    test('should expand comma-separated values', () => {
      const result = expandSingleField('0,30,45', minutesDef)
      expect(result.error).toBeNull()
      expect(result.values).toEqual([0, 30, 45])
    })

    test('should expand month aliases (lowercase)', () => {
      const result = expandSingleField('jan,feb,mar', monthDef)
      expect(result.error).toBeNull()
      expect(result.values).toEqual([1, 2, 3])
    })

    test('should expand month aliases (uppercase)', () => {
      const result = expandSingleField('JAN,FEB,MAR', monthDef)
      expect(result.error).toBeNull()
      expect(result.values).toEqual([1, 2, 3])
    })

    test('should expand weekday aliases', () => {
      const result = expandSingleField('mon,wed,fri', dayOfWeekDef)
      expect(result.error).toBeNull()
      expect(result.values).toEqual([1, 3, 5])
    })

    test('should return error for value out of range', () => {
      const result = expandSingleField('60', minutesDef)
      expect(result.error).not.toBeNull()
      expect(result.error.code).toBe(ERROR_CODES.INVALID_VALUE)
    })

    test('should return error for invalid range', () => {
      const result = expandSingleField('30-10', minutesDef)
      expect(result.error).not.toBeNull()
      expect(result.error.code).toBe(ERROR_CODES.INVALID_VALUE)
    })

    test('should return error for invalid step', () => {
      const result = expandSingleField('*/0', minutesDef)
      expect(result.error).not.toBeNull()
      expect(result.error.code).toBe(ERROR_CODES.INVALID_VALUE)
    })
  })

  describe('parseCronExpression', () => {
    test('should parse 5-field expression', () => {
      const result = parseCronExpression('0 12 * * ?')
      expect(result.error).toBeNull()
      expect(result.parsed.fieldCount).toBe(5)
      expect(result.parsed.hasSeconds).toBe(false)
      expect(result.parsed.minutes.raw).toBe('0')
      expect(result.parsed.hours.raw).toBe('12')
    })

    test('should parse 6-field expression', () => {
      const result = parseCronExpression('30 0 12 * * ?')
      expect(result.error).toBeNull()
      expect(result.parsed.fieldCount).toBe(6)
      expect(result.parsed.hasSeconds).toBe(true)
      expect(result.parsed.seconds.raw).toBe('30')
    })

    test('should detect day field conflict', () => {
      const result = parseCronExpression('0 0 12 1 * MON')
      expect(result.error).not.toBeNull()
      expect(result.error.code).toBe(ERROR_CODES.UNSUPPORTED_COMBINATION)
    })

    test('should allow dayOfMonth wildcard with specific dayOfWeek', () => {
      const result = parseCronExpression('0 0 12 ? * MON')
      expect(result.error).toBeNull()
    })

    test('should allow dayOfWeek wildcard with specific dayOfMonth', () => {
      const result = parseCronExpression('0 0 12 1 * ?')
      expect(result.error).toBeNull()
    })

    test('should return error for invalid field value', () => {
      const result = parseCronExpression('0 60 12 * * ?')
      expect(result.error).not.toBeNull()
      expect(result.error.code).toBe(ERROR_CODES.INVALID_VALUE)
    })
  })
})
