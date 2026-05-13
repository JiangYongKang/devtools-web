import {
  VIRTUALIZATION_CONFIG,
} from './constants.js'

function calculateVisibleRange(scrollTop, containerHeight, itemHeight = VIRTUALIZATION_CONFIG.ITEM_HEIGHT, totalItems) {
  if (totalItems === 0) {
    return { start: 0, end: 0, visibleCount: 0, offsetTop: 0, totalHeight: 0 }
  }

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - VIRTUALIZATION_CONFIG.BUFFER_ITEMS)
  const visibleCount = Math.ceil(containerHeight / itemHeight) + VIRTUALIZATION_CONFIG.BUFFER_ITEMS * 2
  const end = Math.min(totalItems, start + visibleCount)
  const offsetTop = start * itemHeight
  const totalHeight = totalItems * itemHeight

  return {
    start,
    end,
    visibleCount: end - start,
    offsetTop,
    totalHeight,
  }
}

function getVisibleItems(items, visibleRange) {
  if (!items || items.length === 0) return []
  return items.slice(visibleRange.start, visibleRange.end)
}

function shouldRender(index, visibleRange) {
  return index >= visibleRange.start && index < visibleRange.end
}

export {
  calculateVisibleRange,
  getVisibleItems,
  shouldRender,
}
