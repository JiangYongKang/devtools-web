import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  interpretUserAgent,
  EXAMPLE_UAS,
  EXAMPLE_LABELS,
  ERROR_CODES,
  escapeHtml,
  groupDiffFieldsByCategory,
  getCategoryLabel,
  MAX_SAFE_INPUT_LENGTH,
} from './logic'
import './UserAgentInspectorTool.css'

const VIEW_MODES = {
  RAW: 'raw',
  TABLE: 'table',
  JSON: 'json',
}

function getErrorTitle(code) {
  const titles = {
    [ERROR_CODES.EMPTY_INPUT]: '输入为空',
    [ERROR_CODES.MALFORMED]: '格式异常',
    [ERROR_CODES.PARTIAL_PARSE]: '部分解析失败',
    [ERROR_CODES.INPUT_TOO_LONG]: '输入过长',
  }
  return titles[code] || '操作失败'
}

export default function UserAgentInspectorTool() {
  const [uaString, setUaString] = useState('')
  const [secondUaString, setSecondUaString] = useState('')
  const [comparisonPairEnabled, setComparisonPairEnabled] = useState(false)
  const [searchToken, setSearchToken] = useState('')
  const [viewMode, setViewMode] = useState(VIEW_MODES.TABLE)
  const [copyStatus, setCopyStatus] = useState(null)
  const [parseResult, setParseResult] = useState(null)

  useEffect(() => {
    if (!uaString.trim()) {
      setParseResult(null)
      return
    }

    const result = interpretUserAgent({
      uaString,
      comparisonPairEnabled,
      secondUaString,
      searchToken,
    })

    setParseResult(result)
  }, [uaString, secondUaString, comparisonPairEnabled, searchToken])

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

  const handleExampleFill = useCallback((exampleKey) => {
    const ua = EXAMPLE_UAS[exampleKey]
    setUaString(ua)
    setSearchToken('')
  }, [])

  const handleClear = useCallback(() => {
    setUaString('')
    setSecondUaString('')
    setSearchToken('')
    setParseResult(null)
  }, [])

  const handleSwap = useCallback(() => {
    const temp = uaString
    setUaString(secondUaString)
    setSecondUaString(temp)
  }, [uaString, secondUaString])

  const groupedDiffFields = useMemo(() => {
    if (!parseResult?.result?.diffFields?.length) return null
    return groupDiffFieldsByCategory(parseResult.result.diffFields)
  }, [parseResult])

  const isLargeInput = uaString.length > MAX_SAFE_INPUT_LENGTH
  const isSecondLargeInput = secondUaString.length > MAX_SAFE_INPUT_LENGTH

  const renderErrorBox = (err) => {
    if (!err) return null

    const isWarning = err.code === ERROR_CODES.PARTIAL_PARSE || err.code === ERROR_CODES.INPUT_TOO_LONG

    if (isWarning) {
      return (
        <div className="warning-box">
          <strong>{getErrorTitle(err.code)}</strong>
          <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
          {err.details && (
            <p className="error-details" dangerouslySetInnerHTML={{ __html: escapeHtml(err.details) }} />
          )}
          {err.code && (
            <div className="error-code">错误代码：<code>{err.code}</code></div>
          )}
        </div>
      )
    }

    return (
      <div className="error-box">
        <strong>{getErrorTitle(err.code)}</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
        {err.details && (
          <p className="error-details" dangerouslySetInnerHTML={{ __html: escapeHtml(err.details) }} />
        )}
        {err.code && (
          <div className="error-code">错误代码：<code>{err.code}</code></div>
        )}
      </div>
    )
  }

  const renderExamplesPanel = () => (
    <div className="examples-panel">
      <h3>示例</h3>
      <div className="examples-grid">
        {Object.entries(EXAMPLE_UAS).map(([key, value]) => (
          <button
            key={key}
            className="example-btn"
            onClick={() => handleExampleFill(key)}
            title={value || '空字符串'}
          >
            {EXAMPLE_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  )

  const renderRawView = (ua, label) => (
    <div className="view-section raw-view">
      <div className="view-header">
        <span className="view-title">{label}</span>
        <button
          className="copy-btn small"
          onClick={() => handleCopy(ua, label)}
        >
          复制
        </button>
      </div>
      <pre
        className="raw-content"
        dangerouslySetInnerHTML={{ __html: escapeHtml(ua) }}
      />
    </div>
  )

  const renderTableView = (normalizedTable, label) => {
    if (!normalizedTable || normalizedTable.length === 0) {
      return (
        <div className="view-section table-view">
          <div className="view-header">
            <span className="view-title">{label}</span>
          </div>
          <div className="empty-table">暂无解析结果</div>
        </div>
      )
    }

    const categories = {}
    for (const item of normalizedTable) {
      const cat = item.category || 'unknown'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push(item)
    }

    return (
      <div className="view-section table-view">
        <div className="view-header">
          <span className="view-title">{label}</span>
          <button
            className="copy-btn small"
            onClick={() => handleCopy(
              normalizedTable.map((i) => `${i.label}: ${i.value}`).join('\n'),
              `${label} 解析结果`
            )}
          >
            复制
          </button>
        </div>
        <div className="search-box-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="在解析结果中搜索..."
            value={searchToken}
            onChange={(e) => setSearchToken(e.target.value)}
          />
        </div>
        <div className="table-content">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category} className="category-group">
              <div className="category-header">{getCategoryLabel(category)}</div>
              <div className="category-items">
                {items.map((item, index) => (
                  <div
                    key={`${item.key}-${index}`}
                    className={`table-row ${item.isHighlighted ? 'highlighted' : ''}`}
                  >
                    <div className="table-cell key-cell">
                      <span className="field-key">{item.label}</span>
                      {item.raw && (
                        <span className="field-raw" title="原始片段">
                          {escapeHtml(item.raw)}
                        </span>
                      )}
                    </div>
                    <div className="table-cell value-cell">
                      <code className="field-value">{escapeHtml(item.value)}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderJsonView = (jsonString, label) => (
    <div className="view-section json-view">
      <div className="view-header">
        <span className="view-title">{label}</span>
        <button
          className="copy-btn small"
          onClick={() => handleCopy(jsonString, `${label} JSON`)}
        >
          复制
        </button>
      </div>
      <pre
        className="json-content"
        dangerouslySetInnerHTML={{ __html: escapeHtml(jsonString) }}
      />
    </div>
  )

  const renderDiffSection = () => {
    if (!groupedDiffFields) return null

    const diffCount = parseResult.result.diffFields.length

    return (
      <div className="diff-section">
        <div className="diff-header">
          <h3>差异对比</h3>
          <span className="diff-count">
            发现 <strong>{diffCount}</strong> 处差异
          </span>
        </div>
        <div className="diff-categories">
          {Object.entries(groupedDiffFields).map(([category, fields]) => (
            <div key={category} className="diff-category-group">
              <div className="diff-category-header">{getCategoryLabel(category)}</div>
              <div className="diff-fields">
                {fields.map((field, index) => (
                  <div key={`${field.key}-${index}`} className={`diff-field diff-${field.type}`}>
                    <div className="diff-field-name">{field.label}</div>
                    <div className="diff-field-values">
                      {field.type === 'removed' && (
                        <div className="diff-value removed">
                          <span className="diff-label">移除：</span>
                          <code>{escapeHtml(String(field.value1))}</code>
                        </div>
                      )}
                      {field.type === 'added' && (
                        <div className="diff-value added">
                          <span className="diff-label">新增：</span>
                          <code>{escapeHtml(String(field.value2))}</code>
                        </div>
                      )}
                      {field.type === 'changed' && (
                        <>
                          <div className="diff-value changed-left">
                            <span className="diff-label">原值：</span>
                            <code>{escapeHtml(String(field.value1))}</code>
                          </div>
                          <div className="diff-value changed-right">
                            <span className="diff-label">新值：</span>
                            <code>{escapeHtml(String(field.value2))}</code>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="user-agent-inspector-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>输入 User-Agent</h2>

        {renderExamplesPanel()}

        <div className="input-section">
          <div className="input-row">
            <div className="input-col">
              <div className="input-header">
                <label htmlFor="ua-input">User-Agent #1</label>
                <div className="input-meta">
                  <span>
                    字符：<code>{uaString.length.toLocaleString()}</code>
                  </span>
                </div>
              </div>
              <textarea
                id="ua-input"
                className="ua-textarea"
                value={uaString}
                onChange={(e) => setUaString(e.target.value)}
                placeholder="粘贴或输入 User-Agent 字符串..."
                spellCheck={false}
              />
              {isLargeInput && (
                <div className="warning-hint">
                  输入内容较长（{uaString.length.toLocaleString()} 字符），已自动截断为 {MAX_SAFE_INPUT_LENGTH} 字符
                </div>
              )}
            </div>

            {comparisonPairEnabled && (
              <div className="input-col">
                <div className="input-header">
                  <label htmlFor="ua-input-2">User-Agent #2</label>
                  <div className="input-meta">
                    <span>
                      字符：<code>{secondUaString.length.toLocaleString()}</code>
                    </span>
                  </div>
                </div>
                <textarea
                  id="ua-input-2"
                  className="ua-textarea"
                  value={secondUaString}
                  onChange={(e) => setSecondUaString(e.target.value)}
                  placeholder="粘贴或输入第二个 User-Agent 进行对比..."
                  spellCheck={false}
                />
                {isSecondLargeInput && (
                  <div className="warning-hint">
                    输入内容较长，已自动截断
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="options-row">
            <div className="option-group checkbox-option">
              <input
                type="checkbox"
                id="enable-comparison"
                checked={comparisonPairEnabled}
                onChange={(e) => setComparisonPairEnabled(e.target.checked)}
              />
              <label htmlFor="enable-comparison">启用对比模式</label>
            </div>
          </div>

          <div className="action-row">
            {comparisonPairEnabled && (
              <button
                className="secondary-btn"
                onClick={handleSwap}
                disabled={!uaString && !secondUaString}
              >
                交换
              </button>
            )}
            <button
              className="secondary-btn"
              onClick={handleClear}
            >
              清除
            </button>
          </div>
        </div>
      </section>

      {parseResult && (
        <>
          <section className="tool-section">
            <div className="results-header">
              <h2>解析结果</h2>

              <div className="view-tabs">
                <button
                  className={`view-tab ${viewMode === VIEW_MODES.RAW ? 'active' : ''}`}
                  onClick={() => setViewMode(VIEW_MODES.RAW)}
                >
                  原始
                </button>
                <button
                  className={`view-tab ${viewMode === VIEW_MODES.TABLE ? 'active' : ''}`}
                  onClick={() => setViewMode(VIEW_MODES.TABLE)}
                >
                  展开表
                </button>
                <button
                  className={`view-tab ${viewMode === VIEW_MODES.JSON ? 'active' : ''}`}
                  onClick={() => setViewMode(VIEW_MODES.JSON)}
                >
                  JSON
                </button>
              </div>
            </div>

            {parseResult.result.summaryLine && (
              <div className="summary-line">
                <span className="summary-label">概要：</span>
                <span className="summary-text">{escapeHtml(parseResult.result.summaryLine)}</span>
              </div>
            )}

            {renderErrorBox(parseResult.error)}
            {comparisonPairEnabled && renderErrorBox(parseResult.comparisonError)}

            <div className="views-container">
              {viewMode === VIEW_MODES.RAW && (
                <>
                  {renderRawView(parseResult.result.original, '原始字符串 #1')}
                  {comparisonPairEnabled && parseResult.result.secondResult && (
                    renderRawView(parseResult.result.secondResult.original, '原始字符串 #2')
                  )}
                </>
              )}

              {viewMode === VIEW_MODES.TABLE && (
                <>
                  {renderTableView(parseResult.result.normalizedTable, '解析结果 #1')}
                  {comparisonPairEnabled && parseResult.result.secondResult && (
                    renderTableView(parseResult.result.secondResult.normalizedTable, '解析结果 #2')
                  )}
                </>
              )}

              {viewMode === VIEW_MODES.JSON && (
                <>
                  {renderJsonView(parseResult.result.jsonExportString, 'JSON #1')}
                  {comparisonPairEnabled && parseResult.result.secondResult && (
                    renderJsonView(parseResult.result.secondResult.jsonExportString, 'JSON #2')
                  )}
                </>
              )}
            </div>
          </section>

          {comparisonPairEnabled && groupedDiffFields && renderDiffSection()}
        </>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有解析均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>离线解析：</strong>基于内置规则库进行解析，无需网络连接。
          </li>
          <li>
            <strong>XSS 防护：</strong>用户输入仅以纯文本方式渲染，自动转义特殊字符。
          </li>
          <li>
            <strong>规则覆盖：</strong>支持主流浏览器（Chrome、Firefox、Safari、Edge 等）、
            渲染引擎（Blink、Gecko、WebKit 等）、操作系统（Windows、macOS、iOS、Android 等）、
            以及常见爬虫（Googlebot、Bingbot、cURL 等）。
          </li>
          <li>
            <strong>性能说明：</strong>建议输入在 {MAX_SAFE_INPUT_LENGTH.toLocaleString()} 字符以内；
            超长 UA 将自动截断处理。
          </li>
          <li>
            <strong>启发式分词：</strong>对于未知格式的 UA，仍会尝试提取括号片段和 Key/Value token 供参考。
          </li>
        </ul>
      </div>
    </div>
  )
}
