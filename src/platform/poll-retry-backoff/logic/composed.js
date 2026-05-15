import { ERROR_CODES } from './constants.js'
import { createAbortError, createError, isAbortError } from './errors.js'
import { poll } from './poll.js'
import { sleep } from './utils.js'

function pollUntilDoneOrTimeout(fn, options = {}) {
  const {
    timeoutMs,
    ...pollOptions
  } = options

  if (timeoutMs && timeoutMs > 0) {
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => {
      timeoutController.abort(createError(ERROR_CODES.TIMEOUT, `Poll 操作超时 (${timeoutMs}ms)`, { timeoutMs }))
    }, timeoutMs)

    const originalSignal = pollOptions.signal
    let combinedAbortHandler = null

    if (originalSignal) {
      if (originalSignal.aborted) {
        clearTimeout(timeoutId)
        return Promise.reject(originalSignal.reason || createAbortError())
      }

      combinedAbortHandler = () => {
        clearTimeout(timeoutId)
        timeoutController.abort(originalSignal.reason)
      }

      originalSignal.addEventListener('abort', combinedAbortHandler)
    }

    const pollPromise = poll(fn, {
      ...pollOptions,
      signal: timeoutController.signal,
    })

    const finalPromise = pollPromise.catch((error) => {
      if (originalSignal && combinedAbortHandler) {
        originalSignal.removeEventListener('abort', combinedAbortHandler)
      }
      clearTimeout(timeoutId)

      if (error && error.errorCode === ERROR_CODES.TIMEOUT) {
        throw error
      }
      throw error
    }).then((result) => {
      if (originalSignal && combinedAbortHandler) {
        originalSignal.removeEventListener('abort', combinedAbortHandler)
      }
      clearTimeout(timeoutId)
      return result
    })

    if (pollPromise.disposable) {
      const originalDispose = pollPromise.disposable.dispose
      finalPromise.disposable = {
        ...pollPromise.disposable,
        dispose: () => {
          clearTimeout(timeoutId)
          if (originalSignal && combinedAbortHandler) {
            originalSignal.removeEventListener('abort', combinedAbortHandler)
          }
          originalDispose()
        },
      }
      finalPromise.cancel = pollPromise.cancel
    }

    return finalPromise
  }

  return poll(fn, pollOptions)
}

function createRetryInterceptor(options = {}) {
  return async function retryInterceptor(config, { retry }) {
    const {
      url,
      init,
      options: requestOptions,
    } = config || {}

    const retryOptions = {
      retries: options.retries || 2,
      delayMs: options.delayMs || 100,
      backoffFactor: options.backoffFactor || 2,
      maxDelayMs: options.maxDelayMs || 10000,
      retryOn: options.retryOn || [408, 429, 500, 502, 503, 504],
      signal: requestOptions?.signal,
      jitterRatio: options.jitterRatio || 0.1,
    }

    if (requestOptions?.skipRetry) {
      return config
    }

    try {
      const result = await retry(async ({ attempt }) => {
        if (attempt === 1) {
          return config
        }

        if (retry) {
          const retryConfig = {
            ...config,
            options: {
              ...(config.options || {}),
              _retryAttempt: attempt,
            },
          }
          return retryConfig
        }

        return config
      }, retryOptions)

      return result.result
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }
      throw error
    }
  }
}

function createMockFetchClient(config = {}) {
  const {
    successRate = 1,
    inject503 = false,
    retryAfterSeconds = 3,
    responseDelayMs = 100,
    pollProgress = () => ({ done: false, value: { progress: 0 } }),
  } = config

  const state = {
    callCount: 0,
    successfulCalls: 0,
    failedCalls: 0,
    history: [],
  }

  function shouldSucceed() {
    return Math.random() < successRate
  }

  async function mockFetch(url, init = {}) {
    state.callCount++
    const callStartTime = Date.now()

    await sleep(responseDelayMs, init.signal)

    let response
    let success

    if (inject503) {
      success = false
      response = {
        status: 503,
        statusText: 'Service Unavailable',
        ok: false,
        headers: {
          get: (name) => {
            if (name.toLowerCase() === 'retry-after') {
              return String(retryAfterSeconds)
            }
            return null
          },
        },
        json: async () => ({ error: 'Service Unavailable' }),
        text: async () => JSON.stringify({ error: 'Service Unavailable' }),
      }
    } else {
      success = shouldSucceed()

      if (success) {
        state.successfulCalls++
        const progressData = pollProgress(state.callCount, state.successfulCalls)

        response = {
          status: 200,
          statusText: 'OK',
          ok: true,
          headers: {
            get: () => null,
          },
          json: async () => ({
            success: true,
            data: progressData.value,
            done: progressData.done,
            callCount: state.callCount,
          }),
          text: async () => JSON.stringify({
            success: true,
            data: progressData.value,
            done: progressData.done,
          }),
        }
      } else {
        state.failedCalls++
        response = {
          status: 500,
          statusText: 'Internal Server Error',
          ok: false,
          headers: {
            get: () => null,
          },
          json: async () => ({ error: 'Internal Server Error' }),
          text: async () => JSON.stringify({ error: 'Internal Server Error' }),
        }
      }
    }

    const historyEntry = {
      callCount: state.callCount,
      url,
      method: init.method || 'GET',
      startTime: callStartTime,
      endTime: Date.now(),
      duration: Date.now() - callStartTime,
      success,
      status: response.status,
      statusText: response.statusText,
    }

    state.history.push(historyEntry)

    return response
  }

  function getState() {
    return {
      ...state,
      history: [...state.history],
    }
  }

  function reset() {
    state.callCount = 0
    state.successfulCalls = 0
    state.failedCalls = 0
    state.history = []
  }

  function setConfig(newConfig) {
    Object.assign(state, {}, newConfig)
  }

  return {
    fetch: mockFetch,
    getState,
    reset,
    setConfig,
    state,
  }
}

export {
    createMockFetchClient, createRetryInterceptor, pollUntilDoneOrTimeout
}

