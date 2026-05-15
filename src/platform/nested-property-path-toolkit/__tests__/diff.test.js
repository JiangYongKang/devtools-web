import {
  diff,
  isEqual,
  maskSensitiveData,
  getChangedPaths,
} from '../logic/diff.js'
import { DIFF_TYPES } from '../logic/constants.js'

describe('diff - isEqual', () => {
  it('比较原始类型', () => {
    expect(isEqual(1, 1)).toBe(true)
    expect(isEqual('test', 'test')).toBe(true)
    expect(isEqual(true, true)).toBe(true)
    expect(isEqual(null, null)).toBe(true)
    expect(isEqual(undefined, undefined)).toBe(true)
  })

  it('比较 NaN', () => {
    expect(isEqual(NaN, NaN)).toBe(true)
  })

  it('比较 0 和 -0', () => {
    expect(isEqual(0, -0)).toBe(false)
  })

  it('比较对象', () => {
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(isEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
  })

  it('比较数组', () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false)
  })

  it('比较嵌套对象', () => {
    const obj1 = { a: { b: { c: 1 } } }
    const obj2 = { a: { b: { c: 1 } } }
    const obj3 = { a: { b: { c: 2 } } }
    expect(isEqual(obj1, obj2)).toBe(true)
    expect(isEqual(obj1, obj3)).toBe(false)
  })
})

describe('diff - diff', () => {
  it('相同对象返回空数组', () => {
    const obj = { a: 1, b: 2 }
    expect(diff(obj, obj)).toEqual([])
  })

  it('检测添加的属性', () => {
    const oldObj = { a: 1 }
    const newObj = { a: 1, b: 2 }
    const changes = diff(oldObj, newObj)

    expect(changes).toContainEqual({
      type: DIFF_TYPES.ADD,
      path: 'b',
      value: 2,
    })
  })

  it('检测删除的属性', () => {
    const oldObj = { a: 1, b: 2 }
    const newObj = { a: 1 }
    const changes = diff(oldObj, newObj)

    expect(changes).toContainEqual({
      type: DIFF_TYPES.REMOVE,
      path: 'b',
      oldValue: 2,
    })
  })

  it('检测更新的属性', () => {
    const oldObj = { a: 1, b: 2 }
    const newObj = { a: 1, b: 3 }
    const changes = diff(oldObj, newObj)

    expect(changes).toContainEqual({
      type: DIFF_TYPES.UPDATE,
      path: 'b',
      oldValue: 2,
      value: 3,
    })
  })

  it('检测嵌套对象变更', () => {
    const oldObj = { a: { b: { c: 1 } } }
    const newObj = { a: { b: { c: 2 } } }
    const changes = diff(oldObj, newObj)

    expect(changes).toContainEqual({
      type: DIFF_TYPES.UPDATE,
      path: 'a.b.c',
      oldValue: 1,
      value: 2,
    })
  })

  it('检测数组元素变更', () => {
    const oldArr = [1, 2, 3]
    const newArr = [1, 4, 3]
    const changes = diff(oldArr, newArr)

    expect(changes).toContainEqual({
      type: DIFF_TYPES.UPDATE,
      path: '[1]',
      oldValue: 2,
      value: 4,
    })
  })

  it('检测数组元素添加', () => {
    const oldArr = [1, 2]
    const newArr = [1, 2, 3]
    const changes = diff(oldArr, newArr)

    expect(changes).toContainEqual({
      type: DIFF_TYPES.ADD,
      path: '[2]',
      value: 3,
    })
  })

  it('检测数组元素删除', () => {
    const oldArr = [1, 2, 3]
    const newArr = [1, 2]
    const changes = diff(oldArr, newArr)

    expect(changes).toContainEqual({
      type: DIFF_TYPES.REMOVE,
      path: '[2]',
      oldValue: 3,
    })
  })

  it('检测嵌套数组对象变更', () => {
    const oldObj = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] }
    const newObj = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'c' }] }
    const changes = diff(oldObj, newObj)

    expect(changes).toContainEqual({
      type: DIFF_TYPES.UPDATE,
      path: 'items[1].name',
      oldValue: 'b',
      value: 'c',
    })
  })
})

describe('diff - maskSensitiveData', () => {
  it('脱敏敏感字段', () => {
    const obj = {
      user: {
        profile: {
          email: 'user@example.com',
          phone: '123-456-7890',
        },
        name: 'John',
      },
    }

    const sensitivePaths = ['user.profile.email', 'user.profile.phone']
    const masked = maskSensitiveData(obj, sensitivePaths)

    expect(masked.user.profile.email).toBe('***')
    expect(masked.user.profile.phone).toBe('***')
    expect(masked.user.name).toBe('John')
  })

  it('不修改原对象', () => {
    const obj = { password: 'secret123' }
    const masked = maskSensitiveData(obj, ['password'])

    expect(obj.password).toBe('secret123')
    expect(masked.password).toBe('***')
  })

  it('使用自定义掩码', () => {
    const obj = { password: 'secret123' }
    const masked = maskSensitiveData(obj, ['password'], 'XXX')

    expect(masked.password).toBe('XXX')
  })
})

describe('diff - getChangedPaths', () => {
  it('返回所有变更路径', () => {
    const oldObj = { a: 1, b: { c: 2 }, d: 3 }
    const newObj = { a: 1, b: { c: 4 }, e: 5 }
    const paths = getChangedPaths(oldObj, newObj)

    expect(paths).toContain('b.c')
    expect(paths).toContain('d')
    expect(paths).toContain('e')
  })

  it('相同对象返回空数组', () => {
    const obj = { a: 1, b: 2 }
    expect(getChangedPaths(obj, obj)).toEqual([])
  })
})
