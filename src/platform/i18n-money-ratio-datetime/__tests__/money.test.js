import { parseMoney, formatMoney, roundToMinorUnits } from '../logic/money.js'
import { ERROR_CODES, WARNING_CODES, ROUNDING_MODES } from '../logic/constants.js'

describe('money.js - 金额解析与格式化', () => {
  describe('parseMoney', () => {
    it('应该正确解析简单数字金额', () => {
      const result = parseMoney('123.45')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(123.45)
      expect(result.data.valueMinorUnits).toBe(12345)
    })

    it('应该解析带千分位的金额', () => {
      const result = parseMoney('1,234.56')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(1234.56)
      expect(result.warnings.some(w => w.warningCode === WARNING_CODES.THOUSAND_SEPARATOR_DETECTED)).toBe(true)
    })

    it('应该解析括号表示的负数金额', () => {
      const result = parseMoney('(123.45)')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(-123.45)
      expect(result.warnings.some(w => w.warningCode === WARNING_CODES.NEGATIVE_BRACKET_NOTATION)).toBe(true)
    })

    it('应该解析普通负数金额', () => {
      const result = parseMoney('-123.45')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(-123.45)
    })

    it('应该根据货币符号自动识别货币', () => {
      const result = parseMoney('$99.99')
      expect(result.success).toBe(true)
      expect(result.data.currency).toBe('USD')
      expect(result.warnings.some(w => w.warningCode === WARNING_CODES.CURRENCY_GUESSED)).toBe(true)
    })

    it('应该识别日元符号并正确处理无小数情况', () => {
      const result = parseMoney('¥123456')
      expect(result.success).toBe(true)
      expect(result.data.currency).toBe('JPY')
      expect(result.data.minorUnits).toBe(0)
    })

    it('应该拒绝科学计数法输入', () => {
      const result = parseMoney('1e5')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SCIENTIFIC_NOTATION_REJECTED)
    })

    it('应该返回错误对于无效输入', () => {
      const result = parseMoney('not a number')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.PARSING_FAILED)
    })

    it('应该支持自定义小数位数', () => {
      const result = parseMoney('123.456', { minimumFractionDigits: 3 })
      expect(result.success).toBe(true)
      expect(result.data.minorUnits).toBe(3)
    })
  })

  describe('roundToMinorUnits', () => {
    it('应该正确执行四舍五入', () => {
      expect(roundToMinorUnits(123.456, 2, ROUNDING_MODES.HALF_UP)).toBe(12346)
      expect(roundToMinorUnits(123.454, 2, ROUNDING_MODES.HALF_UP)).toBe(12345)
    })

    it('应该正确执行银行家舍入', () => {
      expect(roundToMinorUnits(123.455, 2, ROUNDING_MODES.BANKERS)).toBe(12346)
      expect(roundToMinorUnits(123.445, 2, ROUNDING_MODES.BANKERS)).toBe(12344)
    })

    it('应该正确处理0位小数（如日元）', () => {
      expect(roundToMinorUnits(123.456, 0, ROUNDING_MODES.HALF_UP)).toBe(123)
      expect(roundToMinorUnits(123.5, 0, ROUNDING_MODES.HALF_UP)).toBe(124)
    })
  })

  describe('formatMoney', () => {
    it('应该使用 Intl.NumberFormat 正确格式化金额', () => {
      const formatted = formatMoney(1234.56, { currency: 'USD', locale: 'en-US' })
      expect(formatted).toContain('1,234.56')
      expect(formatted).toContain('$')
    })

    it('应该正确格式化日元（无小数）', () => {
      const formatted = formatMoney(123456, { currency: 'JPY', locale: 'ja-JP' })
      expect(formatted).toContain('123,456')
    })

    it('应该支持不同的 locale', () => {
      const formattedCN = formatMoney(1234.56, { currency: 'CNY', locale: 'zh-CN' })
      expect(formattedCN).toContain('1,234.56')
    })
  })

  describe('货币边界测试', () => {
    it('应该正确处理大额金额', () => {
      const result = parseMoney('999999999.99')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(999999999.99)
    })

    it('应该正确处理零金额', () => {
      const result = parseMoney('0.00')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(0)
    })

    it('应该正确处理极小金额', () => {
      const result = parseMoney('0.01')
      expect(result.success).toBe(true)
      expect(result.data.value).toBe(0.01)
    })
  })
})
