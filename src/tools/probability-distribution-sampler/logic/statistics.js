/**
 * 在线统计算法
 * 计算 mean/variance/skewness/kurtosis
 */

/**
 * 在线计算样本统计量（Welford 算法）
 * @param {number[]} data - 样本数据
 * @returns {{ mean: number, variance: number, skewness: number, kurtosis: number, count: number, min: number, max: number, sum: number, std: number }}
 */
export function computeStatistics(data) {
  const n = data.length
  if (n === 0) {
    return { mean: 0, variance: 0, skewness: 0, kurtosis: 0, count: 0, min: 0, max: 0, sum: 0, std: 0 }
  }

  let mean = 0
  let M2 = 0
  let M3 = 0
  let M4 = 0
  let min = data[0]
  let max = data[0]
  let sum = 0

  for (let i = 0; i < n; i++) {
    const x = data[i]
    sum += x
    if (x < min) min = x
    if (x > max) max = x

    const delta = x - mean
    const deltaN = delta / (i + 1)
    const deltaN2 = deltaN * deltaN
    const term1 = delta * deltaN * i

    mean += deltaN
    M4 += term1 * deltaN2 * (i * i - 3 * i + 3) + 6 * deltaN2 * M2 - 4 * deltaN * M3
    M3 += term1 * deltaN * (i - 2) - 3 * deltaN * M2
    M2 += term1
  }

  const variance = n > 1 ? M2 / (n - 1) : 0
  const std = Math.sqrt(variance)

  let skewness = 0
  let kurtosis = 0

  if (n > 2 && variance > 1e-12) {
    skewness = (n * M3) / ((n - 1) * (n - 2) * std ** 3)
    if (n > 3) {
      kurtosis = (n * (n + 1) * M4) / ((n - 1) * (n - 2) * (n - 3) * std ** 4) -
        (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
    }
  }

  return {
    mean,
    variance,
    skewness,
    kurtosis,
    count: n,
    min,
    max,
    sum,
    std,
  }
}

/**
 * 增量更新统计量（流式计算）
 */
export function createIncrementalStats() {
  let n = 0
  let mean = 0
  let M2 = 0
  let M3 = 0
  let M4 = 0
  let min = Infinity
  let max = -Infinity
  let sum = 0

  return {
    add(x) {
      n++
      sum += x
      if (x < min) min = x
      if (x > max) max = x

      const delta = x - mean
      const deltaN = delta / n
      const deltaN2 = deltaN * deltaN
      const term1 = delta * deltaN * (n - 1)

      mean += deltaN
      M4 += term1 * deltaN2 * ((n - 1) * (n - 2) * (n - 3)) + 6 * deltaN2 * M2 - 4 * deltaN * M3
      M3 += term1 * deltaN * (n - 2) - 3 * deltaN * M2
      M2 += term1
    },
    get() {
      const variance = n > 1 ? M2 / (n - 1) : 0
      const std = Math.sqrt(variance)
      let skewness = 0
      let kurtosis = 0

      if (n > 2 && variance > 1e-12) {
        skewness = (n * M3) / ((n - 1) * (n - 2) * std ** 3)
        if (n > 3) {
          kurtosis =
            (n * (n + 1) * M4) / ((n - 1) * (n - 2) * (n - 3) * std ** 4) -
            (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
        }
      }

      return {
        mean,
        variance,
        std,
        skewness,
        kurtosis,
        count: n,
        min,
        max,
        sum,
      }
    },
  }
}
