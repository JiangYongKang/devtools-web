import { isInsideUnitCircle, estimatePi } from './pi-estimator.js'

/**
 * 分层采样 - 将单位正方形划分为 strata x strata 的网格
 * 在每个格子内均匀采样，减少方差
 * @param {number} n - 总采样数
 * @param {number} strata - 每层的划分数目 (strata x strata 网格)
 * @param {Function} random - 随机数生成函数
 * @returns {{hits: number, variance: number, piEstimate: number}}
 */
export function stratifiedSampling(n, strata, random) {
  const cellSize = 2 / strata
  const samplesPerCell = Math.max(1, Math.floor(n / (strata * strata)))
  const actualN = samplesPerCell * strata * strata

  let hits = 0
  const estimates = []

  for (let i = 0; i < strata; i++) {
    for (let j = 0; j < strata; j++) {
      let cellHits = 0
      for (let k = 0; k < samplesPerCell; k++) {
        const x = -1 + i * cellSize + random() * cellSize
        const y = -1 + j * cellSize + random() * cellSize
        if (isInsideUnitCircle(x, y)) {
          cellHits++
          hits++
        }
      }
      const cellEstimate = (4 * cellHits) / samplesPerCell
      estimates.push(cellEstimate)
    }
  }

  const piEstimate = estimatePi(hits, actualN)
  const variance = calculateVariance(estimates, piEstimate)

  return { hits, n: actualN, piEstimate, variance }
}

/**
 * 对偶变量法 - 使用 (x,y) 和 (-x,-y) 作为对偶点
 * 利用对称性减少方差
 * @param {number} n - 采样对数（实际点数为 2n）
 * @param {Function} random - 随机数生成函数
 * @returns {{hits: number, variance: number, piEstimate: number}}
 */
export function antitheticVariates(n, random) {
  let hits = 0
  const estimates = []

  for (let i = 0; i < n; i++) {
    const x = random() * 2 - 1
    const y = random() * 2 - 1

    const hit1 = isInsideUnitCircle(x, y)
    const hit2 = isInsideUnitCircle(-x, -y)

    if (hit1) hits++
    if (hit2) hits++

    const pairEstimate = (4 * (hit1 + hit2)) / 2
    estimates.push(pairEstimate)
  }

  const actualN = 2 * n
  const piEstimate = estimatePi(hits, actualN)
  const variance = calculateVariance(estimates, piEstimate)

  return { hits, n: actualN, piEstimate, variance }
}

/**
 * 控制变量法 - 使用已知期望的函数作为控制变量
 * 这里使用 E[x² + y²] = 2/3 作为控制变量
 * @param {number} n - 采样数
 * @param {Function} random - 随机数生成函数
 * @returns {{hits: number, variance: number, piEstimate: number}}
 */
export function controlVariates(n, random) {
  const TRUE_EXPECTATION = 2 / 3
  let hits = 0
  let sumControl = 0
  const values = []
  const controls = []

  for (let i = 0; i < n; i++) {
    const x = random() * 2 - 1
    const y = random() * 2 - 1
    const indicator = isInsideUnitCircle(x, y) ? 1 : 0
    const control = x * x + y * y

    if (indicator) hits++
    sumControl += control
    values.push(4 * indicator)
    controls.push(control)
  }

  const meanControl = sumControl / n
  const covXY = covariance(values, controls)
  const varControl = calculateSimpleVariance(controls)

  const c = -covXY / varControl

  const adjustedValues = values.map((v, i) => v + c * (controls[i] - TRUE_EXPECTATION))

  const piEstimate = adjustedValues.reduce((a, b) => a + b, 0) / n
  const variance = calculateVariance(adjustedValues, piEstimate)

  return { hits, n, piEstimate, variance }
}

/**
 * 计算数组的方差
 * @param {number[]} values - 数值数组
 * @param {number} mean - 均值（可选，若不提供则计算）
 * @returns {number} 方差
 */
export function calculateVariance(values, mean = null) {
  if (values.length === 0) return 0
  const m = mean ?? values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map((v) => (v - m) ** 2)
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
}

/**
 * 计算两个数组的协方差
 * @param {number[]} x - 数组 X
 * @param {number[]} y - 数组 Y
 * @returns {number} 协方差
 */
export function covariance(x, y) {
  if (x.length !== y.length || x.length === 0) return 0
  const meanX = x.reduce((a, b) => a + b, 0) / x.length
  const meanY = y.reduce((a, b) => a + b, 0) / y.length
  let sum = 0
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - meanX) * (y[i] - meanY)
  }
  return sum / x.length
}

/**
 * 简单方差计算
 * @param {number[]} values - 数值数组
 * @returns {number} 方差
 */
function calculateSimpleVariance(values) {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
}

/**
 * 标准蒙特卡洛采样（作为对比基准）
 * @param {number} n - 采样数
 * @param {Function} random - 随机数生成函数
 * @returns {{hits: number, variance: number, piEstimate: number}}
 */
export function standardMonteCarlo(n, random) {
  let hits = 0
  const estimates = []
  const batchSize = Math.max(1, Math.floor(n / 100))

  for (let batch = 0; batch < 100; batch++) {
    let batchHits = 0
    for (let i = 0; i < batchSize; i++) {
      const x = random() * 2 - 1
      const y = random() * 2 - 1
      if (isInsideUnitCircle(x, y)) {
        batchHits++
        hits++
      }
    }
    estimates.push((4 * batchHits) / batchSize)
  }

  const actualN = batchSize * 100
  const piEstimate = estimatePi(hits, actualN)
  const variance = calculateVariance(estimates, piEstimate)

  return { hits, n: actualN, piEstimate, variance }
}

/**
 * 对比不同方差缩减策略的效果
 * @param {number} n - 采样数
 * @param {number} seed - 随机种子
 * @returns {Object} 各方法的对比结果
 */
export function compareVarianceReduction(n, seed) {
  const createRNG = (s) => {
    let state = s >>> 0
    return () => {
      state = (1664525 * state + 1013904223) % 2 ** 32
      return state / 2 ** 32
    }
  }

  const standard = standardMonteCarlo(n, createRNG(seed))
  const stratified = stratifiedSampling(n, 10, createRNG(seed + 1))
  const antithetic = antitheticVariates(Math.floor(n / 2), createRNG(seed + 2))

  return {
    standard: {
      ...standard,
      standardError: Math.sqrt(standard.variance / standard.n),
    },
    stratified: {
      ...stratified,
      standardError: Math.sqrt(stratified.variance / stratified.n),
      varianceRatio: stratified.variance / standard.variance,
    },
    antithetic: {
      ...antithetic,
      standardError: Math.sqrt(antithetic.variance / antithetic.n),
      varianceRatio: antithetic.variance / standard.variance,
    },
  }
}
