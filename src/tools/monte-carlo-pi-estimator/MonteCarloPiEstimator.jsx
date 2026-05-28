import { useCallback, useEffect, useRef, useState } from 'react'
import './MonteCarloPiEstimator.css'
import {
  estimatePi,
  estimatePiBuffon,
  standardErrorPi,
  confidenceInterval,
  containsTruePi,
  absoluteError,
  generateConvergencePoints,
  computeConvergenceStats,
  generateCSV,
  downloadCSV,
  formatNumber,
  formatLargeNumber,
  estimateRequiredSampleSize,
  checkSampleSizeSafety,
  EXAMPLES,
  METHOD_LABELS,
  CONFIDENCE_OPTIONS,
  WORKER_COUNT_OPTIONS,
  DEFAULT_CONFIG,
  createRandomGenerator,
  compareVarianceReduction,
  getFixedSeeds,
  mergeWorkerResults,
} from './logic/index.js'

function MonteCarloPiEstimator() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState(null)
  const [convergenceData, setConvergenceData] = useState([])
  const [progress, setProgress] = useState(0)
  const [samplesPerSecond, setSamplesPerSecond] = useState(0)
  const [toast, setToast] = useState(null)
  const [varianceComparison, setVarianceComparison] = useState(null)
  const [activeWorkers, setActiveWorkers] = useState(0)
  const [activeExampleId, setActiveExampleId] = useState(null)

  const chartRef = useRef(null)
  const scatterRef = useRef(null)
  const workersRef = useRef([])
  const startTimeRef = useRef(null)
  const resultsRef = useRef({ totalN: 0, totalHits: 0, history: [] })
  const chartDrawTimerRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const handleLoadExample = useCallback((example) => {
    setConfig(example.config)
    setActiveExampleId(example.id)
    setResults(null)
    setConvergenceData([])
    setVarianceComparison(null)
  }, [])

  const terminateWorkers = useCallback(() => {
    workersRef.current.forEach((w) => {
      try {
        w.worker.terminate()
      } catch (e) {
        // ignore
      }
    })
    workersRef.current = []
    setActiveWorkers(0)
  }, [])

  const handleStop = useCallback(() => {
    terminateWorkers()
    setIsRunning(false)
    showToast('采样已停止', 'success')
  }, [terminateWorkers, showToast])

  const handleClear = useCallback(() => {
    terminateWorkers()
    setIsRunning(false)
    setResults(null)
    setConvergenceData([])
    setVarianceComparison(null)
    setProgress(0)
    setSamplesPerSecond(0)
    resultsRef.current = { totalN: 0, totalHits: 0, history: [] }
  }, [terminateWorkers])

  const drawConvergenceChart = useCallback(() => {
    const canvas = chartRef.current
    if (!canvas || convergenceData.length === 0) return

    const container = canvas.parentElement
    if (!container) return

    const displayWidth = container.clientWidth
    const displayHeight = container.clientHeight
    if (displayWidth === 0 || displayHeight === 0) return

    const dpr = window.devicePixelRatio || 1

    canvas.style.width = displayWidth + 'px'
    canvas.style.height = displayHeight + 'px'
    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const width = displayWidth
    const height = displayHeight
    const padding = { top: 40, right: 20, bottom: 50, left: 70 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    if (chartWidth <= 0 || chartHeight <= 0) return

    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = '#fafafa'
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight)

    const data = convergenceData
    const maxN = data[data.length - 1].n
    const minN = data[0].n
    const logMin = Math.log10(Math.max(1, minN))
    const logMax = Math.log10(maxN)
    const logRange = logMax - logMin || 1

    const errorsFromCenter = [
      ...data.map((d) => Math.abs(d.ciUpper - Math.PI)),
      ...data.map((d) => Math.abs(Math.PI - d.ciLower)),
      ...data.map((d) => d.error),
    ]
    const maxError = Math.max(...errorsFromCenter, 0.1)

    const xScale = (n) => padding.left + ((Math.log10(n) - logMin) / logRange) * chartWidth
    const yScale = (err) => padding.top + chartHeight - (err / maxError) * chartHeight

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1

    const xTicks = [10, 100, 1000, 10000, 100000, 1000000, 10000000].filter(
      (t) => t >= minN && t <= maxN
    )
    xTicks.forEach((tick) => {
      const x = xScale(tick)
      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, padding.top + chartHeight)
      ctx.stroke()

      ctx.fillStyle = '#64748b'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(formatLargeNumber(tick), x, padding.top + chartHeight + 20)
    })

    const yTicks = [0, maxError * 0.25, maxError * 0.5, maxError * 0.75, maxError]
    yTicks.forEach((tick) => {
      const y = yScale(tick)
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()

      ctx.fillStyle = '#64748b'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(tick.toFixed(4), padding.left - 10, y + 4)
    })

    ctx.fillStyle = 'rgba(74, 144, 217, 0.15)'
    ctx.beginPath()
    ctx.moveTo(xScale(data[0].n), yScale(data[0].ciUpper - Math.PI))
    data.forEach((d) => {
      ctx.lineTo(xScale(d.n), yScale(d.ciUpper - Math.PI))
    })
    data.slice().reverse().forEach((d) => {
      ctx.lineTo(xScale(d.n), yScale(Math.PI - d.ciLower))
    })
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = 'rgba(74, 144, 217, 0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    data.forEach((d, i) => {
      const y = yScale(d.ciUpper - Math.PI)
      if (i === 0) ctx.moveTo(xScale(d.n), y)
      else ctx.lineTo(xScale(d.n), y)
    })
    ctx.stroke()
    ctx.beginPath()
    data.forEach((d, i) => {
      const y = yScale(Math.PI - d.ciLower)
      if (i === 0) ctx.moveTo(xScale(d.n), y)
      else ctx.lineTo(xScale(d.n), y)
    })
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = '#e53e3e'
    ctx.lineWidth = 2
    ctx.beginPath()
    data.forEach((d, i) => {
      const y = yScale(d.error)
      if (i === 0) ctx.moveTo(xScale(d.n), y)
      else ctx.lineTo(xScale(d.n), y)
    })
    ctx.stroke()

    ctx.fillStyle = '#e53e3e'
    const lastPoint = data[data.length - 1]
    ctx.beginPath()
    ctx.arc(xScale(lastPoint.n), yScale(lastPoint.error), 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#1a1a1a'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('样本量 N (对数刻度)', width / 2, height - 10)

    ctx.save()
    ctx.translate(15, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('|π̂ − π| 绝对误差', 0, 0)
    ctx.restore()

    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('收敛曲线：绝对误差与 95% 置信带', padding.left, 20)
  }, [convergenceData])

  const drawScatterPlot = useCallback(() => {
    const canvas = scatterRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const displaySize = Math.min(container.clientWidth, container.clientHeight, 300)
    if (displaySize <= 0) return

    const dpr = window.devicePixelRatio || 1

    canvas.style.width = displaySize + 'px'
    canvas.style.height = displaySize + 'px'
    canvas.width = displaySize * dpr
    canvas.height = displaySize * dpr

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const size = displaySize
    ctx.clearRect(0, 0, size, size)

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, size, size)

    ctx.strokeStyle = '#4a90d9'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
    ctx.stroke()

    if (results && results.samplePoints) {
      const scale = (v) => (v + 1) * (size / 2 - 4) + 4
      results.samplePoints.forEach((point) => {
        ctx.fillStyle = point.hit ? '#38a169' : '#e53e3e'
        ctx.beginPath()
        ctx.arc(scale(point.x), scale(point.y), 2, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }, [results])

  useEffect(() => {
    if (chartDrawTimerRef.current) {
      cancelAnimationFrame(chartDrawTimerRef.current)
    }
    chartDrawTimerRef.current = requestAnimationFrame(() => {
      drawConvergenceChart()
    })
    return () => {
      if (chartDrawTimerRef.current) {
        cancelAnimationFrame(chartDrawTimerRef.current)
      }
    }
  }, [convergenceData, drawConvergenceChart])

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      drawScatterPlot()
    })
    return () => cancelAnimationFrame(timer)
  }, [results, drawScatterPlot])

  const handleStart = useCallback(() => {
    const safety = checkSampleSizeSafety(config.totalSamples)
    if (!safety.safe) {
      showToast(safety.message, 'error')
      return
    }

    if (safety.message) {
      showToast(safety.message, 'success')
    }

    setIsRunning(true)
    setResults(null)
    setConvergenceData([])
    setVarianceComparison(null)
    setProgress(0)
    setSamplesPerSecond(0)
    startTimeRef.current = Date.now()
    resultsRef.current = { totalN: 0, totalHits: 0, history: [] }

    const seeds = getFixedSeeds()
    const workerCount = config.workerCount
    const samplesPerWorker = Math.ceil(config.totalSamples / workerCount)

    setActiveWorkers(workerCount)

    const convergencePoints = generateConvergencePoints(config.totalSamples, 50)
    let nextConvergenceIndex = 0

    const checkConvergencePoint = (totalN, totalHits) => {
      while (nextConvergenceIndex < convergencePoints.length && totalN >= convergencePoints[nextConvergenceIndex]) {
        const n = convergencePoints[nextConvergenceIndex]
        const piEstimate = config.method === 'buffon'
          ? estimatePiBuffon(totalHits, totalN, config.needleLength, config.lineSpacing)
          : estimatePi(totalHits, totalN)
        resultsRef.current.history.push({ n, hits: totalHits, piEstimate })
        nextConvergenceIndex++
      }
    }

    const updateConvergenceDisplay = () => {
      const stats = computeConvergenceStats(resultsRef.current.history, config.confidence)
      setConvergenceData(stats)
    }

    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(new URL('./pi-estimator.worker.js', import.meta.url), { type: 'module' })
      const taskId = `worker-${i}-${Date.now()}`

      worker.onmessage = (e) => {
        const { type, payload } = e.data

        if (type === 'progress') {
          const current = workersRef.current.find((w) => w.taskId === taskId)
          if (current) {
            current.processed = payload.processed
            current.hits = payload.hits
          }

          const allResults = workersRef.current.map((w) => ({
            n: w.processed || 0,
            hits: w.hits || 0,
          }))
          const merged = mergeWorkerResults(allResults)

          checkConvergencePoint(merged.totalN, merged.totalHits)
          updateConvergenceDisplay()

          const elapsed = (Date.now() - startTimeRef.current) / 1000
          setSamplesPerSecond(Math.round(merged.totalN / elapsed))
          setProgress(merged.totalN / config.totalSamples)

          const piEstimate = config.method === 'buffon'
            ? estimatePiBuffon(merged.totalHits, merged.totalN, config.needleLength, config.lineSpacing)
            : estimatePi(merged.totalHits, merged.totalN)
          const se = standardErrorPi(merged.totalHits, merged.totalN)
          const ci = confidenceInterval(piEstimate, se, config.confidence)

          setResults({
            totalN: merged.totalN,
            totalHits: merged.totalHits,
            piEstimate,
            standardError: se,
            ciLower: ci.lower,
            ciUpper: ci.upper,
            ciContainsPi: containsTruePi(ci),
            error: absoluteError(piEstimate),
            samplePoints: [],
          })
        }

        if (type === 'complete') {
          const current = workersRef.current.find((w) => w.taskId === taskId)
          if (current) {
            current.complete = true
            current.processed = payload.n
            current.hits = payload.hits
          }

          const allComplete = workersRef.current.every((w) => w.complete)
          if (allComplete) {
            const allResults = workersRef.current.map((w) => ({
              n: w.processed,
              hits: w.hits,
            }))
            const merged = mergeWorkerResults(allResults)

            const piEstimate = config.method === 'buffon'
              ? estimatePiBuffon(merged.totalHits, merged.totalN, config.needleLength, config.lineSpacing)
              : estimatePi(merged.totalHits, merged.totalN)
            const se = standardErrorPi(merged.totalHits, merged.totalN)
            const ci = confidenceInterval(piEstimate, se, config.confidence)

            const random = createRandomGenerator(config.seed)
            const samplePoints = []
            for (let j = 0; j < Math.min(500, merged.totalN); j++) {
              const x = random() * 2 - 1
              const y = random() * 2 - 1
              samplePoints.push({ x, y, hit: x * x + y * y <= 1 })
            }

            setResults({
              totalN: merged.totalN,
              totalHits: merged.totalHits,
              piEstimate,
              standardError: se,
              ciLower: ci.lower,
              ciUpper: ci.upper,
              ciContainsPi: containsTruePi(ci),
              error: absoluteError(piEstimate),
              samplePoints,
              requiredN: estimateRequiredSampleSize(0.001, config.confidence, merged.totalHits / merged.totalN),
            })

            const comparison = compareVarianceReduction(config.totalSamples, config.seed)
            setVarianceComparison(comparison)

            setIsRunning(false)
            setActiveWorkers(0)
            setProgress(1)
            showToast('采样完成！', 'success')
            terminateWorkers()
          }
        }

        if (type === 'cancelled') {
          const current = workersRef.current.find((w) => w.taskId === taskId)
          if (current) {
            current.cancelled = true
          }
        }
      }

      workersRef.current.push({
        worker,
        taskId,
        processed: 0,
        hits: 0,
        complete: false,
        cancelled: false,
      })

      worker.postMessage({
        type: 'start',
        taskId,
        payload: {
          method: config.method,
          n: samplesPerWorker,
          seed: seeds[i % seeds.length] + i * 1000,
          strata: config.strata,
          needleLength: config.needleLength,
          lineSpacing: config.lineSpacing,
        },
      })
    }
  }, [config, terminateWorkers, showToast])

  const runVarianceComparison = useCallback(() => {
    const comparison = compareVarianceReduction(config.totalSamples, config.seed)
    setVarianceComparison(comparison)
    showToast('方差缩减对比计算完成', 'success')
  }, [config.totalSamples, config.seed, showToast])

  const handleExportCSV = useCallback(() => {
    if (convergenceData.length === 0) {
      showToast('没有数据可导出', 'error')
      return
    }

    const data = convergenceData.map((d) => ({
      n: d.n,
      estimate: d.piEstimate,
      error: d.error,
      se: d.se,
    }))

    const csv = generateCSV(data, ['se'])
    downloadCSV(csv, `pi-estimation-${config.method}-${Date.now()}.csv`)
    showToast('CSV 已导出', 'success')
  }, [convergenceData, config.method, showToast])

  const handleConfigChange = useCallback((key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setActiveExampleId(null)
  }, [])

  return (
    <div className="monte-carlo-pi-estimator">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>🎯 蒙特卡洛 π 估算器</h2>
        <p className="tool-description">
          使用单位圆随机点法、Buffon 投针法等蒙特卡洛方法估算 π 值。
          支持多 Worker 并行采样、方差缩减策略对比、实时收敛曲线分析。
        </p>
      </section>

      <section className="tool-section">
        <h3>示例配置</h3>
        <div className="examples-row">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              className={`example-btn ${activeExampleId === example.id ? 'example-btn-active' : ''}`}
              onClick={() => handleLoadExample(example)}
              disabled={isRunning}
              title={example.description}
            >
              <span className="example-name">{example.name}</span>
              <span className="example-desc">{example.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <h3>实验配置</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>估算方法</label>
            <select
              value={config.method}
              onChange={(e) => handleConfigChange('method', e.target.value)}
              disabled={isRunning}
            >
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="config-item">
            <label>总样本量</label>
            <input
              type="number"
              value={config.totalSamples}
              onChange={(e) => handleConfigChange('totalSamples', Number(e.target.value))}
              disabled={isRunning}
              min="100"
              max="100000000"
            />
          </div>
          <div className="config-item">
            <label>Worker 数量</label>
            <select
              value={config.workerCount}
              onChange={(e) => handleConfigChange('workerCount', Number(e.target.value))}
              disabled={isRunning}
            >
              {WORKER_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} 个</option>
              ))}
            </select>
          </div>
          <div className="config-item">
            <label>置信度</label>
            <select
              value={config.confidence}
              onChange={(e) => handleConfigChange('confidence', Number(e.target.value))}
              disabled={isRunning}
            >
              {CONFIDENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="config-item">
            <label>随机种子</label>
            <input
              type="number"
              value={config.seed}
              onChange={(e) => handleConfigChange('seed', Number(e.target.value))}
              disabled={isRunning}
            />
          </div>
          {(config.method === 'stratified') && (
            <div className="config-item">
              <label>分层网格数</label>
              <input
                type="number"
                value={config.strata}
                onChange={(e) => handleConfigChange('strata', Number(e.target.value))}
                disabled={isRunning}
                min="2"
                max="50"
              />
            </div>
          )}
        </div>

        <div className="action-row">
          {!isRunning ? (
            <button className="primary-btn" onClick={handleStart}>
              ▶ 开始采样
            </button>
          ) : (
            <button className="danger-btn" onClick={handleStop}>
              ⏹ 停止采样
            </button>
          )}
          <button className="secondary-btn" onClick={handleClear} disabled={isRunning}>
            清除结果
          </button>
          <button
            className="secondary-btn"
            onClick={runVarianceComparison}
            disabled={isRunning}
          >
            重新对比方差
          </button>
          <button
            className="secondary-btn"
            onClick={handleExportCSV}
            disabled={convergenceData.length === 0}
          >
            导出 CSV
          </button>
        </div>

        {activeWorkers > 0 && (
          <div className="worker-status">
            {Array.from({ length: config.workerCount }).map((_, i) => (
              <span key={i} className={`worker-badge ${i < activeWorkers ? 'active' : ''}`}>
                Worker {i + 1} {i < activeWorkers ? '(运行中)' : '(空闲)'}
              </span>
            ))}
          </div>
        )}
      </section>

      {isRunning && (
        <section className="tool-section">
          <h3>采样进度</h3>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="progress-info">
              <span>进度：{(progress * 100).toFixed(1)}%</span>
              <span>速率：{formatLargeNumber(samplesPerSecond)} 样本/秒</span>
            </div>
          </div>
        </section>
      )}

      {results && (
        <section className="tool-section">
          <h3>估算结果</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">π 估计值</div>
              <div className="stat-value highlight">{results.piEstimate.toFixed(8)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">真实 π</div>
              <div className="stat-value">{Math.PI.toFixed(8)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">绝对误差</div>
              <div className="stat-value">{results.error.toFixed(8)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">标准误差 σ/√N</div>
              <div className="stat-value">{results.standardError.toFixed(8)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">样本量 N</div>
              <div className="stat-value">{formatNumber(results.totalN)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">命中数</div>
              <div className="stat-value">{formatNumber(results.totalHits)}</div>
            </div>
          </div>

          <div className="section-divider">置信区间</div>
          <div className="info-box">
            <strong>{(config.confidence * 100).toFixed(0)}% 置信区间：</strong>
            [{results.ciLower.toFixed(6)}, {results.ciUpper.toFixed(6)}]
            {results.ciContainsPi ? (
              <span style={{ color: '#38a169', marginLeft: 10 }}>✓ 包含真实 π</span>
            ) : (
              <span style={{ color: '#e53e3e', marginLeft: 10 }}>✗ 不包含真实 π</span>
            )}
          </div>

          {results.requiredN && (
            <div className="info-box" style={{ marginTop: 12 }}>
              <strong>达到 0.001 精度预估样本量：</strong>
              {formatNumber(results.requiredN)}
              {results.totalN < results.requiredN && (
                <span style={{ marginLeft: 10 }}>
                  (还需约 {formatNumber(results.requiredN - results.totalN)} 样本)
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {convergenceData.length > 0 && (
        <section className="tool-section">
          <h3>收敛分析</h3>
          <div className="chart-container">
            <canvas ref={chartRef} className="chart-canvas" />
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#e53e3e' }} />
              <span>|π̂ − π| 绝对误差</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: 'rgba(74, 144, 217, 0.5)', height: 8 }} />
              <span>95% 置信带</span>
            </div>
          </div>
        </section>
      )}

      {results && results.samplePoints && results.samplePoints.length > 0 && (
        <section className="tool-section">
          <h3>采样点可视化</h3>
          <div style={{ textAlign: 'center' }}>
            <div className="scatter-plot-container">
              <canvas ref={scatterRef} className="scatter-plot" />
            </div>
            <div className="chart-legend" style={{ justifyContent: 'center', marginTop: 12 }}>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#38a169', width: 12, height: 12, borderRadius: '50%' }} />
                <span>圆内（命中）</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ background: '#e53e3e', width: 12, height: 12, borderRadius: '50%' }} />
                <span>圆外（未命中）</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {varianceComparison && (
        <section className="tool-section">
          <h3>方差缩减策略对比</h3>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>方法</th>
                <th>π 估计值</th>
                <th>方差</th>
                <th>标准误差</th>
                <th>方差比</th>
                <th>有效样本量倍数</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>标准蒙特卡洛</td>
                <td>{varianceComparison.standard.piEstimate.toFixed(6)}</td>
                <td>{varianceComparison.standard.variance.toFixed(6)}</td>
                <td>{varianceComparison.standard.standardError.toFixed(6)}</td>
                <td>1.000</td>
                <td>1.00x</td>
              </tr>
              <tr>
                <td>分层采样</td>
                <td>{varianceComparison.stratified.piEstimate.toFixed(6)}</td>
                <td>{varianceComparison.stratified.variance.toFixed(6)}</td>
                <td>{varianceComparison.stratified.standardError.toFixed(6)}</td>
                <td className={varianceComparison.stratified.varianceRatio < 1 ? 'better' : 'worse'}>
                  {varianceComparison.stratified.varianceRatio.toFixed(4)}
                </td>
                <td className={varianceComparison.stratified.varianceRatio < 1 ? 'better' : 'worse'}>
                  {(1 / varianceComparison.stratified.varianceRatio).toFixed(2)}x
                </td>
              </tr>
              <tr>
                <td>对偶变量</td>
                <td>{varianceComparison.antithetic.piEstimate.toFixed(6)}</td>
                <td>{varianceComparison.antithetic.variance.toFixed(6)}</td>
                <td>{varianceComparison.antithetic.standardError.toFixed(6)}</td>
                <td className={varianceComparison.antithetic.varianceRatio < 1 ? 'better' : 'worse'}>
                  {varianceComparison.antithetic.varianceRatio.toFixed(4)}
                </td>
                <td className={varianceComparison.antithetic.varianceRatio < 1 ? 'better' : 'worse'}>
                  {(1 / varianceComparison.antithetic.varianceRatio).toFixed(2)}x
                </td>
              </tr>
            </tbody>
          </table>
          <div className="info-box" style={{ marginTop: 16 }}>
            <strong>说明：</strong>
            方差比 &lt; 1 表示该方法比方差比标准蒙特卡洛更小（更好）。
            有效样本量倍数表示达到相同精度所需样本量的减少比例。
          </div>
        </section>
      )}

      {!results && !isRunning && (
        <section className="tool-section">
          <div className="empty-state">
            <div className="empty-icon">🎲</div>
            <h3>准备就绪</h3>
            <p>选择示例配置或自定义参数，点击「开始采样」开始蒙特卡洛实验</p>
          </div>
        </section>
      )}

      <section className="tool-section">
        <h3>使用说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: '#4a5568' }}>
          <li>
            <strong>单位圆随机点法：</strong>
            在 [-1,1]×[-1,1] 正方形内随机采样，统计落在单位圆内的点比例。
            π ≈ 4 × (命中数 / 样本数)
          </li>
          <li>
            <strong>Buffon 投针法：</strong>
            模拟向间距为 d 的平行线投掷长度为 l 的针，利用相交概率估算 π。
          </li>
          <li>
            <strong>分层采样：</strong>
            将采样区域划分为网格，在每个格子内均匀采样，有效降低方差。
          </li>
          <li>
            <strong>对偶变量：</strong>
            利用对称性生成对偶点 (x,y) 和 (-x,-y)，减少方差。
          </li>
          <li>
            <strong>内存保护：</strong>
            单批次最大 1M 样本，总样本上限 100M。大样本实验建议使用多 Worker 并行。
          </li>
        </ul>
      </section>
    </div>
  )
}

export default MonteCarloPiEstimator
