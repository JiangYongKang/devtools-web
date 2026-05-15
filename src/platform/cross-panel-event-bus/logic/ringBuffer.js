class RingBuffer {
  constructor(capacity) {
    this._capacity = capacity
    this._buffer = new Array(capacity)
    this._writeIndex = 0
    this._size = 0
  }

  push(item) {
    this._buffer[this._writeIndex] = item
    this._writeIndex = (this._writeIndex + 1) % this._capacity
    if (this._size < this._capacity) {
      this._size++
    }
  }

  toArray() {
    const result = []
    for (let i = 0; i < this._size; i++) {
      const index = (this._writeIndex - this._size + i + this._capacity) % this._capacity
      result.push(this._buffer[index])
    }
    return result
  }

  getSize() {
    return this._size
  }

  getCapacity() {
    return this._capacity
  }

  clear() {
    this._writeIndex = 0
    this._size = 0
    this._buffer = new Array(this._capacity)
  }
}

function createDevLogBuffer(options = {}) {
  const {
    bufferSize = 1000,
    enabled = true,
  } = options

  const buffer = new RingBuffer(bufferSize)
  let _enabled = enabled

  function add(entry) {
    if (!_enabled) return
    buffer.push({
      timestamp: Date.now(),
      ...entry,
    })
  }

  function getAll() {
    return buffer.toArray()
  }

  function exportToJSON() {
    return JSON.stringify(buffer.toArray(), null, 2)
  }

  function clear() {
    buffer.clear()
  }

  function getSize() {
    return buffer.getSize()
  }

  function getCapacity() {
    return buffer.getCapacity()
  }

  function enable() {
    _enabled = true
  }

  function disable() {
    _enabled = false
  }

  function isEnabled() {
    return _enabled
  }

  return {
    add,
    getAll,
    exportToJSON,
    clear,
    getSize,
    getCapacity,
    enable,
    disable,
    isEnabled,
  }
}

export {
  RingBuffer,
  createDevLogBuffer,
}
