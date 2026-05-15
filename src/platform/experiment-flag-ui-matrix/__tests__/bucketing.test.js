import { describe, it, expect } from 'vitest'
import {
  fnv1aHash,
  getBucket,
  isInRolloutBucket,
  getVariant,
  isBucketStable,
} from '../logic/index.js'

describe('分桶算法 (Bucketing)', () => {
  describe('fnv1aHash', () => {
    it('相同输入产生相同哈希', () => {
      const hash1 = fnv1aHash('user123')
      const hash2 = fnv1aHash('user123')
      expect(hash1).toBe(hash2)
    })

    it('不同输入产生不同哈希', () => {
      const hash1 = fnv1aHash('user123')
      const hash2 = fnv1aHash('user456')
      expect(hash1).not.toBe(hash2)
    })

    it('哈希为正整数', () => {
      const hash = fnv1aHash('test')
      expect(Number.isInteger(hash)).toBe(true)
      expect(hash).toBeGreaterThan(0)
    })
  })

  describe('getBucket', () => {
    it('相同用户+实验产生稳定分桶', () => {
      const bucket1 = getBucket('user-001', 'experiment-a')
      const bucket2 = getBucket('user-001', 'experiment-a')
      expect(bucket1).toBe(bucket2)
    })

    it('不同用户产生不同分桶', () => {
      const buckets = new Set()
      for (let i = 0; i < 100; i++) {
        buckets.add(getBucket(`user-${i}`, 'experiment-a'))
      }
      expect(buckets.size).toBeGreaterThan(50)
    })

    it('分桶结果在 0-99 范围内（默认 100 个桶）', () => {
      for (let i = 0; i < 1000; i++) {
        const bucket = getBucket(`user-${i}`, 'test-experiment')
        expect(bucket).toBeGreaterThanOrEqual(0)
        expect(bucket).toBeLessThan(100)
      }
    })

    it('支持自定义分桶数量', () => {
      const bucket = getBucket('user-001', 'experiment-a', 10)
      expect(bucket).toBeGreaterThanOrEqual(0)
      expect(bucket).toBeLessThan(10)
    })

    it('用户 ID 为空抛出错误', () => {
      expect(() => getBucket('', 'experiment-a')).toThrow()
    })

    it('实验名称为空抛出错误', () => {
      expect(() => getBucket('user-001', '')).toThrow()
    })
  })

  describe('isBucketStable', () => {
    it('多次调用返回相同结果', () => {
      const userId = 'stable-user-001'
      const experimentName = 'stable-experiment'
      const bucket = getBucket(userId, experimentName)
      expect(isBucketStable(userId, experimentName, bucket)).toBe(true)
    })
  })

  describe('isInRolloutBucket', () => {
    it('0% 放量时所有用户都不在范围内', () => {
      for (let i = 0; i < 100; i++) {
        expect(isInRolloutBucket(`user-${i}`, 'test-exp', 0)).toBe(false)
      }
    })

    it('100% 放量时所有用户都在范围内', () => {
      for (let i = 0; i < 100; i++) {
        expect(isInRolloutBucket(`user-${i}`, 'test-exp', 100)).toBe(true)
      }
    })

    it('50% 放量时大约一半用户在范围内', () => {
      let inRange = 0
      for (let i = 0; i < 1000; i++) {
        if (isInRolloutBucket(`user-${i}`, 'test-exp', 50)) {
          inRange++
        }
      }
      expect(inRange).toBeGreaterThan(400)
      expect(inRange).toBeLessThan(600)
    })

    it('放量百分比超出范围抛出错误', () => {
      expect(() => isInRolloutBucket('user', 'exp', -1)).toThrow()
      expect(() => isInRolloutBucket('user', 'exp', 101)).toThrow()
    })
  })

  describe('getVariant', () => {
    const variants = [
      { name: 'control', weight: 50, payload: { version: 'v1' } },
      { name: 'variant_a', weight: 50, payload: { version: 'v2' } },
    ]

    it('相同用户分配到相同变体', () => {
      const result1 = getVariant('user-001', 'test-exp', variants)
      const result2 = getVariant('user-001', 'test-exp', variants)
      expect(result1.name).toBe(result2.name)
      expect(result1.bucket).toBe(result2.bucket)
    })

    it('返回的变体在配置列表中', () => {
      const result = getVariant('user-001', 'test-exp', variants)
      const variantNames = variants.map((v) => v.name)
      expect(variantNames).toContain(result.name)
    })

    it('返回正确的 payload', () => {
      const result = getVariant('user-001', 'test-exp', variants)
      const variant = variants.find((v) => v.name === result.name)
      expect(result.payload).toEqual(variant.payload)
    })

    it('权重为 0 的变体不会被分配', () => {
      const zeroWeightVariants = [
        { name: 'never', weight: 0 },
        { name: 'always', weight: 100 },
      ]
      let gotNever = false
      for (let i = 0; i < 1000; i++) {
        const result = getVariant(`user-${i}`, 'test-exp', zeroWeightVariants)
        if (result.name === 'never') gotNever = true
      }
      expect(gotNever).toBe(false)
    })

    it('空变体配置抛出错误', () => {
      expect(() => getVariant('user', 'exp', [])).toThrow()
    })

    it('总权重为 0 抛出错误', () => {
      expect(() => getVariant('user', 'exp', [{ name: 'a', weight: 0 }])).toThrow()
    })
  })
})
