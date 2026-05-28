import { useCallback, useEffect, useMemo, useState } from 'react'
import './DimensionalUnitConverterTool.css'
import {
  parseUnit,
  convertUnit,
  formatParseResult,
  formatVector,
  vectorsEqual,
  addUnitAlias,
  clearUserAliases,
  getUserAliases,
  getUnitsByCategory,
  RoundingMode,
  exportAllAuditLogs,
  findUnit,
} from './logic/index.js'
import { EXAMPLES } from './logic/examples.js'

/**
 * 将任意值压缩为适合 UI 摘要展示的字符串
 * @param {unknown} v
 * @returns {string}
 */
function summarizeValue(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    const s = JSON.stringify(v)
    return s.length > 120 ? s.slice(0, 120) + '…' : s
  } catch {
    return String(v)
  }
}

/**
 * 量纲单位换算工具主组件
 */
export default function DimensionalUnitConverterTool() {
  const [value, setValue] = useState('1')
  const [fromUnit, setFromUnit] = useState('N')
  const [toUnit, setToUnit] = useState('lbf')
  const [significantDigits, setSignificantDigits] = useState('4')
  const [roundingMode, setRoundingMode] = useState(RoundingMode.HALF_UP)
  const [includeSteps, setIncludeSteps] = useState(true)
  const [includeAuditLog, setIncludeAuditLog] = useState(true)

  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [parseInfo, setParseInfo] = useState(null)

  const [aliasName, setAliasName] = useState('')
  const [aliasTarget, setAliasTarget] = useState('')
  const [aliases, setAliases] = useState(new Map())

  const [conversionHistory, setConversionHistory] = useState([])
  const [copyStatus, setCopyStatus] = useState(null)
  const [showUnitLib, setShowUnitLib] = useState(false)
  const [autoConvert, setAutoConvert] = useState(true)

  const unitCategories = useMemo(() => getUnitsByCategory(), [])

  useEffect(() => {
    if (!autoConvert) return
    if (!value || !fromUnit || !toUnit) return

    const timer = setTimeout(() => {
      handleConvert()
    }, 400)

    return () => clearTimeout(timer)
  }, [value, fromUnit, toUnit, significantDigits, roundingMode, autoConvert])

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

  const handleLoadExample = useCallback((example) => {
    setValue(String(example.value))
    setFromUnit(example.fromUnit)
    setToUnit(example.toUnit)
    if (example.options) {
      if (example.options.significantDigits != null) {
        setSignificantDigits(String(example.options.significantDigits))
      }
      if (example.options.roundingMode) {
        setRoundingMode(example.options.roundingMode)
      }
    }
    setResult(null)
    setError(null)
    setParseInfo(null)
  }, [])

  const handleParse = useCallback(() => {
    const parseResult = parseUnit(fromUnit)
    setParseInfo({ from: parseResult })
    if (toUnit) {
      const toParse = parseUnit(toUnit)
      setParseInfo((prev) => ({ ...prev, to: toParse }))
    }
  }, [fromUnit, toUnit])

  const handleConvert = useCallback(() => {
    setError(null)
    setResult(null)

    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      setError({ message: '请输入有效的数值' })
      return
    }

    let sigDigits
    const sigDigitsNum = parseInt(significantDigits, 10)
    if (significantDigits === '' || significantDigits == null) {
      sigDigits = undefined
    } else if (isNaN(sigDigitsNum) || sigDigitsNum <= 0) {
      sigDigits = undefined
    } else {
      sigDigits = sigDigitsNum
    }

    const conversionResult = convertUnit(numValue, fromUnit, toUnit, {
      significantDigits: sigDigits,
      roundingMode,
      includeSteps,
      includeAuditLog,
    })

    if (!conversionResult.ok) {
      setError(conversionResult.error)
      if (conversionResult.conflict) {
        setResult({ conflict: conversionResult.conflict })
      }
      return
    }

    setResult(conversionResult)

    const historyEntry = {
      id: Date.now(),
      value: numValue,
      fromUnit,
      toUnit,
      result: conversionResult.resultRounded ?? conversionResult.result,
      auditLog: conversionResult.auditLog,
      timestamp: new Date().toLocaleString(),
    }
    setConversionHistory((prev) => [historyEntry, ...prev.slice(0, 49)])
  }, [value, fromUnit, toUnit, significantDigits, roundingMode, includeSteps, includeAuditLog])

  const handleSwapUnits = useCallback(() => {
    const temp = fromUnit
    setFromUnit(toUnit)
    setToUnit(temp)
    setResult(null)
    setParseInfo(null)
  }, [fromUnit, toUnit])

  const handleClear = useCallback(() => {
    setValue('')
    setFromUnit('')
    setToUnit('')
    setResult(null)
    setError(null)
    setParseInfo(null)
  }, [])

  const handleAddAlias = useCallback(() => {
    if (!aliasName.trim() || !aliasTarget.trim()) {
      return
    }
    const success = addUnitAlias(aliasName.trim(), aliasTarget.trim())
    if (success) {
      setAliases(getUserAliases())
      setAliasName('')
      setAliasTarget('')
    } else {
      setError({ message: '别名已存在或目标单位无效' })
      setTimeout(() => setError(null), 3000)
    }
  }, [aliasName, aliasTarget])

  const handleClearAliases = useCallback(() => {
    clearUserAliases()
    setAliases(new Map())
  }, [])

  const handleExportAuditLog = useCallback(() => {
    const log = exportAllAuditLogs(conversionHistory)
    handleCopy(log, '审计日志')
  }, [conversionHistory, handleCopy])

  const fromUnitDef = useMemo(() => findUnit(fromUnit), [fromUnit])
  const toUnitDef = useMemo(() => findUnit(toUnit), [toUnit])

  const fromParseStatus = useMemo(() => {
    if (!fromUnit) return null
    const r = parseUnit(fromUnit)
    return r.ok ? { ok: true, result: r.result } : { ok: false, error: r.error }
  }, [fromUnit])

  const toParseStatus = useMemo(() => {
    if (!toUnit) return null
    const r = parseUnit(toUnit)
    return r.ok ? { ok: true, result: r.result } : { ok: false, error: r.error }
  }, [toUnit])

  const sigDigitsWarning = useMemo(() => {
    const n = parseInt(significantDigits, 10)
    if (significantDigits === '' || significantDigits == null) return null
    if (isNaN(n) || n <= 0) return '有效数字必须大于 0，当前输入将被忽略（不限制精度）'
    if (n > 15) return '有效数字超过 15 位可能受浮点数精度限制'
    return null
  }, [significantDigits])

  return (
    <div className="dimensional-unit-converter">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>量纲单位换算工具</h2>
        <p className="tool-description">
          解析复合单位字符串并归约到 SI 七个基维向量；支持链式换算、温度仿射变换、有效数字与舍入模式选择；
          提供量纲冲突检测与审计日志导出。
        </p>
      </section>

      <section className="tool-section">
        <h3>内置示例</h3>
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
        <h3>单位换算</h3>
        <div className="converter-form">
          <div className="form-group">
            <label>数值</label>
            <input
              type="number"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setResult(null)
              }}
              placeholder="输入数值"
            />
          </div>
          <div className="form-group">
            <label>源单位</label>
            <input
              type="text"
              value={fromUnit}
              onChange={(e) => {
                setFromUnit(e.target.value)
                setResult(null)
                setParseInfo(null)
              }}
              placeholder="如 N, km/h, °C, kg·m/s²"
              className={fromParseStatus && !fromParseStatus.ok ? 'input-error' : ''}
            />
            {fromParseStatus && fromParseStatus.ok ? (
              <div className="dim-info dim-info">
                ✓ {fromUnitDef?.name || '解析成功'}
                <span className="dim-vector">
                  {formatVector(fromParseStatus.result.dimension)}
                </span>
              </div>
            ) : fromParseStatus && !fromParseStatus.ok ? (
              <div className="parse-error-inline">
              ✗ {fromParseStatus.error?.message || '解析失败'}
            </div>
            ) : null}
          </div>
          <div className="form-group">
            <label style={{ position: 'relative' }}>
              目标单位
              <button
                type="button"
                className="swap-btn"
                onClick={handleSwapUnits}
                title="交换单位"
              >
                ⇄
              </button>
            </label>
            <input
              type="text"
              value={toUnit}
              onChange={(e) => {
                setToUnit(e.target.value)
                setResult(null)
                setParseInfo(null)
              }}
              placeholder="如 lbf, m/s, °F"
              className={toParseStatus && !toParseStatus.ok ? 'input-error' : ''}
            />
            {toParseStatus && toParseStatus.ok ? (
              <div className="dim-info dim-info">
                ✓ {toUnitDef?.name || '解析成功'}
                <span className="dim-vector">
                  {formatVector(toParseStatus.result.dimension)}
                </span>
              </div>
            ) : toParseStatus && !toParseStatus.ok ? (
              <div className="parse-error-inline">
              ✗ {toParseStatus.error?.message || '解析失败'}
            </div>
            ) : null}
          </div>
        </div>

        <div className="options-row">
          <div className="form-group">
            <label>有效数字：</label>
            <input
              type="number"
              min="1"
              max="15"
              value={significantDigits}
              onChange={(e) => {
                setSignificantDigits(e.target.value)
                setResult(null)
              }}
              className={sigDigitsWarning ? 'input-warning' : ''}
            />
            {sigDigitsWarning && (
              <span className="inline-warning">⚠️ {sigDigitsWarning}</span>
            )}
          </div>
          <div className="form-group">
            <label>舍入模式：</label>
            <select
              value={roundingMode}
              onChange={(e) => {
                setRoundingMode(e.target.value)
                setResult(null)
              }}
            >
              <option value={RoundingMode.HALF_UP}>四舍五入 (Half-up)</option>
              <option value={RoundingMode.BANKERS}>银行家舍入 (Bankers)</option>
            </select>
          </div>
          <div className="form-group">
            <input
              type="checkbox"
              id="autoConvert"
              checked={autoConvert}
              onChange={(e) => setAutoConvert(e.target.checked)}
            />
            <label htmlFor="autoConvert">自动换算</label>
          </div>
          <div className="form-group">
            <input
              type="checkbox"
              id="includeSteps"
              checked={includeSteps}
              onChange={(e) => setIncludeSteps(e.target.checked)}
            />
            <label htmlFor="includeSteps">显示换算步骤</label>
          </div>
          <div className="form-group">
            <input
              type="checkbox"
              id="includeAudit"
              checked={includeAuditLog}
              onChange={(e) => setIncludeAuditLog(e.target.checked)}
            />
            <label htmlFor="includeAudit">生成审计日志</label>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleConvert}
            disabled={!value || !fromUnit || !toUnit}
          >
            换算
          </button>
          <button
            className="secondary-btn"
            onClick={handleParse}
            disabled={!fromUnit}
          >
            仅解析量纲
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
          >
            清除
          </button>
          <button
            className="secondary-btn"
            onClick={() => setShowUnitLib(!showUnitLib)}
          >
            {showUnitLib ? '隐藏' : '查看'}单位库
          </button>
        </div>
      </section>

      {showUnitLib && (
        <section className="tool-section">
          <h3>单位库</h3>
          <div className="unit-categories">
            {Object.entries(unitCategories).map(([category, units]) => (
              <div key={category} className="unit-category">
                <div className="unit-category-name">{category}</div>
                <div className="unit-symbols">
                  {units.map((sym) => (
                    <span
                      key={sym}
                      className="unit-symbol"
                      onClick={() => {
                        setToUnit(sym)
                        setResult(null)
                      }}
                      style={{ cursor: 'pointer' }}
                      title={`点击设为目标单位`}
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <section className="tool-section">
          <div className="error-box-compact">
            <div className="error-header">
              <span className="error-icon">⚠️</span>
              <span className="error-title">换算失败</span>
            </div>
            <p className="error-message">{error.message}</p>
            <div className="parse-status-row">
              <div className={`parse-status-item ${fromParseStatus?.ok ? 'ok' : 'error'}`}>
                <span className="parse-label">源单位 {fromUnit}</span>
                <span className="parse-value">
                  {fromParseStatus?.ok ? (
                    <span>✓ {formatVector(fromParseStatus.result.dimension)}</span>
                  ) : (
                    <span>✗ 解析失败</span>
                  )}
                </span>
              </div>
              <div className="parse-status-arrow">→</div>
              <div className={`parse-status-item ${toParseStatus?.ok ? 'ok' : 'error'}`}>
                <span className="parse-label">目标单位 {toUnit}</span>
                <span className="parse-value">
                  {toParseStatus?.ok ? (
                    <span>✓ {formatVector(toParseStatus.result.dimension)}</span>
                  ) : (
                    <span>✗ 解析失败</span>
                  )}
                </span>
              </div>
            </div>
            {fromParseStatus?.ok && toParseStatus?.ok &&
              !vectorsEqual(fromParseStatus.result.dimension, toParseStatus.result.dimension) && (
                <div className="dimension-diff">
                  <span>量纲不匹配：</span>
                  <span className="dim-diff-from">
                    {formatVector(fromParseStatus.result.dimension)}
                  </span>
                  <span> ≠ </span>
                  <span className="dim-diff-to">
                    {formatVector(toParseStatus.result.dimension)}
                  </span>
                </div>
            )}
            <div className="error-actions">
              <button className="secondary-btn" onClick={handleSwapUnits}>
                ⇄ 交换单位
              </button>
              <button className="secondary-btn" onClick={handleClear}>
                清除
              </button>
            </div>
          </div>
        </section>
      )}

      {parseInfo && (
        <section className="tool-section">
          <h3>量纲解析结果</h3>
          {parseInfo.from && (
            <div style={{ marginBottom: 12 }}>
              <strong>源单位 {fromUnit}：</strong>
              <span className="dimension-display">
                {formatParseResult(parseInfo.from)}
              </span>
            </div>
          )}
          {parseInfo.to && (
            <div>
              <strong>目标单位 {toUnit}：</strong>
              <span className="dimension-display">
                {formatParseResult(parseInfo.to)}
              </span>
            </div>
          )}
        </section>
      )}

      {result?.conflict && result.conflict.warnings.length > 0 && (
        <section className="tool-section">
          <div className="warning-box-compact">
            <div className="warning-header">
              <span className="warning-icon">⚠️</span>
              <span className="warning-title">注意</span>
            </div>
            {result.conflict.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </section>
      )}

      {result && result.ok && (
        <section className="tool-section">
          <h3>换算结果</h3>
          <div className="result-box">
            <div className="result-value">
              {result.resultRounded ?? result.result}
            </div>
            <div className="result-unit">{toUnit}</div>
            <div className="result-meta">
              <div className="meta-row">
                <span className="meta-label">原始值：</span>
                <span className="meta-value">
                  {value} {fromUnit}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">精确值：</span>
                <span className="meta-value">{result.result}</span>
              </div>
              {result.resultRounded !== undefined &&
                result.resultRounded !== result.result && (
                  <div className="meta-row">
                    <span className="meta-label">舍入：</span>
                    <span className="meta-value">
                      {significantDigits} 位有效数字，
                      {roundingMode === RoundingMode.BANKERS
                        ? '银行家舍入'
                        : '四舍五入'}
                    </span>
                  </div>
                )}
            </div>
          </div>

          {result.steps && result.steps.length > 0 && (
            <>
              <div className="section-divider">换算步骤链</div>
              <div className="steps-list">
                {result.steps.map((step, i) => (
                  <div key={i} className="step-item">
                    <div className="step-description">
                      步骤 {i + 1}：{step.description}
                    </div>
                    <div className="step-value">
                      {step.value} {step.unit}
                    </div>
                    <div className="step-formula">{step.formula}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {result.auditLog && (
            <>
              <div className="section-divider">审计日志</div>
              <div className="audit-log">
                <pre>{result.auditLog}</pre>
              </div>
              <div className="action-row">
                <button
                  className="secondary-btn"
                  onClick={() => handleCopy(result.auditLog, '审计日志')}
                >
                  复制审计日志
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="tool-section">
        <h3>自定义别名（会话内）</h3>
        <div className="alias-form">
          <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
            <label>别名</label>
            <input
              type="text"
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
              placeholder="如 牛顿"
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
            <label>映射到</label>
            <input
              type="text"
              value={aliasTarget}
              onChange={(e) => setAliasTarget(e.target.value)}
              placeholder="如 N"
            />
          </div>
          <button
            className="primary-btn"
            onClick={handleAddAlias}
            disabled={!aliasName || !aliasTarget}
          >
            添加
          </button>
          <button className="secondary-btn" onClick={handleClearAliases}>
            清除全部
          </button>
        </div>
        {aliases.size > 0 && (
          <div className="alias-list">
            {Array.from(aliases.entries()).map(([name, target]) => (
              <span key={name} className="alias-tag">
                {name} → {target}
              </span>
            ))}
          </div>
        )}
      </section>

      {conversionHistory.length > 0 && (
        <section className="tool-section">
          <h3>换算历史 ({conversionHistory.length})</h3>
          <div className="action-row">
            <button
              className="secondary-btn"
              onClick={handleExportAuditLog}
            >
              导出全部审计日志
            </button>
            <button
              className="secondary-btn"
              onClick={() => setConversionHistory([])}
            >
              清空历史
            </button>
          </div>
          <div className="steps-list" style={{ marginTop: 12 }}>
            {conversionHistory.slice(0, 10).map((entry) => (
              <div key={entry.id} className="step-item">
                <div className="step-description">
                  {entry.timestamp}
                </div>
                <div className="step-value">
                  {entry.value} {entry.fromUnit} = {entry.result}{' '}
                  {entry.toUnit}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="tool-section">
        <h3>说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: '#4a5568' }}>
          <li>
            <strong>量纲解析：</strong>支持复合单位如 <code>kg·m/s²</code>、<code>N·m</code>、<code>J/s</code>，
            运算符包括 <code>·</code> <code>*</code> <code>/</code> <code>^</code>，
            上标如 <code>s²</code> 也可识别。
          </li>
          <li>
            <strong>温度仿射变换：</strong>°C、°F 等纯温度单位使用仿射变换
            <code> T[K] = T × scale + offset</code>，复合单位中的温度仅线性缩放。
          </li>
          <li>
            <strong>冲突检测：</strong>不同量纲的单位无法换算或加减，
            温度与非温度混用会给出警告。
          </li>
          <li>
            <strong>舍入模式：</strong>四舍五入 (Half-up) 为常用模式，
            银行家舍入 (Bankers) 用于统计场景，遇 .5 时取偶。
          </li>
          <li>
            <strong>审计日志：</strong>每次换算可导出 Markdown 格式的详细日志，
            包含量纲分析、步骤链和参数记录。
          </li>
        </ul>
      </section>
    </div>
  )
}
