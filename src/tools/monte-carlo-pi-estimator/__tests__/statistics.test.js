import { describe, test, expect } from 'vitest'
import {
  binomialVariance,
  standardError,
  standardErrorPi,
  Z_SCORES,
  confidenceInterval,
  containsTruePi,
  relativeError,
  estimateRequiredSampleSize,
  generateConvergencePoints,
  computeConvergenceStats,
  effectiveSampleSizeRatio,
} from '../logic/statistics.js'

describe('binomialVariance', () => {
  test('p=0 时方差为 0', () => {
    expect(binomialVariance(0)).toBe(0)
  })

  test('p=1 时方差为 0', () => {
    expect(binomialVariance(1)).toBe(0)
  })

  test('p=0.5 时方差最大', () => {
    expect(binomialVariance(0.5)).toBe(0.25)
  })

  test('p=π/4 时方差约为 0.1685', () => {
    expect(binomialVariance(Math.PI / 4)).toBeCloseTo(0.1685, 4)
  })
})

describe('standardError', () => {
  test('n=0 返回 Infinity', () => {
    expect(standardError(0.25, 0)).toBe(Infinity)
  })

  test('方差 0.25, n=100 时 SE=0.05', () => {
    expect(standardError(0.25, 100)).toBe(0.05)
  })

  test('SE 随 n 增大而减小', () => {
    expect(standardError(0.25, 100)).toBeGreaterThan(standardError(0.25, 400))
  })
})

describe('standardErrorPi', () => {
  test('n=0 返回 Infinity', () => {
    expect(standardErrorPi(0, 0)).toBe(Infinity)
  })

  test('π 估计量的标准误差是概率估计量的 4 倍', () => {
    const hits = 7854
    const n = 10000
    const p = hits / n
    const varianceP = binomialVariance(p)
    const seP = Math.sqrt(varianceP / n)
    expect(standardErrorPi(hits, n)).toBeCloseTo(4 * seP, 10)
  })
})

describe('Z_SCORES', () => {
  test('包含常用置信度', () => {
    expect(Z_SCORES['0.95']).toBe(1.96)
    expect(Z_SCORES['0.99']).toBe(2.576)
  })
})

describe('confidenceInterval', () => {
  test('95% 置信区间计算正确', () => {
    const estimate = 3.14
    const se = 0.01
    const ci = confidenceInterval(estimate, se, 0.95)
    expect(ci.lower).toBeCloseTo(3.14 - 1.96 * 0.01)
    expect(ci.upper).toBeCloseTo(3.14 + 1.96 * 0.01)
  })

  test('默认使用 95% 为默认值', () => {
    const estimate = 3.14
    const se = 0.01
    const ci1 = confidenceInterval(estimate, se)
    const ci2 = confidenceInterval(estimate, se, 0.95)
    expect(ci1.lower).toBe(ci2.lower)
    expect(ci1.upper).toBe(ci2.upper)
  })
})

describe('containsTruePi', () => {
  test('包含真实 π', () => {
    expect(containsTruePi({ lower: 3, upper: 3.5 })).toBe(true)
  })

  test('不包含真实 π', () => {
    expect(containsTruePi({ lower: 2, upper: 3 })).toBe(false)
    expect(containsTruePi({ lower: 3.3, upper: 3.5 })).toBe(false)
  })
})

describe('relativeError', () => {
  test('完全准确时误差为 0', () => {
    expect(relativeError(Math.PI)).toBe(0)
  })

  test('相对误差小于绝对误差 / π', () => {
    const est = 3
    const abs = Math.abs(est - Math.PI)
    const rel = abs / Math.PI
    expect(relativeError(est)).toBeCloseTo(rel)
  })
})

describe('estimateRequiredSampleSize', () => {
  test('目标精度越高，所需样本量越大', () => {
    const n1 = estimateRequiredSampleSize(0.01)
    const n2 = estimateRequiredSampleSize(0.001)
    expect(n2).toBeGreaterThan(n1)
  })

  test('置信度越高，所需样本量越大', () => {
    const n1 = estimateRequiredSampleSize(0.01, 0.9)
    const n2 = estimateRequiredSampleSize(0.01, 0.99)
    expect(n2).toBeGreaterThan(n1)
  })

  test('返回正整数', () => {
    const n = estimateRequiredSampleSize(0.001)
    expect(n).toBeGreaterThan(0)
    expect(Number.isInteger(n)).toBe(true)
  })
})

describe('generateConvergencePoints', () => {
  test('maxN <= 0 返回空数组', () => {
    expect(generateConvergencePoints(0)).toEqual([])
    expect(generateConvergencePoints(-1)).toEqual([])
  })

  test('返回包含 maxN', () => {
    const points = generateConvergencePoints(10000)
    expect(points[points.length - 1]).toBe(10000)
  })

  test('点按对数分布', () => {
    const points = generateConvergencePoints(1000000)
    for (let i = 1; i < points.length; i++) {
      expect(points[i]).toBeGreaterThan(points[i - 1])
    }
  })
})

describe('computeConvergenceStats', () => {
  test('计算收敛统计数据', () => {
    const data = [
      { n: 100, hits: 78, piEstimate: 3.12 },
      { n: 1000, hits: 785, piEstimate: 3.14 },
    ]
    const stats = computeConvergenceStats(data, 0.95)
    expect(stats.length).toBe(2)
    expect(stats[0].n).toBe(100)
    expect(stats[0].error).toBeDefined()
    expect(stats[0].se).toBeDefined()
    expect(stats[0].ciLower).toBeDefined()
    expect(stats[0].ciUpper).toBeDefined()
  })
})

describe('effectiveSampleSizeRatio', () => {
  test('方差缩减比率计算正确', () => {
    expect(effectiveSampleSizeRatio(0.25, 0.125)).toBe(2)
  })

  test('方差为 0 时返回 Infinity', () => {
    expect(effectiveSampleSizeRatio(0.25, 0)).toBe(Infinity)
  })
})
