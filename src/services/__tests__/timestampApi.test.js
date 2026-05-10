
import { describe, test, expect } from 'vitest'
import { ApiError, GRANULARITY_OPTIONS, FORMAT_PATTERN_OPTIONS, TIMEZONE_OPTIONS } from '../timestampApi.js'

describe('timestampApi', () => {
  describe('ApiError', () => {
    test('should create ApiError with errorCode only', () => {
      const error = new ApiError('TEST_ERROR')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBeUndefined()
      expect(error.message).toBe('TEST_ERROR')
    })

    test('should create ApiError with errorCode and errorMessage', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message')
      expect(error.name).toBe('ApiError')
      expect(error.errorCode).toBe('TEST_ERROR')
      expect(error.errorMessage).toBe('Test error message')
      expect(error.message).toBe('Test error message')
    })

    test('should be instance of Error', () => {
      const error = new ApiError('TEST_ERROR')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('Options constants', () => {
    test('GRANULARITY_OPTIONS should have correct values', () => {
      expect(GRANULARITY_OPTIONS).toHaveLength(2)
      expect(GRANULARITY_OPTIONS[0]).toEqual({ value: 'SECONDS', label: '秒级 (s)' })
      expect(GRANULARITY_OPTIONS[1]).toEqual({ value: 'MILLISECONDS', label: '毫秒级 (ms)' })
    })

    test('FORMAT_PATTERN_OPTIONS should have correct values', () => {
      expect(FORMAT_PATTERN_OPTIONS).toHaveLength(2)
      expect(FORMAT_PATTERN_OPTIONS[0]).toEqual({ value: 'YYYY-mm-dd HH:mm:ss', label: 'YYYY-mm-dd HH:mm:ss' })
      expect(FORMAT_PATTERN_OPTIONS[1]).toEqual({ value: 'YYYY/mm/dd HH:mm:ss', label: 'YYYY/mm/dd HH:mm:ss' })
    })

    test('TIMEZONE_OPTIONS should have correct values', () => {
      expect(TIMEZONE_OPTIONS).toHaveLength(19)
      expect(TIMEZONE_OPTIONS[0]).toEqual({ value: 'UTC', label: 'UTC (协调世界时)' })
      expect(TIMEZONE_OPTIONS[1]).toEqual({ value: 'Asia/Shanghai', label: 'Asia/Shanghai (中国标准时间)' })
    })
  })
})
