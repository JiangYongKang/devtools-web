import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  createRevealTimer,
  createVisibilityHandler,
} from '../logic/masking.js'

describe('reveal timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should start and expire after duration', () => {
    let expired = false
    const timer = createRevealTimer(() => {
      expired = true
    }, { durationSeconds: 5 })

    timer.start()
    expect(timer.isRunning()).toBe(true)
    expect(expired).toBe(false)

    vi.advanceTimersByTime(4999)
    expect(timer.isRunning()).toBe(true)
    expect(expired).toBe(false)

    vi.advanceTimersByTime(1)
    expect(timer.isRunning()).toBe(false)
    expect(expired).toBe(true)
  })

  test('should reset timer when reset is called', () => {
    let expireCount = 0
    const timer = createRevealTimer(() => {
      expireCount++
    }, { durationSeconds: 5 })

    timer.start()

    vi.advanceTimersByTime(3000)
    expect(timer.isRunning()).toBe(true)

    timer.reset()

    vi.advanceTimersByTime(4000)
    expect(timer.isRunning()).toBe(true)
    expect(expireCount).toBe(0)

    vi.advanceTimersByTime(1000)
    expect(timer.isRunning()).toBe(false)
    expect(expireCount).toBe(1)
  })

  test('should clear timer when clear is called', () => {
    let expired = false
    const timer = createRevealTimer(() => {
      expired = true
    }, { durationSeconds: 5 })

    timer.start()
    timer.clear()

    vi.advanceTimersByTime(10000)
    expect(expired).toBe(false)
    expect(timer.isRunning()).toBe(false)
  })

  test('should report remaining seconds correctly', () => {
    const timer = createRevealTimer(() => {}, { durationSeconds: 10 })
    timer.start()

    expect(timer.getRemainingSeconds()).toBeCloseTo(10, 1)

    vi.advanceTimersByTime(3000)
    expect(timer.getRemainingSeconds()).toBeCloseTo(7, 1)

    vi.advanceTimersByTime(7000)
    expect(timer.getRemainingSeconds()).toBe(0)
  })

  test('should not call callback after clear', () => {
    const callback = vi.fn()
    const timer = createRevealTimer(callback, { durationSeconds: 5 })

    timer.start()
    timer.clear()

    vi.advanceTimersByTime(10000)
    expect(callback).not.toHaveBeenCalled()
  })
})

describe('visibility handler', () => {
  test('should call onHidden when visibility changes to hidden', () => {
    let hiddenCalled = false
    const handler = createVisibilityHandler(() => {
      hiddenCalled = true
    })

    const originalDocument = global.document
    global.document = {
      visibilityState: 'hidden',
    }

    handler.handleVisibilityChange()
    expect(hiddenCalled).toBe(true)

    global.document = originalDocument
  })

  test('should not call onHidden when visibility is visible', () => {
    let hiddenCalled = false
    const handler = createVisibilityHandler(() => {
      hiddenCalled = true
    })

    const originalDocument = global.document
    global.document = {
      visibilityState: 'visible',
    }

    handler.handleVisibilityChange()
    expect(hiddenCalled).toBe(false)

    global.document = originalDocument
  })
})
