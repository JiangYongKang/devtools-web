/**
 * 日期运算：给定起始时刻，加 N 个工作日/自然日，向前/向后
 * 支持 cutoff 时间（如 17:00 前算当日）可配置
 */

import { formatDateStr, addWorkdays, addNaturalDays, isWorkday } from './calendar.js'
import { checkDSTStatus } from './dst.js'

/**
 * 解析 HH:MM 格式时间为小时和分钟
 * @param {string} timeStr - HH:MM 格式时间
 * @returns {{hours: number, minutes: number}}
 */
function parseCutoffTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

/**
 * 应用 cutoff 规则：如果时间晚于 cutoff，则从下一个工作日开始计算
 * @param {Date} date - 输入时间
 * @param {string} cutoffTime - cutoff 时间（HH:MM 格式）
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} holidayTable - 节假日表
 * @returns {{adjustedDate: Date, cutoffApplied: boolean, originalDate: Date}}
 */
function applyCutoff(date, cutoffTime, holidayTable = []) {
  const { hours, minutes } = parseCutoffTime(cutoffTime)
  const cutoffMinutes = hours * 60 + minutes
  const currentMinutes = date.getHours() * 60 + date.getMinutes()

  const result = {
    adjustedDate: new Date(date),
    cutoffApplied: false,
    originalDate: new Date(date),
  }

  if (currentMinutes >= cutoffMinutes) {
    result.cutoffApplied = true
    result.adjustedDate = new Date(date)
    result.adjustedDate.setHours(hours, minutes, 0, 0)

    let daysToAdd = 1
    let nextDay = new Date(result.adjustedDate)
    nextDay.setDate(nextDay.getDate() + daysToAdd)

    while (!isWorkday(nextDay, holidayTable)) {
      daysToAdd++
      nextDay = new Date(result.adjustedDate)
      nextDay.setDate(nextDay.getDate() + daysToAdd)
    }

    result.adjustedDate.setDate(result.adjustedDate.getDate() + daysToAdd)
  }

  return result
}

/**
 * 格式化日期时间为带时区的字符串
 * @param {Date} date - 日期对象
 * @param {string} timeZone - IANA 时区名称
 * @returns {string} 格式化的日期时间字符串
 */
function formatDateTime(date, timeZone) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * 日期运算主函数
 * @param {Date} startDate - 起始时刻
 * @param {number} amount - 数量（正数向后，负数向前）
 * @param {'workdays'|'natural'} unit - 单位：工作日或自然日
 * @param {object} options - 配置选项
 * @param {string} options.timeZone - IANA 时区名称
 * @param {string} [options.cutoffTime] - cutoff 时间（HH:MM 格式），不提供则不应用
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} [options.holidayTable] - 节假日表
 * @returns {{
 *   result: Date,
 *   resultFormatted: string,
 *   skippedDays: Array<{date: string, reason: string}>,
 *   cutoffAdjustment?: object,
 *   dstWarnings: Array<object>
 * }}
 */
function addDateUnits(startDate, amount, unit, options = {}) {
  const {
    timeZone = 'UTC',
    cutoffTime = null,
    holidayTable = [],
  } = options

  const dstWarnings = []
  let workingDate = new Date(startDate)

  let cutoffAdjustment = null
  if (cutoffTime && amount > 0) {
    cutoffAdjustment = applyCutoff(workingDate, cutoffTime, holidayTable)
    workingDate = cutoffAdjustment.adjustedDate
  }

  const startDstCheck = checkDSTStatus(workingDate, timeZone)
  if (startDstCheck.transition || startDstCheck.nonExistent || startDstCheck.repeated) {
    dstWarnings.push({
      when: 'start',
      ...startDstCheck,
    })
  }

  let resultDate
  let skippedDays = []

  if (unit === 'workdays') {
    const workdayResult = addWorkdays(workingDate, amount, holidayTable)
    resultDate = workdayResult.date
    skippedDays = workdayResult.skippedDays
  } else {
    resultDate = addNaturalDays(workingDate, amount)
    const direction = amount >= 0 ? 1 : -1
    const absAmount = Math.abs(amount)
    let checkDate = new Date(workingDate)
    for (let i = 0; i < absAmount; i++) {
      checkDate.setDate(checkDate.getDate() + direction)
      if (i === absAmount - 1) break
    }
  }

  const endDstCheck = checkDSTStatus(resultDate, timeZone)
  if (endDstCheck.transition || endDstCheck.nonExistent || endDstCheck.repeated) {
    dstWarnings.push({
      when: 'end',
      ...endDstCheck,
    })
  }

  return {
    result: resultDate,
    resultFormatted: formatDateTime(resultDate, timeZone),
    skippedDays,
    cutoffAdjustment,
    dstWarnings,
    timeZone,
  }
}

/**
 * 计算两个时刻之间的差值
 * @param {Date} start - 开始时间
 * @param {Date} end - 结束时间
 * @param {'hours'|'days'|'workdays'} unit - 单位
 * @param {object} options - 配置选项
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} [options.holidayTable] - 节假日表
 * @returns {number} 差值
 */
function dateDiff(start, end, unit, options = {}) {
  const { holidayTable = [] } = options
  const msDiff = end.getTime() - start.getTime()

  switch (unit) {
    case 'hours':
      return msDiff / (1000 * 60 * 60)
    case 'days':
      return msDiff / (1000 * 60 * 60 * 24)
    case 'workdays': {
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      let count = 0
      const direction = msDiff >= 0 ? 1 : -1
      let current = new Date(startDay)

      while (direction === 1 ? current.getTime() < endDay.getTime() : current.getTime() > endDay.getTime()) {
        current.setDate(current.getDate() + direction)
        if (isWorkday(current, holidayTable)) {
          count++
        }
      }

      const dayFraction = Math.abs(msDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60 * 24)
      return direction === 1 ? count + dayFraction : -(count + dayFraction)
    }
    default:
      return msDiff
  }
}

export {
  parseCutoffTime,
  applyCutoff,
  formatDateTime,
  addDateUnits,
  dateDiff,
}
