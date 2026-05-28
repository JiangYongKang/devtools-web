import { describe, test, expect } from 'vitest'
import {
  generateSample,
  getTheoreticalMoments,
  sampleUniform,
  sampleNormal,
  samplePoisson,
  sampleBinomial,
  sampleExponential,
  DISTRIBUTION_TYPES,
} from '../logic/distributions.js'
import { createPRNG } from '../logic/prng.js'
import { computeStatistics } from '../logic/statistics.js'

describe('分布采样 - 矩检验', () => {
  const SEED = 42
  const LARGE_N = 50000

  test('均匀分布 - 统计矩接近理论值', () => {
    const params = { min: 0, max: 10 }
    const data = generateSample(DISTRIBUTION_TYPES.UNIFORM, params, LARGE_N, SEED)
    const stats = computeStatistics(data)
    const theoretical = getTheoreticalMoments(DISTRIBUTION_TYPES.UNIFORM, params)

    expect(stats.mean).toBeCloseTo(theoretical.mean, 1)
    expect(stats.variance).toBeCloseTo(theoretical.variance, 1)
    expect(stats.skewness).toBeCloseTo(theoretical.skewness, 0)
  })

  test('正态分布 - 统计矩接近理论值', () => {
    const params = { mean: 5, std: 2 }
    const data = generateSample(DISTRIBUTION_TYPES.NORMAL, params, LARGE_N, SEED)
    const stats = computeStatistics(data)
    const theoretical = getTheoreticalMoments(DISTRIBUTION_TYPES.NORMAL, params)

    expect(stats.mean).toBeCloseTo(theoretical.mean, 1)
    expect(stats.variance).toBeCloseTo(theoretical.variance, 1)
    expect(stats.skewness).toBeCloseTo(theoretical.skewness, 0)
    expect(stats.kurtosis).toBeCloseTo(theoretical.kurtosis, 0)
  })

  test('泊松分布 - 统计矩接近理论值', () => {
    const params = { lambda: 10 }
    const data = generateSample(DISTRIBUTION_TYPES.POISSON, params, LARGE_N, SEED)
    const stats = computeStatistics(data)
    const theoretical = getTheoreticalMoments(DISTRIBUTION_TYPES.POISSON, params)

    expect(stats.mean).toBeCloseTo(theoretical.mean, 0)
    expect(stats.variance).toBeCloseTo(theoretical.variance, 0)
  })

  test('二项分布 - 统计矩接近理论值', () => {
    const params = { n: 20, p: 0.3 }
    const data = generateSample(DISTRIBUTION_TYPES.BINOMIAL, params, LARGE_N, SEED)
    const stats = computeStatistics(data)
    const theoretical = getTheoreticalMoments(DISTRIBUTION_TYPES.BINOMIAL, params)

    expect(stats.mean).toBeCloseTo(theoretical.mean, 0)
    expect(stats.variance).toBeCloseTo(theoretical.variance, 0)
  })

  test('指数分布 - 统计矩接近理论值', () => {
    const params = { lambda: 2 }
    const data = generateSample(DISTRIBUTION_TYPES.EXPONENTIAL, params, LARGE_N, SEED)
    const stats = computeStatistics(data)
    const theoretical = getTheoreticalMoments(DISTRIBUTION_TYPES.EXPONENTIAL, params)

    expect(stats.mean).toBeCloseTo(theoretical.mean, 1)
    expect(stats.variance).toBeCloseTo(theoretical.variance, 0)
    expect(stats.skewness).toBeCloseTo(theoretical.skewness, 0)
  })
})

describe('各分布采样函数', () => {
  const prng = createPRNG(12345)

  test('均匀分布在指定范围内', () => {
    const data = sampleUniform(prng, 2, 5, 1000)
    expect(data).toHaveLength(1000)
    for (const x of data) {
      expect(x).toBeGreaterThanOrEqual(2)
      expect(x).toBeLessThan(5)
    }
  })

  test('正态分布大部分在 3σ 范围内', () => {
    const mean = 10
    const std = 2
    const data = sampleNormal(prng, mean, std, 1000)
    let inRange = 0
    for (const x of data) {
      if (x >= mean - 3 * std && x <= mean + 3 * std) inRange++
    }
    expect(inRange / 1000).toBeGreaterThan(0.97)
  })

  test('泊松分布为非负整数', () => {
    const data = samplePoisson(prng, 5, 100)
    for (const x of data) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(x)).toBe(true)
    }
  })

  test('二项分布在 0 到 n 之间', () => {
    const n = 10
    const data = sampleBinomial(prng, n, 0.5, 100)
    for (const x of data) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(n)
      expect(Number.isInteger(x)).toBe(true)
    }
  })

  test('指数分布非负', () => {
    const data = sampleExponential(prng, 1, 1000)
    for (const x of data) {
      expect(x).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('种子可复现 - 跨调用验证', () => {
  test('相同种子生成相同样本', () => {
    const sample1 = generateSample(DISTRIBUTION_TYPES.NORMAL, { mean: 0, std: 1 }, 1000, 999)
    const sample2 = generateSample(DISTRIBUTION_TYPES.NORMAL, { mean: 0, std: 1 }, 1000, 999)
    expect(sample1).toEqual(sample2)
  })

  test('不同种子生成不同样本', () => {
    const sample1 = generateSample(DISTRIBUTION_TYPES.NORMAL, { mean: 0, std: 1 }, 1000, 111)
    const sample2 = generateSample(DISTRIBUTION_TYPES.NORMAL, { mean: 0, std: 1 }, 1000, 222)
    expect(sample1).not.toEqual(sample2)
  })
})

describe('理论矩计算', () => {
  test('均匀分布理论矩', () => {
    const moments = getTheoreticalMoments(DISTRIBUTION_TYPES.UNIFORM, { min: 0, max: 2 })
    expect(moments.mean).toBe(1)
    expect(moments.variance).toBeCloseTo(1 / 3, 5)
    expect(moments.skewness).toBe(0)
  })

  test('正态分布理论矩', () => {
    const moments = getTheoreticalMoments(DISTRIBUTION_TYPES.NORMAL, { mean: 5, std: 3 })
    expect(moments.mean).toBe(5)
    expect(moments.variance).toBe(9)
    expect(moments.skewness).toBe(0)
    expect(moments.kurtosis).toBe(0)
  })

  test('泊松分布均值等于方差', () => {
    const moments = getTheoreticalMoments(DISTRIBUTION_TYPES.POISSON, { lambda: 7 })
    expect(moments.mean).toBe(7)
    expect(moments.variance).toBe(7)
  })

  test('二项分布理论矩', () => {
    const moments = getTheoreticalMoments(DISTRIBUTION_TYPES.BINOMIAL, { n: 10, p: 0.5 })
    expect(moments.mean).toBe(5)
    expect(moments.variance).toBe(2.5)
  })

  test('指数分布理论矩', () => {
    const moments = getTheoreticalMoments(DISTRIBUTION_TYPES.EXPONENTIAL, { lambda: 2 })
    expect(moments.mean).toBe(0.5)
    expect(moments.variance).toBe(0.25)
    expect(moments.skewness).toBe(2)
    expect(moments.kurtosis).toBe(6)
  })
})
