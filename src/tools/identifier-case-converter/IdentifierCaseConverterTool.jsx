import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './IdentifierCaseConverterTool.css'
import {
    ACRONYM_STRATEGIES,
    ACRONYM_STRATEGY_LABELS,
    CASE_STYLES,
    CASE_STYLE_LABELS,
    COMPRESSION_STRATEGIES,
    COMPRESSION_STRATEGY_LABELS,
    EXAMPLE_IDENTIFIERS,
    ILLEGAL_CHAR_MODES,
    ILLEGAL_CHAR_MODE_LABELS,
    MAX_INPUT_LINES,
    NUMBER_ATTACH_STRATEGIES,
    NUMBER_ATTACH_STRATEGY_LABELS,
    STORAGE_KEY,
    THROTTLE_DELAY_MS,
    UNICODE_MODES,
    UNICODE_MODE_LABELS,
    convertBatch,
    convertSingle,
    parseClipboardInput,
    roundTripCheck,
} from './logic/index.js'

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

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getDefaultOptions() {
  return {
    targetCase: CASE_STYLES.SNAKE_CASE,
    acronymStrategy: ACRONYM_STRATEGIES.FIRST_LETTER_ACRONYM,
    numberAttachStrategy: NUMBER_ATTACH_STRATEGIES.ATTACH_PREVIOUS,
    illegalCharMode: ILLEGAL_CHAR_MODES.PRESERVE,
    compression: COMPRESSION_STRATEGIES.COMPRESS_ALL,
    unicodeMode: UNICODE_MODES.ASCII_ONLY,
    prefix: '',
    suffix: '',
    namespaceDelimiter: '',
    saveToStorage: true,
  }
}

export default function IdentifierCaseConverterTool() {
  const [inputText, setInputText] = useState('')
  const [selectedExample, setSelectedExample] = useState(null)
  const [autoConvert, setAutoConvert] = useState(true)
  const [options, setOptions] = useState(getDefaultOptions)
  const [singleResult, setSingleResult] = useState(null)
  const [batchResults, setBatchResults] = useState(null)
  const [roundTripResult, setRoundTripResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [expandedReasons, setExpandedReasons] = useState(new Set())
  const throttleTimerRef = useRef(null)
  const hasLoadedFromStorageRef = useRef(false)

  useEffect(() => {
    if (hasLoadedFromStorageRef.current) return

    const params = new URLSearchParams(window.location.search)
    const urlOptions = {}

    if (params.has('case')) {
      const caseVal = params.get('case')
      if (Object.values(CASE_STYLES).includes(caseVal)) {
        urlOptions.targetCase = caseVal
      }
    }
    if (params.has('acronym')) {
      const val = params.get('acronym')
      if (Object.values(ACRONYM_STRATEGIES).includes(val)) {
        urlOptions.acronymStrategy = val
      }
    }
    if (params.has('number')) {
      const val = params.get('number')
      if (Object.values(NUMBER_ATTACH_STRATEGIES).includes(val)) {
        urlOptions.numberAttachStrategy = val
      }
    }
    if (params.has('illegal')) {
      const val = params.get('illegal')
      if (Object.values(ILLEGAL_CHAR_MODES).includes(val)) {
        urlOptions.illegalCharMode = val
      }
    }
    if (params.has('compress')) {
      const val = params.get('compress')
      if (Object.values(COMPRESSION_STRATEGIES).includes(val)) {
        urlOptions.compression = val
      }
    }
    if (params.has('unicode')) {
      const val = params.get('unicode')
      if (Object.values(UNICODE_MODES).includes(val)) {
        urlOptions.unicodeMode = val
      }
    }
    if (params.has('input')) {
      const inputValue = decodeURIComponent(params.get('input'))
      requestAnimationFrame(() => {
        setInputText(inputValue)
      })
    }

    let stored = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) stored = JSON.parse(raw)
    } catch {
      stored = null
    }

    if (stored && stored.saveToStorage) {
      const merged = { ...stored, ...urlOptions }
      requestAnimationFrame(() => {
        setOptions(merged)
      })
    } else if (Object.keys(urlOptions).length > 0) {
      requestAnimationFrame(() => {
        setOptions(prev => ({ ...prev, ...urlOptions }))
      })
    }

    hasLoadedFromStorageRef.current = true
  }, [])

  useEffect(() => {
    if (!hasLoadedFromStorageRef.current) return
    if (options.saveToStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
      } catch {
        // localStorage 不可用时静默失败
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // localStorage 不可用时静默失败
      }
    }
  }, [options])

  const convertOptions = useMemo(() => {
    return {
      targetCase: options.targetCase,
      acronymStrategy: options.acronymStrategy,
      numberAttachStrategy: options.numberAttachStrategy,
      illegalCharMode: options.illegalCharMode,
      compression: options.compression,
      unicodeMode: options.unicodeMode,
      prefix: options.prefix,
      suffix: options.suffix,
      namespaceDelimiter: options.namespaceDelimiter,
    }
  }, [options])

  const handleConvert = useCallback(() => {
    const lines = inputText.split('\n')
    const nonEmptyLines = lines.filter(line => line.trim().length > 0)

    if (nonEmptyLines.length === 0) {
      setSingleResult(null)
      setBatchResults(null)
      setRoundTripResult(null)
      return
    }

    if (nonEmptyLines.length === 1) {
      const single = convertSingle(nonEmptyLines[0], convertOptions)
      setSingleResult(single)
      setBatchResults(null)

      const roundTrip = roundTripCheck(nonEmptyLines[0], {
        targetCase: options.targetCase,
        tokenizeOptions: {
          acronymStrategy: options.acronymStrategy,
          numberAttachStrategy: options.numberAttachStrategy,
          unicodeMode: options.unicodeMode,
        },
      })
      setRoundTripResult(roundTrip)
    } else {
      const batch = convertBatch(nonEmptyLines.slice(0, MAX_INPUT_LINES), convertOptions)
      setBatchResults(batch)
      setSingleResult(null)
      setRoundTripResult(null)
    }
  }, [inputText, convertOptions, options.targetCase, options.acronymStrategy, options.numberAttachStrategy, options.unicodeMode])

  useEffect(() => {
    if (!autoConvert) return

    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current)
    }
    throttleTimerRef.current = setTimeout(() => {
      handleConvert()
    }, THROTTLE_DELAY_MS)

    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current)
      }
    }
  }, [handleConvert, autoConvert])

  const handleOptionChange = useCallback((key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleExampleClick = useCallback((example) => {
    setInputText(example)
    setSelectedExample(example)
  }, [])

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = parseClipboardInput(text)
      setInputText(parsed.values.join('\n'))
      setCopyStatus({ type: 'success', message: `已从剪贴板解析（${parsed.mode} 模式）` })
      setTimeout(() => setCopyStatus(null), 2500)
    } catch (err) {
      setCopyStatus({ type: 'error', message: `读取剪贴板失败：${err?.message || '未知错误'}` })
      setTimeout(() => setCopyStatus(null), 2500)
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

  const handleCopyAllResults = useCallback(() => {
    let text = ''
    if (singleResult && singleResult.success) {
      text = singleResult.result
    } else if (batchResults) {
      const lines = inputText.split('\n')
      const results = []
      let resultIdx = 0
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length === 0) {
          results.push('')
          continue
        }
        if (resultIdx < batchResults.results.length) {
          const r = batchResults.results[resultIdx]
          results.push(r.success ? r.result : `[ERROR: ${r.error?.errorCode}]`)
          resultIdx++
        } else {
          results.push('')
        }
      }
      text = results.join('\n')
    }
    if (text) {
      handleCopy(text, '全部结果')
    }
  }, [singleResult, batchResults, inputText, handleCopy])

  const handleDownloadAll = useCallback(() => {
    let text = ''
    if (singleResult && singleResult.success) {
      text = singleResult.result
    } else if (batchResults) {
      const lines = inputText.split('\n')
      const results = []
      let resultIdx = 0
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length === 0) {
          results.push('')
          continue
        }
        if (resultIdx < batchResults.results.length) {
          const r = batchResults.results[resultIdx]
          results.push(r.success ? r.result : `[ERROR: ${r.error?.errorCode}]`)
          resultIdx++
        } else {
          results.push('')
        }
      }
      text = results.join('\n')
    }
    if (text) {
      downloadText('identifier-case-converted.txt', text)
    }
  }, [singleResult, batchResults, inputText])

  const handleClear = useCallback(() => {
    setInputText('')
    setSingleResult(null)
    setBatchResults(null)
    setRoundTripResult(null)
  }, [])

  const toggleReasonExpand = useCallback((index) => {
    setExpandedReasons(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const renderErrorBox = (error) => {
    if (!error) return null
    return (
      <div className="error-box">
        <strong>转换错误</strong>
        <p>{error.errorMessage}</p>
        <div className="error-code">错误码：{error.errorCode}</div>
      </div>
    )
  }

  const renderSingleResult = () => {
    if (!singleResult) return null

    return (
      <div className="result-section">
        <div className="section-header">
          <h3>转换结果</h3>
          <div className="action-buttons">
            <button
              className="copy-btn small"
              onClick={() => singleResult.success && handleCopy(singleResult.result, '结果')}
              disabled={!singleResult.success}
            >
              复制
            </button>
          </div>
        </div>

        {singleResult.success ? (
          <>
            <pre
              className="result-value"
              dangerouslySetInnerHTML={{ __html: escapeHtml(singleResult.result) }}
            />

            {singleResult.tokens && singleResult.tokens.length > 0 && (
              <div className="tokens-section">
                <h4>分词结果</h4>
                <div className="tokens-list">
                  {singleResult.tokens.map((token, idx) => (
                    <span key={idx} className={`token-badge token-${token.type}`}>
                      {escapeHtml(token.value)}
                      <span className="token-type">{token.type}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {singleResult.reasons && singleResult.reasons.length > 0 && (
              <div className="reasons-section">
                <button
                  className="toggle-btn"
                  onClick={() => toggleReasonExpand('single')}
                >
                  {expandedReasons.has('single') ? '收起' : '展开'}分词规则命中详情
                </button>
                {expandedReasons.has('single') && (
                  <div className="reasons-list">
                    {singleResult.reasons.map((reason, idx) => (
                      <div key={idx} className="reason-item">
                        <span className="reason-index">[{reason.index}]</span>
                        <span className={`reason-type reason-${reason.type}`}>
                          {reason.token ? `"${reason.token}"` : reason.char || '-'}
                        </span>
                        <span className="reason-text">{reason.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {roundTripResult && roundTripResult.success && (
              <div className={`roundtrip-section ${roundTripResult.consistent ? 'consistent' : 'inconsistent'}`}>
                <strong>往返一致性检查：</strong>
                <span>{roundTripResult.consistent ? '一致 ✓' : '不一致 ⚠'}</span>
                {!roundTripResult.consistent && (
                  <div className="roundtrip-details">
                    <div>原始：<code>{escapeHtml(roundTripResult.original)}</code></div>
                    <div>转换为 {options.targetCase}：<code>{escapeHtml(roundTripResult.firstPass)}</code></div>
                    <div>转回 camelCase：<code>{escapeHtml(roundTripResult.secondPass)}</code></div>
                  </div>
                )}
              </div>
            )}

            {singleResult.illegalChars && (
              <div className="illegal-warning">
                警告：包含非字母数字字符：
                <code>{escapeHtml(singleResult.nonSeparatorNonAlnum || '')}</code>
              </div>
            )}
          </>
        ) : (
          renderErrorBox(singleResult.error)
        )}
      </div>
    )
  }

  const renderBatchResults = () => {
    if (!batchResults) return null

    return (
      <div className="result-section">
        <div className="section-header">
          <h3>批量转换结果</h3>
          <div className="action-buttons">
            <span className="batch-stats">
              成功 {batchResults.successCount}/{batchResults.totalCount}
              {batchResults.errorCount > 0 && (
                <span className="error-count">（失败 {batchResults.errorCount}）</span>
              )}
            </span>
            <button
              className="secondary-btn small"
              onClick={handleCopyAllResults}
            >
              复制全部
            </button>
            <button
              className="secondary-btn small"
              onClick={handleDownloadAll}
            >
              下载 .txt
            </button>
          </div>
        </div>

        <div className="batch-table-container">
          <table className="batch-table">
            <thead>
              <tr>
                <th className="col-index">#</th>
                <th className="col-input">输入</th>
                <th className="col-output">输出</th>
                <th className="col-error">错误</th>
              </tr>
            </thead>
            <tbody>
              {batchResults.results.map((item) => (
                <tr key={item.index} className={item.success ? 'row-success' : 'row-error'}>
                  <td className="col-index">{item.index + 1}</td>
                  <td className="col-input">
                    <code>{escapeHtml(item.original)}</code>
                  </td>
                  <td className="col-output">
                    {item.success ? (
                      <code>{escapeHtml(item.result)}</code>
                    ) : (
                      <span className="output-error">—</span>
                    )}
                  </td>
                  <td className="col-error">
                    {item.success ? (
                      <span className="ok-badge">✓</span>
                    ) : (
                      <span className="error-badge" title={item.error?.errorMessage || ''}>
                        {item.error?.errorCode || 'ERROR'}
                      </span>
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

  const allCaseStyles = Object.entries(CASE_STYLES)

  return (
    <div className="identifier-case-converter-tool">
      {copyStatus && (
        <div className={`tool-toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>输入与选项</h2>

        <div className="examples-section">
          <h3>边界示例（点击填充）</h3>
          <div className="examples-grid">
            {EXAMPLE_IDENTIFIERS.map((example) => (
              <button
                key={example}
                className={`example-btn ${selectedExample === example ? 'example-btn-active' : ''}`}
                onClick={() => handleExampleClick(example)}
                title={`点击填充：${example}`}
              >
                {escapeHtml(example)}
              </button>
            ))}
          </div>
        </div>

        <div className="input-section">
          <div className="input-header">
            <h3>输入标识符</h3>
            <div className="input-actions">
              <button
                className="secondary-btn small"
                onClick={handlePasteFromClipboard}
              >
                从剪贴板解析
              </button>
              <button
                className="secondary-btn small"
                onClick={handleClear}
              >
                清空
              </button>
            </div>
          </div>
          <textarea
            className="input-textarea"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              setSelectedExample(null)
            }}
            placeholder={`输入标识符进行转换，支持多行批量转换。
解析规则：
- 纯文本：按行分隔
- JSON 数组：["a","b","c"]
- 逗号分隔：a,b,c`}
            rows={6}
          />
        </div>

        <div className="options-grid">
          <div className="form-group">
            <label htmlFor="target-case">目标风格</label>
            <select
              id="target-case"
              value={options.targetCase}
              onChange={(e) => handleOptionChange('targetCase', e.target.value)}
            >
              {allCaseStyles.map(([key, value]) => (
                <option key={key} value={value}>
                  {CASE_STYLE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="acronym-strategy">缩略词策略</label>
            <select
              id="acronym-strategy"
              value={options.acronymStrategy}
              onChange={(e) => handleOptionChange('acronymStrategy', e.target.value)}
            >
              {Object.entries(ACRONYM_STRATEGY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="number-attach">数字附着</label>
            <select
              id="number-attach"
              value={options.numberAttachStrategy}
              onChange={(e) => handleOptionChange('numberAttachStrategy', e.target.value)}
            >
              {Object.entries(NUMBER_ATTACH_STRATEGY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="compression">分隔符压缩</label>
            <select
              id="compression"
              value={options.compression}
              onChange={(e) => handleOptionChange('compression', e.target.value)}
            >
              {Object.entries(COMPRESSION_STRATEGY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="toggle-advanced-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '收起高级选项' : '展开高级选项'}
        </button>

        {showAdvanced && (
          <div className="advanced-section">
            <div className="options-grid">
              <div className="form-group">
                <label htmlFor="illegal-mode">非法字符模式</label>
                <select
                  id="illegal-mode"
                  value={options.illegalCharMode}
                  onChange={(e) => handleOptionChange('illegalCharMode', e.target.value)}
                >
                  {Object.entries(ILLEGAL_CHAR_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="unicode-mode">字母定义</label>
                <select
                  id="unicode-mode"
                  value={options.unicodeMode}
                  onChange={(e) => handleOptionChange('unicodeMode', e.target.value)}
                >
                  {Object.entries(UNICODE_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="prefix">前缀（转换前剥离）</label>
                <input
                  id="prefix"
                  type="text"
                  value={options.prefix}
                  onChange={(e) => handleOptionChange('prefix', e.target.value)}
                  placeholder="如 m_、get、set"
                />
              </div>

              <div className="form-group">
                <label htmlFor="suffix">后缀（转换前剥离）</label>
                <input
                  id="suffix"
                  type="text"
                  value={options.suffix}
                  onChange={(e) => handleOptionChange('suffix', e.target.value)}
                  placeholder="如 _suffix、Value"
                />
              </div>

              <div className="form-group">
                <label htmlFor="namespace">命名空间分隔符</label>
                <input
                  id="namespace"
                  type="text"
                  value={options.namespaceDelimiter}
                  onChange={(e) => handleOptionChange('namespaceDelimiter', e.target.value)}
                  placeholder="如 . 仅转换最后一段"
                />
              </div>
            </div>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={options.saveToStorage}
                onChange={(e) => handleOptionChange('saveToStorage', e.target.checked)}
              />
              <span>记住最近使用的风格组合（localStorage）</span>
            </label>
          </div>
        )}

        <div className="action-row">
          <label className="auto-convert-toggle">
            <input
              type="checkbox"
              checked={autoConvert}
              onChange={(e) => setAutoConvert(e.target.checked)}
            />
            <span>实时转换</span>
          </label>
          <button
            className="primary-btn"
            onClick={handleConvert}
            disabled={autoConvert}
          >
            {autoConvert ? '实时转换中' : '立即转换'}
          </button>
        </div>
      </section>

      {renderSingleResult()}
      {renderBatchResults()}

      <div className="notes-section">
        <h3>使用说明</h3>
        <ul>
          <li>
            <strong>目标风格：</strong>
            <code>camelCase</code>、<code>PascalCase</code>、<code>snake_case</code>、
            <code>SCREAMING_SNAKE</code>、<code>kebab-case</code>、<code>Train-Case</code>
          </li>
          <li>
            <strong>缩略词策略：</strong>
            <code>HTTPResponse</code> 可按「全大写块」拆为 HTTP+Response，
            或按「首字母缩略词」拆为 H+T+T+P+Response，
            「Apple 风格」处理双大写特殊情况。
          </li>
          <li>
            <strong>数字附着：</strong>
            数字可附着前段（<code>ver1</code>）、后段（<code>2fa</code>）或独立。
          </li>
          <li>
            <strong>批量解析：</strong>
            支持纯文本（按行）、JSON 数组（<code>["a","b"]</code>）、逗号分隔（<code>a,b,c</code>）。
          </li>
          <li>
            <strong>错误码：</strong>
            <code>EMPTY</code>（输入为空）、
            <code>INVALID_CHAR</code>（非法字符）、
            <code>NO_ALPHANUMERIC</code>（无字母数字）、
            <code>AMBIGUOUS_ACRONYM</code>（缩略词歧义）。
          </li>
          <li>
            <strong>纯前端：</strong>
            所有分词与转换均在浏览器内执行，不发送任何网络请求。
          </li>
        </ul>
      </div>
    </div>
  )
}
