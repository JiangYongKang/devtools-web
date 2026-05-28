import { describe, test, expect } from 'vitest'
import {
  createRandomGenerator,
  isInsideUnitCircle,
  estimatePi,
  absoluteError,
  mergeWorkerResults,
  mergeBatchResults,
  getFixedSeeds,
} from '../logic/pi-estimator.js'

describe('createRandomGenerator', () => {
  test('相同种子生成相同序列', () => {
    const rng1 = createRandomGenerator(12345)
    const rng2 = createRandomGenerator(12345)
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  test('不同种子生成不同序列', () => {
    const rng1 = createRandomGenerator(12345)
    const rng2 = createRandomGenerator(54321)
    let sameCount = 0
    for (let i = 0; i < 10; i++) {
      if (rng1() === rng2()) sameCount++
    }
    expect(sameCount).toBeLessThan(5)
  })

  test('生成值在 [0,1) 范围内', () => {
    const rng = createRandomGenerator(12345)
    for (let i = 0; i < 1000; i++) {
      const val = rng()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })
})

describe('isInsideUnitCircle', () => {
  test('原点在圆内', () => {
    expect(isInsideUnitCircle(0, 0)).toBe(true)
  })

  test('(1,0) 在圆上（边界）', () => {
    expect(isInsideUnitCircle(1, 0)).toBe(true)
  })

  test('(0.5, 0.5) 在圆内', () => {
    expect(isInsideUnitCircle(0.5, 0.5)).toBe(true)
  })

  test('(1,1) 在圆外', () => {
    expect(isInsideUnitCircle(1, 1)).toBe(false)
  })

  test('(0.7, 0.7) 在圆内 (0.7² + 0.7² = 0.98 < 1)', () => {
    expect(isInsideUnitCircle(0.7, 0.7)).toBe(true)
  })
})

describe('estimatePi', () => {
  test('n=0 返回 0', () => {
    expect(estimatePi(0, 0)).toBe(0)
  })

  test('全部命中时 π ≈ 4', () => {
    expect(estimatePi(100, 100)).toBe(4)
  })

  test('785/1000 ≈ 3.14', () => {
    expect(estimatePi(785, 1000)).toBeCloseTo(3.14, 1)
  })

  test('理论命中率 π/4 ≈ 0.7854', () => {
    const hits = Math.round((Math.PI / 4) * 10000)
    expect(estimatePi(hits, 10000)).toBeCloseTo(Math.PI, 1)
  })
})

describe('absoluteError', () => {
  test('完全准确时误差为 0', () => {
    expect(absoluteError(Math.PI)).toBe(0)
  })

  test('误差计算正确', () => {
    expect(absoluteError(3)).toBeCloseTo(0.14159, 5)
  })

  test('对称误差相同', () => {
    expect(absoluteError(Math.PI + 0.5)).toBe(absoluteError(Math.PI - 0.5))
  })
})

describe('mergeWorkerResults', () => {
  test('空数组返回零', () => {
    expect(mergeWorkerResults([])).toEqual({ totalN: 0, totalHits: 0 })
  })

  test('单个结果直接返回', () => {
    expect(mergeWorkerResults([{ n: 100, hits: 78 }])).toEqual({ totalN: 100, totalHits: 78 })
  })

  test('多个结果正确合并', () => {
    const results = [
      { n: 100, hits: 78 },
      { n: 200, hits: 157 },
      { n: 300, hits: 235 },
    ]
    expect(mergeWorkerResults(results)).toEqual({ totalN: 600, totalHits: 470 })
  })
})

describe('mergeBatchResults', () => {
  test('正确累加结果', () => {
    const current = { totalN: 100, totalHits: 78 }
    const batch = { n: 50, hits: 39 }
    expect(mergeBatchResults(current, batch)).toEqual({ totalN: 150, totalHits: 117 })
  })
})

describe('getFixedSeeds', () => {
  test('返回非空数组', () => {
    const seeds = getFixedSeeds()
    expect(Array.isArray(seeds)).toBe(true)
    expect(seeds.length).toBeGreaterThan(0)
  })

  test('种子为正整数', () => {
    const seeds = getFixedSeeds()
    seeds.forEach((seed) => {
      expect(seed).toBeGreaterThan(0)
      expect(Number.isInteger(seed)).toBe(true)
    })
  })
})
