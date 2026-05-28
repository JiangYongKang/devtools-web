/**
 * SLA 计算：输入 SLA 小时数/工作日截止，输出截止时刻
 * 支持多里程碑列表
 */

import { addDateUnits, formatDateTime, dateDiff } from './dateOps.js'
import { isWorkday, addWorkdays, formatDateStr } from './calendar.js'
import { checkDSTStatus } from './dst.js'

/**
 * 计算 SLA 截止时刻（按小时）
 * @param {Date} startTime - 开始时间
 * @param {number} slaHours - SLA 小时数
 * @param {object} options - 配置选项
 * @param {string} options.timeZone - IANA 时区名称
 * @param {string} [options.cutoffTime] - cutoff 时间
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} [options.holidayTable] - 节假日表
 * @param {object} [options.businessHours] - 工作时间配置 { start: '09:00', end: '17:00' }
 * @returns {{deadline: Date, deadlineFormatted: string, milestones: Array<object>, dstWarnings: Array<object>}}
 */
function calculateSLAByHours(startTime, slaHours, options = {}) {
  const {
    timeZone = 'UTC',
    cutoffTime = null,
    holidayTable = [],
    businessHours = { start: '09:00', end: '17:00' },
  } = options

  const dstWarnings = []
  const milestones = []

  const startDST = checkDSTStatus(startTime, timeZone)
  if (startDST.transition || startDST.nonExistent || startDST.repeated) {
    dstWarnings.push({ when: 'start', ...startDST })
  }

  let currentTime = new Date(startTime)
  let remainingHours = slaHours

  const [bhStartHour, bhStartMin] = businessHours.start.split(':').map(Number)
  const [bhEndHour, bhEndMin] = businessHours.end.split(':').map(Number)
  const businessDayHours = (bhEndHour * 60 + bhEndMin - bhStartHour * 60 - bhStartMin) / 60

  const milestonePercentages = [0.25, 0.5, 0.75, 1.0]
  let milestoneIndex = 0

  while (remainingHours > 0) {
    const currentDateStr = formatDateStr(currentTime)

    if (!isWorkday(currentTime, holidayTable)) {
      currentTime.setHours(0, 0, 0, 0)
      currentTime.setDate(currentTime.getDate() + 1)
      continue
    }

    const dayStart = new Date(currentTime)
    dayStart.setHours(bhStartHour, bhStartMin, 0, 0)

    const dayEnd = new Date(currentTime)
    dayEnd.setHours(bhEndHour, bhEndMin, 0, 0)

    if (currentTime < dayStart) {
      currentTime = new Date(dayStart)
      continue
    }

    if (currentTime >= dayEnd) {
      currentTime.setHours(0, 0, 0, 0)
      currentTime.setDate(currentTime.getDate() + 1)
      continue
    }

    const availableToday = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60 * 60)
    const hoursToConsume = Math.min(remainingHours, availableToday)

    while (milestoneIndex < milestonePercentages.length) {
      const milestoneHours = slaHours * milestonePercentages[milestoneIndex]
      const consumedSoFar = slaHours - remainingHours
      if (consumedSoFar + hoursToConsume >= milestoneHours) {
        const milestoneDate = new Date(currentTime.getTime() +
          (milestoneHours - consumedSoFar) * 60 * 60 * 1000)
        milestones.push({
          percentage: milestonePercentages[milestoneIndex] * 100,
          label: `${milestonePercentages[milestoneIndex] * 100}%`,
          time: milestoneDate,
          timeFormatted: formatDateTime(milestoneDate, timeZone),
          hoursFromStart: milestoneHours,
        })
        milestoneIndex++
      } else {
        break
      }
    }

    currentTime = new Date(currentTime.getTime() + hoursToConsume * 60 * 60 * 1000)
    remainingHours -= hoursToConsume

    if (remainingHours > 0 && currentTime >= dayEnd) {
      currentTime.setHours(0, 0, 0, 0)
      currentTime.setDate(currentTime.getDate() + 1)
    }
  }

  const endDST = checkDSTStatus(currentTime, timeZone)
  if (endDST.transition || endDST.nonExistent || endDST.repeated) {
    dstWarnings.push({ when: 'end', ...endDST })
  }

  return {
    deadline: currentTime,
    deadlineFormatted: formatDateTime(currentTime, timeZone),
    milestones,
    dstWarnings,
    slaHours,
    timeZone,
  }
}

/**
 * 计算 SLA 截止时刻（按工作日数）
 * @param {Date} startTime - 开始时间
 * @param {number} slaWorkdays - SLA 工作日数
 * @param {object} options - 配置选项
 * @param {string} options.timeZone - IANA 时区名称
 * @param {string} [options.cutoffTime] - cutoff 时间
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} [options.holidayTable] - 节假日表
 * @param {object} [options.businessHours] - 工作时间配置 { start: '09:00', end: '17:00' }
 * @param {boolean} [options.endOfDay=false] - 是否截止到工作日结束时间
 * @returns {{deadline: Date, deadlineFormatted: string, milestones: Array<object>, dstWarnings: Array<object>}}
 */
function calculateSLAByWorkdays(startTime, slaWorkdays, options = {}) {
  const {
    timeZone = 'UTC',
    cutoffTime = null,
    holidayTable = [],
    businessHours = { start: '09:00', end: '17:00' },
    endOfDay = false,
  } = options

  const result = addDateUnits(startTime, slaWorkdays, 'workdays', {
    timeZone,
    cutoffTime,
    holidayTable,
  })

  if (endOfDay) {
    const [bhEndHour, bhEndMin] = businessHours.end.split(':').map(Number)
    result.result.setHours(bhEndHour, bhEndMin, 0, 0)
    result.resultFormatted = formatDateTime(result.result, timeZone)
  }

  const milestones = []
  const milestoneDays = [0.25, 0.5, 0.75, 1.0]
  for (const pct of milestoneDays) {
    const milestoneDaysCount = Math.ceil(slaWorkdays * pct)
    const milestoneResult = addDateUnits(startTime, milestoneDaysCount, 'workdays', {
      timeZone,
      cutoffTime,
      holidayTable,
    })
    milestones.push({
      percentage: pct * 100,
      label: `${pct * 100}% (第 ${milestoneDaysCount} 个工作日)`,
      time: milestoneResult.result,
      timeFormatted: milestoneResult.resultFormatted,
      workdaysFromStart: milestoneDaysCount,
    })
  }

  return {
    deadline: result.result,
    deadlineFormatted: result.resultFormatted,
    milestones,
    dstWarnings: result.dstWarnings,
    slaWorkdays,
    timeZone,
    skippedDays: result.skippedDays,
  }
}

/**
 * 计算两个时间之间的工作小时数（仅计算工作日的工作时间段内的小时）
 * @param {Date} from - 起始时间
 * @param {Date} to - 结束时间
 * @param {object} options - 配置选项
 * @returns {number} 工作小时数
 */
function countWorkingHoursBetween(from, to, options = {}) {
  const {
    holidayTable = [],
    businessHours = { start: '09:00', end: '17:00' },
  } = options

  const [bhStartHour, bhStartMin] = businessHours.start.split(':').map(Number)
  const [bhEndHour, bhEndMin] = businessHours.end.split(':').map(Number)

  let currentTime = new Date(from)
  let totalHours = 0

  while (currentTime < to) {
    if (!isWorkday(currentTime, holidayTable)) {
      currentTime.setHours(0, 0, 0, 0)
      currentTime.setDate(currentTime.getDate() + 1)
      continue
    }

    const dayStart = new Date(currentTime)
    dayStart.setHours(bhStartHour, bhStartMin, 0, 0)

    const dayEnd = new Date(currentTime)
    dayEnd.setHours(bhEndHour, bhEndMin, 0, 0)

    if (currentTime < dayStart) {
      currentTime = new Date(dayStart)
      continue
    }

    if (currentTime >= dayEnd) {
      currentTime.setHours(0, 0, 0, 0)
      currentTime.setDate(currentTime.getDate() + 1)
      continue
    }

    const effectiveEnd = new Date(Math.min(dayEnd.getTime(), to.getTime()))
    totalHours += (effectiveEnd.getTime() - currentTime.getTime()) / (1000 * 60 * 60)
    currentTime = new Date(effectiveEnd)

    if (currentTime >= dayEnd) {
      currentTime.setHours(0, 0, 0, 0)
      currentTime.setDate(currentTime.getDate() + 1)
    }
  }

  return Math.round(totalHours * 100) / 100
}

/**
 * 验证 SLA 是否超时
 * @param {Date} startTime - 开始时间
 * @param {Date} actualTime - 实际完成时间
 * @param {number} slaHours - SLA 小时数
 * @param {object} options - 配置选项
 * @returns {{isOverdue: boolean, overdueHours: number, remainingHours: number, slaDeadline: Date}}
 */
function checkSLAOverdue(startTime, actualTime, slaHours, options = {}) {
  const slaResult = calculateSLAByHours(startTime, slaHours, options)
  const isOverdue = actualTime.getTime() > slaResult.deadline.getTime()

  let workingHours = 0
  if (isOverdue) {
    workingHours = countWorkingHoursBetween(slaResult.deadline, actualTime, options)
  } else {
    workingHours = countWorkingHoursBetween(actualTime, slaResult.deadline, options)
  }

  return {
    isOverdue,
    overdueHours: isOverdue ? workingHours : 0,
    remainingHours: isOverdue ? 0 : workingHours,
    slaDeadline: slaResult.deadline,
    slaDeadlineFormatted: slaResult.deadlineFormatted,
  }
}

export {
  calculateSLAByHours,
  calculateSLAByWorkdays,
  checkSLAOverdue,
  countWorkingHoursBetween,
}
