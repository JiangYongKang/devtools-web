import {
  parsePath,
  stringifyPath,
  getPath,
  isDangerousKey,
  checkDangerousKey,
} from '../logic/pathParser.js'
import { PrototypePollutionError, PathError } from '../logic/errors.js'

describe('pathParser - 危险键检测', () => {
  describe('isDangerousKey', () => {
    it('检测 __proto__ 为危险键', () => {
      expect(isDangerousKey('__proto__')).toBe(true)
    })

    it('检测 constructor 为危险键', () => {
      expect(isDangerousKey('constructor')).toBe(true)
    })

    it('检测 prototype 为危险键', () => {
      expect(isDangerousKey('prototype')).toBe(true)
    })

    it('普通键不是危险键', () => {
      expect(isDangerousKey('name')).toBe(false)
      expect(isDangerousKey('a')).toBe(false)
      expect(isDangerousKey('123')).toBe(false)
    })
  })

  describe('checkDangerousKey', () => {
    it('遇到危险键抛出 PrototypePollutionError', () => {
      expect(() => checkDangerousKey('__proto__')).toThrow(PrototypePollutionError)
      expect(() => checkDangerousKey('constructor')).toThrow(PrototypePollutionError)
    })

    it('普通键不抛出错误', () => {
      expect(() => checkDangerousKey('name')).not.toThrow()
    })
  })
})

describe('pathParser - parsePath', () => {
  it('解析空路径返回空数组', () => {
    expect(parsePath('')).toEqual([])
    expect(parsePath(null)).toEqual([])
    expect(parsePath(undefined)).toEqual([])
  })

  it('解析点号表示法', () => {
    const result = parsePath('a.b.c')
    expect(result).toHaveLength(3)
    expect(result[0].value).toBe('a')
    expect(result[1].value).toBe('b')
    expect(result[2].value).toBe('c')
  })

  it('解析方括号表示法', () => {
    const result = parsePath('[0][1][2]')
    expect(result).toHaveLength(3)
    expect(result[0].value).toBe(0)
    expect(result[1].value).toBe(1)
    expect(result[2].value).toBe(2)
  })

  it('解析混合表示法', () => {
    const result = parsePath('a.b[0].c[1]')
    expect(result).toHaveLength(5)
    expect(result[0].value).toBe('a')
    expect(result[1].value).toBe('b')
    expect(result[2].value).toBe(0)
    expect(result[3].value).toBe('c')
    expect(result[4].value).toBe(1)
  })

  it('解析带引号的方括号键', () => {
    const result = parsePath('a["key-with-dash"].b')
    expect(result).toHaveLength(3)
    expect(result[1].value).toBe('key-with-dash')
  })

  it('解析通配符', () => {
    const result = parsePath('a[].b')
    expect(result).toHaveLength(3)
    expect(result[1].type).toBe('wildcard')
  })

  it('解析转义字符', () => {
    const result = parsePath('a\\.b.c')
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe('a.b')
    expect(result[1].value).toBe('c')
  })

  it('遇到 __proto__ 抛出错误', () => {
    expect(() => parsePath('a.__proto__.b')).toThrow(PrototypePollutionError)
  })

  it('遇到 constructor 抛出错误', () => {
    expect(() => parsePath('constructor')).toThrow(PrototypePollutionError)
  })

  it('未闭合的括号抛出 PathError', () => {
    expect(() => parsePath('a[b')).toThrow(PathError)
  })

  it('解析 Unicode 键名', () => {
    const result = parsePath('用户.名前')
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe('用户')
    expect(result[1].value).toBe('名前')
  })
})

describe('pathParser - stringifyPath', () => {
  it('将路径部分转换为字符串', () => {
    expect(stringifyPath(['a', 'b', 'c'])).toBe('a.b.c')
    expect(stringifyPath(['a', 0, 'b'])).toBe('a[0].b')
  })

  it('空数组返回空字符串', () => {
    expect(stringifyPath([])).toBe('')
  })
})

describe('pathParser - getPath', () => {
  const testObj = {
    a: {
      b: {
        c: 'value',
      },
    },
    arr: [1, 2, 3],
    nested: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
    nullVal: null,
  }

  it('获取嵌套属性值', () => {
    expect(getPath(testObj, 'a.b.c')).toBe('value')
  })

  it('获取数组元素', () => {
    expect(getPath(testObj, 'arr[0]')).toBe(1)
    expect(getPath(testObj, 'arr[2]')).toBe(3)
  })

  it('使用通配符获取数组所有元素的属性', () => {
    const result = getPath(testObj, 'nested[*].x')
    expect(result).toEqual([1, 3])
  })

  it('不存在的路径返回 undefined（非 strict 模式）', () => {
    expect(getPath(testObj, 'a.nonexistent')).toBeUndefined()
    expect(getPath(testObj, 'x.y.z')).toBeUndefined()
  })

  it('strict 模式下不存在的路径抛出错误', () => {
    expect(() => getPath(testObj, 'a.nonexistent', { strict: true })).toThrow(PathError)
  })

  it('strict 模式下访问 null 中间节点抛出错误', () => {
    expect(() => getPath(testObj, 'nullVal.x', { strict: true })).toThrow(PathError)
  })

  it('数组越界在 strict 模式下抛出错误', () => {
    expect(() => getPath(testObj, 'arr[10]', { strict: true })).toThrow(PathError)
  })

  it('处理 -0 索引', () => {
    expect(getPath([1, 2, 3], '[-0]')).toBe(1)
  })

  it('从 null 对象返回默认值', () => {
    expect(getPath(null, 'a.b')).toBeUndefined()
    expect(getPath(null, 'a.b', { default: 'default' })).toBe('default')
  })

  it('从 undefined 对象返回默认值', () => {
    expect(getPath(undefined, 'a.b')).toBeUndefined()
    expect(getPath(undefined, 'a.b', { default: 'default' })).toBe('default')
  })
})
