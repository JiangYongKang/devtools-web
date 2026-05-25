import { describe, test, expect } from 'vitest'
import {
  isSafelistMethod,
  normalizeContentType,
  isSafelistContentType,
  isSafelistHeader,
  getNonSafelistHeaders,
  getRequestContentType,
  getPreflightTriggerReasons,
  classifyRequest,
  SAFELIST_METHODS,
  PREFLIGHT_TRIGGER_REASONS,
} from '../logic/index.js'

describe('safelist 方法判定', () => {
  test('GET、HEAD、POST 应为 safelist 方法', () => {
    expect(isSafelistMethod('GET')).toBe(true)
    expect(isSafelistMethod('HEAD')).toBe(true)
    expect(isSafelistMethod('POST')).toBe(true)
  })

  test('小写方法名也能正确识别', () => {
    expect(isSafelistMethod('get')).toBe(true)
    expect(isSafelistMethod('post')).toBe(true)
  })

  test('PUT、DELETE、PATCH 不应为 safelist 方法', () => {
    expect(isSafelistMethod('PUT')).toBe(false)
    expect(isSafelistMethod('DELETE')).toBe(false)
    expect(isSafelistMethod('PATCH')).toBe(false)
  })

  test('空值或 null 应返回 false', () => {
    expect(isSafelistMethod('')).toBe(false)
    expect(isSafelistMethod(null)).toBe(false)
    expect(isSafelistMethod(undefined)).toBe(false)
  })
})

describe('Content-Type 规范化与判定', () => {
  test('normalizeContentType 应去除 charset 参数', () => {
    expect(normalizeContentType('text/plain; charset=utf-8')).toBe('text/plain')
  })

  test('normalizeContentType 应转换为小写', () => {
    expect(normalizeContentType('TEXT/PLAIN')).toBe('text/plain')
  })

  test('safelist Content-Type 应返回 true', () => {
    expect(isSafelistContentType('application/x-www-form-urlencoded')).toBe(true)
    expect(isSafelistContentType('multipart/form-data')).toBe(true)
    expect(isSafelistContentType('text/plain')).toBe(true)
  })

  test('带参数的 safelist Content-Type 应返回 true', () => {
    expect(isSafelistContentType('text/plain; charset=utf-8')).toBe(true)
  })

  test('非 safelist Content-Type 应返回 false', () => {
    expect(isSafelistContentType('application/json')).toBe(false)
    expect(isSafelistContentType('application/xml')).toBe(false)
  })

  test('空值应返回 true', () => {
    expect(isSafelistContentType('')).toBe(true)
    expect(isSafelistContentType(null)).toBe(true)
    expect(isSafelistContentType(undefined)).toBe(true)
  })
})

describe('safelist 请求头判定', () => {
  test('safelist 请求头应返回 true', () => {
    expect(isSafelistHeader('Accept')).toBe(true)
    expect(isSafelistHeader('Accept-Language')).toBe(true)
    expect(isSafelistHeader('Content-Language')).toBe(true)
    expect(isSafelistHeader('Content-Type')).toBe(true)
  })

  test('大小写不敏感', () => {
    expect(isSafelistHeader('accept')).toBe(true)
    expect(isSafelistHeader('CONTENT-TYPE')).toBe(true)
  })

  test('非 safelist 请求头应返回 false', () => {
    expect(isSafelistHeader('Authorization')).toBe(false)
    expect(isSafelistHeader('X-Custom-Header')).toBe(false)
  })

  test('空值应返回 false', () => {
    expect(isSafelistHeader('')).toBe(false)
    expect(isSafelistHeader(null)).toBe(false)
  })
})

describe('getNonSafelistHeaders', () => {
  test('应返回非 safelist 的请求头', () => {
    const headers = [
      { name: 'Accept', value: 'application/json' },
      { name: 'Authorization', value: 'Bearer token' },
      { name: 'X-Custom', value: 'value' },
    ]
    const result = getNonSafelistHeaders(headers)
    expect(result.length).toBe(2)
    expect(result.map(h => h.name)).toEqual(['Authorization', 'X-Custom'])
  })

  test('全是 safelist 请求头应返回空数组', () => {
    const headers = [
      { name: 'Accept', value: 'application/json' },
      { name: 'Content-Type', value: 'text/plain' },
    ]
    const result = getNonSafelistHeaders(headers)
    expect(result.length).toBe(0)
  })

  test('空数组应返回空数组', () => {
    expect(getNonSafelistHeaders([])).toEqual([])
    expect(getNonSafelistHeaders(null)).toEqual([])
  })
})

describe('getRequestContentType', () => {
  test('应返回 Content-Type 的值', () => {
    const headers = [
      { name: 'Accept', value: 'application/json' },
      { name: 'Content-Type', value: 'application/json' },
    ]
    expect(getRequestContentType(headers)).toBe('application/json')
  })

  test('没有 Content-Type 应返回 null', () => {
    const headers = [{ name: 'Accept', value: 'application/json' }]
    expect(getRequestContentType(headers)).toBe(null)
  })

  test('大小写不敏感', () => {
    const headers = [{ name: 'content-type', value: 'text/plain' }]
    expect(getRequestContentType(headers)).toBe('text/plain')
  })
})

describe('getPreflightTriggerReasons', () => {
  test('简单请求应返回空数组', () => {
    const request = {
      origin: 'https://example.com',
      method: 'GET',
      headers: [{ name: 'Accept', value: 'application/json' }],
    }
    const reasons = getPreflightTriggerReasons(request)
    expect(reasons.length).toBe(0)
  })

  test('非 safelist 方法应触发预检', () => {
    const request = {
      origin: 'https://example.com',
      method: 'PUT',
      headers: [],
    }
    const reasons = getPreflightTriggerReasons(request)
    expect(reasons.length).toBe(1)
    expect(reasons[0].type).toBe(PREFLIGHT_TRIGGER_REASONS.NON_SAFELIST_METHOD)
  })

  test('非 safelist 请求头应触发预检', () => {
    const request = {
      origin: 'https://example.com',
      method: 'GET',
      headers: [{ name: 'Authorization', value: 'Bearer token' }],
    }
    const reasons = getPreflightTriggerReasons(request)
    expect(reasons.length).toBe(1)
    expect(reasons[0].type).toBe(PREFLIGHT_TRIGGER_REASONS.NON_SAFELIST_HEADER)
  })

  test('非 safelist Content-Type 应触发预检', () => {
    const request = {
      origin: 'https://example.com',
      method: 'POST',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
    }
    const reasons = getPreflightTriggerReasons(request)
    expect(reasons.length).toBe(1)
    expect(reasons[0].type).toBe(PREFLIGHT_TRIGGER_REASONS.NON_SAFELIST_CONTENT_TYPE)
  })

  test('多个条件应返回多个原因', () => {
    const request = {
      origin: 'https://example.com',
      method: 'PUT',
      headers: [
        { name: 'Authorization', value: 'Bearer token' },
        { name: 'Content-Type', value: 'application/json' },
      ],
    }
    const reasons = getPreflightTriggerReasons(request)
    expect(reasons.length).toBe(3)
  })
})

describe('classifyRequest', () => {
  test('简单请求应标记为 isSimpleRequest', () => {
    const request = {
      origin: 'https://example.com',
      method: 'GET',
      headers: [{ name: 'Accept', value: 'application/json' }],
    }
    const result = classifyRequest(request)
    expect(result.isSimpleRequest).toBe(true)
    expect(result.requiresPreflight).toBe(false)
  })

  test('非简单请求应标记为 requiresPreflight', () => {
    const request = {
      origin: 'https://example.com',
      method: 'POST',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
    }
    const result = classifyRequest(request)
    expect(result.isSimpleRequest).toBe(false)
    expect(result.requiresPreflight).toBe(true)
  })

  test('应包含正确的摘要信息', () => {
    const simpleRequest = { method: 'GET', headers: [] }
    expect(classifyRequest(simpleRequest).summary).toContain('简单请求')

    const preflightRequest = { method: 'PUT', headers: [] }
    expect(classifyRequest(preflightRequest).summary).toContain('需要预检')
  })
})
