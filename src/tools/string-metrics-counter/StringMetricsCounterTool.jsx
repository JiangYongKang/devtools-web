import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeStringMetrics } from './logic/index.js'
import { EXAMPLES, NEWLINE_MODES, TOKENIZATION_PROFILES, NORMALIZE_FLAGS, MAX_LINES_FOR_FULL_DISPLAY } from './logic/constants.js'
import { MAX_SAFE_INPUT_SIZE } from './logic/errors.js'
import './StringMetricsCounterTool.css'

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

function formatNumber(n) {
  if (n == null) return '-'
  return n.toLocaleString()
}

const CONTROL_CHAR_REGEX = new RegExp('[\x00-\x08\x0E-\x1F\x7F]', 'g')

function hasControlChars(str) {
  CONTROL_CHAR_REGEX.lastIndex = 0
  return CONTROL_CHAR_REGEX.test(str)
}

export default function StringMetricsCounterTool() {
  const [text, setText] = useState('')
  const [newlineMode, setNewlineMode] = useState(NEWLINE_MODES.AUTO)
  const [tokenizationProfile, setTokenizationProfile] = useState(TOKENIZATION_PROFILES.WHITESPACE)
  const [normalizeFlags, setNormalizeFlags] = useState({})
  const [selectionRange, setSelectionRange] = useState(null)
  const [metricsResult, setMetricsResult] = useState(null)
  const [cursorPosition, setCursorPosition] = useState({ row: 1, column: 1 })
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMode, setProcessingMode] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [compareWithOriginal, setCompareWithOriginal] = useState(false)
  const [originalMetrics, setOriginalMetrics] = useState(null)
  const [linesCollapsed, setLinesCollapsed] = useState(false)

  const textareaRef = useRef(null)
  const debounceTimeoutRef = useRef(null)

  const updateMetrics = useCallback((inputText, flags, selection) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    const isLarge = inputText.length > LARGE_TEXT_THRESHOLD
    if (isLarge) {
      setIsProcessing(true)
      setProcessingMode('throttle')
    }
    debounceTimeoutRef.current = setTimeout(() => {
      const result = analyzeStringMetrics({
        text: inputText,
        newlineMode,
        tokenizationProfile,
        normalizeFlags: flags,
        selectionRange: selection,
      })
      setMetricsResult(result)
      setIsProcessing(false)
      setProcessingMode(null)
    }, isLarge ? 500 : DEBOUNCE_DELAY)
  }, [newlineMode, tokenizationProfile])

  const updateCompareMetrics = useCallback((inputText) => {
    if (!compareWithOriginal) return
    const result = analyzeStringMetrics({
      text: inputText,
      newlineMode,
      tokenizationProfile,
      normalizeFlags: {},
      selectionRange,
    })
    setOriginalMetrics(result)
  }, [newlineMode, tokenizationProfile, selectionRange, compareWithOriginal])

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value
    setText(newText)
    updateMetrics(newText, normalizeFlags, selectionRange)
    if (compareWithOriginal) {
      updateCompareMetrics(newText)
    }
  }, [normalizeFlags, selectionRange, updateMetrics, compareWithOriginal, updateCompareMetrics])

  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return
    const { selectionStart, selectionEnd } = textareaRef.current
    if (selectionStart !== selectionEnd) {
      setSelectionRange({ start: selectionStart, end: selectionEnd })
    } else {
      setSelectionRange(null)
    }
    updateCursorPosition(selectionStart)
  }, [])

  const updateCursorPosition = useCallback((position) => {
    if (!text || position === 0) {
      setCursorPosition({ row: 1, column: 1 })
      return
    }
    let row = 1
    let col = 1
    for (let i = 0; i < position && i < text.length; i++) {
      if (text[i] === '\n') {
        row++
        col = 1
      } else if (text[i] === '\r') {
        if (text[i + 1] === '\n') i++
        row++
        col = 1
      } else {
        col++
      }
    }
    setCursorPosition({ row, column: col })
  }, [text])

  const handleKeyUp = useCallback((e) => {
    handleSelectionChange()
  }, [handleSelectionChange])

  const handleMouseUp = useCallback(() => {
    handleSelectionChange()
  }, [handleSelectionChange])

  const handleNormalizeFlagChange = useCallback((flag) => {
    setNormalizeFlags((prev) => {
      const newFlags = { ...prev }
      if (flag === NORMALIZE_FLAGS.NORMALIZE_NFC) {
        delete newFlags[NORMALIZE_FLAGS.NORMALIZE_NFD]
      } else if (flag === NORMALIZE_FLAGS.NORMALIZE_NFD) {
        delete newFlags[NORMALIZE_FLAGS.NORMALIZE_NFC]
      } else if (flag === NORMALIZE_FLAGS.TO_LOWER) {
        delete newFlags[NORMALIZE_FLAGS.TO_UPPER]
      } else if (flag === NORMALIZE_FLAGS.TO_UPPER) {
        delete newFlags[NORMALIZE_FLAGS.TO_LOWER]
      }
      if (newFlags[flag]) {
        delete newFlags[flag]
      } else {
        newFlags[flag] = true
      }
      return newFlags
    })
  }, [])

  useEffect(() => {
    updateMetrics(text, normalizeFlags, selectionRange)
  }, [normalizeFlags, newlineMode, tokenizationProfile])

  useEffect(() => {
    if (compareWithOriginal) {
      updateCompareMetrics(text)
    }
  }, [compareWithOriginal])

  const handleApplyExample = useCallback((exampleText) => {
    setText(exampleText)
    setSelectionRange(null)
    updateMetrics(exampleText, normalizeFlags, null)
    if (compareWithOriginal) {
      updateCompareMetrics(exampleText)
    }
  }, [normalizeFlags, updateMetrics, compareWithOriginal, updateCompareMetrics])

  const handleClear = useCallback(() => {
    setText('')
    setSelectionRange(null)
    setMetricsResult(null)
    setOriginalMetrics(null)
    setCursorPosition({ row: 1, column: 1 })
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

  const formatDiff = (current, original) => {
    if (original == null || current == null) return formatNumber(current)
    const diff = current - original
    if (diff === 0) return formatNumber(current)
    const sign = diff > 0 ? '+' : ''
    const colorClass = diff > 0 ? 'diff-positive' : 'diff-negative'
    return `${formatNumber(current)} <span class="${colorClass}">(${sign}${formatNumber(diff)})</span>`
  }

  const hasLargeInput = text.length > MAX_SAFE_INPUT_SIZE
  const hasControl = hasControlChars(text)
  const isEmptyOrWhitespaceOnly = text.length > 0 && text.trim().length === 0
  const lineCount = text.length === 0 ? 0 : text.split('\n').length
  const shouldCollapse = lineCount > MAX_LINES_FOR_FULL_DISPLAY

  return (
    <div className="string-metrics-counter">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>文本指标统计器</h2>

        <div className="form-group">
          <label>输入文本</label>
          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              className="input-textarea"
              value={text}
              onChange={handleTextChange}
              onKeyUp={handleKeyUp}
              onMouseUp={handleMouseUp}
              onClick={handleMouseUp}
              placeholder="在此输入或粘贴要分析的文本..."
              spellCheck={false}
            />
            <div className="position-info">
              行 {cursorPosition.row}, 列 {cursorPosition.column}
              {selectionRange && (
                <span> | 选中: {selectionRange.end - selectionRange.start} 字符</span>
              )}
            </div>
          </div>

          {metricsResult?.result?.hasBOM && (
            <div className="bom-indicator">
              ⚠️ 检测到 UTF-8 BOM (Byte Order Mark) 在文本开头
            </div>
          )}

          {hasControl && (
            <div className="control-char-alert">
              ⚠️ 文本包含控制字符（如 \\0, \\x01 等），请注意处理
            </div>
          )}

          {isEmptyOrWhitespaceOnly && (
            <div className="warning-banner">
              ℹ️ 输入仅包含空白字符（空格、制表符、换行符等）
            </div>
          )}

          {hasLargeInput && (
            <div className="warning-banner">
              ⚠️ 输入文本较大（超过 10MB），统计计算可能需要较长时间
            </div>
          )}
        </div>

        <div className="options-row">
          <div className="option-group">
            <label htmlFor="newline-mode">换行符模式</label>
            <select
              id="newline-mode"
              value={newlineMode}
              onChange={(e) => setNewlineMode(e.target.value)}
            >
              <option value={NEWLINE_MODES.AUTO}>自动检测</option>
              <option value={NEWLINE_MODES.LF}>仅 LF (\n)</option>
              <option value={NEWLINE_MODES.CRLF}>仅 CRLF (\r\n)</option>
            </select>
          </div>

          <div className="option-group">
            <label htmlFor="tokenization-profile">分词规则</label>
            <select
              id="tokenization-profile"
              value={tokenizationProfile}
              onChange={(e) => setTokenizationProfile(e.target.value)}
            >
              <option value={TOKENIZATION_PROFILES.WHITESPACE}>空白分隔</option>
              <option value={TOKENIZATION_PROFILES.ENGLISH}>英文单词</option>
              <option value={TOKENIZATION_PROFILES.CHINESE}>中文逐字</option>
              <option value={TOKENIZATION_PROFILES.MIXED}>中英混合</option>
              <option value={TOKENIZATION_PROFILES.NONE}>不统计词数</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>归一化选项（影响词数和可见长度统计）</label>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={normalizeFlags[NORMALIZE_FLAGS.TRIM] || false}
                onChange={() => handleNormalizeFlagChange(NORMALIZE_FLAGS.TRIM)}
              />
              <span>去除首尾空白 (trim)</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={normalizeFlags[NORMALIZE_FLAGS.COLLAPSE_SPACES] || false}
                onChange={() => handleNormalizeFlagChange(NORMALIZE_FLAGS.COLLAPSE_SPACES)}
              />
              <span>折叠连续空白为单个空格</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={normalizeFlags[NORMALIZE_FLAGS.TO_LOWER] || false}
                onChange={() => handleNormalizeFlagChange(NORMALIZE_FLAGS.TO_LOWER)}
              />
              <span>转小写</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={normalizeFlags[NORMALIZE_FLAGS.TO_UPPER] || false}
                onChange={() => handleNormalizeFlagChange(NORMALIZE_FLAGS.TO_UPPER)}
              />
              <span>转大写</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={normalizeFlags[NORMALIZE_FLAGS.STRIP_CONTROL] || false}
                onChange={() => handleNormalizeFlagChange(NORMALIZE_FLAGS.STRIP_CONTROL)}
              />
              <span>去除控制字符</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={normalizeFlags[NORMALIZE_FLAGS.NORMALIZE_NFC] || false}
                onChange={() => handleNormalizeFlagChange(NORMALIZE_FLAGS.NORMALIZE_NFC)}
              />
              <span>Unicode NFC 归一化</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={normalizeFlags[NORMALIZE_FLAGS.NORMALIZE_NFD] || false}
                onChange={() => handleNormalizeFlagChange(NORMALIZE_FLAGS.NORMALIZE_NFD)}
              />
              <span>Unicode NFD 归一化</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>示例数据</label>
          <div className="example-buttons">
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.MULTILINE_LOG)}
            >
              多行日志
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.JSON_ONE_LINE)}
            >
              JSON 单行
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.EMOJI_MIXED)}
            >
              Emoji 混合
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.EMPTY_OR_WHITESPACE)}
            >
              仅空白
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.SPECIAL_CHARS)}
            >
              特殊字符
            </button>
          </div>
        </div>

        <div className="action-row">
          <button
            className="secondary-btn"
            onClick={() => {
              setCompareWithOriginal(!compareWithOriginal)
              if (!compareWithOriginal) {
                updateCompareMetrics(text)
              }
            }}
          >
            {compareWithOriginal ? '取消对比' : '对比原始 vs 归一化'}
          </button>
          <button className="secondary-btn" onClick={handleClear}>
            清空
          </button>
        </div>
      </section>

      {metricsResult?.errorCode && (
        <div className="error-box">
          <div className="error-code">
            <span className="error-label">错误码</span>
            <code>{metricsResult.errorCode}</code>
          </div>
          <p>{metricsResult.error?.message}</p>
        </div>
      )}

      {metricsResult?.result && (
        <>
          <section className="tool-section">
            <h3>
              整体统计
              {isProcessing && <span className="processing-badge">处理中...</span>}
              {processingMode === 'throttle' && <span className="processing-badge">节流模式</span>}
            </h3>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Grapheme</div>
                <div className="metric-value"
                     dangerouslySetInnerHTML={{
                       __html: formatDiff(
                         metricsResult.result.graphemeCount,
                         compareWithOriginal ? originalMetrics?.result?.graphemeCount : null
                       ),
                     }}
                />
                <div className="metric-note">视觉字符（支持 Intl.Segmenter）</div>
              </div>

              <div className="metric-card secondary">
                <div className="metric-label">Unicode 码点</div>
                <div className="metric-value"
                     dangerouslySetInnerHTML={{
                       __html: formatDiff(
                         metricsResult.result.scalarCount,
                         compareWithOriginal ? originalMetrics?.result?.scalarCount : null
                       ),
                     }}
                />
                <div className="metric-note">Unicode 标量值数量</div>
              </div>

              <div className="metric-card info">
                <div className="metric-label">UTF-16 单元</div>
                <div className="metric-value"
                     dangerouslySetInnerHTML={{
                       __html: formatDiff(
                         metricsResult.result.utf16Units,
                         compareWithOriginal ? originalMetrics?.result?.utf16Units : null
                       ),
                     }}
                />
                <div className="metric-note">JS 字符串 .length</div>
              </div>

              <div className="metric-card warning">
                <div className="metric-label">UTF-8 字节</div>
                <div className="metric-value"
                     dangerouslySetInnerHTML={{
                       __html: formatDiff(
                         metricsResult.result.utf8Bytes,
                         compareWithOriginal ? originalMetrics?.result?.utf8Bytes : null
                       ),
                     }}
                />
                <div className="metric-note">编码为 UTF-8 的字节数</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">行数</div>
                <div className="metric-value"
                     dangerouslySetInnerHTML={{
                       __html: formatDiff(
                         metricsResult.result.lineCount,
                         compareWithOriginal ? originalMetrics?.result?.lineCount : null
                       ),
                     }}
                />
                <div className="metric-note">按 \n 或 \r\n 分隔</div>
              </div>

              <div className="metric-card secondary">
                <div className="metric-label">非空行</div>
                <div className="metric-value"
                     dangerouslySetInnerHTML={{
                       __html: formatDiff(
                         metricsResult.result.nonEmptyLines,
                         compareWithOriginal ? originalMetrics?.result?.nonEmptyLines : null
                       ),
                     }}
                />
                <div className="metric-note">含非空白字符的行</div>
              </div>

              <div className="metric-card info">
                <div className="metric-label">词数</div>
                <div className="metric-value"
                     dangerouslySetInnerHTML={{
                       __html: formatDiff(
                         metricsResult.result.tokenCount,
                         compareWithOriginal ? originalMetrics?.result?.tokenCount : null
                       ),
                     }}
                />
                <div className="metric-note">依所选分词规则</div>
              </div>

              <div className="metric-card warning">
                <div className="metric-label">字节/字符比</div>
                <div className="metric-value">{metricsResult.result.byteCharRatio}</div>
                <div className="metric-note">UTF-8 字节 / Unicode 码点</div>
              </div>
            </div>

            {metricsResult.result.selectionMetrics && metricsResult.result.columnRowPointer && (
              <div className="selection-metrics">
                <h4>📌 选中范围统计</h4>
                <div className="selection-position">
                  <span>
                    起始位置: 第 {metricsResult.result.columnRowPointer.start.row} 行,
                    第 {metricsResult.result.columnRowPointer.start.column} 列
                  </span>
                  <span>
                    结束位置: 第 {metricsResult.result.columnRowPointer.end.row} 行,
                    第 {metricsResult.result.columnRowPointer.end.column} 列
                  </span>
                </div>
                <div className="selection-metrics-grid">
                  <div className="selection-metric">
                    <div className="label">Grapheme</div>
                    <div className="value">{metricsResult.result.selectionMetrics.graphemeCount}</div>
                  </div>
                  <div className="selection-metric">
                    <div className="label">码点</div>
                    <div className="value">{metricsResult.result.selectionMetrics.scalarCount}</div>
                  </div>
                  <div className="selection-metric">
                    <div className="label">UTF-16</div>
                    <div className="value">{metricsResult.result.selectionMetrics.utf16Units}</div>
                  </div>
                  <div className="selection-metric">
                    <div className="label">UTF-8 字节</div>
                    <div className="value">{metricsResult.result.selectionMetrics.utf8Bytes}</div>
                  </div>
                  <div className="selection-metric">
                    <div className="label">行数</div>
                    <div className="value">{metricsResult.result.selectionMetrics.lineCount}</div>
                  </div>
                  <div className="selection-metric">
                    <div className="label">词数</div>
                    <div className="value">{metricsResult.result.selectionMetrics.tokenCount}</div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="tool-section report-section">
            <div className="report-header">
              <h3>📋 统计报告</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {metricsResult.result.selectionMetrics && (
                  <button
                    className="secondary-btn"
                    onClick={() => {
                      const selMetrics = metricsResult.result.selectionMetrics
                      const ptr = metricsResult.result.columnRowPointer
                      const report = [
                        `=== 选中范围统计报告 ===`,
                        `生成时间: ${new Date().toLocaleString()}`,
                        ``,
                        `起始: 第 ${ptr.start.row} 行, 第 ${ptr.start.column} 列`,
                        `结束: 第 ${ptr.end.row} 行, 第 ${ptr.end.column} 列`,
                        ``,
                        `Grapheme: ${selMetrics.graphemeCount}`,
                        `Unicode 码点: ${selMetrics.scalarCount}`,
                        `UTF-16 单元: ${selMetrics.utf16Units}`,
                        `UTF-8 字节: ${selMetrics.utf8Bytes}`,
                        `行数: ${selMetrics.lineCount}`,
                        `词数: ${selMetrics.tokenCount}`,
                      ].join('\n')
                      handleCopy(report, '选中范围统计报告')
                    }}
                  >
                    复制选中范围报告
                  </button>
                )}
                <button
                  className="primary-btn"
                  onClick={() => handleCopy(metricsResult.result.digestReport, '统计报告')}
                >
                  复制完整报告
                </button>
              </div>
            </div>
            <pre
              className="report-content"
              dangerouslySetInnerHTML={{ __html: escapeHtml(metricsResult.result.digestReport) }}
            />
          </section>

          {compareWithOriginal && originalMetrics?.result && (
            <section className="tool-section compare-section">
              <h3>🔄 原始文本 vs 归一化文本对比</h3>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                绿色表示增加，红色表示减少。以下统计已应用当前勾选的归一化选项。
              </p>
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>指标</th>
                    <th>原始文本</th>
                    <th>归一化后</th>
                    <th>差异</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Grapheme</td>
                    <td>{formatNumber(originalMetrics.result.graphemeCount)}</td>
                    <td>{formatNumber(metricsResult.result.graphemeCount)}</td>
                    <td
                      dangerouslySetInnerHTML={{
                        __html: formatDiff(
                          metricsResult.result.graphemeCount,
                          originalMetrics.result.graphemeCount
                        ),
                      }}
                    />
                  </tr>
                  <tr>
                    <td>Unicode 码点</td>
                    <td>{formatNumber(originalMetrics.result.scalarCount)}</td>
                    <td>{formatNumber(metricsResult.result.scalarCount)}</td>
                    <td
                      dangerouslySetInnerHTML={{
                        __html: formatDiff(
                          metricsResult.result.scalarCount,
                          originalMetrics.result.scalarCount
                        ),
                      }}
                    />
                  </tr>
                  <tr>
                    <td>UTF-16 单元</td>
                    <td>{formatNumber(originalMetrics.result.utf16Units)}</td>
                    <td>{formatNumber(metricsResult.result.utf16Units)}</td>
                    <td
                      dangerouslySetInnerHTML={{
                        __html: formatDiff(
                          metricsResult.result.utf16Units,
                          originalMetrics.result.utf16Units
                        ),
                      }}
                    />
                  </tr>
                  <tr>
                    <td>UTF-8 字节</td>
                    <td>{formatNumber(originalMetrics.result.utf8Bytes)}</td>
                    <td>{formatNumber(metricsResult.result.utf8Bytes)}</td>
                    <td
                      dangerouslySetInnerHTML={{
                        __html: formatDiff(
                          metricsResult.result.utf8Bytes,
                          originalMetrics.result.utf8Bytes
                        ),
                      }}
                    />
                  </tr>
                  <tr>
                    <td>行数</td>
                    <td>{formatNumber(originalMetrics.result.lineCount)}</td>
                    <td>{formatNumber(metricsResult.result.lineCount)}</td>
                    <td
                      dangerouslySetInnerHTML={{
                        __html: formatDiff(
                          metricsResult.result.lineCount,
                          originalMetrics.result.lineCount
                        ),
                      }}
                    />
                  </tr>
                  <tr>
                    <td>非空行</td>
                    <td>{formatNumber(originalMetrics.result.nonEmptyLines)}</td>
                    <td>{formatNumber(metricsResult.result.nonEmptyLines)}</td>
                    <td
                      dangerouslySetInnerHTML={{
                        __html: formatDiff(
                          metricsResult.result.nonEmptyLines,
                          originalMetrics.result.nonEmptyLines
                        ),
                      }}
                    />
                  </tr>
                  <tr>
                    <td>词数</td>
                    <td>{formatNumber(originalMetrics.result.tokenCount)}</td>
                    <td>{formatNumber(metricsResult.result.tokenCount)}</td>
                    <td
                      dangerouslySetInnerHTML={{
                        __html: formatDiff(
                          metricsResult.result.tokenCount,
                          originalMetrics.result.tokenCount
                        ),
                      }}
                    />
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {!metricsResult && text.length === 0 && (
        <section className="tool-section">
          <div className="empty-state">
            请输入或粘贴文本开始分析统计
          </div>
        </section>
      )}

      <section className="notes-section">
        <h4>📖 算法说明与限制</h4>
        <ul>
          <li>
            <strong>Grapheme 计数：</strong>优先使用浏览器原生 <code>Intl.Segmenter</code> API，
            不可用时回退到基于 Unicode 属性的启发式算法。
          </li>
          <li>
            <strong>Unicode 码点：</strong>使用 <code>Array.from(str).length</code> 计算，
            正确处理代理对（Surrogate Pairs）。
          </li>
          <li>
            <strong>UTF-16 单元：</strong>即 JavaScript 字符串的 <code>.length</code> 属性，
            一个代理对占 2 个单元。
          </li>
          <li>
            <strong>UTF-8 字节：</strong>手工计算 UTF-8 编码字节数，
            ASCII 字符 1 字节，中文字符 3 字节，Emoji 通常 4 字节。
          </li>
          <li>
            <strong>行数统计：</strong>默认自动识别 <code>\n</code> 和 <code>\r\n</code>，
            可通过下拉框切换模式。最后一行无换行符也计为一行。
          </li>
          <li>
            <strong>词数统计：</strong>
            <ul>
              <li><code>空白分隔</code>：按任意空白字符切分，非空即计数</li>
              <li><code>英文单词</code>：匹配 <code>[A-Za-z0-9]+</code></li>
              <li><code>中文逐字</code>：中文字符每个算 1 词 + 英文/数字单词</li>
              <li><code>中英混合</code>：中文字符每个算 1 词 + 其他非空白段</li>
            </ul>
          </li>
          <li>
            <strong>与真实编辑器的差异：</strong>本工具按 UTF-16 索引计算行列，
            某些编辑器可能按视觉宽度或码点计算，结果可能略有不同。
          </li>
          <li>
            <strong>大文本处理：</strong>超过 100KB 的输入会自动启用节流（500ms 延迟），
            超过 10MB 建议分批处理。
          </li>
          <li>
            <strong>BOM 处理：</strong>自动检测文本开头的 <code>U+FEFF</code>（UTF-8 BOM），
            在 UI 中明确提示但不影响统计（BOM 会计入码点和字节数）。
          </li>
          <li>
            <strong>控制字符：</strong>检测到 <code>\0</code> 等控制字符时会提示，
            勾选「去除控制字符」可在统计前过滤。
          </li>
          <li>
            <strong>错误码约定：</strong>
            <ul>
              <li><code>NULL_INPUT</code>：输入为 null/undefined</li>
              <li><code>SELECTION_OUT_OF_RANGE</code>：选中范围超出文本长度</li>
              <li><code>INPUT_TOO_LARGE</code>：输入超过 10MB</li>
            </ul>
          </li>
        </ul>
      </section>
    </div>
  )
}
