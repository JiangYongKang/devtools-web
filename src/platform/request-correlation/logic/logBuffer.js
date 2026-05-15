import {
  DEFAULT_LOG_BUFFER_SIZE,
  DEFAULT_MAX_LOG_ENTRY_JSON_LENGTH,
  DEFAULT_SENSITIVE_QUERY_KEYS,
  SENSITIVE_HEADER_NAMES,
} from './constants.js'
import {
  truncateString,
} from './errors.js'

const MASK_VALUE = '[REDACTED]'

function sanitizeUrl(url, sensitiveKeys = DEFAULT_SENSITIVE_QUERY_KEYS) {
  void sensitiveKeys
  if (!url || typeof url !== 'string') {
    return url || ''
  }

  try {
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const summary = urlObj.origin + urlObj.pathname

    if (urlObj.hash) {
      return summary
    }

    return summary
  } catch {
    const queryIndex = url.indexOf('?')
    const hashIndex = url.indexOf('#')

    if (queryIndex !== -1 && (hashIndex === -1 || queryIndex < hashIndex)) {
      return url.slice(0, queryIndex)
    }
    if (hashIndex !== -1) {
      return url.slice(0, hashIndex)
    }
    return url
  }
}

function sanitizeQueryString(queryString, sensitiveKeys = DEFAULT_SENSITIVE_QUERY_KEYS) {
  if (!queryString || typeof queryString !== 'string') {
    return ''
  }

  const pairs = queryString.split('&')
  const sanitized = []

  for (const pair of pairs) {
    const [key] = pair.split('=')

    if (key && sensitiveKeys.has(key.toLowerCase())) {
      sanitized.push(`${key}=${MASK_VALUE}`)
    } else if (key) {
      sanitized.push(pair)
    }
  }

  return sanitized.join('&')
}

function sanitizeHeaders(headers, sensitiveNames = SENSITIVE_HEADER_NAMES) {
  if (!headers || typeof headers !== 'object') {
    return {}
  }

  const result = {}

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveNames.has(key.toLowerCase())) {
      result[key] = MASK_VALUE
    } else {
      result[key] = value
    }
  }

  return result
}

class RingBuffer {
  constructor(capacity = DEFAULT_LOG_BUFFER_SIZE) {
    this.capacity = Math.max(1, capacity)
    this.buffer = new Array(this.capacity)
    this.writeIndex = 0
    this.length = 0
  }

  push(item) {
    this.buffer[this.writeIndex] = item
    this.writeIndex = (this.writeIndex + 1) % this.capacity
    if (this.length < this.capacity) {
      this.length++
    }
  }

  toArray() {
    const result = []
    for (let i = 0; i < this.length; i++) {
      const index = (this.writeIndex - this.length + i + this.capacity) % this.capacity
      result.push(this.buffer[index])
    }
    return result
  }

  clear() {
    this.buffer = new Array(this.capacity)
    this.writeIndex = 0
    this.length = 0
  }

  getSize() {
    return this.length
  }

  getCapacity() {
    return this.capacity
  }
}

class LogBuffer {
  constructor(options = {}) {
    this.bufferSize = options.bufferSize ?? DEFAULT_LOG_BUFFER_SIZE
    this.maxEntryJsonLength = options.maxEntryJsonLength ?? DEFAULT_MAX_LOG_ENTRY_JSON_LENGTH
    this.sensitiveQueryKeys = options.sensitiveQueryKeys ?? DEFAULT_SENSITIVE_QUERY_KEYS
    this.buffer = new RingBuffer(this.bufferSize)
  }

  add(entry) {
    const processed = this.processEntry(entry)
    this.buffer.push(processed)
    return processed
  }

  processEntry(entry) {
    const baseEntry = {
      timestamp: entry.timestamp ?? Date.now(),
      level: entry.level ?? 'info',
      requestId: entry.requestId,
    }

    if (entry.url) {
      baseEntry.urlSummary = sanitizeUrl(entry.url, this.sensitiveQueryKeys)
    }

    if (entry.method !== undefined) {
      baseEntry.method = String(entry.method).toUpperCase()
    }

    if (entry.status !== undefined) {
      baseEntry.status = entry.status
    }

    if (entry.durationMs !== undefined) {
      baseEntry.durationMs = entry.durationMs
    }

    const jsonStr = JSON.stringify(baseEntry)

    if (jsonStr.length > this.maxEntryJsonLength) {
      const url = baseEntry.urlSummary
      const truncated = {
        ...baseEntry,
        urlSummary: truncateString(url, Math.floor(this.maxEntryJsonLength / 4)),
        _truncated: true,
      }
      return truncated
    }

    return baseEntry
  }

  getAll() {
    return this.buffer.toArray()
  }

  filterByRequestId(requestId) {
    if (!requestId) {
      return []
    }
    return this.buffer.toArray().filter((entry) => entry.requestId === requestId)
  }

  clear() {
    this.buffer.clear()
  }

  getSize() {
    return this.buffer.getSize()
  }

  getCapacity() {
    return this.buffer.getCapacity()
  }

  exportToNDJSON(filterRequestId = null) {
    const entries = filterRequestId ? this.filterByRequestId(filterRequestId) : this.getAll()
    return entries.map((entry) => JSON.stringify(entry)).join('\n')
  }

  downloadNDJSON(filename = 'request-logs.ndjson', filterRequestId = null) {
    if (typeof window === 'undefined' || typeof Blob === 'undefined') {
      throw new Error('浏览器环境下才能下载文件')
    }

    const ndjson = this.exportToNDJSON(filterRequestId)
    const blob = new Blob([ndjson], { type: 'application/x-ndjson' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }
}

function createLogBuffer(options = {}) {
  return new LogBuffer(options)
}

export {
  sanitizeUrl,
  sanitizeQueryString,
  sanitizeHeaders,
  RingBuffer,
  LogBuffer,
  createLogBuffer,
  MASK_VALUE,
}
