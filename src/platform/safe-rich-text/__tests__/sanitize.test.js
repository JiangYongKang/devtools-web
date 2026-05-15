import { describe, expect, test } from 'vitest'
import {
  ERROR_CODES,
  DEFAULT_WHITELIST,
  TAGS_TO_ALWAYS_REMOVE,
  UNKNOWN_TAG_POLICIES,
  SANITIZATION_MODES,
  OWASP_SAMPLES,
} from '../logic/constants.js'
import {
  escapeHtmlForDisplay,
  escapeHtmlForAttribute,
  isValidProtocol,
  isEventAttribute,
  htmlToPlainText,
  sanitizeRichText,
} from '../logic/index.js'

describe('constants module', () => {
  test('should define all required constants', () => {
    expect(ERROR_CODES).toBeDefined()
    expect(DEFAULT_WHITELIST).toBeDefined()
    expect(TAGS_TO_ALWAYS_REMOVE).toBeDefined()
    expect(UNKNOWN_TAG_POLICIES).toBeDefined()
    expect(SANITIZATION_MODES).toBeDefined()
    expect(OWASP_SAMPLES).toBeDefined()
  })

  test('should always remove dangerous tags', () => {
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('script')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('style')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('iframe')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('template')
    expect(TAGS_TO_ALWAYS_REMOVE).toContain('form')
  })

  test('should define sanitization modes', () => {
    expect(SANITIZATION_MODES.PLAIN_TEXT).toBe('plain_text')
    expect(SANITIZATION_MODES.WHITELIST).toBe('whitelist')
  })

  test('should define unknown tag policies', () => {
    expect(UNKNOWN_TAG_POLICIES.REMOVE).toBe('remove')
    expect(UNKNOWN_TAG_POLICIES.UNWRAP).toBe('unwrap')
  })

  test('should include OWASP XSS samples', () => {
    expect(OWASP_SAMPLES.basicXss).toBeDefined()
    expect(OWASP_SAMPLES.svgOnload).toBeDefined()
    expect(OWASP_SAMPLES.javascriptProtocol).toBeDefined()
    expect(OWASP_SAMPLES.dataTextHtml).toBeDefined()
    expect(OWASP_SAMPLES.eventHandler).toBeDefined()
  })

  test('default whitelist should not allow style attribute', () => {
    const globalAttrs = DEFAULT_WHITELIST.attributes['*'] || []
    expect(globalAttrs).not.toContain('style')
  })
})

describe('escape utilities', () => {
  test('escapeHtmlForDisplay should escape HTML special characters', () => {
    const html = '<div id="test">Content & "quotes"</div>'
    const escaped = escapeHtmlForDisplay(html)
    expect(escaped).not.toContain('<')
    expect(escaped).not.toContain('>')
    expect(escaped).toContain('&lt;')
    expect(escaped).toContain('&gt;')
    expect(escaped).toContain('&amp;')
    expect(escaped).toContain('&quot;')
  })

  test('escapeHtmlForAttribute should escape attribute values', () => {
    const value = 'test" onclick="alert(1)'
    const escaped = escapeHtmlForAttribute(value)
    expect(escaped).toContain('&quot;')
    expect(escaped).not.toContain('" onclick="')
  })

  test('escape functions should handle null/undefined', () => {
    expect(escapeHtmlForDisplay(null)).toBe('')
    expect(escapeHtmlForDisplay(undefined)).toBe('')
    expect(escapeHtmlForAttribute(null)).toBe('')
    expect(escapeHtmlForAttribute(undefined)).toBe('')
  })
})

describe('protocol validation', () => {
  test('should allow http and https protocols', () => {
    expect(isValidProtocol('a', 'http://example.com', ['http', 'https']).valid).toBe(true)
    expect(isValidProtocol('a', 'https://example.com', ['http', 'https']).valid).toBe(true)
  })

  test('should allow mailto protocol when specified', () => {
    expect(isValidProtocol('a', 'mailto:test@example.com', ['mailto']).valid).toBe(true)
  })

  test('should allow data:image/png URLs', () => {
    const result = isValidProtocol('img', 'data:image/png;base64,abc', ['data'])
    expect(result.valid).toBe(true)
  })

  test('should block javascript: protocol', () => {
    const result = isValidProtocol('a', 'javascript:alert(1)', ['http', 'https'])
    expect(result.valid).toBe(false)
  })

  test('should block data:text/html URLs', () => {
    const result = isValidProtocol('iframe', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', ['data'])
    expect(result.valid).toBe(false)
  })

  test('should allow relative URLs (no protocol)', () => {
    expect(isValidProtocol('a', '/path/to/page', ['http', 'https']).valid).toBe(true)
    expect(isValidProtocol('a', 'page.html', ['http', 'https']).valid).toBe(true)
  })

  test('should allow hash fragments', () => {
    expect(isValidProtocol('a', '#section', ['http']).valid).toBe(true)
  })

  test('should block disallowed protocols', () => {
    expect(isValidProtocol('a', 'ftp://example.com', ['http', 'https']).valid).toBe(false)
    expect(isValidProtocol('a', 'file:///etc/passwd', ['http', 'https']).valid).toBe(false)
  })

  test('should handle empty values', () => {
    expect(isValidProtocol('a', '', ['http']).valid).toBe(true)
    expect(isValidProtocol('a', null, ['http']).valid).toBe(true)
    expect(isValidProtocol('a', undefined, ['http']).valid).toBe(true)
  })
})

describe('event attribute detection', () => {
  test('should detect onclick, onerror, onload etc.', () => {
    expect(isEventAttribute('onclick')).toBe(true)
    expect(isEventAttribute('onerror')).toBe(true)
    expect(isEventAttribute('onload')).toBe(true)
    expect(isEventAttribute('onmouseover')).toBe(true)
    expect(isEventAttribute('onfocus')).toBe(true)
  })

  test('should be case insensitive', () => {
    expect(isEventAttribute('ONCLICK')).toBe(true)
    expect(isEventAttribute('OnError')).toBe(true)
  })

  test('should not flag non-event attributes', () => {
    expect(isEventAttribute('href')).toBe(false)
    expect(isEventAttribute('src')).toBe(false)
    expect(isEventAttribute('class')).toBe(false)
    expect(isEventAttribute('id')).toBe(false)
  })
})

describe('htmlToPlainText', () => {
  test('should extract text from simple HTML', () => {
    expect(htmlToPlainText('<p>Hello <strong>World</strong></p>')).toContain('Hello')
    expect(htmlToPlainText('<p>Hello <strong>World</strong></p>')).toContain('World')
  })

  test('should remove script and style contents', () => {
    const html = '<script>alert("xss")</script><style>body {}</style><p>Content</p>'
    const result = htmlToPlainText(html)
    expect(result).toContain('Content')
    expect(result).not.toContain('alert')
    expect(result).not.toContain('body {}')
  })

  test('should handle null/undefined', () => {
    expect(htmlToPlainText(null)).toBe('')
    expect(htmlToPlainText(undefined)).toBe('')
  })

  test('should decode HTML entities', () => {
    const result = htmlToPlainText('&amp;&nbsp;&lt;&gt;&quot;&#39;')
    expect(result).toContain('&')
  })
})

describe('sanitizeRichText - input validation', () => {
  test('should reject null input', () => {
    const result = sanitizeRichText(null)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.INVALID_INPUT)
  })

  test('should reject undefined input', () => {
    const result = sanitizeRichText(undefined)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.INVALID_INPUT)
  })

  test('should reject non-string input', () => {
    const result = sanitizeRichText({ html: '<p>test</p>' })
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.INVALID_INPUT)
  })

  test('should reject oversized HTML', () => {
    const largeHtml = '<div>' + 'a'.repeat(2000000) + '</div>'
    const result = sanitizeRichText(largeHtml, { maxSizeBytes: 1024 * 1024 })
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.CONTENT_TOO_LARGE)
  })

  test('should accept empty string', () => {
    const result = sanitizeRichText('')
    expect(result.safeHtml).toBe('')
  })
})

describe('sanitizeRichText - plain text mode', () => {
  test('should extract text content in plain text mode', () => {
    const html = '<p>Hello <script>alert(1)</script></p>'
    const result = sanitizeRichText(html, { mode: SANITIZATION_MODES.PLAIN_TEXT })
    expect(result.mode).toBe('plain_text')
    expect(result.safeHtml).not.toContain('<script>')
    expect(result.safeHtml).toContain('Hello')
    expect(result.strippedTags.length).toBeGreaterThan(0)
  })

  test('should extract text content in plain text mode', () => {
    const html = '<div><h1>Title</h1><p>Paragraph</p></div>'
    const result = sanitizeRichText(html, { mode: SANITIZATION_MODES.PLAIN_TEXT })
    expect(result.safeHtml).toContain('Title')
    expect(result.safeHtml).toContain('Paragraph')
  })
})

describe('sanitizeRichText - whitelist mode - safe content', () => {
  test('should allow safe HTML tags', () => {
    const html = '<p><strong>Bold</strong> <em>Italic</em></p>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).toContain('<strong>')
    expect(result.safeHtml).toContain('<em>')
    expect(result.strippedTags.length).toBe(0)
    expect(result.strippedAttrs.length).toBe(0)
  })

  test('should allow safe http/https links', () => {
    const html = '<a href="https://example.com">Link</a>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).toContain('href="https://example.com"')
  })

  test('should allow mailto links', () => {
    const html = '<a href="mailto:test@example.com">Email</a>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).toContain('mailto:test@example.com')
  })

  test('should preserve safe tables', () => {
    const html = '<table><tr><th>Header</th><td>Data</td></tr></table>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).toContain('<table>')
    expect(result.safeHtml).toContain('<th>')
    expect(result.safeHtml).toContain('<td>')
  })

  test('should add noopener to target=_blank links', () => {
    const html = '<a href="http://example.com" target="_blank">Link</a>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).toContain('noopener')
    expect(result.safeHtml).toContain('noreferrer')
  })
})

describe('sanitizeRichText - whitelist mode - XSS protection', () => {
  test('should remove script tags (OWASP basic XSS)', () => {
    const result = sanitizeRichText(OWASP_SAMPLES.basicXss)
    expect(result.safeHtml).not.toContain('<script>')
    expect(result.strippedTags.some(t => t.tag === 'script')).toBe(true)
  })

  test('should remove script tags with uppercase', () => {
    const result = sanitizeRichText(OWASP_SAMPLES.mixedCase)
    expect(result.safeHtml).not.toContain('<script>')
    expect(result.safeHtml).not.toContain('<SCRIPT>')
  })

  test('should remove on* event handlers', () => {
    const result = sanitizeRichText(OWASP_SAMPLES.eventHandler)
    expect(result.safeHtml).not.toContain('onerror')
    expect(result.strippedAttrs.some(a => a.reason === 'event_attribute')).toBe(true)
  })

  test('should block javascript: URLs in href', () => {
    const result = sanitizeRichText(OWASP_SAMPLES.javascriptProtocol)
    expect(result.safeHtml).not.toContain('javascript:')
    expect(result.strippedAttrs.some(a => a.attribute === 'href')).toBe(true)
  })

  test('should block data:text/html URLs', () => {
    const result = sanitizeRichText(OWASP_SAMPLES.dataTextHtml)
    expect(result.safeHtml).not.toContain('data:text/html')
    expect(result.strippedTags.some(t => t.tag === 'iframe')).toBe(true)
  })

  test('should remove style attributes', () => {
    const result = sanitizeRichText(OWASP_SAMPLES.styleAttribute)
    expect(result.safeHtml).not.toContain('style=')
    expect(result.strippedAttrs.some(a => a.reason === 'style_attribute_not_allowed')).toBe(true)
  })

  test('should remove iframe tags', () => {
    const html = '<div><iframe src="evil.com"></iframe></div>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).not.toContain('<iframe')
    expect(result.strippedTags.some(t => t.tag === 'iframe')).toBe(true)
  })

  test('should remove template tags', () => {
    const html = '<template><script>alert(1)</script></template>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).not.toContain('<template')
    expect(result.strippedTags.some(t => t.tag === 'template')).toBe(true)
  })

  test('should remove form tags', () => {
    const html = '<form action="evil.com"><input type="text"></form>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).not.toContain('<form')
    expect(result.strippedTags.some(t => t.tag === 'form')).toBe(true)
  })

  test('should strip disallowed attributes', () => {
    const html = '<div customAttr="value" title="safe">Content</div>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).not.toContain('customAttr')
    expect(result.safeHtml).toContain('title="safe"')
    expect(result.strippedAttrs.some(a => a.attribute === 'customattr')).toBe(true)
  })

  test('should handle nested dangerous tags', () => {
    const html = '<div><p><script>alert(1)</script></p></div>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).not.toContain('alert(1)')
    expect(result.strippedTags.some(t => t.tag === 'script')).toBe(true)
  })
})

describe('sanitizeRichText - unknown tag policy', () => {
  test('should strip unknown tags by default', () => {
    const html = '<custom-tag>Content</custom-tag>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).not.toContain('<custom-tag')
    expect(result.safeHtml).not.toContain('</custom-tag')
    expect(result.strippedTags.some(t => t.tag === 'custom-tag')).toBe(true)
  })

  test('should unwrap unknown tags when policy is UNWRAP', () => {
    const html = '<custom-tag>Content</custom-tag>'
    const result = sanitizeRichText(html, { unknownTagPolicy: UNKNOWN_TAG_POLICIES.UNWRAP })
    expect(result.safeHtml).not.toContain('<custom-tag')
    expect(result.safeHtml).toContain('Content')
    expect(result.strippedTags.some(t => t.tag === 'custom-tag')).toBe(true)
  })
})

describe('sanitizeRichText - diagnostics', () => {
  test('should return stripped tags with reasons', () => {
    const html = '<script>alert(1)</script>'
    const result = sanitizeRichText(html)
    expect(result.strippedTags.length).toBeGreaterThan(0)
    expect(result.strippedTags[0].tag).toBe('script')
    expect(result.strippedTags[0].reason).toBeDefined()
  })

  test('should return stripped attributes with reasons', () => {
    const html = '<div onclick="alert(1)" style="color:red">Test</div>'
    const result = sanitizeRichText(html)
    expect(result.strippedAttrs.length).toBeGreaterThan(0)
    expect(result.strippedAttrs.some(a => a.reason === 'event_attribute')).toBe(true)
    expect(result.strippedAttrs.some(a => a.reason === 'style_attribute_not_allowed')).toBe(true)
  })

  test('should have empty stripped arrays for safe content', () => {
    const html = '<p><strong>Safe</strong></p>'
    const result = sanitizeRichText(html)
    expect(result.strippedTags.length).toBe(0)
  })

  test('should return correct output structure', () => {
    const result = sanitizeRichText('<p>Test</p>')
    expect(result).toHaveProperty('safeHtml')
    expect(result).toHaveProperty('strippedTags')
    expect(result).toHaveProperty('strippedAttrs')
    expect(result).toHaveProperty('errors')
    expect(Array.isArray(result.strippedTags)).toBe(true)
    expect(Array.isArray(result.strippedAttrs)).toBe(true)
    expect(Array.isArray(result.errors)).toBe(true)
  })
})

describe('sanitizeRichText - URL validation edge cases', () => {
  test('should block hex-encoded javascript protocol', () => {
    const result = sanitizeRichText(OWASP_SAMPLES.hexEncoded)
    expect(result.strippedAttrs.length).toBeGreaterThan(0)
  })

  test('should block vbscript protocol', () => {
    const html = '<a href="vbscript:msgbox(1)">Click</a>'
    const result = sanitizeRichText(html)
    expect(result.safeHtml).not.toContain('vbscript:')
  })

  test('should block javascript with whitespace', () => {
    const html = '<a href=" javascript:alert(1)">Click</a>'
    const result = sanitizeRichText(html)
    expect(result.strippedAttrs.length).toBeGreaterThan(0)
  })
})
