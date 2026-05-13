import { ERROR_CODES, QUERY_ARRAY_FORMATS, DEFAULT_QUERY_ARRAY_FORMAT } from './constants.js'
import { createError } from './errors.js'

function normalizeBaseURL(baseURL) {
  if (!baseURL || typeof baseURL !== 'string') {
    return null
  }

  let normalized = baseURL.trim()

  const protocolMatch = normalized.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)([/\\]*)/)
  if (protocolMatch) {
    const protocol = protocolMatch[1]
    const afterProtocol = normalized.slice(protocolMatch[0].length)
    const normalizedRest = afterProtocol
      .replace(/[/\\]+/g, '/')
      .replace(/^\/+/, '')
    normalized = `${protocol}//${normalizedRest}`
  } else {
    normalized = normalized.replace(/[/\\]+/g, '/')
  }

  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }

  try {
    new URL(normalized)
    return normalized
  } catch {
    return null
  }
}

function joinURL(baseURL, path) {
  const normalizedBase = normalizeBaseURL(baseURL)
  if (!normalizedBase) {
    throw createError(ERROR_CODES.INVALID_BASE_URL, `Invalid baseURL: ${baseURL}`)
  }

  if (!path || typeof path !== 'string') {
    return normalizedBase
  }

  let normalizedPath = path.trim()

  normalizedPath = normalizedPath.replace(/[/\\]+/g, '/')

  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1)
  }

  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1)
  }

  const fullURL = normalizedPath
    ? `${normalizedBase}/${normalizedPath}`
    : normalizedBase

  try {
    new URL(fullURL)
    return fullURL
  } catch {
    throw createError(ERROR_CODES.INVALID_URL, `Invalid URL: ${fullURL}`)
  }
}

function isAbsoluteURL(url) {
  if (!url || typeof url !== 'string') return false
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url.trim())
}

function buildFullURL(baseURL, path, params = null) {
  let url
  if (isAbsoluteURL(path)) {
    url = path
  } else {
    url = joinURL(baseURL, path)
  }

  if (params && Object.keys(params).length > 0) {
    const queryString = serializeQueryParams(params)
    if (queryString) {
      const separator = url.includes('?') ? '&' : '?'
      url = `${url}${separator}${queryString}`
    }
  }

  return url
}

function serializeQueryParamValue(key, value, options = {}) {
  const { arrayFormat = DEFAULT_QUERY_ARRAY_FORMAT } = options
  const parts = []

  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (item === null || item === undefined) return
      const serialized = encodeURIComponent(String(item))
      const encodedKey = encodeURIComponent(key)
      switch (arrayFormat) {
        case QUERY_ARRAY_FORMATS.INDICES:
          parts.push(`${encodedKey}%5B${index}%5D=${serialized}`)
          break
        case QUERY_ARRAY_FORMATS.BRACKETS:
          parts.push(`${encodedKey}%5B%5D=${serialized}`)
          break
        case QUERY_ARRAY_FORMATS.REPEAT:
          parts.push(`${encodedKey}=${serialized}`)
          break
        case QUERY_ARRAY_FORMATS.COMMA:
          if (index === 0) {
            const allItems = value
              .filter((v) => v !== null && v !== undefined)
              .map((v) => encodeURIComponent(String(v)))
              .join('%2C')
            parts.push(`${encodedKey}=${allItems}`)
            return
          }
          break
        default:
          parts.push(`${encodedKey}%5B%5D=${serialized}`)
      }
    })
    return parts
  }

  if (typeof value === 'object' && !(value instanceof Date)) {
    Object.entries(value).forEach(([nestedKey, nestedValue]) => {
      if (nestedValue === null || nestedValue === undefined) return
      const nestedParts = serializeQueryParamValue(
        `${key}[${nestedKey}]`,
        nestedValue,
        options
      )
      parts.push(...nestedParts)
    })
    return parts
  }

  if (value instanceof Date) {
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toISOString())}`)
    return parts
  }

  parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts
}

function serializeQueryParams(params, options = {}) {
  if (!params || typeof params !== 'object') {
    return ''
  }

  const allParts = []

  Object.entries(params).forEach(([key, value]) => {
    const parts = serializeQueryParamValue(key, value, options)
    allParts.push(...parts)
  })

  return allParts.join('&')
}

function parseQueryString(queryString) {
  if (!queryString || typeof queryString !== 'string') {
    return {}
  }

  const cleanString = queryString.startsWith('?') ? queryString.slice(1) : queryString
  if (!cleanString) {
    return {}
  }

  const params = {}
  const pairs = cleanString.split('&')

  pairs.forEach((pair) => {
    if (!pair) return
    const [key, ...valueParts] = pair.split('=')
    if (!key) return

    const decodedKey = decodeURIComponent(key)
    const value = valueParts.length > 0 ? decodeURIComponent(valueParts.join('=')) : ''

    if (decodedKey.includes('[')) {
      setNestedValue(params, decodedKey, value)
    } else {
      if (params[decodedKey] !== undefined) {
        if (!Array.isArray(params[decodedKey])) {
          params[decodedKey] = [params[decodedKey]]
        }
        params[decodedKey].push(value)
      } else {
        params[decodedKey] = value
      }
    }
  })

  return params
}

function setNestedValue(obj, path, value) {
  const keys = []
  let current = ''

  for (let i = 0; i < path.length; i++) {
    const char = path[i]
    if (char === '[') {
      if (current) {
        keys.push(current)
        current = ''
      }
    } else if (char === ']') {
      keys.push(current || '0')
      current = ''
    } else {
      current += char
    }
  }
  if (current) {
    keys.push(current)
  }

  let currentObj = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    const nextKey = keys[i + 1]
    const isArrayIndex = /^\d+$/.test(nextKey) || nextKey === ''

    if (currentObj[key] === undefined) {
      currentObj[key] = isArrayIndex ? [] : {}
    }
    currentObj = currentObj[key]
  }

  const lastKey = keys[keys.length - 1]
  if (lastKey === '' || /^\d+$/.test(lastKey)) {
    if (!Array.isArray(currentObj)) {
      currentObj = []
    }
    if (lastKey === '') {
      currentObj.push(value)
    } else {
      currentObj[parseInt(lastKey, 10)] = value
    }
  } else {
    currentObj[lastKey] = value
  }
}

export {
  normalizeBaseURL,
  joinURL,
  isAbsoluteURL,
  buildFullURL,
  serializeQueryParamValue,
  serializeQueryParams,
  parseQueryString,
}
