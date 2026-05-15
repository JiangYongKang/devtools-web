import { describe, expect, test, beforeEach } from 'vitest'
import { RingBuffer, ringBufferPushPop } from '../logic/ringBuffer.js'
import { ERROR_CODES } from '../logic/constants.js'

describe('RingBuffer', () => {
  test('应该创建指定容量的环形缓冲区', () => {
    const buffer = new RingBuffer(100)
    expect(buffer.getCapacity()).toBe(100)
    expect(buffer.getSize()).toBe(0)
    expect(buffer.isEmpty()).toBe(true)
  })

  test('应该正确推送和获取项目', () => {
    const buffer = new RingBuffer(5)
    buffer.push('a')
    buffer.push('b')
    buffer.push('c')

    expect(buffer.getSize()).toBe(3)
    expect(buffer.get(0)).toBe('a')
    expect(buffer.get(1)).toBe('b')
    expect(buffer.get(2)).toBe('c')
  })

  test('应该在满时覆盖旧项目', () => {
    const buffer = new RingBuffer(3)
    buffer.push('a')
    buffer.push('b')
    buffer.push('c')
    buffer.push('d')
    buffer.push('e')

    expect(buffer.getSize()).toBe(3)
    expect(buffer.toArray()).toEqual(['c', 'd', 'e'])
  })

  test('应该正确弹出项目', () => {
    const buffer = new RingBuffer(5)
    buffer.push('a')
    buffer.push('b')
    buffer.push('c')

    expect(buffer.pop()).toBe('a')
    expect(buffer.pop()).toBe('b')
    expect(buffer.getSize()).toBe(1)
    expect(buffer.pop()).toBe('c')
    expect(buffer.pop()).toBeUndefined()
  })

  test('应该正确查看最后一项', () => {
    const buffer = new RingBuffer(5)
    buffer.push('a')
    buffer.push('b')
    buffer.push('c')

    expect(buffer.peekLast()).toBe('c')
    buffer.push('d')
    expect(buffer.peekLast()).toBe('d')
  })

  test('应该转换为数组', () => {
    const buffer = new RingBuffer(5)
    buffer.push('a')
    buffer.push('b')
    buffer.push('c')

    const arr = buffer.toArray()
    expect(arr).toEqual(['a', 'b', 'c'])
    expect(Array.isArray(arr)).toBe(true)
  })

  test('应该正确切片', () => {
    const buffer = new RingBuffer(10)
    for (let i = 0; i < 10; i++) {
      buffer.push(i)
    }

    expect(buffer.slice(0, 3)).toEqual([0, 1, 2])
    expect(buffer.slice(3, 7)).toEqual([3, 4, 5, 6])
    expect(buffer.slice(7)).toEqual([7, 8, 9])
  })

  test('应该正确遍历', () => {
    const buffer = new RingBuffer(5)
    buffer.push('a')
    buffer.push('b')
    buffer.push('c')

    const result = []
    buffer.forEach((item) => result.push(item))
    expect(result).toEqual(['a', 'b', 'c'])
  })

  test('应该正确映射', () => {
    const buffer = new RingBuffer(5)
    buffer.push(1)
    buffer.push(2)
    buffer.push(3)

    const doubled = buffer.map((x) => x * 2)
    expect(doubled).toEqual([2, 4, 6])
  })

  test('应该正确过滤', () => {
    const buffer = new RingBuffer(5)
    buffer.push(1)
    buffer.push(2)
    buffer.push(3)
    buffer.push(4)
    buffer.push(5)

    const evens = buffer.filter((x) => x % 2 === 0)
    expect(evens).toEqual([2, 4])
  })

  test('应该正确查找', () => {
    const buffer = new RingBuffer(5)
    buffer.push({ id: 1, name: 'a' })
    buffer.push({ id: 2, name: 'b' })
    buffer.push({ id: 3, name: 'c' })

    const found = buffer.find((item) => item.id === 2)
    expect(found).toEqual({ id: 2, name: 'b' })

    const notFound = buffer.find((item) => item.id === 99)
    expect(notFound).toBeUndefined()
  })

  test('应该正确清空', () => {
    const buffer = new RingBuffer(5)
    buffer.push('a')
    buffer.push('b')
    buffer.clear()

    expect(buffer.getSize()).toBe(0)
    expect(buffer.isEmpty()).toBe(true)
    expect(buffer.getTotalPushed()).toBe(0)
  })

  test('应该正确调整大小', () => {
    const buffer = new RingBuffer(5)
    for (let i = 0; i < 5; i++) {
      buffer.push(i)
    }

    buffer.resize(3)
    expect(buffer.getCapacity()).toBe(3)
    expect(buffer.getSize()).toBe(3)
    expect(buffer.toArray()).toEqual([2, 3, 4])

    buffer.resize(10)
    expect(buffer.getCapacity()).toBe(10)
    expect(buffer.getSize()).toBe(3)
  })

  test('应该正确跟踪推送总数和覆盖计数', () => {
    const buffer = new RingBuffer(3)
    buffer.push('a')
    buffer.push('b')

    expect(buffer.getTotalPushed()).toBe(2)
    expect(buffer.getOverwriteCount()).toBe(0)

    buffer.push('c')
    buffer.push('d')
    buffer.push('e')

    expect(buffer.getTotalPushed()).toBe(5)
    expect(buffer.getOverwriteCount()).toBe(2)
  })

  test('空缓冲区操作应该正确处理', () => {
    const buffer = new RingBuffer(5)
    expect(buffer.peek()).toBeUndefined()
    expect(buffer.peekLast()).toBeUndefined()
    expect(buffer.pop()).toBeUndefined()
    expect(buffer.get(0)).toBeUndefined()
    expect(buffer.toArray()).toEqual([])
  })

  test('零容量缓冲区应该正确处理', () => {
    const buffer = new RingBuffer(0)
    buffer.push('a')
    expect(buffer.getSize()).toBe(0)
    expect(buffer.isEmpty()).toBe(true)
  })

  test('应该正确报告满状态', () => {
    const buffer = new RingBuffer(3)
    expect(buffer.isFull()).toBe(false)

    buffer.push('a')
    buffer.push('b')
    expect(buffer.isFull()).toBe(false)

    buffer.push('c')
    expect(buffer.isFull()).toBe(true)

    buffer.push('d')
    expect(buffer.isFull()).toBe(true)
  })
})

describe('ringBufferPushPop', () => {
  test('应该正确推送然后弹出所有项目', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const result = ringBufferPushPop(items, 10)

    expect(result).toEqual(items)
  })

  test('应该在缓冲区较小时只保留最新项目', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const result = ringBufferPushPop(items, 3)

    expect(result).toEqual(['c', 'd', 'e'])
  })

  test('应该正确处理空输入', () => {
    const result = ringBufferPushPop([], 5)
    expect(result).toEqual([])
  })
})
