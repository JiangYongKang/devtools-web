import { HASH_SEED, HASH_PRIME, DEFAULT_BUCKET_COUNT, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

/**
 * FNV-1a 非加密哈希算法
 * @param {string} str - 需要哈希的字符串
 * @param {number} seed - 哈希种子，默认为 HASH_SEED
 * @returns {number} 32 位无符号整数哈希值
 */
function fnv1aHash(str, seed = HASH_SEED) {
  let hash = seed

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, HASH_PRIME)
  }

  return hash >>> 0
}

/**
 * 根据用户 ID 和实验名计算稳定分桶
 * @param {string} userId - 用户唯一标识
 * @param {string} experimentName - 实验名称
 * @param {number} bucketCount - 分桶总数，默认为 DEFAULT_BUCKET_COUNT
 * @returns {number} 分桶编号（0 到 bucketCount-1）
 * @throws {FeatureFlagError} 当参数无效时抛出错误
 */
function getBucket(userId, experimentName, bucketCount = DEFAULT_BUCKET_COUNT) {
  if (!userId || typeof userId !== 'string') {
    throw createError(ERROR_CODES.BUCKETING_ERROR, '用户 ID 必须是非空字符串')
  }

  if (!experimentName || typeof experimentName !== 'string') {
    throw createError(ERROR_CODES.BUCKETING_ERROR, '实验名称必须是非空字符串')
  }

  if (!Number.isInteger(bucketCount) || bucketCount < 1) {
    throw createError(ERROR_CODES.BUCKETING_ERROR, '分桶数量必须是正整数')
  }

  const combinedKey = `${experimentName}:${userId}`
  const hash = fnv1aHash(combinedKey)
  const bucket = hash % bucketCount

  return bucket
}

/**
 * 判断用户是否在放量范围内
 * @param {string} userId - 用户唯一标识
 * @param {string} experimentName - 实验名称
 * @param {number} rolloutPercentage - 放量百分比（0-100）
 * @param {number} bucketCount - 分桶总数，默认为 DEFAULT_BUCKET_COUNT
 * @returns {boolean} 用户是否在放量范围内
 * @throws {FeatureFlagError} 当百分比无效时抛出错误
 */
function isInRolloutBucket(userId, experimentName, rolloutPercentage, bucketCount = DEFAULT_BUCKET_COUNT) {
  if (rolloutPercentage < 0 || rolloutPercentage > 100) {
    throw createError(ERROR_CODES.BUCKETING_ERROR, '放量百分比必须在 0-100 之间')
  }

  const bucket = getBucket(userId, experimentName, bucketCount)
  const threshold = Math.floor((rolloutPercentage / 100) * bucketCount)

  return bucket < threshold
}

/**
 * 根据用户 ID 和变体权重分配实验变体
 * @param {string} userId - 用户唯一标识
 * @param {string} experimentName - 实验名称
 * @param {Array} variants - 变体配置数组，每个元素包含 name、weight、payload
 * @returns {Object} 分配结果 { name, bucket, payload }
 * @throws {FeatureFlagError} 当变体配置无效时抛出错误
 */
function getVariant(userId, experimentName, variants) {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw createError(ERROR_CODES.BUCKETING_ERROR, '变体配置必须是非空数组')
  }

  const totalWeight = variants.reduce((sum, v) => {
    const weight = v.weight || 0
    if (weight < 0) {
      throw createError(ERROR_CODES.BUCKETING_ERROR, '变体权重不能为负数')
    }
    return sum + weight
  }, 0)

  if (totalWeight === 0) {
    throw createError(ERROR_CODES.BUCKETING_ERROR, '变体总权重不能为零')
  }

  const bucket = getBucket(userId, experimentName, totalWeight)
  let cumulativeWeight = 0

  for (const variant of variants) {
    cumulativeWeight += variant.weight || 0
    if (bucket < cumulativeWeight) {
      return {
        name: variant.name,
        bucket,
        payload: variant.payload || null,
      }
    }
  }

  return {
    name: variants[variants.length - 1].name,
    bucket,
    payload: variants[variants.length - 1].payload || null,
  }
}

/**
 * 获取分桶的百分比范围信息
 * @param {number} bucketIndex - 分桶索引
 * @param {number} bucketCount - 分桶总数，默认为 DEFAULT_BUCKET_COUNT
 * @returns {Object} 分桶范围信息 { bucket, percentage, range }
 */
function getBucketRange(bucketIndex, bucketCount = DEFAULT_BUCKET_COUNT) {
  const percentage = ((bucketIndex + 1) / bucketCount) * 100
  return {
    bucket: bucketIndex,
    percentage: Math.round(percentage * 100) / 100,
    range: [bucketIndex, bucketIndex + 1],
  }
}

/**
 * 验证分桶稳定性（幂等性检查）
 * @param {string} userId - 用户唯一标识
 * @param {string} experimentName - 实验名称
 * @param {number} expectedBucket - 预期分桶编号
 * @param {number} bucketCount - 分桶总数，默认为 DEFAULT_BUCKET_COUNT
 * @returns {boolean} 分桶是否稳定
 */
function isBucketStable(userId, experimentName, expectedBucket, bucketCount = DEFAULT_BUCKET_COUNT) {
  try {
    const actualBucket = getBucket(userId, experimentName, bucketCount)
    return actualBucket === expectedBucket
  } catch {
    return false
  }
}

export {
  fnv1aHash,
  getBucket,
  isInRolloutBucket,
  getVariant,
  getBucketRange,
  isBucketStable,
}
