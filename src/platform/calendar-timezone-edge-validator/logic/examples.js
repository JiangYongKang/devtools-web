import { EXAMPLE_KEYS } from './constants.js'
import { PlainDate, PlainDateTime } from './temporal-polyfill.js'

const EXAMPLES = {
  [EXAMPLE_KEYS.SPRING_FORWARD]: {
    key: EXAMPLE_KEYS.SPRING_FORWARD,
    name: 'Spring Forward 夏令时向前调整',
    description: '时钟从 02:00 直接跳到 03:00，期间时间不存在',
    dateTime: PlainDateTime.from({ year: 2024, month: 3, day: 10, hour: 2, minute: 30 }),
    timezone: 'America/New_York',
    tags: ['DST', 'Spring Forward', 'Gap'],
  },
  [EXAMPLE_KEYS.FALL_BACK]: {
    key: EXAMPLE_KEYS.FALL_BACK,
    name: 'Fall Back 夏令时向后调整',
    description: '时钟从 02:00 回退到 01:00，期间时间出现两次',
    dateTime: PlainDateTime.from({ year: 2024, month: 11, day: 3, hour: 1, minute: 30 }),
    timezone: 'America/New_York',
    tags: ['DST', 'Fall Back', 'Repeat'],
  },
  [EXAMPLE_KEYS.UTC_YEAR_END]: {
    key: EXAMPLE_KEYS.UTC_YEAR_END,
    name: 'UTC 年末跨天',
    description: 'UTC 年末 12月31日，不同时区跨年时间对比',
    dateTime: PlainDateTime.from({ year: 2024, month: 12, day: 31, hour: 23, minute: 30 }),
    timezone: 'UTC',
    tags: ['UTC', 'Year End', '跨天'],
  },
  [EXAMPLE_KEYS.SOUTHERN_DST]: {
    key: EXAMPLE_KEYS.SOUTHERN_DST,
    name: '南半球夏令时',
    description: '南半球（如澳大利亚、新西兰）夏令时方向与北半球相反',
    dateTime: PlainDateTime.from({ year: 2024, month: 10, day: 6, hour: 2, minute: 30 }),
    timezone: 'Australia/Sydney',
    tags: ['DST', '南半球', 'Spring Forward'],
  },
  LEAP_DAY: {
    key: 'leap_day',
    name: '闰年闰日',
    description: '2月29日，四年一遇的特殊日期',
    dateTime: PlainDateTime.from({ year: 2024, month: 2, day: 29, hour: 12, minute: 0 }),
    timezone: 'UTC',
    tags: ['Leap Year', '闰日'],
  },
  MONTH_END: {
    key: 'month_end',
    name: '月末日期',
    description: '不同月份月末日期有效性验证',
    dateTime: PlainDateTime.from({ year: 2024, month: 4, day: 30, hour: 23, minute: 59 }),
    timezone: 'UTC',
    tags: ['月末', 'Month End'],
  },
  GREGORIAN_START: {
    key: 'gregorian_start',
    name: '格里高利历起始',
    description: '1582年10月15日，格里高利历开始日期',
    dateTime: PlainDateTime.from({ year: 1582, month: 10, day: 15, hour: 0, minute: 0 }),
    timezone: 'UTC',
    tags: ['格里高利历', '历法转换'],
  },
}

const COMPARISON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

function getExample(key) {
  return EXAMPLES[key] || null
}

function getAllExamples() {
  return Object.values(EXAMPLES)
}

function getExampleKeys() {
  return Object.keys(EXAMPLES)
}

export {
  EXAMPLES,
  COMPARISON_TIMEZONES,
  getExample,
  getAllExamples,
  getExampleKeys,
}
