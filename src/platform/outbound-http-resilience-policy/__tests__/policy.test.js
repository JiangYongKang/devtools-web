
describe('HTTP 弹性策略 - 工具函数', () => {
  describe('generateTraceId', () => {
    it('生成唯一的 trace ID', () => {
      const id1 = generateTraceId()
      const id2 = generateTraceId()
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })

    it('包含指定前缀', () => {
      const id = generateTraceId('test')
      expect(id.startsWith('test-')).toBe(true)
    })
  })

  describe('calculateExponentialBackoff', () => {
    it('计算指数退避延迟', () => {
      const baseDelay = 100
      const multiplier = 2

      expect(calculateExponentialBackoff(1, baseDelay, multiplier)).toBe(100)
      expect(calculateExponentialBackoff(2, baseDelay, multiplier)).toBe(200)
      expect(calculateExponentialBackoff(3, baseDelay, multiplier)).toBe(400)
    })

    it('首次尝试返回 0 延迟', () => {
      expect(calculateExponentialBackoff(0, 100, 2)).toBe(0)
    })
  })

  describe('applyFullJitter', () => {
    it('应用完全抖动，返回 0 到 baseDelay 之间的随机值', () => {
      const baseDelay = 1000
      const jittered = applyFullJitter(baseDelay)

      expect(jittered).toBeGreaterThanOrEqual(0)
      expect(jittered).toBeLessThanOrEqual(baseDelay)
      expect(Number.isInteger(jittered)).toBe(true)
    })

    it('零延迟返回 0', () => {
      expect(applyFullJitter(0)).toBe(0)
    })
  })

  describe('parseRetryAfterHeader', () => {
    it('解析秒数格式的 Retry-After', () => {
      const headers = { 'retry-after': '5' }
      const result = parseRetryAfterHeader(headers)
      expect(result).toBe(5000)
    })

    it('解析 Response 格式的 headers', () => {
      const mockHeaders = {
        get: (name) => (name.toLowerCase() === 'retry-after' ? '10' : null),
      }
      const result = parseRetryAfterHeader(mockHeaders)
      expect(result).toBe(10000)
    })

    it('没有 Retry-After 头返回 null', () => {
      const result = parseRetryAfterHeader({})
      expect(result).toBeNull()
    })
  })

  describe('isIdempotentRequest', () => {
    it('对幂等 HTTP 方法返回 true', () => {
      IDEMPOTENT_METHODS.forEach((method) => {
        expect(isIdempotentRequest(method)).toBe(true)
      })
    })

    it('对 POST 默认返回 false', () => {
      expect(isIdempotentRequest('POST')).toBe(false)
    })

    it('对有 X-Idempotency-Key 头的 POST 返回 true', () => {
      const headers = { 'x-idempotency-key': 'key-123' }
      expect(isIdempotentRequest('POST', headers)).toBe(true)
    })
  })
})

describe('HTTP 弹性策略 - 错误处理', () => {
  describe('createTimeoutError', () => {
    it('创建超时错误对象', () => {
      const error = createTimeoutError('请求超时', { attempt: 1 })
      expect(error.errorCode).toBe('TIMEOUT')
      expect(error.name).toBe('TimeoutError')
      expect(error.message).toBe('请求超时')
      expect(error.context).toEqual({ attempt: 1 })
    })
  })

  describe('isTimeoutError', () => {
    it('正确识别超时错误', () => {
      const error = createTimeoutError('超时')
      expect(isTimeoutError(error)).toBe(true)

      const normalError = new Error('普通错误')
      expect(isTimeoutError(normalError)).toBe(false)
    })
  })
})

describe('HTTP 弹性策略 - 核心逻辑', () => {
  let originalFetch
  let fetchCallCount

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchCallCount = 0
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('首次请求成功时不重试', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      })
    )

    const policyFetch = createHttpClientPolicy({ retries: 3, baseDelayMs: 0 })
    await policyFetch('/api/test', { method: 'GET' })

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('失败后重试指定次数', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
      })
    )

    const policyFetch = createHttpClientPolicy({
      retries: 2,
      baseDelayMs: 0,
      jitter: false,
    })

    try {
      await policyFetch('/api/test', { method: 'GET' })
    } catch (e) {
    }

    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
  })

  it('调用 onAttempt 钩子', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      })
    )

    const onAttemptMock = jest.fn()
    const policyFetch = createHttpClientPolicy({
      retries: 0,
      baseDelayMs: 0,
      onAttempt: onAttemptMock,
    })

    await policyFetch('/api/test', { method: 'GET' })

    expect(onAttemptMock).toHaveBeenCalled()
    expect(onAttemptMock.mock.calls[0][0].type).toBe(EVENT_TYPES.ATTEMPT_START)
  })

  it('调用 onRetryDecision 钩子', async () => {
    globalThis.fetch = jest
      .fn()
      .mockReturnValueOnce(
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Error',
          headers: { get: () => null },
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        })
      )

    const onRetryMock = jest.fn()
    const policyFetch = createHttpClientPolicy({
      retries: 2,
      baseDelayMs: 0,
      jitter: false,
      onRetryDecision: onRetryMock,
    })

    await policyFetch('/api/test', { method: 'GET' })

    expect(onRetryMock).toHaveBeenCalled()
  })

  it('支持 AbortSignal 取消请求', async () => {
    globalThis.fetch = jest.fn((url, init) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({
            ok: false,
            status: 500,
            headers: { get: () => null },
          })
        }, 1000)
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            clearTimeout(timeout)
            const abortError = new Error('Aborted')
            abortError.name = 'AbortError'
            reject(abortError)
          })
        }
      })
    })

    const controller = new AbortController()
    const policyFetch = createHttpClientPolicy({
      retries: 3,
      baseDelayMs: 100,
    })

    const promise = policyFetch('/api/test', { method: 'GET', signal: controller.signal })

    setTimeout(() => controller.abort(), 50)

    try {
      await promise
      expect(true).toBe(false)
    } catch (error) {
      expect(error.name).toBe('AbortError')
    }
  })

  it('对非幂等请求不重试', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Error',
        headers: { get: () => null },
      })
    )

    const policyFetch = createHttpClientPolicy({
      retries: 3,
      baseDelayMs: 0,
    })

    try {
      await policyFetch('/api/test', { method: 'POST' })
    } catch (e) {
    }

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('重试耗尽时抛出 RetryExhaustedError', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: { get: () => null },
      })
    )

    const policyFetch = createHttpClientPolicy({
      retries: 2,
      baseDelayMs: 0,
    })

    try {
      await policyFetch('/api/test', { method: 'GET' })
      expect(true).toBe(false)
    } catch (error) {
      expect(error.errorCode).toBe('RETRY_EXHAUSTED')
      expect(error.attempts).toBe(3)
    }
  })

  it('尊重 Retry-After 响应头', async () => {
    let retryAfterValue = null

    globalThis.fetch = jest.fn(() => {
      return Promise.resolve({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name) => (name.toLowerCase() === 'retry-after' ? retryAfterValue : null),
        },
      })
    })

    retryAfterValue = '1'
    const onRetryMock = jest.fn()
    const policyFetch = createHttpClientPolicy({
      retries: 1,
      baseDelayMs: 100,
      retryAfterHeader: true,
      jitter: false,
      onRetryDecision: onRetryMock,
    })

    try {
      await policyFetch('/api/test', { method: 'GET' })
    } catch (e) {
    }

    expect(onRetryMock).toHaveBeenCalled()
    const retryEvent = onRetryMock.mock.calls.find(
      (call) => call[0].type === EVENT_TYPES.RETRY_DECIDED
    )
    expect(retryEvent).toBeDefined()
  })
})
