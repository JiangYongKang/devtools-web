import { describe, expect, test } from 'vitest'
import {
  createTextChunkIterator,
  estimateTextByteSize,
  getUtf8ByteLength,
} from '../logic/textChunker.js'
import {
  ENCODING_MODES,
  ERROR_CODES,
} from '../logic/constants.js'

describe('textChunker module', () => {
  describe('getUtf8ByteLength', () => {
    test('should calculate ASCII correctly', () => {
      expect(getUtf8ByteLength('Hello')).toBe(5)
      expect(getUtf8ByteLength('')).toBe(0)
    })

    test('should calculate multi-byte characters correctly', () => {
      expect(getUtf8ByteLength('äöü')).toBe(6)
      expect(getUtf8ByteLength('中')).toBe(3)
      expect(getUtf8ByteLength('中文')).toBe(6)
    })

    test('should handle surrogate pairs correctly', () => {
      const emoji = '😀'
      expect(getUtf8ByteLength(emoji)).toBe(4)
    })
  })

  describe('estimateTextByteSize', () => {
    test('should estimate UTF-16 size correctly', () => {
      const text = 'Hello World'
      expect(estimateTextByteSize(text, ENCODING_MODES.UTF_16)).toBe(text.length * 2)
    })

    test('should estimate UTF-8 size correctly', () => {
      expect(estimateTextByteSize('Hello', ENCODING_MODES.UTF_8)).toBe(5)
      expect(estimateTextByteSize('中文', ENCODING_MODES.UTF_8)).toBe(6)
    })

    test('should handle empty text', () => {
      expect(estimateTextByteSize('')).toBe(0)
      expect(estimateTextByteSize(null)).toBe(0)
      expect(estimateTextByteSize(undefined)).toBe(0)
    })
  })

  describe('createTextChunkIterator', () => {
    test('should handle empty string', () => {
      const iterator = createTextChunkIterator('')
      const result = iterator.next()
      expect(result.done).toBe(true)
      expect(result.value).toBeUndefined()
    })

    test('should throw for invalid encoding', () => {
      expect(() => {
        createTextChunkIterator('test', { encoding: 'invalid' })
      }).toThrow()

      let thrownError = null
      try {
        createTextChunkIterator('test', { encoding: 'invalid' })
      } catch (e) {
        thrownError = e
      }
      expect(thrownError).not.toBeNull()
      expect(thrownError.errorCode).toBe(ERROR_CODES.INVALID_ENCODING)
    })

    test('should throw for invalid chunk size', () => {
      expect(() => {
        createTextChunkIterator('test', { chunkSize: 0 })
      }).toThrow()

      expect(() => {
        createTextChunkIterator('test', { chunkSize: -1 })
      }).toThrow()
    })

    describe('UTF-16 mode', () => {
      test('should create single chunk for small text', () => {
        const text = 'Hello World'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_16,
          chunkSize: 100,
        })
        const chunks = iterator.collectAll()
        expect(chunks.length).toBe(1)
        expect(chunks[0].chunk).toBe(text)
        expect(chunks[0].isFirst).toBe(true)
        expect(chunks[0].isLast).toBe(true)
      })

      test('should split text into multiple chunks', () => {
        const text = 'ABCDEFGHIJ'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_16,
          chunkSize: 3,
        })
        const chunks = iterator.collectAll()
        expect(chunks.length).toBe(4)
        expect(chunks[0].chunk).toBe('ABC')
        expect(chunks[1].chunk).toBe('DEF')
        expect(chunks[2].chunk).toBe('GHI')
        expect(chunks[3].chunk).toBe('J')
      })

      test('should set correct chunk metadata', () => {
        const text = 'ABCDEF'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_16,
          chunkSize: 2,
        })
        const chunks = iterator.collectAll()
        expect(chunks[0].chunkIndex).toBe(0)
        expect(chunks[0].isFirst).toBe(true)
        expect(chunks[0].isLast).toBe(false)
        expect(chunks[chunks.length - 1].isLast).toBe(true)
        expect(chunks[chunks.length - 1].chunkIndex).toBe(chunks.length - 1)
      })

      test('should handle surrogate pairs at chunk boundary', () => {
        const text = 'AB😀CD'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_16,
          chunkSize: 3,
        })
        const chunks = iterator.collectAll()
        expect(chunks.length).toBeGreaterThan(0)
        const reassembled = chunks.map((c) => c.chunk).join('')
        expect(reassembled).toBe(text)
      })

      test('should getTotalChunks return correct count', () => {
        const text = 'ABCDEFGHIJ'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_16,
          chunkSize: 3,
        })
        expect(iterator.getTotalChunks()).toBe(4)
      })

      test('should reset iterator', () => {
        const text = 'ABC'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_16,
          chunkSize: 1,
        })
        const firstPass = iterator.collectAll()
        iterator.reset()
        const secondPass = iterator.collectAll()
        expect(firstPass.length).toBe(secondPass.length)
        expect(firstPass[0].chunk).toBe(secondPass[0].chunk)
      })

      test('should support iteration protocol', () => {
        const text = 'ABCD'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_16,
          chunkSize: 2,
        })
        const chunks = []
        for (const chunk of iterator) {
          chunks.push(chunk)
        }
        expect(chunks.length).toBe(2)
        expect(chunks[0].chunk).toBe('AB')
        expect(chunks[1].chunk).toBe('CD')
      })
    })

    describe('UTF-8 mode', () => {
      test('should split ASCII text correctly', () => {
        const text = 'ABCDEFGHIJ'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_8,
          chunkSize: 3,
        })
        const chunks = iterator.collectAll()
        expect(chunks.length).toBe(4)
        const reassembled = chunks.map((c) => c.chunk).join('')
        expect(reassembled).toBe(text)
      })

      test('should handle UTF-8 multi-byte boundaries', () => {
        const text = '中文测试'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_8,
          chunkSize: 4,
        })
        const chunks = iterator.collectAll()
        const reassembled = chunks.map((c) => c.chunk).join('')
        expect(reassembled).toBe(text)
      })

      test('should not split multi-byte sequences', () => {
        const text = 'äöü'
        const iterator = createTextChunkIterator(text, {
          encoding: ENCODING_MODES.UTF_8,
          chunkSize: 2,
        })
        const chunks = iterator.collectAll()
        for (const chunk of chunks) {
          expect(chunk.byteSize).toBeGreaterThan(0)
        }
        const reassembled = chunks.map((c) => c.chunk).join('')
        expect(reassembled).toBe(text)
      })
    })
  })
})
