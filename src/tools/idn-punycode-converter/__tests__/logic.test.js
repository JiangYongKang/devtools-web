import { describe, it, expect } from 'vitest'
import {
  punyEncode,
  punyDecode,
  toAsciiLabel,
  toUnicodeLabel,
  stripUrlPrefix,
  validateDomainFormat,
  processSingleDomain,
  processBatch,
  hasNonAscii,
  isAceLabel,
  computeDiff,
  ERROR_CODES,
  OUTPUT_MODES,
  XN_CASE_OPTIONS,
  MAX_INPUT_LINES,
} from '../logic/index.js'

describe('Punycode encoding and decoding', () => {
  it('should encode and decode ASCII strings unchanged', () => {
    const input = 'hello'
    const encoded = punyEncode(input)
    expect(encoded).toBe('hello-')
    
    const decoded = punyDecode(encoded)
    expect(decoded).toBe(input)
  })
  
  it('should encode Unicode strings to Punycode', () => {
    const input = '例子'
    const encoded = punyEncode(input)
    const decoded = punyDecode(encoded)
    expect(decoded).toBe(input)
  })
  
  it('should round-trip various Unicode inputs', () => {
    const testCases = [
      '例子',
      '中国',
      'münchen',
      '日本語',
      '한국어',
      'привет',
      'שלום',
      '👨‍👩‍👧‍👦',
    ]
    
    for (const testCase of testCases) {
      const encoded = punyEncode(testCase)
      const decoded = punyDecode(encoded)
      expect(decoded).toBe(testCase)
    }
  })
  
  it('should handle empty string', () => {
    expect(punyEncode('')).toBe('')
    expect(punyDecode('')).toBe('')
  })
})

describe('IDN conversion', () => {
  it('should convert Unicode labels to ASCII (Punycode)', () => {
    const result = toAsciiLabel('例子')
    expect(result).toBe('xn--fsqu00a')
  })
  
  it('should convert Punycode labels to Unicode', () => {
    const result = toUnicodeLabel('xn--fsqu00a')
    expect(result).toBe('例子')
  })
  
  it('should handle full domain names', () => {
    const unicodeDomain = '例子.中国'
    const punycodeParts = unicodeDomain.split('.').map(toAsciiLabel)
    const punycodeDomain = punycodeParts.join('.')
    
    const decodedParts = punycodeDomain.split('.').map(toUnicodeLabel)
    const decodedDomain = decodedParts.join('.')
    
    expect(decodedDomain).toBe(unicodeDomain)
  })
  
  it('should preserve ASCII-only labels', () => {
    expect(toAsciiLabel('com')).toBe('com')
    expect(toUnicodeLabel('com')).toBe('com')
  })
  
  it('should handle case folding', () => {
    expect(toAsciiLabel('EXAMPLE')).toBe('example')
    expect(toUnicodeLabel('XN--FSQU00A')).toBe('例子')
  })
  
  it('should support xn-- case options', () => {
    const upper = toAsciiLabel('例子', XN_CASE_OPTIONS.UPPER)
    expect(upper).toBe('XN--fsqu00a')
    
    const lower = toAsciiLabel('例子', XN_CASE_OPTIONS.LOWER)
    expect(lower).toBe('xn--fsqu00a')
  })
})

describe('URL prefix stripping', () => {
  it('should strip http:// prefix', () => {
    expect(stripUrlPrefix('http://example.com')).toBe('example.com')
  })
  
  it('should strip https:// prefix', () => {
    expect(stripUrlPrefix('https://example.com')).toBe('example.com')
  })
  
  it('should strip path and query', () => {
    expect(stripUrlPrefix('https://example.com/path?query=1#hash')).toBe('example.com')
  })
  
  it('should strip port number', () => {
    expect(stripUrlPrefix('http://example.com:8080/path')).toBe('example.com')
  })
  
  it('should strip user info', () => {
    expect(stripUrlPrefix('http://user:pass@example.com')).toBe('example.com')
  })
  
  it('should handle Unicode domains with prefix', () => {
    expect(stripUrlPrefix('https://例子.中国/path')).toBe('例子.中国')
  })
  
  it('should return plain domains unchanged', () => {
    expect(stripUrlPrefix('example.com')).toBe('example.com')
    expect(stripUrlPrefix('例子.中国')).toBe('例子.中国')
  })
  
  it('should handle edge cases', () => {
    expect(stripUrlPrefix('')).toBe('')
    expect(stripUrlPrefix(null)).toBe(null)
    expect(stripUrlPrefix(undefined)).toBe(undefined)
  })
})

describe('Domain format validation', () => {
  it('should accept valid domains', () => {
    expect(validateDomainFormat('example.com')).toHaveLength(0)
    expect(validateDomainFormat('sub.example.com')).toHaveLength(0)
    expect(validateDomainFormat('xn--fsqu00a.xn--fiqs8s')).toHaveLength(0)
  })
  
  it('should detect leading dot', () => {
    const errors = validateDomainFormat('.example.com')
    expect(errors.some(e => e.errorCode === ERROR_CODES.LEADING_DOT)).toBe(true)
  })
  
  it('should detect trailing dot', () => {
    const errors = validateDomainFormat('example.com.')
    expect(errors.some(e => e.errorCode === ERROR_CODES.TRAILING_DOT)).toBe(true)
  })
  
  it('should detect consecutive dots', () => {
    const errors = validateDomainFormat('example..com')
    expect(errors.some(e => e.errorCode === ERROR_CODES.CONSECUTIVE_DOTS)).toBe(true)
  })
  
  it('should detect empty labels', () => {
    const errors = validateDomainFormat('example..com')
    expect(errors.some(e => e.errorCode === ERROR_CODES.EMPTY_LABEL)).toBe(true)
  })
  
  it('should detect labels starting with hyphen', () => {
    const errors = validateDomainFormat('-example.com')
    expect(errors.some(e => e.errorCode === ERROR_CODES.HYPHEN_AT_EDGE)).toBe(true)
  })
  
  it('should detect labels ending with hyphen', () => {
    const errors = validateDomainFormat('example-.com')
    expect(errors.some(e => e.errorCode === ERROR_CODES.HYPHEN_AT_EDGE)).toBe(true)
  })
  
  it('should detect labels that are all hyphens', () => {
    const errors = validateDomainFormat('---.com')
    expect(errors.some(e => e.errorCode === ERROR_CODES.ALL_HYPHENS)).toBe(true)
  })
  
  it('should detect labels exceeding 63 characters', () => {
    const longLabel = 'a'.repeat(64)
    const errors = validateDomainFormat(`${longLabel}.com`)
    expect(errors.some(e => e.errorCode === ERROR_CODES.LABEL_TOO_LONG)).toBe(true)
  })
  
  it('should detect domains exceeding 253 characters', () => {
    const label = 'a'.repeat(63)
    const domain = `${label}.${label}.${label}.${label}.${label}`
    const errors = validateDomainFormat(domain)
    expect(errors.some(e => e.errorCode === ERROR_CODES.DOMAIN_TOO_LONG)).toBe(true)
  })
})

describe('Single domain processing', () => {
  it('should process ASCII domain', () => {
    const result = processSingleDomain('example.com')
    expect(result.isValid).toBe(true)
    expect(result.output).toBe('example.com')
    expect(result.uLabel).toBe('example.com')
    expect(result.aLabel).toBe('example.com')
  })
  
  it('should convert Unicode domain to Punycode', () => {
    const result = processSingleDomain('例子.中国', { outputMode: OUTPUT_MODES.TO_PUNYCODE })
    expect(result.isValid).toBe(true)
    expect(result.output).toBe('xn--fsqu00a.xn--fiqs8s')
  })
  
  it('should convert Punycode domain to Unicode', () => {
    const result = processSingleDomain('xn--fsqu00a.xn--fiqs8s', { outputMode: OUTPUT_MODES.TO_UNICODE })
    expect(result.isValid).toBe(true)
    expect(result.output).toBe('例子.中国')
  })
  
  it('should validate only without conversion', () => {
    const result = processSingleDomain('例子.中国', { outputMode: OUTPUT_MODES.VALIDATE_ONLY })
    expect(result.isValid).toBe(true)
    expect(result.output).toBe('例子.中国')
  })
  
  it('should decode only Punycode labels', () => {
    const result = processSingleDomain('xn--fsqu00a.xn--fiqs8s', { outputMode: OUTPUT_MODES.DECODE_PUNYCODE_ONLY })
    expect(result.isValid).toBe(true)
    expect(result.output).toBe('例子.中国')
  })
  
  it('should detect invalid Punycode', () => {
    const result = processSingleDomain('xn--invalid-123')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
  
  it('should strip URL prefix when enabled', () => {
    const result = processSingleDomain('https://例子.中国/path', { stripUrlPrefix: true })
    expect(result.input).toBe('例子.中国')
  })
  
  it('should not strip URL prefix when disabled', () => {
    const result = processSingleDomain('https://例子.中国/path', { stripUrlPrefix: false })
    expect(result.isValid).toBe(false)
  })
  
  it('should analyze labels', () => {
    const result = processSingleDomain('例子.中国')
    expect(result.labels.length).toBe(2)
    expect(result.labels[0].isAscii).toBe(false)
    expect(result.labels[1].isAscii).toBe(false)
  })
  
  it('should compute diff between original and output', () => {
    const result = processSingleDomain('例子.中国')
    expect(result.diff).toBeDefined()
    expect(result.diff.length).toBeGreaterThan(0)
  })
})

describe('Batch processing', () => {
  it('should process multiple lines', () => {
    const input = 'example.com\n例子.中国\nxn--fsqu00a.xn--fiqs8s'
    const result = processBatch(input)
    
    expect(result.results.length).toBe(3)
    expect(result.totalCount).toBe(3)
    expect(result.successCount).toBe(3)
    expect(result.errorCount).toBe(0)
  })
  
  it('should handle empty lines', () => {
    const input = 'example.com\n\n例子.中国'
    const result = processBatch(input)
    
    expect(result.results.length).toBe(3)
    expect(result.results[1].isEmpty).toBe(true)
  })
  
  it('should handle errors per line', () => {
    const input = 'example.com\nxn--invalid-123\ntest.com'
    const result = processBatch(input)
    
    expect(result.totalCount).toBe(3)
    expect(result.successCount).toBe(2)
    expect(result.errorCount).toBe(1)
    expect(result.results[1].isValid).toBe(false)
  })
  
  it('should truncate when exceeding max lines', () => {
    const lines = Array(MAX_INPUT_LINES + 10).fill('example.com')
    const input = lines.join('\n')
    const result = processBatch(input)
    
    expect(result.truncated).toBe(true)
    expect(result.totalCount).toBe(MAX_INPUT_LINES)
    expect(result.truncatedCount).toBe(10)
  })
  
  it('should apply options to each line', () => {
    const input = 'EXAMPLE.COM\n例子.中国'
    const result = processBatch(input, { caseFold: true })
    
    expect(result.results[0].output).toBe('example.com')
    expect(result.results[1].output).toBe('xn--fsqu00a.xn--fiqs8s')
  })
})

describe('Helper functions', () => {
  it('should detect non-ASCII characters', () => {
    expect(hasNonAscii('example')).toBe(false)
    expect(hasNonAscii('例子')).toBe(true)
    expect(hasNonAscii('münchen')).toBe(true)
  })
  
  it('should detect ACE labels', () => {
    expect(isAceLabel('xn--fsqu00a')).toBe(true)
    expect(isAceLabel('XN--FSQU00A')).toBe(true)
    expect(isAceLabel('example')).toBe(false)
  })
  
  it('should compute character-level diff', () => {
    const diff = computeDiff('abc', 'adc')
    
    expect(diff.length).toBe(3)
    expect(diff[0].type).toBe('same')
    expect(diff[1].type).toBe('changed')
    expect(diff[2].type).toBe('same')
  })
  
  it('should handle added characters in diff', () => {
    const diff = computeDiff('abc', 'abcd')
    expect(diff[3].type).toBe('added')
  })
  
  it('should handle removed characters in diff', () => {
    const diff = computeDiff('abcd', 'abc')
    expect(diff[3].type).toBe('removed')
  })
})

describe('Output modes', () => {
  it('should auto-detect and encode Unicode', () => {
    const result = processSingleDomain('例子.中国', { outputMode: OUTPUT_MODES.AUTO })
    expect(result.output).toBe('xn--fsqu00a.xn--fiqs8s')
  })
  
  it('should auto-detect and decode Punycode', () => {
    const result = processSingleDomain('xn--fsqu00a.xn--fiqs8s', { outputMode: OUTPUT_MODES.AUTO })
    expect(result.output).toBe('例子.中国')
  })
  
  it('should force encode to Punycode', () => {
    const result = processSingleDomain('example.com', { outputMode: OUTPUT_MODES.TO_PUNYCODE })
    expect(result.output).toBe('example.com')
  })
  
  it('should force decode to Unicode', () => {
    const result = processSingleDomain('example.com', { outputMode: OUTPUT_MODES.TO_UNICODE })
    expect(result.output).toBe('example.com')
  })
})

describe('Error codes', () => {
  it('should have correct error code for invalid Punycode', () => {
    const result = processSingleDomain('xn--invalid-123')
    expect(result.errors.some(e => e.errorCode === ERROR_CODES.PUNYCODE_DECODE_ERROR)).toBe(true)
  })
  
  it('should return first error as row error', () => {
    const result = processSingleDomain('.example..com')
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('Edge cases', () => {
  it('should handle single-label domains', () => {
    const result = processSingleDomain('localhost')
    expect(result.isValid).toBe(true)
    expect(result.labels.length).toBe(1)
  })
  
  it('should handle fully qualified domain with trailing dot', () => {
    const result = processSingleDomain('example.com.')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.errorCode === ERROR_CODES.TRAILING_DOT)).toBe(true)
  })
  
  it('should handle empty input', () => {
    const result = processBatch('')
    expect(result.results.length).toBe(1)
    expect(result.results[0].isEmpty).toBe(true)
  })
  
  it('should handle null/undefined in batch', () => {
    const result = processBatch('', { stripUrlPrefix: true })
    expect(result.totalCount).toBe(1)
  })
  
  it('should handle very long lines within limits', () => {
    const label63 = 'a'.repeat(63)
    const domain = `${label63}.${label63}.${label63}.com`
    const result = processSingleDomain(domain)
    expect(result.isValid).toBe(true)
  })
})
