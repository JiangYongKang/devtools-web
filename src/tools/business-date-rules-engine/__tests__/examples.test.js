import { describe, test, expect } from 'vitest'
import {
  EXAMPLES,
  CHINA_HOLIDAYS_2025,
  US_HOLIDAYS_2025,
  US_DST_EXAMPLES_2025,
  CROSS_MONTH_WORKDAY_EXAMPLE,
} from '../logic/examples.js'
import { addWorkdays, formatDateStr } from '../logic/calendar.js'
import { detectDSTTransition, checkNonExistentTime, checkRepeatedHour } from '../logic/dst.js'

describe('内置示例验证', () => {
  test('中国法定假日样表不为空', () => {
    expect(CHINA_HOLIDAYS_2025.length).toBeGreaterThan(0)
    expect(CHINA_HOLIDAYS_2025[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('美国联邦节假日样表不为空', () => {
    expect(US_HOLIDAYS_2025.length).toBeGreaterThan(0)
  })

  test('US DST 示例配置正确', () => {
    expect(US_DST_EXAMPLES_2025.springForward.date).toBe('2025-03-09')
    expect(US_DST_EXAMPLES_2025.fallBack.date).toBe('2025-11-02')
  })

  test('跨月工作日示例配置正确', () => {
    expect(CROSS_MONTH_WORKDAY_EXAMPLE.startDate).toBe('2025-09-22')
    expect(CROSS_MONTH_WORKDAY_EXAMPLE.addWorkdays).toBe(10)
    expect(CROSS_MONTH_WORKDAY_EXAMPLE.expectedResult).toBe('2025-10-10')
  })

  test('EXAMPLES 数组包含三个示例', () => {
    expect(EXAMPLES).toHaveLength(3)
    expect(EXAMPLES[0].id).toBe('china-holidays')
    expect(EXAMPLES[1].id).toBe('us-dst-transition')
    expect(EXAMPLES[2].id).toBe('cross-month-workdays')
  })

  test('中国节假日样表包含静态日期声明', () => {
    const springFestival = CHINA_HOLIDAYS_2025.find((h) => h.name?.includes('春节'))
    expect(springFestival).toBeDefined()
    expect(springFestival.note).toContain('不包含农历算法')
  })

  test('跨月加 10 个工作日示例计算正确', () => {
    const start = new Date(2025, 8, 22, 10, 0, 0)
    const holidayTable = CHINA_HOLIDAYS_2025.filter((h) =>
      h.date >= '2025-09-01' && h.date <= '2025-10-31'
    )
    const result = addWorkdays(start, 10, holidayTable)
    expect(formatDateStr(result.date)).toBe('2025-10-10')
  })

  test('US DST 春季跳变示例检测正确', () => {
    const d = new Date(Date.UTC(2025, 2, 9, 12, 0, 0))
    const result = detectDSTTransition(d, 'America/New_York')
    expect(result.hasTransition).toBe(true)
    expect(result.transitionType).toBe('spring-forward')

    const nonExistent = checkNonExistentTime(2025, 3, 9, 2, 'America/New_York')
    expect(nonExistent.isNonExistent).toBe(true)
  })

  test('US DST 秋季回退示例检测正确', () => {
    const d = new Date(Date.UTC(2025, 10, 2, 12, 0, 0))
    const result = detectDSTTransition(d, 'America/New_York')
    expect(result.hasTransition).toBe(true)
    expect(result.transitionType).toBe('fall-back')

    const repeated = checkRepeatedHour(2025, 11, 2, 1, 'America/New_York')
    expect(repeated.isRepeated).toBe(true)
  })

  test('示例包含必要的预设字段', () => {
    EXAMPLES.forEach((example) => {
      expect(example).toHaveProperty('id')
      expect(example).toHaveProperty('name')
      expect(example).toHaveProperty('description')
      expect(example).toHaveProperty('holidayTable')
      expect(example).toHaveProperty('preset')
      expect(example.preset).toHaveProperty('startDate')
      expect(example.preset).toHaveProperty('startTime')
      expect(example.preset).toHaveProperty('timeZone')
    })
  })
})
