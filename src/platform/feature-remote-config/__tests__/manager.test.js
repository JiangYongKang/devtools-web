import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ENVIRONMENTS, EXPONENTIAL_BACKOFF } from '../logic/constants.js'
import {
    calculateBackoffDelay,
    createFeatureConfigManager,
    FeatureConfigManager,
} from '../logic/manager.js'

vi.mock('../logic/fetcher.js', async () => {
  const actual = await vi.importActual('../logic/fetcher.js')
  return {
    ...actual,
    hasFetch: vi.fn().mockReturnValue(false),
    fetchRemoteConfig: vi.fn(),
  }
})

describe('manager module', () => {
  describe('calculateBackoffDelay', () => {
    test('should calculate initial delay', () => {
      const delay = calculateBackoffDelay(0, {
        initialDelay: 1000,
        maxDelay: 60000,
        multiplier: 2,
        jitterFactor: 0,
      })

      expect(delay).toBe(1000)
    })

    test('should increase delay exponentially', () => {
      const options = {
        initialDelay: 1000,
        maxDelay: 60000,
        multiplier: 2,
        jitterFactor: 0,
      }

      expect(calculateBackoffDelay(0, options)).toBe(1000)
      expect(calculateBackoffDelay(1, options)).toBe(2000)
      expect(calculateBackoffDelay(2, options)).toBe(4000)
      expect(calculateBackoffDelay(3, options)).toBe(8000)
    })

    test('should not exceed max delay', () => {
      const options = {
        initialDelay: 1000,
        maxDelay: 5000,
        multiplier: 2,
        jitterFactor: 0,
      }

      expect(calculateBackoffDelay(0, options)).toBe(1000)
      expect(calculateBackoffDelay(1, options)).toBe(2000)
      expect(calculateBackoffDelay(2, options)).toBe(4000)
      expect(calculateBackoffDelay(3, options)).toBe(5000)
      expect(calculateBackoffDelay(10, options)).toBe(5000)
    })

    test('should use default values', () => {
      const delay = calculateBackoffDelay(0)
      expect(delay).toBeGreaterThanOrEqual(
        EXPONENTIAL_BACKOFF.INITIAL_DELAY_MS * (1 - EXPONENTIAL_BACKOFF.JITTER_FACTOR)
      )
      expect(delay).toBeLessThanOrEqual(
        EXPONENTIAL_BACKOFF.INITIAL_DELAY_MS * (1 + EXPONENTIAL_BACKOFF.JITTER_FACTOR)
      )
    })
  })

  describe('FeatureConfigManager', () => {
    let manager

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      if (manager) {
        manager.destroy()
      }
      vi.useRealTimers()
    })

    test('should create manager with default options', () => {
      manager = createFeatureConfigManager()
      expect(manager).toBeInstanceOf(FeatureConfigManager)
    })

    test('should initialize with default and static configs', async () => {
      const defaultConfig = {
        flags: [
          { key: 'flag1', value: 'default', version: 1 },
        ],
      }

      const staticConfig = {
        flags: [
          { key: 'flag1', value: 'static', version: 2 },
          { key: 'flag2', value: true, version: 1 },
        ],
      }

      manager = createFeatureConfigManager({
        defaultConfig,
        staticConfig,
      })

      const snapshot = await manager.initialize()

      expect(snapshot.snapshot.flag1.value).toBe('static')
      expect(snapshot.snapshot.flag2.value).toBe(true)
      expect(snapshot.flags).toHaveLength(2)
    })

    test('should get flag value', async () => {
      const defaultConfig = {
        flags: [
          { key: 'test_flag', value: 'test_value', version: 1 },
        ],
      }

      manager = createFeatureConfigManager({
        defaultConfig,
      })

      await manager.initialize()

      expect(manager.getFlag('test_flag')).not.toBeNull()
      expect(manager.getFlagValue('test_flag')).toBe('test_value')
      expect(manager.getFlagValue('nonexistent', 'fallback')).toBe('fallback')
    })

    test('should return initial state before initialization', () => {
      manager = createFeatureConfigManager()

      const snapshot = manager.getSnapshot()
      expect(snapshot.snapshot).toEqual({})
      expect(snapshot.flags).toEqual([])
      expect(snapshot.audit).toEqual([])
    })

    test('should add and remove listeners', async () => {
      manager = createFeatureConfigManager()

      const listener = vi.fn()
      const unregister = manager.addListener(listener)

      await manager.initialize()

      expect(typeof unregister).toBe('function')
      unregister()
    })

    test('should export snapshot with redaction', async () => {
      const defaultConfig = {
        flags: [
          {
            key: 'config_flag',
            value: true,
            version: 1,
            payload: {
              token: 'secret_token',
              password: 'admin123',
              normal: 'value',
            },
          },
        ],
      }

      manager = createFeatureConfigManager({
        defaultConfig,
      })

      await manager.initialize()

      const snapshot = manager.getSnapshot()
      expect(snapshot.snapshot.config_flag).toBeDefined()
      expect(snapshot.snapshot.config_flag.payload).toBeDefined()

      const redactedExport = manager.exportSnapshot(true)
      expect(redactedExport.snapshot.config_flag.payload.token).toBe('[REDACTED]')
      expect(redactedExport.snapshot.config_flag.payload.password).toBe('[REDACTED]')
      expect(redactedExport.snapshot.config_flag.payload.normal).toBe('value')

      const rawExport = manager.exportSnapshot(false)
      expect(rawExport.snapshot.config_flag.payload.token).toBe('secret_token')
      expect(rawExport.snapshot.config_flag.payload.password).toBe('admin123')
    })

    test('should get refresh state', async () => {
      manager = createFeatureConfigManager()

      const state = manager.getRefreshState()
      expect(state.isOnline).toBeDefined()
      expect(typeof state.isOnline).toBe('boolean')
      expect(state.backoffAttempt).toBe(0)
      expect(state.hasLastSuccessfulSnapshot).toBe(false)

      await manager.initialize()

      const stateAfterInit = manager.getRefreshState()
      expect(stateAfterInit.hasLastSuccessfulSnapshot).toBe(true)
    })

    test('should handle environment and cohort filtering', async () => {
      const staticConfig = {
        flags: [
          { key: 'dev_flag', value: true, version: 1, environment: ENVIRONMENTS.DEV },
          { key: 'prod_flag', value: true, version: 1, environment: ENVIRONMENTS.PROD },
          { key: 'cohort_a', value: true, version: 1, cohort: 'exp_a' },
          { key: 'cohort_b', value: true, version: 1, cohort: 'exp_b' },
        ],
      }

      manager = createFeatureConfigManager({
        staticConfig,
        environment: ENVIRONMENTS.DEV,
        cohort: 'exp_a',
      })

      const snapshot = await manager.initialize()

      expect(snapshot.snapshot.dev_flag).toBeDefined()
      expect(snapshot.snapshot.prod_flag).toBeUndefined()
      expect(snapshot.snapshot.cohort_a).toBeDefined()
      expect(snapshot.snapshot.cohort_b).toBeUndefined()
    })

    test('should return frozen snapshot', async () => {
      const defaultConfig = {
        flags: [{ key: 'flag1', value: 'value', version: 1 }],
      }

      manager = createFeatureConfigManager({
        defaultConfig,
      })

      const snapshot = await manager.initialize()

      expect(Object.isFrozen(snapshot)).toBe(true)
      expect(Object.isFrozen(snapshot.audit)).toBe(true)
      expect(Object.isFrozen(snapshot.errors)).toBe(true)
    })
  })
})
