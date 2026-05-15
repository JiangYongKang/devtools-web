
export function createRingBuffer(capacity) {
  if (capacity <= 0) {
    throw new Error('Capacity must be greater than 0')
  }

  const buffer = new Array(capacity)
  let writeIndex = 0
  let count = 0

  return {
    push(item) {
      buffer[writeIndex] = item
      writeIndex = (writeIndex + 1) % capacity
      count = Math.min(count + 1, capacity)
    },

    get(index) {
      if (index < 0 || index >= count) {
        return undefined
      }
      const actualIndex = (writeIndex - count + index + capacity) % capacity
      return buffer[actualIndex]
    },

    toArray() {
      const result = []
      for (let i = 0; i < count; i++) {
        const actualIndex = (writeIndex - count + i + capacity) % capacity
        result.push(buffer[actualIndex])
      }
      return result
    },

    get count() {
      return count
    },

    get capacity() {
      return capacity
    },

    clear() {
      writeIndex = 0
      count = 0
    },

    forEach(callback) {
      for (let i = 0; i < count; i++) {
        const actualIndex = (writeIndex - count + i + capacity) % capacity
        callback(buffer[actualIndex], i)
      }
    },

    map(callback) {
      const result = []
      for (let i = 0; i < count; i++) {
        const actualIndex = (writeIndex - count + i + capacity) % capacity
        result.push(callback(buffer[actualIndex], i))
      }
      return result
    },

    filter(predicate) {
      const result = []
      for (let i = 0; i < count; i++) {
        const actualIndex = (writeIndex - count + i + capacity) % capacity
        const item = buffer[actualIndex]
        if (predicate(item, i)) {
          result.push(item)
        }
      }
      return result
    },
  }
}
