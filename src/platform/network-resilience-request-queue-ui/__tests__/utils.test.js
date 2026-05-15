import {
  calculateExponentialBackoff,
  applyJitter,
  calculateNextBackoff,
  generateDedupeKey,
  sanitizeHeaders,
  estimateSizeInBytes,
} from '../logic/utils'

describe('退避算法', () => {
  describe('calculateExponentialBackoff', () => {
    const testCases = [
      {
        description: '首次重试应为初始延迟',
        initialDelay: 1000,
        attempt: 0,
        factor: 2,
        maxDelay: 10000,
        expected: 1000,
      },
      {
        description: '第二次重试应为 2 倍延迟',
        initialDelay: 1000,
        attempt: 1,
        factor: 2,
        maxDelay: 10000,
        expected: 2000,
      },
      {
        description: '不应超过最大延迟',
        initialDelay: 1000,
        attempt: 10,
        factor: 2,
        maxDelay: 5000,
        expected: 5000,
      },
    ]

    testCases.forEach(({ description, initialDelay, attempt, factor, maxDelay, expected }) => {
      test(description, () => {
        const result = calculateExponentialBackoff(initialDelay, attempt, factor, maxDelay)
        expect(result).toBe(expected)
      })
    })
  })

  describe('applyJitter', () => {
    test('应在延迟范围内添加随机抖动', () => {
      const delay = 1000
      const jitterRatio = 0.5
      const results = new Set()

      for (let i = 0; i < 100; i++) {
        const result = applyJitter(delay, jitterRatio)
        results.add(result)
        expect(result).toBeGreaterThanOrEqual(500)
        expect(result).toBeLessThanOrEqual(1500)
      }

      expect(results.size).toBeGreaterThan(1)
    })

    test('jitterRatio = 0 时应不添加抖动', () => {
      const delay = 1000
      const result = applyJitter(delay, 0)
      expect(result).toBe(delay)
    })
  })

  describe('calculateNextBackoff', () => {
    const backoffConfig = {
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      factor: 2,
      jitterRatio: 0,
    }

    const testCases = [
      { retryCount: 0, expectedRange: [800, 1200] },
      { retryCount: 1, expectedRange: [1600, 2400] },
      { retryCount: 2, expectedRange: [3200, 4800] },
    ]

    testCases.forEach(({ retryCount, expectedRange }) => {
      test(`重试次数 ${retryCount} 应计算正确的退避时间`, () => {
        const result = calculateNextBackoff(retryCount, backoffConfig)
        const expectedBase = 1000 * Math.pow(2, retryCount)
        expect(result).toBeGreaterThanOrEqual(expectedBase * 0.8)
        expect(result).toBeLessThanOrEqual(expectedBase * 1.2)
      })
    })
  })
})

describe('去重键生成', () => {
  test('相同请求应生成相同去重键', () => {
    const request1 = { method: 'GET', url: '/api/test', body: null }
    const request2 = { method: 'GET', url: '/api/test', body: null }

    const key1 = generateDedupeKey(request1)
    const key2 = generateDedupeKey(request2)

    expect(key1).toBe(key2)
  })

  test('不同 URL 应生成不同去重键', () => {
    const request1 = { method: 'GET', url: '/api/test1', body: null }
    const request2 = { method: 'GET', url: '/api/test2', body: null }

    const key1 = generateDedupeKey(request1)
    const key2 = generateDedupeKey(request2)

    expect(key1).not.toBe(key2)
  })

  test('不同方法应生成不同去重键', () => {
    const request1 = { method: 'GET', url: '/api/test', body: null }
    const request2 = { method: 'POST', url: '/api/test', body: null }

    const key1 = generateDedupeKey(request1)
    const key2 = generateDedupeKey(request2)

    expect(key1).not.toBe(key2)
  })

  test('不同 Body 应生成不同去重键', () => {
    const request1 = { method: 'POST', url: '/api/test', body: JSON.stringify({ a: 1 }) }
    const request2 = { method: 'POST', url: '/api/test', body: JSON.stringify({ a: 2 }) }

    const key1 = generateDedupeKey(request1)
    const key2 = generateDedupeKey(request2)

    expect(key1).not.toBe(key2)
  })
})

describe('请求头脱敏', () => {
  const sensitiveKeys = ['authorization', 'cookie', 'x-auth-token']

  test('应脱敏敏感请求头', () => {
    const headers = {
      'Authorization': 'Bearer secret-token',
      'Content-Type': 'application/json',
      'Cookie': 'session=abc123',
    }

    const sanitized = sanitizeHeaders(headers, sensitiveKeys)

    expect(sanitized['Authorization']).toBe('***REDACTED***')
    expect(sanitized['Cookie']).toBe('***REDACTED***')
    expect(sanitized['Content-Type']).toBe('application/json')
  })

  test('应处理大小写不敏感的请求头名称', () => {
    const headers = {
      'AUTHORIZATION': 'Bearer secret',
      'authorization': 'Bearer another',
      'X-Auth-Token': 'token123',
    }

    const sanitized = sanitizeHeaders(headers, sensitiveKeys)

    expect(sanitized['AUTHORIZATION']).toBe('***REDACTED***')
    expect(sanitized['authorization']).toBe('***REDACTED***')
    expect(sanitized['X-Auth-Token']).toBe('***REDACTED***')
  })

  test('空请求头应返回空对象', () => {
    const sanitized = sanitizeHeaders(null, sensitiveKeys)
    expect(sanitized).toEqual({})
  })
})

describe('大小估算', () => {
  test('应估算对象的字节大小', () => {
    const obj = { key: 'value', number: 123 }
    const size = estimateSizeInBytes(obj)
    expect(size).toBeGreaterThan(0)
    expect(size).toBeCloseTo(JSON.stringify(obj).length, -1)
  })

  test('空对象应返回正的大小', () => {
    const size = estimateSizeInBytes({})
    expect(size).toBeGreaterThan(0)
  })
})
