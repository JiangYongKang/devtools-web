import { describe, expect, test } from 'vitest'
import {
  generateUUIDv4,
  generate32BitHex,
  generateRequestId,
  isValidUUIDv4,
  isValid32Hex,
  isValidRequestId,
  normalizeRequestId,
  generateTraceId,
  generateSpanId,
  isValidTraceId,
  isValidSpanId,
  parseTraceParent,
  formatTraceParent,
  deriveSpanId,
  detectSpanIdCollision,
  ID_MODES,
  TRACE_VERSION,
} from '../logic/index.js'

describe('idGenerator module', () => {
  describe('generateUUIDv4', () => {
    test('should generate valid UUID v4', () => {
      const uuid = generateUUIDv4()
      expect(typeof uuid).toBe('string')
      expect(isValidUUIDv4(uuid)).toBe(true)
    })

    test('should generate unique UUIDs', () => {
      const uuids = new Set()
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUIDv4())
      }
      expect(uuids.size).toBe(100)
    })

    test('should have correct version and variant bits', () => {
      const uuid = generateUUIDv4()
      const parts = uuid.split('-')
      expect(parts.length).toBe(5)
      expect(parts[2][0]).toBe('4')
      expect(['8', '9', 'a', 'b']).toContain(parts[3][0].toLowerCase())
    })
  })

  describe('generate32BitHex', () => {
    test('should generate 32 character hex string', () => {
      const hex = generate32BitHex()
      expect(typeof hex).toBe('string')
      expect(hex.length).toBe(32)
      expect(isValid32Hex(hex)).toBe(true)
    })

    test('should generate unique hex strings', () => {
      const hexes = new Set()
      for (let i = 0; i < 100; i++) {
        hexes.add(generate32BitHex())
      }
      expect(hexes.size).toBe(100)
    })
  })

  describe('generateRequestId', () => {
    test('should generate UUID v4 by default', () => {
      const id = generateRequestId()
      expect(isValidUUIDv4(id)).toBe(true)
    })

    test('should generate hex when mode is HEX_32', () => {
      const id = generateRequestId(ID_MODES.HEX_32)
      expect(isValid32Hex(id)).toBe(true)
    })
  })

  describe('isValidUUIDv4', () => {
    test('should accept valid UUID v4', () => {
      expect(isValidUUIDv4('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidUUIDv4('550e8400-e29b-41d4-a716-446655440000'.toUpperCase())).toBe(true)
    })

    test('should reject invalid UUIDs', () => {
      expect(isValidUUIDv4(null)).toBe(false)
      expect(isValidUUIDv4(undefined)).toBe(false)
      expect(isValidUUIDv4('')).toBe(false)
      expect(isValidUUIDv4('not-a-uuid')).toBe(false)
      expect(isValidUUIDv4('550e8400-e29b-11d4-a716-446655440000')).toBe(false)
    })
  })

  describe('isValid32Hex', () => {
    test('should accept valid 32 char hex', () => {
      expect(isValid32Hex('550e8400e29b41d4a716446655440000')).toBe(true)
      expect(isValid32Hex('550E8400E29B41D4A716446655440000')).toBe(true)
    })

    test('should reject invalid hex', () => {
      expect(isValid32Hex(null)).toBe(false)
      expect(isValid32Hex('550e8400e29b41d4a71644665544000')).toBe(false)
      expect(isValid32Hex('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
      expect(isValid32Hex('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false)
    })
  })

  describe('isValidRequestId', () => {
    test('should accept both UUID v4 and 32 hex', () => {
      expect(isValidRequestId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidRequestId('550e8400e29b41d4a716446655440000')).toBe(true)
    })
  })

  describe('normalizeRequestId', () => {
    test('should pass through valid UUID v4', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(normalizeRequestId(uuid)).toBe(uuid.toLowerCase())
    })

    test('should pass through valid 32 hex', () => {
      const hex = '550e8400e29b41d4a716446655440000'
      expect(normalizeRequestId(hex)).toBe(hex)
    })

    test('should normalize invalid format to 32 hex', () => {
      const shortId = 'abc123'
      const normalized = normalizeRequestId(shortId)
      expect(normalized.length).toBe(32)
      expect(isValid32Hex(normalized)).toBe(true)
    })

    test('should handle mixed hex and non-hex chars', () => {
      const mixed = 'uuid-test-12345-abcdef'
      const normalized = normalizeRequestId(mixed)
      expect(normalized.length).toBe(32)
      expect(isValid32Hex(normalized)).toBe(true)
    })

    test('should handle too long input', () => {
      const long = 'a'.repeat(64)
      const normalized = normalizeRequestId(long)
      expect(normalized.length).toBe(32)
      expect(isValid32Hex(normalized)).toBe(true)
    })

    test('should throw for non-string input', () => {
      expect(() => normalizeRequestId(null)).toThrow()
      expect(() => normalizeRequestId(undefined)).toThrow()
      expect(() => normalizeRequestId(123)).toThrow()
    })
  })

  describe('generateTraceId and generateSpanId', () => {
    test('should generate valid trace ID (32 hex)', () => {
      const traceId = generateTraceId()
      expect(traceId.length).toBe(32)
      expect(isValidTraceId(traceId)).toBe(true)
    })

    test('should generate valid span ID (16 hex)', () => {
      const spanId = generateSpanId()
      expect(spanId.length).toBe(16)
      expect(isValidSpanId(spanId)).toBe(true)
    })
  })

  describe('parseTraceParent', () => {
    test('should parse valid traceparent', () => {
      const traceId = generateTraceId()
      const spanId = generateSpanId()
      const traceParent = `${TRACE_VERSION}-${traceId}-${spanId}-01`

      const parsed = parseTraceParent(traceParent)
      expect(parsed).not.toBeNull()
      expect(parsed.version).toBe(TRACE_VERSION)
      expect(parsed.traceId).toBe(traceId)
      expect(parsed.parentSpanId).toBe(spanId)
      expect(parsed.traceFlags).toBe('01')
      expect(parsed.sampled).toBe(true)
    })

    test('should return null for invalid format', () => {
      expect(parseTraceParent(null)).toBeNull()
      expect(parseTraceParent('invalid')).toBeNull()
      expect(parseTraceParent('00-invalid-spanid-flags')).toBeNull()
    })
  })

  describe('formatTraceParent', () => {
    test('should format traceparent correctly', () => {
      const traceId = generateTraceId()
      const spanId = generateSpanId()

      const formatted = formatTraceParent({ traceId, spanId })
      expect(formatted).toBe(`${TRACE_VERSION}-${traceId}-${spanId}-01`)
    })
  })

  describe('deriveSpanId', () => {
    test('should derive valid span ID from parent', () => {
      const parentSpanId = generateSpanId()
      const derived = deriveSpanId(parentSpanId)

      expect(isValidSpanId(derived)).toBe(true)
      expect(derived).not.toBe(parentSpanId)
    })

    test('should throw for invalid parent span ID', () => {
      expect(() => deriveSpanId('invalid')).toThrow()
      expect(() => deriveSpanId(null)).toThrow()
    })
  })

  describe('detectSpanIdCollision', () => {
    test('should detect collisions', () => {
      const spanId = generateSpanId()
      const existing = new Set([spanId])

      expect(detectSpanIdCollision(spanId, existing)).toBe(true)
      expect(detectSpanIdCollision(generateSpanId(), existing)).toBe(false)
    })

    test('should handle empty set', () => {
      const spanId = generateSpanId()
      expect(detectSpanIdCollision(spanId, new Set())).toBe(false)
    })
  })
})
