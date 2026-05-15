import { TIMEZONE_MODE, DST_STATUS } from './constants.js'
import { PlainDateTime } from './temporal-polyfill.js'

/**
 * 获取指定时区在指定日期的 UTC 偏移分钟数
 * @param {string} timeZone - IANA 时区名称（如 'America/New_York'）
 * @param {Date} date - 日期对象，用于计算偏移
 * @returns {number} UTC 偏移分钟数（正数表示比 UTC 晚）
 */
function getTimezoneOffsetMinutes(timeZone, date = new Date()) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }))
  return (utcDate.getTime() - tzDate.getTime()) / 60000
}

/**
 * 格式化 UTC 偏移分钟数为显示字符串
 * @param {number} minutes - 偏移分钟数
 * @returns {string} 格式化后的偏移字符串（如 '+05:30', '-04:00'）
 */
function formatOffsetMinutes(minutes) {
  const sign = minutes >= 0 ? '+' : '-'
  const absMinutes = Math.abs(minutes)
  const hours = Math.floor(absMinutes / 60)
  const mins = absMinutes % 60
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * 解析偏移字符串为分钟数
 * @param {string} offsetString - 偏移字符串（如 '+05:30', '-04:00'）
 * @returns {number|null} 分钟数或 null（解析失败）
 */
function parseOffsetString(offsetString) {
  const match = offsetString.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!match) return null

  const sign = match[1] === '+' ? 1 : -1
  const hours = parseInt(match[2], 10)
  const minutes = parseInt(match[3], 10)

  return sign * (hours * 60 + minutes)
}

/**
 * 获取浏览器支持的所有时区列表
 * @returns {Array<string>} IANA 时区名称数组
 */
function getAvailableTimezones() {
  if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
    }
  }
  return [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ]
}

const DST_CACHE = new Map()

/**
 * 检测某个时区在指定年份的夏令时转换日期（带缓存优化）
 * @param {string} timeZone - IANA 时区名称
 * @param {number} year - 年份
 * @returns {Array<Object>} 转换事件数组
 */
function detectDSTTransition(timeZone, year) {
  const cacheKey = `${timeZone}-${year}`
  if (DST_CACHE.has(cacheKey)) {
    return DST_CACHE.get(cacheKey)
  }

  const transitions = []
  const baseOffset = getTimezoneOffsetMinutes(timeZone, new Date(year, 0, 1))

  for (let month = 0; month < 12; month++) {
    const monthOffset = getTimezoneOffsetMinutes(timeZone, new Date(year, month, 15))
    if (monthOffset === baseOffset) continue

    for (let day = 1; day <= 31; day++) {
      try {
        const date1 = new Date(year, month, day, 0, 0, 0)
        const date2 = new Date(year, month, day, 12, 0, 0)

        const offset1 = getTimezoneOffsetMinutes(timeZone, date1)
        const offset2 = getTimezoneOffsetMinutes(timeZone, date2)

        if (offset1 !== offset2) {
          const offsetDiff = offset2 - offset1

          transitions.push({
            date: PlainDateTime.from({ year, month: month + 1, day, hour: 2 }),
            type: offsetDiff < 0 ? 'spring_forward' : 'fall_back',
            offsetChange: offsetDiff,
          })
          break
        }
      } catch {
      }
    }
  }

  if (DST_CACHE.size > 100) {
    const keys = Array.from(DST_CACHE.keys()).slice(0, 50)
    keys.forEach(k => DST_CACHE.delete(k))
  }
  DST_CACHE.set(cacheKey, transitions)

  return transitions
}

/**
 * 检查指定日期时间在指定时区的夏令时状态
 * @param {PlainDateTime} dateTime - 日期时间对象
 * @param {string} timeZone - IANA 时区名称
 * @returns {Object} 夏令时状态对象，包含 status、transition 和 message
 */
function checkDSTStatus(dateTime, timeZone) {
  const date = new Date(
    dateTime.year,
    dateTime.month - 1,
    dateTime.day,
    dateTime.hour,
    dateTime.minute,
    dateTime.second
  )

  const transitions = detectDSTTransition(timeZone, dateTime.year)

  for (const transition of transitions) {
    const transitionDate = new Date(
      transition.date.year,
      transition.date.month - 1,
      transition.date.day,
      transition.date.hour,
      0,
      0
    )

    const beforeDate = new Date(transitionDate.getTime() - 60 * 60 * 1000)
    const afterDate = new Date(transitionDate.getTime() + 60 * 60 * 1000)

    if (transition.type === 'spring_forward') {
      if (date >= beforeDate && date < afterDate) {
        return {
          status: DST_STATUS.SPRING_FORWARD_GAP,
          transition: transition,
          message: '该时间处于夏令时向前调整的间隙中，在该时区不存在',
        }
      }
    } else {
      if (date >= beforeDate && date < afterDate) {
        return {
          status: DST_STATUS.FALL_BACK_REPEAT,
          transition: transition,
          message: '该时间处于夏令时向后调整的重复时段中，在该时区存在两次',
        }
      }
    }
  }

  return {
    status: DST_STATUS.NORMAL,
    transition: null,
    message: '正常时间',
  }
}

/**
 * 格式化日期时间在指定时区的显示字符串
 * @param {PlainDateTime} dateTime - 日期时间对象
 * @param {string} timeZone - IANA 时区名称
 * @param {string} locale - 区域设置，默认 zh-CN
 * @returns {string} 格式化后的本地时间字符串
 */
function formatDateTimeInTimezone(dateTime, timeZone, locale = 'zh-CN') {
  const date = new Date(
    dateTime.year,
    dateTime.month - 1,
    dateTime.day,
    dateTime.hour,
    dateTime.minute,
    dateTime.second
  )

  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return dateTime.toString()
  }
}

/**
 * 格式化时区名称为更友好的显示格式
 * @param {string} timeZone - IANA 时区名称
 * @returns {string} 格式化后的时区名称
 */
function formatTimezoneName(timeZone) {
  return timeZone.replace(/_/g, ' ')
}

/**
 * 获取当前浏览器的本地时区
 * @returns {string} 当前时区的 IANA 名称
 */
function getLocalTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * 比较同一时刻在不同时区的显示时间
 * @param {PlainDateTime} dateTime - 基准日期时间对象
 * @param {Array<string>} timezones - 要比较的时区数组
 * @returns {Array<Object>} 每个时区的时间信息数组
 */
function compareTimezones(dateTime, timezones) {
  return timezones.map(tz => {
    try {
      const formatted = formatDateTimeInTimezone(dateTime, tz)
      const offset = getTimezoneOffsetMinutes(tz, new Date(
        dateTime.year,
        dateTime.month - 1,
        dateTime.day,
        dateTime.hour,
        dateTime.minute
      ))
      const dstStatus = checkDSTStatus(dateTime, tz)

      return {
        timezone: tz,
        displayName: formatTimezoneName(tz),
        formattedDateTime: formatted,
        offsetMinutes: offset,
        offsetString: formatOffsetMinutes(offset),
        dstStatus: dstStatus,
      }
    } catch (error) {
      return {
        timezone: tz,
        displayName: formatTimezoneName(tz),
        error: error.message,
      }
    }
  })
}

/**
 * 获取本地墙钟时间未指定时区偏移的警告信息
 * @returns {Object} 警告信息对象
 */
function getWallClockWithoutOffsetWarning() {
  return {
    type: 'wall_clock_no_offset',
    message: '使用本地墙钟时间但未指定时区偏移，可能存在时区歧义',
    suggestion: '请明确选择时区或使用 UTC 时间',
  }
}

export {
  getTimezoneOffsetMinutes,
  formatOffsetMinutes,
  parseOffsetString,
  getAvailableTimezones,
  detectDSTTransition,
  checkDSTStatus,
  formatDateTimeInTimezone,
  formatTimezoneName,
  getLocalTimezone,
  compareTimezones,
  getWallClockWithoutOffsetWarning,
}
