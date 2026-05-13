import { describe, expect, test } from 'vitest'
import { assembleDiagnosticPackage, serializeDiagnosticPackage, cleanStackTraceForProduction, isProductionPath, loadDrafts, saveDrafts, clearDrafts, copyToClipboard } from '../logic/index.js'
import { ENVIRONMENTS } from '../logic/constants.js'

describe('诊断包组装 (index.js)', () => {
    describe('assembleDiagnosticPackage', () => {
        test('应该包含所有必需字段', () => {
            const error = new Error('test error')
            const pkg = assembleDiagnosticPackage({
                error,
                source: 'boundary',
                errorCode: 'RENDER_ERROR',
                errorMessage: '组件渲染异常',
            })

            expect(pkg.schemaVersion).toBe('1.0.0')
            expect(pkg.timestamp).toBeDefined()
            expect(pkg.timestamp.epoch).toBeDefined()
            expect(pkg.timestamp.iso).toBeDefined()
            expect(pkg.environment).toBeDefined()
            expect(pkg.source).toBe('boundary')
            expect(pkg.errorCode).toBe('RENDER_ERROR')
            expect(pkg.errorMessage).toBe('组件渲染异常')
            expect(pkg.error.name).toBe('Error')
            expect(pkg.error.message).toBe('test error')
        })

        test('应该处理可选字段', () => {
            const pkg = assembleDiagnosticPackage({
                error: null,
                source: 'global.error',
            })

            expect(pkg.error).toBeNull()
            expect(pkg.componentStack).toBeNull()
            expect(pkg.customContext).toBeNull()
        })

        test('应该包含自定义上下文', () => {
            const error = new Error('test')
            const context = { userId: '123', feature: 'demo' }
            const pkg = assembleDiagnosticPackage({
                error,
                source: 'boundary',
                customContext: context,
            })

            expect(pkg.customContext).toEqual(context)
        })
    })

    describe('serializeDiagnosticPackage', () => {
        test('应该生成有效的 JSON', () => {
            const pkg = {
                schemaVersion: '1.0.0',
                timestamp: { epoch: 123, iso: '2024-01-01T00:00:00.000Z' },
                environment: ENVIRONMENTS.DEVELOPMENT,
            }

            const json = serializeDiagnosticPackage(pkg)
            const parsed = JSON.parse(json)

            expect(parsed.schemaVersion).toBe('1.0.0')
            expect(parsed.environment).toBe(ENVIRONMENTS.DEVELOPMENT)
        })

        test('应该格式化输出', () => {
            const pkg = { a: 1, b: 2 }
            const json = serializeDiagnosticPackage(pkg)

            expect(json).toContain('\n')
            expect(json).toContain('  ')
        })
    })

    describe('生产环境源码路径隐藏', () => {
        test('isProductionPath 应该匹配 node_modules', () => {
            expect(isProductionPath('/project/node_modules/react/index.js')).toBe(true)
            expect(isProductionPath('/project/src/App.jsx')).toBe(false)
        })

        test('isProductionPath 应该匹配 min.js', () => {
            expect(isProductionPath('https://cdn.example.com/react.min.js')).toBe(true)
            expect(isProductionPath('https://cdn.example.com/react.js')).toBe(false)
        })

        test('isProductionPath 应该处理 null/undefined', () => {
            expect(isProductionPath(null)).toBe(false)
            expect(isProductionPath(undefined)).toBe(false)
            expect(isProductionPath('')).toBe(false)
        })

        test('cleanStackTraceForProduction 应该隐藏生产路径', () => {
            const stack = `Error: test
    at Object.<anonymous> (/project/node_modules/react/index.js:1:1)
    at App (/project/src/App.jsx:10:20)`

            const cleaned = cleanStackTraceForProduction(stack)

            expect(cleaned).not.toContain('/project/node_modules/react/index.js')
            expect(cleaned).toContain('[hidden_path]')
            expect(cleaned).toContain('/project/src/App.jsx')
        })

        test('cleanStackTraceForProduction 应该处理 null', () => {
            expect(cleanStackTraceForProduction(null)).toBeNull()
            expect(cleanStackTraceForProduction(undefined)).toBeUndefined()
        })
    })

    describe('本地草稿管理', () => {
        test('loadDrafts 没有 storage 时返回空数组', () => {
            const result = loadDrafts(null)
            expect(result).toEqual([])
        })

        test('loadDrafts 应该解析 storage 中的 JSON', () => {
            const testDrafts = [{ id: 1, content: 'test' }]
            const mockStorage = {
                getItem: () => JSON.stringify(testDrafts),
            }
            expect(loadDrafts(mockStorage)).toEqual(testDrafts)
        })

        test('loadDrafts 应该处理无效 JSON', () => {
            const mockStorage = {
                getItem: () => 'invalid json',
            }
            expect(loadDrafts(mockStorage)).toEqual([])
        })

        test('loadDrafts 应该处理非数组值', () => {
            const mockStorage = {
                getItem: () => JSON.stringify({ not: 'array' }),
            }
            expect(loadDrafts(mockStorage)).toEqual([])
        })

        test('saveDrafts 没有 storage 时失败', () => {
            const result = saveDrafts([], null)
            expect(result.success).toBe(false)
        })

        test('saveDrafts 应该保存到 storage', () => {
            let stored = null
            const mockStorage = {
                setItem: (key, value) => {
                    stored = value
                },
            }
            const testDrafts = [{ id: 1 }]
            const result = saveDrafts(testDrafts, mockStorage)
            expect(result.success).toBe(true)
            expect(JSON.parse(stored)).toEqual(testDrafts)
        })

        test('clearDrafts 没有 storage 时失败', () => {
            const result = clearDrafts(null)
            expect(result.success).toBe(false)
        })

        test('clearDrafts 应该删除 storage 项', () => {
            let removed = false
            const mockStorage = {
                removeItem: () => {
                    removed = true
                },
            }
            const result = clearDrafts(mockStorage)
            expect(result.success).toBe(true)
            expect(removed).toBe(true)
        })
    })

    describe('copyToClipboard', () => {
        test('没有 navigator 时应该失败', async () => {
            const originalNavigator = global.navigator
            delete global.navigator

            const result = await copyToClipboard('test')
            expect(result.success).toBe(false)
            expect(result.error).toBe('clipboard_not_available')

            global.navigator = originalNavigator
        })
    })
})
