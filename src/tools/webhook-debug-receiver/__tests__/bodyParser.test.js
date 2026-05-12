import { describe, test, expect } from 'vitest'
import {
  parseBody,
  parseJsonBody,
  parseFormUrlEncoded,
  parseMultipartBody,
  parseTextBody,
} from '../logic/bodyParser.js'
import { EVENT_ERROR_CODES, CONTENT_TYPES } from '../logic/constants.js'

describe('bodyParser', () => {
  describe('parseBody', () => {
    test('should delegate to JSON parser', () => {
      const result = parseBody('{"key": "value"}', 'application/json')
      expect(result.type).toBe(CONTENT_TYPES.JSON)
      expect(result.error).toBeNull()
      expect(result.parsed).toEqual({ key: 'value' })
    })

    test('should delegate to form-urlencoded parser', () => {
      const result = parseBody('key=value&foo=bar', 'application/x-www-form-urlencoded')
      expect(result.type).toBe(CONTENT_TYPES.FORM_URLENCODED)
      expect(result.error).toBeNull()
    })

    test('should delegate to multipart parser', () => {
      const boundary = '----WebKitFormBoundary'
      const contentType = `multipart/form-data; boundary=${boundary}`
      const body = `------${boundary}
Content-Disposition: form-data; name="field"

value
------${boundary}--`

      const result = parseBody(body, contentType)
      expect(result.type).toBe(CONTENT_TYPES.MULTIPART_FORM_DATA)
    })

    test('should default to text parser', () => {
      const result = parseBody('Hello World', 'application/octet-stream')
      expect(result.type).toBe(CONTENT_TYPES.TEXT_PLAIN)
      expect(result.parsed).toBe('Hello World')
    })
  })

  describe('parseJsonBody', () => {
    test('should parse valid JSON object', () => {
      const result = parseJsonBody('{"name": "test", "value": 123}')

      expect(result.error).toBeNull()
      expect(result.type).toBe(CONTENT_TYPES.JSON)
      expect(result.parsed).toEqual({ name: 'test', value: 123 })
      expect(result.beautified).toBeDefined()
    })

    test('should parse valid JSON array', () => {
      const result = parseJsonBody('[1, 2, 3, "four"]')

      expect(result.error).toBeNull()
      expect(result.parsed).toEqual([1, 2, 3, 'four'])
    })

    test('should parse null value', () => {
      const result = parseJsonBody('null')
      expect(result.error).toBeNull()
      expect(result.parsed).toBeNull()
    })

    test('should parse boolean values', () => {
      const result = parseJsonBody('{"active": true, "deleted": false}')
      expect(result.parsed.active).toBe(true)
      expect(result.parsed.deleted).toBe(false)
    })

    test('should return error for invalid JSON', () => {
      const result = parseJsonBody('{invalid json')

      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(EVENT_ERROR_CODES.INVALID_JSON)
      expect(result.parsed).toBeNull()
    })

    test('should return error for empty body', () => {
      const result = parseJsonBody('')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(EVENT_ERROR_CODES.EMPTY_BODY)
    })

    test('should handle whitespace in JSON', () => {
      const json = `  {
    "key": "value"
  }  `

      const result = parseJsonBody(json)
      expect(result.error).toBeNull()
      expect(result.parsed).toEqual({ key: 'value' })
    })

    test('should generate preview for object', () => {
      const result = parseJsonBody('{"a": 1, "b": 2, "c": 3, "d": 4}')
      expect(result.preview).toContain('{')
      expect(result.preview).toContain('a')
    })

    test('should generate preview for array', () => {
      const result = parseJsonBody('[1, 2, 3, 4, 5]')
      expect(result.preview).toContain('Array')
    })

    test('should truncate long string in preview', () => {
      const longStr = 'x'.repeat(100)
      const result = parseJsonBody(`"${longStr}"`)
      expect(result.preview.length).toBeLessThan(100)
    })
  })

  describe('parseFormUrlEncoded', () => {
    test('should parse simple key-value pairs', () => {
      const result = parseFormUrlEncoded('name=John&email=john%40example.com')

      expect(result.error).toBeNull()
      expect(result.parsed.name).toBe('John')
      expect(result.parsed.email).toBe('john@example.com')
    })

    test('should handle URL-encoded values', () => {
      const result = parseFormUrlEncoded('message=Hello%2C+World%21')
      expect(result.parsed.message).toBe('Hello, World!')
    })

    test('should handle plus signs as spaces', () => {
      const result = parseFormUrlEncoded('name=John+Doe')
      expect(result.parsed.name).toBe('John Doe')
    })

    test('should handle empty value', () => {
      const result = parseFormUrlEncoded('key=&foo=bar')
      expect(result.parsed.key).toBe('')
      expect(result.parsed.foo).toBe('bar')
    })

    test('should handle missing value', () => {
      const result = parseFormUrlEncoded('key')
      expect(result.parsed.key).toBe('')
    })

    test('should handle multiple values for same key', () => {
      const result = parseFormUrlEncoded('tag=tag1&tag=tag2&tag=tag3')
      expect(result.parsed.tag).toEqual(['tag1', 'tag2', 'tag3'])
    })

    test('should handle special characters', () => {
      const result = parseFormUrlEncoded('path=%2Fhome%2Fuser%2Fdocs')
      expect(result.parsed.path).toBe('/home/user/docs')
    })

    test('should return error for empty body', () => {
      const result = parseFormUrlEncoded('')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(EVENT_ERROR_CODES.EMPTY_BODY)
    })

    test('should generate preview', () => {
      const result = parseFormUrlEncoded('a=1&b=2&c=3&d=4')
      expect(result.preview).toContain('a')
      expect(result.preview).toContain('b')
    })
  })

  describe('parseMultipartBody', () => {
    const boundary = '----TestBoundary'

    test('should parse simple multipart form', () => {
      const body = `--${boundary}
Content-Disposition: form-data; name="field1"

value1
--${boundary}
Content-Disposition: form-data; name="field2"

value2
--${boundary}--`

      const contentType = `multipart/form-data; boundary=${boundary}`
      const result = parseMultipartBody(body, contentType)

      expect(result.error).toBeNull()
      expect(result.parsed.length).toBe(2)
      expect(result.parsed[0].name).toBe('field1')
      expect(result.parsed[0].body).toBe('value1')
      expect(result.parsed[1].name).toBe('field2')
    })

    test('should parse file upload with filename', () => {
      const body = `--${boundary}
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

File content
--${boundary}--`

      const contentType = `multipart/form-data; boundary=${boundary}`
      const result = parseMultipartBody(body, contentType)

      expect(result.error).toBeNull()
      expect(result.parsed.length).toBe(1)
      expect(result.parsed[0].name).toBe('file')
      expect(result.parsed[0].filename).toBe('test.txt')
      expect(result.parsed[0].contentType).toBe('text/plain')
    })

    test('should return error for missing boundary', () => {
      const result = parseMultipartBody('test', 'multipart/form-data')
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(EVENT_ERROR_CODES.INVALID_MULTIPART)
    })

    test('should return error for empty body', () => {
      const result = parseMultipartBody('', `multipart/form-data; boundary=${boundary}`)
      expect(result.error).toBeDefined()
      expect(result.error.errorCode).toBe(EVENT_ERROR_CODES.EMPTY_BODY)
    })

    test('should generate preview', () => {
      const body = `------${boundary}
Content-Disposition: form-data; name="a"

1
------${boundary}
Content-Disposition: form-data; name="b"

2
------${boundary}
Content-Disposition: form-data; name="c"

3
------${boundary}--`

      const contentType = `multipart/form-data; boundary=${boundary}`
      const result = parseMultipartBody(body, contentType)

      expect(result.preview).toContain('3 part(s)')
      expect(result.preview).toContain('a')
    })
  })

  describe('parseTextBody', () => {
    test('should parse simple text', () => {
      const result = parseTextBody('Hello World')
      expect(result.type).toBe(CONTENT_TYPES.TEXT_PLAIN)
      expect(result.parsed).toBe('Hello World')
      expect(result.error).toBeNull()
    })

    test('should handle empty string', () => {
      const result = parseTextBody('')
      expect(result.parsed).toBe('')
      expect(result.error).toBeNull()
    })

    test('should generate hex representation', () => {
      const result = parseTextBody('AB')
      expect(result.hexString).toBe('41 42')
    })

    test('should handle special characters in hex', () => {
      const result = parseTextBody('\n\t')
      expect(result.hexString).toBe('0A 09')
    })

    test('should truncate hex to 1024 bytes', () => {
      const longText = 'x'.repeat(2000)
      const result = parseTextBody(longText)
      expect(result.hexString.split(' ').length).toBeLessThanOrEqual(1024)
    })

    test('should generate preview', () => {
      const result = parseTextBody('Short text')
      expect(result.preview).toBe('Short text')
    })

    test('should truncate long preview', () => {
      const longText = 'x'.repeat(200)
      const result = parseTextBody(longText)
      expect(result.preview.length).toBeLessThan(100)
    })
  })
})
