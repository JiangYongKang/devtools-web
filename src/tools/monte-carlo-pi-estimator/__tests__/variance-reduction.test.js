import { describe, test, expect } from 'vitest'
import {
  calculateVariance,
  covariance,
  compareVarianceReduction,
  standardMonteCarlo,
  stratifiedSampling,
  antitheticVariates,
} from '../logic/variance-reduction.js'

function createRNG(seed) {
  let state = seed >>> 0
  return function random() {
    state = (1664525 * state + 1013904223) % 2 ** 32
    return state / 2 ** 32
  }
}

describe('calculateVariance', () => {
  test('空数组返回 0', () => {
    expect(calculateVariance([])).toBe(0)
  })

  test('常数列方差为 0', () => {
    expect(calculateVariance([5, 5, 5, 5])).toBe(0)
  })

  test('[0,1] 数组方差为 0.25', () => {
    expect(calculateVariance([0, 1])).toBe(0.25)
  })

  test('方差计算正确', () => {
    expect(calculateVariance([1, 2, 3, 4, 5])).toBe(2)
  })
})

describe('covariance', () => {
  test('空数组返回 0', () => {
    expect(covariance([], [])).toBe(0)
  })

  test('数组长度不同返回 0', () => {
    expect(covariance([1, 2], [1])).toBe(0)
  })

  test('正相关协方差为正', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [2, 4, 6, 8, 10]
    expect(covariance(x, y)).toBeGreaterThan(0)
  })

  test('负相关协方差为负', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [5, 4, 3, 2, 1]
    expect(covariance(x, y)).toBeLessThan(0)
  })
})

describe('standardMonteCarlo', () => {
  test('返回正确结构', () => {
    const result = standardMonteCarlo(1000, createRNG(12345))
    expect(result).toHaveProperty('hits')
    expect(result).toHaveProperty('n')
    expect(result).toHaveProperty('piEstimate')
    expect(result).toHaveProperty('variance')
    expect(result.n).toBeGreaterThan(0)
    expect(result.hits).toBeGreaterThan(0)
  })

  test('估计值接近 π', () => {
    const result = standardMonteCarlo(100000, createRNG(12345))
    expect(result.piEstimate).toBeGreaterThan(3)
    expect(result.piEstimate).toBeLessThan(3.3)
  })
})

describe('stratifiedSampling', () => {
  test('返回正确结构', () => {
    const result = stratifiedSampling(1000, 10, createRNG(12345))
    expect(result).toHaveProperty('hits')
    expect(result).toHaveProperty('n')
    expect(result).toHaveProperty('piEstimate')
    expect(result).toHaveProperty('variance')
  })

  test('分层采样产生有效结果', () => {
    const result = stratifiedSampling(10000, 10, createRNG(12345))
    expect(result.piEstimate).toBeGreaterThan(3)
    expect(result.piEstimate).toBeLessThan(3.3)
  })

  test('分层数影响实际采样数（需为格数的倍数）', () => {
    const result = stratifiedSampling(1500, 10, createRNG(12345))
    expect(result.n).toBe(10 * 10 * Math.floor(1500 / (10 * 10)))
  })
})

describe('antitheticVariates', () => {
  test('返回正确结构', () => {
    const result = antitheticVariates(500, createRNG(12345))
    expect(result).toHaveProperty('hits')
    expect(result).toHaveProperty('n')
    expect(result).toHaveProperty('piEstimate')
    expect(result).toHaveProperty('variance')
  })

  test('对偶变量产生 2n 样本', () => {
    const nPairs = 500
    const result = antitheticVariates(nPairs, createRNG(12345))
    expect(result.n).toBe(2 * nPairs)
  })

  test('估计值接近 π', () => {
    const result = antitheticVariates(50000, createRNG(12345))
    expect(result.piEstimate).toBeGreaterThan(3)
    expect(result.piEstimate).toBeLessThan(3.3)
  })
})

describe('compareVarianceReduction', () => {
  test('返回所有方法的对比结果', () => {
    const comparison = compareVarianceReduction(10000, 12345)
    expect(comparison).toHaveProperty('standard')
    expect(comparison).toHaveProperty('stratified')
    expect(comparison).toHaveProperty('antithetic')
  })

  test('每种方法包含所有字段', () => {
    const comparison = compareVarianceReduction(10000, 12345)
    const methods = ['standard', 'stratified', 'antithetic']
    methods.forEach((method) => {
      expect(comparison[method]).toHaveProperty('piEstimate')
      expect(comparison[method]).toHaveProperty('variance')
      expect(comparison[method]).toHaveProperty('standardError')
    })
  })

  test('方差缩减方法包含方差比', () => {
    const comparison = compareVarianceReduction(10000, 12345)
    expect(comparison.stratified).toHaveProperty('varianceRatio')
    expect(comparison.antithetic).toHaveProperty('varianceRatio')
  })
})
