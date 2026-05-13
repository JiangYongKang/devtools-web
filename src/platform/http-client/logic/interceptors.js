import { ERROR_CODES } from './constants.js'
import { wrapError } from './errors.js'

const INTERCEPTOR_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
}

function createInterceptorManager() {
  const requestInterceptors = []
  const responseInterceptors = []
  let idCounter = 0

  function useRequest(onFulfilled, onRejected) {
    const id = ++idCounter
    requestInterceptors.push({
      id,
      type: INTERCEPTOR_TYPES.REQUEST,
      onFulfilled,
      onRejected,
    })
    return function unregister() {
      const index = requestInterceptors.findIndex((i) => i.id === id)
      if (index !== -1) {
        requestInterceptors.splice(index, 1)
        return true
      }
      return false
    }
  }

  function useResponse(onFulfilled, onRejected) {
    const id = ++idCounter
    responseInterceptors.push({
      id,
      type: INTERCEPTOR_TYPES.RESPONSE,
      onFulfilled,
      onRejected,
    })
    return function unregister() {
      const index = responseInterceptors.findIndex((i) => i.id === id)
      if (index !== -1) {
        responseInterceptors.splice(index, 1)
        return true
      }
      return false
    }
  }

  function clearAll() {
    requestInterceptors.length = 0
    responseInterceptors.length = 0
  }

  function clearRequest() {
    requestInterceptors.length = 0
  }

  function clearResponse() {
    responseInterceptors.length = 0
  }

  function getRequestInterceptors() {
    return [...requestInterceptors]
  }

  function getResponseInterceptors() {
    return [...responseInterceptors]
  }

  return {
    useRequest,
    useResponse,
    clearAll,
    clearRequest,
    clearResponse,
    getRequestInterceptors,
    getResponseInterceptors,
    _interceptors: {
      request: requestInterceptors,
      response: responseInterceptors,
    },
  }
}

async function runRequestInterceptors(interceptors, requestData) {
  let current = { ...requestData }

  for (const interceptor of interceptors) {
    try {
      const result = interceptor.onFulfilled
        ? await interceptor.onFulfilled(current)
        : current

      if (result === null || result === undefined) {
        continue
      }

      if (typeof result === 'object') {
        if (result.url !== undefined) {
          current.url = result.url
        }
        if (result.init !== undefined) {
          current.init = result.init
        }
        if (result.options !== undefined) {
          current.options = result.options
        }
        current = { ...current, ...result }
      }
    } catch (error) {
      if (interceptor.onRejected) {
        try {
          const handled = await interceptor.onRejected(error)
          if (handled !== undefined) {
            return { handled: true, result: handled }
          }
        } catch (handledError) {
          throw wrapError(
            handledError,
            ERROR_CODES.INTERCEPTOR_REJECTED,
            { phase: 'request', interceptorId: interceptor.id }
          )
        }
      }
      throw wrapError(
        error,
        ERROR_CODES.INTERCEPTOR_REJECTED,
        { phase: 'request', interceptorId: interceptor.id }
      )
    }
  }

  return { handled: false, result: current }
}

async function runResponseInterceptors(interceptors, responseData, retryFn) {
  let current = { ...responseData }

  for (const interceptor of interceptors) {
    try {
      const result = interceptor.onFulfilled
        ? await interceptor.onFulfilled(current, { retry: retryFn })
        : current

      if (result === null || result === undefined) {
        continue
      }

      if (result.__shortCircuit) {
        return { shortCircuit: true, result: result.value }
      }

      if (result.__retry) {
        return { retry: true, options: result.options }
      }

      current = { ...current, ...result }
    } catch (error) {
      if (interceptor.onRejected) {
        try {
          const handled = await interceptor.onRejected(error, { retry: retryFn })
          if (handled && handled.__shortCircuit) {
            return { shortCircuit: true, result: handled.value }
          }
          if (handled && handled.__retry) {
            return { retry: true, options: handled.options }
          }
          if (handled !== undefined) {
            return { handled: true, result: handled }
          }
        } catch (handledError) {
          if (handledError && handledError.errorCode) {
            throw handledError
          }
          throw wrapError(
            handledError,
            ERROR_CODES.INTERCEPTOR_REJECTED,
            { phase: 'response', interceptorId: interceptor.id }
          )
        }
      }

      if (error && error.errorCode) {
        throw error
      }

      throw wrapError(
        error,
        ERROR_CODES.INTERCEPTOR_REJECTED,
        { phase: 'response', interceptorId: interceptor.id }
      )
    }
  }

  return { handled: false, result: current }
}

function shortCircuit(value) {
  return { __shortCircuit: true, value }
}

function retryRequest(options = {}) {
  return { __retry: true, options }
}

function createRequestIdInterceptor() {
  return function requestIdInterceptor(config) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const newInit = { ...(config.init || {}) }
    newInit.headers = {
      ...(newInit.headers || {}),
      'X-Request-Id': requestId,
    }
    return {
      ...config,
      init: newInit,
      requestId,
    }
  }
}

function createHeaderInterceptor(headers) {
  return function headerInterceptor(config) {
    const newInit = { ...(config.init || {}) }
    newInit.headers = {
      ...(newInit.headers || {}),
      ...headers,
    }
    return { ...config, init: newInit }
  }
}

function createAuthInterceptor(getToken, headerName = 'Authorization', scheme = 'Bearer') {
  return function authInterceptor(config) {
    const token = typeof getToken === 'function' ? getToken(config) : getToken
    if (token) {
      const newInit = { ...(config.init || {}) }
      newInit.headers = {
        ...(newInit.headers || {}),
        [headerName]: scheme ? `${scheme} ${token}` : token,
      }
      return { ...config, init: newInit }
    }
    return config
  }
}

function createErrorInterceptor(transformError) {
  return function errorInterceptor(error) {
    const transformed = transformError ? transformError(error) : error
    throw transformed || error
  }
}

export {
  INTERCEPTOR_TYPES,
  createInterceptorManager,
  runRequestInterceptors,
  runResponseInterceptors,
  shortCircuit,
  retryRequest,
  createRequestIdInterceptor,
  createHeaderInterceptor,
  createAuthInterceptor,
  createErrorInterceptor,
}
