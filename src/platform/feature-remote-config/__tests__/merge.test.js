import { describe, expect, test, beforeEach } from 'vitest'
import {
  mergeConfigs,
  resolveConflict,
  normalizeFlags,
  validateFlag,
  filterByEnvironmentAndCohort,
  applyMergeRules,
  createDefaultRules,
  shouldUseFlag,
  getSourcePriority,
} from '../logic/merge.js'
import { SOURCES, ENVIRONMENTS, ERROR_CODES } from '../logic/constants.js'

describe('merge module', () => {
  describe('normalizeFlags', () => {
    test('should normalize array of flags', () => {
      const flags = [
        { key: 'flag1', value: true },
        { key: 'flag2', value: 'value' },
      ]
      const normalized = normalizeFlags(flags)
      expect(normalized).toHaveLength(2)
      expect(normalized[0].key).toBe('flag1')
      expect(normalized[1].key).toBe('flag2')
    })

    test('should normalize record of flags', () => {
      const flags = {
        flag1: { value: true },
        flag2: { value: 'value' },
      }
      const normalized = normalizeFlags(flags)
      expect(normalized).toHaveLength(2)
      const keys = normalized.map((f) => f.key)
      expect(keys).toContain('flag1')
      expect(keys).toContain('flag2')
    })

    test('should handle simple values in record', () => {
      const flags = {
        flag1: true,
        flag2: 'value',
      }
      const normalized = normalizeFlags(flags)
      expect(normalized).toHaveLength(2)
      expect(normalized[0].value).toBe(true)
      expect(normalized[1].value).toBe('value')
    })

    test('should return empty array for null/undefined', () => {
      expect(normalizeFlags(null)).toHaveLength(0)
      expect(normalizeFlags(undefined)).toHaveLength(0)
    })
  })

  describe('shouldUseFlag', () => {
    test('should return false for null flag', () => {
      expect(shouldUseFlag(null)).toBe(false)
    })

    test('should return false for flag without key', () => {
      expect(shouldUseFlag({ value: true })).toBe(false)
    })

    test('should return true for valid flag', () => {
      expect(shouldUseFlag({ key: 'test', value: true })).toBe(true)
    })

    test('should return false for expired flag', () => {
      const expiredFlag = {
        key: 'test',
        value: true,
        expiresAt: Date.now() - 1000,
      }
      expect(shouldUseFlag(expiredFlag)).toBe(false)
    })

    test('should return true for non-expired flag', () => {
      const activeFlag = {
        key: 'test',
        value: true,
        expiresAt: Date.now() + 1000,
      }
      expect(shouldUseFlag(activeFlag)).toBe(true)
    })
  })

  describe('getSourcePriority', () => {
    test('should return correct priority for sources', () => {
      expect(getSourcePriority(SOURCES.REMOTE)).toBe(3)
      expect(getSourcePriority(SOURCES.STATIC)).toBe(2)
      expect(getSourcePriority(SOURCES.DEFAULT)).toBe(1)
    })

    test('should return 0 for unknown source', () => {
      expect(getSourcePriority('unknown')).toBe(0)
    })
  })

  describe('resolveConflict', () => {
    test('should prefer newer version', () => {
      const existing = { key: 'test', value: 'old', version: 1, source: SOURCES.REMOTE }
      const incoming = { key: 'test', value: 'new', version: 2, source: SOURCES.STATIC }
      const result = resolveConflict(existing, incoming, Date.now())

      expect(result.winner).toBe(incoming)
      expect(result.reason).toBe('version_newer')
    })

    test('should prefer remote over static when same version', () => {
      const existing = { key: 'test', value: 'static', version: 1, source: SOURCES.STATIC }
      const incoming = { key: 'test', value: 'remote', version: 1, source: SOURCES.REMOTE }
      const result = resolveConflict(existing, incoming, Date.now())

      expect(result.winner).toBe(incoming)
      expect(result.reason).toBe('source_priority')
    })

    test('should prefer static over default when same version', () => {
      const existing = { key: 'test', value: 'default', version: 1, source: SOURCES.DEFAULT }
      const incoming = { key: 'test', value: 'static', version: 1, source: SOURCES.STATIC }
      const result = resolveConflict(existing, incoming, Date.now())

      expect(result.winner).toBe(incoming)
    })

    test('should keep existing when incoming has older version', () => {
      const existing = { key: 'test', value: 'existing', version: 2, source: SOURCES.DEFAULT }
      const incoming = { key: 'test', value: 'incoming', version: 1, source: SOURCES.REMOTE }
      const result = resolveConflict(existing, incoming, Date.now())

      expect(result.winner).toBe(existing)
      expect(result.reason).toBe('version_older')
    })
  })

  describe('validateFlag', () => {
    test('should validate valid flag', () => {
      const flag = { key: 'test', value: true }
      const result = validateFlag(flag)
      expect(result.valid).toBe(true)
    })

    test('should reject null flag', () => {
      const result = validateFlag(null)
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_CONFIG)
    })

    test('should reject flag without key', () => {
      const result = validateFlag({ value: true })
      expect(result.valid).toBe(false)
    })

    test('should reject flag without value', () => {
      const result = validateFlag({ key: 'test' })
      expect(result.valid).toBe(false)
    })

    test('should reject flag with non-string key', () => {
      const result = validateFlag({ key: 123, value: true })
      expect(result.valid).toBe(false)
    })

    test('should reject flag with script field in payload', () => {
      const result = validateFlag({
        key: 'test',
        value: true,
        payload: { script: 'alert(1)' },
      })
      expect(result.valid).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.SCRIPT_FIELD_DETECTED)
    })
  })

  describe('filterByEnvironmentAndCohort', () => {
    test('should filter by environment', () => {
      const flags = [
        { key: 'flag1', value: true, environment: ENVIRONMENTS.DEV },
        { key: 'flag2', value: true, environment: ENVIRONMENTS.PROD },
        { key: 'flag3', value: true },
      ]

      const filtered = filterByEnvironmentAndCohort(flags, ENVIRONMENTS.DEV, 'default')
      const keys = filtered.map((f) => f.key)

      expect(keys).toContain('flag1')
      expect(keys).toContain('flag3')
      expect(keys).not.toContain('flag2')
    })

    test('should filter by cohort', () => {
      const flags = [
        { key: 'flag1', value: true, cohort: 'exp_a' },
        { key: 'flag2', value: true, cohort: 'exp_b' },
        { key: 'flag3', value: true },
      ]

      const filtered = filterByEnvironmentAndCohort(flags, ENVIRONMENTS.DEV, 'exp_a')
      const keys = filtered.map((f) => f.key)

      expect(keys).toContain('flag1')
      expect(keys).toContain('flag3')
      expect(keys).not.toContain('flag2')
    })

    test('should filter by both environment and cohort', () => {
      const flags = [
        { key: 'flag1', value: true, environment: ENVIRONMENTS.DEV, cohort: 'exp_a' },
        { key: 'flag2', value: true, environment: ENVIRONMENTS.DEV, cohort: 'exp_b' },
        { key: 'flag3', value: true },
      ]

      const filtered = filterByEnvironmentAndCohort(flags, ENVIRONMENTS.DEV, 'exp_a')
      const keys = filtered.map((f) => f.key)

      expect(keys).toContain('flag1')
      expect(keys).toContain('flag3')
      expect(keys).not.toContain('flag2')
    })
  })

  describe('mergeConfigs', () => {
    test('should merge multiple configs', () => {
      const defaultConfig = {
        flags: [{ key: 'flag1', value: 'default' }],
        source: SOURCES.DEFAULT,
      }

      const staticConfig = {
        flags: [{ key: 'flag1', value: 'static', version: 1 }],
        source: SOURCES.STATIC,
      }

      const result = mergeConfigs([defaultConfig, staticConfig], {
        environment: ENVIRONMENTS.DEV,
        cohort: 'default',
      })

      expect(result.snapshot.flag1.value).toBe('static')
    })

    test('should create audit entries for conflicts', () => {
      const config1 = {
        flags: [{ key: 'flag1', value: 'v1', version: 1, source: SOURCES.DEFAULT }],
        source: SOURCES.DEFAULT,
      }

      const config2 = {
        flags: [{ key: 'flag1', value: 'v2', version: 2, source: SOURCES.STATIC }],
        source: SOURCES.STATIC,
      }

      const result = mergeConfigs([config1, config2], {
        environment: ENVIRONMENTS.DEV,
        cohort: 'default',
      })

      expect(result.audit.length).toBeGreaterThan(0)
      expect(result.audit[0].key).toBe('flag1')
    })

    test('should return frozen result', () => {
      const config = {
        flags: [{ key: 'flag1', value: true }],
        source: SOURCES.DEFAULT,
      }

      const result = mergeConfigs([config], {
        environment: ENVIRONMENTS.DEV,
        cohort: 'default',
      })

      expect(Object.isFrozen(result)).toBe(true)
    })

    test('should include metadata in result', () => {
      const config = {
        flags: [{ key: 'flag1', value: true }],
        source: SOURCES.DEFAULT,
      }

      const result = mergeConfigs([config], {
        environment: ENVIRONMENTS.PROD,
        cohort: 'test',
      })

      expect(result.environment).toBe(ENVIRONMENTS.PROD)
      expect(result.cohort).toBe('test')
      expect(result.mergedAt).toBeDefined()
    })
  })

  describe('applyMergeRules', () => {
    test('should order configs by source priority', () => {
      const configs = [
        { source: SOURCES.REMOTE },
        { source: SOURCES.DEFAULT },
        { source: SOURCES.STATIC },
      ]

      const ordered = applyMergeRules(configs, [])
      expect(ordered[0].source).toBe(SOURCES.DEFAULT)
      expect(ordered[1].source).toBe(SOURCES.STATIC)
      expect(ordered[2].source).toBe(SOURCES.REMOTE)
    })
  })

  describe('createDefaultRules', () => {
    test('should create default rules with environment and cohort', () => {
      const rules = createDefaultRules(ENVIRONMENTS.DEV, 'exp_a')

      expect(rules).toHaveLength(4)
      expect(rules[0].type).toBe('environment_filter')
      expect(rules[0].environment).toBe(ENVIRONMENTS.DEV)
      expect(rules[1].type).toBe('cohort_filter')
      expect(rules[1].cohort).toBe('exp_a')
    })
  })
})
