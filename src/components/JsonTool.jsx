
import { useCallback, useRef, useState } from 'react'
import {
    ApiError,
    compressJson,
    formatJson,
    INDENT_TYPE_OPTIONS,
    INDENT_WIDTH_OPTIONS,
    MATCH_MODE_OPTIONS,
    SEARCH_TARGET_OPTIONS,
    searchJson,
    stripJsonComments,
} from '../services/jsonApi'

/**
 * XSS 安全转义
 * 所有不可信用户输入、错误信息、路径列表均需通过此函数展示
 */
function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * 错误码到用户友好文案的映射
 * 错误码来源为后端 JSON API，需与后端保持一致
 */
const ERROR_CODE_MESSAGES = {
  NULL_INPUT: '输入不能为空（JSON 或搜索关键词）',
  EMPTY_INPUT: '输入不能为空字符串',
  INVALID_INDENT: '缩进参数无效',
  PARSE_FAILED: 'JSON 解析失败',
  INVALID_SEARCH: '搜索参数无效',
  INVALID_PARAMETER: '参数无效（如枚举值、缩进宽度越界等）',
  HTTP_ERROR: '网络请求失败',
  UNKNOWN_ERROR: '未知错误',
}

function getErrorMessage(err) {
  if (err instanceof ApiError) {
    const base = err.errorMessage || ERROR_CODE_MESSAGES[err.errorCode] || err.errorCode
    return base
  }
  return err?.message || '请求失败，请稍后重试'
}

export default function JsonTool() {
  const [jsonInput, setJsonInput] = useState('')
  const [indentType, setIndentType] = useState('SPACE')
  const [indentWidth, setIndentWidth] = useState(2)
  const [sortKeys, setSortKeys] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchTarget, setSearchTarget] = useState('KEY')
  const [matchMode, setMatchMode] = useState('SUBSTRING')
  const [caseSensitive, setCaseSensitive] = useState(true)

  const [formatResult, setFormatResult] = useState(null)
  const [compressResult, setCompressResult] = useState(null)
  const [searchResult, setSearchResult] = useState(null)

  const [loading, setLoading] = useState({
    format: false,
    compress: false,
    search: false,
  })
  const [error, setError] = useState({
    format: null,
    compress: null,
    search: null,
  })
  const [copyStatus, setCopyStatus] = useState(null)

  const formatResultRef = useRef(null)
  const compressResultRef = useRef(null)

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

  const handleFormat = useCallback(async () => {
    setLoading((prev) => ({ ...prev, format: true }))
    setError((prev) => ({ ...prev, format: null }))
    setFormatResult(null)

    try {
      const processedJson = stripJsonComments(jsonInput)
      const result = await formatJson({
        jsonString: processedJson,
        indentType,
        indentWidth,
        sortKeys,
      }, 'format')
      setFormatResult(result)
    } catch (err) {
      const message = getErrorMessage(err)
      const nodePath = err instanceof ApiError ? err.nodePath : ''
      setError((prev) => ({
        ...prev,
        format: { message, nodePath, code: err?.errorCode },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, format: false }))
    }
  }, [jsonInput, indentType, indentWidth, sortKeys])

  const handleCompress = useCallback(async () => {
    setLoading((prev) => ({ ...prev, compress: true }))
    setError((prev) => ({ ...prev, compress: null }))
    setCompressResult(null)

    try {
      const processedJson = stripJsonComments(jsonInput)
      const result = await compressJson({
        jsonString: processedJson,
        sortKeys,
      }, 'compress')
      setCompressResult(result)
    } catch (err) {
      const message = getErrorMessage(err)
      const nodePath = err instanceof ApiError ? err.nodePath : ''
      setError((prev) => ({
        ...prev,
        compress: { message, nodePath, code: err?.errorCode },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, compress: false }))
    }
  }, [jsonInput, sortKeys])

  const handleSearch = useCallback(async () => {
    setLoading((prev) => ({ ...prev, search: true }))
    setError((prev) => ({ ...prev, search: null }))
    setSearchResult(null)

    if (searchQuery === '') {
      setError((prev) => ({
        ...prev,
        search: {
          message: '空字符串搜索可能返回海量结果，请输入更具体的关键词',
          nodePath: '',
          code: 'EMPTY_QUERY_WARNING',
        },
      }))
      setLoading((prev) => ({ ...prev, search: false }))
      return
    }

    try {
      const processedJson = stripJsonComments(jsonInput)
      const result = await searchJson({
        jsonString: processedJson,
        query: searchQuery,
        searchTarget,
        matchMode,
        caseSensitive,
      }, 'search')
      setSearchResult(result)
    } catch (err) {
      const message = getErrorMessage(err)
      const nodePath = err instanceof ApiError ? err.nodePath : ''
      setError((prev) => ({
        ...prev,
        search: { message, nodePath, code: err?.errorCode },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, search: false }))
    }
  }, [jsonInput, searchQuery, searchTarget, matchMode, caseSensitive])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>{err.code ? `[${err.code}] ` : ''}操作失败</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
        {err.nodePath && (
          <p className="error-path" dangerouslySetInnerHTML={{
            __html: `位置：<code>${escapeHtml(err.nodePath)}</code>`,
          }} />
        )}
      </div>
    )
  }

  return (
    <div className="json-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section input-section">
        <h2>JSON 输入</h2>
        <div className="form-group full-width">
          <label htmlFor="json-input">JSON 文本</label>
          <textarea
            id="json-input"
            className="json-textarea"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="粘贴或输入 JSON 文本..."
            spellCheck={false}
          />
          <div className="input-hint">支持多行输入，可粘贴带 // 或 /* */ 注释的 JSON（前端预处理去除注释）</div>
        </div>
      </section>

      <section className="tool-section format-section">
        <h2>JSON 格式化</h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="indent-type">缩进类型</label>
            <select
              id="indent-type"
              value={indentType}
              onChange={(e) => setIndentType(e.target.value)}
            >
              {INDENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="indent-width">缩进宽度</label>
            <select
              id="indent-width"
              value={indentWidth}
              onChange={(e) => setIndentWidth(Number(e.target.value))}
            >
              {INDENT_WIDTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="input-hint">
              TAB 时每层仍为一个制表符，宽度仅用于合法校验（1-8）
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={sortKeys}
                onChange={(e) => setSortKeys(e.target.checked)}
              />
              <span>按键名排序（对象键自然序，数组顺序不变）</span>
            </label>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleFormat}
            disabled={loading.format || !jsonInput.trim()}
          >
            {loading.format ? '格式化中...' : '格式化'}
          </button>
          <button
            className="secondary-btn"
            onClick={handleCompress}
            disabled={loading.compress || !jsonInput.trim()}
          >
            {loading.compress ? '压缩中...' : '压缩（紧凑单行）'}
          </button>
        </div>

        {renderErrorBox(error.format)}

        {formatResult != null && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">格式化结果</span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(formatResult, '格式化结果')}
              >
                复制
              </button>
            </div>
            <pre
              ref={formatResultRef}
              className="result-text"
              dangerouslySetInnerHTML={{ __html: escapeHtml(formatResult) }}
            />
          </div>
        )}

        {renderErrorBox(error.compress)}

        {compressResult != null && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">压缩结果</span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(compressResult, '压缩结果')}
              >
                复制
              </button>
            </div>
            <pre
              ref={compressResultRef}
              className="result-text compressed"
              dangerouslySetInnerHTML={{ __html: escapeHtml(compressResult) }}
            />
          </div>
        )}
      </section>

      <div className="section-divider" />

      <section className="tool-section search-section">
        <h2>JSON 结构化搜索</h2>

        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="search-query">搜索关键词</label>
            <input
              id="search-query"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入要搜索的键名或值..."
            />
            <div className="input-hint">
              空字符串可能返回海量结果，建议输入具体关键词
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="search-target">搜索目标</label>
            <select
              id="search-target"
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
            >
              {SEARCH_TARGET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="input-hint">
              VALUE 仅对标量 toString 匹配，不整段序列化对象
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="match-mode">匹配模式</label>
            <select
              id="match-mode"
              value={matchMode}
              onChange={(e) => setMatchMode(e.target.value)}
            >
              {MATCH_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              <span>区分大小写（默认区分；取消勾选时忽略大小写）</span>
            </label>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleSearch}
            disabled={loading.search || !jsonInput.trim() || searchQuery === null}
          >
            {loading.search ? '搜索中...' : '搜索'}
          </button>
        </div>

        {renderErrorBox(error.search)}

        {searchResult && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">
                搜索结果：共 {searchResult.totalMatches || 0} 处匹配
              </span>
              {searchResult.nodePaths && searchResult.nodePaths.length > 0 && (
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(
                    searchResult.nodePaths.join('\n'),
                    '匹配路径列表'
                  )}
                >
                  复制路径
                </button>
              )}
            </div>
            <div className="search-meta">
              <span dangerouslySetInnerHTML={{
                __html: `查询：<code>${escapeHtml(searchResult.query || searchQuery)}</code>`,
              }} />
              <span dangerouslySetInnerHTML={{
                __html: `目标：<code>${escapeHtml(searchResult.target || searchTarget)}</code>`,
              }} />
            </div>
            {searchResult.nodePaths && searchResult.nodePaths.length > 0 ? (
              <ul className="path-list">
                {searchResult.nodePaths.map((path, idx) => (
                  <li
                    key={idx}
                    dangerouslySetInnerHTML={{
                      __html: `<code>${escapeHtml(path)}</code>`,
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="no-results">未找到匹配项</p>
            )}
          </div>
        )}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>核心解析、转义、排序与搜索语义由后端统一执行，确保与 devtools 约定一致</li>
          <li>大文本处理：请求可取消；若后端返回请求体超限或超时，请适当分段或重试</li>
          <li>数值形态与非法 JSON 的可解析性以后端 Hutool 行为为准</li>
          <li>所有用户输入、错误信息与路径均经转义展示，避免 XSS</li>
        </ul>
      </div>
    </div>
  )
}
