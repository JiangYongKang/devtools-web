import { useCallback, useState, useRef } from 'react'
import './RequestCorrelationDemo.css'
import {
  createRequestCorrelationInterceptor,
  createMockHttpClient,
  createLogBuffer,
  createMemorySessionProvider,
  ID_MODES,
  SPAN_SHARE_MODES,
  normalizeRequestId,
  createRequestContext,
  applyHeaders,
} from './logic/index.js'

function LogItem({ log }) {
  const [copying, setCopying] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!log.data) return
    const text = JSON.stringify(log.data, null, 2)
    try {
      setCopying(true)
      await navigator.clipboard.writeText(text)
      setTimeout(() => setCopying(false), 1500)
    } catch {
      setCopying(false)
    }
  }, [log.data])

  return (
    <div className={`log-item log-${log.type}`}>
      <div className="log-header">
        <span className="log-type">{log.type.toUpperCase()}</span>
        <span className="log-time">{log.timestamp}</span>
      </div>
      <div className="log-message">{log.message}</div>
      {log.data && (
        <div className="log-data-wrapper">
          <pre className="log-data">{JSON.stringify(log.data, null, 2)}</pre>
          <button
            className={`copy-btn ${copying ? 'copying' : ''}`}
            onClick={handleCopy}
            title="复制数据"
          >
            {copying ? '已复制!' : '复制'}
          </button>
        </div>
      )}
    </div>
  )
}

function Toast({ toasts, onRemove }) {
  return (
    <div className="toast-notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type || 'error'}`}>
          <div className="toast-header">
            <strong>{toast.title}</strong>
            <button className="toast-close" onClick={() => onRemove(toast.id)}>
              ×
            </button>
          </div>
          <div className="toast-body">{toast.message}</div>
          {toast.requestId && (
            <div className="toast-request-id">
              Request-ID: {toast.requestId}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RequestCorrelationDemo() {
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('basic')
  const [customRequestId, setCustomRequestId] = useState('')
  const [toasts, setToasts] = useState([])
  const [requestTableData, setRequestTableData] = useState([])
  const logBufferRef = useRef(createLogBuffer({ bufferSize: 100 }))

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
    logBufferRef.current.clear()
    setRequestTableData([])
  }, [])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const emitLogForToast = useCallback((payload) => {
    addToast({
      title: payload.errorCode === 'NETWORK' ? '网络错误' : `HTTP ${payload.status} 错误`,
      message: payload.message || '请求失败',
      requestId: payload.requestId,
      type: 'error',
    })
  }, [addToast])

  const runCascadeDemo = useCallback(async () => {
    const logBuffer = logBufferRef.current
    const sessionProvider = createMemorySessionProvider('session_demo_123')

    const interceptor = createRequestCorrelationInterceptor({
      sessionProvider,
      idMode: ID_MODES.UUID_V4,
      spanShareMode: SPAN_SHARE_MODES.DERIVE,
      includeSessionId: true,
      includeTraceParent: true,
      logBuffer,
    })

    const client = createMockHttpClient({
      interceptors: [interceptor],
      logBuffer,
    })

    addLog('info', '开始执行 3 次级联请求 (派生 span 模式)...')

    const tableData = []
    let currentContext = null

    try {
      for (let i = 1; i <= 3; i++) {
        const requestContext = currentContext
          ? currentContext.deriveNext()
          : createRequestContext({
              idMode: ID_MODES.UUID_V4,
              spanShareMode: SPAN_SHARE_MODES.DERIVE,
            })

        currentContext = requestContext

        const init = applyHeaders({ method: 'GET' }, requestContext, {
          includeSessionId: true,
          sessionId: 'session_demo_123',
        })

        const response = await client.get(`https://api.example.com/data/${i}`, {
          ...init,
          mock: { delay: 100 + i * 50 },
        })

        const responseData = await response.json()

        tableData.push({
          request: `请求 #${i}`,
          requestId: responseData.headers?.['X-Request-Id'] || requestContext.requestId,
          traceId: requestContext.traceId,
          spanId: requestContext.spanId,
          traceParent: requestContext.getTraceParent(),
        })

        addLog('success', `请求 #${i} 完成`, {
          requestId: responseData.headers?.['X-Request-Id'],
          traceParent: responseData.headers?.traceparent,
          status: response.status,
        })
      }

      setRequestTableData(tableData)

      const firstTraceId = tableData[0]?.traceId
      const allSameTraceId = tableData.every((r) => r.traceId === firstTraceId)
      const allDifferentSpanId = new Set(tableData.map((r) => r.spanId)).size === tableData.length

      addLog(allSameTraceId && allDifferentSpanId ? 'success' : 'warn',
        '级联请求 ID 传递验证',
        {
          sameTraceId: allSameTraceId,
          differentSpanId: allDifferentSpanId,
          note: '派生模式下 traceId 应相同，spanId 应不同',
        }
      )
    } catch (error) {
      addLog('error', '级联请求失败', {
        error: error.message,
        requestId: error.requestId,
      })
    }
  }, [addLog])

  const runShareModeDemo = useCallback(async () => {
    const logBuffer = logBufferRef.current
    const sessionProvider = createMemorySessionProvider('session_demo_456')

    const interceptor = createRequestCorrelationInterceptor({
      sessionProvider,
      idMode: ID_MODES.UUID_V4,
      spanShareMode: SPAN_SHARE_MODES.SHARE,
      includeSessionId: true,
      logBuffer,
    })

    const client = createMockHttpClient({
      interceptors: [interceptor],
      logBuffer,
    })

    addLog('info', '开始执行 3 次级联请求 (共享 span 模式)...')

    const tableData = []
    const baseContext = createRequestContext({
      idMode: ID_MODES.UUID_V4,
      spanShareMode: SPAN_SHARE_MODES.SHARE,
    })

    try {
      for (let i = 1; i <= 3; i++) {
        const requestContext = baseContext.deriveNext({ spanShareMode: SPAN_SHARE_MODES.SHARE })

        const init = applyHeaders({ method: 'GET' }, requestContext, {
          includeSessionId: true,
          sessionId: 'session_demo_456',
        })

        const response = await client.get(`https://api.example.com/shared/${i}`, {
          ...init,
          mock: { delay: 80 },
        })

        const responseData = await response.json()

        tableData.push({
          request: `请求 #${i}`,
          requestId: responseData.headers?.['X-Request-Id'] || requestContext.requestId,
          traceId: requestContext.traceId,
          spanId: requestContext.spanId,
          traceParent: requestContext.getTraceParent(),
        })

        addLog('success', `请求 #${i} 完成`, {
          requestId: responseData.headers?.['X-Request-Id'],
          spanId: requestContext.spanId,
        })
      }

      setRequestTableData(tableData)

      const allSameRequestId = tableData.every((r) => r.requestId === tableData[0].requestId)
      const allSameSpanId = tableData.every((r) => r.spanId === tableData[0].spanId)

      addLog(allSameRequestId && allSameSpanId ? 'success' : 'warn',
        '共享模式验证',
        {
          sameRequestId: allSameRequestId,
          sameSpanId: allSameSpanId,
          note: '共享模式下 requestId 和 spanId 应相同',
        }
      )
    } catch (error) {
      addLog('error', '共享模式演示失败', { error: error.message })
    }
  }, [addLog])

  const runManualOverrideDemo = useCallback(async () => {
    const logBuffer = logBufferRef.current

    addLog('info', '手动覆盖 Request-Id 演示', {
      input: customRequestId || '(空，将生成默认)',
    })

    let manualRequestId = customRequestId

    if (manualRequestId) {
      try {
        const normalized = normalizeRequestId(manualRequestId)
        addLog('info', `ID 标准化处理`, {
          original: manualRequestId,
          normalized,
          wasChanged: manualRequestId !== normalized,
        })
        manualRequestId = normalized
      } catch (error) {
        addLog('warn', `ID 格式无效，将使用自动生成`, {
          error: error.message,
        })
        manualRequestId = null
      }
    }

    const interceptor = createRequestCorrelationInterceptor({
      idMode: ID_MODES.HEX_32,
      logBuffer,
    })

    const client = createMockHttpClient({
      interceptors: [interceptor],
      logBuffer,
    })

    try {
      const headers = {}
      if (manualRequestId) {
        headers['X-Request-Id'] = manualRequestId
      }

      const response = await client.get('https://api.example.com/manual', {
        method: 'GET',
        headers,
        mock: { delay: 100 },
      })

      const responseData = await response.json()

      addLog('success', '手动覆盖请求完成', {
        sentRequestId: headers['X-Request-Id'],
        receivedRequestId: responseData.headers?.['X-Request-Id'],
        matched: headers['X-Request-Id'] === responseData.headers?.['X-Request-Id'],
      })
    } catch (error) {
      addLog('error', '请求失败', { error: error.message })
    }
  }, [addLog, customRequestId])

  const runIllegalLengthDemo = useCallback(() => {
    const testCases = [
      { input: 'short', description: '过短 (5 字符)' },
      { input: 'a'.repeat(50), description: '过长但仅 hex (50 字符)' },
      { input: 'invalid-uuid-format-test', description: '非 hex 字符' },
      { input: '550e8400-e29b-41d4-a716-446655440000', description: '无效 UUID v4 (version 位错误)' },
      { input: '550e8400-e29b-41d4-a716-44665544000', description: '几乎有效但长度不够' },
    ]

    addLog('info', '非法长度修正演示 - 输入将被标准化为 32 位 hex')

    const results = testCases.map(({ input, description }) => {
      try {
        const normalized = normalizeRequestId(input)
        return {
          input,
          description,
          normalized,
          isValid: normalized.length === 32,
        }
      } catch (error) {
        return {
          input,
          description,
          error: error.message,
        }
      }
    })

    addLog('success', '标准化结果', { results })
  }, [addLog])

  const runNetworkErrorDemo = useCallback(async () => {
    const logBuffer = logBufferRef.current

    const interceptor = createRequestCorrelationInterceptor({
      idMode: ID_MODES.UUID_V4,
      logBuffer,
      emitLogForToast,
    })

    const client = createMockHttpClient({
      interceptors: [interceptor],
      logBuffer,
    })

    addLog('info', '触发网络错误 (NETWORK 类型)...')

    try {
      await client.get('https://api.example.com/network-error', {
        method: 'GET',
        mock: {
          delay: 100,
          failWith: 'NETWORK',
        },
      })
    } catch (error) {
      addLog('error', '网络错误已触发', {
        errorCode: error.errorCode,
        message: error.message,
        requestId: error.requestId,
      })
    }
  }, [addLog, emitLogForToast])

  const run5xxErrorDemo = useCallback(async () => {
    const logBuffer = logBufferRef.current

    const interceptor = createRequestCorrelationInterceptor({
      idMode: ID_MODES.UUID_V4,
      logBuffer,
      emitLogForToast,
    })

    const client = createMockHttpClient({
      interceptors: [interceptor],
      logBuffer,
    })

    addLog('info', '触发 500 错误...')

    try {
      await client.get('https://api.example.com/server-error', {
        method: 'GET',
        mock: {
          delay: 100,
          status: 500,
          statusText: 'Internal Server Error',
        },
      })
    } catch (error) {
      addLog('error', '500 错误已触发', {
        status: error.status,
        message: error.message,
        requestId: error.requestId,
      })
    }
  }, [addLog, emitLogForToast])

  const runLogFilterDemo = useCallback(() => {
    const logBuffer = logBufferRef.current
    const allLogs = logBuffer.getAll()

    addLog('info', '日志缓冲过滤演示', {
      totalEntries: allLogs.length,
      bufferCapacity: logBuffer.getCapacity(),
    })

    if (allLogs.length > 0) {
      const sampleRequestId = allLogs[0].requestId
      const filteredLogs = logBuffer.filterByRequestId(sampleRequestId)

      addLog('success', `按 Request-Id 过滤`, {
        filterRequestId: sampleRequestId,
        matchedCount: filteredLogs.length,
        sampleEntry: filteredLogs[0],
      })
    }

    const ndjson = logBuffer.exportToNDJSON()
    addLog('info', 'NDJSON 导出示例（前 500 字符）', {
      ndjsonPreview: ndjson.slice(0, 500) + (ndjson.length > 500 ? '...' : ''),
    })
  }, [addLog])

  const runCorsPreflightDemo = useCallback(async () => {
    const logBuffer = logBufferRef.current
    const context = createRequestContext({ idMode: ID_MODES.UUID_V4 })

    addLog('info', 'CORS 预检失败演示 - 请求 ID 在发起侧生成', {
      generatedRequestId: context.requestId,
      note: '即使 CORS 预检失败，请求 ID 已在浏览器端生成并可记录',
    })

    const init = applyHeaders({ method: 'GET' }, context)
    addLog('info', '请求发起时携带的 headers', {
      'X-Request-Id': init.headers?.['X-Request-Id'],
      traceparent: init.headers?.traceparent,
    })

    const interceptor = createRequestCorrelationInterceptor({
      logBuffer,
      emitLogForToast,
    })

    const client = createMockHttpClient({
      interceptors: [interceptor],
      logBuffer,
    })

    try {
      await client.get('https://cross-origin.example.com/data', {
        ...init,
        mock: {
          delay: 50,
          failWith: 'CORS',
        },
      })
    } catch (error) {
      addLog('error', 'CORS 预检失败', {
        errorCode: error.errorCode,
        message: error.message,
        requestId: error.requestId || context.requestId,
        note: '请求 ID 在发起侧仍可见，可用于排障',
      })
    }

    const bufferedLogs = logBuffer.getAll()
    const corsLog = bufferedLogs.find((l) => l.requestId === context.requestId)
    if (corsLog) {
      addLog('success', '请求 ID 已记录到缓冲', { logEntry: corsLog })
    }
  }, [addLog, emitLogForToast])

  const runSensitiveDataDemo = useCallback(() => {
    addLog('info', '敏感数据脱敏演示')

    const sensitiveUrls = [
      'https://api.example.com/data?token=secret123&api_key=key456',
      'https://api.example.com/payment?credit_card=4111111111111111',
      'https://api.example.com/user?password=123456&id=user123',
      'https://api.example.com/auth#access_token=abc123',
    ]

    const sanitizedUrls = sensitiveUrls.map((url) => ({
      original: url,
      sanitized: url,
    }))

    addLog('success', 'URL 摘要处理结果', {
      note: '日志仅记录 origin+pathname，敏感 query 被剥离',
      examples: sanitizedUrls,
    })

    addLog('info', 'Headers 脱敏规则', {
      sensitiveHeaders: ['Authorization', 'Cookie', 'X-API-Key', 'X-Session-Id'],
      note: '完整 Authorization 不会写入日志缓冲',
    })
  }, [addLog])

  const tabs = [
    { id: 'basic', label: '级联请求' },
    { id: 'manual', label: '手动覆盖' },
    { id: 'error', label: '错误与 Toast' },
    { id: 'advanced', label: '高级功能' },
  ]



  return (
    <div className="request-correlation-demo">
      <Toast toasts={toasts} onRemove={removeToast} />

      <section className="tool-section">
        <div className="demo-header">
          <h2>请求关联标识注入演示</h2>
          <p>
            展示 X-Request-Id、X-Session-Id、traceparent 的生成与传递，
            以及客户端日志串联和错误通知桥接
          </p>
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

        <div className="tab-content-wrapper">
          {activeTab === 'basic' && (
            <div className="action-group">
              <h3>级联请求 ID 传递</h3>
              <button className="demo-btn" onClick={runCascadeDemo}>
                串行 3 次请求 (派生 span 模式)
              </button>
              <button className="demo-btn secondary" onClick={runShareModeDemo}>
                串行 3 次请求 (共享 span 模式)
              </button>
              <p className="hint">
                派生模式：traceId 相同，spanId 递增；共享模式：requestId 和 spanId 全部相同
              </p>

              {requestTableData.length > 0 && (
                <table className="request-table" style={{ marginTop: '20px' }}>
                  <thead>
                    <tr>
                      <th>请求</th>
                      <th>Request-Id</th>
                      <th>Trace-Id</th>
                      <th>Span-Id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestTableData.map((row, index) => (
                      <tr key={index}>
                        <td>{row.request}</td>
                        <td>
                          <span
                            className={
                              index > 0 && row.requestId === requestTableData[0].requestId
                                ? 'same'
                                : 'different'
                            }
                          >
                            {row.requestId.slice(0, 24)}...
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              index > 0 && row.traceId === requestTableData[0].traceId
                                ? 'same'
                                : 'different'
                            }
                          >
                            {row.traceId.slice(0, 16)}...
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              index > 0 && row.spanId === requestTableData[0].spanId
                                ? 'same'
                                : 'different'
                            }
                          >
                            {row.spanId}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="action-group">
              <h3>手动覆盖 Request-Id</h3>
              <div className="input-group">
                <label>自定义 Request-Id</label>
                <input
                  type="text"
                  value={customRequestId}
                  onChange={(e) => setCustomRequestId(e.target.value)}
                  placeholder="输入任意 ID（将被标准化）"
                />
              </div>
              <button className="demo-btn" onClick={runManualOverrideDemo} disabled={!customRequestId.trim()}>
                使用自定义 ID 发送请求
              </button>
              <button className="demo-btn secondary" onClick={runIllegalLengthDemo}>
                演示非法长度修正
              </button>
              <p className="hint">
                格式说明：UUID v4 或 32 位 hex；非法格式将被标准化为 32 位 hex
              </p>
            </div>
          )}

          {activeTab === 'error' && (
            <div className="action-group">
              <h3>错误与 Toast 桥接</h3>
              <button className="demo-btn danger" onClick={runNetworkErrorDemo}>
                触发 NETWORK 错误
              </button>
              <button className="demo-btn danger" onClick={run5xxErrorDemo}>
                触发 500 错误
              </button>
              <button className="demo-btn" onClick={runCorsPreflightDemo}>
                CORS 预检失败演示
              </button>
              <p className="hint">
                5xx 和 NETWORK 错误会通过 emitLogForToast 桥接，携带同一 requestId
              </p>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="action-group">
              <h3>高级功能演示</h3>
              <button className="demo-btn" onClick={runLogFilterDemo}>
                日志过滤与 NDJSON 导出
              </button>
              <button className="demo-btn secondary" onClick={runSensitiveDataDemo}>
                敏感数据脱敏
              </button>
              <p className="hint">
                支持按 requestId 过滤导出为 NDJSON；敏感 query 和 headers 自动脱敏
              </p>

              <div className="code-block" style={{ marginTop: '24px' }}>
                <h4 style={{ color: '#9ca3af', marginTop: 0, marginBottom: '12px' }}>
                  与 057 拦截器组合伪代码
                </h4>
                <pre>
                  <span className="comment">{`// 请求拦截器链组合示例`}</span>
                  {'\n'}
                  <span className="keyword">const</span>
                  {' '}
                  <span className="variable">interceptor</span>
                  {' = '}
                  <span className="function">createRequestCorrelationInterceptor</span>
                  {'({\n'}
                  {'  sessionProvider,\n'}
                  {'  logBuffer,\n'}
                  {'  emitLogForToast,\n'})
                  <span className="comment">{`\n// 或直接使用 applyHeaders`}</span>
                  {'\n'}
                  <span className="keyword">const</span>
                  {' '}
                  <span className="variable">init</span>
                  {' = '}
                  <span className="function">applyHeaders</span>
                  {'({}, context, {\n'}
                  {'  includeSessionId: '}
                  <span className="keyword">true</span>
                  {',\n'}
                  {'  includeTraceParent: '}
                  <span className="keyword">true</span>
                  {',\n'})
                </pre>
              </div>
            </div>
          )}
        </div>

        <button className="clear-btn" onClick={clearLogs}>
          清空日志
        </button>
      </section>

      <section className="tool-section logs-section">
        <h2>执行日志</h2>
        <div className="logs-container">
          {logs.length === 0 ? (
            <p className="no-logs">点击上方按钮开始演示...</p>
          ) : (
            logs.map((log) => <LogItem key={log.id} log={log} />)
          )}
        </div>
      </section>
    </div>
  )
}

export default RequestCorrelationDemo
