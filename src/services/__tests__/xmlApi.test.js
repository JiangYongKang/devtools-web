
import { describe, test, expect } from 'vitest'
import { ApiError, INDENT_TYPE_OPTIONS, INDENT_WIDTH_OPTIONS, DECLARATION_POLICY_OPTIONS, COMMENT_POLICY_OPTIONS } from '../xmlApi.js'

describe('xmlApi', () => {
  describe('ApiError', () => {
    test('should create ApiError with errorCode only', () => {
      const error = new ApiError('TEST_ERROR')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBeUndefined()
      expect(error.message).toBe('TEST_ERROR')
      expect(error.nodePath).toBe('')
      expect(error.lineNumber).toBeUndefined()
      expect(error.columnNumber).toBeUndefined()
    })

    test('should create ApiError with errorCode and errorMessage', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBe('Test error message')
      expect(error.message).toBe('Test error message')
      expect(error.nodePath).toBe('')
      expect(error.lineNumber).toBeUndefined()
      expect(error.columnNumber).toBeUndefined()
    })

    test('should create ApiError with nodePath', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message', '/test/path')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBe('Test error message')
      expect(error.message).toBe('Test error message')
      expect(error.nodePath).toBe('/test/path')
      expect(error.lineNumber).toBeUndefined()
      expect(error.columnNumber).toBeUndefined()
    })

    test('should create ApiError with all parameters', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message', '/test/path', 10, 5)
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBe('Test error message')
      expect(error.message).toBe('Test error message')
      expect(error.nodePath).toBe('/test/path')
      expect(error.lineNumber).toBe(10)
      expect(error.columnNumber).toBe(5)
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

    test('DECLARATION_POLICY_OPTIONS should have correct values', () => {
      expect(DECLARATION_POLICY_OPTIONS).toHaveLength(3)
      expect(DECLARATION_POLICY_OPTIONS[0]).toEqual({ value: 'KEEP', label: '保留原声明 (KEEP)' })
      expect(DECLARATION_POLICY_OPTIONS[1]).toEqual({ value: 'REMOVE', label: '移除声明 (REMOVE)' })
      expect(DECLARATION_POLICY_OPTIONS[2]).toEqual({ value: 'REWRITE', label: '重写为 UTF-8 (REWRITE)' })
    })

    test('COMMENT_POLICY_OPTIONS should have correct values', () => {
      expect(COMMENT_POLICY_OPTIONS).toHaveLength(2)
      expect(COMMENT_POLICY_OPTIONS[0]).toEqual({ value: 'KEEP', label: '保留注释 (KEEP)' })
      expect(COMMENT_POLICY_OPTIONS[1]).toEqual({ value: 'REMOVE', label: '移除注释 (REMOVE)' })
    })
  })
})
