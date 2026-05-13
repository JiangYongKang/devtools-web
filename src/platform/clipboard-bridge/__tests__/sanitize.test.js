import { describe, expect, test } from 'vitest'
import {
  sanitizeHtml,
  htmlToPlainText,
  escapeHtmlForDisplay,
  isValidProtocol,
  parseStyles,
  serializeStyles,
  sanitizeStyles,
} from '../logic/sanitize.js'

describe('sanitize module', () => {
  describe('escapeHtmlForDisplay', () => {
    test('should escape HTML special characters', () => {
      const html = '<div id="test">Content & "quotes"</div>'
      const escaped = escapeHtmlForDisplay(html)
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
      expect(escaped).toContain('&lt;')
      expect(escaped).toContain('&gt;')
      expect(escaped).toContain('&amp;')
      expect(escaped).toContain('&quot;')
    })
  })

  describe('htmlToPlainText', () => {
    test('should extract text from simple HTML', () => {
      expect(htmlToPlainText('<p>Hello <strong>World</strong></p>')).toBe('Hello World')
    })

    test('should remove script and style contents', () => {
      const html = '<script>alert("xss")</script><style>body {}</style><p>Content</p>'
      expect(htmlToPlainText(html)).toBe('Content')
    })

    test('should handle null/undefined', () => {
      expect(htmlToPlainText(null)).toBe('')
      expect(htmlToPlainText(undefined)).toBe('')
    })

    test('should decode HTML entities', () => {
      const result = htmlToPlainText('&amp;&nbsp;&lt;&gt;&quot;&#39;')
      expect(result).toContain('&')
      expect(result).toContain('<')
      expect(result).toContain('>')
      expect(result).toContain('"')
      expect(result).toContain("'")
    })
  })

  describe('isValidProtocol', () => {
    test('should allow http and https for a tags', () => {
      expect(isValidProtocol('a', 'http://example.com', ['http', 'https'])).toBe(true)
      expect(isValidProtocol('a', 'https://example.com', ['http', 'https'])).toBe(true)
    })

    test('should allow mailto and tel if specified', () => {
      expect(isValidProtocol('a', 'mailto:test@example.com', ['mailto'])).toBe(true)
      expect(isValidProtocol('a', 'tel:+1234567890', ['tel'])).toBe(true)
    })

    test('should allow data: for images if specified', () => {
      expect(isValidProtocol('img', 'data:image/png;base64,abc', ['data'])).toBe(true)
    })

    test('should allow relative URLs (no protocol)', () => {
      expect(isValidProtocol('a', '/path/to/page', ['http', 'https'])).toBe(true)
      expect(isValidProtocol('a', 'page.html', ['http', 'https'])).toBe(true)
    })

    test('should allow hash fragments', () => {
      expect(isValidProtocol('a', '#section', ['http'])).toBe(true)
    })

    test('should block javascript: protocol', () => {
      expect(isValidProtocol('a', 'javascript:alert(1)', ['http', 'https'])).toBe(false)
    })

    test('should block disallowed protocols', () => {
      expect(isValidProtocol('a', 'ftp://example.com', ['http', 'https'])).toBe(false)
      expect(isValidProtocol('a', 'file:///etc/passwd', ['http', 'https'])).toBe(false)
    })
  })

  describe('parseStyles', () => {
    test('should parse simple styles', () => {
      const result = parseStyles('color: red; font-size: 14px')
      expect(result.color).toBe('red')
      expect(result['font-size']).toBe('14px')
    })

    test('should handle empty values', () => {
      expect(parseStyles('')).toEqual({})
      expect(parseStyles(null)).toEqual({})
    })
  })

  describe('serializeStyles', () => {
    test('should serialize styles', () => {
      const serialized = serializeStyles({ color: 'red', 'font-size': '14px' })
      expect(serialized).toContain('color: red')
      expect(serialized).toContain('font-size: 14px')
    })
  })

  describe('sanitizeStyles', () => {
    test('should allow whitelisted styles', () => {
      const allowed = ['color', 'font-size']
      const result = sanitizeStyles('color: red; font-size: 14px; background: blue', allowed)
      expect(result).toContain('color: red')
      expect(result).toContain('font-size: 14px')
    })

    test('should block javascript: in styles', () => {
      const allowed = ['background']
      const result = sanitizeStyles('background: url(javascript:alert(1))', allowed)
      expect(result).toBe('')
    })

    test('should block expression()', () => {
      const allowed = ['width']
      const result = sanitizeStyles('width: expression(alert(1))', allowed)
      expect(result).toBe('')
    })
  })

  describe('sanitizeHtml', () => {
    test('should allow safe HTML tags', () => {
      const html = '<p><strong>Bold</strong> <em>Italic</em></p>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).toContain('<strong>')
      expect(result.sanitizedHtml).toContain('<em>')
    })

    test('should remove script tags (XSS vector 1)', () => {
      const html = '<p>Hello<script>alert("xss")</script>World</p>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('<script>')
      expect(result.isModified).toBe(true)
    })

    test('should remove script tags with uppercase (XSS vector 2)', () => {
      const html = '<SCRIPT>alert("xss")</SCRIPT>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('<script>')
      expect(result.sanitizedHtml).not.toContain('<SCRIPT>')
    })

    test('should remove on* event handlers (XSS vector 3)', () => {
      const html = '<img src="test.png" onclick="alert(1)" onerror="alert(2)">'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('onclick')
      expect(result.sanitizedHtml).not.toContain('onerror')
    })

    test('should block javascript: URLs in href (XSS vector 4)', () => {
      const html = '<a href="javascript:alert(1)">Click me</a>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('javascript:')
      expect(result.sanitizedHtml).toContain('<a>')
    })

    test('should block javascript: in src (XSS vector 5)', () => {
      const html = '<iframe src="javascript:alert(1)"></iframe>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('javascript:')
    })

    test('should add noopener to target=_blank links', () => {
      const html = '<a href="http://example.com" target="_blank">Link</a>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).toContain('noopener')
      expect(result.sanitizedHtml).toContain('noreferrer')
    })

    test('should allow safe http/https links', () => {
      const html = '<a href="https://example.com">Link</a>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).toContain('href="https://example.com"')
    })

    test('should allow mailto: links', () => {
      const html = '<a href="mailto:test@example.com">Email</a>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).toContain('mailto:')
    })

    test('should allow data: URIs in images', () => {
      const html = '<img src="data:image/png;base64,abc">'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).toContain('data:image/png;base64,abc')
    })

    test('should remove iframe, frame, frameset tags', () => {
      const html = '<div><iframe src="evil.com"></iframe></div>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('<iframe>')
    })

    test('should remove form action attributes', () => {
      const html = '<form action="evil.com"><input type="text"></form>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('action=')
    })

    test('should handle nested dangerous tags', () => {
      const html = '<div><p><script>alert(1)</script></p></div>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('alert(1)')
    })

    test('should handle null/undefined input', () => {
      expect(sanitizeHtml(null).success).toBe(false)
      expect(sanitizeHtml(undefined).success).toBe(false)
    })

    test('should preserve safe tables', () => {
      const html = '<table><tr><th>Header</th><td>Data</td></tr></table>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).toContain('<table>')
      expect(result.sanitizedHtml).toContain('<th>')
      expect(result.sanitizedHtml).toContain('<td>')
    })

    test('should strip disallowed attributes', () => {
      const html = '<div customAttr="value" title="safe">Content</div>'
      const result = sanitizeHtml(html)
      expect(result.success).toBe(true)
      expect(result.sanitizedHtml).not.toContain('customAttr')
      expect(result.sanitizedHtml).toContain('title="safe"')
    })
  })
})
