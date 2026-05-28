const TRUE_PI = Math.PI

/**
 * 计算二项分布的方差 (伯努利试验)
 * Var = p * (1 - p)
 * @param {number} p - 成功概率
 * @returns {number} 方差
 */
export function binomialVariance(p) {
  return p * (1 - p)
}

/**
 * 计算标准误差 (Standard Error)
 * SE = σ / √n
 * @param {number} variance - 方差
 * @param {number} n - 样本量
 * @returns {number} 标准误差
 */
export function standardError(variance, n) {
  if (n === 0) return Infinity
  return Math.sqrt(variance / n)
}

/**
 * 计算 π 估计量的标准误差
 * 由于 π̂ = 4 * p̂，所以 SE(π̂) = 4 * SE(p̂)
 * @param {number} hits - 命中数
 * @param {number} n - 样本量
 * @returns {number} 标准误差
 */
export function standardErrorPi(hits, n) {
  if (n === 0) return Infinity
  const p = hits / n
  const varianceP = binomialVariance(p)
  return 4 * standardError(varianceP, n)
}

/**
 * 常用置信度对应的 z 分数
 */
export const Z_SCORES = {
  '0.80': 1.282,
  '0.90': 1.645,
  '0.95': 1.96,
  '0.99': 2.576,
  '0.999': 3.291,
}

/**
 * 计算置信区间
 * CI = [estimate - z * SE, estimate + z * SE]
 * @param {number} estimate - 估计值
 * @param {number} se - 标准误差
 * @param {number} confidence - 置信度 (0.80, 0.90, 0.95, 0.99, 0.999)
 * @returns {{lower: number, upper: number, z: number}} 置信区间
 */
export function confidenceInterval(estimate, se, confidence = 0.95) {
  const z = Z_SCORES[String(confidence)] ?? Z_SCORES['0.95']
  return {
    lower: estimate - z * se,
    upper: estimate + z * se,
    z,
  }
}

/**
 * 检查真实 π 值是否在置信区间内
 * @param {{lower: number, upper: number}} ci - 置信区间
 * @returns {boolean} 是否包含真实 π
 */
export function containsTruePi(ci) {
  return TRUE_PI >= ci.lower && TRUE_PI <= ci.upper
}

/**
 * 计算绝对误差 |π̂ - π|
 * @param {number} piEstimate - π 估计值
 * @returns {number} 绝对误差
 */
export function absoluteError(piEstimate) {
  return Math.abs(piEstimate - TRUE_PI)
}

/**
 * 计算相对误差 |π̂ - π| / π
 * @param {number} piEstimate - π 估计值
 * @returns {number} 相对误差
 */
export function relativeError(piEstimate) {
  return absoluteError(piEstimate) / TRUE_PI
}

/**
 * 估算达到目标精度所需的样本量
 * 使用公式: n ≈ (z² * p * (1-p)) / ε²
 * 对于单位圆法，p ≈ π/4 ≈ 0.785
 * @param {number} targetError - 目标绝对误差
 * @param {number} confidence - 置信度
 * @param {number} currentP - 当前估计的命中概率
 * @returns {number} 预估样本量
 */
export function estimateRequiredSampleSize(targetError, confidence = 0.95, currentP = null) {
  const z = Z_SCORES[String(confidence)] ?? Z_SCORES['0.95']
  const p = currentP ?? Math.PI / 4

  const errorInP = targetError / 4

  return Math.ceil((z * z * p * (1 - p)) / (errorInP * errorInP))
}

/**
 * 根据当前状态预测还需要多少样本
 * @param {number} currentN - 当前样本量
 * @param {number} currentHits - 当前命中数
 * @param {number} targetError - 目标误差
 * @param {number} confidence - 置信度
 * @returns {{requiredN: number, remainingN: number, progress: number}}
 */
export function predictRemainingSamples(currentN, currentHits, targetError, confidence = 0.95) {
  const currentP = currentHits / currentN
  const requiredN = estimateRequiredSampleSize(targetError, confidence, currentP)
  const remainingN = Math.max(0, requiredN - currentN)
  const progress = Math.min(1, currentN / requiredN)

  return { requiredN, remainingN, progress }
}

/**
 * 生成收敛曲线数据点
 * 按对数间隔采样点以优化显示
 * @param {number} maxN - 最大样本量
 * @param {number} points - 数据点数量
 * @returns {number[]} 样本量数组
 */
export function generateConvergencePoints(maxN, points = 50) {
  if (maxN <= 0) return []

  const result = []
  const logMin = Math.log10(10)
  const logMax = Math.log10(maxN)

  for (let i = 0; i <= points; i++) {
    const logN = logMin + (logMax - logMin) * (i / points)
    const n = Math.round(Math.pow(10, logN))
    if (n <= maxN && (result.length === 0 || n > result[result.length - 1])) {
      result.push(n)
    }
  }

  if (result[result.length - 1] !== maxN) {
    result.push(maxN)
  }

  return result
}

/**
 * 计算收敛分析的完整统计数据
 * @param {Array<{n: number, hits: number, piEstimate: number}>} dataPoints - 数据点
 * @param {number} confidence - 置信度
 * @returns {Array<{n: number, piEstimate: number, error: number, se: number, ciLower: number, ciUpper: number}>}
 */
export function computeConvergenceStats(dataPoints, confidence = 0.95) {
  return dataPoints.map((point) => {
    const se = standardErrorPi(point.hits, point.n)
    const ci = confidenceInterval(point.piEstimate, se, confidence)
    const error = absoluteError(point.piEstimate)

    return {
      n: point.n,
      hits: point.hits,
      piEstimate: point.piEstimate,
      error,
      se,
      ciLower: ci.lower,
      ciUpper: ci.upper,
      ciContainsPi: containsTruePi(ci),
    }
  })
}

/**
 * 计算有效样本量 (Effective Sample Size)
 * 用于方差缩减对比
 * @param {number} varianceOriginal - 原始方差
 * @param {number} varianceReduced - 缩减后方差
 * @param {number} nOriginal - 原始样本量
 * @returns {number} 有效样本量倍数
 */
export function effectiveSampleSizeRatio(varianceOriginal, varianceReduced) {
  if (varianceReduced === 0) return Infinity
  return varianceOriginal / varianceReduced
}

/**
 * 格式化数字显示
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化字符串
 */
export function formatNumber(num, decimals = 6) {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

/**
 * 格式化科学计数法显示大数字
 * @param {number} num - 数字
 * @returns {string} 格式化字符串
 */
export function formatLargeNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return String(Math.round(num))
}
