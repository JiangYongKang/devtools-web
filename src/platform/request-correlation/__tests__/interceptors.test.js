import { describe, expect, test, vi } from 'vitest'
import {
  createRequestContext,
  applyHeaders,
  createRequestCorrelationInterceptor,
  createMockHttpClient,
  createLogBuffer,
  createMemorySessionProvider,
  SPAN_SHARE_MODES,
  ID_MODES,
} from '../logic/index.js'

describe('interceptors module', () => {
  describe('createRequestContext', () => {
    test('should create context with generated IDs', () => {
      const context = createRequestContext({ idMode: ID_MODES.UUID_V4 })

      expect(context.requestId).toBeDefined()
      expect(context.traceId).toBeDefined()
      expect(context.spanId).toBeDefined()
      expect(context.getTraceParent()).toBeDefined()
    })

    test('should use provided requestId when given', () => {
      const customId = '550e8400-e29b-41d4-a716-446655440000'
      const context = createRequestContext({ requestId: customId })

      expect(context.requestId).toBe(customId)
    })

    test('deriveNext should create new context with shared traceId', () => {
      const context = createRequestContext({ spanShareMode: SPAN_SHARE_MODES.DERIVE })
      const nextContext = context.deriveNext()

      expect(nextContext.traceId).toBe(context.traceId)
      expect(nextContext.requestId).toBe(context.requestId)
      expect(nextContext.spanId).not.toBe(context.spanId)
    })

    test('deriveNext in SHARE mode should keep same spanId', () => {
      const context = createRequestContext({ spanShareMode: SPAN_SHARE_MODES.SHARE })
      const nextContext = context.deriveNext({ spanShareMode: SPAN_SHARE_MODES.SHARE })

      expect(nextContext.spanId).toBe(context.spanId)
    })

    test('should derive spanId from traceParent', () => {
      const traceId = '4bf92f3577b34da6a3ce929d0e0e4736'
      const parentSpanId = '00f067aa0ba902b7'
      const traceParent = `00-${traceId}-${parentSpanId}-01`

      const context = createRequestContext({ traceParent })

      expect(context.traceId).toBe(traceId)
      expect(context.parentSpanId).toBe(parentSpanId)
      expect(context.spanId).not.toBe(parentSpanId)
    })

    test('clone should create independent context', () => {
      const context = createRequestContext()
      const cloned = context.clone({ requestId: 'custom-id' })

      expect(cloned.requestId).toBe('custom-id')
      expect(cloned.traceId).toBe(context.traceId)
    })
  })

  describe('applyHeaders', () => {
    test('should apply correlation headers', () => {
      const context = createRequestContext()
      const init = applyHeaders({ method: 'GET' }, context)

      expect(init.headers).toBeDefined()
      expect(init.headers['X-Request-Id']).toBe(context.requestId)
      expect(init.headers.traceparent).toBe(context.getTraceParent())
    })

    test('should include session ID when enabled', () => {
      const context = createRequestContext({ sessionId: 'session-123' })
      const init = applyHeaders({}, context, {
        includeSessionId: true,
      })

      expect(init.headers['X-Session-Id']).toBe('session-123')
    })

    test('should allow custom header names', () => {
      const context = createRequestContext()
      const init = applyHeaders({}, context, {
        requestIdHeaderName: 'X-Custom-Request-Id',
        traceHeaderName: 'X-Custom-Trace',
      })

      expect(init.headers['X-Custom-Request-Id']).toBe(context.requestId)
      expect(init.headers['X-Custom-Trace']).toBeDefined()
    })

    test('should override provided requestId if allowOverride', () => {
      const context = createRequestContext({ requestId: 'context-id' })
      const customId = '550e8400-e29b-41d4-a716-446655440000'

      const init = applyHeaders(
        { headers: { 'X-Request-Id': customId } },
        context,
        { allowOverride: true }
      )

      expect(init.headers['X-Request-Id']).toBe(customId)
    })
  })

  describe('createRequestCorrelationInterceptor', () => {
    test('request interceptor should add correlation headers', async () => {
      const interceptor = createRequestCorrelationInterceptor()
      const config = {
        url: 'https://api.example.com/data',
        init: { method: 'GET' },
      }

      const result = await interceptor.request(config)

      expect(result.init.headers['X-Request-Id']).toBeDefined()
      expect(result.init.headers.traceparent).toBeDefined()
      expect(result.correlationContext).toBeDefined()
      expect(result._correlation).toBeDefined()
    })

    test('should use session provider when enabled', async () => {
      const sessionProvider = createMemorySessionProvider('session-123')
      const interceptor = createRequestCorrelationInterceptor({
        sessionProvider,
        includeSessionId: true,
      })

      const config = {
        url: 'https://api.example.com/data',
        init: { method: 'GET' },
      }

      const result = await interceptor.request(config)
      expect(result.init.headers['X-Session-Id']).toBe('session-123')
    })

    test('response interceptor should log to buffer', async () => {
      const logBuffer = createLogBuffer()
      const interceptor = createRequestCorrelationInterceptor({
        logBuffer,
      })

      const config = {
        _correlation: {
          startTime: Date.now() - 100,
          requestId: 'test-request-id',
          url: 'https://api.example.com/data',
          method: 'GET',
        },
      }

      const response = { status: 200, ok: true }
      interceptor.response(response, config)

      const entries = logBuffer.getAll()
      expect(entries.length).toBe(1)
      expect(entries[0].requestId).toBe('test-request-id')
      expect(entries[0].status).toBe(200)
      expect(entries[0].durationMs).toBeDefined()
    })

    test('error interceptor should log errors', async () => {
      const logBuffer = createLogBuffer()
      const interceptor = createRequestCorrelationInterceptor({
        logBuffer,
      })

      const config = {
        _correlation: {
          startTime: Date.now() - 50,
          requestId: 'error-request-id',
          url: 'https://api.example.com/error',
          method: 'GET',
        },
      }

      const error = new Error('Test error')
      error.status = 500

      expect(() => interceptor.error(error, config)).toThrow()

      const entries = logBuffer.getAll()
      expect(entries.length).toBe(1)
      expect(entries[0].level).toBe('error')
      expect(entries[0].requestId).toBe('error-request-id')
    })

    test('should call emitLogForToast for 5xx errors', async () => {
      const emitLogForToast = vi.fn()
      const interceptor = createRequestCorrelationInterceptor({
        emitLogForToast,
      })

      const config = {
        _correlation: {
          startTime: Date.now() - 50,
          requestId: '5xx-request-id',
          url: 'https://api.example.com/error',
          method: 'GET',
        },
      }

      const error = new Error('Server error')
      error.status = 500

      expect(() => {
        interceptor.error(error, config)
      }).toThrow()

      expect(emitLogForToast).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: '5xx-request-id',
          status: 500,
        })
      )
    })

    test('should call emitLogForToast for NETWORK errors', async () => {
      const emitLogForToast = vi.fn()
      const interceptor = createRequestCorrelationInterceptor({
        emitLogForToast,
      })

      const config = {
        _correlation: {
          startTime: Date.now() - 50,
          requestId: 'network-request-id',
          url: 'https://api.example.com/error',
          method: 'GET',
        },
      }

      const error = new Error('Network error')
      error.errorCode = 'NETWORK'

      expect(() => {
        interceptor.error(error, config)
      }).toThrow()

      expect(emitLogForToast).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'network-request-id',
          errorCode: 'NETWORK',
        })
      )
    })
  })

  describe('mockFetch integration', () => {
    test('should integrate interceptor with mock HTTP client', async () => {
      const logBuffer = createLogBuffer()
      const interceptor = createRequestCorrelationInterceptor({
        logBuffer,
      })

      const client = createMockHttpClient({
        interceptors: [interceptor],
        logBuffer,
      })

      const response = await client.get('https://api.example.com/data')
      expect(response.status).toBe(200)

      const entries = logBuffer.getAll()
      expect(entries.length).toBeGreaterThan(0)
      expect(entries[0].requestId).toBeDefined()
    })

    test('should handle sequential requests with derived spans', async () => {
      const logBuffer = createLogBuffer()
      const interceptor = createRequestCorrelationInterceptor({
        logBuffer,
        spanShareMode: SPAN_SHARE_MODES.DERIVE,
      })

      const client = createMockHttpClient({
        interceptors: [interceptor],
        logBuffer,
      })

      const responses = []
      for (let i = 0; i < 3; i++) {
        const response = await client.get(`https://api.example.com/data/${i}`)
        responses.push(response)
      }

      expect(responses.length).toBe(3)
      const entries = logBuffer.getAll()
      expect(entries.length).toBe(3)
    })
  })
})
