import {
  LAYOUT_TOPOLOGIES,
  RESPONSIVE_BREAKPOINTS,
  RESPONSIVE_CLASS_NAMES,
  DEFAULT_PARTITION_MIN_HEIGHTS,
  DEFAULT_PARTITION_RATIOS,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
} from './errors.js'

function validateTopology(topology) {
  return topology === LAYOUT_TOPOLOGIES.SIDE_BY_SIDE ||
         topology === LAYOUT_TOPOLOGIES.STACKED
}

function getDefaultTopology() {
  return LAYOUT_TOPOLOGIES.SIDE_BY_SIDE
}

function deriveLayoutClassName(topology) {
  if (!validateTopology(topology)) {
    throw createError(ERROR_CODES.INVALID_TOPOLOGY)
  }
  return `wb-layout-${topology}`
}

function toggleTopology(currentTopology) {
  if (!validateTopology(currentTopology)) {
    throw createError(ERROR_CODES.INVALID_TOPOLOGY)
  }
  return currentTopology === LAYOUT_TOPOLOGIES.SIDE_BY_SIDE
    ? LAYOUT_TOPOLOGIES.STACKED
    : LAYOUT_TOPOLOGIES.SIDE_BY_SIDE
}

function getBreakpointClassByWidth(width) {
  if (width <= RESPONSIVE_BREAKPOINTS.NARROW) {
    return RESPONSIVE_CLASS_NAMES.NARROW
  }
  if (width <= RESPONSIVE_BREAKPOINTS.MEDIUM) {
    return RESPONSIVE_CLASS_NAMES.MEDIUM
  }
  return RESPONSIVE_CLASS_NAMES.WIDE
}

function isNarrowScreen(width) {
  return width <= RESPONSIVE_BREAKPOINTS.NARROW
}

function isTouchDevice(userAgent) {
  if (!userAgent) return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
}

function getTouchDeviceDragRatio(totalSize, dragPosition) {
  if (totalSize <= 0) return DEFAULT_PARTITION_RATIOS.input
  if (dragPosition < 0 || dragPosition > totalSize) {
    throw createError(ERROR_CODES.INVALID_DRAG_POSITION)
  }
  return Math.max(0.1, Math.min(0.9, dragPosition / totalSize))
}

function clampDragPosition(position, min, max) {
  return Math.max(min, Math.min(max, position))
}

function calculatePartitionHeights(totalHeight, ratios, minHeights = DEFAULT_PARTITION_MIN_HEIGHTS) {
  const result = {}
  const keys = Object.keys(ratios)
  let remainingHeight = totalHeight
  let remainingRatio = 0

  for (const key of keys) {
    const min = minHeights[key] || 0
    remainingRatio += ratios[key]
    const allocated = Math.max(min, Math.floor(totalHeight * ratios[key]))
    remainingHeight -= allocated
    result[key] = allocated
  }

  if (remainingHeight > 0) {
    const sortedKeys = [...keys].sort((a, b) => ratios[b] - ratios[a])
    for (const key of sortedKeys) {
      if (remainingHeight <= 0) break
      result[key] += 1
      remainingHeight -= 1
    }
  } else if (remainingHeight < 0) {
    const deficit = Math.abs(remainingHeight)
    const sortedKeys = [...keys].sort((a, b) => (result[b] - (minHeights[b] || 0)) - (result[a] - (minHeights[a] || 0)))
    for (const key of sortedKeys) {
      if (deficit <= 0) break
      const min = minHeights[key] || 0
      const reducible = result[key] - min
      if (reducible > 0) {
        const reduceBy = Math.min(reducible, deficit)
        result[key] -= reduceBy
        deficit -= reduceBy
      }
    }
  }

  return result
}

export {
  validateTopology,
  getDefaultTopology,
  deriveLayoutClassName,
  toggleTopology,
  getBreakpointClassByWidth,
  isNarrowScreen,
  isTouchDevice,
  getTouchDeviceDragRatio,
  clampDragPosition,
  calculatePartitionHeights,
}
