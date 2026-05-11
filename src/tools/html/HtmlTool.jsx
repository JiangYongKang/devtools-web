import { useCallback, useState } from 'react'
import {
  MAX_SAFE_INPUT_SIZE,
  escapeHtml,
  formatBytes,
  beautifyHtml,
  minifyHtml,
} from './htmlUtils'
import './HtmlTool.css'

export default function HtmlTool() {
  const [inputHtml, setInputHtml] = useState('')
  const [outputHtml, setOutputHtml] = useState('')
  const [operation, setOperation] = useState('beautify')
  const [indentSize, setIndentSize] = useState(2)
  const [removeComments, setRemoveComments] = useState(true)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)
  const [stats, setStats] = useState(null)

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
    setError(null)
    setOutputHtml('')
    setStats(null)

    try {
      if (!inputHtml.trim()) {
        throw new Error('请输入要处理的 HTML 内容')
      }

      const inputSize = new Blob([inputHtml]).size
      if (inputSize > MAX_SAFE_INPUT_SIZE * 2) {
        throw new Error(`输入过大（${formatBytes(inputSize)}），建议使用小于 ${formatBytes(MAX_SAFE_INPUT_SIZE)} 的内容`)
      }

      let result
      if (operation === 'beautify') {
        const indent = ' '.repeat(indentSize)
        result = beautifyHtml(inputHtml, { indent })
      } else {
        result = minifyHtml(inputHtml, { removeComments, collapseWhitespace: true })
      }

      const outputSize = new Blob([result]).size
      const reduction = inputSize - outputSize
      const reductionPercent = inputSize > 0 ? (reduction / inputSize * 100) : 0

      setOutputHtml(result)
      setStats({
        inputSize,
        outputSize,
        reduction,
        reductionPercent,
      })
    } catch (err) {
      setError({ message: err?.message || '处理失败' })
    } finally {
      setLoading(false)
    }
  }, [inputHtml, operation, indentSize, removeComments])

  const handleClear = useCallback(() => {
    setInputHtml('')
    setOutputHtml('')
    setError(null)
    setStats(null)
  }, [])

  const handleSwap = useCallback(() => {
    if (outputHtml) {
      setInputHtml(outputHtml)
      setOutputHtml('')
      setStats(null)
    }
  }, [outputHtml])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  const inputSize = inputHtml.length
  const isLargeInput = inputSize > MAX_SAFE_INPUT_SIZE
  const canProcess = inputHtml.trim().length > 0

  return (
    <div className="html-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>操作模式</h2>
        <div className="operation-switch">
          <button
            className={`operation-btn ${operation === 'beautify' ? 'active' : ''}`}
            onClick={() => setOperation('beautify')}
          >
            美化（格式化）
          </button>
          <button
            className={`operation-btn ${operation === 'minify' ? 'active' : ''}`}
            onClick={() => setOperation('minify')}
          >
            压缩
          </button>
        </div>

        {operation === 'beautify' && (
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

        {operation === 'minify' && (
          <div className="options-panel">
            <div className="options-row">
              <div className="option-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={removeComments}
                    onChange={(e) => setRemoveComments(e.target.checked)}
                  />
                  移除 HTML 注释
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="tool-section">
        <h2>输入 HTML</h2>
        {isLargeInput && (
          <div className="warning-hint">
            输入内容较大（约 {formatBytes(inputSize)}），建议使用小于 {formatBytes(MAX_SAFE_INPUT_SIZE)} 的内容，处理可能需要较长时间
          </div>
        )}
        <div className="form-group full-width">
          <label htmlFor="html-input">HTML 源码</label>
          <textarea
            id="html-input"
            className="html-textarea"
            value={inputHtml}
            onChange={(e) => setInputHtml(e.target.value)}
            placeholder="粘贴或输入 HTML 源码...&#10;&#10;示例：&#10;&lt;div&gt;&lt;h1&gt;Hello&lt;/h1&gt;&lt;p&gt;World&lt;/p&gt;&lt;/div&gt;"
            spellCheck={false}
          />
          <div className="input-meta">
            <span dangerouslySetInnerHTML={{
              __html: `字符数：<code>${inputSize.toLocaleString()}</code>`,
            }} />
            <span dangerouslySetInnerHTML={{
              __html: `约 <code>${formatBytes(inputSize)}</code>`,
            }} />
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleProcess}
            disabled={loading || !canProcess}
          >
            {loading ? '处理中...' : (operation === 'beautify' ? '美化 HTML' : '压缩 HTML')}
          </button>
          <button
            className="secondary-btn"
            onClick={handleSwap}
            disabled={!outputHtml}
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

        {renderErrorBox(error)}
      </section>

      {outputHtml && (
        <section className="tool-section">
          <div className="result-header-row">
            <h2>处理结果</h2>
            <div className="result-actions">
              <button
                className="copy-btn"
                onClick={() => handleCopy(outputHtml, 'HTML 结果')}
              >
                复制
              </button>
            </div>
          </div>

          {stats && (
            <div className="result-meta-row">
              <span dangerouslySetInnerHTML={{
                __html: `原大小：<code>${formatBytes(stats.inputSize)}</code>`,
              }} />
              <span dangerouslySetInnerHTML={{
                __html: `处理后：<code>${formatBytes(stats.outputSize)}</code>`,
              }} />
              {operation === 'minify' && (
                <span dangerouslySetInnerHTML={{
                  __html: `减少：<code class="${stats.reduction > 0 ? 'positive' : ''}">${formatBytes(stats.reduction)}</code>`,
                }} />
              )}
              {operation === 'minify' && (
                <span dangerouslySetInnerHTML={{
                  __html: `压缩率：<code class="${stats.reduction > 0 ? 'positive' : ''}">${stats.reductionPercent.toFixed(1)}%</code>`,
                }} />
              )}
            </div>
          )}

          <pre
            className={`result-text ${operation === 'minify' ? 'minified' : ''}`}
            dangerouslySetInnerHTML={{ __html: escapeHtml(outputHtml) }}
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
            <strong>美化功能：</strong>对 HTML 进行缩进排版，区分块级与行内元素，保持 script/style/pre 内容格式。
          </li>
          <li>
            <strong>压缩功能：</strong>移除多余空白，可选移除 HTML 注释；pre、textarea 标签内内容保持原始空白。
          </li>
          <li>
            <strong>XSS 边界：</strong>本工具<strong>不进行</strong>XSS 消毒处理，仅做格式转换；展示时使用转义确保页面安全。
          </li>
          <li>
            <strong>输入大小：</strong>建议输入在 {formatBytes(MAX_SAFE_INPUT_SIZE)} 以内；过大输入可能导致页面卡顿。
          </li>
          <li>
            <strong>容错策略：</strong>对非标准 HTML 尽量容错，不验证语法正确性；极端错误的 HTML 可能无法得到预期结果。
          </li>
        </ul>
      </div>
    </div>
  )
}
