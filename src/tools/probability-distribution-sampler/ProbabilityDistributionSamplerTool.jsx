import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './ProbabilityDistributionSamplerTool.css'
import {
  DISTRIBUTION_TYPES,
  generateSample,
  getTheoreticalMoments,
  computeStatistics,
  computeHistogram,
  computeTheoryCurve,
  shapiroWilk,
  kolmogorovSmirnovNormal,
  exportCSV,
  generateMarkdownSummary,
  exportPNGFromCanvas,
  copyToClipboard,
  EXAMPLES,
} from './logic/index.js'

const distributionLabels = {
  [DISTRIBUTION_TYPES.UNIFORM]: '均匀分布',
  [DISTRIBUTION_TYPES.NORMAL]: '正态分布',
  [DISTRIBUTION_TYPES.POISSON]: '泊松分布',
  [DISTRIBUTION_TYPES.BINOMIAL]: '二项分布',
  [DISTRIBUTION_TYPES.EXPONENTIAL]: '指数分布',
}

export default function ProbabilityDistributionSamplerTool() {
  const [distributionType, setDistributionType] = useState(DISTRIBUTION_TYPES.NORMAL)
  const [params, setParams] = useState({ mean: 0, std: 1 })
  const [sampleSize, setSampleSize] = useState(10000)
  const [seed, setSeed] = useState(42)
  const [binMethod, setBinMethod] = useState('sturges')
  const [manualBins, setManualBins] = useState(30)
  const [sampleData, setSampleData] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [histogram, setHistogram] = useState(null)
  const [theoryCurve, setTheoryCurve] = useState(null)
  const [fitTest, setFitTest] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState(null)
  const [chartMode, setChartMode] = useState('pdf')

  const canvasRef = useRef(null)
  const debounceRef = useRef(null)

  const theoreticalMoments = useMemo(() => {
    return getTheoreticalMoments(distributionType, params)
  }, [distributionType, params])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const generateData = useCallback(async () => {
    setIsGenerating(true)
    setProgress(0)

    await new Promise((resolve) => setTimeout(resolve, 10))

    const data = generateSample(distributionType, params, sampleSize, seed)
    setSampleData(data)
    setProgress(1)

    const stats = computeStatistics(data)
    setStatistics(stats)

    const hist = computeHistogram(data, {
      method: binMethod,
      bins: manualBins,
    })
    setHistogram(hist)

    const curve = computeTheoryCurve(
      distributionType,
      params,
      hist.min,
      hist.max,
      200
    )
    setTheoryCurve(curve)

    if (distributionType === DISTRIBUTION_TYPES.NORMAL) {
      const sw = shapiroWilk(data.slice(0, 5000))
      const ks = kolmogorovSmirnovNormal(data, params.mean, params.std)
      setFitTest({ shapiro: sw, ks })
    } else {
      setFitTest(null)
    }

    setIsGenerating(false)
  }, [distributionType, params, sampleSize, seed, binMethod, manualBins])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      generateData()
    }, 300)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [generateData])

  const handleParamChange = useCallback((key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleLoadExample = useCallback((example) => {
    setDistributionType(example.distributionType)
    setParams(example.params)
    setSampleSize(example.sampleSize)
    setSeed(example.seed)
  }, [])

  const handleExportCSV = useCallback(() => {
    if (!sampleData) return
    exportCSV(sampleData, `${distributionType}-samples.csv`)
    showToast('CSV 已导出')
  }, [sampleData, distributionType, showToast])

  const handleExportPNG = useCallback(() => {
    if (!canvasRef.current) return
    exportPNGFromCanvas(canvasRef.current, `${distributionType}-histogram.png`)
    showToast('PNG 已导出')
  }, [distributionType, showToast])

  const handleCopyMarkdown = useCallback(async () => {
    if (!statistics) return
    const md = generateMarkdownSummary(statistics, distributionType, params, fitTest)
    const success = await copyToClipboard(md)
    showToast(success ? 'Markdown 已复制' : '复制失败', success ? 'success' : 'error')
  }, [statistics, distributionType, params, fitTest, showToast])

  const getDistributionParams = useCallback(() => {
    switch (distributionType) {
      case DISTRIBUTION_TYPES.UNIFORM:
        return (
          <>
            <div className="control-group">
              <label>最小值 (min)</label>
              <input
                type="number"
                value={params.min ?? 0}
                onChange={(e) => handleParamChange('min', Number(e.target.value))}
                step="0.1"
              />
            </div>
            <div className="control-group">
              <label>最大值 (max)</label>
              <input
                type="number"
                value={params.max ?? 1}
                onChange={(e) => handleParamChange('max', Number(e.target.value))}
                step="0.1"
              />
            </div>
          </>
        )
      case DISTRIBUTION_TYPES.NORMAL:
        return (
          <>
            <div className="control-group">
              <label>均值 (μ)</label>
              <input
                type="number"
                value={params.mean ?? 0}
                onChange={(e) => handleParamChange('mean', Number(e.target.value))}
                step="0.1"
              />
            </div>
            <div className="control-group">
              <label>标准差 (σ)</label>
              <input
                type="number"
                value={params.std ?? 1}
                onChange={(e) => handleParamChange('std', Math.max(0.01, Number(e.target.value)))}
                step="0.1"
                min="0.01"
              />
            </div>
          </>
        )
      case DISTRIBUTION_TYPES.POISSON:
        return (
          <div className="control-group">
            <label>λ (lambda)</label>
            <input
              type="number"
              value={params.lambda ?? 1}
              onChange={(e) => handleParamChange('lambda', Math.max(0.1, Number(e.target.value)))}
              step="0.1"
              min="0.1"
            />
          </div>
        )
      case DISTRIBUTION_TYPES.BINOMIAL:
        return (
          <>
            <div className="control-group">
              <label>试验次数 (n)</label>
              <input
                type="number"
                value={params.n ?? 10}
                onChange={(e) => handleParamChange('n', Math.max(1, Math.floor(Number(e.target.value))))}
                step="1"
                min="1"
              />
            </div>
            <div className="control-group">
              <label>成功概率 (p)</label>
              <input
                type="number"
                value={params.p ?? 0.5}
                onChange={(e) => handleParamChange('p', Math.max(0, Math.min(1, Number(e.target.value))))}
                step="0.05"
                min="0"
                max="1"
              />
            </div>
          </>
        )
      case DISTRIBUTION_TYPES.EXPONENTIAL:
        return (
          <div className="control-group">
            <label>λ (rate)</label>
            <input
              type="number"
              value={params.lambda ?? 1}
              onChange={(e) => handleParamChange('lambda', Math.max(0.01, Number(e.target.value)))}
              step="0.1"
              min="0.01"
            />
          </div>
        )
      default:
        return null
    }
  }, [distributionType, params, handleParamChange])

  useEffect(() => {
    if (!histogram || !theoryCurve || !statistics) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = 400 * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = 400
    const padding = { top: 40, right: 20, bottom: 50, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight)

    const dataMax = Math.max(...histogram.counts)
    const xMin = histogram.min
    const xMax = histogram.max
    const xRange = xMax - xMin

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight * i) / 5
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    const barWidth = chartWidth / histogram.counts.length
    ctx.fillStyle = '#4299e1'
    ctx.strokeStyle = '#2b6cb0'
    ctx.lineWidth = 1

    histogram.counts.forEach((count, i) => {
      const barHeight = (count / dataMax) * chartHeight
      const x = padding.left + i * barWidth
      const y = padding.top + chartHeight - barHeight

      ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
    })

    ctx.save()
    ctx.beginPath()
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight)
    ctx.clip()

    if (chartMode === 'pdf' && theoryCurve.pdf) {
      const maxPdf = Math.max(...theoryCurve.pdf)
      const scale = maxPdf > 0 ? dataMax / maxPdf : 1

      ctx.strokeStyle = '#e53e3e'
      ctx.lineWidth = 2
      ctx.beginPath()

      theoryCurve.x.forEach((x, i) => {
        const plotX = padding.left + ((x - xMin) / xRange) * chartWidth
        const plotY = padding.top + chartHeight - theoryCurve.pdf[i] * scale

        const clampedY = Math.max(padding.top, Math.min(padding.top + chartHeight, plotY))

        if (i === 0) {
          ctx.moveTo(plotX, clampedY)
        } else {
          ctx.lineTo(plotX, clampedY)
        }
      })
      ctx.stroke()
    } else if (chartMode === 'cdf' && theoryCurve.cdf) {
      ctx.strokeStyle = '#38a169'
      ctx.lineWidth = 2
      ctx.beginPath()

      theoryCurve.x.forEach((x, i) => {
        const plotX = padding.left + ((x - xMin) / xRange) * chartWidth
        const plotY = padding.top + chartHeight - theoryCurve.cdf[i] * chartHeight

        const clampedY = Math.max(padding.top, Math.min(padding.top + chartHeight, plotY))

        if (i === 0) {
          ctx.moveTo(plotX, clampedY)
        } else {
          ctx.lineTo(plotX, clampedY)
        }
      })
      ctx.stroke()
    }

    ctx.restore()

    ctx.fillStyle = '#4a5568'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (chartWidth * i) / 5
      const value = xMin + (xRange * i) / 5
      ctx.fillText(value.toFixed(2), x, height - padding.bottom + 20)
    }

    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight * i) / 5
      const value = dataMax - (dataMax * i) / 5
      ctx.fillText(Math.round(value).toString(), padding.left - 10, y + 4)
    }

    ctx.fillStyle = '#2d3748'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      `${distributionLabels[distributionType]} - 直方图${chartMode === 'pdf' ? ' + 理论 PDF' : ' + 理论 CDF'}`,
      width / 2,
      20
    )

    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#718096'
    ctx.textAlign = 'left'
    ctx.fillRect(padding.left + 10, 10, 20, 3)
    ctx.fillStyle = '#4299e1'
    ctx.fillRect(padding.left + 10, 10, 20, 3)
    ctx.fillStyle = '#718096'
    ctx.fillText('样本直方图', padding.left + 35, 14)

    if (chartMode === 'pdf') {
      ctx.fillStyle = '#e53e3e'
      ctx.fillRect(padding.left + 140, 10, 20, 3)
      ctx.fillStyle = '#718096'
      ctx.fillText('理论 PDF', padding.left + 165, 14)
    } else {
      ctx.fillStyle = '#38a169'
      ctx.fillRect(padding.left + 140, 10, 20, 3)
      ctx.fillStyle = '#718096'
      ctx.fillText('理论 CDF', padding.left + 165, 14)
    }
  }, [histogram, theoryCurve, statistics, chartMode, distributionType])

  return (
    <div className="probability-sampler">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>概率分布采样器</h2>
        <p className="tool-description">
          生成各种概率分布的随机样本，可视化直方图与理论分布曲线，计算统计量并进行拟合检验。
        </p>
      </section>

      <section className="tool-section">
        <h3>示例配置</h3>
        <div className="examples-row">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              className="example-btn"
              onClick={() => handleLoadExample(example)}
              title={example.description}
            >
              <span className="example-name">{example.name}</span>
              <span className="example-desc">{example.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <h3>参数配置</h3>
        <div className="controls-grid">
          <div className="control-group">
            <label>分布类型</label>
            <select
              value={distributionType}
              onChange={(e) => {
                setDistributionType(e.target.value)
                switch (e.target.value) {
                  case DISTRIBUTION_TYPES.UNIFORM:
                    setParams({ min: 0, max: 1 })
                    break
                  case DISTRIBUTION_TYPES.NORMAL:
                    setParams({ mean: 0, std: 1 })
                    break
                  case DISTRIBUTION_TYPES.POISSON:
                    setParams({ lambda: 1 })
                    break
                  case DISTRIBUTION_TYPES.BINOMIAL:
                    setParams({ n: 10, p: 0.5 })
                    break
                  case DISTRIBUTION_TYPES.EXPONENTIAL:
                    setParams({ lambda: 1 })
                    break
                }
              }}
            >
              {Object.entries(distributionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {getDistributionParams()}

          <div className="control-group">
            <label>样本量</label>
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Math.max(100, Math.min(1000000, Number(e.target.value))))}
              step="1000"
              min="100"
              max="1000000"
            />
          </div>

          <div className="control-group">
            <label>随机种子</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>Bin 计算方法</label>
            <select
              value={binMethod}
              onChange={(e) => setBinMethod(e.target.value)}
            >
              <option value="sturges">Sturges 规则</option>
              <option value="freedman-diaconis">Freedman–Diaconis</option>
              <option value="manual">手动设置</option>
            </select>
          </div>

          {binMethod === 'manual' && (
            <div className="control-group">
              <label>Bin 数量</label>
              <input
                type="number"
                value={manualBins}
                onChange={(e) => setManualBins(Math.max(5, Math.min(100, Number(e.target.value))))}
                min="5"
                max="100"
              />
            </div>
          )}
        </div>

        {isGenerating && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }}></div>
          </div>
        )}

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={generateData}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '生成样本'}
          </button>
          <button
            className="secondary-btn"
            onClick={() => setSeed((s) => s + 1)}
            disabled={isGenerating}
          >
            换个种子
          </button>
        </div>
      </section>

      {statistics && (
        <section className="tool-section">
          <h3>样本统计量</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">均值</span>
              <span className="stat-value">{statistics.mean.toFixed(4)}</span>
              <small style={{ color: '#718096' }}>
                理论: {theoreticalMoments.mean.toFixed(4)}
              </small>
            </div>
            <div className="stat-card">
              <span className="stat-label">方差</span>
              <span className="stat-value">{statistics.variance.toFixed(4)}</span>
              <small style={{ color: '#718096' }}>
                理论: {theoreticalMoments.variance.toFixed(4)}
              </small>
            </div>
            <div className="stat-card">
              <span className="stat-label">偏度</span>
              <span className="stat-value">{statistics.skewness.toFixed(4)}</span>
              <small style={{ color: '#718096' }}>
                理论: {theoreticalMoments.skewness.toFixed(4)}
              </small>
            </div>
            <div className="stat-card">
              <span className="stat-label">峰度</span>
              <span className="stat-value">{statistics.kurtosis.toFixed(4)}</span>
              <small style={{ color: '#718096' }}>
                理论: {theoreticalMoments.kurtosis.toFixed(4)}
              </small>
            </div>
            <div className="stat-card">
              <span className="stat-label">最小值</span>
              <span className="stat-value">{statistics.min.toFixed(4)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">最大值</span>
              <span className="stat-value">{statistics.max.toFixed(4)}</span>
            </div>
          </div>

          <table className="comparison-table">
            <thead>
              <tr>
                <th>统计量</th>
                <th>样本值</th>
                <th>理论值</th>
                <th>相对误差</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>均值</td>
                <td>{statistics.mean.toFixed(6)}</td>
                <td>{theoreticalMoments.mean.toFixed(6)}</td>
                <td>
                  {theoreticalMoments.mean !== 0
                    ? `${((Math.abs(statistics.mean - theoreticalMoments.mean) / Math.abs(theoreticalMoments.mean)) * 100).toFixed(4)}%`
                    : (statistics.mean - theoreticalMoments.mean).toFixed(6)}
                </td>
              </tr>
              <tr>
                <td>方差</td>
                <td>{statistics.variance.toFixed(6)}</td>
                <td>{theoreticalMoments.variance.toFixed(6)}</td>
                <td>
                  {theoreticalMoments.variance !== 0
                    ? `${((Math.abs(statistics.variance - theoreticalMoments.variance) / theoreticalMoments.variance) * 100).toFixed(4)}%`
                    : (statistics.variance - theoreticalMoments.variance).toFixed(6)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {histogram && theoryCurve && (
        <section className="tool-section">
          <h3>直方图与理论分布</h3>

          <div className="chart-toggle">
            <button
              className={`toggle-btn ${chartMode === 'pdf' ? 'active' : ''}`}
              onClick={() => setChartMode('pdf')}
            >
              PDF 叠加
            </button>
            <button
              className={`toggle-btn ${chartMode === 'cdf' ? 'active' : ''}`}
              onClick={() => setChartMode('cdf')}
            >
              CDF 叠加
            </button>
          </div>

          <div className="chart-container">
            <canvas ref={canvasRef} style={{ width: '100%', height: '400px' }}></canvas>
          </div>
        </section>
      )}

      {fitTest && (
        <section className="tool-section">
          <h3>拟合检验（正态分布）</h3>

          {fitTest.shapiro && (
            <div
              className={`fit-test-result ${
                fitTest.shapiro.w > 0.95
                  ? ''
                  : fitTest.shapiro.w > 0.90
                    ? 'warning'
                    : 'danger'
              }`}
            >
              <div className="fit-test-title">Shapiro-Wilk 检验</div>
              <div className="fit-test-value">
                W = {fitTest.shapiro.w.toFixed(6)} | p 值: {fitTest.shapiro.pValueRange}
              </div>
              <div className="fit-test-value" style={{ marginTop: 4 }}>
                结论: {fitTest.shapiro.interpretation}
              </div>
              <div className="fit-test-note">{fitTest.shapiro.note}</div>
            </div>
          )}

          {fitTest.ks && (
            <div
              className={`fit-test-result ${
                fitTest.ks.d < fitTest.ks.criticalValues.alpha010
                  ? ''
                  : fitTest.ks.d < fitTest.ks.criticalValues.alpha005
                    ? 'warning'
                    : 'danger'
              }`}
            >
              <div className="fit-test-title">Kolmogorov-Smirnov 检验</div>
              <div className="fit-test-value">
                D = {fitTest.ks.d.toFixed(6)} | p 值: {fitTest.ks.pValueRange}
              </div>
              <div className="fit-test-value" style={{ marginTop: 4 }}>
                临界值 (α=0.05): {fitTest.ks.criticalValues.alpha005.toFixed(6)}
              </div>
              <div className="fit-test-value" style={{ marginTop: 4 }}>
                结论: {fitTest.ks.interpretation}
              </div>
              <div className="fit-test-note">{fitTest.ks.note}</div>
            </div>
          )}
        </section>
      )}

      {sampleData && (
        <section className="tool-section">
          <h3>导出功能</h3>
          <div className="action-row">
            <button className="secondary-btn" onClick={handleExportCSV}>
              导出 CSV 样本
            </button>
            <button className="secondary-btn" onClick={handleExportPNG}>
              导出 PNG 图表
            </button>
            <button className="secondary-btn" onClick={handleCopyMarkdown}>
              复制 Markdown 摘要
            </button>
          </div>
        </section>
      )}

      <section className="tool-section">
        <h3>说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: '#4a5568' }}>
          <li>
            <strong>可复现采样：</strong>使用 Mulberry32 PRNG 算法，相同种子生成相同序列。
          </li>
          <li>
            <strong>分布支持：</strong>均匀、正态（Box-Muller）、泊松（Knuth+正态近似）、二项、指数分布。
          </li>
          <li>
            <strong>在线统计算法：</strong>使用 Welford 算法计算 mean/variance/skewness/kurtosis。
          </li>
          <li>
            <strong>直方图：</strong>支持 Sturges / Freedman–Diaconis 自动 bin 选择或手动设置。
          </li>
          <li>
            <strong>拟合检验：</strong>Shapiro-Wilk 和 Kolmogorov-Smirnov 为教学简化版，与 scipy 有精度差异。
          </li>
          <li>
            <strong>性能：</strong>单次最大支持 10⁶ 样本，大数据量建议分批次生成。
          </li>
        </ul>
      </section>
    </div>
  )
}
