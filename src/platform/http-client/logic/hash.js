import { SENSITIVE_HEADER_NAMES } from './constants.js'

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

async function sha256Hash(str) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return simpleHash(str)
}

function hashBody(body) {
  if (body == null) {
    return 'null'
  }

  if (typeof body === 'string') {
    return simpleHash(body)
  }

  if (body instanceof FormData) {
    const entries = []
    for (const [key, value] of body.entries()) {
      if (value instanceof Blob) {
        entries.push(`${key}:blob:${value.size}:${value.type}`)
      } else {
        entries.push(`${key}:${String(value)}`)
      }
    }
    return simpleHash(entries.sort().join('|'))
  }

  if (body instanceof Blob) {
    return `blob:${body.size}:${body.type}`
  }

  if (body instanceof URLSearchParams) {
    return simpleHash(body.toString())
  }

  if (body instanceof ArrayBuffer) {
    const view = new Uint8Array(body)
    let str = ''
    for (let i = 0; i < Math.min(view.length, 1000); i++) {
      str += String.fromCharCode(view[i])
    }
    return simpleHash(str + `:len=${body.byteLength}`)
  }

  try {
    return simpleHash(JSON.stringify(body))
  } catch {
    return 'unhashable'
  }
}

function hashHeaders(headers) {
  if (!headers) {
    return ''
  }

  const normalized = []
  const headerObj = headersToObject(headers)

  Object.entries(headerObj).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_HEADER_NAMES.has(lowerKey)) {
      normalized.push(`${lowerKey}:${typeof value}`)
    } else {
      normalized.push(`${lowerKey}:${String(value)}`)
    }
  })

  return simpleHash(normalized.sort().join('|'))
}

function headersToObject(headers) {
  const result = {}

  if (!headers) {
    return result
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value
    })
  } else if (typeof headers.forEach === 'function') {
    headers.forEach((value, key) => {
      result[key] = value
    })
  } else if (typeof headers === 'object') {
    return { ...headers }
  }

  return result
}

function summarizeRequest(request) {
  if (!request) {
    return null
  }

  const headers = headersToObject(request.headers)
  const summarizedHeaders = {}

  Object.entries(headers).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_HEADER_NAMES.has(lowerKey)) {
      summarizedHeaders[key] = {
        length: value ? String(value).length : 0,
        hash: value ? simpleHash(String(value)) : null,
        masked: true,
      }
    } else {
      summarizedHeaders[key] = {
        value: value,
        length: value ? String(value).length : 0,
      }
    }
  })

  return {
    method: request.method,
    url: request.url,
    headers: summarizedHeaders,
    hasBody: request.body != null,
    bodyType: request.body ? getBodyType(request.body) : null,
  }
}

function summarizeResponse(response) {
  if (!response) {
    return null
  }

  const headers = headersToObject(response.headers)
  const summarizedHeaders = {}

  Object.entries(headers).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_HEADER_NAMES.has(lowerKey)) {
      summarizedHeaders[key] = {
        length: value ? String(value).length : 0,
        hash: value ? simpleHash(String(value)) : null,
        masked: true,
      }
    } else {
      summarizedHeaders[key] = {
        value: value,
        length: value ? String(value).length : 0,
      }
    }
  })

  return {
    status: response.status,
    statusText: response.statusText,
    headers: summarizedHeaders,
    ok: response.ok,
    redirected: response.redirected,
    type: response.type,
    bodyUsed: response.bodyUsed,
    isReadableStream: response.body instanceof ReadableStream,
  }
}

function getBodyType(body) {
  if (body == null) return null
  if (typeof body === 'string') return 'string'
  if (body instanceof FormData) return 'FormData'
  if (body instanceof Blob) return 'Blob'
  if (body instanceof URLSearchParams) return 'URLSearchParams'
  if (body instanceof ArrayBuffer) return 'ArrayBuffer'
  if (body instanceof ReadableStream) return 'ReadableStream'
  return typeof body
}

function buildRequestSignature(method, url, body, options = {}) {
  const { includeHeaders = false, headers = null } = options

  const parts = [
    method?.toUpperCase() || 'GET',
    url || '',
    hashBody(body),
  ]

  if (includeHeaders && headers) {
    parts.push(hashHeaders(headers))
  }

  return parts.join('|')
}

export {
  simpleHash,
  sha256Hash,
  hashBody,
  hashHeaders,
  headersToObject,
  summarizeRequest,
  summarizeResponse,
  getBodyType,
  buildRequestSignature,
}
