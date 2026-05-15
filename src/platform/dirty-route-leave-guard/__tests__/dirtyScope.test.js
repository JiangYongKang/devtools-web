import { describe, it, expect, vi } from 'vitest'
import { createDirtyScope, deepEqual, defaultHashFn } from '../logic/index.js'

describe('dirtyScope - hashFn 稳定性', () => {
    it('相同对象应产生相同哈希值', () => {
        const obj = { name: 'test', value: 123 }
        const hash1 = defaultHashFn(obj)
        const hash2 = defaultHashFn(obj)
        expect(hash1).toBe(hash2)
    })

    it('不同对象应产生不同哈希值', () => {
        const obj1 = { name: 'test' }
        const obj2 = { name: 'different' }
        expect(defaultHashFn(obj1)).not.toBe(defaultHashFn(obj2))
    })

    it('嵌套对象哈希应稳定', () => {
        const obj = { user: { name: 'test', address: { city: 'beijing' } } }
        const hash1 = defaultHashFn(obj)
        const hash2 = defaultHashFn(JSON.parse(JSON.stringify(obj)))
        expect(hash1).toBe(hash2)
    })
})

describe('dirtyScope - 深度相等比较', () => {
    it('基本类型相等比较', () => {
        expect(deepEqual(null, null)).toBe(true)
        expect(deepEqual(undefined, undefined)).toBe(true)
        expect(deepEqual(123, 123)).toBe(true)
        expect(deepEqual('test', 'test')).toBe(true)
        expect(deepEqual(true, true)).toBe(true)
    })

    it('基本类型不相等比较', () => {
        expect(deepEqual(123, 456)).toBe(false)
        expect(deepEqual('test', 'Test')).toBe(false)
        expect(deepEqual(true, false)).toBe(false)
        expect(deepEqual(null, undefined)).toBe(false)
    })

    it('数组相等比较', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
        expect(deepEqual([], [])).toBe(true)
        expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true)
    })

    it('数组不相等比较', () => {
        expect(deepEqual([1, 2, 3], [1, 2])).toBe(false)
        expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false)
    })

    it('对象相等比较', () => {
        expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
        expect(deepEqual({}, {})).toBe(true)
        expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
    })

    it('对象不相等比较', () => {
        expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
        expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
        expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
    })
})

describe('dirtyScope - 忽略路径功能', () => {
    it('忽略顶层字段时应视为相等', () => {
        const ignorePaths = new Set(['updatedAt'])
        const a = { name: 'test', updatedAt: '2024-01-01' }
        const b = { name: 'test', updatedAt: '2024-12-31' }
        expect(deepEqual(a, b, ignorePaths)).toBe(true)
    })

    it('忽略嵌套字段时应视为相等', () => {
        const ignorePaths = new Set(['user.updatedAt'])
        const a = { user: { name: 'test', updatedAt: '2024-01-01' } }
        const b = { user: { name: 'test', updatedAt: '2024-12-31' } }
        expect(deepEqual(a, b, ignorePaths)).toBe(true)
    })

    it('忽略数组元素路径时应视为相等', () => {
        const ignorePaths = new Set(['items[0].timestamp'])
        const a = { items: [{ id: 1, timestamp: 1000 }] }
        const b = { items: [{ id: 1, timestamp: 2000 }] }
        expect(deepEqual(a, b, ignorePaths)).toBe(true)
    })

    it('createDirtyScope 配置忽略路径后修改忽略字段不应标记为脏', () => {
        const scope = createDirtyScope({
            initialState: { name: 'test', updatedAt: 0 },
            ignorePaths: ['updatedAt'],
        })

        scope.setCurrent({ name: 'test', updatedAt: Date.now() })
        expect(scope.isDirty()).toBe(false)
    })

    it('createDirtyScope 配置忽略路径后修改非忽略字段应标记为脏', () => {
        const scope = createDirtyScope({
            initialState: { name: 'test', updatedAt: 0 },
            ignorePaths: ['updatedAt'],
        })

        scope.setCurrent({ name: 'modified', updatedAt: 0 })
        expect(scope.isDirty()).toBe(true)
    })
})

describe('dirtyScope - 从脏到净的边沿检测', () => {
    it('初始状态应为干净', () => {
        const scope = createDirtyScope({ initialState: { name: 'test' } })
        expect(scope.isDirty()).toBe(false)
    })

    it('修改后应变为脏', () => {
        const scope = createDirtyScope({ initialState: { name: 'test' } })
        scope.setCurrent({ name: 'modified' })
        expect(scope.isDirty()).toBe(true)
    })

    it('markClean 应将状态变为干净', () => {
        const scope = createDirtyScope({ initialState: { name: 'test' } })
        scope.setCurrent({ name: 'modified' })
        expect(scope.isDirty()).toBe(true)
        scope.markClean()
        expect(scope.isDirty()).toBe(false)
    })

    it('reset 应恢复到初始状态并变为干净', () => {
        const initialState = { name: 'test' }
        const scope = createDirtyScope({ initialState })
        scope.setCurrent({ name: 'modified' })
        expect(scope.isDirty()).toBe(true)
        scope.reset()
        expect(scope.isDirty()).toBe(false)
        expect(scope.getCurrent()).toEqual(initialState)
    })

    it('subscribe 应收到脏状态变化通知', () => {
        const callback = vi.fn()
        const scope = createDirtyScope({ initialState: { name: 'test' } })
        scope.subscribe(callback)

        scope.setCurrent({ name: 'modified' })
        expect(callback).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'dirty' })
        )
    })

    it('subscribe 应收到净状态变化通知', () => {
        const callback = vi.fn()
        const scope = createDirtyScope({ initialState: { name: 'test' } })
        scope.subscribe(callback)

        scope.setCurrent({ name: 'modified' })
        callback.mockClear()

        scope.reset()
        expect(callback).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'clean' })
        )
    })

    it('dirtyTransitionCount 应正确计数状态转换次数', () => {
        const scope = createDirtyScope({ initialState: { name: 'test' } })
        expect(scope.getStatistics().dirtyTransitionCount).toBe(0)

        scope.setCurrent({ name: 'modified' })
        expect(scope.getStatistics().dirtyTransitionCount).toBe(1)

        scope.reset()
        expect(scope.getStatistics().dirtyTransitionCount).toBe(2)
    })
})

describe('dirtyScope - getDirtyFields 功能', () => {
    it('应返回所有变化的字段路径', () => {
        const scope = createDirtyScope({
            initialState: {
                name: 'test',
                user: { age: 20 },
                items: [1, 2],
            },
        })

        scope.setCurrent({
            name: 'modified',
            user: { age: 25 },
            items: [1, 3],
        })

        const dirtyFields = scope.getDirtyFields()
        expect(dirtyFields).toContain('name')
        expect(dirtyFields).toContain('user.age')
        expect(dirtyFields).toContain('items[1]')
    })

    it('应排除忽略路径字段', () => {
        const scope = createDirtyScope({
            initialState: { name: 'test', updatedAt: 0 },
            ignorePaths: ['updatedAt'],
        })

        scope.setCurrent({ name: 'modified', updatedAt: 1000 })

        const dirtyFields = scope.getDirtyFields()
        expect(dirtyFields).toContain('name')
        expect(dirtyFields).not.toContain('updatedAt')
    })
})
