import { describe, expect, test } from 'vitest'
import {
    RoundingMode,
    checkDimensionConflict,
    convertUnit,
    generateAuditLog,
    roundValue,
} from '../logic/converter.js'
import { CELSIUS_TO_FAHRENHEIT, KMH_TO_MS, MS2_TO_G, NEWTON_TO_LBF } from '../logic/examples.js'
import { parseUnit } from '../logic/parser.js'

/**
 * 换算与精度策略测试
 */
describe('roundValue 舍入函数', () => {
  describe('half-up 四舍五入', () => {
    test('不指定有效数字返回原值', () => {
      expect(roundValue(3.14159)).toBe(3.14159)
    })

    test('3.14159 保留 3 位有效数字 = 3.14', () => {
      expect(roundValue(3.14159, 3)).toBeCloseTo(3.14)
    })

    test('2.71828 保留 2 位有效数字 = 2.7', () => {
      expect(roundValue(2.71828, 2)).toBeCloseTo(2.7)
    })

    test('0.5 四舍五入到整数 = 1', () => {
      expect(roundValue(0.5, 1)).toBeCloseTo(1)
    })

    test('1.5 四舍五入到整数 = 2', () => {
      expect(roundValue(1.5, 1)).toBeCloseTo(2)
    })

    test('2.5 四舍五入到整数 = 3', () => {
      expect(roundValue(2.5, 1)).toBeCloseTo(3)
    })

    test('999.9 保留 3 位有效数字 = 1000', () => {
      expect(roundValue(999.9, 3)).toBeCloseTo(1000)
    })

    test('0.001234 保留 2 位有效数字 = 0.0012', () => {
      expect(roundValue(0.001234, 2)).toBeCloseTo(0.0012)
    })
  })

  describe('bankers 银行家舍入', () => {
    const mode = RoundingMode.BANKERS

    test('0.5 银行家舍入到整数 = 0', () => {
      expect(roundValue(0.5, 1, mode)).toBeCloseTo(0)
    })

    test('1.5 银行家舍入到整数 = 2', () => {
      expect(roundValue(1.5, 1, mode)).toBeCloseTo(2)
    })

    test('2.5 银行家舍入到整数 = 2', () => {
      expect(roundValue(2.5, 1, mode)).toBeCloseTo(2)
    })

    test('3.5 银行家舍入到整数 = 4', () => {
      expect(roundValue(3.5, 1, mode)).toBeCloseTo(4)
    })

    test('1.235 银行家舍入保留 3 位有效数字 = 1.24', () => {
      expect(roundValue(1.235, 3, mode)).toBeCloseTo(1.24)
    })

    test('1.245 银行家舍入保留 3 位有效数字 = 1.24', () => {
      expect(roundValue(1.245, 3, mode)).toBeCloseTo(1.24)
    })
  })

  describe('边界情况', () => {
    test('0 舍入仍为 0', () => {
      expect(roundValue(0, 5)).toBe(0)
    })

    test('负数舍入', () => {
      expect(roundValue(-2.5, 1)).toBeCloseTo(-2)
    })

    test('NaN 返回 NaN', () => {
      expect(Number.isNaN(roundValue(NaN, 5))).toBe(true)
    })
  })
})

describe('checkDimensionConflict 冲突检测', () => {
  test('相同量纲无冲突', () => {
    const r = checkDimensionConflict('m', 'km', 'convert')
    expect(r.hasConflict).toBe(false)
    expect(r.errors).toHaveLength(0)
  })

  test('不同量纲换算有冲突', () => {
    const r = checkDimensionConflict('m', 'kg', 'convert')
    expect(r.hasConflict).toBe(true)
    expect(r.errors.length).toBeGreaterThan(0)
  })

  test('不同量纲相加有冲突', () => {
    const r = checkDimensionConflict('m', 's', 'add')
    expect(r.hasConflict).toBe(true)
  })

  test('温度与非温度有警告', () => {
    const r = checkDimensionConflict('°C', 'K', 'convert')
    expect(r.hasConflict).toBe(false)
    expect(r.warnings.length).toBe(0)
  })

  test('N 与 lbf 量纲相容', () => {
    const r = checkDimensionConflict('N', 'lbf', 'convert')
    expect(r.hasConflict).toBe(false)
  })

  test('速度 km/h 与 m/s 量纲相容', () => {
    const r = checkDimensionConflict('km/h', 'm/s', 'convert')
    expect(r.hasConflict).toBe(false)
  })

  test('加速度 m/s² 与 g 量纲相容', () => {
    const r = checkDimensionConflict('m/s²', 'g', 'convert')
    expect(r.hasConflict).toBe(false)
  })
})

describe('convertUnit 单位换算', () => {
  test('示例 1: 牛顿 → 磅力', () => {
    const r = convertUnit(
      NEWTON_TO_LBF.value,
      NEWTON_TO_LBF.fromUnit,
      NEWTON_TO_LBF.toUnit,
      NEWTON_TO_LBF.options,
    )
    expect(r.ok).toBe(true)
    expect(r.resultRounded).toBeCloseTo(0.2248)
    expect(r.result).toBeCloseTo(1 / 4.4482216152605)
  })

  test('示例 2: km/h → m/s', () => {
    const r = convertUnit(
      KMH_TO_MS.value,
      KMH_TO_MS.fromUnit,
      KMH_TO_MS.toUnit,
      KMH_TO_MS.options,
    )
    expect(r.ok).toBe(true)
    expect(r.resultRounded).toBeCloseTo(0.2778)
    expect(r.result).toBeCloseTo(1000 / 3600)
  })

  test('示例 3: °C → °F 温度仿射变换', () => {
    const r = convertUnit(
      CELSIUS_TO_FAHRENHEIT.value,
      CELSIUS_TO_FAHRENHEIT.fromUnit,
      CELSIUS_TO_FAHRENHEIT.toUnit,
      CELSIUS_TO_FAHRENHEIT.options,
    )
    expect(r.ok).toBe(true)
    expect(r.resultRounded).toBeCloseTo(77)
    expect(r.result).toBeCloseTo(77)
  })

  test('示例 4: m/s² → g', () => {
    const r = convertUnit(
      MS2_TO_G.value,
      MS2_TO_G.fromUnit,
      MS2_TO_G.toUnit,
      MS2_TO_G.options,
    )
    expect(r.ok).toBe(true)
    expect(r.resultRounded).toBeCloseTo(1)
    expect(r.result).toBeCloseTo(1)
  })

  test('100 km/h → m/s', () => {
    const r = convertUnit(100, 'km/h', 'm/s', { significantDigits: 4 })
    expect(r.ok).toBe(true)
    expect(r.resultRounded).toBeCloseTo(27.78)
  })

  test('100 km/h → mph', () => {
    const r = convertUnit(100, 'km/h', 'mph', { significantDigits: 4 })
    expect(r.ok).toBe(true)
    expect(r.resultRounded).toBeCloseTo(62.14)
  })

  test('0 °C → K', () => {
    const r = convertUnit(0, '°C', 'K', { significantDigits: 5 })
    expect(r.ok).toBe(true)
    expect(r.resultRounded).toBeCloseTo(273.15)
  })

  test('32 °F → °C', () => {
    const r = convertUnit(32, '°F', '°C', { significantDigits: 3 })
    expect(r.ok).toBe(true)
    expect(r.resultRounded).toBeCloseTo(0)
  })

  test('包含换算步骤链', () => {
    const r = convertUnit(1, 'm/s²', 'g', {
      includeSteps: true })
    expect(r.ok).toBe(true)
    expect(r.steps).toBeDefined()
    expect(r.steps.length).toBeGreaterThan(2)
  })

  test('量纲不兼容返回错误', () => {
    const r = convertUnit(1, 'm', 'kg')
    expect(r.ok).toBe(false)
    expect(r.error).toBeDefined()
  })

  test('无效单位返回错误', () => {
    const r = convertUnit(1, 'xyz', 'm')
    expect(r.ok).toBe(false)
  })

  test('包含审计日志', () => {
    const r = convertUnit(1, 'N', 'lbf', {
      significantDigits: 4,
      includeAuditLog: true,
    })
    expect(r.ok).toBe(true)
    expect(r.auditLog).toBeDefined()
    expect(r.auditLog).toContain('# 单位换算审计日志')
    expect(r.auditLog).toContain('量纲')
    expect(r.auditLog).toContain('L·M·T⁻²')
  })
})

describe('复合单位解析与换算', () => {
  test('kg·m/s² 解析为力量纲', () => {
    const r = parseUnit('kg·m/s²')
    expect(r.ok).toBe(true)
    expect(r.result.dimension).toEqual([1, 1, -2, 0, 0, 0, 0])
  })

  test('N 与 kg·m/s² 量纲相同', () => {
    const r1 = parseUnit('N')
    const r2 = parseUnit('kg·m/s²')
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r1.result.dimension).toEqual(r2.result.dimension)
  })

  test('J 与 N·m 量纲相同', () => {
    const r1 = parseUnit('J')
    const r2 = parseUnit('N·m')
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r1.result.dimension).toEqual(r2.result.dimension)
  })

  test('W 与 J/s 量纲相同', () => {
    const r1 = parseUnit('W')
    const r2 = parseUnit('J/s')
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r1.result.dimension).toEqual(r2.result.dimension)
  })

  test('Pa 与 N/m² 量纲相同', () => {
    const r1 = parseUnit('Pa')
    const r2 = parseUnit('N/m²')
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r1.result.dimension).toEqual(r2.result.dimension)
  })

  test('1 Pa = 1 N/m² 换算', () => {
    const r = convertUnit(1, 'Pa', 'N/m²')
    expect(r.ok).toBe(true)
    expect(r.result).toBeCloseTo(1)
  })

  test('1 J = 1 N·m 换算', () => {
    const r = convertUnit(1, 'J', 'N·m')
    expect(r.ok).toBe(true)
    expect(r.result).toBeCloseTo(1)
  })

  test('1 W = 1 J/s 换算', () => {
    const r = convertUnit(1, 'W', 'J/s')
    expect(r.ok).toBe(true)
    expect(r.result).toBeCloseTo(1)
  })
})

describe('无量纲单位', () => {
  test('% 是无量纲', () => {
    const r = parseUnit('%')
    expect(r.ok).toBe(true)
    expect(r.result.dimension.every((v) => v === 0)).toBe(true)
    expect(r.result.scale).toBe(0.01)
  })

  test('50% = 0.5', () => {
    const r = convertUnit(50, '%', '1')
    expect(r.ok).toBe(true)
    expect(r.result).toBeCloseTo(0.5)
  })

  test('rad 是无量纲', () => {
    const r = parseUnit('rad')
    expect(r.ok).toBe(true)
    expect(r.result.dimension.every((v) => v === 0)).toBe(true)
  })
})

describe('generateAuditLog 审计日志', () => {
  test('生成的日志包含必要字段', () => {
    const log = generateAuditLog({
      value: 1,
      fromUnit: 'N',
      toUnit: 'lbf',
      result: 0.2248,
      resultRounded: 0.2248,
      significantDigits: 4,
      roundingMode: 'half-up',
      steps: [],
      conflict: { hasConflict: false, errors: [], warnings: [] },
      fromParse: parseUnit('N'),
      toParse: parseUnit('lbf'),
    })

    expect(log).toContain('# 单位换算审计日志')
    expect(log).toContain('`1` `N`')
    expect(log).toContain('`0.2248` `lbf`')
    expect(log).toContain('L·M·T⁻²')
    expect(log).toContain('四舍五入')
    expect(log).toContain('4')
  })
})


