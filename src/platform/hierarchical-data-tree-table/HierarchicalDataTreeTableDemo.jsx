import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog, JsonPathList, ProgressModal } from './components.jsx'
import './HierarchicalDataTreeTable.css'
import {
    countNodes,
    createCancelToken,
    createUndoStack,
    DATA_TYPE,
    debounce,
    deleteSubtree,
    expandToDepth,
    generateDeepChainTree,
    generateRandomIdTree,
    generateWideFanoutTree,
    getJsonPathList,
    SORT_STRATEGY,
    VIEW_MODE
} from './logic/index.js'
import TableView from './TableView.jsx'
import TreeView from './TreeView.jsx'

const HierarchicalDataTreeTableDemo = () => {
  const [viewMode, setViewMode] = useState(VIEW_MODE.TREE)
  const [sortStrategy, setSortStrategy] = useState(SORT_STRATEGY.STABLE_SUBTREE)
  const [dataType, setDataType] = useState(DATA_TYPE.WIDE_FANOUT)
  const [nodeCount, setNodeCount] = useState(100)
  const [treeState, setTreeState] = useState({
    nodes: [],
    expandedIds: new Set(),
    sortKey: null,
    sortDirection: null,
  })
  const [expandProgress, setExpandProgress] = useState({ visible: false, current: 0, total: 0 })
  const [deleteConfirm, setDeleteConfirm] = useState({ visible: false, nodeId: null })
  const [expandTime, setExpandTime] = useState(null)
  const [showJsonPaths, setShowJsonPaths] = useState(false)

  const undoStackRef = useRef(createUndoStack())
  const expandCancelToken = useRef(null)

  const jsonPaths = getJsonPathList(treeState)

  useEffect(() => {
    loadData(DATA_TYPE.WIDE_FANOUT, 100)
  }, [])

  const loadData = useCallback((type, count, seed = 12345) => {
    let nodes
    switch (type) {
      case DATA_TYPE.DEEP_CHAIN:
        nodes = generateDeepChainTree(count, seed)
        break
      case DATA_TYPE.WIDE_FANOUT: {
        const width = Math.ceil(Math.sqrt(count))
        nodes = generateWideFanoutTree(width, 2, seed)
        break
      }
      case DATA_TYPE.RANDOM_ID:
        nodes = generateRandomIdTree(count, 5, seed)
        break
      default:
        nodes = []
    }

    const newState = {
      nodes,
      expandedIds: new Set(),
      sortKey: null,
      sortDirection: null,
    }
    setTreeState(newState)
    undoStackRef.current.clear()
    undoStackRef.current.pushState(newState)
    setExpandTime(null)
  }, [])

  const handleStateChange = useCallback(
    (newState) => {
      setTreeState(newState)
      debounce(() => {
        undoStackRef.current.pushState(newState)
      }, 300)()
    },
    []
  )

  const handleUndo = useCallback(() => {
    try {
      const prevState = undoStackRef.current.undo()
      setTreeState(prevState)
    } catch (e) {
      console.warn('Undo failed:', e.message)
    }
  }, [])

  const handleRedo = useCallback(() => {
    try {
      const nextState = undoStackRef.current.redo()
      setTreeState(nextState)
    } catch (e) {
      console.warn('Redo failed:', e.message)
    }
  }, [])

  const handleExpandAll = useCallback(async () => {
    const total = countNodes(treeState.nodes)
    setExpandProgress({ visible: true, current: 0, total })
    expandCancelToken.current = createCancelToken()

    const startTime = performance.now()

    try {
      const progressCallback = (processed) => {
        setExpandProgress((prev) => ({ ...prev, current: processed }))
      }

      await new Promise((resolve) => {
        setTimeout(() => {
          const newState = expandToDepth(
            treeState,
            100,
            progressCallback,
            expandCancelToken.current
          )
          setTreeState(newState)
          resolve()
        }, 0)
      })

      const endTime = performance.now()
      setExpandTime((endTime - startTime).toFixed(2))
    } catch (e) {
      console.log('Expand cancelled:', e.message)
    } finally {
      setExpandProgress((prev) => ({ ...prev, visible: false }))
      expandCancelToken.current = null
    }
  }, [treeState])

  const handleCancelExpand = useCallback(() => {
    if (expandCancelToken.current) {
      expandCancelToken.current.cancelled = true
    }
  }, [])

  const handleCollapseAll = useCallback(() => {
    setTreeState((prev) => ({
      ...prev,
      expandedIds: new Set(),
    }))
  }, [])

  const handleDelete = useCallback((nodeId) => {
    setDeleteConfirm({ visible: true, nodeId })
  }, [])

  const confirmDelete = useCallback(() => {
    const newState = deleteSubtree(treeState, deleteConfirm.nodeId)
    setTreeState(newState)
    undoStackRef.current.pushState(newState)
    setDeleteConfirm({ visible: false, nodeId: null })
  }, [treeState, deleteConfirm.nodeId])

  const handleLoadData = () => {
    loadData(dataType, nodeCount)
  }

  const canUndo = undoStackRef.current.canUndo()
  const canRedo = undoStackRef.current.canRedo()
  const totalNodes = countNodes(treeState.nodes)
  const visibleCount = treeState.expandedIds.size + 1

  return (
    <div className="hierarchical-tree-table" style={{ height: '700px' }}>
      <div className="htt-toolbar">
        <div className="htt-toolbar-group">
          <select
            className="htt-select"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value={VIEW_MODE.TREE}>树形视图</option>
            <option value={VIEW_MODE.TABLE}>表格视图</option>
          </select>

          <select
            className="htt-select"
            value={sortStrategy}
            onChange={(e) => setSortStrategy(e.target.value)}
          >
            <option value={SORT_STRATEGY.STABLE_SUBTREE}>子树稳定排序</option>
            <option value={SORT_STRATEGY.FLAT}>扁平排序</option>
          </select>
        </div>

        <div className="htt-toolbar-separator" />

        <div className="htt-toolbar-group">
          <select
            className="htt-select"
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
          >
            <option value={DATA_TYPE.DEEP_CHAIN}>深链数据</option>
            <option value={DATA_TYPE.WIDE_FANOUT}>宽扇出数据</option>
            <option value={DATA_TYPE.RANDOM_ID}>随机ID数据</option>
          </select>

          <input
            type="number"
            className="htt-input"
            value={nodeCount}
            onChange={(e) => setNodeCount(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            max={10000}
          />

          <button className="htt-button htt-button-primary" onClick={handleLoadData}>
            加载数据
          </button>
        </div>

        <div className="htt-toolbar-separator" />

        <div className="htt-toolbar-group">
          <button className="htt-button" onClick={handleExpandAll}>
            全部展开
          </button>
          <button className="htt-button" onClick={handleCollapseAll}>
            全部折叠
          </button>
        </div>

        <div className="htt-toolbar-separator" />

        <div className="htt-toolbar-group">
          <button className="htt-button" onClick={handleUndo} disabled={!canUndo}>
            撤销
          </button>
          <button className="htt-button" onClick={handleRedo} disabled={!canRedo}>
            重做
          </button>
        </div>

        <div className="htt-toolbar-separator" />

        <div className="htt-toolbar-group">
          <button
            className="htt-button"
            onClick={() => setShowJsonPaths(!showJsonPaths)}
          >
            导出选中路径
          </button>
        </div>

        <div className="htt-stats">
          总节点: {totalNodes} | 可见: {visibleCount}
          {expandTime && ` | 展开耗时: ${expandTime}ms`}
        </div>
      </div>

      <div className="htt-content">
        {viewMode === VIEW_MODE.TREE ? (
          <TreeView
            state={treeState}
            onStateChange={handleStateChange}
            onDelete={handleDelete}
          />
        ) : (
          <TableView
            state={treeState}
            onStateChange={handleStateChange}
            sortStrategy={sortStrategy}
          />
        )}

        {showJsonPaths && <JsonPathList paths={jsonPaths} />}
      </div>

      <ProgressModal
        visible={expandProgress.visible}
        title="正在展开节点..."
        progress={expandProgress.current}
        total={expandProgress.total}
        onCancel={handleCancelExpand}
      />

      <ConfirmDialog
        visible={deleteConfirm.visible}
        title="确认删除"
        message="确定要删除此节点及其所有子节点吗？此操作可通过撤销恢复。"
        confirmText="删除"
        cancelText="取消"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ visible: false, nodeId: null })}
      />
    </div>
  )
}

export default HierarchicalDataTreeTableDemo
