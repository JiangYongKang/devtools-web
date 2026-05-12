import { describe, test, expect } from 'vitest'
import {
  parseHttpRequest,
  parseHeaders,
  parseBodyOnly,
  detectContentTypeFromHeaders,
} from '../logic/httpParser.js'
import { EVENT_ERROR_CODES, CONTENT_TYPES } from '../logic/constants.js'

describe('httpParser', () => {
  describe('parseHttpRequest', () => {
    test('should parse complete HTTP request', () => {
      const raw = `POST /webhook HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: sha256=test123

{"event": "test", "data": "hello"}`

      const result = parseHttpRequest(raw)

      expect(result.error).toBeNull()
      expect(result.method).toBe('POST')
      expect(result.path).toBe('/webhook')
      expect(result.httpVersion).toBe('HTTP/1.1')
      expect(result.headers['content-type']).toBe('application/json')
      expect(result.headers['x-webhook-signature']).toBe('sha256=test123')
      expect(result.rawBody).toBe('{"event": "test", "data": "hello"}')
    })

    test('should parse request with CRLF line endings', () => {
      const raw = 'POST /webhook HTTP/1.1\r\nContent-Type: text/plain\r\n\r\nHello World'

      const result = parseHttpRequest(raw)

      expect(result.error).toBeNull()
      expect(result.method).toBe('POST')
      expect(result.rawBody).toBe('Hello World')
    })

    test('should handle empty body', () => {
      const raw = `GET /health HTTP/1.1
User-Agent: TestAgent

`

      const result = parseHttpRequest(raw)

      expect(result.error).toBeNull()
      expect(result.method).toBe('GET')
      expect(result.path).toBe('/health')
    })

    test('should handle multiple headers with same name', () => {
      const raw = `GET /test HTTP/1.1
X-Custom-Header: value1
X-Custom-Header: value2

`

      const result = parseHttpRequest(raw)

      expect(result.error).toBeNull()
      expect(result.headers['x-custom-header']).toBe('value1, value2')
    })

    test('should return error for empty input', () => {
      const result = parseHttpRequest('')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(EVENT_ERROR_CODES.EMPTY_BODY)
    })

    test('should fall back to body-only parsing when no request line', () => {
      const raw = '{"key": "value"}'

      const result = parseHttpRequest(raw)

      expect(result.error).toBeNull()
      expect(result.method).toBe('POST')
      expect(result.path).toBe('/webhook')
      expect(result.contentType).toBe(CONTENT_TYPES.JSON)
      expect(result.rawBody).toBe('{"key": "value"}')
    })

    test('should detect form-urlencoded in body-only mode', () => {
      const raw = 'name=John+Doe&email=john%40example.com'

      const result = parseHttpRequest(raw)

      expect(result.error).toBeNull()
      expect(result.contentType).toBe(CONTENT_TYPES.FORM_URLENCODED)
    })

    test('should parse various HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']

      for (const method of methods) {
        const raw = `${method} /test HTTP/1.1\n\n`
        const result = parseHttpRequest(raw)
        expect(result.method).toBe(method)
      }
    })

    test('should parse complex path with query params', () => {
      const raw = 'GET /api/webhook?token=abc123&verify=true HTTP/1.1\n\n'

      const result = parseHttpRequest(raw)

      expect(result.path).toBe('/api/webhook?token=abc123&verify=true')
    })
  })

  describe('parseHeaders', () => {
    test('should parse single header', () => {
      const result = parseHeaders('Content-Type: application/json')
      expect(result['content-type']).toBe('application/json')
    })

    test('should parse multiple headers', () => {
      const raw = `Content-Type: application/json
User-Agent: TestAgent
X-Custom: value`

      const result = parseHeaders(raw)

      expect(result['content-type']).toBe('application/json')
      expect(result['user-agent']).toBe('TestAgent')
      expect(result['x-custom']).toBe('value')
    })

    test('should handle headers with colons in value', () => {
      const result = parseHeaders('X-Timestamp: 2024-01-01T00:00:00Z')
      expect(result['x-timestamp']).toBe('2024-01-01T00:00:00Z')
    })

    test('should trim whitespace', () => {
      const result = parseHeaders('  Key  :  Value  ')
      expect(result['key']).toBe('Value')
    })

    test('should skip lines without colon', () => {
      const raw = `Content-Type: text/plain
Invalid Header Line
X-Valid: value`

      const result = parseHeaders(raw)

      expect(result['content-type']).toBe('text/plain')
      expect(result['x-valid']).toBe('value')
      expect(Object.keys(result).length).toBe(2)
    })

    test('should return empty object for empty input', () => {
      const result = parseHeaders('')
      expect(Object.keys(result).length).toBe(0)
    })
  })

  describe('parseBodyOnly', () => {
    test('should detect JSON body', () => {
      const result = parseBodyOnly('{"test": "value"}')
      expect(result.contentType).toBe(CONTENT_TYPES.JSON)
    })

    test('should detect JSON array', () => {
      const result = parseBodyOnly('[1, 2, 3]')
      expect(result.contentType).toBe(CONTENT_TYPES.JSON)
    })

    test('should detect form-urlencoded', () => {
      const result = parseBodyOnly('key=value&foo=bar')
      expect(result.contentType).toBe(CONTENT_TYPES.FORM_URLENCODED)
    })

    test('should default to text/plain', () => {
      const result = parseBodyOnly('Hello World')
      expect(result.contentType).toBe(CONTENT_TYPES.TEXT_PLAIN)
    })

    test('should set default method and path', () => {
      const result = parseBodyOnly('test')
      expect(result.method).toBe('POST')
      expect(result.path).toBe('/webhook')
      expect(result.httpVersion).toBe('HTTP/1.1')
    })
  })

  describe('detectContentTypeFromHeaders', () => {
    test('should detect JSON', () => {
      const result = detectContentTypeFromHeaders({ 'content-type': 'application/json' })
      expect(result).toBe(CONTENT_TYPES.JSON)
    })

    test('should detect JSON with charset', () => {
      const result = detectContentTypeFromHeaders({ 'content-type': 'application/json; charset=utf-8' })
      expect(result).toBe(CONTENT_TYPES.JSON)
    })

    test('should detect form-urlencoded', () => {
      const result = detectContentTypeFromHeaders({ 'content-type': 'application/x-www-form-urlencoded' })
      expect(result).toBe(CONTENT_TYPES.FORM_URLENCODED)
    })

    test('should detect multipart/form-data', () => {
      const result = detectContentTypeFromHeaders({ 'content-type': 'multipart/form-data; boundary=test' })
      expect(result).toBe(CONTENT_TYPES.MULTIPART_FORM_DATA)
    })

    test('should detect text/plain', () => {
      const result = detectContentTypeFromHeaders({ 'content-type': 'text/plain' })
      expect(result).toBe(CONTENT_TYPES.TEXT_PLAIN)
    })

    test('should detect XML', () => {
      const result = detectContentTypeFromHeaders({ 'content-type': 'application/xml' })
      expect(result).toBe(CONTENT_TYPES.XML)
    })

    test('should detect text/xml', () => {
      const result = detectContentTypeFromHeaders({ 'content-type': 'text/xml' })
      expect(result).toBe(CONTENT_TYPES.TEXT_XML)
    })

    test('should return original content-type if not recognized', () => {
      const result = detectContentTypeFromHeaders({ 'content-type': 'application/octet-stream' })
      expect(result).toBe('application/octet-stream')
    })

    test('should default to text/plain if no content-type header', () => {
      const result = detectContentTypeFromHeaders({})
      expect(result).toBe(CONTENT_TYPES.TEXT_PLAIN)
    })
  })
})
