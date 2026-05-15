import { describe, expect, test, vi } from 'vitest'
import {
  WORKER_PROTOCOL_VERSION,
  WORKER_MESSAGE_TYPES,
  validateMessage,
  createWorkerMessage,
  createMessageQueue,
  mergeMessages,
  attachLargeTextController,
} from '../logic/workerProtocol.js'
import {
  ERROR_CODES,
} from '../logic/constants.js'

describe('workerProtocol module', () => {
  describe('protocol version', () => {
    test('should export protocol version', () => {
      expect(WORKER_PROTOCOL_VERSION).toBe(1)
      expect(typeof WORKER_PROTOCOL_VERSION).toBe('number')
    })

    test('should export message types', () => {
      expect(WORKER_MESSAGE_TYPES).toBeDefined()
      expect(WORKER_MESSAGE_TYPES.INIT).toBe('init')
      expect(WORKER_MESSAGE_TYPES.PROCESS_TEXT).toBe('process-text')
      expect(WORKER_MESSAGE_TYPES.PROCESS_RESULT).toBe('process-result')
      expect(WORKER_MESSAGE_TYPES.PROGRESS).toBe('progress')
      expect(WORKER_MESSAGE_TYPES.ERROR).toBe('error')
      expect(WORKER_MESSAGE_TYPES.CANCEL).toBe('cancel')
    })
  })

  describe('validateMessage', () => {
    test('should reject null/undefined', () => {
      expect(validateMessage(null)).toBe(false)
      expect(validateMessage(undefined)).toBe(false)
    })

    test('should reject non-object messages', () => {
      expect(validateMessage('string')).toBe(false)
      expect(validateMessage(123)).toBe(false)
      expect(validateMessage([])).toBe(false)
    })

    test('should reject messages without type', () => {
      expect(validateMessage({})).toBe(false)
      expect(validateMessage({ payload: {} })).toBe(false)
    })

    test('should reject messages with version mismatch', () => {
      expect(
        validateMessage({ type: 'test', version: 999 })
      ).toBe(false)
    })

    test('should accept valid messages', () => {
      expect(
        validateMessage({ type: 'test' })
      ).toBe(true)
      expect(
        validateMessage({ type: 'test', version: WORKER_PROTOCOL_VERSION })
      ).toBe(true)
    })
  })

  describe('createWorkerMessage', () => {
    test('should create message with correct structure', () => {
      const msg = createWorkerMessage('test', { data: 'value' })
      expect(msg.version).toBe(WORKER_PROTOCOL_VERSION)
      expect(msg.type).toBe('test')
      expect(msg.payload).toEqual({ data: 'value' })
      expect(msg.id).toBeDefined()
      expect(msg.timestamp).toBeDefined()
    })

    test('should use custom id if provided', () => {
      const msg = createWorkerMessage('test', {}, { id: 'custom-id' })
      expect(msg.id).toBe('custom-id')
    })

    test('should use unique ids', () => {
      const msg1 = createWorkerMessage('test')
      const msg2 = createWorkerMessage('test')
      expect(msg1.id).not.toBe(msg2.id)
    })
  })

  describe('createMessageQueue', () => {
    test('should create empty queue', () => {
      const queue = createMessageQueue()
      expect(queue.isEmpty()).toBe(true)
      expect(queue.getSize()).toBe(0)
    })

    test('should push and pop messages', () => {
      const queue = createMessageQueue()
      queue.push({ type: 'msg1' })
      queue.push({ type: 'msg2' })

      expect(queue.getSize()).toBe(2)
      expect(queue.pop()).toEqual({ type: 'msg1' })
      expect(queue.pop()).toEqual({ type: 'msg2' })
      expect(queue.isEmpty()).toBe(true)
    })

    test('should peek at first message', () => {
      const queue = createMessageQueue()
      queue.push({ type: 'first' })
      queue.push({ type: 'second' })

      expect(queue.peek()).toEqual({ type: 'first' })
      expect(queue.getSize()).toBe(2)
    })

    test('should drain all messages', () => {
      const queue = createMessageQueue()
      queue.push({ type: 'a' })
      queue.push({ type: 'b' })

      const all = queue.drainAll()
      expect(all).toEqual([{ type: 'a' }, { type: 'b' }])
      expect(queue.isEmpty()).toBe(true)
    })

    test('should clear queue', () => {
      const queue = createMessageQueue()
      queue.push({ type: 'a' })
      queue.clear()
      expect(queue.isEmpty()).toBe(true)
    })

    describe('max depth with mergeStrategy latest', () => {
      test('should drop oldest when full (latest strategy)', () => {
        const queue = createMessageQueue({ maxDepth: 3, mergeStrategy: 'latest' })
        queue.push({ type: '1' })
        queue.push({ type: '2' })
        queue.push({ type: '3' })
        queue.push({ type: '4' })

        expect(queue.getSize()).toBe(3)
        const all = queue.drainAll()
        expect(all).toEqual([{ type: '2' }, { type: '3' }, { type: '4' }])
      })
    })

    describe('max depth with mergeStrategy drop-new', () => {
      test('should throw when full (drop-new strategy)', () => {
        const queue = createMessageQueue({ maxDepth: 2, mergeStrategy: 'drop-new' })
        queue.push({ type: '1' })
        queue.push({ type: '2' })

        expect(() => {
          queue.push({ type: '3' })
        }).toThrow()

        let thrownError = null
        try {
          queue.push({ type: '3' })
        } catch (e) {
          thrownError = e
        }
        expect(thrownError).not.toBeNull()
        expect(thrownError.errorCode).toBe(ERROR_CODES.MESSAGE_QUEUE_OVERFLOW)
      })
    })

    describe('max depth with mergeStrategy merge', () => {
      test('should merge messages when full', () => {
        const queue = createMessageQueue({ maxDepth: 3, mergeStrategy: 'merge' })
        queue.push({ type: '1', timestamp: 1 })
        queue.push({ type: '2', timestamp: 2 })
        queue.push({ type: '3', timestamp: 3 })
        queue.push({ type: '4', timestamp: 4 })

        expect(queue.getSize()).toBe(2)
        const all = queue.drainAll()
        expect(all[0].merged).toBe(true)
        expect(all[0].payload.count).toBe(3)
      })
    })
  })

  describe('mergeMessages', () => {
    test('should return null for empty array', () => {
      expect(mergeMessages([])).toBe(null)
    })

    test('should return single message unchanged', () => {
      const msg = { type: 'test', payload: { a: 1 } }
      expect(mergeMessages([msg])).toBe(msg)
    })

    test('should merge multiple messages', () => {
      const msg1 = { type: 'a', payload: { x: 1 }, timestamp: 1 }
      const msg2 = { type: 'b', payload: { y: 2 }, timestamp: 2 }

      const merged = mergeMessages([msg1, msg2])
      expect(merged.version).toBe(WORKER_PROTOCOL_VERSION)
      expect(merged.type).toBe('merged')
      expect(merged.merged).toBe(true)
      expect(merged.payload.count).toBe(2)
      expect(merged.payload.messages.length).toBe(2)
    })
  })

  describe('attachLargeTextController', () => {
    test('should return controller for null editorRef', () => {
      const controller = attachLargeTextController(null)
      expect(controller).toBeDefined()
      expect(typeof controller.attach).toBe('function')
      expect(typeof controller.detach).toBe('function')
      expect(typeof controller.getState).toBe('function')
      expect(typeof controller.checkBudget).toBe('function')
    })

    test('should call onOverBudget for null editorRef', () => {
      const onOverBudget = vi.fn()
      attachLargeTextController(null, { onOverBudget })
      expect(onOverBudget).toHaveBeenCalledWith({
        reason: 'no-editor',
        threshold: 0,
        current: 0,
      })
    })

    test('should return controller for valid editorRef', () => {
      const editorRef = { current: null }
      const controller = attachLargeTextController(editorRef)
      expect(controller).toBeDefined()
      expect(controller.getState()).toEqual({
        isAttached: false,
        byteSize: 0,
        charCount: 0,
        overBudget: false,
      })
      expect(controller.checkBudget()).toBe(false)
    })
  })
})
