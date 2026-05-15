import {
  matchesSignature,
  matchesRule,
  detectMimeFromBytes,
  isLikelyUtf8Text,
  bytesToHexString,
  hexToAscii,
  registerMagicRule,
  clearCustomRules,
} from '../logic/magicNumbers.js'

describe('magicNumbers', () => {
  describe('matchesSignature', () => {
    it('should match exact signature at offset 0', () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
      const signature = [0x89, 0x50, 0x4e, 0x47]
      expect(matchesSignature(bytes, signature)).toBe(true)
    })

    it('should return false for mismatched signature', () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
      const signature = [0x89, 0x50, 0x4e, 0x47]
      expect(matchesSignature(bytes, signature)).toBe(false)
    })

    it('should return false for insufficient bytes', () => {
      const bytes = new Uint8Array([0x89, 0x50])
      const signature = [0x89, 0x50, 0x4e, 0x47]
      expect(matchesSignature(bytes, signature)).toBe(false)
    })

    it('should match signature at custom offset', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x89, 0x50, 0x4e, 0x47])
      const signature = [0x89, 0x50, 0x4e, 0x47]
      expect(matchesSignature(bytes, signature, 2)).toBe(true)
    })
  })

  describe('matchesRule', () => {
    it('should match simple rule', () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const rule = {
        signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        offset: 0,
      }
      expect(matchesRule(bytes, rule)).toBe(true)
    })

    it('should match rule with trailing check', () => {
      const bytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46,
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ])
      const rule = {
        signature: [0x52, 0x49, 0x46, 0x46],
        offset: 0,
        trailingCheck: {
          offset: 8,
          signature: [0x57, 0x45, 0x42, 0x50],
        },
      }
      expect(matchesRule(bytes, rule)).toBe(true)
    })

    it('should fail rule with mismatched trailing check', () => {
      const bytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ])
      const rule = {
        signature: [0x52, 0x49, 0x46, 0x46],
        offset: 0,
        trailingCheck: {
          offset: 8,
          signature: [0x57, 0x45, 0x42, 0x50],
        },
      }
      expect(matchesRule(bytes, rule)).toBe(false)
    })
  })

  describe('detectMimeFromBytes', () => {
    it('should detect PNG mime type', () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const result = detectMimeFromBytes(bytes)
      expect(result.primary).toBeDefined()
      expect(result.primary.mime).toBe('image/png')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should detect JPEG mime type', () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
      const result = detectMimeFromBytes(bytes)
      expect(result.primary).toBeDefined()
      expect(result.primary.mime).toBe('image/jpeg')
    })

    it('should detect GIF89a mime type', () => {
      const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
      const result = detectMimeFromBytes(bytes)
      expect(result.primary).toBeDefined()
      expect(result.primary.mime).toBe('image/gif')
    })

    it('should detect PDF mime type', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
      const result = detectMimeFromBytes(bytes)
      expect(result.primary).toBeDefined()
      expect(result.primary.mime).toBe('application/pdf')
    })

    it('should detect ZIP container format', () => {
      const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
      const result = detectMimeFromBytes(bytes)
      expect(result.primary).toBeDefined()
      expect(result.primary.mime).toBe('application/zip')
      expect(result.primary.isContainer).toBe(true)
    })

    it('should return empty result for unknown bytes', () => {
      const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03])
      const result = detectMimeFromBytes(bytes)
      expect(result.primary).toBeNull()
      expect(result.matches).toHaveLength(0)
      expect(result.confidence).toBe(0)
    })

    it('should return empty result for empty bytes', () => {
      const bytes = new Uint8Array([])
      const result = detectMimeFromBytes(bytes)
      expect(result.primary).toBeNull()
      expect(result.matches).toHaveLength(0)
    })
  })

  describe('isLikelyUtf8Text', () => {
    it('should detect simple ASCII text', () => {
      const bytes = new TextEncoder().encode('Hello, World!')
      expect(isLikelyUtf8Text(bytes)).toBe(true)
    })

    it('should detect UTF-8 text with multi-byte characters', () => {
      const bytes = new TextEncoder().encode('你好，世界！Hello 🌍')
      expect(isLikelyUtf8Text(bytes)).toBe(true)
    })

    it('should return false for binary data', () => {
      const bytes = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc, 0xfb])
      expect(isLikelyUtf8Text(bytes)).toBe(false)
    })

    it('should handle empty bytes', () => {
      const bytes = new Uint8Array([])
      expect(isLikelyUtf8Text(bytes)).toBe(false)
    })
  })

  describe('bytesToHexString', () => {
    it('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const hex = bytesToHexString(bytes)
      expect(hex).toContain('89')
      expect(hex).toContain('50')
      expect(hex).toContain('4E')
      expect(hex).toContain('47')
    })

    it('should handle empty bytes', () => {
      const bytes = new Uint8Array([])
      expect(bytesToHexString(bytes)).toBe('')
    })

    it('should respect maxLen parameter', () => {
      const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])
      const hex = bytesToHexString(bytes, 3)
      expect(hex).not.toContain('05')
    })
  })

  describe('hexToAscii', () => {
    it('should convert printable bytes to ASCII', () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      const ascii = hexToAscii(bytes)
      expect(ascii).toBe('Hello')
    })

    it('should replace non-printable characters with dot', () => {
      const bytes = new Uint8Array([0x00, 0x01, 0x48, 0x65])
      const ascii = hexToAscii(bytes)
      expect(ascii).toBe('..He')
    })

    it('should handle empty bytes', () => {
      const bytes = new Uint8Array([])
      expect(hexToAscii(bytes)).toBe('')
    })
  })

  describe('custom magic rules', () => {
    beforeEach(() => {
      clearCustomRules()
    })

    it('should register custom rule', () => {
      const customRule = {
        id: 'custom-format',
        signature: [0xaa, 0xbb, 0xcc, 0xdd],
        mime: 'application/x-custom',
        description: 'Custom format',
      }

      registerMagicRule(customRule)

      const bytes = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd])
      const result = detectMimeFromBytes(bytes)
      expect(result.primary).toBeDefined()
      expect(result.primary.mime).toBe('application/x-custom')
    })

    it('should throw error for missing required fields', () => {
      expect(() => {
        registerMagicRule({ id: 'test', mime: 'text/plain' })
      }).toThrow()
    })

    it('should throw error for duplicate rule id', () => {
      registerMagicRule({
        id: 'duplicate-test',
        signature: [0x00],
        mime: 'text/plain',
      })

      expect(() => {
        registerMagicRule({
          id: 'duplicate-test',
          signature: [0x01],
          mime: 'text/plain',
        })
      }).toThrow()
    })
  })
})
