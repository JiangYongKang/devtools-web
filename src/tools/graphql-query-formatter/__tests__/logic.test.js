import { describe, test, expect } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  DEFAULT_PARAMS,
  VALID_INDENT_WIDTHS,
  MODE,
  normalizeParams,
  getIndentString,
  isKeyword,
  isBuiltinType,
  TOKEN_TYPES,
  tokenize,
  formatGraphQL,
  calculateHighlights,
  renderHighlightedHtml,
  escapeHtml,
  computeDiff,
  SAMPLE_GRAPHQL,
} from '../logic/index.js'

const SIMPLE_QUERY = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}`

const COMPLEX_QUERY = `# 这是一个示例查询
query GetUserWithPosts($userId: ID!, $limit: Int = 10) {
  user(id: $userId) {
    id
    name
    ...UserDetails
    posts(first: $limit) {
      edges {
        node {
          id
          title
          ... on PublishedPost {
            publishedAt
          }
        }
      }
    }
  }
}

fragment UserDetails on User {
  profile {
    avatarUrl
  }
}`

const MUTATION_QUERY = `mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) @deprecated(reason: "Use new API") {
    user {
      id
      name
    }
    success
  }
}`

describe('graphql-query-formatter logic', () => {
  describe('errors.js', () => {
    test('ERROR_CODES should contain all required error codes', () => {
      expect(ERROR_CODES).toHaveProperty('EMPTY_INPUT')
      expect(ERROR_CODES).toHaveProperty('UNBALANCED_BRACKETS')
      expect(ERROR_CODES).toHaveProperty('UNTERMINATED_STRING')
      expect(ERROR_CODES).toHaveProperty('VALIDATION_FAILED')
      expect(ERROR_CODES).toHaveProperty('NULL_INPUT')
      expect(ERROR_CODES).toHaveProperty('INPUT_TOO_LARGE')
      expect(ERROR_CODES).toHaveProperty('DUPLICATE_OPERATION')
      expect(ERROR_CODES).toHaveProperty('PARSE_ERROR')
    })

    test('ERROR_MESSAGES should have messages for all error codes', () => {
      for (const code of Object.values(ERROR_CODES)) {
        expect(ERROR_MESSAGES[code]).toBeDefined()
      }
    })

    test('getErrorMessage should return correct message', () => {
      expect(getErrorMessage(ERROR_CODES.EMPTY_INPUT)).toBe('GraphQL 查询输入为空')
      expect(getErrorMessage(ERROR_CODES.VALIDATION_FAILED)).toBe('验证失败')
    })

    test('createError should return error object with code and message', () => {
      const error = createError(ERROR_CODES.VALIDATION_FAILED, 'test detail')
      expect(error.errorCode).toBe(ERROR_CODES.VALIDATION_FAILED)
      expect(error.errorMessage).toContain('验证失败')
      expect(error.errorMessage).toContain('test detail')
    })

    test('createError without extra message should only contain base message', () => {
      const error = createError(ERROR_CODES.EMPTY_INPUT)
      expect(error.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(error.errorMessage).toBe('GraphQL 查询输入为空')
    })
  })

  describe('constants.js', () => {
    test('DEFAULT_PARAMS should have all default values', () => {
      expect(DEFAULT_PARAMS.mode).toBe(MODE.FORMAT)
      expect(DEFAULT_PARAMS.indentWidth).toBe(2)
      expect(DEFAULT_PARAMS.stripComments).toBe(false)
      expect(DEFAULT_PARAMS.validateOnly).toBe(false)
      expect(DEFAULT_PARAMS.maxInputSizeKb).toBe(500)
    })

    test('VALID_INDENT_WIDTHS should contain valid widths', () => {
      expect(VALID_INDENT_WIDTHS).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    })

    test('normalizeParams should return defaults for empty input', () => {
      const result = normalizeParams({})
      expect(result.mode).toBe(DEFAULT_PARAMS.mode)
      expect(result.indentWidth).toBe(DEFAULT_PARAMS.indentWidth)
    })

    test('normalizeParams should normalize valid indentWidth', () => {
      const result = normalizeParams({ indentWidth: 4 })
      expect(result.indentWidth).toBe(4)
    })

    test('normalizeParams should clamp invalid indentWidth to default', () => {
      const result1 = normalizeParams({ indentWidth: 0 })
      expect(result1.indentWidth).toBe(DEFAULT_PARAMS.indentWidth)

      const result2 = normalizeParams({ indentWidth: 100 })
      expect(result2.indentWidth).toBe(DEFAULT_PARAMS.indentWidth)
    })

    test('normalizeParams should handle stripComments', () => {
      const result = normalizeParams({ stripComments: true })
      expect(result.stripComments).toBe(true)
    })

    test('getIndentString should return correct indent', () => {
      expect(getIndentString({ indentWidth: 2 })).toBe('  ')
      expect(getIndentString({ indentWidth: 4 })).toBe('    ')
    })

    test('isKeyword should return true for keywords', () => {
      expect(isKeyword('query')).toBe(true)
      expect(isKeyword('mutation')).toBe(true)
      expect(isKeyword('subscription')).toBe(true)
      expect(isKeyword('fragment')).toBe(true)
      expect(isKeyword('on')).toBe(true)
      expect(isKeyword('true')).toBe(true)
      expect(isKeyword('false')).toBe(true)
      expect(isKeyword('null')).toBe(true)
    })

    test('isKeyword should return false for non-keywords', () => {
      expect(isKeyword('MyType')).toBe(false)
      expect(isKeyword('user')).toBe(false)
    })

    test('isBuiltinType should return true for builtin types', () => {
      expect(isBuiltinType('Int')).toBe(true)
      expect(isBuiltinType('Float')).toBe(true)
      expect(isBuiltinType('String')).toBe(true)
      expect(isBuiltinType('Boolean')).toBe(true)
      expect(isBuiltinType('ID')).toBe(true)
    })

    test('isBuiltinType should return false for non-builtin types', () => {
      expect(isBuiltinType('MyType')).toBe(false)
    })
  })

  describe('parser.js', () => {
    test('tokenize should tokenize simple query', () => {
      const tokens = tokenize(SIMPLE_QUERY)

      expect(tokens).toBeInstanceOf(Array)
      expect(tokens.length).toBeGreaterThan(0)

      const keywords = tokens.filter(t => t.type === TOKEN_TYPES.KEYWORD)
      expect(keywords.some(t => t.value === 'query')).toBe(true)

      const identifiers = tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER)
      expect(identifiers.length).toBeGreaterThan(0)
    })

    test('tokenize should handle comments', () => {
      const tokens = tokenize(`# This is a comment
query GetUser { user { id } }`)

      const comments = tokens.filter(t =>
        t.type === TOKEN_TYPES.COMMENT || t.type === TOKEN_TYPES.COMMENT_LINE
      )
      expect(comments.length).toBeGreaterThan(0)
    })

    test('tokenize should handle strings', () => {
      const tokens = tokenize('{ user(name: "John") { id } }')
      const strings = tokens.filter(t => t.type === TOKEN_TYPES.STRING)
      expect(strings.length).toBe(1)
      expect(strings[0].value).toBe('"John"')
    })

    test('tokenize should handle block strings', () => {
      const tokens = tokenize('{ user(bio: """Multi\nline\nstring""") { id } }')
      const strings = tokens.filter(t => t.type === TOKEN_TYPES.STRING)
      expect(strings.length).toBe(1)
      expect(strings[0].value).toContain('"""')
    })

    test('tokenize should handle variables', () => {
      const tokens = tokenize('query GetUser($id: ID!) { user(id: $id) { id } }')
      const variables = tokens.filter(t => t.type === TOKEN_TYPES.VARIABLE)
      expect(variables.length).toBe(2)
      expect(variables[0].value).toBe('$id')
    })

    test('tokenize should handle directives', () => {
      const tokens = tokenize('{ user @include(if: true) { id } }')
      const directives = tokens.filter(t => t.type === TOKEN_TYPES.DIRECTIVE)
      expect(directives.length).toBe(1)
      expect(directives[0].value).toBe('@include')
    })

    test('tokenize should handle spread operator', () => {
      const tokens = tokenize('{ user { ...UserDetails } }')
      const spreads = tokens.filter(t => t.type === TOKEN_TYPES.SPREAD)
      expect(spreads.length).toBe(1)
      expect(spreads[0].value).toBe('...')
    })

    test('tokenize should handle numbers', () => {
      const tokens = tokenize('{ users(first: 10, offset: 5.5) { id } }')
      const numbers = tokens.filter(t => t.type === TOKEN_TYPES.NUMBER)
      expect(numbers.length).toBe(2)
    })

    test('tokenize should track line and column positions', () => {
      const tokens = tokenize('query\nGetUser\n{\n  user\n}')

      const queryToken = tokens.find(t => t.value === 'query')
      expect(queryToken.startLine).toBe(1)
      expect(queryToken.startColumn).toBe(1)

      const getUserToken = tokens.find(t => t.value === 'GetUser')
      expect(getUserToken.startLine).toBe(2)
      expect(getUserToken.startColumn).toBe(1)
    })

    test('tokenize should handle inline fragments', () => {
      const tokens = tokenize(COMPLEX_QUERY)
      const spreads = tokens.filter(t => t.type === TOKEN_TYPES.SPREAD)
      expect(spreads.length).toBeGreaterThan(0)
    })
  })

  describe('formatter.js', () => {
    test('formatGraphQL should return NULL_INPUT error for null input', () => {
      const result = formatGraphQL(null, DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
      expect(result.formattedText).toBe('')
    })

    test('formatGraphQL should return EMPTY_INPUT error for empty input', () => {
      const result = formatGraphQL('', DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(result.formattedText).toBe('')
    })

    test('formatGraphQL should return EMPTY_INPUT error for whitespace only', () => {
      const result = formatGraphQL('   \n\t  ', DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('formatGraphQL should return INPUT_TOO_LARGE for oversized input', () => {
      const largeInput = 'A'.repeat(600 * 1024)
      const result = formatGraphQL(largeInput, DEFAULT_PARAMS)
      expect(result.errorCode).toBe(ERROR_CODES.INPUT_TOO_LARGE)
    })

    test('formatGraphQL should format simple query', () => {
      const result = formatGraphQL(SIMPLE_QUERY, DEFAULT_PARAMS)

      expect(result.errorCode).toBeNull()
      expect(result.formattedText).toBeDefined()
      expect(result.formattedText.length).toBeGreaterThan(0)
      expect(result.compressedText).toBeDefined()
    })

    test('formatGraphQL should preserve structure', () => {
      const result = formatGraphQL(SIMPLE_QUERY, DEFAULT_PARAMS)

      expect(result.formattedText).toContain('query')
      expect(result.formattedText).toContain('GetUser')
      expect(result.formattedText).toContain('$id')
      expect(result.formattedText).toContain('user')
      expect(result.formattedText).toContain('name')
    })

    test('formatGraphQL should compress query', () => {
      const result = formatGraphQL(SIMPLE_QUERY, DEFAULT_PARAMS)

      expect(result.compressedText).toBeDefined()
      expect(result.compressedText.length).toBeLessThan(result.formattedText.length)
      expect(result.compressedText).not.toContain('\n')
    })

    test('formatGraphQL should generate highlights', () => {
      const result = formatGraphQL(SIMPLE_QUERY, DEFAULT_PARAMS)

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

    test('formatGraphQL should generate outline', () => {
      const result = formatGraphQL(SIMPLE_QUERY, DEFAULT_PARAMS)

      expect(result.outline).toBeInstanceOf(Array)
      expect(result.outline.length).toBe(1)
      expect(result.outline[0].type).toBe('operation')
      expect(result.outline[0].operationType).toBe('query')
      expect(result.outline[0].name).toBe('GetUser')
    })

    test('formatGraphQL should extract fragments in outline', () => {
      const result = formatGraphQL(COMPLEX_QUERY, DEFAULT_PARAMS)

      const operations = result.outline.filter(o => o.type === 'operation')
      const fragments = result.outline.filter(o => o.type === 'fragment')

      expect(operations.length).toBe(1)
      expect(fragments.length).toBe(1)
      expect(fragments[0].name).toBe('UserDetails')
    })

    test('formatGraphQL should detect unbalanced braces', () => {
      const brokenQuery = `query Broken {
        user {
          id
          name
      }`

      const result = formatGraphQL(brokenQuery, DEFAULT_PARAMS)

      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics.some(d =>
        d.message.includes('未闭合') || d.message.includes('多余')
      )).toBe(true)
    })

    test('formatGraphQL should detect duplicate operation names', () => {
      const duplicateQuery = `
query GetUser {
  user(id: "1") { id }
}

query GetUser {
  user(id: "2") { name }
}`

      const result = formatGraphQL(duplicateQuery, DEFAULT_PARAMS)

      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics.some(d =>
        d.message.includes('重复') || d.message.includes('GetUser')
      )).toBe(true)
    })

    test('formatGraphQL should return diagnostics with line and column', () => {
      const brokenQuery = `query Broken {
        user {
          id
          name
      }`

      const result = formatGraphQL(brokenQuery, DEFAULT_PARAMS)

      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0]).toHaveProperty('line')
      expect(result.diagnostics[0]).toHaveProperty('column')
      expect(result.diagnostics[0]).toHaveProperty('message')
      expect(result.diagnostics[0]).toHaveProperty('severity')
    })

    test('formatGraphQL should handle stripComments option', () => {
      const queryWithComment = `# This is a comment
query GetUser {
  # Another comment
  user { id }
}`

      const resultWithComments = formatGraphQL(queryWithComment, {
        ...DEFAULT_PARAMS,
        stripComments: false,
      })
      const resultWithoutComments = formatGraphQL(queryWithComment, {
        ...DEFAULT_PARAMS,
        stripComments: true,
      })

      expect(resultWithComments.formattedText).toContain('#')
      expect(resultWithoutComments.formattedText).not.toContain('#')
    })

    test('formatGraphQL should handle different indent widths', () => {
      const result2 = formatGraphQL(SIMPLE_QUERY, {
        ...DEFAULT_PARAMS,
        indentWidth: 2,
      })
      const result4 = formatGraphQL(SIMPLE_QUERY, {
        ...DEFAULT_PARAMS,
        indentWidth: 4,
      })

      expect(result2.formattedText).not.toBe(result4.formattedText)
    })

    test('formatGraphQL should handle mutations', () => {
      const result = formatGraphQL(MUTATION_QUERY, DEFAULT_PARAMS)

      expect(result.errorCode).toBeNull()
      expect(result.formattedText).toContain('mutation')
      expect(result.formattedText).toContain('UpdateUser')
      expect(result.outline[0].operationType).toBe('mutation')
    })

    test('formatGraphQL should handle directives', () => {
      const result = formatGraphQL(MUTATION_QUERY, DEFAULT_PARAMS)

      expect(result.formattedText).toContain('@deprecated')
    })

    test('formatGraphQL should handle inline fragments', () => {
      const result = formatGraphQL(COMPLEX_QUERY, DEFAULT_PARAMS)

      expect(result.formattedText).toContain('... on PublishedPost')
    })

    test('SAMPLE_GRAPHQL should be valid', () => {
      const result = formatGraphQL(SAMPLE_GRAPHQL, DEFAULT_PARAMS)
      expect(result.errorCode).toBeNull()
      expect(result.formattedText.length).toBeGreaterThan(0)
    })
  })

  describe('highlights.js', () => {
    test('escapeHtml should escape HTML characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
      expect(escapeHtml('&')).toBe('&amp;')
      expect(escapeHtml('"')).toBe('&quot;')
      expect(escapeHtml("'")).toBe('&#39;')
    })

    test('escapeHtml should handle null/undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    test('calculateHighlights should return highlights for keywords', () => {
      const highlights = calculateHighlights(SIMPLE_QUERY)

      expect(highlights).toBeInstanceOf(Array)
      expect(highlights.length).toBeGreaterThan(0)

      const types = highlights.map(h => h.type)
      expect(types).toContain(TOKEN_TYPES.KEYWORD)
    })

    test('calculateHighlights should return empty array for empty input', () => {
      const highlights = calculateHighlights('')
      expect(highlights).toEqual([])
    })

    test('renderHighlightedHtml should escape HTML', () => {
      const html = renderHighlightedHtml('{ user(name: "<script>") { id } }', [])

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    test('renderHighlightedHtml should wrap tokens in spans', () => {
      const text = 'query GetUser { id }'
      const highlights = calculateHighlights(text)

      expect(highlights.length).toBeGreaterThan(0)

      const html = renderHighlightedHtml(text, highlights)
      expect(html).toContain('<span class="highlight-keyword">')
      expect(html).toContain('query')
    })
  })

  describe('diff.js', () => {
    test('computeDiff should return success for equal inputs', () => {
      const result = computeDiff('abc', 'abc', { granularity: 'line' })

      expect(result.success).toBe(true)
      expect(result.result.hasDifferences).toBe(false)
    })

    test('computeDiff should detect differences', () => {
      const result = computeDiff('abc', 'def', { granularity: 'line' })

      expect(result.success).toBe(true)
      expect(result.result.hasDifferences).toBe(true)
    })

    test('computeDiff should handle null inputs', () => {
      const result = computeDiff(null, 'abc', { granularity: 'line' })

      expect(result.success).toBe(false)
      expect(result.error.code).toBeDefined()
    })

    test('computeDiff should work with word granularity', () => {
      const result = computeDiff('hello world', 'hello there', { granularity: 'word' })

      expect(result.success).toBe(true)
      expect(result.result.hasDifferences).toBe(true)
    })

    test('computeDiff should return segments', () => {
      const result = computeDiff('line1\nline2', 'line1\nline3', { granularity: 'line' })

      expect(result.success).toBe(true)
      expect(result.result.segments).toBeInstanceOf(Array)
      expect(result.result.segments.length).toBeGreaterThan(0)
    })
  })

  describe('integration tests', () => {
    test('formatted and compressed should both be valid', () => {
      const result = formatGraphQL(SIMPLE_QUERY, DEFAULT_PARAMS)

      expect(result.errorCode).toBeNull()
      expect(result.formattedText.length).toBeGreaterThan(0)
      expect(result.compressedText.length).toBeGreaterThan(0)
    })

    test('diagnostics should include positions', () => {
      const brokenQuery = `query Test {
  user {
    id
    name
}`

      const result = formatGraphQL(brokenQuery, DEFAULT_PARAMS)

      if (result.diagnostics.length > 0) {
        const diagnostic = result.diagnostics[0]
        expect(typeof diagnostic.line).toBe('number')
        expect(typeof diagnostic.column).toBe('number')
      }
    })

    test('outline should include line numbers', () => {
      const result = formatGraphQL(COMPLEX_QUERY, DEFAULT_PARAMS)

      for (const item of result.outline) {
        expect(item.line).toBeDefined()
        expect(item.column).toBeDefined()
      }
    })

    test('compressed text should be minified', () => {
      const result = formatGraphQL(SIMPLE_QUERY, DEFAULT_PARAMS)

      expect(result.compressedText).not.toContain('  ')
      expect(result.compressedText).not.toContain('\n')
    })

    test('stripComments should remove all # comments', () => {
      const query = `# Comment 1
query Test { # Comment 2
  # Comment 3
  user { id }
}`

      const result = formatGraphQL(query, {
        ...DEFAULT_PARAMS,
        stripComments: true,
      })

      expect(result.formattedText).not.toContain('#')
      expect(result.compressedText).not.toContain('#')
    })

    test('variables should be highlighted', () => {
      const result = formatGraphQL(SIMPLE_QUERY, DEFAULT_PARAMS)

      const variableHighlights = result.highlights.filter(
        h => h.type === TOKEN_TYPES.VARIABLE
      )
      expect(variableHighlights.length).toBeGreaterThan(0)
    })

    test('strings should be highlighted', () => {
      const result = formatGraphQL('{ user(name: "John") { id } }', DEFAULT_PARAMS)

      const stringHighlights = result.highlights.filter(
        h => h.type === TOKEN_TYPES.STRING
      )
      expect(stringHighlights.length).toBe(1)
    })

    test('directives should be highlighted', () => {
      const result = formatGraphQL(MUTATION_QUERY, DEFAULT_PARAMS)

      const directiveHighlights = result.highlights.filter(
        h => h.type === TOKEN_TYPES.DIRECTIVE
      )
      expect(directiveHighlights.length).toBeGreaterThan(0)
    })

    test('numbers should be highlighted', () => {
      const result = formatGraphQL('{ users(first: 10) { id } }', DEFAULT_PARAMS)

      const numberHighlights = result.highlights.filter(
        h => h.type === TOKEN_TYPES.NUMBER
      )
      expect(numberHighlights.length).toBe(1)
    })

    test('anonymous operations should be labeled in outline', () => {
      const result = formatGraphQL('{ user { id } }', DEFAULT_PARAMS)

      expect(result.outline.length).toBe(1)
      expect(result.outline[0].name).toBe('(匿名)')
    })

    test('multiple operations should all appear in outline', () => {
      const multiOpQuery = `
query GetUser {
  user { id }
}

mutation UpdateUser {
  updateUser { success }
}

subscription OnUserUpdated {
  userUpdated { id }
}
`

      const result = formatGraphQL(multiOpQuery, DEFAULT_PARAMS)

      expect(result.outline.length).toBe(3)
      expect(result.outline.filter(o => o.operationType === 'query').length).toBe(1)
      expect(result.outline.filter(o => o.operationType === 'mutation').length).toBe(1)
      expect(result.outline.filter(o => o.operationType === 'subscription').length).toBe(1)
    })

    test('HTML in strings should be escaped in output', () => {
      const maliciousQuery = `{ user(bio: "<script>alert('xss')</script>") { id } }`
      const result = formatGraphQL(maliciousQuery, DEFAULT_PARAMS)

      const html = renderHighlightedHtml(result.formattedText, result.highlights)

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })
  })
})
