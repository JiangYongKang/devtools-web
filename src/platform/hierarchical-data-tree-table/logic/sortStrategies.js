import { SORT_STRATEGY } from './constants.js'

const defaultComparator = (a, b, key, direction) => {
  const aVal = a[key]
  const bVal = b[key]

  if (aVal === bVal) return 0

  let result = 0
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    result = aVal - bVal
  } else {
    result = String(aVal).localeCompare(String(bVal))
  }

  return direction === 'desc' ? -result : result
}

const sortStableSubtree = (nodes, sortKey, sortDirection, comparator = defaultComparator) => {
  const sortRecursive = (nodeList) => {
    const sorted = [...nodeList].sort((a, b) => comparator(a, b, sortKey, sortDirection))
    return sorted.map((node) => {
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: sortRecursive(node.children),
        }
      }
      return node
    })
  }

  return sortRecursive(nodes)
}

const collectAllNodes = (nodes, parentPath = []) => {
  const result = []
  for (const node of nodes) {
    result.push({ node, parentPath })
    if (node.children && node.children.length > 0) {
      result.push(...collectAllNodes(node.children, [...parentPath, node.id]))
    }
  }
  return result
}

const rebuildTreeFromFlat = (flatList, sortKey, sortDirection, comparator) => {
  const nodeMap = new Map()
  const rootNodes = []

  flatList.forEach(({ node }) => {
    nodeMap.set(node.id, { ...node, children: [] })
  })

  flatList.forEach(({ node, parentPath }) => {
    const mappedNode = nodeMap.get(node.id)
    if (parentPath.length === 0) {
      rootNodes.push(mappedNode)
    } else {
      const parentId = parentPath[parentPath.length - 1]
      const parent = nodeMap.get(parentId)
      if (parent) {
        parent.children.push(mappedNode)
      }
    }
  })

  const sortChildren = (nodeList) => {
    const sorted = [...nodeList].sort((a, b) => comparator(a, b, sortKey, sortDirection))
    return sorted.map((node) => ({
      ...node,
      children: sortChildren(node.children),
    }))
  }

  return sortChildren(rootNodes)
}

const sortFlat = (nodes, sortKey, sortDirection, comparator = defaultComparator) => {
  const flatList = collectAllNodes(nodes)
  flatList.sort((a, b) => comparator(a.node, b.node, sortKey, sortDirection))
  return rebuildTreeFromFlat(flatList, sortKey, sortDirection, comparator)
}

const sortTree = (nodes, strategy, sortKey, sortDirection, comparator) => {
  if (!sortKey) return nodes

  switch (strategy) {
    case SORT_STRATEGY.STABLE_SUBTREE:
      return sortStableSubtree(nodes, sortKey, sortDirection, comparator)
    case SORT_STRATEGY.FLAT:
      return sortFlat(nodes, sortKey, sortDirection, comparator)
    default:
      return nodes
  }
}

const createNumericComparator = (key) => (a, b, sortKey, direction) => {
  if (sortKey !== key) return defaultComparator(a, b, sortKey, direction)
  const diff = (a[key] || 0) - (b[key] || 0)
  return direction === 'desc' ? -diff : diff
}

const createStringComparator = (key) => (a, b, sortKey, direction) => {
  if (sortKey !== key) return defaultComparator(a, b, sortKey, direction)
  const aStr = String(a[key] || '')
  const bStr = String(b[key] || '')
  const diff = aStr.localeCompare(bStr)
  return direction === 'desc' ? -diff : diff
}

const createDateComparator = (key) => (a, b, sortKey, direction) => {
  if (sortKey !== key) return defaultComparator(a, b, sortKey, direction)
  const aDate = new Date(a[key] || 0).getTime()
  const bDate = new Date(b[key] || 0).getTime()
  const diff = aDate - bDate
  return direction === 'desc' ? -diff : diff
}

export {
  defaultComparator,
  sortStableSubtree,
  sortFlat,
  sortTree,
  collectAllNodes,
  createNumericComparator,
  createStringComparator,
  createDateComparator,
}
