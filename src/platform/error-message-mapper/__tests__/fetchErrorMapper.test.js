import { describe, expect, test } from 'vitest'
import {
  DOMAINS,
  ERROR_CODES,
  DEFAULT_RETRYABLE_HTTP_STATUS,
  mapFetchError,
  isAbortError,
  isNetworkError,
  classifyError,
  validatePatchSchema,
  normalizePatch,
  fetchRemotePatch,
  getDemoPatchData,
} from '../logic/index.js'

describe('fetchErrorMapper 测试', () => {
  describe('isAbortError', () => {
    test('应该正确识别 AbortError', () => {
      const abortError = new DOMException('Aborted', 'AbortError')
      expect(isAbortError(abortError)).toBe(true)

      const normalError = new Error('Normal error')
      expect(isAbortError(normalError)).toBe(false)

      expect(isAbortError(null)).toBe(false)
    })
  })

  describe('isNetworkError', () => {
    test('应该正确识别网络错误', () => {
      const fetchError = new TypeError('Failed to fetch')
      expect(isNetworkError(fetchError)).toBe(true)

      const networkError = new DOMException('Network error', 'NetworkError')
      expect(isNetworkError(networkError)).toBe(true)

      const normalError = new Error('Normal error')
      expect(isNetworkError(normalError)).toBe(false)
    })
  })

  describe('classifyError', () => {
    test('应该正确分类 AbortError', () => {
      const abortError = new DOMException('Aborted', 'AbortError')
      const classified = classifyError(abortError)
      expect(classified.businessCode).toBe('ABORTED')
      expect(classified.domain).toBe(DOMAINS.HTTP)
    })

    test('应该正确分类网络错误', () => {
      const networkError = new TypeError('Failed to fetch')
      const classified = classifyError(networkError)
      expect(classified.businessCode).toBe('NETWORK')
    })
  })

  describe('mapFetchError', () => {
    test('应该正确处理 HTTP 状态码错误', () => {
      const result = mapFetchError(null, {
        status: 404,
        statusText: 'Not Found',
        headers: {},
      }, {
        locale: 'en',
        fallbackLocale: 'en',
      })

      expect(result.errorCode).toBe(ERROR_CODES.HTTP_404)
      expect(result.retryable).toBe(false)
    })

    test('应该正确处理 429 状态码', () => {
      const result = mapFetchError(null, {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {},
      }, {
        locale: 'en',
        fallbackLocale: 'en',
      })

      expect(result.retryable).toBe(true)
      expect(result.errorCode).toBe(ERROR_CODES.HTTP_429)
    })

    test('应该正确处理 503 状态码', () => {
      const result = mapFetchError(null, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
      }, {
        locale: 'en',
        fallbackLocale: 'en',
      })

      expect(result.retryable).toBe(true)
      expect(result.errorCode).toBe(ERROR_CODES.HTTP_503)
    })

    test('应该正确处理 Retry-After 头', () => {
      const result = mapFetchError(null, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          get: (name) => name.toLowerCase() === 'retry-after' ? '45' : null,
        },
      }, {
        locale: 'en',
        fallbackLocale: 'en',
      })

      expect(result.suggestedRetryDelaySeconds).toBe(45)
      expect(result.retryable).toBe(true)
    })

    test('应该正确处理 AbortError', () => {
      const abortError = new DOMException('Aborted', 'AbortError')
      const result = mapFetchError(abortError, null, {
        locale: 'en',
        fallbackLocale: 'en',
      })

      expect(result.userTitle).toBeTruthy()
    })

    test('应该正确处理 TypeError (网络错误)', () => {
      const networkError = new TypeError('Failed to fetch')
      const result = mapFetchError(networkError, null, {
        locale: 'en',
        fallbackLocale: 'en',
      })

      expect(result.userTitle).toBeTruthy()
    })

    test('应该正确处理原因链', () => {
      const cause = new Error('Root cause')
      const error = new Error('Wrapper error')
      error.cause = cause

      const result = mapFetchError(error, {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
      }, {
        locale: 'en',
        fallbackLocale: 'en',
      })

      expect(Array.isArray(result.causeChain)).toBe(true)
      expect(result.causeChain.length).toBeGreaterThan(0)
    })
  })
})

describe('远程补丁测试', () => {
  describe('validatePatchSchema', () => {
    test('应该正确验证有效的补丁数据', () => {
      const validPatch = {
        overrides: [
          {
            match: {
              domain: DOMAINS.HTTP,
              httpStatus: 429,
              businessCode: null,
            },
            template: {
              errorCode: 'HTTP_429',
              userTitle: { en: 'Test Title' },
              userDetail: { en: 'Test Detail' },
              recoveryHints: { en: ['Retry'] },
              severity: 'warning',
              retryable: true,
              suggestedRetryDelaySeconds: 10,
            },
          },
        ],
      }

      expect(validatePatchSchema(validPatch)).toBe(true)
    })

    test('应该拒绝缺少 overrides 的数据', () => {
      expect(validatePatchSchema({})).toBe(false)
    })

    test('应该拒绝缺少 match 的数据', () => {
      const invalidPatch = {
        overrides: [
          {
            template: {
              errorCode: 'TEST',
              userTitle: { en: 'Test' },
              userDetail: { en: 'Test' },
              recoveryHints: { en: [] },
              severity: 'error',
            },
          },
        ],
      }

      expect(validatePatchSchema(invalidPatch)).toBe(false)
    })

    test('应该拒绝缺少 template 的数据', () => {
      const invalidPatch = {
        overrides: [
          {
            match: {
              domain: DOMAINS.HTTP,
            },
          },
        ],
      }

      expect(validatePatchSchema(invalidPatch)).toBe(false)
    })
  })

  describe('normalizePatch', () => {
    test('应该正确规范化补丁数据', () => {
      const patch = {
        overrides: [
          {
            match: {
              domain: DOMAINS.HTTP,
              httpStatus: 429,
            },
            template: {
              errorCode: 'HTTP_429',
              userTitle: { en: 'Test' },
              userDetail: { en: 'Test' },
              recoveryHints: { en: [] },
              severity: 'warning',
            },
          },
        ],
      }

      const normalized = normalizePatch(patch)
      expect(normalized.overrides.length).toBe(1)
      expect(normalized.overrides[0].match.businessCode).toBe(null)
      expect(normalized.overrides[0].template.retryable).toBe(false)
    })
  })

  describe('fetchRemotePatch', () => {
    test('应该在没有 URL 时静默失败并返回 source=skipped', async () => {
      const result = await fetchRemotePatch('')
      expect(result.source).toBe('skipped')
      expect(result.overrides.length).toBe(0)
      expect(Array.isArray(result.diagnostics)).toBe(true)
    })

    test('应该正确加载演示补丁数据', () => {
      const demoPatch = getDemoPatchData()
      expect(Array.isArray(demoPatch.overrides)).toBe(true)
      expect(demoPatch.overrides.length).toBeGreaterThan(0)
    })

    test('应该处理 HTTP 错误', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await fetchRemotePatch('http://example.com/patch.json', {
        fetchFn: mockFetch,
      })

      expect(result.source).toBe('skipped')
      expect(result.overrides.length).toBe(0)
    })

    test('应该处理无效的补丁数据', async () => {
      const invalidData = {
        invalid: 'data',
      }

      const mockFetch = async () => ({
        ok: true,
        json: async () => invalidData,
      })

      const result = await fetchRemotePatch('http://example.com/patch.json', {
        fetchFn: mockFetch,
      })

      expect(result.source).toBe('invalid')
      expect(result.error).toBeTruthy()
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_PATCH)
    })

    test('应该正确加载和验证有效的补丁数据', async () => {
      const validData = {
        overrides: [
          {
            match: {
              domain: DOMAINS.HTTP,
              httpStatus: 429,
              businessCode: null,
            },
            template: {
              errorCode: 'HTTP_429',
              userTitle: { en: 'Test Title' },
              userDetail: { en: 'Test Detail' },
              recoveryHints: { en: ['Retry'] },
              severity: 'warning',
              retryable: true,
              suggestedRetryDelaySeconds: 10,
            },
          },
        ],
      }

      const mockFetch = async () => ({
        ok: true,
        json: async () => validData,
      })

      const result = await fetchRemotePatch('http://example.com/patch.json', {
        fetchFn: mockFetch,
      })

      expect(result.source).toBe('remote')
      expect(result.overrides.length).toBe(1)
    })
  })
})
