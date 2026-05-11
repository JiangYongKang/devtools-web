import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  DEFAULT_PARAMS,
  VALID_DIALECTS,
  VALID_KEYWORD_CASES,
  VALID_INDENT_TYPES,
  normalizeParams,
  getIndentString,
  validateParams,
  STANDARD_KEYWORDS,
  isKeyword,
  applyKeywordCase,
  tokenize,
  buildSyntaxTree,
  formatSql,
  calculateHighlights,
  renderHighlightedHtml,
} from '../logic/index.js'

describe('task018 SQL Formatter Utils', () => {
  describe('errors.js', () => {
    test('ERROR_CODES should contain all error codes', () => {
      expect(ERROR_CODES).toHaveProperty('NULL_INPUT')
      expect(ERROR_CODES).toHaveProperty('EMPTY_INPUT')
      expect(ERROR_CODES).toHaveProperty('INVALID_INDENT')
      expect(ERROR_CODES).toHaveProperty('INPUT_TOO_LARGE')
      expect(ERROR_CODES).toHaveProperty('NESTING_TOO_DEEP')
      expect(ERROR_CODES).toHaveProperty('TRUNCATED_INPUT')
      expect(ERROR_CODES).toHaveProperty('PARSE_FAILED')
      expect(ERROR_CODES).toHaveProperty('INVALID_PARAMETER')
    })

    test('ERROR_MESSAGES should have messages for all error codes', () => {
      for (const code of Object.values(ERROR_CODES)) {
        expect(ERROR_MESSAGES[code]).toBeDefined()
      }
    })

    test('getErrorMessage should return correct message', () => {
      expect(getErrorMessage(ERROR_CODES.NULL_INPUT)).toBe('SQL 输入为 null 或 undefined')
      expect(getErrorMessage(ERROR_CODES.EMPTY_INPUT)).toBe('SQL 输入为空')
    })

    test('createError should return error object with code and message', () => {
      const error = createError(ERROR_CODES.PARSE_FAILED, 'test detail')
      expect(error.errorCode).toBe(ERROR_CODES.PARSE_FAILED)
      expect(error.errorMessage).toContain('SQL 解析失败')
      expect(error.errorMessage).toContain('test detail')
    })

    test('createError without extra message should only contain base message', () => {
      const error = createError(ERROR_CODES.NULL_INPUT)
      expect(error.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      expect(error.errorMessage).toBe('SQL 输入为 null 或 undefined')
    })
  })

  describe('params.js', () => {
    test('DEFAULT_PARAMS should have all default values', () => {
      expect(DEFAULT_PARAMS.dialect).toBe('standard')
      expect(DEFAULT_PARAMS.keywordCase).toBe('upper')
      expect(DEFAULT_PARAMS.indentType).toBe('space')
      expect(DEFAULT_PARAMS.indentWidth).toBe(2)
      expect(DEFAULT_PARAMS.lineBreakStyle).toBe('unix')
      expect(DEFAULT_PARAMS.commentPolicy).toBe('preserve')
      expect(DEFAULT_PARAMS.includeHighlight).toBe(false)
      expect(DEFAULT_PARAMS.maxInputSizeKb).toBe(500)
      expect(DEFAULT_PARAMS.maxNestingDepth).toBe(50)
    })

    test('normalizeParams should return defaults for empty input', () => {
      const result = normalizeParams({})
      expect(result).toEqual(DEFAULT_PARAMS)
    })

    test('normalizeParams should normalize valid dialect', () => {
      const result = normalizeParams({ dialect: 'mysql' })
      expect(result.dialect).toBe('mysql')
    })

    test('normalizeParams should ignore invalid dialect', () => {
      const result = normalizeParams({ dialect: 'invalid' })
      expect(result.dialect).toBe(DEFAULT_PARAMS.dialect)
    })

    test('normalizeParams should normalize keywordCase', () => {
      const result1 = normalizeParams({ keywordCase: 'lower' })
      expect(result1.keywordCase).toBe('lower')

      const result2 = normalizeParams({ keywordCase: 'preserve' })
      expect(result2.keywordCase).toBe('preserve')
    })

    test('normalizeParams should normalize indentType and indentWidth', () => {
      const result1 = normalizeParams({ indentType: 'tab' })
      expect(result1.indentType).toBe('tab')

      const result2 = normalizeParams({ indentWidth: 4 })
      expect(result2.indentWidth).toBe(4)
    })

    test('normalizeParams should clamp indentWidth to valid range', () => {
      const result1 = normalizeParams({ indentWidth: 0 })
      expect(result1.indentWidth).toBe(DEFAULT_PARAMS.indentWidth)

      const result2 = normalizeParams({ indentWidth: 10 })
      expect(result2.indentWidth).toBe(DEFAULT_PARAMS.indentWidth)
    })

    test('normalizeParams should normalize boolean includeHighlight', () => {
      const result1 = normalizeParams({ includeHighlight: true })
      expect(result1.includeHighlight).toBe(true)

      const result2 = normalizeParams({ includeHighlight: 'true' })
      expect(result2.includeHighlight).toBe(true)
    })

    test('getIndentString should return correct indent for space type', () => {
      expect(getIndentString({ indentType: 'space', indentWidth: 2 })).toBe('  ')
      expect(getIndentString({ indentType: 'space', indentWidth: 4 })).toBe('    ')
    })

    test('getIndentString should return tab for tab type', () => {
      expect(getIndentString({ indentType: 'tab', indentWidth: 4 })).toBe('\t')
    })

    test('validateParams should return null for valid params', () => {
      const result = validateParams(DEFAULT_PARAMS)
      expect(result).toBeNull()
    })

    test('validateParams should return errors for invalid params', () => {
      const result = validateParams({ dialect: 'invalid', indentWidth: 10 })
      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThan(0)
    })

    test('VALID_DIALECTS should contain all supported dialects', () => {
      expect(VALID_DIALECTS).toContain('standard')
      expect(VALID_DIALECTS).toContain('mysql')
      expect(VALID_DIALECTS).toContain('postgresql')
      expect(VALID_DIALECTS).toContain('sqlite')
      expect(VALID_DIALECTS).toContain('oracle')
      expect(VALID_DIALECTS).toContain('sqlserver')
    })

    test('VALID_KEYWORD_CASES should contain all options', () => {
      expect(VALID_KEYWORD_CASES).toEqual(['upper', 'lower', 'preserve'])
    })

    test('VALID_INDENT_TYPES should contain all options', () => {
      expect(VALID_INDENT_TYPES).toEqual(['space', 'tab'])
    })
  })

  describe('keywords.js', () => {
    test('STANDARD_KEYWORDS should contain common SQL keywords', () => {
      expect(STANDARD_KEYWORDS.has('SELECT')).toBe(true)
      expect(STANDARD_KEYWORDS.has('FROM')).toBe(true)
      expect(STANDARD_KEYWORDS.has('WHERE')).toBe(true)
      expect(STANDARD_KEYWORDS.has('JOIN')).toBe(true)
      expect(STANDARD_KEYWORDS.has('GROUP')).toBe(true)
      expect(STANDARD_KEYWORDS.has('ORDER')).toBe(true)
    })

    test('isKeyword should return true for keywords', () => {
      expect(isKeyword('SELECT')).toBe(true)
      expect(isKeyword('select')).toBe(true)
      expect(isKeyword('Select')).toBe(true)
    })

    test('isKeyword should return false for non-keywords', () => {
      expect(isKeyword('MY_TABLE')).toBe(false)
      expect(isKeyword('column1')).toBe(false)
    })

    test('isKeyword should respect dialect', () => {
      expect(isKeyword('SHOW', 'mysql')).toBe(true)
      expect(isKeyword('SHOW', 'standard')).toBe(false)
    })

    test('applyKeywordCase should convert to upper case', () => {
      expect(applyKeywordCase('select', 'upper')).toBe('SELECT')
      expect(applyKeywordCase('SELECT', 'upper')).toBe('SELECT')
    })

    test('applyKeywordCase should convert to lower case', () => {
      expect(applyKeywordCase('SELECT', 'lower')).toBe('select')
      expect(applyKeywordCase('select', 'lower')).toBe('select')
    })

    test('applyKeywordCase should preserve case', () => {
      expect(applyKeywordCase('Select', 'preserve')).toBe('Select')
      expect(applyKeywordCase('SELECT', 'preserve')).toBe('SELECT')
      expect(applyKeywordCase('select', 'preserve')).toBe('select')
    })
  })

  describe('parser.js', () => {
    test('tokenize should tokenize simple SQL', () => {
      const sql = 'SELECT * FROM users'
      const tokens = tokenize(sql)

      expect(tokens).toBeInstanceOf(Array)
      expect(tokens.length).toBeGreaterThan(0)

      const keywords = tokens.filter(t => t.type === 'keyword')
      expect(keywords.some(t => t.value.toUpperCase() === 'SELECT')).toBe(true)
      expect(keywords.some(t => t.value.toUpperCase() === 'FROM')).toBe(true)
    })

    test('tokenize should handle strings', () => {
      const sql = "SELECT * FROM users WHERE name = 'John'"
      const tokens = tokenize(sql)
      const strings = tokens.filter(t => t.type === 'string')
      expect(strings.length).toBe(1)
      expect(strings[0].value).toBe("'John'")
    })

    test('tokenize should handle numbers', () => {
      const sql = 'SELECT 123, 45.67, .89'
      const tokens = tokenize(sql)
      const numbers = tokens.filter(t => t.type === 'number')
      expect(numbers.length).toBe(3)
    })

    test('tokenize should handle line comments', () => {
      const sql = 'SELECT * -- this is a comment\nFROM users'
      const tokens = tokenize(sql)
      const comments = tokens.filter(t => t.type === 'comment_line')
      expect(comments.length).toBe(1)
    })

    test('tokenize should handle block comments', () => {
      const sql = 'SELECT * /* block comment */ FROM users'
      const tokens = tokenize(sql)
      const comments = tokens.filter(t => t.type === 'comment')
      expect(comments.length).toBe(1)
    })

    test('buildSyntaxTree should split statements by semicolon', () => {
      const sql = 'SELECT 1; SELECT 2;'
      const tokens = tokenize(sql)
      const statements = buildSyntaxTree(tokens)
      expect(statements.length).toBe(2)
    })

    test('buildSyntaxTree should handle nested parentheses', () => {
      const sql = 'SELECT (1 + (2 * 3));'
      const tokens = tokenize(sql)
      const statements = buildSyntaxTree(tokens)
      expect(statements.length).toBe(1)
    })
  })

  describe('formatter.js', () => {
    test('formatSql should return NULL_INPUT error for null input', () => {
      const result = formatSql(null, DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      expect(result.formattedSql).toBe('')
    })

    test('formatSql should return EMPTY_INPUT error for empty input', () => {
      const result = formatSql('', DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(result.formattedSql).toBe('')
    })

    test('formatSql should return EMPTY_INPUT error for whitespace only', () => {
      const result = formatSql('   \n\t  ', DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('formatSql should return INVALID_INDENT for invalid indent width', () => {
      const result = formatSql('SELECT 1', { ...DEFAULT_PARAMS, indentWidth: 0 })
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_INDENT)
    })

    test('formatSql should return INPUT_TOO_LARGE for oversized input', () => {
      const largeSql = 'A'.repeat(600 * 1024)
      const result = formatSql(largeSql, DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.INPUT_TOO_LARGE)
    })

    test('formatSql should return TRUNCATED_INPUT for unclosed parentheses', () => {
      const result = formatSql('SELECT (1 + 2', DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.TRUNCATED_INPUT)
    })

    test('formatSql should return NESTING_TOO_DEEP for deep nesting', () => {
      let deepSql = 'SELECT '
      for (let i = 0; i < 60; i++) {
        deepSql += '('
      }
      for (let i = 0; i < 60; i++) {
        deepSql += ')'
      }
      const result = formatSql(deepSql, DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.NESTING_TOO_DEEP)
    })

    test('formatSql should format simple SELECT statement', () => {
      const sql = 'select id,name from users where active=1'
      const result = formatSql(sql, DEFAULT_PARAMS)

      expect(result.errorCode).toBeNull()
      expect(result.formattedSql).toBeDefined()
      expect(result.formattedSql.length).toBeGreaterThan(0)
      expect(result.statementCount).toBe(1)
    })

    test('formatSql should apply upper case to keywords', () => {
      const sql = 'select id from users'
      const result = formatSql(sql, { ...DEFAULT_PARAMS, keywordCase: 'upper' })

      expect(result.formattedSql).toContain('SELECT')
      expect(result.formattedSql).toContain('FROM')
    })

    test('formatSql should apply lower case to keywords', () => {
      const sql = 'SELECT id FROM users'
      const result = formatSql(sql, { ...DEFAULT_PARAMS, keywordCase: 'lower' })

      expect(result.formattedSql).toContain('select')
      expect(result.formattedSql).toContain('from')
    })

    test('formatSql should handle multiple statements', () => {
      const sql = 'SELECT 1; SELECT 2; SELECT 3;'
      const result = formatSql(sql, DEFAULT_PARAMS)

      expect(result.errorCode).toBeNull()
      expect(result.statementCount).toBe(3)
    })

    test('formatSql should count original and formatted lines', () => {
      const sql = 'SELECT\n*\nFROM\nusers'
      const result = formatSql(sql, DEFAULT_PARAMS)

      expect(result.originalLineCount).toBe(4)
      expect(result.formattedLineCount).toBeGreaterThan(0)
    })

    test('formatSql should not include highlights when disabled', () => {
      const sql = 'SELECT id FROM users'
      const result = formatSql(sql, { ...DEFAULT_PARAMS, includeHighlight: false })

      expect(result.highlights).toEqual([])
    })

    test('formatSql should include highlights when enabled', () => {
      const sql = 'SELECT id FROM users'
      const result = formatSql(sql, { ...DEFAULT_PARAMS, includeHighlight: true })

      expect(result.highlights).toBeInstanceOf(Array)
      expect(result.highlights.length).toBeGreaterThan(0)

      const firstHighlight = result.highlights[0]
      expect(firstHighlight).toHaveProperty('type')
      expect(firstHighlight).toHaveProperty('startLine')
      expect(firstHighlight).toHaveProperty('startColumn')
      expect(firstHighlight).toHaveProperty('endLine')
      expect(firstHighlight).toHaveProperty('endColumn')
      expect(firstHighlight).toHaveProperty('originalText')
      expect(firstHighlight).toHaveProperty('formattedText')
    })

    test('formatSql should handle JOIN clauses', () => {
      const sql = 'SELECT u.name FROM users u JOIN orders o ON u.id = o.user_id'
      const result = formatSql(sql, DEFAULT_PARAMS)

      expect(result.errorCode).toBeNull()
      expect(result.formattedSql).toContain('JOIN')
      expect(result.formattedSql).toContain('ON')
    })

    test('formatSql should handle GROUP BY and ORDER BY', () => {
      const sql = 'SELECT count(*) FROM users GROUP BY status ORDER BY created_at DESC'
      const result = formatSql(sql, DEFAULT_PARAMS)

      expect(result.errorCode).toBeNull()
      expect(result.formattedSql).toContain('GROUP BY')
      expect(result.formattedSql).toContain('ORDER BY')
    })
  })

  describe('highlights.js', () => {
    test('calculateHighlights should return highlights for keywords', () => {
      const sql = 'SELECT id FROM users WHERE status = 1'
      const highlights = calculateHighlights(sql, 'standard')

      expect(highlights).toBeInstanceOf(Array)
      expect(highlights.length).toBeGreaterThan(0)

      const keywords = highlights.map(h => h.originalText.toUpperCase())
      expect(keywords).toContain('SELECT')
      expect(keywords).toContain('FROM')
      expect(keywords).toContain('WHERE')
    })

    test('calculateHighlights should return empty array for empty input', () => {
      const highlights = calculateHighlights('', 'standard')
      expect(highlights).toEqual([])
    })

    test('calculateHighlights should respect dialect', () => {
      const mysqlSql = 'SHOW TABLES'
      const highlights = calculateHighlights(mysqlSql, 'mysql')

      const keywords = highlights.map(h => h.originalText.toUpperCase())
      expect(keywords).toContain('SHOW')
    })

    test('renderHighlightedHtml should escape HTML', () => {
      const sql = "SELECT '<script>'"
      const html = renderHighlightedHtml(sql, [])

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    test('renderHighlightedHtml should wrap keywords in spans', () => {
      const sql = 'SELECT 1'
      const highlights = [
        {
          type: 'keyword',
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 7,
          originalText: 'SELECT',
          formattedText: 'SELECT',
        },
      ]
      const html = renderHighlightedHtml(sql, highlights)

      expect(html).toContain('<span class="highlight-keyword">')
      expect(html).toContain('SELECT')
    })
  })
})
