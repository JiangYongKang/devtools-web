import { describe, test, expect } from 'vitest'
import {
  computeDiffFields,
  groupDiffFieldsByCategory,
  getCategoryLabel,
} from '../logic/diff'

describe('Diff Logic', () => {
  const chromeDesktop = {
    normalizedTable: [
      { key: 'browser.name', label: '浏览器', value: 'Chrome', category: 'browser' },
      { key: 'browser.majorVersion', label: '主版本', value: '120', category: 'browser' },
      { key: 'engine.name', label: '引擎', value: 'Blink', category: 'engine' },
      { key: 'os.name', label: '操作系统', value: 'Windows 10', category: 'os' },
      { key: 'device.type', label: '设备', value: 'desktop', category: 'device' },
      { key: 'common.field', label: '共同字段', value: 'same', category: 'meta' },
    ],
  }

  const firefoxDesktop = {
    normalizedTable: [
      { key: 'browser.name', label: '浏览器', value: 'Firefox', category: 'browser' },
      { key: 'browser.majorVersion', label: '主版本', value: '121', category: 'browser' },
      { key: 'engine.name', label: '引擎', value: 'Gecko', category: 'engine' },
      { key: 'os.name', label: '操作系统', value: 'Windows 10', category: 'os' },
      { key: 'device.type', label: '设备', value: 'desktop', category: 'desktop', category: 'device' },
      { key: 'common.field', label: '共同字段', value: 'same', category: 'meta' },
    ],
  }

  const mobileSafari = {
    normalizedTable: [
      { key: 'browser.name', label: '浏览器', value: 'Safari', category: 'browser' },
      { key: 'browser.majorVersion', label: '主版本', value: '17', category: 'browser' },
      { key: 'engine.name', label: '引擎', value: 'WebKit', category: 'engine' },
      { key: 'os.name', label: '操作系统', value: 'iOS 17', category: 'os' },
      { key: 'device.type', label: '设备', value: 'mobile', category: 'device' },
      { key: 'extra.field', label: '额外字段', value: 'only_here', category: 'meta' },
    ],
  }

  describe('computeDiffFields', () => {
    test('should return empty array for identical inputs', () => {
      const diff = computeDiffFields(chromeDesktop, chromeDesktop)
      expect(diff).toBeInstanceOf(Array)
      expect(diff.length).toBe(0)
    })

    test('should detect changed fields', () => {
      const diff = computeDiffFields(chromeDesktop, firefoxDesktop)
      expect(diff.length).toBeGreaterThan(0)
      
      const browserNameDiff = diff.find((d) => d.key === 'browser.name')
      expect(browserNameDiff).toBeDefined()
      expect(browserNameDiff.type).toBe('changed')
      expect(browserNameDiff.value1).toBe('Chrome')
      expect(browserNameDiff.value2).toBe('Firefox')
    })

    test('should detect added fields', () => {
      const diff = computeDiffFields(chromeDesktop, mobileSafari)
      const added = diff.find((d) => d.type === 'added')
      expect(added).toBeDefined()
      expect(added.key).toBe('extra.field')
    })

    test('should detect removed fields', () => {
      const diff = computeDiffFields(mobileSafari, chromeDesktop)
      const removed = diff.find((d) => d.type === 'removed')
      expect(removed).toBeDefined()
      expect(removed.key).toBe('extra.field')
    })

    test('should handle null inputs gracefully', () => {
      expect(computeDiffFields(null, null)).toEqual([])
      expect(computeDiffFields(null, chromeDesktop)).toEqual([])
      expect(computeDiffFields(chromeDesktop, null)).toEqual([])
    })

    test('should handle undefined inputs gracefully', () => {
      expect(computeDiffFields(undefined, undefined)).toEqual([])
    })

    test('should detect multiple changed fields', () => {
      const diff = computeDiffFields(chromeDesktop, mobileSafari)
      const changedFields = diff.filter((d) => d.type === 'changed')
      expect(changedFields.length).toBeGreaterThanOrEqual(4)
    })

    test('should not include equal fields in diff', () => {
      const diff = computeDiffFields(chromeDesktop, firefoxDesktop)
      const equalFields = diff.filter((d) => d.type === 'equal')
      expect(equalFields.length).toBe(0)
    })
  })

  describe('groupDiffFieldsByCategory', () => {
    test('should group diff fields by category', () => {
      const diff = computeDiffFields(chromeDesktop, mobileSafari)
      const groups = groupDiffFieldsByCategory(diff)
      
      expect(groups.browser).toBeDefined()
      expect(groups.engine).toBeDefined()
      expect(groups.os).toBeDefined()
      expect(groups.device).toBeDefined()
      expect(groups.meta).toBeDefined()
    })

    test('should return empty object for empty diff', () => {
      const groups = groupDiffFieldsByCategory([])
      expect(groups).toEqual({})
    })

    test('should handle unknown categories', () => {
      const testDiff = [
        { key: 'unknown.xyz', label: '未知', value1: 'a', value2: 'b', type: 'changed', category: 'unknown_category' },
      ]
      const groups = groupDiffFieldsByCategory(testDiff)
      expect(groups.unknown_category).toBeDefined()
    })
  })

  describe('getCategoryLabel', () => {
    test('should return correct Chinese labels for known categories', () => {
      expect(getCategoryLabel('browser')).toBe('浏览器')
      expect(getCategoryLabel('engine')).toBe('渲染引擎')
      expect(getCategoryLabel('os')).toBe('操作系统')
      expect(getCategoryLabel('device')).toBe('设备')
      expect(getCategoryLabel('bot')).toBe('爬虫')
      expect(getCategoryLabel('meta')).toBe('元数据')
      expect(getCategoryLabel('extracted')).toBe('提取字段')
      expect(getCategoryLabel('token')).toBe('Token')
      expect(getCategoryLabel('unknown')).toBe('其他')
    })

    test('should return original category name for unknown categories', () => {
      expect(getCategoryLabel('custom_category')).toBe('custom_category')
    })
  })
})
