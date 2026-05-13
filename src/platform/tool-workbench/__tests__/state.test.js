import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  readSessionStorage,
  writeSessionStorage,
  clearSessionStorage,
  toggleTreeCollapseState,
  isPathCollapsed,
  validateDisplayState,
  getDefaultDisplayState,
} from '../logic/state.js'
import { DISPLAY_STATES, LAYOUT_TOPOLOGIES } from '../logic/constants.js'

describe('state.js', () => {
  const originalSessionStorage = global.sessionStorage
  const originalConsoleError = console.error

  beforeEach(() => {
    global.sessionStorage = {
      getItem: (key) => null,
      setItem: (key, value) => {},
      removeItem: (key) => {},
    }
    console.error = () => {}
  })

  afterEach(() => {
    global.sessionStorage = originalSessionStorage
    console.error = originalConsoleError
  })

  describe('readSessionStorage', () => {
    test('should return default value when sessionStorage is undefined', () => {
      const original = global.sessionStorage
      global.sessionStorage = undefined
      
      const result = readSessionStorage('test-key', 'default-value')
      expect(result).toBe('default-value')
      
      global.sessionStorage = original
    })

    test('should return default value when key does not exist', () => {
      const result = readSessionStorage('non-existent-key', 'default')
      expect(result).toBe('default')
    })

    test('should parse JSON value', () => {
      global.sessionStorage.getItem = () => JSON.stringify({ foo: 'bar' })
      
      const result = readSessionStorage('test-key', null)
      expect(result).toEqual({ foo: 'bar' })
    })

    test('should handle JSON parse error', () => {
      global.sessionStorage.getItem = () => 'not-valid-json'
      
      const result = readSessionStorage('test-key', 'default')
      expect(result).toBe('default')
    })
  })

  describe('writeSessionStorage', () => {
    test('should return true on success', () => {
      const result = writeSessionStorage('test-key', { foo: 'bar' })
      expect(result).toBe(true)
    })

    test('should return false when sessionStorage is undefined', () => {
      const original = global.sessionStorage
      global.sessionStorage = undefined
      
      const result = writeSessionStorage('test-key', 'value')
      expect(result).toBe(false)
      
      global.sessionStorage = original
    })

    test('should return false on error', () => {
      global.sessionStorage.setItem = () => {
        throw new Error('storage full')
      }
      
      const result = writeSessionStorage('test-key', 'value')
      expect(result).toBe(false)
    })
  })

  describe('clearSessionStorage', () => {
    test('should return true on success', () => {
      const result = clearSessionStorage('test-key')
      expect(result).toBe(true)
    })

    test('should return false when sessionStorage is undefined', () => {
      const original = global.sessionStorage
      global.sessionStorage = undefined
      
      const result = clearSessionStorage('test-key')
      expect(result).toBe(false)
      
      global.sessionStorage = original
    })
  })

  describe('toggleTreeCollapseState', () => {
    test('should add path to collapsed state when not present', () => {
      const state = {}
      const result = toggleTreeCollapseState(state, 'root.child')
      
      expect(result['root.child']).toBe(true)
    })

    test('should remove path from collapsed state when present', () => {
      const state = { 'root.child': true }
      const result = toggleTreeCollapseState(state, 'root.child')
      
      expect(result['root.child']).toBeUndefined()
    })

    test('should handle array path', () => {
      const state = {}
      const result = toggleTreeCollapseState(state, ['root', 'child', 'grandchild'])
      
      expect(result['root.child.grandchild']).toBe(true)
    })

    test('should not mutate original state', () => {
      const state = { a: true }
      const result = toggleTreeCollapseState(state, 'b')
      
      expect(state).not.toBe(result)
      expect(state.a).toBe(true)
    })
  })

  describe('isPathCollapsed', () => {
    test('should return true when path is in collapsed state', () => {
      const state = { 'path.to.item': true }
      expect(isPathCollapsed(state, 'path.to.item')).toBe(true)
    })

    test('should return false when path is not in collapsed state', () => {
      const state = { 'path.to.item': true }
      expect(isPathCollapsed(state, 'other.path')).toBe(false)
    })

    test('should handle array path', () => {
      const state = { 'root.child': true }
      expect(isPathCollapsed(state, ['root', 'child'])).toBe(true)
    })

    test('should return false for empty state', () => {
      expect(isPathCollapsed({}, 'any.path')).toBe(false)
    })
  })

  describe('validateDisplayState', () => {
    test('should return true for valid states', () => {
      expect(validateDisplayState(DISPLAY_STATES.EMPTY)).toBe(true)
      expect(validateDisplayState(DISPLAY_STATES.LOADING)).toBe(true)
      expect(validateDisplayState(DISPLAY_STATES.READY)).toBe(true)
      expect(validateDisplayState(DISPLAY_STATES.ERROR)).toBe(true)
      expect(validateDisplayState(DISPLAY_STATES.READ_ONLY)).toBe(true)
    })

    test('should return false for invalid states', () => {
      expect(validateDisplayState('invalid')).toBe(false)
      expect(validateDisplayState(null)).toBe(false)
      expect(validateDisplayState(undefined)).toBe(false)
    })
  })

  describe('getDefaultDisplayState', () => {
    test('should return empty state', () => {
      expect(getDefaultDisplayState()).toBe(DISPLAY_STATES.EMPTY)
    })
  })
})
