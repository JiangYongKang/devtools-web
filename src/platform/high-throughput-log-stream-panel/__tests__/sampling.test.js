import { describe, expect, test } from 'vitest'
import { LOG_LEVELS, SAMPLING_STRATEGIES } from '../logic/constants.js'
import { calculateInfoLossRate, sampleHeadOnly, sampleSmartError, sampleUniform, samplingPolicy } from '../logic/sampling.js'

describe('samplingPolicy', () => {
  test('当行数小于样本大小时应该返回所有行', () => {
    const logs = Array.from({ length: 50 }, (_, i) => ({ id: i, message: `log ${i}` }))
    const result = samplingPolicy(logs, { strategy: SAMPLING_STRATEGIES.UNIFORM, sampleSize: 100 })

    expect(result.sampledLines).toEqual(logs)
    expect(result.totalLines).toBe(50)
    expect(result.sampledCount).toBe(50)
    expect(result.infoLossRate).toBe(0)
  })

  test('空输入应该正确处理', () => {
    const result = samplingPolicy([], { strategy: SAMPLING_STRATEGIES.UNIFORM, sampleSize: 100 })

    expect(result.sampledLines).toEqual([])
    expect(result.totalLines).toBe(0)
    expect(result.sampledCount).toBe(0)
    expect(result.infoLossRate).toBe(0)
  })

  test('默认应该使用均匀采样', () => {
    const logs = Array.from({ length: 1000 }, (_, i) => ({ id: i, message: `log ${i}` }))
    const result = samplingPolicy(logs)

    expect(result.strategy).toBe(SAMPLING_STRATEGIES.UNIFORM)
    expect(result.sampledCount).toBe(1000)
  })
})

describe('sampleUniform', () => {
  test('应该均匀采样日志行', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({ id: i, message: `log ${i}` }))
    const result = sampleUniform(logs, 10)

    expect(result.sampledLines).toHaveLength(10)
    expect(result.strategy).toBe(SAMPLING_STRATEGIES.UNIFORM)
    expect(result.infoLossRate).toBe(0.9)
    expect(result.totalLines).toBe(100)

    expect(result.sampledLines[0].id).toBe(0)
    expect(result.sampledLines[1].id).toBe(10)
    expect(result.sampledLines[9].id).toBe(90)
  })

  test('当样本大小大于行数时应该返回所有行', () => {
    const logs = Array.from({ length: 50 }, (_, i) => ({ id: i, message: `log ${i}` }))
    const result = samplingPolicy(logs, { strategy: 'uniform', sampleSize: 100 })

    expect(result.sampledLines).toHaveLength(50)
    expect(result.infoLossRate).toBe(0)
  })

  test('样本大小为1应该正确工作', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({ id: i, message: `log ${i}` }))
    const result = sampleUniform(logs, 1)

    expect(result.sampledLines).toHaveLength(1)
    expect(result.sampledLines[0].id).toBe(0)
  })
})

describe('sampleHeadOnly', () => {
  test('应该只保留头部和尾部', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({ id: i, message: `log ${i}` }))
    const result = sampleHeadOnly(logs, 20, 5)

    expect(result.sampledLines).toHaveLength(20)
    expect(result.strategy).toBe(SAMPLING_STRATEGIES.HEAD_ONLY)

    expect(result.sampledLines[0].id).toBe(0)
    expect(result.sampledLines[4].id).toBe(4)
    expect(result.sampledLines[5].id).toBe(85)
    expect(result.sampledLines[19].id).toBe(99)
  })

  test('当头部计数大于样本大小时应该只保留头部', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({ id: i, message: `log ${i}` }))
    const result = sampleHeadOnly(logs, 10, 20)

    expect(result.sampledLines).toHaveLength(10)
    expect(result.sampledLines[0].id).toBe(0)
    expect(result.sampledLines[9].id).toBe(9)
  })

  test('零头部计数应该只保留尾部', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({ id: i, message: `log ${i}` }))
    const result = sampleHeadOnly(logs, 10, 0)

    expect(result.sampledLines).toHaveLength(10)
    expect(result.sampledLines[0].id).toBe(90)
    expect(result.sampledLines[9].id).toBe(99)
  })
})

describe('sampleSmartError', () => {
  test('应该优先保留错误行和上下文', () => {
    const logs = []
    for (let i = 0; i < 100; i++) {
      if (i === 45 || i === 50 || i === 55) {
        logs.push({ id: i, message: `Error ${i}`, level: LOG_LEVELS.ERROR })
      } else {
        logs.push({ id: i, message: `log ${i}`, level: LOG_LEVELS.INFO })
      }
    }

    const result = sampleSmartError(logs, 50, 5, 2, LOG_LEVELS.ERROR)

    expect(result.strategy).toBe(SAMPLING_STRATEGIES.SMART_ERROR)
    expect(result.errorCount).toBe(3)

    const errorIds = result.sampledLines.filter((l) => l.level === LOG_LEVELS.ERROR).map((l) => l.id)
    expect(errorIds).toContain(45)
    expect(errorIds).toContain(50)
    expect(errorIds).toContain(55)

    const sampleIds = result.sampledLines.map((l) => l.id)
    expect(sampleIds).toContain(43)
    expect(sampleIds).toContain(44)
    expect(sampleIds).toContain(46)
    expect(sampleIds).toContain(47)
  })

  test('应该保留头部和尾部', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      message: `log ${i}`,
      level: LOG_LEVELS.INFO,
    }))

    const result = sampleSmartError(logs, 50, 5, 2, LOG_LEVELS.ERROR)

    const sampleIds = result.sampledLines.map((l) => l.id)
    for (let i = 0; i < 5; i++) {
      expect(sampleIds).toContain(i)
    }
    for (let i = 95; i < 100; i++) {
      expect(sampleIds).toContain(i)
    }
  })

  test('当没有错误时应该均匀采样', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      message: `log ${i}`,
      level: LOG_LEVELS.INFO,
    }))

    const result = sampleSmartError(logs, 20, 5, 2, LOG_LEVELS.ERROR)

    expect(result.sampledLines).toHaveLength(20)
    expect(result.errorCount).toBe(0)
  })

  test('应该处理字符串日志', () => {
    const logs = Array.from({ length: 100 }, (_, i) => `log ${i}`)
    const result = sampleSmartError(logs, 20, 5, 2, LOG_LEVELS.ERROR)

    expect(result.sampledLines).toHaveLength(20)
    expect(result.errorCount).toBe(0)
  })
})

describe('calculateInfoLossRate', () => {
  test('应该计算正确的信息丢失率', () => {
    expect(calculateInfoLossRate(100, 50)).toBe(0.5)
    expect(calculateInfoLossRate(100, 100)).toBe(0)
    expect(calculateInfoLossRate(100, 10)).toBe(0.9)
    expect(calculateInfoLossRate(100, 0)).toBe(1)
  })

  test('总数为0应该返回0', () => {
    expect(calculateInfoLossRate(0, 0)).toBe(0)
  })
})
