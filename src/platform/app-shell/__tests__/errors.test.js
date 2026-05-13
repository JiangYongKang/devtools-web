import { describe, expect, test } from 'vitest'
import { ERROR_CODES } from '../logic/constants.js'
import { getErrorMessage, createError, isAppShellError } from '../logic/errors.js'

describe('errors module', () => {
  test('getErrorMessage should return correct message for known code', () => {
    expect(getErrorMessage(ERROR_CODES.INVALID_TOOL_ID)).toBe('无效的工具 ID')
    expect(getErrorMessage(ERROR_CODES.TOOL_NOT_FOUND)).toBe('工具不存在')
  })

  test('getErrorMessage should return default message for unknown code', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('无效的工具 ID')
  })

  test('createError should create error with default message', () => {
    const result = createError(ERROR_CODES.INVALID_TOOL_ID)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOOL_ID)
    expect(result.errorMessage).toBe('无效的工具 ID')
  })

  test('createError should accept custom message', () => {
    const customMsg = 'Custom error message'
    const result = createError(ERROR_CODES.INVALID_TOOL_ID, customMsg)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOOL_ID)
    expect(result.errorMessage).toBe(customMsg)
  })

  test('createError should include extra properties', () => {
    const result = createError(ERROR_CODES.LIST_LOAD_FAILED, '加载失败', { status: 500, url: '/test' })
    expect(result.errorCode).toBe(ERROR_CODES.LIST_LOAD_FAILED)
    expect(result.status).toBe(500)
    expect(result.url).toBe('/test')
  })

  test('isAppShellError should return true for valid errors', () => {
    const error = createError(ERROR_CODES.INVALID_TOOL_ID)
    expect(isAppShellError(error)).toBe(true)
  })

  test('isAppShellError should return false for invalid errors', () => {
    expect(isAppShellError(null)).toBe(false)
    expect(isAppShellError(undefined)).toBe(false)
    expect(isAppShellError({})).toBe(false)
    expect(isAppShellError({ errorCode: 'test' })).toBe(false)
    expect(isAppShellError('error')).toBe(false)
  })
})
