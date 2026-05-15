import { describe, expect, test, vi } from 'vitest'
import {
  createDebouncedFn,
  createThrottledFn,
} from '../logic/debounce.js'

describe('debounce module', () => {
  describe('createDebouncedFn', () => {
    test('should delay execution', async () => {
      const fn = vi.fn()
      const debounced = createDebouncedFn(fn, { wait: 50 })

      debounced('arg1', 'arg2')
      expect(fn).not.toHaveBeenCalled()

      await new Promise((resolve) => setTimeout(resolve, 25))
      expect(fn).not.toHaveBeenCalled()

      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    test('should reset timer on subsequent calls', async () => {
      const fn = vi.fn()
      const debounced = createDebouncedFn(fn, { wait: 100, maxWait: null })

      debounced(1)
      await new Promise((resolve) => setTimeout(resolve, 60))
      debounced(2)
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(fn).not.toHaveBeenCalled()

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith(2)
    })

    test('should support leading option', async () => {
      const fn = vi.fn()
      const debounced = createDebouncedFn(fn, {
        wait: 50,
        leading: true,
        trailing: false,
      })

      debounced('a')
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('a')

      debounced('b')
      expect(fn).toHaveBeenCalledTimes(1)

      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('should cancel pending execution', async () => {
      const fn = vi.fn()
      const debounced = createDebouncedFn(fn, { wait: 50 })

      debounced()
      debounced.cancel()
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(fn).not.toHaveBeenCalled()
    })

    test('should flush immediately', async () => {
      const fn = vi.fn()
      const debounced = createDebouncedFn(fn, { wait: 50 })

      debounced('test')
      expect(fn).not.toHaveBeenCalled()

      const result = debounced.flush()
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('test')

      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('should report pending state', async () => {
      const fn = vi.fn()
      const debounced = createDebouncedFn(fn, { wait: 50 })

      expect(debounced.pending()).toBe(false)
      debounced()
      expect(debounced.pending()).toBe(true)
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(debounced.pending()).toBe(false)
    })

    test('should use default wait time', async () => {
      const fn = vi.fn()
      const debounced = createDebouncedFn(fn)

      debounced()
      expect(fn).not.toHaveBeenCalled()
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(fn).not.toHaveBeenCalled()
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('should enforce maxWait', async () => {
      const fn = vi.fn()
      const debounced = createDebouncedFn(fn, {
        wait: 100,
        maxWait: 150,
      })

      debounced(1)
      await new Promise((resolve) => setTimeout(resolve, 80))
      debounced(2)
      await new Promise((resolve) => setTimeout(resolve, 80))

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith(2)
    })
  })

  describe('createThrottledFn', () => {
    test('should throttle calls', async () => {
      const fn = vi.fn()
      const throttled = createThrottledFn(fn, 50)

      throttled(1)
      throttled(2)
      throttled(3)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith(1)

      await new Promise((resolve) => setTimeout(resolve, 25))
      expect(fn).toHaveBeenCalledTimes(1)

      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(fn).toHaveBeenCalledTimes(2)
      expect(fn).toHaveBeenCalledWith(3)
    })

    test('should support trailing option', async () => {
      const fn = vi.fn()
      const throttled = createThrottledFn(fn, 50, { trailing: false })

      throttled(1)
      throttled(2)
      expect(fn).toHaveBeenCalledTimes(1)

      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('should cancel pending calls', async () => {
      const fn = vi.fn()
      const throttled = createThrottledFn(fn, 50)

      throttled(1)
      throttled(2)
      throttled.cancel()
      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
})
