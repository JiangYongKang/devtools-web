import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateUUID,
  generateNILUUID,
  normalizeUUID,
  isValidUUID,
  parseUUID,
  formatUUID,
} from '../uuidUtils.js'

describe('uuidUtils', () => {
  const VALID_STANDARD = '550e8400-e29b-41d4-a716-446655440000'
  const VALID_NO_HYPHENS = '550e8400e29b41d4a716446655440000'
  const VALID_UPPER = '550E8400-E29B-41D4-A716-446655440000'
  const VALID_UPPER_NO_HYPHENS = '550E8400E29B41D4A716446655440000'
  const VALID_BRACED = '{550e8400-e29b-41d4-a716-446655440000}'
  const VALID_URN = 'urn:uuid:550e8400-e29b-41d4-a716-446655440000'
  const NIL_UUID = '00000000-0000-0000-0000-000000000000'

  describe('generateNILUUID', () => {
    test('should return all-zero UUID', () => {
      const result = generateNILUUID()
      expect(result).toBe(NIL_UUID)
    })

    test('should return same value on multiple calls', () => {
      const result1 = generateNILUUID()
      const result2 = generateNILUUID()
      expect(result1).toBe(result2)
    })
  })

  describe('generateUUID', () => {
    test('should return a string of correct length (36 chars with hyphens)', () => {
      const result = generateUUID()
      expect(typeof result).toBe('string')
      expect(result.length).toBe(36)
    })

    test('should match UUID V4 format', () => {
      const result = generateUUID()
      const v4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(result).toMatch(v4Pattern)
    })

    test('should generate different UUIDs on successive calls', () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()
      expect(uuid1).not.toBe(uuid2)
    })

    test('should have version digit 4 at position 14', () => {
      const result = generateUUID()
      expect(result[14]).toBe('4')
    })

    test('should have variant digit 8, 9, a, or b at position 19', () => {
      const result = generateUUID()
      const variantChar = result[19]
      expect(['8', '9', 'a', 'b']).toContain(variantChar.toLowerCase())
    })

    test('should have hyphens at correct positions', () => {
      const result = generateUUID()
      expect(result[8]).toBe('-')
      expect(result[13]).toBe('-')
      expect(result[18]).toBe('-')
      expect(result[23]).toBe('-')
    })

    describe('fallback behavior (Math.random)', () => {
      let originalRandomUUID

      beforeEach(() => {
        originalRandomUUID = global.crypto?.randomUUID
        if (global.crypto) {
          delete global.crypto.randomUUID
        }
      })

      afterEach(() => {
        if (originalRandomUUID !== undefined) {
          if (global.crypto) {
            global.crypto.randomUUID = originalRandomUUID
          }
        }
      })

      test('should work when crypto.randomUUID is not available', () => {
        const result = generateUUID()
        expect(typeof result).toBe('string')
        expect(result.length).toBe(36)
        const v4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        expect(result).toMatch(v4Pattern)
      })
    })
  })

  describe('normalizeUUID', () => {
    test('should return null for null input', () => {
      expect(normalizeUUID(null)).toBeNull()
    })

    test('should return null for undefined input', () => {
      expect(normalizeUUID(undefined)).toBeNull()
    })

    test('should return null for non-string input', () => {
      expect(normalizeUUID(123)).toBeNull()
      expect(normalizeUUID({})).toBeNull()
      expect(normalizeUUID([])).toBeNull()
    })

    test('should return null for empty string', () => {
      expect(normalizeUUID('')).toBeNull()
    })

    test('should normalize standard lowercase UUID', () => {
      expect(normalizeUUID(VALID_STANDARD)).toBe(VALID_STANDARD)
    })

    test('should normalize uppercase UUID to lowercase', () => {
      expect(normalizeUUID(VALID_UPPER)).toBe(VALID_STANDARD)
    })

    test('should normalize mixed case UUID', () => {
      expect(normalizeUUID('550E8400-e29b-41D4-a716-446655440000')).toBe(VALID_STANDARD)
    })

    test('should normalize UUID without hyphens', () => {
      expect(normalizeUUID(VALID_NO_HYPHENS)).toBe(VALID_STANDARD)
    })

    test('should normalize uppercase UUID without hyphens', () => {
      expect(normalizeUUID(VALID_UPPER_NO_HYPHENS)).toBe(VALID_STANDARD)
    })

    test('should normalize UUID with braces', () => {
      expect(normalizeUUID(VALID_BRACED)).toBe(VALID_STANDARD)
    })

    test('should normalize UUID with URN prefix', () => {
      expect(normalizeUUID(VALID_URN)).toBe(VALID_STANDARD)
    })

    test('should trim leading and trailing whitespace', () => {
      expect(normalizeUUID('  ' + VALID_STANDARD + '  ')).toBe(VALID_STANDARD)
      expect(normalizeUUID('\t\n' + VALID_STANDARD + '\n\t')).toBe(VALID_STANDARD)
    })

    test('should return null for invalid length (31 chars)', () => {
      expect(normalizeUUID('550e8400-e29b-41d4-a716-44665544000')).toBeNull()
    })

    test('should return null for invalid length (33 chars)', () => {
      expect(normalizeUUID('550e8400-e29b-41d4-a716-4466554400000')).toBeNull()
    })

    test('should return null for non-hex characters', () => {
      expect(normalizeUUID('550e8400-e29b-41d4-a716-44665544ZZZZ')).toBeNull()
      expect(normalizeUUID('G50e8400-e29b-41d4-a716-446655440000')).toBeNull()
    })

    test('should return null for partial UUID', () => {
      expect(normalizeUUID('550e8400-e29b-41d4')).toBeNull()
    })

    test('should normalize NIL UUID', () => {
      expect(normalizeUUID(NIL_UUID)).toBe(NIL_UUID)
    })

    test('should normalize NIL UUID without hyphens', () => {
      expect(normalizeUUID('00000000000000000000000000000000')).toBe(NIL_UUID)
    })
  })

  describe('isValidUUID', () => {
    test('should return true for valid standard UUID', () => {
      expect(isValidUUID(VALID_STANDARD)).toBe(true)
    })

    test('should return true for valid UUID without hyphens', () => {
      expect(isValidUUID(VALID_NO_HYPHENS)).toBe(true)
    })

    test('should return true for valid uppercase UUID', () => {
      expect(isValidUUID(VALID_UPPER)).toBe(true)
    })

    test('should return true for valid UUID with braces', () => {
      expect(isValidUUID(VALID_BRACED)).toBe(true)
    })

    test('should return true for valid URN format UUID', () => {
      expect(isValidUUID(VALID_URN)).toBe(true)
    })

    test('should return true for NIL UUID', () => {
      expect(isValidUUID(NIL_UUID)).toBe(true)
    })

    test('should return false for null', () => {
      expect(isValidUUID(null)).toBe(false)
    })

    test('should return false for undefined', () => {
      expect(isValidUUID(undefined)).toBe(false)
    })

    test('should return false for empty string', () => {
      expect(isValidUUID('')).toBe(false)
    })

    test('should return false for invalid characters', () => {
      expect(isValidUUID('invalid-uuid-123456789012')).toBe(false)
      expect(isValidUUID('550e8400-e29b-41d4-a716-44665544ZZZZ')).toBe(false)
    })

    test('should return false for wrong length', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false)
    })

    test('should return false for non-string', () => {
      expect(isValidUUID(123)).toBe(false)
      expect(isValidUUID({})).toBe(false)
    })
  })

  describe('parseUUID', () => {
    test('should return null for invalid UUID', () => {
      expect(parseUUID(null)).toBeNull()
      expect(parseUUID('invalid')).toBeNull()
    })

    test('should parse valid UUID and return normalized value', () => {
      const result = parseUUID(VALID_UPPER)
      expect(result.normalized).toBe(VALID_STANDARD)
    })

    test('should parse version correctly (V4)', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.version).toBe(4)
    })

    test('should parse variant correctly (RFC 4122)', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.variant).toBe('RFC 4122')
    })

    test('should parse hex without hyphens', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.hex).toBe(VALID_NO_HYPHENS)
    })

    test('should parse Time Low correctly', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.timeLow).toBe('550e8400')
    })

    test('should parse Time Mid correctly', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.timeMid).toBe('e29b')
    })

    test('should parse Time Hi & Version correctly', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.timeHiAndVersion).toBe('41d4')
    })

    test('should parse Clock Seq Hi & Reserved correctly', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.clockSeqHiAndReserved).toBe('a716')
    })

    test('should parse Clock Seq Low correctly', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.clockSeqLow).toBe('44')
    })

    test('should parse Node correctly', () => {
      const result = parseUUID(VALID_STANDARD)
      expect(result.node).toBe('6655440000')
    })

    test('should parse NIL UUID', () => {
      const result = parseUUID(NIL_UUID)
      expect(result.normalized).toBe(NIL_UUID)
      expect(result.version).toBe(0)
      expect(result.variant).toBe('NCS')
      expect(result.hex).toBe('00000000000000000000000000000000')
    })

    describe('variant detection', () => {
      test('should detect NCS variant (0xxx)', () => {
        const uuid = '550e8400-e29b-41d4-0716-446655440000'
        const result = parseUUID(uuid)
        expect(result.variant).toBe('NCS')
      })

      test('should detect RFC 4122 variant (10xx)', () => {
        const uuid = '550e8400-e29b-41d4-8716-446655440000'
        const result = parseUUID(uuid)
        expect(result.variant).toBe('RFC 4122')

        const uuid2 = '550e8400-e29b-41d4-b716-446655440000'
        const result2 = parseUUID(uuid2)
        expect(result2.variant).toBe('RFC 4122')
      })

      test('should detect Microsoft variant (110x)', () => {
        const uuid = '550e8400-e29b-41d4-c716-446655440000'
        const result = parseUUID(uuid)
        expect(result.variant).toBe('Microsoft')

        const uuid2 = '550e8400-e29b-41d4-d716-446655440000'
        const result2 = parseUUID(uuid2)
        expect(result2.variant).toBe('Microsoft')
      })

      test('should detect reserved variant (111x)', () => {
        const uuid = '550e8400-e29b-41d4-e716-446655440000'
        const result = parseUUID(uuid)
        expect(result.variant).toBe('reserved')

        const uuid2 = '550e8400-e29b-41d4-f716-446655440000'
        const result2 = parseUUID(uuid2)
        expect(result2.variant).toBe('reserved')
      })
    })

    describe('version detection', () => {
      test('should detect version 1', () => {
        const uuid = '550e8400-e29b-11d4-a716-446655440000'
        const result = parseUUID(uuid)
        expect(result.version).toBe(1)
      })

      test('should detect version 3', () => {
        const uuid = '550e8400-e29b-31d4-a716-446655440000'
        const result = parseUUID(uuid)
        expect(result.version).toBe(3)
      })

      test('should detect version 4', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000'
        const result = parseUUID(uuid)
        expect(result.version).toBe(4)
      })

      test('should detect version 5', () => {
        const uuid = '550e8400-e29b-51d4-a716-446655440000'
        const result = parseUUID(uuid)
        expect(result.version).toBe(5)
      })
    })
  })

  describe('formatUUID', () => {
    test('should return null for invalid UUID', () => {
      expect(formatUUID(null)).toBeNull()
      expect(formatUUID('invalid')).toBeNull()
    })

    test('should return standard format', () => {
      const result = formatUUID(VALID_STANDARD)
      expect(result.standard).toBe(VALID_STANDARD)
    })

    test('should return no hyphens format', () => {
      const result = formatUUID(VALID_STANDARD)
      expect(result.noHyphens).toBe(VALID_NO_HYPHENS)
    })

    test('should return uppercase format', () => {
      const result = formatUUID(VALID_STANDARD)
      expect(result.upper).toBe(VALID_UPPER)
    })

    test('should return uppercase no hyphens format', () => {
      const result = formatUUID(VALID_STANDARD)
      expect(result.upperNoHyphens).toBe(VALID_UPPER_NO_HYPHENS)
    })

    test('should return braced format', () => {
      const result = formatUUID(VALID_STANDARD)
      expect(result.braced).toBe(VALID_BRACED)
    })

    test('should return braced uppercase format', () => {
      const result = formatUUID(VALID_STANDARD)
      expect(result.bracedUpper).toBe('{550E8400-E29B-41D4-A716-446655440000}')
    })

    test('should return URN format', () => {
      const result = formatUUID(VALID_STANDARD)
      expect(result.urn).toBe(VALID_URN)
    })

    test('should return URN uppercase format', () => {
      const result = formatUUID(VALID_STANDARD)
      expect(result.urnUpper).toBe('urn:uuid:550E8400-E29B-41D4-A716-446655440000')
    })

    test('should format NIL UUID correctly', () => {
      const result = formatUUID(NIL_UUID)
      expect(result.standard).toBe(NIL_UUID)
      expect(result.noHyphens).toBe('00000000000000000000000000000000')
      expect(result.upper).toBe('00000000-0000-0000-0000-000000000000')
      expect(result.braced).toBe('{00000000-0000-0000-0000-000000000000}')
    })

    test('should accept uppercase input and normalize', () => {
      const result = formatUUID(VALID_UPPER)
      expect(result.standard).toBe(VALID_STANDARD)
    })

    test('should accept no-hyphens input and normalize', () => {
      const result = formatUUID(VALID_NO_HYPHENS)
      expect(result.standard).toBe(VALID_STANDARD)
    })

    test('should accept braced input and normalize', () => {
      const result = formatUUID(VALID_BRACED)
      expect(result.standard).toBe(VALID_STANDARD)
    })

    test('should accept URN input and normalize', () => {
      const result = formatUUID(VALID_URN)
      expect(result.standard).toBe(VALID_STANDARD)
    })
  })

  describe('integration tests', () => {
    test('generated UUID should be valid and parseable', () => {
      const uuid = generateUUID()
      expect(isValidUUID(uuid)).toBe(true)

      const parsed = parseUUID(uuid)
      expect(parsed).not.toBeNull()
      expect(parsed.version).toBe(4)
      expect(parsed.variant).toBe('RFC 4122')
    })

    test('generated UUID should produce all 8 formats', () => {
      const uuid = generateUUID()
      const formats = formatUUID(uuid)

      expect(formats.standard).toBe(uuid)
      expect(formats.noHyphens.length).toBe(32)
      expect(formats.upper.length).toBe(36)
      expect(formats.upperNoHyphens.length).toBe(32)
      expect(formats.braced.startsWith('{')).toBe(true)
      expect(formats.braced.endsWith('}')).toBe(true)
      expect(formats.urn.startsWith('urn:uuid:')).toBe(true)
    })

    test('normalized UUID should be idempotent', () => {
      const normalized = normalizeUUID(VALID_UPPER)
      const normalizedAgain = normalizeUUID(normalized)
      expect(normalized).toBe(normalizedAgain)
    })

    test('parseUUID and formatUUID should work together', () => {
      const parsed = parseUUID(VALID_STANDARD)
      const formatted = formatUUID(parsed.normalized)
      expect(formatted.standard).toBe(VALID_STANDARD)
    })
  })
})
