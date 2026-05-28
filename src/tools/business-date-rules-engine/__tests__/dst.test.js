import { describe, test, expect } from 'vitest'
import {
  getTimezoneOffset,
  formatOffset,
  detectDSTTransition,
  checkNonExistentTime,
  checkRepeatedHour,
  checkDSTStatus,
} from '../logic/dst.js'

describe('formatOffset', () => {
  test('正偏移格式化', () => {
    expect(formatOffset(480)).toBe('+08:00')
    expect(formatOffset(0)).toBe('+00:00')
    expect(formatOffset(330)).toBe('+05:30')
  })

  test('负偏移格式化', () => {
    expect(formatOffset(-300)).toBe('-05:00')
    expect(formatOffset(-480)).toBe('-08:00')
  })
})

describe('getTimezoneOffset', () => {
  test('UTC 偏移始终为 0', () => {
    const d = new Date(2025, 0, 15)
    expect(getTimezoneOffset(d, 'UTC')).toBe(0)
  })

  test('Asia/Shanghai 偏移为 +480 分钟（+08:00）', () => {
    const d = new Date(2025, 0, 15)
    expect(getTimezoneOffset(d, 'Asia/Shanghai')).toBe(480)
  })

  test('America/New_York 冬季偏移为 -300 分钟（-05:00）', () => {
    const d = new Date(2025, 0, 15)
    expect(getTimezoneOffset(d, 'America/New_York')).toBe(-300)
  })

  test('America/New_York 夏季偏移为 -240 分钟（-04:00）', () => {
    const d = new Date(2025, 5, 15)
    expect(getTimezoneOffset(d, 'America/New_York')).toBe(-240)
  })
})

describe('detectDSTTransition - DST 边界检测', () => {
  test('普通日期无 DST 跳变', () => {
    const d = new Date(2025, 0, 15)
    const result = detectDSTTransition(d, 'America/New_York')
    expect(result.hasTransition).toBe(false)
  })

  test('America/New_York 2025 年春季向前跳变（3月9日）', () => {
    const d = new Date(Date.UTC(2025, 2, 9, 12, 0, 0))
    const result = detectDSTTransition(d, 'America/New_York')
    expect(result.hasTransition).toBe(true)
    expect(result.transitionType).toBe('spring-forward')
    expect(result.transitionInfo.offsetBefore).toBe(-300)
    expect(result.transitionInfo.offsetAfter).toBe(-240)
    expect(result.transitionInfo.offsetDiff).toBe(60)
    expect(result.transitionInfo.transitionHour).toBe(2)
  })

  test('America/New_York 2025 年秋季回退（11月2日）', () => {
    const d = new Date(Date.UTC(2025, 10, 2, 12, 0, 0))
    const result = detectDSTTransition(d, 'America/New_York')
    expect(result.hasTransition).toBe(true)
    expect(result.transitionType).toBe('fall-back')
    expect(result.transitionInfo.offsetBefore).toBe(-240)
    expect(result.transitionInfo.offsetAfter).toBe(-300)
    expect(result.transitionInfo.offsetDiff).toBe(-60)
    expect(result.transitionInfo.transitionHour).toBe(1)
  })

  test('Europe/London 2025 年春季向前跳变（3月30日）', () => {
    const d = new Date(Date.UTC(2025, 2, 30, 12, 0, 0))
    const result = detectDSTTransition(d, 'Europe/London')
    expect(result.hasTransition).toBe(true)
    expect(result.transitionType).toBe('spring-forward')
    expect(result.transitionInfo.transitionHour).toBe(1)
  })

  test('Europe/London 2025 年秋季回退（10月26日）', () => {
    const d = new Date(Date.UTC(2025, 9, 26, 12, 0, 0))
    const result = detectDSTTransition(d, 'Europe/London')
    expect(result.hasTransition).toBe(true)
    expect(result.transitionType).toBe('fall-back')
    expect(result.transitionInfo.transitionHour).toBe(1)
  })

  test('Asia/Shanghai 无 DST', () => {
    const d = new Date(Date.UTC(2025, 2, 9, 12, 0, 0))
    const result = detectDSTTransition(d, 'Asia/Shanghai')
    expect(result.hasTransition).toBe(false)
  })
})

describe('checkNonExistentTime - 不存在的时间检测', () => {
  test('America/New_York 2025-03-09 02:30 不存在', () => {
    const result = checkNonExistentTime(2025, 3, 9, 2, 'America/New_York')
    expect(result.isNonExistent).toBe(true)
    expect(result.warning).toContain('不存在')
    expect(result.info.suggestion).toContain('03:00')
  })

  test('America/New_York 2025-03-09 01:30 存在（跳变前）', () => {
    const result = checkNonExistentTime(2025, 3, 9, 1, 'America/New_York')
    expect(result.isNonExistent).toBe(false)
  })

  test('America/New_York 2025-03-09 03:30 存在（跳变后）', () => {
    const result = checkNonExistentTime(2025, 3, 9, 3, 'America/New_York')
    expect(result.isNonExistent).toBe(false)
  })

  test('非 DST 日期返回 false', () => {
    const result = checkNonExistentTime(2025, 1, 15, 12, 'America/New_York')
    expect(result.isNonExistent).toBe(false)
  })

  test('无 DST 时区返回 false', () => {
    const result = checkNonExistentTime(2025, 3, 9, 2, 'Asia/Shanghai')
    expect(result.isNonExistent).toBe(false)
  })
})

describe('checkRepeatedHour - 重复小时检测', () => {
  test('America/New_York 2025-11-02 01:30 重复', () => {
    const result = checkRepeatedHour(2025, 11, 2, 1, 'America/New_York')
    expect(result.isRepeated).toBe(true)
    expect(result.warning).toContain('出现两次')
    expect(result.info.occurrence1).toContain('第 1 次')
    expect(result.info.occurrence2).toContain('第 2 次')
  })

  test('America/New_York 2025-11-02 00:30 不重复（回退前）', () => {
    const result = checkRepeatedHour(2025, 11, 2, 0, 'America/New_York')
    expect(result.isRepeated).toBe(false)
  })

  test('America/New_York 2025-11-02 02:30 不重复（回退后）', () => {
    const result = checkRepeatedHour(2025, 11, 2, 2, 'America/New_York')
    expect(result.isRepeated).toBe(false)
  })

  test('非 DST 日期返回 false', () => {
    const result = checkRepeatedHour(2025, 1, 15, 12, 'America/New_York')
    expect(result.isRepeated).toBe(false)
  })

  test('无 DST 时区返回 false', () => {
    const result = checkRepeatedHour(2025, 11, 2, 1, 'Asia/Shanghai')
    expect(result.isRepeated).toBe(false)
  })
})

describe('checkDSTStatus - 完整 DST 状态检查', () => {
  test('普通日期只返回偏移', () => {
    const d = new Date(Date.UTC(2025, 0, 15, 17, 0, 0)) // UTC 17:00 = NY 12:00 (冬季)
    const result = checkDSTStatus(d, 'America/New_York')
    expect(result.offset).toBe('-05:00')
    expect(result.transition).toBeUndefined()
    expect(result.nonExistent).toBeUndefined()
    expect(result.repeated).toBeUndefined()
  })

  test('DST 跳变日返回 transition 信息', () => {
    const d = new Date(Date.UTC(2025, 2, 9, 16, 0, 0)) // UTC 16:00 = NY 12:00 (EDT, 跳变后)
    const result = checkDSTStatus(d, 'America/New_York')
    expect(result.offset).toBe('-04:00')
    expect(result.transition).toBeDefined()
    expect(result.transition.hasTransition).toBe(true)
    expect(result.transition.transitionType).toBe('spring-forward')
  })

  test('DST 跳变日前返回 transition 信息', () => {
    const d = new Date(Date.UTC(2025, 2, 9, 6, 0, 0)) // UTC 06:00 = NY 01:00 (EST, 跳变前)
    const result = checkDSTStatus(d, 'America/New_York')
    expect(result.offset).toBe('-05:00')
    expect(result.transition).toBeDefined()
    expect(result.transition.hasTransition).toBe(true)
  })

  test('重复小时日（fall-back）返回 transition 信息', () => {
    const d = new Date(Date.UTC(2025, 10, 2, 6, 0, 0)) // UTC 06:00 = NY 01:00 (第2次，EST)
    const result = checkDSTStatus(d, 'America/New_York')
    expect(result.offset).toBe('-05:00')
    expect(result.transition).toBeDefined()
    expect(result.transition.transitionType).toBe('fall-back')
  })
})
