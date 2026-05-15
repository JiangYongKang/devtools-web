
import { describe, expect, test } from 'vitest'
import {
  classifyError,
  ServiceHealthError,
  createError,
  ERROR_CODES,
  getErrorMessageByType,
} from '../logic/errors.js'
import { ERROR_TYPES } from '../logic/constants.js'

describe('classifyError - table driven tests', () => {
  const testCases = [
    {
      name: 'classifies timeout abort error',
      error: new DOMException('The operation was aborted.', 'AbortError'),
      expected: ERROR_TYPES.ABORT,
    },
    {
      name: 'classifies error with abort in message',
      error: new Error('Request aborted by user'),
      expected: ERROR_TYPES.ABORT,
    },
    {
      name: 'classifies error with cancelled in message',
      error: new Error('Request was cancelled'),
      expected: ERROR_TYPES.ABORT,
    },
    {
      name: 'classifies timeout error',
      error: new Error('Connection timed out'),
      expected: ERROR_TYPES.TIMEOUT,
    },
    {
      name: 'classifies CORS error',
      error: new Error('CORS policy: No Access-Control-Allow-Origin header'),
      expected: ERROR_TYPES.CORS,
    },
    {
      name: 'classifies cross-origin error',
      error: new Error('cross-origin request blocked'),
      expected: ERROR_TYPES.CORS,
    },
    {
      name: 'classifies preflight error',
      error: new Error('preflight response is not successful'),
      expected: ERROR_TYPES.CORS,
    },
    {
      name: 'classifies network error',
      error: new Error('Network connection failed'),
      expected: ERROR_TYPES.NETWORK,
    },
    {
      name: 'classifies fetch failed error',
      error: new Error('Failed to fetch'),
      expected: ERROR_TYPES.NETWORK,
    },
    {
      name: 'classifies HTTP error with status',
      error: Object.assign(new Error('Bad request'), { status: 400 }),
      expected: ERROR_TYPES.HTTP,
    },
    {
      name: 'classifies HTTP error with response.status',
      error: Object.assign(new Error(), { response: { status: 500 } }),
      expected: ERROR_TYPES.HTTP,
    },
    {
      name: 'classifies unknown error',
      error: new Error('Something went wrong'),
      expected: ERROR_TYPES.UNKNOWN,
    },
    {
      name: 'classifies null error',
      error: null,
      expected: ERROR_TYPES.UNKNOWN,
    },
    {
      name: 'classifies undefined error',
      error: undefined,
      expected: ERROR_TYPES.UNKNOWN,
    },
  ]

  testCases.forEach(({ name, error, expected }) => {
    test(name, () => {
      expect(classifyError(error)).toBe(expected)
    })
  })
})

describe('ServiceHealthError', () => {
  test('creates error with correct properties', () => {
    const error = new ServiceHealthError(ERROR_CODES.TIMEOUT, 'Request timed out', { timeoutMs: 5000 })

    expect(error.name).toBe('ServiceHealthError')
    expect(error.code).toBe(ERROR_CODES.TIMEOUT)
    expect(error.message).toBe('Request timed out')
    expect(error.details).toEqual({ timeoutMs: 5000 })
    expect(error.timestamp).toBeDefined()
  })

  test('toJSON returns serialized error', () => {
    const error = new ServiceHealthError(ERROR_CODES.NETWORK_ERROR, 'Network failure')
    const json = error.toJSON()

    expect(json).toEqual({
      name: 'ServiceHealthError',
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Network failure',
      details: {},
      timestamp: expect.any(Number),
    })
  })
})

describe('createError', () => {
  test('creates ServiceHealthError instance', () => {
    const error = createError(ERROR_CODES.INVALID_URL, 'Invalid URL', { url: 'test' })

    expect(error).toBeInstanceOf(ServiceHealthError)
    expect(error.code).toBe(ERROR_CODES.INVALID_URL)
    expect(error.message).toBe('Invalid URL')
    expect(error.details).toEqual({ url: 'test' })
  })
})

describe('getErrorMessageByType', () => {
  test('returns correct message for each error type', () => {
    expect(getErrorMessageByType(ERROR_TYPES.HTTP)).toBe('HTTP 状态码错误')
    expect(getErrorMessageByType(ERROR_TYPES.NETWORK)).toBe('网络连接失败')
    expect(getErrorMessageByType(ERROR_TYPES.CORS)).toBe('跨域请求被阻止 (CORS 策略)')
    expect(getErrorMessageByType(ERROR_TYPES.TIMEOUT)).toBe('请求超时')
    expect(getErrorMessageByType(ERROR_TYPES.ABORT)).toBe('请求被取消')
    expect(getErrorMessageByType(ERROR_TYPES.SECURITY)).toBe('安全策略违规')
    expect(getErrorMessageByType(ERROR_TYPES.UNKNOWN)).toBe('未知错误')
    expect(getErrorMessageByType('invalid_type')).toBe('未知错误')
  })
})
