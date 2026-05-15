export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function isFunction(fn) {
  return typeof fn === 'function'
}

export function isObject(value) {
  return value !== null && typeof value === 'object'
}

export function defer() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function noop() {}

export function createPriorityQueue() {
  const items = []

  function enqueue(item, priority = 0) {
    const entry = { item, priority, timestamp: Date.now() }
    let index = 0
    while (index < items.length && items[index].priority >= priority) {
      index++
    }
    items.splice(index, 0, entry)
  }

  function dequeue() {
    return items.shift()?.item
  }

  function peek() {
    return items[0]?.item
  }

  function remove(predicate) {
    const index = items.findIndex((entry) => predicate(entry.item))
    if (index !== -1) {
      return items.splice(index, 1)[0].item
    }
    return null
  }

  function filter(predicate) {
    return items.filter((entry) => predicate(entry.item)).map((entry) => entry.item)
  }

  function size() {
    return items.length
  }

  function clear() {
    items.length = 0
  }

  function toArray() {
    return items.map((entry) => entry.item)
  }

  return { enqueue, dequeue, peek, remove, filter, size, clear, toArray }
}

export function createTokenBucket({ capacity, refillRate, refillInterval }) {
  let tokens = capacity
  let lastRefill = Date.now()

  function refill() {
    const now = Date.now()
    const elapsed = now - lastRefill
    if (elapsed >= refillInterval) {
      const tokensToAdd = Math.floor(elapsed / refillInterval) * refillRate
      tokens = Math.min(tokens + tokensToAdd, capacity)
      lastRefill = now - (elapsed % refillInterval)
    }
  }

  function tryConsume(amount = 1) {
    refill()
    if (tokens >= amount) {
      tokens -= amount
      return true
    }
    return false
  }

  function getTokens() {
    refill()
    return tokens
  }

  function reset() {
    tokens = capacity
    lastRefill = Date.now()
  }

  return { tryConsume, getTokens, reset }
}

export function createEventEmitter() {
  const listeners = new Map()

  function on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event).add(callback)
    return () => off(event, callback)
  }

  function off(event, callback) {
    if (listeners.has(event)) {
      listeners.get(event).delete(callback)
    }
  }

  function emit(event, data) {
    if (listeners.has(event)) {
      listeners.get(event).forEach((cb) => {
        try {
          cb(data)
        } catch (e) {
          console.error('Event listener error:', e)
        }
      })
    }
  }

  function once(event, callback) {
    const unsub = on(event, (data) => {
      unsub()
      callback(data)
    })
    return unsub
  }

  function removeAllListeners(event) {
    if (event) {
      listeners.delete(event)
    } else {
      listeners.clear()
    }
  }

  return { on, off, emit, once, removeAllListeners }
}
