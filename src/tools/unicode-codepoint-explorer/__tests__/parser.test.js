import { describe, test, expect } from 'vitest'
import {
  isValidCodePoint,
  isInBMP,
  isSurrogate,
  isLeadSurrogate,
  isTrailSurrogate,
  decodeSurrogatePair,
  parseUPlusNotation,
  parseUEscape,
  parseEscapeSequence,
  extractCodePointsFromString,
  parseInputWithEscapes,
  codePointToUtf16Units,
  codePointToUtf8Bytes,
  formatCodePoint,
  bytesToHexString,
  codeUnitsToHexString,
  LEAD_SURROGATE_MIN,
  TRAIL_SURROGATE_MIN,
} from '../logic/parser.js'

describe('isValidCodePoint', () => {
  test('should return true for valid code points', () => {
    expect(isValidCodePoint(0)).toBe(true)
    expect(isValidCodePoint(0x41)).toBe(true)
    expect(isValidCodePoint(0xFFFF)).toBe(true)
    expect(isValidCodePoint(0x10000)).toBe(true)
    expect(isValidCodePoint(0x10FFFF)).toBe(true)
  })

  test('should return false for invalid code points', () => {
    expect(isValidCodePoint(-1)).toBe(false)
    expect(isValidCodePoint(0x110000)).toBe(false)
    expect(isValidCodePoint(NaN)).toBe(false)
    expect(isValidCodePoint(65.5)).toBe(false)
  })
})

describe('isInBMP', () => {
  test('should return true for BMP code points', () => {
    expect(isInBMP(0)).toBe(true)
    expect(isInBMP(0x41)).toBe(true)
    expect(isInBMP(0xFFFF)).toBe(true)
  })

  test('should return false for non-BMP code points', () => {
    expect(isInBMP(0x10000)).toBe(false)
    expect(isInBMP(0x1F600)).toBe(false)
    expect(isInBMP(0x10FFFF)).toBe(false)
  })
})

describe('isSurrogate', () => {
  test('should return true for surrogate code units', () => {
    expect(isSurrogate(0xD800)).toBe(true)
    expect(isSurrogate(0xD83D)).toBe(true)
    expect(isSurrogate(0xDFFF)).toBe(true)
  })

  test('should return false for non-surrogate code units', () => {
    expect(isSurrogate(0x41)).toBe(false)
    expect(isSurrogate(0xC000)).toBe(false)
    expect(isSurrogate(0xE000)).toBe(false)
  })
})

describe('isLeadSurrogate and isTrailSurrogate', () => {
  test('should correctly identify lead and trail surrogates', () => {
    expect(isLeadSurrogate(0xD800)).toBe(true)
    expect(isLeadSurrogate(0xDBFF)).toBe(true)
    expect(isLeadSurrogate(0xDC00)).toBe(false)
    
    expect(isTrailSurrogate(0xDC00)).toBe(true)
    expect(isTrailSurrogate(0xDFFF)).toBe(true)
    expect(isTrailSurrogate(0xD800)).toBe(false)
  })
})

describe('decodeSurrogatePair', () => {
  test('should decode valid surrogate pairs correctly', () => {
    expect(decodeSurrogatePair(0xD83D, 0xDE00)).toBe(0x1F600)
    expect(decodeSurrogatePair(0xD800, 0xDC00)).toBe(0x10000)
    expect(decodeSurrogatePair(0xDBFF, 0xDFFF)).toBe(0x10FFFF)
  })

  test('should return null for invalid surrogate pairs', () => {
    expect(decodeSurrogatePair(0xDC00, 0xD83D)).toBe(null)
    expect(decodeSurrogatePair(0x41, 0xDE00)).toBe(null)
    expect(decodeSurrogatePair(0xD83D, 0x41)).toBe(null)
  })
})

describe('parseUPlusNotation', () => {
  test('should parse U+ notation correctly', () => {
    const result1 = parseUPlusNotation('U+0041', 0)
    expect(result1).not.toBeNull()
    expect(result1.error).toBeUndefined()
    expect(result1.codePoint).toBe(0x41)
    
    const result2 = parseUPlusNotation('U+1F600', 0)
    expect(result2).not.toBeNull()
    expect(result2.codePoint).toBe(0x1F600)
    
    const result3 = parseUPlusNotation('u+4e00', 0)
    expect(result3).not.toBeNull()
    expect(result3.codePoint).toBe(0x4E00)
  })

  test('should return error for out of range code points', () => {
    const result = parseUPlusNotation('U+110000', 0)
    expect(result).not.toBeNull()
    expect(result.error).toBeDefined()
  })

  test('should return null for non-U+ notation', () => {
    expect(parseUPlusNotation('A', 0)).toBeNull()
    expect(parseUPlusNotation('u0041', 0)).toBeNull()
  })
})

describe('parseUEscape', () => {
  test('should parse \\uXXXX escape correctly', () => {
    const result = parseUEscape('\\u0041', 0)
    expect(result).not.toBeNull()
    expect(result.error).toBeUndefined()
    expect(result.codePoint).toBe(0x41)
    expect(result.length).toBe(6)
  })

  test('should parse \\UXXXXXXXX escape correctly', () => {
    const result = parseUEscape('\\U0001F600', 0)
    expect(result).not.toBeNull()
    expect(result.codePoint).toBe(0x1F600)
    expect(result.length).toBe(10)
  })

  test('should return error for invalid hex digits', () => {
    const result = parseUEscape('\\uG041', 0)
    expect(result).not.toBeNull()
    expect(result.error).toBeDefined()
  })

  test('should return null for non-u/U escape', () => {
    expect(parseUEscape('\\n', 0)).toBeNull()
    expect(parseUEscape('\\x41', 0)).toBeNull()
  })
})

describe('parseEscapeSequence', () => {
  test('should parse simple escape sequences', () => {
    expect(parseEscapeSequence('\\n', 0).codePoint).toBe(0x0A)
    expect(parseEscapeSequence('\\t', 0).codePoint).toBe(0x09)
    expect(parseEscapeSequence('\\r', 0).codePoint).toBe(0x0D)
    expect(parseEscapeSequence('\\\\', 0).codePoint).toBe(0x5C)
    expect(parseEscapeSequence('\\"', 0).codePoint).toBe(0x22)
  })

  test('should parse \\xXX escape', () => {
    const result = parseEscapeSequence('\\x41', 0)
    expect(result).not.toBeNull()
    expect(result.codePoint).toBe(0x41)
    expect(result.length).toBe(4)
  })

  test('should parse octal escape', () => {
    const result = parseEscapeSequence('\\101', 0)
    expect(result).not.toBeNull()
    expect(result.codePoint).toBe(0x41)
  })

  test('should return null for non-backslash', () => {
    expect(parseEscapeSequence('n', 0)).toBeNull()
  })
})

describe('extractCodePointsFromString', () => {
  test('should extract ASCII characters', () => {
    const result = extractCodePointsFromString('ABC')
    expect(result.error).toBeUndefined()
    expect(result.codePoints).toEqual([0x41, 0x42, 0x43])
  })

  test('should extract surrogate pairs as single code point', () => {
    const emoji = '😀'
    const result = extractCodePointsFromString(emoji)
    expect(result.error).toBeUndefined()
    expect(result.codePoints).toEqual([0x1F600])
  })

  test('should handle null input', () => {
    const result = extractCodePointsFromString(null)
    expect(result.error).toBeDefined()
  })

  test('should handle empty string', () => {
    const result = extractCodePointsFromString('')
    expect(result.error).toBeUndefined()
    expect(result.codePoints).toEqual([])
  })
})

describe('parseInputWithEscapes', () => {
  test('should parse mixed input with escapes', () => {
    const result = parseInputWithEscapes('A\\u0042U+0043')
    expect(result.error).toBeUndefined()
    expect(result.codePoints).toEqual([0x41, 0x42, 0x43])
  })

  test('should parse U+ notation within text', () => {
    const result = parseInputWithEscapes('Hello U+1F600 World')
    expect(result.error).toBeUndefined()
    expect(result.codePoints).toContain(0x1F600)
  })

  test('should return error for invalid escape', () => {
    const result = parseInputWithEscapes('A\\uG000')
    expect(result.error).toBeDefined()
  })

  test('should handle null input', () => {
    const result = parseInputWithEscapes(null)
    expect(result.error).toBeDefined()
  })
})

describe('codePointToUtf16Units', () => {
  test('should return single unit for BMP', () => {
    expect(codePointToUtf16Units(0x41)).toEqual([0x41])
    expect(codePointToUtf16Units(0xFFFF)).toEqual([0xFFFF])
  })

  test('should return surrogate pair for supplementary', () => {
    const units = codePointToUtf16Units(0x1F600)
    expect(units).toHaveLength(2)
    expect(isLeadSurrogate(units[0])).toBe(true)
    expect(isTrailSurrogate(units[1])).toBe(true)
  })
})

describe('codePointToUtf8Bytes', () => {
  test('should encode ASCII correctly', () => {
    expect(codePointToUtf8Bytes(0x41)).toEqual([0x41])
    expect(codePointToUtf8Bytes(0x7F)).toEqual([0x7F])
  })

  test('should encode 2-byte UTF-8 correctly', () => {
    expect(codePointToUtf8Bytes(0x80)).toEqual([0xC2, 0x80])
    expect(codePointToUtf8Bytes(0x7FF)).toEqual([0xDF, 0xBF])
  })

  test('should encode 3-byte UTF-8 correctly', () => {
    expect(codePointToUtf8Bytes(0x800)).toEqual([0xE0, 0xA0, 0x80])
    expect(codePointToUtf8Bytes(0xFFFF)).toContain(0xEF)
  })

  test('should encode 4-byte UTF-8 correctly', () => {
    expect(codePointToUtf8Bytes(0x10000)).toEqual([0xF0, 0x90, 0x80, 0x80])
    expect(codePointToUtf8Bytes(0x1F600)).toHaveLength(4)
  })
})

describe('formatCodePoint', () => {
  test('should format BMP code points with 4 hex digits', () => {
    expect(formatCodePoint(0x41)).toBe('U+0041')
    expect(formatCodePoint(0xFFFF)).toBe('U+FFFF')
  })

  test('should format supplementary code points with 5 hex digits', () => {
    expect(formatCodePoint(0x10000)).toBe('U+10000')
    expect(formatCodePoint(0x1F600)).toBe('U+1F600')
  })
})

describe('bytesToHexString', () => {
  test('should convert bytes to hex string', () => {
    expect(bytesToHexString([0x41, 0x42])).toBe('41 42')
    expect(bytesToHexString([0x00, 0xFF])).toBe('00 FF')
  })
})

describe('codeUnitsToHexString', () => {
  test('should convert code units to hex string', () => {
    expect(codeUnitsToHexString([0x0041, 0x0042])).toBe('0041 0042')
    expect(codeUnitsToHexString([0xD83D, 0xDE00])).toBe('D83D DE00')
  })
})
