import {
  DEFAULT_CONFIG,
} from './constants.js'

function createDebouncedFn(fn, options = {}) {
  const wait = options.wait ?? DEFAULT_CONFIG.DEBOUNCE_WAIT_MS
  const maxWait = options.maxWait ?? null
  const leading = options.leading ?? false
  const trailing = options.trailing ?? true

  let timeoutId = null
  let maxTimeoutId = null
  let lastArgs = null
  let lastThis = null
  let lastCallTime = 0
  let lastInvokeTime = 0
  let result = null

  function invokeFunc() {
    const args = lastArgs
    const thisArg = lastThis
    lastArgs = lastThis = null
    lastInvokeTime = Date.now()
    result = fn.apply(thisArg, args)
    return result
  }

  function startTimer() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(timerExpired, wait)
  }

  function startMaxTimer() {
    if (maxWait && maxTimeoutId === null) {
      maxTimeoutId = setTimeout(maxTimerExpired, maxWait)
    }
  }

  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall

    if (maxWait === null) {
      return timeWaiting
    }

    return Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
  }

  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== null && timeSinceLastInvoke >= maxWait)
    )
  }

  function leadingEdge(time) {
    lastInvokeTime = time
    startTimer()
    if (maxWait) {
      startMaxTimer()
    }
    if (leading) {
      return invokeFunc()
    }
    return result
  }

  function trailingEdge(time) {
    timeoutId = null
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId)
      maxTimeoutId = null
    }

    if (trailing && lastArgs) {
      return invokeFunc()
    }

    lastArgs = lastThis = null
    return result
  }

  function timerExpired() {
    const time = Date.now()

    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }

    timeoutId = setTimeout(timerExpired, remainingWait(time))
  }

  function maxTimerExpired() {
    maxTimeoutId = null
    if (lastArgs) {
      return trailingEdge(Date.now())
    }
  }

  function cancel() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId)
      maxTimeoutId = null
    }
    lastInvokeTime = 0
    lastCallTime = 0
    lastArgs = lastThis = null
  }

  function flush() {
    if (timeoutId === null && lastArgs === null) {
      return result
    }
    return trailingEdge(Date.now())
  }

  function pendingState() {
    return timeoutId !== null
  }

  function debounced(...args) {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (isInvoking) {
      if (timeoutId === null && maxTimeoutId === null) {
        return leadingEdge(time)
      }

      if (maxWait !== null) {
        startTimer()
        return invokeFunc()
      }
    }

    if (timeoutId === null) {
      startTimer()
      if (maxWait !== null) {
        startMaxTimer()
      }
    }

    return result
  }

  debounced.cancel = cancel
  debounced.flush = flush
  debounced.pending = pendingState

  return debounced
}

function createThrottledFn(fn, wait = 100, options = {}) {
  const leading = options.leading ?? true
  const trailing = options.trailing ?? true

  let timeoutId = null
  let lastArgs = null
  let lastThis = null
  let lastInvokeTime = 0
  let result = null

  function invokeFunc() {
    const args = lastArgs
    const thisArg = lastThis
    lastArgs = lastThis = null
    lastInvokeTime = Date.now()
    result = fn.apply(thisArg, args)
    return result
  }

  function trailingEdge() {
    timeoutId = null
    if (lastArgs) {
      return invokeFunc()
    }
  }

  function debounced(...args) {
    const time = Date.now()
    const isLeading = lastInvokeTime === 0

    lastArgs = args
    lastThis = this

    if (isLeading && !leading) {
      lastInvokeTime = time
    }

    const remaining = wait - (time - lastInvokeTime)

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastInvokeTime = time
      result = fn.apply(this, args)
      lastArgs = lastThis = null
    } else if (timeoutId === null && trailing) {
      timeoutId = setTimeout(trailingEdge, remaining)
    }

    return result
  }

  debounced.cancel = function() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastInvokeTime = 0
    lastArgs = lastThis = null
  }

  debounced.flush = function() {
    if (timeoutId === null) {
      return result
    }
    clearTimeout(timeoutId)
    timeoutId = null
    if (lastArgs) {
      return invokeFunc()
    }
    return result
  }

  return debounced
}

export {
  createDebouncedFn,
  createThrottledFn,
}
