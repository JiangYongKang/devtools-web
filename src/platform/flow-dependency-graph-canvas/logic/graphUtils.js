import { CycleDetectedError } from './errors.js'

/**
 * 检测有向图中的环
 * 使用深度优先搜索（DFS）检测回边
 * @param {Array} nodes - 节点列表 [{id}]
 * @param {Array} edges - 边列表 [{from, to}]
 * @returns {Object} { hasCycle: boolean, cycle: Array|null }
 */
function detectCycle(nodes, edges) {
  const adjList = new Map()
  nodes.forEach(node => adjList.set(node.id, []))
  edges.forEach(edge => {
    if (adjList.has(edge.from) && adjList.has(edge.to)) {
      adjList.get(edge.from).push(edge.to)
    }
  })

  const visited = new Set()
  const recStack = new Set()
  const path = []

  function dfs(nodeId) {
    visited.add(nodeId)
    recStack.add(nodeId)
    path.push(nodeId)

    for (const neighbor of adjList.get(nodeId) || []) {
      if (!visited.has(neighbor)) {
        const result = dfs(neighbor)
        if (result) return result
      } else if (recStack.has(neighbor)) {
        const cycleStartIndex = path.indexOf(neighbor)
        return path.slice(cycleStartIndex).concat(neighbor)
      }
    }

    recStack.delete(nodeId)
    path.pop()
    return null
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const cycle = dfs(node.id)
      if (cycle) {
        return { hasCycle: true, cycle }
      }
    }
  }

  return { hasCycle: false, cycle: null }
}

/**
 * 确保图是 DAG（有向无环图），否则抛出错误
 * @param {Array} nodes - 节点列表
 * @param {Array} edges - 边列表
 * @throws {CycleDetectedError} 当检测到环时
 */
function ensureDAG(nodes, edges) {
  const result = detectCycle(nodes, edges)
  if (result.hasCycle) {
    throw new CycleDetectedError(result.cycle)
  }
}

/**
 * 拓扑排序 - Kahn 算法
 * @param {Array} nodes - 节点列表
 * @param {Array} edges - 边列表
 * @returns {Array} 拓扑排序后的节点 ID 列表
 */
function topologicalSort(nodes, edges) {
  const inDegree = new Map()
  const adjList = new Map()

  nodes.forEach(node => {
    inDegree.set(node.id, 0)
    adjList.set(node.id, [])
  })

  edges.forEach(edge => {
    if (inDegree.has(edge.from) && inDegree.has(edge.to)) {
      adjList.get(edge.from).push(edge.to)
      inDegree.set(edge.to, inDegree.get(edge.to) + 1)
    }
  })

  const queue = []
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id)
    }
  })

  const result = []
  while (queue.length > 0) {
    const nodeId = queue.shift()
    result.push(nodeId)

    for (const neighbor of adjList.get(nodeId) || []) {
      const newDegree = inDegree.get(neighbor) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  return result
}

/**
 * 拓扑分层 - 将 DAG 节点按层次分配
 * 使用最长路径算法确定每个节点的层级
 * @param {Array} nodes - 节点列表
 * @param {Array} edges - 边列表
 * @param {Object} options - 配置项
 * @param {Array} options.sameLayerNodes - 强制同层的节点组 [[id1, id2], ...]
 * @param {string|null} options.fixedRoot - 固定根节点 ID
 * @returns {Array<Array<string>>} 分层结果，每层是节点 ID 数组
 */
function topologicalSortLayers(nodes, edges, options = {}) {
  const { sameLayerNodes = [], fixedRoot = null } = options

  ensureDAG(nodes, edges)

  const nodeIds = new Set(nodes.map(n => n.id))
  const adjList = new Map()
  const reverseAdjList = new Map()

  nodes.forEach(node => {
    adjList.set(node.id, [])
    reverseAdjList.set(node.id, [])
  })

  edges.forEach(edge => {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjList.get(edge.from).push(edge.to)
      reverseAdjList.get(edge.to).push(edge.from)
    }
  })

  const layerMap = new Map()

  if (fixedRoot && nodeIds.has(fixedRoot)) {
    layerMap.set(fixedRoot, 0)
    const visited = new Set([fixedRoot])
    const queue = [fixedRoot]

    while (queue.length > 0) {
      const nodeId = queue.shift()
      const currentLayer = layerMap.get(nodeId)
      for (const neighbor of adjList.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          layerMap.set(neighbor, currentLayer + 1)
          queue.push(neighbor)
        }
      }
    }

    nodes.forEach(node => {
      if (!layerMap.has(node.id)) {
        layerMap.set(node.id, 0)
      }
    })
  } else {
    const sorted = topologicalSort(nodes, edges)

    sorted.forEach(nodeId => {
      const predecessors = reverseAdjList.get(nodeId) || []
      if (predecessors.length === 0) {
        layerMap.set(nodeId, 0)
      } else {
        const maxPredLayer = Math.max(...predecessors.map(p => layerMap.get(p) || 0))
        layerMap.set(nodeId, maxPredLayer + 1)
      }
    })
  }

  sameLayerNodes.forEach(group => {
    const validNodes = group.filter(id => nodeIds.has(id))
    if (validNodes.length > 0) {
      const maxLayer = Math.max(...validNodes.map(id => layerMap.get(id) || 0))
      validNodes.forEach(id => layerMap.set(id, maxLayer))
    }
  })

  const maxLayer = Math.max(...Array.from(layerMap.values()))
  const layers = Array.from({ length: maxLayer + 1 }, () => [])

  nodes.forEach(node => {
    const layer = layerMap.get(node.id) || 0
    layers[layer].push(node.id)
  })

  return layers.filter(layer => layer.length > 0)
}

/**
 * 计算矩形边界
 * @param {Object} rect - {x, y, width, height}
 * @returns {Object} {left, right, top, bottom}
 */
function getBounds(rect) {
  return {
    left: rect.x,
    right: rect.x + rect.width,
    top: rect.y,
    bottom: rect.y + rect.height,
  }
}

/**
 * 检测点是否在矩形内
 * @param {Object} point - {x, y}
 * @param {Object} rect - {x, y, width, height}
 * @returns {boolean}
 */
function pointInRect(point, rect) {
  const bounds = getBounds(rect)
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  )
}

/**
 * 正交边路由（折线）
 * 计算从起点到终点的正交路径，避开障碍物
 * @param {Object} a - 起点 {x, y}
 * @param {Object} b - 终点 {x, y}
 * @param {Array} obstacles - 障碍物列表 [{x, y, width, height}]
 * @param {Object} options - 配置项
 * @returns {Array<{x, y}>} 路径点数组
 */
function routeOrthogonalEdge(a, b, obstacles = [], options = {}) {
  const { padding = 10, maxAttempts = 5 } = options

  const result = [{ x: a.x, y: a.y }]

  if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1) {
    return result
  }

  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2

  let pathPoints = []

  if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) {
    pathPoints = [
      { x: a.x, y: a.y },
      { x: midX, y: a.y },
      { x: midX, y: b.y },
      { x: b.x, y: b.y },
    ]
  } else {
    pathPoints = [
      { x: a.x, y: a.y },
      { x: a.x, y: midY },
      { x: b.x, y: midY },
      { x: b.x, y: b.y },
    ]
  }

  const hasCollision = (p1, p2) => {
    for (const obs of obstacles) {
      const expanded = {
        x: obs.x - padding,
        y: obs.y - padding,
        width: obs.width + padding * 2,
        height: obs.height + padding * 2,
      }
      if (lineIntersectsRect(p1, p2, expanded)) {
        return true
      }
    }
    return false
  }

  if (!hasCollision(pathPoints[0], pathPoints[1]) &&
      !hasCollision(pathPoints[1], pathPoints[2]) &&
      !hasCollision(pathPoints[2], pathPoints[3])) {
    return pathPoints
  }

  let attempts = 0
  while (attempts < maxAttempts) {
    const offset = (attempts + 1) * padding * 2
    const alternativePaths = [
      [
        { x: a.x, y: a.y },
        { x: a.x, y: a.y + offset },
        { x: b.x, y: a.y + offset },
        { x: b.x, y: b.y },
      ],
      [
        { x: a.x, y: a.y },
        { x: a.x, y: a.y - offset },
        { x: b.x, y: a.y - offset },
        { x: b.x, y: b.y },
      ],
      [
        { x: a.x, y: a.y },
        { x: a.x + offset, y: a.y },
        { x: a.x + offset, y: b.y },
        { x: b.x, y: b.y },
      ],
      [
        { x: a.x, y: a.y },
        { x: a.x - offset, y: a.y },
        { x: a.x - offset, y: b.y },
        { x: b.x, y: b.y },
      ],
    ]

    for (const path of alternativePaths) {
      let collisionFree = true
      for (let i = 0; i < path.length - 1; i++) {
        if (hasCollision(path[i], path[i + 1])) {
          collisionFree = false
          break
        }
      }
      if (collisionFree) {
        return path
      }
    }

    attempts++
  }

  return pathPoints
}

/**
 * 检测线段与矩形是否相交
 * @param {Object} p1 - 线段起点
 * @param {Object} p2 - 线段终点
 * @param {Object} rect - 矩形
 * @returns {boolean}
 */
function lineIntersectsRect(p1, p2, rect) {
  const bounds = getBounds(rect)

  if (pointInRect(p1, rect) || pointInRect(p2, rect)) {
    return true
  }

  const edges = [
    [{ x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top }],
    [{ x: bounds.right, y: bounds.top }, { x: bounds.right, y: bounds.bottom }],
    [{ x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom }],
    [{ x: bounds.left, y: bounds.bottom }, { x: bounds.left, y: bounds.top }],
  ]

  for (const [e1, e2] of edges) {
    if (lineSegmentsIntersect(p1, p2, e1, e2)) {
      return true
    }
  }

  return false
}

/**
 * 检测两条线段是否相交
 * @param {Object} p1 - 线段1起点
 * @param {Object} p2 - 线段1终点
 * @param {Object} p3 - 线段2起点
 * @param {Object} p4 - 线段2终点
 * @returns {boolean}
 */
function lineSegmentsIntersect(p1, p2, p3, p4) {
  const ccw = (A, B, C) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x)
  }

  if (ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)) {
    return true
  }

  if ((p1.x === p3.x && p1.y === p3.y) ||
      (p1.x === p4.x && p1.y === p4.y) ||
      (p2.x === p3.x && p2.y === p3.y) ||
      (p2.x === p4.x && p2.y === p4.y)) {
    return true
  }

  return false
}

/**
 * 检测孤立节点
 * @param {Array} nodes - 节点列表
 * @param {Array} edges - 边列表
 * @returns {Array<string>} 孤立节点 ID 列表
 */
function findIsolatedNodes(nodes, edges) {
  const connectedNodes = new Set()
  edges.forEach(edge => {
    connectedNodes.add(edge.from)
    connectedNodes.add(edge.to)
  })

  return nodes
    .filter(node => !connectedNodes.has(node.id))
    .map(node => node.id)
}

export {
  detectCycle,
  ensureDAG,
  topologicalSort,
  topologicalSortLayers,
  routeOrthogonalEdge,
  pointInRect,
  lineIntersectsRect,
  lineSegmentsIntersect,
  findIsolatedNodes,
}
