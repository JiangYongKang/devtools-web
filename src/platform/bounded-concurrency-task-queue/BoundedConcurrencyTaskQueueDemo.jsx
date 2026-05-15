import React, { useCallback, useEffect, useRef, useState } from 'react'
import './BoundedConcurrencyTaskQueue.css'
import {
  createFetchTask,
  createPool,
  createPrimeSearchTask,
  EVENT_TYPES,
  OVERFLOW_STRATEGIES,
} from './logic/index.js'

function BoundedConcurrencyTaskQueueDemo() {
  const [config, setConfig] = useState({
    concurrency: 4,
    maxQueueSize: 20,
    overflowStrategy: OVERFLOW_STRATEGIES.BLOCK,
    taskTimeout: 5000,
    taskCount: 10,
    taskMinDelay: 200,
    taskMaxDelay: 2000,
    fairRateLimit: false,
    fairRateLimitPerSource: 5,
    fairRateLimitWindow: 1000,
  })

  const [metrics, setMetrics] = useState({
    running: 0,
    waiting: 0,
    completed: 0,
    failed: 0,
    timeout: 0,
    cancelled: 0,
    dropped: 0,
    totalEnqueued: 0,
  })

  const [runningTasks, setRunningTasks] = useState([])
  const [waitingTasks, setWaitingTasks] = useState([])
  const [eventLog, setEventLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  const poolRef = useRef(null)
  const logContainerRef = useRef(null)

  useEffect(() => {
    poolRef.current = createPool({
      concurrency: config.concurrency,
      maxQueueSize: config.maxQueueSize,
      overflowStrategy: config.overflowStrategy,
      taskTimeout: config.taskTimeout,
      fairRateLimit: config.fairRateLimit,
      fairRateLimitPerSource: config.fairRateLimitPerSource,
      fairRateLimitWindow: config.fairRateLimitWindow,
    })

    const unsubscribeList = [
      poolRef.current.on(EVENT_TYPES.TASK_ENQUEUED, handleEvent),
      poolRef.current.on(EVENT_TYPES.TASK_STARTED, handleEvent),
      poolRef.current.on(EVENT_TYPES.TASK_COMPLETED, handleEvent),
      poolRef.current.on(EVENT_TYPES.TASK_FAILED, handleEvent),
      poolRef.current.on(EVENT_TYPES.TASK_CANCELLED, handleEvent),
      poolRef.current.on(EVENT_TYPES.TASK_TIMEOUT, handleEvent),
      poolRef.current.on(EVENT_TYPES.TASK_DROPPED, handleEvent),
    ]

    return () => {
      unsubscribeList.forEach((unsub) => unsub())
      poolRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (poolRef.current) {
      poolRef.current.setConcurrency(config.concurrency)
    }
  }, [config.concurrency])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [eventLog])

  useEffect(() => {
    const interval = setInterval(() => {
      if (poolRef.current) {
        setMetrics(poolRef.current.getMetrics())
        setRunningTasks(poolRef.current.getRunningTasks())
        setWaitingTasks(poolRef.current.getWaitingTasks())
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const handleEvent = useCallback((event) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    const eventType = event.type?.split(':')[1] || event.type

    setEventLog((prev) => [
      ...prev.slice(-199),
      {
        id: Date.now() + Math.random(),
        timestamp,
        type: eventType,
        label: event.label || event.taskId || 'unknown',
        metadata: event.metadata,
      },
    ])
  }, [])

  const handleConfigChange = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))

    if (key === 'concurrency' && poolRef.current) {
      poolRef.current.setConcurrency(value)
    }
  }, [])

  const createRandomTask = useCallback(() => {
    const delay = Math.floor(Math.random() * (config.taskMaxDelay - config.taskMinDelay) + config.taskMinDelay)
    const shouldFail = Math.random() < 0.1

    if (Math.random() < 0.3) {
      return {
        task: createPrimeSearchTask(Math.floor(Math.random() * 50000 + 10000)),
        label: `质数筛选 ${delay}ms`,
        type: 'cpu',
      }
    }

    return {
      task: createFetchTask('/api/data', delay, shouldFail),
      label: `API请求 ${delay}ms`,
      type: 'io',
    }
  }, [config])

  const handleStartBatch = useCallback(async () => {
    if (!poolRef.current || isRunning) return

    setIsRunning(true)

    const tasks = []
    for (let i = 0; i < config.taskCount; i++) {
      const taskData = createRandomTask()
      const priority = Math.floor(Math.random() * 10)
      tasks.push(
        poolRef.current.enqueue(taskData.task, {
          label: `任务 ${i + 1}: ${taskData.label}`,
          metadata: { index: i, type: taskData.type, priority },
          priority,
          source: config.fairRateLimit ? 'demo-source' : null,
        })
      )
    }

    try {
      await Promise.allSettled(tasks)
    } finally {
      setIsRunning(false)
    }
  }, [config, isRunning, createRandomTask])

  const handleClearQueue = useCallback(() => {
    poolRef.current?.clear()
  }, [])

  const handleClearLog = useCallback(() => {
    setEventLog([])
  }, [])

  const handleDrain = useCallback(async () => {
    await poolRef.current?.drain()
  }, [])

  const handleCancelTask = useCallback((taskId) => {
    poolRef.current?.cancelTask(taskId)
  }, [])

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const maxBarValue = Math.max(metrics.running, metrics.waiting, metrics.completed, metrics.failed, 1)

  return (
    <div className='concurrency-demo'>
      <div className='demo-header'>
        <h1>通用并发任务池演示</h1>
        <p>支持优先级、取消、超时、溢出策略、公平限流的异步任务调度系统</p>
      </div>

      <div className='demo-grid'>
        <div className='control-panel'>
          <div className='control-section'>
            <h3>池配置</h3>

            <div className='control-group'>
              <label>
                并发数: <span className='value-display'>{config.concurrency}</span>
              </label>
              <input
                type='range'
                min='1'
                max='16'
                value={config.concurrency}
                onChange={(e) => handleConfigChange('concurrency', Number(e.target.value))}
              />
            </div>

            <div className='control-group'>
              <label>
                队列最大长度: <span className='value-display'>{config.maxQueueSize}</span>
              </label>
              <input
                type='range'
                min='5'
                max='100'
                value={config.maxQueueSize}
                onChange={(e) => handleConfigChange('maxQueueSize', Number(e.target.value))}
              />
            </div>

            <div className='control-group'>
              <label>溢出策略</label>
              <select
                value={config.overflowStrategy}
                onChange={(e) => handleConfigChange('overflowStrategy', e.target.value)}
              >
                <option value={OVERFLOW_STRATEGIES.BLOCK}>阻塞等待</option>
                <option value={OVERFLOW_STRATEGIES.DROP_OLDEST}>丢弃最旧</option>
                <option value={OVERFLOW_STRATEGIES.REJECT}>拒绝新任务</option>
              </select>
            </div>

            <div className='control-group'>
              <label>
                任务超时 (ms): <span className='value-display'>{config.taskTimeout}</span>
              </label>
              <input
                type='number'
                min='0'
                max='60000'
                step='500'
                value={config.taskTimeout}
                onChange={(e) => handleConfigChange('taskTimeout', Number(e.target.value))}
              />
            </div>

            <div className='control-group checkbox-wrapper'>
              <input
                type='checkbox'
                id='fairRateLimit'
                checked={config.fairRateLimit}
                onChange={(e) => handleConfigChange('fairRateLimit', e.target.checked)}
              />
              <label htmlFor='fairRateLimit'>启用公平限流</label>
            </div>

            {config.fairRateLimit && (
              <>
                <div className='control-group'>
                  <label>
                    单来源限制: <span className='value-display'>{config.fairRateLimitPerSource}</span>
                  </label>
                  <input
                    type='number'
                    min='1'
                    max='100'
                    value={config.fairRateLimitPerSource}
                    onChange={(e) => handleConfigChange('fairRateLimitPerSource', Number(e.target.value))}
                  />
                </div>
                <div className='control-group'>
                  <label>
                    窗口 (ms): <span className='value-display'>{config.fairRateLimitWindow}</span>
                  </label>
                  <input
                    type='number'
                    min='100'
                    max='10000'
                    step='100'
                    value={config.fairRateLimitWindow}
                    onChange={(e) => handleConfigChange('fairRateLimitWindow', Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>

          <div className='control-section'>
            <h3>批量任务</h3>

            <div className='control-group'>
              <label>
                任务数量: <span className='value-display'>{config.taskCount}</span>
              </label>
              <input
                type='range'
                min='1'
                max='50'
                value={config.taskCount}
                onChange={(e) => handleConfigChange('taskCount', Number(e.target.value))}
              />
            </div>

            <div className='control-group'>
              <label>
                最小延迟 (ms): <span className='value-display'>{config.taskMinDelay}</span>
              </label>
              <input
                type='number'
                min='50'
                max='5000'
                step='50'
                value={config.taskMinDelay}
                onChange={(e) => handleConfigChange('taskMinDelay', Number(e.target.value))}
              />
            </div>

            <div className='control-group'>
              <label>
                最大延迟 (ms): <span className='value-display'>{config.taskMaxDelay}</span>
              </label>
              <input
                type='number'
                min='100'
                max='10000'
                step='100'
                value={config.taskMaxDelay}
                onChange={(e) => handleConfigChange('taskMaxDelay', Number(e.target.value))}
              />
            </div>
          </div>

          <div className='control-section'>
            <h3>操作</h3>

            <div className='button-group'>
              <button className='demo-btn primary' onClick={handleStartBatch} disabled={isRunning}>
                {isRunning ? '运行中...' : '提交批量任务'}
              </button>
              <button className='demo-btn outline' onClick={handleClearQueue}>
                清空队列
              </button>
              <button className='demo-btn outline' onClick={handleDrain}>
                等待排空
              </button>
            </div>
          </div>
        </div>

        <div className='main-panel'>
          <div className='metrics-section'>
            <div className='metric-card running'>
              <span className='metric-label'>运行中</span>
              <span className='metric-value'>{metrics.running}</span>
            </div>
            <div className='metric-card waiting'>
              <span className='metric-label'>等待中</span>
              <span className='metric-value'>{metrics.waiting}</span>
            </div>
            <div className='metric-card completed'>
              <span className='metric-label'>已完成</span>
              <span className='metric-value'>{metrics.completed}</span>
            </div>
            <div className='metric-card'>
              <span className='metric-label'>失败</span>
              <span className='metric-value'>{metrics.failed}</span>
            </div>
            <div className='metric-card timeout'>
              <span className='metric-label'>超时</span>
              <span className='metric-value'>{metrics.timeout}</span>
            </div>
            <div className='metric-card'>
              <span className='metric-label'>已取消</span>
              <span className='metric-value'>{metrics.cancelled}</span>
            </div>
          </div>

          <div className='chart-section'>
            <h3 className='chart-title'>任务状态分布图</h3>
            <div className='bar-chart'>
              <div className='bar-item'>
                <div className='bar running' style={{ height: `${(metrics.running / maxBarValue) * 100}%` }} />
                <span className='bar-value'>{metrics.running}</span>
                <span className='bar-label'>运行</span>
              </div>
              <div className='bar-item'>
                <div className='bar waiting' style={{ height: `${(metrics.waiting / maxBarValue) * 100}%` }} />
                <span className='bar-value'>{metrics.waiting}</span>
                <span className='bar-label'>等待</span>
              </div>
              <div className='bar-item'>
                <div className='bar completed' style={{ height: `${(metrics.completed / maxBarValue) * 100}%` }} />
                <span className='bar-value'>{metrics.completed}</span>
                <span className='bar-label'>完成</span>
              </div>
              <div className='bar-item'>
                <div className='bar failed' style={{ height: `${(metrics.failed / maxBarValue) * 100}%` }} />
                <span className='bar-value'>{metrics.failed}</span>
                <span className='bar-label'>失败</span>
              </div>
            </div>
          </div>

          <div className='tasks-section'>
            <h3 className='chart-title'>当前任务</h3>
            <div className='tasks-grid'>
              <div>
                <h4 className='task-section-title'>运行中 ({runningTasks.length})</h4>
                <div className='task-list'>
                  {runningTasks.length === 0 ? (
                    <div className='empty-state'>暂无运行中的任务</div>
                  ) : (
                    runningTasks.map((task) => (
                      <div key={task.id} className='task-item running'>
                        <div className='task-info'>
                          <div className='task-name'>{task.label}</div>
                          <div className='task-meta'>优先级: {task.metadata?.priority ?? '-'}</div>
                        </div>
                        <div className='task-duration'>{formatDuration(task.duration)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className='task-section-title'>等待中 ({waitingTasks.length})</h4>
                <div className='task-list'>
                  {waitingTasks.length === 0 ? (
                    <div className='empty-state'>暂无等待中的任务</div>
                  ) : (
                    waitingTasks.map((task) => (
                      <div key={task.id} className='task-item waiting'>
                        <div className='task-info'>
                          <div className='task-name'>{task.label}</div>
                          <div className='task-meta'>优先级: {task.priority ?? '-'}</div>
                        </div>
                        <button
                          className='cancel-task-btn'
                          onClick={() => handleCancelTask(task.id)}
                          title='取消任务'
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className='log-section'>
            <div className='log-header'>
              <h3 className='chart-title' style={{ margin: 0 }}>事件日志</h3>
              <button className='demo-btn outline' style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleClearLog}>
                清空日志
              </button>
            </div>
            <div className='log-container' ref={logContainerRef}>
              {eventLog.length === 0 ? (
                <div className='empty-state'>暂无事件记录，点击「提交批量任务」开始演示</div>
              ) : (
                eventLog.map((entry) => (
                  <div key={entry.id} className={`log-entry ${entry.type || ''}`}>
                    <span className='log-time'>{entry.timestamp}</span>
                    <span className='log-type'>{entry.type?.toUpperCase()}</span>
                    <span className='log-label'>{entry.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BoundedConcurrencyTaskQueueDemo
