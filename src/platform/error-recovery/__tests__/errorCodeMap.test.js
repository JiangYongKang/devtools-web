import { describe, expect, test } from 'vitest'
import { mapToErrorCode } from '../logic/errorCodeMap.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('错误码映射 (errorCodeMap.js)', () => {
    test('null/undefined 错误应该映射为 UNKNOWN_ERROR', () => {
        expect(mapToErrorCode(null)).toBe(ERROR_CODES.UNKNOWN_ERROR)
        expect(mapToErrorCode(undefined)).toBe(ERROR_CODES.UNKNOWN_ERROR)
    })

    test('Promise rejection 事件类型应该映射为 PROMISE_REJECTION', () => {
        const promiseRejectionEvent = {
            type: 'unhandledrejection',
            reason: new Error('promise rejected'),
        }

        const code = mapToErrorCode(promiseRejectionEvent, 'unhandledrejection')
        expect(code).toBe(ERROR_CODES.PROMISE_REJECTION)
    })

    test('带 DOMException 的 Promise rejection 应该映射为 DOM_EXCEPTION', () => {
        const domException = new DOMException('Aborted', 'AbortError')
        const promiseRejectionEvent = {
            type: 'unhandledrejection',
            reason: domException,
        }

        const code = mapToErrorCode(promiseRejectionEvent, 'unhandledrejection')
        expect(code).toBe(ERROR_CODES.DOM_EXCEPTION)
    })

    test('DOMException 实例应该映射为 DOM_EXCEPTION', () => {
        const err = new DOMException('Security error', 'SecurityError')
        expect(mapToErrorCode(err)).toBe(ERROR_CODES.DOM_EXCEPTION)
    })

    test('DOMException NetworkError 应该映射为 NETWORK_ERROR', () => {
        const err = new DOMException('Network failed', 'NetworkError')
        expect(mapToErrorCode(err)).toBe(ERROR_CODES.NETWORK_ERROR)
    })

    test('包含 fetch 关键字的 TypeError 应该映射为 NETWORK_ERROR', () => {
        const err = new TypeError('Failed to fetch')
        expect(mapToErrorCode(err)).toBe(ERROR_CODES.NETWORK_ERROR)
    })

    test('堆栈包含 useEffect 应该映射为 ASYNC_EFFECT_ERROR', () => {
        const err = new Error('Effect error')
        err.stack = `Error: Effect error
    at useEffect (react:1:1)
    at App (App.jsx:10:1)`

        expect(mapToErrorCode(err)).toBe(ERROR_CODES.ASYNC_EFFECT_ERROR)
    })

    test('堆栈包含 useLayoutEffect 应该映射为 ASYNC_EFFECT_ERROR', () => {
        const err = new Error('Layout effect error')
        err.stack = `Error: Layout effect error
    at useLayoutEffect (react:1:1)
    at App (App.jsx:10:1)`

        expect(mapToErrorCode(err)).toBe(ERROR_CODES.ASYNC_EFFECT_ERROR)
    })

    test('堆栈包含 render() 应该映射为 RENDER_ERROR', () => {
        const err = new Error('Render error')
        err.stack = `Error: Render error
    at render (App.jsx:5:1)
    at App (App.jsx:10:1)`

        expect(mapToErrorCode(err)).toBe(ERROR_CODES.RENDER_ERROR)
    })

    test('普通 TypeError（非网络）应该映射为 EVENT_HANDLER_ERROR', () => {
        const err = new TypeError('Cannot read property of undefined')
        err.stack = `TypeError: Cannot read property of undefined
    at onClick (Button.jsx:1:1)`

        expect(mapToErrorCode(err)).toBe(ERROR_CODES.EVENT_HANDLER_ERROR)
    })

    test('SyntaxError 应该映射为 DOM_EXCEPTION', () => {
        const err = new SyntaxError('Invalid JSON')
        expect(mapToErrorCode(err)).toBe(ERROR_CODES.DOM_EXCEPTION)
    })

    test('消息包含 render 关键字应该映射为 RENDER_ERROR', () => {
        const err = {
            name: 'Error',
            message: 'Render phase error',
        }
        expect(mapToErrorCode(err)).toBe(ERROR_CODES.RENDER_ERROR)
    })

    test('消息包含 effect 关键字应该映射为 ASYNC_EFFECT_ERROR', () => {
        const err = {
            name: 'Error',
            message: 'Effect cleanup failed',
        }
        expect(mapToErrorCode(err)).toBe(ERROR_CODES.ASYNC_EFFECT_ERROR)
    })

    test('未知错误类型应该映射为 UNKNOWN_ERROR', () => {
        const err = {
            name: 'CustomError',
            message: 'Something happened',
        }
        expect(mapToErrorCode(err)).toBe(ERROR_CODES.UNKNOWN_ERROR)
    })
})
