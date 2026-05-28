const TRUE_PI = Math.PI

/**
 * 线性同余生成器 (LCG) - 确定性伪随机数生成器
 * 用于可复现的随机数序列
 * @param {number} seed - 种子值
 * @returns {Function} 返回一个生成 [0,1) 随机数的函数
 */
export function createRandomGenerator(seed) {
  let state = seed >>> 0
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32

  return function random() {
    state = (a * state + c) % m
    return state / m
  }
}

/**
 * 判断点 (x, y) 是否在单位圆内
 * @param {number} x - x 坐标
 * @param {number} y - y 坐标
 * @returns {boolean} 是否在圆内
 */
export function isInsideUnitCircle(x, y) {
  return x * x + y * y <= 1
}

/**
 * 使用单位圆随机点法执行单次采样
 * @param {Function} random - 随机数生成函数
 * @returns {{x: number, y: number, hit: boolean}} 采样结果
 */
export function samplePoint(random) {
  const x = random() * 2 - 1
  const y = random() * 2 - 1
  return { x, y, hit: isInsideUnitCircle(x, y) }
}

/**
 * 批量执行 N 次单位圆随机点采样
 * @param {number} n - 采样数量
 * @param {Function} random - 随机数生成函数
 * @returns {{hits: number, points: Array<{x: number, y: number, hit: boolean}>}}
 */
export function batchSampleCircle(n, random) {
  let hits = 0
  const points = []
  for (let i = 0; i < n; i++) {
    const point = samplePoint(random)
    if (point.hit) hits++
    points.push(point)
  }
  return { hits, points }
}

/**
 * 根据命中数和样本量估算 π 值
 * π ≈ 4 * (命中数 / 样本数)
 * @param {number} hits - 命中数
 * @param {number} n - 样本总数
 * @returns {number} π 估计值
 */
export function estimatePi(hits, n) {
  if (n === 0) return 0
  return (4 * hits) / n
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
 * 增量更新聚合统计
 * @param {{totalN: number, totalHits: number}} current - 当前统计
 * @param {{n: number, hits: number}} batch - 新批次结果
 * @returns {{totalN: number, totalHits: number}} 更新后的统计
 */
export function mergeBatchResults(current, batch) {
  return {
    totalN: current.totalN + batch.n,
    totalHits: current.totalHits + batch.hits,
  }
}

/**
 * 合并多个 Worker 的结果
 * @param {Array<{n: number, hits: number}>} workerResults - 各 Worker 结果
 * @returns {{totalN: number, totalHits: number}} 合并结果
 */
export function mergeWorkerResults(workerResults) {
  return workerResults.reduce(
    (acc, r) => ({
      totalN: acc.totalN + r.n,
      totalHits: acc.totalHits + r.hits,
    }),
    { totalN: 0, totalHits: 0 }
  )
}

/**
 * 生成固定种子列表用于实验复现
 * @returns {number[]} 种子列表
 */
export function getFixedSeeds() {
  return [
    12345, 67890, 13579, 24680, 98765, 43210, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888,
    99999,
  ]
}
