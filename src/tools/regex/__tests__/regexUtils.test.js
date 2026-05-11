import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  FLAGS,
  MAX_TEXT_LENGTH,
  MAX_PATTERN_LENGTH,
  MAX_MATCH_COUNT,
  EXECUTION_TIMEOUT_MS,
  escapeHtml,
  compileRegex,
  executeRegexWithTimeout,
  buildHighlightedHtml,
  validateInputs,
  formatMatchInfo,
} from '../regexUtils.js'

describe('regexUtils', () => {
  describe('constants', () => {
    test('FLAGS should contain correct flag definitions', () => {
      expect(FLAGS).toHaveLength(5)
      expect(FLAGS[0]).toEqual({ id: 'g', name: 'g', description: '全局匹配（查找所有匹配项）', default: true })
      expect(FLAGS[1]).toEqual({ id: 'i', name: 'i', description: '忽略大小写', default: false })
      expect(FLAGS[2]).toEqual({ id: 'm', name: 'm', description: '多行模式（^ 和 $ 匹配每行）', default: false })
      expect(FLAGS[3]).toEqual({ id: 's', name: 's', description: '点号匹配换行符', default: false })
      expect(FLAGS[4]).toEqual({ id: 'u', name: 'u', description: 'Unicode 模式', default: false })
    })

    test('limit constants should have correct values', () => {
      expect(MAX_TEXT_LENGTH).toBe(100000)
      expect(MAX_PATTERN_LENGTH).toBe(1000)
      expect(MAX_MATCH_COUNT).toBe(500)
      expect(EXECUTION_TIMEOUT_MS).toBe(2000)
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

    test('should escape HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
      expect(escapeHtml('"quote"')).toBe('&quot;quote&quot;')
      expect(escapeHtml("'single'")).toBe('&#39;single&#39;')
      expect(escapeHtml('&')).toBe('&amp;')
    })

    test('should escape combined HTML special characters', () => {
      const input = '<div class="test">Hello & Welcome</div>'
      const result = escapeHtml(input)
      expect(result).toContain('&lt;div')
      expect(result).toContain('class=&quot;test&quot;')
      expect(result).toContain('Hello &amp; Welcome')
      expect(result).toContain('&lt;/div&gt;')
    })

    test('should return original string if no special characters', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
      expect(escapeHtml('12345')).toBe('12345')
      expect(escapeHtml('')).toBe('')
    })

    test('should prevent XSS attacks', () => {
      const xss = '<script>alert("xss")</script>'
      const escaped = escapeHtml(xss)
      expect(escaped).not.toContain('<script>')
      expect(escaped).toContain('&lt;script&gt;')
    })
  })

  describe('compileRegex', () => {
    test('should return error for empty pattern', () => {
      const result = compileRegex('', 'g')
      expect(result.regex).toBeNull()
      expect(result.error).toBe('请输入正则表达式')
    })

    test('should return error for null pattern', () => {
      const result = compileRegex(null, 'g')
      expect(result.regex).toBeNull()
      expect(result.error).toBe('请输入正则表达式')
    })

    test('should return error for undefined pattern', () => {
      const result = compileRegex(undefined, 'g')
      expect(result.regex).toBeNull()
      expect(result.error).toBe('请输入正则表达式')
    })

    test('should return error for pattern exceeding max length', () => {
      const longPattern = 'a'.repeat(MAX_PATTERN_LENGTH + 1)
      const result = compileRegex(longPattern, 'g')
      expect(result.regex).toBeNull()
      expect(result.error).toContain('正则表达式过长')
      expect(result.error).toContain(`${MAX_PATTERN_LENGTH + 1}`)
    })

    test('should return error for invalid regex syntax', () => {
      const result = compileRegex('[a-z', 'g')
      expect(result.regex).toBeNull()
      expect(result.error).toContain('正则表达式语法错误')
    })

    test('should compile valid regex successfully', () => {
      const result = compileRegex('\\d+', 'g')
      expect(result.error).toBeNull()
      expect(result.regex).toBeInstanceOf(RegExp)
      expect(result.regex.source).toBe('\\d+')
      expect(result.regex.flags).toBe('g')
    })

    test('should use default flags "g" if not provided', () => {
      const result = compileRegex('test', undefined)
      expect(result.regex?.flags).toBe('g')
    })

    test('should handle multiple flags correctly', () => {
      const result = compileRegex('test', 'gi')
      expect(result.regex?.flags).toBe('gi')
    })

    test('should compile patterns at max length boundary', () => {
      const maxPattern = 'a'.repeat(MAX_PATTERN_LENGTH)
      const result = compileRegex(maxPattern, 'g')
      expect(result.error).toBeNull()
      expect(result.regex).toBeInstanceOf(RegExp)
    })
  })

  describe('executeRegexWithTimeout', () => {
    test('should return empty matches for no matches', async () => {
      const regex = new RegExp('xyz', 'g')
      const result = await executeRegexWithTimeout(regex, 'abc123')
      expect(result.matches).toEqual([])
      expect(result.matchCount).toBe(0)
    })

    test('should find single match without global flag', async () => {
      const regex = new RegExp('\\d+', '')
      const result = await executeRegexWithTimeout(regex, 'abc123def456')
      expect(result.matchCount).toBe(1)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].match).toBe('123')
      expect(result.matches[0].index).toBe(3)
    })

    test('should find all matches with global flag', async () => {
      const regex = new RegExp('\\d+', 'g')
      const result = await executeRegexWithTimeout(regex, 'abc123def456ghi789')
      expect(result.matchCount).toBe(3)
      expect(result.matches).toHaveLength(3)
      expect(result.matches[0].match).toBe('123')
      expect(result.matches[1].match).toBe('456')
      expect(result.matches[2].match).toBe('789')
    })

    test('should capture groups correctly', async () => {
      const regex = new RegExp('(\\d{4})-(\\d{2})-(\\d{2})', 'g')
      const result = await executeRegexWithTimeout(regex, '日期：2024-01-15')
      expect(result.matchCount).toBe(1)
      expect(result.matches[0].groups).toEqual(['2024', '01', '15'])
    })

    test('should handle named capture groups', async () => {
      const regex = new RegExp('(?<year>\\d{4})-(?<month>\\d{2})', 'g')
      const result = await executeRegexWithTimeout(regex, '日期：2024-01')
      expect(result.matchCount).toBe(1)
      expect(result.matches[0].namedGroups).toEqual({ year: '2024', month: '01' })
    })

    test('should handle zero-length matches without infinite loop', async () => {
      const regex = new RegExp('a*', 'g')
      const result = await executeRegexWithTimeout(regex, 'aab')
      expect(result.matchCount).toBeGreaterThan(0)
      expect(result.matches.length).toBeLessThanOrEqual(MAX_MATCH_COUNT)
    })

    test('should limit matches to MAX_MATCH_COUNT', async () => {
      const regex = new RegExp('a', 'g')
      const text = 'a'.repeat(MAX_MATCH_COUNT + 100)
      const result = await executeRegexWithTimeout(regex, text)
      expect(result.matchCount).toBe(MAX_MATCH_COUNT + 100)
      expect(result.matches).toHaveLength(MAX_MATCH_COUNT)
      expect(result.hasMoreMatches).toBe(true)
    })

    test('should return hasMoreMatches as false when under limit', async () => {
      const regex = new RegExp('\\d+', 'g')
      const result = await executeRegexWithTimeout(regex, '1 2 3 4 5')
      expect(result.matchCount).toBe(5)
      expect(result.hasMoreMatches).toBe(false)
    })
  })

  describe('buildHighlightedHtml', () => {
    test('should return empty string for empty text', () => {
      expect(buildHighlightedHtml('', [])).toBe('')
      expect(buildHighlightedHtml(null, [])).toBe('')
      expect(buildHighlightedHtml(undefined, [])).toBe('')
    })

    test('should return escaped text when no matches', () => {
      const text = 'hello <world>'
      const result = buildHighlightedHtml(text, [])
      expect(result).toBe('hello &lt;world&gt;')
    })

    test('should highlight single match', () => {
      const text = 'abc123def'
      const matches = [{ index: 3, length: 3, match: '123' }]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toBe('abc<mark class="match-highlight">123</mark>def')
    })

    test('should highlight multiple matches', () => {
      const text = 'abc123def456ghi'
      const matches = [
        { index: 3, length: 3, match: '123' },
        { index: 9, length: 3, match: '456' },
      ]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toBe('abc<mark class="match-highlight">123</mark>def<mark class="match-highlight">456</mark>ghi')
    })

    test('should merge overlapping matches', () => {
      const text = 'abcdefghij'
      const matches = [
        { index: 2, length: 4, match: 'cdef' },
        { index: 4, length: 4, match: 'efgh' },
      ]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toBe('ab<mark class="match-highlight">cdefgh</mark>ij')
    })

    test('should merge adjacent matches', () => {
      const text = 'abcdef'
      const matches = [
        { index: 0, length: 3, match: 'abc' },
        { index: 3, length: 3, match: 'def' },
      ]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toBe('<mark class="match-highlight">abcdef</mark>')
    })

    test('should handle matches at beginning of text', () => {
      const text = 'abcdef'
      const matches = [{ index: 0, length: 3, match: 'abc' }]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toBe('<mark class="match-highlight">abc</mark>def')
    })

    test('should handle matches at end of text', () => {
      const text = 'abcdef'
      const matches = [{ index: 3, length: 3, match: 'def' }]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toBe('abc<mark class="match-highlight">def</mark>')
    })

    test('should escape HTML special characters in text', () => {
      const text = '<div>test</div>'
      const matches = [{ index: 5, length: 4, match: 'test' }]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toContain('&lt;div&gt;')
      expect(result).toContain('<mark class="match-highlight">test</mark>')
      expect(result).toContain('&lt;/div&gt;')
    })

    test('should escape HTML special characters in matched content', () => {
      const text = 'hello <world> foo'
      const matches = [{ index: 6, length: 7, match: '<world>' }]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toContain('<mark class="match-highlight">&lt;world&gt;</mark>')
    })

    test('should sort matches by index', () => {
      const text = 'abc123def456'
      const matches = [
        { index: 9, length: 3, match: '456' },
        { index: 3, length: 3, match: '123' },
      ]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toBe('abc<mark class="match-highlight">123</mark>def<mark class="match-highlight">456</mark>')
    })

    test('should skip zero-length matches', () => {
      const text = 'abcdef'
      const matches = [
        { index: 0, length: 0, match: '' },
        { index: 3, length: 3, match: 'def' },
      ]
      const result = buildHighlightedHtml(text, matches)
      expect(result).toBe('abc<mark class="match-highlight">def</mark>')
    })
  })

  describe('validateInputs', () => {
    test('should return empty array for normal inputs', () => {
      expect(validateInputs('\\d+', 'hello123')).toEqual([])
      expect(validateInputs('a', 'b')).toEqual([])
    })

    test('should return empty array for null/undefined inputs', () => {
      expect(validateInputs(null, null)).toEqual([])
      expect(validateInputs(undefined, undefined)).toEqual([])
      expect(validateInputs('', '')).toEqual([])
    })

    test('should warn about long text', () => {
      const longText = 'a'.repeat(MAX_TEXT_LENGTH + 1)
      const warnings = validateInputs('test', longText)
      expect(warnings).toHaveLength(1)
      expect(warnings[0].type).toBe('warning')
      expect(warnings[0].message).toContain('样本文本较长')
    })

    test('should warn about long pattern', () => {
      const longPattern = 'a'.repeat(Math.floor(MAX_PATTERN_LENGTH * 0.7) + 1)
      const warnings = validateInputs(longPattern, 'test')
      expect(warnings).toHaveLength(1)
      expect(warnings[0].type).toBe('warning')
      expect(warnings[0].message).toContain('正则表达式较长')
    })

    test('should warn about suspicious regex patterns - positive lookahead', () => {
      const warnings = validateInputs('(?=.*foo)bar', 'test')
      expect(warnings).toHaveLength(1)
      expect(warnings[0].message).toContain('回溯风险')
    })

    test('should warn about suspicious regex patterns - negative lookahead', () => {
      const warnings = validateInputs('(?!.*bar)foo', 'test')
      expect(warnings).toHaveLength(1)
      expect(warnings[0].message).toContain('回溯风险')
    })

    test('should warn about suspicious regex patterns - positive lookbehind', () => {
      const warnings = validateInputs('(?<=.*prefix)foo', 'test')
      expect(warnings).toHaveLength(1)
      expect(warnings[0].message).toContain('回溯风险')
    })

    test('should warn about suspicious regex patterns - negative lookbehind', () => {
      const warnings = validateInputs('(?<!.*prefix)foo', 'test')
      expect(warnings).toHaveLength(1)
      expect(warnings[0].message).toContain('回溯风险')
    })

    test('should combine multiple warnings', () => {
      const longText = 'a'.repeat(MAX_TEXT_LENGTH + 1)
      const longPattern = 'a'.repeat(Math.floor(MAX_PATTERN_LENGTH * 0.7) + 1)
      const warnings = validateInputs(longPattern + '(?=.*x)', longText)
      expect(warnings.length).toBeGreaterThanOrEqual(2)
    })

    test('should not warn about safe patterns with quantifiers', () => {
      expect(validateInputs('\\d*', 'test')).toEqual([])
      expect(validateInputs('\\w+', 'test')).toEqual([])
      expect(validateInputs('a{3}', 'test')).toEqual([])
    })
  })

  describe('formatMatchInfo', () => {
    test('should format basic match info', () => {
      const match = {
        index: 5,
        match: 'hello',
        length: 5,
        groups: [],
        namedGroups: {},
      }
      const result = formatMatchInfo(match, 0)
      expect(result.index).toBe(0)
      expect(result.position).toBe(5)
      expect(result.length).toBe(5)
      expect(result.end).toBe(10)
      expect(result.matchedText).toBe('hello')
    })

    test('should format capture groups', () => {
      const match = {
        index: 0,
        match: '2024-01-15',
        length: 10,
        groups: ['2024', '01', '15'],
        namedGroups: {},
      }
      const result = formatMatchInfo(match, 0)
      expect(result.captureGroups).toEqual([
        { index: 1, value: '2024' },
        { index: 2, value: '01' },
        { index: 3, value: '15' },
      ])
    })

    test('should handle null/undefined capture groups', () => {
      const match = {
        index: 0,
        match: 'test',
        length: 4,
        groups: ['matched', null, undefined],
        namedGroups: {},
      }
      const result = formatMatchInfo(match, 0)
      expect(result.captureGroups).toEqual([
        { index: 1, value: 'matched' },
        { index: 2, value: '(未匹配)' },
        { index: 3, value: '(未匹配)' },
      ])
    })

    test('should format named groups', () => {
      const match = {
        index: 0,
        match: '2024-01',
        length: 7,
        groups: ['2024', '01'],
        namedGroups: { year: '2024', month: '01' },
      }
      const result = formatMatchInfo(match, 0)
      expect(result.namedGroups).toEqual([
        { name: 'year', value: '2024' },
        { name: 'month', value: '01' },
      ])
    })

    test('should handle null/undefined named groups', () => {
      const match = {
        index: 0,
        match: 'test',
        length: 4,
        groups: [],
        namedGroups: { foo: 'bar', baz: null, qux: undefined },
      }
      const result = formatMatchInfo(match, 0)
      expect(result.namedGroups).toEqual([
        { name: 'foo', value: 'bar' },
        { name: 'baz', value: '(未匹配)' },
        { name: 'qux', value: '(未匹配)' },
      ])
    })

    test('should handle missing groups and namedGroups', () => {
      const match = {
        index: 0,
        match: 'test',
        length: 4,
      }
      const result = formatMatchInfo(match, 0)
      expect(result.captureGroups).toEqual([])
      expect(result.namedGroups).toEqual([])
    })

    test('should use provided index', () => {
      const match = {
        index: 10,
        match: 'test',
        length: 4,
        groups: [],
        namedGroups: {},
      }
      const result = formatMatchInfo(match, 5)
      expect(result.index).toBe(5)
    })
  })
})
