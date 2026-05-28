/**
 * 大整数运算模块
 * 基于原生 BigInt 实现，支持十进制/十六进制输入
 */

/**
 * 解析输入为 BigInt
 * 支持十进制和十六进制（0x 前缀）
 * @param {string|number|bigint} input - 输入值
 * @returns {bigint} 解析后的 BigInt
 * @throws {Error} 如果输入格式无效
 */
export function parseBigInt(input) {
  if (typeof input === 'bigint') return input
  if (typeof input === 'number') {
    if (!Number.isInteger(input)) {
      throw new Error(`BigInt 运算需要整数，收到小数: ${input}`)
    }
    return BigInt(input)
  }
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      return BigInt(trimmed)
    }
    if (/^-?\d+$/.test(trimmed)) {
      return BigInt(trimmed)
    }
    throw new Error(`无效的 BigInt 格式: ${input}`)
  }
  throw new Error(`无法解析为 BigInt: ${input}`)
}

/**
 * 格式化 BigInt 输出
 * @param {bigint} value - 输入值
 * @param {number} base - 进制 (10 或 16)
 * @returns {string} 格式化后的字符串
 */
export function formatBigInt(value, base = 10) {
  if (base === 16) {
    const sign = value < 0n ? '-' : ''
    const abs = value < 0n ? -value : value
    return `${sign}0x${abs.toString(16).toUpperCase()}`
  }
  return value.toString()
}

/**
 * BigInt 加法
 * @param {string|number|bigint} a - 操作数 A
 * @param {string|number|bigint} b - 操作数 B
 * @returns {bigint} 结果
 */
export function add(a, b) {
  return parseBigInt(a) + parseBigInt(b)
}

/**
 * BigInt 减法
 * @param {string|number|bigint} a - 操作数 A
 * @param {string|number|bigint} b - 操作数 B
 * @returns {bigint} 结果
 */
export function sub(a, b) {
  return parseBigInt(a) - parseBigInt(b)
}

/**
 * BigInt 乘法
 * @param {string|number|bigint} a - 操作数 A
 * @param {string|number|bigint} b - 操作数 B
 * @returns {bigint} 结果
 */
export function mul(a, b) {
  return parseBigInt(a) * parseBigInt(b)
}

/**
 * BigInt 取模运算
 * 语义：结果的符号与除数相同（数学定义）
 * @param {string|number|bigint} a - 被除数
 * @param {string|number|bigint} b - 除数
 * @returns {bigint} 结果
 * @throws {Error} 除数为零时
 */
export function mod(a, b) {
  const dividend = parseBigInt(a)
  const divisor = parseBigInt(b)

  if (divisor === 0n) {
    throw new Error('除零错误: mod 运算的除数不能为零')
  }

  let result = dividend % divisor
  if (result !== 0n && ((divisor > 0n && result < 0n) || (divisor < 0n && result > 0n))) {
    result += divisor
  }
  return result
}

/**
 * BigInt 幂运算
 * @param {string|number|bigint} base - 底数
 * @param {string|number|bigint} exp - 指数（必须非负）
 * @returns {bigint} 结果
 * @throws {Error} 指数为负时
 */
export function pow(base, exp) {
  const b = parseBigInt(base)
  const e = parseBigInt(exp)

  if (e < 0n) {
    throw new Error('BigInt 幂运算不支持负指数')
  }

  return b ** e
}

/**
 * 模幂运算 (base^exponent % modulus)
 * 使用快速幂算法，高效处理大指数
 * @param {string|number|bigint} base - 底数
 * @param {string|number|bigint} exponent - 指数
 * @param {string|number|bigint} modulus - 模数
 * @returns {bigint} 结果
 * @throws {Error} 模数为零时
 */
export function modPow(base, exponent, modulus) {
  let b = parseBigInt(base)
  let e = parseBigInt(exponent)
  const m = parseBigInt(modulus)

  if (m === 0n) {
    throw new Error('除零错误: 模幂的模数不能为零')
  }

  if (m === 1n) return 0n

  let result = 1n
  b = mod(b, m)

  while (e > 0n) {
    if (e % 2n === 1n) {
      result = mod(result * b, m)
    }
    e = e >> 1n
    b = mod(b * b, m)
  }

  return result
}

/**
 * 最大公约数 (Euclidean algorithm)
 * @param {string|number|bigint} a - 数 A
 * @param {string|number|bigint} b - 数 B
 * @returns {bigint} gcd(a, b)
 */
export function gcd(a, b) {
  let x = parseBigInt(a)
  let y = parseBigInt(b)

  x = x < 0n ? -x : x
  y = y < 0n ? -y : y

  while (y !== 0n) {
    const temp = y
    y = x % y
    x = temp
  }

  return x
}

/**
 * 扩展欧几里得算法
 * 找到 x, y 使得 a*x + b*y = gcd(a, b)
 * @param {string|number|bigint} a - 数 A
 * @param {string|number|bigint} b - 数 B
 * @returns {{gcd: bigint, x: bigint, y: bigint}}
 */
export function extendedGcd(a, b) {
  const x = parseBigInt(a)
  const y = parseBigInt(b)

  let old_r = x
  let r = y
  let old_s = 1n
  let s = 0n
  let old_t = 0n
  let t = 1n

  while (r !== 0n) {
    const quotient = old_r / r
    ;[old_r, r] = [r, old_r - quotient * r]
    ;[old_s, s] = [s, old_s - quotient * s]
    ;[old_t, t] = [t, old_t - quotient * t]
  }

  return {
    gcd: old_r,
    x: old_s,
    y: old_t,
  }
}

/**
 * 模逆元
 * 找到 x 使得 a*x ≡ 1 (mod m)
 * @param {string|number|bigint} a - 数
 * @param {string|number|bigint} m - 模数
 * @returns {bigint} 模逆元
 * @throws {Error} 如果逆元不存在
 */
export function modInverse(a, m) {
  const { gcd: g, x } = extendedGcd(a, m)
  if (g !== 1n) {
    throw new Error(`模逆元不存在: ${a} 和 ${m} 不互质`)
  }
  return mod(x, m)
}

/**
 * BigInt 比较
 * @param {string|number|bigint} a - 数 A
 * @param {string|number|bigint} b - 数 B
 * @returns {number} -1 若 a<b, 0 若 a==b, 1 若 a>b
 */
export function compare(a, b) {
  const x = parseBigInt(a)
  const y = parseBigInt(b)
  if (x < y) return -1
  if (x > y) return 1
  return 0
}

/**
 * BigInt 绝对值
 * @param {string|number|bigint} a - 输入
 * @returns {bigint} 绝对值
 */
export function abs(a) {
  const x = parseBigInt(a)
  return x < 0n ? -x : x
}

/**
 * BigInt 最小值
 * @param {...(string|number|bigint)} args - 输入值
 * @returns {bigint} 最小值
 */
export function min(...args) {
  if (args.length === 0) throw new Error('min 需要至少一个参数')
  return args.map(parseBigInt).reduce((a, b) => (a < b ? a : b))
}

/**
 * BigInt 最大值
 * @param {...(string|number|bigint)} args - 输入值
 * @returns {bigint} 最大值
 */
export function max(...args) {
  if (args.length === 0) throw new Error('max 需要至少一个参数')
  return args.map(parseBigInt).reduce((a, b) => (a > b ? a : b))
}
