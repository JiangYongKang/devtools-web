import { useCallback, useState } from 'react'
import {
  MAX_SAFE_INPUT_SIZE,
  escapeHtml,
  formatBytes,
  processJs,
} from './logic/jsUtils'
import './JsTool.css'

export default function JsTool() {
  const [inputJs, setInputJs] = useState('')
  const [mode, setMode] = useState('format')
  const [indentSize, setIndentSize] = useState(2)
  const [removeComments, setRemoveComments] = useState(true)
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

  const handleProcess = useCallback(() => {
    setLoading(true)
    setResult(null)

    try {
      const options = {
        mode,
        indent: indentSize,
        removeComments,
      }

      const processResult = processJs(inputJs, options)
      setResult(processResult)
    } finally {
      setLoading(false)
    }
  }, [inputJs, mode, indentSize, removeComments])

  const handleClear = useCallback(() => {
    setInputJs('')
    setResult(null)
  }, [])

  const handleSwap = useCallback(() => {
    if (result?.success && result.output) {
      setInputJs(result.output)
      setResult(null)
    }
  }, [result])

  const inputSize = inputJs.length
  const byteSize = new Blob([inputJs]).size
  const isLargeInput = byteSize > MAX_SAFE_INPUT_SIZE
  const canProcess = inputJs.trim().length > 0

  const renderErrorBox = (err) => {
    if (!err || err.success) return null
    return (
      <div className="error-box">
        <div className="error-header">
          <strong className="error-code">{err.errorCode}</strong>
        </div>
        <p className="error-message">{err.errorMessage}</p>
        {err.snippet && (
          <div className="error-snippet">
            <span>位置摘要：</span>
            <pre dangerouslySetInnerHTML={{ __html: escapeHtml(err.snippet) }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="js-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>操作模式</h2>
        <div className="operation-switch">
          <button
            className={`operation-btn ${mode === 'format' ? 'active' : ''}`}
            onClick={() => setMode('format')}
          >
            格式化
          </button>
          <button
            className={`operation-btn ${mode === 'minify' ? 'active' : ''}`}
            onClick={() => setMode('minify')}
          >
            压缩
          </button>
        </div>

        {mode === 'format' && (
          <div className="options-panel">
            <div className="options-row">
              <div className="option-group">
                <label htmlFor="indent-size">缩进大小</label>
                <select
                  id="indent-size"
                  value={indentSize}
                  onChange={(e) => setIndentSize(Number(e.target.value))}
                >
                  <option value={2}>2 空格</option>
                  <option value={4}>4 空格</option>
                  <option value={8}>8 空格</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {mode === 'minify' && (
          <div className="options-panel">
            <div className="options-row">
              <div className="option-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={removeComments}
                    onChange={(e) => setRemoveComments(e.target.checked)}
                  />
                  移除注释
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="tool-section">
        <h2>输入 JavaScript</h2>
        {isLargeInput && (
          <div className="warning-hint">
            输入内容较大（约 {formatBytes(byteSize)}），建议使用小于 {formatBytes(MAX_SAFE_INPUT_SIZE)} 的内容，处理可能需要较长时间
          </div>
        )}
        <div className="form-group full-width">
          <label htmlFor="js-input">JavaScript 源码</label>
          <textarea
            id="js-input"
            className="js-textarea"
            value={inputJs}
            onChange={(e) => setInputJs(e.target.value)}
            placeholder={'粘贴或输入 JavaScript 代码...\n\n示例：\nconst a = 1; function test(){return a+1;}'}
            spellCheck={false}
          />
          <div className="input-meta">
            <span>字符数：<code>{inputSize.toLocaleString()}</code></span>
            <span>约 <code>{formatBytes(byteSize)}</code></span>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleProcess}
            disabled={loading || !canProcess}
          >
            {loading ? '处理中...' : (mode === 'format' ? '格式化代码' : '压缩代码')}
          </button>
          <button
            className="secondary-btn"
            onClick={handleSwap}
            disabled={!result?.success}
          >
            结果作为输入
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
          >
            清除
          </button>
        </div>

        {renderErrorBox(result)}
      </section>

      {result?.success && (
        <section className="tool-section">
          <div className="result-header-row">
            <h2>处理结果</h2>
            <div className="result-actions">
              <button
                className="copy-btn"
                onClick={() => handleCopy(result.output, 'JavaScript 结果')}
              >
                复制
              </button>
            </div>
          </div>

          <div className="result-meta-row">
            <span>原大小：<code>{formatBytes(result.originalSize)}</code></span>
            <span>处理后：<code>{formatBytes(result.outputSize)}</code></span>
            {mode === 'minify' && (
              <span>
                减少：
                <code className={result.originalSize > result.outputSize ? 'positive' : ''}>
                  {formatBytes(result.originalSize - result.outputSize)}
                </code>
              </span>
            )}
            {mode === 'minify' && (
              <span>
                压缩率：
                <code className={result.originalSize > result.outputSize ? 'positive' : ''}>
                  {result.originalSize > 0
                    ? ((result.originalSize - result.outputSize) / result.originalSize * 100).toFixed(1)
                    : 0}%
                </code>
              </span>
            )}
          </div>

          <pre
            className={`result-text ${mode === 'minify' ? 'minified' : ''}`}
            dangerouslySetInnerHTML={{ __html: escapeHtml(result.output) }}
          />
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有处理均在浏览器本地执行，不向任何后端服务器发送数据，支持离线使用。
          </li>
          <li>
            <strong>格式化功能：</strong>对 JavaScript 进行代码美化，支持 2、4、8 空格缩进。
          </li>
          <li>
            <strong>压缩功能：</strong>移除多余空白字符，可选移除注释，减小文件体积。
          </li>
          <li>
            <strong>输入大小：</strong>建议输入在 {formatBytes(MAX_SAFE_INPUT_SIZE)} 以内；过大输入可能导致页面卡顿。
          </li>
          <li>
            <strong>错误处理：</strong>对空输入、过大输入、参数错误等进行友好提示。
          </li>
        </ul>
      </div>
    </div>
  )
}
