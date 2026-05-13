import { describe, test, expect } from 'vitest'
import {
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
} from '../logic/layout.js'
import {
  LAYOUT_TOPOLOGIES,
  RESPONSIVE_CLASS_NAMES,
  DEFAULT_PARTITION_MIN_HEIGHTS,
} from '../logic/constants.js'

describe('layout.js', () => {
  describe('validateTopology', () => {
    test('should return true for valid topologies', () => {
      expect(validateTopology(LAYOUT_TOPOLOGIES.SIDE_BY_SIDE)).toBe(true)
      expect(validateTopology(LAYOUT_TOPOLOGIES.STACKED)).toBe(true)
    })

    test('should return false for invalid topologies', () => {
      expect(validateTopology('invalid')).toBe(false)
      expect(validateTopology(null)).toBe(false)
      expect(validateTopology(undefined)).toBe(false)
      expect(validateTopology(123)).toBe(false)
    })
  })

  describe('getDefaultTopology', () => {
    test('should return side-by-side', () => {
      expect(getDefaultTopology()).toBe(LAYOUT_TOPOLOGIES.SIDE_BY_SIDE)
    })
  })

  describe('deriveLayoutClassName', () => {
    test('should derive correct class names', () => {
      expect(deriveLayoutClassName(LAYOUT_TOPOLOGIES.SIDE_BY_SIDE)).toBe('wb-layout-side-by-side')
      expect(deriveLayoutClassName(LAYOUT_TOPOLOGIES.STACKED)).toBe('wb-layout-stacked')
    })

    test('should throw for invalid topology', () => {
      expect(() => deriveLayoutClassName('invalid')).toThrow()
    })
  })

  describe('toggleTopology', () => {
    test('should toggle side-by-side to stacked', () => {
      expect(toggleTopology(LAYOUT_TOPOLOGIES.SIDE_BY_SIDE)).toBe(LAYOUT_TOPOLOGIES.STACKED)
    })

    test('should toggle stacked to side-by-side', () => {
      expect(toggleTopology(LAYOUT_TOPOLOGIES.STACKED)).toBe(LAYOUT_TOPOLOGIES.SIDE_BY_SIDE)
    })

    test('should throw for invalid topology', () => {
      expect(() => toggleTopology('invalid')).toThrow()
    })
  })

  describe('getBreakpointClassByWidth', () => {
    test('should return narrow class for width <= 640', () => {
      expect(getBreakpointClassByWidth(320)).toBe(RESPONSIVE_CLASS_NAMES.NARROW)
      expect(getBreakpointClassByWidth(640)).toBe(RESPONSIVE_CLASS_NAMES.NARROW)
    })

    test('should return medium class for width between 641 and 1024', () => {
      expect(getBreakpointClassByWidth(800)).toBe(RESPONSIVE_CLASS_NAMES.MEDIUM)
      expect(getBreakpointClassByWidth(1024)).toBe(RESPONSIVE_CLASS_NAMES.MEDIUM)
    })

    test('should return wide class for width > 1024', () => {
      expect(getBreakpointClassByWidth(1025)).toBe(RESPONSIVE_CLASS_NAMES.WIDE)
      expect(getBreakpointClassByWidth(1920)).toBe(RESPONSIVE_CLASS_NAMES.WIDE)
    })
  })

  describe('isNarrowScreen', () => {
    test('should return true for narrow screens', () => {
      expect(isNarrowScreen(320)).toBe(true)
      expect(isNarrowScreen(640)).toBe(true)
    })

    test('should return false for wider screens', () => {
      expect(isNarrowScreen(641)).toBe(false)
      expect(isNarrowScreen(1024)).toBe(false)
    })
  })

  describe('isTouchDevice', () => {
    test('should return true for mobile user agents', () => {
      expect(isTouchDevice('Mozilla/5.0 (iPhone; CPU iPhone OS)')).toBe(true)
      expect(isTouchDevice('Mozilla/5.0 (Android)')).toBe(true)
      expect(isTouchDevice('Mozilla/5.0 (iPad)')).toBe(true)
    })

    test('should return false for desktop user agents', () => {
      expect(isTouchDevice('Mozilla/5.0 (Windows NT)')).toBe(false)
      expect(isTouchDevice('Mozilla/5.0 (Macintosh)')).toBe(false)
    })

    test('should return false for null/undefined', () => {
      expect(isTouchDevice(null)).toBe(false)
      expect(isTouchDevice(undefined)).toBe(false)
    })
  })

  describe('getTouchDeviceDragRatio', () => {
    test('should return ratio between 0.1 and 0.9', () => {
      const ratio = getTouchDeviceDragRatio(500, 250)
      expect(ratio).toBe(0.5)
      expect(ratio).toBeGreaterThanOrEqual(0.1)
      expect(ratio).toBeLessThanOrEqual(0.9)
    })

    test('should clamp extreme ratios', () => {
      expect(getTouchDeviceDragRatio(500, 25)).toBeGreaterThanOrEqual(0.1)
      expect(getTouchDeviceDragRatio(500, 475)).toBeLessThanOrEqual(0.9)
    })

    test('should return default ratio for zero total size', () => {
      expect(getTouchDeviceDragRatio(0, 0)).toBe(0.45)
    })

    test('should throw for invalid drag position', () => {
      expect(() => getTouchDeviceDragRatio(500, -10)).toThrow()
      expect(() => getTouchDeviceDragRatio(500, 600)).toThrow()
    })
  })

  describe('clampDragPosition', () => {
    test('should clamp position within bounds', () => {
      expect(clampDragPosition(50, 0, 100)).toBe(50)
      expect(clampDragPosition(-10, 0, 100)).toBe(0)
      expect(clampDragPosition(150, 0, 100)).toBe(100)
    })
  })

  describe('calculatePartitionHeights', () => {
    test('should calculate heights based on ratios', () => {
      const totalHeight = 800
      const ratios = { input: 0.5, output: 0.5 }
      const result = calculatePartitionHeights(totalHeight, ratios)
      
      expect(result.input).toBeGreaterThan(0)
      expect(result.output).toBeGreaterThan(0)
      expect(result.input + result.output).toBeLessThanOrEqual(totalHeight)
    })

    test('should respect min heights', () => {
      const totalHeight = 200
      const ratios = { input: 0.5, output: 0.5 }
      const minHeights = { input: 150, output: 150 }
      const result = calculatePartitionHeights(totalHeight, ratios, minHeights)
      
      expect(result.input).toBe(minHeights.input)
      expect(result.output).toBe(minHeights.output)
    })

    test('should handle multiple partitions', () => {
      const totalHeight = 1000
      const ratios = { input: 0.4, output: 0.4, meta: 0.2 }
      const result = calculatePartitionHeights(totalHeight, ratios)
      
      expect(Object.keys(result)).toHaveLength(3)
      expect(result.input).toBeGreaterThan(0)
      expect(result.output).toBeGreaterThan(0)
      expect(result.meta).toBeGreaterThan(0)
    })
  })
})
