
import { describe, test, expect } from 'vitest'
import { ApiError, STYLE_OPTIONS, CHARSET_OPTIONS, ERROR_CODE_MESSAGES } from '../urlApi.js'

describe('urlApi', () => {
  describe('ApiError', () => {
    test('should create ApiError with errorCode only', () => {
      const error = new ApiError('TEST_ERROR')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBeUndefined()
      expect(error.message).toBe('TEST_ERROR')
      expect(error.payload).toBeNull()
    })

    test('should create ApiError with errorCode and errorMessage', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBe('Test error message')
      expect(error.message).toBe('Test error message')
      expect(error.payload).toBeNull()
    })

    test('should create ApiError with all parameters', () => {
      const testPayload = { test: 'data' }
      const error = new ApiError('TEST_ERROR', 'Test error message', testPayload)
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBe('Test error message')
      expect(error.message).toBe('Test error message')
      expect(error.payload).toBe(testPayload)
    })

    test('should be instance of Error', () => {
      const error = new ApiError('TEST_ERROR')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('Options constants', () => {
    test('STYLE_OPTIONS should have correct values', () => {
      expect(STYLE_OPTIONS).toHaveLength(2)
      expect(STYLE_OPTIONS[0]).toEqual({ value: 'URI_COMPONENT', label: 'URI 组件 (URI_COMPONENT) - 空格为 %20' })
      expect(STYLE_OPTIONS[1]).toEqual({ value: 'FORM', label: '表单 (FORM) - 空格为 +，适用于 application/x-www-form-urlencoded' })
    })

    test('CHARSET_OPTIONS should have correct values', () => {
      expect(CHARSET_OPTIONS).toHaveLength(7)
      expect(CHARSET_OPTIONS[0]).toEqual({ value: 'UTF-8', label: 'UTF-8 (默认)' })
      expect(CHARSET_OPTIONS[1]).toEqual({ value: 'ISO-8859-1', label: 'ISO-8859-1 (Latin-1)' })
    })
  })

  describe('ERROR_CODE_MESSAGES', () => {
    test('should contain all expected error codes', () => {
      expect(ERROR_CODE_MESSAGES.NULL_INPUT).toBe('输入不能为空（text 字段为 null 或未提供）')
      expect(ERROR_CODE_MESSAGES.INVALID_CHARSET).toBe('无效的字符集名称')
      expect(ERROR_CODE_MESSAGES.INVALID_ACTION).toBe('无效的操作类型（仅支持 ENCODE / DECODE）')
      expect(ERROR_CODE_MESSAGES.ENCODE_FAILED).toBe('编码失败')
      expect(ERROR_CODE_MESSAGES.DECODE_FAILED).toBe('解码失败')
      expect(ERROR_CODE_MESSAGES.INVALID_PERCENT_SEQUENCE).toBe('无效的百分号序列（不完整 % 或非十六进制字符）')
      expect(ERROR_CODE_MESSAGES.INVALID_UTF8_SEQUENCE).toBe('无效的 UTF-8 字节序列')
      expect(ERROR_CODE_MESSAGES.HTTP_ERROR).toBe('网络请求失败')
      expect(ERROR_CODE_MESSAGES.UNKNOWN_ERROR).toBe('未知错误')
    })
  })
})
