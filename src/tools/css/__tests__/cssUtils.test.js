import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import {
  COMPRESSION_LEVELS,
  FORMAT_OPTIONS,
  parseCSS,
  formatCSS,
  compressCSS,
  escapeHtml,
  formatBytes,
} from '../cssUtils.js'

describe('cssUtils', () => {
  beforeAll(() => {
    global.document = {
      createElement: () => {
        const el = {
          textContent: '',
          innerHTML: '',
        }
        Object.defineProperty(el, 'innerHTML', {
          set: function() {},
          get: function() {
            return this.textContent
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
          }
        })
        return el
      }
    }
  })

  afterAll(() => {
    delete global.document
  })

  describe('constants', () => {
    test('COMPRESSION_LEVELS should contain 3 levels with correct risk ratings', () => {
      expect(COMPRESSION_LEVELS).toHaveLength(3)
      expect(COMPRESSION_LEVELS[0]).toEqual({
        id: 'min',
        name: '轻度压缩',
        description: '仅移除多余空白与注释，低风险',
        risk: 'low',
      })
      expect(COMPRESSION_LEVELS[1]).toEqual({
        id: 'standard',
        name: '标准压缩',
        description: '合并声明、缩短颜色，中等风险',
        risk: 'medium',
      })
      expect(COMPRESSION_LEVELS[2]).toEqual({
        id: 'max',
        name: '高度压缩',
        description: '零值单位省略、移除最后分号等，较高风险',
        risk: 'high',
      })
    })

    test('FORMAT_OPTIONS should contain 3 indent options', () => {
      expect(FORMAT_OPTIONS).toHaveLength(3)
      expect(FORMAT_OPTIONS[0]).toEqual({ id: '2', name: '2 空格' })
      expect(FORMAT_OPTIONS[1]).toEqual({ id: '4', name: '4 空格' })
      expect(FORMAT_OPTIONS[2]).toEqual({ id: 'tab', name: 'Tab' })
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
        expect(escapeHtml(true)).toBe('true')
        expect(escapeHtml(false)).toBe('false')
      })

      test('should prevent XSS by escaping special characters', () => {
        const xss = '<script>alert("xss")</script>'
        const escaped = escapeHtml(xss)
        expect(escaped).not.toContain('<script>')
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
        expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB')
      })
    })
  })

  describe('parseCSS', () => {
    test('should parse simple CSS successfully', () => {
      const css = 'body { margin: 0; }'
      const result = parseCSS(css)
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(result.ast).toBeInstanceOf(Array)
      expect(result.ast.length).toBeGreaterThan(0)
    })

    test('should parse CSS with multiple rules', () => {
      const css = `
        body { margin: 0; padding: 0; }
        .container { max-width: 1200px; }
      `
      const result = parseCSS(css)
      expect(result.success).toBe(true)
    })

    test('should handle empty CSS', () => {
      const result = parseCSS('')
      expect(result.success).toBe(true)
      expect(result.ast).toBeInstanceOf(Array)
    })

    test('should handle whitespace-only CSS', () => {
      const result = parseCSS('   \n\n\t   ')
      expect(result.success).toBe(true)
    })

    test('should parse at-rules like @media', () => {
      const css = '@media screen and (max-width: 768px) { body { font-size: 14px; } }'
      const result = parseCSS(css)
      expect(result.success).toBe(true)
    })

    test('should parse imports', () => {
      const css = "@import url('styles.css');"
      const result = parseCSS(css)
      expect(result.success).toBe(true)
    })

    test('should handle strings with special characters', () => {
      const css = "div::before { content: 'test; { } string'; }"
      const result = parseCSS(css)
      expect(result.success).toBe(true)
    })

    test('should handle double-quoted strings', () => {
      const css = 'div::before { content: "test string"; }'
      const result = parseCSS(css)
      expect(result.success).toBe(true)
    })
  })

  describe('formatCSS', () => {
    test('should format simple CSS with 2-space indent', () => {
      const input = 'body{margin:0;padding:10px;}'
      const result = formatCSS(input, { indent: '2' })
      expect(result.success).toBe(true)
      expect(result.result).toContain('body {')
      expect(result.result).toContain('  margin: 0;')
      expect(result.result).toContain('  padding: 10px;')
    })

    test('should format with 4-space indent when specified', () => {
      const input = 'body{margin:0;}'
      const result = formatCSS(input, { indent: '4' })
      expect(result.result).toContain('    margin: 0;')
    })

    test('should format with tab indent when specified', () => {
      const input = 'body{margin:0;}'
      const result = formatCSS(input, { indent: 'tab' })
      expect(result.result).toContain('\tmargin: 0;')
    })

    test('should remove comments when removeComments is true', () => {
      const input = '/* comment */ body { margin: 0; }'
      const result = formatCSS(input, { indent: '2', removeComments: true })
      expect(result.result).not.toContain('comment')
    })

    test('should keep comments when removeComments is false', () => {
      const input = '/* comment */ body { margin: 0; }'
      const result = formatCSS(input, { indent: '2', removeComments: false })
      expect(result.result).toContain('comment')
    })

    test('should keep important comments when keepImportant is true', () => {
      const input = '/*! important */ body { margin: 0; }'
      const result = formatCSS(input, {
        indent: '2',
        removeComments: true,
        keepImportant: true,
      })
      expect(result.result).toContain('/*! important */')
    })

    test('should format multiple selectors on separate lines', () => {
      const input = 'h1,h2,h3{font-weight:bold;}'
      const result = formatCSS(input, { indent: '2' })
      expect(result.result).toContain('h1,')
      expect(result.result).toContain('h2,')
      expect(result.result).toContain('h3 {')
    })

    test('should handle empty CSS', () => {
      const result = formatCSS('', { indent: '2' })
      expect(result.success).toBe(true)
      expect(result.result).toBe('')
    })

    test('should use default options when not provided', () => {
      const input = 'body{margin:0;}'
      const result = formatCSS(input)
      expect(result.success).toBe(true)
    })
  })

  describe('compressCSS', () => {
    test('should compress simple CSS with min level', () => {
      const input = `
        body {
          margin: 0;
          padding: 10px;
        }
      `
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[0] })
      expect(result.success).toBe(true)
      expect(result.result).toBe('body{margin:0;padding:10px}')
    })

    test('should remove whitespace', () => {
      const input = '   body   {   margin : 0   ;   }   '
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[0] })
      expect(result.result).toBe('body{margin:0}')
    })

    test('should remove comments by default', () => {
      const input = '/* comment */ body { margin: 0; } /* another */'
      const result = compressCSS(input, {
        level: COMPRESSION_LEVELS[0],
        removeComments: true,
      })
      expect(result.result).not.toContain('comment')
      expect(result.result).not.toContain('another')
    })

    test('should keep important comments when keepImportant is true', () => {
      const input = '/*! license */ body { margin: 0; }'
      const result = compressCSS(input, {
        level: COMPRESSION_LEVELS[0],
        removeComments: true,
        keepImportant: true,
      })
      expect(result.result).toContain('/*! license */')
    })

    test('should shorten hex colors at standard level', () => {
      const input = 'body { color: #FFFFFF; background: #AABBCC; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[1] })
      expect(result.result).toContain('#fff')
      expect(result.result).toContain('#abc')
    })

    test('should not modify non-shortenable hex colors', () => {
      const input = 'body { color: #123456; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[1] })
      expect(result.result).toContain('#123456')
    })

    test('should remove zero units at max level', () => {
      const input = 'body { margin: 0px; padding: 0em; top: 0; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[2] })
      expect(result.result).toContain('margin:0')
      expect(result.result).toContain('padding:0')
      expect(result.result).toContain('top:0')
    })

    test('should not remove units from non-zero values at max level', () => {
      const input = 'body { margin: 10px; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[2] })
      expect(result.result).toContain('margin:10px')
    })

    test('should handle empty CSS', () => {
      const result = compressCSS('', { level: COMPRESSION_LEVELS[0] })
      expect(result.success).toBe(true)
      expect(result.result).toBe('')
    })

    test('should use standard level by default', () => {
      const input = 'body { color: #FFFFFF; }'
      const result = compressCSS(input)
      expect(result.result).toContain('#fff')
    })

    test('should handle CSS variables', () => {
      const input = ':root { --primary-color: #ff0000; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[0] })
      expect(result.result).toContain('--primary-color')
    })

    test('should not produce empty rule blocks', () => {
      const input = '.empty { }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[0] })
      expect(result.result).toBe('')
    })

    test('should merge duplicate declarations at standard level', () => {
      const input = 'body { margin: 0; margin: 10px; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[1] })
      expect(result.result).toBe('body{margin:10px}')
    })
  })

  describe('integration tests', () => {
    test('format then compress should work correctly', () => {
      const original = 'body{margin:0;padding:10px;color:#fff;}'
      const formatted = formatCSS(original, { indent: '2' })
      expect(formatted.success).toBe(true)
      const compressed = compressCSS(formatted.result, { level: COMPRESSION_LEVELS[1] })
      expect(compressed.success).toBe(true)
      expect(compressed.result).toBe('body{margin:0;padding:10px;color:#fff}')
    })

    test('should produce same result for equivalent inputs', () => {
      const input1 = 'body { margin: 0; }'
      const input2 = 'body{margin:0}'
      const result1 = compressCSS(input1, { level: COMPRESSION_LEVELS[0] })
      const result2 = compressCSS(input2, { level: COMPRESSION_LEVELS[0] })
      expect(result1.result).toBe(result2.result)
    })
  })

  describe('edge cases', () => {
    test('should handle very long CSS property values', () => {
      const longValue = 'a'.repeat(1000)
      const input = `body { content: '${longValue}'; }`
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[0] })
      expect(result.success).toBe(true)
      expect(result.result).toContain(longValue)
    })

    test('should handle special characters in selectors', () => {
      const input = '[data-test="value"] { color: red; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[0] })
      expect(result.success).toBe(true)
    })

    test('should handle pseudo-classes and pseudo-elements', () => {
      const input = 'a:hover { color: blue; } div::before { content: ""; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[0] })
      expect(result.success).toBe(true)
      expect(result.result).toContain('a:hover')
      expect(result.result).toContain('div::before')
    })

    test('should handle numeric selectors', () => {
      const input = '.col-12 { width: 100%; }'
      const result = compressCSS(input, { level: COMPRESSION_LEVELS[0] })
      expect(result.success).toBe(true)
      expect(result.result).toContain('.col-12')
    })
  })
})
