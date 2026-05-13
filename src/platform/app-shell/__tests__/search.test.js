import { describe, expect, test } from 'vitest'
import {
  searchTools,
  sortTools,
  getToolCategory,
  highlightMatch,
} from '../logic/search.js'
import { SORT_STRATEGIES } from '../logic/constants.js'

const sampleTools = [
  { id: '001', title: 'JSON 格式化', summary: 'JSON 格式化工具', tags: ['JSON', '格式化'] },
  { id: '002', title: 'Base64 编码', summary: 'Base64 编解码', tags: ['Base64', '编码'] },
  { id: '003', title: 'URL 编码', summary: 'URL 编解码', tags: ['URL', '编码'] },
  { id: '010', title: 'CSS 排版', summary: 'CSS 格式化', tags: ['CSS', '格式化'] },
  { id: '011', title: 'JavaScript 格式化', summary: 'JS 格式化', tags: ['JavaScript', '格式化'] },
]

describe('search module', () => {
  describe('searchTools', () => {
    test('should return all tools for empty query', () => {
      const result = searchTools(sampleTools, '')
      expect(result.total).toBe(5)
      expect(result.results.length).toBe(5)
    })

    test('should return empty for empty tools list', () => {
      const result = searchTools([], 'json')
      expect(result.total).toBe(0)
      expect(result.results).toEqual([])
    })

    test('should search by id', () => {
      const result = searchTools(sampleTools, '001')
      expect(result.total).toBe(1)
      expect(result.results[0].id).toBe('001')
    })

    test('should search by title', () => {
      const result = searchTools(sampleTools, 'JSON')
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.results.some((t) => t.id === '001')).toBe(true)
    })

    test('should search by summary', () => {
      const result = searchTools(sampleTools, '编解码')
      expect(result.total).toBeGreaterThanOrEqual(1)
    })

    test('should search by tags', () => {
      const result = searchTools(sampleTools, '编码')
      expect(result.total).toBe(2)
      const ids = result.results.map((t) => t.id)
      expect(ids).toContain('002')
      expect(ids).toContain('003')
    })

    test('should be case insensitive', () => {
      const result1 = searchTools(sampleTools, 'json')
      const result2 = searchTools(sampleTools, 'JSON')
      expect(result1.total).toBe(result2.total)
    })

    test('should calculate and include scores', () => {
      const result = searchTools(sampleTools, '001')
      expect(result.results[0].score).toBeDefined()
      expect(result.results[0].score).toBeGreaterThan(0)
    })

    test('should include matches info', () => {
      const result = searchTools(sampleTools, 'JSON')
      expect(result.results[0].matches).toBeDefined()
      expect(result.results[0].matches.title).toBe(true)
    })

    test('should sort by score descending', () => {
      const result = searchTools(sampleTools, '格式化')
      for (let i = 0; i < result.results.length - 1; i++) {
        expect(result.results[i].score).toBeGreaterThanOrEqual(result.results[i + 1].score)
      }
    })
  })

  describe('sortTools', () => {
    test('should return empty array for empty tools', () => {
      expect(sortTools([], SORT_STRATEGIES.ID)).toEqual([])
    })

    test('should sort by id numerically', () => {
      const tools = [
        { id: '010', title: 'Ten' },
        { id: '002', title: 'Two' },
        { id: '001', title: 'One' },
      ]
      const sorted = sortTools(tools, SORT_STRATEGIES.ID)
      expect(sorted[0].id).toBe('001')
      expect(sorted[1].id).toBe('002')
      expect(sorted[2].id).toBe('010')
    })

    test('should sort by title', () => {
      const tools = [
        { id: '001', title: 'Beta' },
        { id: '002', title: 'Alpha' },
        { id: '003', title: 'Charlie' },
      ]
      const sorted = sortTools(tools, SORT_STRATEGIES.TITLE)
      expect(sorted[0].title).toBe('Alpha')
      expect(sorted[1].title).toBe('Beta')
      expect(sorted[2].title).toBe('Charlie')
    })

    test('should sort by recent tools first', () => {
      const tools = [
        { id: '001', title: 'A' },
        { id: '002', title: 'B' },
        { id: '003', title: 'C' },
      ]
      const recent = ['003', '001']
      const sorted = sortTools(tools, SORT_STRATEGIES.RECENT, recent)
      expect(sorted[0].id).toBe('003')
      expect(sorted[1].id).toBe('001')
    })
  })

  describe('getToolCategory', () => {
    test('should return "其他" for no tags', () => {
      expect(getToolCategory({ tags: [] })).toBe('其他')
      expect(getToolCategory({})).toBe('其他')
    })

    test('should categorize formatting tools', () => {
      expect(getToolCategory({ tags: ['JSON', '格式化'] })).toBe('格式化')
      expect(getToolCategory({ tags: ['CSS'] })).toBe('格式化')
    })

    test('should categorize encoding tools', () => {
      expect(getToolCategory({ tags: ['Base64', '编码'] })).toBe('编码')
      expect(getToolCategory({ tags: ['URL'] })).toBe('编码')
    })

    test('should categorize crypto tools', () => {
      expect(getToolCategory({ tags: ['哈希', '密码'] })).toBe('加密')
      expect(getToolCategory({ tags: ['JWT'] })).toBe('加密')
    })

    test('should categorize network tools', () => {
      expect(getToolCategory({ tags: ['HTTP', '网络'] })).toBe('网络')
      expect(getToolCategory({ tags: ['CIDR'] })).toBe('网络')
    })
  })

  describe('highlightMatch', () => {
    test('should return no highlight for empty query', () => {
      const result = highlightMatch('Hello World', '')
      expect(result.highlighted).toBe(false)
      expect(result.parts.length).toBe(1)
      expect(result.parts[0].matched).toBe(false)
    })

    test('should return no highlight for no match', () => {
      const result = highlightMatch('Hello World', 'xyz')
      expect(result.highlighted).toBe(false)
    })

    test('should highlight match at beginning', () => {
      const result = highlightMatch('Hello World', 'hello')
      expect(result.highlighted).toBe(true)
      expect(result.parts[0].text).toBe('Hello')
      expect(result.parts[0].matched).toBe(true)
      expect(result.parts[1].text).toBe(' World')
      expect(result.parts[1].matched).toBe(false)
    })

    test('should highlight match in middle', () => {
      const result = highlightMatch('Hello World', 'lo W')
      expect(result.highlighted).toBe(true)
      expect(result.parts).toHaveLength(3)
      expect(result.parts[1].matched).toBe(true)
      expect(result.parts[1].text).toBe('lo W')
    })

    test('should be case insensitive', () => {
      const result = highlightMatch('Hello World', 'HELLO')
      expect(result.highlighted).toBe(true)
    })
  })
})
