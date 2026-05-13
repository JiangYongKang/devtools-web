import {
  normalizeBaseURL,
  joinURL,
  isAbsoluteURL,
  buildFullURL,
  serializeQueryParams,
  parseQueryString,
} from './url.js'
import { ERROR_CODES, DEFAULT_TIMEOUT_MS, QUERY_ARRAY_FORMATS } from './constants.js'
import { createError } from './errors.js'

function buildSSRRequestOptions(method, urlOrPath, options = {}, clientConfig = {}) {
  const {
    params = null,
    data = null,
    headers = {},
    timeout = clientConfig.timeout || DEFAULT_TIMEOUT_MS,
  } = options

  const baseURL = clientConfig.baseURL || null
  const defaultHeaders = clientConfig.headers || {}

  let fullURL
  if (isAbsoluteURL(urlOrPath)) {
    fullURL = urlOrPath
  } else if (baseURL) {
    fullURL = buildFullURL(baseURL, urlOrPath, params)
  } else {
    throw createError(ERROR_CODES.INVALID_BASE_URL, 'No baseURL configured and path is not absolute')
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...headers,
  }

  let body = null
  let contentType = null

  if (data !== null && data !== undefined) {
    if (data instanceof FormData || data instanceof Blob) {
      body = data
    } else if (data instanceof URLSearchParams) {
      body = data
      contentType = 'application/x-www-form-urlencoded;charset=utf-8'
    } else if (data instanceof ArrayBuffer) {
      body = data
    } else if (typeof data === 'object') {
      body = JSON.stringify(data)
      contentType = 'application/json;charset=utf-8'
    } else {
      body = String(data)
    }
  }

  if (contentType && !Object.keys(mergedHeaders).some((k) => k.toLowerCase() === 'content-type')) {
    mergedHeaders['Content-Type'] = contentType
  }

  return {
    method: method.toUpperCase(),
    url: fullURL,
    headers: mergedHeaders,
    body,
    timeout,
  }
}

function serializeForSSR(clientConfig = {}) {
  return {
    baseURL: clientConfig.baseURL,
    headers: clientConfig.headers ? { ...clientConfig.headers } : {},
    timeout: clientConfig.timeout || DEFAULT_TIMEOUT_MS,
    environments: clientConfig.environments ? { ...clientConfig.environments } : {},
    currentEnvironment: clientConfig.currentEnvironment,
  }
}

export {
  normalizeBaseURL,
  joinURL,
  isAbsoluteURL,
  buildFullURL,
  serializeQueryParams,
  parseQueryString,
  buildSSRRequestOptions,
  serializeForSSR,
  ERROR_CODES,
  DEFAULT_TIMEOUT_MS,
  QUERY_ARRAY_FORMATS,
}
