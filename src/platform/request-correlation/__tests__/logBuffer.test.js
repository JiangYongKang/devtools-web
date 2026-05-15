import { describe, expect, test } from 'vitest'
import {
  sanitizeUrl,
  sanitizeQueryString,
  sanitizeHeaders,
  RingBuffer,
  createLogBuffer,
  MASK_VALUE,
  DEFAULT_LOG_BUFFER_SIZE,
} from '../logic/index.js'

describe('logBuffer module', () => {
  describe('sanitizeUrl', () => {
    test('should strip query parameters', () => {
      const url = 'https://api.example.com/data?foo=bar&baz=qux'
      const sanitized = sanitizeUrl(url)
      expect(sanitized).toBe('https://api.example.com/data')
    })

    test('should strip hash parameters', () => {
      const url = 'https://api.example.com/data#section'
      const sanitized = sanitizeUrl(url)
      expect(sanitized).toBe('https://api.example.com/data')
    })

    test('should handle URLs without query or hash', () => {
      const url = 'https://api.example.com/data'
      const sanitized = sanitizeUrl(url)
      expect(sanitized).toBe(url)
    })

    test('should handle relative URLs in browser-like way', () => {
      const url = '/api/data?token=secret'
      const sanitized = sanitizeUrl(url)
      expect(sanitized).not.toContain('token=secret')
    })

    test('should return empty string for null/undefined', () => {
      expect(sanitizeUrl(null)).toBe('')
      expect(sanitizeUrl(undefined)).toBe('')
    })
  })

  describe('sanitizeQueryString', () => {
    test('should mask sensitive query keys', () => {
      const query = 'token=secret123&id=user123&api_key=key456'
      const sanitized = sanitizeQueryString(query)

      expect(sanitized).toContain('id=user123')
      expect(sanitized).toContain(`token=${MASK_VALUE}`)
      expect(sanitized).toContain(`api_key=${MASK_VALUE}`)
      expect(sanitized).not.toContain('secret123')
      expect(sanitized).not.toContain('key456')
    })

    test('should handle case-insensitive key matching', () => {
      const query = 'TOKEN=secret&Token=test'
      const sanitized = sanitizeQueryString(query)
      expect(sanitized).not.toContain('secret')
      expect(sanitized).not.toContain('test')
    })

    test('should return empty string for null/undefined', () => {
      expect(sanitizeQueryString(null)).toBe('')
      expect(sanitizeQueryString(undefined)).toBe('')
    })
  })

  describe('sanitizeHeaders', () => {
    test('should mask sensitive headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret-token',
        'X-API-Key': 'api-key-123',
      }

      const sanitized = sanitizeHeaders(headers)

      expect(sanitized['Content-Type']).toBe('application/json')
      expect(sanitized['Authorization']).toBe(MASK_VALUE)
      expect(sanitized['X-API-Key']).toBe(MASK_VALUE)
    })

    test('should handle case-insensitive header names', () => {
      const headers = {
        'authorization': 'Bearer secret',
        'AUTHORIZATION': 'Bearer another',
      }

      const sanitized = sanitizeHeaders(headers)
      expect(sanitized['authorization']).toBe(MASK_VALUE)
      expect(sanitized['AUTHORIZATION']).toBe(MASK_VALUE)
    })
  })

  describe('RingBuffer', () => {
    test('should push and retrieve items', () => {
      const buffer = new RingBuffer(5)
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)

      expect(buffer.getSize()).toBe(3)
      expect(buffer.toArray()).toEqual([1, 2, 3])
    })

    test('should wrap around when full', () => {
      const buffer = new RingBuffer(3)
      buffer.push(1)
      buffer.push(2)
      buffer.push(3)
      buffer.push(4)
      buffer.push(5)

      expect(buffer.getSize()).toBe(3)
      expect(buffer.toArray()).toEqual([3, 4, 5])
    })

    test('should clear buffer', () => {
      const buffer = new RingBuffer(5)
      buffer.push(1)
      buffer.push(2)
      buffer.clear()

      expect(buffer.getSize()).toBe(0)
      expect(buffer.toArray()).toEqual([])
    })

    test('should return correct capacity', () => {
      const buffer = new RingBuffer(100)
      expect(buffer.getCapacity()).toBe(100)
    })
  })

  describe('LogBuffer', () => {
    test('should create with default options', () => {
      const logBuffer = createLogBuffer()
      expect(logBuffer.getCapacity()).toBe(DEFAULT_LOG_BUFFER_SIZE)
    })

    test('should add and retrieve entries', () => {
      const logBuffer = createLogBuffer({ bufferSize: 10 })

      logBuffer.add({
        level: 'info',
        requestId: 'test-request-id',
        method: 'GET',
        url: 'https://api.example.com/data',
        status: 200,
        durationMs: 100,
      })

      const entries = logBuffer.getAll()
      expect(entries.length).toBe(1)
      expect(entries[0].level).toBe('info')
      expect(entries[0].requestId).toBe('test-request-id')
      expect(entries[0].method).toBe('GET')
      expect(entries[0].status).toBe(200)
      expect(entries[0].durationMs).toBe(100)
      expect(entries[0].timestamp).toBeDefined()
    })

    test('should sanitize URLs in entries', () => {
      const logBuffer = createLogBuffer()

      logBuffer.add({
        level: 'info',
        requestId: 'test-id',
        url: 'https://api.example.com/data?token=secret&api_key=123',
      })

      const entries = logBuffer.getAll()
      expect(entries[0].urlSummary).toBe('https://api.example.com/data')
      expect(entries[0].urlSummary).not.toContain('secret')
      expect(entries[0].urlSummary).not.toContain('123')
    })

    test('should filter entries by requestId', () => {
      const logBuffer = createLogBuffer()

      logBuffer.add({ level: 'info', requestId: 'id-1', url: '/api/a' })
      logBuffer.add({ level: 'info', requestId: 'id-2', url: '/api/b' })
      logBuffer.add({ level: 'info', requestId: 'id-1', url: '/api/c' })

      const filtered = logBuffer.filterByRequestId('id-1')
      expect(filtered.length).toBe(2)
      expect(filtered.every((e) => e.requestId === 'id-1')).toBe(true)
    })

    test('should clear all entries', () => {
      const logBuffer = createLogBuffer()
      logBuffer.add({ level: 'info', requestId: 'test' })
      logBuffer.clear()

      expect(logBuffer.getSize()).toBe(0)
      expect(logBuffer.getAll()).toEqual([])
    })

    test('should handle ring buffer overflow', () => {
      const logBuffer = createLogBuffer({ bufferSize: 3 })

      logBuffer.add({ level: 'info', requestId: '1' })
      logBuffer.add({ level: 'info', requestId: '2' })
      logBuffer.add({ level: 'info', requestId: '3' })
      logBuffer.add({ level: 'info', requestId: '4' })
      logBuffer.add({ level: 'info', requestId: '5' })

      expect(logBuffer.getSize()).toBe(3)
      const entries = logBuffer.getAll()
      expect(entries[0].requestId).toBe('3')
      expect(entries[1].requestId).toBe('4')
      expect(entries[2].requestId).toBe('5')
    })

    test('should export to NDJSON', () => {
      const logBuffer = createLogBuffer()

      logBuffer.add({ level: 'info', requestId: 'id-1', method: 'GET' })
      logBuffer.add({ level: 'warn', requestId: 'id-2', method: 'POST' })

      const ndjson = logBuffer.exportToNDJSON()
      const lines = ndjson.split('\n')

      expect(lines.length).toBe(2)
      expect(() => JSON.parse(lines[0])).not.toThrow()
      expect(() => JSON.parse(lines[1])).not.toThrow()
    })

    test('should filter NDJSON export by requestId', () => {
      const logBuffer = createLogBuffer()

      logBuffer.add({ level: 'info', requestId: 'id-1' })
      logBuffer.add({ level: 'info', requestId: 'id-2' })
      logBuffer.add({ level: 'info', requestId: 'id-1' })

      const ndjson = logBuffer.exportToNDJSON('id-1')
      const lines = ndjson.split('\n').filter(Boolean)

      expect(lines.length).toBe(2)
      lines.forEach((line) => {
        const entry = JSON.parse(line)
        expect(entry.requestId).toBe('id-1')
      })
    })

    test('should truncate entries exceeding max JSON length', () => {
      const logBuffer = createLogBuffer({ maxEntryJsonLength: 100 })

      const longEntry = {
        level: 'info',
        requestId: 'a'.repeat(100),
        method: 'GET',
        url: 'https://very-long-url.com/api/with/very/long/path/that/will/be/truncated',
      }

      logBuffer.add(longEntry)
      const entries = logBuffer.getAll()
      expect(entries[0]).toBeDefined()
    })

    test('should uppercase method', () => {
      const logBuffer = createLogBuffer()
      logBuffer.add({ level: 'info', method: 'get' })

      const entries = logBuffer.getAll()
      expect(entries[0].method).toBe('GET')
    })
  })
})
