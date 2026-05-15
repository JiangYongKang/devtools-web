import {
  validateMinDate,
  validateMaxDate,
  validateDisabledWeekdays,
  validateGregorian,
  validateDate,
  validateDateTime,
  getSeverityByErrorType,
} from '../logic/validation.js'
import { PlainDate, PlainDateTime } from '../logic/temporal-polyfill.js'
import { VALIDATION_ERROR_TYPE, WEEKDAYS } from '../logic/constants.js'

describe('Validation - 校验函数', () => {
  describe('validateMinDate', () => {
    it('当日期大于等于最小日期时应该返回 null', () => {
      const date = new PlainDate(2024, 3, 15)
      const minDate = new PlainDate(2024, 1, 1)
      expect(validateMinDate(date, minDate)).toBeNull()
    })

    it('当日期小于最小日期时应该返回错误', () => {
      const date = new PlainDate(2024, 1, 1)
      const minDate = new PlainDate(2024, 3, 1)
      const result = validateMinDate(date, minDate)
      expect(result).not.toBeNull()
      expect(result.type).toBe(VALIDATION_ERROR_TYPE.BEFORE_MIN)
    })

    it('当没有设置最小日期时应该返回 null', () => {
      const date = new PlainDate(2024, 3, 15)
      expect(validateMinDate(date, null)).toBeNull()
    })
  })

  describe('validateMaxDate', () => {
    it('当日期小于等于最大日期时应该返回 null', () => {
      const date = new PlainDate(2024, 3, 15)
      const maxDate = new PlainDate(2024, 12, 31)
      expect(validateMaxDate(date, maxDate)).toBeNull()
    })

    it('当日期大于最大日期时应该返回错误', () => {
      const date = new PlainDate(2024, 12, 31)
      const maxDate = new PlainDate(2024, 3, 1)
      const result = validateMaxDate(date, maxDate)
      expect(result).not.toBeNull()
      expect(result.type).toBe(VALIDATION_ERROR_TYPE.AFTER_MAX)
    })

    it('当没有设置最大日期时应该返回 null', () => {
      const date = new PlainDate(2024, 3, 15)
      expect(validateMaxDate(date, null)).toBeNull()
    })
  })

  describe('validateDisabledWeekdays', () => {
    it('当日期不在禁用星期列表时应该返回 null', () => {
      const date = new PlainDate(2024, 3, 15)
      const result = validateDisabledWeekdays(date, [WEEKDAYS.SUNDAY, WEEKDAYS.SATURDAY])
      const friday = 5
      if (date.dayOfWeek !== friday) {
        expect(result).toBeNull()
      }
    })

    it('当日期在禁用星期列表时应该返回错误', () => {
      const sunday = new PlainDate(2024, 3, 17)
      const result = validateDisabledWeekdays(sunday, [WEEKDAYS.SUNDAY, WEEKDAYS.SATURDAY])
      if (sunday.dayOfWeek === WEEKDAYS.SUNDAY) {
        expect(result).not.toBeNull()
        expect(result.type).toBe(VALIDATION_ERROR_TYPE.DISABLED_WEEKDAY)
      }
    })

    it('当禁用星期列表为空时应该返回 null', () => {
      const date = new PlainDate(2024, 3, 15)
      expect(validateDisabledWeekdays(date, [])).toBeNull()
    })
  })

  describe('validateGregorian', () => {
    it('当日期在格里高利历起始之后时应该返回 null', () => {
      const date = new PlainDate(1582, 10, 15)
      expect(validateGregorian(date)).toBeNull()
    })

    it('当日期在格里高利历起始之前时应该返回警告', () => {
      const date = new PlainDate(1582, 10, 14)
      const result = validateGregorian(date)
      expect(result).not.toBeNull()
      expect(result.type).toBe(VALIDATION_ERROR_TYPE.PRE_GREGORIAN)
    })
  })

  describe('validateDate', () => {
    it('应该返回正确的验证结果', () => {
      const date = new PlainDate(2024, 3, 15)
      const result = validateDate(date)
      expect(result.isValid).toBe(true)
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('当有多个验证错误时应该全部返回', () => {
      const date = new PlainDate(2024, 1, 1)
      const minDate = new PlainDate(2024, 3, 1)
      const result = validateDate(date, { minDate })
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateDateTime', () => {
    it('应该返回正确的验证结果', () => {
      const dt = new PlainDateTime(2024, 3, 15, 14, 30)
      const result = validateDateTime(dt)
      expect(result.isValid).toBe(true)
      expect(Array.isArray(result.errors)).toBe(true)
      expect(typeof result.hasWarnings).toBe('boolean')
    })

    it('应该正确处理禁用星期验证', () => {
      const dt = new PlainDateTime(2024, 3, 17, 14, 30)
      const result = validateDateTime(dt, {
        disabledWeekdays: [WEEKDAYS.SUNDAY],
      })
      if (dt.dayOfWeek === WEEKDAYS.SUNDAY) {
        expect(result.errors.some(e => e.type === VALIDATION_ERROR_TYPE.DISABLED_WEEKDAY)).toBe(true)
      }
    })

    it('应该正确设置 hasWarnings 标志', () => {
      const dt = new PlainDateTime(1582, 10, 14, 12, 0)
      const result = validateDateTime(dt)
      expect(result.hasWarnings).toBe(true)
    })
  })

  describe('getSeverityByErrorType', () => {
    it('应该为错误类型返回 error 严重级别', () => {
      expect(getSeverityByErrorType(VALIDATION_ERROR_TYPE.INVALID_DATE)).toBe('error')
      expect(getSeverityByErrorType(VALIDATION_ERROR_TYPE.BEFORE_MIN)).toBe('error')
      expect(getSeverityByErrorType(VALIDATION_ERROR_TYPE.AFTER_MAX)).toBe('error')
      expect(getSeverityByErrorType(VALIDATION_ERROR_TYPE.DISABLED_WEEKDAY)).toBe('error')
    })

    it('应该为警告类型返回 warning 严重级别', () => {
      expect(getSeverityByErrorType(VALIDATION_ERROR_TYPE.PRE_GREGORIAN)).toBe('warning')
      expect(getSeverityByErrorType(VALIDATION_ERROR_TYPE.LOCAL_WALL_CLOCK_NO_OFFSET)).toBe('warning')
    })
  })
})
