import { useCallback, useEffect, useState, useRef } from 'react'
import './FeatureRemoteConfigDemo.css'
import {
  createFeatureConfigManager,
  mergeConfigs,
  applyMergeRules,
  createDefaultRules,
  ENVIRONMENTS,
  SOURCES,
  truncatePayload,
  redactSensitiveData,
  DEFAULT_CONFIG,
  STATIC_CONFIG,
  REMOTE_CONFIG_MOCK,
  SAMPLE_TYPE_ERROR_CONFIG,
  SAMPLE_CIRCULAR_REF_CONFIG,
  SAMPLE_LARGE_PAYLOAD_CONFIG,
  SAMPLE_DEEP_PAYLOAD_CONFIG,
  SAMPLE_SCRIPT_FIELD_CONFIG,
  SAMPLE_EXPIRED_CONFIG,
  createFeatureFetchInterceptor,
} from './logic/index.js'

function formatValue(value) {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[Object]'
    }
  }
  return String(value)
}

function LogItem({ log, onCopy }) {
  const handleCopy = () => {
    const text = log.data
      ? `[${log.type.toUpperCase()}] ${log.message}\n${JSON.stringify(log.data, null, 2)}`
      : `[${log.type.toUpperCase()}] ${log.message}`
    navigator.clipboard.writeText(text).then(() => {
      if (onCopy) onCopy()
    })
  }

  return (
    <div className={`log-item log-${log.type}`}>
      <div className="log-header">
        <span className="log-type">{log.type.toUpperCase()}</span>
        <div className="log-header-actions">
          <button className="log-copy-btn" onClick={handleCopy} title="复制日志">
            📋
          </button>
          <span className="log-time">{log.timestamp}</span>
        </div>
      </div>
      <div className="log-message">{log.message}</div>
      {log.data && (
        <pre className="log-data">{JSON.stringify(log.data, null, 2)}</pre>
      )}
    </div>
  )
}

function FeatureRemoteConfigDemo() {
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [snapshot, setSnapshot] = useState(null)
  const [refreshState, setRefreshState] = useState({
    isOnline: true,
    nextRefreshAt: null,
    backoffAttempt: 0,
    lastFetchError: null,
    hasLastSuccessfulSnapshot: false,
  })
  const [countdown, setCountdown] = useState(0)
  const [exportPreview, setExportPreview] = useState(null)
  const [showAudit, setShowAudit] = useState(false)
  const [selectedEnv, setSelectedEnv] = useState(ENVIRONMENTS.DEV)
  const [selectedCohort, setSelectedCohort] = useState('default')
  const [selectedSample, setSelectedSample] = useState(null)
  const [loadingState, setLoadingState] = useState({
    forceRefresh: false,
    reinitialize: false,
    exportRedact: false,
    exportRaw: false,
    testInterceptor: false,
  })
  const [copyFeedback, setCopyFeedback] = useState(null)

  const managerRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  const addLog = useCallback((type, message, data = null) => {
    setLogs((prev) => [
      {
        id: Date.now() + Math.random(),
        type,
        message,
        data,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const updateSnapshot = useCallback((newSnapshot) => {
    setSnapshot(newSnapshot)
    if (managerRef.current) {
      setRefreshState(managerRef.current.getRefreshState())
    }
  }, [])

  const initializeManager = useCallback(
    (overrideOptions = {}) => {
      if (managerRef.current) {
        managerRef.current.destroy()
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }

      const options = {
        environment: selectedEnv,
        cohort: selectedCohort,
        defaultConfig: DEFAULT_CONFIG,
        staticConfig: STATIC_CONFIG,
        refreshIntervalMs: 30000,
        ...overrideOptions,
      }

      managerRef.current = createFeatureConfigManager(options)

      managerRef.current.addListener((event, payload) => {
        switch (event) {
          case 'refreshed':
            addLog('success', '配置已刷新', {
              flagCount: Object.keys(payload.snapshot.snapshot).length,
            })
            updateSnapshot(payload.snapshot)
            break
          case 'not-modified':
            addLog('info', '配置未修改 (304)', { etag: payload.etag })
            updateSnapshot(managerRef.current.getSnapshot())
            break
          case 'empty':
            addLog('warning', '配置响应为空 (204)')
            break
          case 'error':
            addLog('error', '配置拉取失败', {
              errorCode: payload.error?.errorCode,
              message: payload.error?.message,
            })
            setRefreshState(managerRef.current.getRefreshState())
            break
          case 'online':
            addLog('info', '网络已连接')
            setRefreshState(managerRef.current.getRefreshState())
            break
          case 'offline':
            addLog('warning', '网络已断开，使用上次成功快照')
            setRefreshState(managerRef.current.getRefreshState())
            break
        }
      })

      return managerRef.current.initialize()
    },
    [selectedEnv, selectedCohort, addLog, updateSnapshot]
  )

  useEffect(() => {
    initializeManager().then((initialSnapshot) => {
      updateSnapshot(initialSnapshot)
      addLog('info', 'FeatureConfigManager 已初始化')
    })

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy()
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    countdownIntervalRef.current = setInterval(() => {
      if (refreshState.nextRefreshAt) {
        const remaining = Math.max(0, refreshState.nextRefreshAt - Date.now())
        setCountdown(Math.ceil(remaining / 1000))
      }
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [refreshState.nextRefreshAt])

  const handleForceRefresh = useCallback(async () => {
    if (!managerRef.current) return
    if (loadingState.forceRefresh) return

    setLoadingState((prev) => ({ ...prev, forceRefresh: true }))
    addLog('info', '手动强制刷新...')
    try {
      const newSnapshot = await managerRef.current.forceRefresh()
      updateSnapshot(newSnapshot)
      addLog('success', '强制刷新完成')
    } catch (error) {
      addLog('error', '强制刷新失败', {
        errorCode: error.errorCode,
        message: error.message,
      })
    } finally {
      setLoadingState((prev) => ({ ...prev, forceRefresh: false }))
    }
  }, [addLog, updateSnapshot, loadingState.forceRefresh])

  const handleLoadSample = useCallback(
    (sampleType, config, description) => {
      setSelectedSample(sampleType)
      addLog('info', `载入样本: ${description}`)

      const configs = []

      if (DEFAULT_CONFIG) {
        configs.push({ ...DEFAULT_CONFIG, source: SOURCES.DEFAULT })
      }

      configs.push({ ...config, source: SOURCES.STATIC })

      const options = {
        environment: selectedEnv,
        cohort: selectedCohort,
      }

      const rules = createDefaultRules(selectedEnv, selectedCohort)
      const orderedConfigs = applyMergeRules(configs, rules)
      const result = mergeConfigs(orderedConfigs, options)

      updateSnapshot(result)

      if (result.errors.length > 0) {
        addLog('warning', '合并过程中出现错误', {
          errorCount: result.errors.length,
          errors: result.errors.map((e) => ({
            code: e.errorCode,
            message: e.message,
          })),
        })
      }

      addLog('success', `样本加载完成: ${sampleType}`, {
        flagCount: result.flags.length,
        auditCount: result.audit.length,
      })
    },
    [selectedEnv, selectedCohort, addLog, updateSnapshot]
  )

  const handleExportSnapshot = useCallback(
    async (redact = true) => {
      if (!snapshot) return
      const loadingKey = redact ? 'exportRedact' : 'exportRaw'
      if (loadingState[loadingKey]) return

      setLoadingState((prev) => ({ ...prev, [loadingKey]: true }))

      try {
        const exported = managerRef.current.exportSnapshot(redact)
        setExportPreview(exported)

        const blob = new Blob([JSON.stringify(exported, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `feature-config-snapshot-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        addLog('success', `快照已导出${redact ? ' (已脱敏)' : ''}`)
      } finally {
        setLoadingState((prev) => ({ ...prev, [loadingKey]: false }))
      }
    },
    [snapshot, addLog, loadingState]
  )

  const handleTestInterceptor = useCallback(async () => {
    if (!snapshot) return
    if (loadingState.testInterceptor) return

    setLoadingState((prev) => ({ ...prev, testInterceptor: true }))

    try {
      addLog('info', '测试拦截器集成 (演示)')

      const getSnapshot = () => managerRef.current.getSnapshot()
      const interceptor = createFeatureFetchInterceptor({ getSnapshot })

      const testRequests = [
        { url: '/api/users', method: 'GET', headers: {} },
        { url: '/api/data', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      ]

      const results = testRequests.map((request) => {
        const modified = interceptor(request)
        return {
          original: request,
          modified,
        }
      })

      addLog('success', '拦截器测试完成', { results })
    } finally {
      setLoadingState((prev) => ({ ...prev, testInterceptor: false }))
    }
  }, [snapshot, addLog, loadingState.testInterceptor])

  const handleEnvChange = useCallback(
    async (env) => {
      setSelectedEnv(env)
      if (managerRef.current) {
        addLog('info', `切换环境到: ${env}`)
        try {
          const newSnapshot = await managerRef.current.setEnvironment(env)
          updateSnapshot(newSnapshot)
          addLog('success', '环境切换完成')
        } catch (error) {
          addLog('error', '环境切换失败', {
            errorCode: error.errorCode,
            message: error.message,
          })
        }
      }
    },
    [addLog, updateSnapshot]
  )

  const handleCohortChange = useCallback(
    async (cohort) => {
      setSelectedCohort(cohort)
      if (managerRef.current) {
        addLog('info', `切换 cohort 到: ${cohort}`)
        try {
          const newSnapshot = await managerRef.current.setCohort(cohort)
          updateSnapshot(newSnapshot)
          addLog('success', 'Cohort 切换完成')
        } catch (error) {
          addLog('error', 'Cohort 切换失败', {
            errorCode: error.errorCode,
            message: error.message,
          })
        }
      }
    },
    [addLog, updateSnapshot]
  )

  const handleLogCopy = useCallback(() => {
    setCopyFeedback('已复制到剪贴板')
    setTimeout(() => setCopyFeedback(null), 2000)
  }, [])

  const handleCopyAllLogs = useCallback(() => {
    const allLogsText = logs
      .map((log) => {
        const dataText = log.data
          ? `\n${JSON.stringify(log.data, null, 2)}`
          : ''
        return `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}${dataText}`
      })
      .join('\n\n')
    navigator.clipboard.writeText(allLogsText).then(() => {
      handleLogCopy()
    })
  }, [logs, handleLogCopy])

  const tabs = [
    { id: 'overview', label: '总览' },
    { id: 'samples', label: '样本数据' },
    { id: 'export', label: '导出' },
    { id: 'interceptor', label: '拦截器' },
  ]

  return (
    <div className="feature-remote-config-demo">
      <section className="tool-section">
        <div className="demo-header">
          <h2>功能开关 + 远程配置</h2>
          <p>演示功能开关和远程配置消费层的核心功能：多源合并、ETag 缓存、超时控制、脱敏导出等</p>
        </div>

        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="control-panel">
          <div className="control-group">
            <label>环境</label>
            <select
              value={selectedEnv}
              onChange={(e) => handleEnvChange(e.target.value)}
            >
              <option value={ENVIRONMENTS.DEV}>Development</option>
              <option value={ENVIRONMENTS.STAGING}>Staging</option>
              <option value={ENVIRONMENTS.PROD}>Production</option>
            </select>
          </div>
          <div className="control-group">
            <label>Cohort</label>
            <select
              value={selectedCohort}
              onChange={(e) => handleCohortChange(e.target.value)}
            >
              <option value="default">Default</option>
              <option value="experiment_a">Experiment A</option>
              <option value="experiment_b">Experiment B</option>
            </select>
          </div>
        </div>

        {!refreshState.isOnline && (
          <div className="offline-banner">
            当前处于离线状态，正在使用上次成功的快照
          </div>
        )}

        <div className="status-panel">
          <div className="status-card">
            <div className="label">网络状态</div>
            <div className={`value ${refreshState.isOnline ? 'online' : 'offline'}`}>
              {refreshState.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
          <div className="status-card">
            <div className="label">刷新倒计时</div>
            <div className="value">
              {refreshState.nextRefreshAt ? `${countdown}s` : '-'}
            </div>
          </div>
          <div className="status-card">
            <div className="label">退避次数</div>
            <div className="value">{refreshState.backoffAttempt}</div>
          </div>
          <div className="status-card">
            <div className="label">标志数量</div>
            <div className="value">{snapshot?.flags?.length || 0}</div>
          </div>
        </div>

        <div className="action-row">
          <button
            className={`demo-btn ${loadingState.forceRefresh ? 'loading' : ''}`}
            onClick={handleForceRefresh}
            disabled={loadingState.forceRefresh}
          >
            {loadingState.forceRefresh ? '⏳ 刷新中...' : '🔄 强制刷新'}
          </button>
          <button
            className={`demo-btn secondary ${loadingState.reinitialize ? 'loading' : ''}`}
            onClick={() => {
              setLoadingState((prev) => ({ ...prev, reinitialize: true }))
              initializeManager().then(() => {
                setLoadingState((prev) => ({ ...prev, reinitialize: false }))
              })
            }}
            disabled={loadingState.reinitialize}
          >
            {loadingState.reinitialize ? '⏳ 初始化中...' : '🔄 重新初始化'}
          </button>
        </div>
      </section>

      {activeTab === 'overview' && (
        <section className="tool-section">
          <div className="action-group">
            <h3>当前快照</h3>

            {snapshot?.flags?.length > 0 ? (
              <>
                <table className="flags-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                      <th>Source</th>
                      <th>Version</th>
                      <th>Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.flags.map((flag) => (
                      <tr key={flag.key}>
                        <td>
                          <span className="flag-key">{flag.key}</span>
                        </td>
                        <td>
                          <span className="flag-value">
                            {formatValue(flag.value)}
                          </span>
                        </td>
                        <td>
                          <span className={`source-badge ${flag.source}`}>
                            {flag.source}
                          </span>
                        </td>
                        <td>{flag.version || '-'}</td>
                        <td>
                          <span className="flag-value">
                            {flag.payload
                              ? JSON.stringify(truncatePayload(flag.payload, 2, 10))
                              : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {snapshot.audit?.length > 0 && (
                  <>
                    <button
                      className="demo-btn secondary"
                      onClick={() => setShowAudit(!showAudit)}
                    >
                      {showAudit ? '隐藏审计日志' : `显示审计日志 (${snapshot.audit.length})`}
                    </button>

                    {showAudit && (
                      <div className="audit-section">
                        {snapshot.audit.map((entry, index) => (
                          <div key={index} className="audit-entry">
                            <div className="key">{entry.key}</div>
                            <div className="reason">
                              原因: {entry.reason}
                            </div>
                            <div className="details">
                              {entry.existing && (
                                <span>
                                  现有: {formatValue(entry.existing.value)} (
                                  {entry.existing.source} v{entry.existing.version})
                                </span>
                              )}
                              {entry.incoming && (
                                <span>
                                  传入: {formatValue(entry.incoming.value)} (
                                  {entry.incoming.source} v{entry.incoming.version})
                                </span>
                              )}
                              <span>
                                胜出: {formatValue(entry.winner.value)} (
                                {entry.winner.source} v{entry.winner.version})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {snapshot.errors?.length > 0 && (
                  <div className="error-section">
                    <h4>合并错误 ({snapshot.errors.length})</h4>
                    {snapshot.errors.map((error, index) => (
                      <p key={index}>
                        [{error.errorCode}] {error.message}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="hint">暂无数据，请初始化或刷新</p>
            )}
          </div>
        </section>
      )}

      {activeTab === 'samples' && (
        <section className="tool-section">
          <div className="action-group">
            <h3>样本数据</h3>
            <p className="hint">
              点击下方卡片载入不同类型的样本数据，测试系统的边界处理能力
            </p>

            <div className="sample-section">
              <div
                className={`sample-card ${selectedSample === 'type-error' ? 'selected' : ''}`}
                onClick={() =>
                  handleLoadSample(
                    'type-error',
                    SAMPLE_TYPE_ERROR_CONFIG,
                    '部分键类型错误'
                  )
                }
              >
                <h4>⚠️ 类型错误</h4>
                <p>
                  包含缺失 value、缺失 key 的标志，测试系统的类型验证和错误处理能力
                </p>
              </div>

              <div
                className={`sample-card ${selectedSample === 'circular-ref' ? 'selected' : ''}`}
                onClick={() =>
                  handleLoadSample(
                    'circular-ref',
                    SAMPLE_CIRCULAR_REF_CONFIG,
                    '循环引用'
                  )
                }
              >
                <h4>🔄 循环引用</h4>
                <p>
                  包含循环 $ref 替身的 payload，测试循环引用检测和处理能力
                </p>
              </div>

              <div
                className={`sample-card ${selectedSample === 'large-payload' ? 'selected' : ''}`}
                onClick={() =>
                  handleLoadSample(
                    'large-payload',
                    SAMPLE_LARGE_PAYLOAD_CONFIG,
                    '超大 Payload'
                  )
                }
              >
                <h4>📦 超大 Payload</h4>
                <p>
                  包含超过键数上限的 payload，测试键数限制和截断能力
                </p>
              </div>

              <div
                className={`sample-card ${selectedSample === 'deep-payload' ? 'selected' : ''}`}
                onClick={() =>
                  handleLoadSample(
                    'deep-payload',
                    SAMPLE_DEEP_PAYLOAD_CONFIG,
                    '深度嵌套'
                  )
                }
              >
                <h4>📂 深度嵌套</h4>
                <p>
                  包含超过深度上限的嵌套 payload，测试深度限制和截断能力
                </p>
              </div>

              <div
                className={`sample-card ${selectedSample === 'script-field' ? 'selected' : ''}`}
                onClick={() =>
                  handleLoadSample(
                    'script-field',
                    SAMPLE_SCRIPT_FIELD_CONFIG,
                    '脚本字段'
                  )
                }
              >
                <h4>⚠️ 脚本字段</h4>
                <p>
                  包含 script 类键名的 payload，测试 CSP 安全限制和拒绝能力
                </p>
              </div>

              <div
                className={`sample-card ${selectedSample === 'expired' ? 'selected' : ''}`}
                onClick={() =>
                  handleLoadSample(
                    'expired',
                    SAMPLE_EXPIRED_CONFIG,
                    '过期配置'
                  )
                }
              >
                <h4>⏰ 过期配置</h4>
                <p>
                  包含已过期和未过期的标志，测试 expiresAt 过期检测能力
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'export' && (
        <section className="tool-section">
          <div className="action-group">
            <h3>快照导出</h3>
            <p className="hint">
              导出当前快照为 JSON 文件，可选择是否脱敏敏感字段
              (token|secret|password)
            </p>

            <div className="export-section">
              <button
                className={`demo-btn ${loadingState.exportRedact ? 'loading' : ''}`}
                onClick={() => handleExportSnapshot(true)}
                disabled={loadingState.exportRedact}
              >
                {loadingState.exportRedact ? '⏳ 导出中...' : '📥 导出脱敏快照'}
              </button>
              <button
                className={`demo-btn secondary ${loadingState.exportRaw ? 'loading' : ''}`}
                onClick={() => handleExportSnapshot(false)}
                disabled={loadingState.exportRaw}
              >
                {loadingState.exportRaw ? '⏳ 导出中...' : '📥 导出原始快照'}
              </button>
            </div>

            {exportPreview && (
              <div className="json-preview">
                <pre>{JSON.stringify(exportPreview, null, 2)}</pre>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'interceptor' && (
        <section className="tool-section">
          <div className="action-group">
            <h3>拦截器集成 (与任务 057 衔接)</h3>
            <p className="hint">
              演示如何使用 createFeatureFetchInterceptor 在请求拦截器中读取开关以切换
              baseURL 或附加头
            </p>

            <div className="action-row">
              <button
                className={`demo-btn ${loadingState.testInterceptor ? 'loading' : ''}`}
                onClick={handleTestInterceptor}
                disabled={loadingState.testInterceptor}
              >
                {loadingState.testInterceptor ? '⏳ 测试中...' : '🧪 测试拦截器'}
              </button>
            </div>

            <div className="sample-card" style={{ cursor: 'default' }}>
              <h4>使用示例</h4>
              <pre className="log-data" style={{ marginTop: '0.5rem' }}>{`
// 与任务 057 集成示例
import { createFeatureFetchInterceptor } from './feature-remote-config'

// 创建管理器
const manager = createFeatureConfigManager({
  defaultConfig: { ... },
  staticConfig: { ... },
})

await manager.initialize()

// 创建拦截器
const interceptor = createFeatureFetchInterceptor({
  getSnapshot: () => manager.getSnapshot()
})

// 在 HTTP 客户端中使用
const client = HttpClient.create({ ... })
client.useRequest(interceptor)
              `}</pre>
            </div>
          </div>
        </section>
      )}

      <section className="tool-section">
        <div className="log-section-header">
          <h2>执行日志</h2>
          <div className="log-actions">
            {copyFeedback && (
              <span className="copy-feedback">{copyFeedback}</span>
            )}
            <button
              className="demo-btn secondary small"
              onClick={handleCopyAllLogs}
              disabled={logs.length === 0}
            >
              📋 复制全部
            </button>
            <button
              className="clear-btn"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              清空日志
            </button>
          </div>
        </div>
        <div className="logs-container">
          {logs.length === 0 ? (
            <p className="no-logs">点击上方按钮开始演示...</p>
          ) : (
            logs.map((log) => <LogItem key={log.id} log={log} onCopy={handleLogCopy} />)
          )}
        </div>
      </section>
    </div>
  )
}

export default FeatureRemoteConfigDemo
