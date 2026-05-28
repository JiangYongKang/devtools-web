/**
 * DST 边界检测与处理
 * 使用 Intl.DateTimeFormat 检测时区偏移变化
 * 展示「不存在的时间」与「重复一小时」警告
 */

/**
 * 获取指定时区在给定时刻的 UTC 偏移（分钟）
 * @param {Date} date - 时间点
 * @param {string} timeZone - IANA 时区名称
 * @returns {number} UTC 偏移量（分钟）
 */
function getTimezoneOffset(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})

  const utcDate = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )

  return Math.round((utcDate - date.getTime()) / 60000)
}

/**
 * 格式化 UTC 偏移为字符串（如 +05:00, -04:00）
 * @param {number} offsetMinutes - 偏移分钟数
 * @returns {string} 格式化的偏移字符串
 */
function formatOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absMinutes / 60)
  const minutes = absMinutes % 60
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * 根据年月日创建一个 UTC 正午时间的 Date 对象，确保在任何时区内都落在正确的日历日
 * @param {number} year - 年
 * @param {number} month - 月（0-11）
 * @param {number} day - 日
 * @returns {Date} UTC 正午时间的 Date 对象
 */
function createUTCMiddayDate(year, month, day) {
  return new Date(Date.UTC(year, month, day, 12, 0, 0))
}

/**
 * 检测指定日期是否跨 DST 边界
 * @param {Date} date - 要检测的日期（取其年月日在目标时区中的日历日）
 * @param {string} timeZone - IANA 时区名称
 * @returns {{hasTransition: boolean, transitionType?: 'spring-forward'|'fall-back', transitionInfo?: object}}
 */
function detectDSTTransition(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})

  const year = Number(parts.year)
  const month = Number(parts.month) - 1
  const day = Number(parts.day)

  const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0))
  const dayEnd = new Date(Date.UTC(year, month, day + 1, 0, 0, 0))

  const offsetStart = getTimezoneOffset(dayStart, timeZone)
  const offsetEnd = getTimezoneOffset(dayEnd, timeZone)

  if (offsetStart === offsetEnd) {
    return { hasTransition: false }
  }

  const transitionType = offsetEnd > offsetStart ? 'spring-forward' : 'fall-back'
  const offsetDiff = offsetEnd - offsetStart

  let transitionHour = null
  let prevOffset = offsetStart
  for (let h = 1; h <= 48; h++) {
    const checkTime = new Date(dayStart.getTime() + h * 3600000)
    const currentOffset = getTimezoneOffset(checkTime, timeZone)
    if (currentOffset !== prevOffset) {
      const localHourDtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: '2-digit',
      })
      const beforeTransition = new Date(dayStart.getTime() + (h - 1) * 3600000)
      const afterTransition = new Date(dayStart.getTime() + h * 3600000)
      const localHourBefore = Number(localHourDtf.format(beforeTransition))
      const localHourAfter = Number(localHourDtf.format(afterTransition))

      if (transitionType === 'spring-forward') {
        transitionHour = localHourBefore + 1
        if (transitionHour >= 24) transitionHour -= 24
      } else {
        transitionHour = localHourAfter
      }
      break
    }
    prevOffset = currentOffset
  }

  return {
    hasTransition: true,
    transitionType,
    transitionInfo: {
      offsetBefore: offsetStart,
      offsetAfter: offsetEnd,
      offsetDiff,
      transitionHour,
      offsetBeforeFormatted: formatOffset(offsetStart),
      offsetAfterFormatted: formatOffset(offsetEnd),
    },
  }
}

/**
 * 检查给定的本地时间是否为「不存在的时间」（DST 春季向前跳变时缺失的时间）
 * @param {number} year - 年
 * @param {number} month - 月（1-12）
 * @param {number} day - 日
 * @param {number} hour - 时（0-23）
 * @param {string} timeZone - IANA 时区名称
 * @returns {{isNonExistent: boolean, warning?: string, info?: object}}
 */
function checkNonExistentTime(year, month, day, hour, timeZone) {
  const date = createUTCMiddayDate(year, month - 1, day)
  const dstCheck = detectDSTTransition(date, timeZone)

  if (!dstCheck.hasTransition || dstCheck.transitionType !== 'spring-forward') {
    return { isNonExistent: false }
  }

  const { transitionInfo } = dstCheck
  const gapHours = Math.abs(transitionInfo.offsetDiff) / 60
  const missingStartHour = transitionInfo.transitionHour
  const missingEndHour = missingStartHour + gapHours

  if (hour >= missingStartHour && hour < missingEndHour) {
    return {
      isNonExistent: true,
      warning: `该时区 ${month}/${day}  ${missingStartHour}:00 至 ${missingEndHour}:00 不存在（DST 春季向前跳变）`,
      info: {
        transitionType: 'spring-forward',
        missingHours: `${missingStartHour}:00 - ${missingEndHour}:00`,
        offsetBefore: transitionInfo.offsetBeforeFormatted,
        offsetAfter: transitionInfo.offsetAfterFormatted,
        suggestion: `建议使用 ${missingEndHour}:00 之后的时间`,
      },
    }
  }

  return { isNonExistent: false }
}

/**
 * 检查给定的本地时间是否为「重复小时」（DST 秋季回退时重复的时间）
 * @param {number} year - 年
 * @param {number} month - 月（1-12）
 * @param {number} day - 日
 * @param {number} hour - 时（0-23）
 * @param {string} timeZone - IANA 时区名称
 * @returns {{isRepeated: boolean, warning?: string, info?: object}}
 */
function checkRepeatedHour(year, month, day, hour, timeZone) {
  const date = createUTCMiddayDate(year, month - 1, day)
  const dstCheck = detectDSTTransition(date, timeZone)

  if (!dstCheck.hasTransition || dstCheck.transitionType !== 'fall-back') {
    return { isRepeated: false }
  }

  const { transitionInfo } = dstCheck
  const repeatHours = Math.abs(transitionInfo.offsetDiff) / 60
  const repeatStartHour = transitionInfo.transitionHour
  const repeatEndHour = repeatStartHour + repeatHours

  if (hour >= repeatStartHour && hour < repeatEndHour) {
    return {
      isRepeated: true,
      warning: `该时区 ${month}/${day} ${hour}:00 会出现两次（DST 秋季回退）`,
      info: {
        transitionType: 'fall-back',
        repeatedHours: `${repeatStartHour}:00 - ${repeatEndHour}:00`,
        offsetBefore: transitionInfo.offsetBeforeFormatted,
        offsetAfter: transitionInfo.offsetAfterFormatted,
        occurrence1: `第 1 次（DST 前）: UTC${transitionInfo.offsetBeforeFormatted}`,
        occurrence2: `第 2 次（DST 后）: UTC${transitionInfo.offsetAfterFormatted}`,
      },
    }
  }

  return { isRepeated: false }
}

/**
 * 完整检查指定时间的 DST 状态
 * @param {Date} date - 时间点
 * @param {string} timeZone - IANA 时区名称
 * @returns {{offset: string, transition?: object, nonExistent?: object, repeated?: object}}
 */
function checkDSTStatus(date, timeZone) {
  const offset = getTimezoneOffset(date, timeZone)

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  })
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})

  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)
  const hour = Number(parts.hour)

  const result = {
    offset: formatOffset(offset),
  }

  const transition = detectDSTTransition(date, timeZone)
  if (transition.hasTransition) {
    result.transition = transition
  }

  const nonExistent = checkNonExistentTime(year, month, day, hour, timeZone)
  if (nonExistent.isNonExistent) {
    result.nonExistent = nonExistent
  }

  const repeated = checkRepeatedHour(year, month, day, hour, timeZone)
  if (repeated.isRepeated) {
    result.repeated = repeated
  }

  return result
}

/**
 * 常用 IANA 时区列表
 */
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (协调世界时)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (北京时间)' },
  { value: 'America/New_York', label: 'America/New_York (美东时间)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (美西时间)' },
  { value: 'Europe/London', label: 'Europe/London (伦敦时间)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (巴黎时间)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (柏林时间)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (东京时间)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (香港时间)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (悉尼时间)' },
]

export {
  createUTCMiddayDate,
  getTimezoneOffset,
  formatOffset,
  detectDSTTransition,
  checkNonExistentTime,
  checkRepeatedHour,
  checkDSTStatus,
  COMMON_TIMEZONES,
}
