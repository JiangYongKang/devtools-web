import { useState, useCallback } from 'react'
import './MoneyRatioDatetimeTool.css'
import {
  parseMoney,
  formatMoney,
  parseRatio,
  formatRatio,
  applyRatioToAmount,
  parseDatetime,
  formatDatetime,
  formatRelativeTime,
  getDstBoundaryExamples,
  DATE_PARSING_STRATEGIES,
  ROUNDING_MODES,
  ERROR_CODES,
  WARNING_CODES,
  SCHEMA_VERSION,
} from './logic/index.js'

const PRESET_EXAMPLES = {
  money: [
    { label: '千分位金额', value: '1,234.56' },
    { label: '括号负数', value: '(123.45)' },
    { label: '美元符号前缀', value: '$999.99' },
    { label: '欧元符号后缀', value: '888.88 €' },
    { label: '日元 (无小数)', value: '¥123456' },
  ],
  ratio: [
    { label: '百分比', value: '12.5%' },
    { label: '千分比', value: '5‰' },
    { label: '分数 1/3', value: '1/3' },
    { label: '小数', value: '0.1234' },
  ],
  datetime: [
    { label: 'ISO 格式', value: '2024-03-15T14:30:00Z' },
    { label: '日/月/年', value: '15/03/2024' },
    { label: '月/日/年 (歧义)', value: '03/05/2024' },
    { label: '点分隔格式', value: '15.03.2024' },
  ],
}

export default function MoneyRatioDatetimeTool() {
  const [activeTab, setActiveTab] = useState('money')
  const [rawInput, setRawInput] = useState('')
  const [locale, setLocale] = useState('zh-CN')
  const [currency, setCurrency] = useState('USD')
  const [dateStrategy, setDateStrategy] = useState(DATE_PARSING_STRATEGIES.DAY_FIRST)
  const [roundingMode, setRoundingMode] = useState(ROUNDING_MODES.HALF_UP)

  const [parsedResult, setParsedResult] = useState(null)
  const [ratioForCalculation, setRatioForCalculation] = useState('')

  const parseInput = useCallback((input) => {
    if (!input.trim()) {
      setParsedResult(null)
      return
    }

    let result

    switch (activeTab) {
      case 'money':
        result = parseMoney(input, { currency, roundingMode })
        break
      case 'ratio':
        result = parseRatio(input)
        break
      case 'datetime':
        result = parseDatetime(input, { parsingStrategy: dateStrategy })
        break
      default:
        result = null
    }

    setParsedResult(result)
  }, [activeTab, currency, dateStrategy, roundingMode])

  const handleInputChange = (e) => {
    const value = e.target.value
    setRawInput(value)
    parseInput(value)
  }

  const handlePresetClick = (value) => {
    setRawInput(value)
    parseInput(value)
  }

  const handleInsertDstExample = () => {
    const examples = getDstBoundaryExamples()
    const example = examples[0]
    const value = example.toISOString().slice(0, 19)
    setRawInput(value)
    parseInput(value)
  }

  const getDisplayValue = () => {
    if (!parsedResult || !parsedResult.success) return null

    const { data } = parsedResult

    switch (activeTab) {
      case 'money':
        return formatMoney(data.value, { currency, locale })
      case 'ratio':
        return formatRatio(data.value, { locale, symbol: data.symbol })
      case 'datetime':
        return (
          <div className="datetime-display">
            <div className="datetime-main">{formatDatetime(data.value, { locale, style: 'full' })}</div>
            <div className="datetime-relative">{formatRelativeTime(data.value, { locale })}</div>
          </div>
        )
      default:
        return null
    }
  }

  const getCombinedCalculation = () => {
    if (activeTab !== 'ratio' || !parsedResult?.success || !ratioForCalculation) {
      return null
    }

    const moneyResult = parseMoney(ratioForCalculation, { currency })
    if (!moneyResult.success) return null

    const result = applyRatioToAmount(moneyResult.data.value, parsedResult.data.value)
    return formatMoney(result, { currency, locale })
  }

  const tabs = [
    { id: 'money', label: '金额 Money', icon: '💰' },
    { id: 'ratio', label: '比率 Ratio', icon: '📊' },
    { id: 'datetime', label: '日期时间 DateTime', icon: '📅' },
  ]

  return (
    <div className="mrd-tool">
      <header className="tool-header">
        <h1>i18n 金额 · 比率 · 日期解析器</h1>
        <p className="subtitle">
          基于 Intl API 的多语言多地区格式化与自由文本解析
          <br />
          Schema 版本: {SCHEMA_VERSION}
        </p>
      </header>

      <div className="config-panel">
        <div className="config-group">
          <label>Locale (BCP-47)</label>
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="zh-CN">zh-CN (简体中文)</option>
            <option value="zh-TW">zh-TW (繁体中文)</option>
            <option value="en-US">en-US (English)</option>
            <option value="en-GB">en-GB (British English)</option>
            <option value="ja-JP">ja-JP (日本語)</option>
            <option value="de-DE">de-DE (Deutsch)</option>
            <option value="fr-FR">fr-FR (Français)</option>
          </select>
        </div>

        {activeTab === 'money' && (
          <div className="config-group">
            <label>货币 Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD (美元)</option>
              <option value="EUR">EUR (欧元)</option>
              <option value="GBP">GBP (英镑)</option>
              <option value="JPY">JPY (日元)</option>
              <option value="CNY">CNY (人民币)</option>
            </select>
          </div>
        )}

        {activeTab === 'money' && (
          <div className="config-group">
            <label>舍入模式</label>
            <select value={roundingMode} onChange={(e) => setRoundingMode(e.target.value)}>
              <option value={ROUNDING_MODES.HALF_UP}>四舍五入</option>
              <option value={ROUNDING_MODES.BANKERS}>银行家舍入</option>
            </select>
          </div>
        )}

        {activeTab === 'datetime' && (
          <div className="config-group">
            <label>日期解析策略</label>
            <select value={dateStrategy} onChange={(e) => setDateStrategy(e.target.value)}>
              <option value={DATE_PARSING_STRATEGIES.DAY_FIRST}>日优先 (dd/mm/yyyy)</option>
              <option value={DATE_PARSING_STRATEGIES.MONTH_FIRST}>月优先 (mm/dd/yyyy)</option>
            </select>
          </div>
        )}
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id)
              setParsedResult(null)
              setRawInput('')
            }}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="preset-buttons">
        <span className="preset-label">快速示例:</span>
        {PRESET_EXAMPLES[activeTab].map((preset, index) => (
          <button
            key={index}
            className="preset-btn"
            onClick={() => handlePresetClick(preset.value)}
          >
            {preset.label}
          </button>
        ))}
        {activeTab === 'datetime' && (
          <button className="preset-btn dst" onClick={handleInsertDstExample}>
            DST 边界示例
          </button>
        )}
      </div>

      <div className="three-column-layout">
        <div className="column input-column">
          <div className="column-header">
            <h3>原始输入</h3>
            <span className="column-badge">Raw Input</span>
          </div>
          <textarea
            className="raw-input"
            value={rawInput}
            onChange={handleInputChange}
            placeholder={`在此输入${activeTab === 'money' ? '金额' : activeTab === 'ratio' ? '比率' : '日期'}...`}
            rows={8}
          />

          {activeTab === 'ratio' && parsedResult?.success && (
            <div className="calculation-preview">
              <h4>与金额组合运算</h4>
              <input
                type="text"
                placeholder="输入金额，例如: 1000"
                value={ratioForCalculation}
                onChange={(e) => setRatioForCalculation(e.target.value)}
                className="calculation-input"
              />
              {(() => {
                const calculatedResult = getCombinedCalculation()
                return calculatedResult && (
                  <div className="calculation-result">
                    <span>结果: {calculatedResult}</span>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        <div className="column display-column">
          <div className="column-header">
            <h3>规范化展示</h3>
            <span className="column-badge">Normalized Display</span>
          </div>
          <div className="display-panel">
            {parsedResult === null && (
              <div className="placeholder">
                <span className="placeholder-icon">✨</span>
                <p>输入内容后将在此显示格式化结果</p>
              </div>
            )}

            {parsedResult?.success && (
              <div className="success-display">
                <div className="display-value">{getDisplayValue()}</div>
                {parsedResult.warnings.length > 0 && (
                  <div className="warnings-list">
                    <h4>⚠️ 解析警告</h4>
                    {parsedResult.warnings.map((w, i) => (
                      <div key={i} className="warning-item">
                        <code>{w.warningCode}</code>
                        <p>{w.warningMessage}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {parsedResult && !parsedResult.success && (
              <div className="error-display">
                <div className="error-icon">❌</div>
                <div className="error-info">
                  <code className="error-code">{parsedResult.error.errorCode}</code>
                  <p className="error-message">{parsedResult.error.userMessage}</p>
                  {parsedResult.error.details && (
                    <pre className="error-details">{JSON.stringify(parsedResult.error.details, null, 2)}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="column debug-column">
          <div className="column-header">
            <h3>调试 JSON</h3>
            <span className="column-badge">Debug Output</span>
          </div>
          <div className="debug-panel">
            <pre>{parsedResult ? JSON.stringify(parsedResult, (key, value) => {
              if (key === 'value' && value instanceof Date) {
                return value.toISOString()
              }
              return value
            }, 2) : '// 等待输入...'}</pre>
          </div>
        </div>
      </div>

      <div className="reference-section">
        <h3>📖 错误码与警告码速查</h3>
        <div className="reference-grid">
          <div className="reference-column">
            <h4>错误码 ERROR_CODES</h4>
            <ul>
              {Object.entries(ERROR_CODES).map(([key, value]) => (
                <li key={key}><code>{value}</code></li>
              ))}
            </ul>
          </div>
          <div className="reference-column">
            <h4>警告码 WARNING_CODES</h4>
            <ul>
              {Object.entries(WARNING_CODES).map(([key, value]) => (
                <li key={key}><code>{value}</code></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
