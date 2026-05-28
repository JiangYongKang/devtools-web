import { describe, test, expect } from 'vitest'
import { findUnit, toSI, fromSI } from '../logic/units.js'
import { parseUnit, formatVector, vectorsEqual } from '../logic/parser.js'

/**
 * 温度仿射变换测试
 */
describe('温度单位定义', () => {
  test('开尔文 K 定义正确', () => {
    const K = findUnit('K')
    expect(K).toBeDefined()
    expect(K.isTemperature).toBe(true)
    expect(K.scale).toBe(1)
    expect(K.offset).toBe(0)
  })

  test('摄氏度 °C 定义正确', () => {
    const C = findUnit('°C')
    expect(C).toBeDefined()
    expect(C.isTemperature).toBe(true)
    expect(C.scale).toBe(1)
    expect(C.offset).toBe(273.15)
  })

  test('华氏度 °F 定义正确', () => {
    const F = findUnit('°F')
    expect(F).toBeDefined()
    expect(F.isTemperature).toBe(true)
    expect(F.scale).toBeCloseTo(5 / 9)
    expect(F.offset).toBeCloseTo(459.67 * (5 / 9))
  })

  test('所有温度单位量纲都是 Θ', () => {
    const tempUnits = ['K', '°C', '°F', '°R']
    for (const sym of tempUnits) {
      const unit = findUnit(sym)
      expect(unit.dimension).toEqual([0, 0, 0, 0, 1, 0, 0])
      expect(formatVector(unit.dimension)).toBe('Θ')
    }
  })
})

describe('温度到 SI (K) 的转换', () => {
  test('0 K = 0 K', () => {
    const K = findUnit('K')
    expect(toSI(0, K)).toBe(0)
  })

  test('0 °C = 273.15 K', () => {
    const C = findUnit('°C')
    expect(toSI(0, C)).toBeCloseTo(273.15)
  })

  test('100 °C = 373.15 K', () => {
    const C = findUnit('°C')
    expect(toSI(100, C)).toBeCloseTo(373.15)
  })

  test('32 °F = 273.15 K (冰点)', () => {
    const F = findUnit('°F')
    expect(toSI(32, F)).toBeCloseTo(273.15)
  })

  test('212 °F = 373.15 K (沸点)', () => {
    const F = findUnit('°F')
    expect(toSI(212, F)).toBeCloseTo(373.15)
  })

  test('-40 °F = -40 °C = 233.15 K', () => {
    const F = findUnit('°F')
    const C = findUnit('°C')
    expect(toSI(-40, F)).toBeCloseTo(233.15)
    expect(toSI(-40, C)).toBeCloseTo(233.15)
  })
})

describe('SI (K) 到温度单位的转换', () => {
  test('273.15 K = 0 °C', () => {
    const C = findUnit('°C')
    expect(fromSI(273.15, C)).toBeCloseTo(0)
  })

  test('373.15 K = 100 °C', () => {
    const C = findUnit('°C')
    expect(fromSI(373.15, C)).toBeCloseTo(100)
  })

  test('273.15 K = 32 °F', () => {
    const F = findUnit('°F')
    expect(fromSI(273.15, F)).toBeCloseTo(32)
  })

  test('373.15 K = 212 °F', () => {
    const F = findUnit('°F')
    expect(fromSI(373.15, F)).toBeCloseTo(212)
  })
})

describe('温度单位解析', () => {
  test('解析 °C 返回正确的量纲向量', () => {
    const r = parseUnit('°C')
    expect(r.ok).toBe(true)
    expect(r.result.isTemperature).toBe(true)
    expect(r.result.dimension).toEqual([0, 0, 0, 0, 1, 0, 0])
  })

  test('解析 °F 返回正确的量纲向量', () => {
    const r = parseUnit('°F')
    expect(r.ok).toBe(true)
    expect(r.result.isTemperature).toBe(true)
    expect(r.result.dimension).toEqual([0, 0, 0, 0, 1, 0, 0])
  })

  test('°C 与 °F 量纲相容（都是 Θ）', () => {
    const r1 = parseUnit('°C')
    const r2 = parseUnit('°F')
    expect(vectorsEqual(r1.result.dimension, r2.result.dimension)).toBe(true)
  })

  test('温度与长度量纲不相容', () => {
    const r1 = parseUnit('°C')
    const r2 = parseUnit('m')
    expect(vectorsEqual(r1.result.dimension, r2.result.dimension)).toBe(false)
  })
})

describe('温度 round-trip 测试', () => {
  const temps = [-40, 0, 25, 100, 1000]

  test('°C → K → °C 往返', () => {
    const C = findUnit('°C')
    for (const t of temps) {
      const k = toSI(t, C)
      const back = fromSI(k, C)
      expect(back).toBeCloseTo(t, 10)
    }
  })

  test('°F → K → °F 往返', () => {
    const F = findUnit('°F')
    for (const t of temps) {
      const k = toSI(t, F)
      const back = fromSI(k, F)
      expect(back).toBeCloseTo(t, 10)
    }
  })

  test('°C → °F → °C 往返（通过 K）', () => {
    const C = findUnit('°C')
    const F = findUnit('°F')
    for (const t of temps) {
      const k = toSI(t, C)
      const f = fromSI(k, F)
      const k2 = toSI(f, F)
      const c = fromSI(k2, C)
      expect(c).toBeCloseTo(t, 10)
    }
  })
})

describe('常用温度点验证', () => {
  test('25°C 室温 = 77°F', () => {
    const C = findUnit('°C')
    const F = findUnit('°F')
    const k = toSI(25, C)
    const f = fromSI(k, F)
    expect(f).toBeCloseTo(77)
  })

  test('37°C 体温 = 98.6°F', () => {
    const C = findUnit('°C')
    const F = findUnit('°F')
    const k = toSI(37, C)
    const f = fromSI(k, F)
    expect(f).toBeCloseTo(98.6)
  })

  test('绝对零度 0 K = -273.15 °C = -459.67 °F', () => {
    const C = findUnit('°C')
    const F = findUnit('°F')
    expect(fromSI(0, C)).toBeCloseTo(-273.15)
    expect(fromSI(0, F)).toBeCloseTo(-459.67)
  })
})
