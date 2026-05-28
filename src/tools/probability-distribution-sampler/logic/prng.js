/**
 * 可复现伪随机数生成器（PRNG）
 * 使用 Mulberry32 算法，种子可控，序列可复现
 */

/**
 * Mulberry32 PRNG 核心算法
 * @param {number} seed - 32位无符号整数种子
 * @returns {() => number} 返回生成 [0, 1) 区间浮点数的函数
 */
export function createMulberry32(seed) {
  let state = seed >>> 0

  return function () {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 将任意种子值标准化为 32 位无符号整数
 * @param {string|number} seed - 输入种子
 * @returns {number} 32位无符号整数
 */
export function normalizeSeed(seed) {
  if (typeof seed === 'number') {
    return Math.floor(Math.abs(seed)) >>> 0
  }
  if (typeof seed === 'string') {
    let hash = 2166136261
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
  }
  return Date.now() >>> 0
}

/**
 * 创建带种子的随机数生成器
 * @param {string|number} seed - 种子值
 * @returns {{ next: () => number, nextInt: (min: number, max: number) => number }}
 */
export function createPRNG(seed) {
  const normalizedSeed = normalizeSeed(seed)
  const random = createMulberry32(normalizedSeed)

  return {
    next: () => random(),
    nextInt: (min, max) => {
      min = Math.ceil(min)
      max = Math.floor(max)
      return Math.floor(random() * (max - min + 1)) + min
    },
  }
}

/**
 * 分块生成大样本，避免主线程阻塞
 * @param {number} totalSize - 总样本量
 * @param {number} chunkSize - 每块大小
 * @param {(prng: { next: () => number }, chunkIndex: number) => number[]} generateChunk - 单块生成函数
 * @param {string|number} seed - 种子
 * @param {(progress: number) => void} onProgress - 进度回调
 * @returns {Promise<number[]>} 完整样本数组
 */
export async function generateInChunks(totalSize, chunkSize, generateChunk, seed, onProgress) {
  const prng = createPRNG(seed)
  const result = new Array(totalSize)
  let offset = 0
  let chunkIndex = 0

  while (offset < totalSize) {
    const currentChunkSize = Math.min(chunkSize, totalSize - offset)
    const chunk = generateChunk(prng, chunkIndex, currentChunkSize)

    for (let i = 0; i < currentChunkSize; i++) {
      result[offset + i] = chunk[i]
    }

    offset += currentChunkSize
    chunkIndex++

    if (onProgress) {
      onProgress(offset / totalSize)
    }

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return result
}
