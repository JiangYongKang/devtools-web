import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  VERSION,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MAX_BODY_PREVIEW_LENGTH,
  HTTP_METHODS,
  BODY_MODES,
  ERROR_CODES,
  ERROR_MESSAGES,
  SENSITIVE_HEADERS,
  BROWSER_FORBIDDEN_HEADERS,
  CORS_SAFELISTED_RESPONSE_HEADERS,
  isSensitiveHeader,
  isForbiddenHeader,
  maskSensitiveValue,
  isValidHeaderName,
  isValidHeaderValue,
  hasJavascriptSchema,
  buildUrl,
  buildHeaders,
  buildJsonBody,
  buildFormUrlEncoded,
  buildFormData,
  buildFetchInit,
  classifyFetchError,
  headersToObject,
  parseContentType,
  isJsonContentType,
  isTextContentType,
  tryParseJson,
  summarizeResponse,
  buildHarEntry,
  exportHar,
  formatDuration,
  getStatusCategory,
  getErrorMessage,
  getPresetTemplates,
  getDefaultParams,
} from '../logic/index.js'

describe('HTTP Request Playground Logic', () => {
  describe('constants', () => {
    test('VERSION should be a semantic version string', () => {
      expect(typeof VERSION).toBe('string')
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    })

    test('DEFAULT_TIMEOUT_MS should be 30 seconds', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(30000)
    })

    test('MAX_TIMEOUT_MS should be 5 minutes', () => {
      expect(MAX_TIMEOUT_MS).toBe(300000)
    })

    test('HTTP_METHODS should include common methods', () => {
      expect(HTTP_METHODS).toContain('GET')
      expect(HTTP_METHODS).toContain('POST')
      expect(HTTP_METHODS).toContain('PUT')
      expect(HTTP_METHODS).toContain('DELETE')
      expect(HTTP_METHODS).toContain('PATCH')
    })

    test('BODY_MODES should include all body modes', () => {
      expect(BODY_MODES).toContain('none')
      expect(BODY_MODES).toContain('raw')
      expect(BODY_MODES).toContain('json')
      expect(BODY_MODES).toContain('form-data')
      expect(BODY_MODES).toContain('x-www-form-urlencoded')
    })

    test('ERROR_CODES should include all required error types', () => {
      expect(ERROR_CODES.INVALID_URL).toBeDefined()
      expect(ERROR_CODES.CORS_ERROR).toBeDefined()
      expect(ERROR_CODES.ABORTED).toBeDefined()
      expect(ERROR_CODES.TIMEOUT_ERROR).toBeDefined()
      expect(ERROR_CODES.NETWORK_ERROR).toBeDefined()
      expect(ERROR_CODES.HTTP_ERROR).toBeDefined()
      expect(ERROR_CODES.JAVASCRIPT_SCHEMA_DETECTED).toBeDefined()
    })

    test('ERROR_MESSAGES should map all error codes to messages', () => {
      for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      }
    })

    test('SENSITIVE_HEADERS should include common sensitive headers', () => {
      expect(SENSITIVE_HEADERS.has('authorization')).toBe(true)
      expect(SENSITIVE_HEADERS.has('cookie')).toBe(true)
      expect(SENSITIVE_HEADERS.has('x-api-key')).toBe(true)
    })

    test('BROWSER_FORBIDDEN_HEADERS should include forbidden headers', () => {
      expect(BROWSER_FORBIDDEN_HEADERS.has('cookie')).toBe(true)
      expect(BROWSER_FORBIDDEN_HEADERS.has('host')).toBe(true)
      expect(BROWSER_FORBIDDEN_HEADERS.has('content-length')).toBe(true)
    })

    test('CORS_SAFELISTED_RESPONSE_HEADERS should include safelisted headers', () => {
      expect(CORS_SAFELISTED_RESPONSE_HEADERS.has('content-type')).toBe(true)
      expect(CORS_SAFELISTED_RESPONSE_HEADERS.has('cache-control')).toBe(true)
    })
  })

  describe('helper functions', () => {
    describe('isSensitiveHeader', () => {
      test('should detect sensitive headers case-insensitively', () => {
        expect(isSensitiveHeader('Authorization')).toBe(true)
        expect(isSensitiveHeader('authorization')).toBe(true)
        expect(isSensitiveHeader('AUTHORIZATION')).toBe(true)
        expect(isSensitiveHeader('Cookie')).toBe(true)
        expect(isSensitiveHeader('X-API-Key')).toBe(true)
      })

      test('should return false for non-sensitive headers', () => {
        expect(isSensitiveHeader('Content-Type')).toBe(false)
        expect(isSensitiveHeader('Accept')).toBe(false)
        expect(isSensitiveHeader(null)).toBe(false)
        expect(isSensitiveHeader('')).toBe(false)
      })
    })

    describe('isForbiddenHeader', () => {
      test('should detect forbidden headers case-insensitively', () => {
        expect(isForbiddenHeader('Cookie')).toBe(true)
        expect(isForbiddenHeader('cookie')).toBe(true)
        expect(isForbiddenHeader('Host')).toBe(true)
        expect(isForbiddenHeader('Content-Length')).toBe(true)
      })

      test('should return false for non-forbidden headers', () => {
        expect(isForbiddenHeader('Content-Type')).toBe(false)
        expect(isForbiddenHeader('Accept')).toBe(false)
      })
    })

    describe('maskSensitiveValue', () => {
      test('should mask sensitive header values', () => {
        expect(maskSensitiveValue('Authorization', 'Bearer token123')).toBe('••••••••')
        expect(maskSensitiveValue('authorization', 'secret')).toBe('••••••••')
      })

      test('should not mask non-sensitive header values', () => {
        expect(maskSensitiveValue('Content-Type', 'application/json')).toBe('application/json')
        expect(maskSensitiveValue('Accept', '*/*')).toBe('*/*')
      })
    })

    describe('isValidHeaderName', () => {
      test('should accept valid header names', () => {
        expect(isValidHeaderName('Content-Type')).toBe(true)
        expect(isValidHeaderName('X-Custom-Header')).toBe(true)
        expect(isValidHeaderName('Accept')).toBe(true)
      })

      test('should reject invalid header names', () => {
        expect(isValidHeaderName('')).toBe(false)
        expect(isValidHeaderName('   ')).toBe(false)
        expect(isValidHeaderName(null)).toBe(false)
        expect(isValidHeaderName('Content Type')).toBe(false)
        expect(isValidHeaderName('Content-Type\n')).toBe(false)
      })
    })

    describe('isValidHeaderValue', () => {
      test('should accept valid header values', () => {
        expect(isValidHeaderValue('application/json')).toBe(true)
        expect(isValidHeaderValue('')).toBe(true)
        expect(isValidHeaderValue('123')).toBe(true)
      })

      test('should reject invalid header values', () => {
        expect(isValidHeaderValue(null)).toBe(false)
        expect(isValidHeaderValue(undefined)).toBe(false)
      })
    })

    describe('hasJavascriptSchema', () => {
      test('should detect javascript: protocol', () => {
        expect(hasJavascriptSchema('javascript:alert(1)')).toBe(true)
        expect(hasJavascriptSchema('JAVASCRIPT:alert(1)')).toBe(true)
        expect(hasJavascriptSchema('  javascript:alert(1)  ')).toBe(true)
      })

      test('should not detect other protocols', () => {
        expect(hasJavascriptSchema('https://example.com')).toBe(false)
        expect(hasJavascriptSchema('http://example.com')).toBe(false)
        expect(hasJavascriptSchema('')).toBe(false)
        expect(hasJavascriptSchema(null)).toBe(false)
      })
    })
  })

  describe('buildUrl', () => {
    test('should build valid URL without query params', () => {
      const result = buildUrl('https://example.com/api')
      expect(result.url).toBe('https://example.com/api')
      expect(result.error).toBeNull()
    })

    test('should append query params', () => {
      const result = buildUrl('https://example.com/api', [
        { key: 'foo', value: 'bar', enabled: true },
        { key: 'baz', value: 'qux', enabled: true },
      ])
      expect(result.url).toContain('foo=bar')
      expect(result.url).toContain('baz=qux')
      expect(result.error).toBeNull()
    })

    test('should ignore disabled query params', () => {
      const result = buildUrl('https://example.com/api', [
        { key: 'foo', value: 'bar', enabled: false },
        { key: 'baz', value: 'qux', enabled: true },
      ])
      expect(result.url).not.toContain('foo=bar')
      expect(result.url).toContain('baz=qux')
    })

    test('should ignore empty key params', () => {
      const result = buildUrl('https://example.com/api', [
        { key: '', value: 'bar', enabled: true },
        { key: 'baz', value: 'qux', enabled: true },
      ])
      expect(result.url).not.toContain('=bar')
      expect(result.url).toContain('baz=qux')
    })

    test('should encode special characters in query values', () => {
      const result = buildUrl('https://example.com/api', [
        { key: 'q', value: 'hello world', enabled: true },
      ])
      expect(result.url).toContain('q=hello+world')
    })

    test('should return error for invalid URL', () => {
      const result = buildUrl('not-a-url')
      expect(result.error).toBe(ERROR_CODES.INVALID_URL)
    })

    test('should return error for empty URL', () => {
      const result = buildUrl('')
      expect(result.error).toBe(ERROR_CODES.INVALID_URL)
    })

    test('should return error for javascript: schema', () => {
      const result = buildUrl('javascript:alert(1)')
      expect(result.error).toBe(ERROR_CODES.JAVASCRIPT_SCHEMA_DETECTED)
    })
  })

  describe('buildHeaders', () => {
    test('should build headers from array', () => {
      const result = buildHeaders([
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Accept', value: 'application/json', enabled: true },
      ])
      expect(result.headers['Content-Type']).toBe('application/json')
      expect(result.headers['Accept']).toBe('application/json')
      expect(result.warnings).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    test('should ignore disabled headers', () => {
      const result = buildHeaders([
        { key: 'Content-Type', value: 'application/json', enabled: false },
        { key: 'Accept', value: 'application/json', enabled: true },
      ])
      expect(result.headers['Content-Type']).toBeUndefined()
      expect(result.headers['Accept']).toBe('application/json')
    })

    test('should warn about sensitive headers', () => {
      const result = buildHeaders([
        { key: 'Authorization', value: 'Bearer token', enabled: true },
      ])
      const warning = result.warnings.find((w) => w.reason === 'SENSITIVE')
      expect(warning).toBeDefined()
    })

    test('should warn about and ignore forbidden headers', () => {
      const result = buildHeaders([
        { key: 'Cookie', value: 'session=123', enabled: true },
      ])
      expect(result.headers['Cookie']).toBeUndefined()
      const warning = result.warnings.find((w) => w.reason === 'FORBIDDEN')
      expect(warning).toBeDefined()
    })

    test('should error on invalid header names', () => {
      const result = buildHeaders([
        { key: 'Invalid Header', value: 'value', enabled: true },
      ])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].reason).toBe('INVALID_NAME')
    })

    test('should return empty object for no headers', () => {
      const result = buildHeaders([])
      expect(result.headers).toEqual({})
      expect(result.warnings).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    test('should handle null input', () => {
      const result = buildHeaders(null)
      expect(result.headers).toEqual({})
    })
  })

  describe('buildJsonBody', () => {
    test('should accept valid JSON', () => {
      const result = buildJsonBody('{"foo": "bar"}')
      expect(result.body).toBe('{"foo": "bar"}')
      expect(result.error).toBeNull()
    })

    test('should return null for empty input', () => {
      const result = buildJsonBody('')
      expect(result.body).toBeNull()
      expect(result.error).toBeNull()
    })

    test('should return null for whitespace only', () => {
      const result = buildJsonBody('   \n  ')
      expect(result.body).toBeNull()
      expect(result.error).toBeNull()
    })

    test('should return error for invalid JSON', () => {
      const result = buildJsonBody('{foo: bar}')
      expect(result.body).toBeNull()
      expect(result.error).toBe(ERROR_CODES.INVALID_JSON)
    })

    test('should handle null input', () => {
      const result = buildJsonBody(null)
      expect(result.body).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  describe('buildFormUrlEncoded', () => {
    test('should build form url encoded body', () => {
      const result = buildFormUrlEncoded([
        { key: 'username', value: 'john', enabled: true },
        { key: 'password', value: 'secret', enabled: true },
      ])
      expect(result.body).toBe('username=john&password=secret')
    })

    test('should ignore disabled entries', () => {
      const result = buildFormUrlEncoded([
        { key: 'username', value: 'john', enabled: false },
        { key: 'password', value: 'secret', enabled: true },
      ])
      expect(result.body).toBe('password=secret')
    })

    test('should ignore empty key entries', () => {
      const result = buildFormUrlEncoded([
        { key: '', value: 'value', enabled: true },
        { key: 'password', value: 'secret', enabled: true },
      ])
      expect(result.body).toBe('password=secret')
    })

    test('should return null for empty params', () => {
      const result = buildFormUrlEncoded([])
      expect(result.body).toBeNull()
    })

    test('should encode special characters', () => {
      const result = buildFormUrlEncoded([
        { key: 'q', value: 'hello world', enabled: true },
      ])
      expect(result.body).toBe('q=hello+world')
    })
  })

  describe('buildFormData', () => {
    test('should build form data entries', () => {
      const result = buildFormData([
        { key: 'username', value: 'john', enabled: true },
        { key: 'password', value: 'secret', enabled: true },
      ])
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].key).toBe('username')
      expect(result.entries[0].value).toBe('john')
    })

    test('should ignore disabled entries', () => {
      const result = buildFormData([
        { key: 'username', value: 'john', enabled: false },
        { key: 'password', value: 'secret', enabled: true },
      ])
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].key).toBe('password')
    })

    test('should return empty entries for no params', () => {
      const result = buildFormData([])
      expect(result.entries).toEqual([])
    })
  })

  describe('buildFetchInit', () => {
    test('should build basic GET request', () => {
      const result = buildFetchInit({
        method: 'GET',
        url: 'https://example.com/api',
      })
      expect(result.url).toBe('https://example.com/api')
      expect(result.init.method).toBe('GET')
      expect(result.init.body).toBeUndefined()
      expect(result.errors).toHaveLength(0)
    })

    test('should build POST request with JSON body', () => {
      const result = buildFetchInit({
        method: 'POST',
        url: 'https://example.com/api',
        bodyMode: 'json',
        jsonBody: '{"foo": "bar"}',
      })
      expect(result.init.method).toBe('POST')
      expect(result.init.body).toBe('{"foo": "bar"}')
      expect(result.init.headers['Content-Type']).toBe('application/json')
    })

    test('should include query params in URL', () => {
      const result = buildFetchInit({
        method: 'GET',
        url: 'https://example.com/api',
        queryParams: [{ key: 'page', value: '1', enabled: true }],
      })
      expect(result.url).toContain('page=1')
    })

    test('should include headers', () => {
      const result = buildFetchInit({
        method: 'GET',
        url: 'https://example.com/api',
        headers: [{ key: 'X-Custom', value: 'value', enabled: true }],
      })
      expect(result.init.headers['X-Custom']).toBe('value')
    })

    test('should return error for invalid URL', () => {
      const result = buildFetchInit({
        method: 'GET',
        url: 'invalid-url',
      })
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_URL)
    })

    test('should return error for invalid JSON body', () => {
      const result = buildFetchInit({
        method: 'POST',
        url: 'https://example.com/api',
        bodyMode: 'json',
        jsonBody: '{invalid json}',
      })
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_JSON)
    })

    test('should not include body for GET request', () => {
      const result = buildFetchInit({
        method: 'GET',
        url: 'https://example.com/api',
        bodyMode: 'json',
        jsonBody: '{"foo": "bar"}',
      })
      expect(result.init.body).toBeUndefined()
    })

    test('should uppercase method', () => {
      const result = buildFetchInit({
        method: 'get',
        url: 'https://example.com/api',
      })
      expect(result.init.method).toBe('GET')
    })

    test('should build form url encoded body', () => {
      const result = buildFetchInit({
        method: 'POST',
        url: 'https://example.com/api',
        bodyMode: 'x-www-form-urlencoded',
        formUrlEncoded: [
          { key: 'username', value: 'john', enabled: true },
          { key: 'password', value: 'secret', enabled: true },
        ],
      })
      expect(result.init.body).toBe('username=john&password=secret')
      expect(result.init.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    })

    test('should add warnings for sensitive headers', () => {
      const result = buildFetchInit({
        method: 'GET',
        url: 'https://example.com/api',
        headers: [{ key: 'Authorization', value: 'Bearer token', enabled: true }],
      })
      expect(result.warnings).toHaveLength(1)
    })
  })

  describe('classifyFetchError', () => {
    test('should classify AbortError', () => {
      const error = new DOMException('The user aborted a request', 'AbortError')
      const result = classifyFetchError(error)
      expect(result.code).toBe(ERROR_CODES.ABORTED)
    })

    test('should classify TimeoutError', () => {
      const error = new DOMException('The operation timed out', 'TimeoutError')
      const result = classifyFetchError(error)
      expect(result.code).toBe(ERROR_CODES.TIMEOUT_ERROR)
    })

    test('should classify CORS error', () => {
      const error = new TypeError('Failed to fetch: CORS request blocked')
      const result = classifyFetchError(error)
      expect(result.code).toBe(ERROR_CODES.CORS_ERROR)
    })

    test('should classify network error', () => {
      const error = new TypeError('Failed to fetch')
      const result = classifyFetchError(error)
      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR)
    })

    test('should handle null input', () => {
      const result = classifyFetchError(null)
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
    })

    test('should handle unknown error types', () => {
      const error = new Error('Something weird happened')
      const result = classifyFetchError(error)
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
    })
  })

  describe('headersToObject', () => {
    test('should convert Headers object to plain object', () => {
      const headers = new Map([
        ['content-type', 'application/json'],
        ['x-custom', 'value'],
      ])
      const result = headersToObject({
        forEach: (callback) => headers.forEach((v, k) => callback(v, k)),
      })
      expect(result['content-type']).toBe('application/json')
      expect(result['x-custom']).toBe('value')
    })

    test('should handle plain object input', () => {
      const result = headersToObject({ 'Content-Type': 'application/json' })
      expect(result).toEqual({ 'Content-Type': 'application/json' })
    })

    test('should handle null input', () => {
      const result = headersToObject(null)
      expect(result).toEqual({})
    })
  })

  describe('parseContentType', () => {
    test('should parse basic content type', () => {
      const result = parseContentType('application/json')
      expect(result.type).toBe('application/json')
      expect(result.charset).toBeNull()
      expect(result.boundary).toBeNull()
    })

    test('should parse content type with charset', () => {
      const result = parseContentType('text/html; charset=utf-8')
      expect(result.type).toBe('text/html')
      expect(result.charset).toBe('utf-8')
    })

    test('should parse multipart content type with boundary', () => {
      const result = parseContentType('multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW')
      expect(result.type).toBe('multipart/form-data')
      expect(result.boundary).toBe('----webkitformboundary7ma4ywxktrzu0gw')
    })

    test('should handle null input', () => {
      const result = parseContentType(null)
      expect(result.type).toBeNull()
      expect(result.charset).toBeNull()
      expect(result.boundary).toBeNull()
    })
  })

  describe('isJsonContentType', () => {
    test('should recognize application/json', () => {
      expect(isJsonContentType('application/json')).toBe(true)
      expect(isJsonContentType('application/json; charset=utf-8')).toBe(true)
    })

    test('should recognize +json suffix', () => {
      expect(isJsonContentType('application/ld+json')).toBe(true)
      expect(isJsonContentType('application/vnd.api+json')).toBe(true)
    })

    test('should not recognize other content types', () => {
      expect(isJsonContentType('text/html')).toBe(false)
      expect(isJsonContentType('application/xml')).toBe(false)
    })
  })

  describe('isTextContentType', () => {
    test('should recognize text content types', () => {
      expect(isTextContentType('text/plain')).toBe(true)
      expect(isTextContentType('text/html')).toBe(true)
      expect(isTextContentType('text/css')).toBe(true)
    })

    test('should recognize JSON as text', () => {
      expect(isTextContentType('application/json')).toBe(true)
    })

    test('should recognize XML as text', () => {
      expect(isTextContentType('application/xml')).toBe(true)
    })

    test('should return true for null (assume text)', () => {
      expect(isTextContentType(null)).toBe(true)
    })
  })

  describe('tryParseJson', () => {
    test('should parse valid JSON', () => {
      const result = tryParseJson('{"foo": "bar", "num": 123}')
      expect(result.json).toEqual({ foo: 'bar', num: 123 })
      expect(result.error).toBeNull()
    })

    test('should return error for invalid JSON', () => {
      const result = tryParseJson('{invalid json}')
      expect(result.json).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe(ERROR_CODES.BODY_PARSE_ERROR)
    })

    test('should handle empty string', () => {
      const result = tryParseJson('')
      expect(result.json).toBeNull()
      expect(result.error).toBeNull()
    })

    test('should handle null input', () => {
      const result = tryParseJson(null)
      expect(result.json).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  describe('summarizeResponse', () => {
    test('should summarize successful response', () => {
      const mockHeaders = new Map([
        ['content-type', 'application/json'],
        ['x-custom', 'value'],
      ])
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          forEach: (callback) => mockHeaders.forEach((v, k) => callback(v, k)),
          get: (key) => mockHeaders.get(key.toLowerCase()),
        },
        type: 'basic',
        redirected: false,
      }

      const result = summarizeResponse({
        response: mockResponse,
        bodyText: '{"success": true}',
        durationMs: 123,
      })

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.statusText).toBe('OK')
      expect(result.durationMs).toBe(123)
      expect(result.isJson).toBe(true)
      expect(result.body.json).toEqual({ success: true })
    })

    test('should parse JSON body when content-type is json', () => {
      const mockHeaders = new Map([
        ['content-type', 'application/json'],
      ])
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          forEach: (callback) => mockHeaders.forEach((v, k) => callback(v, k)),
          get: (key) => mockHeaders.get(key.toLowerCase()),
        },
        type: 'basic',
        redirected: false,
      }

      const result = summarizeResponse({
        response: mockResponse,
        bodyText: '{"key": "value"}',
      })

      expect(result.body.json).toEqual({ key: 'value' })
    })

    test('should handle null response', () => {
      const result = summarizeResponse(null)
      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
    })

    test('should indicate CORS limitations for cors response type', () => {
      const mockHeaders = new Map([
        ['content-type', 'application/json'],
        ['x-custom-header', 'custom-value'],
      ])
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          forEach: (callback) => mockHeaders.forEach((v, k) => callback(v, k)),
          get: (key) => mockHeaders.get(key.toLowerCase()),
        },
        type: 'cors',
        redirected: false,
      }

      const result = summarizeResponse({
        response: mockResponse,
      })

      expect(result.hiddenHeaders).toContain('x-custom-header')
      expect(result.corsLimitations.length).toBeGreaterThan(0)
    })
  })

  describe('buildHarEntry', () => {
    test('should build valid HAR entry', () => {
      const params = {
        url: 'https://example.com/api',
        init: {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        },
      }

      const responseSummary = {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        body: { size: 100, text: '{}' },
        contentType: 'application/json',
      }

      const startTime = Date.now()
      const endTime = startTime + 150

      const entry = buildHarEntry(params, responseSummary, startTime, endTime)

      expect(entry.request.method).toBe('GET')
      expect(entry.request.url).toBe('https://example.com/api')
      expect(entry.response.status).toBe(200)
      expect(entry.response.statusText).toBe('OK')
      expect(entry.time).toBe(150)
      expect(entry.response.bodySize).toBe(100)
    })
  })

  describe('exportHar', () => {
    test('should export complete HAR structure', () => {
      const params = {
        url: 'https://example.com/api',
        init: { method: 'GET', headers: {} },
      }

      const responseSummary = {
        status: 200,
        statusText: 'OK',
        headers: {},
        body: { size: 0, text: '' },
      }

      const startTime = Date.now()
      const endTime = startTime + 100

      const har = exportHar(params, responseSummary, startTime, endTime)

      expect(har.log).toBeDefined()
      expect(har.log.version).toBe('1.2')
      expect(har.log.creator.name).toBe('HTTP Request Playground')
      expect(har.log.entries).toHaveLength(1)
    })
  })

  describe('formatDuration', () => {
    test('should format milliseconds', () => {
      expect(formatDuration(123)).toBe('123ms')
    })

    test('should format seconds', () => {
      expect(formatDuration(1500)).toBe('1.50s')
    })

    test('should format zero', () => {
      expect(formatDuration(0)).toBe('0ms')
    })
  })

  describe('getStatusCategory', () => {
    test('should categorize 1xx as info', () => {
      expect(getStatusCategory(100)).toBe('info')
      expect(getStatusCategory(101)).toBe('info')
    })

    test('should categorize 2xx as success', () => {
      expect(getStatusCategory(200)).toBe('success')
      expect(getStatusCategory(201)).toBe('success')
      expect(getStatusCategory(204)).toBe('success')
    })

    test('should categorize 3xx as redirect', () => {
      expect(getStatusCategory(301)).toBe('redirect')
      expect(getStatusCategory(302)).toBe('redirect')
    })

    test('should categorize 4xx as client-error', () => {
      expect(getStatusCategory(400)).toBe('client-error')
      expect(getStatusCategory(404)).toBe('client-error')
    })

    test('should categorize 5xx as server-error', () => {
      expect(getStatusCategory(500)).toBe('server-error')
      expect(getStatusCategory(503)).toBe('server-error')
    })

    test('should categorize unknown status', () => {
      expect(getStatusCategory(0)).toBe('unknown')
      expect(getStatusCategory(999)).toBe('unknown')
    })
  })

  describe('getErrorMessage', () => {
    test('should return correct message for known codes', () => {
      expect(getErrorMessage(ERROR_CODES.CORS_ERROR)).toBe(ERROR_MESSAGES[ERROR_CODES.CORS_ERROR])
      expect(getErrorMessage(ERROR_CODES.ABORTED)).toBe(ERROR_MESSAGES[ERROR_CODES.ABORTED])
    })

    test('should return default message for unknown codes', () => {
      const message = getErrorMessage('UNKNOWN_CODE')
      expect(message).toBe(ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR])
    })
  })

  describe('getPresetTemplates', () => {
    test('should return array of templates', () => {
      const templates = getPresetTemplates()
      expect(templates).toBeInstanceOf(Array)
      expect(templates.length).toBeGreaterThan(0)
    })

    test('should return copy of templates', () => {
      const templates1 = getPresetTemplates()
      const templates2 = getPresetTemplates()
      expect(templates1).not.toBe(templates2)
    })

    test('should include GET JSON API template', () => {
      const templates = getPresetTemplates()
      const getJson = templates.find((t) => t.id === 'get-json')
      expect(getJson).toBeDefined()
      expect(getJson.params.method).toBe('GET')
    })

    test('should include POST JSON template', () => {
      const templates = getPresetTemplates()
      const postJson = templates.find((t) => t.id === 'post-json')
      expect(postJson).toBeDefined()
      expect(postJson.params.method).toBe('POST')
      expect(postJson.params.bodyMode).toBe('json')
    })
  })

  describe('getDefaultParams', () => {
    test('should return default params object', () => {
      const params = getDefaultParams()
      expect(params.method).toBe('GET')
      expect(params.url).toBe('')
      expect(params.timeout).toBe(30000)
      expect(params.bodyMode).toBe('none')
    })

    test('should return a new copy each time', () => {
      const params1 = getDefaultParams()
      const params2 = getDefaultParams()
      expect(params1).not.toBe(params2)
    })
  })
})
