
import { describe, expect, test } from 'vitest'
import {
  aggregateLatency,
  calculatePercentile,
  calculateStats,
  calculateUptime,
} from '../logic/latency.js'

describe('calculatePercentile - table driven tests', () => {
  const testCases = [
    {
      name: 'calculates p50 for odd length array',
      values: [10, 20, 30, 40, 50],
      percentile: 50,
      expected: 30,
    },
    {
      name: 'calculates p95 for array',
      values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      percentile: 95,
      expected: 100,
    },
    {
      name: 'calculates p99 for array',
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      percentile: 99,
      expected: 20,
    },
    {
      name: 'returns null for empty array',
      values: [],
      percentile: 50,
      expected: null,
    },
    {
      name: 'returns null for null input',
      values: null,
      percentile: 50,
      expected: null,
    },
    {
      name: 'returns first element for p0',
      values: [10, 20, 30],
      percentile: 0,
      expected: 10,
    },
    {
      name: 'returns last element for p100',
      values: [10, 20, 30],
      percentile: 100,
      expected: 30,
    },
    {
      name: 'handles single element array',
      values: [42],
      percentile: 50,
      expected: 42,
    },
    {
      name: 'handles unsorted array',
      values: [50, 10, 40, 20, 30],
      percentile: 50,
      expected: 30,
    },
  ]

  testCases.forEach(({ name, values, percentile, expected }) => {
    test(name, () => {
      expect(calculatePercentile(values, percentile)).toBe(expected)
    })
  })
})

describe('calculateStats - table driven tests', () => {
  const testCases = [
    {
      name: 'calculates stats for normal array',
      values: [10, 20, 30, 40, 50],
      expected: {
        count: 5,
        min: 10,
        max: 50,
        avg: 30,
        median: 30,
        p95: 50,
        p99: 50,
        sum: 150,
      },
    },
    {
      name: 'returns null stats for empty array',
      values: [],
      expected: {
        count: 0,
        min: null,
        max: null,
        avg: null,
        median: null,
        p95: null,
        p99: null,
        sum: 0,
      },
    },
    {
      name: 'handles single value',
      values: [100],
      expected: {
        count: 1,
        min: 100,
        max: 100,
        avg: 100,
        median: 100,
        p95: 100,
        p99: 100,
        sum: 100,
      },
    },
    {
      name: 'handles duplicate values',
      values: [10, 10, 10, 10],
      expected: {
        count: 4,
        min: 10,
        max: 10,
        avg: 10,
        median: 10,
        p95: 10,
        p99: 10,
        sum: 40,
      },
    },
  ]

  testCases.forEach(({ name, values, expected }) => {
    test(name, () => {
      expect(calculateStats(values)).toEqual(expected)
    })
  })
})

describe('aggregateLatency', () => {
  test('returns aggregated data with history and stats', () => {
    const samples = [10, 20, 30, 40, 50]
    const result = aggregateLatency(samples)

    expect(result.recent).toEqual([10, 20, 30, 40, 50])
    expect(result.stats).toEqual({
      count: 5,
      min: 10,
      max: 50,
      avg: 30,
      median: 30,
      p95: 50,
      p99: 50,
      sum: 150,
    })
  })

  test('filters out invalid samples', () => {
    const samples = [10, null, 20, undefined, 30, NaN, '40', 50]
    const result = aggregateLatency(samples)

    expect(result.recent).toEqual([10, 20, 30, 50])
    expect(result.stats.count).toBe(4)
  })

  test('handles empty array', () => {
    const result = aggregateLatency([])

    expect(result.recent).toEqual([])
    expect(result.stats.count).toBe(0)
  })
})

describe('calculateUptime', () => {
  test('calculates 100% uptime for all success', () => {
    const results = [
      { success: true },
      { success: true },
      { success: true },
    ]

    expect(calculateUptime(results)).toEqual({
      uptimePercent: 100,
      total: 3,
      success: 3,
      failed: 0,
    })
  })

  test('calculates 0% uptime for all failures', () => {
    const results = [
      { success: false },
      { success: false },
      { success: false },
    ]

    expect(calculateUptime(results)).toEqual({
      uptimePercent: 0,
      total: 3,
      success: 0,
      failed: 3,
    })
  })

  test('calculates mixed uptime', () => {
    const results = [
      { success: true },
      { success: false },
      { success: true },
      { success: false },
    ]

    expect(calculateUptime(results)).toEqual({
      uptimePercent: 50,
      total: 4,
      success: 2,
      failed: 2,
    })
  })

  test('returns 100% for empty array', () => {
    expect(calculateUptime([])).toEqual({
      uptimePercent: 100,
      total: 0,
      success: 0,
      failed: 0,
    })
  })
})
