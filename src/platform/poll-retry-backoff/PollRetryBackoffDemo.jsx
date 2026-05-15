import { useCallback, useEffect, useRef, useState } from 'react'
import './PollRetryBackoffDemo.css'
import {
    createMockFetchClient,
    enableObservability,
    ERROR_CODES,
    getActivePolls,
    isAbortError,
    pollUntilDoneOrTimeout,
    retry
} from './logic/index.js'

function MetricsPanel({ metrics }) {
  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-label">总尝试次数</div>
        <div className="metric-value">{metrics.totalAttempts}</div>
      </div>
      <div className="metric-card success">
        <div className="metric-label">成功次数</div>
        <div className="metric-value">{metrics.successCount}</div>
      </div>
      <div className="metric-card error">
        <div className="metric-label">失败次数</div>
        <div className="metric-value">{metrics.failCount}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">活跃轮询数</div>
        <div className="metric-value">{metrics.activePollsCount}</div>
      </div>
    </div>
  )
}

function TimelineTable({ timeline }) {
  if (timeline.length === 0) {
    return (
      <div className="result-panel empty">
        <p>尚无尝试记录，请点击开始按钮开始演示</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="timeline-table">
        <thead>
          <tr>
            <th>#</th>
            <th>时间</th>
            <th>类型</th>
            <th>状态</th>
            <th>HTTP 状态码</th>
            <th>间隔</th>
            <th>耗时</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((entry, index) => (
            <tr key={entry.id || index}>
              <td>{entry.attempt}</td>
              <td>{entry.timestamp}</td>
              <td>{entry.type}</td>
              <td className={`status-${entry.success ? 'success' : entry.retry ? 'retry' : 'fail'}`}>
                {entry.success ? '成功' : entry.retry ? '重试' : '失败'}
              </td>
              <td>{entry.httpStatus || '-'}</td>
              <td>{entry.interval ? `${entry.interval}ms` : '-'}</td>
              <td>{entry.duration ? `${entry.duration}ms` : '-'}</td>
              <td>{entry.message || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PollDemoPanel({
  config,
  onConfigChange,
  mockClient,
  onStartPoll,
  onStopPoll,
  isRunning,
  pollResult,
  timeline,
  metrics,
}) {
  const formatTime = (ms) => {
    const date = new Date(ms)
    return date.toLocaleTimeString()
  }

  return (
    <div className="tab-content">
      <div className="config-panel">
        <div className="section-title">轮询配置</div>
        
        <div className="config-group">
          <label>成功率:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={config.successRate * 100}
            onChange={(e) => onConfigChange('successRate', Number(e.target.value) / 100)}
          />
          <span className="value-display">{(config.successRate * 100).toFixed(0)}%</span>
        </div>

        <div className="config-group">
          <label>间隔 (ms):</label>
          <input
            type="number"
            min="100"
            max="10000"
            step="100"
            value={config.intervalMs}
            onChange={(e) => onConfigChange('intervalMs', Number(e.target.value))}
          />
        </div>

        <div className="config-group">
          <label>抖动比例:</label>
          <input
            type="range"
            min="0"
            max="50"
            value={config.jitterRatio * 100}
            onChange={(e) => onConfigChange('jitterRatio', Number(e.target.value) / 100)}
          />
          <span className="value-display">{(config.jitterRatio * 100).toFixed(0)}%</span>
        </div>

        <div className="config-group">
          <label>退避乘子:</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.5"
            value={config.backoffFactor}
            onChange={(e) => onConfigChange('backoffFactor', Number(e.target.value))}
          />
        </div>

        <div className="config-group">
          <label>最大尝试次数:</label>
          <input
            type="number"
            min="1"
            max="100"
            value={config.maxAttempts}
            onChange={(e) => onConfigChange('maxAttempts', Number(e.target.value))}
          />
        </div>

        <div className="config-group">
          <label>超时时间 (ms):</label>
          <input
            type="number"
            min="1000"
            max="60000"
            step="1000"
            value={config.timeoutMs}
            onChange={(e) => onConfigChange('timeoutMs', Number(e.target.value))}
          />
        </div>

        <div className="config-group checkbox-wrapper">
          <input
            type="checkbox"
            id="isImmediate"
            checked={config.isImmediate}
            onChange={(e) => onConfigChange('isImmediate', e.target.checked)}
          />
          <label htmlFor="isImmediate">立即执行（首调无延迟）</label>
        </div>

        <div className="config-group checkbox-wrapper">
          <input
            type="checkbox"
            id="pauseOnHidden"
            checked={config.pauseOnHidden}
            onChange={(e) => onConfigChange('pauseOnHidden', e.target.checked)}
          />
          <label htmlFor="pauseOnHidden">页面隐藏时暂停</label>
        </div>

        <div className="button-group">
          <button
            className="demo-btn success"
            onClick={onStartPoll}
            disabled={isRunning}
          >
            {isRunning ? '运行中...' : '开始轮询'}
          </button>
          <button
            className="demo-btn danger"
            onClick={onStopPoll}
            disabled={!isRunning}
          >
            停止轮询
          </button>
        </div>
      </div>

      {pollResult && (
        <div className="result-panel">
          <div className="section-title">轮询结果</div>
          <div className={`status-badge ${pollResult.status}`}>
            {pollResult.status === 'success' ? '成功' : 
             pollResult.status === 'error' ? '失败' : 
             pollResult.status === 'cancelled' ? '已取消' : '运行中'}
          </div>
          {pollResult.value && (
            <pre style={{ marginTop: '12px' }}>
              {JSON.stringify(pollResult.value, null, 2)}
            </pre>
          )}
          {pollResult.error && (
            <pre style={{ marginTop: '12px', color: '#dc2626' }}>
              {JSON.stringify({
                message: pollResult.error.message,
                errorCode: pollResult.error.errorCode,
                name: pollResult.error.name,
              }, null, 2)}
            </pre>
          )}
        </div>
      )}

      <MetricsPanel metrics={metrics} />

      <div className="result-panel">
        <div className="section-title">尝试时间线</div>
        <TimelineTable timeline={timeline} />
      </div>
    </div>
  )
}

function RetryDemoPanel({
  retryConfig,
  onRetryConfigChange,
  onStartRetry,
  onStopRetry,
  isRetrying,
  retryResult,
  retryTimeline,
  retryMetrics,
}) {
  return (
    <div className="tab-content">
      <div className="config-panel">
        <div className="section-title">重试配置</div>
        
        <div className="config-group">
          <label>重试次数:</label>
          <input
            type="number"
            min="0"
            max="10"
            value={retryConfig.retries}
            onChange={(e) => onRetryConfigChange('retries', Number(e.target.value))}
          />
        </div>

        <div className="config-group">
          <label>初始延迟 (ms):</label>
          <input
            type="number"
            min="0"
            max="5000"
            step="100"
            value={retryConfig.delayMs}
            onChange={(e) => onRetryConfigChange('delayMs', Number(e.target.value))}
          />
        </div>

        <div className="config-group">
          <label>退避乘子:</label>
          <input
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={retryConfig.backoffFactor}
            onChange={(e) => onRetryConfigChange('backoffFactor', Number(e.target.value))}
          />
        </div>

        <div className="config-group">
          <label>最大延迟 (ms):</label>
          <input
            type="number"
            min="100"
            max="60000"
            step="1000"
            value={retryConfig.maxDelayMs}
            onChange={(e) => onRetryConfigChange('maxDelayMs', Number(e.target.value))}
          />
        </div>

        <div className="config-group">
          <label>成功率:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={retryConfig.successRate * 100}
            onChange={(e) => onRetryConfigChange('successRate', Number(e.target.value) / 100)}
          />
          <span className="value-display">{(retryConfig.successRate * 100).toFixed(0)}%</span>
        </div>

        <div className="config-group checkbox-wrapper">
          <input
            type="checkbox"
            id="inject503"
            checked={retryConfig.inject503}
            onChange={(e) => onRetryConfigChange('inject503', e.target.checked)}
          />
          <label htmlFor="inject503">注入 503 + Retry-After</label>
        </div>

        {retryConfig.inject503 && (
          <div className="config-group">
            <label>Retry-After (秒):</label>
            <input
              type="number"
              min="1"
              max="60"
              value={retryConfig.retryAfterSeconds}
              onChange={(e) => onRetryConfigChange('retryAfterSeconds', Number(e.target.value))}
            />
          </div>
        )}

        <div className="button-group">
          <button
            className="demo-btn success"
            onClick={onStartRetry}
            disabled={isRetrying}
          >
            {isRetrying ? '运行中...' : '执行重试'}
          </button>
          <button
            className="demo-btn danger"
            onClick={onStopRetry}
            disabled={!isRetrying}
          >
            取消重试
          </button>
        </div>
      </div>

      {retryResult && (
        <div className="result-panel">
          <div className="section-title">重试结果</div>
          <div className={`status-badge ${retryResult.status}`}>
            {retryResult.status === 'success' ? '成功' : 
             retryResult.status === 'cancelled' ? '已取消' : '失败'}
          </div>
          <div style={{ marginTop: '12px' }}>
            <strong>总尝试次数:</strong> {retryResult.attempts}
          </div>
          {retryResult.value && (
            <pre style={{ marginTop: '12px' }}>
              {JSON.stringify(retryResult.value, null, 2)}
            </pre>
          )}
          {retryResult.error && (
            <pre style={{ marginTop: '12px', color: '#dc2626' }}>
              {JSON.stringify({
                message: retryResult.error.message,
                errorCode: retryResult.error.errorCode,
                name: retryResult.error.name,
              }, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="result-panel">
        <div className="section-title">重试时间线</div>
        <TimelineTable timeline={retryTimeline} />
      </div>

      <div className="info-panel">
        <h3>与 048 任务指数序列公式差异</h3>
        <p>
          <strong>本任务实现（自包含）:</strong> <code>delay = baseDelay * Math.pow(backoffFactor, attempt)</code>
        </p>
        <p>
          <strong>048 任务 exponential-backoff-calculator:</strong> 支持更多算法类型（EXPONENTIAL, LINEAR, FIXED）
          以及对齐到秒/网格等功能。
        </p>
        <p>
          本任务不 import 048 任务的 calculator，保持自包含实现。如需完整的退避序列计算，请使用独立的 exponential-backoff-calculator 工具。
        </p>
      </div>
    </div>
  )
}

function CombinedDemoPanel({
  onRunCombined,
  onStopCombined,
  isCombinedRunning,
  combinedResult,
  combinedTimeline,
}) {
  return (
    <div className="tab-content">
      <div className="config-panel">
        <div className="section-title">组合示例：轮询直到 done 或超时</div>
        <p>
          这个示例组合了 poll 和超时机制，演示如何轮询直到收到 <code>done: true</code> 或超时。
        </p>
        
        <div className="button-group">
          <button
            className="demo-btn success"
            onClick={onRunCombined}
            disabled={isCombinedRunning}
          >
            {isCombinedRunning ? '运行中...' : '运行组合示例'}
          </button>
          <button
            className="demo-btn danger"
            onClick={onStopCombined}
            disabled={!isCombinedRunning}
          >
            取消
          </button>
        </div>
      </div>

      {combinedResult && (
        <div className="result-panel">
          <div className="section-title">组合示例结果</div>
          <div className={`status-badge ${combinedResult.status}`}>
            {combinedResult.status === 'success' ? '成功' : 
             combinedResult.status === 'timeout' ? '超时' : 
             combinedResult.status === 'cancelled' ? '已取消' : '错误'}
          </div>
          {combinedResult.value && (
            <pre style={{ marginTop: '12px' }}>
              {JSON.stringify(combinedResult.value, null, 2)}
            </pre>
          )}
          {combinedResult.error && (
            <pre style={{ marginTop: '12px', color: '#dc2626' }}>
              {JSON.stringify({
                message: combinedResult.error.message,
                errorCode: combinedResult.error.errorCode,
                name: combinedResult.error.name,
              }, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="result-panel">
        <div className="section-title">执行时间线</div>
        <TimelineTable timeline={combinedTimeline} />
      </div>

      <div className="info-panel">
        <h3>与 057 HttpClient 拦截器合并示例</h3>
        <p>
          通过导出 <code>disposable</code> 句柄，避免与拦截器中的 <code>setTimeout</code> 冲突：
        </p>
        <pre>{`// 使用 disposable 句柄管理生命周期
const pollPromise = poll(fn, options);
const { cancel, getState } = pollPromise.disposable;

// 在拦截器中使用
const interceptor = async (config, { retry }) => {
  const result = await retry(async () => {
    // 操作...
  }, options);
  
  // 返回可取消的句柄
  return {
    ...result,
    disposable: {
      cancel: () => { /* 清理资源 */ },
    }
  };
};

// 取消时清理所有计时器
cancel();  // 自动清理所有 setTimeout 和监听器`}</pre>
      </div>
    </div>
  )
}

function PollRetryBackoffDemo() {
  useEffect(() => {
    enableObservability(true)
  }, [])

  const [activeTab, setActiveTab] = useState('poll')

  const [config, setConfig] = useState({
    successRate: 0.6,
    intervalMs: 1000,
    jitterRatio: 0.1,
    backoffFactor: 1.5,
    maxAttempts: 10,
    timeoutMs: 30000,
    isImmediate: true,
    pauseOnHidden: true,
  })

  const [retryConfig, setRetryConfig] = useState({
    retries: 3,
    delayMs: 200,
    backoffFactor: 2,
    maxDelayMs: 10000,
    successRate: 0.3,
    inject503: false,
    retryAfterSeconds: 3,
  })

  const [isRunning, setIsRunning] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isCombinedRunning, setIsCombinedRunning] = useState(false)
  const [pollResult, setPollResult] = useState(null)
  const [retryResult, setRetryResult] = useState(null)
  const [combinedResult, setCombinedResult] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [retryTimeline, setRetryTimeline] = useState([])
  const [combinedTimeline, setCombinedTimeline] = useState([])
  const [metrics, setMetrics] = useState({
    totalAttempts: 0,
    successCount: 0,
    failCount: 0,
    activePollsCount: 0,
  })

  const pollRef = useRef(null)
  const retryRef = useRef(null)
  const combinedRef = useRef(null)
  const mockClientRef = useRef(null)
  const pollProgressRef = useRef({ callCount: 0, progress: 0 })

  const formatTimestamp = () => {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false })
  }

  const addTimelineEntry = useCallback((entry, target = 'main') => {
    const newEntry = {
      id: Date.now() + Math.random(),
      timestamp: formatTimestamp(),
      ...entry,
    }

    if (target === 'retry') {
      setRetryTimeline((prev) => [...prev, newEntry])
    } else if (target === 'combined') {
      setCombinedTimeline((prev) => [...prev, newEntry])
    } else {
      setTimeline((prev) => [...prev, newEntry])
    }
  }, [])

  const handleConfigChange = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleRetryConfigChange = useCallback((key, value) => {
    setRetryConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateMetrics = useCallback(() => {
    setMetrics((prev) => ({
      ...prev,
      activePollsCount: getActivePolls().length,
    }))
  }, [])

  useEffect(() => {
    const interval = setInterval(updateMetrics, 500)
    return () => clearInterval(interval)
  }, [updateMetrics])

  const createPollFn = useCallback(() => {
    if (!mockClientRef.current) {
      mockClientRef.current = createMockFetchClient({
        successRate: config.successRate,
        responseDelayMs: 100,
        pollProgress: (callCount, successfulCalls) => {
          const progress = Math.min((successfulCalls / 5) * 100, 100)
          pollProgressRef.current = { callCount, progress }
          if (progress >= 100) {
            return { done: true, value: { progress: 100, status: 'completed' } }
          }
          return { done: false, value: { progress, callCount } }
        },
      })
    }

    mockClientRef.current.state.successRate = config.successRate

    let attemptCount = 0

    return async () => {
      attemptCount++
      const startTime = Date.now()

      try {
        const response = await mockClientRef.current.fetch('/api/status', {
          method: 'GET',
        })
        const data = await response.json()
        const duration = Date.now() - startTime

        addTimelineEntry({
          attempt: attemptCount,
          type: 'poll',
          success: response.ok,
          httpStatus: response.status,
          duration,
          message: response.ok ? `Progress: ${data.data?.progress || 0}%` : `HTTP ${response.status}`,
        })

        setMetrics((prev) => ({
          ...prev,
          totalAttempts: prev.totalAttempts + 1,
          successCount: prev.successCount + (response.ok ? 1 : 0),
          failCount: prev.failCount + (response.ok ? 0 : 1),
        }))

        return {
          done: data.done || false,
          value: data,
        }
      } catch (error) {
        const duration = Date.now() - startTime

        addTimelineEntry({
          attempt: attemptCount,
          type: 'poll',
          success: false,
          duration,
          message: error.message,
        })

        setMetrics((prev) => ({
          ...prev,
          totalAttempts: prev.totalAttempts + 1,
          failCount: prev.failCount + 1,
        }))

        throw error
      }
    }
  }, [config, addTimelineEntry])

  const handleStartPoll = useCallback(async () => {
    if (isRunning) return

    setIsRunning(true)
    setPollResult(null)
    setTimeline([])
    pollProgressRef.current = { callCount: 0, progress: 0 }
    if (mockClientRef.current) {
      mockClientRef.current.reset()
    }

    const fn = createPollFn()

    try {
      pollRef.current = pollUntilDoneOrTimeout(fn, {
        intervalMs: config.intervalMs,
        jitterRatio: config.jitterRatio,
        maxAttempts: config.maxAttempts,
        isImmediate: config.isImmediate,
        backoffFactor: config.backoffFactor,
        maxIntervalMs: 10000,
        minIntervalMs: 100,
        pauseOnHidden: config.pauseOnHidden,
        timeoutMs: config.timeoutMs,
      })

      const result = await pollRef.current

      setPollResult({
        status: 'success',
        value: result,
      })
    } catch (error) {
      if (isAbortError(error)) {
        setPollResult({
          status: 'cancelled',
          error,
        })
      } else {
        setPollResult({
          status: 'error',
          error,
        })
      }
    } finally {
      setIsRunning(false)
      pollRef.current = null
    }
  }, [isRunning, config, createPollFn])

  const handleStopPoll = useCallback(() => {
    if (pollRef.current && pollRef.current.cancel) {
      pollRef.current.cancel()
    }
  }, [])

  const handleStartRetry = useCallback(async () => {
    if (isRetrying) return

    setIsRetrying(true)
    setRetryResult(null)
    setRetryTimeline([])

    let attemptCount = 0

    try {
      retryRef.current = retry(async ({ attempt }) => {
        attemptCount++
        const startTime = Date.now()

        const shouldSucceed = Math.random() < retryConfig.successRate
        await new Promise((resolve) => setTimeout(resolve, 100))

        let httpStatus
        let success

        if (retryConfig.inject503) {
          success = false
          httpStatus = 503
        } else {
          success = shouldSucceed
          httpStatus = success ? 200 : 500
        }

        const duration = Date.now() - startTime

        addTimelineEntry({
          attempt: attemptCount,
          type: 'retry',
          success,
          retry: !success && attemptCount <= retryConfig.retries,
          httpStatus,
          duration,
          message: success ? '操作成功' : 
                   httpStatus === 503 ? `503 Service Unavailable (Retry-After: ${retryConfig.retryAfterSeconds}s)` :
                   `HTTP ${httpStatus}`,
        }, 'retry')

        if (!success) {
          const error = new Error(`HTTP ${httpStatus}`)
          error.status = httpStatus
          
          if (httpStatus === 503) {
            error.response = {
              headers: {
                get: (name) => name.toLowerCase() === 'retry-after' ? String(retryConfig.retryAfterSeconds) : null,
              },
            }
          }
          
          throw error
        }

        return {
          status: 'ok',
          data: { message: 'Success on attempt ' + attempt },
        }
      }, {
        retries: retryConfig.retries,
        delayMs: retryConfig.delayMs,
        backoffFactor: retryConfig.backoffFactor,
        maxDelayMs: retryConfig.maxDelayMs,
        retryOn: [408, 429, 500, 502, 503, 504],
        jitterRatio: 0.1,
      })

      const result = retryRef.current
      retryRef.current = null

      setRetryResult({
        status: 'success',
        attempts: result.attempts,
        value: result.result,
      })
    } catch (error) {
      if (isAbortError(error)) {
        setRetryResult({
          status: 'cancelled',
          attempts: attemptCount,
          error,
        })
      } else {
        setRetryResult({
          status: 'error',
          attempts: attemptCount,
          error,
        })
      }
    } finally {
      setIsRetrying(false)
      retryRef.current = null
    }
  }, [isRetrying, retryConfig, addTimelineEntry])

  const handleStopRetry = useCallback(() => {
    if (retryRef.current && retryRef.current.cancel) {
      retryRef.current.cancel()
    }
  }, [])

  const handleRunCombined = useCallback(async () => {
    if (isCombinedRunning) return

    setIsCombinedRunning(true)
    setCombinedResult(null)
    setCombinedTimeline([])

    let counter = 0
    const maxIterations = 5

    try {
      combinedRef.current = pollUntilDoneOrTimeout(async () => {
        counter++
        const startTime = Date.now()

        const success = counter >= 3
        await new Promise((resolve) => setTimeout(resolve, 200))
        const duration = Date.now() - startTime

        addTimelineEntry({
          attempt: counter,
          type: 'combined',
          success,
          duration,
          message: success ? '轮询完成' : `进度 ${counter}/${maxIterations}`,
        }, 'combined')

        return {
          done: success,
          value: {
            iteration: counter,
            status: success ? 'completed' : 'pending',
          },
        }
      }, {
        intervalMs: 500,
        jitterRatio: 0,
        maxAttempts: 10,
        isImmediate: true,
        timeoutMs: 10000,
      })

      const result = combinedRef.current
      combinedRef.current = null

      setCombinedResult({
        status: 'success',
        value: result,
      })
    } catch (error) {
      if (error && error.errorCode === ERROR_CODES.TIMEOUT) {
        setCombinedResult({
          status: 'timeout',
          error,
        })
      } else if (isAbortError(error)) {
        setCombinedResult({
          status: 'cancelled',
          error,
        })
      } else {
        setCombinedResult({
          status: 'error',
          error,
        })
      }
    } finally {
      setIsCombinedRunning(false)
      combinedRef.current = null
    }
  }, [isCombinedRunning, addTimelineEntry])

  const handleStopCombined = useCallback(() => {
    if (combinedRef.current && combinedRef.current.cancel) {
      combinedRef.current.cancel()
    }
  }, [])

  const tabs = [
    { id: 'poll', label: '轮询演示' },
    { id: 'retry', label: '重试演示' },
    { id: 'combined', label: '组合示例' },
  ]

  return (
    <div className="poll-retry-backoff-demo">
      <section className="tool-section">
        <div className="demo-header">
          <h2>轮询 + 重试 + 退避演示</h2>
          <p>
            可取消的轮询封装、指数退避重试、AbortSignal 集成、可观测性支持
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
          {activeTab === 'poll' && (
            <PollDemoPanel
              config={config}
              onConfigChange={handleConfigChange}
              mockClient={mockClientRef.current}
              onStartPoll={handleStartPoll}
              onStopPoll={handleStopPoll}
              isRunning={isRunning}
              pollResult={pollResult}
              timeline={timeline}
              metrics={metrics}
            />
          )}

          {activeTab === 'retry' && (
            <RetryDemoPanel
              retryConfig={retryConfig}
              onRetryConfigChange={handleRetryConfigChange}
              onStartRetry={handleStartRetry}
              onStopRetry={handleStopRetry}
              isRetrying={isRetrying}
              retryResult={retryResult}
              retryTimeline={retryTimeline}
              retryMetrics={{}}
            />
          )}

          {activeTab === 'combined' && (
            <CombinedDemoPanel
              onRunCombined={handleRunCombined}
              onStopCombined={handleStopCombined}
              isCombinedRunning={isCombinedRunning}
              combinedResult={combinedResult}
              combinedTimeline={combinedTimeline}
            />
          )}
        </div>
      </section>
    </div>
  )
}

export default PollRetryBackoffDemo
