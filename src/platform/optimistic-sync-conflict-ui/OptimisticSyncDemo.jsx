import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './OptimisticSyncDemo.css'
import {
    ACTORS,
    applyMutationToState,
    computeFieldDiff,
    confirmMutationApplied,
    createInitialState,
    createMockServer,
    createMutation,
    DEFAULT_DEMO_DATA,
    detectConflict,
    EVENT_TYPES,
    getItemById,
    getItemsArray,
    getPendingMutationsCount,
    hasUnsavedChanges,
    markMutationRejected,
    PRIORITY_OPTIONS,
    resolveConflict,
    retryMutation,
    rollbackToBase,
    STATUS_OPTIONS,
    SYNC_STATES,
} from './logic/index.js'

function SyncStatusBadge({ status }) {
  const statusLabels = {
    [SYNC_STATES.SYNCED]: '已同步',
    [SYNC_STATES.PENDING]: '同步中...',
    [SYNC_STATES.REJECTED]: '同步失败',
    [SYNC_STATES.CONFLICT]: '存在冲突',
  }

  return (
    <span className={`sync-status-badge ${status}`} aria-busy={status === SYNC_STATES.PENDING}>
      {statusLabels[status]}
    </span>
  )
}

function ItemCard({
  item,
  onEdit,
  onRetry,
  onRollback,
  onResolve,
  isEditing,
  editForm,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  isExpanded,
  onToggleExpand,
}) {
  const itemState = item._sync.state

  return (
    <div className={`item-card ${itemState}`}>
      <div className="item-header" onClick={() => !isEditing && onToggleExpand()}>
        <div className="item-title-section">
          <h4 className="item-title">{item.title}</h4>
          <div className="item-meta">
            <span className={`status-badge ${item.status}`}>
              {STATUS_OPTIONS.find((s) => s.value === item.status)?.label}
            </span>
            <span className={`priority-badge ${item.priority}`}>
              {PRIORITY_OPTIONS.find((p) => p.value === item.priority)?.label}
            </span>
            <SyncStatusBadge status={itemState} />
          </div>
        </div>

        <div className="item-actions" onClick={(e) => e.stopPropagation()}>
          {itemState === SYNC_STATES.SYNCED && (
            <button className="action-btn edit" onClick={() => onEdit(item.id)}>
              编辑
            </button>
          )}
          {itemState === SYNC_STATES.REJECTED && (
            <>
              <button className="action-btn retry" onClick={() => onRetry(item.id)}>
                重试
              </button>
              <button className="action-btn rollback" onClick={() => onRollback(item.id)}>
                回滚
              </button>
            </>
          )}
          {itemState === SYNC_STATES.CONFLICT && (
            <button className="action-btn resolve" onClick={() => onResolve(item.id)}>
              解决冲突
            </button>
          )}
        </div>

        <span className={`item-expand-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </div>

      {(isExpanded || isEditing) && (
        <div className="item-details">
          {isEditing ? (
            <div className="edit-form">
              {itemState === SYNC_STATES.CONFLICT && (
                <div className="error-message">
                  ⚠️ 警告：此项目存在版本冲突，保存将触发冲突解决流程。
                </div>
              )}

              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  name="title"
                  value={editForm.title}
                  onChange={(e) => onEditChange('title', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>描述</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={(e) => onEditChange('description', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>状态</label>
                <select
                  name="status"
                  value={editForm.status}
                  onChange={(e) => onEditChange('status', e.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>优先级</label>
                <select
                  name="priority"
                  value={editForm.priority}
                  onChange={(e) => onEditChange('priority', e.target.value)}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button className="action-btn cancel" onClick={onCancelEdit}>
                  取消
                </button>
                <button className="action-btn save" onClick={onSaveEdit}>
                  保存
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="item-description">{item.description}</p>
              {item._sync.error && (
                <div className="error-message">
                  ❌ {item._sync.error.message || '同步失败'}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ConflictResolutionModal({
  itemId,
  localData,
  remoteData,
  localRevision,
  remoteRevision,
  onResolve,
  onClose,
}) {
  const [selectedStrategy, setSelectedStrategy] = useState('keep_local')
  const [fieldResolutions, setFieldResolutions] = useState({})

  const diffResult = useMemo(() => {
    return computeFieldDiff(localData, remoteData, {})
  }, [localData, remoteData])

  const handleFieldResolution = (field, source) => {
    setFieldResolutions((prev) => ({
      ...prev,
      [field]: source,
    }))
  }

  const getMergedData = () => {
    if (selectedStrategy === 'keep_local') return localData
    if (selectedStrategy === 'adopt_remote') return remoteData

    const merged = { ...localData }
    Object.keys(fieldResolutions).forEach((field) => {
      if (fieldResolutions[field] === 'remote') {
        merged[field] = remoteData[field]
      } else {
        merged[field] = localData[field]
      }
    })
    return merged
  }

  const handleConfirm = () => {
    const mergedData = getMergedData()
    onResolve(itemId, selectedStrategy, mergedData)
  }

  return (
    <div className="conflict-modal-overlay" onClick={onClose}>
      <div className="conflict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="conflict-modal-header">
          <h2>⚠️ 版本冲突检测</h2>
          <p>检测到本地修改与服务器版本存在冲突，请选择解决策略。</p>
        </div>

        <div className="conflict-modal-body">
          <div className="version-info">
            <div className="version-card local">
              <h4>🔵 本地版本（您的修改）</h4>
              <div className="version-revision">Revision: {localRevision}</div>
              <div className="field-diff-list">
                {Object.entries(localData).map(([key, value]) => (
                  <div key={key} className="field-diff-item">
                    <div className="field-name">{key}</div>
                    <div className="field-value">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="version-card remote">
              <h4>🟢 远端版本（服务器最新）</h4>
              <div className="version-revision">Revision: {remoteRevision}</div>
              <div className="field-diff-list">
                {Object.entries(remoteData).map(([key, value]) => (
                  <div key={key} className="field-diff-item">
                    <div className="field-name">{key}</div>
                    <div className="field-value">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="conflict-resolution-section">
            <h3>选择解决策略</h3>

            <div className="resolution-strategies">
              <div
                className={`strategy-card ${selectedStrategy === 'keep_local' ? 'selected' : ''}`}
                onClick={() => setSelectedStrategy('keep_local')}
              >
                <div className="strategy-icon">💾</div>
                <div className="strategy-name">保留本地</div>
                <div className="strategy-description">使用您的修改覆盖服务器版本</div>
              </div>

              <div
                className={`strategy-card ${selectedStrategy === 'adopt_remote' ? 'selected' : ''}`}
                onClick={() => setSelectedStrategy('adopt_remote')}
              >
                <div className="strategy-icon">🌐</div>
                <div className="strategy-name">采用远端</div>
                <div className="strategy-description">放弃本地修改，使用服务器版本</div>
              </div>

              <div
                className={`strategy-card ${selectedStrategy === 'merge' ? 'selected' : ''}`}
                onClick={() => setSelectedStrategy('merge')}
              >
                <div className="strategy-icon">🔀</div>
                <div className="strategy-name">字段级合并</div>
                <div className="strategy-description">为每个字段单独选择版本</div>
              </div>
            </div>

            {selectedStrategy === 'merge' && (
              <div className="merge-field-list">
                {diffResult.conflicts.map((conflict) => (
                  <div key={conflict.key} className="merge-field-item">
                    <span className="merge-field-name">{conflict.key}</span>
                    <div className="merge-field-selector">
                      <button
                        className={`merge-option-btn local ${
                          (fieldResolutions[conflict.key] || 'local') === 'local' ? 'selected' : ''
                        }`}
                        onClick={() => handleFieldResolution(conflict.key, 'local')}
                      >
                        本地: {String(conflict.local)}
                      </button>
                      <button
                        className={`merge-option-btn remote ${
                          fieldResolutions[conflict.key] === 'remote' ? 'selected' : ''
                        }`}
                        onClick={() => handleFieldResolution(conflict.key, 'remote')}
                      >
                        远端: {String(conflict.remote)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="conflict-modal-footer">
          <button className="action-btn cancel" onClick={onClose}>
            取消
          </button>
          <button className="action-btn save" onClick={handleConfirm}>
            确认并保存
          </button>
        </div>
      </div>
    </div>
  )
}

function EventTimeline({ events }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getEventDescription = (event) => {
    switch (event.type) {
      case EVENT_TYPES.MUTATION_CREATED:
        return `项目 ${event.itemId?.slice(0, 8)} 创建变更`
      case EVENT_TYPES.MUTATION_APPLIED:
        return `项目 ${event.itemId?.slice(0, 8)} 同步成功`
      case EVENT_TYPES.MUTATION_REJECTED:
        return `项目 ${event.itemId?.slice(0, 8)} 同步失败`
      case EVENT_TYPES.CONFLICT_DETECTED:
        return `项目 ${event.itemId?.slice(0, 8)} 检测到冲突`
      case EVENT_TYPES.CONFLICT_RESOLVED:
        return `项目 ${event.itemId?.slice(0, 8)} 冲突已解决`
      case EVENT_TYPES.ROLLBACK_PERFORMED:
        return `项目 ${event.itemId?.slice(0, 8)} 已回滚`
      case EVENT_TYPES.RETRY_ATTEMPTED:
        return `项目 ${event.itemId?.slice(0, 8)} 重试同步`
      default:
        return event.type
    }
  }

  const getEventClassName = (type) => {
    return type.toLowerCase().replace(/_/g, '-')
  }

  return (
    <div className="timeline-panel">
      <h3>📋 事件时间线</h3>
      <div className="timeline-list">
        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-text">暂无事件记录</div>
          </div>
        ) : (
          events.slice().reverse().map((event, index) => (
            <div
              key={`${event.timestamp}-${event.type}-${event.itemId || event.mutationId || index}`}
              className={`timeline-item ${getEventClassName(event.type)}`}
            >
              <div className="timeline-content">
                <div className="timeline-type">{event.type}</div>
                <div className="timeline-description">{getEventDescription(event)}</div>
                <div className="timeline-time">{formatTime(event.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function OptimisticSyncDemo() {
  const [state, setState] = useState(() => createInitialState(DEFAULT_DEMO_DATA))
  const [editingItemId, setEditingItemId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [expandedItems, setExpandedItems] = useState(new Set())
  const [conflictModalItem, setConflictModalItem] = useState(null)
  const [currentActor, setCurrentActor] = useState(ACTORS[0].id)
  const [networkDelayMs, setNetworkDelayMs] = useState(800)
  const [conflictProbability, setConflictProbability] = useState(0.3)

  const mockServerRef = useRef(null)

  useEffect(() => {
    mockServerRef.current = createMockServer(DEFAULT_DEMO_DATA, {
      networkDelayMs,
      conflictProbability,
      errorRate5xx: 0.05,
      timeoutRate: 0.02,
    })
  }, [])

  useEffect(() => {
    if (mockServerRef.current) {
      mockServerRef.current.setOption('networkDelayMs', networkDelayMs)
      mockServerRef.current.setOption('conflictProbability', conflictProbability)
    }
  }, [networkDelayMs, conflictProbability])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges(state)) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state])

  const items = useMemo(() => getItemsArray(state), [state])
  const pendingCount = useMemo(() => getPendingMutationsCount(state), [state])
  const hasUnsaved = useMemo(() => hasUnsavedChanges(state), [state])
  const statistics = useMemo(() => mockServerRef.current?.getStatistics() || {
    totalRequests: 0,
    successCount: 0,
    conflictCount: 0,
    errorCount: 0,
    timeoutCount: 0,
  }, [state.eventLog])

  const handleEdit = useCallback((itemId) => {
    const item = items.find((i) => i.id === itemId)
    if (item) {
      setEditingItemId(itemId)
      setEditForm({
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
      })
      setExpandedItems((prev) => new Set([...prev, itemId]))
    }
  }, [items])

  const handleEditChange = useCallback((field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null)
    setEditForm({})
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingItemId) return

    const item = items.find((i) => i.id === editingItemId)
    if (!item) return

    const changes = {}
    Object.keys(editForm).forEach((key) => {
      if (editForm[key] !== item[key]) {
        changes[key] = editForm[key]
      }
    })

    if (Object.keys(changes).length === 0) {
      handleCancelEdit()
      return
    }

    const mutation = createMutation(editingItemId, changes, currentActor)
    const newState = applyMutationToState(state, mutation)
    setState(newState)
    handleCancelEdit()

    try {
      const server = mockServerRef.current
      const baseRevision = newState.items[editingItemId].baseRevision

      const result = await server.updateItem(
        editingItemId,
        changes,
        baseRevision,
        currentActor
      )

      setState((prevState) =>
        confirmMutationApplied(prevState, mutation.id, result.headers.ETag)
      )
    } catch (error) {
      if (error.code === 'CONFLICT_412') {
        const server = mockServerRef.current
        const remoteData = server.getItem(editingItemId)
        const remoteRevision = server.getRevision(editingItemId)

        setState((prevState) =>
          detectConflict(prevState, mutation.id, remoteData, remoteRevision)
        )

        setConflictModalItem({
          itemId: editingItemId,
          localData: { ...item, ...changes },
          remoteData,
          localRevision: baseRevision,
          remoteRevision,
        })
      } else {
        setState((prevState) =>
          markMutationRejected(prevState, mutation.id, error)
        )
      }
    }
  }, [editingItemId, editForm, items, state, currentActor, handleCancelEdit])

  const handleRetry = useCallback(async (itemId) => {
    const newState = retryMutation(state, itemId)
    setState(newState)

    const itemState = getItemById(state, itemId)
    if (!itemState || !itemState.pendingMutation) return

    try {
      const server = mockServerRef.current
      const result = await server.updateItem(
        itemId,
        itemState.pendingMutation.changes,
        itemState.baseRevision,
        currentActor
      )

      setState((prevState) =>
        confirmMutationApplied(
          prevState,
          itemState.pendingMutation.id,
          result.headers.ETag
        )
      )
    } catch (error) {
      if (error.code === 'CONFLICT_412') {
        const server = mockServerRef.current
        const remoteData = server.getItem(itemId)
        const remoteRevision = server.getRevision(itemId)

        setState((prevState) =>
          detectConflict(
            prevState,
            itemState.pendingMutation.id,
            remoteData,
            remoteRevision
          )
        )

        setConflictModalItem({
          itemId,
          localData: itemState.data,
          remoteData,
          localRevision: itemState.baseRevision,
          remoteRevision,
        })
      } else {
        setState((prevState) =>
          markMutationRejected(prevState, itemState.pendingMutation.id, error)
        )
      }
    }
  }, [state, currentActor])

  const handleRollback = useCallback((itemId) => {
    const newState = rollbackToBase(state, itemId)
    setState(newState)
  }, [state])

  const handleResolveConflict = useCallback(async (itemId, strategy, mergedData) => {
    if (strategy === 'adopt_remote') {
      handleRollback(itemId)
      setConflictModalItem(null)
      return
    }

    const itemState = getItemById(state, itemId)
    const mutation = itemState?.pendingMutation
    if (!mutation) return

    const newState = resolveConflict(state, itemId, strategy, mergedData)
    setState(newState)
    setConflictModalItem(null)

    try {
      const server = mockServerRef.current
      const result = await server.updateItem(
        itemId,
        mergedData,
        itemState.baseRevision,
        currentActor
      )

      setState((prevState) =>
        confirmMutationApplied(prevState, mutation.id, result.headers.ETag)
      )
    } catch (error) {
      setState((prevState) =>
        markMutationRejected(prevState, mutation.id, error)
      )
    }
  }, [state, currentActor, handleRollback])

  const handleToggleExpand = useCallback((itemId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  return (
    <div className="optimistic-sync-demo">
      <div className="demo-header">
        <h1>🔄 乐观更新与冲突解决演示</h1>
        <p>
          模拟本地草稿与服务器版本向量的同步过程，展示 Pending、Synced、Rejected、Conflict 四种状态。
          支持字段级 diff 比较和三路合并策略。
        </p>
      </div>

      <div className="demo-layout">
        <div className="control-panel">
          <h3>⚙️ 控制面板</h3>

          <div className="actor-selector">
            <label>当前用户</label>
            <select
              value={currentActor}
              onChange={(e) => setCurrentActor(e.target.value)}
            >
              {ACTORS.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="slider-group">
            <label>网络延迟 (ms)</label>
            <input
              type="range"
              min="0"
              max="3000"
              step="100"
              value={networkDelayMs}
              onChange={(e) => setNetworkDelayMs(Number(e.target.value))}
            />
            <span className="slider-value">{networkDelayMs}ms</span>
          </div>

          <div className="slider-group">
            <label>冲突概率</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={conflictProbability}
              onChange={(e) => setConflictProbability(Number(e.target.value))}
            />
            <span className="slider-value">{Math.round(conflictProbability * 100)}%</span>
          </div>

          <div className="statistics-panel">
            <h4>📊 请求统计</h4>
            <div className="stat-item">
              <span className="stat-label">总请求数</span>
              <span className="stat-value">{statistics.totalRequests}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">成功</span>
              <span className="stat-value success">{statistics.successCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">冲突</span>
              <span className="stat-value conflict">{statistics.conflictCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">错误</span>
              <span className="stat-value error">{statistics.errorCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">超时</span>
              <span className="stat-value error">{statistics.timeoutCount}</span>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
            <p><strong>📋 操作说明：</strong></p>
            <p>1. 点击「编辑」修改项目信息</p>
            <p>2. 调高冲突概率以模拟并发冲突场景</p>
            <p>3. 冲突时可选择保留本地、采用远端或字段级合并</p>
            <p>4. 同步失败时可选择重试或回滚</p>
          </div>
        </div>

        <div className="main-content">
          <h2>📝 项目列表 ({items.length})</h2>
          <div className="item-list">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onRetry={handleRetry}
                onRollback={handleRollback}
                onResolve={() => {
                  const itemState = getItemById(state, item.id)
                  setConflictModalItem({
                    itemId: item.id,
                    localData: itemState.data,
                    remoteData: itemState.remoteDataSnapshot,
                    localRevision: itemState.baseRevision,
                    remoteRevision: itemState.remoteRevision,
                  })
                }}
                isEditing={editingItemId === item.id}
                editForm={editForm}
                onEditChange={handleEditChange}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                isExpanded={expandedItems.has(item.id)}
                onToggleExpand={() => handleToggleExpand(item.id)}
              />
            ))}
          </div>
        </div>

        <EventTimeline events={state.eventLog} />
      </div>

      {hasUnsaved && (
        <div className="unsaved-warning">
          <span>⚠️ 有未同步的变更</span>
          <span className="unsaved-warning-count">{pendingCount} 个待处理</span>
        </div>
      )}

      {conflictModalItem && (
        <ConflictResolutionModal
          {...conflictModalItem}
          onResolve={handleResolveConflict}
          onClose={() => setConflictModalItem(null)}
        />
      )}
    </div>
  )
}

export default OptimisticSyncDemo
