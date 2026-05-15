import {
  PlainDate,
  PlainDateTime,
  isLeapYear,
  getDaysInMonth,
  isValidDate,
  hasNativeTemporal,
} from '../logic/temporal-polyfill.js'

describe('Temporal Polyfill - 纯日期运算', () => {
  describe('isLeapYear', () => {
    it('应该正确识别闰年', () => {
      expect(isLeapYear(2024)).toBe(true)
      expect(isLeapYear(2020)).toBe(true)
      expect(isLeapYear(2000)).toBe(true)
    })

    it('应该正确识别非闰年', () => {
      expect(isLeapYear(2023)).toBe(false)
      expect(isLeapYear(2019)).toBe(false)
      expect(isLeapYear(1900)).toBe(false)
    })
  })

  describe('getDaysInMonth', () => {
    it('应该返回正确的月份天数', () => {
      expect(getDaysInMonth(2024, 1)).toBe(31)
      expect(getDaysInMonth(2024, 2)).toBe(29)
      expect(getDaysInMonth(2023, 2)).toBe(28)
      expect(getDaysInMonth(2024, 4)).toBe(30)
      expect(getDaysInMonth(2024, 12)).toBe(31)
    })
  })

  describe('PlainDate', () => {
    it('应该创建有效的日期对象', () => {
      const date = new PlainDate(2024, 3, 15)
      expect(date.year).toBe(2024)
      expect(date.month).toBe(3)
      expect(date.day).toBe(15)
    })

    it('应该正确识别闰日', () => {
      const leapDay = new PlainDate(2024, 2, 29)
      expect(leapDay.isLeapYear).toBe(true)
      expect(leapDay.daysInMonth).toBe(29)
    })

    it('from 方法应该支持日期对象转换', () => {
      const date = new Date(2024, 2, 15)
      const plainDate = PlainDate.from(date)
      expect(plainDate.year).toBe(2024)
      expect(plainDate.month).toBe(3)
      expect(plainDate.day).toBe(15)
    })

    it('from 方法应该支持 ISO 字符串转换', () => {
      const plainDate = PlainDate.from('2024-03-15')
      expect(plainDate.year).toBe(2024)
      expect(plainDate.month).toBe(3)
      expect(plainDate.day).toBe(15)
    })

    it('compare 方法应该正确比较日期', () => {
      const date1 = new PlainDate(2024, 3, 15)
      const date2 = new PlainDate(2024, 3, 16)
      const date3 = new PlainDate(2024, 3, 15)

      expect(PlainDate.compare(date1, date2)).toBeLessThan(0)
      expect(PlainDate.compare(date2, date1)).toBeGreaterThan(0)
      expect(PlainDate.compare(date1, date3)).toBe(0)
    })

    it('add 方法应该正确添加天数', () => {
      const date = new PlainDate(2024, 3, 15)
      const newDate = date.add({ days: 5 })
      expect(newDate.day).toBe(20)
    })

    it('add 方法应该正确处理跨月', () => {
      const date = new PlainDate(2024, 3, 31)
      const newDate = date.add({ days: 2 })
      expect(newDate.month).toBe(4)
      expect(newDate.day).toBe(2)
    })

    it('equals 方法应该正确比较相等性', () => {
      const date1 = new PlainDate(2024, 3, 15)
      const date2 = new PlainDate(2024, 3, 15)
      const date3 = new PlainDate(2024, 3, 16)

      expect(date1.equals(date2)).toBe(true)
      expect(date1.equals(date3)).toBe(false)
    })

    it('toString 方法应该返回正确的 ISO 格式', () => {
      const date = new PlainDate(2024, 3, 15)
      expect(date.toString()).toBe('2024-03-15')
    })

    it('应该正确获取星期几', () => {
      const date = new PlainDate(2024, 3, 15)
      expect(typeof date.dayOfWeek).toBe('number')
      expect(date.dayOfWeek).toBeGreaterThanOrEqual(0)
      expect(date.dayOfWeek).toBeLessThanOrEqual(6)
    })
  })

  describe('PlainDateTime', () => {
    it('应该创建有效的日期时间对象', () => {
      const dt = new PlainDateTime(2024, 3, 15, 14, 30, 45)
      expect(dt.year).toBe(2024)
      expect(dt.month).toBe(3)
      expect(dt.day).toBe(15)
      expect(dt.hour).toBe(14)
      expect(dt.minute).toBe(30)
      expect(dt.second).toBe(45)
    })

    it('from 方法应该支持日期对象转换', () => {
      const date = new Date(2024, 2, 15, 14, 30, 45)
      const dt = PlainDateTime.from(date)
      expect(dt.year).toBe(2024)
      expect(dt.month).toBe(3)
      expect(dt.day).toBe(15)
      expect(dt.hour).toBe(14)
      expect(dt.minute).toBe(30)
    })

    it('from 方法应该支持 ISO 字符串转换', () => {
      const dt = PlainDateTime.from('2024-03-15T14:30:45')
      expect(dt.year).toBe(2024)
      expect(dt.month).toBe(3)
      expect(dt.day).toBe(15)
      expect(dt.hour).toBe(14)
      expect(dt.minute).toBe(30)
      expect(dt.second).toBe(45)
    })

    it('compare 方法应该正确比较日期时间', () => {
      const dt1 = new PlainDateTime(2024, 3, 15, 14, 30)
      const dt2 = new PlainDateTime(2024, 3, 15, 15, 30)

      expect(PlainDateTime.compare(dt1, dt2)).toBeLessThan(0)
      expect(PlainDateTime.compare(dt2, dt1)).toBeGreaterThan(0)
    })

    it('plainDate 属性应该返回正确的 PlainDate', () => {
      const dt = new PlainDateTime(2024, 3, 15, 14, 30)
      const date = dt.plainDate
      expect(date.year).toBe(2024)
      expect(date.month).toBe(3)
      expect(date.day).toBe(15)
      expect(date instanceof PlainDate).toBe(true)
    })

    it('toString 方法应该返回正确的 ISO 格式', () => {
      const dt = new PlainDateTime(2024, 3, 15, 14, 30, 45)
      expect(dt.toString()).toBe('2024-03-15T14:30:45')
    })
  })

  describe('hasNativeTemporal', () => {
    it('应该是一个布尔值', () => {
      expect(typeof hasNativeTemporal).toBe('boolean')
    })
  })
})
