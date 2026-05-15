import { CHECK_STATE, DATA_TYPE } from './constants.js'

class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  nextString(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(this.nextInt(0, chars.length - 1))
    }
    return result
  }
}

const generateDeepChainTree = (depth = 1000, seed = 12345) => {
  const rng = new SeededRandom(seed)
  let current = null
  let root = null

  for (let i = 0; i < depth; i++) {
    const node = {
      id: `deep_${i}`,
      name: `Level ${i + 1}`,
      checkState: CHECK_STATE.UNCHECKED,
      children: [],
      value: rng.nextInt(0, 1000),
      description: `Node at depth ${i + 1}`,
    }

    if (current) {
      current.children.push(node)
    } else {
      root = node
    }
    current = node
  }

  return [root]
}

const generateWideFanoutTree = (width = 100, depth = 3, seed = 12345) => {
  const rng = new SeededRandom(seed)
  let nodeId = 0

  const generateLevel = (currentDepth, parentId = '') => {
    const nodes = []
    const count = currentDepth === 0 ? Math.min(width, 10) : width

    for (let i = 0; i < count; i++) {
      const id = `wide_${nodeId++}`
      const node = {
        id,
        name: `${parentId ? parentId + '-' : ''}${i + 1}`,
        checkState: CHECK_STATE.UNCHECKED,
        children: [],
        value: rng.nextInt(0, 1000),
        description: `Node ${id} at depth ${currentDepth + 1}`,
      }

      if (currentDepth < depth - 1) {
        node.children = generateLevel(currentDepth + 1, node.name)
      }

      nodes.push(node)
    }

    return nodes
  }

  return generateLevel(0)
}

const generateRandomIdTree = (nodeCount = 10000, maxChildren = 5, seed = 12345) => {
  const rng = new SeededRandom(seed)
  const nodes = []
  const nodeMap = new Map()

  const root = {
    id: rng.nextString(12),
    name: 'Root',
    checkState: CHECK_STATE.UNCHECKED,
    children: [],
    value: rng.nextInt(0, 1000),
    description: 'Root node',
  }
  nodes.push(root)
  nodeMap.set(root.id, root)

  for (let i = 0; i < nodeCount - 1; i++) {
    const parentIndex = rng.nextInt(0, nodes.length - 1)
    const parent = nodes[parentIndex]

    if (parent.children.length < maxChildren) {
      const newNode = {
        id: rng.nextString(12),
        name: `Node ${i + 1}`,
        checkState: CHECK_STATE.UNCHECKED,
        children: [],
        value: rng.nextInt(0, 1000),
        description: `Random node ${i + 1}`,
      }
      parent.children.push(newNode)
      nodes.push(newNode)
      nodeMap.set(newNode.id, newNode)
    }
  }

  return [root]
}

const loadFromNestedJson = (jsonData) => {
  const applyCheckState = (node) => ({
    ...node,
    checkState: node.checkState || CHECK_STATE.UNCHECKED,
    children: node.children ? node.children.map(applyCheckState) : [],
  })

  return Array.isArray(jsonData) ? jsonData.map(applyCheckState) : [applyCheckState(jsonData)]
}

const loadFromMaterializedPath = (pathList) => {
  const nodeMap = new Map()
  const roots = []

  pathList.forEach(({ path, ...data }) => {
    const segments = path.split('.')
    const nodeId = segments.join('_')

    const node = {
      id: nodeId,
      name: segments[segments.length - 1],
      checkState: CHECK_STATE.UNCHECKED,
      children: [],
      ...data,
    }

    nodeMap.set(path, node)

    if (segments.length === 1) {
      roots.push(node)
    } else {
      const parentPath = segments.slice(0, -1).join('.')
      const parent = nodeMap.get(parentPath)
      if (parent) {
        parent.children.push(node)
      }
    }
  })

  return roots
}

const createCancelToken = () => ({
  cancelled: false,
  cancel() {
    this.cancelled = true
  },
})

const estimateMemoryUsage = (nodes) => {
  let bytes = 0
  const traverse = (nodeList) => {
    for (const node of nodeList) {
      bytes += node.id.length * 2
      bytes += node.name.length * 2
      bytes += (node.description?.length || 0) * 2
      bytes += 16
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(nodes)
  return bytes
}

const generateDataset = (type, options = {}) => {
  switch (type) {
    case DATA_TYPE.DEEP_CHAIN:
      return generateDeepChainTree(options.depth || 1000, options.seed)
    case DATA_TYPE.WIDE_FANOUT:
      return generateWideFanoutTree(options.width || 100, options.depth || 3, options.seed)
    case DATA_TYPE.RANDOM_ID:
      return generateRandomIdTree(options.nodeCount || 10000, options.maxChildren || 5, options.seed)
    default:
      throw new Error(`Unknown data type: ${type}`)
  }
}

export {
  SeededRandom,
  generateDeepChainTree,
  generateWideFanoutTree,
  generateRandomIdTree,
  loadFromNestedJson,
  loadFromMaterializedPath,
  createCancelToken,
  estimateMemoryUsage,
  generateDataset,
}
