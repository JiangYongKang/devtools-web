import { describe, expect, test } from 'vitest'
import {
  flattenVisibleRows,
  patchTreeImmutable,
  collectCheckedSubtree,
  calculateCheckState,
  setNodeCheckState,
  toggleExpand,
  countNodes,
  findNodeById,
  getNodePath,
  renameNode,
  deleteSubtree,
  createNode,
  addChild,
  getJsonPathList,
} from '../logic/treeOperations.js'
import { CHECK_STATE } from '../logic/constants.js'

describe('treeOperations module', () => {
  const createTestTree = () => [
    {
      id: '1',
      name: 'Root 1',
      checkState: CHECK_STATE.UNCHECKED,
      children: [
        {
          id: '1-1',
          name: 'Child 1-1',
          checkState: CHECK_STATE.UNCHECKED,
          children: [
            { id: '1-1-1', name: 'Grandchild 1-1-1', checkState: CHECK_STATE.UNCHECKED, children: [] },
          ],
        },
        { id: '1-2', name: 'Child 1-2', checkState: CHECK_STATE.UNCHECKED, children: [] },
      ],
    },
    {
      id: '2',
      name: 'Root 2',
      checkState: CHECK_STATE.UNCHECKED,
      children: [],
    },
  ]

  describe('findNodeById', () => {
    test('should find node at root level', () => {
      const nodes = createTestTree()
      const result = findNodeById(nodes, '2')
      expect(result).toBeDefined()
      expect(result.id).toBe('2')
    })

    test('should find node at nested level', () => {
      const nodes = createTestTree()
      const result = findNodeById(nodes, '1-1-1')
      expect(result).toBeDefined()
      expect(result.id).toBe('1-1-1')
    })

    test('should return null for non-existent node', () => {
      const nodes = createTestTree()
      const result = findNodeById(nodes, 'non-existent')
      expect(result).toBeNull()
    })
  })

  describe('getNodePath', () => {
    test('should return path for root node', () => {
      const nodes = createTestTree()
      const path = getNodePath(nodes, '1')
      expect(path).toEqual(['1'])
    })

    test('should return path for nested node', () => {
      const nodes = createTestTree()
      const path = getNodePath(nodes, '1-1-1')
      expect(path).toEqual(['1', '1-1', '1-1-1'])
    })

    test('should return null for non-existent node', () => {
      const nodes = createTestTree()
      const path = getNodePath(nodes, 'non-existent')
      expect(path).toBeNull()
    })
  })

  describe('flattenVisibleRows', () => {
    test('should return only root nodes when nothing is expanded', () => {
      const state = {
        nodes: createTestTree(),
        expandedIds: new Set(),
      }
      const result = flattenVisibleRows(state)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('2')
    })

    test('should include children when parent is expanded', () => {
      const state = {
        nodes: createTestTree(),
        expandedIds: new Set(['1']),
      }
      const result = flattenVisibleRows(state)
      expect(result).toHaveLength(4)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('1-1')
      expect(result[2].id).toBe('1-2')
      expect(result[3].id).toBe('2')
    })

    test('should set correct depth for each row', () => {
      const state = {
        nodes: createTestTree(),
        expandedIds: new Set(['1', '1-1']),
      }
      const result = flattenVisibleRows(state)
      expect(result[0].depth).toBe(0)
      expect(result[1].depth).toBe(1)
      expect(result[2].depth).toBe(2)
      expect(result[3].depth).toBe(1)
    })

    test('should set isExpanded correctly', () => {
      const state = {
        nodes: createTestTree(),
        expandedIds: new Set(['1']),
      }
      const result = flattenVisibleRows(state)
      expect(result[0].isExpanded).toBe(true)
      expect(result[1].isExpanded).toBe(false)
    })
  })

  describe('patchTreeImmutable', () => {
    test('should return new tree without mutating original', () => {
      const nodes = createTestTree()
      const original = JSON.parse(JSON.stringify(nodes))

      const result = patchTreeImmutable(nodes, '1-2', (node) => ({
        ...node,
        name: 'Modified',
      }))

      expect(nodes).toEqual(original)
      const modified = findNodeById(result, '1-2')
      expect(modified.name).toBe('Modified')
    })

    test('should preserve other nodes unchanged', () => {
      const nodes = createTestTree()
      const result = patchTreeImmutable(nodes, '1-2', (node) => ({
        ...node,
        name: 'Modified',
      }))

      const unchanged = findNodeById(result, '1-1')
      expect(unchanged.name).toBe('Child 1-1')
    })

    test('should return original tree if node not found', () => {
      const nodes = createTestTree()
      const result = patchTreeImmutable(nodes, 'non-existent', (node) => ({
        ...node,
        name: 'Modified',
      }))
      expect(result).toEqual(nodes)
    })
  })

  describe('collectCheckedSubtree', () => {
    test('should collect all checked nodes in subtree', () => {
      const root = {
        id: '1',
        checkState: CHECK_STATE.CHECKED,
        children: [
          { id: '1-1', checkState: CHECK_STATE.CHECKED, children: [] },
          { id: '1-2', checkState: CHECK_STATE.UNCHECKED, children: [] },
        ],
      }

      const result = collectCheckedSubtree(root)
      expect(result).toEqual(['1', '1-1'])
    })

    test('should return empty array when no nodes checked', () => {
      const root = {
        id: '1',
        checkState: CHECK_STATE.UNCHECKED,
        children: [],
      }
      const result = collectCheckedSubtree(root)
      expect(result).toEqual([])
    })
  })

  describe('calculateCheckState', () => {
    test('should return node state for leaf nodes', () => {
      const node = { checkState: CHECK_STATE.CHECKED, children: [] }
      expect(calculateCheckState(node)).toBe(CHECK_STATE.CHECKED)
    })

    test('should return CHECKED when all children are checked', () => {
      const node = {
        checkState: CHECK_STATE.UNCHECKED,
        children: [
          { checkState: CHECK_STATE.CHECKED, children: [] },
          { checkState: CHECK_STATE.CHECKED, children: [] },
        ],
      }
      expect(calculateCheckState(node)).toBe(CHECK_STATE.CHECKED)
    })

    test('should return INDETERMINATE when some children are checked', () => {
      const node = {
        checkState: CHECK_STATE.UNCHECKED,
        children: [
          { checkState: CHECK_STATE.CHECKED, children: [] },
          { checkState: CHECK_STATE.UNCHECKED, children: [] },
        ],
      }
      expect(calculateCheckState(node)).toBe(CHECK_STATE.INDETERMINATE)
    })

    test('should return UNCHECKED when no children are checked', () => {
      const node = {
        checkState: CHECK_STATE.CHECKED,
        children: [
          { checkState: CHECK_STATE.UNCHECKED, children: [] },
          { checkState: CHECK_STATE.UNCHECKED, children: [] },
        ],
      }
      expect(calculateCheckState(node)).toBe(CHECK_STATE.UNCHECKED)
    })

    test('should handle indeterminate child state', () => {
      const node = {
        checkState: CHECK_STATE.UNCHECKED,
        children: [
          { checkState: CHECK_STATE.INDETERMINATE, children: [] },
          { checkState: CHECK_STATE.UNCHECKED, children: [] },
        ],
      }
      expect(calculateCheckState(node)).toBe(CHECK_STATE.INDETERMINATE)
    })
  })

  describe('setNodeCheckState', () => {
    test('should propagate check state down to children', () => {
      const state = { nodes: createTestTree(), expandedIds: new Set() }
      const result = setNodeCheckState(state, '1', CHECK_STATE.CHECKED)

      const node1 = findNodeById(result.nodes, '1')
      const node11 = findNodeById(result.nodes, '1-1')
      const node111 = findNodeById(result.nodes, '1-1-1')

      expect(node1.checkState).toBe(CHECK_STATE.CHECKED)
      expect(node11.checkState).toBe(CHECK_STATE.CHECKED)
      expect(node111.checkState).toBe(CHECK_STATE.CHECKED)
    })

    test('should propagate uncheck state down to children', () => {
      const nodes = createTestTree()
      nodes[0].checkState = CHECK_STATE.CHECKED
      nodes[0].children[0].checkState = CHECK_STATE.CHECKED

      const state = { nodes, expandedIds: new Set() }
      const result = setNodeCheckState(state, '1', CHECK_STATE.UNCHECKED)

      const node1 = findNodeById(result.nodes, '1')
      const node11 = findNodeById(result.nodes, '1-1')
      expect(node1.checkState).toBe(CHECK_STATE.UNCHECKED)
      expect(node11.checkState).toBe(CHECK_STATE.UNCHECKED)
    })
  })

  describe('toggleExpand', () => {
    test('should expand collapsed node', () => {
      const state = { nodes: createTestTree(), expandedIds: new Set() }
      const result = toggleExpand(state, '1')
      expect(result.expandedIds.has('1')).toBe(true)
    })

    test('should collapse expanded node', () => {
      const state = { nodes: createTestTree(), expandedIds: new Set(['1']) }
      const result = toggleExpand(state, '1')
      expect(result.expandedIds.has('1')).toBe(false)
    })

    test('should not mutate original state', () => {
      const originalIds = new Set(['1'])
      const state = { nodes: createTestTree(), expandedIds: originalIds }
      const result = toggleExpand(state, '1')
      expect(originalIds.has('1')).toBe(true)
      expect(result.expandedIds).not.toBe(originalIds)
    })
  })

  describe('countNodes', () => {
    test('should count all nodes in tree', () => {
      const nodes = createTestTree()
      const count = countNodes(nodes)
      expect(count).toBe(5)
    })

    test('should return 0 for empty tree', () => {
      expect(countNodes([])).toBe(0)
    })

    test('should handle single node', () => {
      expect(countNodes([{ id: '1', children: [] }])).toBe(1)
    })
  })

  describe('renameNode', () => {
    test('should rename node without mutating original', () => {
      const state = { nodes: createTestTree(), expandedIds: new Set() }
      const original = JSON.parse(JSON.stringify(state.nodes))

      const result = renameNode(state, '1-2', 'New Name')

      expect(state.nodes).toEqual(original)
      const renamed = findNodeById(result.nodes, '1-2')
      expect(renamed.name).toBe('New Name')
    })
  })

  describe('deleteSubtree', () => {
    test('should delete node and all children', () => {
      const state = { nodes: createTestTree(), expandedIds: new Set(['1']) }
      const result = deleteSubtree(state, '1')

      expect(countNodes(result.nodes)).toBe(1)
      expect(findNodeById(result.nodes, '1')).toBeNull()
      expect(findNodeById(result.nodes, '2')).toBeDefined()
    })

    test('should remove node id from expandedIds', () => {
      const state = { nodes: createTestTree(), expandedIds: new Set(['1', '1-1']) }
      const result = deleteSubtree(state, '1')
      expect(result.expandedIds.has('1')).toBe(false)
    })
  })

  describe('createNode', () => {
    test('should create node with default values', () => {
      const node = createNode('parent', 'Test Node')
      expect(node.name).toBe('Test Node')
      expect(node.checkState).toBe(CHECK_STATE.UNCHECKED)
      expect(node.children).toEqual([])
      expect(node.id).toBeDefined()
    })

    test('should include additional data', () => {
      const node = createNode('parent', 'Test Node', { value: 42 })
      expect(node.value).toBe(42)
    })
  })

  describe('addChild', () => {
    test('should add child node to parent', () => {
      const state = { nodes: createTestTree(), expandedIds: new Set() }
      const child = createNode('1', 'New Child')
      const result = addChild(state, '1', child)

      const parent = findNodeById(result.nodes, '1')
      expect(parent.children).toHaveLength(3)
      expect(parent.children[2].name).toBe('New Child')
    })
  })

  describe('getJsonPathList', () => {
    test('should return paths for checked nodes', () => {
      const nodes = createTestTree()
      nodes[0].checkState = CHECK_STATE.CHECKED
      nodes[0].children[1].checkState = CHECK_STATE.CHECKED

      const state = { nodes, expandedIds: new Set() }
      const result = getJsonPathList(state)

      expect(result).toContain('Root 1')
      expect(result).toContain('Root 1.Child 1-2')
    })

    test('should return empty array when no nodes checked', () => {
      const state = { nodes: createTestTree(), expandedIds: new Set() }
      const result = getJsonPathList(state)
      expect(result).toEqual([])
    })
  })
})
