

import { useState, useCallback, useMemo } from 'react'
import {
  encodeUrl,
  decodeUrl,
  batchUrl,
  ApiError,
  STYLE_OPTIONS,
  CHARSET_OPTIONS,
  ERROR_CODE_MESSAGES,
} from '../services/urlApi'

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function getErrorMessage(err) {
  if (err instanceof ApiError) {
    const base = err.errorMessage || ERROR_CODE_MESSAGES[err.errorCode] || err.errorCode
    return base
  }
  return err?.message || '请求失败，请稍后重试'
}

function splitLines(text) {
  if (!text) return []
  return text.split(/\r?\n/).filter((_, idx, arr) => {
    if (idx === arr.length - 1 && text.endsWith('\n')) return false
    return true
  })
}

function joinResults(results) {
  return results.map((r) => (r.success ? r.result?.result || '' : '')).join('\n')
}

export default function UrlTool() {
  const [inputText, setInputText] = useState('')
  const [charset, setCharset] = useState('UTF-8')
  const [style, setStyle] = useState('URI_COMPONENT')
  const [failFast, setFailFast] = useState(false)

  const [encodeResult, setEncodeResult] = useState(null)
  const [decodeResult, setDecodeResult] = useState(null)

  const [loading, setLoading] = useState({
    encode: false,
    decode: false,
  })
  const [error, setError] = useState({
    encode: null,
    decode: null,
  })
  const [copyStatus, setCopyStatus] = useState(null)

  const lines = useMemo(() => splitLines(inputText), [inputText])
  const isBatch = lines.length > 1

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

  const handleEncode = useCallback(async () => {
    setLoading((prev) => ({ ...prev, encode: true }))
    setError((prev) => ({ ...prev, encode: null }))
    setEncodeResult(null)

    try {
      if (isBatch) {
        const payload = lines.map((text, idx) => {
          const item = { text, action: 'ENCODE' }
          if (idx === 0 && failFast) {
            item.failFast = true
          }
          if (charset && charset !== 'UTF-8') {
            item.charset = charset
          }
          if (style && style !== 'URI_COMPONENT') {
            item.style = style
          }
          return item
        })
        const result = await batchUrl(payload, 'url-batch-encode')
        setEncodeResult({
          type: 'batch',
          data: result,
          joined: joinResults(result.results || []),
        })
      } else {
        const text = lines[0] || ''
        const result = await encodeUrl({ text, charset, style }, 'url-encode')
        setEncodeResult({
          type: 'single',
          data: result,
          joined: result.result || '',
        })
      }
    } catch (err) {
      const message = getErrorMessage(err)
      const code = err?.errorCode
      const partialResults = err instanceof ApiError ? err.payload : null
      setError((prev) => ({
        ...prev,
        encode: { message, code, partialResults },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, encode: false }))
    }
  }, [lines, isBatch, charset, style, failFast])

  const handleDecode = useCallback(async () => {
    setLoading((prev) => ({ ...prev, decode: true }))
    setError((prev) => ({ ...prev, decode: null }))
    setDecodeResult(null)

    try {
      if (isBatch) {
        const payload = lines.map((text, idx) => {
          const item = { text, action: 'DECODE' }
          if (idx === 0 && failFast) {
            item.failFast = true
          }
          if (charset && charset !== 'UTF-8') {
            item.charset = charset
          }
          if (style && style !== 'URI_COMPONENT') {
            item.style = style
          }
          return item
        })
        const result = await batchUrl(payload, 'url-batch-decode')
        setDecodeResult({
          type: 'batch',
          data: result,
          joined: joinResults(result.results || []),
        })
      } else {
        const text = lines[0] || ''
        const result = await decodeUrl({ text, charset, style }, 'url-decode')
        setDecodeResult({
          type: 'single',
          data: result,
          joined: result.result || '',
        })
      }
    } catch (err) {
      const message = getErrorMessage(err)
      const code = err?.errorCode
      const partialResults = err instanceof ApiError ? err.payload : null
      setError((prev) => ({
        ...prev,
        decode: { message, code, partialResults },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, decode: false }))
    }
  }, [lines, isBatch, charset, style, failFast])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>{err.code ? `[${err.code}] ` : ''}操作失败</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  const renderSingleResult = (result, label) => {
    if (!result || result.type !== 'single') return null
    const data = result.data
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">{label}</span>
          <button
            className="copy-btn"
            onClick={() => handleCopy(result.joined, label)}
          >
            复制
          </button>
        </div>
        <pre
          className="result-text"
          dangerouslySetInnerHTML={{ __html: escapeHtml(data.result) }}
        />
        <div className="result-meta">
          <span dangerouslySetInnerHTML={{
            __html: `操作：<code>${escapeHtml(data.action)}</code>`,
          }} />
          <span dangerouslySetInnerHTML={{
            __html: `字符集：<code>${escapeHtml(data.charset)}</code>`,
          }} />
          <span dangerouslySetInnerHTML={{
            __html: `风格：<code>${escapeHtml(data.style)}</code>`,
          }} />
        </div>
      </div>
    )
  }

  const renderBatchResult = (result, label, action, originalErr) => {
    if (!result || result.type !== 'batch') return null
    const data = result.data
    const results = data.results || originalErr?.partialResults?.results || []

    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">
            {label}（{results.length} 条）
          </span>
          <button
            className="copy-btn"
            onClick={() => handleCopy(result.joined, label)}
          >
            复制全部结果
          </button>
        </div>

        <div className="batch-summary">
          <span>总计：{data.total || results.length} 条</span>
          <span className="success-count">成功：{data.successCount || results.filter((r) => r.success).length}</span>
          <span className="failure-count">失败：{data.failureCount || results.filter((r) => !r.success).length}</span>
        </div>

        <div className="batch-result-list">
          {results.map((item, idx) => {
            const isSuccess = item.success
            return (
              <div
                key={idx}
                className={`batch-result-item ${isSuccess ? 'success' : 'error'}`}
              >
                <div className="batch-result-header">
                  <span className="batch-index">#{idx + 1}</span>
                  <span className={`batch-status ${isSuccess ? 'success' : 'error'}`}>
                    {isSuccess ? '成功' : '失败'}
                  </span>
                </div>
                {isSuccess ? (
                  <>
                    <div className="batch-result-text-label">输入：</div>
                    <pre
                      className="batch-result-text input"
                      dangerouslySetInnerHTML={{ __html: escapeHtml(lines[idx] || '') }}
                    />
                    <div className="batch-result-text-label">输出：</div>
                    <pre
                      className="batch-result-text output"
                      dangerouslySetInnerHTML={{ __html: escapeHtml(item.result?.result || '') }}
                    />
                    <button
                      className="copy-btn batch-copy-btn"
                      onClick={() => handleCopy(item.result?.result || '', `结果 #${idx + 1}`)}
                    >
                      复制
                    </button>
                  </>
                ) : (
                  <>
                    <div className="batch-result-text-label">输入：</div>
                    <pre
                      className="batch-result-text input"
                      dangerouslySetInnerHTML={{ __html: escapeHtml(lines[idx] || '') }}
                    />
                    <div className="batch-error">
                      <strong dangerouslySetInnerHTML={{
                        __html: item.errorCode ? `[${escapeHtml(item.errorCode)}] ` : '',
                      }} />
                      <span dangerouslySetInnerHTML={{ __html: escapeHtml(item.errorMessage || '未知错误') }} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="url-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>URL 编码/解码</h2>

        <div className="form-group full-width">
          <label htmlFor="url-input">文本输入</label>
          <textarea
            id="url-input"
            className="url-textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="粘贴或输入文本...&#10;&#10;单条示例：hello world&#10;批量示例（每行一条）：&#10;hello world&#10;foo bar"
            spellCheck={false}
          />
          <div className="input-hint">
            单行输入为单条处理，多行输入自动按行批量处理
            {isBatch && <span className="batch-hint">（当前：{lines.length} 条，批量模式）</span>}
          </div>
        </div>

        <div className="form-row with-top-gap">
          <div className="form-group">
            <label htmlFor="charset-select">字符集 (charset)</label>
            <select
              id="charset-select"
              value={charset}
              onChange={(e) => setCharset(e.target.value)}
            >
              {CHARSET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="style-select">编码风格 (style)</label>
            <select
              id="style-select"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {STYLE_OPTIONS.map((opt) => (
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
                checked={failFast}
                onChange={(e) => setFailFast(e.target.checked)}
              />
              <span>快速失败 (failFast) - 首条失败后停止后续处理</span>
            </label>
            <div className="input-hint">仅批量模式有效</div>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleEncode}
            disabled={loading.encode}
          >
            {loading.encode ? '编码中...' : `编码 (${isBatch ? '批量' : '单条'})`}
          </button>
          <button
            className="secondary-btn"
            onClick={handleDecode}
            disabled={loading.decode}
          >
            {loading.decode ? '解码中...' : `解码 (${isBatch ? '批量' : '单条'})`}
          </button>
        </div>

        {renderErrorBox(error.encode)}
        {encodeResult?.type === 'single' && renderSingleResult(encodeResult, '编码结果')}
        {encodeResult?.type === 'batch' && renderBatchResult(encodeResult, '编码结果', 'ENCODE', error.encode)}

        {renderErrorBox(error.decode)}
        {decodeResult?.type === 'single' && renderSingleResult(decodeResult, '解码结果')}
        {decodeResult?.type === 'batch' && renderBatchResult(decodeResult, '解码结果', 'DECODE', error.decode)}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>核心编码/解码语义由后端统一执行（基于 Java URLEncoder/URLDecoder 规则），避免前后端不一致</li>
          <li>
            <strong>URI_COMPONENT 风格</strong>：空格编码为 <code>%20</code>，严格遵循 RFC 3986 组件编码
          </li>
          <li>
            <strong>FORM 风格</strong>：空格编码为 <code>+</code>，适用于
            <code>application/x-www-form-urlencoded</code> 场景
          </li>
          <li>解码时百分号序列大小写不敏感（如 <code>%2f</code> 与 <code>%2F</code> 等价）</li>
          <li>所有用户输入、错误信息与结果均经转义展示，避免 XSS</li>
        </ul>
      </div>
    </div>
  )
}
