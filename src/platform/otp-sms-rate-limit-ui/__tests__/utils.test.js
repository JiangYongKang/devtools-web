import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateProgress,
  calculateRemainingCooldown,
  clamp,
  createMonotonicClock,
  createSnapshot,
  formatRemainingSeconds,
  msToSeconds,
  secondsToMs,
  validateConfig,
} from '../logic/index.js'

describe('Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('msToSeconds should convert milliseconds to seconds rounding up', () => {
    expect(msToSeconds(1000)).toBe(1)
    expect(msToSeconds(1001)).toBe(2)
    expect(msToSeconds(59999)).toBe(60)
    expect(msToSeconds(0)).toBe(0)
  })

  test('secondsToMs should convert seconds to milliseconds', () => {
    expect(secondsToMs(1)).toBe(1000)
    expect(secondsToMs(60)).toBe(60000)
    expect(secondsToMs(0)).toBe(0)
  })

  test('formatRemainingSeconds should format remaining time correctly', () => {
    expect(formatRemainingSeconds(30000)).toBe('30秒')
    expect(formatRemainingSeconds(60000)).toBe('1分钟')
    expect(formatRemainingSeconds(65000)).toBe('1分5秒')
    expect(formatRemainingSeconds(125000)).toBe('2分5秒')
    expect(formatRemainingSeconds(0)).toBe('0秒')
  })

  test('clamp should restrict value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })

  test('calculateProgress should calculate correct progress percentage', () => {
    const startTime = 0
    const endTime = 10000

    expect(calculateProgress(startTime, endTime, 0)).toBe(0)
    expect(calculateProgress(startTime, endTime, 5000)).toBe(0.5)
    expect(calculateProgress(startTime, endTime, 10000)).toBe(1)
    expect(calculateProgress(startTime, endTime, 15000)).toBe(1)
  })

  test('calculateRemainingCooldown should calculate remaining cooldown correctly', () => {
    const startTime = 0
    const cooldownMs = 10000

    expect(calculateRemainingCooldown(startTime, cooldownMs, 0)).toBe(10000)
    expect(calculateRemainingCooldown(startTime, cooldownMs, 5000)).toBe(5000)
    expect(calculateRemainingCooldown(startTime, cooldownMs, 10000)).toBe(0)
    expect(calculateRemainingCooldown(startTime, cooldownMs, 15000)).toBe(0)
  })

  test('createMonotonicClock should return increasing timestamps', () => {
    const clock = createMonotonicClock()
    const t1 = clock.now()
    const t2 = clock.now()

    expect(t2).toBeGreaterThanOrEqual(t1)
  })

  test('createMonotonicClock should throw on clock rollback (simulated)', () => {
    const clock = createMonotonicClock()
    const originalNow = performance.now

    let callCount = 0
    Object.defineProperty(performance, 'now', {
      value: () => {
        callCount++
        if (callCount === 1) return 1000
        return 500
      },
    })

    clock.now()

    Object.defineProperty(performance, 'now', { value: originalNow })
  })

  test('createSnapshot should include version and timestamp', () => {
    const snapshot = createSnapshot({ foo: 'bar' })
    expect(snapshot.version).toBeDefined()
    expect(snapshot.timestamp).toBeDefined()
    expect(snapshot.foo).toBe('bar')
  })

  test('validateConfig should merge with defaults and validate', () => {
    const defaults = { a: 1, b: 2 }
    const config = { a: 10 }

    const result = validateConfig(config, defaults)
    expect(result.a).toBe(10)
    expect(result.b).toBe(2)
  })

  test('validateConfig should throw for non-numeric values', () => {
    const defaults = { a: 1 }
    const config = { a: 'not-a-number' }

    expect(() => validateConfig(config, defaults)).toThrow()
  })
})
