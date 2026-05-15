
import {
  DEFAULT_PROBE_OPTIONS,
  MAX_CONCURRENT_PROBES,
  ERROR_TYPES,
  SPARKLINE_SAMPLE_SIZE,
} from './constants.js'
import {
  createError,
  ERROR_CODES,
  classifyError,
  wrapError,
} from './errors.js'
import { createRingBuffer } from './ringBuffer.js'
import { createCircuitBreaker } from './circuitBreaker.js'

export async function executeProbe(target, options = {}) {
  const config = {
    ...DEFAULT_PROBE_OPTIONS,
    ...target,
    ...options,
  }

  const result = {
    id: target.id,
    targetUrl: target.url,
    timestamp: Date.now(),
    success: false,
    statusCode: null,
    ttfbMs: null,
    totalMs: null,
    errorType: null,
    errorMessage: null,
    headers: {},
  }

  const startTime = performance.now()
  let ttfbTime = null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, config.timeoutMs)

  try {
    const response = await fetch(target.url, {
      method: config.method,
      signal: controller.signal,
      mode: 'cors',
      credentials: config.insecureDevOk ? 'include' : 'omit',
      cache: 'no-store',
      redirect: 'follow',
    })

    ttfbTime = performance.now()
    result.ttfbMs = Math.round(ttfbTime - startTime)
    result.statusCode = response.status

    const serverTiming = response.headers.get('server-timing')
    if (serverTiming) {
      result.headers['server-timing'] = serverTiming
    }

    const contentType = response.headers.get('content-type')
    if (contentType) {
      result.headers['content-type'] = contentType
    }

    const isExpectedStatus = config.expectedStatus.includes(response.status)
    result.success = isExpectedStatus

    if (!isExpectedStatus) {
      result.errorType = ERROR_TYPES.HTTP
      result.errorMessage = `Unexpected status code: ${response.status}`
    }
  } catch (error) {
    const errorType = classifyError(error)
    result.errorType = errorType

    if (errorType === ERROR_TYPES.ABORT) {
      result.errorMessage = 'Request timed out'
      result.errorType = ERROR_TYPES.TIMEOUT
    } else if (errorType === ERROR_TYPES.CORS) {
      result.errorMessage = 'CORS policy prevented the request'
    } else if (errorType === ERROR_TYPES.NETWORK) {
      result.errorMessage = 'Network connection failed'
    } else {
      result.errorMessage = error.message || 'Unknown error'
    }
  } finally {
    clearTimeout(timeoutId)
    result.totalMs = Math.round(performance.now() - startTime)

    if (result.ttfbMs === null && result.success) {
      result.ttfbMs = result.totalMs
    }
  }

  return result
}

export function createParallelProbeExecutor(maxConcurrent = MAX_CONCURRENT_PROBES) {
  let activeCount = 0
  const queue = []
  const results = new Map()

  async function processQueue() {
    while (queue.length > 0 && activeCount < maxConcurrent) {
      const task = queue.shift()
      activeCount++

      try {
        const result = await executeProbe(task.target, task.options)
        results.set(task.target.id, result)
        task.resolve(result)
      } catch (error) {
        task.reject(error)
      } finally {
        activeCount--
        processQueue()
      }
    }
  }

  return {
    async execute(targets, options = {}) {
      const promises = targets.map((target) => {
        return new Promise((resolve, reject) => {
          queue.push({ target, options, resolve, reject })
        })
      })

      processQueue()

      return Promise.all(promises)
    },

    getActiveCount() {
      return activeCount
    },

    getQueueSize() {
      return queue.length
    },

    getResults(targetId) {
      return results.get(targetId)
    },

    clearResults() {
      results.clear()
    },
  }
}

export function createProbeExecutor(target, circuitOptions = {}) {
  const circuitBreaker = createCircuitBreaker(circuitOptions)
  const latencyBuffer = createRingBuffer(SPARKLINE_SAMPLE_SIZE)
  const resultBuffer = createRingBuffer(SPARKLINE_SAMPLE_SIZE)
  let lastResult = null
  let currentPromise = null

  return {
    probe(options = {}) {
      if (currentPromise) {
        return currentPromise
      }

      currentPromise = (async () => {
        try {
          let result

          if (!circuitBreaker.canExecute()) {
            lastResult = {
              id: target.id,
              targetUrl: target.url,
              timestamp: Date.now(),
              success: false,
              statusCode: null,
              ttfbMs: null,
              totalMs: null,
              errorType: ERROR_TYPES.HTTP,
              errorMessage: 'Circuit breaker is open - probe skipped',
              headers: {},
              circuitOpen: true,
            }
            resultBuffer.push(lastResult)
            return lastResult
          }

          try {
            result = await executeProbe(target, options)
          } catch (error) {
            circuitBreaker.onFailure(error)
            throw error
          }

          if (result.success) {
            circuitBreaker.onSuccess()
          } else {
            circuitBreaker.onFailure(new Error(result.errorMessage || 'Probe failed'))
          }

          lastResult = result

          if (result.success && result.totalMs !== undefined && result.totalMs !== null) {
            latencyBuffer.push(result.totalMs)
          }
          resultBuffer.push(result)

          return result
        } finally {
          currentPromise = null
        }
      })()

      return currentPromise
    },

    getLastResult() {
      return lastResult
    },

    getLatencyHistory() {
      return latencyBuffer.toArray()
    },

    getResultHistory() {
      return resultBuffer.toArray()
    },

    getCircuitStatus() {
      return circuitBreaker.getStatus()
    },

    isProbing() {
      return currentPromise !== null
    },

    reset() {
      circuitBreaker.reset()
      latencyBuffer.clear()
      resultBuffer.clear()
      lastResult = null
    },

    subscribeToCircuitChanges(listener) {
      return circuitBreaker.subscribe(listener)
    },
  }
}
