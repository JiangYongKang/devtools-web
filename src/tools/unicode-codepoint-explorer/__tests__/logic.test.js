import { describe, test, expect } from 'vitest'
import {
  normalizeParams,
  findMatches,
  processText,
  parseSingleCodePoint,
} from '../logic/index.js'
import {
  isAscii,
  isPrintableAscii,
  getCategoryDescription,
  getBidiClassDescription,
} from '../logic/statistics.js'
import {
  getBlockName,
  isControlCharacter,
  inferCategoryFromBlock,
  getGlyphPlaceholder,
  getCodePointName,
} from '../logic/unicodeData.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('normalizeParams', () => {
  test('should use default values when not provided', () => {
    const params = normalizeParams({})
    expect(params.sourceText).toBe('')
    expect(params.searchQuery).toBe('')
    expect(params.iterationIndex).toBe(0)
    expect(params.preferHexBytes).toBe(true)
  })

  test('should use provided values', () => {
    const params = normalizeParams({
      sourceText: 'Hello',
      searchQuery: 'test',
      iterationIndex: 5,
      preferHexBytes: false,
    })
    expect(params.sourceText).toBe('Hello')
    expect(params.searchQuery).toBe('test')
    expect(params.iterationIndex).toBe(5)
    expect(params.preferHexBytes).toBe(false)
  })
})

describe('findMatches', () => {
  const mockScalars = [
    { index: 0, codePoint: 0x41, codePointHex: 'U+0041', glyph: 'A', name: 'LATIN CAPITAL LETTER A', block: 'Basic Latin', category: 'Lu' },
    { index: 1, codePoint: 0x42, codePointHex: 'U+0042', glyph: 'B', name: 'LATIN CAPITAL LETTER B', block: 'Basic Latin', category: 'Lu' },
    { index: 2, codePoint: 0x4E00, codePointHex: 'U+4E00', glyph: '一', name: 'CJK Unified Ideograph', block: 'CJK Unified Ideographs', category: 'Lo' },
    { index: 3, codePoint: 0x1F600, codePointHex: 'U+1F600', glyph: '😀', name: 'Emoticons', block: 'Emoticons', category: 'So' },
  ]

  test('should return empty matches for empty query', () => {
    const result = findMatches(mockScalars, '')
    expect(result.matches).toEqual([])
    expect(result.matchCount).toBe(0)
  })

  test('should match by code point hex', () => {
    const result = findMatches(mockScalars, 'U+0041')
    expect(result.matchCount).toBe(1)
    expect(result.matches).toContain(0)
  })

  test('should match by code point decimal', () => {
    const result = findMatches(mockScalars, '65')
    expect(result.matchCount).toBeGreaterThan(0)
    expect(result.matches).toContain(0)
  })

  test('should match by name', () => {
    const result = findMatches(mockScalars, 'LATIN')
    expect(result.matchCount).toBe(2)
    expect(result.matches).toContain(0)
    expect(result.matches).toContain(1)
  })

  test('should match by glyph', () => {
    const result = findMatches(mockScalars, 'A')
    expect(result.matchCount).toBe(1)
    expect(result.matches).toContain(0)
  })

  test('should match by block', () => {
    const result = findMatches(mockScalars, 'Emoticons')
    expect(result.matchCount).toBe(1)
    expect(result.matches).toContain(3)
  })

  test('should match by category', () => {
    const result = findMatches(mockScalars, 'Lu')
    expect(result.matchCount).toBe(2)
  })
})

describe('processText', () => {
  test('should handle null input', () => {
    const result = processText({ sourceText: null })
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  test('should handle empty string', () => {
    const result = processText({ sourceText: '' })
    expect(result.errorCode).toBeNull()
    expect(result.scalars).toEqual([])
    expect(result.statistics).toBeNull()
  })

  test('should process simple text', () => {
    const result = processText({ sourceText: 'AB' })
    expect(result.errorCode).toBeNull()
    expect(result.scalars).toHaveLength(2)
    expect(result.scalars[0].codePoint).toBe(0x41)
    expect(result.scalars[1].codePoint).toBe(0x42)
    expect(result.statistics).toBeDefined()
    expect(result.statistics.totalCount).toBe(2)
  })

  test('should parse escape sequences', () => {
    const result = processText({ sourceText: '\\u0041' })
    expect(result.errorCode).toBeNull()
    expect(result.scalars).toHaveLength(1)
    expect(result.scalars[0].codePoint).toBe(0x41)
  })

  test('should parse U+ notation', () => {
    const result = processText({ sourceText: 'U+1F600' })
    expect(result.errorCode).toBeNull()
    expect(result.scalars).toHaveLength(1)
    expect(result.scalars[0].codePoint).toBe(0x1F600)
  })

  test('should handle mixed content', () => {
    const result = processText({ sourceText: 'A\\u0042U+0043' })
    expect(result.errorCode).toBeNull()
    expect(result.scalars).toHaveLength(3)
    expect(result.scalars.map(s => s.codePoint)).toEqual([0x41, 0x42, 0x43])
  })

  test('should handle emoji (surrogate pairs)', () => {
    const emoji = '😀'
    const result = processText({ sourceText: emoji })
    expect(result.errorCode).toBeNull()
    expect(result.scalars).toHaveLength(1)
    expect(result.scalars[0].codePoint).toBe(0x1F600)
    expect(result.scalars[0].isInBMP).toBe(false)
  })

  test('should return error for invalid escape', () => {
    const result = processText({ sourceText: 'A\\uG000' })
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_ESCAPE)
  })

  test('should include matches when search query provided', () => {
    const result = processText({
      sourceText: 'ABC',
      searchQuery: 'A',
    })
    expect(result.errorCode).toBeNull()
    expect(result.matchCount).toBe(1)
    expect(result.matches).toEqual([0])
  })

  test('should calculate ASCII statistics', () => {
    const result = processText({ sourceText: 'ABC你好' })
    expect(result.errorCode).toBeNull()
    expect(result.statistics).toBeDefined()
    expect(result.statistics.asciiCount).toBe(3)
    expect(result.statistics.nonAsciiCount).toBe(2)
    expect(result.statistics.bmpCount).toBe(5)
  })

  test('should identify BMP vs supplementary characters', () => {
    const result = processText({ sourceText: 'A😀B' })
    expect(result.errorCode).toBeNull()
    expect(result.statistics.bmpCount).toBe(2)
    expect(result.statistics.supplementaryCount).toBe(1)
  })
})

describe('parseSingleCodePoint', () => {
  test('should parse U+ notation', () => {
    const result = parseSingleCodePoint('U+0041')
    expect(result.error).toBeUndefined()
    expect(result.codePoint).toBe(0x41)
  })

  test('should parse 0x notation', () => {
    const result = parseSingleCodePoint('0x41')
    expect(result.error).toBeUndefined()
    expect(result.codePoint).toBe(0x41)
  })

  test('should parse decimal number', () => {
    const result = parseSingleCodePoint('65')
    expect(result.error).toBeUndefined()
    expect(result.codePoint).toBe(65)
  })

  test('should parse character', () => {
    const result = parseSingleCodePoint('A')
    expect(result.error).toBeUndefined()
    expect(result.codePoint).toBe(0x41)
  })

  test('should handle null input', () => {
    const result = parseSingleCodePoint(null)
    expect(result.error).toBeDefined()
  })

  test('should return error for out of range code point', () => {
    const result = parseSingleCodePoint('U+110000')
    expect(result.error).toBeDefined()
    expect(result.error.errorCode).toBe(ERROR_CODES.OUT_OF_RANGE_CODE_POINT)
  })
})

describe('statistics utility functions', () => {
  test('isAscii', () => {
    expect(isAscii(0x00)).toBe(true)
    expect(isAscii(0x41)).toBe(true)
    expect(isAscii(0x7F)).toBe(true)
    expect(isAscii(0x80)).toBe(false)
    expect(isAscii(0x4E00)).toBe(false)
  })

  test('isPrintableAscii', () => {
    expect(isPrintableAscii(0x20)).toBe(true)
    expect(isPrintableAscii(0x41)).toBe(true)
    expect(isPrintableAscii(0x7E)).toBe(true)
    expect(isPrintableAscii(0x00)).toBe(false)
    expect(isPrintableAscii(0x7F)).toBe(false)
  })

  test('getCategoryDescription', () => {
    expect(getCategoryDescription('Lu')).toBe('Letter, Uppercase')
    expect(getCategoryDescription('Ll')).toBe('Letter, Lowercase')
    expect(getCategoryDescription('So')).toBe('Symbol, Other')
    expect(getCategoryDescription('Unknown')).toBe('Unknown')
    expect(getCategoryDescription(null)).toBe('Unknown')
  })

  test('getBidiClassDescription', () => {
    expect(getBidiClassDescription('L')).toBe('Left-to-Right')
    expect(getBidiClassDescription('R')).toBe('Right-to-Left')
    expect(getBidiClassDescription('AL')).toBe('Arabic Letter')
    expect(getBidiClassDescription('Unknown')).toBe('Unknown')
  })
})

describe('unicodeData utility functions', () => {
  test('getBlockName', () => {
    expect(getBlockName(0x41)).toBe('Basic Latin')
    expect(getBlockName(0x4E00)).toBe('CJK Unified Ideographs')
    expect(getBlockName(0x1F600)).toBe('Emoticons')
  })

  test('isControlCharacter', () => {
    expect(isControlCharacter(0x00)).toBe(true)
    expect(isControlCharacter(0x1F)).toBe(true)
    expect(isControlCharacter(0x7F)).toBe(true)
    expect(isControlCharacter(0x20)).toBe(false)
    expect(isControlCharacter(0x41)).toBe(false)
  })

  test('inferCategoryFromBlock', () => {
    expect(inferCategoryFromBlock('Basic Latin', 0x00)).toBe('Cc')
    expect(inferCategoryFromBlock('High Surrogates', 0xD800)).toBe('Cs')
    expect(inferCategoryFromBlock('Private Use Area', 0xE000)).toBe('Co')
  })

  test('getGlyphPlaceholder', () => {
    expect(getGlyphPlaceholder(0x41)).toBe('A')
    expect(getGlyphPlaceholder(0x00)).toBe('NUL')
    expect(getGlyphPlaceholder(0x0A)).toBe('LF')
  })

  test('getCodePointName', () => {
    expect(getCodePointName(0x41, 'Basic Latin')).toBe('Basic Latin')
    expect(getCodePointName(0x4E00, 'CJK Unified Ideographs')).toBe('CJK Unified Ideograph')
    expect(getCodePointName(0x1F600, 'Emoticons')).toBe('Emoticons')
    expect(getCodePointName(0xD800, 'High Surrogates')).toBe('High Surrogate')
    expect(getCodePointName(0xAC00, 'Hangul Syllables')).toBe('Hangul Syllable')
  })
})
