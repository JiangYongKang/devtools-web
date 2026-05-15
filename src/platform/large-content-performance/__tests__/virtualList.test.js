import { describe, expect, test } from 'vitest'
import {
  createHeightCache,
  calculateTotalHeight,
  findAnchorIndex,
  getOffsetBeforeIndex,
  calculateVisibleRange,
  shouldRender,
  isFastScrolling,
} from '../logic/virtualList.js'

describe('virtualList module', () => {
  describe('createHeightCache', () => {
    test('should return default height for uncached items', () => {
      const cache = createHeightCache(40)
      expect(cache.get(0)).toBe(40)
      expect(cache.get(999)).toBe(40)
    })

    test('should store and retrieve measured heights', () => {
      const cache = createHeightCache(40)
      cache.set(0, 50)
      cache.set(1, 60)
      expect(cache.get(0)).toBe(50)
      expect(cache.get(1)).toBe(60)
      expect(cache.get(2)).toBe(40)
    })

    test('should track measured count', () => {
      const cache = createHeightCache(40)
      expect(cache.getMeasuredCount()).toBe(0)
      cache.set(0, 50)
      expect(cache.getMeasuredCount()).toBe(1)
      cache.set(1, 60)
      expect(cache.getMeasuredCount()).toBe(2)
    })

    test('should calculate estimated average', () => {
      const cache = createHeightCache(40)
      expect(cache.getEstimatedAverage()).toBe(40)
      cache.set(0, 60)
      cache.set(1, 80)
      expect(cache.getEstimatedAverage()).toBe(70)
    })

    test('should clear cache', () => {
      const cache = createHeightCache(40)
      cache.set(0, 50)
      cache.set(1, 60)
      cache.clear()
      expect(cache.getMeasuredCount()).toBe(0)
      expect(cache.getEstimatedAverage()).toBe(40)
      expect(cache.get(0)).toBe(40)
    })

    test('should check if item has measurement', () => {
      const cache = createHeightCache(40)
      expect(cache.has(0)).toBe(false)
      cache.set(0, 50)
      expect(cache.has(0)).toBe(true)
    })

    test('should return cache size', () => {
      const cache = createHeightCache(40)
      expect(cache.getCacheSize()).toBe(0)
      cache.set(0, 50)
      cache.set(1, 60)
      expect(cache.getCacheSize()).toBe(2)
    })
  })

  describe('calculateTotalHeight', () => {
    test('should return 0 for empty list', () => {
      const cache = createHeightCache(40)
      expect(calculateTotalHeight(0, cache)).toBe(0)
    })

    test('should calculate with default heights', () => {
      const cache = createHeightCache(40)
      expect(calculateTotalHeight(10, cache)).toBe(400)
    })

    test('should use measured heights when available', () => {
      const cache = createHeightCache(40)
      cache.set(0, 60)
      cache.set(1, 80)
      expect(calculateTotalHeight(2, cache)).toBe(60 + 80)
    })

    test('should estimate single unmeasured item using average', () => {
      const cache = createHeightCache(40)
      cache.set(0, 60)
      cache.set(1, 80)
      const average = (60 + 80) / 2
      expect(calculateTotalHeight(3, cache)).toBeCloseTo(60 + 80 + average, 0)
    })

    test('should estimate multiple unmeasured items using average', () => {
      const cache = createHeightCache(40)
      cache.set(0, 60)
      cache.set(1, 80)
      expect(calculateTotalHeight(10, cache)).toBe(60 + 80 + 8 * 70)
    })
  })

  describe('getOffsetBeforeIndex', () => {
    test('should return 0 for index 0', () => {
      const cache = createHeightCache(40)
      expect(getOffsetBeforeIndex(0, cache)).toBe(0)
    })

    test('should calculate offset using default heights', () => {
      const cache = createHeightCache(40)
      expect(getOffsetBeforeIndex(5, cache)).toBe(200)
    })

    test('should use measured heights', () => {
      const cache = createHeightCache(40)
      cache.set(0, 50)
      cache.set(2, 100)
      expect(getOffsetBeforeIndex(4, cache)).toBeCloseTo(50 + 75 + 100 + 75, 0)
    })
  })

  describe('findAnchorIndex', () => {
    test('should return 0 for scrollTop 0', () => {
      const cache = createHeightCache(40)
      expect(findAnchorIndex(0, 100, cache)).toBe(0)
    })

    test('should return last index when scrolled past end', () => {
      const cache = createHeightCache(40)
      expect(findAnchorIndex(10000, 10, cache)).toBe(9)
    })

    test('should find correct anchor with uniform heights', () => {
      const cache = createHeightCache(40)
      expect(findAnchorIndex(100, 100, cache)).toBe(2)
      expect(findAnchorIndex(120, 100, cache)).toBe(3)
    })

    test('should find anchor with measured heights', () => {
      const cache = createHeightCache(40)
      cache.set(0, 100)
      cache.set(1, 100)
      expect(findAnchorIndex(150, 10, cache)).toBe(1)
    })
  })

  describe('calculateVisibleRange', () => {
    test('should handle empty list', () => {
      const cache = createHeightCache(40)
      const range = calculateVisibleRange(0, 400, 0, cache)
      expect(range.start).toBe(0)
      expect(range.end).toBe(0)
      expect(range.visibleCount).toBe(0)
      expect(range.totalHeight).toBe(0)
    })

    test('should calculate visible range with uniform heights', () => {
      const cache = createHeightCache(40)
      const range = calculateVisibleRange(0, 400, 100, cache)
      expect(range.start).toBeLessThanOrEqual(0)
      expect(range.visibleCount).toBeGreaterThanOrEqual(10)
    })

    test('should include overscan items', () => {
      const cache = createHeightCache(40)
      const rangeNoOverscan = calculateVisibleRange(0, 400, 100, cache, { overscan: 0 })
      const rangeWithOverscan = calculateVisibleRange(0, 400, 100, cache, { overscan: 5 })
      expect(rangeWithOverscan.visibleCount).toBeGreaterThan(rangeNoOverscan.visibleCount)
    })

    test('should calculate total height', () => {
      const cache = createHeightCache(40)
      const range = calculateVisibleRange(0, 400, 10, cache)
      expect(range.totalHeight).toBe(400)
    })

    test('should calculate offsetTop', () => {
      const cache = createHeightCache(40)
      const range = calculateVisibleRange(100, 400, 100, cache, { overscan: 0 })
      expect(range.offsetTop).toBeLessThanOrEqual(100)
    })
  })

  describe('shouldRender', () => {
    test('should return true for items in visible range', () => {
      const range = { start: 5, end: 15, visibleCount: 10 }
      expect(shouldRender(5, range)).toBe(true)
      expect(shouldRender(10, range)).toBe(true)
      expect(shouldRender(14, range)).toBe(true)
    })

    test('should return false for items outside visible range', () => {
      const range = { start: 5, end: 15, visibleCount: 10 }
      expect(shouldRender(4, range)).toBe(false)
      expect(shouldRender(15, range)).toBe(false)
      expect(shouldRender(100, range)).toBe(false)
    })
  })

  describe('isFastScrolling', () => {
    test('should detect fast scrolling', () => {
      expect(isFastScrolling(150, 100)).toBe(true)
      expect(isFastScrolling(-150, 100)).toBe(true)
    })

    test('should not detect slow scrolling', () => {
      expect(isFastScrolling(50, 100)).toBe(false)
      expect(isFastScrolling(-50, 100)).toBe(false)
    })

    test('should use default threshold', () => {
      expect(isFastScrolling(150)).toBe(true)
      expect(isFastScrolling(50)).toBe(false)
    })
  })
})
