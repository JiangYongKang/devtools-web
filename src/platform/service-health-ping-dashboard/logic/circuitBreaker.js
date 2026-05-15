
import { CIRCUIT_STATES, DEFAULT_CIRCUIT_OPTIONS } from './constants.js'
import { createError, ERROR_CODES } from './errors.js'

export function createCircuitBreaker(options = {}) {
  const config = {
    ...DEFAULT_CIRCUIT_OPTIONS,
    ...options,
  }

  let state = CIRCUIT_STATES.CLOSED
  let failureCount = 0
  let successCount = 0
  let lastStateChangeTime = Date.now()
  let openUntil = 0
  let halfOpenProbeCount = 0

  const listeners = new Set()

  function notifyListeners() {
    const status = getStatus()
    listeners.forEach((listener) => listener(status))
  }

  function transitionTo(newState) {
    state = newState
    lastStateChangeTime = Date.now()

    if (newState === CIRCUIT_STATES.OPEN) {
      openUntil = Date.now() + config.resetTimeoutMs
    } else {
      openUntil = 0
    }

    failureCount = 0
    successCount = 0
    halfOpenProbeCount = 0

    notifyListeners()
  }

  function canExecute() {
    const now = Date.now()

    if (state === CIRCUIT_STATES.OPEN) {
      if (now >= openUntil) {
        transitionTo(CIRCUIT_STATES.HALF_OPEN)
        return true
      }
      return false
    }

    if (state === CIRCUIT_STATES.HALF_OPEN) {
      return halfOpenProbeCount < config.halfOpenMaxProbes
    }

    return true
  }

  function getStatus() {
    return {
      state,
      failureCount,
      successCount,
      lastStateChangeTime,
      openUntil,
      halfOpenProbeCount,
      config: { ...config },
    }
  }

  return {
    async execute(fn) {
      if (!canExecute()) {
        throw createError(
          ERROR_CODES.CIRCUIT_OPEN,
          `Circuit breaker is OPEN. Next try at ${new Date(openUntil).toISOString()}`,
          { openUntil, resetTimeoutMs: config.resetTimeoutMs }
        )
      }

      if (state === CIRCUIT_STATES.HALF_OPEN) {
        halfOpenProbeCount++
      }

      try {
        const result = await fn()

        this.onSuccess()
        return result
      } catch (error) {
        this.onFailure(error)
        throw error
      }
    },

    onSuccess() {
      if (state === CIRCUIT_STATES.HALF_OPEN) {
        successCount++
        if (successCount >= config.successThreshold) {
          transitionTo(CIRCUIT_STATES.CLOSED)
        } else {
          notifyListeners()
        }
      } else {
        failureCount = Math.max(0, failureCount - 1)
        notifyListeners()
      }
    },

    onFailure(error) {
      if (state === CIRCUIT_STATES.HALF_OPEN) {
        transitionTo(CIRCUIT_STATES.OPEN)
      } else {
        failureCount++
        if (failureCount >= config.failureThreshold) {
          transitionTo(CIRCUIT_STATES.OPEN)
        } else {
          notifyListeners()
        }
      }
    },

    forceOpen() {
      transitionTo(CIRCUIT_STATES.OPEN)
    },

    forceClose() {
      transitionTo(CIRCUIT_STATES.CLOSED)
    },

    forceHalfOpen() {
      transitionTo(CIRCUIT_STATES.HALF_OPEN)
    },

    reset() {
      transitionTo(CIRCUIT_STATES.CLOSED)
    },

    getStatus,

    canExecute,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
