import { describe, test, expect } from 'vitest'
import {
  normalizeRule,
  normalizeRules,
  normalizeDraft,
  createDefaultRule,
  createEmptyDraft,
  reorderRules,
  generateId,
} from '../logic/normalization.js'
import {
  DEFAULT_DELAY_MS,
  DEFAULT_STATUS_CODE,
  DEFAULT_PROBABILITY,
  PATH_MATCH_TYPES,
} from '../logic/constants.js'

describe('normalization', () => {
  describe('generateId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
    })

    test('should generate IDs with rule_ prefix', () => {
      const id = generateId()
      expect(id.startsWith('rule_')).toBe(true)
    })
  })

  describe('createDefaultRule', () => {
    test('should create rule with default values', () => {
      const rule = createDefaultRule(0)
      expect(rule.id).toBeDefined()
      expect(rule.path).toBe('/')
      expect(rule.pathMatchType).toBe(PATH_MATCH_TYPES.EXACT)
      expect(rule.methods).toEqual(['GET'])
      expect(rule.statusCode).toBe(DEFAULT_STATUS_CODE)
      expect(rule.headers).toEqual({})
      expect(rule.body).toBe('')
      expect(rule.bodyType).toBe('json')
      expect(rule.delayMs).toBe(DEFAULT_DELAY_MS)
      expect(rule.probability).toBe(DEFAULT_PROBABILITY)
      expect(rule.corsTemplate).toBeNull()
      expect(rule.tags).toEqual([])
      expect(rule.priority).toBe(0)
    })

    test('should set correct priority based on index', () => {
      const rule1 = createDefaultRule(0)
      const rule2 = createDefaultRule(5)
      expect(rule1.priority).toBe(0)
      expect(rule2.priority).toBe(5)
    })
  })

  describe('createEmptyDraft', () => {
    test('should create empty draft', () => {
      const draft = createEmptyDraft()
      expect(draft.rules).toEqual([])
      expect(draft.metadata).toBeDefined()
      expect(draft.metadata.createdAt).toBeDefined()
      expect(draft.metadata.updatedAt).toBeDefined()
      expect(draft.metadata.version).toBe('1.0.0')
    })
  })

  describe('normalizeRule', () => {
    test('should normalize valid rule', () => {
      const input = {
        id: 'test-id',
        name: ' Test Rule ',
        path: ' /api/users ',
        pathMatchType: PATH_MATCH_TYPES.PREFIX,
        methods: ['get', 'POST'],
        statusCode: 201,
        headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
        body: '{"key": "value"}',
        bodyType: 'json',
        delayMs: 100,
        probability: 50,
        corsTemplate: 'BASIC',
        tags: [' test ', 'users'],
        priority: 2,
      }

      const normalized = normalizeRule(input)

      expect(normalized.id).toBe('test-id')
      expect(normalized.name).toBe('Test Rule')
      expect(normalized.path).toBe('/api/users')
      expect(normalized.pathMatchType).toBe(PATH_MATCH_TYPES.PREFIX)
      expect(normalized.methods).toEqual(['GET', 'POST'])
      expect(normalized.statusCode).toBe(201)
      expect(normalized.headers).toEqual({ 'Content-Type': 'application/json', 'X-Custom': 'value' })
      expect(normalized.body).toBe('{"key": "value"}')
      expect(normalized.bodyType).toBe('json')
      expect(normalized.delayMs).toBe(100)
      expect(normalized.probability).toBe(50)
      expect(normalized.corsTemplate).toBe('BASIC')
      expect(normalized.tags).toEqual(['test', 'users'])
      expect(normalized.priority).toBe(2)
    })

    test('should use default values for missing fields', () => {
      const input = {
        id: 'test-id',
        path: '/api/test',
      }

      const normalized = normalizeRule(input)

      expect(normalized.id).toBe('test-id')
      expect(normalized.path).toBe('/api/test')
      expect(normalized.pathMatchType).toBe(PATH_MATCH_TYPES.EXACT)
      expect(normalized.methods).toEqual(['GET'])
      expect(normalized.statusCode).toBe(DEFAULT_STATUS_CODE)
      expect(normalized.delayMs).toBe(DEFAULT_DELAY_MS)
      expect(normalized.probability).toBe(DEFAULT_PROBABILITY)
    })

    test('should generate ID if missing', () => {
      const input = { path: '/api/test' }
      const normalized = normalizeRule(input)
      expect(normalized.id).toBeDefined()
      expect(normalized.id.startsWith('rule_')).toBe(true)
    })

    test('should filter invalid methods', () => {
      const input = {
        path: '/api/test',
        methods: ['GET', 'INVALID', 'post', null, 123],
      }

      const normalized = normalizeRule(input)
      expect(normalized.methods).toEqual(['GET', 'POST'])
    })

    test('should default to GET if no valid methods', () => {
      const input = {
        path: '/api/test',
        methods: ['INVALID', null],
      }

      const normalized = normalizeRule(input)
      expect(normalized.methods).toEqual(['GET'])
    })

    test('should handle invalid pathMatchType', () => {
      const input = {
        path: '/api/test',
        pathMatchType: 'invalid_type',
      }

      const normalized = normalizeRule(input)
      expect(normalized.pathMatchType).toBe(PATH_MATCH_TYPES.EXACT)
    })

    test('should handle invalid statusCode', () => {
      const input = { path: '/api/test', statusCode: 'not_a_number' }
      const normalized = normalizeRule(input)
      expect(normalized.statusCode).toBe(DEFAULT_STATUS_CODE)
    })

    test('should handle invalid delayMs', () => {
      const input = { path: '/api/test', delayMs: -100 }
      const normalized = normalizeRule(input)
      expect(normalized.delayMs).toBe(DEFAULT_DELAY_MS)
    })

    test('should handle invalid probability', () => {
      const input = { path: '/api/test', probability: 150 }
      const normalized = normalizeRule(input)
      expect(normalized.probability).toBe(DEFAULT_PROBABILITY)
    })

    test('should filter invalid headers', () => {
      const input = {
        path: '/api/test',
        headers: {
          'Valid-Header': 'value',
          '': 'empty_key',
          'Null-Value': null,
          'Number-Value': 123,
        },
      }

      const normalized = normalizeRule(input)
      expect(normalized.headers).toEqual({ 'Valid-Header': 'value' })
    })

    test('should handle null or undefined input', () => {
      const normalized1 = normalizeRule(null)
      const normalized2 = normalizeRule(undefined)

      expect(normalized1).toBeDefined()
      expect(normalized2).toBeDefined()
      expect(normalized1.path).toBe('/')
      expect(normalized2.path).toBe('/')
    })
  })

  describe('normalizeRules', () => {
    test('should normalize array of rules', () => {
      const rules = [
        { id: 'rule1', path: '/api/users' },
        { id: 'rule2', path: '/api/orders' },
      ]

      const normalized = normalizeRules(rules)

      expect(normalized).toHaveLength(2)
      expect(normalized[0].id).toBe('rule1')
      expect(normalized[1].id).toBe('rule2')
    })

    test('should handle non-array input', () => {
      const normalized1 = normalizeRules(null)
      const normalized2 = normalizeRules('not_an_array')

      expect(normalized1).toEqual([])
      expect(normalized2).toEqual([])
    })

    test('should set priority based on index', () => {
      const rules = [
        { path: '/api/a' },
        { path: '/api/b' },
        { path: '/api/c' },
      ]

      const normalized = normalizeRules(rules)

      expect(normalized[0].priority).toBe(0)
      expect(normalized[1].priority).toBe(1)
      expect(normalized[2].priority).toBe(2)
    })
  })

  describe('normalizeDraft', () => {
    test('should normalize draft with rules', () => {
      const draft = {
        rules: [
          { id: 'rule1', path: '/api/users' },
          { id: 'rule2', path: '/api/orders' },
        ],
        metadata: {
          createdAt: 1234567890,
          updatedAt: 1234567890,
          version: '0.9.0',
        },
      }

      const normalized = normalizeDraft(draft)

      expect(normalized.rules).toHaveLength(2)
      expect(normalized.metadata.createdAt).toBe(1234567890)
      expect(normalized.metadata.updatedAt).toBeGreaterThan(1234567890)
      expect(normalized.metadata.version).toBe('1.0.0')
    })

    test('should handle null or undefined draft', () => {
      const normalized1 = normalizeDraft(null)
      const normalized2 = normalizeDraft(undefined)

      expect(normalized1.rules).toEqual([])
      expect(normalized2.rules).toEqual([])
      expect(normalized1.metadata).toBeDefined()
      expect(normalized2.metadata).toBeDefined()
    })
  })

  describe('reorderRules', () => {
    test('should reorder rules', () => {
      const rules = [
        { ...createDefaultRule(0), id: 'r0', priority: 0 },
        { ...createDefaultRule(1), id: 'r1', priority: 1 },
        { ...createDefaultRule(2), id: 'r2', priority: 2 },
        { ...createDefaultRule(3), id: 'r3', priority: 3 },
      ]

      const reordered = reorderRules(rules, 0, 3)

      expect(reordered).toHaveLength(4)
      expect(reordered[0].id).toBe('r1')
      expect(reordered[1].id).toBe('r2')
      expect(reordered[2].id).toBe('r3')
      expect(reordered[3].id).toBe('r0')
    })

    test('should update priorities after reorder', () => {
      const rules = [
        { ...createDefaultRule(0), id: 'r0', priority: 0 },
        { ...createDefaultRule(1), id: 'r1', priority: 1 },
        { ...createDefaultRule(2), id: 'r2', priority: 2 },
      ]

      const reordered = reorderRules(rules, 2, 0)

      expect(reordered[0].priority).toBe(0)
      expect(reordered[1].priority).toBe(1)
      expect(reordered[2].priority).toBe(2)
    })

    test('should handle invalid indices', () => {
      const rules = [
        { ...createDefaultRule(0), id: 'r0' },
        { ...createDefaultRule(1), id: 'r1' },
      ]

      expect(reorderRules(rules, -1, 1)).toBe(rules)
      expect(reorderRules(rules, 10, 1)).toBe(rules)
      expect(reorderRules(rules, 0, -1)).toBe(rules)
      expect(reorderRules(rules, 0, 10)).toBe(rules)
    })

    test('should handle empty or single item array', () => {
      const empty = []
      const single = [{ ...createDefaultRule(0), id: 'r0' }]

      expect(reorderRules(empty, 0, 1)).toEqual(empty)
      expect(reorderRules(single, 0, 0)).toEqual(single)
    })

    test('should handle null or undefined input', () => {
      expect(reorderRules(null, 0, 1)).toBeNull()
      expect(reorderRules(undefined, 0, 1)).toBeUndefined()
    })
  })
})
