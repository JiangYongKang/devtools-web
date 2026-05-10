
import { describe, test, expect } from 'vitest'
import { stripJsonComments, ApiError, INDENT_TYPE_OPTIONS, INDENT_WIDTH_OPTIONS, SEARCH_TARGET_OPTIONS, MATCH_MODE_OPTIONS } from '../jsonApi.js'

describe('jsonApi', () => {
  describe('stripJsonComments', () => {
    test('should return original value for non-string input', () => {
      expect(stripJsonComments(null)).toBeNull()
      expect(stripJsonComments(undefined)).toBeUndefined()
      expect(stripJsonComments(123)).toBe(123)
      expect(stripJsonComments({})).toEqual({})
      expect(stripJsonComments('')).toBe('')
    })

    test('should remove single-line comments', () => {
      const input = `{
        "name": "test", // this is a comment
        "value": 123
      }`
      const expected = `{
        "name": "test", 
        "value": 123
      }`
      expect(stripJsonComments(input)).toBe(expected)
    })

    test('should remove multi-line comments', () => {
      const input = `{
        /* this is a
           multi-line comment */
        "name": "test"
      }`
      const result = stripJsonComments(input)
      expect(result).toContain('"name": "test"')
      expect(result).not.toContain('this is a')
      expect(result).not.toContain('multi-line comment')
    })

    test('should not remove content inside strings', () => {
      const input = `{
        "url": "http://example.com",
        "text": "this // is not a comment",
        "code": "/* also not a comment */"
      }`
      const expected = `{
        "url": "http://example.com",
        "text": "this // is not a comment",
        "code": "/* also not a comment */"
      }`
      expect(stripJsonComments(input)).toBe(expected)
    })

    test('should handle escaped quotes correctly', () => {
      const input = `{
        "text": "this is a \\"quote\\" // not a comment",
        "value": 42
      }`
      const expected = `{
        "text": "this is a \\"quote\\" // not a comment",
        "value": 42
      }`
      expect(stripJsonComments(input)).toBe(expected)
    })

    test('should handle single quotes', () => {
      const input = `{
        'text': 'this // is not a comment',
        "value": 42
      }`
      const expected = `{
        'text': 'this // is not a comment',
        "value": 42
      }`
      expect(stripJsonComments(input)).toBe(expected)
    })

    test('should handle mixed comments', () => {
      const input = `{
        // single line comment
        "name": "test", /* inline comment */
        "value": 123
      }`
      const expected = `{
        
        "name": "test", 
        "value": 123
      }`
      expect(stripJsonComments(input)).toBe(expected)
    })

    test('should handle JSON with no comments', () => {
      const input = `{
        "name": "test",
        "value": 123
      }`
      expect(stripJsonComments(input)).toBe(input)
    })
  })

  describe('ApiError', () => {
    test('should create ApiError with errorCode only', () => {
      const error = new ApiError('TEST_ERROR')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBeUndefined()
      expect(error.message).toBe('TEST_ERROR')
      expect(error.nodePath).toBe('')
    })

    test('should create ApiError with errorCode and errorMessage', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBe('Test error message')
      expect(error.message).toBe('Test error message')
      expect(error.nodePath).toBe('')
    })

    test('should create ApiError with all parameters', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message', '/test/path')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBe('Test error message')
      expect(error.message).toBe('Test error message')
      expect(error.nodePath).toBe('/test/path')
    })

    test('should be instance of Error', () => {
      const error = new ApiError('TEST_ERROR')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('Options constants', () => {
    test('INDENT_TYPE_OPTIONS should have correct values', () => {
      expect(INDENT_TYPE_OPTIONS).toHaveLength(2)
      expect(INDENT_TYPE_OPTIONS[0]).toEqual({ value: 'SPACE', label: '空格 (SPACE)' })
      expect(INDENT_TYPE_OPTIONS[1]).toEqual({ value: 'TAB', label: '制表符 (TAB)' })
    })

    test('INDENT_WIDTH_OPTIONS should have correct values', () => {
      expect(INDENT_WIDTH_OPTIONS).toHaveLength(8)
      expect(INDENT_WIDTH_OPTIONS[0]).toEqual({ value: 1, label: '1' })
      expect(INDENT_WIDTH_OPTIONS[1]).toEqual({ value: 2, label: '2 (默认)' })
    })

    test('SEARCH_TARGET_OPTIONS should have correct values', () => {
      expect(SEARCH_TARGET_OPTIONS).toHaveLength(2)
      expect(SEARCH_TARGET_OPTIONS[0]).toEqual({ value: 'KEY', label: '按键名搜索 (KEY)' })
      expect(SEARCH_TARGET_OPTIONS[1]).toEqual({ value: 'VALUE', label: '按标量值搜索 (VALUE)' })
    })

    test('MATCH_MODE_OPTIONS should have correct values', () => {
      expect(MATCH_MODE_OPTIONS).toHaveLength(2)
      expect(MATCH_MODE_OPTIONS[0]).toEqual({ value: 'SUBSTRING', label: '子串匹配 (SUBSTRING)' })
      expect(MATCH_MODE_OPTIONS[1]).toEqual({ value: 'EXACT', label: '精确匹配 (EXACT)' })
    })
  })
})
