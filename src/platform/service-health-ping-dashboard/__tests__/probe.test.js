
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CIRCUIT_STATES, ERROR_TYPES } from '../logic/constants.js'
import { createProbeExecutor, executeProbe } from '../logic/probe.js'

describe('executeProbe - with fetch mock', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  test('returns success result for successful request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers({
        'content-type': 'application/json',
        'server-timing': 'db;dur=50, app;dur=100',
      }),
    })

    const target = { id: 'test-1', url: 'https://api.example.com/health' }
    const result = await executeProbe(target)

    expect(result.id).toBe('test-1')
    expect(result.targetUrl).toBe('https://api.example.com/health')
    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)
    expect(result.ttfbMs).toBeDefined()
    expect(result.totalMs).toBeDefined()
    expect(result.headers['content-type']).toBe('application/json')
    expect(result.headers['server-timing']).toBe('db;dur=50, app;dur=100')
  })

  test('returns failure for unexpected status code', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      headers: new Headers(),
    })

    const target = { id: 'test-2', url: 'https://api.example.com/health' }
    const result = await executeProbe(target)

    expect(result.success).toBe(false)
    expect(result.statusCode).toBe(500)
    expect(result.errorType).toBe(ERROR_TYPES.HTTP)
    expect(result.errorMessage).toBe('Unexpected status code: 500')
  })

  test('classifies CORS error correctly', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('CORS policy: No Access-Control-Allow-Origin'))

    const target = { id: 'test-3', url: 'https://api.example.com/health' }
    const result = await executeProbe(target)

    expect(result.success).toBe(false)
    expect(result.errorType).toBe(ERROR_TYPES.CORS)
    expect(result.errorMessage).toBe('CORS policy prevented the request')
  })

  test('classifies network error correctly', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))

    const target = { id: 'test-4', url: 'https://api.example.com/health' }
    const result = await executeProbe(target)

    expect(result.success).toBe(false)
    expect(result.errorType).toBe(ERROR_TYPES.NETWORK)
    expect(result.errorMessage).toBe('Network connection failed')
  })

  test('handles abort timeout correctly', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const abortError = new DOMException('The operation was aborted.', 'AbortError')
          reject(abortError)
        }, 10)
      })
    })

    const target = { id: 'test-5', url: 'https://api.example.com/health', timeoutMs: 5 }
    const result = await executeProbe(target)

    expect(result.success).toBe(false)
    expect(result.errorType).toBe(ERROR_TYPES.TIMEOUT)
    expect(result.errorMessage).toBe('Request timed out')
  })

  test('uses custom expected status codes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      headers: new Headers(),
    })

    const target = {
      id: 'test-6',
      url: 'https://api.example.com/health',
      expectedStatus: [201, 202],
    }
    const result = await executeProbe(target)

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(201)
  })
})

describe('createProbeExecutor - with circuit breaker and history', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  test('executes probe and stores history', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
    })

    const target = { id: 'test-1', url: 'https://api.example.com/health' }
    const executor = createProbeExecutor(target, { failureThreshold: 3 })

    const result = await executor.probe()

    expect(result.success).toBe(true)
    expect(executor.getLastResult()).toEqual(result)
    expect(executor.getLatencyHistory()).toHaveLength(1)
    expect(executor.getResultHistory()).toHaveLength(1)
  })

  test('opens circuit breaker after failures', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed'))

    const target = { id: 'test-2', url: 'https://api.example.com/health' }
    const executor = createProbeExecutor(target, { failureThreshold: 2 })

    for (let i = 0; i < 2; i++) {
      try {
        await executor.probe()
      } catch {}
    }

    expect(executor.getCircuitStatus().state).toBe(CIRCUIT_STATES.OPEN)

    const resultAfterOpen = await executor.probe()
    expect(resultAfterOpen.circuitOpen).toBe(true)
    expect(resultAfterOpen.errorMessage).toBe('Circuit breaker is open - probe skipped')
  })

  test('returns same result if already probing', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            ok: true,
            headers: new Headers(),
          })
        }, 100)
      })
    })

    const target = { id: 'test-3', url: 'https://api.example.com/health' }
    const executor = createProbeExecutor(target)

    const promise1 = executor.probe()
    const promise2 = executor.probe()

    expect(promise1).toBe(promise2)

    await promise1
  })

  test('reset clears all history and resets circuit breaker', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
    })

    const target = { id: 'test-4', url: 'https://api.example.com/health' }
    const executor = createProbeExecutor(target)

    await executor.probe()
    await executor.probe()

    expect(executor.getLatencyHistory()).toHaveLength(2)
    expect(executor.getResultHistory()).toHaveLength(2)
    expect(executor.getLastResult()).toBeDefined()

    executor.reset()

    expect(executor.getLatencyHistory()).toHaveLength(0)
    expect(executor.getResultHistory()).toHaveLength(0)
    expect(executor.getLastResult()).toBeNull()
    expect(executor.getCircuitStatus().state).toBe(CIRCUIT_STATES.CLOSED)
  })
})
