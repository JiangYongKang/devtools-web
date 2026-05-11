import { useCallback, useState } from 'react'
import {
  normalizeParams,
  formatSql,
  renderHighlightedHtml,
  DEFAULT_PARAMS,
} from './logic/index.js'
import './SqlFormatterTool.css'

const DIALECT_OPTIONS = [
  { value: 'standard', label: 'Standard SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'sqlserver', label: 'SQL Server' },
]

const KEYWORD_CASE_OPTIONS = [
  { value: 'upper', label: '大写' },
  { value: 'lower', label: '小写' },
  { value: 'preserve', label: '保持原样' },
]

const INDENT_TYPE_OPTIONS = [
  { value: 'space', label: '空格' },
  { value: 'tab', label: 'Tab' },
]

const INDENT_WIDTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

const LINE_BREAK_OPTIONS = [
  { value: 'unix', label: 'Unix (LF)' },
  { value: 'windows', label: 'Windows (CRLF)' },
  { value: 'preserve', label: '保持原样' },
]

const COMMENT_POLICY_OPTIONS = [
  { value: 'preserve', label: '保留所有注释' },
  { value: 'remove', label: '移除普通注释' },
  { value: 'removeAll', label: '移除所有注释' },
]

const SAMPLE_SQL = `SELECT users.id, users.name, users.email, COUNT(orders.id) as order_count
FROM users
LEFT JOIN orders ON users.id = orders.user_id
WHERE users.status = 'active' 
  AND orders.created_at >= '2024-01-01'
GROUP BY users.id, users.name, users.email
HAVING COUNT(orders.id) > 5
ORDER BY order_count DESC
LIMIT 10 OFFSET 0;

INSERT INTO products (name, price, category, stock)
VALUES ('Laptop', 999.99, 'Electronics', 50),
       ('Mouse', 29.99, 'Electronics', 200),
       ('Keyboard', 79.99, 'Electronics', 150);

UPDATE users 
SET last_login = CURRENT_TIMESTAMP
WHERE id IN (SELECT user_id FROM orders WHERE status = 'completed');`

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

export default function SqlFormatterTool() {
  const [inputSql, setInputSql] = useState('')
  const [formatParams, setFormatParams] = useState({
    dialect: DEFAULT_PARAMS.dialect,
    keywordCase: DEFAULT_PARAMS.keywordCase,
    indentType: DEFAULT_PARAMS.indentType,
    indentWidth: DEFAULT_PARAMS.indentWidth,
    lineBreakStyle: DEFAULT_PARAMS.lineBreakStyle,
    commentPolicy: DEFAULT_PARAMS.commentPolicy,
    includeHighlight: DEFAULT_PARAMS.includeHighlight,
    maxInputSizeKb: DEFAULT_PARAMS.maxInputSizeKb,
    maxNestingDepth: DEFAULT_PARAMS.maxNestingDepth,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
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

  const handleFormat = useCallback(() => {
    setLoading(true)
    setResult(null)

    try {
      const normalizedParams = normalizeParams(formatParams)
      const formatResult = formatSql(inputSql, normalizedParams)
      setResult(formatResult)
    } catch (err) {
      setResult({
        formattedSql: inputSql,
        highlights: [],
        statementCount: 0,
        originalLineCount: inputSql.split('\n').length,
        formattedLineCount: inputSql.split('\n').length,
        errorCode: 'PARSE_FAILED',
        errorMessage: err?.message || '格式化失败',
      })
    } finally {
      setLoading(false)
    }
  }, [inputSql, formatParams])

  const handleClear = useCallback(() => {
    setInputSql('')
    setResult(null)
  }, [])

  const handleLoadSample = useCallback(() => {
    setInputSql(SAMPLE_SQL)
    setResult(null)
  }, [])

  const handleParamChange = useCallback((key, value) => {
    setFormatParams(prev => ({ ...prev, [key]: value }))
  }, [])

  const inputSizeBytes = new Blob([inputSql]).size
  const maxInputBytes = formatParams.maxInputSizeKb * 1024
  const isLargeInput = inputSizeBytes > maxInputBytes * 0.8
  const canFormat = inputSql.trim().length > 0 && !isLargeInput

  const renderErrorBox = (errorCode, errorMessage) => {
    if (!errorCode) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <p>错误代码: <code>{errorCode}</code></p>
        <p>{errorMessage}</p>
      </div>
    )
  }

  const renderHighlightedContent = () => {
    if (!result || !result.formattedSql) return null

    if (formatParams.includeHighlight && result.highlights && result.highlights.length > 0) {
      return (
        <pre
          className="result-text highlighted"
          dangerouslySetInnerHTML={{
            __html: renderHighlightedHtml(result.formattedSql, result.highlights),
          }}
        />
      )
    }

    return (
      <pre
        className="result-text"
        dangerouslySetInnerHTML={{
          __html: result.formattedSql
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;'),
        }}
      />
    )
  }

  return (
    <div className="sql-formatter-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>SQL 格式化工具</h2>
        <p className="section-desc">
          在浏览器本地格式化 SQL 语句，支持多种方言和自定义格式选项。
        </p>
      </section>

      <section className="tool-section options-section">
        <h3>格式选项</h3>
        
        <div className="options-grid">
          <div className="form-group">
            <label htmlFor="dialect">SQL 方言</label>
            <select
              id="dialect"
              value={formatParams.dialect}
              onChange={(e) => handleParamChange('dialect', e.target.value)}
            >
              {DIALECT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="keywordCase">关键字大小写</label>
            <select
              id="keywordCase"
              value={formatParams.keywordCase}
              onChange={(e) => handleParamChange('keywordCase', e.target.value)}
            >
              {KEYWORD_CASE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="indentType">缩进类型</label>
            <select
              id="indentType"
              value={formatParams.indentType}
              onChange={(e) => handleParamChange('indentType', e.target.value)}
            >
              {INDENT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="indentWidth">缩进宽度</label>
            <select
              id="indentWidth"
              value={formatParams.indentWidth}
              onChange={(e) => handleParamChange('indentWidth', parseInt(e.target.value))}
            >
              {INDENT_WIDTH_OPTIONS.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="lineBreakStyle">换行风格</label>
            <select
              id="lineBreakStyle"
              value={formatParams.lineBreakStyle}
              onChange={(e) => handleParamChange('lineBreakStyle', e.target.value)}
            >
              {LINE_BREAK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="commentPolicy">注释策略</label>
            <select
              id="commentPolicy"
              value={formatParams.commentPolicy}
              onChange={(e) => handleParamChange('commentPolicy', e.target.value)}
            >
              {COMMENT_POLICY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="checkbox-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formatParams.includeHighlight}
              onChange={(e) => handleParamChange('includeHighlight', e.target.checked)}
            />
            <span>启用关键字高亮</span>
          </label>
        </div>
      </section>

      <section className="tool-section">
        <div className="section-header">
          <h3>输入 SQL</h3>
          <button className="sample-btn" onClick={handleLoadSample}>
            加载示例
          </button>
        </div>

        {isLargeInput && (
          <div className="warning-hint">
            输入内容较大（{formatBytes(inputSizeBytes)}），建议使用小于 {formatBytes(maxInputBytes)} 的内容
          </div>
        )}

        <div className="form-group full-width">
          <textarea
            className="sql-textarea"
            value={inputSql}
            onChange={(e) => setInputSql(e.target.value)}
            placeholder="粘贴或输入 SQL 语句...&#10;&#10;例如：&#10;SELECT * FROM users WHERE status = 'active';"
            spellCheck={false}
          />
          <div className="input-meta">
            <span>字符数：<code>{inputSql.length.toLocaleString()}</code></span>
            <span>约 <code>{formatBytes(inputSizeBytes)}</code></span>
            <span>行数：<code>{inputSql.split('\n').length}</code></span>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleFormat}
            disabled={loading || !canFormat}
          >
            {loading ? '格式化中...' : '格式化 SQL'}
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
          >
            清除
          </button>
        </div>

        {result && renderErrorBox(result.errorCode, result.errorMessage)}
      </section>

      {result && !result.errorCode && result.formattedSql && (
        <section className="tool-section">
          <div className="result-header-row">
            <h3>格式化结果</h3>
            <div className="result-actions">
              <button
                className="copy-btn"
                onClick={() => handleCopy(result.formattedSql, '格式化后的 SQL')}
              >
                复制
              </button>
            </div>
          </div>

          <div className="stats-panel">
            <div className="stat-item">
              <span className="stat-label">语句数量</span>
              <span className="stat-value">{result.statementCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">原行数</span>
              <span className="stat-value">{result.originalLineCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">格式化后行数</span>
              <span className="stat-value">{result.formattedLineCount}</span>
            </div>
            {formatParams.includeHighlight && (
              <div className="stat-item">
                <span className="stat-label">高亮项</span>
                <span className="stat-value">{result.highlights?.length || 0}</span>
              </div>
            )}
          </div>

          <div className="result-box">
            {renderHighlightedContent()}
          </div>
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li><strong>纯前端实现：</strong>所有格式化操作均在浏览器本地执行，不向任何服务器发送数据</li>
          <li><strong>支持的方言：</strong>Standard SQL、MySQL、PostgreSQL、SQLite、Oracle、SQL Server</li>
          <li><strong>输入限制：</strong>建议输入大小不超过 {formatParams.maxInputSizeKb} KB，嵌套深度不超过 {formatParams.maxNestingDepth} 层</li>
          <li><strong>错误处理：</strong>会自动检测并报告空输入、过大输入、嵌套过深、语法截断等问题</li>
          <li><strong>关键字高亮：</strong>开启后会在格式化结果中高亮显示 SQL 关键字和函数名</li>
        </ul>
      </div>
    </div>
  )
}
