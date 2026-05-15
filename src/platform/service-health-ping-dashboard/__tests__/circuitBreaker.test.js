
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createCircuitBreaker } from '../logic/circuitBreaker.js'
import { CIRCUIT_STATES } from '../logic/constants.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('createCircuitBreaker - state transitions', () => {
  let circuitBreaker

  beforeEach(() => {
    circuitBreaker = createCircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeoutMs: 1000,
      halfOpenMaxProbes: 3,
    })
  })

  test('starts in closed state', () => {
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.CLOSED)
  })

  test('transitions to open state after failure threshold is reached', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'))

    for (let i = 0; i < 2; i++) {
      try {
        await circuitBreaker.execute(failingFn)
      } catch {}
    }
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.CLOSED)

    try {
      await circuitBreaker.execute(failingFn)
    } catch {}

    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.OPEN)
  })

  test('transitions to half-open state after reset timeout', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'))

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn)
      } catch {}
    }

    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.OPEN)

    vi.useFakeTimers()
    vi.advanceTimersByTime(1500)

    expect(circuitBreaker.canExecute()).toBe(true)
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.HALF_OPEN)

    vi.useRealTimers()
  })

  test('transitions back to closed state after success threshold in half-open', async () => {
    const successFn = vi.fn().mockResolvedValue('success')

    circuitBreaker.forceHalfOpen()
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.HALF_OPEN)

    for (let i = 0; i < 2; i++) {
      await circuitBreaker.execute(successFn)
    }

    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.CLOSED)
  })

  test('transitions back to open state on failure in half-open', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'))

    circuitBreaker.forceHalfOpen()
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.HALF_OPEN)

    try {
      await circuitBreaker.execute(failingFn)
    } catch {}

    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.OPEN)
  })

  test('throws CIRCUIT_OPEN error when circuit is open', async () => {
    const failingFn = vi.fn().mockRejectedValue(new Error('Failed'))
    const successFn = vi.fn().mockResolvedValue('success')

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingFn)
      } catch {}
    }

    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.OPEN)

    await expect(circuitBreaker.execute(successFn)).rejects.toMatchObject({
      code: ERROR_CODES.CIRCUIT_OPEN,
    })
  })
})

describe('createCircuitBreaker - manual control', () => {
  test('forceOpen transitions to open state', () => {
    const circuitBreaker = createCircuitBreaker()
    circuitBreaker.forceOpen()
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.OPEN)
  })

  test('forceClose transitions to closed state', () => {
    const circuitBreaker = createCircuitBreaker()
    circuitBreaker.forceOpen()
    circuitBreaker.forceClose()
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.CLOSED)
  })

  test('forceHalfOpen transitions to half-open state', () => {
    const circuitBreaker = createCircuitBreaker()
    circuitBreaker.forceHalfOpen()
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.HALF_OPEN)
  })

  test('reset transitions to closed state and resets counters', () => {
    const circuitBreaker = createCircuitBreaker()
    circuitBreaker.forceOpen()
    circuitBreaker.reset()
    expect(circuitBreaker.getStatus().state).toBe(CIRCUIT_STATES.CLOSED)
  })
})

describe('createCircuitBreaker - state transitions table driven', () => {
  const testCases = [
    {
      name: 'closed -> closed on success',
      initialState: CIRCUIT_STATES.CLOSED,
      actions: [{ type: 'success' }],
      expectedState: CIRCUIT_STATES.CLOSED,
    },
    {
      name: 'closed -> open after 3 failures',
      initialState: CIRCUIT_STATES.CLOSED,
      actions: [{ type: 'fail' }, { type: 'fail' }, { type: 'fail' }],
      expectedState: CIRCUIT_STATES.OPEN,
    },
    {
      name: 'half-open -> closed after 2 successes',
      initialState: CIRCUIT_STATES.HALF_OPEN,
      actions: [{ type: 'success' }, { type: 'success' }],
      expectedState: CIRCUIT_STATES.CLOSED,
    },
    {
      name: 'half-open -> open on first fail',
      initialState: CIRCUIT_STATES.HALF_OPEN,
      actions: [{ type: 'fail' }],
      expectedState: CIRCUIT_STATES.OPEN,
    },
  ]

  testCases.forEach(({ name, initialState, actions, expectedState }) => {
    test(name, async () => {
      const circuitBreaker = createCircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeoutMs: 1000,
      })

      if (initialState === CIRCUIT_STATES.OPEN) {
        circuitBreaker.forceOpen()
      } else if (initialState === CIRCUIT_STATES.HALF_OPEN) {
        circuitBreaker.forceHalfOpen()
      }

      for (const action of actions) {
        if (action.type === 'success') {
          circuitBreaker.onSuccess()
        } else if (action.type === 'fail') {
          circuitBreaker.onFailure(new Error('test'))
        }
      }

      expect(circuitBreaker.getStatus().state).toBe(expectedState)
    })
  })
})

describe('createCircuitBreaker - listener notification', () => {
  test('notifies listener on state change', () => {
    const circuitBreaker = createCircuitBreaker({ failureThreshold: 2 })
    const listener = vi.fn()

    circuitBreaker.subscribe(listener)

    circuitBreaker.onFailure(new Error('1'))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: CIRCUIT_STATES.CLOSED })
    )

    circuitBreaker.onFailure(new Error('2'))
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: CIRCUIT_STATES.OPEN })
    )
  })

  test('getStatus returns complete status object', () => {
    const circuitBreaker = createCircuitBreaker({ failureThreshold: 2 })
    const status = circuitBreaker.getStatus()
    expect(status.config.failureThreshold).toBe(2)
    expect(status.config.successThreshold).toBeDefined()
    expect(status.failureCount).toBeDefined()
    expect(status.lastStateChangeTime).toBeDefined()
  })
})
