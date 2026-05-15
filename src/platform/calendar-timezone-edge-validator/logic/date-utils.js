import {
  GREGORIAN_START_YEAR,
  GREGORIAN_START_MONTH,
  GREGORIAN_START_DAY,
  INPUT_TYPE,
} from './constants.js'
import { PlainDate, PlainDateTime, isLeapYear } from './temporal-polyfill.js'

/**
 * 判断日期是否是当月最后一天
 * @param {PlainDate|PlainDateTime} date - 日期对象
 * @returns {boolean} 是否是月末
 */
function isMonthEnd(date) {
  const d = date instanceof PlainDateTime ? date.plainDate : date
  return d.day === d.daysInMonth
}

/**
 * 判断日期是否是格里高利历的起始日期（1582-10-15）
 * @param {PlainDate|PlainDateTime} date - 日期对象
 * @returns {boolean} 是否是格里高利历起始日
 */
function isGregorianStart(date) {
  const d = date instanceof PlainDateTime ? date.plainDate : date
  return d.year === GREGORIAN_START_YEAR &&
    d.month === GREGORIAN_START_MONTH &&
    d.day === GREGORIAN_START_DAY
}

/**
 * 判断日期是否早于格里高利历起始日期
 * @param {PlainDate|PlainDateTime} date - 日期对象
 * @returns {boolean} 是否早于格里高利历
 */
function isPreGregorian(date) {
  const d = date instanceof PlainDateTime ? date.plainDate : date
  if (d.year < GREGORIAN_START_YEAR) return true
  if (d.year === GREGORIAN_START_YEAR && d.month < GREGORIAN_START_MONTH) return true
  if (d.year === GREGORIAN_START_YEAR && d.month === GREGORIAN_START_MONTH && d.day < GREGORIAN_START_DAY) return true
  return false
}

/**
 * 判断日期是否是2月29日（闰日）
 * @param {PlainDate|PlainDateTime} date - 日期对象
 * @returns {boolean} 是否是闰日
 */
function isLeapDay(date) {
  const d = date instanceof PlainDateTime ? date.plainDate : date
  return d.month === 2 && d.day === 29
}

/**
 * 检测浏览器对各种日期输入类型的支持情况
 * @returns {Object} 各种输入类型的支持状态映射
 */
function detectInputSupport() {
  const input = document.createElement('input')
  const support = {}

  input.type = 'date'
  support[INPUT_TYPE.DATE] = input.type === 'date'

  input.type = 'datetime-local'
  support[INPUT_TYPE.DATETIME_LOCAL] = input.type === 'datetime-local'

  input.type = 'time'
  support[INPUT_TYPE.TIME] = input.type === 'time'

  return support
}

/**
 * 获取最佳的输入类型，如果不支持则降级到文本输入
 * @param {string} desiredType - 期望的输入类型
 * @param {Object} support - 支持状态映射
 * @returns {string} 实际使用的输入类型
 */
function getBestInputType(desiredType, support) {
  if (support[desiredType]) return desiredType
  return INPUT_TYPE.TEXT_FALLBACK
}

/**
 * 解析日期输入字符串为日期对象
 * @param {string} value - 输入的日期字符串
 * @returns {PlainDate|PlainDateTime|null} 解析后的日期对象或 null
 */
function parseDateInput(value) {
  if (!value) return null

  try {
    if (typeof value === 'string') {
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (isoMatch) {
        return PlainDate.from({
          year: parseInt(isoMatch[1], 10),
          month: parseInt(isoMatch[2], 10),
          day: parseInt(isoMatch[3], 10),
        })
      }

      const localMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
      if (localMatch) {
        return PlainDateTime.from({
          year: parseInt(localMatch[1], 10),
          month: parseInt(localMatch[2], 10),
          day: parseInt(localMatch[3], 10),
          hour: parseInt(localMatch[4], 10),
          minute: parseInt(localMatch[5], 10),
        })
      }

      const timeMatch = value.match(/^(\d{2}):(\d{2})$/)
      if (timeMatch) {
        return {
          hour: parseInt(timeMatch[1], 10),
          minute: parseInt(timeMatch[2], 10),
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * 格式化日期对象为输入控件可用的字符串格式
 * @param {PlainDate|PlainDateTime|null} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDateForInput(date) {
  if (!date) return ''
  if (date instanceof PlainDate) {
    return date.toString()
  }
  if (date instanceof PlainDateTime) {
    const y = String(date.year).padStart(4, '0')
    const m = String(date.month).padStart(2, '0')
    const d = String(date.day).padStart(2, '0')
    const h = String(date.hour).padStart(2, '0')
    const min = String(date.minute).padStart(2, '0')
    return `${y}-${m}-${d}T${h}:${min}`
  }
  return ''
}

/**
 * 格式化时间为输入控件可用的字符串格式
 * @param {number} hour - 小时
 * @param {number} minute - 分钟
 * @returns {string} HH:MM 格式的时间字符串
 */
function formatTimeForInput(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/**
 * 获取指定年月的最后一天日期
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @returns {PlainDate} 该月最后一天的日期对象
 */
function getMonthEnd(year, month) {
  return PlainDate.from({ year, month, day: 1 }).add({ months: 1, days: -1 })
}

/**
 * 获取指定日期所在月份的上一个月的最后一天
 * @param {PlainDate|PlainDateTime} date - 日期对象
 * @returns {PlainDate} 上一个月的最后一天
 */
function getPreviousMonthEnd(date) {
  const d = date instanceof PlainDateTime ? date.plainDate : date
  return PlainDate.from({ year: d.year, month: d.month, day: 1 }).subtract({ days: 1 })
}

/**
 * 获取指定日期所在月份的下一个月的第一天
 * @param {PlainDate|PlainDateTime} date - 日期对象
 * @returns {PlainDate} 下一个月的第一天
 */
function getNextMonthStart(date) {
  const d = date instanceof PlainDateTime ? date.plainDate : date
  return PlainDate.from({ year: d.year, month: d.month, day: 1 }).add({ months: 1 })
}

/**
 * 获取星期几的中文名称
 * @param {number} weekday - 星期几（0=周日, 6=周六）
 * @param {string} locale - 区域设置，默认 zh-CN
 * @returns {string} 星期几的中文名称
 */
function getWeekdayName(weekday, locale = 'zh-CN') {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[weekday] || String(weekday)
}

/**
 * 获取月份的中文名称
 * @param {number} month - 月份（1-12）
 * @param {string} locale - 区域设置，默认 zh-CN
 * @returns {string} 月份的中文名称
 */
function getMonthName(month, locale = 'zh-CN') {
  const names = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return names[month - 1] || String(month)
}

export {
  isMonthEnd,
  isGregorianStart,
  isPreGregorian,
  isLeapDay,
  detectInputSupport,
  getBestInputType,
  parseDateInput,
  formatDateForInput,
  formatTimeForInput,
  getMonthEnd,
  getPreviousMonthEnd,
  getNextMonthStart,
  getWeekdayName,
  getMonthName,
}
