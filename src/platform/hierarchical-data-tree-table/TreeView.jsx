import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  CHECK_STATE,
  KEY_CODES,
  DEFAULT_CONFIG,
  flattenVisibleRows,
  toggleExpand as toggleExpandUtil,
  setNodeCheckState,
  renameNode as renameNodeUtil,
} from './logic/index.js'
import { VirtualList, Checkbox } from './components.jsx'

const TreeNode = ({
  node,
  depth,
  onToggleExpand,
  onCheckChange,
  onSelect,
  onRename,
  onDelete,
  isSelected,
  isFocused,
  editingId,
  onEditingChange,
}) => {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = node.isExpanded
  const isChecked = node.checkState === CHECK_STATE.CHECKED
  const isIndeterminate = node.checkState === CHECK_STATE.INDETERMINATE

  const handleExpandClick = (e) => {
    e.stopPropagation()
    onToggleExpand(node.id)
  }

  const handleCheckChange = (e) => {
    e.stopPropagation()
    const newState = e.target.checked ? CHECK_STATE.CHECKED : CHECK_STATE.UNCHECKED
    onCheckChange(node.id, newState)
  }

  const handleNodeClick = () => {
    onSelect(node.id)
  }

  const handleRename = (e) => {
    e.stopPropagation()
    onEditingChange(node.id)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete(node.id)
  }

  const handleRenameSubmit = (e) => {
    if (e.key === 'Enter') {
      onRename(node.id, e.target.value)
      onEditingChange(null)
    } else if (e.key === 'Escape') {
      onEditingChange(null)
    }
  }

  return (
    <div
      className={`htt-tree-node ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
      onClick={handleNodeClick}
      tabIndex={0}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      data-id={node.id}
      style={{ paddingLeft: depth * 24 }}
    >
      {hasChildren ? (
        <div
          className={`htt-tree-expand ${isExpanded ? 'expanded' : ''}`}
          onClick={handleExpandClick}
        >
          <div className="htt-tree-expand-icon" />
        </div>
      ) : (
        <div className="htt-tree-indent" />
      )}

      <Checkbox
        checked={isChecked}
        indeterminate={isIndeterminate}
        onChange={handleCheckChange}
      />

      {editingId === node.id ? (
        <input
          className="htt-tree-label editing"
          defaultValue={node.name}
          autoFocus
          onKeyDown={handleRenameSubmit}
          onBlur={() => onEditingChange(null)}
        />
      ) : (
        <span className="htt-tree-label">{node.name}</span>
      )}

      <div className="htt-tree-actions">
        <button className="htt-tree-action-btn" onClick={handleRename}>
          重命名
        </button>
        <button className="htt-tree-action-btn" onClick={handleDelete}>
          删除
        </button>
      </div>
    </div>
  )
}

const TreeView = ({
  state,
  onStateChange,
  useVirtualization = true,
  virtualizationThreshold = DEFAULT_CONFIG.virtualizationThreshold,
  height = 500,
  onRename,
  onDelete,
}) => {
  const [selectedId, setSelectedId] = useState(null)
  const [focusedId, setFocusedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const containerRef = useRef(null)

  const visibleRows = useMemo(() => flattenVisibleRows(state), [state])

  const shouldUseVirtualization = useVirtualization && visibleRows.length >= virtualizationThreshold

  const handleToggleExpand = useCallback(
    (nodeId) => {
      const newState = toggleExpandUtil(state, nodeId)
      onStateChange(newState)
    },
    [state, onStateChange]
  )

  const handleCheckChange = useCallback(
    (nodeId, newState) => {
      const newTreeState = setNodeCheckState(state, nodeId, newState)
      onStateChange(newTreeState)
    },
    [state, onStateChange]
  )

  const handleSelect = useCallback((nodeId) => {
    setSelectedId(nodeId)
    setFocusedId(nodeId)
  }, [])

  const handleRename = useCallback(
    (nodeId, newName) => {
      const newState = renameNodeUtil(state, nodeId, newName)
      onStateChange(newState)
      if (onRename) onRename(nodeId, newName)
    },
    [state, onStateChange, onRename]
  )

  const handleDelete = useCallback(
    (nodeId) => {
      if (onDelete) onDelete(nodeId)
    },
    [onDelete]
  )

  const findVisibleIndex = useCallback(
    (id) => {
      return visibleRows.findIndex((row) => row.id === id)
    },
    [visibleRows]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (!focusedId) return

      const currentIndex = findVisibleIndex(focusedId)
      if (currentIndex === -1) return

      switch (e.key) {
        case KEY_CODES.ARROW_UP:
          e.preventDefault()
          if (currentIndex > 0) {
            const prevId = visibleRows[currentIndex - 1].id
            setFocusedId(prevId)
            setSelectedId(prevId)
          }
          break

        case KEY_CODES.ARROW_DOWN:
          e.preventDefault()
          if (currentIndex < visibleRows.length - 1) {
            const nextId = visibleRows[currentIndex + 1].id
            setFocusedId(nextId)
            setSelectedId(nextId)
          }
          break

        case KEY_CODES.ARROW_LEFT: {
          e.preventDefault()
          const currentNode = visibleRows[currentIndex]
          if (currentNode.isExpanded && currentNode.hasChildren) {
            handleToggleExpand(currentNode.id)
          } else if (currentNode.depth > 0) {
            const parentPath = currentNode.parentPath
            if (parentPath && parentPath.length > 0) {
              const parentId = parentPath[parentPath.length - 1]
              setFocusedId(parentId)
              setSelectedId(parentId)
            }
          }
          break
        }

        case KEY_CODES.ARROW_RIGHT: {
          e.preventDefault()
          const currentNode = visibleRows[currentIndex]
          if (!currentNode.isExpanded && currentNode.hasChildren) {
            handleToggleExpand(currentNode.id)
          } else if (currentNode.hasChildren && currentNode.isExpanded) {
            const childId = visibleRows[currentIndex + 1].id
            setFocusedId(childId)
            setSelectedId(childId)
          }
          break
        }

        case KEY_CODES.SPACE:
          e.preventDefault()
          const currentNode = visibleRows[currentIndex]
          const newCheckState =
            currentNode.checkState === CHECK_STATE.CHECKED
              ? CHECK_STATE.UNCHECKED
              : CHECK_STATE.CHECKED
          handleCheckChange(currentNode.id, newCheckState)
          break

        case KEY_CODES.ENTER:
          e.preventDefault()
          setEditingId(focusedId)
          break
      }
    },
    [focusedId, visibleRows, findVisibleIndex, handleToggleExpand, handleCheckChange]
  )

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.setAttribute('role', 'tree')
      container.setAttribute('aria-multiselectable', 'true')
    }
  }, [])

  const renderRow = (row) => (
    <TreeNode
      key={row.id}
      node={row}
      depth={row.depth}
      onToggleExpand={handleToggleExpand}
      onCheckChange={handleCheckChange}
      onSelect={handleSelect}
      onRename={handleRename}
      onDelete={handleDelete}
      isSelected={selectedId === row.id}
      isFocused={focusedId === row.id}
      editingId={editingId}
      onEditingChange={setEditingId}
    />
  )

  if (visibleRows.length === 0) {
    return <div className="htt-empty">暂无数据</div>
  }

  return (
    <div
      ref={containerRef}
      className="htt-tree-container"
      onKeyDown={handleKeyDown}
      style={{ height: shouldUseVirtualization ? height : 'auto' }}
    >
      {shouldUseVirtualization ? (
        <VirtualList items={visibleRows} height={height} renderItem={renderRow} />
      ) : (
        visibleRows.map(renderRow)
      )}
    </div>
  )
}

export default TreeView
