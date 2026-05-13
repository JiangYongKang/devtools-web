const CATEGORIES = {
  BYTE: 'byte',
  BIT: 'bit',
  BITRATE: 'bitrate',
  BYTE_PER_SECOND: 'byte_per_second',
  TIME: 'time',
}

const CATEGORY_LABELS = {
  [CATEGORIES.BYTE]: '字节存储',
  [CATEGORIES.BIT]: '比特存储',
  [CATEGORIES.BITRATE]: '比特率',
  [CATEGORIES.BYTE_PER_SECOND]: '字节/秒',
  [CATEGORIES.TIME]: '时间',
}

const CATEGORY_DESCRIPTIONS = {
  [CATEGORIES.BYTE]: '以字节为基础的存储单位',
  [CATEGORIES.BIT]: '以比特为基础的存储单位',
  [CATEGORIES.BITRATE]: '每秒传输的比特数',
  [CATEGORIES.BYTE_PER_SECOND]: '每秒传输的字节数',
  [CATEGORIES.TIME]: '时间单位',
}

const UNIT_SYSTEMS = {
  IEC: 'iec',
  SI: 'si',
}

const BYTE_UNITS = [
  { code: 'B', name: '字节', symbol: 'B', base: null, exponent: 0, category: CATEGORIES.BYTE, system: null, aliases: ['byte', 'bytes'] },
  { code: 'KiB', name: '千字节 (IEC)', symbol: 'KiB', base: 1024, exponent: 1, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.IEC, aliases: ['kib', 'KIB'] },
  { code: 'MiB', name: '兆字节 (IEC)', symbol: 'MiB', base: 1024, exponent: 2, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.IEC, aliases: ['mib', 'MIB'] },
  { code: 'GiB', name: '吉字节 (IEC)', symbol: 'GiB', base: 1024, exponent: 3, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.IEC, aliases: ['gib', 'GIB'] },
  { code: 'TiB', name: '太字节 (IEC)', symbol: 'TiB', base: 1024, exponent: 4, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.IEC, aliases: ['tib', 'TIB'] },
  { code: 'PiB', name: '拍字节 (IEC)', symbol: 'PiB', base: 1024, exponent: 5, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.IEC, aliases: ['pib', 'PIB'] },
  { code: 'EiB', name: '艾字节 (IEC)', symbol: 'EiB', base: 1024, exponent: 6, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.IEC, aliases: ['eib', 'EIB'] },
  { code: 'KB', name: '千字节 (SI)', symbol: 'KB', base: 1000, exponent: 1, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.SI, aliases: ['kb'] },
  { code: 'MB', name: '兆字节 (SI)', symbol: 'MB', base: 1000, exponent: 2, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.SI, aliases: ['mb'] },
  { code: 'GB', name: '吉字节 (SI)', symbol: 'GB', base: 1000, exponent: 3, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.SI, aliases: ['gb'] },
  { code: 'TB', name: '太字节 (SI)', symbol: 'TB', base: 1000, exponent: 4, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.SI, aliases: ['tb'] },
  { code: 'PB', name: '拍字节 (SI)', symbol: 'PB', base: 1000, exponent: 5, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.SI, aliases: ['pb'] },
  { code: 'EB', name: '艾字节 (SI)', symbol: 'EB', base: 1000, exponent: 6, category: CATEGORIES.BYTE, system: UNIT_SYSTEMS.SI, aliases: ['eb'] },
]

const BIT_UNITS = [
  { code: 'bit', name: '比特', symbol: 'bit', base: null, exponent: 0, category: CATEGORIES.BIT, system: null, aliases: ['bits', 'b'] },
  { code: 'Kibit', name: '千比特 (IEC)', symbol: 'Kibit', base: 1024, exponent: 1, category: CATEGORIES.BIT, system: UNIT_SYSTEMS.IEC, aliases: ['kibit', 'KIBIT'] },
  { code: 'Mibit', name: '兆比特 (IEC)', symbol: 'Mibit', base: 1024, exponent: 2, category: CATEGORIES.BIT, system: UNIT_SYSTEMS.IEC, aliases: ['mibit', 'MIBIT'] },
  { code: 'Gibit', name: '吉比特 (IEC)', symbol: 'Gibit', base: 1024, exponent: 3, category: CATEGORIES.BIT, system: UNIT_SYSTEMS.IEC, aliases: ['gibit', 'GIBIT'] },
  { code: 'Tibit', name: '太比特 (IEC)', symbol: 'Tibit', base: 1024, exponent: 4, category: CATEGORIES.BIT, system: UNIT_SYSTEMS.IEC, aliases: ['tibit', 'TIBIT'] },
  { code: 'Kbit', name: '千比特 (SI)', symbol: 'kbit', base: 1000, exponent: 1, category: CATEGORIES.BIT, system: UNIT_SYSTEMS.SI, aliases: ['kbit', 'Kbit'] },
  { code: 'Mbit', name: '兆比特 (SI)', symbol: 'Mbit', base: 1000, exponent: 2, category: CATEGORIES.BIT, system: UNIT_SYSTEMS.SI, aliases: ['mbit'] },
  { code: 'Gbit', name: '吉比特 (SI)', symbol: 'Gbit', base: 1000, exponent: 3, category: CATEGORIES.BIT, system: UNIT_SYSTEMS.SI, aliases: ['gbit'] },
  { code: 'Tbit', name: '太比特 (SI)', symbol: 'Tbit', base: 1000, exponent: 4, category: CATEGORIES.BIT, system: UNIT_SYSTEMS.SI, aliases: ['tbit'] },
]

const BITRATE_UNITS = [
  { code: 'bps', name: '比特每秒', symbol: 'bps', base: null, exponent: 0, category: CATEGORIES.BITRATE, system: null, aliases: ['bit/s', 'bit/sec'] },
  { code: 'Kbps', name: '千比特每秒 (SI)', symbol: 'kbps', base: 1000, exponent: 1, category: CATEGORIES.BITRATE, system: UNIT_SYSTEMS.SI, aliases: ['kbps', 'Kbit/s', 'kbit/s'] },
  { code: 'Mbps', name: '兆比特每秒 (SI)', symbol: 'Mbps', base: 1000, exponent: 2, category: CATEGORIES.BITRATE, system: UNIT_SYSTEMS.SI, aliases: ['mbps', 'Mbit/s', 'mbit/s'] },
  { code: 'Gbps', name: '吉比特每秒 (SI)', symbol: 'Gbps', base: 1000, exponent: 3, category: CATEGORIES.BITRATE, system: UNIT_SYSTEMS.SI, aliases: ['gbps', 'Gbit/s', 'gbit/s'] },
  { code: 'Tbps', name: '太比特每秒 (SI)', symbol: 'Tbps', base: 1000, exponent: 4, category: CATEGORIES.BITRATE, system: UNIT_SYSTEMS.SI, aliases: ['tbps', 'Tbit/s', 'tbit/s'] },
]

const BYTE_PER_SECOND_UNITS = [
  { code: 'Bps', name: '字节每秒', symbol: 'B/s', base: null, exponent: 0, category: CATEGORIES.BYTE_PER_SECOND, system: null, aliases: ['B/s', 'bytes/s', 'Bps'] },
  { code: 'KBps', name: '千字节每秒 (SI)', symbol: 'KB/s', base: 1000, exponent: 1, category: CATEGORIES.BYTE_PER_SECOND, system: UNIT_SYSTEMS.SI, aliases: ['KB/s', 'KBps'] },
  { code: 'MBps', name: '兆字节每秒 (SI)', symbol: 'MB/s', base: 1000, exponent: 2, category: CATEGORIES.BYTE_PER_SECOND, system: UNIT_SYSTEMS.SI, aliases: ['MB/s', 'MBps'] },
  { code: 'GBps', name: '吉字节每秒 (SI)', symbol: 'GB/s', base: 1000, exponent: 3, category: CATEGORIES.BYTE_PER_SECOND, system: UNIT_SYSTEMS.SI, aliases: ['GB/s', 'GBps'] },
  { code: 'TBps', name: '太字节每秒 (SI)', symbol: 'TB/s', base: 1000, exponent: 4, category: CATEGORIES.BYTE_PER_SECOND, system: UNIT_SYSTEMS.SI, aliases: ['TB/s', 'TBps'] },
]

const TIME_UNITS = [
  { code: 's', name: '秒', symbol: 's', base: null, exponent: 0, category: CATEGORIES.TIME, system: null, aliases: ['sec', 'second', 'seconds'] },
  { code: 'min', name: '分钟', symbol: 'min', base: null, exponent: 0, category: CATEGORIES.TIME, system: null, aliases: ['minute', 'minutes', 'm'], factor: 60 },
  { code: 'h', name: '小时', symbol: 'h', base: null, exponent: 0, category: CATEGORIES.TIME, system: null, aliases: ['hour', 'hours', 'hr', 'hrs'], factor: 3600 },
]

const ALL_UNITS = [
  ...BYTE_UNITS,
  ...BIT_UNITS,
  ...BITRATE_UNITS,
  ...BYTE_PER_SECOND_UNITS,
  ...TIME_UNITS,
]

const UNIT_MAP = {}
ALL_UNITS.forEach((unit) => {
  UNIT_MAP[unit.code] = unit
  if (unit.aliases) {
    unit.aliases.forEach((alias) => {
      UNIT_MAP[alias] = unit
    })
  }
})

const ROUNDING_MODES = [
  { code: 'round', label: '四舍五入', description: '标准四舍五入' },
  { code: 'floor', label: '向下舍入', description: '舍去小数部分' },
  { code: 'ceil', label: '向上舍入', description: '进一法' },
  { code: 'bankers', label: '银行家舍入', description: '四舍六入五成双' },
]

const MAX_BATCH_SIZE = 1000
const MAX_HISTORY_SIZE = 50
const MAX_DECIMALS = 20
const DEFAULT_DECIMALS = 2
const DEFAULT_BASE = 1000
const DEFAULT_ROUNDING_MODE = 'round'
const SCIENTIFIC_THRESHOLD = 1e15
const MAX_EXPONENT = 308
const MAX_VALUE = Number.MAX_VALUE
const MIN_POSITIVE_VALUE = Number.MIN_VALUE

const STORAGE_KEYS = {
  FAVORITES: 'data-unit-converter:favorites',
  HISTORY: 'data-unit-converter:history',
}

const EXAMPLES = [
  { value: '1 GB', sourceUnit: 'GB', targetUnits: ['MB', 'GiB', 'KiB', 'B'], description: '1 GB 换算为其他单位' },
  { value: '100 Mbps', sourceUnit: 'Mbps', targetUnits: ['Mbps', 'MB/s', 'Gbps', 'bps'], description: '100 Mbps 带宽换算' },
  { value: '512 MiB', sourceUnit: 'MiB', targetUnits: ['MB', 'GiB', 'KB'], description: '512 MiB 对比 SI 单位' },
  { value: '1000000000 B', sourceUnit: 'B', targetUnits: ['GB', 'GiB', 'MB', 'MiB'], description: '10亿字节换算' },
]

const FAQ_ITEMS = [
  {
    question: '为什么 1 GB 不等于 1 GiB？',
    answer: 'GB 是 SI 单位（1000 进制），1 GB = 1000^3 = 1,000,000,000 字节。GiB 是 IEC 二进制单位（1024 进制），1 GiB = 1024^3 = 1,073,741,824 字节。两者相差约 7.37%。操作系统通常使用 IEC 单位，而硬盘厂商常用 SI 单位。',
  },
  {
    question: 'Mbit 和 MiB 有什么区别？',
    answer: 'Mbit（兆比特）是比特单位，用于衡量数据量。MiB（兆字节）是字节单位，1 MiB = 8.3886 Mbit（因为 1 MiB = 1024 * 1024 字节 = 8,388,608 比特 = 8.388608 Mbit）。网络带宽通常用 Mbps（兆比特每秒），文件大小通常用 MB 或 MiB。',
  },
  {
    question: '如何将带宽转换为实际下载速度？',
    answer: '网络带宽通常以 Mbps（兆比特每秒）表示，而实际下载速度通常以 MB/s（兆字节每秒）显示。转换公式：MB/s = Mbps / 8。例如：100 Mbps 带宽 ≈ 12.5 MB/s 下载速度。',
  },
  {
    question: '什么是银行家舍入？',
    answer: '银行家舍入（Banker\'s Rounding）也称为"四舍六入五成双"。当小数部分恰好为 0.5 时，会舍入到最近的偶数。例如：2.5 → 2，3.5 → 4。这种方法在统计学上更公平，减少累积误差。',
  },
]

const CATEGORY_CONVERSION_MAP = {
  [CATEGORIES.BYTE]: {
    [CATEGORIES.BIT]: { factor: 8, description: '1 字节 = 8 比特' },
    [CATEGORIES.BYTE_PER_SECOND]: { factor: 1, description: '字节存储转换为字节/秒' },
    [CATEGORIES.BITRATE]: { factor: 8, description: '1 字节 = 8 比特' },
  },
  [CATEGORIES.BIT]: {
    [CATEGORIES.BYTE]: { factor: 1 / 8, description: '1 比特 = 1/8 字节' },
    [CATEGORIES.BITRATE]: { factor: 1, description: '比特转换为比特率' },
    [CATEGORIES.BYTE_PER_SECOND]: { factor: 1 / 8, description: '1 比特 = 1/8 字节' },
  },
  [CATEGORIES.BITRATE]: {
    [CATEGORIES.BYTE]: { factor: 1 / 8, description: '1 比特率 = 1/8 字节/秒' },
    [CATEGORIES.BIT]: { factor: 1, description: '比特率转换为比特' },
    [CATEGORIES.BYTE_PER_SECOND]: { factor: 1 / 8, description: '8 比特 = 1 字节' },
  },
  [CATEGORIES.BYTE_PER_SECOND]: {
    [CATEGORIES.BYTE]: { factor: 1, description: '字节/秒转换为字节' },
    [CATEGORIES.BIT]: { factor: 8, description: '1 字节 = 8 比特' },
    [CATEGORIES.BITRATE]: { factor: 8, description: '1 字节 = 8 比特' },
  },
}

function getUnitsByCategory(category) {
  return ALL_UNITS.filter((u) => u.category === category)
}

function getUnitByCode(code) {
  return UNIT_MAP[code] || null
}

function getCompatibleCategories(category) {
  const compatible = [category]
  const conversions = CATEGORY_CONVERSION_MAP[category]
  if (conversions) {
    compatible.push(...Object.keys(conversions))
  }
  return [...new Set(compatible)]
}

export {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  UNIT_SYSTEMS,
  BYTE_UNITS,
  BIT_UNITS,
  BITRATE_UNITS,
  BYTE_PER_SECOND_UNITS,
  TIME_UNITS,
  ALL_UNITS,
  UNIT_MAP,
  ROUNDING_MODES,
  MAX_BATCH_SIZE,
  MAX_HISTORY_SIZE,
  MAX_DECIMALS,
  DEFAULT_DECIMALS,
  DEFAULT_BASE,
  DEFAULT_ROUNDING_MODE,
  SCIENTIFIC_THRESHOLD,
  MAX_EXPONENT,
  MAX_VALUE,
  MIN_POSITIVE_VALUE,
  STORAGE_KEYS,
  EXAMPLES,
  FAQ_ITEMS,
  CATEGORY_CONVERSION_MAP,
  getUnitsByCategory,
  getUnitByCode,
  getCompatibleCategories,
}
