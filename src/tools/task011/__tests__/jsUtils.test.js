import { describe, test, expect } from 'vitest'
import {
  MAX_SAFE_INPUT_SIZE,
  MAX_NESTING_DEPTH,
  ErrorCode,
  ErrorMessages,
  TokenType,
  KEYWORDS,
  OPERATORS,
  getByteSize,
  escapeHtml,
  formatBytes,
  validateIndent,
  getIndentString,
  tokenizeJs,
  formatJs,
  minifyJs,
  processJs,
} from '../logic/jsUtils'

describe('jsUtils', () => {
  describe('constants', () => {
    test('MAX_SAFE_INPUT_SIZE should be 500KB', () => {
      expect(MAX_SAFE_INPUT_SIZE).toBe(500 * 1024)
    })

    test('MAX_NESTING_DEPTH should be 100', () => {
      expect(MAX_NESTING_DEPTH).toBe(100)
    })

    test('ErrorCode should contain all required error codes', () => {
      expect(ErrorCode.NULL_INPUT).toBe('NULL_INPUT')
      expect(ErrorCode.EMPTY_INPUT).toBe('EMPTY_INPUT')
      expect(ErrorCode.INVALID_INDENT).toBe('INVALID_INDENT')
      expect(ErrorCode.INPUT_TOO_LARGE).toBe('INPUT_TOO_LARGE')
      expect(ErrorCode.TRUNCATED_INPUT).toBe('TRUNCATED_INPUT')
      expect(ErrorCode.NESTING_TOO_DEEP).toBe('NESTING_TOO_DEEP')
      expect(ErrorCode.PARSE_FAILED).toBe('PARSE_FAILED')
      expect(ErrorCode.INVALID_PARAMETER).toBe('INVALID_PARAMETER')
    })

    test('ErrorMessages should have messages for all error codes', () => {
      for (const code of Object.values(ErrorCode)) {
        expect(ErrorMessages[code]).toBeDefined()
      }
    })

    test('TokenType should contain all token types', () => {
      expect(TokenType.STRING).toBe('string')
      expect(TokenType.NUMBER).toBe('number')
      expect(TokenType.IDENTIFIER).toBe('identifier')
      expect(TokenType.KEYWORD).toBe('keyword')
      expect(TokenType.OPERATOR).toBe('operator')
      expect(TokenType.PUNCTUATOR).toBe('punctuator')
      expect(TokenType.COMMENT).toBe('comment')
      expect(TokenType.WHITESPACE).toBe('whitespace')
      expect(TokenType.NEWLINE).toBe('newline')
      expect(TokenType.REGEX).toBe('regex')
      expect(TokenType.JSX_OPEN_TAG).toBe('jsx_open_tag')
      expect(TokenType.JSX_CLOSE_TAG).toBe('jsx_close_tag')
      expect(TokenType.JSX_SELF_CLOSING_TAG).toBe('jsx_self_closing_tag')
      expect(TokenType.JSX_FRAGMENT_OPEN).toBe('jsx_fragment_open')
      expect(TokenType.JSX_FRAGMENT_CLOSE).toBe('jsx_fragment_close')
    })

    test('KEYWORDS should contain common JavaScript keywords', () => {
      expect(KEYWORDS.has('const')).toBe(true)
      expect(KEYWORDS.has('let')).toBe(true)
      expect(KEYWORDS.has('function')).toBe(true)
      expect(KEYWORDS.has('return')).toBe(true)
      expect(KEYWORDS.has('if')).toBe(true)
      expect(KEYWORDS.has('else')).toBe(true)
      expect(KEYWORDS.has('true')).toBe(true)
      expect(KEYWORDS.has('false')).toBe(true)
      expect(KEYWORDS.has('null')).toBe(true)
      expect(KEYWORDS.has('undefined')).toBe(true)
    })

    test('OPERATORS should contain common JavaScript operators', () => {
      expect(OPERATORS.has('===')).toBe(true)
      expect(OPERATORS.has('!==')).toBe(true)
      expect(OPERATORS.has('==')).toBe(true)
      expect(OPERATORS.has('!=')).toBe(true)
      expect(OPERATORS.has('+')).toBe(true)
      expect(OPERATORS.has('-')).toBe(true)
      expect(OPERATORS.has('*')).toBe(true)
      expect(OPERATORS.has('/')).toBe(true)
      expect(OPERATORS.has('=')).toBe(true)
      expect(OPERATORS.has('=>')).toBe(true)
    })
  })

  describe('helper functions', () => {
    describe('getByteSize', () => {
      test('should return 0 for non-string values', () => {
        expect(getByteSize(null)).toBe(0)
        expect(getByteSize(undefined)).toBe(0)
        expect(getByteSize(123)).toBe(0)
        expect(getByteSize({})).toBe(0)
      })

      test('should return correct byte size for strings', () => {
        expect(getByteSize('')).toBe(0)
        expect(getByteSize('a')).toBe(1)
        expect(getByteSize('abc')).toBe(3)
        expect(getByteSize('中')).toBe(3)
      })
    })

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

      test('should escape special HTML characters', () => {
        const xss = '<script>alert("xss")</script>'
        const escaped = escapeHtml(xss)
        expect(escaped).not.toContain('<script>')
        expect(escaped).toContain('&lt;')
        expect(escaped).toContain('&gt;')
        expect(escaped).toContain('&quot;')
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
    })

    describe('validateIndent', () => {
      test('should validate correct indent values', () => {
        expect(validateIndent(2)).toBe(true)
        expect(validateIndent(4)).toBe(true)
        expect(validateIndent(8)).toBe(true)
        expect(validateIndent('tab')).toBe(true)
        expect(validateIndent('\t')).toBe(true)
      })

      test('should reject invalid indent values', () => {
        expect(validateIndent(1)).toBe(false)
        expect(validateIndent(3)).toBe(false)
        expect(validateIndent(16)).toBe(false)
        expect(validateIndent('spaces')).toBe(false)
        expect(validateIndent(null)).toBe(false)
        expect(validateIndent(undefined)).toBe(false)
      })
    })

    describe('getIndentString', () => {
      test('should return correct indent strings', () => {
        expect(getIndentString(2)).toBe('  ')
        expect(getIndentString(4)).toBe('    ')
        expect(getIndentString(8)).toBe('        ')
        expect(getIndentString('tab')).toBe('\t')
        expect(getIndentString('\t')).toBe('\t')
      })

      test('should return default indent for invalid values', () => {
        expect(getIndentString(1)).toBe('  ')
        expect(getIndentString('invalid')).toBe('  ')
        expect(getIndentString(null)).toBe('  ')
        expect(getIndentString(undefined)).toBe('  ')
      })
    })
  })

  describe('tokenizeJs', () => {
    test('should tokenize simple JavaScript code', () => {
      const code = 'const a = 1;'
      const tokens = tokenizeJs(code)
      expect(tokens).toBeInstanceOf(Array)
      expect(tokens.length).toBeGreaterThan(0)
    })

    test('should tokenize strings', () => {
      const code = 'const str = "hello";'
      const tokens = tokenizeJs(code)
      const stringTokens = tokens.filter(t => t.type === TokenType.STRING)
      expect(stringTokens.length).toBe(1)
      expect(stringTokens[0].value).toBe('"hello"')
    })

    test('should tokenize single-quoted strings', () => {
      const code = "const str = 'world';"
      const tokens = tokenizeJs(code)
      const stringTokens = tokens.filter(t => t.type === TokenType.STRING)
      expect(stringTokens.length).toBe(1)
      expect(stringTokens[0].value).toBe("'world'")
    })

    test('should tokenize template strings', () => {
      const code = 'const str = `hello`;'
      const tokens = tokenizeJs(code)
      const stringTokens = tokens.filter(t => t.type === TokenType.STRING)
      expect(stringTokens.length).toBe(1)
    })

    test('should tokenize numbers', () => {
      const code = 'const num = 123;'
      const tokens = tokenizeJs(code)
      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER)
      expect(numberTokens.length).toBe(1)
      expect(numberTokens[0].value).toBe('123')
    })

    test('should tokenize keywords', () => {
      const code = 'const a = 1;'
      const tokens = tokenizeJs(code)
      const keywordTokens = tokens.filter(t => t.type === TokenType.KEYWORD)
      expect(keywordTokens.length).toBe(1)
      expect(keywordTokens[0].value).toBe('const')
    })

    test('should tokenize identifiers', () => {
      const code = 'const myVar = 1;'
      const tokens = tokenizeJs(code)
      const identifierTokens = tokens.filter(t => t.type === TokenType.IDENTIFIER)
      expect(identifierTokens.length).toBe(1)
      expect(identifierTokens[0].value).toBe('myVar')
    })

    test('should tokenize operators', () => {
      const code = 'a === b;'
      const tokens = tokenizeJs(code)
      const operatorTokens = tokens.filter(t => t.type === TokenType.OPERATOR)
      expect(operatorTokens.length).toBe(1)
      expect(operatorTokens[0].value).toBe('===')
    })

    test('should tokenize punctuators', () => {
      const code = 'obj.prop;'
      const tokens = tokenizeJs(code)
      const punctuatorTokens = tokens.filter(t => t.type === TokenType.PUNCTUATOR)
      expect(punctuatorTokens.length).toBe(2)
    })

    test('should tokenize single-line comments', () => {
      const code = '// comment\nconst a = 1;'
      const tokens = tokenizeJs(code)
      const commentTokens = tokens.filter(t => t.type === TokenType.COMMENT)
      expect(commentTokens.length).toBe(1)
    })

    test('should tokenize multi-line comments', () => {
      const code = '/* comment */ const a = 1;'
      const tokens = tokenizeJs(code)
      const commentTokens = tokens.filter(t => t.type === TokenType.COMMENT)
      expect(commentTokens.length).toBe(1)
    })

    test('should tokenize whitespace', () => {
      const code = 'const  a = 1;'
      const tokens = tokenizeJs(code)
      const whitespaceTokens = tokens.filter(t => t.type === TokenType.WHITESPACE)
      expect(whitespaceTokens.length).toBeGreaterThan(0)
    })

    test('should tokenize newlines', () => {
      const code = 'const a = 1;\nconst b = 2;'
      const tokens = tokenizeJs(code)
      const newlineTokens = tokens.filter(t => t.type === TokenType.NEWLINE)
      expect(newlineTokens.length).toBeGreaterThan(0)
    })

    test('should tokenize regex literals', () => {
      const code = 'const regex = /test/g;'
      const tokens = tokenizeJs(code)
      const regexTokens = tokens.filter(t => t.type === TokenType.REGEX)
      expect(regexTokens.length).toBe(1)
    })

    test('should handle hex numbers', () => {
      const code = 'const hex = 0xFF;'
      const tokens = tokenizeJs(code)
      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER)
      expect(numberTokens.length).toBe(1)
    })

    test('should handle escaped characters in strings', () => {
      const code = 'const str = "hello\\"world";'
      const tokens = tokenizeJs(code)
      const stringTokens = tokens.filter(t => t.type === TokenType.STRING)
      expect(stringTokens.length).toBe(1)
    })

    test('should tokenize JSX open tags', () => {
      const code = '<div>hello</div>'
      const tokens = tokenizeJs(code)
      const openTags = tokens.filter(t => t.type === TokenType.JSX_OPEN_TAG)
      expect(openTags.length).toBe(1)
      expect(openTags[0].value).toBe('<div>')
    })

    test('should tokenize JSX close tags', () => {
      const code = '<div>hello</div>'
      const tokens = tokenizeJs(code)
      const closeTags = tokens.filter(t => t.type === TokenType.JSX_CLOSE_TAG)
      expect(closeTags.length).toBe(1)
      expect(closeTags[0].value).toBe('</div>')
    })

    test('should tokenize JSX self-closing tags', () => {
      const code = '<img src="test.jpg" />'
      const tokens = tokenizeJs(code)
      const selfClosingTags = tokens.filter(t => t.type === TokenType.JSX_SELF_CLOSING_TAG)
      expect(selfClosingTags.length).toBe(1)
      expect(selfClosingTags[0].value).toBe('<img src="test.jpg" />')
    })

    test('should tokenize JSX fragment open', () => {
      const code = '<><div>hello</div></>'
      const tokens = tokenizeJs(code)
      const fragmentOpen = tokens.filter(t => t.type === TokenType.JSX_FRAGMENT_OPEN)
      expect(fragmentOpen.length).toBe(1)
      expect(fragmentOpen[0].value).toBe('<>')
    })

    test('should tokenize JSX fragment close', () => {
      const code = '<><div>hello</div></>'
      const tokens = tokenizeJs(code)
      const fragmentClose = tokens.filter(t => t.type === TokenType.JSX_FRAGMENT_CLOSE)
      expect(fragmentClose.length).toBe(1)
      expect(fragmentClose[0].value).toBe('</>')
    })

    test('should tokenize JSX with attributes', () => {
      const code = '<div className="test" id="123">'
      const tokens = tokenizeJs(code)
      const openTags = tokens.filter(t => t.type === TokenType.JSX_OPEN_TAG)
      expect(openTags.length).toBe(1)
      expect(openTags[0].value).toBe('<div className="test" id="123">')
    })

    test('should tokenize JSX with expressions', () => {
      const code = '<div>{count + 1}</div>'
      const tokens = tokenizeJs(code)
      expect(tokens.some(t => t.type === TokenType.JSX_OPEN_TAG)).toBe(true)
      expect(tokens.some(t => t.type === TokenType.JSX_CLOSE_TAG)).toBe(true)
    })

    test('should tokenize JSX with self-closing tag and props', () => {
      const code = '<UserComponent userName="john" age={30} />'
      const tokens = tokenizeJs(code)
      const selfClosingTags = tokens.filter(t => t.type === TokenType.JSX_SELF_CLOSING_TAG)
      expect(selfClosingTags.length).toBe(1)
      expect(selfClosingTags[0].value).toBe('<UserComponent userName="john" age={30} />')
    })

    test('should not confuse comparison operators with JSX tags', () => {
      const code = 'if (a < b && a > 0) { return true; }'
      const tokens = tokenizeJs(code)
      const jsxTags = tokens.filter(t =>
        t.type === TokenType.JSX_OPEN_TAG ||
        t.type === TokenType.JSX_CLOSE_TAG ||
        t.type === TokenType.JSX_SELF_CLOSING_TAG ||
        t.type === TokenType.JSX_FRAGMENT_OPEN ||
        t.type === TokenType.JSX_FRAGMENT_CLOSE
      )
      expect(jsxTags.length).toBe(0)
    })
  })

  describe('formatJs with JSX', () => {
    test('should format JSX elements', () => {
      const input = 'const element=<div className="test">Hello World</div>;'
      const result = formatJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<div className="test">')
      expect(result).toContain('</div>')
    })

    test('should format JSX fragments', () => {
      const input = 'const element=<><div>A</div><div>B</div></>;'
      const result = formatJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<>')
      expect(result).toContain('</>')
    })

    test('should format JSX with self-closing tags', () => {
      const input = 'const img=<img src="test.jpg" alt="test" />;'
      const result = formatJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<img src="test.jpg" alt="test" />')
    })

    test('should format JSX with expressions', () => {
      const input = 'const element=<div>{name}</div>;'
      const result = formatJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<div>')
      expect(result).toContain('{name')
      expect(result).toContain('</div>')
    })

    test('should format JSX in React component', () => {
      const input = 'function App(){return(<div className="app"><h1>Hello</h1><p>World</p></div>);}'
      const result = formatJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('function App')
      expect(result).toContain('<div className="app">')
      expect(result).toContain('<h1>')
      expect(result).toContain('</h1>')
    })
  })

  describe('minifyJs with JSX', () => {
    test('should minify JSX elements', () => {
      const input = `
        const element = (
          <div className="test">
            Hello World
          </div>
        );
      `
      const result = minifyJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<div className="test">')
      expect(result).toContain('</div>')
    })

    test('should minify JSX fragments', () => {
      const input = `
        const element = (
          <>
            <div>A</div>
            <div>B</div>
          </>
        );
      `
      const result = minifyJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<>')
      expect(result).toContain('</>')
    })

    test('should minify JSX with self-closing tags', () => {
      const input = `
        const img = (
          <img
            src="test.jpg"
            alt="test"
          />
        );
      `
      const result = minifyJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<img')
      expect(result).toContain('/>')
    })

    test('should minify JSX with expressions', () => {
      const input = `
        const element = (
          <div>
            {name}
          </div>
        );
      `
      const result = minifyJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<div>')
      expect(result).toContain('{name}')
      expect(result).toContain('</div>')
    })

    test('should minify JSX in React component', () => {
      const input = `
        function App() {
          return (
            <div className="app">
              <h1>Hello</h1>
              <p>World</p>
            </div>
          );
        }
      `
      const result = minifyJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('function App')
      expect(result).toContain('<div className="app">')
      expect(result).toContain('<h1>')
      expect(result).toContain('</h1>')
    })

    test('should handle JSX with nested components', () => {
      const input = `
        const element = (
          <div>
            <Header title="Test" />
            <Content>
              <p>Hello</p>
            </Content>
          </div>
        );
      `
      const result = minifyJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('<div>')
      expect(result).toContain('<Header')
      expect(result).toContain('<Content>')
      expect(result).toContain('</Content>')
      expect(result).toContain('</div>')
    })
  })

  describe('processJs with JSX', () => {
    test('should process JSX in format mode', () => {
      const input = 'const element=<div>Hello</div>;'
      const result = processJs(input, { mode: 'format' })
      expect(result.success).toBe(true)
      expect(result.output).toContain('<div>')
      expect(result.output).toContain('</div>')
    })

    test('should process JSX in minify mode', () => {
      const input = `const element = (<div>Hello World</div>);`
      const result = processJs(input, { mode: 'minify' })
      expect(result.success).toBe(true)
      expect(result.output).toContain('<div>')
      expect(result.output).toContain('</div>')
    })

    test('should calculate sizes correctly for JSX', () => {
      const input = 'const element=<div>Hello</div>;'
      const result = processJs(input, { mode: 'format' })
      expect(result.success).toBe(true)
      expect(result.originalSize).toBeGreaterThan(0)
      expect(result.outputSize).toBeGreaterThan(0)
      expect(result.mode).toBe('format')
    })

    test('should handle complex JSX with multiple components', () => {
      const input = `
        function App() {
          const [count, setCount] = useState(0);
          return (
            <div className="app">
              <h1>Counter: {count}</h1>
              <button onClick={() => setCount(count + 1)}>Increment</button>
            </div>
          );
        }
      `
      const result = processJs(input, { mode: 'format' })
      expect(result.success).toBe(true)
      expect(result.output).toContain('<div className="app">')
      expect(result.output).toContain('<h1>')
      expect(result.output).toContain('<button')
      expect(result.output).toContain('useState')
    })
  })

  describe('formatJs', () => {
    test('should format simple JavaScript code', () => {
      const input = 'const a=1;function test(){return a+1;}'
      const result = formatJs(input)
      expect(result).toBeDefined()
      expect(result).toContain('const a = 1')
      expect(result).toContain('function test')
      expect(result).toContain('return a + 1')
    })

    test('should handle different indent sizes', () => {
      const input = 'function test(){if(true){return 1;}}'
      const result2 = formatJs(input, { indent: 2 })
      const result4 = formatJs(input, { indent: 4 })
      expect(result2).not.toBe(result4)
    })

    test('should preserve comments', () => {
      const input = '// comment\nconst a = 1;'
      const result = formatJs(input)
      expect(result).toContain('// comment')
    })

    test('should handle empty input gracefully', () => {
      expect(formatJs('')).toBe('')
    })
  })

  describe('minifyJs', () => {
    test('should minify JavaScript code', () => {
      const input = `
        const a = 1;
        function test() {
          return a + 1;
        }
      `
      const result = minifyJs(input)
      expect(result).toBeDefined()
      expect(result).not.toContain('\n')
      expect(result).toContain('const a=1')
      expect(result).toContain('function test()')
    })

    test('should remove comments by default', () => {
      const input = '// comment\nconst a = 1;'
      const result = minifyJs(input)
      expect(result).not.toContain('//')
      expect(result).not.toContain('comment')
    })

    test('should preserve comments when removeComments is false', () => {
      const input = '// comment\nconst a = 1;'
      const result = minifyJs(input, { removeComments: false })
      expect(result).toContain('// comment')
    })

    test('should handle empty input gracefully', () => {
      expect(minifyJs('')).toBe('')
    })

    test('should preserve important whitespace between keywords and identifiers', () => {
      const input = 'const a = typeof b;'
      const result = minifyJs(input)
      expect(result).toContain('typeof b')
    })
  })

  describe('processJs', () => {
    test('should return success result for format mode', () => {
      const input = 'const a=1;'
      const result = processJs(input, { mode: 'format' })
      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.originalSize).toBeGreaterThan(0)
      expect(result.outputSize).toBeGreaterThan(0)
      expect(result.mode).toBe('format')
    })

    test('should return success result for minify mode', () => {
      const input = 'const a = 1;\nconst b = 2;'
      const result = processJs(input, { mode: 'minify' })
      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.originalSize).toBeGreaterThan(0)
      expect(result.mode).toBe('minify')
    })

    test('should handle NULL_INPUT error', () => {
      const result1 = processJs(null)
      expect(result1.success).toBe(false)
      expect(result1.errorCode).toBe(ErrorCode.NULL_INPUT)

      const result2 = processJs(undefined)
      expect(result2.success).toBe(false)
      expect(result2.errorCode).toBe(ErrorCode.NULL_INPUT)
    })

    test('should handle EMPTY_INPUT error', () => {
      const result1 = processJs('')
      expect(result1.success).toBe(false)
      expect(result1.errorCode).toBe(ErrorCode.EMPTY_INPUT)

      const result2 = processJs('   ')
      expect(result2.success).toBe(false)
      expect(result2.errorCode).toBe(ErrorCode.EMPTY_INPUT)
    })

    test('should handle INVALID_PARAMETER error for non-string input', () => {
      const result = processJs(123)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ErrorCode.INVALID_PARAMETER)
    })

    test('should handle INVALID_INDENT error', () => {
      const input = 'const a = 1;'
      const result = processJs(input, { mode: 'format', indent: 1 })
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ErrorCode.INVALID_INDENT)
    })

    test('should handle INPUT_TOO_LARGE error', () => {
      const largeInput = 'a'.repeat(MAX_SAFE_INPUT_SIZE * 3)
      const result = processJs(largeInput, { maxInputSize: MAX_SAFE_INPUT_SIZE })
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ErrorCode.INPUT_TOO_LARGE)
    })

    test('should handle NESTING_TOO_DEEP error', () => {
      const deepNesting = '{'.repeat(MAX_NESTING_DEPTH + 10) + '}'.repeat(MAX_NESTING_DEPTH + 10)
      const result = processJs(deepNesting)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe(ErrorCode.NESTING_TOO_DEEP)
    })

    test('should calculate correct sizes', () => {
      const input = 'const a = 1;'
      const result = processJs(input, { mode: 'format' })
      expect(result.success).toBe(true)
      expect(result.originalSize).toBe(getByteSize(input))
      expect(result.outputSize).toBe(getByteSize(result.output))
    })
  })
})
