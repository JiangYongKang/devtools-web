import { describe, test, expect } from 'vitest'
import {
  describeSingleField,
  buildFieldDescriptions,
  buildFullDescription,
} from '../logic/description.js'
import { FIELD_DEFINITIONS } from '../logic/constants.js'
import { parseCronExpression } from '../logic/parser.js'

describe('description', () => {
  describe('describeSingleField', () => {
    const minutesDef = FIELD_DEFINITIONS.minutes
    const monthDef = FIELD_DEFINITIONS.month
    const dayOfWeekDef = FIELD_DEFINITIONS.dayOfWeek

    test('should describe wildcard in Chinese', () => {
      const fieldInfo = { raw: '*', values: Array.from({ length: 60 }, (_, i) => i) }
      const desc = describeSingleField(fieldInfo, minutesDef, 'zh')
      expect(desc).toBe('每分')
    })

    test('should describe wildcard in English', () => {
      const fieldInfo = { raw: '*', values: Array.from({ length: 60 }, (_, i) => i) }
      const desc = describeSingleField(fieldInfo, minutesDef, 'en')
      expect(desc).toBe('Every minutes')
    })

    test('should describe question mark in Chinese', () => {
      const fieldInfo = { raw: '?', values: null, isWildcard: true }
      const desc = describeSingleField(fieldInfo, FIELD_DEFINITIONS.dayOfMonth, 'zh')
      expect(desc).toContain('不指定')
    })

    test('should describe question mark in English', () => {
      const fieldInfo = { raw: '?', values: null, isWildcard: true }
      const desc = describeSingleField(fieldInfo, FIELD_DEFINITIONS.dayOfMonth, 'en')
      expect(desc).toContain('No specific')
    })

    test('should describe single value in Chinese', () => {
      const fieldInfo = { raw: '30', values: [30] }
      const desc = describeSingleField(fieldInfo, minutesDef, 'zh')
      expect(desc).toBe('分 30')
    })

    test('should describe single month value with name in Chinese', () => {
      const fieldInfo = { raw: '1', values: [1] }
      const desc = describeSingleField(fieldInfo, monthDef, 'zh')
      expect(desc).toContain('一月')
    })

    test('should describe single month value with name in English', () => {
      const fieldInfo = { raw: '1', values: [1] }
      const desc = describeSingleField(fieldInfo, monthDef, 'en')
      expect(desc).toContain('January')
    })

    test('should describe single weekday value with name in Chinese', () => {
      const fieldInfo = { raw: '1', values: [1] }
      const desc = describeSingleField(fieldInfo, dayOfWeekDef, 'zh')
      expect(desc).toContain('周一')
    })

    test('should describe single weekday value with name in English', () => {
      const fieldInfo = { raw: '1', values: [1] }
      const desc = describeSingleField(fieldInfo, dayOfWeekDef, 'en')
      expect(desc).toContain('Monday')
    })

    test('should describe multiple values in Chinese', () => {
      const fieldInfo = { raw: '0,30', values: [0, 30] }
      const desc = describeSingleField(fieldInfo, minutesDef, 'zh')
      expect(desc).toContain('分')
      expect(desc).toContain('0')
      expect(desc).toContain('30')
    })

    test('should describe multiple values in English', () => {
      const fieldInfo = { raw: '0,30', values: [0, 30] }
      const desc = describeSingleField(fieldInfo, minutesDef, 'en')
      expect(desc).toContain('Minutes')
      expect(desc).toContain('0')
      expect(desc).toContain('30')
    })
  })

  describe('buildFieldDescriptions', () => {
    test('should build field descriptions for 6-field expression', () => {
      const parseResult = parseCronExpression('0 30 12 * * ?')
      const descriptions = buildFieldDescriptions(parseResult.parsed, 'zh')

      expect(descriptions.secondsDescription).toBeDefined()
      expect(descriptions.minutesDescription).toBeDefined()
      expect(descriptions.hoursDescription).toBeDefined()
      expect(descriptions.dayOfMonthDescription).toBeDefined()
      expect(descriptions.monthDescription).toBeDefined()
      expect(descriptions.dayOfWeekDescription).toBeDefined()
    })

    test('should build field descriptions for 5-field expression', () => {
      const parseResult = parseCronExpression('30 12 * * ?')
      const descriptions = buildFieldDescriptions(parseResult.parsed, 'zh')

      expect(descriptions.secondsDescription).toBeUndefined()
      expect(descriptions.minutesDescription).toBeDefined()
      expect(descriptions.hoursDescription).toBeDefined()
    })
  })

  describe('buildFullDescription', () => {
    test('should build full Chinese description for every minute', () => {
      const parseResult = parseCronExpression('* * * * * ?')
      const desc = buildFullDescription(parseResult.parsed, 'zh')
      expect(desc).toContain('每秒')
      expect(desc).toContain('每分')
      expect(desc).toContain('每时')
    })

    test('should build full English description for every minute', () => {
      const parseResult = parseCronExpression('* * * * * ?')
      const desc = buildFullDescription(parseResult.parsed, 'en')
      expect(desc).toContain('Every seconds')
      expect(desc).toContain('Every minutes')
      expect(desc).toContain('Every hours')
    })

    test('should build description for specific time', () => {
      const parseResult = parseCronExpression('0 30 8 * * ?')
      const desc = buildFullDescription(parseResult.parsed, 'zh')
      expect(desc).toContain('秒 0')
      expect(desc).toContain('分 30')
      expect(desc).toContain('时 8')
    })

    test('should build description for specific weekday', () => {
      const parseResult = parseCronExpression('0 0 9 ? * MON-FRI')
      const desc = buildFullDescription(parseResult.parsed, 'zh')
      expect(desc).toContain('周一')
      expect(desc).toContain('周五')
    })
  })
})
