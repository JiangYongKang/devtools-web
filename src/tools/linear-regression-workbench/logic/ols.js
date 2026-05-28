/**
 * 普通最小二乘 (OLS) 线性回归核心计算
 * 实现闭式解：β = (X'X)⁻¹X'y
 */

/**
 * 计算向量的均值
 * @param {number[]} arr - 输入数值数组
 * @returns {number} 均值
 */
export function mean(arr) {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

/**
 * 计算向量的和
 * @param {number[]} arr - 输入数值数组
 * @returns {number} 和
 */
export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0)
}

/**
 * 计算两个向量的点积
 * @param {number[]} a - 向量a
 * @param {number[]} b - 向量b
 * @returns {number} 点积
 */
export function dotProduct(a, b) {
  if (a.length !== b.length) throw new Error('向量长度不一致')
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result += a[i] * b[i]
  }
  return result
}

/**
 * 计算向量的平方和
 * @param {number[]} arr - 输入数值数组
 * @returns {number} 平方和
 */
export function sumOfSquares(arr) {
  return dotProduct(arr, arr)
}

/**
 * 计算向量的方差（除以 n-1，无偏估计
 * @param {number[]} arr - 输入数值数组
 * @returns {number} 方差
 */
export function variance(arr) {
  if (arr.length <= 1) return 0
  const m = mean(arr)
  const squaredDiffs = arr.map((x) => (x - m) ** 2)
  return sum(squaredDiffs) / (arr.length - 1)
}

/**
 * 计算向量的标准差
 * @param {number[]} arr - 输入数值数组
 * @returns {number} 标准差
 */
export function stdDev(arr) {
  return Math.sqrt(variance(arr))
}

/**
 * OLS 单变量线性回归闭式解
 * y = β₀ + β₁x
 * @param {number[]} x - 自变量向量
 * @param {number[]} y - 因变量向量
 * @param {number[]} [weights] - 可选权重向量（加权最小二乘）
 * @returns {Object} 回归结果：截距、斜率、拟合值、残差等
 */
export function olsRegression(x, y, weights = null) {
  const n = x.length
  if (n !== y.length) throw new Error('x 和 y 长度不一致')
  if (n < 2) throw new Error('样本量至少为 2')

  const w = weights || Array(n).fill(1)
  const sumW = sum(w)
  const sumWX = dotProduct(w, x)
  const sumWY = dotProduct(w, y)
  const sumWXX = sum(w.map((wi, i) => wi * x[i] * x[i]))
  const sumWXY = sum(w.map((wi, i) => wi * x[i] * y[i]))

  const denominator = sumW * sumWXX - sumWX * sumWX
  if (Math.abs(denominator) < 1e-15) {
    throw new Error('x 无变异，无法估计斜率')
  }

  const slope = (sumW * sumWXY - sumWX * sumWY) / denominator
  const intercept = (sumWY - slope * sumWX) / sumW

  const fitted = x.map((xi) => intercept + slope * xi)
  const residuals = y.map((yi, i) => yi - fitted[i])
  const weightedResiduals = residuals.map((r, i) => r * Math.sqrt(w[i]))

  const meanY = dotProduct(w, y) / sumW
  const totalSS = sum(w.map((wi, i) => wi * (y[i] - meanY) ** 2))
  const residualSS = sum(weightedResiduals.map((r) => r * r))
  const rSquared = totalSS > 0 ? 1 - residualSS / totalSS : 1

  const df = n - 2
  const residualStdError = df > 0 ? Math.sqrt(residualSS / df) : 0
  const adjustedRSquared = df > 0 ? 1 - (1 - rSquared) * (n - 1) / df : rSquared

  const xMean = sumWX / sumW
  const xVariance = sum(w.map((wi, i) => wi * (x[i] - xMean) ** 2)) / sumW
  const slopeStdError = residualStdError / Math.sqrt(xVariance * n)
  const interceptStdError = residualStdError * Math.sqrt(1 / sumW + xMean * xMean / (xVariance * n))

  return {
    n,
    intercept,
    slope,
    fitted,
    residuals,
    rSquared,
    adjustedRSquared,
    residualStdError,
    residualSS,
    totalSS,
    slopeStdError,
    interceptStdError,
    xMean,
    weights: w,
    weightsUsed: weights !== null,
  }
}

/**
 * 计算标准化残差
 * @param {number[]} residuals - 残差向量
 * @returns {number[]} 标准化残差
 */
export function standardizedResiduals(residuals) {
  const std = stdDev(residuals)
  if (std === 0) return residuals.map(() => 0)
  return residuals.map((r) => r / std)
}

/**
 * 标记异常点（|标准化残差| > 阈值
 * @param {number[]} residuals - 残差向量
 * @param {number} threshold - 阈值（默认 2）
 * @returns {boolean[]} 是否为异常点
 */
export function flagOutliers(residuals, threshold = 2) {
  const stdRes = standardizedResiduals(residuals)
  return stdRes.map((r) => Math.abs(r) > threshold)
}

/**
 * 计算杠杆值 (hat matrix diagonal)
 * @param {number[]} x - 自变量向量
 * @returns {number[]} 杠杆值
 */
export function leverage(x) {
  const n = x.length
  const xBar = mean(x)
  const sxx = sum(x.map((xi) => (xi - xBar) ** 2))
  if (sxx === 0) return Array(n).fill(1 / n)
  return x.map((xi) => 1 / n + (xi - xBar) ** 2 / sxx)
}

/**
 * 计算 Cook 距离
 * @param {number[]} residuals - 残差向量
 * @param {number[]} leverageValues - 杠杆值
 * @param {number} residualStdError - 残差标准误
 * @param {number} p - 参数个数（默认 2）
 * @returns {number[]} Cook 距离
 */
export function cookDistance(residuals, leverageValues, residualStdError, p = 2) {
  const n = residuals.length
  return residuals.map((r, i) => {
    const h = leverageValues[i]
    const denom = p * residualStdError ** 2 * (1 - h) ** 2
    if (denom === 0) return 0
    return (r ** 2 * h) / denom
  })
}

/**
 * Durbin-Watson 统计量（检验自相关）
 * @param {number[]} residuals - 残差向量
 * @returns {number} DW 统计量
 */
export function durbinWatson(residuals) {
  const n = residuals.length
  if (n < 2) return 0
  let numerator = 0
  let denominator = residuals[0] ** 2
  for (let i = 1; i < n; i++) {
    numerator += (residuals[i] - residuals[i - 1]) ** 2
    denominator += residuals[i] ** 2
  }
  return denominator === 0 ? 2 : numerator / denominator
}

/**
 * t 分布的临界值（近似，用于教学目的）
 * @param {number} df - 自由度
 * @param {number} confidenceLevel - 置信水平 (0.9, 0.95, 0.99)
 * @returns {number} t 临界值
 */
export function tCritical(df, confidenceLevel) {
  const alpha = 1 - confidenceLevel
  let z
  if (Math.abs(alpha - 0.1) < 0.001) {
    z = 1.645
  } else if (Math.abs(alpha - 0.01) < 0.001) {
    z = 2.576
  } else {
    z = 1.96
  }
  if (df <= 0) return z
  const adjustment = 1 + 1 / (4 * df) + 5 / (8 * df * df)
  return z * adjustment
}

/**
 * 计算预测区间
 * @param {Object} regressionResult - OLS 回归结果
 * @param {number} x0 - 预测点的 x 值
 * @param {number} confidenceLevel - 置信水平
 * @returns {Object} 预测区间上下界
 */
export function predictionInterval(regressionResult, x0, confidenceLevel = 0.95) {
  const { n, intercept, slope, residualStdError, xMean, fitted } = regressionResult
  const df = n - 2
  const t = tCritical(df, confidenceLevel)
  const sxx = fitted.reduce((acc, _, i) => acc + (fitted[i] - intercept) ** 2, 0) / (slope ** 2 || 1) || 1
  const se = residualStdError * Math.sqrt(1 + 1 / n + (x0 - xMean) ** 2 / sxx)
  const yHat = intercept + slope * x0
  return {
    fit: yHat,
    lower: yHat - t * se,
    upper: yHat + t * se,
    margin: t * se,
  }
}

/**
 * 计算置信带（用于绘图）
 * @param {Object} regressionResult - OLS 回归结果
 * @param {number[]} xValues - x 值数组
 * @param {number} confidenceLevel - 置信水平
 * @returns {Object} 置信带上界和下界
 */
export function confidenceBand(regressionResult, xValues, confidenceLevel = 0.95) {
  const { n, intercept, slope, residualStdError, xMean, fitted } = regressionResult
  const df = n - 2
  const t = tCritical(df, confidenceLevel)
  const sxx = fitted.reduce((acc, _, i) => acc + (fitted[i] - intercept) ** 2, 0)
  const sxxFinal = sxx > 0 ? sxx / (slope ** 2 || 1) : 1
  return xValues.map((x0) => {
    const se = residualStdError * Math.sqrt(1 / n + (x0 - xMean) ** 2 / sxxFinal)
    const yHat = intercept + slope * x0
    return {
      x: x0,
      fit: yHat,
      lower: yHat - t * se,
      upper: yHat + t * se,
    }
  })
}
