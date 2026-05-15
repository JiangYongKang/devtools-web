import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './FlowDependencyGraphCanvas.css'
import {
  GraphStateManager,
  runLayout,
  fitView,
  EXAMPLES,
  CI_PIPELINE,
  CANVAS_DEFAULTS,
  NODE_DEFAULTS,
} from './logic/index.js'

function FlowDependencyGraphCanvas() {
  const graphStateRef = useRef(new GraphStateManager())
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set())
  const [selectedEdgeIds, setSelectedEdgeIds] = useState(new Set())

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [edgeStyle, setEdgeStyle] = useState('bezier')
  const [layoutAlgorithm, setLayoutAlgorithm] = useState('sugiyama')
  const [isDAGMode, setIsDAGMode] = useState(true)
  const [useWorker, setUseWorker] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [layoutStats, setLayoutStats] = useState(null)
  const [validation, setValidation] = useState({ errors: [], warnings: [] })
  const [jsonText, setJsonText] = useState('')

  const [isPanning, setIsPanning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectionBox, setSelectionBox] = useState(null)
  const [snapLines, setSnapLines] = useState([])
  const [layoutAbortController, setLayoutAbortController] = useState(null)

  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const gs = graphStateRef.current
    gs.setGraph([...CI_PIPELINE.nodes], [...CI_PIPELINE.edges], false)
    const result = runLayout('sugiyama', gs.nodes, gs.edges)
    gs.nodes = result.nodes
    updateStateFromGraph()

    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect()
      const fit = fitView(gs.nodes, bounds.width, bounds.height - 60)
      setZoom(fit.zoom)
      setPan({ x: fit.panX, y: fit.panY })
    }
  }, [])

  const updateStateFromGraph = useCallback(() => {
    const gs = graphStateRef.current
    setNodes([...gs.nodes])
    setEdges([...gs.edges])
    setSelectedNodeIds(new Set(gs.selectedNodeIds))
    setSelectedEdgeIds(new Set(gs.selectedEdgeIds))
    setValidation(gs.validateGraph(isDAGMode))
    setJsonText(JSON.stringify(gs.exportToJSON(), null, 2))
  }, [isDAGMode])

  const screenToWorld = useCallback((screenX, screenY) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom,
    }
  }, [pan, zoom])

  const calculateSnapLines = useCallback((movingNodeId, newX, newY) => {
    const lines = []
    const threshold = CANVAS_DEFAULTS.SNAP_THRESHOLD / zoom

    nodes.forEach(node => {
      if (node.id === movingNodeId) return

      if (Math.abs(node.x - newX) < threshold) {
        lines.push({ type: 'vertical', x: node.x })
      }
      if (Math.abs(node.y - newY) < threshold) {
        lines.push({ type: 'horizontal', y: node.y })
      }
    })

    return lines
  }, [nodes, zoom])

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0) return

    const worldPos = screenToWorld(e.clientX, e.clientY)

    if (e.shiftKey) {
      setIsSelecting(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setSelectionBox({ x: worldPos.x, y: worldPos.y, width: 0, height: 0 })
      return
    }

    setIsPanning(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan, screenToWorld])

  const handleCanvasMouseMove = useCallback((e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    } else if (isSelecting && selectionBox) {
      const startWorld = screenToWorld(dragStart.x, dragStart.y)
      const currentWorld = screenToWorld(e.clientX, e.clientY)
      setSelectionBox({
        x: Math.min(startWorld.x, currentWorld.x),
        y: Math.min(startWorld.y, currentWorld.y),
        width: Math.abs(currentWorld.x - startWorld.x),
        height: Math.abs(currentWorld.y - startWorld.y),
      })
    }
  }, [isPanning, isSelecting, dragStart, selectionBox, screenToWorld])

  const handleCanvasMouseUp = useCallback((e) => {
    if (isSelecting && selectionBox) {
      const gs = graphStateRef.current
      const newSelected = new Set()

      nodes.forEach(node => {
        const nodeLeft = node.x - node.width / 2
        const nodeRight = node.x + node.width / 2
        const nodeTop = node.y - node.height / 2
        const nodeBottom = node.y + node.height / 2

        const selRight = selectionBox.x + selectionBox.width
        const selBottom = selectionBox.y + selectionBox.height

        if (nodeRight >= selectionBox.x && nodeLeft <= selRight &&
            nodeBottom >= selectionBox.y && nodeTop <= selBottom) {
          newSelected.add(node.id)
        }
      })

      gs.selectedNodeIds = newSelected
      gs.selectedEdgeIds.clear()
      updateStateFromGraph()
    }

    setIsPanning(false)
    setIsSelecting(false)
    setSelectionBox(null)
  }, [isSelecting, selectionBox, nodes, updateStateFromGraph])

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation()
    if (e.button !== 0) return

    const gs = graphStateRef.current

    if (!e.shiftKey && !gs.selectedNodeIds.has(nodeId)) {
      gs.selectedNodeIds.clear()
      gs.selectedEdgeIds.clear()
    }
    gs.selectedNodeIds.add(nodeId)
    updateStateFromGraph()

    setIsDragging(true)
    const node = nodes.find(n => n.id === nodeId)
    const worldPos = screenToWorld(e.clientX, e.clientY)
    setDragStart({
      nodeId,
      offsetX: worldPos.x - node.x,
      offsetY: worldPos.y - node.y,
    })
  }, [nodes, screenToWorld, updateStateFromGraph])

  const handleNodeClick = useCallback((e) => {
    e.stopPropagation()
  }, [])

  const handleNodeMouseMove = useCallback((e) => {
    if (!isDragging || !dragStart.nodeId) return

    const gs = graphStateRef.current
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const newX = worldPos.x - dragStart.offsetX
    const newY = worldPos.y - dragStart.offsetY

    const lines = calculateSnapLines(dragStart.nodeId, newX, newY)
    setSnapLines(lines)

    let finalX = newX
    let finalY = newY

    lines.forEach(line => {
      if (line.type === 'vertical') finalX = line.x
      if (line.type === 'horizontal') finalY = line.y
    })

    const dx = finalX - (nodes.find(n => n.id === dragStart.nodeId)?.x || 0)
    const dy = finalY - (nodes.find(n => n.id === dragStart.nodeId)?.y || 0)

    gs.selectedNodeIds.forEach(id => {
      const node = gs.nodes.find(n => n.id === id)
      if (node) {
        node.x += dx
        node.y += dy
      }
    })

    updateStateFromGraph()
  }, [isDragging, dragStart, screenToWorld, calculateSnapLines, nodes, updateStateFromGraph])

  const handleNodeMouseUp = useCallback(() => {
    setIsDragging(false)
    setSnapLines([])
    setDragStart({ x: 0, y: 0 })
  }, [])

  const handleEdgeClick = useCallback((e, edgeId) => {
    e.stopPropagation()
    const gs = graphStateRef.current
    if (!e.shiftKey) {
      gs.selectedNodeIds.clear()
      gs.selectedEdgeIds.clear()
    }
    gs.selectedEdgeIds.add(edgeId)
    updateStateFromGraph()
  }, [updateStateFromGraph])

  const handleCanvasClick = useCallback(() => {
    if (!isSelecting && !isPanning && !isDragging) {
      const gs = graphStateRef.current
      gs.clearSelection()
      updateStateFromGraph()
    }
  }, [isSelecting, isPanning, isDragging, updateStateFromGraph])

  const handleWheel = useCallback((e) => {
    const delta = e.deltaY > 0 ? -CANVAS_DEFAULTS.ZOOM_STEP : CANVAS_DEFAULTS.ZOOM_STEP
    const newZoom = Math.max(CANVAS_DEFAULTS.MIN_ZOOM, Math.min(CANVAS_DEFAULTS.MAX_ZOOM, zoom + delta))

    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      setPan({
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
      })
    }
    setZoom(newZoom)
  }, [zoom, pan])

  const cancelAutoLayout = useCallback(() => {
    const gs = graphStateRef.current
    gs.terminateWorker()
    setIsLoading(false)
    setLayoutAbortController(null)
  }, [])

  const runAutoLayout = useCallback(async () => {
    if (isLoading) {
      cancelAutoLayout()
      return
    }

    setIsLoading(true)
    const gs = graphStateRef.current

    try {
      let result
      if (useWorker && typeof Worker !== 'undefined') {
        result = await gs.runLayoutWithWorker(layoutAlgorithm, { useWorker: true })
      }
      if (!result) {
        result = runLayout(layoutAlgorithm, gs.nodes, gs.edges)
      }

      gs.nodes = result.nodes
      updateStateFromGraph()
      setLayoutStats({
        algorithm: layoutAlgorithm,
        iterations: result.iterations,
        duration: result.duration,
        converged: result.converged,
      })

      if (containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect()
        const fit = fitView(gs.nodes, bounds.width, bounds.height - 60)
        setZoom(fit.zoom)
        setPan({ x: fit.panX, y: fit.panY })
      }
    } catch (error) {
      console.error('Layout failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [layoutAlgorithm, useWorker, updateStateFromGraph, isLoading, cancelAutoLayout])

  const handleFitView = useCallback(() => {
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect()
      const fit = fitView(nodes, bounds.width, bounds.height - 60)
      setZoom(fit.zoom)
      setPan({ x: fit.panX, y: fit.panY })
    }
  }, [nodes])

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(CANVAS_DEFAULTS.MAX_ZOOM, z + CANVAS_DEFAULTS.ZOOM_STEP))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(CANVAS_DEFAULTS.MIN_ZOOM, z - CANVAS_DEFAULTS.ZOOM_STEP))
  }, [])

  const loadExample = useCallback((example) => {
    const gs = graphStateRef.current
    gs.setGraph([...example.nodes], [...example.edges], false)
    const result = runLayout(layoutAlgorithm, gs.nodes, gs.edges)
    gs.nodes = result.nodes
    updateStateFromGraph()
    handleFitView()
  }, [layoutAlgorithm, updateStateFromGraph, handleFitView])

  const handleExportJSON = useCallback(() => {
    const gs = graphStateRef.current
    const data = gs.exportToJSON()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `graph-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handleImportJSON = useCallback(() => {
    const gs = graphStateRef.current
    try {
      const data = JSON.parse(jsonText)
      gs.importFromJSON(data, isDAGMode)
      updateStateFromGraph()
      handleFitView()
    } catch (error) {
      alert('导入失败: ' + error.message)
    }
  }, [jsonText, isDAGMode, updateStateFromGraph, handleFitView])

  const handleUndo = useCallback(() => {
    const gs = graphStateRef.current
    if (gs.undo()) {
      updateStateFromGraph()
    }
  }, [updateStateFromGraph])

  const handleRedo = useCallback(() => {
    const gs = graphStateRef.current
    if (gs.redo()) {
      updateStateFromGraph()
    }
  }, [updateStateFromGraph])

  const handleDeleteSelected = useCallback(() => {
    const gs = graphStateRef.current
    gs.deleteSelected()
    updateStateFromGraph()
  }, [updateStateFromGraph])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      handleDeleteSelected()
    }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault()
      handleUndo()
    }
    if ((e.key === 'y' || (e.key === 'z' && e.shiftKey)) && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleRedo()
    }
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const gs = graphStateRef.current
      gs.selectedNodeIds = new Set(nodes.map(n => n.id))
      gs.selectedEdgeIds.clear()
      updateStateFromGraph()
    }
  }, [handleDeleteSelected, handleUndo, handleRedo, nodes, updateStateFromGraph])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const calculateEdgePath = useCallback((edge) => {
    const fromNode = nodes.find(n => n.id === edge.from)
    const toNode = nodes.find(n => n.id === edge.to)
    if (!fromNode || !toNode) return ''

    if (fromNode.id === toNode.id) {
      const cx = fromNode.x
      const cy = fromNode.y - fromNode.height / 2 - 20
      const r = 20
      return `M ${fromNode.x} ${fromNode.y - fromNode.height / 2}
              A ${r} ${r} 0 1 1 ${fromNode.x + 0.1} ${fromNode.y - fromNode.height / 2}`
    }

    const sameEdges = edges.filter(e => e.from === edge.from && e.to === edge.to ||
                                          e.from === edge.to && e.to === edge.from)
    const edgeIndex = sameEdges.findIndex(e => e.id === edge.id)
    const offset = (edgeIndex - (sameEdges.length - 1) / 2) * 15

    const dx = toNode.x - fromNode.x
    const dy = toNode.y - fromNode.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / dist
    const ny = dx / dist

    const fromX = fromNode.x + nx * offset
    const fromY = fromNode.y + ny * offset
    const toX = toNode.x + nx * offset
    const toY = toNode.y + ny * offset

    if (edgeStyle === 'polyline') {
      const midX = (fromX + toX) / 2
      const midY = (fromY + toY) / 2
      if (Math.abs(dx) > Math.abs(dy)) {
        return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`
      } else {
        return `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`
      }
    } else {
      const midX = (fromX + toX) / 2 + nx * Math.abs(offset) * 2
      const midY = (fromY + toY) / 2 + ny * Math.abs(offset) * 2
      return `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`
    }
  }, [nodes, edges, edgeStyle])

  const minimapTransform = useMemo(() => {
    if (nodes.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    nodes.forEach(node => {
      minX = Math.min(minX, node.x - node.width / 2)
      maxX = Math.max(maxX, node.x + node.width / 2)
      minY = Math.min(minY, node.y - node.height / 2)
      maxY = Math.max(maxY, node.y + node.height / 2)
    })

    const padding = 20
    const mapWidth = 180
    const mapHeight = 120
    const graphWidth = maxX - minX + padding * 2
    const graphHeight = maxY - minY + padding * 2

    const scale = Math.min(mapWidth / graphWidth, mapHeight / graphHeight)
    return {
      scale,
      offsetX: -minX * scale + padding,
      offsetY: -minY * scale + padding,
    }
  }, [nodes])

  const gs = graphStateRef.current

  return (
    <div className="flow-graph-container">
      <header className="flow-graph-header">
        <div className="header-title">有向图编辑器</div>
        <div className="toolbar">
          <button className="tool-btn" onClick={handleUndo} disabled={!gs.canUndo()}>
            ↩ 撤销
          </button>
          <button className="tool-btn" onClick={handleRedo} disabled={!gs.canRedo()}>
            ↪ 重做
          </button>
          <div className="separator" style={{ width: 1, height: 24, background: '#e0e0e0', margin: '0 4px' }} />
          <select
            className="select-control"
            value={layoutAlgorithm}
            onChange={(e) => setLayoutAlgorithm(e.target.value)}
          >
            <option value="sugiyama">分层布局</option>
            <option value="force_directed">力导向布局</option>
          </select>
          <button className={`tool-btn ${isLoading ? 'danger' : 'primary'}`} onClick={runAutoLayout}>
            {isLoading ? '✕ 取消布局' : '📐 自动布局'}
          </button>
          <div className="separator" style={{ width: 1, height: 24, background: '#e0e0e0', margin: '0 4px' }} />
          <div className="edge-toggle">
            <button
              className={`edge-toggle-btn ${edgeStyle === 'bezier' ? 'active' : ''}`}
              onClick={() => setEdgeStyle('bezier')}
            >
              曲线
            </button>
            <button
              className={`edge-toggle-btn ${edgeStyle === 'polyline' ? 'active' : ''}`}
              onClick={() => setEdgeStyle('polyline')}
            >
              折线
            </button>
          </div>
          <div className="separator" style={{ width: 1, height: 24, background: '#e0e0e0', margin: '0 4px' }} />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isDAGMode}
              onChange={(e) => {
                setIsDAGMode(e.target.checked)
                setValidation(gs.validateGraph(e.target.checked))
              }}
            />
            DAG 模式
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useWorker}
              onChange={(e) => setUseWorker(e.target.checked)}
            />
            Worker
          </label>
          <div className="separator" style={{ width: 1, height: 24, background: '#e0e0e0', margin: '0 4px' }} />
          <button className="tool-btn" onClick={handleExportJSON}>
            📤 导出
          </button>
          <button className="tool-btn danger" onClick={handleDeleteSelected} disabled={selectedNodeIds.size === 0 && selectedEdgeIds.size === 0}>
            🗑 删除
          </button>
        </div>
      </header>

      {validation.errors.length > 0 && (
        <div className="errors-panel">
          {validation.errors.map((err, i) => (
            <div key={i} className="error-item">
              ⚠️ {err.message}
              {err.details && `: ${JSON.stringify(err.details)}`}
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="warnings-panel">
          {validation.warnings.map((warn, i) => (
            <div key={i} className="warning-item">
              ℹ️ {warn.message}
            </div>
          ))}
        </div>
      )}

      <div className="main-content">
        <div className="canvas-wrapper" ref={containerRef}>
          <div
            ref={canvasRef}
            className={`canvas-container ${isPanning ? 'grabbing' : ''} ${isSelecting ? 'selecting' : ''}`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={(e) => {
              handleCanvasMouseMove(e)
              handleNodeMouseMove(e)
            }}
            onMouseUp={(e) => {
              handleCanvasMouseUp(e)
              handleNodeMouseUp(e)
            }}
            onMouseLeave={() => {
              setIsPanning(false)
              setIsSelecting(false)
              setSelectionBox(null)
              setIsDragging(false)
              setSnapLines([])
            }}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
          >
            <svg className="graph-svg">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8e8e8" strokeWidth="0.5"/>
                </pattern>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#999"/>
                </marker>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid)"/>

                {snapLines.map((line, i) => (
                  line.type === 'vertical' ? (
                    <line key={i} x1={line.x} y1="-10000" x2={line.x} y2="10000" className="snap-line"/>
                  ) : (
                    <line key={i} x1="-10000" y1={line.y} x2="10000" y2={line.y} className="snap-line"/>
                  )
                ))}

                {edges.map(edge => {
                  const isSelected = selectedEdgeIds.has(edge.id)
                  return (
                    <path
                      key={edge.id}
                      d={calculateEdgePath(edge)}
                      className={`edge-path ${isSelected ? 'selected' : ''}`}
                      onClick={(e) => handleEdgeClick(e, edge.id)}
                      style={{
                        markerEnd: `url(#arrowhead${isSelected ? '-selected' : ''})`,
                      }}
                    />
                  )
                })}

                {nodes.map(node => {
                  const isSelected = selectedNodeIds.has(node.id)
                  return (
                    <g
                      key={node.id}
                      className={`graph-node ${isSelected ? 'selected' : ''}`}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      onClick={handleNodeClick}
                    >
                      <rect
                        className="node-rect"
                        x={-node.width / 2}
                        y={-node.height / 2}
                        width={node.width}
                        height={node.height}
                      />
                      <text className="node-label">
                        {node.label || node.id}
                      </text>
                    </g>
                  )
                })}

                {selectionBox && (
                  <rect
                    className="selection-box"
                    x={selectionBox.x}
                    y={selectionBox.y}
                    width={selectionBox.width}
                    height={selectionBox.height}
                  />
                )}
              </g>
            </svg>

            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-spinner"/>
                <div className="loading-text">布局计算中...</div>
              </div>
            )}

            <div className="zoom-controls">
              <button className="zoom-btn" onClick={handleZoomIn}>+</button>
              <div className="zoom-level">{Math.round(zoom * 100)}%</div>
              <button className="zoom-btn" onClick={handleZoomOut}>−</button>
              <button className="zoom-btn" onClick={handleFitView}>⛶</button>
            </div>

            {nodes.length > 0 && (
              <div className="minimap-container">
                <svg className="minimap-svg">
                  <g transform={`translate(${minimapTransform.offsetX}, ${minimapTransform.offsetY}) scale(${minimapTransform.scale})`}>
                    {nodes.map(node => (
                      <rect
                        key={node.id}
                        x={node.x - node.width / 2}
                        y={node.y - node.height / 2}
                        width={node.width}
                        height={node.height}
                        fill="#4a6cf7"
                        opacity={0.4}
                        rx={4}
                      />
                    ))}
                  </g>
                  <rect
                    className="minimap-viewport"
                    x={-pan.x * minimapTransform.scale / zoom + minimapTransform.offsetX}
                    y={-pan.y * minimapTransform.scale / zoom + minimapTransform.offsetY}
                    width={180 / zoom}
                    height={120 / zoom}
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">示例图</div>
            <div className="example-list">
              {EXAMPLES.map((example, i) => (
                <button key={i} className="example-btn" onClick={() => loadExample(example)}>
                  <div className="example-name">{example.name}</div>
                  <div className="example-desc">{example.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">图统计</div>
            <div className="stats-panel">
              <div className="stat-row">
                <span className="stat-label">节点数</span>
                <span className="stat-value">{nodes.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">边数</span>
                <span className="stat-value">{edges.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">选中节点</span>
                <span className="stat-value">{selectedNodeIds.size}</span>
              </div>
              {layoutStats && (
                <>
                  <div className="stat-row">
                    <span className="stat-label">布局耗时</span>
                    <span className="stat-value">{layoutStats.duration}ms</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">迭代次数</span>
                    <span className="stat-value">{layoutStats.iterations}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">收敛</span>
                    <span className="stat-value">{layoutStats.converged ? '✅' : '❌'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="json-editor">
            <div className="sidebar-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div className="sidebar-title">JSON 数据</div>
            </div>
            <textarea
              className="json-textarea"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
            <div className="json-actions">
              <button className="tool-btn" onClick={handleImportJSON}>
                📥 导入
              </button>
              <button className="tool-btn" onClick={() => {
                setJsonText(JSON.stringify(gs.exportToJSON(), null, 2))
              }}>
                🔄 刷新
              </button>
            </div>
          </div>

          <div className="info-panel">
            <div className="info-title">操作提示</div>
            <div className="info-text">
              • 拖拽画布平移<br/>
              • 滚轮缩放视图<br/>
              • Shift+拖拽框选节点<br/>
              • Ctrl+Z / Ctrl+Y 撤销重做<br/>
              • Delete 删除选中元素<br/>
              • Ctrl+A 全选节点
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlowDependencyGraphCanvas
