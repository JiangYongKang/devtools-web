import { runLayout } from './layout.js'
import { detectCycle, findIsolatedNodes } from './graphUtils.js'
import { STACK_LIMIT, SCHEMA_VERSION } from './constants.js'
import { InvalidSchemaError, WorkerLayoutError } from './errors.js'

class UndoRedoStack {
  constructor(limit = STACK_LIMIT) {
    this.undoStack = []
    this.redoStack = []
    this.limit = limit
  }

  push(state) {
    this.undoStack.push(JSON.stringify(state))
    this.redoStack = []
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }
  }

  undo(currentState) {
    if (this.undoStack.length === 0) return null
    const prevState = this.undoStack.pop()
    this.redoStack.push(JSON.stringify(currentState))
    return JSON.parse(prevState)
  }

  redo(currentState) {
    if (this.redoStack.length === 0) return null
    const nextState = this.redoStack.pop()
    this.undoStack.push(JSON.stringify(currentState))
    return JSON.parse(nextState)
  }

  canUndo() {
    return this.undoStack.length > 0
  }

  canRedo() {
    return this.redoStack.length > 0
  }
}

class GraphStateManager {
  constructor() {
    this.nodes = []
    this.edges = []
    this.selectedNodeIds = new Set()
    this.selectedEdgeIds = new Set()
    this.history = new UndoRedoStack()
    this.worker = null
    this.workerAvailable = typeof Worker !== 'undefined'
  }

  saveHistory() {
    this.history.push({
      nodes: [...this.nodes],
      edges: [...this.edges],
    })
  }

  undo() {
    const prevState = this.history.undo({
      nodes: this.nodes,
      edges: this.edges,
    })
    if (prevState) {
      this.nodes = prevState.nodes
      this.edges = prevState.edges
      return true
    }
    return false
  }

  redo() {
    const nextState = this.history.redo({
      nodes: this.nodes,
      edges: this.edges,
    })
    if (nextState) {
      this.nodes = nextState.nodes
      this.edges = nextState.edges
      return true
    }
    return false
  }

  canUndo() {
    return this.history.canUndo()
  }

  canRedo() {
    return this.history.canRedo()
  }

  setGraph(nodes, edges, saveHistory = true) {
    if (saveHistory) {
      this.saveHistory()
    }
    this.nodes = nodes
    this.edges = edges
  }

  addNode(node, saveHistory = true) {
    if (saveHistory) {
      this.saveHistory()
    }
    this.nodes.push(node)
  }

  updateNode(nodeId, updates, saveHistory = true) {
    if (saveHistory) {
      this.saveHistory()
    }
    const node = this.nodes.find(n => n.id === nodeId)
    if (node) {
      Object.assign(node, updates)
    }
  }

  removeNode(nodeId, saveHistory = true) {
    if (saveHistory) {
      this.saveHistory()
    }
    this.nodes = this.nodes.filter(n => n.id !== nodeId)
    this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId)
  }

  addEdge(edge, saveHistory = true) {
    if (saveHistory) {
      this.saveHistory()
    }
    this.edges.push(edge)
  }

  removeEdge(edgeId, saveHistory = true) {
    if (saveHistory) {
      this.saveHistory()
    }
    this.edges = this.edges.filter(e => e.id !== edgeId)
  }

  selectNode(nodeId, clearSelection = false) {
    if (clearSelection) {
      this.selectedNodeIds.clear()
      this.selectedEdgeIds.clear()
    }
    this.selectedNodeIds.add(nodeId)
  }

  selectNodes(nodeIds) {
    this.selectedNodeIds = new Set(nodeIds)
    this.selectedEdgeIds.clear()
  }

  selectEdge(edgeId, clearSelection = false) {
    if (clearSelection) {
      this.selectedNodeIds.clear()
      this.selectedEdgeIds.clear()
    }
    this.selectedEdgeIds.add(edgeId)
  }

  clearSelection() {
    this.selectedNodeIds.clear()
    this.selectedEdgeIds.clear()
  }

  deleteSelected() {
    if (this.selectedNodeIds.size === 0 && this.selectedEdgeIds.size === 0) return

    this.saveHistory()

    this.selectedNodeIds.forEach(nodeId => {
      this.nodes = this.nodes.filter(n => n.id !== nodeId)
      this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId)
    })

    this.edges = this.edges.filter(e => !this.selectedEdgeIds.has(e.id))

    this.clearSelection()
  }

  validateGraph(isDAGMode = false) {
    const errors = []
    const warnings = []

    if (isDAGMode) {
      const cycleResult = detectCycle(this.nodes, this.edges)
      if (cycleResult.hasCycle) {
        errors.push({
          type: 'cycle',
          message: '检测到图中存在环',
          details: cycleResult.cycle,
        })
      }
    }

    const isolated = findIsolatedNodes(this.nodes, this.edges)
    if (isolated.length > 0) {
      warnings.push({
        type: 'isolated',
        message: `发现 ${isolated.length} 个孤立节点`,
        details: isolated,
      })
    }

    return { errors, warnings, isValid: errors.length === 0 }
  }

  exportToJSON() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      nodes: this.nodes.map(n => ({
        id: n.id,
        x: n.x,
        y: n.y,
        label: n.label,
        width: n.width,
        height: n.height,
      })),
      edges: this.edges.map(e => ({
        id: e.id,
        from: e.from,
        to: e.to,
        kind: e.kind || 'default',
        label: e.label,
      })),
    }
  }

  importFromJSON(data, isDAGMode = false) {
    if (!data || typeof data !== 'object') {
      throw new InvalidSchemaError('无效的 JSON 数据')
    }

    if (!Array.isArray(data.nodes)) {
      throw new InvalidSchemaError('缺少 nodes 数组', 'nodes')
    }

    if (!Array.isArray(data.edges)) {
      throw new InvalidSchemaError('缺少 edges 数组', 'edges')
    }

    const nodeIds = new Set()
    data.nodes.forEach(node => {
      if (!node.id) {
        throw new InvalidSchemaError('节点缺少 id 字段', 'nodes')
      }
      if (nodeIds.has(node.id)) {
        throw new InvalidSchemaError(`重复的节点 id: ${node.id}`, 'nodes')
      }
      nodeIds.add(node.id)
    })

    data.edges.forEach(edge => {
      if (!edge.from || !edge.to) {
        throw new InvalidSchemaError('边缺少 from 或 to 字段', 'edges')
      }
      if (!nodeIds.has(edge.from)) {
        throw new InvalidSchemaError(`边引用不存在的源节点: ${edge.from}`, 'edges')
      }
      if (!nodeIds.has(edge.to)) {
        throw new InvalidSchemaError(`边引用不存在的目标节点: ${edge.to}`, 'edges')
      }
    })

    if (isDAGMode) {
      const cycleResult = detectCycle(data.nodes, data.edges)
      if (cycleResult.hasCycle) {
        throw new InvalidSchemaError('导入的数据包含环，DAG 模式不允许')
      }
    }

    this.saveHistory()
    this.nodes = data.nodes.map(n => ({
      ...n,
      x: n.x ?? 0,
      y: n.y ?? 0,
      width: n.width ?? 120,
      height: n.height ?? 60,
    }))
    this.edges = data.edges.map((e, i) => ({
      ...e,
      id: e.id || `edge-${Date.now()}-${i}`,
      kind: e.kind || 'default',
    }))

    return this.validateGraph(isDAGMode)
  }

  async runLayoutWithWorker(algorithm, options = {}) {
    if (this.workerAvailable && options.useWorker) {
      try {
        return await this.runLayoutInWorker(algorithm, options)
      } catch (error) {
        console.warn('Worker 布局失败，降级到主线程:', error)
      }
    }

    return runLayout(algorithm, this.nodes, this.edges, options)
  }

  runLayoutInWorker(algorithm, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        try {
          this.worker = new Worker(
            new URL('./layoutWorker.js', import.meta.url),
            { type: 'module' }
          )
        } catch (error) {
          reject(new WorkerLayoutError(error))
          return
        }
      }

      this.worker.onmessage = (e) => {
        if (e.data.success) {
          resolve(e.data)
        } else {
          reject(new Error(e.data.error))
        }
      }

      this.worker.onerror = (error) => {
        reject(new WorkerLayoutError(error))
      }

      this.worker.postMessage({
        algorithm,
        nodes: this.nodes,
        edges: this.edges,
        options,
      })
    })
  }

  terminateWorker() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

export {
  UndoRedoStack,
  GraphStateManager,
}
