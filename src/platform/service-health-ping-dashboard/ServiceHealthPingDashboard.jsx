
import { useCallback, useEffect, useRef, useState } from 'react'
import './ServiceHealthPingDashboard.css'
import {
  createDefaultTarget,
  validateTargetUrl,
  exportConfig,
  importConfig,
  filterTargetsByGroup,
  getAllGroups,
  getAllTags,
  createProbeExecutor,
  CIRCUIT_STATES,
  ERROR_TYPES,
} from './logic/index.js'

function Sparkline({ data, width = 100, height = 20 }) {
  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className="sparkline">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const lastValue = data[data.length - 1]
  const lastX = width
  const lastY = height - ((lastValue - min) / range) * (height - 4) - 2

  return (
    <svg width={width} height={height} className="sparkline">
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3" fill="#3b82f6" />
    </svg>
  )
}

function DetailDrawer({ target, result, isOpen, onClose }) {
  if (!isOpen || !target) {
    return null
  }

  const getErrorTypeLabel = (type) => {
    const labels = {
      [ERROR_TYPES.HTTP]: 'HTTP 状态错误',
      [ERROR_TYPES.NETWORK]: '网络连接失败',
      [ERROR_TYPES.CORS]: '跨域 (CORS) 错误',
      [ERROR_TYPES.TIMEOUT]: '请求超时',
      [ERROR_TYPES.ABORT]: '请求已取消',
      [ERROR_TYPES.SECURITY]: '安全策略违规',
      [ERROR_TYPES.UNKNOWN]: '未知错误',
    }
    return labels[type] || type
  }

  return (
    <div className="detail-drawer-overlay" onClick={onClose}>
      <div className="detail-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>{target.name}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="drawer-content">
          <div className="drawer-section">
            <h4>基本信息</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">URL</span>
                <span className="info-value url-value">{target.url}</span>
              </div>
              <div className="info-item">
                <span className="info-label">方法</span>
                <span className="info-value">{target.method}</span>
              </div>
              <div className="info-item">
                <span className="info-label">分组</span>
                <span className="info-value">{target.group || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">标签</span>
                <span className="info-value">
                  {target.tags && target.tags.length > 0 ? target.tags.join(', ') : '-'}
                </span>
              </div>
            </div>
          </div>

          {result && (
            <>
              <div className="drawer-section">
                <h4>探测结果</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">状态</span>
                    <span className={`status-badge ${result.success ? 'success' : 'error'}`}>
                      {result.success ? '成功' : '失败'}
                    </span>
                  </div>
                  {result.statusCode && (
                    <div className="info-item">
                      <span className="info-label">HTTP 状态码</span>
                      <span className="info-value">{result.statusCode}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">总耗时</span>
                    <span className="info-value">{result.totalMs} ms</span>
                  </div>
                  {result.ttfbMs && (
                    <div className="info-item">
                      <span className="info-label">TTFB</span>
                      <span className="info-value">{result.ttfbMs} ms</span>
                    </div>
                  )}
                  {result.errorType && (
                    <div className="info-item">
                      <span className="info-label">错误类型</span>
                      <span className="info-value error-type">{getErrorTypeLabel(result.errorType)}</span>
                    </div>
                  )}
                  {result.errorMessage && (
                    <div className="info-item full-width">
                      <span className="info-label">错误信息</span>
                      <span className="info-value error-message">{result.errorMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              {Object.keys(result.headers).length > 0 && (
                <div className="drawer-section">
                  <h4>响应头</h4>
                  <div className="headers-list">
                    {Object.entries(result.headers).map(([key, value]) => (
                      <div key={key} className="header-item">
                        <span className="header-name">{key}</span>
                        <span className="header-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!result && (
            <div className="empty-state">
              <p>尚未执行探测</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SecurityWarningCard() {
  return (
    <div className="warning-card">
      <div className="warning-icon">⚠️</div>
      <div className="warning-content">
        <h4>安全提示</h4>
        <ul>
          <li>仅对您拥有或有权访问的端点进行探测</li>
          <li>频繁探测可能触发 API 限流或安全策略</li>
          <li>CORS 错误是浏览器安全限制，可能需要服务端配置</li>
          <li>HTTP/HTTPS 协议以外的协议默认被禁止</li>
        </ul>
      </div>
    </div>
  )
}

function ConfigPanel({
  targets,
  setTargets,
  onProbeAll,
  isProbing,
  pollingEnabled,
  pollingInterval,
  onPollingToggle,
  onPollingIntervalChange,
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTarget, setNewTarget] = useState({
    name: '',
    url: '',
    method: 'GET',
    group: '',
    tags: '',
  })
  const [urlError, setUrlError] = useState('')

  const handleAddTarget = () => {
    const validation = validateTargetUrl(newTarget.url)
    if (!validation.valid) {
      setUrlError(validation.error)
      return
    }

    const target = createDefaultTarget({
      name: newTarget.name || newTarget.url,
      url: newTarget.url,
      method: newTarget.method,
      group: newTarget.group || null,
      tags: newTarget.tags ? newTarget.tags.split(',').map(t => t.trim()) : [],
    })

    setTargets([...targets, target])
    setNewTarget({ name: '', url: '', method: 'GET', group: '', tags: '' })
    setUrlError('')
    setShowAddForm(false)
  }

  const handleDeleteTarget = (id) => {
    setTargets(targets.filter(t => t.id !== id))
  }

  const handleExportConfig = () => {
    const json = exportConfig(targets, { format: 'json' })
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-check-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportConfig = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const result = importConfig(event.target.result)
        setTargets(result.targets)
      } catch (error) {
        alert(`导入失败: ${error.message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="config-panel">
      <div className="panel-header">
        <h3>目标管理</h3>
        <div className="panel-actions">
          <button className="btn secondary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '取消' : '+ 添加目标'}
          </button>
          <button className="btn secondary" onClick={handleExportConfig} disabled={targets.length === 0}>
            导出配置
          </button>
          <label className="btn secondary file-label">
            导入配置
            <input type="file" accept=".json" onChange={handleImportConfig} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {showAddForm && (
        <div className="add-target-form">
          <div className="form-row">
            <div className="form-group">
              <label>名称</label>
              <input
                type="text"
                placeholder="目标名称"
                value={newTarget.name}
                onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>URL *</label>
              <input
                type="text"
                placeholder="https://api.example.com/health"
                value={newTarget.url}
                onChange={(e) => {
                  setNewTarget({ ...newTarget, url: e.target.value })
                  setUrlError('')
                }}
                className={urlError ? 'error' : ''}
              />
              {urlError && <span className="error-text">{urlError}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>方法</label>
              <select
                value={newTarget.method}
                onChange={(e) => setNewTarget({ ...newTarget, method: e.target.value })}
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div className="form-group">
              <label>分组</label>
              <input
                type="text"
                placeholder="例如: backend, api"
                value={newTarget.group}
                onChange={(e) => setNewTarget({ ...newTarget, group: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>标签 (逗号分隔)</label>
              <input
                type="text"
                placeholder="例如: production, us-east"
                value={newTarget.tags}
                onChange={(e) => setNewTarget({ ...newTarget, tags: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn primary" onClick={handleAddTarget}>添加</button>
          </div>
        </div>
      )}

      <div className="polling-controls">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={pollingEnabled}
            onChange={(e) => onPollingToggle(e.target.checked)}
          />
          定时轮询
        </label>
        {pollingEnabled && (
          <div className="polling-interval">
            <label>间隔:</label>
            <select value={pollingInterval} onChange={(e) => onPollingIntervalChange(Number(e.target.value))}>
              <option value="5000">5 秒</option>
              <option value="10000">10 秒</option>
              <option value="30000">30 秒</option>
              <option value="60000">1 分钟</option>
            </select>
          </div>
        )}
        <button
          className="btn primary probe-all-btn"
          onClick={onProbeAll}
          disabled={isProbing || targets.length === 0}
        >
          {isProbing ? '探测中...' : '全部探测'}
        </button>
      </div>
    </div>
  )
}

function ProbeTable({
  targets,
  probeResults,
  probeExecutors,
  latencyHistory,
  onTargetClick,
  onDeleteTarget,
  onProbeSingle,
  isProbing,
}) {
  const [selectedGroup, setSelectedGroup] = useState('')
  const groups = getAllGroups(targets)
  const filteredTargets = selectedGroup
    ? filterTargetsByGroup(targets, selectedGroup)
    : targets

  const getCircuitStateLabel = (state) => {
    switch (state) {
      case CIRCUIT_STATES.CLOSED: return '正常'
      case CIRCUIT_STATES.OPEN: return '熔断'
      case CIRCUIT_STATES.HALF_OPEN: return '半开'
      default: return state
    }
  }

  const getCircuitStateClass = (state) => {
    switch (state) {
      case CIRCUIT_STATES.OPEN: return 'circuit-open'
      case CIRCUIT_STATES.HALF_OPEN: return 'circuit-half-open'
      default: return 'circuit-closed'
    }
  }

  return (
    <div className="probe-table-container">
      <div className="table-header">
        <h3>探测目标 ({filteredTargets.length})</h3>
        <div className="filter-controls">
          <label>分组筛选:</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
            <option value="">全部</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {filteredTargets.length === 0 ? (
        <div className="empty-state">
          <p>暂无探测目标，请点击"添加目标"开始</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="probe-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>URL</th>
                <th>分组</th>
                <th>状态</th>
                <th>响应时间</th>
                <th>趋势</th>
                <th>熔断状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTargets.map((target) => {
                const result = probeResults[target.id]
                const executor = probeExecutors[target.id]
                const latencies = latencyHistory[target.id] || []

                return (
                  <tr key={target.id} onClick={() => onTargetClick(target.id)} className="target-row">
                    <td className="target-name">{target.name}</td>
                    <td className="target-url">{target.url}</td>
                    <td className="target-group">
                      {target.group ? <span className="group-tag">{target.group}</span> : '-'}
                    </td>
                    <td className="target-status">
                      {result ? (
                        <span className={`status-badge ${result.success ? 'success' : 'error'}`}>
                          {result.success ? '正常' : '失败'}
                        </span>
                      ) : (
                        <span className="status-badge idle">未探测</span>
                      )}
                    </td>
                    <td className="target-latency">
                      {result && result.totalMs ? `${result.totalMs} ms` : '-'}
                    </td>
                    <td className="target-sparkline">
                      <Sparkline data={latencies} />
                    </td>
                    <td className="target-circuit">
                      <span
                        className={`circuit-state ${getCircuitStateClass(executor?.getCircuitStatus().state)}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onProbeSingle(target.id)
                        }}
                        title="点击立即探测"
                      >
                        {getCircuitStateLabel(executor?.getCircuitStatus().state)}
                      </span>
                    </td>
                    <td className="target-actions">
                      <button
                        className="action-btn probe-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onProbeSingle(target.id)
                        }}
                        disabled={isProbing}
                      >
                        🔄 探测
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteTarget(target.id)
                        }}
                      >
                        🗑️ 删除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ServiceHealthPingDashboard() {
  const [targets, setTargets] = useState([
    createDefaultTarget({
      name: '示例 API',
      url: 'https://api.example.com/health',
      group: 'demo',
      tags: ['example'],
    }),
  ])
  const [probeResults, setProbeResults] = useState({})
  const [probeExecutors, setProbeExecutors] = useState({})
  const [latencyHistory, setLatencyHistory] = useState({})
  const [isProbing, setIsProbing] = useState(false)
  const [selectedTargetId, setSelectedTargetId] = useState(null)
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const [pollingInterval, setPollingInterval] = useState(10000)
  const [isPageVisible, setIsPageVisible] = useState(true)

  const pollingTimerRef = useRef(null)

  useEffect(() => {
    const executors = {}
    const history = {}

    targets.forEach((target) => {
      if (!probeExecutors[target.id]) {
        executors[target.id] = createProbeExecutor(target)
      }
      if (!latencyHistory[target.id]) {
        history[target.id] = []
      }
    })

    if (Object.keys(executors).length > 0) {
      setProbeExecutors((prev) => ({ ...prev, ...executors }))
    }
    if (Object.keys(history).length > 0) {
      setLatencyHistory((prev) => ({ ...prev, ...history }))
    }
  }, [targets])

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (pollingEnabled && isPageVisible) {
      pollingTimerRef.current = setInterval(() => {
        handleProbeAll()
      }, pollingInterval)
    } else {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
      }
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
      }
    }
  }, [pollingEnabled, pollingInterval, isPageVisible])

  const handleProbeAll = useCallback(async () => {
    if (isProbing || targets.length === 0) return

    setIsProbing(true)

    try {
      const probePromises = targets.map(async (target) => {
        const executor = probeExecutors[target.id]
        if (!executor) return null
        try {
          const result = await executor.probe()
          return { id: target.id, result }
        } catch (error) {
          return { id: target.id, result: null, error }
        }
      })

      const results = await Promise.all(probePromises)

      const newResults = {}
      const newHistory = { ...latencyHistory }

      results.forEach((item) => {
        if (!item || !item.result) return
        newResults[item.id] = item.result

        if (item.result.success && item.result.totalMs) {
          newHistory[item.id] = [...(newHistory[item.id] || []), item.result.totalMs].slice(-20)
        }
      })

      setProbeResults((prev) => ({ ...prev, ...newResults }))
      setLatencyHistory(newHistory)
    } catch (error) {
      console.error('Probe error:', error)
    } finally {
      setIsProbing(false)
    }
  }, [isProbing, targets, latencyHistory, probeExecutors])

  const handleProbeSingle = useCallback(async (targetId) => {
    const target = targets.find(t => t.id === targetId)
    if (!target) return

    const executor = probeExecutors[targetId]
    if (!executor) return

    try {
      const result = await executor.probe()

      setProbeResults((prev) => ({ ...prev, [targetId]: result }))

      if (result.success && result.totalMs) {
        setLatencyHistory((prev) => ({
          ...prev,
          [targetId]: [...(prev[targetId] || []), result.totalMs].slice(-20),
        }))
      }
    } catch (error) {
      console.error('Single probe error:', error)
    }
  }, [targets, probeExecutors])

  const handleDeleteTarget = useCallback((targetId) => {
    setTargets((prev) => prev.filter(t => t.id !== targetId))
    setProbeResults((prev) => {
      const { [targetId]: _, ...rest } = prev
      return rest
    })
    setLatencyHistory((prev) => {
      const { [targetId]: _, ...rest } = prev
      return rest
    })
  }, [])

  const handleTargetClick = useCallback((targetId) => {
    setSelectedTargetId(targetId)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setSelectedTargetId(null)
  }, [])

  const selectedTarget = targets.find(t => t.id === selectedTargetId)
  const selectedResult = probeResults[selectedTargetId]

  return (
    <div className="service-health-dashboard">
      <section className="tool-section">
        <div className="demo-header">
          <h2>服务健康检查仪表盘</h2>
          <p>
            多目标并行 HTTP 健康检查 · 熔断保护 · 定时轮询 · 可视化延迟趋势
          </p>
        </div>

        <SecurityWarningCard />

        <ConfigPanel
          targets={targets}
          setTargets={setTargets}
          onProbeAll={handleProbeAll}
          isProbing={isProbing}
          pollingEnabled={pollingEnabled}
          pollingInterval={pollingInterval}
          onPollingToggle={setPollingEnabled}
          onPollingIntervalChange={setPollingInterval}
        />

        <ProbeTable
          targets={targets}
          probeResults={probeResults}
          probeExecutors={probeExecutors}
          latencyHistory={latencyHistory}
          onTargetClick={handleTargetClick}
          onDeleteTarget={handleDeleteTarget}
          onProbeSingle={handleProbeSingle}
          isProbing={isProbing}
        />

        {pollingEnabled && !isPageVisible && (
          <div className="visibility-warning">
            ⚠️ 页面不可见，轮询已暂停以节省资源
          </div>
        )}

        <DetailDrawer
          target={selectedTarget}
          result={selectedResult}
          isOpen={selectedTargetId !== null}
          onClose={handleCloseDrawer}
        />
      </section>
    </div>
  )
}

export default ServiceHealthPingDashboard
