/**
 * 示例数据：中国法定假日样表、US DST 跳变、跨月工作日加 10 天
 *
 * 注意：农历相关节假日仅提供静态日期表，不实现天文农历算法
 */

/**
 * 中国 2025 年法定节假日样表（静态表，含调休工作日）
 * 声明：农历日期为静态映射，不包含天文农历算法
 */
const CHINA_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: '元旦', type: 'holiday' },
  { date: '2025-01-28', name: '2025年除夕', type: 'holiday', note: '仅为2025年静态日期，不包含农历算法' },
  { date: '2025-01-29', name: '2025年春节', type: 'holiday', note: '仅为2025年静态日期，不包含农历算法' },
  { date: '2025-01-30', name: '春节假期', type: 'holiday' },
  { date: '2025-01-31', name: '春节假期', type: 'holiday' },
  { date: '2025-02-01', name: '春节假期', type: 'holiday' },
  { date: '2025-02-02', name: '春节假期', type: 'holiday' },
  { date: '2025-02-04', name: '春节调休上班', type: 'workday' },
  { date: '2025-04-04', name: '2025年清明节', type: 'holiday' },
  { date: '2025-05-01', name: '劳动节', type: 'holiday' },
  { date: '2025-05-02', name: '劳动节假期', type: 'holiday' },
  { date: '2025-05-03', name: '劳动节假期', type: 'holiday' },
  { date: '2025-04-27', name: '劳动节调休上班', type: 'workday' },
  { date: '2025-05-31', name: '2025年端午节', type: 'holiday', note: '仅为2025年静态日期，不包含农历算法' },
  { date: '2025-10-01', name: '国庆节', type: 'holiday' },
  { date: '2025-10-02', name: '国庆假期', type: 'holiday' },
  { date: '2025-10-03', name: '国庆假期', type: 'holiday' },
  { date: '2025-10-04', name: '国庆假期', type: 'holiday' },
  { date: '2025-10-05', name: '国庆假期', type: 'holiday' },
  { date: '2025-10-06', name: '国庆假期', type: 'holiday' },
  { date: '2025-10-07', name: '国庆假期', type: 'holiday' },
  { date: '2025-09-28', name: '国庆调休上班', type: 'workday' },
  { date: '2025-10-11', name: '国庆调休上班', type: 'workday' },
]

/**
 * 美国 2025 年联邦节假日样表
 */
const US_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: "New Year's Day", type: 'holiday' },
  { date: '2025-01-20', name: 'Martin Luther King Jr. Day', type: 'holiday' },
  { date: '2025-02-17', name: "Presidents' Day", type: 'holiday' },
  { date: '2025-05-26', name: 'Memorial Day', type: 'holiday' },
  { date: '2025-06-19', name: 'Juneteenth', type: 'holiday' },
  { date: '2025-07-04', name: 'Independence Day', type: 'holiday' },
  { date: '2025-09-01', name: 'Labor Day', type: 'holiday' },
  { date: '2025-10-13', name: 'Columbus Day', type: 'holiday' },
  { date: '2025-11-11', name: 'Veterans Day', type: 'holiday' },
  { date: '2025-11-27', name: 'Thanksgiving Day', type: 'holiday' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'holiday' },
]

/**
 * DST 跳变示例配置（America/New_York 时区 2025 年）
 * 春季向前：3月9日 2:00 → 3:00（缺失 2:00-3:00）
 * 秋季回退：11月2日 2:00 → 1:00（重复 1:00-2:00）
 */
const US_DST_EXAMPLES_2025 = {
  springForward: {
    date: '2025-03-09',
    timeZone: 'America/New_York',
    nonExistentHour: 2,
    description: 'DST 春季向前跳变：2025-03-09 02:00 不存在，时钟直接跳到 03:00',
  },
  fallBack: {
    date: '2025-11-02',
    timeZone: 'America/New_York',
    repeatedHour: 1,
    description: 'DST 秋季回退：2025-11-02 01:00 出现两次，先 EDT 后 EST',
  },
}

/**
 * Europe/London 时区 2025 年 DST 跳变示例
 */
const UK_DST_EXAMPLES_2025 = {
  springForward: {
    date: '2025-03-30',
    timeZone: 'Europe/London',
    nonExistentHour: 1,
    description: 'BST 开始：2025-03-30 01:00 不存在，时钟直接跳到 02:00',
  },
  fallBack: {
    date: '2025-10-26',
    timeZone: 'Europe/London',
    repeatedHour: 1,
    description: 'GMT 恢复：2025-10-26 01:00 出现两次，先 BST 后 GMT',
  },
}

/**
 * 跨月工作日加 10 天示例
 */
const CROSS_MONTH_WORKDAY_EXAMPLE = {
  startDate: '2025-09-22',
  startTime: '10:00',
  addWorkdays: 10,
  timeZone: 'Asia/Shanghai',
  description: '2025-09-22（周一）加 10 个工作日，跨越国庆假期',
  expectedResult: '2025-10-10',
}

/**
 * 内置示例列表（供 UI 使用）
 */
const EXAMPLES = [
  {
    id: 'china-holidays',
    name: '中国法定假日样表',
    description: '2025 年中国法定节假日及调休工作日配置，标注农历日期为静态映射',
    holidayTable: CHINA_HOLIDAYS_2025,
    preset: {
      startDate: '2025-01-27',
      startTime: '14:00',
      timeZone: 'Asia/Shanghai',
      addAmount: 3,
      addUnit: 'workdays',
      cutoffTime: '17:00',
    },
  },
  {
    id: 'us-dst-transition',
    name: 'US DST 跳变示例',
    description: 'America/New_York 时区 2025 年 DST 春季向前与秋季回退边界',
    holidayTable: US_HOLIDAYS_2025,
    preset: {
      startDate: '2025-03-09',
      startTime: '01:30',
      timeZone: 'America/New_York',
      addAmount: 1,
      addUnit: 'natural',
      cutoffTime: '',
    },
  },
  {
    id: 'cross-month-workdays',
    name: '跨月工作日加 10 天',
    description: '2025-09-22 起加 10 个工作日，跨越国庆假期',
    holidayTable: CHINA_HOLIDAYS_2025,
    preset: {
      startDate: '2025-09-22',
      startTime: '10:00',
      timeZone: 'Asia/Shanghai',
      addAmount: 10,
      addUnit: 'workdays',
      cutoffTime: '17:00',
    },
  },
]

export {
  CHINA_HOLIDAYS_2025,
  US_HOLIDAYS_2025,
  US_DST_EXAMPLES_2025,
  UK_DST_EXAMPLES_2025,
  CROSS_MONTH_WORKDAY_EXAMPLE,
  EXAMPLES,
}
