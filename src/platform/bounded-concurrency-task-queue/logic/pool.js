import { DEFAULT_POOL_OPTIONS, ERROR_CODES, OVERFLOW_STRATEGIES, TASK_STATES, EVENT_TYPES } from './constants.js'
import { createError, isAbortError, wrapError } from './errors.js'
import { createPriorityQueue, defer, generateId, isFunction, createEventEmitter, createTokenBucket } from './utils.js'

export function createPool(options = {}) {
  const config = { ...DEFAULT_POOL_OPTIONS, ...options }
  let concurrency = config.concurrency
  let isClosed = false
  let activeTaskCount = 0
  const taskQueue = createPriorityQueue()
  const runningTasks = new Map()
  const eventEmitter = createEventEmitter()
  const sourceTokenBuckets = new Map()

  const metrics = {
    completed: 0,
    failed: 0,
    timeout: 0,
    cancelled: 0,
    dropped: 0,
    totalEnqueued: 0,
  }

  function checkFairRateLimit(source) {
    if (!config.fairRateLimit || !source) {
      return true
    }

    if (!sourceTokenBuckets.has(source)) {
      const bucket = createTokenBucket({
        capacity: config.fairRateLimitPerSource,
        refillRate: config.fairRateLimitPerSource,
        refillInterval: config.fairRateLimitWindow,
      })
      sourceTokenBuckets.set(source, bucket)
    }

    return sourceTokenBuckets.get(source).tryConsume(1)
  }

  function getMetrics() {
    return {
      ...metrics,
      running: activeTaskCount,
      waiting: taskQueue.size(),
      concurrency,
    }
  }

  function processQueue() {
    if (isClosed) return

    while (activeTaskCount < concurrency && taskQueue.size() > 0) {
      const taskWrapper = taskQueue.dequeue()
      if (taskWrapper) {
        runTask(taskWrapper)
      }
    }

    if (activeTaskCount === 0 && taskQueue.size() === 0) {
      eventEmitter.emit(EVENT_TYPES.POOL_DRAINED)
    }
  }

  async function runTask(taskWrapper) {
    const { id, task, signal, timeout, label, metadata, resolve, reject } = taskWrapper

    if (signal?.aborted) {
      taskWrapper.state = TASK_STATES.CANCELLED
      metrics.cancelled++
      eventEmitter.emit(EVENT_TYPES.TASK_CANCELLED, {
        type: EVENT_TYPES.TASK_CANCELLED,
        taskId: id,
        label,
        metadata,
      })
      reject(createError(ERROR_CODES.TASK_CANCELLED))
      processQueue()
      return
    }

    activeTaskCount++
    runningTasks.set(id, taskWrapper)
    taskWrapper.state = TASK_STATES.RUNNING
    taskWrapper.startTime = Date.now()
    eventEmitter.emit(EVENT_TYPES.TASK_STARTED, {
      type: EVENT_TYPES.TASK_STARTED,
      taskId: id,
      label,
      metadata,
    })

    let timeoutId = null
    let abortUnsubscribe = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (abortUnsubscribe) {
        abortUnsubscribe()
        abortUnsubscribe = null
      }
      runningTasks.delete(id)
      activeTaskCount--
    }

    try {
      if (signal) {
        abortUnsubscribe = () => {
          signal.removeEventListener('abort', handleAbort)
        }
        signal.addEventListener('abort', handleAbort, { once: true })
      }

      let resultPromise = task()

      if (timeout) {
        resultPromise = Promise.race([
          resultPromise,
          new Promise((_, rej) => {
            timeoutId = setTimeout(() => {
              rej(createError(ERROR_CODES.TASK_TIMEOUT, `Task ${id} timed out after ${timeout}ms`))
            }, timeout)
          }),
        ])
      }

      const result = await resultPromise
      taskWrapper.state = TASK_STATES.COMPLETED
      metrics.completed++
      eventEmitter.emit(EVENT_TYPES.TASK_COMPLETED, {
        type: EVENT_TYPES.TASK_COMPLETED,
        taskId: id,
        label,
        metadata,
        duration: Date.now() - taskWrapper.startTime,
      })
      resolve(result)
    } catch (error) {
      cleanup()

      if (isAbortError(error) || error?.errorCode === ERROR_CODES.TASK_CANCELLED) {
        taskWrapper.state = TASK_STATES.CANCELLED
        metrics.cancelled++
        eventEmitter.emit(EVENT_TYPES.TASK_CANCELLED, {
          type: EVENT_TYPES.TASK_CANCELLED,
          taskId: id,
          label,
          metadata,
        })
        reject(createError(ERROR_CODES.TASK_CANCELLED, null, error))
      } else if (error?.errorCode === ERROR_CODES.TASK_TIMEOUT) {
        taskWrapper.state = TASK_STATES.TIMEOUT
        metrics.timeout++
        eventEmitter.emit(EVENT_TYPES.TASK_TIMEOUT, {
          type: EVENT_TYPES.TASK_TIMEOUT,
          taskId: id,
          label,
          metadata,
          timeout,
        })
        reject(error)
      } else {
        taskWrapper.state = TASK_STATES.FAILED
        metrics.failed++
        eventEmitter.emit(EVENT_TYPES.TASK_FAILED, {
          type: EVENT_TYPES.TASK_FAILED,
          taskId: id,
          label,
          metadata,
          error: error?.message,
        })
        reject(wrapError(error, ERROR_CODES.INVALID_TASK))
      }

      processQueue()
      return
    }

    cleanup()
    processQueue()
  }

  function handleAbort() {}

  async function enqueue(task, options = {}) {
    if (isClosed) {
      throw createError(ERROR_CODES.POOL_CLOSED)
    }

    if (!isFunction(task)) {
      throw createError(ERROR_CODES.INVALID_TASK)
    }

    const { priority = 0, signal, timeout = config.taskTimeout, label = '', metadata = {}, source = null } = options

    if (config.fairRateLimit && source && !checkFairRateLimit(source)) {
      throw createError(ERROR_CODES.FAIR_RATE_LIMIT_EXCEEDED, `Source ${source} exceeded rate limit`)
    }

    const id = generateId()
    const deferred = defer()

    const taskWrapper = {
      id,
      task,
      priority,
      signal,
      timeout,
      label,
      metadata,
      source,
      state: TASK_STATES.PENDING,
      enqueuedAt: Date.now(),
      startTime: null,
      resolve: deferred.resolve,
      reject: deferred.reject,
    }

    if (taskQueue.size() >= config.maxQueueSize) {
      eventEmitter.emit(EVENT_TYPES.QUEUE_OVERFLOW, {
        type: EVENT_TYPES.QUEUE_OVERFLOW,
        taskId: id,
        label,
      })

      switch (config.overflowStrategy) {
        case OVERFLOW_STRATEGIES.REJECT:
          throw createError(ERROR_CODES.QUEUE_FULL)

        case OVERFLOW_STRATEGIES.DROP_OLDEST:
          const droppedTask = dropOldestTask()
          if (droppedTask) {
            metrics.dropped++
            eventEmitter.emit(EVENT_TYPES.TASK_DROPPED, {
              type: EVENT_TYPES.TASK_DROPPED,
              taskId: droppedTask.id,
              label: droppedTask.label,
              metadata: droppedTask.metadata,
              reason: 'overflow',
            })
            droppedTask.reject(createError(ERROR_CODES.QUEUE_FULL, 'Task dropped due to queue overflow'))
          }
          break

        case OVERFLOW_STRATEGIES.BLOCK:
        default:
          await waitForSlot()
          if (isClosed) {
            throw createError(ERROR_CODES.POOL_CLOSED)
          }
          break
      }
    }

    taskQueue.enqueue(taskWrapper, priority)
    metrics.totalEnqueued++
    eventEmitter.emit(EVENT_TYPES.TASK_ENQUEUED, {
      type: EVENT_TYPES.TASK_ENQUEUED,
      taskId: id,
      label,
      metadata,
      priority,
    })

    processQueue()

    const promise = deferred.promise
    promise.cancel = () => cancelTask(id)
    promise.taskId = id
    promise.getState = () => getTaskState(id)

    return promise
  }

  function waitForSlot() {
    return new Promise((resolve) => {
      const check = () => {
        if (taskQueue.size() < config.maxQueueSize || isClosed) {
          resolve()
        } else {
          setTimeout(check, 10)
        }
      }
      check()
    })
  }

  function dropOldestTask() {
    const tasks = taskQueue.toArray()
    if (tasks.length === 0) return null

    const oldest = tasks.reduce((a, b) => (a.enqueuedAt < b.enqueuedAt ? a : b))
    return taskQueue.remove((t) => t.id === oldest.id)
  }

  function cancelTask(taskId) {
    const queuedTask = taskQueue.remove((t) => t.id === taskId)
    if (queuedTask) {
      queuedTask.state = TASK_STATES.CANCELLED
      metrics.cancelled++
      eventEmitter.emit(EVENT_TYPES.TASK_CANCELLED, {
        type: EVENT_TYPES.TASK_CANCELLED,
        taskId,
        label: queuedTask.label,
        metadata: queuedTask.metadata,
      })
      queuedTask.reject(createError(ERROR_CODES.TASK_CANCELLED))
      return true
    }

    const runningTask = runningTasks.get(taskId)
    if (runningTask && runningTask.controller) {
      runningTask.controller.abort()
      return true
    }

    return false
  }

  function getTaskState(taskId) {
    const queued = taskQueue.filter((t) => t.id === taskId)[0]
    if (queued) {
      return { state: queued.state, enqueuedAt: queued.enqueuedAt, position: taskQueue.toArray().indexOf(queued) }
    }

    const running = runningTasks.get(taskId)
    if (running) {
      return { state: running.state, startTime: running.startTime }
    }

    return null
  }

  function setConcurrency(newConcurrency) {
    const oldConcurrency = concurrency
    concurrency = Math.max(1, Math.floor(newConcurrency))
    eventEmitter.emit(EVENT_TYPES.POOL_RESIZED, {
      type: EVENT_TYPES.POOL_RESIZED,
      oldConcurrency,
      newConcurrency: concurrency,
    })
    processQueue()
  }

  function drain() {
    return new Promise((resolve) => {
      if (activeTaskCount === 0 && taskQueue.size() === 0) {
        resolve()
        return
      }
      eventEmitter.once(EVENT_TYPES.POOL_DRAINED, resolve)
    })
  }

  async function clear() {
    const tasks = taskQueue.toArray()
    taskQueue.clear()

    for (const task of tasks) {
      metrics.cancelled++
      eventEmitter.emit(EVENT_TYPES.TASK_CANCELLED, {
        type: EVENT_TYPES.TASK_CANCELLED,
        taskId: task.id,
        label: task.label,
        metadata: task.metadata,
        reason: 'cleared',
      })
      task.reject(createError(ERROR_CODES.TASK_CANCELLED, 'Pool cleared'))
    }

    await drain()
  }

  async function close() {
    isClosed = true
    await clear()
    eventEmitter.removeAllListeners()
    sourceTokenBuckets.clear()
  }

  function on(event, callback) {
    return eventEmitter.on(event, callback)
  }

  function getWaitingTasks() {
    return taskQueue.toArray().map((t) => ({
      id: t.id,
      label: t.label,
      priority: t.priority,
      enqueuedAt: t.enqueuedAt,
      metadata: t.metadata,
    }))
  }

  function getRunningTasks() {
    return Array.from(runningTasks.values()).map((t) => ({
      id: t.id,
      label: t.label,
      startTime: t.startTime,
      duration: Date.now() - t.startTime,
      metadata: t.metadata,
    }))
  }

  return {
    enqueue,
    cancelTask,
    setConcurrency,
    getConcurrency: () => concurrency,
    getMetrics,
    getWaitingTasks,
    getRunningTasks,
    getTaskState,
    drain,
    clear,
    close,
    on,
  }
}
