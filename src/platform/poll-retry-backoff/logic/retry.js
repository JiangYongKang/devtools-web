import {
    DEFAULT_RETRY_OPTIONS,
    ERROR_CODES,
} from './constants.js'
import {
    createAbortError,
    createError,
    isAbortError,
    wrapError,
} from './errors.js'
import {
    applyJitter,
    calculateExponentialBackoff,
    clamp,
    generateId,
    isFiniteNumber,
    parseRetryAfter,
    shouldRetryOnError,
} from './utils.js'

function retry(operation, options = {}) {
  if (typeof operation !== 'function') {
    return Promise.reject(createError(ERROR_CODES.INVALID_PARAMETER, 'operation 必须是函数', { type: typeof operation }))
  }

  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options }

  const id = generateId('retry')
  const startTime = Date.now()
  let attempts = 0
  let isCancelled = false
  let currentTimeoutId = null
  let abortListener = null
  let resolveOuter
  let rejectOuter
  let lastError = null
  let lastResult = null
  const attemptHistory = []

  function cleanup() {
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      currentTimeoutId = null
    }

    if (abortListener && mergedOptions.signal) {
      mergedOptions.signal.removeEventListener('abort', abortListener)
      abortListener = null
    }
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

  function calculateDelay(attempt, error) {
    const retryAfterMs = parseRetryAfter(error?.response?.headers || error?.headers)
    if (retryAfterMs !== null && retryAfterMs > 0) {
      return Math.min(retryAfterMs, mergedOptions.maxDelayMs)
    }

    let baseDelay
    if (typeof mergedOptions.delayMs === 'function') {
      baseDelay = mergedOptions.delayMs(attempt, error)
    } else {
      baseDelay = mergedOptions.delayMs
    }

    if (!isFiniteNumber(baseDelay) || baseDelay <= 0) {
      return 0
    }

    if (mergedOptions.backoffFactor > 1) {
      baseDelay = calculateExponentialBackoff(
        baseDelay,
        attempt,
        mergedOptions.backoffFactor,
        mergedOptions.maxDelayMs
      )
    }

    if (mergedOptions.jitterRatio && mergedOptions.jitterRatio > 0) {
      baseDelay = applyJitter(baseDelay, mergedOptions.jitterRatio)
    }

    return clamp(baseDelay, 0, mergedOptions.maxDelayMs)
  }

  async function run() {
    while (!isCancelled) {
      attempts++
      const attemptInfo = {
        attempt: attempts,
        startTime: Date.now(),
        endTime: null,
        duration: null,
        success: false,
        error: null,
        result: null,
        delay: null,
      }
      attemptHistory.push(attemptInfo)

      try {
        const result = await operation({ attempt: attempts })
        lastResult = result
        attemptInfo.success = true
        attemptInfo.result = result
        attemptInfo.endTime = Date.now()
        attemptInfo.duration = attemptInfo.endTime - attemptInfo.startTime

        cleanup()
        return {
          result,
          attempts,
          retryHistory: attemptHistory,
        }
      } catch (error) {
        lastError = error
        attemptInfo.error = error
        attemptInfo.endTime = Date.now()
        attemptInfo.duration = attemptInfo.endTime - attemptInfo.startTime

        if (isAbortError(error)) {
          cleanup()
          throw error
        }

        if (attempts > mergedOptions.retries) {
          cleanup()
          const exhaustedError = wrapError(
            error,
            ERROR_CODES.RETRY_EXHAUSTED,
            {
              attempts,
              maxAttempts: mergedOptions.retries + 1,
              retryHistory: attemptHistory,
            }
          )
          throw exhaustedError
        }

        const shouldRetry = shouldRetryOnError(error, mergedOptions.retryOn)
        if (!shouldRetry) {
          cleanup()
          throw error
        }

        const delay = calculateDelay(attempts - 1, error)
        attemptInfo.delay = delay

        if (delay > 0) {
          await new Promise((resolve, reject) => {
            let timeoutListener = null

            if (mergedOptions.signal) {
              if (mergedOptions.signal.aborted) {
                reject(mergedOptions.signal.reason || createAbortError())
                return
              }

              timeoutListener = () => {
                clearTimeout(currentTimeoutId)
                reject(mergedOptions.signal.reason || createAbortError())
              }
              mergedOptions.signal.addEventListener('abort', timeoutListener)
            }

            currentTimeoutId = setTimeout(() => {
              if (timeoutListener && mergedOptions.signal) {
                mergedOptions.signal.removeEventListener('abort', timeoutListener)
              }
              if (!isCancelled) {
                resolve()
              }
            }, delay)
          })
        }

        if (isCancelled) {
          throw createAbortError()
        }
      }
    }

    throw createAbortError()
  }

  function setup() {
    return new Promise((resolve, reject) => {
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

      run().then(resolveOuter).catch(rejectOuter)
    })
  }

  const promise = setup()

  const disposable = {
    cancel,
    dispose: () => cancel(),
    getState: () => ({
      id,
      attempts,
      isCancelled,
      startTime,
      lastError,
      lastResult,
      retryHistory: attemptHistory.map((h) => ({
        attempt: h.attempt,
        success: h.success,
        duration: h.duration,
        delay: h.delay,
      })),
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
    retry
}

