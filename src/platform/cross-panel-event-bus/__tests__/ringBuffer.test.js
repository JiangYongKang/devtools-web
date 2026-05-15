import { describe, expect, test, beforeEach } from 'vitest'
import { RingBuffer, createDevLogBuffer } from '../logic/index.js'

describe('RingBuffer', () => {
  test('should push and retrieve items', () => {
    const buffer = new RingBuffer(5)
    buffer.push(1)
    buffer.push(2)
    buffer.push(3)

    expect(buffer.getSize()).toBe(3)
    expect(buffer.toArray()).toEqual([1, 2, 3])
  })

  test('should wrap around when full', () => {
    const buffer = new RingBuffer(3)
    buffer.push(1)
    buffer.push(2)
    buffer.push(3)
    buffer.push(4)
    buffer.push(5)

    expect(buffer.getSize()).toBe(3)
    expect(buffer.toArray()).toEqual([3, 4, 5])
  })

  test('should clear buffer', () => {
    const buffer = new RingBuffer(5)
    buffer.push(1)
    buffer.push(2)
    buffer.clear()

    expect(buffer.getSize()).toBe(0)
    expect(buffer.toArray()).toEqual([])
  })

  test('should return correct capacity', () => {
    const buffer = new RingBuffer(100)
    expect(buffer.getCapacity()).toBe(100)
  })

  test('should handle zero capacity', () => {
    const buffer = new RingBuffer(0)
    buffer.push(1)
    expect(buffer.getSize()).toBe(0)
    expect(buffer.toArray()).toEqual([])
  })
})

describe('createDevLogBuffer', () => {
  test('should create with default options', () => {
    const logBuffer = createDevLogBuffer()
    expect(logBuffer.getCapacity()).toBe(1000)
  })

  test('should add and retrieve entries', () => {
    const logBuffer = createDevLogBuffer({ bufferSize: 10 })

    logBuffer.add({
      type: 'test',
      message: 'hello',
    })

    const entries = logBuffer.getAll()
    expect(entries.length).toBe(1)
    expect(entries[0].type).toBe('test')
    expect(entries[0].message).toBe('hello')
    expect(entries[0].timestamp).toBeDefined()
  })

  test('should export to JSON', () => {
    const logBuffer = createDevLogBuffer()
    logBuffer.add({ type: 'info', message: 'test' })
    
    const json = logBuffer.exportToJSON()
    expect(() => JSON.parse(json)).not.toThrow()
    
    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(1)
  })

  test('should clear all entries', () => {
    const logBuffer = createDevLogBuffer()
    logBuffer.add({ type: 'test' })
    logBuffer.clear()

    expect(logBuffer.getSize()).toBe(0)
    expect(logBuffer.getAll()).toEqual([])
  })

  test('should disable logging', () => {
    const logBuffer = createDevLogBuffer({ enabled: false })
    logBuffer.add({ type: 'test' })
    
    expect(logBuffer.getSize()).toBe(0)
    
    logBuffer.enable()
    logBuffer.add({ type: 'test2' })
    expect(logBuffer.getSize()).toBe(1)
    
    logBuffer.disable()
    logBuffer.add({ type: 'test3' })
    expect(logBuffer.getSize()).toBe(1)
  })
})
