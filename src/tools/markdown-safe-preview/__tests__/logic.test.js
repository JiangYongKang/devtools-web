import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import {
  SECURITY_POLICY_VERSION,
  MAX_SOURCE_LENGTH,
  ALLOWED_PROTOCOLS,
  ERROR_CODES,
  ERROR_MESSAGES,
  SANITIZATION_NOTES_MAP,
  escapeHtml,
  getSourceSummary,
  getSanitizationNotes,
  getSecurityPolicyInfo,
  getErrorMessage,
  validateInput,
  tokenizeMarkdown,
  simpleMarkdownRender,
  sanitizeHtml,
  processMarkdown,
  isAllowedProtocol,
} from '../logic/index.js'

describe('markdown-safe-preview logic', () => {
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
    test('SECURITY_POLICY_VERSION should be a semantic version string', () => {
      expect(typeof SECURITY_POLICY_VERSION).toBe('string')
      expect(SECURITY_POLICY_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    })

    test('MAX_SOURCE_LENGTH should be a positive number', () => {
      expect(typeof MAX_SOURCE_LENGTH).toBe('number')
      expect(MAX_SOURCE_LENGTH).toBeGreaterThan(0)
    })

    test('ALLOWED_PROTOCOLS should contain safe protocols only', () => {
      expect(ALLOWED_PROTOCOLS).toBeInstanceOf(Array)
      expect(ALLOWED_PROTOCOLS).toContain('http:')
      expect(ALLOWED_PROTOCOLS).toContain('https:')
      expect(ALLOWED_PROTOCOLS).not.toContain('javascript:')
      expect(ALLOWED_PROTOCOLS).not.toContain('data:')
    })

    test('ERROR_CODES should include all required error types', () => {
      expect(ERROR_CODES.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CODES.SOURCE_EMPTY).toBe('SOURCE_EMPTY')
      expect(ERROR_CODES.SOURCE_TOO_LARGE).toBe('SOURCE_TOO_LARGE')
      expect(ERROR_CODES.SANITIZATION_FAILED).toBe('SANITIZATION_FAILED')
      expect(ERROR_CODES.INVALID_PARAMETER).toBe('INVALID_PARAMETER')
    })

    test('ERROR_MESSAGES should map error codes to readable messages', () => {
      for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
        expect(message).toContain(code)
      }
    })

    test('SANITIZATION_NOTES_MAP should include common sanitization notes', () => {
      expect(SANITIZATION_NOTES_MAP['script_removed']).toBeDefined()
      expect(SANITIZATION_NOTES_MAP['style_removed']).toBeDefined()
      expect(SANITIZATION_NOTES_MAP['javascript_protocol_removed']).toBeDefined()
      expect(SANITIZATION_NOTES_MAP['event_handler_removed']).toBeDefined()
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
      })

      test('should prevent XSS by escaping special characters', () => {
        const xss = '<script>alert("xss")</script>'
        const escaped = escapeHtml(xss)
        expect(escaped).not.toContain('<script>')
        expect(escaped).toContain('&lt;script&gt;')
      })

      test('should return original string if no special characters', () => {
        expect(escapeHtml('hello world')).toBe('hello world')
        expect(escapeHtml('')).toBe('')
      })
    })

    describe('isAllowedProtocol', () => {
      test('should allow http protocol', () => {
        expect(isAllowedProtocol('http://example.com')).toBe(true)
      })

      test('should allow https protocol', () => {
        expect(isAllowedProtocol('https://example.com')).toBe(true)
      })

      test('should allow mailto protocol', () => {
        expect(isAllowedProtocol('mailto:test@example.com')).toBe(true)
      })

      test('should allow tel protocol', () => {
        expect(isAllowedProtocol('tel:+1234567890')).toBe(true)
      })

      test('should allow relative URLs', () => {
        expect(isAllowedProtocol('/path/to/page')).toBe(true)
        expect(isAllowedProtocol('#section')).toBe(true)
      })

      test('should block javascript protocol', () => {
        expect(isAllowedProtocol('javascript:alert(1)')).toBe(false)
      })

      test('should block data protocol', () => {
        expect(isAllowedProtocol('data:text/html,<script>alert(1)</script>')).toBe(false)
      })

      test('should block vbscript protocol', () => {
        expect(isAllowedProtocol('vbscript:MsgBox("xss")')).toBe(false)
      })

      test('should handle empty string', () => {
        expect(isAllowedProtocol('')).toBe(false)
      })

      test('should handle whitespace', () => {
        expect(isAllowedProtocol('  https://example.com  ')).toBe(true)
      })
    })

    describe('getSourceSummary', () => {
      test('should return empty string for null or undefined', () => {
        expect(getSourceSummary(null)).toBe('')
        expect(getSourceSummary(undefined)).toBe('')
      })

      test('should return full string if shorter than max length', () => {
        expect(getSourceSummary('short text', 100)).toBe('short text')
      })

      test('should truncate and add ellipsis for long text', () => {
        const longText = 'a'.repeat(200)
        const summary = getSourceSummary(longText, 100)
        expect(summary.length).toBe(103)
        expect(summary.endsWith('...')).toBe(true)
      })

      test('should trim whitespace', () => {
        expect(getSourceSummary('   trimmed   ')).toBe('trimmed')
      })
    })

    describe('getSanitizationNotes', () => {
      test('should return empty array for empty input', () => {
        expect(getSanitizationNotes([])).toEqual([])
        expect(getSanitizationNotes()).toEqual([])
      })

      test('should ignore unknown note keys', () => {
        const notes = ['unknown_key', 'script_removed', 'another_unknown']
        const result = getSanitizationNotes(notes)
        expect(result).toHaveLength(1)
        expect(result[0].key).toBe('script_removed')
        expect(result[0].message).toBe(SANITIZATION_NOTES_MAP['script_removed'])
      })

      test('should map known keys to messages', () => {
        const notes = ['script_removed', 'javascript_protocol_removed']
        const result = getSanitizationNotes(notes)
        expect(result).toHaveLength(2)
        expect(result[0].key).toBe('script_removed')
        expect(result[1].key).toBe('javascript_protocol_removed')
      })
    })

    describe('getSecurityPolicyInfo', () => {
      test('should return object with all required fields', () => {
        const info = getSecurityPolicyInfo()
        expect(info.policyVersion).toBeDefined()
        expect(info.securityPolicyVersion).toBeDefined()
        expect(info.maxSourceLength).toBeDefined()
        expect(info.allowedProtocols).toBeInstanceOf(Array)
        expect(info.allowedTags).toBeInstanceOf(Array)
        expect(info.allowedAttributes).toBeInstanceOf(Array)
      })

      test('should return consistent values across calls', () => {
        const info1 = getSecurityPolicyInfo()
        const info2 = getSecurityPolicyInfo()
        expect(info1).toEqual(info2)
      })
    })

    describe('getErrorMessage', () => {
      test('should return correct message for known error codes', () => {
        expect(getErrorMessage(ERROR_CODES.NULL_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.NULL_INPUT])
        expect(getErrorMessage(ERROR_CODES.SOURCE_EMPTY)).toBe(ERROR_MESSAGES[ERROR_CODES.SOURCE_EMPTY])
      })

      test('should return default message for unknown error codes', () => {
        const message = getErrorMessage('UNKNOWN_CODE')
        expect(message).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_PARAMETER])
      })
    })
  })

  describe('validation', () => {
    describe('validateInput', () => {
      test('should reject null input', () => {
        const result = validateInput(null)
        expect(result.valid).toBe(false)
        expect(result.code).toBe(ERROR_CODES.NULL_INPUT)
      })

      test('should reject undefined input', () => {
        const result = validateInput(undefined)
        expect(result.valid).toBe(false)
        expect(result.code).toBe(ERROR_CODES.NULL_INPUT)
      })

      test('should reject non-string input', () => {
        expect(validateInput(123).valid).toBe(false)
        expect(validateInput({}).valid).toBe(false)
        expect(validateInput([]).valid).toBe(false)
      })

      test('should reject empty string', () => {
        expect(validateInput('').valid).toBe(false)
        expect(validateInput('   ').valid).toBe(false)
      })

      test('should reject input exceeding max length', () => {
        const longInput = 'a'.repeat(MAX_SOURCE_LENGTH + 1)
        const result = validateInput(longInput)
        expect(result.valid).toBe(false)
        expect(result.code).toBe(ERROR_CODES.SOURCE_TOO_LARGE)
      })

      test('should accept valid input', () => {
        const result = validateInput('Hello World')
        expect(result.valid).toBe(true)
        expect(result.code).toBeUndefined()
      })

      test('should accept input at exactly max length', () => {
        const input = 'a'.repeat(MAX_SOURCE_LENGTH)
        const result = validateInput(input)
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('markdown rendering', () => {
    describe('tokenizeMarkdown', () => {
      test('should tokenize simple paragraph', () => {
        const tokens = tokenizeMarkdown('Hello World')
        expect(tokens).toBeInstanceOf(Array)
        expect(tokens.length).toBeGreaterThan(0)
        expect(tokens[0].type).toBe('paragraph')
        expect(tokens[0].content).toBe('Hello World')
      })

      test('should tokenize headings', () => {
        const tokens = tokenizeMarkdown('# Heading 1\n## Heading 2')
        expect(tokens.some(t => t.type === 'heading' && t.level === 1)).toBe(true)
        expect(tokens.some(t => t.type === 'heading' && t.level === 2)).toBe(true)
      })

      test('should tokenize code blocks', () => {
        const tokens = tokenizeMarkdown('```\ncode\n```')
        expect(tokens.some(t => t.type === 'code_block_start')).toBe(true)
        expect(tokens.some(t => t.type === 'code_line')).toBe(true)
        expect(tokens.some(t => t.type === 'code_block_end')).toBe(true)
      })

      test('should tokenize lists', () => {
        const tokens = tokenizeMarkdown('- Item 1\n- Item 2\n1. Numbered')
        const listItems = tokens.filter(t => t.type === 'list_item')
        expect(listItems.length).toBe(3)
        expect(listItems[0].ordered).toBe(false)
        expect(listItems[2].ordered).toBe(true)
      })

      test('should tokenize blockquotes', () => {
        const tokens = tokenizeMarkdown('> This is a quote')
        expect(tokens.some(t => t.type === 'blockquote_start')).toBe(true)
        expect(tokens.some(t => t.type === 'blockquote_end')).toBe(true)
      })

      test('should tokenize horizontal rules', () => {
        const tokens = tokenizeMarkdown('---\n***\n___')
        const hrs = tokens.filter(t => t.type === 'horizontal_rule')
        expect(hrs.length).toBe(3)
      })
    })

    describe('simpleMarkdownRender', () => {
      test('should render paragraph', () => {
        const html = simpleMarkdownRender('Hello')
        expect(html).toContain('<p>')
        expect(html).toContain('Hello')
      })

      test('should render headings', () => {
        const html = simpleMarkdownRender('# H1')
        expect(html).toContain('<h1>')
        expect(html).toContain('H1')
      })

      test('should render bold text', () => {
        const html = simpleMarkdownRender('**bold**')
        expect(html).toContain('<strong>')
      })

      test('should render italic text', () => {
        const html = simpleMarkdownRender('*italic*')
        expect(html).toContain('<em>')
      })

      test('should render inline code', () => {
        const html = simpleMarkdownRender('`code`')
        expect(html).toContain('<code>')
        expect(html).toContain('code')
      })

      test('should render unordered lists', () => {
        const html = simpleMarkdownRender('- item 1\n- item 2')
        expect(html).toContain('<ul>')
        expect(html).toContain('</ul>')
        expect(html).toContain('<li>')
      })

      test('should render ordered lists', () => {
        const html = simpleMarkdownRender('1. first\n2. second')
        expect(html).toContain('<ol>')
        expect(html).toContain('</ol>')
      })

      test('should render blockquotes', () => {
        const html = simpleMarkdownRender('> quote')
        expect(html).toContain('<blockquote>')
        expect(html).toContain('</blockquote>')
      })

      test('should render code blocks', () => {
        const html = simpleMarkdownRender('```\ncode block\n```')
        expect(html).toContain('<pre>')
        expect(html).toContain('<code>')
        expect(html).toContain('code block')
      })

      test('should render links', () => {
        const html = simpleMarkdownRender('[link](https://example.com)')
        expect(html).toContain('<a href=')
        expect(html).toContain('https://example.com')
        expect(html).toContain('link')
      })

      test('should render images', () => {
        const html = simpleMarkdownRender('![alt](https://example.com/img.png)')
        expect(html).toContain('<img src=')
        expect(html).toContain('alt="alt"')
      })

      test('should return empty string for empty input', () => {
        expect(simpleMarkdownRender('')).toBe('')
        expect(simpleMarkdownRender('   ')).toBe('')
      })

      test('should render tables', () => {
        const md = `| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |`
        const html = simpleMarkdownRender(md)
        expect(html).toContain('<table>')
        expect(html).toContain('<thead>')
        expect(html).toContain('<tbody>')
        expect(html).toContain('<th>')
        expect(html).toContain('<td>')
        expect(html).toContain('Header 1')
        expect(html).toContain('Header 2')
        expect(html).toContain('Cell 1')
        expect(html).toContain('Cell 2')
      })

      test('should render tables with multiple rows', () => {
        const md = `| A | B |
| --- | --- |
| 1 | 2 |
| 3 | 4 |
| 5 | 6 |`
        const html = simpleMarkdownRender(md)
        expect(html).toContain('<table>')
        const tdCount = (html.match(/<td>/g) || []).length
        expect(tdCount).toBe(6)
      })

      test('should parse inline markdown in table cells', () => {
        const md = `| Name | Status |
| --- | --- |
| **Bold** | *Italic* |`
        const html = simpleMarkdownRender(md)
        expect(html).toContain('<strong>')
        expect(html).toContain('<em>')
      })
    })
  })

  describe('html sanitization', () => {
    describe('sanitizeHtml', () => {
      test('should allow safe tags', () => {
        const notes = []
        const result = sanitizeHtml('<p>test</p>', notes)
        expect(result).toContain('<p>')
        expect(result).toContain('test')
        expect(notes).toHaveLength(0)
      })

      test('should remove script tags and content', () => {
        const notes = []
        const result = sanitizeHtml('<script>alert(1)</script><p>safe</p>', notes)
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('alert')
        expect(result).toContain('<p>')
        expect(notes).toContain('script_removed')
      })

      test('should remove style tags', () => {
        const notes = []
        const result = sanitizeHtml('<style>body{}</style><p>text</p>', notes)
        expect(result).not.toContain('<style>')
        expect(notes).toContain('style_removed')
      })

      test('should remove iframe tags', () => {
        const notes = []
        const result = sanitizeHtml('<iframe src="evil"></iframe>', notes)
        expect(result).not.toContain('<iframe')
        expect(notes).toContain('iframe_removed')
      })

      test('should remove event handlers', () => {
        const notes = []
        const result = sanitizeHtml('<a href="#" onclick="alert(1)">link</a>', notes)
        expect(result).not.toContain('onclick')
        expect(result).not.toContain('alert')
        expect(notes).toContain('event_handler_removed')
      })

      test('should remove javascript protocol links', () => {
        const notes = []
        const result = sanitizeHtml('<a href="javascript:alert(1)">xss</a>', notes)
        expect(result).not.toContain('javascript:')
        expect(result).not.toContain('alert')
        expect(notes).toContain('javascript_protocol_removed')
      })

      test('should remove inline style attributes', () => {
        const notes = []
        const result = sanitizeHtml('<p style="color: red">text</p>', notes)
        expect(result).not.toContain('style=')
        expect(notes).toContain('inline_style_removed')
      })

      test('should preserve safe links', () => {
        const notes = []
        const result = sanitizeHtml('<a href="https://example.com">link</a>', notes)
        expect(result).toContain('href="https://example.com"')
        expect(notes).toHaveLength(0)
      })

      test('should preserve mailto protocol', () => {
        const notes = []
        const result = sanitizeHtml('<a href="mailto:test@example.com">mail</a>', notes)
        expect(result).toContain('href="mailto:test@example.com"')
        expect(notes).toHaveLength(0)
      })

      test('should handle multiple dangerous elements', () => {
        const notes = []
        const html = '<script>alert(1)</script><a href="javascript:x()">bad</a><iframe></iframe>'
        const result = sanitizeHtml(html, notes)
        expect(result).not.toContain('<script>')
        expect(result).not.toContain('javascript:')
        expect(result).not.toContain('<iframe')
        expect(notes).toContain('script_removed')
        expect(notes).toContain('javascript_protocol_removed')
        expect(notes).toContain('iframe_removed')
      })

      test('should escape plain text', () => {
        const notes = []
        const result = sanitizeHtml('plain & text <with> chars', notes)
        expect(result).toContain('&amp;')
        expect(result).toContain('&lt;')
        expect(result).toContain('&gt;')
      })
    })
  })

  describe('processMarkdown', () => {
    test('should process valid markdown successfully', () => {
      const result = processMarkdown('# Test\n\nHello **World**')
      expect(result.success).toBe(true)
      expect(result.previewHtml).toBeDefined()
      expect(result.sourceLength).toBeGreaterThan(0)
      expect(result.securityPolicyVersion).toBeDefined()
      expect(result.maxSourceLength).toBeDefined()
    })

    test('should return error for null input', () => {
      const result = processMarkdown(null)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      expect(result.previewHtml).toBe('')
      expect(result.securityPolicyVersion).toBeDefined()
    })

    test('should return error for empty input', () => {
      const result = processMarkdown('')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SOURCE_EMPTY)
    })

    test('should return error for whitespace-only input', () => {
      const result = processMarkdown('   \n\n\t')
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SOURCE_EMPTY)
    })

    test('should return error for oversized input', () => {
      const longInput = 'a'.repeat(MAX_SOURCE_LENGTH + 1)
      const result = processMarkdown(longInput)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.SOURCE_TOO_LARGE)
    })

    test('should include source summary in result', () => {
      const md = '# This is a longer markdown title that should be truncated'
      const result = processMarkdown(md)
      expect(result.sourceSummary).toBeDefined()
      expect(typeof result.sourceSummary).toBe('string')
    })

    test('should include length information', () => {
      const md = 'Hello World'
      const result = processMarkdown(md)
      expect(result.sourceLength).toBe(md.length)
      expect(typeof result.renderedLength).toBe('number')
    })

    test('should include sanitization notes when dangerous content is removed', () => {
      const md = '<script>alert(1)</script>\n\nNormal text'
      const result = processMarkdown(md)
      expect(result.sanitizationNotes).toBeInstanceOf(Array)
      expect(result.sanitizationNotes.length).toBeGreaterThan(0)
    })

    test('should have empty sanitization notes for clean content', () => {
      const md = '# Clean Content\n\nThis is safe.'
      const result = processMarkdown(md)
      expect(result.sanitizationNotes).toHaveLength(0)
    })

    test('should remove dangerous content from markdown output', () => {
      const md = 'Click [here](javascript:alert(1)) to hack'
      const result = processMarkdown(md)
      expect(result.previewHtml).not.toContain('javascript:')
      expect(result.previewHtml).not.toContain('alert(1)')
    })

    test('should handle edge case of very long lines', () => {
      const longLine = 'x'.repeat(10000)
      const result = processMarkdown(longLine)
      expect(result.success).toBe(true)
      expect(result.previewHtml).toBeDefined()
    })

    test('should escape HTML in code blocks', () => {
      const md = '```\n<script>test</script>\n```'
      const result = processMarkdown(md)
      expect(result.previewHtml).toContain('&lt;script&gt;')
      expect(result.previewHtml).not.toContain('<script>')
    })

    test('should return error message in error case', () => {
      const result = processMarkdown('')
      expect(result.errorMessage).toBeDefined()
      expect(typeof result.errorMessage).toBe('string')
      expect(result.errorMessage.length).toBeGreaterThan(0)
    })

    test('should maintain security policy info even in error case', () => {
      const result = processMarkdown('')
      expect(result.securityPolicyVersion).toBeDefined()
      expect(result.maxSourceLength).toBe(MAX_SOURCE_LENGTH)
      expect(result.allowedProtocols).toBeDefined()
    })
  })
})
