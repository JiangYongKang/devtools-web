import { ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function applyJitter(baseValue, jitterRatio, randomFn = Math.random) {
  if (!isFiniteNumber(baseValue) || baseValue <= 0) {
    return baseValue
  }

  const safeRatio = clamp(jitterRatio || 0, 0, 1)
  if (safeRatio === 0) {
    return baseValue
  }

  const jitterAmount = baseValue * safeRatio
  const minValue = baseValue - jitterAmount
  const maxValue = baseValue + jitterAmount

  return minValue + randomFn() * (maxValue - minValue)
}

function calculateExponentialBackoff(baseDelay, attempt, backoffFactor, maxDelayMs) {
  if (attempt <= 0) {
    return baseDelay
  }

  const rawDelay = baseDelay * Math.pow(backoffFactor, attempt)

  if (!isFiniteNumber(rawDelay) || rawDelay <= 0) {
    return baseDelay
  }

  return Math.min(rawDelay, maxDelayMs)
}

function parseRetryAfter(headers) {
  if (!headers) {
    return null
  }

  let headerValue
  if (typeof headers.get === 'function') {
    headerValue = headers.get('retry-after')
  } else if (typeof headers['retry-after'] !== 'undefined') {
    headerValue = headers['retry-after']
  } else if (typeof headers['Retry-After'] !== 'undefined') {
    headerValue = headers['Retry-After']
  }

  if (!headerValue) {
    return null
  }

  const trimmedValue = String(headerValue).trim()

  const seconds = parseInt(trimmedValue, 10)
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  try {
    const date = new Date(trimmedValue)
    if (!isNaN(date.getTime())) {
      const now = Date.now()
      const diff = date.getTime() - now
      return Math.max(0, diff)
    }
  } catch {
    // 继续执行
  }

  return null
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      reject(signal.reason || new DOMException('The operation was aborted.', 'AbortError'))
      return
    }

    let timeoutId
    let abortHandler

    if (signal) {
      abortHandler = () => {
        clearTimeout(timeoutId)
        reject(signal.reason || new DOMException('The operation was aborted.', 'AbortError'))
      }
      signal.addEventListener('abort', abortHandler)
    }

    timeoutId = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      resolve()
    }, ms)
  })
}

function createMonotonicClock() {
  const hasPerformance = typeof performance !== 'undefined' && 
                         typeof performance.now === 'function'

  let lastWallClock = Date.now()
  let baseMonotonic = hasPerformance ? performance.now() : 0

  return {
    now() {
      if (hasPerformance) {
        return performance.now()
      }
      return Date.now()
    },

    checkClockRollback() {
      const currentWallClock = Date.now()
      const rollbackMs = lastWallClock - currentWallClock

      if (rollbackMs > 1000) {
        lastWallClock = currentWallClock
        return {
          detected: true,
          rollbackMs,
        }
      }

      lastWallClock = currentWallClock
      return { detected: false, rollbackMs: 0 }
    },

    toTimestamp(monotonicMs) {
      if (hasPerformance) {
        return Date.now() - (performance.now() - monotonicMs)
      }
      return monotonicMs
    },
  }
}

function getVisibilityState() {
  if (typeof document === 'undefined') {
    return 'visible'
  }
  return document.visibilityState || 'visible'
}

function isVisibilityHidden() {
  return getVisibilityState() === 'hidden'
}

function shouldRetryOnError(error, retryOn) {
  if (retryOn == null) {
    return true
  }

  if (Array.isArray(retryOn)) {
    return retryOn.some((item) => {
      if (typeof item === 'number') {
        return error?.status === item || error?.code === item
      }
      if (typeof item === 'function') {
        return item(error)
      }
      return false
    })
  }

  if (typeof retryOn === 'function') {
    return retryOn(error)
  }

  if (typeof retryOn === 'number') {
    return error?.status === retryOn || error?.code === retryOn
  }

  return false
}

function extractHttpStatus(error) {
  if (error == null) return null
  if (typeof error.status === 'number') return error.status
  if (error.response && typeof error.response.status === 'number') return error.response.status
  return null
}

function validatePollOptions(options) {
  const { intervalMs } = options

  if (!isFiniteNumber(intervalMs) || intervalMs <= 0) {
    return createError(ERROR_CODES.INVALID_INTERVAL, null, { intervalMs })
  }

  return null
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export {
    applyJitter,
    calculateExponentialBackoff, clamp, createMonotonicClock, extractHttpStatus, generateId, getVisibilityState, isFiniteNumber, isVisibilityHidden, parseRetryAfter, shouldRetryOnError, sleep, validatePollOptions
}

