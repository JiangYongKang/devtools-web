import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ALGORITHM_TYPES,
  JITTER_TYPES,
  UNIT_TYPES,
  PRESETS,
  DEFAULT_PARAMS,
  MAX_ALLOWED,
  generateSequence,
  inverseCalculateInitial,
  inverseCalculateMultiplier,
  generateRandomParams,
  compareConfigs,
  exportToCSV,
  exportToJSON,
  generateSleepCode,
  convertToUnit,
  formatDecimal,
} from './logic/index.js'
import './ExponentialBackoffCalculatorTool.css'

const STORAGE_KEY = 'exponential-backoff-calculator:preferences'

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatValue(value, unit, decimalPlaces) {
  const converted = convertToUnit(value, UNIT_TYPES.MS, unit)
  return formatDecimal(converted, decimalPlaces)
}

function getUnitLabel(unit) {
  return unit === UNIT_TYPES.SECONDS ? '秒' : '毫秒'
}

export default function ExponentialBackoffCalculatorTool() {
  const [activeTab, setActiveTab] = useState('calculator')
  const [params, setParams] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_PARAMS, ...parsed }
      }
    } catch {
    }
    return DEFAULT_PARAMS
  })

  const [savedConfig, setSavedConfig] = useState(null)
  const [result, setResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [activePreset, setActivePreset] = useState(null)
  const [inverseMode, setInverseMode] = useState(null)
  const [inverseTarget, setInverseTarget] = useState('')
  const [inverseResult, setInverseResult] = useState(null)
  const [exportCodeLanguage, setExportCodeLanguage] = useState('bash')
  const [viewMode, setViewMode] = useState('table')
  const chartContainerRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
    } catch {
    }
  }, [params])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlAlgorithm = urlParams.get('algorithm')
    const urlInitial = urlParams.get('initial')
    const urlMultiplier = urlParams.get('multiplier')
    const urlMax = urlParams.get('max')
    const urlMaxSteps = urlParams.get('maxSteps')
    const urlJitter = urlParams.get('jitter')
    const urlJitterMin = urlParams.get('jitterMin')
    const urlJitterMax = urlParams.get('jitterMax')
    const urlAlignToSecond = urlParams.get('alignToSecond')
    const urlAlignGridMs = urlParams.get('alignGridMs')
    const urlUnit = urlParams.get('unit')
    const urlDecimalPlaces = urlParams.get('decimalPlaces')

    const updates = {}
    if (urlAlgorithm) updates.algorithm = urlAlgorithm
    if (urlInitial) updates.initial = parseFloat(urlInitial)
    if (urlMultiplier) updates.multiplier = parseFloat(urlMultiplier)
    if (urlMax) updates.max = parseFloat(urlMax)
    if (urlMaxSteps) updates.maxSteps = parseInt(urlMaxSteps, 10)
    if (urlJitter) updates.jitter = urlJitter
    if (urlJitterMin) updates.jitterMin = parseFloat(urlJitterMin)
    if (urlJitterMax) updates.jitterMax = parseFloat(urlJitterMax)
    if (urlAlignToSecond) updates.alignToSecond = urlAlignToSecond === 'true'
    if (urlAlignGridMs) updates.alignGridMs = parseInt(urlAlignGridMs, 10)
    if (urlUnit) updates.unit = urlUnit
    if (urlDecimalPlaces) updates.decimalPlaces = parseInt(urlDecimalPlaces, 10)

    if (Object.keys(updates).length > 0) {
      setParams(prev => ({ ...prev, ...updates }))
    }
  }, [])

  const handleCopy = useCallback(async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      textarea.style.width = '1px'
      textarea.style.height = '1px'
      document.body.appendChild(textarea)
      try {
        textarea.select()
        document.execCommand('copy')
        setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
      } catch {
        setCopyStatus({ type: 'error', message: `复制失败：${err?.message || '未知错误'}` })
      }
      document.body.removeChild(textarea)
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

  const handleGenerate = useCallback(() => {
    const seqResult = generateSequence(params)
    setResult(seqResult)
    setShowDiff(false)
  }, [params])

  useEffect(() => {
    handleGenerate()
  }, [])

  const handleLoadPreset = useCallback((presetKey) => {
    const preset = PRESETS[presetKey]
    if (preset) {
      setParams(prev => ({ ...prev, ...preset.params }))
      setActivePreset(presetKey)
    }
  }, [])

  const handleRandomize = useCallback(() => {
    const randomParams = generateRandomParams()
    setParams(prev => ({ ...prev, ...randomParams }))
    setActivePreset(null)
  }, [])

  const handleSaveConfig = useCallback(() => {
    setSavedConfig({ ...params })
    setCopyStatus({ type: 'success', message: '配置已保存用于对比' })
    setTimeout(() => setCopyStatus(null), 2500)
  }, [params])

  const handleCompare = useCallback(() => {
    setShowDiff(true)
  }, [])

  const handleInverseCalculate = useCallback((mode) => {
    const target = parseFloat(inverseTarget)
    if (!isFinite(target) || target <= 0) {
      setInverseResult({ success: false, errorMessage: '请输入有效的目标总时长' })
      return
    }

    const targetInMs = params.unit === UNIT_TYPES.SECONDS ? target * 1000 : target

    if (mode === 'initial') {
      const calcResult = inverseCalculateInitial(
        targetInMs,
        params.multiplier,
        params.maxSteps,
        params.algorithm,
        params.max
      )
      setInverseResult({ ...calcResult, mode: 'initial' })
    } else {
      const calcResult = inverseCalculateMultiplier(
        targetInMs,
        params.initial,
        params.maxSteps,
        params.algorithm,
        params.max
      )
      setInverseResult({ ...calcResult, mode: 'multiplier' })
    }
  }, [inverseTarget, params])

  const handleApplyInverse = useCallback(() => {
    if (!inverseResult || !inverseResult.success) return

    if (inverseResult.mode === 'initial') {
      setParams(prev => ({ ...prev, initial: inverseResult.initial }))
    } else {
      setParams(prev => ({ ...prev, multiplier: inverseResult.multiplier }))
    }
    setInverseMode(null)
    setInverseResult(null)
  }, [inverseResult])

  const handleExportCSV = useCallback(() => {
    if (!result || !result.success) return
    const csv = exportToCSV(result.sequence, params)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'backoff-sequence.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [result, params])

  const handleExportJSON = useCallback(() => {
    if (!result || !result.success) return
    const json = exportToJSON(result.sequence, params)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'backoff-sequence.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [result, params])

  const handleCopySleepCode = useCallback(() => {
    if (!result || !result.success) return
    const code = generateSleepCode(result.sequence, params, exportCodeLanguage)
    handleCopy(code, `${exportCodeLanguage === 'bash' ? 'Bash' : 'PowerShell'} 代码`)
  }, [result, params, exportCodeLanguage, handleCopy])

  const sleepCode = useMemo(() => {
    if (!result || !result.success) return ''
    return generateSleepCode(result.sequence, params, exportCodeLanguage)
  }, [result, params, exportCodeLanguage])

  const diffs = useMemo(() => {
    if (!savedConfig || !showDiff) return []
    return compareConfigs(savedConfig, params)
  }, [savedConfig, params, showDiff])

  const chartData = useMemo(() => {
    if (!result || !result.success) return null

    const { sequence } = result
    const maxValue = Math.max(...sequence.map(s => Math.max(s.value, s.total)))
    const padding = 40
    const chartWidth = 800
    const chartHeight = 280
    const plotWidth = chartWidth - padding * 2
    const plotHeight = chartHeight - padding * 2

    const xScale = (i) => padding + (i / (sequence.length - 1 || 1)) * plotWidth
    const yScale = (v) => padding + plotHeight - (v / (maxValue || 1)) * plotHeight

    const valuePoints = sequence.map((s, i) => ({
      x: xScale(i),
      y: yScale(s.value),
      value: s.value,
      step: s.step,
    }))

    const totalPoints = sequence.map((s, i) => ({
      x: xScale(i),
      y: yScale(s.total),
      value: s.total,
      step: s.step,
    }))

    return {
      width: chartWidth,
      height: chartHeight,
      padding,
      maxValue,
      valuePoints,
      totalPoints,
      valuePath: valuePoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' '),
      totalPath: totalPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' '),
      xAxis: { x1: padding, y1: chartHeight - padding, x2: chartWidth - padding, y2: chartHeight - padding },
      yAxis: { x1: padding, y1: padding, x2: padding, y2: chartHeight - padding },
    }
  }, [result])

  const renderErrorBox = (errorCode, errorMessage) => {
    if (!errorCode) return null
    return (
      <div className="error-box">
        <strong>错误</strong>
        <p>{escapeHtml(errorMessage)}</p>
        <div className="error-code">错误码：{escapeHtml(errorCode)}</div>
      </div>
    )
  }

  const renderSummaryCards = () => {
    if (!result || !result.success) return null

    const { sequence, totalWait, clippedCount } = result

    return (
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-label">步数</div>
          <div className="summary-card-value">{sequence.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">累计等待</div>
          <div className="summary-card-value">
            {formatValue(totalWait, params.unit, params.decimalPlaces)} {getUnitLabel(params.unit)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">最小间隔</div>
          <div className="summary-card-value">
            {formatValue(sequence[0]?.value || 0, params.unit, params.decimalPlaces)} {getUnitLabel(params.unit)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">最大间隔</div>
          <div className="summary-card-value">
            {formatValue(sequence[sequence.length - 1]?.value || 0, params.unit, params.decimalPlaces)} {getUnitLabel(params.unit)}
          </div>
        </div>
        {clippedCount > 0 && (
          <div className="summary-card">
            <div className="summary-card-label">封顶次数</div>
            <div className="summary-card-value">{clippedCount}</div>
          </div>
        )}
      </div>
    )
  }

  const renderTable = () => {
    if (!result || !result.success) return null

    const { sequence } = result
    const { unit, decimalPlaces, jitter } = params

    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="sequence-table">
          <thead>
            <tr>
              <th>步骤</th>
              <th>基础值 ({getUnitLabel(unit)})</th>
              {jitter !== JITTER_TYPES.NONE && (
                <>
                  <th>范围下限</th>
                  <th>范围上限</th>
                  <th>抖动后值</th>
                </>
              )}
              <th>间隔 ({getUnitLabel(unit)})</th>
              <th>累计等待 ({getUnitLabel(unit)})</th>
              <th>剩余重试预算</th>
            </tr>
          </thead>
          <tbody>
            {sequence.map((item, index) => (
              <tr key={index} className={item.clipped ? 'clipped' : ''}>
                <td>{item.step}</td>
                <td>{formatValue(item.base, unit, decimalPlaces)}</td>
                {jitter !== JITTER_TYPES.NONE && (
                  <>
                    <td>{formatValue(item.min, unit, decimalPlaces)}</td>
                    <td>{formatValue(item.max, unit, decimalPlaces)}</td>
                    <td>{formatValue(item.jittered || item.value, unit, decimalPlaces)}</td>
                  </>
                )}
                <td>
                  {formatValue(item.value, unit, decimalPlaces)}
                  {item.clipped && <span className="clipped-marker">封顶</span>}
                </td>
                <td>{formatValue(item.total, unit, decimalPlaces)}</td>
                <td>{sequence.length - index - 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderChart = () => {
    if (!chartData) return null

    return (
      <div className="chart-container" ref={chartContainerRef}>
        <svg
          className="chart-svg"
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            x1={chartData.xAxis.x1}
            y1={chartData.xAxis.y1}
            x2={chartData.xAxis.x2}
            y2={chartData.xAxis.y2}
            stroke="var(--border)"
            strokeWidth="1"
          />
          <line
            x1={chartData.yAxis.x1}
            y1={chartData.yAxis.y1}
            x2={chartData.yAxis.x2}
            y2={chartData.yAxis.y2}
            stroke="var(--border)"
            strokeWidth="1"
          />

          <path
            d={chartData.valuePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
          />
          {chartData.valuePoints.map((p, i) => (
            <circle key={`v-${i}`} cx={p.x} cy={p.y} r="4" fill="var(--accent)" />
          ))}

          <path
            d={chartData.totalPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          />
          {chartData.totalPoints.map((p, i) => (
            <circle key={`t-${i}`} cx={p.x} cy={p.y} r="4" fill="#10b981" />
          ))}

          <text x={chartData.width - chartData.padding - 60} y={20} fill="var(--accent)" fontSize="12">间隔</text>
          <text x={chartData.width - chartData.padding - 60} y={36} fill="#10b981" fontSize="12">累计</text>

          {chartData.valuePoints.map((p, i) => (
            <text key={`label-${i}`} x={p.x} y={chartData.height - 10} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              {p.step}
            </text>
          ))}
        </svg>
      </div>
    )
  }

  const renderDiffTable = () => {
    if (!showDiff || diffs.length === 0) return null

    return (
      <div className="comparison-section">
        <h3>配置对比</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="diff-table">
            <thead>
              <tr>
                <th>参数</th>
                <th>已保存</th>
                <th>当前</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((diff, index) => (
                <tr key={index} className={diff.changed ? 'changed' : ''}>
                  <td>{escapeHtml(diff.key)}</td>
                  <td>{String(escapeHtml(diff.valueA))}</td>
                  <td>{String(escapeHtml(diff.valueB))}</td>
                  <td>{diff.changed ? '已修改' : '未变化'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="backoff-calculator">
      {copyStatus && (
        <div className={`tool-toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          计算器
        </button>
        <button
          className={`tab-btn ${activeTab === 'inverse' ? 'active' : ''}`}
          onClick={() => setActiveTab('inverse')}
        >
          反算
        </button>
        <button
          className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          导出
        </button>
      </div>

      {activeTab === 'calculator' && (
        <>
          <section className="section-box">
            <h3>预设场景</h3>
            <div className="presets-grid">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-btn ${activePreset === key ? 'active' : ''}`}
                  onClick={() => handleLoadPreset(key)}
                >
                  <span className="preset-name">{preset.label}</span>
                  <span className="preset-desc">{preset.description}</span>
                </button>
              ))}
            </div>

            <div className="action-row">
              <button className="secondary-btn" onClick={handleRandomize}>
                摇一摇（随机参数）
              </button>
              <button className="secondary-btn" onClick={handleSaveConfig}>
                保存当前配置
              </button>
              {savedConfig && (
                <button className="secondary-btn" onClick={handleCompare}>
                  对比已保存配置
                </button>
              )}
            </div>

            <div className="info-box" style={{ marginTop: '1rem' }}>
              <strong>提示：</strong>「摇一摇」功能使用 <code>Math.random</code> 生成演示参数，非密码学安全随机数。
            </div>
          </section>

          <section className="section-box">
            <h3>参数配置</h3>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="algorithm">算法</label>
                <select
                  id="algorithm"
                  value={params.algorithm}
                  onChange={(e) => setParams(prev => ({ ...prev, algorithm: e.target.value }))}
                >
                  <option value={ALGORITHM_TYPES.EXPONENTIAL}>指数退避</option>
                  <option value={ALGORITHM_TYPES.LINEAR}>线性退避</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="initial">
                  初值 <small>({getUnitLabel(params.unit)})</small>
                </label>
                <input
                  id="initial"
                  type="number"
                  min="0"
                  step="1"
                  value={params.initial}
                  onChange={(e) => setParams(prev => ({ ...prev, initial: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="multiplier">
                  乘数
                  <small>
                    {params.algorithm === ALGORITHM_TYPES.EXPONENTIAL ? '（指数因子）' : '（步长）'}
                  </small>
                </label>
                <input
                  id="multiplier"
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={params.multiplier}
                  onChange={(e) => setParams(prev => ({ ...prev, multiplier: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="max">
                  最大间隔 <small>({getUnitLabel(params.unit)})</small>
                </label>
                <input
                  id="max"
                  type="number"
                  min="0"
                  step="1"
                  value={params.max}
                  onChange={(e) => setParams(prev => ({ ...prev, max: parseFloat(e.target.value) || 0 }))}
                  placeholder="0 表示不限制"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxSteps">
                  最大步数 <small>(最大 {MAX_ALLOWED.MAX_STEPS})</small>
                </label>
                <input
                  id="maxSteps"
                  type="number"
                  min="1"
                  max={MAX_ALLOWED.MAX_STEPS}
                  step="1"
                  value={params.maxSteps}
                  onChange={(e) => setParams(prev => ({ ...prev, maxSteps: parseInt(e.target.value, 10) || 1 }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="jitter">抖动类型</label>
                <select
                  id="jitter"
                  value={params.jitter}
                  onChange={(e) => setParams(prev => ({ ...prev, jitter: e.target.value }))}
                >
                  <option value={JITTER_TYPES.NONE}>无抖动</option>
                  <option value={JITTER_TYPES.FULL}>全抖动</option>
                  <option value={JITTER_TYPES.EQUAL}>等比抖动</option>
                </select>
              </div>

              {params.jitter !== JITTER_TYPES.NONE && (
                <>
                  <div className="form-group">
                    <label htmlFor="jitterMin">抖动比例下限</label>
                    <input
                      id="jitterMin"
                      type="number"
                      min="0"
                      step="0.1"
                      value={params.jitterMin}
                      onChange={(e) => setParams(prev => ({ ...prev, jitterMin: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="jitterMax">抖动比例上限</label>
                    <input
                      id="jitterMax"
                      type="number"
                      min="0"
                      step="0.1"
                      value={params.jitterMax}
                      onChange={(e) => setParams(prev => ({ ...prev, jitterMax: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="unit">单位</label>
                <select
                  id="unit"
                  value={params.unit}
                  onChange={(e) => setParams(prev => ({ ...prev, unit: e.target.value }))}
                >
                  <option value={UNIT_TYPES.MS}>毫秒</option>
                  <option value={UNIT_TYPES.SECONDS}>秒</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="decimalPlaces">小数位</label>
                <input
                  id="decimalPlaces"
                  type="number"
                  min="0"
                  max="6"
                  step="1"
                  value={params.decimalPlaces}
                  onChange={(e) => setParams(prev => ({ ...prev, decimalPlaces: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
            </div>

            <div className="section-divider" />

            <div className="option-group">
              <h4>对齐选项</h4>
              <div className="option-row">
                <div className="checkbox-row">
                  <input
                    id="alignToSecond"
                    type="checkbox"
                    checked={params.alignToSecond}
                    onChange={(e) => setParams(prev => ({ ...prev, alignToSecond: e.target.checked }))}
                  />
                  <label htmlFor="alignToSecond">整秒对齐</label>
                </div>

                {!params.alignToSecond && (
                  <div className="form-group" style={{ minWidth: '150px' }}>
                    <label htmlFor="alignGridMs">
                      网格对齐 <small>(毫秒)</small>
                    </label>
                    <input
                      id="alignGridMs"
                      type="number"
                      min="0"
                      step="100"
                      value={params.alignGridMs}
                      onChange={(e) => setParams(prev => ({ ...prev, alignGridMs: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="0 表示不对齐"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="action-row">
              <button className="primary-btn" onClick={handleGenerate}>
                生成序列
              </button>
            </div>
          </section>

          {result && !result.success && (
            <section className="section-box">
              {renderErrorBox(result.errorCode, result.errorMessage)}
            </section>
          )}

          {result && result.success && (
            <section className="section-box">
              <h3>结果</h3>

              {result.hasOverflow && (
                <div className="warning-box">
                  <strong>警告：</strong>计算过程中检测到数值溢出，序列已在安全范围内截断。
                </div>
              )}

              {result.hasNonFinite && (
                <div className="warning-box">
                  <strong>警告：</strong>计算产生非有限值（Infinity 或 NaN），序列已在安全范围内截断。
                </div>
              )}

              {renderSummaryCards()}

              <div className="option-group">
                <h4>视图</h4>
                <div className="view-toggle-group">
                  <button
                    className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                  >
                    表格
                  </button>
                  <button
                    className={`view-toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
                    onClick={() => setViewMode('chart')}
                  >
                    折线图
                  </button>
                  <button
                    className={`view-toggle-btn ${viewMode === 'both' ? 'active' : ''}`}
                    onClick={() => setViewMode('both')}
                  >
                    双视图
                  </button>
                </div>
              </div>

              {(viewMode === 'table' || viewMode === 'both') && renderTable()}
              {(viewMode === 'chart' || viewMode === 'both') && renderChart()}

              {renderDiffTable()}
            </section>
          )}
        </>
      )}

      {activeTab === 'inverse' && (
        <section className="section-box">
          <h3>反算模式</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            根据「目标总时长」和「最大步数」反算初值或乘数。
          </p>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="inverseTarget">
                目标总时长 <small>({getUnitLabel(params.unit)})</small>
              </label>
              <input
                id="inverseTarget"
                type="number"
                min="1"
                step="1"
                value={inverseTarget}
                onChange={(e) => setInverseTarget(e.target.value)}
                placeholder="例如：10000"
              />
            </div>

            <div className="form-group">
              <label>反算</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="secondary-btn small"
                  onClick={() => {
                    setInverseMode('initial')
                    handleInverseCalculate('initial')
                  }}
                >
                  初值
                </button>
                <button
                  className="secondary-btn small"
                  onClick={() => {
                    setInverseMode('multiplier')
                    handleInverseCalculate('multiplier')
                  }}
                >
                  乘数
                </button>
              </div>
            </div>
          </div>

          {inverseResult && (
            <div style={{ marginTop: '1.5rem' }}>
              {!inverseResult.success ? (
                renderErrorBox(inverseResult.errorCode, inverseResult.errorMessage)
              ) : (
                <div className="info-box">
                  <strong>计算结果：</strong>
                  <p style={{ marginTop: '0.5rem' }}>
                    {inverseResult.mode === 'initial' ? (
                      <>
                        初值 = <code>{formatValue(inverseResult.initial, params.unit, params.decimalPlaces)} {getUnitLabel(params.unit)}</code>
                      </>
                    ) : (
                      <>
                        乘数 = <code>{inverseResult.multiplier.toFixed(4)}</code>
                      </>
                    )}
                  </p>
                  <button
                    className="secondary-btn"
                    style={{ marginTop: '0.75rem' }}
                    onClick={handleApplyInverse}
                  >
                    应用到当前配置
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="inverse-section">
            <h4>当前配置参考</h4>
            <ul style={{ fontSize: '0.875rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', lineHeight: '1.8' }}>
              <li>算法：{params.algorithm === ALGORITHM_TYPES.EXPONENTIAL ? '指数退避' : '线性退避'}</li>
              <li>初值：{formatValue(params.initial, params.unit, params.decimalPlaces)} {getUnitLabel(params.unit)}</li>
              <li>乘数：{params.multiplier}</li>
              <li>最大步数：{params.maxSteps}</li>
              <li>最大间隔：{params.max > 0 ? `${formatValue(params.max, params.unit, params.decimalPlaces)} ${getUnitLabel(params.unit)}` : '无限制'}</li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === 'export' && (
        <section className="section-box">
          <h3>导出选项</h3>

          {result && !result.success && (
            <div className="warning-box">
              <strong>提示：</strong>当前配置有错误，请先在「计算器」标签页修正。
            </div>
          )}

          {result && result.success && (
            <>
              <div className="export-buttons">
                <button className="secondary-btn" onClick={handleExportCSV}>
                  下载 CSV
                </button>
                <button className="secondary-btn" onClick={handleExportJSON}>
                  下载 JSON
                </button>
              </div>

              <div className="section-divider" />

              <h4>生成 Sleep 代码</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  className="secondary-btn small"
                  style={{
                    background: exportCodeLanguage === 'bash' ? 'var(--accent)' : undefined,
                    color: exportCodeLanguage === 'bash' ? '#fff' : undefined,
                    borderColor: exportCodeLanguage === 'bash' ? 'var(--accent)' : undefined,
                  }}
                  onClick={() => setExportCodeLanguage('bash')}
                >
                  Bash
                </button>
                <button
                  className="secondary-btn small"
                  style={{
                    background: exportCodeLanguage === 'powershell' ? 'var(--accent)' : undefined,
                    color: exportCodeLanguage === 'powershell' ? '#fff' : undefined,
                    borderColor: exportCodeLanguage === 'powershell' ? 'var(--accent)' : undefined,
                  }}
                  onClick={() => setExportCodeLanguage('powershell')}
                >
                  PowerShell
                </button>
              </div>

              <pre className="code-block">{escapeHtml(sleepCode)}</pre>

              <div className="action-row">
                <button className="primary-btn" onClick={handleCopySleepCode}>
                  复制代码
                </button>
              </div>
            </>
          )}

          <div className="notes-section">
            <h3>说明</h3>
            <ul>
              <li>
                <strong>纯前端实现：</strong>所有计算均在浏览器本地执行，不向任何后端服务器发送数据。
              </li>
              <li>
                <strong>指数退避：</strong>间隔 = 初值 × 乘数^(步数-1)，封顶后保持最大间隔。
              </li>
              <li>
                <strong>线性退避：</strong>间隔 = 初值 + (步数-1) × 步长，封顶后保持最大间隔。
              </li>
              <li>
                <strong>全抖动：</strong>在 [min×值, max×值] 范围内完全随机。
              </li>
              <li>
                <strong>等比抖动：</strong>在 [min×值 + 中点, max×值] 范围内随机，偏向中线。
              </li>
              <li>
                <strong>数据不外出：</strong>图表使用纯 SVG 渲染，CSV/JSON 在本地生成。
              </li>
              <li>
                <strong>防 XSS：</strong>所有用户输入和展示内容均经过 HTML 转义。
              </li>
              <li>
                <strong>大体量步数：</strong>最大支持 {MAX_ALLOWED.MAX_STEPS} 步，超过此限制请考虑使用 Worker。
              </li>
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
