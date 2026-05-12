import { useCallback, useRef, useState } from 'react'
import './LogFieldExtractorTool.css'
import { EXAMPLES, TIMEZONE_OPTIONS, UNMATCHED_REASONS } from './logic/constants.js'
import { ERROR_CODES, MAX_LINE_COUNT, MAX_LINE_LENGTH, MAX_SAFE_INPUT_SIZE } from './logic/errors.js'
import { extractLogFields, generateTSV, generateTableText } from './logic/index.js'

const DEBOUNCE_DELAY = 250
const LARGE_TEXT_THRESHOLD = 100000

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getLevelBadgeClass(level) {
  switch (level) {
    case 'TRACE':
      return 'level-badge level-trace'
    case 'DEBUG':
      return 'level-badge level-debug'
    case 'INFO':
      return 'level-badge level-info'
    case 'WARN':
      return 'level-badge level-warn'
    case 'ERROR':
      return 'level-badge level-error'
    case 'FATAL':
      return 'level-badge level-fatal'
    default:
      return 'level-badge level-unknown'
  }
}

const EXAMPLE_KEYS = [
  'SIMPLE_LEVEL_PREFIX',
  'JSON_LINE_LOG',
  'KEY_VALUE_FORMAT',
  'NGINX_ACCESS',
  'ISO8601_TIMESTAMP',
  'MIXED_FORMATS',
]

const EXAMPLE_LABELS = {
  SIMPLE_LEVEL_PREFIX: '简单级别前缀',
  JSON_LINE_LOG: 'JSON 行日志',
  KEY_VALUE_FORMAT: 'Key=Value',
  NGINX_ACCESS: 'Nginx',
  ISO8601_TIMESTAMP: 'ISO8601',
  MIXED_FORMATS: '混合格式',
}

export default function LogFieldExtractorTool() {
  const [text, setText] = useState('')
  const [timezone, setTimezone] = useState(TIMEZONE_OPTIONS.UTC)
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false)
  const [extractResult, setExtractResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMode, setProcessingMode] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [activeExample, setActiveExample] = useState(null)

  const textareaRef = useRef(null)
  const debounceTimeoutRef = useRef(null)

  const updateExtraction = useCallback((inputText, tz) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    const isLarge = inputText.length > LARGE_TEXT_THRESHOLD
    if (isLarge) {
      setIsProcessing(true)
      setProcessingMode('throttle')
    }
    debounceTimeoutRef.current = setTimeout(() => {
      const result = extractLogFields({
        text: inputText,
        timezone: tz,
      })
      setExtractResult(result)
      setIsProcessing(false)
      setProcessingMode(null)
    }, isLarge ? 500 : DEBOUNCE_DELAY)
  }, [])

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value
    setText(newText)
    updateExtraction(newText, timezone)
  }, [timezone, updateExtraction])

  const handleTimezoneChange = useCallback((e) => {
    const newTimezone = e.target.value
    setTimezone(newTimezone)
    updateExtraction(text, newTimezone)
  }, [text, updateExtraction])

  const handleApplyExample = useCallback((exampleKey) => {
    const exampleText = EXAMPLES[exampleKey]
    setActiveExample(exampleKey)
    setText(exampleText)
    updateExtraction(exampleText, timezone)
  }, [timezone, updateExtraction])

  const handleTextChangeInternal = useCallback((e) => {
    const newText = e.target.value
    if (newText !== text) {
      setActiveExample(null)
    }
    handleTextChange(e)
  }, [text, handleTextChange])

  const handleClear = useCallback(() => {
    setText('')
    setExtractResult(null)
    setActiveExample(null)
  }, [])

  const handleCopy = useCallback(async (content, label) => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
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

  const handleCopyTSV = useCallback(() => {
    if (!extractResult?.result) return
    const tsv = generateTSV(extractResult.result)
    handleCopy(tsv, 'TSV 数据')
  }, [extractResult, handleCopy])

  const handleCopyTable = useCallback(() => {
    if (!extractResult?.result) return
    const tableText = generateTableText(extractResult.result)
    handleCopy(tableText, '表格数据')
  }, [extractResult, handleCopy])



  const hasLargeInput = text.length > MAX_SAFE_INPUT_SIZE
  const lineCount = text.length === 0 ? 0 : text.split('\n').length
  const displayLines = extractResult?.result?.lines || []
  const filteredLines = showOnlyUnmatched
    ? displayLines.filter((line) => !line.matched)
    : displayLines

  return (
    <div className="log-field-extractor">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>日志字段提取器</h2>

        <div className="form-group">
          <label>输入日志</label>
          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              className="input-textarea"
              value={text}
              onChange={handleTextChangeInternal}
              placeholder={`在此粘贴多行日志...
支持格式：
- JSON 行日志 (如: {"timestamp":"...","level":"INFO",...})
- 带级别前缀 (如: 2025-05-10T14:30:01Z INFO message)
- Key=Value 格式 (如: level=INFO time="...")
- Nginx 访问日志格式`}
              spellCheck={false}
            />
            <div className="position-info">
              行数: {lineCount}
              {extractResult?.result?.stats && (
                <>
                  <span> | </span>
                  <span>匹配: {extractResult.result.stats.matchedLines}/{extractResult.result.stats.totalLines}</span>
                  <span> | </span>
                  <span>匹配率: {extractResult.result.stats.matchRate}%</span>
                </>
              )}
            </div>
          </div>

          {hasLargeInput && (
            <div className="warning-banner">
              ⚠️ 输入文本较大（超过 10MB），解析可能需要较长时间
            </div>
          )}
        </div>

        <div className="controls-section">
          <div className="controls-row">
            <div className="controls-column timezone-column">
              <label>时区</label>
              <select
                id="timezone-select"
                value={timezone}
                onChange={handleTimezoneChange}
              >
                <option value={TIMEZONE_OPTIONS.UTC}>UTC</option>
                <option value={TIMEZONE_OPTIONS.LOCAL}>本地时区</option>
              </select>
            </div>

            <div className="controls-column checkbox-column">
              <label>&nbsp;</label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnlyUnmatched}
                  onChange={(e) => setShowOnlyUnmatched(e.target.checked)}
                />
                <span>仅显示未匹配行</span>
              </label>
            </div>

            <div className="controls-column action-column">
              <label>&nbsp;</label>
              <button className="secondary-btn clear-btn" onClick={handleClear}>
                清空
              </button>
            </div>
          </div>

          <div className="examples-section">
            <label>示例数据</label>
            <div className="example-buttons">
              {EXAMPLE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`example-btn ${activeExample === key ? 'active' : ''}`}
                  onClick={() => handleApplyExample(key)}
                >
                  {EXAMPLE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {extractResult?.errorCode && (
        <div className="error-box">
          <div className="error-code">
            <span className="error-label">错误码</span>
            <code>{extractResult.errorCode}</code>
          </div>
          <p>{extractResult.error?.message}</p>
        </div>
      )}

      {extractResult?.result && (
        <>
          <section className="tool-section stats-section">
            <h3>
              解析结果
              {isProcessing && <span className="processing-badge">处理中...</span>}
              {processingMode === 'throttle' && <span className="processing-badge">节流模式</span>}
            </h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">总行数</div>
                <div className="stat-value">{extractResult.result.stats.totalLines}</div>
              </div>
              <div className="stat-card success">
                <div className="stat-label">匹配行数</div>
                <div className="stat-value">{extractResult.result.stats.matchedLines}</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-label">未匹配行数</div>
                <div className="stat-value">{extractResult.result.stats.unmatchedLines}</div>
              </div>
              <div className="stat-card info">
                <div className="stat-label">匹配率</div>
                <div className="stat-value">{extractResult.result.stats.matchRate}%</div>
              </div>
            </div>
            <div className="copy-buttons">
              <button className="primary-btn" onClick={handleCopyTable}>
                复制表格
              </button>
              <button className="secondary-btn" onClick={handleCopyTSV}>
                复制 TSV
              </button>
            </div>
          </section>

          <section className="tool-section table-section">
            <div className="table-container">
              <table className="result-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>行号</th>
                    <th style={{ width: '80px' }}>级别</th>
                    <th style={{ width: '220px' }}>解析时间</th>
                    <th style={{ width: '220px' }}>原始时间</th>
                    <th>原始日志</th>
                    <th style={{ width: '150px' }}>状态/未匹配原因</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-cell">
                        {showOnlyUnmatched ? '没有未匹配的行' : '暂无数据'}
                      </td>
                    </tr>
                  ) : (
                    filteredLines.map((line) => (
                      <tr
                        key={line.lineNumber}
                        className={line.matched ? 'matched-row' : 'unmatched-row'}
                      >
                        <td className="line-number">{line.lineNumber}</td>
                        <td>
                          {line.level ? (
                            <span className={getLevelBadgeClass(line.level)}>
                              {line.level}
                            </span>
                          ) : (
                            <span className="empty-value">-</span>
                          )}
                        </td>
                        <td>
                          {line.timeParsed ? (
                            <span className="time-parsed" title={line.timeParsed}>
                              {line.timeParsed}
                            </span>
                          ) : (
                            <span className="empty-value">-</span>
                          )}
                        </td>
                        <td>
                          {line.timeRaw ? (
                            <span
                              className="time-raw"
                              title={line.timeRaw}
                              dangerouslySetInnerHTML={{ __html: escapeHtml(line.timeRaw) }}
                            />
                          ) : (
                            <span className="empty-value">-</span>
                          )}
                        </td>
                        <td>
                          <span
                            className="raw-log"
                            title={line.rawLine}
                            dangerouslySetInnerHTML={{ __html: escapeHtml(line.rawLine) }}
                          />
                        </td>
                        <td>
                          {line.matched ? (
                            <span className="status-badge status-matched">匹配</span>
                          ) : (
                            <span className="status-badge status-unmatched" title={line.unmatchedReasonText || ''}>
                              {line.unmatchedReasonText || UNMATCHED_REASONS.NEITHER}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!extractResult && text.length === 0 && (
        <section className="tool-section">
          <div className="empty-state">
            请粘贴多行日志开始分析，或点击上方示例按钮查看效果
          </div>
        </section>
      )}

      <section className="notes-section">
        <h4>📖 使用说明与限制</h4>
        <ul>
          <li>
            <strong>支持的日志格式：</strong>
            <ul>
              <li><code>JSON 行日志</code>：每行一个 JSON 对象，识别 <code>timestamp</code>/<code>time</code>/<code>ts</code> 时间字段和 <code>level</code>/<code>lvl</code>/<code>severity</code> 级别字段</li>
              <li><code>级别前缀</code>：如 <code>2025-05-10T14:30:01Z INFO message</code>、<code>[2025-05-10 14:30:01] INFO: message</code></li>
              <li><code>Key=Value 格式</code>：如 <code>level=INFO time="2025-05-10T14:30:01Z" msg="test"</code></li>
              <li><code>Nginx 访问日志</code>：如 <code>127.0.0.1 - - [10/May/2025:14:30:01 +0800] "GET / HTTP/1.1"</code></li>
            </ul>
          </li>
          <li>
            <strong>支持的时间格式：</strong>
            <ul>
              <li><code>ISO8601/RFC3339</code>：<code>2025-05-10T14:30:01Z</code>、<code>2025-05-10T14:30:01+08:00</code>、<code>2025-05-10T14:30:01.123456789Z</code></li>
              <li><code>空间分隔</code>：<code>2025-05-10 14:30:01</code>、<code>2025/05/10 14:30:01</code></li>
              <li><code>Unix 时间戳</code>：10 位（秒）或 13 位（毫秒）数字</li>
            </ul>
          </li>
          <li>
            <strong>支持的日志级别：</strong>
            <ul>
              <li><code>TRACE</code>/<code>trc</code>、<code>DEBUG</code>/<code>dbg</code>、<code>INFO</code>/<code>inf</code></li>
              <li><code>WARN</code>/<code>WRN</code>/<code>WARNING</code>、<code>ERROR</code>/<code>ERR</code>、<code>FATAL</code>/<code>FTL</code>/<code>CRITICAL</code></li>
            </ul>
          </li>
          <li>
            <strong>时区说明：</strong>
            <ul>
              <li><code>UTC</code>：时间解析后以 UTC 格式显示（ISO8601）</li>
              <li><code>本地时区</code>：时间解析后转换为浏览器所在的本地时区</li>
              <li>时间戳中自带时区信息的（如 <code>+08:00</code>、<code>Z</code>）会被正确解析</li>
              <li>无时区信息的时间（如 <code>2025-05-10 14:30:01</code>）会按所选时区解释</li>
            </ul>
          </li>
          <li>
            <strong>未匹配行处理：</strong>
            <ul>
              <li>无法解析的行会保留原行并标记原因，不会导致整体解析失败</li>
              <li>勾选「仅显示未匹配行」可快速查看需要调整格式的日志</li>
            </ul>
          </li>
          <li>
            <strong>体积限制：</strong>
            <ul>
              <li>单行长不得超过 <code>{MAX_LINE_LENGTH.toLocaleString()}</code> 字符</li>
              <li>总行数不得超过 <code>{MAX_LINE_COUNT.toLocaleString()}</code> 行</li>
              <li>总字符数不得超过 <code>{(MAX_SAFE_INPUT_SIZE / 1024 / 1024).toFixed(0)}MB</code></li>
            </ul>
          </li>
          <li>
            <strong>性能优化：</strong>
            <ul>
              <li>超过 100KB 的输入会自动启用节流模式（500ms 延迟）以避免卡顿</li>
              <li>大体积日志建议分批处理，推荐单次不超过 1 万行</li>
            </ul>
          </li>
          <li>
            <strong>错误码说明：</strong>
            <ul>
              <li><code>{ERROR_CODES.EMPTY_INPUT}</code>：输入为空或仅包含空白字符</li>
              <li><code>{ERROR_CODES.LINE_TOO_LONG}</code>：存在超长单行日志</li>
              <li><code>{ERROR_CODES.TOO_MANY_LINES}</code>：总行数超过上限</li>
              <li><code>{ERROR_CODES.INPUT_TOO_LARGE}</code>：输入内容过大</li>
            </ul>
          </li>
        </ul>
      </section>
    </div>
  )
}
