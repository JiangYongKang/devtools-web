import { describe, expect, test, vi, beforeEach } from 'vitest'
import {
  createInterceptorManager,
  runRequestInterceptors,
  runResponseInterceptors,
  shortCircuit,
  retryRequest,
  createRequestIdInterceptor,
  createHeaderInterceptor,
  createAuthInterceptor,
} from '../logic/interceptors.js'
import { ERROR_CODES } from '../logic/constants.js'

describe('interceptors module', () => {
  describe('createInterceptorManager', () => {
    let manager

    beforeEach(() => {
      manager = createInterceptorManager()
    })

    test('should allow registering and unregistering request interceptors', () => {
      const interceptor = vi.fn((config) => config)
      const unregister = manager.useRequest(interceptor)

      expect(manager.getRequestInterceptors().length).toBe(1)

      const result = unregister()
      expect(result).toBe(true)
      expect(manager.getRequestInterceptors().length).toBe(0)
    })

    test('should allow registering and unregistering response interceptors', () => {
      const interceptor = vi.fn((response) => response)
      const unregister = manager.useResponse(interceptor)

      expect(manager.getResponseInterceptors().length).toBe(1)

      const result = unregister()
      expect(result).toBe(true)
      expect(manager.getResponseInterceptors().length).toBe(0)
    })

    test('unregister should return false for already unregistered interceptors', () => {
      const unregister = manager.useRequest((config) => config)
      unregister()
      expect(unregister()).toBe(false)
    })

    test('should allow multiple interceptors', () => {
      manager.useRequest((c) => c)
      manager.useRequest((c) => c)
      manager.useResponse((r) => r)

      expect(manager.getRequestInterceptors().length).toBe(2)
      expect(manager.getResponseInterceptors().length).toBe(1)
    })

    test('should clear all interceptors', () => {
      manager.useRequest((c) => c)
      manager.useResponse((r) => r)
      manager.clearAll()

      expect(manager.getRequestInterceptors().length).toBe(0)
      expect(manager.getResponseInterceptors().length).toBe(0)
    })

    test('should clear only request interceptors', () => {
      manager.useRequest((c) => c)
      manager.useResponse((r) => r)
      manager.clearRequest()

      expect(manager.getRequestInterceptors().length).toBe(0)
      expect(manager.getResponseInterceptors().length).toBe(1)
    })

    test('should clear only response interceptors', () => {
      manager.useRequest((c) => c)
      manager.useResponse((r) => r)
      manager.clearResponse()

      expect(manager.getRequestInterceptors().length).toBe(1)
      expect(manager.getResponseInterceptors().length).toBe(0)
    })
  })

  describe('runRequestInterceptors', () => {
    test('should run interceptors in order', async () => {
      const order = []
      const interceptors = [
        { id: 1, onFulfilled: (c) => { order.push(1); return c } },
        { id: 2, onFulfilled: (c) => { order.push(2); return c } },
        { id: 3, onFulfilled: (c) => { order.push(3); return c } },
      ]

      await runRequestInterceptors(interceptors, { url: 'test' })
      expect(order).toEqual([1, 2, 3])
    })

    test('should allow modifying request config', async () => {
      const interceptors = [
        { id: 1, onFulfilled: (config) => ({
          ...config,
          url: config.url + '/modified',
          init: { ...config.init, headers: { ...config.init?.headers, 'X-Custom': 'value' } }
        }) },
      ]

      const result = await runRequestInterceptors(interceptors, {
        url: 'http://example.com',
        init: { headers: {} }
      })

      expect(result.result.url).toBe('http://example.com/modified')
      expect(result.result.init.headers['X-Custom']).toBe('value')
    })

    test('should handle null/undefined return values as no-op', async () => {
      const interceptors = [
        { id: 1, onFulfilled: () => null },
        { id: 2, onFulfilled: () => undefined },
      ]

      const original = { url: 'test', init: {} }
      const result = await runRequestInterceptors(interceptors, original)

      expect(result.result.url).toBe(original.url)
    })

    test('should call onRejected when interceptor throws', async () => {
      const testError = new Error('test error')
      const onRejected = vi.fn(() => ({ handled: true }))

      const interceptors = [
        { id: 1, onFulfilled: () => { throw testError }, onRejected },
      ]

      await runRequestInterceptors(interceptors, { url: 'test' })
      expect(onRejected).toHaveBeenCalledWith(testError)
    })

    test('should wrap interceptor errors with INTERCEPTOR_REJECTED code', async () => {
      const testError = new Error('test error')
      const interceptors = [
        { id: 1, onFulfilled: () => { throw testError } },
      ]

      await expect(
        runRequestInterceptors(interceptors, { url: 'test' })
      ).rejects.toMatchObject({ errorCode: ERROR_CODES.INTERCEPTOR_REJECTED })
    })
  })

  describe('runResponseInterceptors', () => {
    test('should support shortCircuit', async () => {
      const shortCircuitValue = { data: 'from cache' }
      const interceptors = [
        { id: 1, onFulfilled: () => shortCircuit(shortCircuitValue) },
      ]

      const result = await runResponseInterceptors(interceptors, { status: 200 }, () => {})
      expect(result.shortCircuit).toBe(true)
      expect(result.result).toBe(shortCircuitValue)
    })

    test('should support retryRequest', async () => {
      const retryOptions = { timeout: 5000 }
      const interceptors = [
        { id: 1, onFulfilled: () => retryRequest(retryOptions) },
      ]

      const result = await runResponseInterceptors(interceptors, { status: 429 }, () => {})
      expect(result.retry).toBe(true)
      expect(result.options).toBe(retryOptions)
    })

    test('should run interceptors in order', async () => {
      const order = []
      const interceptors = [
        { id: 1, onFulfilled: (r) => { order.push(1); return r } },
        { id: 2, onFulfilled: (r) => { order.push(2); return r } },
      ]

      await runResponseInterceptors(interceptors, { status: 200 }, () => {})
      expect(order).toEqual([1, 2])
    })
  })

  describe('interceptor factories', () => {
    test('createRequestIdInterceptor should add X-Request-Id header', () => {
      const interceptor = createRequestIdInterceptor()
      const config = { url: 'test', init: { headers: {} } }

      const result = interceptor(config)
      expect(result.init.headers['X-Request-Id']).toBeDefined()
      expect(typeof result.requestId).toBe('string')
    })

    test('createHeaderInterceptor should merge headers', () => {
      const interceptor = createHeaderInterceptor({ 'X-Custom': 'value' })
      const config = { url: 'test', init: { headers: { 'Existing': 'header' } } }

      const result = interceptor(config)
      expect(result.init.headers['X-Custom']).toBe('value')
      expect(result.init.headers['Existing']).toBe('header')
    })

    test('createAuthInterceptor should add Authorization header', () => {
      const interceptor = createAuthInterceptor('test-token')
      const config = { url: 'test', init: { headers: {} } }

      const result = interceptor(config)
      expect(result.init.headers['Authorization']).toBe('Bearer test-token')
    })

    test('createAuthInterceptor should support function token', () => {
      const getToken = vi.fn(() => 'dynamic-token')
      const interceptor = createAuthInterceptor(getToken)
      const config = { url: 'test', init: { headers: {} } }

      const result = interceptor(config)
      expect(getToken).toHaveBeenCalledWith(config)
      expect(result.init.headers['Authorization']).toBe('Bearer dynamic-token')
    })

    test('createAuthInterceptor should support custom scheme', () => {
      const interceptor = createAuthInterceptor('test-token', 'X-Auth', 'Token')
      const config = { url: 'test', init: { headers: {} } }

      const result = interceptor(config)
      expect(result.init.headers['X-Auth']).toBe('Token test-token')
    })

    test('createAuthInterceptor should skip if no token', () => {
      const interceptor = createAuthInterceptor(null)
      const config = { url: 'test', init: { headers: { Existing: 'header' } } }

      const result = interceptor(config)
      expect(result).toBe(config)
    })
  })
})
