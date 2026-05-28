/**
 * 日历模型：ISO 工作日规则（周一至周五）+ 用户 JSON 节假日表
 * 支持固定日期与规则描述（如「农历」仅静态表，不实现天文农历算法）
 */

const ISO_WORKDAYS = [1, 2, 3, 4, 5] // 周一至周五，0=周日

/**
 * 解析 YYYY-MM-DD 格式日期为 Date 对象（本地时区午夜）
 * @param {string} dateStr - YYYY-MM-DD 格式日期
 * @returns {Date} 解析后的日期对象
 */
function parseDateStr(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 将 Date 对象格式化为 YYYY-MM-DD
 * @param {Date} date - 日期对象
 * @returns {string} YYYY-MM-DD 格式字符串
 */
function formatDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 判断是否为 ISO 工作日（周一至周五）
 * @param {Date} date - 日期对象
 * @returns {boolean} 是否为工作日
 */
function isIsoWorkday(date) {
  const dayOfWeek = date.getDay()
  return ISO_WORKDAYS.includes(dayOfWeek)
}

/**
 * 判断是否为周末（周六、周日）
 * @param {Date} date - 日期对象
 * @returns {boolean} 是否为周末
 */
function isWeekend(date) {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

/**
 * 从节假日表中查找指定日期是否为节假日
 * @param {Date} date - 日期对象
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} holidayTable - 节假日表
 * @returns {{isHoliday: boolean, entry?: object}} 节假日查询结果
 */
function lookupHoliday(date, holidayTable = []) {
  const dateStr = formatDateStr(date)
  const entry = holidayTable.find((h) => h.date === dateStr)
  if (entry) {
    const isHoliday = entry.type !== 'workday'
    return { isHoliday, entry }
  }
  return { isHoliday: false }
}

/**
 * 判断给定日期是否为有效工作日（非周末且非节假日，调休工作日除外）
 * @param {Date} date - 日期对象
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} holidayTable - 节假日表
 * @returns {boolean} 是否为工作日
 */
function isWorkday(date, holidayTable = []) {
  const holidayResult = lookupHoliday(date, holidayTable)

  if (holidayResult.entry) {
    if (holidayResult.entry.type === 'workday') {
      return true
    }
    return false
  }

  return isIsoWorkday(date)
}

/**
 * 增加 N 个自然日
 * @param {Date} date - 起始日期
 * @param {number} days - 天数（正数向后，负数向前）
 * @returns {Date} 计算后的日期
 */
function addNaturalDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * 增加 N 个工作日，跳过周末和节假日
 * @param {Date} date - 起始日期
 * @param {number} workdays - 工作日数（正数向后，负数向前）
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} holidayTable - 节假日表
 * @returns {{date: Date, skippedDays: Array<{date: string, reason: string}>}} 计算结果与跳过的日期
 */
function addWorkdays(date, workdays, holidayTable = []) {
  const result = new Date(date)
  const skippedDays = []
  const direction = workdays >= 0 ? 1 : -1
  const absDays = Math.abs(workdays)
  let count = 0

  while (count < absDays) {
    result.setDate(result.getDate() + direction)
    const dateStr = formatDateStr(result)
    const holidayResult = lookupHoliday(result, holidayTable)

    if (!isWorkday(result, holidayTable)) {
      let reason = isWeekend(result) ? '周末' : '节假日'
      if (holidayResult.entry) {
        reason = holidayResult.entry.name || reason
      }
      skippedDays.push({ date: dateStr, reason })
      continue
    }

    count++
  }

  return { date: result, skippedDays }
}

/**
 * 计算两个日期之间的工作日数
 * @param {Date} start - 起始日期
 * @param {Date} end - 结束日期
 * @param {Array<{date: string, name?: string, type?: 'holiday'|'workday'}>} holidayTable - 节假日表
 * @returns {number} 工作日数
 */
function countWorkdaysBetween(start, end, holidayTable = []) {
  const startTime = start.getTime()
  const endTime = end.getTime()

  if (startTime === endTime) return 0

  const direction = endTime > startTime ? 1 : -1
  const current = new Date(start)
  let count = 0

  while (direction === 1 ? current.getTime() < endTime : current.getTime() > endTime) {
    current.setDate(current.getDate() + direction)
    if (direction === 1 && current.getTime() > endTime) break
    if (direction === -1 && current.getTime() < endTime) break
    if (isWorkday(current, holidayTable)) {
      count++
    }
  }

  return direction === 1 ? count : -count
}

export {
  ISO_WORKDAYS,
  parseDateStr,
  formatDateStr,
  isIsoWorkday,
  isWeekend,
  lookupHoliday,
  isWorkday,
  addNaturalDays,
  addWorkdays,
  countWorkdaysBetween,
}
