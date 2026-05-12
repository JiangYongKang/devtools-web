import { useCallback, useState, useRef, useEffect } from 'react'
import {
  formatGraphQL,
  normalizeParams,
  DEFAULT_PARAMS,
  VALID_INDENT_WIDTHS,
  ERROR_CODES,
  renderHighlightedHtml,
  escapeHtml,
  computeDiff,
  DIFF_OPERATION,
  SAMPLE_GRAPHQL,
  ERROR_SAMPLE,
  COMPRESS_SAMPLE,
} from './logic/index.js'
import './GraphQLQueryFormatterTool.css'

const INDENT_WIDTH_OPTIONS = VALID_INDENT_WIDTHS

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

export default function GraphQLQueryFormatterTool() {
  const [inputGraphQL, setInputGraphQL] = useState('')
  const [formatParams, setFormatParams] = useState({
    indentWidth: DEFAULT_PARAMS.indentWidth,
    stripComments: DEFAULT_PARAMS.stripComments,
    maxInputSizeKb: DEFAULT_PARAMS.maxInputSizeKb,
  })
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('formatted')
  const [searchQuery, setSearchQuery] = useState('')
  const [copyStatus, setCopyStatus] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [diffLeftText, setDiffLeftText] = useState('')
  const [diffRightText, setDiffRightText] = useState('')
  const [diffResult, setDiffResult] = useState(null)
  const [diffError, setDiffError] = useState(null)
  const [loading, setLoading] = useState(false)

  const debounceRef = useRef(null)

  const inputSizeBytes = new Blob([inputGraphQL]).size
  const maxInputBytes = formatParams.maxInputSizeKb * 1024
  const isLargeInput = inputSizeBytes > maxInputBytes * 0.8
  const canProcess = inputGraphQL.trim().length > 0 && !isLargeInput

  const handleProcess = useCallback(() => {
    if (!canProcess) return

    setLoading(true)
    setResult(null)

    setTimeout(() => {
      try {
        const normalizedParams = normalizeParams({
          ...formatParams,
          mode: activeTab === 'compressed' ? 'COMPRESS' : 'FORMAT',
        })
        const formatResult = formatGraphQL(inputGraphQL, normalizedParams)
        setResult(formatResult)
      } catch (err) {
        setResult({
          formattedText: inputGraphQL,
          compressedText: inputGraphQL,
          highlights: [],
          outline: [],
          diagnostics: [],
          errorCode: ERROR_CODES.PARSE_ERROR,
          errorMessage: err?.message || '处理失败',
        })
      } finally {
        setLoading(false)
      }
    }, 0)
  }, [inputGraphQL, formatParams, activeTab, canProcess])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (inputGraphQL.trim().length > 0 && canProcess) {
        handleProcess()
      } else {
        setResult(null)
      }
    }, 300)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [inputGraphQL, formatParams, activeTab, canProcess, handleProcess])

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

  const handleClear = useCallback(() => {
    setInputGraphQL('')
    setResult(null)
    setSearchQuery('')
  }, [])

  const handleLoadSample = useCallback((sample) => {
    setInputGraphQL(sample)
    setResult(null)
  }, [])

  const handleParamChange = useCallback((key, value) => {
    setFormatParams(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleDiffCompare = useCallback(() => {
    if (!diffLeftText.trim() || !diffRightText.trim()) return

    const result = computeDiff(diffLeftText, diffRightText, {
      granularity: 'line',
    })

    if (!result.success) {
      setDiffError(result.error)
      setDiffResult(null)
      return
    }

    setDiffError(null)
    setDiffResult(result.result)
  }, [diffLeftText, diffRightText])

  const handleClearDiff = useCallback(() => {
    setDiffLeftText('')
    setDiffRightText('')
    setDiffResult(null)
    setDiffError(null)
  }, [])

  const handleSwapDiff = useCallback(() => {
    const temp = diffLeftText
    setDiffLeftText(diffRightText)
    setDiffRightText(temp)
    setDiffResult(null)
    setDiffError(null)
  }, [diffLeftText, diffRightText])

  const handleUseCurrentAsLeft = useCallback(() => {
    if (result && !result.errorCode) {
      if (activeTab === 'compressed') {
        setDiffLeftText(result.compressedText)
      } else {
        setDiffLeftText(result.formattedText)
      }
    } else {
      setDiffLeftText(inputGraphQL)
    }
  }, [result, activeTab, inputGraphQL])

  const handleUseCurrentAsRight = useCallback(() => {
    if (result && !result.errorCode) {
      if (activeTab === 'compressed') {
        setDiffRightText(result.compressedText)
      } else {
        setDiffRightText(result.formattedText)
      }
    } else {
      setDiffRightText(inputGraphQL)
    }
  }, [result, activeTab, inputGraphQL])

  const renderErrorBox = (errorCode, errorMessage) => {
    if (!errorCode) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <p>{errorMessage}</p>
        <div className="error-code">错误代码：<code>{errorCode}</code></div>
      </div>
    )
  }

  const renderDiagnostics = (diagnostics) => {
    if (!diagnostics || diagnostics.length === 0) return null

    const errors = diagnostics.filter(d => d.severity === 'error')
    const warnings = diagnostics.filter(d => d.severity === 'warning')

    return (
      <div className="diagnostics-panel">
        <h4>发现 {diagnostics.length} 个问题（错误：{errors.length}，警告：{warnings.length}）</h4>
        <div className="diagnostics-list">
          {diagnostics.map((d, index) => (
            <div key={index} className={`diagnostic-item ${d.severity}`}>
              <span className="location">[{d.line}:{d.column}]</span>
              {' '}{d.message}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderHighlightedContent = (text, highlights) => {
    if (!text) return null

    if (highlights && highlights.length > 0) {
      let html = renderHighlightedHtml(text, highlights)

      if (searchQuery.trim()) {
        const escapedQuery = escapeRegex(searchQuery)
        const regex = new RegExp(escapedQuery, 'gi')
        html = html.replace(regex, '<mark class="search-match">$&</mark>')
      }

      return (
        <pre
          className="result-text highlighted"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    }

    let escaped = escapeHtml(text)
    if (searchQuery.trim()) {
      const escapedQuery = escapeRegex(searchQuery)
      const regex = new RegExp(escapedQuery, 'gi')
      escaped = escaped.replace(regex, '<mark class="search-match">$&</mark>')
    }

    return (
      <pre
        className="result-text"
        dangerouslySetInnerHTML={{ __html: escaped }}
      />
    )
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const renderOutline = (outline) => {
    if (!outline || outline.length === 0) {
      return (
        <div className="outline-panel">
          <h3>大纲</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            暂无操作或片段
          </p>
        </div>
      )
    }

    const operations = outline.filter(o => o.type === 'operation')
    const fragments = outline.filter(o => o.type === 'fragment')

    return (
      <div className="outline-panel">
        <h3>大纲</h3>

        {operations.length > 0 && (
          <div className="outline-section">
            <div className="outline-section-title">操作 ({operations.length})</div>
            {operations.map((op, index) => (
              <div
                key={`op-${index}`}
                className="outline-item"
                title={`${op.operationType} ${op.name}`}
              >
                <span className={`outline-item-icon operation-${op.operationType}`}>
                  {op.operationType === 'query' ? 'Q' :
                   op.operationType === 'mutation' ? 'M' : 'S'}
                </span>
                <span className="outline-item-name">{op.name}</span>
              </div>
            ))}
          </div>
        )}

        {fragments.length > 0 && (
          <div className="outline-section">
            <div className="outline-section-title">片段 ({fragments.length})</div>
            {fragments.map((frag, index) => (
              <div
                key={`frag-${index}`}
                className="outline-item"
                title={`fragment ${frag.name}`}
              >
                <span className="outline-item-icon fragment">F</span>
                <span className="outline-item-name">{frag.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderDiffContent = () => {
    if (!diffResult || !diffResult.segments) return null

    return (
      <div>
        <div className="stats-panel">
          <div className="stat-item">
            <span className="stat-label">是否存在差异</span>
            <span className={`stat-value ${diffResult.hasDifferences ? 'has-diff' : 'no-diff'}`}>
              {diffResult.hasDifferences ? '是' : '否'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总片段数</span>
            <span className="stat-value">{diffResult.totalSegments}</span>
          </div>
          <div className="stat-item stat-delete">
            <span className="stat-label">删除片段</span>
            <span className="stat-value">{diffResult.deleteCount}</span>
          </div>
          <div className="stat-item stat-insert">
            <span className="stat-label">新增片段</span>
            <span className="stat-value">{diffResult.insertCount}</span>
          </div>
        </div>

        <div className="segments-list">
          {diffResult.segments.map((segment, index) => (
            <div
              key={index}
              className={`segment-item segment-${segment.operation}`}
            >
              <div className="segment-meta">
                <span className="segment-index">#{index + 1}</span>
                <span className={`segment-op op-${segment.operation}`}>
                  {segment.operation === DIFF_OPERATION.EQUAL ? '相等' :
                   segment.operation === DIFF_OPERATION.DELETE ? '删除' : '新增'}
                </span>
              </div>
              <div className="segment-content">
                {segment.content === '' ? (
                  <span className="empty-line">(空行)</span>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: escapeHtml(segment.content) }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getCurrentResultText = () => {
    if (!result || result.errorCode) return inputGraphQL
    return activeTab === 'compressed' ? result.compressedText : result.formattedText
  }

  return (
    <div className="graphql-formatter-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>GraphQL 查询格式化工具</h2>
        <p className="section-desc">
          在浏览器本地格式化、压缩、验证和分析 GraphQL 查询。支持操作名和 fragment 结构对齐，语法高亮，以及错误诊断。
        </p>
      </section>

      <section className="tool-section options-section">
        <h3>格式选项</h3>

        <div className="options-grid">
          <div className="form-group">
            <label htmlFor="indentWidth">缩进宽度</label>
            <select
              id="indentWidth"
              value={formatParams.indentWidth}
              onChange={(e) => handleParamChange('indentWidth', parseInt(e.target.value))}
            >
              {INDENT_WIDTH_OPTIONS.map(w => (
                <option key={w} value={w}>{w} 个空格</option>
              ))}
            </select>
          </div>
        </div>

        <div className="checkbox-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formatParams.stripComments}
              onChange={(e) => handleParamChange('stripComments', e.target.checked)}
            />
            <span>剥离注释（<code>#</code> 行注释）</span>
          </label>
        </div>

        <div className="assumption-note">
          <strong>解析器假设：</strong>
          本工具使用轻量级词法分析器进行语法粗校验，无法 100% 覆盖 GraphQL 规范的所有语法。
          主要检测：括号/引号不平衡、重复操作名等基础错误。对于内联字符串（<code>"""..."""</code>），
          剥离注释时会保留其内容。
        </div>
      </section>

      <section className="tool-section">
        <div className="section-header">
          <h3>输入 GraphQL</h3>
          <div className="sample-buttons">
            <button className="sample-btn" onClick={() => handleLoadSample(SAMPLE_GRAPHQL)}>
              加载示例
            </button>
            <button className="sample-btn sample-btn-error" onClick={() => handleLoadSample(ERROR_SAMPLE)}>
              错误样例
            </button>
            <button className="sample-btn" onClick={() => handleLoadSample(COMPRESS_SAMPLE)}>
              压缩样例
            </button>
          </div>
        </div>

        {isLargeInput && (
          <div className="warning-hint">
            输入内容较大（{formatBytes(inputSizeBytes)}），建议使用小于 {formatBytes(maxInputBytes)} 的内容
          </div>
        )}

        <div className="main-content-grid">
          {renderOutline(result?.outline)}

          <div className="content-area">
            <div className="form-group full-width">
              <textarea
                className="graphql-textarea"
                value={inputGraphQL}
                onChange={(e) => setInputGraphQL(e.target.value)}
                placeholder="粘贴或输入 GraphQL 查询/变更/订阅...&#10;&#10;例如：&#10;query GetUser($id: ID!) {&#10;  user(id: $id) {&#10;    id&#10;    name&#10;  }&#10;}"
                spellCheck={false}
              />
              <div className="input-meta">
                <span>字符数：<code>{inputGraphQL.length.toLocaleString()}</code></span>
                <span>约 <code>{formatBytes(inputSizeBytes)}</code></span>
                <span>行数：<code>{inputGraphQL.split('\n').length}</code></span>
              </div>
            </div>

            <div className="action-row">
              <button
                className="primary-btn"
                onClick={handleProcess}
                disabled={loading || !canProcess}
              >
                {loading ? '处理中...' : '立即处理'}
              </button>
              <button
                className="danger-btn"
                onClick={handleClear}
              >
                清除
              </button>
            </div>

            {result && result.diagnostics && result.diagnostics.length > 0 && (
              renderDiagnostics(result.diagnostics)
            )}

            {result && renderErrorBox(result.errorCode, result.errorMessage)}
          </div>
        </div>
      </section>

      {result && !result.errorCode && (
        <section className="tool-section">
          <div className="result-header-row">
            <h3>处理结果</h3>
            <div className="result-actions">
              <button
                className="copy-btn"
                onClick={() => handleCopy(getCurrentResultText(), '处理结果')}
              >
                复制
              </button>
              <button
                className="secondary-btn"
                onClick={() => setShowDiff(!showDiff)}
              >
                {showDiff ? '隐藏 Diff' : '打开 Diff 对比'}
              </button>
            </div>
          </div>

          <div className="result-tabs">
            <button
              className={`result-tab ${activeTab === 'formatted' ? 'active' : ''}`}
              onClick={() => setActiveTab('formatted')}
            >
              格式化
            </button>
            <button
              className={`result-tab ${activeTab === 'compressed' ? 'active' : ''}`}
              onClick={() => setActiveTab('compressed')}
            >
              压缩
            </button>
          </div>

          <div className="stats-panel">
            <div className="stat-item">
              <span className="stat-label">原字符数</span>
              <span className="stat-value">{inputGraphQL.length.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">格式化后</span>
              <span className="stat-value">{result.formattedText.length.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">压缩后</span>
              <span className="stat-value">{result.compressedText.length.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">压缩率</span>
              <span className="stat-value">
                {inputGraphQL.length > 0
                  ? ((1 - result.compressedText.length / inputGraphQL.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            {result.outline && result.outline.length > 0 && (
              <div className="stat-item">
                <span className="stat-label">大纲项</span>
                <span className="stat-value">{result.outline.length}</span>
              </div>
            )}
          </div>

          <div className="search-section">
            <input
              type="text"
              className="search-input"
              placeholder="在结果中搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <span className="search-info">
                搜索: <code>{searchQuery}</code>
              </span>
            )}
          </div>

          <div className="result-box">
            {renderHighlightedContent(
              getCurrentResultText(),
              result.highlights
            )}
          </div>
        </section>
      )}

      {showDiff && (
        <section className="tool-section">
          <div className="diff-section">
            <h3>Diff 对比</h3>
            <p className="section-desc">
              比较两个 GraphQL 文本的差异，可用于对比格式化前后的变化。
            </p>

            <div className="action-row">
              <button className="secondary-btn" onClick={handleUseCurrentAsLeft}>
                将当前结果设为左侧
              </button>
              <button className="secondary-btn" onClick={handleUseCurrentAsRight}>
                将当前结果设为右侧
              </button>
              <button className="secondary-btn" onClick={handleSwapDiff}>
                交换
              </button>
              <button className="danger-btn" onClick={handleClearDiff}>
                清除
              </button>
            </div>

            <div className="diff-inputs-row">
              <div className="diff-input-col">
                <div className="diff-input-header">
                  <h4>左侧（原始）</h4>
                </div>
                <textarea
                  className="diff-textarea"
                  value={diffLeftText}
                  onChange={(e) => setDiffLeftText(e.target.value)}
                  placeholder="粘贴或输入左侧文本..."
                  spellCheck={false}
                />
              </div>

              <div className="diff-input-col">
                <div className="diff-input-header">
                  <h4>右侧（修改后）</h4>
                </div>
                <textarea
                  className="diff-textarea"
                  value={diffRightText}
                  onChange={(e) => setDiffRightText(e.target.value)}
                  placeholder="粘贴或输入右侧文本..."
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="action-row">
              <button
                className="primary-btn"
                onClick={handleDiffCompare}
                disabled={!diffLeftText.trim() || !diffRightText.trim()}
              >
                开始对比
              </button>
            </div>

            {diffError && renderErrorBox(diffError.code, diffError.message)}

            {diffResult && renderDiffContent()}
          </div>
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li><strong>纯前端实现：</strong>所有操作均在浏览器本地执行，不向任何服务器发送数据</li>
          <li><strong>格式化：</strong>自动对齐操作和 fragment 结构，支持自定义缩进宽度</li>
          <li><strong>压缩：</strong>去除多余空白和换行，可选剥离 <code>#</code> 行注释</li>
          <li><strong>语法高亮：</strong>对关键字、类型、字符串、变量、指令、注释等进行颜色区分</li>
          <li><strong>错误检测：</strong>检测括号/引号不平衡、重复操作名等基础语法错误</li>
          <li><strong>节流处理：</strong>大输入会自动节流，避免页面卡顿</li>
          <li><strong>防 XSS：</strong>所有用户内容均作为纯文本渲染，已进行 HTML 转义</li>
        </ul>
      </div>
    </div>
  )
}
