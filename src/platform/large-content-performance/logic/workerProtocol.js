import {
  WORKER_PROTOCOL_VERSION,
  WORKER_MESSAGE_TYPES,
  ERROR_CODES,
  DEFAULT_CONFIG,
} from './constants.js'
import {
  createError,
  wrapError,
} from './errors.js'

function isWorkerContext() {
  return (
    typeof self !== 'undefined' &&
    self.constructor?.name === 'DedicatedWorkerGlobalScope'
  )
}

function assertNotInWorker() {
  if (isWorkerContext()) {
    throw createError(ERROR_CODES.DOM_ACCESS_IN_WORKER)
  }
}

function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return false
  }
  if (typeof message.type !== 'string') {
    return false
  }
  if (message.version !== undefined && message.version !== WORKER_PROTOCOL_VERSION) {
    return false
  }
  return true
}

function createWorkerMessage(type, payload = {}, options = {}) {
  return {
    version: WORKER_PROTOCOL_VERSION,
    type,
    payload: { ...payload },
    id: options.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  }
}

function createMessageQueue(options = {}) {
  const maxDepth = options.maxDepth ?? DEFAULT_CONFIG.MESSAGE_QUEUE_MAX_DEPTH
  const mergeStrategy = options.mergeStrategy ?? 'latest'
  const queue = []

  return {
    push(message) {
      if (queue.length >= maxDepth) {
        if (mergeStrategy === 'latest') {
          queue.shift()
        } else if (mergeStrategy === 'drop-new') {
          throw createError(ERROR_CODES.MESSAGE_QUEUE_OVERFLOW)
        } else if (mergeStrategy === 'merge') {
          const merged = mergeMessages(queue)
          queue.length = 0
          queue.push(merged)
        }
      }
      queue.push(message)
      return queue.length
    },
    pop() {
      return queue.shift()
    },
    peek() {
      return queue[0]
    },
    clear() {
      queue.length = 0
    },
    getSize() {
      return queue.length
    },
    isEmpty() {
      return queue.length === 0
    },
    isFull() {
      return queue.length >= maxDepth
    },
    drainAll() {
      const items = [...queue]
      queue.length = 0
      return items
    },
  }
}

function mergeMessages(messages) {
  if (messages.length === 0) return null
  if (messages.length === 1) return messages[0]

  const first = messages[0]
  return {
    version: WORKER_PROTOCOL_VERSION,
    type: 'merged',
    payload: {
      count: messages.length,
      messages: messages.map((m) => ({
        type: m.type,
        payload: m.payload,
        timestamp: m.timestamp,
      })),
    },
    id: first.id,
    timestamp: first.timestamp,
    merged: true,
  }
}

function createWorkerManager(workerScript, options = {}) {
  assertNotInWorker()

  const messageQueue = createMessageQueue({
    maxDepth: options.maxQueueDepth,
    mergeStrategy: options.mergeStrategy,
  })

  let worker = null
  const pendingRequests = new Map()
  const listeners = new Map()

  function on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event).add(callback)
    return () => listeners.get(event)?.delete(callback)
  }

  function emit(event, data) {
    listeners.get(event)?.forEach((cb) => cb(data))
  }

  async function start() {
    if (worker) return

    try {
      worker = new Worker(workerScript)
      worker.onmessage = handleMessage
      worker.onerror = handleError

      const initMsg = createWorkerMessage(WORKER_MESSAGE_TYPES.INIT, {
        version: WORKER_PROTOCOL_VERSION,
      })
      worker.postMessage(initMsg)

      emit('ready')
    } catch (e) {
      throw wrapError(e, ERROR_CODES.WORKER_CONSTRUCTION_FAILED)
    }
  }

  function handleMessage(event) {
    const message = event.data

    if (!validateMessage(message)) {
      emit('error', createError(ERROR_CODES.INVALID_WORKER_MESSAGE))
      return
    }

    if (message.version !== WORKER_PROTOCOL_VERSION) {
      emit('error', createError(ERROR_CODES.WORKER_PROTOCOL_MISMATCH))
      return
    }

    if (message.id && pendingRequests.has(message.id)) {
      const resolver = pendingRequests.get(message.id)
      pendingRequests.delete(message.id)

      if (message.type === WORKER_MESSAGE_TYPES.ERROR) {
        resolver.reject(message.payload)
      } else {
        resolver.resolve(message.payload)
      }
    }

    emit('message', message)

    switch (message.type) {
      case WORKER_MESSAGE_TYPES.PROGRESS:
        emit('progress', message.payload)
        break
      case WORKER_MESSAGE_TYPES.PROCESS_RESULT:
        emit('result', message.payload)
        break
    }
  }

  function handleError(error) {
    emit('error', error)
  }

  function post(message, options = {}) {
    if (!worker) {
      throw createError(ERROR_CODES.WORKER_CONSTRUCTION_FAILED, 'Worker 未启动')
    }

    if (options.transfer) {
      worker.postMessage(message, options.transfer)
    } else {
      worker.postMessage(message)
    }
  }

  function request(type, payload, options = {}) {
    return new Promise((resolve, reject) => {
      const message = createWorkerMessage(type, payload)
      pendingRequests.set(message.id, { resolve, reject })

      try {
        post(message, options)
      } catch (e) {
        pendingRequests.delete(message.id)
        reject(e)
      }
    })
  }

  function cancel(requestId) {
    if (requestId) {
      pendingRequests.delete(requestId)
    }
    post(createWorkerMessage(WORKER_MESSAGE_TYPES.CANCEL))
  }

  function terminate() {
    if (worker) {
      worker.terminate()
      worker = null
    }
    pendingRequests.clear()
    messageQueue.clear()
    emit('terminated')
  }

  return {
    start,
    terminate,
    post,
    request,
    cancel,
    on,
    emit,
    isStarted: () => worker !== null,
    queueSize: () => messageQueue.getSize(),
  }
}

function attachLargeTextController(editorRef, options = {}) {
  const controller = {
    options: { ...options },
    attach() {},
    detach() {},
    getState() {
      return {
        isAttached: false,
        byteSize: 0,
        charCount: 0,
        overBudget: false,
      }
    },
    checkBudget() {
      return false
    },
  }

  if (!editorRef) {
    if (typeof options.onOverBudget === 'function') {
      options.onOverBudget({
        reason: 'no-editor',
        threshold: 0,
        current: 0,
      })
    }
    return controller
  }

  return controller
}

export {
  WORKER_PROTOCOL_VERSION,
  WORKER_MESSAGE_TYPES,
  isWorkerContext,
  assertNotInWorker,
  validateMessage,
  createWorkerMessage,
  createMessageQueue,
  mergeMessages,
  createWorkerManager,
  attachLargeTextController,
}
