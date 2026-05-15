import {
    DEFAULT_POLL_OPTIONS,
    ERROR_CODES,
    MAX_ACTIVE_POLLS_LIMIT,
} from './constants.js'
import {
    createAbortError,
    createError,
    isAbortError
} from './errors.js'
import {
    applyJitter,
    calculateExponentialBackoff,
    clamp,
    createMonotonicClock,
    generateId,
    isVisibilityHidden,
    validatePollOptions
} from './utils.js'

const activePolls = new Map()
let observabilityEnabled = false

function enableObservability(enabled = true) {
  observabilityEnabled = enabled
}

function isObservabilityEnabled() {
  return observabilityEnabled || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development')
}

function getActivePolls() {
  if (!isObservabilityEnabled()) {
    return []
  }

  return Array.from(activePolls.values()).map((poll) => ({
    id: poll.id,
    attemptCount: poll.attemptCount,
    startTime: poll.startTime,
    options: {
      intervalMs: poll.options.intervalMs,
      jitterRatio: poll.options.jitterRatio,
      maxAttempts: poll.options.maxAttempts,
      isImmediate: poll.options.isImmediate,
      backoffFactor: poll.options.backoffFactor,
      maxIntervalMs: poll.options.maxIntervalMs,
      minIntervalMs: poll.options.minIntervalMs,
      pauseOnHidden: poll.options.pauseOnHidden,
    },
    lastResult: poll.lastResult,
    lastError: poll.lastError,
    isRunning: poll.isRunning,
    isPaused: poll.isPaused,
  }))
}

function registerActivePoll(pollRecord) {
  if (!isObservabilityEnabled()) {
    return
  }

  if (activePolls.size >= MAX_ACTIVE_POLLS_LIMIT) {
    const oldestId = activePolls.keys().next().value
    if (oldestId) {
      activePolls.delete(oldestId)
    }
  }

  activePolls.set(pollRecord.id, pollRecord)
}

function unregisterActivePoll(id) {
  activePolls.delete(id)
}

function poll(fn, options = {}) {
  const mergedOptions = { ...DEFAULT_POLL_OPTIONS, ...options }

  const validationError = validatePollOptions(mergedOptions)
  if (validationError) {
    return Promise.reject(validationError)
  }

  const id = generateId('poll')
  const clock = createMonotonicClock()
  const startTime = Date.now()

  let currentAttempt = 0
  let consecutiveFailures = 0
  let isCancelled = false
  let isRunning = false
  let isPaused = false
  let currentTimeoutId = null
  let abortListener = null
  let visibilityListener = null
  let resolveOuter
  let rejectOuter
  let lastResult = null
  let lastError = null

  const pollRecord = {
    id,
    attemptCount: 0,
    startTime,
    options: mergedOptions,
    lastResult: null,
    lastError: null,
    isRunning: false,
    isPaused: false,
  }

  registerActivePoll(pollRecord)

  function cleanup() {
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      currentTimeoutId = null
    }

    if (abortListener && mergedOptions.signal) {
      mergedOptions.signal.removeEventListener('abort', abortListener)
      abortListener = null
    }

    if (visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityListener)
      visibilityListener = null
    }

    isRunning = false
    pollRecord.isRunning = false
    unregisterActivePoll(id)
  }

  function cancel(reason) {
    if (isCancelled) {
      return
    }

    isCancelled = true
    const abortReason = reason || createAbortError()

    if (resolveOuter && rejectOuter) {
      cleanup()
      rejectOuter(abortReason)
    }
  }

  function calculateNextInterval() {
    const baseInterval = mergedOptions.intervalMs

    let backoffInterval
    if (mergedOptions.backoffFactor > 1 && consecutiveFailures > 0) {
      backoffInterval = calculateExponentialBackoff(
        baseInterval,
        consecutiveFailures,
        mergedOptions.backoffFactor,
        mergedOptions.maxIntervalMs
      )
    } else {
      backoffInterval = baseInterval
    }

    const jitteredInterval = applyJitter(backoffInterval, mergedOptions.jitterRatio)

    return clamp(
      jitteredInterval,
      mergedOptions.minIntervalMs,
      mergedOptions.maxIntervalMs
    )
  }

  async function executeIteration() {
    if (isCancelled) {
      return
    }

    currentAttempt++
    pollRecord.attemptCount = currentAttempt
    isRunning = true
    pollRecord.isRunning = true

    const clockCheck = clock.checkClockRollback()
    if (clockCheck.detected) {
      lastError = createError(ERROR_CODES.CLOCK_ROLLBACK, null, { rollbackMs: clockCheck.rollbackMs })
      pollRecord.lastError = lastError
    }

    if (mergedOptions.pauseOnHidden && isVisibilityHidden()) {
      isPaused = true
      pollRecord.isPaused = true
      await waitForVisibility()
      if (isCancelled) {
        return
      }
      isPaused = false
      pollRecord.isPaused = false
    }

    if (mergedOptions.maxAttempts !== Infinity && currentAttempt > mergedOptions.maxAttempts) {
      cleanup()
      rejectOuter(createError(ERROR_CODES.MAX_ATTEMPTS_EXCEEDED, null, { maxAttempts: mergedOptions.maxAttempts }))
      return
    }

    try {
      const result = await fn()
      lastResult = result
      pollRecord.lastResult = result
      consecutiveFailures = 0

      if (result && result.done === true) {
        cleanup()
        resolveOuter(result.value)
        return
      }

      const nextInterval = calculateNextInterval()
      scheduleNextIteration(nextInterval)
    } catch (error) {
      lastError = error
      pollRecord.lastError = error
      consecutiveFailures++

      if (isAbortError(error)) {
        cleanup()
        rejectOuter(error)
        return
      }

      const nextInterval = calculateNextInterval()
      scheduleNextIteration(nextInterval)
    }
  }

  function scheduleNextIteration(interval) {
    if (isCancelled) {
      return
    }

    isRunning = false
    pollRecord.isRunning = false

    currentTimeoutId = setTimeout(() => {
      if (!isCancelled) {
        executeIteration()
      }
    }, interval)
  }

  async function waitForVisibility() {
    return new Promise((resolve) => {
      const handler = () => {
        if (!isVisibilityHidden()) {
          if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', handler)
          }
          resolve()
        }
      }

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handler)
        visibilityListener = handler
      } else {
        resolve()
      }
    })
  }

  const promise = new Promise((resolve, reject) => {
    resolveOuter = resolve
    rejectOuter = reject

    if (mergedOptions.signal) {
      if (mergedOptions.signal.aborted) {
        cleanup()
        reject(mergedOptions.signal.reason || createAbortError())
        return
      }

      abortListener = () => {
        cancel(mergedOptions.signal.reason)
      }

      mergedOptions.signal.addEventListener('abort', abortListener)
    }

    if (mergedOptions.isImmediate) {
      executeIteration()
    } else {
      const initialInterval = calculateNextInterval()
      scheduleNextIteration(initialInterval)
    }
  })

  const disposable = {
    cancel,
    dispose: () => cancel(),
    getState: () => ({
      id,
      attemptCount: currentAttempt,
      consecutiveFailures,
      isRunning,
      isPaused,
      isCancelled,
      startTime,
      lastResult,
      lastError,
    }),
    id,
  }

  Object.defineProperty(promise, 'cancel', { value: cancel, writable: false })
  Object.defineProperty(promise, 'dispose', { value: disposable.dispose, writable: false })
  Object.defineProperty(promise, 'getState', { value: disposable.getState, writable: false })
  Object.defineProperty(promise, 'id', { value: id, writable: false })
  Object.defineProperty(promise, 'disposable', { value: disposable, writable: false })

  return promise
}

export {
    enableObservability, getActivePolls, isObservabilityEnabled, poll
}

