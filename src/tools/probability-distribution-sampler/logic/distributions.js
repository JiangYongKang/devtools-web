/**
 * 概率分布采样器
 * 支持：均匀、正态（Box-Muller）、泊松、二项、指数分布
 */

import { createPRNG } from './prng.js'

/**
 * 均匀分布采样
 * @param {{ next: () => number }} prng - 随机数生成器
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {number} count - 采样数量
 * @returns {number[]} 样本数组
 */
export function sampleUniform(prng, min, max, count) {
  const result = new Array(count)
  const range = max - min
  for (let i = 0; i < count; i++) {
    result[i] = min + prng.next() * range
  }
  return result
}

/**
 * 正态分布采样（Box-Muller 变换）
 * @param {{ next: () => number }} prng - 随机数生成器
 * @param {number} mean - 均值
 * @param {number} std - 标准差
 * @param {number} count - 采样数量
 * @returns {number[]} 样本数组
 */
export function sampleNormal(prng, mean, std, count) {
  const result = new Array(count)
  for (let i = 0; i < count; i += 2) {
    const u1 = prng.next()
    const u2 = prng.next()
    const r = Math.sqrt(-2 * Math.log(u1))
    const theta = 2 * Math.PI * u2
    result[i] = mean + std * r * Math.cos(theta)
    if (i + 1 < count) {
      result[i + 1] = mean + std * r * Math.sin(theta)
    }
  }
  return result
}

/**
 * 泊松分布采样（Knuth 算法）
 * 对于大 λ 使用正态近似
 * @param {{ next: () => number }} prng - 随机数生成器
 * @param {number} lambda - 速率参数
 * @param {number} count - 采样数量
 * @returns {number[]} 样本数组
 */
export function samplePoisson(prng, lambda, count) {
  const result = new Array(count)

  if (lambda < 20) {
    const L = Math.exp(-lambda)
    for (let i = 0; i < count; i++) {
      let k = 0
      let p = 1
      while (p > L) {
        k++
        p *= prng.next()
      }
      result[i] = k - 1
    }
  } else {
    const c = -0.767 - 3.36 / lambda
    const beta = Math.PI / Math.sqrt(3 * lambda)
    const alpha = beta * lambda
    const k = Math.log(c) - lambda - Math.log(beta)

    for (let i = 0; i < count; i++) {
      let x, u, v
      while (true) {
        u = prng.next()
        x = (alpha - Math.log((1 - u) / u)) / beta
        const n = Math.floor(x + 0.5)
        if (n < 0) continue
        v = prng.next()
        const y = alpha - beta * x
        const lhs = y + Math.log(v / Math.pow(1 + Math.exp(y), 2))
        const rhs = k + n * Math.log(lambda) - logGamma(n + 1)
        if (lhs <= rhs) {
          result[i] = n
          break
        }
      }
    }
  }
  return result
}

/**
 * 二项分布采样
 * @param {{ next: () => number }} prng - 随机数生成器
 * @param {number} n - 试验次数
 * @param {number} p - 单次成功概率
 * @param {number} count - 采样数量
 * @returns {number[]} 样本数组
 */
export function sampleBinomial(prng, n, p, count) {
  const result = new Array(count)

  if (n * p < 10) {
    for (let i = 0; i < count; i++) {
      let successes = 0
      for (let j = 0; j < n; j++) {
        if (prng.next() < p) successes++
      }
      result[i] = successes
    }
  } else {
    const mean = n * p
    const std = Math.sqrt(n * p * (1 - p))
    for (let i = 0; i < count; i++) {
      let x
      do {
        const u1 = prng.next()
        const u2 = prng.next()
        const r = Math.sqrt(-2 * Math.log(u1))
        const theta = 2 * Math.PI * u2
        x = Math.floor(mean + std * r * Math.cos(theta) + 0.5)
      } while (x < 0 || x > n)
      result[i] = x
    }
  }
  return result
}

/**
 * 指数分布采样
 * @param {{ next: () => number }} prng - 随机数生成器
 * @param {number} lambda - 速率参数
 * @param {number} count - 采样数量
 * @returns {number[]} 样本数组
 */
export function sampleExponential(prng, lambda, count) {
  const result = new Array(count)
  for (let i = 0; i < count; i++) {
    result[i] = -Math.log(1 - prng.next()) / lambda
  }
  return result
}

/**
 * log-Gamma 函数近似（用于泊松分布）
 * @param {number} x - 输入值
 * @returns {number} ln(Gamma(x))
 */
function logGamma(x) {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) {
    ser += coefficients[j] / ++y
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

/**
 * 分布类型枚举
 */
export const DISTRIBUTION_TYPES = {
  UNIFORM: 'uniform',
  NORMAL: 'normal',
  POISSON: 'poisson',
  BINOMIAL: 'binomial',
  EXPONENTIAL: 'exponential',
}

/**
 * 根据分布类型生成样本
 * @param {string} type - 分布类型
 * @param {Object} params - 分布参数
 * @param {number} count - 样本数量
 * @param {string|number} seed - 种子
 * @returns {number[]} 样本数组
 */
export function generateSample(type, params, count, seed) {
  const prng = createPRNG(seed)
  switch (type) {
    case DISTRIBUTION_TYPES.UNIFORM:
      return sampleUniform(prng, params.min ?? 0, params.max ?? 1, count)
    case DISTRIBUTION_TYPES.NORMAL:
      return sampleNormal(prng, params.mean ?? 0, params.std ?? 1, count)
    case DISTRIBUTION_TYPES.POISSON:
      return samplePoisson(prng, params.lambda ?? 1, count)
    case DISTRIBUTION_TYPES.BINOMIAL:
      return sampleBinomial(prng, params.n ?? 10, params.p ?? 0.5, count)
    case DISTRIBUTION_TYPES.EXPONENTIAL:
      return sampleExponential(prng, params.lambda ?? 1, count)
    default:
      return sampleUniform(prng, 0, 1, count)
  }
}

/**
 * 获取分布的理论统计量
 * @param {string} type - 分布类型
 * @param {Object} params - 分布参数
 * @returns {{ mean: number, variance: number, skewness: number, kurtosis: number }}
 */
export function getTheoreticalMoments(type, params) {
  switch (type) {
    case DISTRIBUTION_TYPES.UNIFORM: {
      const min = params.min ?? 0
      const max = params.max ?? 1
      const range = max - min
      return {
        mean: (min + max) / 2,
        variance: (range * range) / 12,
        skewness: 0,
        kurtosis: 9 / 5 - 3,
      }
    }
    case DISTRIBUTION_TYPES.NORMAL: {
      return {
        mean: params.mean ?? 0,
        variance: (params.std ?? 1) ** 2,
        skewness: 0,
        kurtosis: 0,
      }
    }
    case DISTRIBUTION_TYPES.POISSON: {
      const lambda = params.lambda ?? 1
      return {
        mean: lambda,
        variance: lambda,
        skewness: 1 / Math.sqrt(lambda),
        kurtosis: 1 / lambda,
      }
    }
    case DISTRIBUTION_TYPES.BINOMIAL: {
      const n = params.n ?? 10
      const p = params.p ?? 0.5
      const q = 1 - p
      return {
        mean: n * p,
        variance: n * p * q,
        skewness: (q - p) / Math.sqrt(n * p * q),
        kurtosis: (1 - 6 * p * q) / (n * p * q),
      }
    }
    case DISTRIBUTION_TYPES.EXPONENTIAL: {
      const lambda = params.lambda ?? 1
      return {
        mean: 1 / lambda,
        variance: 1 / (lambda * lambda),
        skewness: 2,
        kurtosis: 6,
      }
    }
    default:
      return { mean: 0, variance: 1, skewness: 0, kurtosis: 0 }
  }
}
