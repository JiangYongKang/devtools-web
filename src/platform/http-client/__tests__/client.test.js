import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { HttpClient, createHttpClient } from '../logic/client.js'
import { ERROR_CODES, PRESET_ENVIRONMENTS } from '../logic/constants.js'
import { createRequestIdInterceptor, shortCircuit } from '../logic/interceptors.js'

describe('HttpClient', () => {
  let mockFetch
  let mockResponse

  beforeEach(() => {
    mockResponse = {
      status: 200,
      statusText: 'OK',
      ok: true,
      url: 'http://example.com/test',
      redirected: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: vi.fn(async () => ({ success: true })),
      text: vi.fn(async () => '{"success":true}'),
      blob: vi.fn(async () => new Blob()),
      arrayBuffer: vi.fn(async () => new ArrayBuffer(0)),
      formData: vi.fn(async () => new FormData()),
      body: null,
    }

    mockFetch = vi.fn(async (url, init = {}) => {
      if (init.signal) {
        if (init.signal.aborted) {
          throw new DOMException('The user aborted a request.', 'AbortError')
        }
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException('The user aborted a request.', 'AbortError'))
          }
          init.signal.addEventListener('abort', onAbort)
          setTimeout(() => {
            init.signal.removeEventListener('abort', onAbort)
            resolve(mockResponse)
          }, 0)
        })
      }
      return mockResponse
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('construction and configuration', () => {
    test('should create instance with default options', () => {
      const client = new HttpClient()
      expect(client.baseURL).toBeNull()
    })

    test('should create instance with baseURL', () => {
      const client = new HttpClient({ baseURL: 'https://api.example.com' })
      expect(client.baseURL).toBe('https://api.example.com')
    })

    test('should create via factory function', () => {
      const client = createHttpClient({ baseURL: 'https://api.example.com' })
      expect(client instanceof HttpClient).toBe(true)
      expect(client.baseURL).toBe('https://api.example.com')
    })

    test('should create via static create method', () => {
      const client = HttpClient.create({ baseURL: 'https://api.example.com' })
      expect(client instanceof HttpClient).toBe(true)
    })

    test('should normalize baseURL', () => {
      const client = new HttpClient({ baseURL: 'https://api.example.com//api//v1/' })
      expect(client.baseURL).toBe('https://api.example.com/api/v1')
    })

    test('should apply default headers', () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        headers: { 'X-Custom': 'value' }
      })
      const headers = client.getDefaultHeaders()
      expect(headers['X-Custom']).toBe('value')
      expect(headers['Accept']).toBeDefined()
    })
  })

  describe('environment management', () => {
    test('should allow adding and switching environments', () => {
      const client = new HttpClient()

      client.addEnvironment('dev', {
        name: 'Development',
        baseURL: 'http://localhost:3000',
        headers: { 'X-Env': 'dev' }
      })

      client.addEnvironment('prod', {
        name: 'Production',
        baseURL: 'https://api.example.com',
        headers: { 'X-Env': 'prod' }
      })

      expect(client.listEnvironments()).toEqual(['dev', 'prod'])

      client.setEnvironment('dev')
      expect(client.baseURL).toBe('http://localhost:3000')
      expect(client.currentEnvironment).toBe('dev')

      client.setEnvironment('prod')
      expect(client.baseURL).toBe('https://api.example.com')
      expect(client.currentEnvironment).toBe('prod')
    })

    test('should initialize with currentEnvironment', () => {
      const client = new HttpClient({
        environments: PRESET_ENVIRONMENTS,
        currentEnvironment: 'httpbin'
      })

      expect(client.baseURL).toBe(PRESET_ENVIRONMENTS.httpbin.baseURL)
      expect(client.currentEnvironment).toBe('httpbin')
    })

    test('should throw error for unknown environment', () => {
      const client = new HttpClient()
      expect(() => client.setEnvironment('unknown')).toThrow()
    })
  })

  describe('header management', () => {
    test('should allow setting default headers', () => {
      const client = new HttpClient({ baseURL: 'https://api.example.com' })

      client.setDefaultHeader('X-Custom', 'value')
      expect(client.getDefaultHeaders()['X-Custom']).toBe('value')

      client.setDefaultHeader('X-Custom', null)
      expect(client.getDefaultHeaders()['X-Custom']).toBeUndefined()
    })
  })

  describe('request execution', () => {
    test('should make GET request', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await client.get('/test', {
        params: { foo: 'bar' }
      })

      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('https://api.example.com/test')
      expect(callArgs[0]).toContain('foo=bar')
      expect(callArgs[1].method).toBe('GET')
    })

    test('should make POST request with JSON body', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      const data = { name: 'test', value: 123 }
      await client.post('/test', data)

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].method).toBe('POST')
      expect(callArgs[1].headers['Content-Type']).toBe('application/json;charset=utf-8')
      expect(callArgs[1].body).toBe(JSON.stringify(data))
    })

    test('should not set Content-Type for FormData', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      const formData = new FormData()
      formData.append('key', 'value')

      await client.post('/test', formData)

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].method).toBe('POST')
      expect(callArgs[1].headers['Content-Type']).toBeUndefined()
    })

    test('should support absolute URL bypassing baseURL', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await client.get('https://other.com/test')

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toBe('https://other.com/test')
    })
  })

  describe('interceptor integration', () => {
    test('should run request interceptors', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      const unregister = client.useRequest(createRequestIdInterceptor())

      await client.get('/test')

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].headers['X-Request-Id']).toBeDefined()

      unregister()
    })

    test('should allow unregistering interceptors', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      const interceptor = vi.fn((config) => config)
      const unregister = client.useRequest(interceptor)

      await client.get('/test1')
      unregister()
      await client.get('/test2')

      expect(interceptor).toHaveBeenCalledTimes(1)
    })

    test('should run response interceptors', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      const responseInterceptor = vi.fn((response) => response)
      client.useResponse(responseInterceptor)

      await client.get('/test')

      expect(responseInterceptor).toHaveBeenCalled()
    })

    test('should support short-circuiting in response interceptors', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      const cachedValue = { cached: true, data: 'from cache' }
      client.useResponse(() => shortCircuit(cachedValue))

      const result = await client.get('/test')

      expect(result).toBe(cachedValue)
    })
  })

  describe('error handling', () => {
    test('should throw HTTP_ERROR for non-2xx responses', async () => {
      const errorResponse = {
        ...mockResponse,
        status: 404,
        statusText: 'Not Found',
        ok: false,
      }
      mockFetch.mockResolvedValue(errorResponse)

      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await expect(client.get('/not-found')).rejects.toMatchObject({
        errorCode: ERROR_CODES.HTTP_ERROR,
      })
    })

    test('should handle CORS preflight failures', async () => {
      const corsError = new TypeError('Failed to fetch: CORS preflight failed')
      mockFetch.mockRejectedValue(corsError)

      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await expect(client.get('/test')).rejects.toMatchObject({
        errorCode: ERROR_CODES.CORS_PREFLIGHT_FAILED,
      })
    })

    test('should handle network errors', async () => {
      const networkError = new TypeError('Failed to fetch')
      mockFetch.mockRejectedValue(networkError)

      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await expect(client.get('/test')).rejects.toMatchObject({
        errorCode: ERROR_CODES.NETWORK,
      })
    })
  })

  describe('timeout and abort', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('should support user-provided signal', async () => {
      const controller = new AbortController()

      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      const requestPromise = client.get('/test', { signal: controller.signal })
      controller.abort()

      await expect(requestPromise).rejects.toMatchObject({
        errorCode: ERROR_CODES.ABORTED,
      })
    })
  })

  describe('convenience methods', () => {
    test('should provide put method', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await client.put('/test', { id: 1 })
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].method).toBe('PUT')
    })

    test('should provide patch method', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await client.patch('/test', { id: 1 })
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].method).toBe('PATCH')
    })

    test('should provide delete method', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await client.delete('/test')
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].method).toBe('DELETE')
    })

    test('should provide head method', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await client.head('/test')
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].method).toBe('HEAD')
    })

    test('should provide options method', async () => {
      const client = new HttpClient({
        baseURL: 'https://api.example.com',
        fetchImpl: mockFetch
      })

      await client.options('/test')
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[1].method).toBe('OPTIONS')
    })
  })
})
