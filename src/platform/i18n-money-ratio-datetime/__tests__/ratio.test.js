import { parseRatio, formatRatio, applyRatioToAmount } from '../logic/ratio.js'
import { ERROR_CODES, WARNING_CODES } from '../logic/constants.js'

describe('ratio.js - 比率解析与格式化', () => {
  describe('parseRatio', () => {
    it('应该正确解析百分比', () => {
      const result = parseRatio('12.5%')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(0.125)
      expect(result.data.type).toBe('symbol')
      expect(result.data.symbol).toBe('%')
    })

    it('应该正确解析千分比', () => {
      const result = parseRatio('5‰')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(0.005)
    })

    it('应该正确解析分数形式', () => {
      const result = parseRatio('1/3')
      expect(result.success).toBe(true)
      expect(result.data.type).toBe('fraction')
      expect(result.data.numerator).toBe(1)
      expect(result.data.denominator).toBe(3)
      expect(result.data.value).toBeCloseTo(0.3333333)
    })

    it('应该生成分数近似警告', () => {
      const result = parseRatio('1/7')
      expect(result.success).toBe(true)
      expect(result.warnings.some(w => w.warningCode === WARNING_CODES.FRACTION_APPROXIMATED)).toBe(true)
    })

    it('应该正确解析小数形式', () => {
      const result = parseRatio('0.1234')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(0.1234)
      expect(result.data.type).toBe('decimal')
    })

    it('应该正确解析负比率', () => {
      const result = parseRatio('-5%')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(-0.05)
    })

    it('应该拒绝分母为零的分数', () => {
      const result = parseRatio('1/0')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_RATIO)
    })

    it('应该返回错误对于无效输入', () => {
      const result = parseRatio('not a ratio')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.PARSING_FAILED)
    })
  })

  describe('formatRatio', () => {
    it('应该正确格式化百分比', () => {
      const formatted = formatRatio(0.125, { symbol: '%', locale: 'en-US' })
      expect(formatted).toContain('12.5')
      expect(formatted).toContain('%')
    })

    it('应该正确格式化分数形式', () => {
      const formatted = formatRatio(1/3, { numerator: 1, denominator: 3, symbol: '%' })
      expect(formatted).toBe('1/3%')
    })

    it('应该正确格式化无符号小数', () => {
      const formatted = formatRatio(0.1234, { locale: 'en-US' })
      expect(formatted).toContain('0.1234')
    })
  })

  describe('applyRatioToAmount', () => {
    it('应该正确将比率应用到金额', () => {
      const result = applyRatioToAmount(1000, 0.1)
      expect(result).toBe(1100)
    })

    it('应该正确处理负比率', () => {
      const result = applyRatioToAmount(1000, -0.1)
      expect(result).toBe(900)
    })

    it('应该正确处理零比率', () => {
      const result = applyRatioToAmount(1000, 0)
      expect(result).toBe(1000)
    })

    it('应该正确处理100%比率', () => {
      const result = applyRatioToAmount(1000, 1)
      expect(result).toBe(2000)
    })
  })

  describe('比率边界测试', () => {
    it('应该正确处理极小比率', () => {
      const result = parseRatio('0.0001%')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(0.000001)
    })

    it('应该正确处理极大比率', () => {
      const result = parseRatio('1000%')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(10)
    })
  })
})
