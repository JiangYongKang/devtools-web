/**
 * SI 七个基本量纲的索引定义
 * 0: 长度 Length (L) - m
 * 1: 质量 Mass (M) - kg
 * 2: 时间 Time (T) - s
 * 3: 电流 Electric Current (I) - A
 * 4: 温度 Thermodynamic Temperature (Θ) - K
 * 5: 物质的量 Amount of Substance (N) - mol
 * 6: 发光强度 Luminous Intensity (J) - cd
 */
export const DIM_NAMES = ['L', 'M', 'T', 'I', 'Θ', 'N', 'J']
export const DIM_COUNT = DIM_NAMES.length

/**
 * 创建零向量（无量纲）
 * @returns {number[]} 七个零组成的数组
 */
export function createZeroVector() {
  return new Array(DIM_COUNT).fill(0)
}

/**
 * 创建指定位置为 1 的单位基向量
 * @param {number} index 0-6 的量纲索引
 * @returns {number[]} 单位向量
 */
export function createBaseVector(index) {
  const v = createZeroVector()
  v[index] = 1
  return v
}

/**
 * 两个量纲向量相加（对应量纲指数相加）
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]} a + b
 */
export function addVectors(a, b) {
  return a.map((v, i) => v + b[i])
}

/**
 * 两个量纲向量相减
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]} a - b
 */
export function subtractVectors(a, b) {
  return a.map((v, i) => v - b[i])
}

/**
 * 量纲向量数乘（所有指数乘以标量）
 * @param {number[]} v
 * @param {number} scalar
 * @returns {number[]} v * scalar
 */
export function multiplyVector(v, scalar) {
  return v.map((x) => (x * scalar === 0 ? 0 : x * scalar))
}

/**
 * 判断两个量纲向量是否相等
 * @param {number[]} a
 * @param {number[]} b
 * @returns {boolean}
 */
export function vectorsEqual(a, b) {
  return a.every((v, i) => v === b[i])
}

/**
 * 判断是否为零向量（无量纲）
 * @param {number[]} v
 * @returns {boolean}
 */
export function isDimensionless(v) {
  return v.every((x) => x === 0)
}

/**
 * 格式化量纲向量为可读字符串，如 "L·M·T⁻²"
 * @param {number[]} v
 * @returns {string}
 */
const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
}

function toSuperscript(n) {
  return String(n).split('').map((c) => SUPERSCRIPT_MAP[c] || c).join('')
}

export function formatVector(v) {
  const parts = []
  for (let i = 0; i < DIM_COUNT; i++) {
    if (v[i] !== 0) {
      const name = DIM_NAMES[i]
      const exp = v[i]
      if (exp === 1) {
        parts.push(name)
      } else if (exp === -1) {
        parts.push(`${name}⁻¹`)
      } else {
        const superscript = exp > 0 ? toSuperscript(exp) : `⁻${toSuperscript(Math.abs(exp))}`
        parts.push(`${name}${superscript}`)
      }
    }
  }
  return parts.length === 0 ? '1' : parts.join('·')
}
