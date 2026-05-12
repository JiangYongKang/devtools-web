import { EVENT_ERROR_CODES, CONTENT_TYPES } from './constants.js'
import { createError } from './errors.js'

function parseHttpRequest(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
    return {
      error: createError(EVENT_ERROR_CODES.EMPTY_BODY),
    }
  }

  const trimmed = rawText.trim()

  const requestLineMatch = trimmed.match(/^([A-Z]+)\s+(\S+)\s+(HTTP\/\d+\.\d+)/)

  if (!requestLineMatch) {
    return parseBodyOnly(trimmed)
  }

  const method = requestLineMatch[1]
  const path = requestLineMatch[2]
  const httpVersion = requestLineMatch[3]

  const afterRequestLine = trimmed.slice(requestLineMatch[0].length).trimStart()

  const headerBodySplit = afterRequestLine.split(/\r?\n\r?\n/)
  const rawHeaders = headerBodySplit[0]
  const rawBody = headerBodySplit.slice(1).join('\n\n')

  const headers = parseHeaders(rawHeaders)
  const contentType = headers['content-type'] || CONTENT_TYPES.TEXT_PLAIN

  return {
    method,
    path,
    httpVersion,
    headers,
    rawBody,
    contentType,
    error: null,
  }
}

function parseBodyOnly(rawBody) {
  const trimmed = rawBody.trim()

  let detectedContentType = CONTENT_TYPES.TEXT_PLAIN

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    detectedContentType = CONTENT_TYPES.JSON
  } else if (trimmed.match(/^[a-zA-Z0-9_%]+=[^&]+(&[a-zA-Z0-9_%]+=[^&]*)*$/)) {
    detectedContentType = CONTENT_TYPES.FORM_URLENCODED
  }

  return {
    method: 'POST',
    path: '/webhook',
    httpVersion: 'HTTP/1.1',
    headers: {
      'content-type': detectedContentType,
    },
    rawBody: trimmed,
    contentType: detectedContentType,
    error: null,
  }
}

function parseHeaders(rawHeaders) {
  const headers = {}
  const lines = rawHeaders.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const name = trimmed.slice(0, colonIndex).trim().toLowerCase()
    const value = trimmed.slice(colonIndex + 1).trim()

    if (headers[name]) {
      headers[name] = `${headers[name]}, ${value}`
    } else {
      headers[name] = value
    }
  }

  return headers
}

function detectContentTypeFromHeaders(headers) {
  const contentType = headers['content-type'] || ''
  const lower = contentType.toLowerCase()

  if (lower.includes('application/json')) {
    return CONTENT_TYPES.JSON
  }
  if (lower.includes('application/x-www-form-urlencoded')) {
    return CONTENT_TYPES.FORM_URLENCODED
  }
  if (lower.includes('multipart/form-data')) {
    return CONTENT_TYPES.MULTIPART_FORM_DATA
  }
  if (lower.includes('text/plain')) {
    return CONTENT_TYPES.TEXT_PLAIN
  }
  if (lower.includes('text/html')) {
    return CONTENT_TYPES.TEXT_HTML
  }
  if (lower.includes('text/xml')) {
    return CONTENT_TYPES.TEXT_XML
  }
  if (lower.includes('application/xml')) {
    return CONTENT_TYPES.XML
  }

  return contentType || CONTENT_TYPES.TEXT_PLAIN
}

export {
  parseHttpRequest,
  parseHeaders,
  parseBodyOnly,
  detectContentTypeFromHeaders,
}
