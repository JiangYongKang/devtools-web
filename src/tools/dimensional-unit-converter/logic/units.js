import {
  createBaseVector,
  createZeroVector,
  multiplyVector,
  addVectors,
} from './dimensions.js'

/**
 * 单位定义
 * @typedef {Object} UnitDefinition
 * @property {string} symbol - 标准符号
 * @property {string} name - 全称
 * @property {number[]} dimension - 量纲向量
 * @property {number} scale - 线性缩放因子（到 SI）
 * @property {number} [offset] - 仿射偏移（仅温度）
 * @property {boolean} [isTemperature] - 是否为温度单位
 * @property {boolean} [isBase] - 是否为 SI 基本单位
 */

/**
 * SI 基本单位定义
 */
const BASE_UNITS = {
  m: {
    symbol: 'm',
    name: '米',
    dimension: createBaseVector(0),
    scale: 1,
    isBase: true,
  },
  kg: {
    symbol: 'kg',
    name: '千克',
    dimension: createBaseVector(1),
    scale: 1,
    isBase: true,
  },
  s: {
    symbol: 's',
    name: '秒',
    dimension: createBaseVector(2),
    scale: 1,
    isBase: true,
  },
  A: {
    symbol: 'A',
    name: '安培',
    dimension: createBaseVector(3),
    scale: 1,
    isBase: true,
  },
  K: {
    symbol: 'K',
    name: '开尔文',
    dimension: createBaseVector(4),
    scale: 1,
    offset: 0,
    isTemperature: true,
    isBase: true,
  },
  mol: {
    symbol: 'mol',
    name: '摩尔',
    dimension: createBaseVector(5),
    scale: 1,
    isBase: true,
  },
  cd: {
    symbol: 'cd',
    name: '坎德拉',
    dimension: createBaseVector(6),
    scale: 1,
    isBase: true,
  },
}

/**
 * 导出单位定义
 */
const DERIVED_UNITS = {
  // 无量纲
  '1': {
    symbol: '1',
    name: '无量纲',
    dimension: createZeroVector(),
    scale: 1,
  },
  rad: {
    symbol: 'rad',
    name: '弧度',
    dimension: createZeroVector(),
    scale: 1,
  },
  sr: {
    symbol: 'sr',
    name: '球面度',
    dimension: createZeroVector(),
    scale: 1,
  },
  '%': {
    symbol: '%',
    name: '百分比',
    dimension: createZeroVector(),
    scale: 0.01,
  },

  // 力学
  Hz: {
    symbol: 'Hz',
    name: '赫兹',
    dimension: multiplyVector(createBaseVector(2), -1),
    scale: 1,
  },
  N: {
    symbol: 'N',
    name: '牛顿',
    dimension: addVectors(
      addVectors(createBaseVector(0), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 1,
  },
  Pa: {
    symbol: 'Pa',
    name: '帕斯卡',
    dimension: addVectors(
      createBaseVector(1),
      addVectors(
        multiplyVector(createBaseVector(0), -1),
        multiplyVector(createBaseVector(2), -2),
      ),
    ),
    scale: 1,
  },
  J: {
    symbol: 'J',
    name: '焦耳',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 1,
  },
  W: {
    symbol: 'W',
    name: '瓦特',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -3),
    ),
    scale: 1,
  },

  // 电磁学
  C: {
    symbol: 'C',
    name: '库仑',
    dimension: addVectors(createBaseVector(2), createBaseVector(3)),
    scale: 1,
  },
  V: {
    symbol: 'V',
    name: '伏特',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      addVectors(
        multiplyVector(createBaseVector(2), -3),
        multiplyVector(createBaseVector(3), -1),
      ),
    ),
    scale: 1,
  },
  F: {
    symbol: 'F',
    name: '法拉',
    dimension: addVectors(
      multiplyVector(createBaseVector(0), -2),
      addVectors(
        multiplyVector(createBaseVector(1), -1),
        addVectors(multiplyVector(createBaseVector(2), 4), multiplyVector(createBaseVector(3), 2)),
      ),
    ),
    scale: 1,
  },
  Ω: {
    symbol: 'Ω',
    name: '欧姆',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      addVectors(
        multiplyVector(createBaseVector(2), -3),
        multiplyVector(createBaseVector(3), -2),
      ),
    ),
    scale: 1,
  },
  ohm: {
    symbol: 'ohm',
    name: '欧姆',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      addVectors(
        multiplyVector(createBaseVector(2), -3),
        multiplyVector(createBaseVector(3), -2),
      ),
    ),
    scale: 1,
  },
  S: {
    symbol: 'S',
    name: '西门子',
    dimension: addVectors(
      multiplyVector(createBaseVector(0), -2),
      addVectors(
        multiplyVector(createBaseVector(1), -1),
        addVectors(multiplyVector(createBaseVector(2), 3), multiplyVector(createBaseVector(3), 2)),
      ),
    ),
    scale: 1,
  },
  Wb: {
    symbol: 'Wb',
    name: '韦伯',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      addVectors(
        multiplyVector(createBaseVector(2), -2),
        multiplyVector(createBaseVector(3), -1),
      ),
    ),
    scale: 1,
  },
  T: {
    symbol: 'T',
    name: '特斯拉',
    dimension: addVectors(
      createBaseVector(1),
      addVectors(
        multiplyVector(createBaseVector(2), -2),
        multiplyVector(createBaseVector(3), -1),
      ),
    ),
    scale: 1,
  },
  H: {
    symbol: 'H',
    name: '亨利',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      addVectors(
        multiplyVector(createBaseVector(2), -2),
        multiplyVector(createBaseVector(3), -2),
      ),
    ),
    scale: 1,
  },

  // 光学
  lm: {
    symbol: 'lm',
    name: '流明',
    dimension: createBaseVector(6),
    scale: 1,
  },
  lx: {
    symbol: 'lx',
    name: '勒克斯',
    dimension: addVectors(
      multiplyVector(createBaseVector(0), -2),
      createBaseVector(6),
    ),
    scale: 1,
  },

  // 放射性
  Bq: {
    symbol: 'Bq',
    name: '贝克勒尔',
    dimension: multiplyVector(createBaseVector(2), -1),
    scale: 1,
  },
  Gy: {
    symbol: 'Gy',
    name: '戈瑞',
    dimension: addVectors(
      multiplyVector(createBaseVector(0), 2),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 1,
  },
  Sv: {
    symbol: 'Sv',
    name: '希沃特',
    dimension: addVectors(
      multiplyVector(createBaseVector(0), 2),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 1,
  },
  kat: {
    symbol: 'kat',
    name: '卡塔尔',
    dimension: addVectors(
      multiplyVector(createBaseVector(2), -1),
      createBaseVector(5),
    ),
    scale: 1,
  },
}

/**
 * 非 SI 常用单位（英制、工程单位等）
 */
const NON_SI_UNITS = {
  // 长度
  km: {
    symbol: 'km',
    name: '千米',
    dimension: createBaseVector(0),
    scale: 1000,
  },
  cm: {
    symbol: 'cm',
    name: '厘米',
    dimension: createBaseVector(0),
    scale: 0.01,
  },
  mm: {
    symbol: 'mm',
    name: '毫米',
    dimension: createBaseVector(0),
    scale: 0.001,
  },
  μm: {
    symbol: 'μm',
    name: '微米',
    dimension: createBaseVector(0),
    scale: 1e-6,
  },
  nm: {
    symbol: 'nm',
    name: '纳米',
    dimension: createBaseVector(0),
    scale: 1e-9,
  },
  in: {
    symbol: 'in',
    name: '英寸',
    dimension: createBaseVector(0),
    scale: 0.0254,
  },
  ft: {
    symbol: 'ft',
    name: '英尺',
    dimension: createBaseVector(0),
    scale: 0.3048,
  },
  yd: {
    symbol: 'yd',
    name: '码',
    dimension: createBaseVector(0),
    scale: 0.9144,
  },
  mi: {
    symbol: 'mi',
    name: '英里',
    dimension: createBaseVector(0),
    scale: 1609.344,
  },
  NM: {
    symbol: 'NM',
    name: '海里',
    dimension: createBaseVector(0),
    scale: 1852,
  },

  // 质量
  g: {
    symbol: 'g',
    name: '克',
    dimension: createBaseVector(1),
    scale: 0.001,
  },
  mg: {
    symbol: 'mg',
    name: '毫克',
    dimension: createBaseVector(1),
    scale: 1e-6,
  },
  t: {
    symbol: 't',
    name: '吨',
    dimension: createBaseVector(1),
    scale: 1000,
  },
  lb: {
    symbol: 'lb',
    name: '磅',
    dimension: createBaseVector(1),
    scale: 0.45359237,
  },
  oz: {
    symbol: 'oz',
    name: '盎司',
    dimension: createBaseVector(1),
    scale: 0.028349523125,
  },

  // 时间
  min: {
    symbol: 'min',
    name: '分钟',
    dimension: createBaseVector(2),
    scale: 60,
  },
  h: {
    symbol: 'h',
    name: '小时',
    dimension: createBaseVector(2),
    scale: 3600,
  },
  d: {
    symbol: 'd',
    name: '天',
    dimension: createBaseVector(2),
    scale: 86400,
  },

  // 温度（仿射变换）
  degC: {
    symbol: 'degC',
    name: '摄氏度',
    dimension: createBaseVector(4),
    scale: 1,
    offset: 273.15,
    isTemperature: true,
  },
  '°C': {
    symbol: '°C',
    name: '摄氏度',
    dimension: createBaseVector(4),
    scale: 1,
    offset: 273.15,
    isTemperature: true,
  },
  degF: {
    symbol: 'degF',
    name: '华氏度',
    dimension: createBaseVector(4),
    scale: 5 / 9,
    offset: 459.67 * (5 / 9),
    isTemperature: true,
  },
  '°F': {
    symbol: '°F',
    name: '华氏度',
    dimension: createBaseVector(4),
    scale: 5 / 9,
    offset: 459.67 * (5 / 9),
    isTemperature: true,
  },
  degR: {
    symbol: 'degR',
    name: '兰金度',
    dimension: createBaseVector(4),
    scale: 5 / 9,
    offset: 0,
    isTemperature: true,
  },
  '°R': {
    symbol: '°R',
    name: '兰金度',
    dimension: createBaseVector(4),
    scale: 5 / 9,
    offset: 0,
    isTemperature: true,
  },

  // 力
  lbf: {
    symbol: 'lbf',
    name: '磅力',
    dimension: addVectors(
      addVectors(createBaseVector(0), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 4.4482216152605,
  },
  dyn: {
    symbol: 'dyn',
    name: '达因',
    dimension: addVectors(
      addVectors(createBaseVector(0), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 1e-5,
  },

  // 能量
  cal: {
    symbol: 'cal',
    name: '卡路里',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 4.184,
  },
  kcal: {
    symbol: 'kcal',
    name: '千卡',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 4184,
  },
  eV: {
    symbol: 'eV',
    name: '电子伏特',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 1.602176634e-19,
  },
  Wh: {
    symbol: 'Wh',
    name: '瓦时',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 3600,
  },
  kWh: {
    symbol: 'kWh',
    name: '千瓦时',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 3.6e6,
  },
  BTU: {
    symbol: 'BTU',
    name: '英热单位',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 1055.05585262,
  },

  // 功率
  hp: {
    symbol: 'hp',
    name: '马力',
    dimension: addVectors(
      addVectors(multiplyVector(createBaseVector(0), 2), createBaseVector(1)),
      multiplyVector(createBaseVector(2), -3),
    ),
    scale: 745.6998715822702,
  },

  // 压强
  bar: {
    symbol: 'bar',
    name: '巴',
    dimension: addVectors(
      createBaseVector(1),
      addVectors(
        multiplyVector(createBaseVector(0), -1),
        multiplyVector(createBaseVector(2), -2),
      ),
    ),
    scale: 1e5,
  },
  atm: {
    symbol: 'atm',
    name: '标准大气压',
    dimension: addVectors(
      createBaseVector(1),
      addVectors(
        multiplyVector(createBaseVector(0), -1),
        multiplyVector(createBaseVector(2), -2),
      ),
    ),
    scale: 101325,
  },
  psi: {
    symbol: 'psi',
    name: '磅每平方英寸',
    dimension: addVectors(
      createBaseVector(1),
      addVectors(
        multiplyVector(createBaseVector(0), -1),
        multiplyVector(createBaseVector(2), -2),
      ),
    ),
    scale: 6894.757293168361,
  },
  Torr: {
    symbol: 'Torr',
    name: '托',
    dimension: addVectors(
      createBaseVector(1),
      addVectors(
        multiplyVector(createBaseVector(0), -1),
        multiplyVector(createBaseVector(2), -2),
      ),
    ),
    scale: 133.322368421,
  },
  mmHg: {
    symbol: 'mmHg',
    name: '毫米汞柱',
    dimension: addVectors(
      createBaseVector(1),
      addVectors(
        multiplyVector(createBaseVector(0), -1),
        multiplyVector(createBaseVector(2), -2),
      ),
    ),
    scale: 133.322368421,
  },

  // 速度
  'km/h': {
    symbol: 'km/h',
    name: '千米每小时',
    dimension: addVectors(
      createBaseVector(0),
      multiplyVector(createBaseVector(2), -1),
    ),
    scale: 1000 / 3600,
  },
  mph: {
    symbol: 'mph',
    name: '英里每小时',
    dimension: addVectors(
      createBaseVector(0),
      multiplyVector(createBaseVector(2), -1),
    ),
    scale: 1609.344 / 3600,
  },
  knot: {
    symbol: 'knot',
    name: '节',
    dimension: addVectors(
      createBaseVector(0),
      multiplyVector(createBaseVector(2), -1),
    ),
    scale: 1852 / 3600,
  },
  'm/s': {
    symbol: 'm/s',
    name: '米每秒',
    dimension: addVectors(
      createBaseVector(0),
      multiplyVector(createBaseVector(2), -1),
    ),
    scale: 1,
  },

  // 加速度
  'm/s²': {
    symbol: 'm/s²',
    name: '米每二次方秒',
    dimension: addVectors(
      createBaseVector(0),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 1,
  },
  g0: {
    symbol: 'g0',
    name: '标准重力加速度',
    dimension: addVectors(
      createBaseVector(0),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 9.80665,
  },
  g: {
    symbol: 'g',
    name: '标准重力加速度',
    dimension: addVectors(
      createBaseVector(0),
      multiplyVector(createBaseVector(2), -2),
    ),
    scale: 9.80665,
  },

  // 面积
  ha: {
    symbol: 'ha',
    name: '公顷',
    dimension: multiplyVector(createBaseVector(0), 2),
    scale: 10000,
  },
  acre: {
    symbol: 'acre',
    name: '英亩',
    dimension: multiplyVector(createBaseVector(0), 2),
    scale: 4046.8564224,
  },

  // 体积
  L: {
    symbol: 'L',
    name: '升',
    dimension: multiplyVector(createBaseVector(0), 3),
    scale: 0.001,
  },
  mL: {
    symbol: 'mL',
    name: '毫升',
    dimension: multiplyVector(createBaseVector(0), 3),
    scale: 1e-6,
  },
  gal: {
    symbol: 'gal',
    name: '加仑（美制）',
    dimension: multiplyVector(createBaseVector(0), 3),
    scale: 0.003785411784,
  },
  'gal_uk': {
    symbol: 'gal_uk',
    name: '加仑（英制）',
    dimension: multiplyVector(createBaseVector(0), 3),
    scale: 0.00454609,
  },

  // 角度
  deg: {
    symbol: 'deg',
    name: '度',
    dimension: createZeroVector(),
    scale: Math.PI / 180,
  },
  '°': {
    symbol: '°',
    name: '度',
    dimension: createZeroVector(),
    scale: Math.PI / 180,
  },
}

/**
 * 合并所有单位定义
 */
export const UNIT_LIBRARY = {
  ...BASE_UNITS,
  ...DERIVED_UNITS,
  ...NON_SI_UNITS,
}

/**
 * 用户自定义别名映射（会话内）
 * @type {Map<string, string>}
 */
const userAliases = new Map()

/**
 * 添加用户自定义单位别名
 * @param {string} alias - 别名
 * @param {string} targetSymbol - 目标标准符号
 * @returns {boolean} 是否添加成功
 */
export function addUnitAlias(alias, targetSymbol) {
  if (UNIT_LIBRARY[alias] || userAliases.has(alias)) {
    return false
  }
  if (!UNIT_LIBRARY[targetSymbol]) {
    return false
  }
  userAliases.set(alias, targetSymbol)
  return true
}

/**
 * 清除所有用户别名
 */
export function clearUserAliases() {
  userAliases.clear()
}

/**
 * 获取所有用户别名
 * @returns {Map<string, string>}
 */
export function getUserAliases() {
  return new Map(userAliases)
}

/**
 * 查找单位定义（支持用户别名）
 * @param {string} symbol - 单位符号
 * @returns {UnitDefinition|null}
 */
export function findUnit(symbol) {
  if (UNIT_LIBRARY[symbol]) {
    return UNIT_LIBRARY[symbol]
  }
  const aliasTarget = userAliases.get(symbol)
  if (aliasTarget && UNIT_LIBRARY[aliasTarget]) {
    return UNIT_LIBRARY[aliasTarget]
  }
  return null
}

/**
 * 检查单位是否存在
 * @param {string} symbol
 * @returns {boolean}
 */
export function hasUnit(symbol) {
  return findUnit(symbol) !== null
}

/**
 * 将值从指定单位转换到 SI 基值
 * @param {number} value - 原值
 * @param {UnitDefinition} unit - 单位定义
 * @returns {number} SI 基值
 */
export function toSI(value, unit) {
  if (unit.isTemperature) {
    return value * unit.scale + (unit.offset || 0)
  }
  return value * unit.scale
}

/**
 * 将值从 SI 基值转换到指定单位
 * @param {number} siValue - SI 基值
 * @param {UnitDefinition} unit - 目标单位
 * @returns {number} 目标单位下的值
 */
export function fromSI(siValue, unit) {
  if (unit.isTemperature) {
    return (siValue - (unit.offset || 0)) / unit.scale
  }
  return siValue / unit.scale
}

/**
 * 获取所有可用单位符号列表
 * @returns {string[]}
 */
export function getAllUnitSymbols() {
  return Object.keys(UNIT_LIBRARY)
}

/**
 * 按类别获取单位符号
 * @returns {Object<string, string[]>}
 */
export function getUnitsByCategory() {
  return {
    'SI 基本': ['m', 'kg', 's', 'A', 'K', 'mol', 'cd'],
    '力学': ['Hz', 'N', 'Pa', 'J', 'W', 'lbf', 'dyn'],
    '长度': ['km', 'cm', 'mm', 'μm', 'nm', 'in', 'ft', 'yd', 'mi', 'NM'],
    '质量': ['g', 'mg', 't', 'lb', 'oz'],
    '时间': ['min', 'h', 'd'],
    '温度': ['K', '°C', '°F', '°R'],
    '速度': ['m/s', 'km/h', 'mph', 'knot'],
    '加速度': ['m/s²', 'g'],
    '能量': ['cal', 'kcal', 'eV', 'Wh', 'kWh', 'BTU'],
    '功率': ['hp'],
    '压强': ['bar', 'atm', 'psi', 'Torr', 'mmHg'],
    '面积': ['ha', 'acre'],
    '体积': ['L', 'mL', 'gal', 'gal_uk'],
    '电磁': ['C', 'V', 'F', 'Ω', 'S', 'Wb', 'T', 'H'],
    '光学': ['lm', 'lx'],
    '角度': ['rad', 'deg', '°', 'sr'],
    '无量纲': ['1', '%'],
  }
}
