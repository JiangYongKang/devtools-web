import {
  DEFAULT_BUFFER_CAPACITY,
  ERROR_CODES,
} from './constants.js'

class RingBuffer {
  constructor(capacity = DEFAULT_BUFFER_CAPACITY) {
    if (capacity < 0) {
      throw new Error(ERROR_CODES.INVALID_CAPACITY)
    }

    this._capacity = capacity
    this._buffer = new Array(capacity)
    this._writeIndex = 0
    this._readIndex = 0
    this._size = 0
    this._totalPushed = 0
  }

  push(item) {
    if (this._capacity === 0) return false

    this._buffer[this._writeIndex] = item
    this._writeIndex = (this._writeIndex + 1) % this._capacity
    this._totalPushed++

    if (this._size < this._capacity) {
      this._size++
    } else {
      this._readIndex = (this._readIndex + 1) % this._capacity
    }

    return true
  }

  pushBatch(items) {
    let pushed = 0
    for (const item of items) {
      if (this.push(item)) {
        pushed++
      }
    }
    return pushed
  }

  pop() {
    if (this._size === 0) return undefined

    const item = this._buffer[this._readIndex]
    this._readIndex = (this._readIndex + 1) % this._capacity
    this._size--
    return item
  }

  peek() {
    if (this._size === 0) return undefined
    return this._buffer[this._readIndex]
  }

  peekLast() {
    if (this._size === 0) return undefined
    const lastIndex = (this._writeIndex - 1 + this._capacity) % this._capacity
    return this._buffer[lastIndex]
  }

  toArray() {
    const result = []
    for (let i = 0; i < this._size; i++) {
      const index = (this._readIndex + i) % this._capacity
      result.push(this._buffer[index])
    }
    return result
  }

  toArrayReversed() {
    const result = []
    for (let i = this._size - 1; i >= 0; i--) {
      const index = (this._readIndex + i) % this._capacity
      result.push(this._buffer[index])
    }
    return result
  }

  get(index) {
    if (index < 0 || index >= this._size) return undefined
    const actualIndex = (this._readIndex + index) % this._capacity
    return this._buffer[actualIndex]
  }

  slice(start = 0, end = this._size) {
    const actualStart = Math.max(0, start)
    const actualEnd = Math.min(this._size, end)
    const result = []
    for (let i = actualStart; i < actualEnd; i++) {
      const index = (this._readIndex + i) % this._capacity
      result.push(this._buffer[index])
    }
    return result
  }

  forEach(callback) {
    for (let i = 0; i < this._size; i++) {
      const index = (this._readIndex + i) % this._capacity
      callback(this._buffer[index], i, this)
    }
  }

  map(callback) {
    const result = []
    this.forEach((item, index) => {
      result.push(callback(item, index, this))
    })
    return result
  }

  filter(predicate) {
    const result = []
    this.forEach((item, index) => {
      if (predicate(item, index, this)) {
        result.push(item)
      }
    })
    return result
  }

  find(predicate) {
    for (let i = 0; i < this._size; i++) {
      const index = (this._readIndex + i) % this._capacity
      const item = this._buffer[index]
      if (predicate(item, i, this)) {
        return item
      }
    }
    return undefined
  }

  clear() {
    this._writeIndex = 0
    this._readIndex = 0
    this._size = 0
    this._totalPushed = 0
    this._buffer = new Array(this._capacity)
  }

  getSize() {
    return this._size
  }

  getCapacity() {
    return this._capacity
  }

  getTotalPushed() {
    return this._totalPushed
  }

  getOverwriteCount() {
    return Math.max(0, this._totalPushed - this._capacity)
  }

  isEmpty() {
    return this._size === 0
  }

  isFull() {
    return this._size === this._capacity
  }

  resize(newCapacity) {
    if (newCapacity < 0) {
      throw new Error(ERROR_CODES.INVALID_CAPACITY)
    }

    const currentItems = this.toArray()
    this._capacity = newCapacity
    this._buffer = new Array(newCapacity)
    this._writeIndex = 0
    this._readIndex = 0
    this._size = 0

    const itemsToPush = currentItems.slice(-newCapacity)
    for (const item of itemsToPush) {
      this.push(item)
    }

    return this
  }
}

function ringBufferPushPop(items, capacity) {
  const buffer = new RingBuffer(capacity)

  for (const item of items) {
    buffer.push(item)
  }

  const result = []
  while (!buffer.isEmpty()) {
    result.push(buffer.pop())
  }

  return result
}

export {
  RingBuffer,
  ringBufferPushPop,
}
