import { describe, test, expect } from 'vitest'
import {
  parseLines,
  sortLines,
  processInput,
  processRangeCheck,
  generateTSV,
  generateJSON,
  generateDiff,
  parseVersion,
} from '../logic/index.js'
import {
  ERROR_CODES,
  MAX_LINE_COUNT,
  MAX_LINE_LENGTH,
  SORT_ORDER,
} from '../logic/index.js'

describe('parseLines', () => {
  test('should parse newline-delimited input', () => {
    const input = '1.0.0\n2.0.0\n3.0.0'
    const result = parseLines(input)
    expect(result.success).toBe(true)
    expect(result.lines.length).toBe(3)
    expect(result.lines.every((l) => l.parsed.valid)).toBe(true)
  })

  test('should parse comma-delimited input', () => {
    const input = '1.0.0, 2.0.0, 3.0.0'
    const result = parseLines(input, { delimiter: 'comma' })
    expect(result.success).toBe(true)
    expect(result.lines.length).toBe(3)
  })

  test('should parse semicolon-delimited input', () => {
    const input = '1.0.0;2.0.0;3.0.0'
    const result = parseLines(input, { delimiter: 'semicolon' })
    expect(result.success).toBe(true)
    expect(result.lines.length).toBe(3)
  })

  test('should filter empty lines by default', () => {
    const input = '1.0.0\n\n2.0.0\n\n3.0.0'
    const result = parseLines(input)
    expect(result.success).toBe(true)
    expect(result.lines.length).toBe(3)
  })

  test('should filter comment lines by default', () => {
    const input = '# this is a comment\n1.0.0\n# another comment\n2.0.0'
    const result = parseLines(input)
    expect(result.success).toBe(true)
    expect(result.lines.length).toBe(2)
  })

  test('should keep comment lines when filterComments is false', () => {
    const input = '# comment\n1.0.0'
    const result = parseLines(input, { filterComments: false })
    expect(result.success).toBe(true)
    expect(result.lines.length).toBe(2)
    expect(result.lines[0].parsed.valid).toBe(false)
  })

  test('should handle v prefix', () => {
    const input = 'v1.0.0\nV2.0.0\n3.0.0'
    const result = parseLines(input)
    expect(result.success).toBe(true)
    expect(result.lines.length).toBe(3)
    expect(result.lines.every((l) => l.parsed.valid)).toBe(true)
  })

  test('should reject too many lines', () => {
    const lines = Array(MAX_LINE_COUNT + 10).fill('1.0.0')
    const input = lines.join('\n')
    const result = parseLines(input)
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.TOO_MANY_LINES)
  })

  test('should reject line that is too long', () => {
    const longLine = '1.0.0-' + 'x'.repeat(MAX_LINE_LENGTH)
    const input = `1.0.0\n${longLine}\n2.0.0`
    const result = parseLines(input)
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.LINE_TOO_LONG)
  })

  test('should track insert order', () => {
    const input = '3.0.0\n1.0.0\n2.0.0'
    const result = parseLines(input)
    expect(result.lines[0].insertOrder).toBe(0)
    expect(result.lines[1].insertOrder).toBe(1)
    expect(result.lines[2].insertOrder).toBe(2)
  })
})

describe('sortLines', () => {
  test('should sort versions ascending by default', () => {
    const parseResult = parseLines('3.0.0\n1.0.0\n2.0.0')
    const sorted = sortLines(parseResult.lines)
    expect(sorted[0].parsed.major).toBe(1)
    expect(sorted[1].parsed.major).toBe(2)
    expect(sorted[2].parsed.major).toBe(3)
  })

  test('should sort descending when requested', () => {
    const parseResult = parseLines('3.0.0\n1.0.0\n2.0.0')
    const sorted = sortLines(parseResult.lines, { order: SORT_ORDER.DESC })
    expect(sorted[0].parsed.major).toBe(3)
    expect(sorted[1].parsed.major).toBe(2)
    expect(sorted[2].parsed.major).toBe(1)
  })

  test('should use insertion order as tiebreaker by default', () => {
    const parseResult = parseLines('a\n1.0.0\nb\n2.0.0\nc')
    const sorted = sortLines(parseResult.lines)
    const invalidLines = sorted.filter((l) => !l.parsed.valid)
    expect(invalidLines.length).toBe(3)
    expect(invalidLines.map((l) => l.raw)).toEqual(['a', 'b', 'c'])
  })

  test('should use lexicographic tiebreaker when requested', () => {
    const parseResult = parseLines('c\nb\na')
    const sorted = sortLines(parseResult.lines, { tiebreaker: 'lexicographic' })
    expect(sorted[0].raw).toBe('a')
    expect(sorted[1].raw).toBe('b')
    expect(sorted[2].raw).toBe('c')
  })

  test('should deduplicate versions', () => {
    const parseResult = parseLines('1.0.0\n1.0.0\n2.0.0\n1.0.0')
    const sorted = sortLines(parseResult.lines, { deduplicate: true })
    expect(sorted.length).toBe(2)
    expect(sorted[0].parsed.normalized).toBe('1.0.0')
    expect(sorted[1].parsed.normalized).toBe('2.0.0')
  })

  test('should not deduplicate invalid lines', () => {
    const parseResult = parseLines('invalid\ninvalid\n1.0.0')
    const sorted = sortLines(parseResult.lines, { deduplicate: true })
    const invalid = sorted.filter((l) => !l.parsed.valid)
    expect(invalid.length).toBe(2)
  })

  test('should include build metadata in comparison when requested', () => {
    const parseResult = parseLines('1.0.0+build2\n1.0.0+build1')
    const sorted = sortLines(parseResult.lines, { includeBuild: true })
    expect(sorted[0].parsed.build).toBe('build1')
    expect(sorted[1].parsed.build).toBe('build2')
  })

  test('should place valid versions before invalid versions', () => {
    const parseResult = parseLines('invalid\n1.0.0\nalso-invalid\n2.0.0')
    const sorted = sortLines(parseResult.lines)
    expect(sorted[0].parsed.valid).toBe(true)
    expect(sorted[1].parsed.valid).toBe(true)
    expect(sorted[2].parsed.valid).toBe(false)
    expect(sorted[3].parsed.valid).toBe(false)
  })

  test('should maintain stable sort for equal versions', () => {
    const input = [
      { insertOrder: 0, raw: 'a', parsed: parseVersion('1.0.0') },
      { insertOrder: 1, raw: 'b', parsed: parseVersion('1.0.0') },
      { insertOrder: 2, raw: 'c', parsed: parseVersion('1.0.0') },
    ]
    const sorted = sortLines(input)
    expect(sorted[0].insertOrder).toBe(0)
    expect(sorted[1].insertOrder).toBe(1)
    expect(sorted[2].insertOrder).toBe(2)
  })
})

describe('processInput', () => {
  test('should return success for valid input', () => {
    const result = processInput({ input: '1.0.0\n2.0.0' })
    expect(result.success).toBe(true)
    expect(result.result.stats.total).toBe(2)
    expect(result.result.stats.valid).toBe(2)
    expect(result.result.stats.invalid).toBe(0)
  })

  test('should report mixed invalid lines', () => {
    const result = processInput({ input: '1.0.0\ninvalid\n2.0.0' })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.MIXED_INVALID_LINES)
    expect(result.result.stats.invalid).toBe(1)
  })

  test('should return success when validateOnly is true even with invalid lines', () => {
    const result = processInput({
      input: '1.0.0\ninvalid\n2.0.0',
      validateOnly: true,
    })
    expect(result.success).toBe(true)
    expect(result.result.stats.invalid).toBe(1)
  })

  test('should handle empty input gracefully', () => {
    const result = processInput({ input: '' })
    expect(result.success).toBe(true)
    expect(result.result.stats.total).toBe(0)
  })

  test('should compute original and sorted positions', () => {
    const result = processInput({ input: '3.0.0\n1.0.0\n2.0.0' })
    expect(result.result.original[0].originalPosition).toBe(0)
    expect(result.result.sorted[0].sortedPosition).toBe(0)
    expect(result.result.sorted[0].originalPosition).toBe(1)
  })

  test('should track unique count', () => {
    const result = processInput({ input: '1.0.0\n1.0.0\n2.0.0', deduplicate: true })
    expect(result.result.stats.unique).toBe(2)
  })

  test('should mark large list', () => {
    const manyVersions = Array(1000)
      .fill(0)
      .map((_, i) => `1.0.${i}`)
      .join('\n')
    const result = processInput({ input: manyVersions })
    expect(result.result.isLargeList).toBe(true)
  })
})

describe('processRangeCheck', () => {
  test('should check which versions satisfy range', () => {
    const parseResult = parseLines('1.0.0\n1.2.3\n1.5.0\n2.0.0')
    const result = processRangeCheck(parseResult.lines, '^1.0.0')
    expect(result.success).toBe(true)
    expect(result.result.stats.satisfied).toBe(3)
    expect(result.result.stats.notSatisfied).toBe(1)
  })

  test('should find max in range', () => {
    const parseResult = parseLines('1.0.0\n1.2.3\n1.5.0\n2.0.0')
    const result = processRangeCheck(parseResult.lines, '^1.0.0')
    expect(result.result.maxInRange).not.toBeNull()
    expect(result.result.maxInRange.normalized).toBe('1.5.0')
  })

  test('should find min in range', () => {
    const parseResult = parseLines('1.0.0\n1.2.3\n1.5.0\n2.0.0')
    const result = processRangeCheck(parseResult.lines, '^1.0.0')
    expect(result.result.minInRange).not.toBeNull()
    expect(result.result.minInRange.normalized).toBe('1.0.0')
  })

  test('should group by major version', () => {
    const parseResult = parseLines('1.0.0\n1.1.0\n2.0.0\n2.1.0\n3.0.0')
    const result = processRangeCheck(parseResult.lines, '>=0.0.0')
    expect(result.result.majorGroups.length).toBe(3)
    expect(result.result.majorGroups[0].key).toBe('1.x.x')
    expect(result.result.majorGroups[0].lines.length).toBe(2)
  })

  test('should report invalid range error', () => {
    const parseResult = parseLines('1.0.0')
    const result = processRangeCheck(parseResult.lines, '^invalid')
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_RANGE)
  })
})

describe('generateTSV', () => {
  test('should generate TSV output', () => {
    const parseResult = parseLines('1.0.0\ninvalid\n2.0.0-beta.1+build')
    const tsv = generateTSV(parseResult.lines)
    expect(tsv).toContain('序号')
    expect(tsv).toContain('原始输入')
    expect(tsv).toContain('Major')
    expect(tsv).toContain('1.0.0')
    expect(tsv).toContain('2.0.0-beta.1+build')
  })

  test('should return headers only for empty lines', () => {
    const tsv = generateTSV([])
    expect(tsv).toContain('序号')
  })
})

describe('generateJSON', () => {
  test('should generate valid JSON', () => {
    const parseResult = parseLines('1.0.0\n2.0.0')
    const json = generateJSON(parseResult.lines)
    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(2)
    expect(parsed[0].valid).toBe(true)
  })

  test('should include errorCode for invalid versions', () => {
    const parseResult = parseLines('invalid')
    const json = generateJSON(parseResult.lines)
    const parsed = JSON.parse(json)
    expect(parsed[0].valid).toBe(false)
    expect(parsed[0].errorCode).toBeDefined()
  })
})

describe('generateDiff', () => {
  test('should detect position changes', () => {
    const original = [
      { insertOrder: 0, raw: 'C' },
      { insertOrder: 1, raw: 'A' },
      { insertOrder: 2, raw: 'B' },
    ]
    const sorted = [
      { insertOrder: 1, raw: 'A' },
      { insertOrder: 2, raw: 'B' },
      { insertOrder: 0, raw: 'C' },
    ]
    const diffs = generateDiff(original, sorted)
    expect(diffs[0].direction).toBe('up')
    expect(diffs[1].direction).toBe('up')
    expect(diffs[2].direction).toBe('down')
  })

  test('should detect no changes', () => {
    const original = [
      { insertOrder: 0, raw: 'A' },
      { insertOrder: 1, raw: 'B' },
    ]
    const sorted = [
      { insertOrder: 0, raw: 'A' },
      { insertOrder: 1, raw: 'B' },
    ]
    const diffs = generateDiff(original, sorted)
    expect(diffs.every((d) => d.direction === 'none')).toBe(true)
  })
})
