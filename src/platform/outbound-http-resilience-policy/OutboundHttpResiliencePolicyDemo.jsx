import { useCallback, useEffect, useRef, useState } from 'react'
import './OutboundHttpResiliencePolicyDemo.css'
import {
  createHttpClientPolicy,
  createMockServer,
  EVENT_TYPES,
  isRetryExhaustedError,
  MOCK_MODES,
} from './logic/index.js'

function OutboundHttpResiliencePolicyDemo() {
  const mockServerRef = useRef(null)

  const [config, setConfig] = useState({
    retries: 3,
    baseDelayMs: 100,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitter: true,
    baseTimeout: 30000,
    perAttemptTimeout: 5000,
    retryAfterHeader: true,
    cancelInherited: true,
  })

  const [mockMode, setMockMode] = useState(MOCK_MODES.FAIL_UNTIL_ATTEMPT)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [stats, setStats] = useState({
    attempts: 0,
    retries: 0,
    successes: 0,
    failures: 0,
  })

  const abortControllerRef = useRef(null)

  useEffect(() => {
    mockServerRef.current = createMockServer({
      baseDelay: 100,
      failUntilAttempt: 3,
    })
  }, [])

  const addTimelineEvent = useCallback((event) => {
    const timestamp = new Date(event.timestamp).toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })

    setTimeline((prev) => [
      ...prev,
      {
        ...event,
        formattedTime: timestamp,
      },
    ])

    setStats((prev) => {
      const newStats = { ...prev }
      if (event.type === EVENT_TYPES.ATTEMPT_START) {
        newStats.attempts++
      } else if (event.type === EVENT_TYPES.RETRY_DECIDED) {
        newStats.retries++
      } else if (event.type === EVENT_TYPES.ATTEMPT_SUCCESS) {
        newStats.successes++
      } else if (
        event.type === EVENT_TYPES.RETRY_EXHAUSTED ||
        event.type === EVENT_TYPES.ATTEMPT_FAILURE
      ) {
        newStats.failures++
      }
      return newStats
    })
  }, [])

  const handleConfigChange = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleModeChange = useCallback((e) => {
    setMockMode(e.target.value)
    if (mockServerRef.current) {
      mockServerRef.current.setMode(e.target.value)
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (!mockServerRef.current) return

    setIsRunning(true)
    setResult({ status: 'pending', message: '执行中...' })
    setTimeline([])
    setStats({ attempts: 0, retries: 0, successes: 0, failures: 0 })
    mockServerRef.current.reset()

    abortControllerRef.current = new AbortController()

    const originalFetch = globalThis.fetch
    globalThis.fetch = mockServerRef.current.createFetchWrapper()

    try {
      const policyFetch = createHttpClientPolicy({
        ...config,
        onAttempt: addTimelineEvent,
        onRetryDecision: addTimelineEvent,
      })

      const response = await policyFetch('/api/test', {
        method: 'GET',
        signal: abortControllerRef.current?.signal,
      })

      const data = await response.json()

      setResult({
        status: 'success',
        message: '请求成功',
        response: data,
        statusCode: response.status,
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        setResult({
          status: 'cancelled',
          message: '用户已取消',
          error: error.message,
        })
      } else if (isRetryExhaustedError(error)) {
        setResult({
          status: 'exhausted',
          message: '重试耗尽',
          attempts: error.attempts,
          error: error.lastError?.message || error.message,
        })
      } else {
        setResult({
          status: 'error',
          message: '请求失败',
          error: error.message,
          errorCode: error.errorCode,
        })
      }
    } finally {
      globalThis.fetch = originalFetch
      setIsRunning(false)
      abortControllerRef.current = null
    }
  }, [config, addTimelineEvent])

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const handleReset = useCallback(() => {
    setResult(null)
    setTimeline([])
    setStats({ attempts: 0, retries: 0, successes: 0, failures: 0 })
    if (mockServerRef.current) {
      mockServerRef.current.reset()
    }
  }, [])

  const getTypeBadgeClass = (type) => {
    if (type === EVENT_TYPES.ATTEMPT_START || type === EVENT_TYPES.ATTEMPT_SUCCESS) {
      return 'attempt'
    }
    if (type === EVENT_TYPES.RETRY_DECIDED) {
      return 'retry'
    }
    if (type === EVENT_TYPES.RETRY_EXHAUSTED) {
      return 'exhausted'
    }
    if (type === EVENT_TYPES.CANCELLED) {
      return 'cancelled'
    }
    return ''
  }

  const getStatusClass = (event) => {
    if (event.type === EVENT_TYPES.ATTEMPT_SUCCESS) return 'status-success'
    if (
      event.type === EVENT_TYPES.ATTEMPT_FAILURE ||
      event.type === EVENT_TYPES.RETRY_EXHAUSTED
    ) {
      return 'status-fail'
    }
    if (event.type === EVENT_TYPES.RETRY_DECIDED) return 'status-retry'
    return ''
  }

  const formatEventMessage = (event) => {
    switch (event.type) {
      case EVENT_TYPES.ATTEMPT_START:
        return `开始尝试 #${event.attempt}`
      case EVENT_TYPES.ATTEMPT_SUCCESS:
        return `尝试成功 (HTTP ${event.status}) - ${event.duration}ms`
      case EVENT_TYPES.ATTEMPT_FAILURE:
        return `尝试失败: ${event.error?.message || '未知错误'}`
      case EVENT_TYPES.RETRY_DECIDED:
        return `决定重试 - ${event.delayMs}ms 后 (原因: ${event.reason})`
      case EVENT_TYPES.RETRY_EXHAUSTED:
        return `重试耗尽 - 共 ${event.attempts} 次尝试`
      case EVENT_TYPES.CANCELLED:
        return '用户取消请求'
      default:
        return event.type
    }
  }

  return (
    <div className="resilience-policy-demo">
      <div className="demo-header">
        <h1>HTTP 弹性策略演示</h1>
        <p>
          演示指数退避、抖动、幂等重试、Retry-After 解析等弹性能力，支持可观测性钩子和取消链
        </p>
      </div>

      <div className="demo-layout">
        <div className="config-panel">
          <h2>策略配置</h2>

          <div className="config-section">
            <h3>重试策略</h3>
            <div className="config-row">
              <label>最大重试次数</label>
              <input
                type="number"
                min="0"
                max="10"
                value={config.retries}
                onChange={(e) => handleConfigChange('retries', Number(e.target.value))}
              />
            </div>
            <div className="config-row">
              <label>基础延迟 (ms)</label>
              <input
                type="number"
                min="0"
                max="5000"
                step="50"
                value={config.baseDelayMs}
                onChange={(e) => handleConfigChange('baseDelayMs', Number(e.target.value))}
              />
            </div>
            <div className="config-row">
              <label>最大延迟 (ms)</label>
              <input
                type="number"
                min="100"
                max="60000"
                step="100"
                value={config.maxDelayMs}
                onChange={(e) => handleConfigChange('maxDelayMs', Number(e.target.value))}
              />
            </div>
            <div className="config-row">
              <label>退避乘数</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={config.backoffMultiplier}
                onChange={(e) => handleConfigChange('backoffMultiplier', Number(e.target.value))}
              />
            </div>
            <div className="config-row">
              <label>启用抖动</label>
              <input
                type="checkbox"
                checked={config.jitter}
                onChange={(e) => handleConfigChange('jitter', e.target.checked)}
              />
            </div>
          </div>

          <div className="config-section">
            <h3>超时配置</h3>
            <div className="config-row">
              <label>总超时 (ms)</label>
              <input
                type="number"
                min="1000"
                max="120000"
                step="1000"
                value={config.baseTimeout}
                onChange={(e) => handleConfigChange('baseTimeout', Number(e.target.value))}
              />
            </div>
            <div className="config-row">
              <label>单次尝试超时 (ms)</label>
              <input
                type="number"
                min="1000"
                max="60000"
                step="1000"
                value={config.perAttemptTimeout}
                onChange={(e) => handleConfigChange('perAttemptTimeout', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="config-section">
            <h3>高级选项</h3>
            <div className="config-row">
              <label>尊重 Retry-After</label>
              <input
                type="checkbox"
                checked={config.retryAfterHeader}
                onChange={(e) => handleConfigChange('retryAfterHeader', e.target.checked)}
              />
            </div>
            <div className="config-row">
              <label>取消继承传播</label>
              <input
                type="checkbox"
                checked={config.cancelInherited}
                onChange={(e) => handleConfigChange('cancelInherited', e.target.checked)}
              />
            </div>
          </div>

          <div className="config-section">
            <h3>Mock 服务器模式</h3>
            <div className="config-row">
              <label>选择模式</label>
              <select className="mock-select" value={mockMode} onChange={handleModeChange}>
                <option value={MOCK_MODES.SUCCESS}>总是成功</option>
                <option value={MOCK_MODES.FAIL_UNTIL_ATTEMPT}>第 N 次尝试成功</option>
                <option value={MOCK_MODES.RATE_LIMIT}>限流 (429 + Retry-After)</option>
                <option value={MOCK_MODES.RANDOM_RESET}>随机重置 (503)</option>
                <option value={MOCK_MODES.NETWORK_ERROR}>网络错误</option>
                <option value={MOCK_MODES.TIMEOUT}>请求超时</option>
              </select>
            </div>
          </div>

          <div className="button-group">
            <button
              className="demo-btn primary"
              onClick={handleStart}
              disabled={isRunning}
            >
              {isRunning ? '执行中...' : '开始执行'}
            </button>
            <button
              className="demo-btn danger"
              onClick={handleCancel}
              disabled={!isRunning}
            >
              取消
            </button>
            <button className="demo-btn secondary" onClick={handleReset}>
              重置
            </button>
          </div>
        </div>

        <div className="main-panel">
          <div className="result-panel">
            <h2>执行结果</h2>
            {result ? (
              <>
                <span
                  className={`status-badge ${
                    result.status === 'success'
                      ? 'success'
                      : result.status === 'cancelled'
                      ? 'cancelled'
                      : result.status === 'pending'
                      ? 'pending'
                      : 'error'
                  }`}
                >
                  {result.message}
                </span>
                <div className="result-details">
                  {result.response && (
                    <pre>{JSON.stringify(result.response, null, 2)}</pre>
                  )}
                  {result.error && (
                    <pre>
                      {JSON.stringify(
                        {
                          error: result.error,
                          errorCode: result.errorCode,
                          attempts: result.attempts,
                        },
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">点击「开始执行」演示弹性策略</div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.attempts}</div>
                <div className="stat-label">总尝试数</div>
              </div>
              <div className="stat-card retry">
                <div className="stat-value">{stats.retries}</div>
                <div className="stat-label">重试次数</div>
              </div>
              <div className="stat-card success">
                <div className="stat-value">{stats.successes}</div>
                <div className="stat-label">成功</div>
              </div>
              <div className="stat-card error">
                <div className="stat-value">{stats.failures}</div>
                <div className="stat-label">失败</div>
              </div>
            </div>
          </div>

          <div className="timeline-panel">
            <h2>事件时间线</h2>
            {timeline.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="timeline-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>类型</th>
                      <th>尝试</th>
                      <th>状态</th>
                      <th>详情</th>
                      <th>Trace ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((event, index) => (
                      <tr key={index}>
                        <td>{event.formattedTime}</td>
                        <td>
                          <span className={`type-badge ${getTypeBadgeClass(event.type)}`}>
                            {event.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{event.attempt || '-'}</td>
                        <td className={getStatusClass(event)}>
                          {event.type === EVENT_TYPES.ATTEMPT_SUCCESS
                            ? '成功'
                            : event.type === EVENT_TYPES.RETRY_DECIDED
                            ? '重试'
                            : event.type === EVENT_TYPES.ATTEMPT_START
                            ? '开始'
                            : '失败'}
                        </td>
                        <td>{formatEventMessage(event)}</td>
                        <td className="trace-id">{event.traceId?.slice(0, 20)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">暂无事件记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OutboundHttpResiliencePolicyDemo
