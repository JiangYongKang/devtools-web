import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ERROR_CODES, OVERFLOW_STRATEGIES } from '../logic/constants.js'
import { createPool } from '../logic/index.js'

describe('createPool', () => {
  let pool

  beforeEach(() => {
    vi.useFakeTimers()
    pool = createPool({ concurrency: 2 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('should create pool with default options', () => {
    const metrics = pool.getMetrics()
    expect(metrics.concurrency).toBe(2)
    expect(metrics.running).toBe(0)
    expect(metrics.waiting).toBe(0)
  })

  test('should execute tasks with correct concurrency limit', async () => {
    const task1 = vi.fn(() => new Promise((r) => setTimeout(() => r('result1'), 100)))
    const task2 = vi.fn(() => new Promise((r) => setTimeout(() => r('result2'), 100)))
    const task3 = vi.fn(() => new Promise((r) => setTimeout(() => r('result3'), 100)))

    const promise1 = pool.enqueue(task1, { label: 'task1' })
    const promise2 = pool.enqueue(task2, { label: 'task2' })
    const promise3 = pool.enqueue(task3, { label: 'task3' })

    await Promise.resolve()
    expect(pool.getMetrics().running).toBe(2)
    expect(pool.getMetrics().waiting).toBe(1)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()

    expect(pool.getMetrics().running).toBe(1)
    expect(pool.getMetrics().waiting).toBe(0)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()

    expect(pool.getMetrics().running).toBe(0)
    expect(pool.getMetrics().completed).toBe(3)

    const results = await Promise.all([promise1, promise2, promise3])
    expect(results).toEqual(['result1', 'result2', 'result3'])
  })

  test('should respect task priorities', async () => {
    const executionOrder = []

    const createTask = (id) => async () => {
      executionOrder.push(id)
      await new Promise((r) => setTimeout(r, 50))
      return id
    }

    pool.setConcurrency(1)

    pool.enqueue(createTask('low1'), { priority: 1, label: 'low1' })
    pool.enqueue(createTask('high1'), { priority: 10, label: 'high1' })
    pool.enqueue(createTask('medium'), { priority: 5, label: 'medium' })
    pool.enqueue(createTask('high2'), { priority: 10, label: 'high2' })
    pool.enqueue(createTask('low2'), { priority: 1, label: 'low2' })

    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(50)
      await Promise.resolve()
      await Promise.resolve()
    }

    await pool.drain()

    expect(executionOrder[0]).toBe('low1')
    expect(executionOrder.slice(1)).toContain('high1')
    expect(executionOrder.slice(1)).toContain('high2')
    expect(executionOrder.indexOf('high1')).toBeLessThan(executionOrder.indexOf('medium'))
    expect(executionOrder.indexOf('high2')).toBeLessThan(executionOrder.indexOf('medium'))
    expect(executionOrder.indexOf('medium')).toBeLessThan(executionOrder.indexOf('low2'))
  })

  test('should handle task timeout', async () => {
    const slowTask = () => new Promise((r) => setTimeout(() => r('slow'), 2000))

    const resultPromise = pool.enqueue(slowTask, { timeout: 500, label: 'slowTask' })

    vi.advanceTimersByTime(500)
    await Promise.resolve()
    await Promise.resolve()

    await expect(resultPromise).rejects.toMatchObject({
      errorCode: ERROR_CODES.TASK_TIMEOUT,
    })

    expect(pool.getMetrics().timeout).toBe(1)
  })

  test('should cancel queued task', async () => {
    const task = vi.fn(() => new Promise((r) => setTimeout(r, 100)))

    pool.setConcurrency(1)

    pool.enqueue(() => new Promise((r) => setTimeout(r, 500)), { label: 'running' })
    const queuedPromise = pool.enqueue(task, { label: 'queued' })

    await Promise.resolve()
    expect(pool.getMetrics().waiting).toBe(1)

    queuedPromise.cancel()

    await expect(queuedPromise).rejects.toMatchObject({
      errorCode: ERROR_CODES.TASK_CANCELLED,
    })

    expect(pool.getMetrics().cancelled).toBe(1)
    expect(task).not.toHaveBeenCalled()
  })

  test('should handle task failures', async () => {
    const failingTask = () => Promise.reject(new Error('Task failed'))

    const resultPromise = pool.enqueue(failingTask, { label: 'failing' })

    await expect(resultPromise).rejects.toThrow()
    expect(pool.getMetrics().failed).toBe(1)
    expect(pool.getMetrics().running).toBe(0)
  })

  test('should support abort signal for cancellation', async () => {
    const controller = new AbortController()

    const longRunningTask = () =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve('done'), 5000)
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeout)
          reject(new Error('Aborted'))
        })
      })

    const resultPromise = pool.enqueue(longRunningTask, { signal: controller.signal, label: 'abortable' })

    await Promise.resolve()
    controller.abort()

    await expect(resultPromise).rejects.toThrow()
  })

  test('should drain pool when all tasks complete', async () => {
    const task1 = () => new Promise((r) => setTimeout(() => r(1), 100))
    const task2 = () => new Promise((r) => setTimeout(() => r(2), 200))

    pool.enqueue(task1)
    pool.enqueue(task2)

    const drainPromise = pool.drain()

    vi.advanceTimersByTime(200)
    await Promise.resolve()
    await Promise.resolve()

    await drainPromise

    expect(pool.getMetrics().running).toBe(0)
    expect(pool.getMetrics().waiting).toBe(0)
    expect(pool.getMetrics().completed).toBe(2)
  })

  test('should clear queue and cancel waiting tasks', async () => {
    pool.setConcurrency(1)

    pool.enqueue(() => new Promise((r) => setTimeout(r, 1000)), { label: 'running' })
    pool.enqueue(() => Promise.resolve(1), { label: 'queued1' })
    pool.enqueue(() => Promise.resolve(2), { label: 'queued2' })

    await Promise.resolve()
    expect(pool.getMetrics().waiting).toBe(2)

    await pool.clear()

    expect(pool.getMetrics().waiting).toBe(0)
    expect(pool.getMetrics().cancelled).toBe(2)
  })

  test('should dynamically adjust concurrency', async () => {
    const tasks = Array(5)
      .fill()
      .map((_, i) => () => new Promise((r) => setTimeout(() => r(i), 100)))

    tasks.forEach((task) => pool.enqueue(task))

    await Promise.resolve()
    expect(pool.getMetrics().running).toBe(2)

    pool.setConcurrency(4)

    await Promise.resolve()
    expect(pool.getMetrics().running).toBe(4)

    pool.setConcurrency(1)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()

    expect(pool.getMetrics().running).toBe(1)
  })

  test('should return running and waiting tasks', async () => {
    pool.setConcurrency(1)

    pool.enqueue(() => new Promise((r) => setTimeout(r, 100)), { label: 'runningTask' })
    pool.enqueue(() => Promise.resolve(), { label: 'waitingTask' })

    await Promise.resolve()

    const running = pool.getRunningTasks()
    const waiting = pool.getWaitingTasks()

    expect(running).toHaveLength(1)
    expect(running[0].label).toBe('runningTask')
    expect(waiting).toHaveLength(1)
    expect(waiting[0].label).toBe('waitingTask')
  })

  test('should throw error for non-function task', async () => {
    await expect(pool.enqueue('not a function')).rejects.toMatchObject({
      errorCode: ERROR_CODES.INVALID_TASK,
    })
  })
})

describe('overflow strategies', () => {
  test('BLOCK strategy should wait for queue space', async () => {
    vi.useFakeTimers()
    const pool = createPool({
      concurrency: 1,
      maxQueueSize: 1,
      overflowStrategy: OVERFLOW_STRATEGIES.BLOCK,
    })

    pool.enqueue(() => new Promise((r) => setTimeout(r, 100)), { label: 'task1' })
    pool.enqueue(() => new Promise((r) => setTimeout(r, 100)), { label: 'task2' })

    await Promise.resolve()
    expect(pool.getMetrics().waiting).toBe(1)

    let enqueued = false
    const enqueuePromise = pool.enqueue(() => Promise.resolve(), { label: 'task3' }).then(() => {
      enqueued = true
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(enqueued).toBe(false)

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()

    vi.advanceTimersByTime(100)
    await Promise.resolve()
    await Promise.resolve()

    await enqueuePromise
    expect(enqueued).toBe(true)

    vi.useRealTimers()
  })

  test('DROP_OLDEST strategy should drop oldest task when queue full', async () => {
    vi.useFakeTimers()
    const pool = createPool({
      concurrency: 1,
      maxQueueSize: 2,
      overflowStrategy: OVERFLOW_STRATEGIES.DROP_OLDEST,
    })

    pool.enqueue(() => new Promise((r) => setTimeout(r, 500)), { label: 'running' })
    const promise1 = pool.enqueue(() => Promise.resolve(1), { label: 'oldest' })
    pool.enqueue(() => Promise.resolve(2), { label: 'newest1' })

    await Promise.resolve()
    expect(pool.getMetrics().waiting).toBe(2)

    const promise3 = pool.enqueue(() => Promise.resolve(3), { label: 'newest2' })

    await Promise.resolve()
    expect(pool.getMetrics().waiting).toBe(2)
    expect(pool.getMetrics().dropped).toBe(1)

    await expect(promise1).rejects.toMatchObject({ errorCode: ERROR_CODES.QUEUE_FULL })

    vi.advanceTimersByTime(500)
    await Promise.resolve()

    const results = await Promise.allSettled([promise3])
    expect(results[0].status).toBe('fulfilled')

    vi.useRealTimers()
  })

  test('REJECT strategy should reject new task when queue full', async () => {
    const pool = createPool({
      concurrency: 1,
      maxQueueSize: 1,
      overflowStrategy: OVERFLOW_STRATEGIES.REJECT,
    })

    pool.enqueue(() => new Promise((r) => setTimeout(r, 100)), { label: 'running' })
    pool.enqueue(() => Promise.resolve(), { label: 'queued' })

    await expect(
      pool.enqueue(() => Promise.resolve(), { label: 'rejected' })
    ).rejects.toMatchObject({ errorCode: ERROR_CODES.QUEUE_FULL })
  })
})

describe('fair rate limiting', () => {
  test('should limit tasks per source when enabled', async () => {
    vi.useFakeTimers()
    const pool = createPool({
      concurrency: 2,
      fairRateLimit: true,
      fairRateLimitPerSource: 2,
      fairRateLimitWindow: 1000,
    })

    await expect(pool.enqueue(() => Promise.resolve(), { source: 'user1' })).resolves.toBeUndefined()
    await expect(pool.enqueue(() => Promise.resolve(), { source: 'user1' })).resolves.toBeUndefined()

    await expect(
      pool.enqueue(() => Promise.resolve(), { source: 'user1' })
    ).rejects.toMatchObject({ errorCode: ERROR_CODES.FAIR_RATE_LIMIT_EXCEEDED })

    await expect(pool.enqueue(() => Promise.resolve(), { source: 'user2' })).resolves.toBeUndefined()

    vi.useRealTimers()
  })
})
