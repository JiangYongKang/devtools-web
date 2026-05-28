/**
 * 工作日历规则引擎 - 逻辑模块聚合导出
 */

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
} from './calendar.js'

export {
  getTimezoneOffset,
  formatOffset,
  detectDSTTransition,
  checkNonExistentTime,
  checkRepeatedHour,
  checkDSTStatus,
  COMMON_TIMEZONES,
} from './dst.js'

export {
  parseCutoffTime,
  applyCutoff,
  formatDateTime,
  addDateUnits,
  dateDiff,
} from './dateOps.js'

export {
  calculateSLAByHours,
  calculateSLAByWorkdays,
  checkSLAOverdue,
} from './sla.js'

export {
  CHINA_HOLIDAYS_2025,
  US_HOLIDAYS_2025,
  US_DST_EXAMPLES_2025,
  UK_DST_EXAMPLES_2025,
  CROSS_MONTH_WORKDAY_EXAMPLE,
  EXAMPLES,
} from './examples.js'
