import { describe, expect, test } from 'vitest'
import {
  normalizeBaseURL,
  joinURL,
  isAbsoluteURL,
  buildFullURL,
  serializeQueryParams,
  parseQueryString,
} from '../logic/url.js'
import { QUERY_ARRAY_FORMATS } from '../logic/constants.js'

describe('url module', () => {
  describe('normalizeBaseURL', () => {
    test('should return null for null/undefined', () => {
      expect(normalizeBaseURL(null)).toBeNull()
      expect(normalizeBaseURL(undefined)).toBeNull()
    })

    test('should normalize double slashes', () => {
      expect(normalizeBaseURL('https://api.example.com//api//v1/')).toBe('https://api.example.com/api/v1')
    })

    test('should normalize backslashes', () => {
      expect(normalizeBaseURL('https://api.example.com\\\\api\\\\v1\\\\')).toBe('https://api.example.com/api/v1')
    })

    test('should normalize mixed slashes', () => {
      expect(normalizeBaseURL('https://api.example.com/api\\\\v1//users/')).toBe('https://api.example.com/api/v1/users')
    })

    test('should remove trailing slash', () => {
      expect(normalizeBaseURL('https://api.example.com/')).toBe('https://api.example.com')
    })

    test('should return null for invalid URLs', () => {
      expect(normalizeBaseURL('not a url')).toBeNull()
      expect(normalizeBaseURL('')).toBeNull()
    })

    test('should not touch protocol slashes', () => {
      expect(normalizeBaseURL('http://localhost:3000')).toBe('http://localhost:3000')
      expect(normalizeBaseURL('https://api.example.com')).toBe('https://api.example.com')
    })
  })

  describe('joinURL', () => {
    test('should join baseURL and path', () => {
      expect(joinURL('https://api.example.com', 'users')).toBe('https://api.example.com/users')
    })

    test('should handle path with leading slash', () => {
      expect(joinURL('https://api.example.com', '/users')).toBe('https://api.example.com/users')
    })

    test('should handle baseURL with trailing slash', () => {
      expect(joinURL('https://api.example.com/', 'users')).toBe('https://api.example.com/users')
    })

    test('should normalize double slashes in path', () => {
      expect(joinURL('https://api.example.com', '//users//123//')).toBe('https://api.example.com/users/123')
    })

    test('should normalize backslashes in path', () => {
      expect(joinURL('https://api.example.com', 'users\\\\123')).toBe('https://api.example.com/users/123')
    })

    test('should throw error for invalid baseURL', () => {
      expect(() => joinURL('invalid', 'users')).toThrow()
    })
  })

  describe('isAbsoluteURL', () => {
    test('should detect absolute URLs', () => {
      expect(isAbsoluteURL('https://api.example.com')).toBe(true)
      expect(isAbsoluteURL('http://localhost:3000')).toBe(true)
      expect(isAbsoluteURL('ftp://files.example.com')).toBe(true)
    })

    test('should detect relative URLs', () => {
      expect(isAbsoluteURL('/users')).toBe(false)
      expect(isAbsoluteURL('users/123')).toBe(false)
      expect(isAbsoluteURL('./api/users')).toBe(false)
      expect(isAbsoluteURL('../users')).toBe(false)
    })

    test('should handle null/undefined', () => {
      expect(isAbsoluteURL(null)).toBe(false)
      expect(isAbsoluteURL(undefined)).toBe(false)
    })
  })

  describe('buildFullURL', () => {
    test('should build URL with base and path', () => {
      expect(buildFullURL('https://api.example.com', 'users')).toBe('https://api.example.com/users')
    })

    test('should use absolute URL directly', () => {
      expect(buildFullURL('https://api.example.com', 'https://other.com/api')).toBe('https://other.com/api')
    })

    test('should append query params', () => {
      const url = buildFullURL('https://api.example.com', 'users', { page: 1, limit: 10 })
      expect(url).toContain('https://api.example.com/users')
      expect(url).toContain('page=1')
      expect(url).toContain('limit=10')
    })

    test('should handle existing query params', () => {
      const url = buildFullURL('https://api.example.com/users?existing=true', '', { new: 'value' })
      expect(url).toContain('existing=true')
      expect(url).toContain('new=value')
    })
  })

  describe('serializeQueryParams', () => {
    test('should serialize simple params', () => {
      const result = serializeQueryParams({ foo: 'bar', hello: 'world' })
      expect(result).toContain('foo=bar')
      expect(result).toContain('hello=world')
    })

    test('should encode special characters', () => {
      const result = serializeQueryParams({ q: 'hello world', special: '&=' })
      expect(result).toContain('q=hello%20world')
      expect(result).toContain('special=%26%3D')
    })

    test('should skip null/undefined values', () => {
      const result = serializeQueryParams({ a: 'a', b: null, c: undefined })
      expect(result).toBe('a=a')
    })

    test('should serialize nested objects', () => {
      const result = serializeQueryParams({ user: { name: 'John', age: 30 } })
      expect(result).toContain('user%5Bname%5D=John')
      expect(result).toContain('user%5Bage%5D=30')
    })

    test('should serialize arrays with brackets format (default)', () => {
      const result = serializeQueryParams({ tags: ['js', 'react', 'node'] })
      expect(result).toBe('tags%5B%5D=js&tags%5B%5D=react&tags%5B%5D=node')
    })

    test('should serialize arrays with indices format', () => {
      const result = serializeQueryParams({ tags: ['js', 'react'] }, { arrayFormat: QUERY_ARRAY_FORMATS.INDICES })
      expect(result).toBe('tags%5B0%5D=js&tags%5B1%5D=react')
    })

    test('should serialize arrays with repeat format', () => {
      const result = serializeQueryParams({ tags: ['js', 'react'] }, { arrayFormat: QUERY_ARRAY_FORMATS.REPEAT })
      expect(result).toBe('tags=js&tags=react')
    })

    test('should serialize arrays with comma format', () => {
      const result = serializeQueryParams({ tags: ['js', 'react'] }, { arrayFormat: QUERY_ARRAY_FORMATS.COMMA })
      expect(result).toBe('tags=js%2Creact')
    })

    test('should serialize dates', () => {
      const date = new Date('2023-01-15T12:00:00.000Z')
      const result = serializeQueryParams({ date })
      expect(result).toContain(encodeURIComponent(date.toISOString()))
    })

    test('should handle empty object', () => {
      expect(serializeQueryParams({})).toBe('')
    })

    test('should handle null/undefined', () => {
      expect(serializeQueryParams(null)).toBe('')
      expect(serializeQueryParams(undefined)).toBe('')
    })
  })

  describe('parseQueryString', () => {
    test('should parse simple params', () => {
      const result = parseQueryString('foo=bar&hello=world')
      expect(result.foo).toBe('bar')
      expect(result.hello).toBe('world')
    })

    test('should handle leading ?', () => {
      const result = parseQueryString('?foo=bar')
      expect(result.foo).toBe('bar')
    })

    test('should parse empty string to empty object', () => {
      expect(parseQueryString('')).toEqual({})
      expect(parseQueryString('?')).toEqual({})
    })

    test('should handle empty values', () => {
      const result = parseQueryString('foo=&bar')
      expect(result.foo).toBe('')
      expect(result.bar).toBe('')
    })

    test('should decode URL encoded values', () => {
      const result = parseQueryString('q=hello%20world&special=%26%3D')
      expect(result.q).toBe('hello world')
      expect(result.special).toBe('&=')
    })
  })
})
