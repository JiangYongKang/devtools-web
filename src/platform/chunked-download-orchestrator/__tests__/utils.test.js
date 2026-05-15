import {
  sanitizeFilename,
  generateShortHash,
  normalizeMimeType,
  formatBytes,
  formatETA,
  calculateEMA,
  addUtf8Bom,
  shouldAddUtf8Bom,
} from '../logic/index.js'

describe('utils', () => {
  describe('sanitizeFilename', () => {
    it('should remove illegal characters', () => {
      const result = sanitizeFilename('file<>:\"/\\|?*name.txt')
      expect(result).toBe('filename.txt')
    })

    it('should handle null or undefined input', () => {
      expect(sanitizeFilename(null)).toBe('download.txt')
      expect(sanitizeFilename(undefined)).toBe('download.txt')
      expect(sanitizeFilename('')).toBe('download.txt')
    })

    it('should handle windows reserved names', () => {
      const result = sanitizeFilename('CON')
      expect(result).toBe('_CON_')
    })

    it('should handle windows reserved names with extension', () => {
      const result = sanitizeFilename('CON.txt')
      expect(result).toBe('_CON_.txt')
    })

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt'
      const result = sanitizeFilename(longName)
      expect(result.length).toBeLessThanOrEqual(255)
    })

    it('should preserve extension when truncating', () => {
      const longName = 'a'.repeat(300) + '.pdf'
      const result = sanitizeFilename(longName)
      expect(result.endsWith('.pdf')).toBe(true)
    })

    it('should trim whitespace and dots', () => {
      const result = sanitizeFilename('  ..file name..  ')
      expect(result).toBe('file name')
    })

    it('should use fallback extension when base name is too short', () => {
      const result = sanitizeFilename('.txt')
      expect(result).toBe('download.txt')
    })
  })

  describe('generateShortHash', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = generateShortHash('test')
      const hash2 = generateShortHash('test')
      expect(hash1).toBe(hash2)
    })

    it('should generate different hash for different input', () => {
      const hash1 = generateShortHash('test1')
      const hash2 = generateShortHash('test2')
      expect(hash1).not.toBe(hash2)
    })

    it('should respect length parameter', () => {
      const hash = generateShortHash('test', 4)
      expect(hash.length).toBe(4)
    })

    it('should default to 8 characters', () => {
      const hash = generateShortHash('test')
      expect(hash.length).toBe(8)
    })
  })

  describe('normalizeMimeType', () => {
    it('should return default for null input', () => {
      expect(normalizeMimeType(null)).toBe('application/octet-stream')
      expect(normalizeMimeType(undefined)).toBe('application/octet-stream')
    })

    it('should trim and lowercase mime type', () => {
      expect(normalizeMimeType('  TEXT/PLAIN  ')).toBe('text/plain')
    })
  })

  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('should format bytes correctly', () => {
      expect(formatBytes(512)).toBe('512 B')
    })

    it('should format KB correctly', () => {
      expect(formatBytes(1536)).toBe('1.5 KB')
    })

    it('should format MB correctly', () => {
      expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
    })

    it('should respect decimals parameter', () => {
      expect(formatBytes(1536, 0)).toBe('1 KB')
      expect(formatBytes(1536, 3)).toBe('1.5 KB')
    })
  })

  describe('formatETA', () => {
    it('should format 0 seconds correctly', () => {
      expect(formatETA(0)).toBe('00:00')
    })

    it('should format seconds correctly', () => {
      expect(formatETA(45)).toBe('00:45')
    })

    it('should format minutes correctly', () => {
      expect(formatETA(125)).toBe('02:05')
    })

    it('should format hours correctly', () => {
      expect(formatETA(3725)).toBe('1h 2m')
    })

    it('should handle null or negative', () => {
      expect(formatETA(null)).toBe('--:--')
      expect(formatETA(-10)).toBe('--:--')
    })
  })

  describe('calculateEMA', () => {
    it('should calculate EMA correctly', () => {
      const result = calculateEMA(100, 50, 3)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(50)
      expect(result).toBeLessThan(100)
    })

    it('should give more weight to recent values', () => {
      const ema1 = calculateEMA(100, 50, 3)
      const ema2 = calculateEMA(100, 50, 9)
      expect(ema1).toBeGreaterThan(ema2)
    })
  })

  describe('addUtf8Bom', () => {
    it('should add BOM to strings', () => {
      const result = addUtf8Bom('hello')
      expect(result.startsWith('\uFEFF')).toBe(true)
    })

    it('should add BOM to Uint8Array', () => {
      const data = new TextEncoder().encode('hello')
      const result = addUtf8Bom(data)
      expect(result instanceof Uint8Array).toBe(true)
      expect(result.length).toBe(data.length + 3)
      expect(result[0]).toBe(0xEF)
      expect(result[1]).toBe(0xBB)
      expect(result[2]).toBe(0xBF)
    })

    it('should return other types as-is', () => {
      const obj = { test: 1 }
      expect(addUtf8Bom(obj)).toBe(obj)
    })
  })

  describe('shouldAddUtf8Bom', () => {
    it('should return true for CSV', () => {
      expect(shouldAddUtf8Bom('text/csv;charset=utf-8')).toBe(true)
    })

    it('should return false for other types', () => {
      expect(shouldAddUtf8Bom('text/plain')).toBe(false)
      expect(shouldAddUtf8Bom('application/json')).toBe(false)
    })
  })
})
