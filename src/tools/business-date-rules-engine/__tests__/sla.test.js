import { describe, test, expect } from 'vitest'
import {
  calculateSLAByHours,
  calculateSLAByWorkdays,
  checkSLAOverdue,
} from '../logic/sla.js'
import { formatDateStr } from '../logic/calendar.js'

describe('calculateSLAByHours - 按小时计算 SLA', () => {
  test('8 工作小时 SLA，当天完成', () => {
    const start = new Date(2025, 0, 15, 9, 0, 0)
    const result = calculateSLAByHours(start, 8, {
      timeZone: 'Asia/Shanghai',
      businessHours: { start: '09:00', end: '17:00' },
    })
    expect(result.deadline.getHours()).toBe(17)
    expect(formatDateStr(result.deadline)).toBe('2025-01-15')
  })

  test('16 工作小时 SLA，跨两天', () => {
    const start = new Date(2025, 0, 15, 9, 0, 0)
    const result = calculateSLAByHours(start, 16, {
      timeZone: 'Asia/Shanghai',
      businessHours: { start: '09:00', end: '17:00' },
    })
    expect(formatDateStr(result.deadline)).toBe('2025-01-16')
    expect(result.deadline.getHours()).toBe(17)
  })

  test('4 工作小时 SLA，下午开始当天完成', () => {
    const start = new Date(2025, 0, 15, 13, 0, 0)
    const result = calculateSLAByHours(start, 4, {
      timeZone: 'Asia/Shanghai',
      businessHours: { start: '09:00', end: '17:00' },
    })
    expect(result.deadline.getHours()).toBe(17)
    expect(formatDateStr(result.deadline)).toBe('2025-01-15')
  })

  test('SLA 跨周末', () => {
    const start = new Date(2025, 0, 10, 14, 0, 0)
    const result = calculateSLAByHours(start, 8, {
      timeZone: 'Asia/Shanghai',
      businessHours: { start: '09:00', end: '17:00' },
    })
    expect(formatDateStr(result.deadline)).toBe('2025-01-13')
  })

  test('生成里程碑（25%, 50%, 75%, 100%）', () => {
    const start = new Date(2025, 0, 15, 9, 0, 0)
    const result = calculateSLAByHours(start, 8, {
      timeZone: 'Asia/Shanghai',
      businessHours: { start: '09:00', end: '17:00' },
    })
    expect(result.milestones).toHaveLength(4)
    expect(result.milestones[0].percentage).toBe(25)
    expect(result.milestones[1].percentage).toBe(50)
    expect(result.milestones[2].percentage).toBe(75)
    expect(result.milestones[3].percentage).toBe(100)
  })

  test('跨 DST 边界产生警告', () => {
    const start = new Date(Date.UTC(2025, 2, 7, 14, 0, 0)) // UTC 14:00 = NY 09:00 (3月7日)
    const result = calculateSLAByHours(start, 40, {
      timeZone: 'America/New_York',
      businessHours: { start: '09:00', end: '17:00' },
    })
    expect(result.dstWarnings.length).toBeGreaterThan(0)
  })
})

describe('calculateSLAByWorkdays - 按工作日计算 SLA', () => {
  test('5 个工作日 SLA', () => {
    const start = new Date(2025, 0, 6, 10, 0, 0)
    const result = calculateSLAByWorkdays(start, 5, {
      timeZone: 'Asia/Shanghai',
    })
    expect(formatDateStr(result.deadline)).toBe('2025-01-13')
  })

  test('10 个工作日 SLA 跨周末', () => {
    const start = new Date(2025, 0, 6, 10, 0, 0)
    const result = calculateSLAByWorkdays(start, 10, {
      timeZone: 'Asia/Shanghai',
    })
    expect(formatDateStr(result.deadline)).toBe('2025-01-20')
  })

  test('截止到工作日结束时间', () => {
    const start = new Date(2025, 0, 6, 10, 0, 0)
    const result = calculateSLAByWorkdays(start, 1, {
      timeZone: 'Asia/Shanghai',
      businessHours: { start: '09:00', end: '18:00' },
      endOfDay: true,
    })
    expect(result.deadline.getHours()).toBe(18)
    expect(result.deadline.getMinutes()).toBe(0)
  })

  test('生成工作日里程碑', () => {
    const start = new Date(2025, 0, 6, 10, 0, 0)
    const result = calculateSLAByWorkdays(start, 8, {
      timeZone: 'Asia/Shanghai',
    })
    expect(result.milestones).toHaveLength(4)
    expect(result.milestones[0].workdaysFromStart).toBe(2)
    expect(result.milestones[1].workdaysFromStart).toBe(4)
    expect(result.milestones[2].workdaysFromStart).toBe(6)
    expect(result.milestones[3].workdaysFromStart).toBe(8)
  })

  test('跨月加 10 个工作日跨越国庆假期', () => {
    const holidayTable = [
      { date: '2025-10-01', name: '国庆节', type: 'holiday' },
      { date: '2025-10-02', name: '国庆假期', type: 'holiday' },
      { date: '2025-10-03', name: '国庆假期', type: 'holiday' },
      { date: '2025-10-04', name: '国庆假期', type: 'holiday' },
      { date: '2025-10-05', name: '国庆假期', type: 'holiday' },
      { date: '2025-10-06', name: '国庆假期', type: 'holiday' },
      { date: '2025-10-07', name: '国庆假期', type: 'holiday' },
      { date: '2025-09-28', name: '国庆调休上班', type: 'workday' },
      { date: '2025-10-11', name: '国庆调休上班', type: 'workday' },
    ]
    const start = new Date(2025, 8, 22, 10, 0, 0)
    const result = calculateSLAByWorkdays(start, 10, {
      timeZone: 'Asia/Shanghai',
      holidayTable,
    })
    expect(formatDateStr(result.deadline)).toBe('2025-10-10')
  })
})

describe('checkSLAOverdue - SLA 超时检查', () => {
  test('未超时', () => {
    const start = new Date(2025, 0, 15, 9, 0, 0)
    const actual = new Date(2025, 0, 15, 12, 0, 0)
    const result = checkSLAOverdue(start, actual, 8, {
      timeZone: 'Asia/Shanghai',
      businessHours: { start: '09:00', end: '17:00' },
    })
    expect(result.isOverdue).toBe(false)
    expect(result.overdueHours).toBe(0)
    expect(result.remainingHours).toBe(5)
  })

  test('已超时', () => {
    const start = new Date(2025, 0, 15, 9, 0, 0)
    const actual = new Date(2025, 0, 16, 12, 0, 0)
    const result = checkSLAOverdue(start, actual, 8, {
      timeZone: 'Asia/Shanghai',
      businessHours: { start: '09:00', end: '17:00' },
    })
    expect(result.isOverdue).toBe(true)
    expect(result.overdueHours).toBe(3)
    expect(result.remainingHours).toBe(0)
  })
})
