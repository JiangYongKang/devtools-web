import { describe, test, expect } from 'vitest'
import {
  estimatePiBuffon,
  theoreticalProbabilityBuffon,
  BUFFON_STANDARD_CONFIG,
  buffonVariance,
} from '../logic/buffon-needle.js'

describe('estimatePiBuffon', () => {
  test('hits=0 或 n=0 返回 0', () => {
    expect(estimatePiBuffon(0, 100, 1, 2)).toBe(0)
    expect(estimatePiBuffon(50, 0, 1, 2)).toBe(0)
  })

  test('标准配置下公式正确', () => {
    const { needleLength, lineSpacing } = BUFFON_STANDARD_CONFIG
    const n = 10000
    const hits = Math.round(n / Math.PI)
    const piEstimate = estimatePiBuffon(hits, n, needleLength, lineSpacing)
    expect(piEstimate).toBeCloseTo(Math.PI, 0)
  })

  test('n=hits 时 π ≈ 2l/d', () => {
    const pi = estimatePiBuffon(100, 100, 1, 1)
    expect(pi).toBe(2)
  })
})

describe('theoreticalProbabilityBuffon', () => {
  test('标准配置下概率约为 1/π', () => {
    const { needleLength, lineSpacing } = BUFFON_STANDARD_CONFIG
    const p = theoreticalProbabilityBuffon(needleLength, lineSpacing)
    expect(p).toBeCloseTo(1 / Math.PI, 5)
  })

  test('l=d 时概率为 2/π', () => {
    expect(theoreticalProbabilityBuffon(1, 1)).toBeCloseTo(2 / Math.PI, 5)
  })

  test('概率在 (0,1) 范围内', () => {
    const p = theoreticalProbabilityBuffon(1, 2)
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(1)
  })
})

describe('buffonVariance', () => {
  test('概率 0.5 时方差最大', () => {
    expect(buffonVariance(0.5)).toBe(0.25)
  })

  test('概率 0 或 1 时方差为 0', () => {
    expect(buffonVariance(0)).toBe(0)
    expect(buffonVariance(1)).toBe(0)
  })
})

describe('BUFFON_STANDARD_CONFIG', () => {
  test('配置正确', () => {
    expect(BUFFON_STANDARD_CONFIG.needleLength).toBe(1)
    expect(BUFFON_STANDARD_CONFIG.lineSpacing).toBe(2)
  })
})
