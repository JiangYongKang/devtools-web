import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ERROR_CODES } from '../logic/constants.js'
import { enableObservability, getActivePolls, poll } from '../logic/poll.js'

describe('poll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    enableObservability(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('should reject immediately on invalid intervalMs', async () => {
    await expect(poll(() => {}, { intervalMs: 0 })).rejects.toThrow()
    await expect(poll(() => {}, { intervalMs: -1 })).rejects.toThrow()
    await expect(poll(() => {}, { intervalMs: NaN })).rejects.toThrow()
  })

  test('should poll until done and return value', async () => {
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      if (callCount >= 3) {
        return { done: true, value: 'result' }
      }
      return { done: false, value: { progress: callCount * 33 } }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    await Promise.resolve()
    expect(callCount).toBe(1)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(callCount).toBe(2)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(callCount).toBe(3)

    const result = await pollPromise
    expect(result).toBe('result')
  })

  test('should support immediate option', async () => {
    const fn = vi.fn(() => ({ done: true, value: 'immediate' }))

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    await Promise.resolve()
    expect(fn).toHaveBeenCalledTimes(1)

    const result = await pollPromise
    expect(result).toBe('immediate')
  })

  test('should wait for interval when isImmediate is false', async () => {
    const fn = vi.fn(() => ({ done: true, value: 'delayed' }))

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: false,
    })

    await Promise.resolve()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(fn).toHaveBeenCalledTimes(1)

    const result = await pollPromise
    expect(result).toBe('delayed')
  })

  test('should reject with MAX_ATTEMPTS_EXCEEDED when maxAttempts is reached', async () => {
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      return { done: false, value: { attempt: callCount } }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
      maxAttempts: 3,
    })

    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(100)
      await Promise.resolve()
    }

    await expect(pollPromise).rejects.toMatchObject({
      errorCode: ERROR_CODES.MAX_ATTEMPTS_EXCEEDED,
    })
    expect(callCount).toBe(3)
  })

  test('should handle abort signal before start', async () => {
    const controller = new AbortController()
    controller.abort(new Error('pre-aborted'))

    const fn = vi.fn(() => ({ done: true, value: 'never reached' }))

    await expect(poll(fn, {
      intervalMs: 100,
      signal: controller.signal,
    })).rejects.toThrow('pre-aborted')

    expect(fn).not.toHaveBeenCalled()
  })

  test('should handle abort signal during polling', async () => {
    const controller = new AbortController()
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      return { done: false, value: { attempt: callCount } }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
      signal: controller.signal,
    })

    await Promise.resolve()
    expect(callCount).toBe(1)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(callCount).toBe(2)

    controller.abort(new Error('stopped'))

    await expect(pollPromise).rejects.toThrow('stopped')
    expect(callCount).toBe(2)
  })

  test('should provide cancel method on promise', async () => {
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      return { done: false, value: { attempt: callCount } }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    await Promise.resolve()
    expect(callCount).toBe(1)

    pollPromise.cancel(new Error('cancelled via method'))

    await expect(pollPromise).rejects.toThrow('cancelled via method')
  })

  test('should provide disposable handle', async () => {
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      return { done: false, value: { attempt: callCount } }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    await Promise.resolve()

    expect(pollPromise.disposable).toBeDefined()
    expect(typeof pollPromise.disposable.cancel).toBe('function')
    expect(typeof pollPromise.disposable.getState).toBe('function')

    const state = pollPromise.disposable.getState()
    expect(state.attemptCount).toBe(1)

    pollPromise.disposable.dispose()

    await expect(pollPromise).rejects.toThrow()
  })

  test('should return done value from async function', async () => {
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50))
      return { done: true, value: 'async result' }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    vi.advanceTimersByTime(50)
    await Promise.resolve()

    const result = await pollPromise
    expect(result).toBe('async result')
  })

  test('should continue polling when function throws non-abort error', async () => {
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      if (callCount < 3) {
        throw new Error('temporary failure')
      }
      return { done: true, value: 'recovered' }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    await Promise.resolve()
    expect(callCount).toBe(1)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(callCount).toBe(2)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(callCount).toBe(3)

    const result = await pollPromise
    expect(result).toBe('recovered')
  })

  test('should increment consecutive failures on error', async () => {
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      if (callCount < 3) {
        throw new Error('temporary failure')
      }
      return { done: true, value: 'recovered' }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    await Promise.resolve()
    expect(callCount).toBe(1)

    let state = pollPromise.getState()
    expect(state.consecutiveFailures).toBe(1)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(callCount).toBe(2)

    state = pollPromise.getState()
    expect(state.consecutiveFailures).toBe(2)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    expect(callCount).toBe(3)

    const result = await pollPromise
    expect(result).toBe('recovered')
  })

  test('should reset consecutive failures on success', async () => {
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      if (callCount === 1) {
        return { done: false, value: { ok: true } }
      }
      if (callCount < 4) {
        throw new Error('temporary failure')
      }
      return { done: true, value: 'done' }
    })

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    await Promise.resolve()
    let state = pollPromise.getState()
    expect(state.consecutiveFailures).toBe(0)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    state = pollPromise.getState()
    expect(state.consecutiveFailures).toBe(1)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    state = pollPromise.getState()
    expect(state.consecutiveFailures).toBe(2)

    vi.advanceTimersByTime(100)
    await Promise.resolve()

    const result = await pollPromise
    expect(result).toBe('done')
  })
})

describe('getActivePolls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    enableObservability(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('should return empty array when no polls active', () => {
    expect(getActivePolls()).toEqual([])
  })

  test('should return active poll information', async () => {
    const fn = vi.fn(() => ({ done: false, value: 'polling' }))

    const pollPromise = poll(fn, {
      intervalMs: 100,
      jitterRatio: 0,
      isImmediate: true,
    })

    await Promise.resolve()

    const activePolls = getActivePolls()
    expect(activePolls.length).toBe(1)
    expect(activePolls[0].id).toBeDefined()
    expect(activePolls[0].attemptCount).toBe(1)
    expect(activePolls[0].isRunning).toBeDefined()

    pollPromise.cancel()
    await expect(pollPromise).rejects.toThrow()

    const afterCancel = getActivePolls()
    expect(afterCancel.length).toBe(0)
  })
})
