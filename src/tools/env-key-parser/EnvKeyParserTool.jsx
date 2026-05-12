import { useCallback, useState } from 'react'
import {
  EXAMPLES,
  MAX_LINE_COUNT,
  MAX_LINE_LENGTH,
  processEnvContent,
  formatAsSortedKeyList,
  formatAsTSV,
} from './logic/index.js'
import './EnvKeyParserTool.css'

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

export default function EnvKeyParserTool() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [selectedExample, setSelectedExample] = useState(null)
  const [sortBy, setSortBy] = useState('none')

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
        setCopyStatus({ type: 'error', message: `复制失败：${err?.message || '未知错误' }` })
      }
      document.body.removeChild(textarea)
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

  const handleParse = useCallback(() => {
    if (!input.trim()) {
      setResult(null)
      return
    }
    const parseResult = processEnvContent(input)
    setResult(parseResult)
  }, [input])

  const handleLoadExample = useCallback((exampleKey) => {
    setResult(null)
    setSelectedExample(exampleKey)
    setInput(EXAMPLES[exampleKey] || '')
  }, [])

  const handleClear = useCallback(() => {
    setInput('')
    setResult(null)
    setSelectedExample(null)
  }, [])

  const handleCopySorted = useCallback(() => {
    if (!result || !result.uniqueEntries) return
    const text = formatAsSortedKeyList(result.uniqueEntries)
    handleCopy(text, '排序键列表')
  }, [result, handleCopy])

  const handleCopyTSV = useCallback(() => {
    if (!result || !result.uniqueEntries) return
    const text = formatAsTSV(result.uniqueEntries)
    handleCopy(text, 'TSV 格式')
  }, [result, handleCopy])

  const getSortedEntries = useCallback(() => {
    if (!result || !result.uniqueEntries) return []
    const entries = [...result.uniqueEntries]
    switch (sortBy) {
      case 'key':
      case 'key-desc':
        return entries.sort((a, b) => sortBy === 'key'
          ? a.key.localeCompare(b.key)
          : b.key.localeCompare(a.key)
      case 'line':
        return entries.sort((a, b) => a.lineNumbers[0] - b.lineNumbers[0])
      default:
        return entries
    }
  }, [result, sortBy])

  const renderErrorBox = (errorCode, errorMessage) => {
    if (!errorCode) return null
    return (
      <div className="error-box">
        <strong>错误</strong>
        <p>{errorMessage}</p>
        {errorCode && <div className="error-code">错误码：{errorCode}</div>}
      </div>
    )
  }

  const renderErrors = (errors) => {
    if (!errors || errors.length === 0) return null
    return (
      <div className="errors-section">
        <h3>错误列表</h3>
        <div className="error-list">
          {errors.map((error, index) => (
            <div key={index} className="error-item">
              <div className="error-header">
                <strong>{error.errorCode}</strong>
              </div>
              <p>{error.errorMessage}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderWarnings = (warnings) => {
    if (!warnings || warnings.length === 0) return null
    return (
      <div className="warnings-section">
        {warnings.map((warning, index) => (
          <div
            key={index}
            className={`warning-box ${warning.type === 'info' ? 'info' : 'warning'}`}
          >
            <strong>{warning.type === 'info' ? '提示' : '警告'}</strong>
            <p>{warning.message}</p>
            {warning.code && <div className="warning-code">类型：{warning.code}</div>}
          </div>
        ))}
      </div>
    )
  }

  const renderDuplicates = (duplicates) => {
    if (!duplicates || duplicates.length === 0) return null
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">重复键报告</span>
        </div>
        <div className="duplicates-list">
          {duplicates.map((dup, index) => (
            <div key={index} className="duplicate-item">
            <div className="duplicate-key">
              <code>{dup.key}</code>
              <span className="duplicate-count">出现 {dup.count} 次</span>
            </div>
            <div className="duplicate-occurrences">
              {dup.occurrences.map((occ, occIndex) => (
                <div key={occIndex} className="occurrence-item">
                  <span className="occurrence-line">第 {occ.lineNumbers.join(', ')} 行</span>
                  <code className="occurrence-value">{escapeHtml(occ.value)}</code>
                  {occ.comment && (
                    <span className="occurrence-comment"># {escapeHtml(occ.comment)}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="duplicate-final">
              <strong>最终值：</strong>
              <code>{escapeHtml(dup.lastValue)}</code>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderStats = (stats) => {
    if (!stats) return null
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">解析统计</span>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
          <span className="stat-label">总行数</span>
          <span className="stat-value">{stats.totalLines}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">处理行数</span>
          <span className="stat-value">{stats.processedLines}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">有效条目</span>
          <span className="stat-value">{stats.validEntries}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">唯一键数</span>
          <span className="stat-value">{stats.uniqueKeys}</span>
        </div>
        <div className="stat-item warning">
          <span className="stat-label">重复键数</span>
          <span className="stat-value">{stats.duplicateCount}</span>
        </div>
      </div>
    </div>
    )
  }

  const renderEntriesTable = (entries) => {
    if (!entries || entries.length === 0) return null
    const sortedEntries = getSortedEntries()
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">键值对列表</span>
          <div className="header-actions">
            <button
              className="copy-btn small"
              onClick={handleCopySorted}
            >
              复制为排序键列表
            </button>
            <button
              className="copy-btn small"
              onClick={handleCopyTSV}
            >
              复制为 TSV
            </button>
          </div>
        </div>
        <div className="table-controls">
          <label className="sort-label">
            排序：
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="none">原始顺序</option>
              <option value="key">按键名升序</option>
              <option value="key-desc">按键名降序</option>
              <option value="line">按行号</option>
            </select>
          </label>
        </div>
        <div className="entries-table-container">
          <table className="entries-table">
            <thead>
              <tr>
                <th>键名</th>
                <th>值</th>
                <th>行号</th>
                <th>Export</th>
                <th>注释</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => (
                <tr key={index}>
                  <td>
                    <code>{escapeHtml(entry.key)}</code>
                  </td>
                  <td>
                    <code className="value-cell">{escapeHtml(entry.value)}</code>
                  </td>
                  <td>{entry.lineNumbers.join(', ')}</td>
                  <td>{entry.hasExport ? '✓' : '—'}</td>
                  <td>
                    {entry.comment ? (
                    <span className="comment-text"># {escapeHtml(entry.comment)}</span>
                  ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="env-key-parser">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>输入 .env 内容</h2>
        <div className="input-section">
          <div className="form-group full-width">
            <label htmlFor="env-input">粘贴或输入键值文本</label>
            <textarea
              id="env-input"
              className="batch-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`# 示例：\nDB_HOST=localhost\nexport DB_PORT=5432\nAPI_KEY="secret"\nVALUE=test # 行尾注释\n\nMULTI_LINE=first line \\\nsecond line`}
              spellCheck={false}
            />
            <div className="input-hint">
              支持：export 前缀、引号包裹值、行尾注释、反斜杠续行
            </div>
          </div>
        </div>

        <div className="examples-section">
          <h3>示例</h3>
          <div className="examples-grid">
            <button
              className={`example-btn ${selectedExample === 'basic' ? 'active' : ''}`}
              onClick={() => handleLoadExample('basic')}
            >
              基础示例
            </button>
            <button
              className={`example-btn ${selectedExample === 'quotesAndComments' ? 'active' : ''}`}
              onClick={() => handleLoadExample('quotesAndComments')}
            >
              引号与注释
            </button>
            <button
              className={`example-btn ${selectedExample === 'continuation' ? 'active' : ''}`}
              onClick={() => handleLoadExample('continuation')}
            >
              反斜杠续行
            </button>
            <button
              className={`example-btn ${selectedExample === 'duplicateKeys' ? 'active' : ''}`}
              onClick={() => handleLoadExample('duplicateKeys')}
            >
              重复键
            </button>
            <button
              className={`example-btn ${selectedExample === 'full' ? 'active' : ''}`}
              onClick={() => handleLoadExample('full')}
            >
              完整示例
            </button>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleParse}
            disabled={!input.trim()}
          >
            解析
          </button>
          {result && (
            <button
              className="secondary-btn"
              onClick={handleClear}
            >
              清除
            </button>
          )}
        </div>
      </section>

      {result && (
        <section className="results-section">
          {result.errors && result.errors.length > 0 &&
            renderErrors(result.errors)
          }

          {result.warnings && renderWarnings(result.warnings)}

          {result.stats && renderStats(result.stats)}

          {result.duplicates && result.duplicates.length > 0 &&
            renderDuplicates(result.duplicates)}

          {result.uniqueEntries && result.uniqueEntries.length > 0 &&
            renderEntriesTable(result.uniqueEntries)}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有解析均在浏览器本地执行，不向任何后端服务器发送数据，不联网。
          </li>
          <li>
            <strong>不修改系统环境：</strong>本工具仅解析展示，不会写入系统环境变量。
          </li>
          <li>
            <strong>解析规则：</strong>
            <ul>
              <li>支持 <code>KEY=VALUE</code> 格式</li>
              <li>支持可选的 <code>export</code> 前缀（将被识别但不影响值）</li>
              <li>支持双引号 <code>"value"</code> 和单引号 <code>'value'</code></li>
              <li>支持行尾注释 <code># comment</code></li>
              <li>支持反斜杠 <code>\\</code> 续行</li>
              <li>键名规则：字母、数字、下划线，不以数字开头</li>
            </ul>
          </li>
          <li>
            <strong>输入限制：</strong>
            <ul>
              <li>最大行数：{MAX_LINE_COUNT} 行</li>
              <li>单行最大长度：{MAX_LINE_LENGTH} 字符</li>
            </ul>
          </li>
          <li>
            <strong>大体量输入：</strong>超过限制时将启用截断处理，仅处理前 {MAX_LINE_COUNT} 行。
          </li>
        </ul>
      </div>
    </div>
  )
}
