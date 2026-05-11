import { useCallback, useState } from 'react'
import { convertSingle, aggregateBatchResults } from './logic/converter.js'
import './BaseRadixConverterTool.css'

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

function getRadixDescription(radix) {
  const descriptions = {
    2: '二进制',
    8: '八进制',
    10: '十进制',
    16: '十六进制',
  }
  return descriptions[radix] || `${radix} 进制`
}

function getRadixPreview(radix) {
  const previews = {
    2: '0,1',
    8: '0-7',
    10: '0-9',
    16: '0-9, A-F',
  }
  if (radix <= 10) {
    return `0-${radix - 1}`
  }
  const letterEnd = String.fromCharCode(65 + radix - 11)
  return `0-9, A-${letterEnd}`
}

const PRESET_RADICES = [2, 8, 10, 16]

export default function BaseRadixConverterTool() {
  const [activeTab, setActiveTab] = useState('single')

  const [singleValue, setSingleValue] = useState('')
  const [sourceRadix, setSourceRadix] = useState(10)
  const [targetRadix, setTargetRadix] = useState(16)
  const [allowNegative, setAllowNegative] = useState(true)
  const [allowLeadingZeros, setAllowLeadingZeros] = useState(false)
  const [separator, setSeparator] = useState('')
  const [outputMinLength, setOutputMinLength] = useState(0)
  const [outputUpperCase, setOutputUpperCase] = useState(false)
  const [singleResult, setSingleResult] = useState(null)
  const [batchInput, setBatchInput] = useState('')
  const [batchSourceRadix, setBatchSourceRadix] = useState(10)
  const [batchTargetRadix, setBatchTargetRadix] = useState(16)
  const [batchResult, setBatchResult] = useState(null)
  const [batchAllowNegative, setBatchAllowNegative] = useState(true)
  const [batchAllowLeadingZeros, setBatchAllowLeadingZeros] = useState(false)
  const [batchSeparator, setBatchSeparator] = useState('')
  const [batchOutputMinLength, setBatchOutputMinLength] = useState(0)
  const [batchOutputUpperCase, setBatchOutputUpperCase] = useState(false)

  const [copyStatus, setCopyStatus] = useState(null)

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

  const handleSingleConvert = useCallback(() => {
    const result = convertSingle({
      value: singleValue,
      sourceRadix,
      targetRadix,
      allowNegative,
      allowLeadingZeros,
      separator,
      outputMinLength,
      outputUpperCase,
    })
    setSingleResult(result)
  }, [
    singleValue,
    sourceRadix,
    targetRadix,
    allowNegative,
    allowLeadingZeros,
    separator,
    outputMinLength,
    outputUpperCase,
  ])

  const handleSingleClear = useCallback(() => {
    setSingleValue('')
    setSingleResult(null)
  }, [])

  const handleBatchConvert = useCallback(() => {
    const lines = batchInput.split('\n').filter(line => line.trim() !== '')
    const items = lines.map(line => ({
      value: line.trim(),
      sourceRadix: batchSourceRadix,
      targetRadix: batchTargetRadix,
      allowNegative: batchAllowNegative,
      allowLeadingZeros: batchAllowLeadingZeros,
      separator: batchSeparator,
      outputMinLength: batchOutputMinLength,
      outputUpperCase: batchOutputUpperCase,
    }))
    const result = aggregateBatchResults(items)
    setBatchResult(result)
  }, [
    batchInput,
    batchSourceRadix,
    batchTargetRadix,
    batchAllowNegative,
    batchAllowLeadingZeros,
    batchSeparator,
    batchOutputMinLength,
    batchOutputUpperCase,
  ])

  const handleBatchClear = useCallback(() => {
    setBatchInput('')
    setBatchResult(null)
  }, [])

  const handleSwapRadices = useCallback(() => {
    if (activeTab === 'single') {
      const temp = sourceRadix
      setSourceRadix(targetRadix)
      setTargetRadix(temp)
      setSingleResult(null)
    } else {
      const temp = batchSourceRadix
      setBatchSourceRadix(batchTargetRadix)
      setBatchTargetRadix(temp)
      setBatchResult(null)
    }
  }, [activeTab, sourceRadix, targetRadix, batchSourceRadix, batchTargetRadix])

  const handleLoadExample = useCallback(() => {
    if (activeTab === 'single') {
      setSingleValue('255')
      setSourceRadix(10)
      setTargetRadix(16)
      setSingleResult(null)
    } else {
      setBatchInput('255\n1024\n-42\nFF\n1010')
      setBatchSourceRadix(16)
      setBatchTargetRadix(10)
      setBatchResult(null)
    }
  }, [activeTab])

  const renderRadixSelector = (value, onChange, label, id) => (
    <div className="radix-selector">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="radix-select"
      >
        {Array.from({ length: 35 }, (_, i) => i + 2).map((r) => (
          <option key={r} value={r}>
            {r} - {getRadixDescription(r)}
          </option>
        ))}
      </select>
      <div className="radix-hint">
        可用字符：<code>{getRadixPreview(value)}</code>
      </div>
    </div>
  )

  const renderResultInfo = (result) => {
    if (!result) return null

    if (result.errorCode) {
      return (
        <div className="error-box">
          <strong>转换失败</strong>
          <p>{result.errorMessage}</p>
          <div className="error-code">错误码：{result.errorCode}</div>
        </div>
      )
    }

    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">转换结果</span>
          <button
            className="copy-btn"
            onClick={() => handleCopy(result.convertedValue, '转换结果')}
          >
            复制
          </button>
        </div>
        <pre
          className="result-value"
          dangerouslySetInnerHTML={{ __html: escapeHtml(result.convertedValue) }}
        />
        <div className="result-info">
          <div className="info-item">
          <span className="info-label">原始值</span>
          <code>{escapeHtml(result.originalValue)}</code>
        </div>
        <div className="info-item">
          <span className="info-label">源进制</span>
          <code>{result.sourceRadix}</code>
        </div>
        <div className="info-item">
          <span className="info-label">目标进制</span>
          <code>{result.targetRadix}</code>
        </div>
        {result.isNegative && (
          <div className="info-item">
            <span className="info-label">是否负数</span>
            <code>是</code>
          </div>
        )}
        {result.numericValue !== null && (
          <div className="info-item">
            <span className="info-label">十进制数值</span>
            <code>{result.numericValue}</code>
          </div>
        )}
      </div>
      </div>
    )
  }

  const renderBatchResults = (result) => {
    if (!result) return null

    return (
      <div className="batch-results">
        <div className="batch-summary">
          <div className="summary-item success">
            <span className="summary-label">总数</span>
            <span className="summary-value">{result.totalCount}</span>
          </div>
          <div className="summary-item success">
            <span className="summary-label">成功</span>
            <span className="summary-value success-value">{result.successCount}</span>
          </div>
          <div className="summary-item failure">
            <span className="summary-label">失败</span>
            <span className="summary-value">{result.failureCount}</span>
          </div>
        </div>

        <div className="batch-items">
          {result.items.map((item, idx) => (
            <div
              key={idx} className={`batch-item ${item.success ? 'success' : 'failure'}`}>
              <div className="item-header">
                <span className="item-index">第 {idx + 1} 项</span>
                <span className={`item-status ${item.success ? 'status-success' : 'status-failure'}`}>
                  {item.success ? '成功' : '失败'}
                </span>
              </div>
              {item.success ? (
                <div className="item-success-content">
                  <div className="item-success-row">
                    <span className="item-original">输入：{escapeHtml(item.result.originalValue)}</span>
                    <span className="item-arrow">→</span>
                    <span className="item-converted">{escapeHtml(item.result.convertedValue)}</span>
                  </div>
                </div>
              ) : (
                <div className="item-failure-content">
                  <div className="item-error">
                    <span className="item-error-code">{item.errorCode}</span>
                    <span className="item-error-message">{item.errorMessage}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="base-radix-converter">
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
          className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          批量转换
        </button>
      </div>

      {activeTab === 'single' && (
        <section className="tool-section">
          <h2>单值进制转换</h2>

          <div className="input-section">
            <div className="form-group">
              <label htmlFor="single-value">输入数值</label>
              <input
                id="single-value"
                type="text"
                value={singleValue}
                onChange={(e) => setSingleValue(e.target.value)}
                placeholder="请输入要转换的数值"
                className="value-input"
                spellCheck={false}
              />
            </div>

            <div className="radix-row">
              {renderRadixSelector(sourceRadix, (v) => { setSourceRadix(v); setSingleResult(null) }, '源进制', 'source-radix')}
              <button
                className="swap-btn"
                onClick={handleSwapRadices}
                title="交换进制"
              >
                ⇄
              </button>
              {renderRadixSelector(targetRadix, (v) => { setTargetRadix(v); setSingleResult(null) }, '目标进制', 'target-radix')}
            </div>
          </div>

          <div className="options-section">
            <h3>转换选项</h3>
            <div className="options-grid">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={allowNegative}
                  onChange={(e) => setAllowNegative(e.target.checked)}
                />
                <span>允许负数</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={allowLeadingZeros}
                  onChange={(e) => setAllowLeadingZeros(e.target.checked)}
                />
                <span>允许前导零</span>
              </label>
              <div className="option-item option-input">
                <label htmlFor="single-separator">分隔符</label>
                <select
                  id="single-separator"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                >
                  <option value="">无</option>
                  <option value=" ">空格</option>
                  <option value="-">连字符</option>
                  <option value="_">下划线</option>
                  <option value=",">逗号</option>
                </select>
              </div>
              <div className="option-item option-input">
                <label htmlFor="single-min-length">最小长度</label>
                <input
                  id="single-min-length"
                  type="number"
                  min="0"
                  max="64"
                  value={outputMinLength}
                  onChange={(e) => setOutputMinLength(Math.max(0, Math.min(64, Number(e.target.value)))}
                />
              </div>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={outputUpperCase}
                  onChange={(e) => setOutputUpperCase(e.target.checked)}
                />
                <span>输出大写</span>
              </label>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleSingleConvert}
              disabled={!singleValue.trim()}
            >
              转换
            </button>
            <button
              className="secondary-btn"
              onClick={handleLoadExample}
            >
              加载示例
            </button>
            {singleResult && (
              <button
                className="secondary-btn"
                onClick={handleSingleClear}
              >
                清除
              </button>
            )}
          </div>

          {renderResultInfo(singleResult)}
        </section>
      )}

      {activeTab === 'batch' && (
        <section className="tool-section">
          <h2>批量进制转换</h2>

          <div className="form-group full-width">
            <label htmlFor="batch-input">输入数值列表（每行一个）</label>
            <textarea
              id="batch-input"
              className="batch-textarea"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="每行输入一个数值，例如：\n255\n1024\n-42\nFF\n1010"
              spellCheck={false}
            />
          </div>

          <div className="radix-row">
            {renderRadixSelector(batchSourceRadix, (v) => { setBatchSourceRadix(v); setBatchResult(null) }, '源进制', 'batch-source-radix')}
            <button
              className="swap-btn"
              onClick={handleSwapRadices}
              title="交换进制"
            >
              ⇄
            </button>
            {renderRadixSelector(batchTargetRadix, (v) => { setBatchTargetRadix(v); setBatchResult(null) }, '目标进制', 'batch-target-radix')}
          </div>

          <div className="options-section">
            <h3>转换选项</h3>
            <div className="options-grid">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={batchAllowNegative}
                  onChange={(e) => setBatchAllowNegative(e.target.checked)}
                />
                <span>允许负数</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={batchAllowLeadingZeros}
                  onChange={(e) => setBatchAllowLeadingZeros(e.target.checked)}
                />
                <span>允许前导零</span>
              </label>
              <div className="option-item option-input">
                <label htmlFor="batch-separator">分隔符</label>
                <select
                  id="batch-separator"
                  value={batchSeparator}
                  onChange={(e) => setBatchSeparator(e.target.value)}
                >
                  <option value="">无</option>
                  <option value=" ">空格</option>
                  <option value="-">连字符</option>
                  <option value="_">下划线</option>
                  <option value=",">逗号</option>
                </select>
              </div>
              <div className="option-item option-input">
                <label htmlFor="batch-min-length">最小长度</label>
                <input
                  id="batch-min-length"
                  type="number"
                  min="0"
                  max="64"
                  value={batchOutputMinLength}
                  onChange={(e) => setBatchOutputMinLength(Math.max(0, Math.min(64, Number(e.target.value)))}
                />
              </div>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={batchOutputUpperCase}
                  onChange={(e) => setBatchOutputUpperCase(e.target.checked)}
                />
                <span>输出大写</span>
              </label>
            </div>
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
              onClick={handleLoadExample}
            >
              加载示例
            </button>
            {batchResult && (
              <button
                className="secondary-btn"
                onClick={handleBatchClear}
              >
                清除
              </button>
            )}
          </div>

          {renderBatchResults(batchResult)}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有转换均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>进制范围：</strong>支持 2~36 进制转换，其中 10~35 对应字母 a~z。
          </li>
          <li>
            <strong>字符范围：</strong>
            <ul>
              <li>二进制（2）：0, 1</li>
              <li>八进制（8）：0-7</li>
              <li>十进制（10）：0-9</li>
              <li>十六进制（16）：0-9, a-f（不区分大小写）</li>
            </ul>
          </li>
          <li>
            <strong>负数：</strong>输入值前加 <code>-</code> 表示负数，如 <code>-FF</code>。
          </li>
          <li>
            <strong>限制：</strong>为避免精度丢失，建议输入长度不超过 15 位。
          </li>
        </ul>
      </div>
    </div>
  )
}
