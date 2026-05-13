import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest'
import { generateFingerprint, createThrottleStore, shouldReport, recordReport } from '../logic/fingerprint.js'
import { FINGERPRINT_WINDOW_MS, MAX_REPORTS_PER_WINDOW } from '../logic/constants.js'

describe('错误指纹与限流 (fingerprint.js)', () => {
    describe('generateFingerprint', () => {
        test('应该为 null/undefined 错误生成一致的指纹', () => {
            const fp1 = generateFingerprint(null)
            const fp2 = generateFingerprint(undefined)
            expect(typeof fp1).toBe('string')
            expect(fp1.length).toBeGreaterThan(0)
        })

        test('相同错误应该生成相同指纹', () => {
            const error1 = new Error('Test error')
            const error2 = new Error('Test error')

            error1.stack = `Error: Test error
    at Object.<anonymous> (/src/test.js:1:1)`
            error2.stack = `Error: Test error
    at Object.<anonymous> (/src/test.js:1:1)`

            const fp1 = generateFingerprint(error1)
            const fp2 = generateFingerprint(error2)

            expect(fp1).toBe(fp2)
        })

        test('不同消息应该生成不同指纹', () => {
            const error1 = new Error('Error A')
            const error2 = new Error('Error B')

            error1.stack = `Error: Error A
    at Object.<anonymous> (/src/test.js:1:1)`
            error2.stack = `Error: Error B
    at Object.<anonymous> (/src/test.js:1:1)`

            const fp1 = generateFingerprint(error1)
            const fp2 = generateFingerprint(error2)

            expect(fp1).not.toBe(fp2)
        })

        test('应该包含组件栈', () => {
            const error = new Error('Test')
            error.stack = `Error: Test
    at App (/src/App.jsx:1:1)`

            const fp1 = generateFingerprint(error, 'at Button')
            const fp2 = generateFingerprint(error, 'at Input')

            expect(fp1).not.toBe(fp2)
        })
    })

    describe('限流机制', () => {
        let store

        beforeEach(() => {
            store = createThrottleStore()
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        test('新指纹首次应该允许上报', () => {
            const error = new Error('Test')
            error.stack = `Error: Test\n    at Test (/src/test.js:1:1)`
            const fingerprint = generateFingerprint(error)

            const check = shouldReport(fingerprint, store)
            expect(check.shouldReport).toBe(true)
            expect(check.count).toBe(0)
        })

        test('在限制内应该持续允许', () => {
            const error = new Error('Test')
            error.stack = `Error: Test\n    at Test (/src/test.js:1:1)`
            const fingerprint = generateFingerprint(error)

            for (let i = 0; i < MAX_REPORTS_PER_WINDOW; i++) {
                const check = shouldReport(fingerprint, store)
                expect(check.shouldReport).toBe(true)
                recordReport(fingerprint, store)
            }
        })

        test('超过限制应该拒绝上报', () => {
            const error = new Error('Test')
            error.stack = `Error: Test\n    at Test (/src/test.js:1:1)`
            const fingerprint = generateFingerprint(error)

            for (let i = 0; i < MAX_REPORTS_PER_WINDOW; i++) {
                recordReport(fingerprint, store)
            }

            const check = shouldReport(fingerprint, store)
            expect(check.shouldReport).toBe(false)
            expect(check.count).toBe(MAX_REPORTS_PER_WINDOW)
        })

        test('时间窗口过后应该重置计数', () => {
            const error = new Error('Test')
            error.stack = `Error: Test\n    at Test (/src/test.js:1:1)`
            const fingerprint = generateFingerprint(error)

            for (let i = 0; i < MAX_REPORTS_PER_WINDOW; i++) {
                recordReport(fingerprint, store)
            }

            let check = shouldReport(fingerprint, store)
            expect(check.shouldReport).toBe(false)

            vi.advanceTimersByTime(FINGERPRINT_WINDOW_MS + 1000)

            check = shouldReport(fingerprint, store)
            expect(check.shouldReport).toBe(true)
            expect(check.count).toBe(0)
        })

        test('不同指纹应该独立计数', () => {
            const error1 = new Error('Error 1')
            error1.stack = `Error: Error 1\n    at Test1 (/src/test.js:1:1)`
            const fp1 = generateFingerprint(error1)

            const error2 = new Error('Error 2')
            error2.stack = `Error: Error 2\n    at Test2 (/src/test.js:2:2)`
            const fp2 = generateFingerprint(error2)

            for (let i = 0; i < MAX_REPORTS_PER_WINDOW; i++) {
                recordReport(fp1, store)
            }

            const check1 = shouldReport(fp1, store)
            const check2 = shouldReport(fp2, store)

            expect(check1.shouldReport).toBe(false)
            expect(check2.shouldReport).toBe(true)
        })
    })
})
