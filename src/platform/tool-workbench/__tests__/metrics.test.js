import { describe, test, expect } from 'vitest'
import {
  countUtf8Bytes,
  countLines,
  countWords,
  countCharacters,
  calculateTextMetrics,
  formatSize,
  isOutputTooLarge,
  getSizeCategory,
} from '../logic/metrics.js'

describe('metrics.js', () => {
  describe('countUtf8Bytes', () => {
    test('should count 0 for null/undefined/empty', () => {
      expect(countUtf8Bytes(null)).toBe(0)
      expect(countUtf8Bytes(undefined)).toBe(0)
      expect(countUtf8Bytes('')).toBe(0)
    })

    test('should count 1 byte per ASCII character', () => {
      expect(countUtf8Bytes('Hello')).toBe(5)
      expect(countUtf8Bytes('ABC')).toBe(3)
    })

    test('should count 3 bytes per CJK character', () => {
      expect(countUtf8Bytes('你好')).toBe(6)
      expect(countUtf8Bytes('世界')).toBe(6)
    })

    test('should count 4 bytes per emoji', () => {
      expect(countUtf8Bytes('🌍')).toBe(4)
      expect(countUtf8Bytes('👋')).toBe(4)
    })

    test('should handle mixed content', () => {
      expect(countUtf8Bytes('Hello 世界 🌍')).toBe(5 + 1 + 6 + 1 + 4)
    })
  })

  describe('countLines', () => {
    test('should count 0 for null/undefined/empty', () => {
      expect(countLines(null)).toBe(0)
      expect(countLines(undefined)).toBe(0)
      expect(countLines('')).toBe(0)
    })

    test('should count 1 for single line without newline', () => {
      expect(countLines('Hello')).toBe(1)
    })

    test('should count LF newlines', () => {
      expect(countLines('a\nb\nc')).toBe(3)
      expect(countLines('a\nb\nc\n')).toBe(3)
    })

    test('should handle trailing newline', () => {
      expect(countLines('line1\nline2\n')).toBe(2)
    })
  })

  describe('countWords', () => {
    test('should count 0 for null/undefined/empty', () => {
      expect(countWords(null)).toBe(0)
      expect(countWords(undefined)).toBe(0)
      expect(countWords('')).toBe(0)
    })

    test('should count 0 for whitespace only', () => {
      expect(countWords('   ')).toBe(0)
      expect(countWords('\t\n  ')).toBe(0)
    })

    test('should count words separated by whitespace', () => {
      expect(countWords('Hello World')).toBe(2)
      expect(countWords('a b c d')).toBe(4)
    })

    test('should handle multiple whitespace', () => {
      expect(countWords('Hello   World   Test')).toBe(3)
    })
  })

  describe('countCharacters', () => {
    test('should count 0 for null/undefined/empty', () => {
      expect(countCharacters(null)).toBe(0)
      expect(countCharacters(undefined)).toBe(0)
      expect(countCharacters('')).toBe(0)
    })

    test('should handle Unicode correctly', () => {
      expect(countCharacters('Hello')).toBe(5)
      expect(countCharacters('你好')).toBe(2)
      expect(countCharacters('😀')).toBe(1)
      expect(countCharacters('A😀B')).toBe(3)
    })
  })

  describe('calculateTextMetrics', () => {
    test('should return all metrics', () => {
      const text = 'Hello World\nThis is a test'
      const metrics = calculateTextMetrics(text)
      
      expect(metrics.utf8Bytes).toBeDefined()
      expect(metrics.lines).toBe(2)
      expect(metrics.words).toBe(6)
      expect(metrics.chars).toBe(26)
      expect(metrics.wordDensity).toBeDefined()
    })

    test('should handle empty string', () => {
      const metrics = calculateTextMetrics('')
      
      expect(metrics.utf8Bytes).toBe(0)
      expect(metrics.lines).toBe(0)
      expect(metrics.words).toBe(0)
      expect(metrics.chars).toBe(0)
      expect(metrics.wordDensity).toBe('0.00')
    })
  })

  describe('formatSize', () => {
    test('should format bytes', () => {
      expect(formatSize(0)).toBe('0 B')
      expect(formatSize(512)).toBe('512 B')
    })

    test('should format kilobytes', () => {
      expect(formatSize(1024)).toBe('1.00 KB')
      expect(formatSize(1536)).toBe('1.50 KB')
    })

    test('should format megabytes', () => {
      expect(formatSize(1024 * 1024)).toBe('1.00 MB')
      expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MB')
    })

    test('should format gigabytes', () => {
      expect(formatSize(1024 * 1024 * 1024)).toBe('1.00 GB')
    })

    test('should handle null/negative', () => {
      expect(formatSize(null)).toBe('0 B')
      expect(formatSize(-100)).toBe('0 B')
    })
  })

  describe('isOutputTooLarge', () => {
    test('should return false for smaller sizes', () => {
      expect(isOutputTooLarge(100, 1000)).toBe(false)
      expect(isOutputTooLarge(0, 1000)).toBe(false)
    })

    test('should return false for equal size', () => {
      expect(isOutputTooLarge(1000, 1000)).toBe(false)
    })

    test('should return true for larger sizes', () => {
      expect(isOutputTooLarge(1001, 1000)).toBe(true)
    })
  })

  describe('getSizeCategory', () => {
    test('should return empty for 0', () => {
      expect(getSizeCategory(0, 1000, 10000)).toBe('empty')
    })

    test('should return normal for size <= warn', () => {
      expect(getSizeCategory(500, 1000, 10000)).toBe('normal')
      expect(getSizeCategory(1000, 1000, 10000)).toBe('normal')
    })

    test('should return warning for warn < size <= max', () => {
      expect(getSizeCategory(5000, 1000, 10000)).toBe('warning')
      expect(getSizeCategory(10000, 1000, 10000)).toBe('warning')
    })

    test('should return exceeded for size > max', () => {
      expect(getSizeCategory(10001, 1000, 10000)).toBe('exceeded')
    })
  })
})
