/**
 * Buffon 投针问题 - 使用针与平行线相交的概率估算 π
 *
 * 问题描述：
 * - 在间距为 d 的平行线上，投下长度为 l 的针 (l ≤ d)
 * - 针与线相交的概率 P = 2l / (πd)
 * - 因此 π ≈ 2l / (Pd) = 2ln / (dh)
 *   其中 n 是总投掷数，h 是相交次数
 *
 * 通常取 l = d/2，此时公式简化为：π ≈ n / h
 */

/**
 * 单次 Buffon 投针模拟
 * @param {number} needleLength - 针的长度
 * @param {number} lineSpacing - 平行线间距
 * @param {Function} random - 随机数生成函数
 * @returns {{crosses: boolean, y: number, angle: number}} 投针结果
 */
export function dropNeedle(needleLength, lineSpacing, random) {
  const y = random() * (lineSpacing / 2)
  const angle = random() * (Math.PI / 2)

  const halfNeedleProjection = (needleLength / 2) * Math.sin(angle)
  const crosses = y <= halfNeedleProjection

  return { crosses, y, angle }
}

/**
 * 批量执行 Buffon 投针
 * @param {number} n - 投针次数
 * @param {number} needleLength - 针的长度
 * @param {number} lineSpacing - 平行线间距
 * @param {Function} random - 随机数生成函数
 * @returns {{hits: number, results: Array<{crosses: boolean, y: number, angle: number}>}}
 */
export function batchDropNeedles(n, needleLength, lineSpacing, random) {
  let hits = 0
  const results = []
  for (let i = 0; i < n; i++) {
    const result = dropNeedle(needleLength, lineSpacing, random)
    if (result.crosses) hits++
    results.push(result)
  }
  return { hits, results }
}

/**
 * 根据 Buffon 投针结果估算 π
 * π ≈ (2 * l * n) / (d * h)
 * @param {number} hits - 相交次数
 * @param {number} n - 总投针次数
 * @param {number} needleLength - 针的长度
 * @param {number} lineSpacing - 平行线间距
 * @returns {number} π 估计值
 */
export function estimatePiBuffon(hits, n, needleLength, lineSpacing) {
  if (hits === 0 || n === 0) return 0
  return (2 * needleLength * n) / (lineSpacing * hits)
}

/**
 * 计算 Buffon 投针的理论命中概率
 * P = 2l / (πd)
 * @param {number} needleLength - 针的长度
 * @param {number} lineSpacing - 平行线间距
 * @returns {number} 理论概率
 */
export function theoreticalProbabilityBuffon(needleLength, lineSpacing) {
  return (2 * needleLength) / (Math.PI * lineSpacing)
}

/**
 * Buffon 投针的标准配置（针长 = 线距的一半）
 * 这种情况下 π ≈ n / hits
 */
export const BUFFON_STANDARD_CONFIG = {
  needleLength: 1,
  lineSpacing: 2,
}

/**
 * 使用标准配置执行 Buffon 投针
 * @param {number} n - 投针次数
 * @param {Function} random - 随机数生成函数
 * @returns {{hits: number, piEstimate: number, probability: number}}
 */
export function standardBuffonExperiment(n, random) {
  const { needleLength, lineSpacing } = BUFFON_STANDARD_CONFIG
  const { hits } = batchDropNeedles(n, needleLength, lineSpacing, random)
  const piEstimate = estimatePiBuffon(hits, n, needleLength, lineSpacing)
  const probability = hits / n

  return { hits, n, piEstimate, probability }
}

/**
 * 计算 Buffon 投针的方差
 * 对于伯努利试验，方差 = p(1-p)
 * @param {number} probability - 命中概率
 * @returns {number} 方差
 */
export function buffonVariance(probability) {
  return probability * (1 - probability)
}

/**
 * 估算达到目标精度所需的样本量
 * 使用中心极限定理：误差 ≈ z * sqrt(p(1-p)/n)
 * @param {number} targetError - 目标绝对误差
 * @param {number} zScore - 置信度对应的 z 分数 (默认 1.96 对应 95%)
 * @param {number} needleLength - 针的长度
 * @param {number} lineSpacing - 平行线间距
 * @returns {number} 所需样本量
 */
export function estimatedSampleSizeBuffon(targetError, zScore = 1.96, needleLength = 1, lineSpacing = 2) {
  const p = theoreticalProbabilityBuffon(needleLength, lineSpacing)
  const variance = buffonVariance(p)

  const piFromProb = (2 * needleLength) / (lineSpacing * p)
  const derivative = -piFromProb / p

  const errorInProb = targetError / Math.abs(derivative)

  return Math.ceil((zScore * zScore * variance) / (errorInProb * errorInProb))
}

/**
 * 拉普拉斯扩展 - 投针到网格上
 * 可以同时估算两个方向的概率
 */

/**
 * 单次拉普拉斯投针（网格）
 * @param {number} needleLength - 针的长度
 * @param {number} gridSpacing - 网格间距
 * @param {Function} random - 随机数生成函数
 * @returns {{crossesHorizontal: boolean, crossesVertical: boolean}}
 */
export function laplaceDropNeedle(needleLength, gridSpacing, random) {
  const x = random() * (gridSpacing / 2)
  const y = random() * (gridSpacing / 2)
  const angle = random() * (Math.PI / 2)

  const halfNeedleX = (needleLength / 2) * Math.cos(angle)
  const halfNeedleY = (needleLength / 2) * Math.sin(angle)

  const crossesHorizontal = y <= halfNeedleY
  const crossesVertical = x <= halfNeedleX

  return { crossesHorizontal, crossesVertical }
}
