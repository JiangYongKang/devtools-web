import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ERROR_CODES } from '../logic/constants.js'
import { retry } from '../logic/retry.js'

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  async function advanceAndTick(ms) {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }

  test('should reject immediately for non-function operation', async () => {
    await expect(retry('not a function')).rejects.toThrow()
  })

  test('should succeed on first attempt', async () => {
    const operation = vi.fn(async () => 'success')

    const result = await retry(operation, {
      retries: 3,
      delayMs: 0,
    })

    expect(result.result).toBe('success')
    expect(result.attempts).toBe(1)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  test('should retry and eventually succeed', async () => {
    let attemptCount = 0
    const operation = vi.fn(async () => {
      attemptCount++
      if (attemptCount < 3) {
        throw new Error('temporary failure')
      }
      return 'finally success'
    })

    const resultPromise = retry(operation, {
      retries: 3,
      delayMs: 100,
      backoffFactor: 1,
      maxDelayMs: 1000,
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(attemptCount).toBe(1)

    await advanceAndTick(100)
    expect(attemptCount).toBe(2)

    await advanceAndTick(100)
    expect(attemptCount).toBe(3)

    const result = await resultPromise
    expect(result.result).toBe('finally success')
    expect(result.attempts).toBe(3)
  })

  test('should reject with RETRY_EXHAUSTED after all retries fail', async () => {
    const originalError = new Error('persistent failure')
    const operation = vi.fn(async () => {
      throw originalError
    })

    const resultPromise = retry(operation, {
      retries: 2,
      delayMs: 100,
      backoffFactor: 1,
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(operation).toHaveBeenCalledTimes(1)

    await advanceAndTick(100)
    await advanceAndTick(100)
    await advanceAndTick(100)

    await expect(resultPromise).rejects.toMatchObject({
      errorCode: ERROR_CODES.RETRY_EXHAUSTED,
    })

    expect(operation).toHaveBeenCalledTimes(3)
  })

  test('should respect abort signal', async () => {
    const controller = new AbortController()
    const operation = vi.fn(async () => {
      throw new Error('will retry')
    })

    const resultPromise = retry(operation, {
      retries: 5,
      delayMs: 100,
      signal: controller.signal,
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(operation).toHaveBeenCalledTimes(1)

    await advanceAndTick(100)
    expect(operation).toHaveBeenCalledTimes(2)

    controller.abort(new Error('stopped'))

    await expect(resultPromise).rejects.toThrow('stopped')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  test('should support retryOn with HTTP status array', async () => {
    let attemptCount = 0
    const operation = vi.fn(async () => {
      attemptCount++
      const error = new Error(`HTTP ${500 + attemptCount}`)
      error.status = 500 + attemptCount
      if (attemptCount >= 3) {
        return 'success'
      }
      throw error
    })

    const resultPromise = retry(operation, {
      retries: 3,
      delayMs: 100,
      backoffFactor: 1,
      retryOn: [500, 501, 502, 503],
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(attemptCount).toBe(1)

    await advanceAndTick(100)
    expect(attemptCount).toBe(2)

    await advanceAndTick(100)
    expect(attemptCount).toBe(3)

    const result = await resultPromise
    expect(result.attempts).toBe(3)
  })

  test('should not retry on non-matching HTTP status', async () => {
    const operation = vi.fn(async () => {
      const error = new Error('Bad Request')
      error.status = 400
      throw error
    })

    const resultPromise = retry(operation, {
      retries: 3,
      delayMs: 100,
      retryOn: [500, 502, 503],
    })

    await expect(resultPromise).rejects.toThrow('Bad Request')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  test('should support retryOn with predicate function', async () => {
    let attemptCount = 0
    const operation = vi.fn(async () => {
      attemptCount++
      const error = new Error(`attempt ${attemptCount}`)
      error.retryable = attemptCount < 3
      if (attemptCount >= 3) {
        return 'success'
      }
      throw error
    })

    const retryOn = (error) => error.retryable
    const resultPromise = retry(operation, {
      retries: 3,
      delayMs: 100,
      backoffFactor: 1,
      retryOn,
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(attemptCount).toBe(1)

    await advanceAndTick(100)
    expect(attemptCount).toBe(2)

    await advanceAndTick(100)
    expect(attemptCount).toBe(3)

    const result = await resultPromise
    expect(result.attempts).toBe(3)
  })

  test('should use exponential backoff', async () => {
    let attemptCount = 0
    const operation = vi.fn(async () => {
      attemptCount++
      if (attemptCount >= 4) {
        return 'success'
      }
      throw new Error('retry')
    })

    const resultPromise = retry(operation, {
      retries: 5,
      delayMs: 100,
      backoffFactor: 2,
      maxDelayMs: 10000,
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(attemptCount).toBe(1)

    await advanceAndTick(100)
    expect(attemptCount).toBe(2)

    await advanceAndTick(200)
    expect(attemptCount).toBe(3)

    await advanceAndTick(400)
    expect(attemptCount).toBe(4)

    const result = await resultPromise
    expect(result.result).toBe('success')
  })

  test('should provide disposable handle', async () => {
    const operation = vi.fn(async () => {
      throw new Error('will retry')
    })

    const resultPromise = retry(operation, {
      retries: 5,
      delayMs: 100,
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(resultPromise.disposable).toBeDefined()
    expect(typeof resultPromise.disposable.cancel).toBe('function')
    expect(typeof resultPromise.disposable.getState).toBe('function')

    resultPromise.disposable.dispose()

    await expect(resultPromise).rejects.toThrow()
  })

  test('should respect Retry-After header when error has response', async () => {
    let attemptCount = 0
    const operation = vi.fn(async () => {
      attemptCount++
      if (attemptCount >= 2) {
        return 'success'
      }
      const error = new Error('Service Unavailable')
      error.status = 503
      error.response = {
        headers: {
          get: (name) => name.toLowerCase() === 'retry-after' ? '5' : null,
        },
      }
      throw error
    })

    const resultPromise = retry(operation, {
      retries: 2,
      delayMs: 100,
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(attemptCount).toBe(1)

    await advanceAndTick(100)
    expect(attemptCount).toBe(1)

    await advanceAndTick(4900)
    expect(attemptCount).toBe(2)

    const result = await resultPromise
    expect(result.result).toBe('success')
  })

  test('should pass attempt number to operation', async () => {
    const operation = vi.fn(async ({ attempt }) => {
      if (attempt >= 3) {
        return `success at ${attempt}`
      }
      throw new Error(`failure at ${attempt}`)
    })

    const resultPromise = retry(operation, {
      retries: 3,
      delayMs: 100,
      backoffFactor: 1,
    })

    await Promise.resolve()
    await Promise.resolve()

    await advanceAndTick(100)
    await advanceAndTick(100)

    const result = await resultPromise
    expect(result.result).toBe('success at 3')
  })

  test('should handle operation without retries (retries: 0)', async () => {
    const operation = vi.fn(async () => 'success')

    const result = await retry(operation, {
      retries: 0,
      delayMs: 100,
    })

    expect(result.result).toBe('success')
    expect(result.attempts).toBe(1)
  })

  test('should fail immediately when retries: 0 and operation fails', async () => {
    const operation = vi.fn(async () => {
      throw new Error('failed')
    })

    const resultPromise = retry(operation, {
      retries: 0,
      delayMs: 100,
    })

    await expect(resultPromise).rejects.toMatchObject({
      errorCode: ERROR_CODES.RETRY_EXHAUSTED,
    })
  })
})
