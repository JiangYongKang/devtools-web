import { describe, expect, test } from 'vitest'
import {
  createFeatureFetchInterceptor,
  createBaseURLSwitchInterceptor,
  createHeaderInterceptor,
  createEnvironmentSwitchInterceptor,
} from '../logic/interceptors.js'

describe('interceptors module', () => {
  describe('createFeatureFetchInterceptor', () => {
    test('should return request unchanged if no snapshot', () => {
      const getSnapshot = () => null
      const interceptor = createFeatureFetchInterceptor({ getSnapshot })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result).toEqual(request)
    })

    test('should switch baseURL from feature flag', () => {
      const snapshot = {
        snapshot: {
          api_base_url: { value: 'https://api.example.com' },
        },
      }
      const getSnapshot = () => snapshot
      const interceptor = createFeatureFetchInterceptor({ getSnapshot })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result.url).toBe('https://api.example.com/api/test')
    })

    test('should add headers from feature flags', () => {
      const snapshot = {
        snapshot: {
          feature_toggle_header: { value: 'enabled' },
          experiment_id: { value: 'exp_001' },
          user_cohort: { value: 'beta' },
        },
      }
      const getSnapshot = () => snapshot
      const interceptor = createFeatureFetchInterceptor({ getSnapshot })

      const request = { url: '/api/test', method: 'GET', headers: {} }
      const result = interceptor(request)

      expect(result.headers['X-Feature-Toggle']).toBe('enabled')
      expect(result.headers['X-Experiment-Id']).toBe('exp_001')
      expect(result.headers['X-User-Cohort']).toBe('beta')
    })

    test('should handle function getSnapshot', () => {
      const snapshot = {
        snapshot: {
          api_base_url: { value: 'https://api.example.com' },
        },
      }
      const getSnapshot = () => snapshot
      const interceptor = createFeatureFetchInterceptor({ getSnapshot })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result.url).toBe('https://api.example.com/api/test')
    })

    test('should not modify absolute URLs', () => {
      const snapshot = {
        snapshot: {
          api_base_url: { value: 'https://api.example.com' },
        },
      }
      const getSnapshot = () => snapshot
      const interceptor = createFeatureFetchInterceptor({ getSnapshot })

      const request = { url: 'https://other.example.com/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result.url).toBe('https://other.example.com/api/test')
    })
  })

  describe('createBaseURLSwitchInterceptor', () => {
    test('should switch baseURL using specified flag key', () => {
      const snapshot = {
        snapshot: {
          custom_base_url: { value: 'https://custom.example.com' },
        },
      }
      const getSnapshot = () => snapshot
      const interceptor = createBaseURLSwitchInterceptor({
        getSnapshot,
        baseURLFlagKey: 'custom_base_url',
      })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result.url).toBe('https://custom.example.com/api/test')
    })

    test('should use default flag key', () => {
      const snapshot = {
        snapshot: {
          api_base_url: { value: 'https://default.example.com' },
        },
      }
      const getSnapshot = () => snapshot
      const interceptor = createBaseURLSwitchInterceptor({ getSnapshot })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result.url).toBe('https://default.example.com/api/test')
    })

    test('should return request unchanged if flag not found', () => {
      const snapshot = {
        snapshot: {},
      }
      const getSnapshot = () => snapshot
      const interceptor = createBaseURLSwitchInterceptor({ getSnapshot })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result).toEqual(request)
    })
  })

  describe('createHeaderInterceptor', () => {
    test('should add headers based on mappings', () => {
      const snapshot = {
        snapshot: {
          api_key: { value: 'my_api_key' },
          tenant_id: { value: 'tenant_123' },
        },
      }
      const getSnapshot = () => snapshot
      const interceptor = createHeaderInterceptor({
        getSnapshot,
        headerMappings: [
          { flagKey: 'api_key', headerName: 'X-API-Key' },
          { flagKey: 'tenant_id', headerName: 'X-Tenant-Id' },
        ],
      })

      const request = { url: '/api/test', method: 'GET', headers: {} }
      const result = interceptor(request)

      expect(result.headers['X-API-Key']).toBe('my_api_key')
      expect(result.headers['X-Tenant-Id']).toBe('tenant_123')
    })

    test('should use default values when flag not found', () => {
      const snapshot = {
        snapshot: {},
      }
      const getSnapshot = () => snapshot
      const interceptor = createHeaderInterceptor({
        getSnapshot,
        headerMappings: [
          { flagKey: 'missing_flag', headerName: 'X-Missing', defaultValue: 'default_value' },
        ],
      })

      const request = { url: '/api/test', method: 'GET', headers: {} }
      const result = interceptor(request)

      expect(result.headers['X-Missing']).toBe('default_value')
    })

    test('should return request unchanged if no mappings', () => {
      const snapshot = {
        snapshot: {
          some_flag: { value: 'test' },
        },
      }
      const getSnapshot = () => snapshot
      const interceptor = createHeaderInterceptor({
        getSnapshot,
        headerMappings: [],
      })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result).toEqual(request)
    })
  })

  describe('createEnvironmentSwitchInterceptor', () => {
    test('should switch based on environment', () => {
      const snapshot = {
        environment: 'production',
        snapshot: {},
      }
      const getSnapshot = () => snapshot

      const environments = {
        development: {
          baseURL: 'https://dev.example.com',
          headers: { 'X-Env': 'dev' },
        },
        production: {
          baseURL: 'https://prod.example.com',
          headers: { 'X-Env': 'prod' },
        },
      }

      const interceptor = createEnvironmentSwitchInterceptor({
        getSnapshot,
        environments,
      })

      const request = { url: '/api/test', method: 'GET', headers: {} }
      const result = interceptor(request)

      expect(result.url).toBe('https://prod.example.com/api/test')
      expect(result.headers['X-Env']).toBe('prod')
    })

    test('should return request unchanged if environment not found', () => {
      const snapshot = {
        environment: 'unknown',
        snapshot: {},
      }
      const getSnapshot = () => snapshot

      const environments = {
        development: {
          baseURL: 'https://dev.example.com',
        },
      }

      const interceptor = createEnvironmentSwitchInterceptor({
        getSnapshot,
        environments,
      })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result).toEqual(request)
    })

    test('should use dev as default environment', () => {
      const snapshot = {
        snapshot: {},
      }
      const getSnapshot = () => snapshot

      const environments = {
        dev: {
          baseURL: 'https://dev.example.com',
        },
      }

      const interceptor = createEnvironmentSwitchInterceptor({
        getSnapshot,
        environments,
      })

      const request = { url: '/api/test', method: 'GET' }
      const result = interceptor(request)

      expect(result.url).toBe('https://dev.example.com/api/test')
    })
  })
})
