import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  RequestQueue,
  QueuePersistence,
  createPersistenceMiddleware,
  NETWORK_STATES,
} from './logic'
import NetworkStatusBadge from './NetworkStatusBadge'
import RequestItem from './RequestItem'
import EventLog from './EventLog'
import './NetworkResilienceQueueUI.css'

const NetworkResilienceQueueDemo = () => {
  const queueRef = useRef(null)
  const persistenceRef = useRef(null)
  const middlewareRef = useRef(null)

  const [queue, setQueue] = useState([])
  const [networkState, setNetworkState] = useState(NETWORK_STATES.ONLINE)
  const [networkConfidence, setNetworkConfidence] = useState(80)
  const [events, setEvents] = useState([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false)

  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://httpbin.org/get')
  const [priority, setPriority] = useState(5)
  const [simulatedJitter, setSimulatedJitter] = useState(0)
  const [simulateOfflineMode, setSimulateOfflineMode] = useState(false)

  const addEvent = useCallback((type, message) => {
    setEvents((prev) => [
      ...prev.slice(-100),
      { type, message, timestamp: Date.now() },
    ])
  }, [])

  useEffect(() => {
    queueRef.current = new RequestQueue({
      maxConcurrency: 2,
      backoff: {
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        factor: 2,
        jitterRatio: 0.5,
        maxRetries: 3,
      },
    })

    persistenceRef.current = new QueuePersistence({
      storageKey: 'demo_queue_snapshot',
      maxSizeBytes: 100 * 1024,
      enabled: false,
    })

    const updateQueueState = () => {
      if (queueRef.current) {
        setQueue([...queueRef.current.getQueue()])
      }
    }

    const queueEvents = [
      'enqueued', 'cancelled', 'requestStarted', 'requestCompleted',
      'requestFailed', 'requestRetrying',
    ]

    queueEvents.forEach((event) => {
      queueRef.current.on(event, (data) => {
        addEvent(event, `ID: ${data.id || data.result?.id} - ${data.url || JSON.stringify(data.error || {})}`)
        updateQueueState()
      })
    })

    queueRef.current.on('networkStateChanged', (result) => {
      setNetworkState(result.state)
      setNetworkConfidence(result.confidence)
      addEvent('networkChanged', `状态变为: ${result.state}`)
    })

    return () => {
      if (middlewareRef.current) {
        middlewareRef.current.dispose()
      }
      if (queueRef.current) {
        queueRef.current.dispose()
      }
    }
  }, [addEvent])

  useEffect(() => {
    if (!persistenceRef.current || !queueRef.current) return

    if (isPersistenceEnabled) {
      persistenceRef.current.setEnabled(true)
      middlewareRef.current = createPersistenceMiddleware(
        queueRef.current,
        persistenceRef.current
      )
      const loadedCount = middlewareRef.current.loadStoredQueue()
      if (loadedCount > 0) {
        addEvent('persistence', `从本地存储恢复了 ${loadedCount} 个请求`)
      }
    } else {
      if (middlewareRef.current) {
        middlewareRef.current.dispose()
        middlewareRef.current = null
      }
      persistenceRef.current.setEnabled(false)
      persistenceRef.current.clear()
    }
  }, [isPersistenceEnabled, addEvent])

  useEffect(() => {
    if (!queueRef.current) return
    const interval = setInterval(() => {
      setQueue([...queueRef.current.getQueue()])
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const toggleNetworkMonitoring = () => {
    if (!queueRef.current) return
    if (isMonitoring) {
      queueRef.current.stopNetworkMonitoring()
      setIsMonitoring(false)
      addEvent('monitoring', '网络监控已停止')
    } else {
      queueRef.current.startNetworkMonitoring()
      setIsMonitoring(true)
      addEvent('monitoring', '网络监控已启动')
    }
  }

  const simulateOffline = () => {
    window.dispatchEvent(new Event('offline'))
    setSimulateOfflineMode(true)
    addEvent('simulate', '触发离线事件')
  }

  const simulateOnline = () => {
    window.dispatchEvent(new Event('online'))
    setSimulateOfflineMode(false)
    addEvent('simulate', '触发在线事件')
  }

  const enqueueRequest = () => {
    if (!queueRef.current) return

    const finalUrl = simulatedJitter > 0
      ? `${url}?jitter=${Math.random()}`
      : url

    const requestId = queueRef.current.enqueue({
      method,
      url: finalUrl,
      priority: parseInt(priority, 10),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    addEvent('enqueue', `请求已入队: ${method} ${finalUrl}`)
  }

  const cancelRequest = (requestId) => {
    if (!queueRef.current) return
    queueRef.current.cancel(requestId)
  }

  const clearQueue = () => {
    if (!queueRef.current) return
    queueRef.current.clear()
    setQueue([])
    addEvent('clear', '队列已清空')
  }

  const clearEvents = () => {
    setEvents([])
  }

  const formatTimeUntil = (timestamp) => {
    const now = Date.now()
    const diff = timestamp - now
    if (diff <= 0) return '即将'
    if (diff < 1000) return `${diff}ms`
    return `${(diff / 1000).toFixed(1)}s`
  }

  const stats = queueRef.current?.getStats() || { total: 0, queued: 0, running: 0 }

  return (
    <div className="network-resilience-container">
      <h1>网络弹性请求队列演示</h1>

      <div className="network-status-panel">
        <h2>网络状态</h2>
        <NetworkStatusBadge
          networkState={networkState}
          confidence={networkConfidence}
          confidenceBreakdown
        />
        <div className="network-info">
          <p>
            <strong>浏览器在线状态:</strong> {navigator.onLine ? '是' : '否'}
            {simulateOfflineMode && ' (模拟离线)'}
          </p>
          {navigator.connection && (
            <p>
              <strong>网络类型:</strong> {navigator.connection.effectiveType || '未知'} |
              <strong>下行:</strong> {navigator.connection.downlink || 'N/A'} Mbps |
              <strong>RTT:</strong> {navigator.connection.rtt || 'N/A'} ms
            </p>
          )}
        </div>
      </div>

      <div className="control-panel">
        <button
          className={`btn ${isMonitoring ? 'btn-success' : 'btn-primary'}`}
          onClick={toggleNetworkMonitoring}
        >
          {isMonitoring ? '停止监控' : '启动网络监控'}
        </button>
        <button className="btn btn-warning" onClick={simulateOffline}>
          模拟离线
        </button>
        <button className="btn btn-success" onClick={simulateOnline}>
          模拟在线
        </button>
        <button
          className={`btn ${isPersistenceEnabled ? 'btn-success' : 'btn-secondary'}`}
          onClick={() => setIsPersistenceEnabled(!isPersistenceEnabled)}
        >
          {isPersistenceEnabled ? '禁用' : '启用'}持久化
        </button>
      </div>

      <div className="demo-section">
        <h3>发送测试请求</h3>
        <div className="request-form">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
          </select>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ width: '300px' }}
            placeholder="请求 URL"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
              <option key={p} value={p}>优先级 {p}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={enqueueRequest}>
            入队
          </button>
        </div>
        <div className="simulate-controls">
          <label className="jitter-slider">
            延迟抖动:
            <input
              type="range"
              min="0"
              max="10"
              value={simulatedJitter}
              onChange={(e) => setSimulatedJitter(parseInt(e.target.value, 10))}
            />
            {simulatedJitter > 0 ? `${simulatedJitter}x` : '关闭'}
          </label>
        </div>
      </div>

      <div className="queue-panel">
        <div className="queue-header">
          <h3>请求队列</h3>
          <div className="queue-stats">
            <span className="stat-item">
              总数: <span className="stat-value">{stats.total}</span>
            </span>
            <span className="stat-item">
              排队中: <span className="stat-value">{stats.queued}</span>
            </span>
            <span className="stat-item">
              运行中: <span className="stat-value">{stats.running}</span>
            </span>
          </div>
          <button className="btn btn-danger" onClick={clearQueue}>
            清空队列
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="empty-state">
            队列为空 - 点击"入队"按钮添加测试请求
          </div>
        ) : (
          <div className="request-list">
            {queue.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                onCancel={cancelRequest}
                formatTimeUntil={formatTimeUntil}
              />
            ))}
          </div>
        )}
      </div>

      <div className="demo-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>事件日志</h3>
          <button className="btn btn-secondary" onClick={clearEvents}>
            清空日志
          </button>
        </div>
        <EventLog events={events} />
      </div>
    </div>
  )
}

export default NetworkResilienceQueueDemo
