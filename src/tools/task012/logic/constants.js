const FIELD_DEFINITIONS = {
  seconds: {
    nameZh: '秒',
    nameEn: 'Seconds',
    min: 0,
    max: 59,
    allowedSpecialChars: ['*', ',', '-', '/'],
    position: 0,
  },
  minutes: {
    nameZh: '分',
    nameEn: 'Minutes',
    min: 0,
    max: 59,
    allowedSpecialChars: ['*', ',', '-', '/'],
    position: 1,
  },
  hours: {
    nameZh: '时',
    nameEn: 'Hours',
    min: 0,
    max: 23,
    allowedSpecialChars: ['*', ',', '-', '/'],
    position: 2,
  },
  dayOfMonth: {
    nameZh: '日',
    nameEn: 'Day of Month',
    min: 1,
    max: 31,
    allowedSpecialChars: ['*', ',', '-', '/', '?', 'L', 'W'],
    position: 3,
  },
  month: {
    nameZh: '月',
    nameEn: 'Month',
    min: 1,
    max: 12,
    allowedSpecialChars: ['*', ',', '-', '/'],
    position: 4,
    aliases: {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    },
  },
  dayOfWeek: {
    nameZh: '周',
    nameEn: 'Day of Week',
    min: 0,
    max: 7,
    allowedSpecialChars: ['*', ',', '-', '/', '?', 'L', '#'],
    position: 5,
    aliases: {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    },
  },
}

const MONTH_NAMES_ZH = {
  1: '一月', 2: '二月', 3: '三月', 4: '四月', 5: '五月', 6: '六月',
  7: '七月', 8: '八月', 9: '九月', 10: '十月', 11: '十一月', 12: '十二月',
}

const MONTH_NAMES_EN = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
  7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

const WEEKDAY_NAMES_ZH = {
  0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日',
}

const WEEKDAY_NAMES_EN = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
}

const COMMON_CRON_EXAMPLES = [
  { label: '每秒执行', expression: '* * * * * ?', description: '每一秒钟执行一次' },
  { label: '每分钟执行', expression: '0 * * * * ?', description: '每分钟的 0 秒执行' },
  { label: '每小时执行', expression: '0 0 * * * ?', description: '每小时的 0 分 0 秒执行' },
  { label: '每天 0 点执行', expression: '0 0 0 * * ?', description: '每天凌晨 00:00:00 执行' },
  { label: '每天 8 点执行', expression: '0 0 8 * * ?', description: '每天早上 08:00:00 执行' },
  { label: '每周一 9 点', expression: '0 0 9 ? * MON', description: '每周一上午 09:00:00 执行' },
  { label: '每月 1 号 0 点', expression: '0 0 0 1 * ?', description: '每月 1 号凌晨 00:00:00 执行' },
  { label: '工作日 9 点', expression: '0 0 9 ? * MON-FRI', description: '周一至周五上午 09:00:00 执行' },
]

const DEFAULT_PARAMS = {
  expression: '',
  timezoneId: 'Asia/Shanghai',
  language: 'zh',
  expandSteps: false,
  includeNextTriggers: false,
  nextTriggerCount: 5,
}

export {
  FIELD_DEFINITIONS,
  MONTH_NAMES_ZH,
  MONTH_NAMES_EN,
  WEEKDAY_NAMES_ZH,
  WEEKDAY_NAMES_EN,
  COMMON_CRON_EXAMPLES,
  DEFAULT_PARAMS,
}
