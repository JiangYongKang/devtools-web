import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest'
import {
    createGlobalErrorListener,
    isListenerActive,
    clearSingleton,
    dedupeSimilar,
    markHandled,
} from '../logic/listener.js'
import { HANDLED_MARKER } from '../logic/constants.js'

describe('事件监听器 (listener.js)', () => {
    beforeEach(() => {
        clearSingleton()
        vi.useFakeTimers()
    })

    afterEach(() => {
        clearSingleton()
        vi.useRealTimers()
    })

    describe('单例锁机制', () => {
        test('首次创建应该成功', () => {
            const listener = createGlobalErrorListener(() => {})
            expect(listener).not.toBeNull()
            expect(isListenerActive()).toBe(true)
        })

        test('重复创建应该返回 null', () => {
            const listener1 = createGlobalErrorListener(() => {})
            const listener2 = createGlobalErrorListener(() => {})

            expect(listener1).not.toBeNull()
            expect(listener2).toBeNull()
        })

        test('clearSingleton 应该重置单例', () => {
            createGlobalErrorListener(() => {})
            expect(isListenerActive()).toBe(true)

            clearSingleton()
            expect(isListenerActive()).toBe(false)

            const listener = createGlobalErrorListener(() => {})
            expect(listener).not.toBeNull()
        })
    })

    describe('去重聚合', () => {
        test('相同错误应该被去重', () => {
            const events = [
                {
                    eventType: 'error',
                    timestamp: 1,
                    isPromiseRejection: false,
                    error: { name: 'TypeError', message: 'test' },
                },
                {
                    eventType: 'error',
                    timestamp: 2,
                    isPromiseRejection: false,
                    error: { name: 'TypeError', message: 'test' },
                },
            ]

            const result = dedupeSimilar(events)
            expect(result.length).toBe(1)
        })

        test('不同错误应该保留', () => {
            const events = [
                {
                    eventType: 'error',
                    timestamp: 1,
                    isPromiseRejection: false,
                    error: { name: 'TypeError', message: 'A' },
                },
                {
                    eventType: 'error',
                    timestamp: 2,
                    isPromiseRejection: false,
                    error: { name: 'TypeError', message: 'B' },
                },
            ]

            const result = dedupeSimilar(events)
            expect(result.length).toBe(2)
        })

        test('不同事件类型即使相同错误也应该分别保留', () => {
            const events = [
                {
                    eventType: 'error',
                    timestamp: 1,
                    isPromiseRejection: false,
                    error: { name: 'TypeError', message: 'test' },
                },
                {
                    eventType: 'unhandledrejection',
                    timestamp: 2,
                    isPromiseRejection: true,
                    reason: { name: 'TypeError', message: 'test' },
                },
            ]

            const result = dedupeSimilar(events)
            expect(result.length).toBe(2)
        })
    })

    describe('已处理标记', () => {
        test('markHandled 应该标记对象', () => {
            const obj = { a: 1 }
            markHandled(obj)

            expect(obj[HANDLED_MARKER]).toBe(true)
        })

        test('已处理标记不应该被枚举', () => {
            const obj = { a: 1 }
            markHandled(obj)

            const keys = Object.keys(obj)
            expect(keys).not.toContain(HANDLED_MARKER)
        })

        test('markHandled 应该处理非对象值', () => {
            expect(() => markHandled(null)).not.toThrow()
            expect(() => markHandled(undefined)).not.toThrow()
            expect(() => markHandled(123)).not.toThrow()
            expect(() => markHandled('string')).not.toThrow()
        })
    })

    describe('监听器生命周期', () => {
        test('listener 应该具有 start/stop/flush 方法', () => {
            const listener = createGlobalErrorListener(() => {})

            expect(typeof listener.start).toBe('function')
            expect(typeof listener.stop).toBe('function')
            expect(typeof listener.flush).toBe('function')
            expect(typeof listener.getQueueSize).toBe('function')
        })

        test('getQueueSize 初始应该为 0', () => {
            const listener = createGlobalErrorListener(() => {})
            expect(listener.getQueueSize()).toBe(0)
        })
    })
})
