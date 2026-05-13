import { ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

function createCancelToken() {
  let aborted = false
  let abortReason = null
  const listeners = new Set()

  const token = {
    get aborted() {
      return aborted
    },
    get reason() {
      return abortReason
    },
    addEventListener(listener) {
      if (typeof listener !== 'function') return () => {}
      if (aborted) {
        listener(abortReason)
        return () => {}
      }
      listeners.add(listener)
      return function remove() {
        listeners.delete(listener)
      }
    },
    throwIfRequested() {
      if (aborted) {
        throw abortReason || createError(ERROR_CODES.ABORTED, 'Request has been cancelled')
      }
    },
  }

  function cancel(reason) {
    if (aborted) return
    aborted = true
    abortReason = reason || createError(ERROR_CODES.ABORTED, 'Request has been cancelled')
    listeners.forEach((listener) => {
      try {
        listener(abortReason)
      } catch {
        // Swallow listener errors to avoid affecting other listeners
      }
    })
    listeners.clear()
  }

  return { token, cancel }
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(createError(ERROR_CODES.TIMEOUT, `Request timeout after ${timeoutMs}ms`))
  }, timeoutMs)

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
    controller,
  }
}

function combineSignals(...signals) {
  const controller = new AbortController()

  const cleanupFns = []

  signals.forEach((signal) => {
    if (!signal) return

    if (signal.aborted) {
      controller.abort(signal.reason)
      return
    }

    const onAbort = () => {
      controller.abort(signal.reason)
    }

    signal.addEventListener('abort', onAbort)
    cleanupFns.push(() => signal.removeEventListener('abort', onAbort))
  })

  return {
    signal: controller.signal,
    cleanup: () => cleanupFns.forEach((fn) => fn()),
    controller,
  }
}

async function withTimeout(promise, timeoutMs, options = {}) {
  const { continueInBackground = false, onTimeout } = options

  if (timeoutMs == null || timeoutMs <= 0) {
    return promise
  }

  const timeoutResult = createTimeoutSignal(timeoutMs)

  const wrappedPromise = new Promise((resolve, reject) => {
    promise
      .then((result) => {
        timeoutResult.clear()
        resolve(result)
      })
      .catch((error) => {
        timeoutResult.clear()
        reject(error)
      })

    timeoutResult.signal.addEventListener('abort', () => {
      if (continueInBackground && onTimeout) {
        onTimeout()
      }
      reject(timeoutResult.signal.reason)
    })
  })

  return wrappedPromise
}

function isAbortError(error) {
  if (!error) return false
  if (error.name === 'AbortError') return true
  if (error.code === 20) return true
  return false
}

function isTimeoutError(error) {
  if (!error) return false
  if (error.errorCode === ERROR_CODES.TIMEOUT) return true
  if (error.name === 'TimeoutError') return true
  if (error.message && error.message.toLowerCase().includes('timeout')) return true
  return false
}

function classifyAbortError(error) {
  if (isTimeoutError(error)) {
    return ERROR_CODES.TIMEOUT
  }
  if (isAbortError(error)) {
    return ERROR_CODES.ABORTED
  }
  return null
}

export {
  createCancelToken,
  createTimeoutSignal,
  combineSignals,
  withTimeout,
  isAbortError,
  isTimeoutError,
  classifyAbortError,
}
