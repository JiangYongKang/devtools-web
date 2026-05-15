import {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_API_PATH,
  ERROR_CODES,
  SOURCES,
} from './constants.js'
import { createError, wrapError } from './errors.js'

function hasFetch() {
  return typeof fetch === 'function'
}

function mapHttpStatusToErrorCode(status) {
  if (status >= 400 && status < 500) {
    switch (status) {
      case 401:
        return ERROR_CODES.HTTP_ERROR
      case 403:
        return ERROR_CODES.HTTP_ERROR
      case 404:
        return ERROR_CODES.HTTP_ERROR
      default:
        return ERROR_CODES.HTTP_ERROR
    }
  }
  if (status >= 500) {
    return ERROR_CODES.HTTP_ERROR
  }
  return null
}

async function fetchWithTimeout(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    abortController,
    ...fetchOptions
  } = options

  const controller = abortController || new AbortController()
  const signal = controller.signal

  let timeoutId = null
  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      controller.abort()
    }, timeout)
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal,
    })

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    return response
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    if (error.name === 'AbortError') {
      if (abortController?.signal.aborted) {
        throw createError(ERROR_CODES.ABORTED, 'Request was aborted by user', { url })
      }
      throw createError(ERROR_CODES.TIMEOUT, `Request timed out after ${timeout}ms`, {
        url,
        timeout,
      })
    }

    throw wrapError(error, ERROR_CODES.NETWORK, { url })
  }
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null
  }

  if (response.status === 304) {
    return null
  }

  const text = await response.text()

  if (!text || text.trim() === '') {
    return null
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    throw createError(ERROR_CODES.INVALID_JSON, 'Failed to parse JSON response', {
      status: response.status,
      responseText: text.slice(0, 200),
    })
  }
}

function validateRemoteConfig(data) {
  if (!data) {
    return { valid: false, error: null }
  }

  if (typeof data !== 'object') {
    return {
      valid: false,
      error: createError(ERROR_CODES.INVALID_CONFIG, 'Config must be an object'),
    }
  }

  return { valid: true }
}

async function fetchRemoteConfig(options = {}) {
  const {
    baseURL,
    apiPath = DEFAULT_API_PATH,
    timeout = DEFAULT_TIMEOUT_MS,
    etag,
    abortController,
    headers = {},
  } = options

  if (!hasFetch()) {
    throw createError(ERROR_CODES.SSR_NO_FETCH, 'fetch is not available in this environment')
  }

  const url = baseURL ? new URL(apiPath, baseURL).toString() : apiPath

  const requestHeaders = {
    'Accept': 'application/json',
    ...headers,
  }

  if (etag) {
    requestHeaders['If-None-Match'] = etag
  }

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: requestHeaders,
    timeout,
    abortController,
  })

  if (response.status === 304) {
    return {
      notModified: true,
      etag: response.headers.get('ETag'),
    }
  }

  if (!response.ok) {
    const errorCode = mapHttpStatusToErrorCode(response.status)
    throw createError(errorCode || ERROR_CODES.HTTP_ERROR, `HTTP ${response.status}`, {
      status: response.status,
      statusText: response.statusText,
      url,
    })
  }

  const data = await parseResponse(response)

  if (data === null) {
    return {
      data: null,
      etag: response.headers.get('ETag'),
      isEmpty: true,
    }
  }

  const validation = validateRemoteConfig(data)
  if (!validation.valid && validation.error) {
    throw validation.error
  }

  return {
    data: {
      ...data,
      source: SOURCES.REMOTE,
    },
    etag: response.headers.get('ETag'),
    isEmpty: false,
  }
}

export {
  hasFetch,
  mapHttpStatusToErrorCode,
  fetchWithTimeout,
  parseResponse,
  validateRemoteConfig,
  fetchRemoteConfig,
}
