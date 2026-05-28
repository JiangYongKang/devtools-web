/**
 * 内置示例集合
 */

/**
 * 示例定义
 * @typedef {Object} Example
 * @property {string} id - 唯一标识
 * @property {string} name - 名称
 * @property {string} description - 描述
 * @property {number} value - 输入值
 * @property {string} fromUnit - 源单位
 * @property {string} toUnit - 目标单位
 * @property {Object} [options] - 换算选项
 * @property {string} [category] - 分类
 */

/**
 * 牛顿 → 磅力 示例
 * 力的单位换算，展示量纲归约 L·M·T⁻²
 */
export const NEWTON_TO_LBF = {
  id: 'newton-to-lbf',
  name: '牛顿 → 磅力',
  description: '力的单位换算，1 N = 0.2248 lbf',
  value: 1,
  fromUnit: 'N',
  toUnit: 'lbf',
  options: {
    significantDigits: 4,
    roundingMode: 'half-up',
  },
  category: '力学',
}

/**
 * 千米每小时 → 米每秒 示例
 * 速度单位换算，展示复合单位解析 km/h → m/s
 */
export const KMH_TO_MS = {
  id: 'kmh-to-ms',
  name: 'km/h → m/s',
  description: '速度单位换算，1 km/h = 0.2778 m/s',
  value: 1,
  fromUnit: 'km/h',
  toUnit: 'm/s',
  options: {
    significantDigits: 4,
    roundingMode: 'half-up',
  },
  category: '运动学',
}

/**
 * 摄氏度 → 华氏度 示例
 * 温度仿射变换，展示 offset 处理
 */
export const CELSIUS_TO_FAHRENHEIT = {
  id: 'c-to-f',
  name: '°C → °F',
  description: '温度换算，使用仿射变换 T[°F] = T[°C] × 9/5 + 32',
  value: 25,
  fromUnit: '°C',
  toUnit: '°F',
  options: {
    significantDigits: 3,
    roundingMode: 'half-up',
  },
  category: '温度',
}

/**
 * 米每二次方秒 → g 示例
 * 加速度换算，展示链式步骤
 */
export const MS2_TO_G = {
  id: 'ms2-to-g',
  name: 'm/s² → g',
  description: '加速度换算，1 g = 9.80665 m/s²',
  value: 9.80665,
  fromUnit: 'm/s²',
  toUnit: 'g',
  options: {
    significantDigits: 5,
    roundingMode: 'half-up',
  },
  category: '运动学',
}

/**
 * 所有示例集合
 */
export const EXAMPLES = [NEWTON_TO_LBF, KMH_TO_MS, CELSIUS_TO_FAHRENHEIT, MS2_TO_G]

/**
 * 按分类分组的示例
 */
export const EXAMPLES_BY_CATEGORY = EXAMPLES.reduce((acc, ex) => {
  const cat = ex.category || '其他'
  if (!acc[cat]) acc[cat] = []
  acc[cat].push(ex)
  return acc
}, {})

/**
 * 获取默认示例（第一组）
 */
export function getDefaultExample() {
  return EXAMPLES[0]
}
