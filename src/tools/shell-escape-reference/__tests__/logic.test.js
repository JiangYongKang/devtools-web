import { describe, it, expect } from 'vitest'
import {
  escapeForDoubleQuotes,
  escapeForSingleQuotes,
  getBareLineGuidance,
  getCharCategory,
  buildExplainedSpans,
  buildRiskMarkers,
  parseQuotedString,
  parseInverse,
  validateInput,
} from '../logic/core.js'
import { processShellEscape } from '../logic/index.js'
import { CHAR_CATEGORIES } from '../logic/constants.js'

describe('escapeForDoubleQuotes', () => {
  it('should escape special characters in double quotes', () => {
    expect(escapeForDoubleQuotes('Hello $World')).toBe('"Hello \\$World"')
    expect(escapeForDoubleQuotes('`command`')).toBe('"\\`command\\`"')
    expect(escapeForDoubleQuotes('"test"')).toBe('"\\"test\\""')
    expect(escapeForDoubleQuotes('\\backslash\\')).toBe('"\\\\backslash\\\\"')
  })
  
  it('should preserve normal characters', () => {
    expect(escapeForDoubleQuotes('hello world')).toBe('"hello world"')
    expect(escapeForDoubleQuotes('123')).toBe('"123"')
  })
})

describe('escapeForSingleQuotes', () => {
  it('should handle single quotes inside', () => {
    expect(escapeForSingleQuotes("It's a test")).toBe("'It'\\''s a test'")
    expect(escapeForSingleQuotes("no quotes")).toBe("'no quotes'")
  })
})

describe('getBareLineGuidance', () => {
  it('should flag dangerous bare content', () => {
    const result = getBareLineGuidance('Hello World')
    expect(result.canUseBare).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
    
    const safe = getBareLineGuidance('safe123')
    expect(safe.canUseBare).toBe(true)
    expect(safe.issues.length).toBe(0)
  })
})

describe('getCharCategory', () => {
  it('should categorize characters correctly', () => {
    expect(getCharCategory(' ')).toBe(CHAR_CATEGORIES.SPACE_TAB)
    expect(getCharCategory('\t')).toBe(CHAR_CATEGORIES.SPACE_TAB)
    expect(getCharCategory('\n')).toBe(CHAR_CATEGORIES.NEWLINE)
    expect(getCharCategory('$')).toBe(CHAR_CATEGORIES.VARIABLE)
    expect(getCharCategory('`')).toBe(CHAR_CATEGORIES.COMMAND_SUBST)
    expect(getCharCategory('\\')).toBe(CHAR_CATEGORIES.ESCAPE)
    expect(getCharCategory('!')).toBe(CHAR_CATEGORIES.HISTORY)
    expect(getCharCategory('#')).toBe(CHAR_CATEGORIES.COMMENT)
    expect(getCharCategory("'")).toBe(CHAR_CATEGORIES.QUOTE)
    expect(getCharCategory('"')).toBe(CHAR_CATEGORIES.QUOTE)
    expect(getCharCategory('*')).toBe(CHAR_CATEGORIES.GLOB)
    expect(getCharCategory('?')).toBe(CHAR_CATEGORIES.GLOB)
    expect(getCharCategory('a')).toBe(CHAR_CATEGORIES.NORMAL)
    expect(getCharCategory('1')).toBe(CHAR_CATEGORIES.NORMAL)
  })
})

describe('buildExplainedSpans', () => {
  it('should build spans for text', () => {
    const spans = buildExplainedSpans('ab$cd')
    expect(spans.length).toBeGreaterThan(0)
    const variableSpan = spans.find(s => s.category === CHAR_CATEGORIES.VARIABLE)
    expect(variableSpan).toBeDefined()
  })
  
  it('should handle variable syntax', () => {
    const spans1 = buildExplainedSpans('$HOME')
    expect(spans1.some(s => s.category === CHAR_CATEGORIES.VARIABLE)).toBe(true)
    
    const spans2 = buildExplainedSpans('${USER}')
    expect(spans2.some(s => s.category === CHAR_CATEGORIES.VARIABLE)).toBe(true)
  })
})

describe('buildRiskMarkers', () => {
  it('should identify high risk content', () => {
    const spans = buildExplainedSpans('`whoami`')
    const markers = buildRiskMarkers(spans, '`whoami`')
    expect(markers.hasCommandSubst).toBe(true)
    expect(markers.overallRisk).toBe('critical')
  })
})

describe('parseQuotedString', () => {
  it('should parse double quoted strings', () => {
    const result = parseQuotedString('"hello"', 0)
    expect(result.value).toBe('hello')
    expect(result.error).toBeNull()
    
    const escaped = parseQuotedString('"hello \\"world\\""', 0)
    expect(escaped.value).toBe('hello "world"')
  })
  
  it('should parse single quoted strings', () => {
    const result = parseQuotedString("'hello world'", 0)
    expect(result.value).toBe('hello world')
  })
  
  it('should detect unbalanced quotes', () => {
    const result = parseQuotedString('"unclosed', 0)
    expect(result.error).toBe('UNBALANCED_QUOTES')
  })
})

describe('parseInverse', () => {
  it('should parse double quoted input', () => {
    const result = parseInverse('"hello world"')
    expect(result.expandedValue).toBe('hello world')
    expect(result.segments.length).toBe(1)
    expect(result.segments[0].type).toBe('double_quoted')
  })
  
  it('should parse single quoted input', () => {
    const result = parseInverse("'test $VAR'")
    expect(result.expandedValue).toBe('test $VAR')
  })
  
  it('should detect unbalanced quotes', () => {
    const result = parseInverse('"unclosed')
    expect(result.errorCode).toBe('UNBALANCED_QUOTES')
  })
})

describe('validateInput', () => {
  it('should reject null and undefined', () => {
    expect(validateInput(null).valid).toBe(false)
    expect(validateInput(null).errorCode).toBe('NULL_INPUT')
  })
  
  it('should reject empty strings', () => {
    expect(validateInput('').valid).toBe(false)
    expect(validateInput('').errorCode).toBe('EMPTY_INPUT')
    
    expect(validateInput('   ').valid).toBe(false)
    expect(validateInput('   ').errorCode).toBe('EMPTY_INPUT')
  })
  
  it('should reject input too large', () => {
    const large = 'a'.repeat(10001)
    const result = validateInput(large, 10000)
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe('INPUT_TOO_LARGE')
  })
  
  it('should accept valid input', () => {
    expect(validateInput('hello').valid).toBe(true)
  })
})

describe('processShellEscape - integration', () => {
  it('should process forward mode', () => {
    const result = processShellEscape({
      rawText: 'Hello $World `command`',
      shellProfile: 'POSIX_BASH_LITE',
      inverseMode: false,
    })
    
    expect(result.errorCode).toBeNull()
    expect(result.quotedDouble).toBeDefined()
    expect(result.quotedSingle).toBeDefined()
    expect(result.explainedSpans.length).toBeGreaterThan(0)
    expect(result.riskMarkers).toBeDefined()
    expect(result.riskMarkers.hasCommandSubst).toBe(true)
    expect(result.riskMarkers.hasVariable).toBe(true)
  })
  
  it('should process inverse mode', () => {
    const result = processShellEscape({
      rawText: '"hello \\"world\\""',
      inverseMode: true,
    })
    
    expect(result.errorCode).toBeNull()
    expect(result.inverseExplanation).toBeDefined()
    expect(result.inverseExplanation.expandedValue).toBe('hello "world"')
  })
  
  it('should handle errors', () => {
    const result = processShellEscape({
      rawText: '',
    })
    expect(result.errorCode).toBe('EMPTY_INPUT')
  })
  
  it('should handle null input', () => {
    const result = processShellEscape({
      rawText: null,
    })
    expect(result.errorCode).toBe('NULL_INPUT')
  })
})
