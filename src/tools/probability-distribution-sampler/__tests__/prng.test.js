import { describe, test, expect } from 'vitest'
import { createPRNG, normalizeSeed, createMulberry32 } from '../logic/prng.js'

describe('PRNG 种子可复现性', () => {
  test('相同种子生成相同序列', () => {
    const prng1 = createPRNG(42)
    const prng2 = createPRNG(42)

    const seq1 = Array.from({ length: 100 }, () => prng1.next())
    const seq2 = Array.from({ length: 100 }, () => prng2.next())

    expect(seq1).toEqual(seq2)
  })

  test('不同种子生成不同序列', () => {
    const prng1 = createPRNG(42)
    const prng2 = createPRNG(43)

    const seq1 = Array.from({ length: 100 }, () => prng1.next())
    const seq2 = Array.from({ length: 100 }, () => prng2.next())

    expect(seq1).not.toEqual(seq2)
  })

  test('normalizeSeed 处理数字种子', () => {
    expect(normalizeSeed(123)).toBe(123)
    expect(normalizeSeed(-456)).toBe(456)
    expect(normalizeSeed(3.14)).toBe(3)
  })

  test('normalizeSeed 处理字符串种子', () => {
    const seed1 = normalizeSeed('hello')
    const seed2 = normalizeSeed('hello')
    const seed3 = normalizeSeed('world')

    expect(seed1).toBe(seed2)
    expect(seed1).not.toBe(seed3)
    expect(typeof seed1).toBe('number')
  })

  test('Mulberry32 输出在 [0, 1) 区间', () => {
    const random = createMulberry32(12345)
    for (let i = 0; i < 1000; i++) {
      const val = random()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  test('nextInt 生成范围内整数', () => {
    const prng = createPRNG(999)
    for (let i = 0; i < 100; i++) {
      const val = prng.nextInt(1, 10)
      expect(val).toBeGreaterThanOrEqual(1)
      expect(val).toBeLessThanOrEqual(10)
      expect(Number.isInteger(val)).toBe(true)
    }
  })
})
