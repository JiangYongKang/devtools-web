import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  CHECK_STATE,
  SORT_STRATEGY,
  DEFAULT_CONFIG,
  flattenVisibleRows,
  toggleExpand as toggleExpandUtil,
  setNodeCheckState,
  sortTree as sortTreeUtil,
} from './logic/index.js'
import { Checkbox } from './components.jsx'

const DEFAULT_COLUMNS = [
  { key: 'name', title: '名称', width: 250, frozen: true },
  { key: 'value', title: '数值', width: 120 },
  { key: 'description', title: '描述', width: 200 },
]

const TableRow = ({
  row,
  columns,
  onToggleExpand,
  onCheckChange,
  onSelect,
  isSelected,
  sortKey,
}) => {
  const hasChildren = row.hasChildren
  const isExpanded = row.isExpanded
  const isChecked = row.checkState === CHECK_STATE.CHECKED
  const isIndeterminate = row.checkState === CHECK_STATE.INDETERMINATE

  const handleExpandClick = (e) => {
    e.stopPropagation()
    onToggleExpand(row.id)
  }

  const handleCheckChange = (e) => {
    e.stopPropagation()
    const newState = e.target.checked ? CHECK_STATE.CHECKED : CHECK_STATE.UNCHECKED
    onCheckChange(row.id, newState)
  }

  const handleRowClick = () => {
    onSelect(row.id)
  }

  const renderCell = (column) => {
    const value = row[column.key] ?? ''

    if (column.key === 'name') {
      return (
        <div className="htt-table-cell-content" style={{ paddingLeft: row.depth * 24 }}>
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
          <span>{value}</span>
        </div>
      )
    }

    return <span>{value}</span>
  }

  return (
    <tr
      className={`htt-table-tr ${isSelected ? 'selected' : ''}`}
      onClick={handleRowClick}
      data-id={row.id}
    >
      {columns.map((column) => (
        <td
          key={column.key}
          className={`htt-table-td ${column.frozen ? 'frozen' : ''}`}
          style={{ width: column.width, minWidth: column.minWidth || 60 }}
        >
          {renderCell(column)}
        </td>
      ))}
    </tr>
  )
}

const TableView = ({
  state,
  onStateChange,
  columns = DEFAULT_COLUMNS,
  sortStrategy = SORT_STRATEGY.STABLE_SUBTREE,
}) => {
  const [selectedId, setSelectedId] = useState(null)
  const [resizing, setResizing] = useState(null)
  const [columnWidths, setColumnWidths] = useState(
    columns.reduce((acc, col) => {
      acc[col.key] = col.width
      return acc
    }, {})
  )

  const visibleRows = useMemo(() => flattenVisibleRows(state), [state])

  const handleToggleExpand = useCallback(
    (nodeId) => {
      const newState = toggleExpandUtil(state, nodeId)
      onStateChange(newState)
    },
    [state, onStateChange]
  )

  const handleCheckChange = useCallback(
    (nodeId, newCheckState) => {
      const newState = setNodeCheckState(state, nodeId, newCheckState)
      onStateChange(newState)
    },
    [state, onStateChange]
  )

  const handleSelect = useCallback((nodeId) => {
    setSelectedId(nodeId)
  }, [])

  const handleSort = useCallback(
    (columnKey) => {
      let newSortKey = columnKey
      let newSortDirection = 'asc'

      if (state.sortKey === columnKey) {
        if (state.sortDirection === 'asc') {
          newSortDirection = 'desc'
        } else if (state.sortDirection === 'desc') {
          newSortKey = null
          newSortDirection = null
        }
      }

      const sortedNodes = newSortKey
        ? sortTreeUtil(state.nodes, sortStrategy, newSortKey, newSortDirection)
        : state.nodes

      onStateChange({
        ...state,
        nodes: sortedNodes,
        sortKey: newSortKey,
        sortDirection: newSortDirection,
      })
    },
    [state, sortStrategy, onStateChange]
  )

  const handleResizeStart = useCallback((e, columnKey) => {
    e.preventDefault()
    setResizing({
      key: columnKey,
      startX: e.clientX,
      startWidth: columnWidths[columnKey],
    })
  }, [columnWidths])

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e) => {
      const delta = e.clientX - resizing.startX
      const newWidth = Math.max(60, resizing.startWidth + delta)
      setColumnWidths((prev) => ({
        ...prev,
        [resizing.key]: newWidth,
      }))
    }

    const handleMouseUp = () => {
      setResizing(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  const columnsWithWidth = columns.map((col) => ({
    ...col,
    width: columnWidths[col.key] || col.width,
  }))

  if (visibleRows.length === 0) {
    return <div className="htt-empty">暂无数据</div>
  }

  return (
    <div className="htt-table-container">
      <table className="htt-table">
        <thead>
          <tr>
            {columnsWithWidth.map((column) => (
              <th
                key={column.key}
                className={`htt-table-th ${column.frozen ? 'frozen' : ''} ${
                  state.sortKey === column.key ? `sorted sorted-${state.sortDirection}` : ''
                }`}
                style={{ width: column.width, minWidth: column.minWidth || 60 }}
                onClick={() => handleSort(column.key)}
              >
                {column.title}
                <div
                  className={`htt-table-resize-handle ${
                    resizing?.key === column.key ? 'resizing' : ''
                  }`}
                  onMouseDown={(e) => handleResizeStart(e, column.key)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <TableRow
              key={row.id}
              row={row}
              columns={columnsWithWidth}
              onToggleExpand={handleToggleExpand}
              onCheckChange={handleCheckChange}
              onSelect={handleSelect}
              isSelected={selectedId === row.id}
              sortKey={state.sortKey}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableView
