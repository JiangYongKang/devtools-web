import { topologicalSortLayers } from './graphUtils.js'
import { LAYOUT_DEFAULTS, NODE_DEFAULTS } from './constants.js'
import { LayoutTimeoutError } from './errors.js'

/**
 * Sugiyama 分层布局算法（简化版）
 * 适用于 DAG 的层次化布局
 * @param {Array} nodes - 节点列表 [{id, x?, y?, width?, height?}]
 * @param {Array} edges - 边列表 [{from, to}]
 * @param {Object} options - 配置项
 * @returns {Object} { nodes: [...], iterations, duration, converged }
 */
function sugiyamaLayout(nodes, edges, options = {}) {
  const startTime = Date.now()

  const config = { ...LAYOUT_DEFAULTS.SUGIYAMA, ...options }
  const { nodeWidth, nodeHeight, layerGap, nodeGap, maxIterations, epsilon, sameLayerNodes, fixedRoot } = config

  const nodeMap = new Map()
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      ...node,
      width: node.width || nodeWidth,
      height: node.height || nodeHeight,
      x: node.x || 0,
      y: node.y || 0,
    })
  })

  const layers = topologicalSortLayers(
    nodes.map(n => ({ id: n.id })),
    edges,
    { sameLayerNodes, fixedRoot }
  )

  const layerWidths = layers.map(layer => {
    const totalWidth = layer.reduce((sum, id) => {
      const node = nodeMap.get(id)
      return sum + (node?.width || nodeWidth)
    }, 0)
    return totalWidth + (layer.length - 1) * nodeGap
  })

  const maxWidth = Math.max(...layerWidths)
  let currentY = nodeHeight / 2

  layers.forEach((layer, layerIndex) => {
    const layerWidth = layerWidths[layerIndex]
    let currentX = (maxWidth - layerWidth) / 2

    layer.forEach(nodeId => {
      const node = nodeMap.get(nodeId)
      if (node) {
        node.x = currentX + node.width / 2
        node.y = currentY
        currentX += node.width + nodeGap
      }
    })

    currentY += layerGap + nodeHeight
  })

  let iterations = 0
  let converged = true

  while (iterations < maxIterations) {
    let totalMove = 0

    layers.forEach(layer => {
      layer.forEach(nodeId => {
        const node = nodeMap.get(nodeId)
        if (!node) return

        const incomingEdges = edges.filter(e => e.to === nodeId)
        if (incomingEdges.length > 0) {
          const avgX = incomingEdges.reduce((sum, e) => {
            const fromNode = nodeMap.get(e.from)
            return sum + (fromNode?.x || node.x)
          }, 0) / incomingEdges.length

          const move = (avgX - node.x) * 0.5
          node.x += move
          totalMove += Math.abs(move)
        }
      })
    })

    iterations++

    if (totalMove < epsilon) {
      break
    }
  }

  if (iterations >= maxIterations) {
    converged = false
  }

  const duration = Date.now() - startTime

  return {
    nodes: Array.from(nodeMap.values()),
    iterations,
    duration,
    converged,
  }
}

/**
 * 力导向布局算法
 * 使用 Fruchterman-Reingold 类算法
 * @param {Array} nodes - 节点列表
 * @param {Array} edges - 边列表
 * @param {Object} options - 配置项
 * @returns {Object} { nodes: [...], iterations, duration, converged }
 */
function forceDirectedLayout(nodes, edges, options = {}) {
  const startTime = Date.now()

  const config = { ...LAYOUT_DEFAULTS.FORCE_DIRECTED, ...options }
  const { repulsion, attraction, damping, maxIterations, epsilon, centerGravity, centerX = 400, centerY = 300 } = config

  const nodeMap = new Map()
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2
    const radius = 100 + index * 20
    nodeMap.set(node.id, {
      ...node,
      width: node.width || NODE_DEFAULTS.WIDTH,
      height: node.height || NODE_DEFAULTS.HEIGHT,
      x: node.x ?? (centerX + Math.cos(angle) * radius),
      y: node.y ?? (centerY + Math.sin(angle) * radius),
      vx: 0,
      vy: 0,
    })
  })

  let iterations = 0
  let converged = false

  while (iterations < maxIterations) {
    let maxForce = 0

    const nodeList = Array.from(nodeMap.values())

    nodeList.forEach(node => {
      node.fx = 0
      node.fy = 0
    })

    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const n1 = nodeList[i]
        const n2 = nodeList[j]

        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        const force = repulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        n1.fx -= fx
        n1.fy -= fy
        n2.fx += fx
        n2.fy += fy
      }
    }

    edges.forEach(edge => {
      const from = nodeMap.get(edge.from)
      const to = nodeMap.get(edge.to)
      if (!from || !to) return

      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      const force = dist * attraction
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      from.fx += fx
      from.fy += fy
      to.fx -= fx
      to.fy -= fy
    })

    nodeList.forEach(node => {
      const dx = centerX - node.x
      const dy = centerY - node.y
      node.fx += dx * centerGravity
      node.fy += dy * centerGravity
    })

    nodeList.forEach(node => {
      node.vx = (node.vx + node.fx) * damping
      node.vy = (node.vy + node.fy) * damping
      node.x += node.vx
      node.y += node.vy

      const force = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
      maxForce = Math.max(maxForce, force)
    })

    iterations++

    if (maxForce < epsilon) {
      converged = true
      break
    }
  }

  const resultNodes = Array.from(nodeMap.values()).map(({ vx, vy, fx, fy, ...rest }) => rest)

  const duration = Date.now() - startTime

  return {
    nodes: resultNodes,
    iterations,
    duration,
    converged,
  }
}

/**
 * 统一的布局入口函数
 * @param {string} algorithm - 布局算法名称
 * @param {Array} nodes - 节点列表
 * @param {Array} edges - 边列表
 * @param {Object} options - 配置项
 * @returns {Object} 布局结果
 */
function runLayout(algorithm, nodes, edges, options = {}) {
  switch (algorithm) {
    case 'sugiyama':
      return sugiyamaLayout(nodes, edges, options)
    case 'force_directed':
      return forceDirectedLayout(nodes, edges, options)
    default:
      return forceDirectedLayout(nodes, edges, options)
  }
}

/**
 * 计算图的边界框
 * @param {Array} nodes - 节点列表
 * @returns {Object} { minX, maxX, minY, maxY, width, height }
 */
function getGraphBounds(nodes) {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  nodes.forEach(node => {
    const halfW = (node.width || NODE_DEFAULTS.WIDTH) / 2
    const halfH = (node.height || NODE_DEFAULTS.HEIGHT) / 2
    minX = Math.min(minX, node.x - halfW)
    maxX = Math.max(maxX, node.x + halfW)
    minY = Math.min(minY, node.y - halfH)
    maxY = Math.max(maxY, node.y + halfH)
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * 计算适应视图的变换参数
 * @param {Array} nodes - 节点列表
 * @param {number} viewWidth - 视图宽度
 * @param {number} viewHeight - 视图高度
 * @param {number} padding - 内边距
 * @returns {Object} { zoom, panX, panY }
 */
function fitView(nodes, viewWidth, viewHeight, padding = 50) {
  const bounds = getGraphBounds(nodes)

  if (bounds.width === 0 && bounds.height === 0) {
    return { zoom: 1, panX: viewWidth / 2, panY: viewHeight / 2 }
  }

  const availableWidth = viewWidth - padding * 2
  const availableHeight = viewHeight - padding * 2

  const scaleX = availableWidth / bounds.width
  const scaleY = availableHeight / bounds.height
  const zoom = Math.min(scaleX, scaleY, 3)

  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  const panX = viewWidth / 2 - centerX * zoom
  const panY = viewHeight / 2 - centerY * zoom

  return { zoom, panX, panY }
}

export {
  sugiyamaLayout,
  forceDirectedLayout,
  runLayout,
  getGraphBounds,
  fitView,
}
