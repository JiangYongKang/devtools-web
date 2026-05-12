import { MAX_EVENTS, STORAGE_KEY } from './constants.js'
import { EVENT_ERROR_CODES, createError } from './errors.js'
import { parseHttpRequest, detectContentTypeFromHeaders } from './httpParser.js'
import { parseBody } from './bodyParser.js'

function createEvent(parsedRequest, bodyParsing, rawRequestText) {
  const { method, path, httpVersion, headers, rawBody, contentType } = parsedRequest

  const derivedHeaders = {
    method,
    path,
    httpVersion,
    contentType,
    ...headers,
  }

  const bodyPreview = bodyParsing?.preview || rawBody?.substring(0, 100) || ''

  return {
    id: generateEventId(),
    receivedAt: Date.now(),
    rawRequestText,
    derivedHeaders,
    bodyPreview,
    bodyParsing,
    errorCode: bodyParsing?.error?.errorCode || null,
    errorMessage: bodyParsing?.error?.errorMessage || null,
  }
}

function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function parseRawTextToEvent(rawText) {
  const parsedRequest = parseHttpRequest(rawText)

  if (parsedRequest.error) {
    const event = createEvent(
      {
        method: 'UNKNOWN',
        path: '/',
        httpVersion: 'HTTP/1.1',
        headers: {},
        rawBody: rawText,
        contentType: 'text/plain',
      },
      {
        type: 'text/plain',
        raw: rawText,
        parsed: rawText,
        preview: rawText?.substring(0, 100),
        error: parsedRequest.error,
      },
      rawText,
    )
    return event
  }

  const detectedType = detectContentTypeFromHeaders(parsedRequest.headers)
  const bodyParsing = parseBody(parsedRequest.rawBody, detectedType)

  return createEvent(parsedRequest, bodyParsing, rawText)
}

function getEventsFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveEventsToStorage(events) {
  try {
    const trimmed = events.slice(0, MAX_EVENTS)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    return true
  } catch {
    return false
  }
}

function addEvent(events, newEvent) {
  const updated = [newEvent, ...events]
  if (updated.length > MAX_EVENTS) {
    updated.pop()
  }
  saveEventsToStorage(updated)
  return updated
}

function removeEvent(events, eventId) {
  const updated = events.filter((e) => e.id !== eventId)
  saveEventsToStorage(updated)
  return updated
}

function clearEvents() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

function exportEvents(events) {
  return JSON.stringify(events, null, 2)
}

function importEvents(jsonText) {
  try {
    const parsed = JSON.parse(jsonText)

    if (!Array.isArray(parsed)) {
      return {
        success: false,
        error: createError(EVENT_ERROR_CODES.INVALID_IMPORT, '导入数据必须是数组格式'),
        events: [],
      }
    }

    const validEvents = []
    for (const item of parsed) {
      if (validateEvent(item)) {
        validEvents.push(item)
      }
    }

    if (validEvents.length === 0) {
      return {
        success: false,
        error: createError(EVENT_ERROR_CODES.INVALID_IMPORT, '导入数据中没有有效的事件'),
        events: [],
      }
    }

    return {
      success: true,
      error: null,
      events: validEvents,
    }
  } catch (err) {
    return {
      success: false,
      error: createError(EVENT_ERROR_CODES.INVALID_IMPORT, `JSON 解析失败：${err.message}`),
      events: [],
    }
  }
}

function validateEvent(event) {
  if (!event || typeof event !== 'object') return false
  if (typeof event.receivedAt !== 'number') return false
  if (typeof event.rawRequestText !== 'string') return false
  if (!event.derivedHeaders || typeof event.derivedHeaders !== 'object') return false
  return true
}

function filterEvents(events, keyword) {
  if (!keyword || keyword.trim() === '') {
    return events
  }

  const lowerKeyword = keyword.toLowerCase()
  return events.filter((event) => {
    if (event.rawRequestText?.toLowerCase().includes(lowerKeyword)) return true
    if (event.bodyPreview?.toLowerCase().includes(lowerKeyword)) return true
    if (event.derivedHeaders?.method?.toLowerCase().includes(lowerKeyword)) return true
    if (event.derivedHeaders?.path?.toLowerCase().includes(lowerKeyword)) return true
    if (event.errorMessage?.toLowerCase().includes(lowerKeyword)) return true

    for (const [key, value] of Object.entries(event.derivedHeaders || {})) {
      if (key.toLowerCase().includes(lowerKeyword)) return true
      if (String(value).toLowerCase().includes(lowerKeyword)) return true
    }

    return false
  })
}

export {
  createEvent,
  generateEventId,
  parseRawTextToEvent,
  getEventsFromStorage,
  saveEventsToStorage,
  addEvent,
  removeEvent,
  clearEvents,
  exportEvents,
  importEvents,
  validateEvent,
  filterEvents,
}
