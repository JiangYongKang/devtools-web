import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
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
} from '../logic/events.js'
import { MAX_EVENTS, STORAGE_KEY } from '../logic/constants.js'

describe('events', () => {
  const mockData = {}
  const mockSessionStorage = {
    getItem: vi.fn((key) => mockData[key] ?? null),
    setItem: vi.fn((key, value) => {
      mockData[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete mockData[key]
    }),
  }

  beforeEach(() => {
    Object.keys(mockData).forEach((key) => delete mockData[key])
    vi.stubGlobal('sessionStorage', mockSessionStorage)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('generateEventId', () => {
    test('should generate unique IDs', () => {
      const id1 = generateEventId()
      const id2 = generateEventId()

      expect(id1).toMatch(/^evt_\d+_[a-z0-9]{8}$/)
      expect(id2).toMatch(/^evt_\d+_[a-z0-9]{8}$/)
      expect(id1).not.toBe(id2)
    })

    test('should start with evt_ prefix', () => {
      const id = generateEventId()
      expect(id.startsWith('evt_')).toBe(true)
    })
  })

  describe('createEvent', () => {
    test('should create event with correct structure', () => {
      const parsedRequest = {
        method: 'POST',
        path: '/webhook',
        httpVersion: 'HTTP/1.1',
        headers: { 'content-type': 'application/json' },
        rawBody: '{"test": "value"}',
        contentType: 'application/json',
      }

      const bodyParsing = {
        type: 'application/json',
        raw: '{"test": "value"}',
        parsed: { test: 'value' },
        preview: '{ test }',
        error: null,
      }

      const rawText = 'POST /webhook HTTP/1.1\n\n{"test": "value"}'

      const event = createEvent(parsedRequest, bodyParsing, rawText)

      expect(event.id).toBeDefined()
      expect(event.receivedAt).toBeDefined()
      expect(typeof event.receivedAt).toBe('number')
      expect(event.rawRequestText).toBe(rawText)
      expect(event.derivedHeaders.method).toBe('POST')
      expect(event.derivedHeaders.path).toBe('/webhook')
      expect(event.bodyPreview).toBe('{ test }')
      expect(event.errorCode).toBeNull()
      expect(event.errorMessage).toBeNull()
    })

    test('should include error info when present', () => {
      const parsedRequest = {
        method: 'POST',
        path: '/webhook',
        httpVersion: 'HTTP/1.1',
        headers: {},
        rawBody: 'invalid json',
        contentType: 'application/json',
      }

      const bodyParsing = {
        type: 'application/json',
        raw: 'invalid json',
        parsed: null,
        preview: 'invalid',
        error: {
          errorCode: 'INVALID_JSON',
          errorMessage: 'JSON parse error',
        },
      }

      const event = createEvent(parsedRequest, bodyParsing, 'test')

      expect(event.errorCode).toBe('INVALID_JSON')
      expect(event.errorMessage).toBe('JSON parse error')
    })
  })

  describe('parseRawTextToEvent', () => {
    test('should parse valid HTTP request to event', () => {
      const raw = `POST /webhook HTTP/1.1
Content-Type: application/json

{"test": "value"}`

      const event = parseRawTextToEvent(raw)

      expect(event.id).toBeDefined()
      expect(event.receivedAt).toBeDefined()
      expect(event.derivedHeaders.method).toBe('POST')
      expect(event.derivedHeaders.path).toBe('/webhook')
    })

    test('should parse body-only text to event', () => {
      const event = parseRawTextToEvent('{"key": "value"}')

      expect(event.id).toBeDefined()
      expect(event.derivedHeaders.method).toBe('POST')
      expect(event.derivedHeaders['content-type']).toBe('application/json')
    })
  })

  describe('getEventsFromStorage', () => {
    test('should return empty array when no data', () => {
      const result = getEventsFromStorage()
      expect(result).toEqual([])
    })

    test('should return parsed events from storage', () => {
      const testEvents = [{ id: 'test1' }, { id: 'test2' }]
      mockData[STORAGE_KEY] = JSON.stringify(testEvents)

      const result = getEventsFromStorage()

      expect(result).toEqual(testEvents)
    })

    test('should return empty array on parse error', () => {
      mockData[STORAGE_KEY] = 'invalid json'

      const result = getEventsFromStorage()

      expect(result).toEqual([])
    })
  })

  describe('saveEventsToStorage', () => {
    test('should save events to storage', () => {
      const testEvents = [{ id: 'test1' }, { id: 'test2' }]

      const result = saveEventsToStorage(testEvents)

      expect(result).toBe(true)
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(testEvents),
      )
    })

    test('should trim to MAX_EVENTS', () => {
      const testEvents = Array.from({ length: 100 }, (_, i) => ({ id: `test${i}` }))

      saveEventsToStorage(testEvents)

      const saved = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(saved.length).toBe(MAX_EVENTS)
    })
  })

  describe('addEvent', () => {
    test('should add event to beginning of array', () => {
      const existing = [{ id: 'old' }]
      const newEvent = { id: 'new' }

      const result = addEvent(existing, newEvent)

      expect(result[0].id).toBe('new')
      expect(result[1].id).toBe('old')
    })

    test('should trim to MAX_EVENTS', () => {
      const existing = Array.from({ length: MAX_EVENTS }, (_, i) => ({ id: `old${i}` }))
      const newEvent = { id: 'new' }

      const result = addEvent(existing, newEvent)

      expect(result.length).toBe(MAX_EVENTS)
      expect(result[0].id).toBe('new')
      expect(result[MAX_EVENTS - 1].id).toBe(`old${MAX_EVENTS - 2}`)
    })
  })

  describe('removeEvent', () => {
    test('should remove event by id', () => {
      const events = [{ id: '1' }, { id: '2' }, { id: '3' }]

      const result = removeEvent(events, '2')

      expect(result.length).toBe(2)
      expect(result.find((e) => e.id === '2')).toBeUndefined()
    })

    test('should do nothing if id not found', () => {
      const events = [{ id: '1' }, { id: '2' }]

      const result = removeEvent(events, '999')

      expect(result.length).toBe(2)
    })
  })

  describe('clearEvents', () => {
    test('should remove events from storage', () => {
      mockData[STORAGE_KEY] = '[{"id": "test"}]'

      const result = clearEvents()

      expect(result).toBe(true)
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    })
  })

  describe('exportEvents', () => {
    test('should export events as JSON string', () => {
      const events = [{ id: '1' }, { id: '2' }]

      const result = exportEvents(events)

      expect(typeof result).toBe('string')
      expect(JSON.parse(result)).toEqual(events)
    })

    test('should be valid JSON with formatting', () => {
      const events = [{ id: '1', name: 'test' }]

      const result = exportEvents(events)

      expect(result).toContain('\n')
      expect(JSON.parse(result)).toBeDefined()
    })
  })

  describe('importEvents', () => {
    test('should import valid events array', () => {
      const validEvent = {
        receivedAt: Date.now(),
        rawRequestText: 'test',
        derivedHeaders: {},
      }

      const json = JSON.stringify([validEvent])
      const result = importEvents(json)

      expect(result.success).toBe(true)
      expect(result.events.length).toBe(1)
      expect(result.error).toBeNull()
    })

    test('should return error for non-array JSON', () => {
      const json = '{"not": "array"}'
      const result = importEvents(json)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    test('should return error for invalid JSON', () => {
      const result = importEvents('invalid json')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    test('should return error for no valid events', () => {
      const json = '[{"invalid": "item"}]'
      const result = importEvents(json)

      expect(result.success).toBe(false)
    })

    test('should filter out invalid events', () => {
      const validEvent = {
        receivedAt: Date.now(),
        rawRequestText: 'test',
        derivedHeaders: {},
      }
      const invalidEvent = { invalid: true }

      const json = JSON.stringify([validEvent, invalidEvent])
      const result = importEvents(json)

      expect(result.success).toBe(true)
      expect(result.events.length).toBe(1)
    })
  })

  describe('validateEvent', () => {
    test('should validate event with all required fields', () => {
      const event = {
        receivedAt: Date.now(),
        rawRequestText: 'test',
        derivedHeaders: {},
      }

      expect(validateEvent(event)).toBe(true)
    })

    test('should reject null/undefined', () => {
      expect(validateEvent(null)).toBe(false)
      expect(validateEvent(undefined)).toBe(false)
    })

    test('should reject non-object', () => {
      expect(validateEvent('string')).toBe(false)
      expect(validateEvent(123)).toBe(false)
    })

    test('should reject missing receivedAt', () => {
      const event = { rawRequestText: 'test', derivedHeaders: {} }
      expect(validateEvent(event)).toBe(false)
    })

    test('should reject non-numeric receivedAt', () => {
      const event = { receivedAt: 'not a number', rawRequestText: 'test', derivedHeaders: {} }
      expect(validateEvent(event)).toBe(false)
    })

    test('should reject missing rawRequestText', () => {
      const event = { receivedAt: Date.now(), derivedHeaders: {} }
      expect(validateEvent(event)).toBe(false)
    })

    test('should reject missing derivedHeaders', () => {
      const event = { receivedAt: Date.now(), rawRequestText: 'test' }
      expect(validateEvent(event)).toBe(false)
    })
  })

  describe('filterEvents', () => {
    const createTestEvents = () => [
      {
        id: '1',
        receivedAt: Date.now(),
        rawRequestText: 'POST /webhook test event 1',
        derivedHeaders: { method: 'POST', path: '/webhook', 'content-type': 'application/json' },
        bodyPreview: 'body content one',
        errorMessage: null,
      },
      {
        id: '2',
        receivedAt: Date.now(),
        rawRequestText: 'GET /api event 2',
        derivedHeaders: { method: 'GET', path: '/api', 'content-type': 'text/plain' },
        bodyPreview: 'body content two',
        errorMessage: 'parse error',
      },
    ]

    test('should return all events for empty keyword', () => {
      const events = createTestEvents()
      const result = filterEvents(events, '')

      expect(result.length).toBe(2)
    })

    test('should return all events for whitespace keyword', () => {
      const events = createTestEvents()
      const result = filterEvents(events, '   ')

      expect(result.length).toBe(2)
    })

    test('should filter by rawRequestText', () => {
      const events = createTestEvents()
      const result = filterEvents(events, 'test event')

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('1')
    })

    test('should filter by method', () => {
      const events = createTestEvents()
      const result = filterEvents(events, 'GET')

      expect(result.length).toBe(1)
      expect(result[0].derivedHeaders.method).toBe('GET')
    })

    test('should filter by path', () => {
      const events = createTestEvents()
      const result = filterEvents(events, '/api')

      expect(result.length).toBe(1)
      expect(result[0].derivedHeaders.path).toBe('/api')
    })

    test('should filter by bodyPreview', () => {
      const events = createTestEvents()
      const result = filterEvents(events, 'content two')

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('2')
    })

    test('should filter by errorMessage', () => {
      const events = createTestEvents()
      const result = filterEvents(events, 'parse error')

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('2')
    })

    test('should filter by header name', () => {
      const events = createTestEvents()
      const result = filterEvents(events, 'content-type')

      expect(result.length).toBe(2)
    })

    test('should filter by header value', () => {
      const events = createTestEvents()
      const result = filterEvents(events, 'application/json')

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('1')
    })

    test('should be case-insensitive', () => {
      const events = createTestEvents()
      const result = filterEvents(events, 'post')

      expect(result.length).toBe(1)
      expect(result[0].derivedHeaders.method).toBe('POST')
    })

    test('should return empty array for no matches', () => {
      const events = createTestEvents()
      const result = filterEvents(events, 'nonexistent')

      expect(result.length).toBe(0)
    })
  })
})
