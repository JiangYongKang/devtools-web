import { describe, expect, test, vi } from 'vitest'
import { UndoStack, createUndoStack, debounce, throttle } from '../logic/undoStack.js'

describe('undoStack module', () => {
  describe('UndoStack', () => {
    test('should initialize with empty stacks', () => {
      const stack = new UndoStack()
      expect(stack.canUndo()).toBe(false)
      expect(stack.canRedo()).toBe(false)
    })

    test('should push state and track current', () => {
      const stack = new UndoStack()
      const state1 = { nodes: [], expandedIds: new Set() }
      const state2 = { nodes: [{ id: '1' }], expandedIds: new Set() }

      stack.pushState(state1)
      expect(stack.canUndo()).toBe(false)

      stack.pushState(state2)
      expect(stack.canUndo()).toBe(true)
      expect(stack.canRedo()).toBe(false)
    })

    test('should undo to previous state', () => {
      const stack = new UndoStack()
      const state1 = { nodes: [], expandedIds: new Set() }
      const state2 = { nodes: [{ id: '1' }], expandedIds: new Set() }

      stack.pushState(state1)
      stack.pushState(state2)

      const undone = stack.undo()
      expect(undone.nodes).toEqual(state1.nodes)
      expect(stack.canRedo()).toBe(true)
    })

    test('should redo to next state', () => {
      const stack = new UndoStack()
      const state1 = { nodes: [], expandedIds: new Set() }
      const state2 = { nodes: [{ id: '1' }], expandedIds: new Set() }

      stack.pushState(state1)
      stack.pushState(state2)
      stack.undo()

      const redone = stack.redo()
      expect(redone.nodes).toEqual(state2.nodes)
      expect(stack.canRedo()).toBe(false)
    })

    test('should throw error when undo from empty stack', () => {
      const stack = new UndoStack()
      expect(() => stack.undo()).toThrow('Undo stack is empty')
    })

    test('should throw error when redo from empty stack', () => {
      const stack = new UndoStack()
      expect(() => stack.redo()).toThrow('Redo stack is empty')
    })

    test('should respect max size and drop oldest states', () => {
      const stack = new UndoStack(2)
      stack.pushState({ value: 1 })
      stack.pushState({ value: 2 })
      stack.pushState({ value: 3 })

      expect(stack.getUndoCount()).toBe(2)
      stack.undo()
      expect(stack.currentState.value).toBe(2)
    })

    test('should clear all stacks', () => {
      const stack = new UndoStack()
      stack.pushState({ value: 1 })
      stack.pushState({ value: 2 })
      stack.undo()

      stack.clear()
      expect(stack.canUndo()).toBe(false)
      expect(stack.canRedo()).toBe(false)
    })

    test('should serialize and deserialize correctly', () => {
      const original = new UndoStack(3)
      original.pushState({ value: 1 })
      original.pushState({ value: 2 })

      const json = original.toJSON()
      const restored = UndoStack.fromJSON(json)

      expect(restored.getUndoCount()).toBe(1)
      expect(restored.canUndo()).toBe(true)
    })
  })

  describe('createUndoStack', () => {
    test('should create UndoStack instance', () => {
      const stack = createUndoStack(10)
      expect(stack).toBeInstanceOf(UndoStack)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('should delay function execution', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced('arg')
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(60)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('arg')
    })

    test('should reset timer on subsequent calls', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced(1)
      vi.advanceTimersByTime(50)
      debounced(2)
      vi.advanceTimersByTime(50)
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(60)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith(2)
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('should limit function calls', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)

      throttled(1)
      throttled(2)
      throttled(3)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith(1)

      vi.advanceTimersByTime(50)
      throttled(4)
      expect(fn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(60)
      throttled(5)
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })
})
