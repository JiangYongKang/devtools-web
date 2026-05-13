import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  BYTE_UNITS,
  BIT_UNITS,
  BITRATE_UNITS,
  BYTE_PER_SECOND_UNITS,
  TIME_UNITS,
  ROUNDING_MODES,
  DEFAULT_DECIMALS,
  DEFAULT_ROUNDING_MODE,
  SCIENTIFIC_THRESHOLD,
  STORAGE_KEYS,
  EXAMPLES,
  FAQ_ITEMS,
  MAX_BATCH_SIZE,
  MAX_HISTORY_SIZE,
  getUnitByCode,
  getUnitsByCategory,
  convertAndFormat,
  convertToMultipleUnits,
  calculateBandwidthTime,
  calculateStorageCost,
  aggregateBatchResults,
  exportToTSV,
  buildConversionFormula,
  parseWithUnit,
  parseBatchLines,
  parseFromClipboard,
} from './logic/index.js'
import './DataUnitConverterTool.css'

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

function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
  }
}

function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const stored = localStorage.getItem(key)
    if (stored != null) {
      return JSON.parse(stored)
    }
  } catch {
  }
  return defaultValue
}

function buildUrlParams(state) {
  const params = new URLSearchParams()
  if (state.activeTab) params.set('tab', state.activeTab)
  if (state.value) params.set('value', state.value)
  if (state.sourceUnit) params.set('source', state.sourceUnit)
  if (state.targetUnit) params.set('target', state.targetUnit)
  if (state.roundingMode) params.set('rounding', state.roundingMode)
  if (state.decimals != null) params.set('decimals', String(state.decimals))
  if (state.useGrouping != null) params.set('grouping', String(state.useGrouping))
  if (state.showDual != null) params.set('dual', String(state.showDual))
  return params.toString()
}

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    activeTab: params.get('tab') || 'single',
    value: params.get('value') || '',
    sourceUnit: params.get('source') || 'GB',
    targetUnit: params.get('target') || 'MB',
    roundingMode: params.get('rounding') || DEFAULT_ROUNDING_MODE,
    decimals: params.get('decimals') ? Number(params.get('decimals')) : DEFAULT_DECIMALS,
    useGrouping: params.get('grouping') === 'false' ? false : true,
    showDual: params.get('dual') === 'true',
  }
}

const CATEGORY_OPTIONS = [
  { value: CATEGORIES.BYTE, label: '字节存储 (B, KB, MB, GB...)', units: BYTE_UNITS },
  { value: CATEGORIES.BIT, label: '比特存储 (bit, Kbit, Mbit...)', units: BIT_UNITS },
  { value: CATEGORIES.BITRATE, label: '比特率 (bps, Kbps, Mbps...)', units: BITRATE_UNITS },
  { value: CATEGORIES.BYTE_PER_SECOND, label: '字节/秒 (B/s, KB/s...)', units: BYTE_PER_SECOND_UNITS },
]

export default function DataUnitConverterTool() {
  const urlParams = useMemo(() => parseUrlParams(), [])

  const [activeTab, setActiveTab] = useState(urlParams.activeTab)
  const [value, setValue] = useState(urlParams.value)
  const [sourceCategory, setSourceCategory] = useState(CATEGORIES.BYTE)
  const [targetCategory, setTargetCategory] = useState(CATEGORIES.BYTE)
  const [sourceUnit, setSourceUnit] = useState(urlParams.sourceUnit)
  const [targetUnit, setTargetUnit] = useState(urlParams.targetUnit)

  const [roundingMode, setRoundingMode] = useState(urlParams.roundingMode)
  const [decimals, setDecimals] = useState(urlParams.decimals)
  const [useGrouping, setUseGrouping] = useState(urlParams.useGrouping)
  const [showDual, setShowDual] = useState(urlParams.showDual)
  const [useScientific, setUseScientific] = useState(false)

  const [singleResult, setSingleResult] = useState(null)
  const [multiResults, setMultiResults] = useState(null)

  const [batchInput, setBatchInput] = useState('')
  const [batchSourceUnit, setBatchSourceUnit] = useState('GB')
  const [batchTargetUnit, setBatchTargetUnit] = useState('MB')
  const [batchResult, setBatchResult] = useState(null)

  const [bandwidth, setBandwidth] = useState(100)
  const [bandwidthUnit, setBandwidthUnit] = useState('Mbps')
  const [time, setTime] = useState(1)
  const [timeUnit, setTimeUnit] = useState('h')
  const [bandwidthResult, setBandwidthResult] = useState(null)
  const [costPerGB, setCostPerGB] = useState('')

  const [favorites, setFavorites] = useState(() =>
    loadFromLocalStorage(STORAGE_KEYS.FAVORITES, [])
  )
  const [history, setHistory] = useState(() =>
    loadFromLocalStorage(STORAGE_KEYS.HISTORY, [])
  )

  const [expandedFaq, setExpandedFaq] = useState([])
  const [showRelationPanel, setShowRelationPanel] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.FAVORITES, favorites)
  }, [favorites])

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.HISTORY, history)
  }, [history])

  const sourceUnits = useMemo(() => {
    const cat = CATEGORY_OPTIONS.find((c) => c.value === sourceCategory)
    return cat ? cat.units : BYTE_UNITS
  }, [sourceCategory])

  const targetUnits = useMemo(() => {
    const cat = CATEGORY_OPTIONS.find((c) => c.value === targetCategory)
    return cat ? cat.units : BYTE_UNITS
  }, [targetCategory])

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

  const addToHistory = useCallback((item) => {
    setHistory((prev) => {
      const newHistory = [item, ...prev.filter((h) => h.id !== item.id)]
      return newHistory.slice(0, MAX_HISTORY_SIZE)
    })
  }, [])

  const toggleFavorite = useCallback((unitCode) => {
    setFavorites((prev) => {
      if (prev.includes(unitCode)) {
        return prev.filter((f) => f !== unitCode)
      }
      return [...prev, unitCode]
    })
  }, [])

  const convertOptions = useMemo(() => ({
    roundingMode,
    decimals,
    useScientific,
    useGrouping,
    locale: navigator.language || 'en-US',
  }), [roundingMode, decimals, useScientific, useGrouping])

  const handleSingleConvert = useCallback(() => {
    if (!value.trim()) {
      setSingleResult(null)
      return
    }

    const parsed = parseWithUnit(`${value} ${sourceUnit}`)
    if (parsed.error) {
      setSingleResult(parsed)
      return
    }

    const result = convertAndFormat(parsed.value, parsed.unitCode, targetUnit, convertOptions)

    setSingleResult(result)

    if (!result.error) {
      addToHistory({
        id: `${Date.now()}-${Math.random()}`,
        value: parsed.value,
        sourceUnit: parsed.unitCode,
        targetUnit,
        result: result.value,
        timestamp: Date.now(),
      })
    }
  }, [value, sourceUnit, targetUnit, convertOptions, addToHistory])

  const handleMultiConvert = useCallback(() => {
    if (!value.trim()) {
      setMultiResults(null)
      return
    }

    const parsed = parseWithUnit(`${value} ${sourceUnit}`)
    if (parsed.error) {
      setMultiResults({ error: parsed.error })
      return
    }

    const source = getUnitByCode(parsed.unitCode)
    const targetUnitsList = source ? getUnitsByCategory(source.category) : targetUnits

    const result = convertToMultipleUnits(
      parsed.value,
      parsed.unitCode,
      targetUnitsList.map((u) => u.code),
      convertOptions
    )

    setMultiResults(result)

    if (result.allSuccess && result.results.length > 0) {
      addToHistory({
        id: `${Date.now()}-${Math.random()}`,
        value: parsed.value,
        sourceUnit: parsed.unitCode,
        targetUnit: result.results[0].targetUnit.code,
        result: result.results[0].value,
        timestamp: Date.now(),
      })
    }
  }, [value, sourceUnit, targetUnits, convertOptions, addToHistory])

  const handleBatchConvert = useCallback(() => {
    if (!batchInput.trim()) {
      setBatchResult(null)
      return
    }

    const parsed = parseBatchLines(batchInput, batchSourceUnit, batchTargetUnit)

    const items = parsed.items.map((item) => ({
      value: item.value,
      sourceUnit: item.sourceUnit,
      targetUnit: item.targetUnit,
    }))

    if (items.length > MAX_BATCH_SIZE) {
      setBatchResult({
        totalCount: items.length,
        successCount: 0,
        failureCount: items.length,
        allSuccess: false,
        items: [],
        error: {
          errorCode: 'BATCH_TOO_LARGE',
          errorMessage: `批量转换条目数超出限制 (最大 ${MAX_BATCH_SIZE} 条)`,
        },
      })
      return
    }

    const result = aggregateBatchResults(items, convertOptions)
    setBatchResult(result)
  }, [batchInput, batchSourceUnit, batchTargetUnit, convertOptions])

  const handleBandwidthCalculate = useCallback(() => {
    const bwNum = parseFloat(String(bandwidth))
    const timeNum = parseFloat(String(time))

    if (isNaN(bwNum) || isNaN(timeNum)) {
      setBandwidthResult(null)
      return
    }

    const result = calculateBandwidthTime(
      bwNum,
      bandwidthUnit,
      timeNum,
      timeUnit,
      ['EB', 'PB', 'TB', 'GB', 'GiB', 'MB', 'MiB', 'KB', 'KiB', 'B'],
      convertOptions
    )

    setBandwidthResult(result)
  }, [bandwidth, bandwidthUnit, time, timeUnit, convertOptions])

  const handleLoadExample = useCallback((example) => {
    setValue(example.value)
    setSourceUnit(example.sourceUnit)
    if (activeTab === 'single' && example.targetUnits && example.targetUnits.length > 0) {
      setTargetUnit(example.targetUnits[0])
    }
    setSingleResult(null)
    setMultiResults(null)
  }, [activeTab])

  const handleLoadFromClipboard = useCallback(async () => {
    const result = await parseFromClipboard()
    if (result.error) {
      setCopyStatus({ type: 'error', message: result.error.errorMessage })
      return
    }

    if (result.items && result.items.length > 0) {
      const first = result.items[0]
      setValue(String(first.value))
      setSourceUnit(first.unitCode)
      setSingleResult(null)
      setMultiResults(null)
      setCopyStatus({ type: 'success', message: `已从剪贴板加载 ${result.count} 个值` })
    }
  }, [])

  const handleExportTSV = useCallback(() => {
    if (!batchResult) return
    const tsv = exportToTSV(batchResult)
    handleCopy(tsv, '批量转换结果 (TSV)')
  }, [batchResult, handleCopy])

  const handleCopyFormula = useCallback((result) => {
    if (!result || result.error) return

    const formula = buildConversionFormula(
      result.sourceValue,
      result.sourceUnit,
      result.targetUnit,
      result.formattedValue
    )

    if (formula) {
      const text = `${formula.formula}\n\n${formula.explanation}`
      handleCopy(text, '换算公式')
    }
  }, [handleCopy])

  const toggleFaq = useCallback((index) => {
    setExpandedFaq((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      }
      return [...prev, index]
    })
  }, [])

  const renderUnitSelector = (value, onChange, units, id, label) => (
    <div className="unit-selector">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="unit-select"
      >
        {units.map((unit) => (
          <option key={unit.code} value={unit.code}>
            {unit.symbol} - {unit.name}
          </option>
        ))}
      </select>
    </div>
  )

  const renderErrorBox = (error) => {
    if (!error || !error.errorCode) return null
    return (
      <div className="error-box">
        <strong>转换失败</strong>
        <p>{escapeHtml(error.errorMessage)}</p>
        <div className="error-code">错误码：{escapeHtml(error.errorCode)}</div>
      </div>
    )
  }

  const renderSingleResult = () => {
    if (!singleResult) return null

    if (singleResult.error) {
      return renderErrorBox(singleResult)
    }

    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">转换结果</span>
          <div className="result-actions">
            <button
              className="copy-btn"
              onClick={() => handleCopy(singleResult.displayValue, '转换结果')}
            >
              复制结果
            </button>
            <button
              className="copy-btn"
              onClick={() => handleCopyFormula(singleResult)}
            >
              复制公式
            </button>
          </div>
        </div>
        <pre className="result-value">{escapeHtml(singleResult.displayValue)}</pre>
        <div className="result-info">
          <div className="info-item">
            <span className="info-label">原始值</span>
            <code>{escapeHtml(singleResult.formattedSourceValue)} {escapeHtml(singleResult.sourceUnit.symbol)}</code>
          </div>
          <div className="info-item">
            <span className="info-label">目标单位</span>
            <code>{escapeHtml(singleResult.targetUnit.name)} ({escapeHtml(singleResult.targetUnit.symbol)})</code>
          </div>
          {showDual && singleResult.targetUnit.system && (
            <div className="info-item">
              <span className="info-label">双标显示</span>
              <code>
                {escapeHtml(singleResult.targetUnit.system === 'si' ? 'SI (1000 进制)' : 'IEC (1024 进制)')}
              </code>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMultiResults = () => {
    if (!multiResults) return null

    if (multiResults.error) {
      return renderErrorBox(multiResults.error)
    }

    return (
      <div className="multi-results">
        <div className="result-header">
          <span className="result-label">多单位换算结果</span>
        </div>
        <div className="results-grid">
          {multiResults.results.map((result, idx) => (
            <div key={idx} className={`result-card ${result.error ? 'error' : ''}`}>
              {result.error ? (
                <div className="card-error">
                  <span className="card-unit">{escapeHtml(result.targetUnit?.symbol || '?')}</span>
                  <span className="card-error-msg">{escapeHtml(result.error.errorMessage)}</span>
                </div>
              ) : (
                <div className="card-content">
                  <span className="card-unit">{escapeHtml(result.targetUnit.symbol)}</span>
                  <span className="card-value">{escapeHtml(result.formattedValue)}</span>
                  <span className="card-name">{escapeHtml(result.targetUnit.name)}</span>
                  {result.targetUnit.system && (
                    <span className="card-system">
                      {result.targetUnit.system === 'si' ? 'SI' : 'IEC'}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderBatchResults = () => {
    if (!batchResult) return null

    return (
      <div className="batch-results">
        <div className="batch-summary">
          <div className="summary-item">
            <span className="summary-label">总数</span>
            <span className="summary-value">{batchResult.totalCount}</span>
          </div>
          <div className="summary-item success">
            <span className="summary-label">成功</span>
            <span className="summary-value success-value">{batchResult.successCount}</span>
          </div>
          <div className="summary-item failure">
            <span className="summary-label">失败</span>
            <span className="summary-value">{batchResult.failureCount}</span>
          </div>
          {batchResult.items.length > 0 && (
            <button className="export-btn" onClick={handleExportTSV}>
              导出 TSV
            </button>
          )}
        </div>

        <div className="batch-table-container">
          <table className="batch-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>输入</th>
                <th>源单位</th>
                <th>目标单位</th>
                <th>结果</th>
                <th>状态</th>
                <th>错误</th>
              </tr>
            </thead>
            <tbody>
              {batchResult.items.map((item, idx) => (
                <tr key={idx} className={item.success ? 'success-row' : 'failure-row'}>
                  <td>{idx + 1}</td>
                  <td><code>{escapeHtml(String(item.input.value))}</code></td>
                  <td><code>{escapeHtml(item.input.sourceUnit)}</code></td>
                  <td><code>{escapeHtml(item.input.targetUnit)}</code></td>
                  <td>
                    {item.success ? (
                      <code>{escapeHtml(item.result.displayValue)}</code>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${item.success ? 'success' : 'failure'}`}>
                      {item.success ? '成功' : '失败'}
                    </span>
                  </td>
                  <td>
                    {item.errorMessage ? (
                      <span className="error-cell" title={escapeHtml(item.errorCode)}>
                        {escapeHtml(item.errorMessage)}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderBandwidthResult = () => {
    if (!bandwidthResult) return null

    const costResult = costPerGB && !isNaN(parseFloat(costPerGB))
      ? calculateStorageCost(bandwidthResult.totalBytes, parseFloat(costPerGB), convertOptions)
      : null

    return (
      <div className="bandwidth-results">
        <div className="bandwidth-summary">
          <div className="summary-grid">
            <div className="info-item">
              <span className="info-label">带宽</span>
              <code>{escapeHtml(String(bandwidth))} {escapeHtml(bandwidthResult.bandwidthUnit.symbol)}</code>
            </div>
            <div className="info-item">
              <span className="info-label">时间</span>
              <code>{escapeHtml(String(time))} {escapeHtml(bandwidthResult.timeUnit.symbol)}</code>
            </div>
            <div className="info-item">
              <span className="info-label">总比特</span>
              <code>{escapeHtml(bandwidthResult.totalBits.toLocaleString())} bit</code>
            </div>
            <div className="info-item">
              <span className="info-label">总字节</span>
              <code>{escapeHtml(bandwidthResult.totalBytes.toLocaleString())} B</code>
            </div>
            {costResult && (
              <div className="info-item cost-item">
                <span className="info-label">存储成本 (参考)</span>
                <code>≈ ¥{escapeHtml(costResult.formattedTotalCost)}</code>
                <span className="cost-note">仅参考，非财务建议</span>
              </div>
            )}
          </div>
        </div>

        <div className="bandwidth-units">
          <h4>各单位换算结果</h4>
          <div className="results-grid">
            {bandwidthResult.results.map((result, idx) => (
              <div key={idx} className={`result-card ${result.error ? 'error' : ''}`}>
                {result.error ? (
                  <div className="card-error">
                    <span className="card-unit">{escapeHtml(result.targetUnit?.symbol)}</span>
                  </div>
                ) : (
                  <div className="card-content">
                    <span className="card-unit">{escapeHtml(result.targetUnit.symbol)}</span>
                    <span className="card-value">{escapeHtml(result.formattedValue)}</span>
                    <span className="card-name">{escapeHtml(result.targetUnit.name)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderHistory = () => {
    if (history.length === 0) {
      return (
        <div className="empty-history">
          <p>暂无历史记录</p>
        </div>
      )
    }

    return (
      <div className="history-list">
        {history.slice(0, 20).map((item) => {
          const sourceU = getUnitByCode(item.sourceUnit)
          const targetU = getUnitByCode(item.targetUnit)
          return (
            <div key={item.id} className="history-item">
              <div className="history-content">
                <span className="history-value">
                  {escapeHtml(String(item.value))} {sourceU ? escapeHtml(sourceU.symbol) : ''}
                </span>
                <span className="history-arrow">→</span>
                <span className="history-value">
                  {escapeHtml(String(item.result))} {targetU ? escapeHtml(targetU.symbol) : ''}
                </span>
              </div>
              <span className="history-time">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderFavorites = () => {
    if (favorites.length === 0) {
      return (
        <div className="empty-favorites">
          <p>暂无收藏单位</p>
          <p className="hint">在单位选择器旁点击 ★ 图标收藏</p>
        </div>
      )
    }

    return (
      <div className="favorites-grid">
        {favorites.map((code) => {
          const unit = getUnitByCode(code)
          if (!unit) return null
          return (
            <div key={code} className="favorite-item">
              <span className="favorite-symbol">{escapeHtml(unit.symbol)}</span>
              <span className="favorite-name">{escapeHtml(unit.name)}</span>
              <button
                className="remove-favorite"
                onClick={() => toggleFavorite(code)}
                title="取消收藏"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="data-unit-converter">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          单值转换
        </button>
        <button
          className={`tab-btn ${activeTab === 'multi' ? 'active' : ''}`}
          onClick={() => setActiveTab('multi')}
        >
          多单位换算
        </button>
        <button
          className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          批量转换
        </button>
        <button
          className={`tab-btn ${activeTab === 'bandwidth' ? 'active' : ''}`}
          onClick={() => setActiveTab('bandwidth')}
        >
          带宽 × 时间
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          历史 & 收藏
        </button>
      </div>

      <div className="options-section">
        <h3>显示选项</h3>
        <div className="options-grid">
          <div className="option-item option-input">
            <label htmlFor="rounding-mode">舍入模式</label>
            <select
              id="rounding-mode"
              value={roundingMode}
              onChange={(e) => setRoundingMode(e.target.value)}
            >
              {ROUNDING_MODES.map((mode) => (
                <option key={mode.code} value={mode.code}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
          <div className="option-item option-input">
            <label htmlFor="decimals">小数位数</label>
            <input
              id="decimals"
              type="number"
              min="0"
              max="20"
              value={decimals}
              onChange={(e) => setDecimals(Math.max(0, Math.min(20, Number(e.target.value))))}
            />
          </div>
          <label className="option-item" data-label="千分位分隔符">
            <input
              type="checkbox"
              checked={useGrouping}
              onChange={(e) => setUseGrouping(e.target.checked)}
            />
            <span>千分位分隔符</span>
          </label>
          <label className="option-item" data-label="科学计数法">
            <input
              type="checkbox"
              checked={useScientific}
              onChange={(e) => setUseScientific(e.target.checked)}
            />
            <span>科学计数法</span>
          </label>
          <label className="option-item" data-label="显示 SI/IEC 双标">
            <input
              type="checkbox"
              checked={showDual}
              onChange={(e) => setShowDual(e.target.checked)}
            />
            <span>显示 SI/IEC 双标</span>
          </label>
        </div>
      </div>

      {activeTab === 'single' && (
        <section className="tool-section">
          <h2>单值转换</h2>

          <div className="input-section">
            <div className="form-group">
              <label htmlFor="single-value">输入数值</label>
              <div className="input-row">
                <input
                  id="single-value"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="例如: 100, 1.5e3, 1,000"
                  className="value-input"
                  spellCheck={false}
                />
                <button
                  className="secondary-btn clipboard-btn"
                  onClick={handleLoadFromClipboard}
                  title="从剪贴板读取"
                >
                  📋
                </button>
              </div>
            </div>

            <div className="unit-row">
              <div className="unit-category-selector">
                <label>源单位类别</label>
                <select
                  value={sourceCategory}
                  onChange={(e) => {
                    const newCat = e.target.value
                    setSourceCategory(newCat)
                    const units = getUnitsByCategory(newCat)
                    if (units.length > 0) setSourceUnit(units[0].code)
                  }}
                  className="category-select"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              {renderUnitSelector(sourceUnit, setSourceUnit, sourceUnits, 'source-unit', '源单位')}
              <button
                className="favorite-toggle"
                onClick={() => toggleFavorite(sourceUnit)}
                title={favorites.includes(sourceUnit) ? '取消收藏' : '收藏单位'}
              >
                {favorites.includes(sourceUnit) ? '★' : '☆'}
              </button>

              <span className="swap-icon">⇄</span>

              <div className="unit-category-selector">
                <label>目标单位类别</label>
                <select
                  value={targetCategory}
                  onChange={(e) => {
                    const newCat = e.target.value
                    setTargetCategory(newCat)
                    const units = getUnitsByCategory(newCat)
                    if (units.length > 0) setTargetUnit(units[0].code)
                  }}
                  className="category-select"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              {renderUnitSelector(targetUnit, setTargetUnit, targetUnits, 'target-unit', '目标单位')}
              <button
                className="favorite-toggle"
                onClick={() => toggleFavorite(targetUnit)}
                title={favorites.includes(targetUnit) ? '取消收藏' : '收藏单位'}
              >
                {favorites.includes(targetUnit) ? '★' : '☆'}
              </button>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleSingleConvert}
              disabled={!value.trim()}
            >
              转换
            </button>
            <div className="examples-dropdown">
              <button className="secondary-btn">示例</button>
              <div className="examples-menu">
                {EXAMPLES.map((example, idx) => (
                  <button
                    key={idx}
                    className="example-item"
                    onClick={() => handleLoadExample(example)}
                  >
                    {example.description}
                  </button>
                ))}
              </div>
            </div>
            {singleResult && (
              <button
                className="secondary-btn"
                onClick={() => setSingleResult(null)}
              >
                清除
              </button>
            )}
          </div>

          {renderSingleResult()}
        </section>
      )}

      {activeTab === 'multi' && (
        <section className="tool-section">
          <h2>多单位换算</h2>

          <div className="input-section">
            <div className="form-group">
              <label htmlFor="multi-value">输入数值</label>
              <input
                id="multi-value"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="例如: 1"
                className="value-input"
                spellCheck={false}
              />
            </div>

            <div className="unit-row">
              {renderUnitSelector(sourceUnit, setSourceUnit, sourceUnits, 'multi-source-unit', '源单位')}
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleMultiConvert}
              disabled={!value.trim()}
            >
              换算所有同类别单位
            </button>
          </div>

          {renderMultiResults()}
        </section>
      )}

      {activeTab === 'batch' && (
        <section className="tool-section">
          <h2>批量转换</h2>

          <div className="form-group full-width">
            <label htmlFor="batch-input">输入列表（每行一个，格式：数值 [源单位] [目标单位]）</label>
            <textarea
              id="batch-input"
              className="batch-textarea"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={'每行一个条目，支持以下格式：\n100\n100 GB\n100 GB MB\n1.5 GiB TiB\n1000 B KB'}
              spellCheck={false}
            />
          </div>

          <div className="unit-row">
            {renderUnitSelector(batchSourceUnit, setBatchSourceUnit, BYTE_UNITS, 'batch-source', '默认源单位')}
            {renderUnitSelector(batchTargetUnit, setBatchTargetUnit, BYTE_UNITS, 'batch-target', '默认目标单位')}
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleBatchConvert}
              disabled={!batchInput.trim()}
            >
              批量转换
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                setBatchInput('1 GB MB\n2 GiB GB\n1000 B KB\n512 MiB GiB')
                setBatchResult(null)
              }}
            >
              加载示例
            </button>
            {batchResult && (
              <button
                className="secondary-btn"
                onClick={() => {
                  setBatchInput('')
                  setBatchResult(null)
                }}
              >
                清除
              </button>
            )}
          </div>

          <div className="batch-hint">
            <p>提示：每行格式说明</p>
            <ul>
              <li><code>数值</code> - 使用默认源/目标单位</li>
              <li><code>数值 源单位</code> - 指定源单位，使用默认目标单位</li>
              <li><code>数值 源单位 目标单位</code> - 完全指定</li>
            </ul>
            <p>最大支持 {MAX_BATCH_SIZE} 条</p>
          </div>

          {renderBatchResults()}
        </section>
      )}

      {activeTab === 'bandwidth' && (
        <section className="tool-section">
          <h2>带宽 × 时间 = 传输量</h2>

          <div className="bandwidth-inputs">
            <div className="bandwidth-group">
              <div className="form-group">
                <label htmlFor="bandwidth-value">带宽</label>
                <div className="input-row">
                  <input
                    id="bandwidth-value"
                    type="number"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    className="value-input"
                    min="0"
                  />
                  <select
                    value={bandwidthUnit}
                    onChange={(e) => setBandwidthUnit(e.target.value)}
                    className="inline-select"
                  >
                    {BITRATE_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <span className="multiply-icon">×</span>

            <div className="time-group">
              <div className="form-group">
                <label htmlFor="time-value">时间</label>
                <div className="input-row">
                  <input
                    id="time-value"
                    type="number"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="value-input"
                    min="0"
                  />
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value)}
                    className="inline-select"
                  >
                    {TIME_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="cost-input">
            <div className="form-group">
              <label htmlFor="cost-per-gb">存储单价 (元/GB，可选)</label>
              <input
                id="cost-per-gb"
                type="number"
                value={costPerGB}
                onChange={(e) => setCostPerGB(e.target.value)}
                placeholder="例如: 0.5"
                className="value-input"
                min="0"
                step="0.01"
              />
              <span className="cost-note-inline">仅做参考，非财务建议</span>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleBandwidthCalculate}
            >
              计算传输量
            </button>
          </div>

          {renderBandwidthResult()}
        </section>
      )}

      {activeTab === 'history' && (
        <section className="tool-section">
          <div className="history-favorites-container">
            <div className="history-section">
              <h3>最近换算历史</h3>
              {renderHistory()}
              {history.length > 0 && (
                <button
                  className="secondary-btn clear-btn"
                  onClick={() => setHistory([])}
                >
                  清空历史
                </button>
              )}
            </div>
            <div className="favorites-section">
              <h3>收藏单位</h3>
              {renderFavorites()}
            </div>
          </div>
        </section>
      )}

      <div className="relation-panel">
        <button
          className="panel-toggle"
          onClick={() => setShowRelationPanel(!showRelationPanel)}
        >
          {showRelationPanel ? '收起' : '展开'} 比特与字节关系说明
        </button>

        {showRelationPanel && (
          <div className="relation-content">
            <h4>Mbit 与 MiB 的关系</h4>
            <div className="relation-grid">
              <div className="relation-item">
                <strong>1 MiB</strong>
                <span>= 1024 × 1024 字节</span>
                <span>= 8,388,608 比特</span>
                <span>= 8.3886 Mbit (SI)</span>
              </div>
              <div className="relation-item">
                <strong>1 MB (SI)</strong>
                <span>= 1,000,000 字节</span>
                <span>= 8,000,000 比特</span>
                <span>= 8 Mbit</span>
              </div>
              <div className="relation-item">
                <strong>带宽换算</strong>
                <span>100 Mbps (比特/秒)</span>
                <span>= 12.5 MB/s (字节/秒)</span>
                <span>= 11.92 MiB/s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="faq-section">
        <h3>常见误解 FAQ</h3>
        {FAQ_ITEMS.map((item, idx) => (
          <div key={idx} className="faq-item">
            <button
              className={`faq-question ${expandedFaq.includes(idx) ? 'expanded' : ''}`}
              onClick={() => toggleFaq(idx)}
            >
              <span>{escapeHtml(item.question)}</span>
              <span className="faq-arrow">{expandedFaq.includes(idx) ? '−' : '+'}</span>
            </button>
            {expandedFaq.includes(idx) && (
              <div className="faq-answer">
                <p>{escapeHtml(item.answer)}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有换算均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>IEC vs SI：</strong>IEC 使用 1024 进制（KiB, MiB, GiB...），SI 使用 1000 进制（KB, MB, GB...）。
          </li>
          <li>
            <strong>输入格式：</strong>支持整数、小数、科学计数法（如 1e6），支持逗号或点号作为小数分隔符。
          </li>
          <li>
            <strong>单位收藏：</strong>收藏的单位保存在浏览器的 localStorage 中。
          </li>
          <li>
            <strong>限制：</strong>批量转换最大支持 {MAX_BATCH_SIZE} 条，历史记录最多保留 {MAX_HISTORY_SIZE} 条。
          </li>
        </ul>
      </div>
    </div>
  )
}
