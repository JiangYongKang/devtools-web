import { describe, test, expect } from 'vitest'
import {
  pathsOverlap,
  methodsOverlap,
  rulesConflict,
  detectConflicts,
  getRuleConflicts,
  groupConflictsByRule,
} from '../logic/conflictDetection.js'
import { PATH_MATCH_TYPES, ERROR_CODES } from '../logic/constants.js'
import { createDefaultRule } from '../logic/normalization.js'

describe('conflictDetection', () => {
  describe('pathsOverlap', () => {
    test('should detect exact path overlap', () => {
      expect(pathsOverlap('/api/users', PATH_MATCH_TYPES.EXACT, '/api/users', PATH_MATCH_TYPES.EXACT)).toBe(true)
    })

    test('should detect non-overlapping exact paths', () => {
      expect(pathsOverlap('/api/users', PATH_MATCH_TYPES.EXACT, '/api/orders', PATH_MATCH_TYPES.EXACT)).toBe(false)
    })

    test('should detect prefix path overlap', () => {
      expect(pathsOverlap('/api', PATH_MATCH_TYPES.PREFIX, '/api/users', PATH_MATCH_TYPES.PREFIX)).toBe(true)
      expect(pathsOverlap('/api/users', PATH_MATCH_TYPES.PREFIX, '/api', PATH_MATCH_TYPES.PREFIX)).toBe(true)
    })

    test('should detect non-overlapping prefix paths', () => {
      expect(pathsOverlap('/api/users', PATH_MATCH_TYPES.PREFIX, '/api/orders', PATH_MATCH_TYPES.PREFIX)).toBe(false)
      expect(pathsOverlap('/app', PATH_MATCH_TYPES.PREFIX, '/api', PATH_MATCH_TYPES.PREFIX)).toBe(false)
    })

    test('should detect exact path under prefix', () => {
      expect(pathsOverlap('/api/users', PATH_MATCH_TYPES.EXACT, '/api', PATH_MATCH_TYPES.PREFIX)).toBe(true)
      expect(pathsOverlap('/api', PATH_MATCH_TYPES.PREFIX, '/api/users', PATH_MATCH_TYPES.EXACT)).toBe(true)
    })

    test('should detect exact path not under prefix', () => {
      expect(pathsOverlap('/app/users', PATH_MATCH_TYPES.EXACT, '/api', PATH_MATCH_TYPES.PREFIX)).toBe(false)
    })

    test('should detect regex matching exact path', () => {
      expect(pathsOverlap('/api/.*', PATH_MATCH_TYPES.REGEX, '/api/users', PATH_MATCH_TYPES.EXACT)).toBe(true)
    })

    test('should handle invalid regex gracefully', () => {
      expect(pathsOverlap('[invalid', PATH_MATCH_TYPES.REGEX, '/api/users', PATH_MATCH_TYPES.EXACT)).toBe(false)
    })

    test('should detect two regex patterns that could match', () => {
      expect(pathsOverlap('/api/users/.*', PATH_MATCH_TYPES.REGEX, '/api/.*', PATH_MATCH_TYPES.REGEX)).toBe(true)
    })

    test('should detect prefix matching regex test paths', () => {
      expect(pathsOverlap('/api', PATH_MATCH_TYPES.PREFIX, '/api/.*', PATH_MATCH_TYPES.REGEX)).toBe(true)
      expect(pathsOverlap('/api/.*', PATH_MATCH_TYPES.REGEX, '/api', PATH_MATCH_TYPES.PREFIX)).toBe(true)
    })

    test('should detect root prefix overlap', () => {
      expect(pathsOverlap('/', PATH_MATCH_TYPES.PREFIX, '/api/users', PATH_MATCH_TYPES.EXACT)).toBe(true)
    })
  })

  describe('methodsOverlap', () => {
    test('should detect overlapping methods', () => {
      expect(methodsOverlap(['GET', 'POST'], ['POST', 'PUT'])).toBe(true)
      expect(methodsOverlap(['GET'], ['GET'])).toBe(true)
    })

    test('should detect non-overlapping methods', () => {
      expect(methodsOverlap(['GET'], ['POST'])).toBe(false)
      expect(methodsOverlap(['GET', 'PUT'], ['POST', 'DELETE'])).toBe(false)
    })

    test('should handle case insensitivity', () => {
      expect(methodsOverlap(['get'], ['GET'])).toBe(true)
      expect(methodsOverlap(['Get'], ['POST', 'GET'])).toBe(true)
    })

    test('should handle empty arrays', () => {
      expect(methodsOverlap([], ['GET'])).toBe(false)
      expect(methodsOverlap(['GET'], [])).toBe(false)
      expect(methodsOverlap([], [])).toBe(false)
    })
  })

  describe('rulesConflict', () => {
    test('should detect conflict for same path and method', () => {
      const rule1 = {
        ...createDefaultRule(0),
        id: 'r1',
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
      }

      const rule2 = {
        ...createDefaultRule(1),
        id: 'r2',
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
      }

      const conflict = rulesConflict(rule1, rule2)
      expect(conflict).not.toBeNull()
      expect(conflict.type).toBe(ERROR_CODES.CONFLICT_PATH_METHOD)
      expect(conflict.ruleIds).toEqual(['r1', 'r2'])
      expect(conflict.overlappingMethods).toEqual(['GET'])
    })

    test('should not detect conflict for same path but different methods', () => {
      const rule1 = {
        ...createDefaultRule(0),
        id: 'r1',
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
      }

      const rule2 = {
        ...createDefaultRule(1),
        id: 'r2',
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['POST'],
      }

      const conflict = rulesConflict(rule1, rule2)
      expect(conflict).toBeNull()
    })

    test('should detect conflict for prefix and exact paths with same method', () => {
      const rule1 = {
        ...createDefaultRule(0),
        id: 'r1',
        path: '/api',
        pathMatchType: PATH_MATCH_TYPES.PREFIX,
        methods: ['GET'],
      }

      const rule2 = {
        ...createDefaultRule(1),
        id: 'r2',
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
      }

      const conflict = rulesConflict(rule1, rule2)
      expect(conflict).not.toBeNull()
    })

    test('should detect conflict with multiple overlapping methods', () => {
      const rule1 = {
        ...createDefaultRule(0),
        id: 'r1',
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET', 'POST', 'PUT'],
      }

      const rule2 = {
        ...createDefaultRule(1),
        id: 'r2',
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['POST', 'PUT', 'DELETE'],
      }

      const conflict = rulesConflict(rule1, rule2)
      expect(conflict).not.toBeNull()
      expect(conflict.overlappingMethods.sort()).toEqual(['POST', 'PUT'].sort())
    })
  })

  describe('detectConflicts', () => {
    test('should return no conflicts for empty rules', () => {
      const result = detectConflicts([])
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toEqual([])
    })

    test('should return no conflicts for single rule', () => {
      const rule = {
        ...createDefaultRule(0),
        id: 'r1',
        path: '/api/users',
        pathMatchType: PATH_MATCH_TYPES.EXACT,
        methods: ['GET'],
      }

      const result = detectConflicts([rule])
      expect(result.hasConflicts).toBe(false)
    })

    test('should detect conflict between two rules', () => {
      const rules = [
        {
          ...createDefaultRule(0),
          id: 'r1',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
        {
          ...createDefaultRule(1),
          id: 'r2',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
      ]

      const result = detectConflicts(rules)
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].ruleIds).toEqual(['r1', 'r2'])
    })

    test('should detect multiple conflicts', () => {
      const rules = [
        {
          ...createDefaultRule(0),
          id: 'r1',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
        {
          ...createDefaultRule(1),
          id: 'r2',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
        {
          ...createDefaultRule(2),
          id: 'r3',
          path: '/api/orders',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['POST'],
        },
        {
          ...createDefaultRule(3),
          id: 'r4',
          path: '/api/orders',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['POST'],
        },
      ]

      const result = detectConflicts(rules)
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(2)
    })

    test('should create error object in conflict', () => {
      const rules = [
        {
          ...createDefaultRule(0),
          id: 'r1',
          name: 'Get Users',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
        {
          ...createDefaultRule(1),
          id: 'r2',
          name: 'Get Users 2',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
      ]

      const result = detectConflicts(rules)
      expect(result.conflicts[0].error).toBeDefined()
      expect(result.conflicts[0].error.code).toBe(ERROR_CODES.CONFLICT_PATH_METHOD)
      expect(result.conflicts[0].error.details.ruleIds).toEqual(['r1', 'r2'])
    })
  })

  describe('getRuleConflicts', () => {
    test('should get conflicts for specific rule', () => {
      const rules = [
        {
          ...createDefaultRule(0),
          id: 'r1',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
        {
          ...createDefaultRule(1),
          id: 'r2',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
        {
          ...createDefaultRule(2),
          id: 'r3',
          path: '/api/orders',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
      ]

      const conflicts = getRuleConflicts('r1', rules)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].ruleIds).toContain('r1')
      expect(conflicts[0].ruleIds).toContain('r2')
    })

    test('should return empty array for rule with no conflicts', () => {
      const rules = [
        {
          ...createDefaultRule(0),
          id: 'r1',
          path: '/api/users',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
        {
          ...createDefaultRule(1),
          id: 'r2',
          path: '/api/orders',
          pathMatchType: PATH_MATCH_TYPES.EXACT,
          methods: ['GET'],
        },
      ]

      const conflicts = getRuleConflicts('r1', rules)
      expect(conflicts).toHaveLength(0)
    })
  })

  describe('groupConflictsByRule', () => {
    test('should group conflicts by rule ID', () => {
      const conflicts = [
        { type: ERROR_CODES.CONFLICT_PATH_METHOD, ruleIds: ['r1', 'r2'], overlappingMethods: ['GET'] },
        { type: ERROR_CODES.CONFLICT_PATH_METHOD, ruleIds: ['r1', 'r3'], overlappingMethods: ['POST'] },
      ]

      const grouped = groupConflictsByRule(conflicts)
      expect(grouped.get('r1')).toHaveLength(2)
      expect(grouped.get('r2')).toHaveLength(1)
      expect(grouped.get('r3')).toHaveLength(1)
    })

    test('should return empty map for empty conflicts', () => {
      const grouped = groupConflictsByRule([])
      expect(grouped.size).toBe(0)
    })
  })
})
