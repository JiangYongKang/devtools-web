import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  exportDraftToJson,
  importFromJson,
  importFromYaml,
  saveDraftToStorage,
  loadDraftFromStorage,
  clearDraftFromStorage,
  encodeShareUrl,
  decodeShareUrl,
  generateShareUrl,
} from '../logic/importExport.js'
import {
  parseOpenApiFragment,
  tryExtractFromClipboardContent,
} from '../logic/openapiParser.js'
import {
  expandPlaceholders,
  detectPlaceholders,
  getPlaceholderPreview,
  getAllPlaceholderInfo,
} from '../logic/placeholders.js'
import {
  generateCurlExample,
  generateAllCurlExamples,
  getDraftSummary,
  generateDocumentationMarkdown,
} from '../logic/documentation.js'
import { ERROR_CODES } from '../logic/constants.js'
import { createDefaultRule, createEmptyDraft } from '../logic/normalization.js'

describe('importExport', () => {
  describe('exportDraftToJson', () => {
    test('should export draft to JSON string', () => {
      const draft = {
        rules: [
          { ...createDefaultRule(0), path: '/api/users' },
        ],
        metadata: { createdAt: 1234567890 },
      }

      const json = exportDraftToJson(draft)
      const parsed = JSON.parse(json)

      expect(parsed.rules).toHaveLength(1)
      expect(parsed.rules[0].path).toBe('/api/users')
      expect(parsed.metadata).toBeDefined()
    })

    test('should handle null or undefined draft', () => {
      const json1 = exportDraftToJson(null)
      const json2 = exportDraftToJson(undefined)

      expect(() => JSON.parse(json1)).not.toThrow()
      expect(() => JSON.parse(json2)).not.toThrow()
    })
  })

  describe('importFromJson', () => {
    test('should import valid JSON draft', () => {
      const json = JSON.stringify({
        rules: [
          { id: 'test-rule', path: '/api/users', methods: ['GET'], statusCode: 200 },
        ],
      })

      const result = importFromJson(json)

      expect(result.success).toBe(true)
      expect(result.draft.rules).toHaveLength(1)
      expect(result.draft.rules[0].path).toBe('/api/users')
    })

    test('should reject invalid JSON', () => {
      const result = importFromJson('{invalid}')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.IMPORT_FAILED)
    })

    test('should reject empty string', () => {
      const result = importFromJson('')
      expect(result.success).toBe(false)
    })

    test('should normalize imported rules', () => {
      const json = JSON.stringify({
        rules: [
          {
            id: 'test-rule',
            path: '/api/users',
            methods: ['invalid_method'],
            statusCode: 999,
          },
        ],
      })

      const result = importFromJson(json)

      expect(result.success).toBe(true)
      expect(result.draft.rules[0].methods).toEqual(['GET'])
    })
  })

  describe('importFromYaml', () => {
    test('should reject when parser not available', () => {
      const result = importFromYaml('path: /api', null)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_YAML)
    })

    test('should reject empty YAML', () => {
      const mockParser = { parse: () => ({}) }
      const result = importFromYaml('', mockParser)
      expect(result.success).toBe(false)
    })

    test('should handle YAML parse error', () => {
      const mockParser = {
        parse: () => {
          throw new Error('Invalid YAML')
        },
      }
      const result = importFromYaml('invalid yaml', mockParser)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_YAML)
    })

    test('should parse valid YAML', () => {
      const mockParser = {
        parse: () => ({
          rules: [{ id: 'test', path: '/api/users' }],
        }),
      }
      const result = importFromYaml('valid yaml', mockParser)
      expect(result.success).toBe(true)
      expect(result.draft.rules).toHaveLength(1)
    })
  })

  describe('localStorage operations', () => {
    let originalLocalStorage
    let localStorageMock

    beforeEach(() => {
      originalLocalStorage = globalThis.localStorage
      localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      }
      Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        configurable: true,
      })
    })

    afterEach(() => {
      if (originalLocalStorage) {
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          configurable: true,
        })
      }
    })

    test('should save draft to storage', () => {
      const draft = createEmptyDraft()
      const result = saveDraftToStorage(draft)

      expect(result.success).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    test('should handle save error', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded')
      })

      const draft = createEmptyDraft()
      const result = saveDraftToStorage(draft)

      expect(result.success).toBe(false)
    })

    test('should load draft from storage', () => {
      const draft = createEmptyDraft()
      localStorageMock.getItem.mockReturnValue(JSON.stringify(draft))

      const result = loadDraftFromStorage()

      expect(result.success).toBe(true)
      expect(result.draft).toBeDefined()
    })

    test('should return empty draft when no stored data', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = loadDraftFromStorage()

      expect(result.success).toBe(false)
      expect(result.draft.rules).toHaveLength(0)
    })

    test('should handle load error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const result = loadDraftFromStorage()

      expect(result.success).toBe(false)
      expect(result.draft).toBeDefined()
    })

    test('should clear storage', () => {
      const result = clearDraftFromStorage()

      expect(result.success).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })

    test('should handle clear error', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Clear error')
      })

      const result = clearDraftFromStorage()

      expect(result.success).toBe(false)
    })
  })

  describe('share URL encoding/decoding', () => {
    test('should encode and decode share URL', () => {
      const draft = {
        rules: [{ ...createDefaultRule(0), path: '/api/users' }],
      }

      const encoded = encodeShareUrl(draft)
      expect(encoded.success).toBe(true)

      const decoded = decodeShareUrl(encoded.param)
      expect(decoded.success).toBe(true)
      expect(decoded.draft.rules).toHaveLength(1)
      expect(decoded.draft.rules[0].path).toBe('/api/users')
    })

    test('should reject empty param for decode', () => {
      const result = decodeShareUrl('')
      expect(result.success).toBe(false)
    })

    test('should reject invalid encoded data', () => {
      const result = decodeShareUrl('%invalid')
      expect(result.success).toBe(false)
    })

    test('should reject share URL exceeding max length', () => {
      const largeDraft = {
        rules: Array(100)
          .fill(null)
          .map((_, i) => ({
            ...createDefaultRule(i),
            path: `/api/very/long/path/that/includes/many/segments/${i}`,
            body: 'x'.repeat(200),
          })),
      }

      const result = encodeShareUrl(largeDraft)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.SHARE_URL_TOO_LONG)
    })

    test('should generate full share URL', () => {
      const draft = {
        rules: [{ ...createDefaultRule(0), path: '/api' }],
      }

      const result = generateShareUrl(draft, 'http://localhost:3000/tools/041')

      expect(result.success).toBe(true)
      expect(result.url).toContain('http://localhost:3000/tools/041')
      expect(result.url).toContain('draft=')
    })

    test('should handle base URL with existing query params', () => {
      const draft = {
        rules: [{ ...createDefaultRule(0), path: '/api' }],
      }

      const result = generateShareUrl(draft, 'http://localhost:3000/tools/041?existing=param')

      expect(result.success).toBe(true)
      expect(result.url).toContain('existing=param')
      expect(result.url).toContain('&draft=')
    })
  })
})

describe('openapiParser', () => {
  describe('parseOpenApiFragment', () => {
    test('should parse valid OpenAPI JSON with paths', () => {
      const openapi = {
        openapi: '3.0.0',
        paths: {
          '/api/users': {
            get: {
              summary: 'Get users',
              responses: {
                200: {
                  content: {
                    'application/json': {
                      example: { users: [] },
                    },
                  },
                },
              },
            },
          },
        },
      }

      const result = parseOpenApiFragment(JSON.stringify(openapi))

      expect(result.success).toBe(true)
      expect(result.rules).toHaveLength(1)
      expect(result.rules[0].path).toBe('/api/users')
      expect(result.rules[0].methods).toContain('GET')
    })

    test('should extract status code from response', () => {
      const openapi = {
        paths: {
          '/api/users': {
            post: {
              responses: {
                201: { content: {} },
              },
            },
          },
        },
      }

      const result = parseOpenApiFragment(JSON.stringify(openapi))

      expect(result.success).toBe(true)
      expect(result.rules[0].statusCode).toBe(201)
      expect(result.rules[0].methods).toContain('POST')
    })

    test('should reject empty input', () => {
      const result = parseOpenApiFragment('')
      expect(result.success).toBe(false)
    })

    test('should reject invalid JSON/YAML', () => {
      const result = parseOpenApiFragment('not json or yaml')
      expect(result.success).toBe(false)
    })

    test('should reject when no paths found', () => {
      const result = parseOpenApiFragment(JSON.stringify({ info: { title: 'Test' } }))
      expect(result.success).toBe(false)
    })

    test('should handle path parameters and convert to regex', () => {
      const openapi = {
        paths: {
          '/api/users/{id}': {
            get: {
              responses: { 200: { content: {} } },
            },
          },
        },
      }

      const result = parseOpenApiFragment(JSON.stringify(openapi))

      expect(result.success).toBe(true)
      expect(result.rules[0].path).not.toContain('{id}')
    })

    test('should extract example from response', () => {
      const openapi = {
        paths: {
          '/api/users': {
            get: {
              responses: {
                200: {
                  content: {
                    'application/json': {
                      example: { id: 1, name: 'Test' },
                    },
                  },
                },
              },
            },
          },
        },
      }

      const result = parseOpenApiFragment(JSON.stringify(openapi))

      expect(result.success).toBe(true)
      expect(result.rules[0].body).toContain('"id": 1')
    })
  })

  describe('tryExtractFromClipboardContent', () => {
    test('should return null for empty content', () => {
      expect(tryExtractFromClipboardContent('')).toBeNull()
    })

    test('should return null for non-OpenAPI content', () => {
      expect(tryExtractFromClipboardContent('Hello World')).toBeNull()
    })

    test('should detect OpenAPI JSON', () => {
      const openapi = JSON.stringify({
        openapi: '3.0.0',
        paths: {
          '/api': {
            get: { responses: { 200: {} } },
          },
        },
      })

      const result = tryExtractFromClipboardContent(openapi)
      expect(result).not.toBeNull()
      expect(result.success).toBe(true)
    })

    test('should detect Swagger format', () => {
      const swagger = JSON.stringify({
        swagger: '2.0',
        paths: {
          '/api': {
            get: { responses: { 200: {} } },
          },
        },
      })

      const result = tryExtractFromClipboardContent(swagger)
      expect(result).not.toBeNull()
      expect(result.success).toBe(true)
    })
  })
})

describe('placeholders', () => {
  describe('getAllPlaceholderInfo', () => {
    test('should return all placeholder info', () => {
      const info = getAllPlaceholderInfo()
      expect(Array.isArray(info)).toBe(true)
      expect(info.length).toBeGreaterThan(0)
      expect(info[0].placeholder).toBeDefined()
      expect(info[0].description).toBeDefined()
      expect(info[0].example).toBeDefined()
    })
  })

  describe('expandPlaceholders', () => {
    test('should expand {{now}} to ISO timestamp', () => {
      const expanded = expandPlaceholders('Created at: {{now}}')
      expect(expanded).toMatch(/Created at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    test('should expand {{uuid}} to UUID format', () => {
      const expanded = expandPlaceholders('ID: {{uuid}}')
      expect(expanded).toMatch(/ID: [0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
    })

    test('should expand multiple placeholders', () => {
      const expanded = expandPlaceholders('{{now}} - {{uuid}}')
      expect(expanded).not.toContain('{{now}}')
      expect(expanded).not.toContain('{{uuid}}')
    })

    test('should handle text without placeholders', () => {
      expect(expandPlaceholders('No placeholders')).toBe('No placeholders')
    })

    test('should handle non-string input', () => {
      expect(expandPlaceholders(null)).toBeNull()
      expect(expandPlaceholders(undefined)).toBeUndefined()
      expect(expandPlaceholders(123)).toBe(123)
    })
  })

  describe('detectPlaceholders', () => {
    test('should detect {{now}} placeholder', () => {
      const found = detectPlaceholders('{{now}}')
      expect(found).toHaveLength(1)
      expect(found[0].placeholder).toBe('{{now}}')
    })

    test('should detect {{uuid}} placeholder', () => {
      const found = detectPlaceholders('{{uuid}}')
      expect(found).toHaveLength(1)
      expect(found[0].placeholder).toBe('{{uuid}}')
    })

    test('should detect multiple placeholders', () => {
      const found = detectPlaceholders('{{now}} and {{uuid}}')
      expect(found).toHaveLength(2)
    })

    test('should return empty array for no placeholders', () => {
      const found = detectPlaceholders('No placeholders')
      expect(found).toHaveLength(0)
    })
  })

  describe('getPlaceholderPreview', () => {
    test('should return preview with expanded values', () => {
      const result = getPlaceholderPreview('Time: {{now}}')

      expect(result.hasPlaceholders).toBe(true)
      expect(result.placeholders).toHaveLength(1)
      expect(result.preview).not.toContain('{{now}}')
    })

    test('should return no placeholders flag', () => {
      const result = getPlaceholderPreview('Plain text')

      expect(result.hasPlaceholders).toBe(false)
      expect(result.placeholders).toHaveLength(0)
      expect(result.preview).toBe('Plain text')
    })
  })
})

describe('documentation', () => {
  describe('generateCurlExample', () => {
    test('should generate basic curl example', () => {
      const rule = {
        ...createDefaultRule(0),
        path: '/api/users',
        methods: ['GET'],
      }

      const curl = generateCurlExample(rule, 'http://localhost:3000')

      expect(curl).toContain('curl -X GET')
      expect(curl).toContain('"http://localhost:3000/api/users"')
    })

    test('should include headers', () => {
      const rule = {
        ...createDefaultRule(0),
        path: '/api/users',
        methods: ['GET'],
        headers: { 'Content-Type': 'application/json' },
      }

      const curl = generateCurlExample(rule)

      expect(curl).toContain('-H "Content-Type: application/json"')
    })

    test('should include body for POST requests', () => {
      const rule = {
        ...createDefaultRule(0),
        path: '/api/users',
        methods: ['POST'],
        body: '{"name": "Test"}',
        bodyType: 'json',
      }

      const curl = generateCurlExample(rule)

      expect(curl).toContain('-d ')
    })

    test('should handle null rule', () => {
      expect(generateCurlExample(null)).toBe('')
    })
  })

  describe('generateAllCurlExamples', () => {
    test('should generate examples for all rules', () => {
      const rules = [
        { ...createDefaultRule(0), id: 'r1', path: '/api/users', methods: ['GET'] },
        { ...createDefaultRule(1), id: 'r2', path: '/api/orders', methods: ['POST'] },
      ]

      const examples = generateAllCurlExamples(rules)

      expect(examples).toHaveLength(2)
      expect(examples[0].ruleId).toBe('r1')
      expect(examples[1].ruleId).toBe('r2')
    })

    test('should handle empty rules', () => {
      const examples = generateAllCurlExamples([])
      expect(examples).toEqual([])
    })
  })

  describe('getDraftSummary', () => {
    test('should calculate summary stats', () => {
      const draft = {
        rules: [
          {
            ...createDefaultRule(0),
            path: '/api/users',
            methods: ['GET', 'POST'],
            statusCode: 200,
            delayMs: 100,
            tags: ['users'],
          },
          {
            ...createDefaultRule(1),
            path: '/api/orders',
            methods: ['GET', 'DELETE'],
            statusCode: 200,
            delayMs: 200,
            tags: ['orders'],
          },
        ],
      }

      const summary = getDraftSummary(draft)

      expect(summary.totalRules).toBe(2)
      expect(summary.uniquePaths).toBe(2)
      expect(summary.methodsCovered.sort()).toEqual(['DELETE', 'GET', 'POST'])
      expect(summary.maxDelay).toBe(200)
      expect(summary.totalDelay).toBe(300)
      expect(summary.avgDelay).toBe(150)
      expect(summary.tags.sort()).toEqual(['orders', 'users'])
      expect(summary.statusCodes[200]).toBe(2)
    })

    test('should handle empty draft', () => {
      const summary = getDraftSummary({ rules: [] })
      expect(summary.totalRules).toBe(0)
      expect(summary.uniquePaths).toBe(0)
    })

    test('should handle null or undefined draft', () => {
      const summary1 = getDraftSummary(null)
      const summary2 = getDraftSummary(undefined)

      expect(summary1.totalRules).toBe(0)
      expect(summary2.totalRules).toBe(0)
    })
  })

  describe('generateDocumentationMarkdown', () => {
    test('should generate markdown documentation', () => {
      const rules = [
        {
          ...createDefaultRule(0),
          name: 'Get Users',
          path: '/api/users',
          methods: ['GET'],
          statusCode: 200,
          delayMs: 100,
        },
      ]

      const md = generateDocumentationMarkdown(rules)

      expect(md).toContain('# Mock Rules Documentation')
      expect(md).toContain('## Get Users')
      expect(md).toContain('GET')
      expect(md).toContain('/api/users')
      expect(md).toContain('```bash')
    })

    test('should handle empty rules', () => {
      const md = generateDocumentationMarkdown([])
      expect(md).toContain('# Mock Rules Documentation')
      expect(md).toContain('暂无规则')
    })
  })
})
