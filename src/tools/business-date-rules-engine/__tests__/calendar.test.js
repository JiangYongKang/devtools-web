import { describe, test, expect } from 'vitest'
import {
  parseDateStr,
  formatDateStr,
  isIsoWorkday,
  isWeekend,
  isWorkday,
  addWorkdays,
  addNaturalDays,
  countWorkdaysBetween,
} from '../logic/calendar.js'

const CHINA_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: '元旦', type: 'holiday' },
  { date: '2025-01-28', name: '除夕', type: 'holiday' },
  { date: '2025-01-29', name: '春节', type: 'holiday' },
  { date: '2025-01-30', name: '春节假期', type: 'holiday' },
  { date: '2025-01-31', name: '春节假期', type: 'holiday' },
  { date: '2025-02-01', name: '春节假期', type: 'holiday' },
  { date: '2025-02-02', name: '春节假期', type: 'holiday' },
  { date: '2025-02-04', name: '春节调休上班', type: 'workday' },
]

describe('parseDateStr / formatDateStr', () => {
  test('解析 YYYY-MM-DD 为 Date 对象', () => {
    const d = parseDateStr('2025-01-15')
    expect(d.getFullYear()).toBe(2025)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(15)
  })

  test('格式化 Date 为 YYYY-MM-DD', () => {
    const d = new Date(2025, 0, 15)
    expect(formatDateStr(d)).toBe('2025-01-15')
  })

  test('月日补零正确', () => {
    const d = new Date(2025, 0, 5)
    expect(formatDateStr(d)).toBe('2025-01-05')
  })
})

describe('isIsoWorkday / isWeekend', () => {
  test('周一为工作日', () => {
    const d = new Date(2025, 0, 6) // 2025-01-06 周一
    expect(isIsoWorkday(d)).toBe(true)
    expect(isWeekend(d)).toBe(false)
  })

  test('周五为工作日', () => {
    const d = new Date(2025, 0, 10) // 2025-01-10 周五
    expect(isIsoWorkday(d)).toBe(true)
    expect(isWeekend(d)).toBe(false)
  })

  test('周六为周末', () => {
    const d = new Date(2025, 0, 11) // 2025-01-11 周六
    expect(isIsoWorkday(d)).toBe(false)
    expect(isWeekend(d)).toBe(true)
  })

  test('周日为周末', () => {
    const d = new Date(2025, 0, 12) // 2025-01-12 周日
    expect(isIsoWorkday(d)).toBe(false)
    expect(isWeekend(d)).toBe(true)
  })
})

describe('isWorkday with holiday table', () => {
  test('普通工作日返回 true', () => {
    const d = new Date(2025, 0, 15) // 2025-01-15 周三
    expect(isWorkday(d, CHINA_HOLIDAYS_2025)).toBe(true)
  })

  test('节假日返回 false', () => {
    const d = new Date(2025, 0, 1) // 2025-01-01 元旦（周三）
    expect(isWorkday(d, CHINA_HOLIDAYS_2025)).toBe(false)
  })

  test('调休工作日（周六）返回 true', () => {
    const d = new Date(2025, 1, 4) // 2025-02-04 周二，实际是调休上班
    expect(isWorkday(d, CHINA_HOLIDAYS_2025)).toBe(true)
  })

  test('无节假日表时使用 ISO 规则', () => {
    const weekday = new Date(2025, 0, 15) // 周三
    const weekend = new Date(2025, 0, 11) // 周六
    expect(isWorkday(weekday)).toBe(true)
    expect(isWorkday(weekend)).toBe(false)
  })
})

describe('addNaturalDays', () => {
  test('向后加自然日', () => {
    const start = new Date(2025, 0, 1)
    const result = addNaturalDays(start, 5)
    expect(result.getDate()).toBe(6)
  })

  test('向前减自然日', () => {
    const start = new Date(2025, 0, 10)
    const result = addNaturalDays(start, -3)
    expect(result.getDate()).toBe(7)
  })

  test('跨月加自然日', () => {
    const start = new Date(2025, 0, 30)
    const result = addNaturalDays(start, 5)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(4)
  })
})

describe('addWorkdays - 工作日滚动', () => {
  test('加 1 个工作日（周一到周二）', () => {
    const start = new Date(2025, 0, 6) // 周一
    const result = addWorkdays(start, 1)
    expect(formatDateStr(result.date)).toBe('2025-01-07')
    expect(result.skippedDays).toHaveLength(0)
  })

  test('加 1 个工作日（周五到下周一）', () => {
    const start = new Date(2025, 0, 10) // 周五
    const result = addWorkdays(start, 1)
    expect(formatDateStr(result.date)).toBe('2025-01-13')
    expect(result.skippedDays).toHaveLength(2)
    expect(result.skippedDays[0].reason).toBe('周末')
  })

  test('加 5 个工作日跳过周末', () => {
    const start = new Date(2025, 0, 6) // 周一
    const result = addWorkdays(start, 5)
    expect(formatDateStr(result.date)).toBe('2025-01-13')
    expect(result.skippedDays).toHaveLength(2)
  })

  test('加 10 个工作日跨多个周末', () => {
    const start = new Date(2025, 0, 6) // 周一
    const result = addWorkdays(start, 10)
    expect(formatDateStr(result.date)).toBe('2025-01-20')
    expect(result.skippedDays).toHaveLength(4)
  })

  test('加工作日跳过节假日', () => {
    const start = new Date(2024, 11, 31) // 2024-12-31 周二
    const result = addWorkdays(start, 1, CHINA_HOLIDAYS_2025)
    expect(formatDateStr(result.date)).toBe('2025-01-02')
    expect(result.skippedDays).toHaveLength(1)
    expect(result.skippedDays[0].reason).toBe('元旦')
  })

  test('春节期间加工作日跳过假期', () => {
    const start = new Date(2025, 0, 27) // 2025-01-27 周一
    const result = addWorkdays(start, 3, CHINA_HOLIDAYS_2025)
    expect(result.skippedDays.length).toBeGreaterThanOrEqual(5)
  })

  test('向前减工作日', () => {
    const start = new Date(2025, 0, 13) // 周一
    const result = addWorkdays(start, -1)
    expect(formatDateStr(result.date)).toBe('2025-01-10')
    expect(result.skippedDays).toHaveLength(2)
  })

  test('加 0 个工作日返回原日期', () => {
    const start = new Date(2025, 0, 15)
    const result = addWorkdays(start, 0)
    expect(formatDateStr(result.date)).toBe('2025-01-15')
    expect(result.skippedDays).toHaveLength(0)
  })
})

describe('countWorkdaysBetween', () => {
  test('计算同一周内工作日数', () => {
    const start = new Date(2025, 0, 6) // 周一
    const end = new Date(2025, 0, 10) // 周五
    expect(countWorkdaysBetween(start, end)).toBe(4)
  })

  test('计算包含周末的工作日数', () => {
    const start = new Date(2025, 0, 10) // 周五
    const end = new Date(2025, 0, 13) // 周一
    expect(countWorkdaysBetween(start, end)).toBe(1)
  })

  test('负数表示向前计算', () => {
    const start = new Date(2025, 0, 13) // 周一
    const end = new Date(2025, 0, 10) // 周五
    expect(countWorkdaysBetween(start, end)).toBe(-1)
  })

  test('同一天返回 0', () => {
    const d = new Date(2025, 0, 15)
    expect(countWorkdaysBetween(d, d)).toBe(0)
  })
})
