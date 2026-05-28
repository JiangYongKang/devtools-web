import { describe, expect, test, beforeEach } from 'vitest'
import {
  Decimal,
  ROUNDING_MODES,
  setDefaultConfig,
  decimalAdd,
  decimalSub,
  decimalMul,
  decimalDiv,
  decimalSqrt,
  decimalCompare,
} from '../logic/decimal.js'

describe('Decimal 高精度小数模块', () => {
  beforeEach(() => {
    setDefaultConfig({ precision: 40, scale: 34, roundingMode: ROUNDING_MODES.ROUND_HALF_UP })
  })

  describe('解析与格式化', () => {
    it('解析简单小数', () => {
      expect(new Decimal('0.1').toString()).toBe('0.1')
      expect(new Decimal('123.456').toString()).toBe('123.456')
    })

    it('解析科学计数法', () => {
      expect(new Decimal('1e10').toString()).toBe('10000000000')
      expect(new Decimal('2.5e-3').toString()).toBe('0.0025')
    })

    it('解析负数', () => {
      expect(new Decimal('-123.45').toString()).toBe('-123.45')
    })

    it('解析 Number', () => {
      expect(new Decimal(123.45).toString()).toBe('123.45')
    })

    it('toExponential 输出', () => {
      expect(new Decimal('123.456').toExponential()).toContain('e+')
    })
  })

  describe('基本运算', () => {
    it('加法运算', () => {
      const result = decimalAdd('0.1', '0.2')
      expect(result.toString()).toBe('0.3')
    })

    it('减法运算', () => {
      const result = decimalSub('1.0', '0.7')
      expect(result.toString()).toBe('0.3')
    })

    it('乘法运算', () => {
      const result = decimalMul('0.1', '0.2')
      expect(result.toString()).toBe('0.02')
    })

    it('除法运算', () => {
      const result = decimalDiv('1', '3', 10)
      expect(result.toString().startsWith('0.3333333333')).toBe(true)
    })

    it('大数运算 - 超过 Number 精度', () => {
      const result = decimalAdd('9999999999999999.1', '0.2')
      expect(result.toString()).toBe('9999999999999999.3')
    })
  })

  describe('平方根运算', () => {
    it('完全平方数', () => {
      const result = decimalSqrt('25')
      expect(result.toString()).toBe('5')
    })

    it('非完全平方数', () => {
      const result = decimalSqrt('2')
      expect(result.toString().startsWith('1.41421356')).toBe(true)
    })
  })

  describe('比较运算', () => {
    it('decimalCompare', () => {
      expect(decimalCompare('0.1', '0.2')).toBeLessThan(0)
      expect(decimalCompare('0.2', '0.1')).toBeGreaterThan(0)
      expect(decimalCompare('0.3', '0.3')).toBe(0)
    })

    it('Decimal 实例方法', () => {
      expect(new Decimal('5').lessThan(new Decimal('10'))).toBe(true)
      expect(new Decimal('10').greaterThan(new Decimal('5'))).toBe(true)
      expect(new Decimal('5').equals(new Decimal('5.0'))).toBe(true)
    })
  })

  describe('舍入模式', () => {
    const testCases = [
      { mode: ROUNDING_MODES.ROUND_UP, value: '2.1', scale: 0, expected: '3' },
      { mode: ROUNDING_MODES.ROUND_DOWN, value: '2.9', scale: 0, expected: '2' },
      { mode: ROUNDING_MODES.ROUND_CEILING, value: '-2.1', scale: 0, expected: '-2' },
      { mode: ROUNDING_MODES.ROUND_FLOOR, value: '-2.9', scale: 0, expected: '-3' },
    ]

    testCases.forEach(({ mode, value, scale, expected }) => {
      it(`${mode} 模式`, () => {
        const result = new Decimal(value, {
          precision: 40,
          scale,
          roundingMode: mode,
        })
        const rounded = result.div('1', scale)
        expect(rounded.toString()).toBe(expected)
      })
    })

    it('ROUND_HALF_UP - 四舍五入', () => {
      const result = decimalDiv('1', '8', 0, {
        precision: 40,
        scale: 0,
        roundingMode: ROUNDING_MODES.ROUND_HALF_UP,
      })
      expect(result.toString()).toBe('0')
    })

    it('ROUND_HALF_EVEN - 银行家舍入', () => {
      const d1 = new Decimal('2.5', { roundingMode: ROUNDING_MODES.ROUND_HALF_EVEN })
      const d2 = new Decimal('3.5', { roundingMode: ROUNDING_MODES.ROUND_HALF_EVEN })
      expect(d1.div('1', 0).toString()).toBe('2')
      expect(d2.div('1', 0).toString()).toBe('4')
    })
  })

  describe('特殊值处理', () => {
    it('NaN 处理', () => {
      const result = new Decimal(NaN)
      expect(result.isNaN).toBe(true)
      expect(result.toString()).toBe('NaN')
    })

    it('Infinity 处理', () => {
      const result = new Decimal(Infinity)
      expect(result.isInfinity).toBe(true)
      expect(result.toString()).toBe('Infinity')
    })

    it('除零返回 Infinity', () => {
      const result = decimalDiv('1', '0', 10)
      expect(result.isInfinity).toBe(true)
    })
  })
})
