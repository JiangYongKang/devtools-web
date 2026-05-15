import { describe, expect, it } from 'vitest'
import {
    computeFieldDiff,
    computeStringDiff,
    deepClone,
    flattenObject,
    isEqual,
    lcs,
    mergeFields,
    unflattenObject,
} from '../logic/index.js'

describe('diff 算法测试', () => {
  describe('对象平铺与还原', () => {
    it('正确平铺嵌套对象', () => {
      const obj = {
        a: 1,
        b: {
          c: 2,
          d: {
            e: 3,
          },
        },
      }

      const flattened = flattenObject(obj)
      expect(flattened).toEqual({
        a: 1,
        'b.c': 2,
        'b.d.e': 3,
      })
    })

    it('正确还原平铺对象', () => {
      const flattened = {
        a: 1,
        'b.c': 2,
        'b.d.e': 3,
      }

      const unflattened = unflattenObject(flattened)
      expect(unflattened).toEqual({
        a: 1,
        b: {
          c: 2,
          d: {
            e: 3,
          },
        },
      })
    })

    it('平铺与还原应该是可逆操作', () => {
      const original = {
        title: '测试',
        description: '详情',
        meta: {
          author: 'user1',
          tags: ['a', 'b'],
        },
      }

      const result = unflattenObject(flattenObject(original))
      expect(result).toEqual(original)
    })
  })

  describe('字段级 diff 计算', () => {
    it('检测本地独有修改', () => {
      const base = { title: '原标题', status: 'todo' }
      const local = { title: '新标题', status: 'todo' }
      const remote = { title: '原标题', status: 'todo' }

      const diff = computeFieldDiff(local, remote, base)
      expect(diff.changes).toHaveLength(1)
      expect(diff.changes[0].type).toBe('local_only')
      expect(diff.changes[0].key).toBe('title')
      expect(diff.hasConflicts).toBe(false)
    })

    it('检测远端独有修改', () => {
      const base = { title: '原标题', status: 'todo' }
      const local = { title: '原标题', status: 'todo' }
      const remote = { title: '原标题', status: 'done' }

      const diff = computeFieldDiff(local, remote, base)
      expect(diff.changes).toHaveLength(1)
      expect(diff.changes[0].type).toBe('remote_only')
      expect(diff.changes[0].key).toBe('status')
      expect(diff.hasConflicts).toBe(false)
    })

    it('检测冲突修改', () => {
      const base = { title: '原标题', status: 'todo', priority: 'medium' }
      const local = { title: '本地标题', status: 'in_progress', priority: 'low' }
      const remote = { title: '远端标题', status: 'review', priority: 'high' }

      const diff = computeFieldDiff(local, remote, base)
      expect(diff.conflicts).toHaveLength(3)
      expect(diff.hasConflicts).toBe(true)
    })

    it('无修改时返回空', () => {
      const base = { title: '原标题', status: 'todo' }
      const local = { title: '原标题', status: 'todo' }
      const remote = { title: '原标题', status: 'todo' }

      const diff = computeFieldDiff(local, remote, base)
      expect(diff.changes).toHaveLength(0)
      expect(diff.conflicts).toHaveLength(0)
      expect(diff.hasConflicts).toBe(false)
    })
  })

  describe('字段合并', () => {
    it('默认使用本地值', () => {
      const local = { title: '本地标题', status: 'todo' }
      const remote = { title: '远端标题', status: 'done' }

      const merged = mergeFields(local, remote, computeFieldDiff(local, remote, {}))
      expect(merged.title).toBe('本地标题')
      expect(merged.status).toBe('todo')
    })

    it('根据 resolution 选择正确值', () => {
      const local = { title: '本地标题', status: 'todo' }
      const remote = { title: '远端标题', status: 'done' }
      const diff = computeFieldDiff(local, remote, {})

      const resolution = {
        title: 'local',
        status: 'remote',
      }

      const merged = mergeFields(local, remote, diff, resolution)
      expect(merged.title).toBe('本地标题')
      expect(merged.status).toBe('done')
    })
  })

  describe('LCS 算法', () => {
    it('正确计算最长公共子序列', () => {
      const a = ['a', 'b', 'c', 'd', 'e']
      const b = ['a', 'c', 'e', 'f']
      
      const result = lcs(a, b)
      expect(result).toEqual(['a', 'c', 'e'])
    })

    it('空数组返回空', () => {
      expect(lcs([], [1, 2, 3])).toEqual([])
      expect(lcs([1, 2, 3], [])).toEqual([])
      expect(lcs([], [])).toEqual([])
    })

    it('无公共元素返回空', () => {
      expect(lcs([1, 2, 3], [4, 5, 6])).toEqual([])
    })

    it('完全相同返回原数组', () => {
      const arr = [1, 2, 3, 4, 5]
      expect(lcs(arr, [...arr])).toEqual(arr)
    })
  })

  describe('字符串 diff', () => {
    it('相同字符串返回空操作', () => {
      const result = computeStringDiff('hello', 'hello')
      expect(result).toHaveLength(0)
    })

    it('正确检测插入操作', () => {
      const result = computeStringDiff('hello', 'hello world')
      expect(result.some(op => op.type === 'insert')).toBe(true)
    })

    it('正确检测删除操作', () => {
      const result = computeStringDiff('hello world', 'hello')
      expect(result.some(op => op.type === 'delete')).toBe(true)
    })
  })

  describe('工具函数', () => {
    it('isEqual 正确判断相等', () => {
      expect(isEqual({ a: 1 }, { a: 1 })).toBe(true)
      expect(isEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(isEqual([1, 2], [1, 2, 3])).toBe(false)
    })

    it('deepClone 正确深拷贝对象', () => {
      const original = {
        a: 1,
        b: {
          c: 2,
          d: [3, 4, 5],
        },
      }

      const cloned = deepClone(original)
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.b).not.toBe(original.b)
      expect(cloned.b.d).not.toBe(original.b.d)
    })
  })
})
