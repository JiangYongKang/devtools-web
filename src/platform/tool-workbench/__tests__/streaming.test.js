import { describe, test, expect } from 'vitest'
import {
  createStreamingCursor,
  advanceCursor,
  resetCursor,
  mergeChunks,
  chunkString,
  getVirtualScrollRange,
  estimateScrollPositionForIndex,
  estimateIndexForScrollPosition,
  calculatePlaceholderHeight,
} from '../logic/streaming.js'
import { STREAMING_CHUNK_DEFAULTS } from '../logic/constants.js'

describe('streaming.js', () => {
  describe('createStreamingCursor', () => {
    test('should create cursor with default chunk size', () => {
      const cursor = createStreamingCursor()
      expect(cursor.position).toBe(0)
      expect(cursor.chunkSize).toBe(STREAMING_CHUNK_DEFAULTS.MAX_CHUNK_SIZE)
      expect(cursor.chunkCount).toBe(0)
      expect(cursor.totalSize).toBe(0)
    })

    test('should create cursor with custom chunk size', () => {
      const cursor = createStreamingCursor(4096)
      expect(cursor.chunkSize).toBe(4096)
    })
  })

  describe('advanceCursor', () => {
    test('should advance cursor position', () => {
      const cursor = createStreamingCursor()
      const advanced = advanceCursor(cursor, 'test chunk')
      
      expect(advanced.position).toBe(10)
      expect(advanced.chunkCount).toBe(1)
      expect(advanced.totalSize).toBe(10)
    })

    test('should handle empty chunk', () => {
      const cursor = createStreamingCursor()
      const advanced = advanceCursor(cursor, '')
      
      expect(advanced.position).toBe(0)
      expect(advanced.chunkCount).toBe(1)
    })

    test('should advance multiple times', () => {
      let cursor = createStreamingCursor()
      cursor = advanceCursor(cursor, 'first')
      cursor = advanceCursor(cursor, 'second')
      
      expect(cursor.position).toBe(11)
      expect(cursor.chunkCount).toBe(2)
    })
  })

  describe('resetCursor', () => {
    test('should reset cursor but keep chunk size', () => {
      const cursor = { ...createStreamingCursor(4096), position: 100, chunkCount: 5, totalSize: 500 }
      const reset = resetCursor(cursor)
      
      expect(reset.position).toBe(0)
      expect(reset.chunkCount).toBe(0)
      expect(reset.totalSize).toBe(0)
      expect(reset.chunkSize).toBe(4096)
    })
  })

  describe('mergeChunks', () => {
    test('should merge string chunks', () => {
      const chunks = ['Hello', ' ', 'World']
      expect(mergeChunks(chunks)).toBe('Hello World')
    })

    test('should handle empty chunks array', () => {
      expect(mergeChunks([])).toBe('')
    })

    test('should handle non-array input', () => {
      expect(mergeChunks(null)).toBe('')
      expect(mergeChunks(undefined)).toBe('')
    })
  })

  describe('chunkString', () => {
    test('should chunk string into pieces', () => {
      const str = 'abcdefghij'
      const chunks = chunkString(str, 3)
      
      expect(chunks).toHaveLength(4)
      expect(chunks[0]).toBe('abc')
      expect(chunks[1]).toBe('def')
      expect(chunks[2]).toBe('ghi')
      expect(chunks[3]).toBe('j')
    })

    test('should use default chunk size', () => {
      const str = 'a'.repeat(100)
      const chunks = chunkString(str)
      
      expect(chunks.length).toBe(1)
    })

    test('should handle empty string', () => {
      expect(chunkString('')).toEqual([])
      expect(chunkString(null)).toEqual([])
      expect(chunkString(undefined)).toEqual([])
    })
  })

  describe('getVirtualScrollRange', () => {
    test('should calculate visible range with buffer', () => {
      const range = getVirtualScrollRange(100, 20, 40, 10)
      
      expect(range.start).toBe(10)
      expect(range.end).toBe(50)
      expect(range.count).toBe(40)
    })

    test('should clamp to boundaries', () => {
      const range = getVirtualScrollRange(100, 0, 10, 10)
      
      expect(range.start).toBe(0)
      expect(range.end).toBe(20)
    })

    test('should handle end of list', () => {
      const range = getVirtualScrollRange(100, 90, 100, 10)
      
      expect(range.start).toBe(80)
      expect(range.end).toBe(100)
    })

    test('should use default page size', () => {
      const range = getVirtualScrollRange(100, 50, 60)
      
      expect(range.start).toBeLessThan(50)
      expect(range.end).toBeGreaterThan(60)
    })
  })

  describe('estimateScrollPositionForIndex', () => {
    test('should calculate scroll position', () => {
      expect(estimateScrollPositionForIndex(10, 20, 0)).toBe(200)
    })

    test('should handle index 0', () => {
      expect(estimateScrollPositionForIndex(0, 20, 0)).toBe(0)
    })
  })

  describe('estimateIndexForScrollPosition', () => {
    test('should estimate index from scroll position', () => {
      expect(estimateIndexForScrollPosition(200, 20)).toBe(10)
      expect(estimateIndexForScrollPosition(210, 20)).toBe(10)
      expect(estimateIndexForScrollPosition(199, 20)).toBe(9)
    })

    test('should handle zero item height', () => {
      expect(estimateIndexForScrollPosition(200, 0)).toBe(0)
      expect(estimateIndexForScrollPosition(200, -10)).toBe(0)
    })

    test('should handle zero scroll position', () => {
      expect(estimateIndexForScrollPosition(0, 20)).toBe(0)
    })
  })

  describe('calculatePlaceholderHeight', () => {
    test('should calculate padding heights', () => {
      const result = calculatePlaceholderHeight(100, 20, 10, 30)
      
      expect(result.paddingTop).toBe(200)
      expect(result.renderedHeight).toBe(400)
      expect(result.paddingBottom).toBe(1400)
    })

    test('should handle zero values', () => {
      const result = calculatePlaceholderHeight(0, 20, 0, 0)
      
      expect(result.paddingTop).toBe(0)
      expect(result.renderedHeight).toBe(0)
      expect(result.paddingBottom).toBe(0)
    })
  })
})
