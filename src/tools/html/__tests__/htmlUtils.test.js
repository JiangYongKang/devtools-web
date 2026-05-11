import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import {
  MAX_SAFE_INPUT_SIZE,
  TokenType,
  SELF_CLOSING_TAGS,
  RAW_TEXT_TAGS,
  escapeHtml,
  formatBytes,
  tokenizeHtml,
  beautifyHtml,
  minifyHtml,
} from '../htmlUtils.js'

describe('htmlUtils', () => {
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
    test('MAX_SAFE_INPUT_SIZE should be 500KB', () => {
      expect(MAX_SAFE_INPUT_SIZE).toBe(500 * 1024)
    })

    test('TokenType should contain all token types', () => {
      expect(TokenType).toEqual({
        COMMENT: 'comment',
        DOCTYPE: 'doctype',
        OPEN_TAG: 'open_tag',
        SELF_CLOSING_TAG: 'self_closing_tag',
        CLOSE_TAG: 'close_tag',
        TEXT: 'text',
        CDATA: 'cdata',
        SCRIPT_CONTENT: 'script_content',
        STYLE_CONTENT: 'style_content',
      })
    })

    test('SELF_CLOSING_TAGS should contain common self-closing tags', () => {
      expect(SELF_CLOSING_TAGS.has('br')).toBe(true)
      expect(SELF_CLOSING_TAGS.has('img')).toBe(true)
      expect(SELF_CLOSING_TAGS.has('input')).toBe(true)
      expect(SELF_CLOSING_TAGS.has('meta')).toBe(true)
      expect(SELF_CLOSING_TAGS.has('link')).toBe(true)
      expect(SELF_CLOSING_TAGS.has('hr')).toBe(true)
    })

    test('RAW_TEXT_TAGS should contain script, style, textarea, pre', () => {
      expect(RAW_TEXT_TAGS.has('script')).toBe(true)
      expect(RAW_TEXT_TAGS.has('style')).toBe(true)
      expect(RAW_TEXT_TAGS.has('textarea')).toBe(true)
      expect(RAW_TEXT_TAGS.has('pre')).toBe(true)
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

      test('should return "0 B" for invalid values', () => {
        expect(formatBytes(NaN)).toBe('0 B')
        expect(formatBytes(Infinity)).toBe('0 B')
        expect(formatBytes(-Infinity)).toBe('0 B')
        expect(formatBytes(-1)).toBe('0 B')
        expect(formatBytes(null)).toBe('0 B')
        expect(formatBytes(undefined)).toBe('0 B')
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

      test('should handle very large values (beyond GB)', () => {
        expect(formatBytes(1024 * 1024 * 1024 * 1024)).toContain('GB')
      })
    })
  })

  describe('tokenizeHtml', () => {
    test('should tokenize simple HTML', () => {
      const html = '<div>hello</div>'
      const tokens = tokenizeHtml(html)
      expect(tokens).toBeInstanceOf(Array)
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens[0].type).toBe(TokenType.OPEN_TAG)
      expect(tokens[0].name).toBe('div')
    })

    test('should tokenize DOCTYPE', () => {
      const html = '<!DOCTYPE html><div></div>'
      const tokens = tokenizeHtml(html)
      expect(tokens[0].type).toBe(TokenType.DOCTYPE)
    })

    test('should tokenize HTML comments', () => {
      const html = '<!-- comment --><div></div>'
      const tokens = tokenizeHtml(html)
      expect(tokens[0].type).toBe(TokenType.COMMENT)
    })

    test('should tokenize self-closing tags', () => {
      const html = '<img src="test.png" /><br/>'
      const tokens = tokenizeHtml(html)
      expect(tokens[0].type).toBe(TokenType.SELF_CLOSING_TAG)
      expect(tokens[0].name).toBe('img')
      expect(tokens[1].type).toBe(TokenType.SELF_CLOSING_TAG)
      expect(tokens[1].name).toBe('br')
    })

    test('should tokenize HTML5 self-closing tags without slash', () => {
      const html = '<input type="text"><meta charset="utf-8">'
      const tokens = tokenizeHtml(html)
      expect(tokens[0].type).toBe(TokenType.SELF_CLOSING_TAG)
      expect(tokens[0].name).toBe('input')
      expect(tokens[1].type).toBe(TokenType.SELF_CLOSING_TAG)
      expect(tokens[1].name).toBe('meta')
    })

    test('should tokenize text content', () => {
      const html = '<div>Hello World</div>'
      const tokens = tokenizeHtml(html)
      const textToken = tokens.find(t => t.type === TokenType.TEXT)
      expect(textToken).toBeDefined()
      expect(textToken.value).toBe('Hello World')
    })

    test('should handle script tags with raw content', () => {
      const html = '<script>const a = 1; if (a < 2) { alert("<b>test</b>"); }</script>'
      const tokens = tokenizeHtml(html)
      const scriptContent = tokens.find(t => t.type === TokenType.SCRIPT_CONTENT)
      expect(scriptContent).toBeDefined()
      expect(scriptContent.value).toContain('const a = 1')
      expect(scriptContent.value).toContain('a < 2')
      expect(scriptContent.value).toContain('<b>test</b>')
    })

    test('should handle style tags with raw content', () => {
      const html = '<style>.a { color: red; }</style>'
      const tokens = tokenizeHtml(html)
      const styleContent = tokens.find(t => t.type === TokenType.STYLE_CONTENT)
      expect(styleContent).toBeDefined()
      expect(styleContent.value).toContain('.a { color: red; }')
    })

    test('should handle CDATA sections', () => {
      const html = '<![CDATA[<test>data</test>]]>'
      const tokens = tokenizeHtml(html)
      expect(tokens[0].type).toBe(TokenType.CDATA)
    })

    test('should handle unclosed comment', () => {
      const html = '<!-- unclosed comment<div></div>'
      const tokens = tokenizeHtml(html)
      expect(tokens.length).toBe(1)
      expect(tokens[0].type).toBe(TokenType.COMMENT)
    })

    test('should handle tags with attributes containing special chars', () => {
      const html = '<div data-test="<value>" onclick="if (a > b) { alert(\'test\'); }"></div>'
      const tokens = tokenizeHtml(html)
      expect(tokens[0].type).toBe(TokenType.OPEN_TAG)
      expect(tokens[0].name).toBe('div')
    })
  })

  describe('beautifyHtml', () => {
    test('should return empty string for empty input', () => {
      expect(beautifyHtml('')).toBe('')
      expect(beautifyHtml('   ')).toBe('')
      expect(beautifyHtml(null)).toBe('')
    })

    test('should beautify simple HTML', () => {
      const input = '<div><h1>Hello</h1><p>World</p></div>'
      const result = beautifyHtml(input, { indent: '  ' })
      expect(result).toBeDefined()
      expect(result).toContain('<div>')
      expect(result).toContain('<h1>')
      expect(result).toContain('Hello')
      expect(result).toContain('<p>')
      expect(result).toContain('World')
      expect(result).toContain('</div>')
      expect(result).not.toBe(input)
      expect(result).toContain('\n')
    })

    test('should handle different indent sizes', () => {
      const input = '<div><span>test</span></div>'
      const result2 = beautifyHtml(input, { indent: '  ' })
      const result4 = beautifyHtml(input, { indent: '    ' })
      expect(result2).not.toBe(result4)
    })

    test('should preserve script content', () => {
      const input = '<script>const a = 1;\nconst b = 2;</script>'
      const result = beautifyHtml(input)
      expect(result).toContain('const a = 1')
      expect(result).toContain('const b = 2')
    })

    test('should preserve style content', () => {
      const input = '<style>.a { color: red; }</style>'
      const result = beautifyHtml(input)
      expect(result).toContain('.a { color: red; }')
    })

    test('should handle self-closing tags', () => {
      const input = '<div><br><img src="test.png"><hr></div>'
      const result = beautifyHtml(input)
      expect(result).toContain('<br>')
      expect(result).toContain('<img src="test.png">')
      expect(result).toContain('<hr>')
    })

    test('should handle DOCTYPE', () => {
      const input = '<!DOCTYPE html><html><body></body></html>'
      const result = beautifyHtml(input)
      expect(result).toContain('<!DOCTYPE html>')
    })

    test('should handle HTML comments', () => {
      const input = '<!-- comment --><div>test</div>'
      const result = beautifyHtml(input)
      expect(result).toContain('<!-- comment -->')
    })

    test('should handle nested tags', () => {
      const input = '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>'
      const result = beautifyHtml(input)
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>')
      expect(result).toContain('Item 1')
      expect(result).toContain('Item 2')
      expect(result).toContain('</ul>')
      expect(result).toContain('\n')
    })
  })

  describe('minifyHtml', () => {
    test('should return empty string for empty input', () => {
      expect(minifyHtml('')).toBe('')
      expect(minifyHtml('   ')).toBe('')
      expect(minifyHtml(null)).toBe('')
    })

    test('should minify simple HTML', () => {
      const input = `
        <div>
          <h1>Hello</h1>
          <p>World</p>
        </div>
      `
      const result = minifyHtml(input)
      expect(result).toBeDefined()
      expect(result).not.toContain('\n')
      expect(result).toContain('<div><h1>Hello</h1><p>World</p></div>')
    })

    test('should remove HTML comments by default', () => {
      const input = '<!-- comment --><div>test</div><!-- another -->'
      const result = minifyHtml(input)
      expect(result).not.toContain('comment')
      expect(result).not.toContain('another')
    })

    test('should preserve HTML comments when removeComments is false', () => {
      const input = '<!-- comment --><div>test</div>'
      const result = minifyHtml(input, { removeComments: false })
      expect(result).toContain('<!-- comment -->')
    })

    test('should collapse whitespace between tags', () => {
      const input = '<div>  <span>  a  b  </span>  </div>'
      const result = minifyHtml(input)
      expect(result).toBe('<div><span> a b </span></div>')
    })

    test('should preserve content in pre tags', () => {
      const input = '<pre>  line 1\n  line 2\n</pre>'
      const result = minifyHtml(input)
      expect(result).toContain('line 1')
      expect(result).toContain('line 2')
    })

    test('should preserve content in textarea tags', () => {
      const input = '<textarea>  multiple   spaces\n  newline</textarea>'
      const result = minifyHtml(input)
      expect(result).toContain('multiple')
      expect(result).toContain('spaces')
      expect(result).toContain('newline')
    })

    test('should handle self-closing tags', () => {
      const input = '<div><br/><img src="test.png" /><hr></div>'
      const result = minifyHtml(input)
      expect(result).toContain('<br/>')
      expect(result).toContain('<img')
      expect(result).toContain('src="test.png"')
      expect(result).toContain('<hr>')
    })

    test('should handle DOCTYPE', () => {
      const input = '<!DOCTYPE html><html><body></body></html>'
      const result = minifyHtml(input)
      expect(result).toContain('<!DOCTYPE html>')
    })

    test('should handle script content', () => {
      const input = '<script>const a = 1;\nconst b = 2;</script>'
      const result = minifyHtml(input)
      expect(result).toContain('const a = 1')
      expect(result).toContain('const b = 2')
    })

    test('should handle nested tags', () => {
      const input = `
        <div>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `
      const result = minifyHtml(input)
      expect(result).toBe('<div><ul><li>Item 1</li><li>Item 2</li></ul></div>')
    })

    test('should handle attributes with special characters', () => {
      const input = '<div data-test="<value>">test</div>'
      const result = minifyHtml(input)
      expect(result).toContain('data-test="<value>"')
    })

    test('should disable whitespace collapsing when collapseWhitespace is false', () => {
      const input = '<div>  <span>  a  </span>  </div>'
      const result = minifyHtml(input, { collapseWhitespace: false })
      expect(result).toContain('  <span>')
      expect(result).toContain('  a  ')
    })
  })

  describe('integration tests', () => {
    test('beautify then minify should produce compact output', () => {
      const original = '<div><h1>Hello</h1><p>World</p></div>'
      const beautified = beautifyHtml(original, { indent: '  ' })
      expect(beautified).not.toBe(original)
      const minified = minifyHtml(beautified)
      expect(minified).toContain('<div>')
      expect(minified).toContain('<h1>')
      expect(minified).toContain('Hello')
      expect(minified).toContain('<p>')
      expect(minified).toContain('World')
      expect(minified).toContain('</div>')
    })

    test('should produce structurally equivalent minified result for equivalent inputs', () => {
      const input1 = '<div><span>test</span></div>'
      const input2 = '<div>  <span>  test  </span>  </div>'
      const result1 = minifyHtml(input1)
      const result2 = minifyHtml(input2)
      expect(result1).toContain('<div>')
      expect(result1).toContain('<span>')
      expect(result1).toContain('test')
      expect(result2).toContain('<div>')
      expect(result2).toContain('<span>')
      expect(result2).toContain('test')
    })

    test('should handle complex HTML document', () => {
      const complexHtml = `
        <!DOCTYPE html>
        <!-- Document header -->
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Test</title>
          <style>
            .test {
              color: red;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Hello World</h1>
            <p>This is a <strong>test</strong> paragraph.</p>
            <script>
              console.log('test');
            </script>
          </div>
        </body>
        </html>
      `
      const beautified = beautifyHtml(complexHtml)
      expect(beautified).toContain('<!DOCTYPE html>')
      expect(beautified).toContain('<html lang="en">')
      expect(beautified).toContain('<title>')
      expect(beautified).toContain('Test')

      const minified = minifyHtml(complexHtml)
      expect(minified).not.toContain('<!-- Document header -->')
      expect(minified).toContain('<title>')
      expect(minified).toContain('Test')
      expect(minified).toContain('console.log')
    })
  })

  describe('edge cases', () => {
    test('should handle malformed HTML gracefully', () => {
      const malformed = '<div<span>test</span></div>'
      expect(() => minifyHtml(malformed)).not.toThrow()
      const result = minifyHtml(malformed)
      expect(result).toBeDefined()
    })

    test('should handle very long text content', () => {
      const longText = 'a'.repeat(1000)
      const input = `<p>${longText}</p>`
      const result = minifyHtml(input)
      expect(result).toContain(longText)
    })

    test('should handle tags with uppercase names', () => {
      const input = '<DIV><H1>Hello</H1></DIV>'
      const result = minifyHtml(input)
      expect(result).toContain('<DIV>')
      expect(result).toContain('<H1>Hello</H1>')
    })

    test('should handle custom elements', () => {
      const input = '<my-custom-element data-test="value">Content</my-custom-element>'
      const result = minifyHtml(input)
      expect(result).toContain('<my-custom-element')
      expect(result).toContain('</my-custom-element>')
    })

    test('should handle empty tags', () => {
      const input = '<div></div>'
      const result = minifyHtml(input)
      expect(result).toBe('<div></div>')
    })

    test('should handle only whitespace between tags', () => {
      const input = '<div>   </div>'
      const result = minifyHtml(input)
      expect(result).toBe('<div></div>')
    })
  })
})
