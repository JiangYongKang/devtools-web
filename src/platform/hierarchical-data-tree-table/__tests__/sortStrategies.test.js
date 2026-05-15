import { describe, expect, test } from 'vitest'
import {
  defaultComparator,
  sortStableSubtree,
  sortFlat,
  sortTree,
  collectAllNodes,
  createNumericComparator,
  createStringComparator,
  createDateComparator,
} from '../logic/sortStrategies.js'
import { SORT_STRATEGY } from '../logic/constants.js'

describe('sortStrategies module', () => {
  const createTestTree = () => [
    {
      id: '1',
      name: 'Zebra',
      value: 30,
      children: [
        { id: '1-1', name: 'Apple', value: 10, children: [] },
        { id: '1-2', name: 'Cherry', value: 5, children: [] },
      ],
    },
    {
      id: '2',
      name: 'Banana',
      value: 20,
      children: [],
    },
  ]

  describe('defaultComparator', () => {
    test('should compare numbers correctly', () => {
      const a = { value: 10 }
      const b = { value: 20 }
      expect(defaultComparator(a, b, 'value', 'asc')).toBeLessThan(0)
      expect(defaultComparator(a, b, 'value', 'desc')).toBeGreaterThan(0)
    })

    test('should compare strings correctly', () => {
      const a = { name: 'Apple' }
      const b = { name: 'Banana' }
      expect(defaultComparator(a, b, 'name', 'asc')).toBeLessThan(0)
      expect(defaultComparator(a, b, 'name', 'desc')).toBeGreaterThan(0)
    })

    test('should return 0 for equal values', () => {
      const a = { value: 10 }
      const b = { value: 10 }
      expect(defaultComparator(a, b, 'value', 'asc')).toBe(0)
    })
  })

  describe('collectAllNodes', () => {
    test('should collect all nodes with their paths', () => {
      const nodes = createTestTree()
      const result = collectAllNodes(nodes)

      expect(result).toHaveLength(4)
      expect(result.find((r) => r.node.id === '1').parentPath).toEqual([])
      expect(result.find((r) => r.node.id === '1-1').parentPath).toEqual(['1'])
    })

    test('should return empty array for empty tree', () => {
      expect(collectAllNodes([])).toEqual([])
    })
  })

  describe('sortStableSubtree', () => {
    test('should sort each subtree independently', () => {
      const nodes = createTestTree()
      const result = sortStableSubtree(nodes, 'name', 'asc')

      expect(result[0].name).toBe('Banana')
      expect(result[1].name).toBe('Zebra')
      expect(result[1].children[0].name).toBe('Apple')
      expect(result[1].children[1].name).toBe('Cherry')
    })

    test('should sort in descending order', () => {
      const nodes = createTestTree()
      const result = sortStableSubtree(nodes, 'name', 'desc')

      expect(result[0].name).toBe('Zebra')
      expect(result[1].name).toBe('Banana')
      expect(result[0].children[0].name).toBe('Cherry')
      expect(result[0].children[1].name).toBe('Apple')
    })

    test('should not mutate original tree', () => {
      const nodes = createTestTree()
      const original = JSON.parse(JSON.stringify(nodes))
      sortStableSubtree(nodes, 'name', 'asc')
      expect(nodes).toEqual(original)
    })
  })

  describe('sortFlat', () => {
    test('should sort all nodes flat and rebuild tree', () => {
      const nodes = createTestTree()
      const result = sortFlat(nodes, 'value', 'asc')

      const allValues = []
      const collect = (list) => {
        for (const node of list) {
          allValues.push(node.value)
          if (node.children) collect(node.children)
        }
      }
      collect(result)

      expect(allValues).toContain(5)
      expect(allValues).toContain(10)
      expect(allValues).toContain(20)
      expect(allValues).toContain(30)
    })

    test('should preserve parent-child relationships', () => {
      const nodes = createTestTree()
      const result = sortFlat(nodes, 'value', 'asc')

      const findParentOf = (nodes, childId) => {
        for (const node of nodes) {
          if (node.children?.some((c) => c.id === childId)) return node.id
          if (node.children) {
            const found = findParentOf(node.children, childId)
            if (found) return found
          }
        }
        return null
      }

      expect(findParentOf(result, '1-1')).toBe('1')
      expect(findParentOf(result, '1-2')).toBe('1')
    })
  })

  describe('sortTree', () => {
    test('should use stable subtree strategy', () => {
      const nodes = createTestTree()
      const result = sortTree(nodes, SORT_STRATEGY.STABLE_SUBTREE, 'name', 'asc')

      expect(result[0].name).toBe('Banana')
      expect(result[1].name).toBe('Zebra')
    })

    test('should use flat strategy', () => {
      const nodes = createTestTree()
      const result = sortTree(nodes, SORT_STRATEGY.FLAT, 'value', 'asc')
      expect(result).toBeDefined()
    })

    test('should return nodes unchanged when no sort key', () => {
      const nodes = createTestTree()
      const result = sortTree(nodes, SORT_STRATEGY.STABLE_SUBTREE, null, 'asc')
      expect(result).toBe(nodes)
    })
  })

  describe('createNumericComparator', () => {
    const comparator = createNumericComparator('value')

    test('should compare numeric values correctly', () => {
      const a = { value: 10 }
      const b = { value: 20 }
      expect(comparator(a, b, 'value', 'asc')).toBeLessThan(0)
      expect(comparator(a, b, 'value', 'desc')).toBeGreaterThan(0)
    })

    test('should handle undefined values as 0', () => {
      const a = { value: undefined }
      const b = { value: 5 }
      expect(comparator(a, b, 'value', 'asc')).toBeLessThan(0)
    })

    test('should fall back to default for other keys', () => {
      const a = { name: 'Apple' }
      const b = { name: 'Banana' }
      expect(comparator(a, b, 'name', 'asc')).toBeLessThan(0)
    })
  })

  describe('createStringComparator', () => {
    const comparator = createStringComparator('name')

    test('should compare string values correctly', () => {
      const a = { name: 'Apple' }
      const b = { name: 'Banana' }
      expect(comparator(a, b, 'name', 'asc')).toBeLessThan(0)
      expect(comparator(a, b, 'name', 'desc')).toBeGreaterThan(0)
    })

    test('should handle undefined as empty string', () => {
      const a = { name: undefined }
      const b = { name: 'Test' }
      expect(comparator(a, b, 'name', 'asc')).toBeLessThan(0)
    })
  })

  describe('createDateComparator', () => {
    const comparator = createDateComparator('date')

    test('should compare date values correctly', () => {
      const a = { date: '2024-01-01' }
      const b = { date: '2024-01-02' }
      expect(comparator(a, b, 'date', 'asc')).toBeLessThan(0)
      expect(comparator(a, b, 'date', 'desc')).toBeGreaterThan(0)
    })

    test('should handle null dates', () => {
      const a = { date: null }
      const b = { date: null }
      expect(comparator(a, b, 'date', 'asc')).toBe(0)
    })
  })
})
