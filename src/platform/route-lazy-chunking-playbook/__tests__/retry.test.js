import { withRetry, ChunkLoadError, createChunkLoadError, isRetriableError, ERROR_CODES } from '../logic'

describe('ChunkLoadError', () => {
  it('应该正确创建带错误码和重试次数的错误', () => {
    const error = new ChunkLoadError('加载失败', ERROR_CODES.CHUNK_LOAD_FAILED, 2)
    expect(error.message).toBe('加载失败')
    expect(error.code).toBe(ERROR_CODES.CHUNK_LOAD_FAILED)
    expect(error.retryCount).toBe(2)
    expect(error.name).toBe('ChunkLoadError')
    expect(error.timestamp).toBeDefined()
  })
})

describe('createChunkLoadError', () => {
  it('应该创建 ChunkLoadError 实例', () => {
    const error = createChunkLoadError(ERROR_CODES.NETWORK_ERROR, '网络错误', 1)
    expect(error instanceof ChunkLoadError).toBe(true)
    expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR)
    expect(error.message).toBe('网络错误')
    expect(error.retryCount).toBe(1)
  })

  it('应该使用默认消息', () => {
    const error = createChunkLoadError(ERROR_CODES.TIMEOUT)
    expect(error.message).toContain(ERROR_CODES.TIMEOUT)
  })
})

describe('isRetriableError', () => {
  it('ChunkLoadError 且为可重试错误码应该返回 true', () => {
    const error1 = new ChunkLoadError('', ERROR_CODES.CHUNK_LOAD_FAILED)
    const error2 = new ChunkLoadError('', ERROR_CODES.NETWORK_ERROR)
    const error3 = new ChunkLoadError('', ERROR_CODES.TIMEOUT)

    expect(isRetriableError(error1)).toBe(true)
    expect(isRetriableError(error2)).toBe(true)
    expect(isRetriableError(error3)).toBe(true)
  })

  it('普通 Error 应该返回 false', () => {
    const error = new Error('普通错误')
    expect(isRetriableError(error)).toBe(false)
  })

  it('非可重试错误码应该返回 false', () => {
    const error = new ChunkLoadError('', ERROR_CODES.MODULE_NOT_FOUND)
    expect(isRetriableError(error)).toBe(false)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('成功时应该直接返回结果', async () => {
    const loader = jest.fn().mockResolvedValue('success')
    const result = withRetry(loader, { maxRetries: 3 })

    await expect(result).resolves.toBe('success')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('遇到可重试错误时应该重试指定次数', async () => {
    const error = new ChunkLoadError('网络错误', ERROR_CODES.NETWORK_ERROR)
    const loader = jest.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success')

    const resultPromise = withRetry(loader, { maxRetries: 2, initialDelay: 100 })

    jest.advanceTimersByTime(100)
    await Promise.resolve()
    jest.advanceTimersByTime(200)
    await Promise.resolve()

    await expect(resultPromise).resolves.toBe('success')
    expect(loader).toHaveBeenCalledTimes(3)
  })

  it('超过最大重试次数后应该抛出错误', async () => {
    const error = new ChunkLoadError('网络错误', ERROR_CODES.NETWORK_ERROR)
    const loader = jest.fn().mockRejectedValue(error)

    const resultPromise = withRetry(loader, { maxRetries: 2, initialDelay: 100 })

    jest.advanceTimersByTime(100)
    await Promise.resolve()
    jest.advanceTimersByTime(200)
    await Promise.resolve()
    jest.advanceTimersByTime(400)
    await Promise.resolve()

    await expect(resultPromise).rejects.toThrow()
    expect(loader).toHaveBeenCalledTimes(3)
  })

  it('遇到不可重试错误时应该直接抛出', async () => {
    const error = new ChunkLoadError('模块不存在', ERROR_CODES.MODULE_NOT_FOUND)
    const loader = jest.fn().mockRejectedValue(error)

    const resultPromise = withRetry(loader, { maxRetries: 3 })

    await expect(resultPromise).rejects.toThrow()
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('重试延迟应该按指数退避增长', async () => {
    const error = new ChunkLoadError('网络错误', ERROR_CODES.NETWORK_ERROR)
    const loader = jest.fn().mockRejectedValue(error)

    withRetry(loader, { maxRetries: 3, initialDelay: 100, backoffMultiplier: 2 })

    expect(loader).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(100)
    await Promise.resolve()
    expect(loader).toHaveBeenCalledTimes(2)

    jest.advanceTimersByTime(200)
    await Promise.resolve()
    expect(loader).toHaveBeenCalledTimes(3)

    jest.advanceTimersByTime(400)
    await Promise.resolve()
    expect(loader).toHaveBeenCalledTimes(4)
  })
})
