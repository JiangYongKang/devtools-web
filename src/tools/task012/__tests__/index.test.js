import { describe, test, expect } from 'vitest'
import { interpretCron } from '../logic/index.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('interpretCron', () => {
  describe('error handling', () => {
    test('should return NULL_INPUT error for null expression', () => {
      const result = interpretCron({ expression: null })
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return EMPTY_INPUT error for empty expression', () => {
      const result = interpretCron({ expression: '' })
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return INVALID_FIELD_COUNT for wrong field count', () => {
      const result = interpretCron({ expression: '0 0 12 *' })
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_FIELD_COUNT)
    })

    test('should return INVALID_VALUE for out of range value', () => {
      const result = interpretCron({ expression: '0 60 12 * * ?' })
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_VALUE)
    })

    test('should return INVALID_TIMEZONE for invalid timezone', () => {
      const result = interpretCron({
        expression: '0 0 12 * * ?',
        timezoneId: 'Invalid/Timezone',
      })
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_TIMEZONE)
    })

    test('should return UNSUPPORTED_LANGUAGE for invalid language', () => {
      const result = interpretCron({
        expression: '0 0 12 * * ?',
        language: 'fr',
      })
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.UNSUPPORTED_LANGUAGE)
    })

    test('should return UNSUPPORTED_COMBINATION for day field conflict', () => {
      const result = interpretCron({ expression: '0 0 12 1 * MON' })
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.UNSUPPORTED_COMBINATION)
    })
  })

  describe('successful interpretation', () => {
    test('should interpret 5-field expression successfully', () => {
      const result = interpretCron({ expression: '0 12 * * ?' })
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(result.result.fieldCount).toBe(5)
      expect(result.result.originalExpression).toBe('0 12 * * ?')
      expect(result.result.description).toBeDefined()
    })

    test('should interpret 6-field expression successfully', () => {
      const result = interpretCron({ expression: '30 0 12 * * ?' })
      expect(result.success).toBe(true)
      expect(result.result.fieldCount).toBe(6)
    })

    test('should include next triggers when requested', () => {
      const result = interpretCron({
        expression: '0 0 12 * * ?',
        includeNextTriggers: true,
        nextTriggerCount: 3,
      })
      expect(result.success).toBe(true)
      expect(result.result.nextTriggerTimes.length).toBe(3)
    })

    test('should not include next triggers when not requested', () => {
      const result = interpretCron({
        expression: '0 0 12 * * ?',
        includeNextTriggers: false,
      })
      expect(result.success).toBe(true)
      expect(result.result.nextTriggerTimes.length).toBe(0)
    })

    test('should return Chinese descriptions by default', () => {
      const result = interpretCron({
        expression: '0 0 12 1 JAN ?',
        language: 'zh',
      })
      expect(result.success).toBe(true)
      expect(result.result.monthDescription).toContain('一月')
    })

    test('should return English descriptions when language is en', () => {
      const result = interpretCron({
        expression: '0 0 12 1 JAN ?',
        language: 'en',
      })
      expect(result.success).toBe(true)
      expect(result.result.monthDescription).toContain('January')
    })

    test('should include all required output fields', () => {
      const result = interpretCron({
        expression: '0 30 8 * * ?',
        includeNextTriggers: true,
        nextTriggerCount: 2,
      })
      expect(result.success).toBe(true)

      expect(result.result.originalExpression).toBeDefined()
      expect(result.result.fieldCount).toBeDefined()
      expect(result.result.description).toBeDefined()
      expect(result.result.secondsDescription).toBeDefined()
      expect(result.result.minutesDescription).toBeDefined()
      expect(result.result.hoursDescription).toBeDefined()
      expect(result.result.dayOfMonthDescription).toBeDefined()
      expect(result.result.monthDescription).toBeDefined()
      expect(result.result.dayOfWeekDescription).toBeDefined()
      expect(result.result.nextTriggerTimes).toBeDefined()
      expect(result.result.nextTriggerTimes.length).toBe(2)
    })

    test('should use default params when not provided', () => {
      const result = interpretCron({ expression: '0 0 12 * * ?' })
      expect(result.success).toBe(true)
      expect(result.result.nextTriggerTimes.length).toBe(0)
    })
  })
})
