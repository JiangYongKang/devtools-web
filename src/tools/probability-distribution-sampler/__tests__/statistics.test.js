import { describe, test, expect } from 'vitest'
import { computeStatistics, createIncrementalStats } from '../logic/statistics.js'
import { sturgesRule, freedmanDiaconis, computeHistogram, normalCDF } from '../logic/histogram.js'

describe('在线统计算法', () => {
  test('空数组返回零统计量', () => {
    const stats = computeStatistics([])
    expect(stats.count).toBe(0)
    expect(stats.mean).toBe(0)
    expect(stats.variance).toBe(0)
  })

  test('单元素数组', () => {
    const stats = computeStatistics([5])
    expect(stats.count).toBe(1)
    expect(stats.mean).toBe(5)
    expect(stats.variance).toBe(0)
    expect(stats.min).toBe(5)
    expect(stats.max).toBe(5)
  })

  test('已知数据集的均值和方差', () => {
    const data = [1, 2, 3, 4, 5]
    const stats = computeStatistics(data)
    expect(stats.mean).toBe(3)
    expect(stats.variance).toBe(2.5)
    expect(stats.std).toBeCloseTo(1.5811, 3)
    expect(stats.min).toBe(1)
    expect(stats.max).toBe(5)
  })

  test('大对称数据集偏度接近零', () => {
    const data = []
    for (let i = -500; i <= 500; i++) {
      data.push(i)
    }
    const stats = computeStatistics(data)
    expect(stats.skewness).toBeCloseTo(0, 2)
  })
})

describe('增量统计计算', () => {
  test('增量计算与批量计算结果一致', () => {
    const data = Array.from({ length: 100 }, (_, i) => i)
    const batchStats = computeStatistics(data)

    const incremental = createIncrementalStats()
    for (const x of data) {
      incremental.add(x)
    }
    const incStats = incremental.get()

    expect(incStats.mean).toBeCloseTo(batchStats.mean, 10)
    expect(incStats.variance).toBeCloseTo(batchStats.variance, 10)
    expect(incStats.count).toBe(batchStats.count)
  })
})

describe('直方图 bin 算法', () => {
  test('Sturges 规则', () => {
    expect(sturgesRule(100)).toBeGreaterThan(5)
    expect(sturgesRule(1000)).toBeGreaterThan(sturgesRule(100))
    expect(Number.isInteger(sturgesRule(100))).toBe(true)
  })

  test('Freedman-Diaconis 返回正数', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const width = freedmanDiaconis(data)
    expect(width).toBeGreaterThan(0)
  })
})

describe('直方图计算', () => {
  test('空数据返回空直方图', () => {
    const hist = computeHistogram([])
    expect(hist.bins).toEqual([])
    expect(hist.counts).toEqual([])
  })

  test('直方图覆盖数据范围', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const hist = computeHistogram(data, { method: 'manual', bins: 5 })
    expect(hist.min).toBeLessThanOrEqual(Math.min(...data))
    expect(hist.max).toBeGreaterThanOrEqual(Math.max(...data))
    expect(hist.counts.length).toBe(5)
    expect(hist.counts.reduce((a, b) => a + b, 0)).toBe(data.length)
  })

  test('bin 中心数量与 count 数量一致', () => {
    const data = Array.from({ length: 100 }, () => Math.random())
    const hist = computeHistogram(data, { method: 'manual', bins: 20 })
    expect(hist.bins.length).toBe(hist.counts.length)
    expect(hist.bins.length).toBe(20)
  })
})

describe('正态 CDF', () => {
  test('标准正态 CDF 边界值', () => {
    expect(normalCDF(-10, 0, 1)).toBeCloseTo(0, 5)
    expect(normalCDF(0, 0, 1)).toBeCloseTo(0.5, 5)
    expect(normalCDF(10, 0, 1)).toBeCloseTo(1, 5)
  })

  test('标准正态 68-95-99.7 法则', () => {
    expect(normalCDF(1, 0, 1) - normalCDF(-1, 0, 1)).toBeCloseTo(0.68, 2)
    expect(normalCDF(2, 0, 1) - normalCDF(-2, 0, 1)).toBeCloseTo(0.95, 2)
    expect(normalCDF(3, 0, 1) - normalCDF(-3, 0, 1)).toBeCloseTo(0.997, 2)
  })
})
