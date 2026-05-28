/**
 * 直方图计算与理论分布PDF/CDF计算
 */

import { DISTRIBUTION_TYPES } from './distributions.js'

/**
 * Sturges 规则计算 bin 数量
 * @param {number} n - 样本数量
 * @returns {number} bin 数量
 */
export function sturgesRule(n) {
  return Math.ceil(Math.log2(n)) + 1
}

/**
 * Freedman–Diaconis 规则计算 bin 宽度
 * @param {number[]} data - 样本数据
 * @returns {number} bin 宽度
 */
export function freedmanDiaconis(data) {
  const sorted = [...data].sort((a, b) => a - b)
  const n = sorted.length
  const q1 = sorted[Math.floor(n / 4)]
  const q3 = sorted[Math.floor((3 * n) / 4)]
  const iqr = q3 - q1
  return (2 * iqr) / Math.cbrt(n)
}

/**
 * 计算直方图
 * @param {number[]} data - 样本数据
 * @param {Object} options - 配置选项
 * @param {number} [options.bins] - bin 数量
 * @param {'sturges'|'freedman-diaconis'|'manual'} options.method - bin 计算方法
 * @returns {{ bins: number[], counts: number[], binWidth: number, binEdges: number[] }}
 */
export function computeHistogram(data, options = {}) {
  const { method = 'sturges', bins: manualBins } = options

  const n = data.length
  if (n === 0) {
    return { bins: [], counts: [], binWidth: 0, binEdges: [], min: 0, max: 0 }
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min

  let binCount
  if (method === 'manual' && manualBins) {
    binCount = manualBins
  } else if (method === 'freedman-diaconis') {
    const binWidth = freedmanDiaconis(data)
    binCount = Math.ceil(range / binWidth)
    binCount = Math.max(1, Math.min(binCount, 100))
  } else {
    binCount = sturgesRule(n)
  }

  binCount = Math.max(1, Math.min(binCount, 100))
  const binWidth = range / binCount

  const counts = new Array(binCount).fill(0)
  const binEdges = []
  for (let i = 0; i <= binCount; i++) {
    binEdges.push(min + i * binWidth)
  }

  for (const x of data) {
    let binIndex = Math.floor((x - min) / binWidth)
    if (binIndex >= binCount) binIndex = binCount - 1
    if (binIndex < 0) binIndex = 0
    counts[binIndex]++
  }

  const binCenters = []
  for (let i = 0; i < binCount; i++) {
    binCenters.push(min + (i + 0.5) * binWidth)
  }

  return {
    bins: binCenters,
    counts,
    binWidth,
    binEdges,
    min,
    max,
  }
}

/**
 * 正态分布 PDF
 */
export function normalPDF(x, mean = 0, std = 1) {
  const exponent = -((x - mean) ** 2) / (2 * std * std)
  return Math.exp(exponent) / (std * Math.sqrt(2 * Math.PI))
}

/**
 * 正态分布 CDF（近似）
 */
export function normalCDF(x, mean = 0, std = 1) {
  const z = (x - mean) / std
  return 0.5 * (1 + erf(z / Math.sqrt(2)))
}

/**
 * 误差函数 erf（近似）
 * 使用 Abramowitz 和 Stegun 公式
 */
function erf(x) {
  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)

  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x))
  return sign * y
}

/**
 * 均匀分布 PDF
 */
export function uniformPDF(x, min = 0, max = 1) {
  if (x < min || x > max) return 0
  return 1 / (max - min)
}

/**
 * 均匀分布 CDF
 */
export function uniformCDF(x, min = 0, max = 1) {
  if (x < min) return 0
  if (x > max) return 1
  return (x - min) / (max - min)
}

/**
 * 泊松分布 PMF
 */
export function poissonPMF(k, lambda = 1) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k)
}

/**
 * 泊松分布 CDF
 */
export function poissonCDF(x, lambda = 1) {
  let sum = 0
  for (let k = 0; k <= Math.floor(x); k++) {
    sum += poissonPMF(k, lambda)
  }
  return sum
}

/**
 * 二项分布 PMF
 */
export function binomialPMF(k, n = 10, p = 0.5) {
  return combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)
}

/**
 * 二项分布 CDF
 */
export function binomialCDF(x, n = 10, p = 0.5) {
  let sum = 0
  for (let k = 0; k <= Math.floor(x); k++) {
    sum += binomialPMF(k, n, p)
  }
  return sum
}

/**
 * 指数分布 PDF
 */
export function exponentialPDF(x, lambda = 1) {
  if (x < 0) return 0
  return lambda * Math.exp(-lambda * x)
}

/**
 * 指数分布 CDF
 */
export function exponentialCDF(x, lambda = 1) {
  if (x < 0) return 0
  return 1 - Math.exp(-lambda * x)
}

/**
 * 计算阶乘
 */
function factorial(n) {
  if (n < 0) return 1
  let result = 1
  for (let i = 2; i <= n; i++) {
    result *= i
  }
  return result
}

/**
 * 组合数 C(n, k)
 */
function combination(n, k) {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  k = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i
  }
  return result
}

/**
 * 计算理论分布曲线点
 * @param {string} distributionType - 分布类型
 * @param {Object} params - 分布参数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {number} points - 点数
 * @returns {{ x: number[], pdf: number[], cdf: number[] }}
 */
export function computeTheoryCurve(distributionType, params, min, max, points = 100) {
  const xValues = []
  const pdfValues = []
  const cdfValues = []

  const step = (max - min) / (points - 1)

  for (let i = 0; i < points; i++) {
    const x = min + i * step
    xValues.push(x)

    switch (distributionType) {
      case DISTRIBUTION_TYPES.NORMAL:
        pdfValues.push(normalPDF(x, params.mean ?? 0, params.std ?? 1))
        cdfValues.push(normalCDF(x, params.mean ?? 0, params.std ?? 1))
        break
      case DISTRIBUTION_TYPES.UNIFORM:
        pdfValues.push(uniformPDF(x, params.min ?? 0, params.max ?? 1))
        cdfValues.push(uniformCDF(x, params.min ?? 0, params.max ?? 1))
        break
      case DISTRIBUTION_TYPES.POISSON:
        pdfValues.push(poissonPMF(Math.round(x), params.lambda ?? 1))
        cdfValues.push(poissonCDF(x, params.lambda ?? 1))
        break
      case DISTRIBUTION_TYPES.BINOMIAL:
        pdfValues.push(binomialPMF(Math.round(x), params.n ?? 10, params.p ?? 0.5))
        cdfValues.push(binomialCDF(x, params.n ?? 10, params.p ?? 0.5))
        break
      case DISTRIBUTION_TYPES.EXPONENTIAL:
        pdfValues.push(exponentialPDF(x, params.lambda ?? 1))
        cdfValues.push(exponentialCDF(x, params.lambda ?? 1))
        break
      default:
        pdfValues.push(0)
        cdfValues.push(0)
    }
  }

  return { x: xValues, pdf: pdfValues, cdf: cdfValues }
}
