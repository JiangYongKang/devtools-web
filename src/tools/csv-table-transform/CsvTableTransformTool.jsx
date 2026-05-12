import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  processInput,
  processTranspose,
  processGenerateCsv,
  EXAMPLES,
  PRESET_DELIMITERS,
  INCONSISTENT_COLS_MODES,
  MAX_ROWS,
  MAX_COLS,
  MAX_CELL_BYTES,
  MAX_INPUT_BYTES,
} from './logic/index.js'
import {
  LARGE_TABLE_THRESHOLD_ROWS,
  LARGE_TABLE_THRESHOLD_COLS,
  VIRTUAL_SCROLL_VISIBLE_ROWS,
  AUTO_DETECT_FALLBACK,
} from './logic/constants.js'
import './CsvTableTransformTool.css'

const DEBOUNCE_DELAY = 250
const ROW_HEIGHT = 36

const DELIMITER_OPTIONS = [
  { value: 'auto', label: '自动探测' },
  { value: PRESET_DELIMITERS.COMMA, label: '逗号 (CSV) ,' },
  { value: PRESET_DELIMITERS.TAB, label: '制表符 (TSV) \\t' },
  { value: PRESET_DELIMITERS.SEMICOLON, label: '分号 ;' },
  { value: PRESET_DELIMITERS.PIPE, label: '管道 |' },
]

const INCONSISTENT_OPTIONS = [
  { value: INCONSISTENT_COLS_MODES.ERROR, label: '报错' },
  { value: INCONSISTENT_COLS_MODES.PAD_WITH_EMPTY, label: '补齐空单元格' },
  { value: INCONSISTENT_COLS_MODES.TRUNCATE, label: '截断' },
]

function formatDelimiterDisplay(delimiter) {
  if (delimiter === PRESET_DELIMITERS.TAB) return '\\t'
  return delimiter
}

function formatNumber(n) {
  if (n == null) return '-'
  return n.toLocaleString()
}

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function hasNewline(str) {
  return str != null && (str.includes('\n') || str.includes('\r'))
}

function DisplayCell({ value }) {
  if (hasNewline(value)) {
    return (
      <span
        className="cell-has-newline"
        title={value}
        dangerouslySetInnerHTML={{ __html: escapeHtml(value).replace(/\n/g, '\\n') }}
      />
    )
  }
  return <span dangerouslySetInnerHTML={{ __html: escapeHtml(value) }} />
}

export default function CsvTableTransformTool() {
  const [input, setInput] = useState('')
  const [delimiter, setDelimiter] = useState('auto')
  const [hasHeader, setHasHeader] = useState(true)
  const [inconsistentColsMode, setInconsistentColsMode] = useState(INCONSISTENT_COLS_MODES.PAD_WITH_EMPTY)
  const [processResult, setProcessResult] = useState(null)
  const [isTransposed, setIsTransposed] = useState(false)
  const [transposedResult, setTransposedResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [virtualScrollTop, setVirtualScrollTop] = useState(0)
  const [virtualContainerHeight, setVirtualContainerHeight] = useState(0)

  const virtualContainerRef = useRef(null)
  const debounceTimeoutRef = useRef(null)

  const currentTable = useMemo(() => {
    if (!processResult || !processResult.success) return null
    if (isTransposed && transposedResult) {
      return {
        table: transposedResult.result.transposed,
        header: transposedResult.result.newHeader,
        rowCount: transposedResult.result.newRowCount,
        colCount: transposedResult.result.newColCount,
      }
    }
    return {
      table: processResult.result.table,
      header: processResult.result.header,
      rowCount: processResult.result.rowCount,
      colCount: processResult.result.colCount,
    }
  }, [processResult, isTransposed, transposedResult])

  const shouldUseVirtualScroll = useMemo(() => {
    if (!currentTable) return false
    return (
      currentTable.rowCount > LARGE_TABLE_THRESHOLD_ROWS ||
      currentTable.colCount > LARGE_TABLE_THRESHOLD_COLS
    )
  }, [currentTable])

  const virtualVisibleRange = useMemo(() => {
    if (!currentTable || !shouldUseVirtualScroll) return null
    const containerHeight = virtualContainerHeight || 600
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2
    const startIndex = Math.max(0, Math.floor(virtualScrollTop / ROW_HEIGHT) - 1)
    const endIndex = Math.min(currentTable.rowCount, startIndex + visibleCount + 1)
    return { startIndex, endIndex, visibleCount }
  }, [currentTable, shouldUseVirtualScroll, virtualScrollTop, virtualContainerHeight])

  const handleInputChange = useCallback((e) => {
    const newInput = e.target.value
    setInput(newInput)
    setIsTransposed(false)
    setTransposedResult(null)
  }, [])

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      const result = processInput({
        input,
        delimiter,
        hasHeader,
        inconsistentColsMode,
      })
      setProcessResult(result)
    }, DEBOUNCE_DELAY)
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [input, delimiter, hasHeader, inconsistentColsMode])

  useEffect(() => {
    if (isTransposed && processResult?.success) {
      const result = processTranspose({
        table: processResult.result.table,
        header: processResult.result.header,
      })
      setTransposedResult(result)
    } else {
      setTransposedResult(null)
    }
  }, [isTransposed, processResult])

  useEffect(() => {
    const container = virtualContainerRef.current
    if (!container) return

    const handleScroll = () => {
      setVirtualScrollTop(container.scrollTop)
    }

    const updateHeight = () => {
      setVirtualContainerHeight(container.clientHeight)
    }

    container.addEventListener('scroll', handleScroll)
    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [shouldUseVirtualScroll, currentTable])

  const handleApplyExample = useCallback((exampleText) => {
    setInput(exampleText)
    setIsTransposed(false)
    setTransposedResult(null)
  }, [])

  const handleClear = useCallback(() => {
    setInput('')
    setProcessResult(null)
    setIsTransposed(false)
    setTransposedResult(null)
  }, [])

  const handleToggleTranspose = useCallback(() => {
    setIsTransposed((prev) => !prev)
  }, [])

  const handleSwitchToTsv = useCallback(() => {
    setDelimiter(PRESET_DELIMITERS.TAB)
  }, [])

  const handleSwitchToCsv = useCallback(() => {
    setDelimiter(PRESET_DELIMITERS.COMMA)
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

  const handleCopyAsCsv = useCallback(() => {
    if (!currentTable) return
    const csvResult = processGenerateCsv({
      table: currentTable.table,
      header: currentTable.header,
      delimiter: PRESET_DELIMITERS.COMMA,
    })
    handleCopy(csvResult.result.csv, 'CSV')
  }, [currentTable, handleCopy])

  const handleCopyAsTsv = useCallback(() => {
    if (!currentTable) return
    const tsvResult = processGenerateCsv({
      table: currentTable.table,
      header: currentTable.header,
      delimiter: PRESET_DELIMITERS.TAB,
    })
    handleCopy(tsvResult.result.csv, 'TSV')
  }, [currentTable, handleCopy])

  const hasError = processResult && !processResult.success
  const hasFallback = processResult?.success && processResult.result?.fallbackMessage
  const hasInconsistentCols =
    processResult?.success &&
    processResult.result?.inconsistentColsIssues &&
    processResult.result.inconsistentColsIssues.length > 0

  return (
    <div className="csv-table-transform">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>CSV / 表格文本转换</h2>

        <div className="form-group">
          <label>输入文本 (CSV 或表格形式)</label>
          <div className="textarea-container">
            <textarea
              className="input-textarea"
              value={input}
              onChange={handleInputChange}
              placeholder="在此输入或粘贴 CSV / TSV 文本...

示例:
name,age,city
Alice,25,New York
Bob,30,San Francisco"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="options-row">
          <div className="option-group">
            <label htmlFor="delimiter-select">分隔符</label>
            <select
              id="delimiter-select"
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
            >
              {DELIMITER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="option-group">
            <label htmlFor="inconsistent-select">列不齐处理</label>
            <select
              id="inconsistent-select"
              value={inconsistentColsMode}
              onChange={(e) => setInconsistentColsMode(e.target.value)}
            >
              {INCONSISTENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="option-group">
            <label>表头选项</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                />
                <span>首行作为表头</span>
              </label>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>快捷切换</label>
          <div className="example-buttons">
            <button
              type="button"
              className="example-btn"
              onClick={handleSwitchToCsv}
              disabled={delimiter === PRESET_DELIMITERS.COMMA}
            >
              切换为 CSV
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={handleSwitchToTsv}
              disabled={delimiter === PRESET_DELIMITERS.TAB}
            >
              切换为 TSV
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>示例数据</label>
          <div className="example-buttons">
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.QUOTE_WITH_NEWLINE)}
            >
              引号内换行
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.IRREGULAR_COLS)}
            >
              不规则列数
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.MIXED_CONTENT)}
            >
              混合内容
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.TSV_SAMPLE)}
            >
              TSV 示例
            </button>
            <button
              type="button"
              className="example-btn"
              onClick={() => handleApplyExample(EXAMPLES.LARGE_PREVIEW)}
            >
              大体量预览
            </button>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleToggleTranspose}
            disabled={!processResult?.success || currentTable?.rowCount === 0}
          >
            {isTransposed ? '取消转置' : '行列转置'}
          </button>
          <button className="secondary-btn" onClick={handleClear}>
            清空
          </button>
        </div>
      </section>

      {hasError && (
        <section className="tool-section">
          <div className="error-box">
            <div className="error-code">
              <span className="error-label">错误码</span>
              <code>{processResult.errorCode}</code>
            </div>
            <p>{processResult.error?.message}</p>
            {processResult.error?.details && (
              <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
                {JSON.stringify(processResult.error.details)}
              </p>
            )}
          </div>
        </section>
      )}

      {hasFallback && (
        <section className="tool-section">
          <div className="info-banner">
            ℹ️ {processResult.result.fallbackMessage}
          </div>
        </section>
      )}

      {hasInconsistentCols && (
        <section className="tool-section">
          <div className="warning-banner">
            ⚠️ 检测到 {processResult.result.inconsistentColsIssues.length} 行列数不一致的行。
            当前策略：{inconsistentColsMode === 'padWithEmpty' ? '补齐空单元格' : '截断'}
          </div>
        </section>
      )}

      {processResult?.success && currentTable && currentTable.rowCount > 0 && (
        <section className="tool-section preview-section">
          <div className="preview-header">
            <h3>
              表格预览 {isTransposed && <span style={{ color: 'var(--accent)' }}>(已转置)</span>}
            </h3>
            <div className="preview-actions">
              <button
                className="secondary-btn"
                onClick={handleCopyAsCsv}
              >
                复制为 CSV
              </button>
              <button
                className="secondary-btn"
                onClick={handleCopyAsTsv}
              >
                复制为 TSV
              </button>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">行数</span>
              <span className="stat-value">{formatNumber(currentTable.rowCount)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">列数</span>
              <span className="stat-value">{formatNumber(currentTable.colCount)}</span>
            </div>
            {processResult.result.detectedDelimiter && (
              <div className="stat-item">
                <span className="stat-label">探测的分隔符</span>
                <span className="stat-value">
                  "{formatDelimiterDisplay(processResult.result.detectedDelimiter)}"
                </span>
              </div>
            )}
            {shouldUseVirtualScroll && (
              <div className="stat-item">
                <span className="stat-label">渲染策略</span>
                <span className="stat-value" style={{ color: 'var(--info-text)' }}>
                  虚拟滚动
                </span>
              </div>
            )}
          </div>

          {shouldUseVirtualScroll && virtualVisibleRange ? (
            <div
              ref={virtualContainerRef}
              className="virtual-scroll-container"
            >
              <div
                className="virtual-scroll-phantom"
                style={{ height: `${currentTable.rowCount * ROW_HEIGHT}px` }}
              />
              <div
                className="virtual-scroll-content"
                style={{ transform: `translateY(${virtualVisibleRange.startIndex * ROW_HEIGHT}px)` }}
              >
                <table className="data-table">
                  {currentTable.header && (
                    <thead>
                      <tr>
                        {currentTable.header.map((cell, idx) => (
                          <th key={idx}>
                            <DisplayCell value={cell} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {currentTable.table
                      .slice(virtualVisibleRange.startIndex, virtualVisibleRange.endIndex)
                      .map((row, rowIdx) => (
                        <tr key={virtualVisibleRange.startIndex + rowIdx}>
                          {row.map((cell, colIdx) => (
                            <td key={colIdx}>
                              <DisplayCell value={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                {currentTable.header && (
                  <thead>
                    <tr>
                      {currentTable.header.map((cell, idx) => (
                        <th key={idx}>
                          <DisplayCell value={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {currentTable.table.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, colIdx) => (
                        <td key={colIdx}>
                          <DisplayCell value={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {processResult?.success && currentTable && currentTable.rowCount === 0 && (
        <section className="tool-section">
          <div className="empty-state">
            表格内容为空
          </div>
        </section>
      )}

      {!processResult && input.length === 0 && (
        <section className="tool-section">
          <div className="empty-state">
            请输入或粘贴 CSV / TSV 文本开始转换
          </div>
        </section>
      )}

      <section className="notes-section">
        <h4>📖 使用说明与限制</h4>
        <ul>
          <li>
            <strong>解析规则 (RFC4180 兼容)：</strong>
            <ul>
              <li>引号字符：<code>"</code></li>
              <li>转义规则：连续两个引号表示一个引号字符</li>
              <li>单元格中包含分隔符、引号或换行时，将自动用引号包围</li>
            </ul>
          </li>
          <li>
            <strong>分隔符自动探测：</strong>
            <ul>
              <li>优先探测：制表符 (\t)、逗号 (,)、分号 (;)、管道 (|)</li>
              <li>基于前 5 行的列数一致性评分</li>
              <li>
                探测失败回退策略：<strong>{AUTO_DETECT_FALLBACK.MESSAGE}</strong>
              </li>
            </ul>
          </li>
          <li>
            <strong>列不齐处理策略：</strong>
            <ul>
              <li><code>报错</code>：检测到列数不一致时直接报错</li>
              <li><code>补齐空单元格</code>：用空字符串补齐</li>
              <li><code>截断</code>：按最大列数截断超出的列</li>
            </ul>
          </li>
          <li>
            <strong>转置操作：</strong>
            <ul>
              <li>将表格行列互换</li>
              <li>列不齐的表格会先按最大列数补齐后再转置</li>
              <li>原表头会成为转置后表格的第一列</li>
            </ul>
          </li>
          <li>
            <strong>大体量输入优化：</strong>
            <ul>
              <li>行数超过 {LARGE_TABLE_THRESHOLD_ROWS} 或列数超过 {LARGE_TABLE_THRESHOLD_COLS} 时启用虚拟滚动</li>
              <li>仅渲染视口内的行，大幅提升渲染性能</li>
              <li>虚拟滚动可见区域：约 {VIRTUAL_SCROLL_VISIBLE_ROWS} 行</li>
            </ul>
          </li>
          <li>
            <strong>大小限制：</strong>
            <ul>
              <li>最大输入大小：{formatNumber(MAX_INPUT_BYTES / 1024 / 1024)} MB</li>
              <li>最大行数：{formatNumber(MAX_ROWS)}</li>
              <li>最大列数：{formatNumber(MAX_COLS)}</li>
              <li>单个单元格最大：{formatNumber(MAX_CELL_BYTES / 1024)} KB</li>
            </ul>
          </li>
          <li>
            <strong>错误码说明：</strong>
            <ul>
              <li><code>NULL_INPUT</code>：输入为空</li>
              <li><code>INPUT_TOO_LARGE</code>：输入超过大小限制</li>
              <li><code>TOO_MANY_ROWS</code>：行数超出限制</li>
              <li><code>TOO_MANY_COLS</code>：列数超出限制</li>
              <li><code>CELL_TOO_LARGE</code>：单元格过大</li>
              <li><code>UNTERMINATED_QUOTE</code>：引号未闭合</li>
              <li><code>INCONSISTENT_COLS</code>：列数不一致</li>
              <li><code>EMPTY_TABLE</code>：表格为空</li>
            </ul>
          </li>
        </ul>
      </section>
    </div>
  )
}
