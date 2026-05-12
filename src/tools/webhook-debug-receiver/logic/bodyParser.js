import { EVENT_ERROR_CODES, CONTENT_TYPES } from './constants.js'
import { createError } from './errors.js'

function parseBody(rawBody, contentType) {
  const lowerType = (contentType || '').toLowerCase()

  if (lowerType.includes('application/json')) {
    return parseJsonBody(rawBody)
  }
  if (lowerType.includes('application/x-www-form-urlencoded')) {
    return parseFormUrlEncoded(rawBody)
  }
  if (lowerType.includes('multipart/form-data')) {
    return parseMultipartBody(rawBody, contentType)
  }

  return parseTextBody(rawBody)
}

function parseJsonBody(rawBody) {
  const trimmed = rawBody?.trim() || ''

  if (!trimmed) {
    return {
      type: CONTENT_TYPES.JSON,
      raw: '',
      parsed: null,
      preview: '',
      error: createError(EVENT_ERROR_CODES.EMPTY_BODY),
    }
  }

  try {
    const parsed = JSON.parse(trimmed)
    return {
      type: CONTENT_TYPES.JSON,
      raw: trimmed,
      parsed,
      preview: formatJsonPreview(parsed),
      beautified: JSON.stringify(parsed, null, 2),
      error: null,
    }
  } catch (err) {
    return {
      type: CONTENT_TYPES.JSON,
      raw: trimmed,
      parsed: null,
      preview: trimmed.substring(0, 100),
      error: createError(EVENT_ERROR_CODES.INVALID_JSON, `JSON 解析失败：${err.message}`),
    }
  }
}

function parseFormUrlEncoded(rawBody) {
  const trimmed = rawBody?.trim() || ''

  if (!trimmed) {
    return {
      type: CONTENT_TYPES.FORM_URLENCODED,
      raw: '',
      parsed: {},
      preview: '',
      error: createError(EVENT_ERROR_CODES.EMPTY_BODY),
    }
  }

  try {
    const pairs = trimmed.split('&')
    const parsed = {}

    for (const pair of pairs) {
      const splitIndex = pair.indexOf('=')
      let rawKey
      let rawValue

      if (splitIndex === -1) {
        rawKey = pair
        rawValue = ''
      } else {
        rawKey = pair.slice(0, splitIndex)
        rawValue = pair.slice(splitIndex + 1)
      }

      const key = decodeURIComponent(rawKey.replace(/\+/g, ' '))
      const value = decodeURIComponent(rawValue.replace(/\+/g, ' '))

      if (key) {
        if (parsed[key] !== undefined) {
          if (Array.isArray(parsed[key])) {
            parsed[key].push(value)
          } else {
            parsed[key] = [parsed[key], value]
          }
        } else {
          parsed[key] = value
        }
      }
    }

    return {
      type: CONTENT_TYPES.FORM_URLENCODED,
      raw: trimmed,
      parsed,
      preview: formatFormPreview(parsed),
      error: null,
    }
  } catch (err) {
    return {
      type: CONTENT_TYPES.FORM_URLENCODED,
      raw: trimmed,
      parsed: {},
      preview: trimmed.substring(0, 100),
      error: createError(EVENT_ERROR_CODES.INVALID_FORM, `表单解析失败：${err.message}`),
    }
  }
}

function parseMultipartBody(rawBody, contentType) {
  const body = rawBody == null ? '' : String(rawBody)

  if (!body.trim()) {
    return {
      type: CONTENT_TYPES.MULTIPART_FORM_DATA,
      raw: '',
      parsed: [],
      preview: '',
      error: createError(EVENT_ERROR_CODES.EMPTY_BODY),
    }
  }

  try {
    const boundaryMatch = contentType?.match(/boundary=([^;]+)/i)
    if (!boundaryMatch) {
      return {
        type: CONTENT_TYPES.MULTIPART_FORM_DATA,
        raw: body,
        parsed: [],
        preview: body.substring(0, 100),
        error: createError(EVENT_ERROR_CODES.INVALID_MULTIPART, '未找到 boundary 分隔符'),
      }
    }

    const boundary = `--${boundaryMatch[1].trim()}`
    const closingBoundary = `${boundary}--`
    const parsed = []

    let startIndex = 0
    while (true) {
      const boundaryIndex = body.indexOf(boundary, startIndex)
      if (boundaryIndex === -1) break

      if (body.substring(boundaryIndex, boundaryIndex + closingBoundary.length) === closingBoundary) {
        break
      }

      const nextBoundaryIndex = body.indexOf(boundary, boundaryIndex + boundary.length)
      if (nextBoundaryIndex === -1) break

      const partContent = body.substring(boundaryIndex + boundary.length, nextBoundaryIndex)
      const partLines = partContent.split(/\r?\n/)

      let lineIndex = 0
      while (lineIndex < partLines.length && partLines[lineIndex].trim() === '') {
        lineIndex++
      }

      const headerLines = []
      while (lineIndex < partLines.length && partLines[lineIndex].trim() !== '') {
        headerLines.push(partLines[lineIndex])
        lineIndex++
      }

      lineIndex++

      const bodyLines = []
      while (lineIndex < partLines.length) {
        bodyLines.push(partLines[lineIndex])
        lineIndex++
      }

      while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') {
        bodyLines.pop()
      }

      const partHeaders = parseHeaders(headerLines.join('\n'))
      const partBody = bodyLines.join('\n')

      const disposition = partHeaders['content-disposition'] || ''
      const nameMatch = disposition.match(/name="([^"]+)"/)
      const filenameMatch = disposition.match(/filename="([^"]+)"/)

      parsed.push({
        name: nameMatch ? nameMatch[1] : `part${parsed.length + 1}`,
        filename: filenameMatch ? filenameMatch[1] : null,
        contentType: partHeaders['content-type'] || 'text/plain',
        headers: partHeaders,
        body: partBody,
      })

      startIndex = nextBoundaryIndex
    }

    return {
      type: CONTENT_TYPES.MULTIPART_FORM_DATA,
      raw: body,
      parsed,
      preview: formatMultipartPreview(parsed),
      error: null,
    }
  } catch (err) {
    return {
      type: CONTENT_TYPES.MULTIPART_FORM_DATA,
      raw: body,
      parsed: [],
      preview: body.substring(0, 100),
      error: createError(EVENT_ERROR_CODES.INVALID_MULTIPART, `multipart 解析失败：${err.message}`),
    }
  }
}

function parseTextBody(rawBody) {
  const text = rawBody == null ? '' : String(rawBody)
  const hexPairs = []

  for (let i = 0; i < text.length && i < 1024; i++) {
    const byte = text.charCodeAt(i)
    hexPairs.push(byte.toString(16).padStart(2, '0').toUpperCase())
  }

  return {
    type: CONTENT_TYPES.TEXT_PLAIN,
    raw: text,
    parsed: text,
    preview: text.length > 100 ? text.substring(0, 96) + '...' : text,
    hexString: hexPairs.join(' '),
    error: null,
  }
}

function formatJsonPreview(obj) {
  if (obj === null) return 'null'
  if (typeof obj === 'string') return `"${obj.substring(0, 50)}${obj.length > 50 ? '...' : ''}"`
  if (Array.isArray(obj)) return `Array(${obj.length}) [...]`
  if (typeof obj === 'object') {
    const keys = Object.keys(obj)
    return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''} }`
  }
  return String(obj)
}

function formatFormPreview(obj) {
  const keys = Object.keys(obj)
  if (keys.length === 0) return '{}'
  return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''} }`
}

function formatMultipartPreview(parts) {
  if (parts.length === 0) return '0 parts'
  const names = parts.slice(0, 3).map((p) => p.name)
  return `${parts.length} part(s): ${names.join(', ')}${parts.length > 3 ? ', ...' : ''}`
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

export {
  parseBody,
  parseJsonBody,
  parseFormUrlEncoded,
  parseMultipartBody,
  parseTextBody,
}
