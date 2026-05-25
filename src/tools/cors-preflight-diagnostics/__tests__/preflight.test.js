import { describe, test, expect } from 'vitest'
import {
  buildPreflightRequest,
  buildPreflightResponseHeaders,
  isOriginAllowed,
  isMethodAllowed,
  isHeadersAllowed,
  validatePreflightResponse,
  validateSimpleRequest,
  ERROR_TYPES,
} from '../logic/index.js'

describe('isOriginAllowed', () => {
  test('通配符 * 应允许所有 Origin', () => {
    expect(isOriginAllowed('https://example.com', '*')).toBe(true)
    expect(isOriginAllowed('https://any.origin', '*')).toBe(true)
  })

  test('具体 Origin 应精确匹配', () => {
    expect(isOriginAllowed('https://example.com', 'https://example.com')).toBe(true)
    expect(isOriginAllowed('https://other.com', 'https://example.com')).toBe(false)
  })

  test('null Origin 应匹配 null', () => {
    expect(isOriginAllowed('null', 'null')).toBe(true)
    expect(isOriginAllowed('https://example.com', 'null')).toBe(false)
  })

  test('空 allowOrigin 应返回 false', () => {
    expect(isOriginAllowed('https://example.com', '')).toBe(false)
  })
})

describe('isMethodAllowed', () => {
  test('方法在列表中应返回 true', () => {
    expect(isMethodAllowed('GET', ['GET', 'POST'])).toBe(true)
    expect(isMethodAllowed('POST', ['GET', 'POST'])).toBe(true)
  })

  test('方法不在列表中应返回 false', () => {
    expect(isMethodAllowed('PUT', ['GET', 'POST'])).toBe(false)
  })

  test('通配符 * 应允许所有方法', () => {
    expect(isMethodAllowed('ANY', ['*'])).toBe(true)
  })

  test('大小写不敏感', () => {
    expect(isMethodAllowed('get', ['GET'])).toBe(true)
    expect(isMethodAllowed('GET', ['get'])).toBe(true)
  })

  test('空列表应返回 false', () => {
    expect(isMethodAllowed('GET', [])).toBe(false)
  })
})

describe('isHeadersAllowed', () => {
  test('所有请求头都在允许列表中应返回 true', () => {
    const requestHeaders = [{ name: 'Authorization', value: 'token' }]
    const allowHeaders = ['Authorization', 'Content-Type']
    const result = isHeadersAllowed(requestHeaders, allowHeaders)
    expect(result.allowed).toBe(true)
  })

  test('有请求头不在允许列表中应返回 false', () => {
    const requestHeaders = [{ name: 'X-Custom', value: 'value' }]
    const allowHeaders = ['Authorization']
    const result = isHeadersAllowed(requestHeaders, allowHeaders)
    expect(result.allowed).toBe(false)
    expect(result.missingHeaders).toContain('x-custom')
  })

  test('通配符 * 应允许所有请求头', () => {
    const requestHeaders = [{ name: 'X-Any', value: 'any' }]
    const allowHeaders = ['*']
    const result = isHeadersAllowed(requestHeaders, allowHeaders)
    expect(result.allowed).toBe(true)
  })

  test('Content-Type 为非 safelist 时需要被允许', () => {
    const requestHeaders = [{ name: 'Content-Type', value: 'application/json' }]
    const allowHeaders = []
    const result = isHeadersAllowed(requestHeaders, allowHeaders)
    expect(result.allowed).toBe(false)
    expect(result.missingHeaders).toContain('content-type')
  })

  test('safelist 请求头不需要显式允许', () => {
    const requestHeaders = [{ name: 'Accept', value: 'application/json' }]
    const allowHeaders = []
    const result = isHeadersAllowed(requestHeaders, allowHeaders)
    expect(result.allowed).toBe(true)
  })
})

describe('buildPreflightRequest', () => {
  test('应构造正确的 OPTIONS 请求', () => {
    const request = {
      origin: 'https://example.com',
      method: 'POST',
      url: 'https://api.example.com/data',
      headers: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Authorization', value: 'Bearer token' },
      ],
    }
    const preflight = buildPreflightRequest(request)
    expect(preflight.method).toBe('OPTIONS')
    expect(preflight.headers.Origin).toBe('https://example.com')
    expect(preflight.headers['Access-Control-Request-Method']).toBe('POST')
    expect(preflight.headers['Access-Control-Request-Headers']).toContain('authorization')
    expect(preflight.headers['Access-Control-Request-Headers']).toContain('content-type')
  })

  test('无自定义请求头时 Access-Control-Request-Headers 应为空字符串', () => {
    const request = {
      origin: 'https://example.com',
      method: 'GET',
      headers: [{ name: 'Accept', value: 'application/json' }],
    }
    const preflight = buildPreflightRequest(request)
    expect(preflight.headers['Access-Control-Request-Headers']).toBe('')
  })
})

describe('buildPreflightResponseHeaders', () => {
  test('应包含所有配置的响应头', () => {
    const config = {
      allowOrigin: 'https://example.com',
      allowMethods: ['GET', 'POST'],
      allowHeaders: ['Content-Type', 'Authorization'],
      allowCredentials: true,
      maxAge: 86400,
    }
    const headers = buildPreflightResponseHeaders(config)
    expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com')
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST')
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
    expect(headers['Access-Control-Max-Age']).toBe('86400')
    expect(headers['Vary']).toBe('Origin')
  })

  test('使用通配符时不应包含 Vary 头', () => {
    const config = { allowOrigin: '*' }
    const headers = buildPreflightResponseHeaders(config)
    expect(headers['Vary']).toBeUndefined()
  })

  test('allowCredentials 为 false 时不应包含 Credentials 头', () => {
    const config = { allowOrigin: 'https://example.com', allowCredentials: false }
    const headers = buildPreflightResponseHeaders(config)
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined()
  })
})

describe('validatePreflightResponse', () => {
  test('正确配置应通过验证', () => {
    const request = {
      origin: 'https://example.com',
      method: 'POST',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
    }
    const responseConfig = {
      allowOrigin: 'https://example.com',
      allowMethods: ['GET', 'POST'],
      allowHeaders: ['Content-Type'],
      allowCredentials: false,
    }
    const result = validatePreflightResponse(request, responseConfig)
    expect(result.passed).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  test('缺少 Allow-Origin 应失败', () => {
    const request = { origin: 'https://example.com', method: 'GET', headers: [] }
    const responseConfig = { allowOrigin: '' }
    const result = validatePreflightResponse(request, responseConfig)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.type === ERROR_TYPES.MISSING_ALLOW_ORIGIN)).toBe(true)
  })

  test('Origin 不匹配应失败', () => {
    const request = { origin: 'https://example.com', method: 'GET', headers: [] }
    const responseConfig = { allowOrigin: 'https://other.com' }
    const result = validatePreflightResponse(request, responseConfig)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.type === ERROR_TYPES.ORIGIN_NOT_ALLOWED)).toBe(true)
  })

  test('携带凭证时使用通配符应失败', () => {
    const request = { origin: 'https://example.com', method: 'GET', headers: [], withCredentials: true }
    const responseConfig = { allowOrigin: '*', allowCredentials: true }
    const result = validatePreflightResponse(request, responseConfig)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.type === ERROR_TYPES.CREDENTIALS_WILDCARD_CONFLICT)).toBe(true)
  })

  test('携带凭证但响应未允许应失败', () => {
    const request = { origin: 'https://example.com', method: 'GET', headers: [], withCredentials: true }
    const responseConfig = { allowOrigin: 'https://example.com', allowCredentials: false }
    const result = validatePreflightResponse(request, responseConfig)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.type === ERROR_TYPES.CREDENTIALS_REQUIRED_BUT_MISSING)).toBe(true)
  })

  test('方法不被允许应失败', () => {
    const request = { origin: 'https://example.com', method: 'PUT', headers: [] }
    const responseConfig = { allowOrigin: 'https://example.com', allowMethods: ['GET', 'POST'] }
    const result = validatePreflightResponse(request, responseConfig)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.type === ERROR_TYPES.METHOD_NOT_ALLOWED)).toBe(true)
  })

  test('请求头不被允许应失败', () => {
    const request = { origin: 'https://example.com', method: 'POST', headers: [{ name: 'X-Custom', value: 'value' }] }
    const responseConfig = { allowOrigin: 'https://example.com', allowMethods: ['POST'], allowHeaders: [] }
    const result = validatePreflightResponse(request, responseConfig)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.type === ERROR_TYPES.HEADERS_NOT_ALLOWED)).toBe(true)
  })
})

describe('validateSimpleRequest', () => {
  test('正确配置应通过验证', () => {
    const request = { origin: 'https://example.com' }
    const responseConfig = { allowOrigin: 'https://example.com', allowCredentials: false }
    const result = validateSimpleRequest(request, responseConfig)
    expect(result.passed).toBe(true)
  })

  test('携带凭证时使用通配符应失败', () => {
    const request = { origin: 'https://example.com', withCredentials: true }
    const responseConfig = { allowOrigin: '*', allowCredentials: true }
    const result = validateSimpleRequest(request, responseConfig)
    expect(result.passed).toBe(false)
  })
})
