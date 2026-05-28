/**
 * 拟合检验
 * Shapiro-Wilk（简化版）和 Kolmogorov-Smirnov 检验
 */

import { normalCDF } from './histogram.js'

/**
 * Shapiro-Wilk 检验统计量（简化版）
 * 注意：这是教学用的简化实现，与 scipy 的精确计算有差异
 * @param {number[]} data - 样本数据
 * @returns {{ w: number, pValueRange: string, interpretation: string }}
 */
export function shapiroWilk(data) {
  const sorted = [...data].sort((a, b) => a - b)
  const n = sorted.length

  if (n < 3 || n > 5000) {
    return {
      w: NaN,
      pValueRange: 'N/A (样本量需在 3-5000 之间)',
      interpretation: '无法计算',
    }
  }

  const mean = sorted.reduce((a, b) => a + b, 0) / n
  let sumSq = 0
  for (const x of sorted) {
    sumSq += (x - mean) ** 2
  }

  const a = getShapiroWilkCoefficients(n)
  let wNumerator = 0
  for (let i = 0; i < Math.floor(n / 2); i++) {
    wNumerator += a[i] * (sorted[n - 1 - i] - sorted[i])
  }
  wNumerator = wNumerator ** 2

  const w = wNumerator / sumSq

  let pValueRange
  let interpretation

  if (w > 0.99) {
    pValueRange = 'p > 0.90'
    interpretation = '非常符合正态分布'
  } else if (w > 0.97) {
    pValueRange = '0.50 < p < 0.90'
    interpretation = '符合正态分布'
  } else if (w > 0.95) {
    pValueRange = '0.10 < p < 0.50'
    interpretation = '基本符合正态分布'
  } else if (w > 0.90) {
    pValueRange = '0.05 < p < 0.10'
    interpretation = '边缘显著，可能不符合正态'
  } else {
    pValueRange = 'p < 0.05'
    interpretation = '显著偏离正态分布'
  }

  return {
    w,
    pValueRange,
    interpretation,
    note: '注：本实现为教学简化版，与 scipy.stats.shapiro 相比精度较低。W 统计量范围为 (0,1]，越接近 1 越符合正态。',
  }
}

/**
 * Shapiro-Wilk 系数（近似值）
 */
function getShapiroWilkCoefficients(n) {
  const coefficients = []
  const m = []

  for (let i = 0; i < Math.floor(n / 2); i++) {
    const p = (i + 1 - 0.375) / (n + 0.25)
    m.push(inverseNormalCDF(p))
  }

  let mSqSum = 0
  for (const mi of m) {
    mSqSum += mi * mi
  }

  for (let i = 0; i < Math.floor(n / 2); i++) {
    coefficients.push(m[i] / Math.sqrt(mSqSum + 1e-10))
  }

  return coefficients
}

/**
 * 逆正态 CDF 近似
 */
function inverseNormalCDF(p) {
  const a1 = -3.969683028665376e1
  const a2 = 2.209460984245205e2
  const a3 = -2.759285104469687e2
  const a4 = 1.38357751867269e2
  const a5 = -3.066479806614716e1
  const a6 = 2.506628277459239

  const b1 = -5.447609879822406e1
  const b2 = 1.615858368580409e2
  const b3 = -1.556989798598866e2
  const b4 = 6.680131188771972e1
  const b5 = -1.328068155288572e1

  const q = p < 0.5 ? p : 1 - p

  if (q <= 0 || q >= 1) return q <= 0 ? -Infinity : Infinity

  const r = Math.sqrt(-2 * Math.log(q))
  const z =
    ((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r +
    a6 / ((((b1 * r + b2) * r + b3) * r + b4) * r + b5)

  return p < 0.5 ? -z : z
}

/**
 * Kolmogorov-Smirnov 检验（与正态分布比较）
 * @param {number[]} data - 样本数据
 * @param {number} [mean] - 理论均值，默认使用样本均值
 * @param {number} [std] - 理论标准差，默认使用样本标准差
 * @returns {{ d: number, criticalValues: Object, pValueRange: string, interpretation: string }}
 */
export function kolmogorovSmirnovNormal(data, mean, std) {
  const sorted = [...data].sort((a, b) => a - b)
  const n = sorted.length

  if (mean === undefined) {
    mean = sorted.reduce((a, b) => a + b, 0) / n
  }
  if (std === undefined) {
    let sumSq = 0
    for (const x of sorted) {
      sumSq += (x - mean) ** 2
    }
    std = Math.sqrt(sumSq / (n - 1))
  }

  let dPlus = 0
  let dMinus = 0

  for (let i = 0; i < n; i++) {
    const empiricalCDF = (i + 1) / n
    const theoreticalCDF = normalCDF(sorted[i], mean, std)
    dPlus = Math.max(dPlus, empiricalCDF - theoreticalCDF)
    dMinus = Math.max(dMinus, theoreticalCDF - i / n)
  }

  const d = Math.max(dPlus, dMinus)

  const criticalValues = {
    alpha010: 1.22 / Math.sqrt(n),
    alpha005: 1.36 / Math.sqrt(n),
    alpha001: 1.63 / Math.sqrt(n),
  }

  let pValueRange
  let interpretation

  if (d < criticalValues.alpha010) {
    pValueRange = 'p > 0.10'
    interpretation = '不能拒绝正态分布假设'
  } else if (d < criticalValues.alpha005) {
    pValueRange = '0.05 < p < 0.10'
    interpretation = '边缘显著'
  } else if (d < criticalValues.alpha001) {
    pValueRange = '0.01 < p < 0.05'
    interpretation = '显著偏离正态分布'
  } else {
    pValueRange = 'p < 0.01'
    interpretation = '极显著偏离正态分布'
  }

  return {
    d,
    criticalValues,
    pValueRange,
    interpretation,
    note: '注：本实现为 Lilliefors 检验（使用样本均值和标准差），与标准 K-S 检验相比临界值略有不同。D 统计量越小越符合理论分布。',
  }
}

/**
 * 经验 CDF 计算
 * @param {number[]} data - 样本数据
 * @param {number} x - 评估点
 * @returns {number} 经验 CDF 值
 */
export function empiricalCDF(data, x) {
  const sorted = [...data].sort((a, b) => a - b)
  let count = 0
  for (const val of sorted) {
    if (val <= x) count++
    else break
  }
  return count / data.length
}
