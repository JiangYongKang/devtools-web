import { describe, test, expect } from 'vitest'
import {
  utf8ByteLength,
  hasBOM,
  stripBOM,
  countCodePoints,
  countUtf16Units,
  countGraphemes,
  countLines,
  countTokens,
  normalizeText,
  utf16RangeToColumnRow,
  BOM,
} from '../logic/metrics.js'
import { TOKENIZATION_PROFILES, NORMALIZE_FLAGS } from '../logic/constants.js'

describe('metrics.js', () => {
  describe('utf8ByteLength', () => {
    test('should count 1 byte for ASCII', () => {
      expect(utf8ByteLength('Hello')).toBe(5)
      expect(utf8ByteLength('')).toBe(0)
    })

    test('should count 3 bytes for CJK characters', () => {
      expect(utf8ByteLength('你好')).toBe(6)
      expect(utf8ByteLength('世界')).toBe(6)
    })

    test('should count 4 bytes for emoji', () => {
      expect(utf8ByteLength('🌍')).toBe(4)
      expect(utf8ByteLength('👋')).toBe(4)
    })

    test('should handle mixed content', () => {
      expect(utf8ByteLength('Hello 世界 🌍')).toBe(5 + 1 + 6 + 1 + 4)
    })

    test('should handle surrogate pairs', () => {
      const twoEmoji = '😀😃'
      expect(utf8ByteLength(twoEmoji)).toBe(8)
    })
  })

  describe('BOM detection', () => {
    test('should detect BOM at start', () => {
      expect(hasBOM(BOM + 'Hello')).toBe(true)
      expect(hasBOM('Hello')).toBe(false)
      expect(hasBOM('')).toBe(false)
    })

    test('should strip BOM from start', () => {
      expect(stripBOM(BOM + 'Hello')).toBe('Hello')
      expect(stripBOM('Hello')).toBe('Hello')
      expect(stripBOM(BOM + BOM + 'Hello')).toBe(BOM + 'Hello')
    })
  })

  describe('countCodePoints', () => {
    test('should handle basic strings', () => {
      expect(countCodePoints('')).toBe(0)
      expect(countCodePoints('Hello')).toBe(5)
    })

    test('should correctly handle surrogate pairs', () => {
      expect(countCodePoints('😀')).toBe(1)
      expect(countCodePoints('A😀B')).toBe(3)
      expect(countCodePoints('😀😃')).toBe(2)
    })

    test('should handle CJK characters', () => {
      expect(countCodePoints('你好世界')).toBe(4)
    })
  })

  describe('countUtf16Units', () => {
    test('should match string.length', () => {
      expect(countUtf16Units('')).toBe(''.length)
      expect(countUtf16Units('Hello')).toBe('Hello'.length)
      expect(countUtf16Units('你好世界')).toBe('你好世界'.length)
    })

    test('should count surrogate pairs as 2 units', () => {
      const emoji = '😀'
      expect(countUtf16Units(emoji)).toBe(emoji.length)
      expect(emoji.length).toBe(2)
    })
  })

  describe('countGraphemes', () => {
    test('should count basic characters', () => {
      expect(countGraphemes('')).toBe(0)
      expect(countGraphemes('Hello')).toBe(5)
      expect(countGraphemes('你好')).toBe(2)
    })

    test('should count single emoji as 1 grapheme', () => {
      expect(countGraphemes('😀')).toBe(1)
      expect(countGraphemes('🌍')).toBe(1)
    })

    test('should handle zero-width joiner sequences', () => {
      const familyEmoji = '👨‍👩‍👧‍👦'
      const result = countGraphemes(familyEmoji)
      expect(result >= 1).toBe(true)
    })
  })

  describe('countLines', () => {
    test('should handle empty string', () => {
      expect(countLines('')).toEqual({ lineCount: 0, nonEmptyLines: 0 })
    })

    test('should handle single line without newline', () => {
      expect(countLines('Hello')).toEqual({ lineCount: 1, nonEmptyLines: 1 })
    })

    test('should count LF newlines in auto mode', () => {
      const result = countLines('Hello\nWorld\n!')
      expect(result.lineCount).toBe(3)
      expect(result.nonEmptyLines).toBe(3)
    })

    test('should count CRLF newlines in auto mode', () => {
      const result = countLines('Hello\r\nWorld\r\n!')
      expect(result.lineCount).toBe(3)
    })

    test('should count empty lines', () => {
      const result = countLines('Hello\n\nWorld')
      expect(result.lineCount).toBe(3)
      expect(result.nonEmptyLines).toBe(2)
    })

    test('should handle whitespace-only lines as empty in nonEmptyLines', () => {
      const result = countLines('Hello\n   \t  \nWorld')
      expect(result.lineCount).toBe(3)
      expect(result.nonEmptyLines).toBe(2)
    })

    test('should correctly count with mixed CRLF and LF in auto mode', () => {
      const result = countLines('A\r\nB\nC')
      expect(result.lineCount).toBe(3)
    })
  })

  describe('countTokens', () => {
    describe('WHITESPACE profile', () => {
      test('should split by any whitespace', () => {
        expect(countTokens('Hello World', TOKENIZATION_PROFILES.WHITESPACE)).toBe(2)
        expect(countTokens('  Hello   World  ', TOKENIZATION_PROFILES.WHITESPACE)).toBe(2)
        expect(countTokens('Hello\tWorld\nFoo', TOKENIZATION_PROFILES.WHITESPACE)).toBe(3)
      })

      test('should return 0 for empty or whitespace only', () => {
        expect(countTokens('', TOKENIZATION_PROFILES.WHITESPACE)).toBe(0)
        expect(countTokens('   \t  \n  ', TOKENIZATION_PROFILES.WHITESPACE)).toBe(0)
      })
    })

    describe('ENGLISH profile', () => {
      test('should match alphanumeric words', () => {
        expect(countTokens('Hello, World!', TOKENIZATION_PROFILES.ENGLISH)).toBe(2)
        expect(countTokens('hello-world_test', TOKENIZATION_PROFILES.ENGLISH)).toBe(3)
        expect(countTokens('代码 123 code', TOKENIZATION_PROFILES.ENGLISH)).toBe(2)
      })
    })

    describe('CHINESE profile', () => {
      test('should count each Chinese char as 1 token', () => {
        expect(countTokens('你好世界', TOKENIZATION_PROFILES.CHINESE)).toBe(4)
        expect(countTokens('你好 hello 世界', TOKENIZATION_PROFILES.CHINESE)).toBe(4 + 1)
      })
    })

    describe('MIXED profile', () => {
      test('should count Chinese chars separately and other as tokens', () => {
        expect(countTokens('你好 hello 世界', TOKENIZATION_PROFILES.MIXED)).toBe(2 + 1 + 2)
      })
    })

    describe('NONE profile', () => {
      test('should always return 0', () => {
        expect(countTokens('Hello World', TOKENIZATION_PROFILES.NONE)).toBe(0)
        expect(countTokens('', TOKENIZATION_PROFILES.NONE)).toBe(0)
      })
    })
  })

  describe('normalizeText', () => {
    test('should apply TRIM flag', () => {
      expect(normalizeText('  Hello  ', { [NORMALIZE_FLAGS.TRIM]: true })).toBe('Hello')
    })

    test('should apply TO_LOWER flag', () => {
      expect(normalizeText('HELLO World', { [NORMALIZE_FLAGS.TO_LOWER]: true })).toBe('hello world')
    })

    test('should apply TO_UPPER flag', () => {
      expect(normalizeText('hello World', { [NORMALIZE_FLAGS.TO_UPPER]: true })).toBe('HELLO WORLD')
    })

    test('should apply COLLAPSE_SPACES flag', () => {
      expect(normalizeText('Hello   World  Foo', { [NORMALIZE_FLAGS.COLLAPSE_SPACES]: true })).toBe('Hello World Foo')
    })

    test('should apply STRIP_CONTROL flag', () => {
      expect(normalizeText('Hello\x00World\x01', { [NORMALIZE_FLAGS.STRIP_CONTROL]: true })).toBe('HelloWorld')
    })

    test('should apply multiple flags', () => {
      const flags = {
        [NORMALIZE_FLAGS.TRIM]: true,
        [NORMALIZE_FLAGS.TO_LOWER]: true,
        [NORMALIZE_FLAGS.COLLAPSE_SPACES]: true,
      }
      expect(normalizeText('  HELLO   WORLD  ', flags)).toBe('hello world')
    })

    test('should return original string with no flags', () => {
      expect(normalizeText('Hello World', {})).toBe('Hello World')
    })
  })

  describe('utf16RangeToColumnRow', () => {
    test('should handle empty string', () => {
      const result = utf16RangeToColumnRow('', 0, 0)
      expect(result.start.row).toBe(1)
      expect(result.start.column).toBe(1)
    })

    test('should calculate position for single line', () => {
      const result = utf16RangeToColumnRow('Hello World', 0, 5)
      expect(result.start.row).toBe(1)
      expect(result.start.column).toBe(1)
      expect(result.end.row).toBe(1)
      expect(result.end.column).toBe(6)
    })

    test('should calculate position with LF newlines', () => {
      const result = utf16RangeToColumnRow('Hello\nWorld\n!', 6, 11)
      expect(result.start.row).toBe(2)
      expect(result.start.column).toBe(1)
      expect(result.end.row).toBe(2)
      expect(result.end.column).toBe(6)
    })

    test('should calculate position with CRLF newlines', () => {
      const result = utf16RangeToColumnRow('Hello\r\nWorld', 0, 7)
      expect(result.start.row).toBe(1)
      expect(result.end.row).toBe(2)
      expect(result.end.column).toBe(1)
    })

    test('should handle multi-line selection spanning rows', () => {
      const result = utf16RangeToColumnRow('Line1\nLine2\nLine3', 3, 12)
      expect(result.start.row).toBe(1)
      expect(result.end.row).toBe(3)
    })
  })
})
