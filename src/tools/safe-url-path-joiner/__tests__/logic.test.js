import { describe, test, expect } from 'vitest'
import {
  joinSafe,
  joinUrl,
  joinWindowsPath,
  joinPosixPath,
  detectMode,
  normalizePercentEncoding,
  validateSegments,
  parseBatchInput,
  processBatch,
  ERROR_CODES,
  MODE,
  DEFAULT_PRESET,
  MAX_SEGMENTS_PER_GROUP,
  MAX_SINGLE_SEGMENT_LENGTH,
  MAX_BATCH_LINES,
} from '../logic/index.js'

describe('safe-url-path-joiner logic', () => {
  describe('detectMode - 模式自动检测', () => {
    test('should detect URL mode from scheme', () => {
      expect(detectMode(['https://example.com', 'api'])).toBe(MODE.URL_ONLY)
      expect(detectMode(['http://test.com'])).toBe(MODE.URL_ONLY)
      expect(detectMode(['ftp://files.example.com'])).toBe(MODE.URL_ONLY)
    })

    test('should detect Windows mode from drive letter', () => {
      expect(detectMode(['C:\\Users', 'test'])).toBe(MODE.WINDOWS_ONLY)
      expect(detectMode(['d:\\windows'])).toBe(MODE.WINDOWS_ONLY)
    })

    test('should detect Windows mode from UNC path', () => {
      expect(detectMode(['\\\\server\\share'])).toBe(MODE.WINDOWS_ONLY)
      expect(detectMode(['//server/share'])).toBe(MODE.WINDOWS_ONLY)
    })

    test('should detect POSIX mode from leading slash', () => {
      expect(detectMode(['/var/www', 'html'])).toBe(MODE.POSIX_ONLY)
      expect(detectMode(['/home/user'])).toBe(MODE.POSIX_ONLY)
    })

    test('should default to POSIX mode for relative paths', () => {
      expect(detectMode(['relative', 'path'])).toBe(MODE.POSIX_ONLY)
      expect(detectMode(['./test'])).toBe(MODE.POSIX_ONLY)
    })
  })

  describe('joinSafe - URL 拼接', () => {
    test('should join basic URL segments correctly', () => {
      const result = joinSafe(
        ['https://example.com', 'api', 'v2', 'users'],
        DEFAULT_PRESET
      )
      expect(result.success).toBe(true)
      expect(result.result).toBe('https://example.com/api/v2/users')
    })

    test('should collapse repeated slashes', () => {
      const result = joinSafe(
        ['https://example.com//api////v2//users'],
        { ...DEFAULT_PRESET, collapseRepeated: true }
      )
      expect(result.success).toBe(true)
      expect(result.result).toBe('https://example.com/api/v2/users')
    })

    test('should strip default ports', () => {
      const result = joinSafe(
        ['https://example.com:443', 'api'],
        { ...DEFAULT_PRESET, stripDefaultPort: true }
      )
      expect(result.success).toBe(true)
      expect(result.result).not.toContain(':443')
    })

    test('should preserve non-default ports', () => {
      const result = joinSafe(
        ['https://example.com:8443', 'api'],
        { ...DEFAULT_PRESET, stripDefaultPort: true }
      )
      expect(result.success).toBe(true)
      expect(result.result).toContain(':8443')
    })

    test('should handle query and hash preservation', () => {
      const result = joinSafe(
        ['https://example.com/path?query=1#section', 'sub'],
        DEFAULT_PRESET
      )
      expect(result.success).toBe(true)
      expect(result.result).toContain('?query=1')
      expect(result.result).toContain('#section')
    })
  })

  describe('joinSafe - 路径穿越拒绝', () => {
    test('should reject traversal with .. in path segments', () => {
      const result = joinSafe(
        ['/var/www/html', '..', '..', 'etc', 'passwd'],
        { ...DEFAULT_PRESET, rejectTraversal: true }
      )
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.code === ERROR_CODES.TRAVERSAL_DETECTED)).toBe(true)
    })

    test('should detect traversal in segments with /..', () => {
      const result = joinSafe(
        ['https://example.com/base', 'sub/../secret'],
        { ...DEFAULT_PRESET, rejectTraversal: true }
      )
      expect(result.success).toBe(false)
    })

    test('should allow safe traversal when rejectTraversal is false', () => {
      const result = joinSafe(
        ['/var/www', 'html', '..', 'css'],
        { ...DEFAULT_PRESET, rejectTraversal: false, resolveDotDot: true }
      )
      expect(result.success).toBe(true)
    })
  })

  describe('joinSafe - 危险 scheme 拒绝', () => {
    test('should reject javascript: scheme', () => {
      const result = joinSafe(
        ['javascript:alert(1)', 'test'],
        { ...DEFAULT_PRESET, rejectDangerousSchemes: true }
      )
      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.code === ERROR_CODES.DANGEROUS_SCHEME)).toBe(true)
    })

    test('should reject vbscript: scheme', () => {
      const result = joinSafe(
        ['vbscript:MsgBox("test")'],
        { ...DEFAULT_PRESET, rejectDangerousSchemes: true }
      )
      expect(result.success).toBe(false)
    })

    test('should reject data: scheme', () => {
      const result = joinSafe(
        ['data:text/html,<script>alert(1)</script>'],
        { ...DEFAULT_PRESET, rejectDangerousSchemes: true }
      )
      expect(result.success).toBe(false)
    })

    test('should allow file: scheme when explicitly enabled (with warning)', () => {
      const result = joinSafe(
        ['file:///etc/passwd'],
        { ...DEFAULT_PRESET, rejectDangerousSchemes: true, allowFileScheme: true }
      )
      expect(result.warnings.some(w => w.code === ERROR_CODES.DANGEROUS_SCHEME)).toBe(true)
    })
  })

  describe('joinSafe - 中文 URL 编码', () => {
    test('should encode Chinese characters in URL paths', () => {
      const result = joinSafe(
        ['https://example.com', '路径', '文件.txt'],
        { ...DEFAULT_PRESET, normalizePercentEncoding: true }
      )
      expect(result.success).toBe(true)
      expect(result.result).toContain('%E8%B7%AF%E5%BE%84')
      expect(result.result).toContain('%E6%96%87%E4%BB%B6')
    })
  })

  describe('normalizePercentEncoding - 百分号编码归一', () => {
    test('should normalize to uppercase hex', () => {
      expect(normalizePercentEncoding('%2f%3a')).toBe('%2F%3A')
    })

    test('should handle + as space', () => {
      expect(normalizePercentEncoding('hello+world')).toBe('hello%20world')
    })
  })

  describe('joinWindowsPath - Windows 路径', () => {
    test('should join drive letter paths correctly', () => {
      const result = joinWindowsPath(
        ['C:\\Users', 'admin', 'Documents'],
        DEFAULT_PRESET
      )
      expect(result.result).toBe('C:\\Users\\admin\\Documents')
    })

    test('should handle UNC paths', () => {
      const result = joinWindowsPath(
        ['\\\\server01\\share01', 'documents', 'reports'],
        DEFAULT_PRESET
      )
      expect(result.result).toBe('\\\\server01\\share01\\documents\\reports')
    })

    test('should reject Windows reserved names', () => {
      const result = joinWindowsPath(
        ['C:\\temp', 'CON.txt'],
        { ...DEFAULT_PRESET, rejectWindowsReserved: true }
      )
      expect(result.warnings.some(w => w.code === ERROR_CODES.WINDOWS_RESERVED_NAME)).toBe(true)
    })

    test('should detect various reserved names', () => {
      const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1']
      for (const name of reservedNames) {
        const result = joinWindowsPath(
          ['C:\\temp', name],
          { ...DEFAULT_PRESET, rejectWindowsReserved: true }
        )
        expect(result.warnings.some(w => w.code === ERROR_CODES.WINDOWS_RESERVED_NAME)).toBe(true)
      }
    })
  })

  describe('joinPosixPath - POSIX 路径', () => {
    test('should join absolute paths correctly', () => {
      const result = joinPosixPath(
        ['/var/www', 'html', 'index.html'],
        DEFAULT_PRESET
      )
      expect(result.result).toBe('/var/www/html/index.html')
    })

    test('should preserve trailing slash when enabled', () => {
      const result = joinPosixPath(
        ['/var/www/', 'html/'],
        { ...DEFAULT_PRESET, preserveTrailingSlash: true }
      )
      expect(result.result.endsWith('/')).toBe(true)
    })

    test('should resolve . and .. when enabled', () => {
      const result = joinPosixPath(
        ['/var/www', '.', 'html', '..', 'css'],
        { ...DEFAULT_PRESET, resolveDotDot: true, rejectTraversal: false }
      )
      expect(result.result).toBe('/var/www/css')
    })
  })

  describe('validateSegments - 长度守卫', () => {
    test('should detect too many segments', () => {
      const segments = new Array(MAX_SEGMENTS_PER_GROUP + 1).fill('test')
      const result = validateSegments(segments)
      expect(result.errors.some(e => e.code === ERROR_CODES.TOO_MANY_SEGMENTS)).toBe(true)
    })

    test('should accept segments within limit', () => {
      const segments = new Array(MAX_SEGMENTS_PER_GROUP).fill('test')
      const result = validateSegments(segments)
      expect(result.errors.some(e => e.code === ERROR_CODES.TOO_MANY_SEGMENTS)).toBe(false)
    })

    test('should detect single segment too long', () => {
      const longSegment = 'x'.repeat(MAX_SINGLE_SEGMENT_LENGTH + 1)
      const result = validateSegments([longSegment])
      expect(result.errors.some(e => e.code === ERROR_CODES.SEGMENT_TOO_LONG)).toBe(true)
    })

    test('should warn on empty segments', () => {
      const result = validateSegments(['test', '', 'path'])
      expect(result.warnings.some(w => w.code === ERROR_CODES.EMPTY_SEGMENT)).toBe(true)
    })
  })

  describe('parseBatchInput - 批量行解析', () => {
    test('should parse lines with pipe separator', () => {
      const input = 'https://a.com|path1|sub1\nhttps://b.com|path2|sub2'
      const parsed = parseBatchInput(input, '|')
      expect(parsed.length).toBe(2)
      expect(parsed[0].segments).toEqual(['https://a.com', 'path1', 'sub1'])
      expect(parsed[1].segments).toEqual(['https://b.com', 'path2', 'sub2'])
    })

    test('should handle empty lines', () => {
      const input = 'test1|test2\n\n\n  \ntest3'
      const parsed = parseBatchInput(input, '|')
      expect(parsed.length).toBe(5)
      expect(parsed[0].isEmpty).toBe(false)
      expect(parsed[1].isEmpty).toBe(true)
      expect(parsed[2].isEmpty).toBe(true)
      expect(parsed[3].isEmpty).toBe(true)
      expect(parsed[4].isEmpty).toBe(false)
    })
  })

  describe('processBatch - 批量处理', () => {
    test('should process multiple lines', () => {
      const input = 'https://a.com|path1\n/var/www|html|index.html\nC:\\Users|test'
      const parsed = parseBatchInput(input, '|')
      const result = processBatch(parsed, DEFAULT_PRESET)
      expect(result.totalLines).toBe(3)
      expect(result.successCount).toBe(3)
      expect(result.errorCount).toBe(0)
    })

    test('should track errors in batch', () => {
      const input = 'https://a.com|valid\njavascript:alert(1)|bad\n/var/www|good'
      const parsed = parseBatchInput(input, '|')
      const result = processBatch(parsed, DEFAULT_PRESET)
      expect(result.totalLines).toBe(3)
      expect(result.successCount).toBe(2)
      expect(result.errorCount).toBe(1)
    })
  })

  describe('ERROR_CODES - 空输入与全空白', () => {
    test('should handle null/undefined input in joinSafe', () => {
      const result1 = joinSafe([null], DEFAULT_PRESET)
      expect(result1.warnings.some(w => w.code === ERROR_CODES.EMPTY_SEGMENT)).toBe(true)

      const result2 = joinSafe([undefined], DEFAULT_PRESET)
      expect(result2.warnings.some(w => w.code === ERROR_CODES.EMPTY_SEGMENT)).toBe(true)
    })

    test('should handle whitespace-only segments', () => {
      const result = joinSafe(['   ', '\t\n'], DEFAULT_PRESET)
      expect(result.warnings.some(w => w.code === ERROR_CODES.WHITESPACE_ONLY || w.code === ERROR_CODES.EMPTY_SEGMENT)).toBe(true)
    })
  })
})
