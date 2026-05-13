import {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_HEADERS,
  BODY_METHODS,
  ERROR_CODES,
} from './constants.js'
import {
  buildFullURL,
  isAbsoluteURL,
  normalizeBaseURL,
} from './url.js'
import {
  createError,
  wrapError,
  isHttpClientError,
} from './errors.js'
import {
  createInterceptorManager,
  runRequestInterceptors,
  runResponseInterceptors,
} from './interceptors.js'
import {
  createTimeoutSignal,
  combineSignals,
  classifyAbortError,
} from './cancel.js'
import { createDedupeManager } from './dedupe.js'
import { headersToObject } from './hash.js'

class HttpClient {
  constructor(options = {}) {
    const {
      baseURL,
      headers = {},
      timeout = DEFAULT_TIMEOUT_MS,
      environments = {},
      currentEnvironment = null,
      fetchImpl = null,
      deduplicate = false,
      dedupeOptions = {},
      validateStatus = null,
    } = options

    this._baseURL = normalizeBaseURL(baseURL) || null
    this._headers = { ...DEFAULT_HEADERS, ...headers }
    this._timeout = timeout
    this._environments = { ...environments }
    this._currentEnvironment = currentEnvironment
    this._fetchImpl = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null)
    this._validateStatus = validateStatus || ((status) => status >= 200 && status < 300)

    this._interceptorManager = createInterceptorManager()
    this._dedupeManager = createDedupeManager(dedupeOptions)
    this._deduplicate = deduplicate

    if (currentEnvironment && this._environments[currentEnvironment]) {
      const env = this._environments[currentEnvironment]
      if (env.baseURL) {
        this._baseURL = normalizeBaseURL(env.baseURL) || this._baseURL
      }
      if (env.headers) {
        this._headers = { ...this._headers, ...env.headers }
      }
    }
  }

  get baseURL() {
    return this._baseURL
  }

  set baseURL(value) {
    const normalized = normalizeBaseURL(value)
    if (!normalized) {
      throw createError(ERROR_CODES.INVALID_BASE_URL, `Invalid baseURL: ${value}`)
    }
    this._baseURL = normalized
  }

  get currentEnvironment() {
    return this._currentEnvironment
  }

  setEnvironment(envName) {
    if (!envName || !this._environments[envName]) {
      throw createError(ERROR_CODES.INVALID_BASE_URL, `Unknown environment: ${envName}`)
    }

    const env = this._environments[envName]
    this._currentEnvironment = envName

    if (env.baseURL) {
      const normalized = normalizeBaseURL(env.baseURL)
      if (normalized) {
        this._baseURL = normalized
      }
    }

    if (env.headers) {
      this._headers = { ...DEFAULT_HEADERS, ...env.headers }
    }

    return this
  }

  addEnvironment(name, config) {
    if (!name || !config) {
      throw createError(ERROR_CODES.INVALID_BASE_URL, 'Invalid environment config')
    }
    this._environments[name] = { ...config }
    return this
  }

  getEnvironment(name) {
    return name ? this._environments[name] : null
  }

  listEnvironments() {
    return Object.keys(this._environments)
  }

  useRequest(onFulfilled, onRejected) {
    return this._interceptorManager.useRequest(onFulfilled, onRejected)
  }

  useResponse(onFulfilled, onRejected) {
    return this._interceptorManager.useResponse(onFulfilled, onRejected)
  }

  clearInterceptors() {
    this._interceptorManager.clearAll()
  }

  setDefaultHeader(name, value) {
    if (value === undefined || value === null) {
      delete this._headers[name]
    } else {
      this._headers[name] = value
    }
    return this
  }

  getDefaultHeaders() {
    return { ...this._headers }
  }

  async request(method, urlOrPath, options = {}) {
    const {
      params = null,
      data = null,
      headers = {},
      timeout,
      signal = null,
      continueOnTimeout = false,
      deduplicate = this._deduplicate,
      dedupeOptions = {},
      responseType = 'json',
      ...restOptions
    } = options

    const actualTimeout = timeout != null ? timeout : this._timeout

    let fullURL
    let requestInit = {
      method: method.toUpperCase(),
      ...restOptions,
    }

    let body = null
    const upperMethod = method.toUpperCase()

    if (data !== null && data !== undefined && BODY_METHODS.has(upperMethod)) {
      const { processedBody, contentType } = this._processRequestBody(data, headers)
      body = processedBody
      requestInit.body = processedBody

      if (contentType) {
        const hasContentTypeHeader = Object.keys(headers).some(
          (k) => k.toLowerCase() === 'content-type'
        )
        if (!hasContentTypeHeader) {
          requestInit.headers = {
            ...(requestInit.headers || {}),
            'Content-Type': contentType,
          }
        }
      }
    }

    const mergedHeaders = {
      ...this._headers,
      ...(requestInit.headers || {}),
      ...headers,
    }
    requestInit.headers = mergedHeaders

    try {
      if (isAbsoluteURL(urlOrPath)) {
        fullURL = urlOrPath
      } else if (this._baseURL) {
        fullURL = buildFullURL(this._baseURL, urlOrPath, params)
      } else {
        throw createError(ERROR_CODES.INVALID_BASE_URL, 'No baseURL configured and path is not absolute')
      }
    } catch (error) {
      if (isHttpClientError(error)) {
        throw error
      }
      throw wrapError(error, ERROR_CODES.INVALID_URL)
    }

    const requestConfig = {
      url: fullURL,
      init: requestInit,
      options: {
        params,
        data,
        headers,
        timeout: actualTimeout,
        responseType,
        method: upperMethod,
      },
      method: upperMethod,
    }

    const requestInterceptors = this._interceptorManager.getRequestInterceptors()
    const interceptResult = await runRequestInterceptors(requestInterceptors, requestConfig)

    if (interceptResult.handled) {
      return interceptResult.result
    }

    const finalConfig = interceptResult.result
    const finalURL = finalConfig.url
    const finalInit = finalConfig.init || {}

    const fetcher = async () => {
      return this._executeRequest(
        finalURL,
        finalInit,
        {
          signal,
          timeout: actualTimeout,
          continueOnTimeout,
          responseType,
          originalConfig: requestConfig,
        }
      )
    }

    return this._dedupeManager.dedupe(
      upperMethod,
      finalURL,
      body,
      fetcher,
      {
        enabled: deduplicate,
        ...dedupeOptions,
      }
    )
  }

  async _executeRequest(url, init, options) {
    const {
      signal: userSignal,
      timeout: timeoutMs,
      responseType,
      originalConfig,
    } = options

    const timeoutSignal = timeoutMs > 0 ? createTimeoutSignal(timeoutMs) : null
    let combined = null

    try {
      if (userSignal || timeoutSignal) {
        combined = combineSignals(
          userSignal,
          timeoutSignal ? timeoutSignal.signal : null
        )
        init = { ...init, signal: combined.signal }
      }

      const fetchImpl = this._fetchImpl
      if (!fetchImpl) {
        throw createError(ERROR_CODES.NETWORK, 'No fetch implementation available')
      }

      const startTime = Date.now()
      let response

      try {
        response = await fetchImpl(url, init)
      } catch (fetchError) {
        if (timeoutSignal) {
          timeoutSignal.clear()
        }
        if (combined) {
          combined.cleanup()
        }

        const abortCode = classifyAbortError(fetchError)
        if (abortCode) {
          throw createError(abortCode, fetchError.message)
        }

        const errorMsg = (fetchError?.message || '').toLowerCase()
        if (errorMsg.includes('cors') || errorMsg.includes('cross-origin') || errorMsg.includes('preflight')) {
          throw createError(ERROR_CODES.CORS_PREFLIGHT_FAILED, fetchError.message)
        }

        throw wrapError(fetchError, ERROR_CODES.NETWORK)
      }

      if (timeoutSignal) {
        timeoutSignal.clear()
      }
      if (combined) {
        combined.cleanup()
      }

      const durationMs = Date.now() - startTime

      const responseData = {
        response,
        originalResponse: response,
        status: response.status,
        statusText: response.statusText,
        headers: headersToObject(response.headers),
        ok: response.ok,
        durationMs,
        url: response.url,
        redirected: response.redirected,
      }

      const responseInterceptors = this._interceptorManager.getResponseInterceptors()
      const retryFn = (retryOptions = {}) => {
        return this.request(
          originalConfig.method,
          originalConfig.url,
          {
            ...originalConfig.options,
            ...retryOptions,
          }
        )
      }

      const interceptResult = await runResponseInterceptors(
        responseInterceptors,
        responseData,
        retryFn
      )

      if (interceptResult.shortCircuit) {
        return interceptResult.result
      }

      if (interceptResult.retry) {
        return retryFn(interceptResult.options)
      }

      const finalResponseData = interceptResult.result

      if (!this._validateStatus(finalResponseData.status)) {
        const httpError = createError(
          ERROR_CODES.HTTP_ERROR,
          `HTTP ${finalResponseData.status}: ${finalResponseData.statusText}`,
          { status: finalResponseData.status }
        )
        httpError.response = finalResponseData
        throw httpError
      }

      const data = await this._parseResponse(response, responseType)

      return {
        ...finalResponseData,
        data,
      }
    } catch (error) {
      if (timeoutSignal) {
        timeoutSignal.clear()
      }
      if (combined) {
        combined.cleanup()
      }

      if (isHttpClientError(error)) {
        throw error
      }

      throw wrapError(error, ERROR_CODES.UNKNOWN)
    }
  }

  _processRequestBody(data) {
    if (data instanceof FormData) {
      return { processedBody: data, contentType: null }
    }

    if (data instanceof Blob) {
      return { processedBody: data, contentType: data.type || null }
    }

    if (data instanceof URLSearchParams) {
      return { processedBody: data, contentType: 'application/x-www-form-urlencoded;charset=utf-8' }
    }

    if (data instanceof ArrayBuffer) {
      return { processedBody: data, contentType: null }
    }

    if (data instanceof ReadableStream) {
      return { processedBody: data, contentType: null }
    }

    if (typeof data === 'object') {
      return {
        processedBody: JSON.stringify(data),
        contentType: 'application/json;charset=utf-8',
      }
    }

    return { processedBody: String(data), contentType: null }
  }

  async _parseResponse(response, responseType) {
    if (!response) {
      return null
    }

    switch (responseType) {
      case 'json':
        try {
          return await response.json()
        } catch {
          return null
        }
      case 'text':
        return await response.text()
      case 'blob':
        return await response.blob()
      case 'arrayBuffer':
        return await response.arrayBuffer()
      case 'formData':
        return await response.formData()
      case 'stream':
        return response.body
      default:
        try {
          return await response.json()
        } catch {
          return await response.text()
        }
    }
  }

  get(url, options = {}) {
    return this.request('GET', url, options)
  }

  post(url, data, options = {}) {
    return this.request('POST', url, { ...options, data })
  }

  put(url, data, options = {}) {
    return this.request('PUT', url, { ...options, data })
  }

  patch(url, data, options = {}) {
    return this.request('PATCH', url, { ...options, data })
  }

  delete(url, options = {}) {
    return this.request('DELETE', url, options)
  }

  head(url, options = {}) {
    return this.request('HEAD', url, options)
  }

  options(url, options = {}) {
    return this.request('OPTIONS', url, options)
  }

  static create(options = {}) {
    return new HttpClient(options)
  }
}

function createHttpClient(options = {}) {
  return new HttpClient(options)
}

export {
  HttpClient,
  createHttpClient,
}
