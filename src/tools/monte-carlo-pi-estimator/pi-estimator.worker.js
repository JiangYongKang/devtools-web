/**
 * 蒙特卡洛 π 估算 Web Worker
 * 用于并行执行分片采样任务
 */

/**
 * 线性同余生成器
 * @param {number} seed
 * @returns {Function}
 */
function createRandomGenerator(seed) {
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
 * 判断点是否在单位圆内
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
function isInsideUnitCircle(x, y) {
  return x * x + y * y <= 1
}

/**
 * 批量执行单位圆采样
 * @param {number} n
 * @param {Function} random
 * @returns {number}
 */
function batchSample(n, random) {
  let hits = 0
  for (let i = 0; i < n; i++) {
    const x = random() * 2 - 1
    const y = random() * 2 - 1
    if (isInsideUnitCircle(x, y)) {
      hits++
    }
  }
  return hits
}

/**
 * 分层采样
 * @param {number} n
 * @param {number} strata
 * @param {Function} random
 * @returns {number}
 */
function stratifiedSample(n, strata, random) {
  const cellSize = 2 / strata
  const samplesPerCell = Math.max(1, Math.floor(n / (strata * strata)))
  const actualN = samplesPerCell * strata * strata

  let hits = 0
  for (let i = 0; i < strata; i++) {
    for (let j = 0; j < strata; j++) {
      for (let k = 0; k < samplesPerCell; k++) {
        const x = -1 + i * cellSize + random() * cellSize
        const y = -1 + j * cellSize + random() * cellSize
        if (isInsideUnitCircle(x, y)) {
          hits++
        }
      }
    }
  }

  return hits
}

/**
 * 对偶变量采样
 * @param {number} n 采样对数
 * @param {Function} random
 * @returns {number}
 */
function antitheticSample(n, random) {
  let hits = 0
  for (let i = 0; i < n; i++) {
    const x = random() * 2 - 1
    const y = random() * 2 - 1

    if (isInsideUnitCircle(x, y)) hits++
    if (isInsideUnitCircle(-x, -y)) hits++
  }
  return hits
}

/**
 * Buffon 投针采样
 * @param {number} n
 * @param {number} needleLength
 * @param {number} lineSpacing
 * @param {Function} random
 * @returns {number}
 */
function buffonSample(n, needleLength, lineSpacing, random) {
  let hits = 0
  for (let i = 0; i < n; i++) {
    const y = random() * (lineSpacing / 2)
    const angle = random() * (Math.PI / 2)
    const halfNeedleProjection = (needleLength / 2) * Math.sin(angle)
    if (y <= halfNeedleProjection) {
      hits++
    }
  }
  return hits
}

let isCancelled = false
let currentTaskId = null

self.addEventListener('message', (e) => {
  const { type, taskId, payload } = e.data

  if (type === 'cancel') {
    isCancelled = true
    return
  }

  if (type === 'start') {
    isCancelled = false
    currentTaskId = taskId

    const { method, n, seed, strata, needleLength, lineSpacing } = payload

    const random = createRandomGenerator(seed)
    const batchSize = 10000
    let processed = 0
    let hits = 0

    const processBatch = () => {
      if (isCancelled || taskId !== currentTaskId) {
        self.postMessage({ type: 'cancelled', taskId })
        return
      }

      const remaining = n - processed
      const currentBatch = Math.min(batchSize, remaining)

      let batchHits
      switch (method) {
        case 'stratified':
          batchHits = stratifiedSample(currentBatch, strata || 10, random)
          break
        case 'antithetic':
          batchHits = antitheticSample(Math.ceil(currentBatch / 2), random)
          break
        case 'buffon':
          batchHits = buffonSample(
            currentBatch,
            needleLength || 1,
            lineSpacing || 2,
            random
          )
          break
        default:
          batchHits = batchSample(currentBatch, random)
      }

      hits += batchHits
      processed += currentBatch

      const progress = processed / n
      self.postMessage({
        type: 'progress',
        taskId,
        payload: { progress, processed, hits, n },
      })

      if (processed >= n) {
        self.postMessage({
          type: 'complete',
          taskId,
          payload: { n: processed, hits },
        })
      } else {
        setTimeout(processBatch, 0)
      }
    }

    setTimeout(processBatch, 0)
  }
})
