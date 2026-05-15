import { VALIDATION_ERROR_TYPE, DST_STATUS } from './constants.js'
import { PlainDate, PlainDateTime } from './temporal-polyfill.js'
import { isPreGregorian } from './date-utils.js'
import { checkDSTStatus } from './timezone-utils.js'

/**
 * 校验日期是否早于最小日期限制
 * @param {PlainDate|PlainDateTime} date - 待校验的日期对象
 * @param {PlainDate|null} minDate - 最小日期限制
 * @returns {Object|null} 返回错误信息或 null（无错误）
 */
function validateMinDate(date, minDate) {
  if (!minDate) return null

  const d = date instanceof PlainDateTime ? date.plainDate : date
  const m = minDate instanceof PlainDateTime ? minDate.plainDate : minDate

  if (PlainDate.compare(d, m) < 0) {
    return {
      type: VALIDATION_ERROR_TYPE.BEFORE_MIN,
      message: `日期 ${d} 早于最小日期 ${m}`,
      details: { date: d, minDate: m },
    }
  }
  return null
}

/**
 * 校验日期是否晚于最大日期限制
 * @param {PlainDate|PlainDateTime} date - 待校验的日期对象
 * @param {PlainDate|null} maxDate - 最大日期限制
 * @returns {Object|null} 返回错误信息或 null（无错误）
 */
function validateMaxDate(date, maxDate) {
  if (!maxDate) return null

  const d = date instanceof PlainDateTime ? date.plainDate : date
  const m = maxDate instanceof PlainDateTime ? maxDate.plainDate : maxDate

  if (PlainDate.compare(d, m) > 0) {
    return {
      type: VALIDATION_ERROR_TYPE.AFTER_MAX,
      message: `日期 ${d} 晚于最大日期 ${m}`,
      details: { date: d, maxDate: m },
    }
  }
  return null
}

/**
 * 校验日期是否在禁用的星期列表中
 * @param {PlainDate|PlainDateTime} date - 待校验的日期对象
 * @param {Array<number>} disabledWeekdays - 禁用的星期数组（0=周日, 6=周六）
 * @returns {Object|null} 返回错误信息或 null（无错误）
 */
function validateDisabledWeekdays(date, disabledWeekdays = []) {
  if (disabledWeekdays.length === 0) return null

  const d = date instanceof PlainDateTime ? date.plainDate : date

  if (disabledWeekdays.includes(d.dayOfWeek)) {
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const disabledNames = disabledWeekdays.map(w => weekdayNames[w]).join('、')

    return {
      type: VALIDATION_ERROR_TYPE.DISABLED_WEEKDAY,
      message: `${d} 是 ${weekdayNames[d.dayOfWeek]}，属于禁用星期（${disabledNames}）`,
      details: { date: d, dayOfWeek: d.dayOfWeek, disabledWeekdays },
    }
  }
  return null
}

/**
 * 校验日期是否早于格里高利历起始日期（1582-10-15）
 * @param {PlainDate|PlainDateTime} date - 待校验的日期对象
 * @returns {Object|null} 返回警告信息或 null（无警告）
 */
function validateGregorian(date) {
  if (isPreGregorian(date)) {
    return {
      type: VALIDATION_ERROR_TYPE.PRE_GREGORIAN,
      message: '日期早于格里高利历起始（1582-10-15），可能存在历法计算问题',
      details: { date },
    }
  }
  return null
}

/**
 * 校验日期时间是否处于夏令时向前调整的间隙中（时间不存在）
 * @param {PlainDateTime} dateTime - 待校验的日期时间对象
 * @param {string} timeZone - IANA 时区名称
 * @returns {Object|null} 返回警告信息或 null（无警告）
 */
function validateDSTGap(dateTime, timeZone) {
  if (!timeZone || !(dateTime instanceof PlainDateTime)) return null

  const dstStatus = checkDSTStatus(dateTime, timeZone)

  if (dstStatus.status === DST_STATUS.SPRING_FORWARD_GAP) {
    return {
      type: VALIDATION_ERROR_TYPE.DST_GAP,
      message: dstStatus.message,
      details: { dateTime, timeZone, transition: dstStatus.transition },
    }
  }
  return null
}

/**
 * 校验本地墙钟时间是否有指定的时区偏移
 * @param {boolean} hasTimezoneSpecified - 是否已指定时区
 * @returns {Object|null} 返回警告信息或 null（无警告）
 */
function validateLocalWallClockWarning(hasTimezoneSpecified) {
  if (!hasTimezoneSpecified) {
    return {
      type: VALIDATION_ERROR_TYPE.LOCAL_WALL_CLOCK_NO_OFFSET,
      message: '使用本地墙钟时间但未指定时区偏移，可能存在时区歧义',
      details: { suggestion: '请明确选择时区或使用 UTC 时间' },
    }
  }
  return null
}

/**
 * 日期校验入口函数，执行所有日期相关的校验
 * @param {PlainDate} date - 待校验的日期对象
 * @param {Object} options - 校验选项
 * @param {PlainDate|null} options.minDate - 最小日期限制
 * @param {PlainDate|null} options.maxDate - 最大日期限制
 * @param {Array<number>} options.disabledWeekdays - 禁用的星期列表
 * @returns {Object} 校验结果对象，包含 isValid 标志和 errors 数组
 */
function validateDate(date, options = {}) {
  const errors = []

  const gregorianError = validateGregorian(date)
  if (gregorianError) errors.push(gregorianError)

  if (options.minDate) {
    const minError = validateMinDate(date, options.minDate)
    if (minError) errors.push(minError)
  }

  if (options.maxDate) {
    const maxError = validateMaxDate(date, options.maxDate)
    if (maxError) errors.push(maxError)
  }

  if (options.disabledWeekdays) {
    const weekdayError = validateDisabledWeekdays(date, options.disabledWeekdays)
    if (weekdayError) errors.push(weekdayError)
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasWarnings: errors.some(e => e.type === VALIDATION_ERROR_TYPE.PRE_GREGORIAN),
  }
}

/**
 * 日期时间校验入口函数，执行所有日期时间相关的校验
 * @param {PlainDateTime} dateTime - 待校验的日期时间对象
 * @param {Object} options - 校验选项
 * @param {PlainDate|null} options.minDate - 最小日期限制
 * @param {PlainDate|null} options.maxDate - 最大日期限制
 * @param {Array<number>} options.disabledWeekdays - 禁用的星期列表
 * @param {string|null} options.timeZone - IANA 时区名称，用于 DST 校验
 * @param {boolean} options.warnWallClockWithoutOffset - 是否警告墙钟时间无时区偏移
 * @returns {Object} 校验结果对象，包含 isValid、errors、hasDSTIssue、hasWarnings
 */
function validateDateTime(dateTime, options = {}) {
  const errors = []

  const gregorianError = validateGregorian(dateTime)
  if (gregorianError) errors.push(gregorianError)

  if (options.minDate) {
    const minError = validateMinDate(dateTime, options.minDate)
    if (minError) errors.push(minError)
  }

  if (options.maxDate) {
    const maxError = validateMaxDate(dateTime, options.maxDate)
    if (maxError) errors.push(maxError)
  }

  if (options.disabledWeekdays) {
    const weekdayError = validateDisabledWeekdays(dateTime, options.disabledWeekdays)
    if (weekdayError) errors.push(weekdayError)
  }

  if (options.timeZone) {
    const dstError = validateDSTGap(dateTime, options.timeZone)
    if (dstError) errors.push(dstError)
  }

  if (options.warnWallClockWithoutOffset !== false) {
    const wallClockWarning = validateLocalWallClockWarning(!!options.timeZone)
    if (wallClockWarning && !options.timeZone) {
      errors.push(wallClockWarning)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasDSTIssue: errors.some(e => e.type === VALIDATION_ERROR_TYPE.DST_GAP),
    hasWarnings: errors.some(e =>
      e.type === VALIDATION_ERROR_TYPE.PRE_GREGORIAN ||
      e.type === VALIDATION_ERROR_TYPE.LOCAL_WALL_CLOCK_NO_OFFSET
    ),
  }
}

/**
 * 根据错误类型返回对应的严重级别
 * @param {string} errorType - 错误类型常量
 * @returns {string} 'error' 或 'warning'
 */
function getSeverityByErrorType(errorType) {
  const severityMap = {
    [VALIDATION_ERROR_TYPE.INVALID_DATE]: 'error',
    [VALIDATION_ERROR_TYPE.BEFORE_MIN]: 'error',
    [VALIDATION_ERROR_TYPE.AFTER_MAX]: 'error',
    [VALIDATION_ERROR_TYPE.DISABLED_WEEKDAY]: 'error',
    [VALIDATION_ERROR_TYPE.PRE_GREGORIAN]: 'warning',
    [VALIDATION_ERROR_TYPE.DST_GAP]: 'warning',
    [VALIDATION_ERROR_TYPE.LOCAL_WALL_CLOCK_NO_OFFSET]: 'warning',
  }
  return severityMap[errorType] || 'error'
}

/**
 * 根据严重级别返回对应的图标
 * @param {string} severity - 'error' 或 'warning'
 * @returns {string} 图标字符
 */
function getErrorIcon(severity) {
  return severity === 'error' ? '❌' : '⚠️'
}

export {
  validateMinDate,
  validateMaxDate,
  validateDisabledWeekdays,
  validateGregorian,
  validateDSTGap,
  validateLocalWallClockWarning,
  validateDate,
  validateDateTime,
  getSeverityByErrorType,
  getErrorIcon,
}
