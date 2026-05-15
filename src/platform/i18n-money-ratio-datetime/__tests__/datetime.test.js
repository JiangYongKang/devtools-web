import { parseDatetime, formatDatetime, formatRelativeTime, getDstBoundaryExamples } from '../logic/datetime.js'
import { ERROR_CODES, WARNING_CODES, DATE_PARSING_STRATEGIES } from '../logic/constants.js'

describe('datetime.js - 日期解析与格式化', () => {
  describe('parseDatetime', () => {
    it('应该正确解析 ISO 8601 格式', () => {
      const result = parseDatetime('2024-03-15T14:30:00Z')
      expect(result.success).toBe(true)
      expect(result.data.format).toBe('iso')
      expect(result.data.year).toBe(2024)
      expect(result.data.month).toBe(3)
      expect(result.data.day).toBe(15)
    })

    it('应该正确解析仅日期的 ISO 格式', () => {
      const result = parseDatetime('2024-12-31')
      expect(result.success).toBe(true)
      expect(result.data.year).toBe(2024)
      expect(result.data.month).toBe(12)
      expect(result.data.day).toBe(31)
    })

    it('应该正确解析斜杠格式日期', () => {
      const result = parseDatetime('15/03/2024', { parsingStrategy: DATE_PARSING_STRATEGIES.DAY_FIRST })
      expect(result.success).toBe(true)
      expect(result.data.day).toBe(15)
      expect(result.data.month).toBe(3)
      expect(result.data.year).toBe(2024)
    })

    it('应该正确解析点分隔格式日期', () => {
      const result = parseDatetime('15.03.2024')
      expect(result.success).toBe(true)
      expect(result.data.format).toBe('dot')
      expect(result.data.day).toBe(15)
      expect(result.data.month).toBe(3)
      expect(result.data.year).toBe(2024)
    })

    it('应该使用日优先策略处理歧义日期', () => {
      const result = parseDatetime('05/03/2024', { parsingStrategy: DATE_PARSING_STRATEGIES.DAY_FIRST })
      expect(result.success).toBe(true)
      expect(result.data.day).toBe(5)
      expect(result.data.month).toBe(3)
      expect(result.warnings.some(w => w.warningCode === WARNING_CODES.DATE_AMBIGUITY_RESOLVED)).toBe(true)
    })

    it('应该使用月优先策略处理歧义日期', () => {
      const result = parseDatetime('05/03/2024', { parsingStrategy: DATE_PARSING_STRATEGIES.MONTH_FIRST })
      expect(result.success).toBe(true)
      expect(result.data.day).toBe(3)
      expect(result.data.month).toBe(5)
    })

    it('应该正确识别无歧义的日期', () => {
      const result = parseDatetime('31/03/2024')
      expect(result.success).toBe(true)
      expect(result.data.day).toBe(31)
      expect(result.data.month).toBe(3)
      expect(result.data.isAmbiguous).toBe(false)
    })

    it('应该解析带时间的日期', () => {
      const result = parseDatetime('15/03/2024 14:30:45')
      expect(result.success).toBe(true)
      expect(result.data.hours).toBe(14)
      expect(result.data.minutes).toBe(30)
      expect(result.data.seconds).toBe(45)
    })

    it('应该返回错误对于无效日期格式', () => {
      const result = parseDatetime('not a date')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.PARSING_FAILED)
    })

    it('应该返回错误对于无效日期值', () => {
      const result = parseDatetime('35/13/2024')
      expect(result.success).toBe(false)
    })
  })

  describe('DST 边界检测', () => {
    it('应该检测三月底的 DST 边界', () => {
      const result = parseDatetime('2024-03-31')
      expect(result.success).toBe(true)
      expect(result.warnings.some(w => w.warningCode === WARNING_CODES.DST_BOUNDARY)).toBe(true)
    })

    it('应该检测十月底的 DST 边界', () => {
      const result = parseDatetime('2024-10-27')
      expect(result.success).toBe(true)
      expect(result.warnings.some(w => w.warningCode === WARNING_CODES.DST_BOUNDARY)).toBe(true)
    })
  })

  describe('formatDatetime', () => {
    const testDate = new Date(2024, 2, 15, 14, 30, 0)

    it('应该使用 Intl.DateTimeFormat 正确格式化日期', () => {
      const formatted = formatDatetime(testDate, { locale: 'zh-CN', style: 'full' })
      expect(formatted).toBeDefined()
      expect(formatted.length).toBeGreaterThan(0)
    })

    it('应该支持不同的 locale', () => {
      const formattedEN = formatDatetime(testDate, { locale: 'en-US', style: 'date' })
      const formattedJP = formatDatetime(testDate, { locale: 'ja-JP', style: 'date' })
      expect(formattedEN).not.toBe(formattedJP)
    })

    it('应该支持仅日期格式化', () => {
      const formatted = formatDatetime(testDate, { style: 'date' })
      expect(formatted).toBeDefined()
    })

    it('应该支持仅时间格式化', () => {
      const formatted = formatDatetime(testDate, { style: 'time' })
      expect(formatted).toBeDefined()
    })
  })

  describe('formatRelativeTime', () => {
    const baseDate = new Date(2024, 2, 15, 12, 0, 0)

    it('应该正确格式化未来时间', () => {
      const futureDate = new Date(2024, 2, 16, 12, 0, 0)
      const formatted = formatRelativeTime(futureDate, { baseDate, locale: 'zh-CN' })
      expect(formatted).toContain('1天')
    })

    it('应该正确格式化过去时间', () => {
      const pastDate = new Date(2024, 2, 14, 12, 0, 0)
      const formatted = formatRelativeTime(pastDate, { baseDate, locale: 'zh-CN' })
      expect(formatted).toContain('1天')
    })

    it('应该正确格式化小时差', () => {
      const futureDate = new Date(2024, 2, 15, 15, 0, 0)
      const formatted = formatRelativeTime(futureDate, { baseDate })
      expect(formatted).toBeDefined()
    })

    it('应该正确格式化分钟差', () => {
      const futureDate = new Date(2024, 2, 15, 12, 30, 0)
      const formatted = formatRelativeTime(futureDate, { baseDate })
      expect(formatted).toBeDefined()
    })

    it('应该正确格式化月差', () => {
      const futureDate = new Date(2024, 4, 15, 12, 0, 0)
      const formatted = formatRelativeTime(futureDate, { baseDate })
      expect(formatted).toBeDefined()
    })

    it('应该正确格式化年差', () => {
      const futureDate = new Date(2026, 2, 15, 12, 0, 0)
      const formatted = formatRelativeTime(futureDate, { baseDate })
      expect(formatted).toBeDefined()
    })
  })

  describe('getDstBoundaryExamples', () => {
    it('应该返回 DST 边界日期示例', () => {
      const examples = getDstBoundaryExamples()
      expect(Array.isArray(examples)).toBe(true)
      expect(examples.length).toBe(4)
      examples.forEach(date => {
        expect(date instanceof Date).toBe(true)
      })
    })

    it('应该包含三月和十月的日期', () => {
      const examples = getDstBoundaryExamples()
      const months = examples.map(d => d.getMonth())
      expect(months).toContain(2)
      expect(months).toContain(9)
    })
  })

  describe('日期边界测试', () => {
    it('应该正确处理闰年日期', () => {
      const result = parseDatetime('29/02/2024')
      expect(result.success).toBe(true)
      expect(result.data.day).toBe(29)
      expect(result.data.month).toBe(2)
    })

    it('应该正确处理非闰年的2月29日', () => {
      const result = parseDatetime('29/02/2023')
      expect(result.success).toBe(false)
    })

    it('应该正确处理月末日期', () => {
      const result = parseDatetime('31/12/2024')
      expect(result.success).toBe(true)
      expect(result.data.day).toBe(31)
      expect(result.data.month).toBe(12)
      expect(result.data.year).toBe(2024)
    })
  })
})
