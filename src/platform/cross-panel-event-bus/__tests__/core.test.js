import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  createPanelBus,
  isSerializable,
  matchEventName,
  OVERFLOW_STRATEGIES,
  v,
} from '../logic/index.js'

describe('isSerializable', () => {
  test('should return true for serializable values', () => {
    expect(isSerializable('hello')).toBe(true)
    expect(isSerializable(42)).toBe(true)
    expect(isSerializable(true)).toBe(true)
    expect(isSerializable(null)).toBe(true)
    expect(isSerializable(undefined)).toBe(true)
    expect(isSerializable({ name: 'Alice', age: 30 })).toBe(true)
    expect(isSerializable([1, 2, 3])).toBe(true)
    expect(isSerializable(new Date())).toBe(true)
    expect(isSerializable(/regex/)).toBe(true)
  })

  test('should return false for non-serializable values', () => {
    expect(isSerializable(() => {})).toBe(false)
    expect(isSerializable(Symbol('test'))).toBe(false)
  })

  test('should detect circular references', () => {
    const obj = { name: 'test' }
    obj.self = obj
    expect(isSerializable(obj)).toBe(false)
  })
})

describe('matchEventName', () => {
  test('should match exact names', () => {
    expect(matchEventName('test:event', 'test:event')).toBe(true)
  })

  test('should match wildcard patterns', () => {
    expect(matchEventName('test:*', 'test:event')).toBe(true)
    expect(matchEventName('test:*', 'test:another')).toBe(true)
    expect(matchEventName('*', 'any:event')).toBe(true)
  })

  test('should not mismatch', () => {
    expect(matchEventName('test:event', 'other:event')).toBe(false)
    expect(matchEventName('test:*', 'other:event')).toBe(false)
  })
})

describe('createPanelBus - basic operations', () => {
  test('should create bus instance', () => {
    const bus = createPanelBus()
    expect(bus).toBeDefined()
    expect(typeof bus.emit).toBe('function')
    expect(typeof bus.on).toBe('function')
    expect(typeof bus.off).toBe('function')
    expect(typeof bus.dispose).toBe('function')
  })

  test('should emit and receive events', () => {
    const bus = createPanelBus({ devMode: false })
    const handler = vi.fn()
    
    bus.on('test:event', handler)
    bus.emit('test:event', { data: 'hello' })
    
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ data: 'hello' }, 'test:event')
  })

  test('should support once listener', () => {
    const bus = createPanelBus({ devMode: false })
    const handler = vi.fn()
    
    bus.once('test:event', handler)
    bus.emit('test:event', {})
    bus.emit('test:event', {})
    
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('should remove listener with off', () => {
    const bus = createPanelBus({ devMode: false })
    const handler = vi.fn()
    
    const subId = bus.on('test:event', handler)
    bus.off(subId)
    bus.emit('test:event', {})
    
    expect(handler).not.toHaveBeenCalled()
  })

  test('should get subscriber count', () => {
    const bus = createPanelBus({ devMode: false })
    
    expect(bus.getSubscriberCount()).toBe(0)
    
    bus.on('test:event', () => {})
    expect(bus.getSubscriberCount()).toBe(1)
    expect(bus.getSubscriberCount('test:event')).toBe(1)
    expect(bus.getSubscriberCount('other:event')).toBe(0)
    
    bus.on('other:event', () => {})
    expect(bus.getSubscriberCount()).toBe(2)
  })

  test('should get subscriber count with namespace wildcard pattern', () => {
    const bus = createPanelBus({ devMode: false })
    
    bus.on('editor:textChanged', () => {})
    bus.on('editor:save', () => {})
    bus.on('preview:update', () => {})
    bus.on('*', () => {})
    
    expect(bus.getSubscriberCount('editor:*')).toBe(3)
    expect(bus.getSubscriberCount('preview:*')).toBe(2)
    expect(bus.getSubscriberCount('*')).toBe(4)
  })

  test('should dispose bus', () => {
    const bus = createPanelBus({ devMode: false })
    const handler = vi.fn()
    
    bus.on('test:event', handler)
    bus.dispose()
    bus.emit('test:event', {})
    
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('createPanelBus - namespace patterns', () => {
  test('should match namespace wildcard', () => {
    const bus = createPanelBus({ devMode: false })
    const handler = vi.fn()
    
    bus.on('editor:*', handler)
    bus.emit('editor:textChanged', {})
    bus.emit('editor:save', {})
    
    expect(handler).toHaveBeenCalledTimes(2)
  })

  test('should not match different namespace', () => {
    const bus = createPanelBus({ devMode: false })
    const handler = vi.fn()
    
    bus.on('editor:*', handler)
    bus.emit('preview:update', {})
    
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('createPanelBus - error handling', () => {
  test('should catch subscriber errors and mark as failed', () => {
    const bus = createPanelBus({ devMode: false })
    const errorHandler = vi.fn()
    
    bus.onError(errorHandler)
    
    const badHandler = () => {
      throw new Error('oops')
    }
    
    bus.on('test:event', badHandler)
    bus.emit('test:event', {})
    
    expect(errorHandler).toHaveBeenCalled()
    expect(bus.getFailedSubscriberIds().length).toBe(1)
  })

  test('should not call failed subscribers', () => {
    const bus = createPanelBus({ devMode: false })
    let callCount = 0
    
    const badHandler = () => {
      callCount++
      throw new Error('oops')
    }
    
    bus.on('test:event', badHandler)
    bus.emit('test:event', {})
    bus.emit('test:event', {})
    
    expect(callCount).toBe(1)
  })
})

describe('createPanelBus - max listeners', () => {
  test('should reject new listeners when max reached (reject strategy)', () => {
    const bus = createPanelBus({
      maxListenersPerEvent: 2,
      overflowStrategy: OVERFLOW_STRATEGIES.REJECT_NEW,
      devMode: false,
    })
    
    bus.on('test:event', () => {})
    bus.on('test:event', () => {})
    
    expect(() => {
      bus.on('test:event', () => {})
    }).toThrow()
  })

  test('should drop oldest listeners when max reached (drop strategy)', () => {
    const bus = createPanelBus({
      maxListenersPerEvent: 2,
      overflowStrategy: OVERFLOW_STRATEGIES.DROP_OLDEST,
      devMode: false,
    })
    
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const handler3 = vi.fn()
    
    bus.on('test:event', handler1)
    bus.on('test:event', handler2)
    bus.on('test:event', handler3)
    
    bus.emit('test:event', {})
    
    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).toHaveBeenCalled()
    expect(handler3).toHaveBeenCalled()
  })
})

describe('createPanelBus - emit modes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('emitAsync should work asynchronously', async () => {
    const bus = createPanelBus({ devMode: false })
    const handler = vi.fn()
    
    bus.on('test:event', handler)
    
    const promise = bus.emitAsync('test:event', {})
    expect(handler).not.toHaveBeenCalled()
    
    await promise
    expect(handler).toHaveBeenCalled()
  })

  test('emitMerged should debounce and merge events', () => {
    const bus = createPanelBus({
      mergeWindowMs: 100,
      devMode: false,
    })
    const handler = vi.fn()
    
    bus.on('test:event', handler)
    
    bus.emitMerged('test:event', { value: 1 })
    bus.emitMerged('test:event', { value: 2 })
    bus.emitMerged('test:event', { value: 3 })
    
    expect(handler).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(100)
    
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ value: 3 }, 'test:event')
  })

  test('emitMerged should support different keys', () => {
    const bus = createPanelBus({
      mergeWindowMs: 100,
      devMode: false,
    })
    const handler = vi.fn()
    
    bus.on('test:event', handler)
    
    bus.emitMerged('test:event', { value: 'a' }, 'key1')
    bus.emitMerged('test:event', { value: 'b' }, 'key2')
    
    vi.advanceTimersByTime(100)
    
    expect(handler).toHaveBeenCalledTimes(2)
  })
})

describe('createPanelBus - payload validation', () => {
  test('should validate payload with schema', () => {
    const bus = createPanelBus({
      validators: {
        'test:event': v.object({
          name: v.string(),
          age: v.number(),
        }),
      },
      devMode: false,
    })
    
    const handler = vi.fn()
    bus.on('test:event', handler)
    
    bus.emit('test:event', { name: 'Alice', age: 30 })
    expect(handler).toHaveBeenCalled()
    
    expect(() => {
      bus.emit('test:event', { name: 'Alice', age: '30' })
    }).toThrow()
  })
})

describe('createPanelBus - circular emit detection', () => {
  test('should detect circular emits', () => {
    const bus = createPanelBus({
      circularEmitThreshold: 3,
      devMode: false,
    })
    
    bus.on('event1', () => {
      bus.emit('event2', {})
    })
    bus.on('event2', () => {
      bus.emit('event3', {})
    })
    bus.on('event3', () => {
      bus.emit('event4', {})
    })
    
    expect(() => {
      bus.emit('event1', {})
    }).toThrow()
  })
})

describe('createPanelBus - dev log', () => {
  test('should log events in dev mode', () => {
    const bus = createPanelBus({ devMode: true })
    
    bus.on('test:event', () => {})
    bus.emit('test:event', {})
    
    const log = bus.getDevLog()
    expect(log.getSize()).toBeGreaterThan(0)
  })

  test('should not log in non-dev mode', () => {
    const bus = createPanelBus({ devMode: false })
    
    bus.on('test:event', () => {})
    bus.emit('test:event', {})
    
    const log = bus.getDevLog()
    expect(log.getSize()).toBe(0)
  })
})
