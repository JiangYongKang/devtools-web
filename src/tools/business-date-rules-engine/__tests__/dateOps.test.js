import { describe, expect, test } from 'vitest'
import { formatDateStr } from '../logic/calendar.js'
import {
    addDateUnits,
    applyCutoff,
    dateDiff,
    parseCutoffTime,
} from '../logic/dateOps.js'

const CHINA_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: '元旦', type: 'holiday' },
]

describe('parseCutoffTime', () => {
  test('解析 HH:MM 格式', () => {
    const result = parseCutoffTime('17:30')
    expect(result.hours).toBe(17)
    expect(result.minutes).toBe(30)
  })

  test('解析整点', () => {
    const result = parseCutoffTime('09:00')
    expect(result.hours).toBe(9)
    expect(result.minutes).toBe(0)
  })
})

describe('applyCutoff - Cutoff 时间应用', () => {
  test('时间早于 cutoff 不应用', () => {
    const date = new Date(2025, 0, 15, 14, 0, 0)
    const result = applyCutoff(date, '17:00')
    expect(result.cutoffApplied).toBe(false)
    expect(formatDateStr(result.adjustedDate)).toBe('2025-01-15')
  })

  test('时间晚于 cutoff 应用，调整到下一个工作日', () => {
    const date = new Date(2025, 0, 15, 18, 0, 0)
    const result = applyCutoff(date, '17:00')
    expect(result.cutoffApplied).toBe(true)
    expect(formatDateStr(result.adjustedDate)).toBe('2025-01-16')
    expect(result.adjustedDate.getHours()).toBe(17)
    expect(result.adjustedDate.getMinutes()).toBe(0)
  })

  test('cutoff 后是周五，调整到下周一', () => {
    const date = new Date(2025, 0, 10, 18, 0, 0)
    const result = applyCutoff(date, '17:00')
    expect(result.cutoffApplied).toBe(true)
    expect(formatDateStr(result.adjustedDate)).toBe('2025-01-13')
  })

  test('cutoff 后是节假日，调整到节后第一个工作日', () => {
    const date = new Date(2024, 11, 31, 18, 0, 0)
    const result = applyCutoff(date, '17:00', CHINA_HOLIDAYS_2025)
    expect(result.cutoffApplied).toBe(true)
    expect(formatDateStr(result.adjustedDate)).toBe('2025-01-02')
  })
})

describe('addDateUnits - 日期运算主函数', () => {
  test('加 5 个工作日', () => {
    const start = new Date(2025, 0, 6, 10, 0, 0)
    const result = addDateUnits(start, 5, 'workdays', {
      timeZone: 'Asia/Shanghai',
    })
    expect(formatDateStr(result.result)).toBe('2025-01-13')
    expect(result.skippedDays).toHaveLength(2)
  })

  test('加 10 个自然日', () => {
    const start = new Date(2025, 0, 6, 10, 0, 0)
    const result = addDateUnits(start, 10, 'natural', {
      timeZone: 'Asia/Shanghai',
    })
    expect(formatDateStr(result.result)).toBe('2025-01-16')
  })

  test('减 3 个工作日', () => {
    const start = new Date(2025, 0, 15, 10, 0, 0)
    const result = addDateUnits(start, -3, 'workdays', {
      timeZone: 'Asia/Shanghai',
    })
    expect(formatDateStr(result.result)).toBe('2025-01-10')
  })

  test('应用 cutoff 加工作日', () => {
    const start = new Date(2025, 0, 10, 18, 0, 0)
    const result = addDateUnits(start, 1, 'workdays', {
      timeZone: 'Asia/Shanghai',
      cutoffTime: '17:00',
    })
    expect(result.cutoffAdjustment.cutoffApplied).toBe(true)
    expect(formatDateStr(result.result)).toBe('2025-01-14')
  })

  test('跨 DST 边界运算产生警告', () => {
    const start = new Date(Date.UTC(2025, 2, 8, 15, 0, 0)) // UTC 15:00 = NY 10:00 (3月8日)
    const result = addDateUnits(start, 2, 'natural', {
      timeZone: 'America/New_York',
    })
    expect(result.dstWarnings.length).toBeGreaterThan(0)
  })

  test('指定节假日表跳过节假日', () => {
    const start = new Date(2024, 11, 31, 10, 0, 0)
    const result = addDateUnits(start, 1, 'workdays', {
      timeZone: 'Asia/Shanghai',
      holidayTable: CHINA_HOLIDAYS_2025,
    })
    expect(formatDateStr(result.result)).toBe('2025-01-02')
    expect(result.skippedDays).toHaveLength(1)
    expect(result.skippedDays[0].reason).toBe('元旦')
  })
})

describe('dateDiff - 日期差值计算', () => {
  test('计算小时差', () => {
    const start = new Date(2025, 0, 15, 10, 0, 0)
    const end = new Date(2025, 0, 15, 14, 30, 0)
    expect(dateDiff(start, end, 'hours')).toBe(4.5)
  })

  test('计算天数差', () => {
    const start = new Date(2025, 0, 15)
    const end = new Date(2025, 0, 20)
    expect(dateDiff(start, end, 'days')).toBe(5)
  })

  test('计算工作日差', () => {
    const start = new Date(2025, 0, 10)
    const end = new Date(2025, 0, 13)
    expect(dateDiff(start, end, 'workdays')).toBe(1)
  })

  test('结束时间早于开始时间返回负数', () => {
    const start = new Date(2025, 0, 15, 14, 0, 0)
    const end = new Date(2025, 0, 15, 10, 0, 0)
    expect(dateDiff(start, end, 'hours')).toBe(-4)
  })
})
