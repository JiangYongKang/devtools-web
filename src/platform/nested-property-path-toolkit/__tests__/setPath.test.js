import { setPathImmutable, setPathMutable, clone } from '../logic/setPath.js'
import { PrototypePollutionError } from '../logic/errors.js'

describe('setPath - clone', () => {
  it('克隆对象', () => {
    const obj = { a: 1, b: { c: 2 } }
    const cloned = clone(obj)
    expect(cloned).toEqual(obj)
    expect(cloned).not.toBe(obj)
    expect(cloned.b).not.toBe(obj.b)
  })

  it('克隆数组', () => {
    const arr = [1, 2, { a: 3 }]
    const cloned = clone(arr)
    expect(cloned).toEqual(arr)
    expect(cloned).not.toBe(arr)
    expect(cloned[2]).not.toBe(arr[2])
  })

  it('原始类型直接返回', () => {
    expect(clone(1)).toBe(1)
    expect(clone('test')).toBe('test')
    expect(clone(true)).toBe(true)
    expect(clone(null)).toBe(null)
    expect(clone(undefined)).toBe(undefined)
  })
})

describe('setPath - setPathImmutable', () => {
  it('不可变更新嵌套属性', () => {
    const obj = { a: { b: { c: 1 } } }
    const result = setPathImmutable(obj, 'a.b.c', 2)

    expect(result.a.b.c).toBe(2)
    expect(obj.a.b.c).toBe(1)
    expect(result).not.toBe(obj)
    expect(result.a).not.toBe(obj.a)
    expect(result.a.b).not.toBe(obj.a.b)
  })

  it('创建不存在的中间路径', () => {
    const obj = { a: {} }
    const result = setPathImmutable(obj, 'a.b.c.d', 'value')

    expect(result.a.b.c.d).toBe('value')
  })

  it('更新数组元素', () => {
    const obj = { arr: [1, 2, 3] }
    const result = setPathImmutable(obj, 'arr[1]', 100)

    expect(result.arr[1]).toBe(100)
    expect(obj.arr[1]).toBe(2)
  })

  it('创建数组和元素', () => {
    const obj = {}
    const result = setPathImmutable(obj, 'items[2].name', 'test')

    expect(result.items[2].name).toBe('test')
    expect(result.items.length).toBe(3)
  })

  it('使用函数更新值', () => {
    const obj = { count: 5 }
    const result = setPathImmutable(obj, 'count', (v) => v * 2)

    expect(result.count).toBe(10)
  })

  it('使用通配符批量更新数组', () => {
    const obj = { items: [{ x: 1 }, { x: 2 }, { x: 3 }] }
    const result = setPathImmutable(obj, 'items[*].selected', true)

    expect(result.items.every((item) => item.selected === true)).toBe(true)
    expect(obj.items.every((item) => item.selected === undefined)).toBe(true)
  })

  it('__proto__ 路径抛出 PrototypePollutionError', () => {
    const obj = {}
    expect(() => setPathImmutable(obj, '__proto__.polluted', true)).toThrow(PrototypePollutionError)
  })

  it('constructor 路径抛出 PrototypePollutionError', () => {
    const obj = {}
    expect(() => setPathImmutable(obj, 'constructor.polluted', true)).toThrow(PrototypePollutionError)
  })

  it('方括号中的 __proto__ 抛出 PrototypePollutionError', () => {
    const obj = {}
    expect(() => setPathImmutable(obj, '["__proto__"].polluted', true)).toThrow(PrototypePollutionError)
  })
})

describe('setPath - setPathMutable', () => {
  it('可变更新嵌套属性', () => {
    const obj = { a: { b: { c: 1 } } }
    const result = setPathMutable(obj, 'a.b.c', 2)

    expect(obj.a.b.c).toBe(2)
    expect(result).toBe(obj)
  })

  it('创建不存在的中间路径', () => {
    const obj = { a: {} }
    setPathMutable(obj, 'a.b.c.d', 'value')

    expect(obj.a.b.c.d).toBe('value')
  })

  it('使用通配符批量更新数组', () => {
    const obj = { items: [{ x: 1 }, { x: 2 }, { x: 3 }] }
    setPathMutable(obj, 'items[*].x', 0)

    expect(obj.items.every((item) => item.x === 0)).toBe(true)
  })

  it('__proto__ 路径抛出 PrototypePollutionError', () => {
    const obj = {}
    expect(() => setPathMutable(obj, '__proto__.polluted', true)).toThrow(PrototypePollutionError)
  })
})
