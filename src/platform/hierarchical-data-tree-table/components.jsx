import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { DEFAULT_CONFIG, CHECK_STATE } from './logic/index.js'

export const VirtualList = ({
  items,
  itemHeight = DEFAULT_CONFIG.rowHeight,
  renderItem,
  height,
  overscan = 5,
}) => {
  const containerRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = items.length * itemHeight
  const visibleCount = Math.ceil(height / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length, Math.ceil(scrollTop / itemHeight) + visibleCount + overscan)

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      _index: startIndex + index,
    }))
  }, [items, startIndex, endIndex])

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop)
  }, [])

  return (
    <div
      ref={containerRef}
      className="htt-virtual-list"
      style={{ height }}
      onScroll={handleScroll}
    >
      <div className="htt-virtual-spacer" style={{ height: totalHeight }}>
        {visibleItems.map((item, index) => (
          <div
            key={item.id || index}
            className="htt-virtual-item"
            style={{ top: (startIndex + index) * itemHeight }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export const ProgressModal = ({
  visible,
  title,
  progress,
  total,
  onCancel,
}) => {
  if (!visible) return null

  const percentage = total > 0 ? Math.min(100, (progress / total) * 100) : 0

  return (
    <div className="htt-progress-overlay">
      <div className="htt-progress-modal">
        <div className="htt-progress-title">{title}</div>
        <div className="htt-progress-bar">
          <div className="htt-progress-fill" style={{ width: `${percentage}%` }} />
        </div>
        <div className="htt-progress-text">
          <span>{progress} / {total}</span>
          <button className="htt-button htt-button-danger" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

export const ConfirmDialog = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
}) => {
  if (!visible) return null

  return (
    <div className="htt-dialog-overlay" onClick={onCancel}>
      <div className="htt-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="htt-dialog-header">{title}</div>
        <div className="htt-dialog-body">{message}</div>
        <div className="htt-dialog-footer">
          <button className="htt-button" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`htt-button ${danger ? 'htt-button-danger' : 'htt-button-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export const Checkbox = ({ checked, indeterminate, onChange, disabled }) => {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      className="htt-checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
  )
}

export const JsonPathList = ({ paths, maxShow = 100 }) => {
  if (paths.length === 0) return null

  const displayPaths = paths.slice(0, maxShow)
  const hasMore = paths.length > maxShow

  const handleDownload = () => {
    const content = paths.join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `selected-paths-${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="htt-json-path-list">
      <div className="htt-json-path-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>已选中节点 (共 {paths.length} 个):</span>
        <button className="htt-button htt-button-primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={handleDownload}>
          下载文件
        </button>
      </div>
      {displayPaths.map((path, index) => (
        <div key={index} className="htt-json-path-item">
          {path}
        </div>
      ))}
      {hasMore && (
        <div className="htt-json-path-item" style={{ color: '#999' }}>
          ...还有 {paths.length - maxShow} 个节点
        </div>
      )}
    </div>
  )
}
