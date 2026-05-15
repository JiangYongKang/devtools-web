import { CHECK_STATE, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

const getNodePath = (nodes, id, path = []) => {
  for (const node of nodes) {
    const currentPath = [...path, node.id]
    if (node.id === id) return currentPath
    if (node.children) {
      const found = getNodePath(node.children, id, currentPath)
      if (found) return found
    }
  }
  return null
}

const toSet = (value) => {
  if (value instanceof Set) return new Set(value)
  if (Array.isArray(value)) return new Set(value)
  if (value && typeof value === 'object') return new Set(Object.values(value))
  return new Set()
}

const flattenVisibleRows = (state) => {
  const { nodes, expandedIds, sortKey, sortDirection, sortStrategy } = state
  const expanded = toSet(expandedIds)
  const result = []

  const traverse = (nodeList, depth = 0, parentPath = []) => {
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i]
      const rowModel = {
        ...node,
        depth,
        parentPath: [...parentPath],
        isExpanded: expanded.has(node.id),
        hasChildren: node.children && node.children.length > 0,
      }
      result.push(rowModel)

      if (expanded.has(node.id) && node.children && node.children.length > 0) {
        traverse(node.children, depth + 1, [...parentPath, node.id])
      }
    }
  }

  traverse(nodes)
  return result
}

const patchTreeImmutable = (nodes, nodeId, mutator) => {
  const patchRecursive = (nodeList) => {
    return nodeList.map((node) => {
      if (node.id === nodeId) {
        return mutator(node)
      }
      if (node.children) {
        return {
          ...node,
          children: patchRecursive(node.children),
        }
      }
      return node
    })
  }

  return patchRecursive(nodes)
}

const collectCheckedSubtree = (root) => {
  const result = []

  const traverse = (node) => {
    if (node.checkState === CHECK_STATE.CHECKED) {
      result.push(node.id)
    }
    if (node.children) {
      node.children.forEach(traverse)
    }
  }

  traverse(root)
  return result
}

const calculateCheckState = (node) => {
  if (!node.children || node.children.length === 0) {
    return node.checkState || CHECK_STATE.UNCHECKED
  }

  const childStates = node.children.map(calculateCheckState)
  const allChecked = childStates.every((s) => s === CHECK_STATE.CHECKED)
  const someChecked = childStates.some(
    (s) => s === CHECK_STATE.CHECKED || s === CHECK_STATE.INDETERMINATE
  )

  if (allChecked) return CHECK_STATE.CHECKED
  if (someChecked) return CHECK_STATE.INDETERMINATE
  return CHECK_STATE.UNCHECKED
}

const propagateCheckStateDown = (nodes, nodeId, newState) => {
  const patchChildren = (node) => {
    const patched = { ...node, checkState: newState }
    if (patched.children) {
      patched.children = patched.children.map(patchChildren)
    }
    return patched
  }

  return patchTreeImmutable(nodes, nodeId, patchChildren)
}

const setNodeCheckState = (state, nodeId, newState) => {
  let newNodes = propagateCheckStateDown(state.nodes, nodeId, newState)
  const path = getNodePath(newNodes, nodeId)
  if (!path) return { ...state, nodes: newNodes }

  for (let i = path.length - 2; i >= 0; i--) {
    const parentId = path[i]
    newNodes = patchTreeImmutable(newNodes, parentId, (parent) => ({
      ...parent,
      checkState: calculateCheckState(parent)
    }))
  }

  return { ...state, nodes: newNodes }
}

const toggleExpand = (state, nodeId) => {
  const expandedIds = toSet(state.expandedIds)
  if (expandedIds.has(nodeId)) {
    expandedIds.delete(nodeId)
  } else {
    expandedIds.add(nodeId)
  }
  return { ...state, expandedIds }
}

const expandToDepth = (state, maxDepth, onProgress, cancelToken) => {
  const expandedIds = new Set()
  let processed = 0

  const traverse = (nodes, depth = 0) => {
    if (cancelToken?.cancelled) {
      throw createError(ERROR_CODES.OPERATION_CANCELLED, 'Operation cancelled')
    }

    for (const node of nodes) {
      if (depth < maxDepth && node.children && node.children.length > 0) {
        expandedIds.add(node.id)
        traverse(node.children, depth + 1)
      }
      processed++
      if (onProgress && processed % 100 === 0) {
        onProgress(processed)
      }
    }
  }

  traverse(state.nodes)
  return { ...state, expandedIds }
}

const renameNode = (state, nodeId, newName) => {
  const nodes = patchTreeImmutable(state.nodes, nodeId, (node) => ({
    ...node,
    name: newName,
  }))
  return { ...state, nodes }
}

const deleteSubtree = (state, nodeId) => {
  const deleteRecursive = (nodeList) => {
    return nodeList
      .filter((node) => node.id !== nodeId)
      .map((node) => {
        if (node.children) {
          return { ...node, children: deleteRecursive(node.children) }
        }
        return node
      })
  }

  const expandedIds = toSet(state.expandedIds)
  expandedIds.delete(nodeId)

  return { ...state, nodes: deleteRecursive(state.nodes), expandedIds }
}

const createNode = (parentId, name, data = {}) => ({
  id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  name,
  children: [],
  checkState: CHECK_STATE.UNCHECKED,
  ...data,
})

const addChild = (state, parentId, childNode) => {
  const nodes = patchTreeImmutable(state.nodes, parentId, (node) => ({
    ...node,
    children: [...(node.children || []), childNode],
  }))
  return { ...state, nodes }
}

const getJsonPathList = (state) => {
  const checkedIds = new Set()
  const collect = (nodes, path = '') => {
    for (const node of nodes) {
      const currentPath = path ? `${path}.${node.name}` : node.name
      if (node.checkState === CHECK_STATE.CHECKED) {
        checkedIds.add(currentPath)
      }
      if (node.children) {
        collect(node.children, currentPath)
      }
    }
  }
  collect(state.nodes)
  return Array.from(checkedIds)
}

const countNodes = (nodes) => {
  let count = 0
  const traverse = (nodeList) => {
    for (const node of nodeList) {
      count++
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(nodes)
  return count
}

const getSiblings = (nodes, nodeId) => {
  const findParent = (nodeList, targetId) => {
    for (const node of nodeList) {
      if (node.children) {
        if (node.children.some((c) => c.id === targetId)) {
          return node
        }
        const found = findParent(node.children, targetId)
        if (found) return found
      }
    }
    return null
  }

  const parent = findParent(nodes, nodeId)
  if (parent) {
    return parent.children
  }
  return nodes
}

export {
  findNodeById,
  getNodePath,
  flattenVisibleRows,
  patchTreeImmutable,
  collectCheckedSubtree,
  calculateCheckState,
  propagateCheckStateUp,
  propagateCheckStateDown,
  setNodeCheckState,
  toggleExpand,
  expandToDepth,
  renameNode,
  deleteSubtree,
  createNode,
  addChild,
  getJsonPathList,
  countNodes,
  getSiblings,
}
