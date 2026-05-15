import {
  DEFAULT_CONFIG,
} from './constants.js'

function createHeightCache(defaultHeight = DEFAULT_CONFIG.VIRTUAL_LIST_DEFAULT_ITEM_HEIGHT) {
  const cache = new Map()
  let measuredCount = 0
  let estimatedAverage = defaultHeight

  return {
    get(index) {
      return cache.get(index) ?? defaultHeight
    },
    set(index, height) {
      const prev = cache.get(index)
      cache.set(index, height)
      if (prev === undefined) {
        measuredCount++
        estimatedAverage =
          (estimatedAverage * (measuredCount - 1) + height) / measuredCount
      } else {
        measuredCount = cache.size
        let sum = 0
        cache.forEach((h) => (sum += h))
        estimatedAverage = sum / measuredCount
      }
    },
    has(index) {
      return cache.has(index)
    },
    clear() {
      cache.clear()
      measuredCount = 0
      estimatedAverage = defaultHeight
    },
    getEstimatedAverage() {
      return estimatedAverage
    },
    getMeasuredCount() {
      return measuredCount
    },
    getDefaultHeight() {
      return defaultHeight
    },
    getCacheSize() {
      return cache.size
    },
  }
}

function calculateTotalHeight(itemCount, heightCache) {
  if (itemCount === 0) return 0

  let sum = 0
  let lastMeasuredIndex = -1

  for (let i = 0; i < itemCount; i++) {
    if (heightCache.has(i)) {
      sum += heightCache.get(i)
      lastMeasuredIndex = i
    }
  }

  const remainingCount = itemCount - (lastMeasuredIndex + 1)
  sum += remainingCount * heightCache.getEstimatedAverage()

  return Math.round(sum)
}

function findAnchorIndex(scrollTop, itemCount, heightCache) {
  if (itemCount === 0 || scrollTop <= 0) return 0
  if (calculateTotalHeight(itemCount, heightCache) <= scrollTop) {
    return Math.max(0, itemCount - 1)
  }

  let low = 0
  let high = itemCount - 1
  let bestGuess = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const offset = getOffsetBeforeIndex(mid, heightCache)

    if (offset <= scrollTop) {
      bestGuess = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return bestGuess
}

function getOffsetBeforeIndex(index, heightCache) {
  if (index <= 0) return 0

  let offset = 0
  let lastMeasured = -1

  for (let i = 0; i < index; i++) {
    if (heightCache.has(i)) {
      const gap = i - lastMeasured - 1
      if (gap > 0) {
        offset += gap * heightCache.getEstimatedAverage()
      }
      offset += heightCache.get(i)
      lastMeasured = i
    }
  }

  if (lastMeasured < index - 1) {
    const gap = index - lastMeasured - 1
    offset += gap * heightCache.getEstimatedAverage()
  }

  return Math.round(offset)
}

function calculateVisibleRange(
  scrollTop,
  containerHeight,
  itemCount,
  heightCache,
  options = {}
) {
  const overscan = options.overscan ?? DEFAULT_CONFIG.VIRTUAL_LIST_OVERSCAN_COUNT

  if (itemCount === 0) {
    return {
      start: 0,
      end: 0,
      visibleCount: 0,
      offsetTop: 0,
      totalHeight: 0,
      anchorIndex: 0,
    }
  }

  const anchorIndex = findAnchorIndex(scrollTop, itemCount, heightCache)
  let start = Math.max(0, anchorIndex - overscan)
  let offsetTop = getOffsetBeforeIndex(start, heightCache)

  let end = start
  let accumulatedHeight = 0

  while (end < itemCount && accumulatedHeight < containerHeight) {
    accumulatedHeight += heightCache.get(end)
    end++
  }

  end = Math.min(itemCount, end + overscan)
  const totalHeight = calculateTotalHeight(itemCount, heightCache)

  return {
    start,
    end,
    visibleCount: end - start,
    offsetTop,
    totalHeight,
    anchorIndex,
  }
}

function shouldRender(index, visibleRange) {
  return index >= visibleRange.start && index < visibleRange.end
}

function isFastScrolling(scrollDelta, threshold = DEFAULT_CONFIG.VIRTUAL_LIST_FAST_SCROLL_THRESHOLD_PX) {
  return Math.abs(scrollDelta) >= threshold
}

function createRafScheduler() {
  let rafId = null
  let pendingCallback = null
  let lastScrollTop = 0
  let fastScrollFrames = 0
  const FAST_SCROLL_MIN_FRAMES = 3

  return {
    schedule(scrollTop, callback, onDownsample) {
      const delta = Math.abs(scrollTop - lastScrollTop)
      lastScrollTop = scrollTop

      if (isFastScrolling(delta)) {
        fastScrollFrames++
      } else {
        fastScrollFrames = 0
      }

      if (fastScrollFrames >= FAST_SCROLL_MIN_FRAMES && onDownsample) {
        onDownsample()
      }

      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }

      pendingCallback = callback

      rafId = requestAnimationFrame(() => {
        const cb = pendingCallback
        rafId = null
        pendingCallback = null
        if (cb) {
          cb()
        }
      })
    },
    cancel() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      pendingCallback = null
      fastScrollFrames = 0
    },
    isScheduled() {
      return rafId !== null
    },
    resetFastScroll() {
      fastScrollFrames = 0
    },
  }
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export {
  createHeightCache,
  calculateTotalHeight,
  findAnchorIndex,
  getOffsetBeforeIndex,
  calculateVisibleRange,
  shouldRender,
  isFastScrolling,
  createRafScheduler,
  prefersReducedMotion,
}
