import { describe, test, expect } from 'vitest'
import {
  MAX_SAFE_INPUT_SIZE,
  ERROR_CODES,
  OPERATION,
  GRANULARITY,
  escapeHtml,
  formatBytes,
  validateInputs,
  normalizeText,
  tokenizeByLine,
  tokenizeByWord,
  tokenize,
  computeDiff,
  calculateStats,
  groupSegmentsByOperation,
} from '../logic/diffLogic'

describe('diffLogic', () => {
  describe('constants', () => {
    test('ERROR_CODES should contain all required error codes', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.INVALID_PARAMETER).toBe('INVALID_PARAMETER')
      expect(ERROR_CODES.INPUT_TOO_LARGE).toBe('INPUT_TOO_LARGE')
      expect(ERROR_CODES.TOO_MANY_SEGMENTS).toBe('TOO_MANY_SEGMENTS')
      expect(ERROR_CODES.DIFF_TIMEOUT).toBe('DIFF_TIMEOUT')
      expect(ERROR_CODES.DIFF_INTERRUPTED).toBe('DIFF_INTERRUPTED')
      expect(ERROR_CODES.DIFF_ERROR).toBe('DIFF_ERROR')
    })

    test('OPERATION should contain all operations', () => {
      expect(OPERATION.EQUAL).toBe('equal')
      expect(OPERATION.DELETE).toBe('delete')
      expect(OPERATION.INSERT).toBe('insert')
    })

    test('GRANULARITY should contain both modes', () => {
      expect(GRANULARITY.LINE).toBe('line')
      expect(GRANULARITY.WORD).toBe('word')
    })
  })

  describe('helper functions', () => {
    describe('escapeHtml', () => {
      test('should return empty string for null or undefined', () => {
        expect(escapeHtml(null)).toBe('')
        expect(escapeHtml(undefined)).toBe('')
      })

      test('should convert non-string values to string', () => {
        expect(escapeHtml(123)).toBe('123')
        expect(escapeHtml(0)).toBe('0')
      })

      test('should escape special characters', () => {
        const xss = '<script>alert("xss")</script>'
        const escaped = escapeHtml(xss)
        expect(escaped).not.toContain('<script>')
        expect(escaped).toContain('&lt;')
        expect(escaped).toContain('&gt;')
      })

      test('should return original string if no special characters', () => {
        expect(escapeHtml('hello world')).toBe('hello world')
        expect(escapeHtml('')).toBe('')
      })
    })

    describe('formatBytes', () => {
      test('should return "0 B" for zero bytes', () => {
        expect(formatBytes(0)).toBe('0 B')
      })

      test('should format bytes correctly', () => {
        expect(formatBytes(1)).toBe('1 B')
        expect(formatBytes(1023)).toBe('1023 B')
        expect(formatBytes(1024)).toBe('1 KB')
        expect(formatBytes(1024 * 1024)).toBe('1 MB')
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
      })

      test('should format to 2 decimal places', () => {
        expect(formatBytes(1500)).toBe('1.46 KB')
      })

      test('should handle invalid inputs', () => {
        expect(formatBytes(-1)).toBe('0 B')
        expect(formatBytes(NaN)).toBe('0 B')
        expect(formatBytes(Infinity)).toBe('0 B')
      })
    })
  })

  describe('validateInputs', () => {
    test('should return error for null input', () => {
      const result1 = validateInputs(null, 'text')
      expect(result1.valid).toBe(false)
      expect(result1.error.code).toBe(ERROR_CODES.NULL_INPUT)

      const result2 = validateInputs('text', undefined)
      expect(result2.valid).toBe(false)
      expect(result2.error.code).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return error for non-string input', () => {
      const result = validateInputs(123, 'text')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.NULL_INPUT)
    })

    test('should return error for invalid granularity', () => {
      const result = validateInputs('text1', 'text2', { granularity: 'invalid' })
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return error for non-boolean ignoreWhitespace', () => {
      const result = validateInputs('text1', 'text2', { ignoreWhitespace: 'true' })
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_PARAMETER)
    })

    test('should return valid for correct inputs', () => {
      const result = validateInputs('text1', 'text2')
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    test('should return error for input too large', () => {
      const largeText = 'x'.repeat(MAX_SAFE_INPUT_SIZE + 1)
      const result = validateInputs(largeText, 'text')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INPUT_TOO_LARGE)
    })
  })

  describe('normalizeText', () => {
    test('should normalize newlines by default', () => {
      const text = 'line1\r\nline2\rline3'
      const result = normalizeText(text)
      expect(result).toBe('line1\nline2\nline3')
    })

    test('should not normalize newlines when disabled', () => {
      const text = 'line1\r\nline2'
      const result = normalizeText(text, { normalizeNewlines: false })
      expect(result).toBe('line1\r\nline2')
    })

    test('should ignore whitespace when enabled', () => {
      const text = 'hello   world\ttest'
      const result = normalizeText(text, { ignoreWhitespace: true })
      expect(result).toBe('hello world test')
    })

    test('should not ignore whitespace by default', () => {
      const text = 'hello   world'
      const result = normalizeText(text)
      expect(result).toBe('hello   world')
    })
  })

  describe('tokenize', () => {
    describe('tokenizeByLine', () => {
      test('should return empty array for empty string', () => {
        expect(tokenizeByLine('')).toEqual([])
      })

      test('should tokenize single line', () => {
        const result = tokenizeByLine('hello')
        expect(result).toHaveLength(1)
        expect(result[0].content).toBe('hello')
      })

      test('should tokenize multiple lines', () => {
        const result = tokenizeByLine('line1\nline2\nline3')
        expect(result).toHaveLength(3)
        expect(result[0].content).toBe('line1')
        expect(result[1].content).toBe('line2')
        expect(result[2].content).toBe('line3')
      })

      test('should handle trailing newline', () => {
        const result = tokenizeByLine('line1\nline2\n')
        expect(result).toHaveLength(3)
        expect(result[2].content).toBe('')
      })
    })

    describe('tokenizeByWord', () => {
      test('should return empty array for empty string', () => {
        expect(tokenizeByWord('')).toEqual([])
      })

      test('should tokenize words and whitespace', () => {
        const result = tokenizeByWord('hello world')
        expect(result).toHaveLength(3)
        expect(result[0].content).toBe('hello')
        expect(result[1].content).toBe(' ')
        expect(result[2].content).toBe('world')
      })

      test('should handle multiple whitespace', () => {
        const result = tokenizeByWord('hello   world')
        expect(result).toHaveLength(3)
        expect(result[1].content).toBe('   ')
      })
    })

    describe('tokenize', () => {
      test('should use line tokenizer for line granularity', () => {
        const result = tokenize('line1\nline2', GRANULARITY.LINE)
        expect(result).toHaveLength(2)
      })

      test('should use word tokenizer for word granularity', () => {
        const result = tokenize('hello world', GRANULARITY.WORD)
        expect(result).toHaveLength(3)
      })
    })
  })

  describe('calculateStats', () => {
    test('should calculate stats for empty segments', () => {
      const result = calculateStats([])
      expect(result.hasDifferences).toBe(false)
      expect(result.totalSegments).toBe(0)
      expect(result.deleteCount).toBe(0)
      expect(result.insertCount).toBe(0)
    })

    test('should calculate stats for equal segments only', () => {
      const segments = [
        { operation: OPERATION.EQUAL, content: 'text' },
        { operation: OPERATION.EQUAL, content: 'text2' },
      ]
      const result = calculateStats(segments)
      expect(result.hasDifferences).toBe(false)
      expect(result.totalSegments).toBe(2)
      expect(result.deleteCount).toBe(0)
      expect(result.insertCount).toBe(0)
    })

    test('should calculate stats with differences', () => {
      const segments = [
        { operation: OPERATION.EQUAL, content: 'equal' },
        { operation: OPERATION.DELETE, content: 'deleted' },
        { operation: OPERATION.INSERT, content: 'inserted' },
      ]
      const result = calculateStats(segments)
      expect(result.hasDifferences).toBe(true)
      expect(result.totalSegments).toBe(3)
      expect(result.deleteCount).toBe(1)
      expect(result.insertCount).toBe(1)
    })
  })

  describe('groupSegmentsByOperation', () => {
    test('should group segments by operation', () => {
      const segments = [
        { operation: OPERATION.EQUAL, content: 'equal1' },
        { operation: OPERATION.DELETE, content: 'deleted1' },
        { operation: OPERATION.INSERT, content: 'inserted1' },
        { operation: OPERATION.EQUAL, content: 'equal2' },
        { operation: OPERATION.DELETE, content: 'deleted2' },
      ]

      const groups = groupSegmentsByOperation(segments)

      expect(groups.equal).toHaveLength(2)
      expect(groups.delete).toHaveLength(2)
      expect(groups.insert).toHaveLength(1)

      expect(groups.equal[0].content).toBe('equal1')
      expect(groups.equal[0].index).toBe(0)
      expect(groups.equal[1].content).toBe('equal2')
      expect(groups.equal[1].index).toBe(3)
    })

    test('should handle empty segments', () => {
      const groups = groupSegmentsByOperation([])
      expect(groups.equal).toHaveLength(0)
      expect(groups.delete).toHaveLength(0)
      expect(groups.insert).toHaveLength(0)
    })
  })

  describe('computeDiff', () => {
    describe('line mode', () => {
      test('should return success for identical texts', () => {
        const left = 'line1\nline2\nline3'
        const right = 'line1\nline2\nline3'
        const result = computeDiff(left, right, { granularity: GRANULARITY.LINE })

        expect(result.success).toBe(true)
        expect(result.result.hasDifferences).toBe(false)
        expect(result.result.totalSegments).toBe(1)
        expect(result.result.deleteCount).toBe(0)
        expect(result.result.insertCount).toBe(0)
        expect(result.result.segments[0].operation).toBe(OPERATION.EQUAL)
      })

      test('should detect deleted lines', () => {
        const left = 'line1\nline2\nline3'
        const right = 'line1\nline3'
        const result = computeDiff(left, right, { granularity: GRANULARITY.LINE })

        expect(result.success).toBe(true)
        expect(result.result.hasDifferences).toBe(true)
        expect(result.result.deleteCount).toBe(1)
        expect(result.result.insertCount).toBe(0)

        const hasDelete = result.result.segments.some(s => s.operation === OPERATION.DELETE)
        expect(hasDelete).toBe(true)
      })

      test('should detect inserted lines', () => {
        const left = 'line1\nline3'
        const right = 'line1\nline2\nline3'
        const result = computeDiff(left, right, { granularity: GRANULARITY.LINE })

        expect(result.success).toBe(true)
        expect(result.result.hasDifferences).toBe(true)
        expect(result.result.deleteCount).toBe(0)
        expect(result.result.insertCount).toBe(1)

        const hasInsert = result.result.segments.some(s => s.operation === OPERATION.INSERT)
        expect(hasInsert).toBe(true)
      })

      test('should detect both delete and insert', () => {
        const left = 'line1\nold\nline3'
        const right = 'line1\nnew\nline3'
        const result = computeDiff(left, right, { granularity: GRANULARITY.LINE })

        expect(result.success).toBe(true)
        expect(result.result.hasDifferences).toBe(true)
        expect(result.result.deleteCount).toBe(1)
        expect(result.result.insertCount).toBe(1)
      })

      test('should handle empty texts', () => {
        const result = computeDiff('', '', { granularity: GRANULARITY.LINE })
        expect(result.success).toBe(true)
        expect(result.result.hasDifferences).toBe(false)
      })

      test('should handle one empty text', () => {
        const result1 = computeDiff('line1\nline2', '', { granularity: GRANULARITY.LINE })
        expect(result1.success).toBe(true)
        expect(result1.result.hasDifferences).toBe(true)
        expect(result1.result.deleteCount).toBe(2)
        expect(result1.result.insertCount).toBe(0)

        const result2 = computeDiff('', 'line1\nline2', { granularity: GRANULARITY.LINE })
        expect(result2.success).toBe(true)
        expect(result2.result.hasDifferences).toBe(true)
        expect(result2.result.deleteCount).toBe(0)
        expect(result2.result.insertCount).toBe(2)
      })
    })

    describe('word mode', () => {
      test('should return success for identical texts', () => {
        const left = 'hello world'
        const right = 'hello world'
        const result = computeDiff(left, right, { granularity: GRANULARITY.WORD })

        expect(result.success).toBe(true)
        expect(result.result.hasDifferences).toBe(false)
      })

      test('should detect word changes', () => {
        const left = 'hello old world'
        const right = 'hello new world'
        const result = computeDiff(left, right, { granularity: GRANULARITY.WORD })

        expect(result.success).toBe(true)
        expect(result.result.hasDifferences).toBe(true)
        expect(result.result.deleteCount).toBeGreaterThan(0)
        expect(result.result.insertCount).toBeGreaterThan(0)
      })
    })

    describe('error handling', () => {
      test('should return error for null input', () => {
        const result = computeDiff(null, 'text')
        expect(result.success).toBe(false)
        expect(result.error.code).toBe(ERROR_CODES.NULL_INPUT)
      })

      test('should return error for too many segments', () => {
        const left = Array.from({ length: 100 }, (_, i) => `line${i}`).join('\n')
        const right = Array.from({ length: 100 }, (_, i) => `modified${i}`).join('\n')
        const result = computeDiff(left, right, {
          granularity: GRANULARITY.LINE, maxSegments: 10 })
        expect(result.success).toBe(false)
        expect(result.error.code).toBe(ERROR_CODES.TOO_MANY_SEGMENTS)
      })
    })
  })

  describe('integration tests', () => {
    test('should work with ignoreWhitespace option', () => {
      const left = 'hello   world'
      const right = 'hello world'

      const resultWithIgnore = computeDiff(left, right, {
        granularity: GRANULARITY.WORD, ignoreWhitespace: true })
      expect(resultWithIgnore.success).toBe(true)
      expect(resultWithIgnore.result.hasDifferences).toBe(false)
    })

    test('should work with normalizeNewlines option', () => {
      const left = 'line1\r\nline2'
      const right = 'line1\nline2'

      const result = computeDiff(left, right, {
        granularity: GRANULARITY.LINE, normalizeNewlines: true })
      expect(result.success).toBe(true)
      expect(result.result.hasDifferences).toBe(false)
    })
  })

  describe('edge cases', () => {
    test('should handle very long lines', () => {
      const longLine = 'x'.repeat(1000)
      const result = computeDiff(longLine, longLine, { granularity: GRANULARITY.LINE })
      expect(result.success).toBe(true)
      expect(result.result.hasDifferences).toBe(false)
    })

    test('should handle special characters', () => {
      const left = '<html><script>alert("test")</script></html>'
      const right = '<html><div>test</div></html>'
      const result = computeDiff(left, right, { granularity: GRANULARITY.LINE })
      expect(result.success).toBe(true)
      expect(result.result.hasDifferences).toBe(true)
    })

    test('should handle unicode characters', () => {
      const left = '你好世界'
      const right = '你好世界'
      const result = computeDiff(left, right, { granularity: GRANULARITY.WORD })
      expect(result.success).toBe(true)
      expect(result.result.hasDifferences).toBe(false)
    })

    test('should handle mixed content', () => {
      const left = `function test() {\n  return "hello";\n}`
      const right = `function test() {\n  return "world";\n}`
      const result = computeDiff(left, right, { granularity: GRANULARITY.LINE })
      expect(result.success).toBe(true)
      expect(result.result.hasDifferences).toBe(true)
    })
  })
})
