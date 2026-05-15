import React, { useState, useEffect } from 'react'
import { flattenContext, unflattenContext, WARNING_TYPES } from './logic'
import './TemplatedNotificationPreview.css'

export function VariablePanel({ context, onChange, warnings = [] }) {
  const [editMode, setEditMode] = useState('table')
  const [jsonError, setJsonError] = useState(null)
  const [flatContext, setFlatContext] = useState({})

  useEffect(() => {
    setFlatContext(flattenContext(context))
  }, [context])

  const handleJsonChange = (e) => {
    try {
      const parsed = JSON.parse(e.target.value)
      onChange(parsed)
      setJsonError(null)
    } catch (err) {
      setJsonError(err.message)
    }
  }

  const handleTableChange = (path, value) => {
    const newFlat = { ...flatContext, [path]: value }
    setFlatContext(newFlat)
    onChange(unflattenContext(newFlat))
  }

  const warningMap = warnings.reduce((acc, w) => {
    if (w.path) {
      acc[w.path] = w
    }
    return acc
  }, {})

  const getWarningIcon = (path) => {
    const warning = warningMap[path]
    if (!warning) return null

    const icons = {
      [WARNING_TYPES.MISSING_VARIABLE]: '⚠️',
      [WARNING_TYPES.UNUSED_VARIABLE]: 'ℹ️',
      [WARNING_TYPES.TYPE_MISMATCH]: '🔧',
    }

    return (
      <span
        className="warning-icon"
        title={`${warning.message} (${warning.line ? `行${warning.line}` : ''})`}
      >
        {icons[warning.type] || '⚠️'}
      </span>
    )
  }

  return (
    <div className="variable-panel">
      <div className="panel-header">
        <h3>数据上下文</h3>
        <div className="mode-toggle">
          <button
            className={editMode === 'table' ? 'active' : ''}
            onClick={() => setEditMode('table')}
          >
            表格
          </button>
          <button
            className={editMode === 'json' ? 'active' : ''}
            onClick={() => setEditMode('json')}
          >
            JSON
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="warnings-container">
          {warnings.map((w, i) => (
            <div key={i} className={`warning-item warning-${w.type}`}>
              {w.message}
            </div>
          ))}
        </div>
      )}

      {editMode === 'table' ? (
        <div className="context-table">
          {Object.entries(flatContext).map(([path, value]) => (
            <div key={path} className="context-row">
              <label>
                <span className="path-label">{path}</span>
                {getWarningIcon(path)}
              </label>
              <input
                type="text"
                value={String(value ?? '')}
                onChange={(e) => handleTableChange(path, e.target.value)}
                className={warningMap[path] ? 'has-warning' : ''}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="json-editor">
          <textarea
            value={JSON.stringify(context, null, 2)}
            onChange={handleJsonChange}
            className={jsonError ? 'has-error' : ''}
            spellCheck={false}
          />
          {jsonError && <div className="json-error">JSON 格式错误: {jsonError}</div>}
        </div>
      )}
    </div>
  )
}
