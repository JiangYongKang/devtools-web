import { useCallback, useMemo, useState } from 'react'
import './SafeRichTextDemo.css'
import {
  sanitizeRichText,
  escapeHtmlForDisplay,
  approximateByteLength,
  OWASP_SAMPLES,
  SANITIZATION_MODES,
  UNKNOWN_TAG_POLICIES,
  DEFAULT_WHITELIST,
  TAGS_TO_ALWAYS_REMOVE,
  MAX_DATA_URL_LENGTH,
  ALLOWED_DATA_URL_MIME_TYPES,
} from './logic/index.js'

const EXAMPLE_SAFE_HTML = `
<div>
  <h2>安全富文本示例</h2>
  <p>这是一段<strong>粗体</strong>和<em>斜体</em>的文本。</p>
  <p>点击<a href="https://example.com" target="_blank">这个链接</a>查看外部网站。</p>
  <ul>
    <li>列表项 1</li>
    <li>列表项 2</li>
    <li>列表项 3</li>
  </ul>
  <table>
    <tr>
      <th>名称</th>
      <th>值</th>
    </tr>
    <tr>
      <td>测试</td>
      <td>123</td>
    </tr>
  </table>
</div>
`.trim()

const DIFFERENCE_NOTE = `
差异说明：
1. clipboard-bridge: 主要用于剪贴板操作，sanitize 是辅助功能，支持 style 属性
2. safe-rich-text: 专注于富文本安全展示，禁用 style 属性，支持白名单子集模式和 plain text 模式
3. markdown-safe-preview: 结合 Markdown 解析与预览，渲染后内容安全展示
`.trim()

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getSampleName(key) {
  const names = {
    basicXss: '基础 <script>',
    svgOnload: 'SVG onload',
    javascriptProtocol: 'javascript: 协议',
    dataTextHtml: 'data:text/html',
    eventHandler: '事件处理 (onerror)',
    styleAttribute: 'style 属性注入',
    mixedCase: '大小写混淆',
    hexEncoded: '十六进制编码',
  }
  return names[key] || key
}

function renderDiagnosticList(items, type) {
  if (!items || items.length === 0) {
    return <p className="empty-diagnostic">无</p>
  }

  return (
    <ul className="diagnostic-list">
      {items.map((item, index) => {
        if (type === 'tags') {
          return (
            <li key={index}>
              <code>&lt;{item.tag}&gt;</code> - {item.reason}
            </li>
          )
        }
        if (type === 'attrs') {
          return (
            <li key={index}>
              <code>{item.tag}</code>: <code>{item.attribute}</code> - {item.reason}
            </li>
          )
        }
        if (type === 'errors') {
          return (
            <li key={index}>
              <code>{item.errorCode}</code> - {item.errorMessage}
            </li>
          )
        }
        return null
      })}
    </ul>
  )
}

export default function SafeRichTextDemo() {
  const [htmlInput, setHtmlInput] = useState(EXAMPLE_SAFE_HTML)
  const [sanitizationMode, setSanitizationMode] = useState(SANITIZATION_MODES.WHITELIST)
  const [unknownTagPolicy, setUnknownTagPolicy] = useState(UNKNOWN_TAG_POLICIES.REMOVE)
  const [renderView, setRenderView] = useState('rendered')
  const [showDifferenceNote, setShowDifferenceNote] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const byteLength = useMemo(() => approximateByteLength(htmlInput), [htmlInput])

  const sanitizationResult = useMemo(() => {
    return sanitizeRichText(htmlInput, {
      mode: sanitizationMode,
      unknownTagPolicy,
    })
  }, [htmlInput, sanitizationMode, unknownTagPolicy])

  const handleLoadSample = useCallback((sampleKey) => {
    setHtmlInput(OWASP_SAMPLES[sampleKey])
  }, [])

  const handleLoadSafeExample = useCallback(() => {
    setHtmlInput(EXAMPLE_SAFE_HTML)
  }, [])

  const handleCopySafeHtml = useCallback(async () => {
    if (!sanitizationResult || !sanitizationResult.safeHtml) return
    let success = false
    
    try {
      await navigator.clipboard.writeText(sanitizationResult.safeHtml)
      success = true
    } catch (error) {
      void error
      const textarea = document.createElement('textarea')
      textarea.value = sanitizationResult.safeHtml
      document.body.appendChild(textarea)
      textarea.select()
      try {
        success = document.execCommand('copy')
      } catch (innerError) {
        void innerError
      }
      document.body.removeChild(textarea)
    }
    
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }, [sanitizationResult])

  const handleReset = useCallback(() => {
    setHtmlInput('')
  }, [])

  return (
    <div className="safe-rich-text">
      <div className="csp-notice">
        <strong>安全提示：</strong> 本组件不生成 CSP nonce，应由宿主页面注入。建议 CSP 策略包含：
        <code>default-src 'self'</code>, <code>img-src 'self' data:</code>, <code>script-src 'self'</code>
      </div>

      <button
        className="action-btn"
        onClick={() => setShowDifferenceNote(!showDifferenceNote)}
        style={{ marginBottom: '16px' }}
      >
        {showDifferenceNote ? '隐藏' : '显示'} 与 017/055 任务的差异
      </button>

      {showDifferenceNote && (
        <div className="mode-info difference-note">
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{DIFFERENCE_NOTE}</pre>
        </div>
      )}

      <section className="mode-controls">
        <h3>消毒模式</h3>
        <div className="mode-buttons">
          <button
            className={`mode-btn ${sanitizationMode === SANITIZATION_MODES.WHITELIST ? 'active' : ''}`}
            onClick={() => setSanitizationMode(SANITIZATION_MODES.WHITELIST)}
          >
            白名单子集模式
          </button>
          <button
            className={`mode-btn ${sanitizationMode === SANITIZATION_MODES.PLAIN_TEXT ? 'active' : ''}`}
            onClick={() => setSanitizationMode(SANITIZATION_MODES.PLAIN_TEXT)}
          >
            纯文本转义模式
          </button>
        </div>

        {sanitizationMode === SANITIZATION_MODES.WHITELIST && (
          <div className="config-section">
            <div className="config-item">
              <label htmlFor="unknown-tag-policy">未知标签策略：</label>
              <select
                id="unknown-tag-policy"
                value={unknownTagPolicy}
                onChange={(e) => setUnknownTagPolicy(e.target.value)}
              >
                <option value={UNKNOWN_TAG_POLICIES.REMOVE}>剔除整节点</option>
                <option value={UNKNOWN_TAG_POLICIES.UNWRAP}>仅 unwrap 子文本</option>
              </select>
            </div>
          </div>
        )}
      </section>

      <section className="owasp-samples">
        <h3>OWASP 常见 XSS 向量（演示用）</h3>
        <div className="sample-buttons">
          {Object.keys(OWASP_SAMPLES).map((key) => (
            <button
              key={key}
              className="sample-btn"
              onClick={() => handleLoadSample(key)}
            >
              {getSampleName(key)}
            </button>
          ))}
          <button className="action-btn" onClick={handleLoadSafeExample}>
            安全示例
          </button>
        </div>
      </section>

      <div className="main-content">
        <section className="panel">
          <div className="panel-header">
            <h3>原始 HTML 输入</h3>
            <span className="meta">{htmlInput.length} 字符</span>
          </div>
          <div className="panel-body">
            <textarea
              className="html-input"
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              placeholder="输入 HTML 内容..."
              rows={12}
            />
            <div className="input-meta">
              <span>字节大小: {formatBytes(byteLength)}</span>
            </div>
            <div className="action-buttons">
              <button className="action-btn" onClick={handleReset}>
                清空
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>安全渲染结果</h3>
            <span className="meta">
              模式: {sanitizationMode === SANITIZATION_MODES.WHITELIST ? '白名单' : '纯文本'}
              {sanitizationResult?.mode && ` | 解析器: ${sanitizationResult.mode}`}
            </span>
          </div>
          <div className="panel-body">
            {sanitizationMode === SANITIZATION_MODES.PLAIN_TEXT && (
              <div className="plain-text-notice">
                ⚠️ 已降级为纯文本模式，所有 HTML 标签将被转义
              </div>
            )}

            <div className="render-view-tabs">
              <button
                className={`tab-btn ${renderView === 'rendered' ? 'active' : ''}`}
                onClick={() => setRenderView('rendered')}
              >
                渲染结果
              </button>
              <button
                className={`tab-btn ${renderView === 'raw' ? 'active' : ''}`}
                onClick={() => setRenderView('raw')}
              >
                安全 HTML 源码
              </button>
              <button
                className={`tab-btn ${renderView === 'escaped' ? 'active' : ''}`}
                onClick={() => setRenderView('escaped')}
              >
                转义展示
              </button>
            </div>

            {renderView === 'rendered' && sanitizationResult && (
              <div
                className="rendered-content"
                dangerouslySetInnerHTML={{ __html: sanitizationResult.safeHtml }}
              />
            )}

            {renderView === 'raw' && sanitizationResult && (
              <pre className="raw-content">{sanitizationResult.safeHtml}</pre>
            )}

            {renderView === 'escaped' && sanitizationResult && (
              <pre className="raw-content">
                {escapeHtmlForDisplay(sanitizationResult.safeHtml)}
              </pre>
            )}

            <div className="action-buttons">
              <button
                className={`action-btn ${copySuccess ? 'success' : ''}`}
                onClick={handleCopySafeHtml}
                disabled={copySuccess}
              >
                {copySuccess ? '✓ 已复制到剪贴板' : '复制安全 HTML'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {sanitizationResult && (
        <section className="diagnostics-section">
          <h3>消毒诊断</h3>
          <div className="diagnostics-grid">
            <div className="diagnostic-card stripped-tags">
              <h4>
                剥离的标签
                <span className="count-badge">
                  {sanitizationResult.strippedTags?.length || 0}
                </span>
              </h4>
              {renderDiagnosticList(sanitizationResult.strippedTags, 'tags')}
            </div>

            <div className="diagnostic-card stripped-attrs">
              <h4>
                剥离的属性
                <span className="count-badge">
                  {sanitizationResult.strippedAttrs?.length || 0}
                </span>
              </h4>
              {renderDiagnosticList(sanitizationResult.strippedAttrs, 'attrs')}
            </div>

            <div className="diagnostic-card errors">
              <h4>
                错误
                <span className="count-badge">
                  {sanitizationResult.errors?.length || 0}
                </span>
              </h4>
              {renderDiagnosticList(sanitizationResult.errors, 'errors')}
            </div>
          </div>
        </section>
      )}

      <section className="mode-info">
        <strong>配置说明：</strong>
        <br />
        • 默认白名单标签数: {DEFAULT_WHITELIST.tags.length}
        <br />
        • 始终移除的标签: {TAGS_TO_ALWAYS_REMOVE.join(', ')}
        <br />
        • 允许的协议: http, https, mailto
        <br />
        • 允许的 data URL: {ALLOWED_DATA_URL_MIME_TYPES.join(', ')} (最大 {formatBytes(MAX_DATA_URL_LENGTH)})
        <br />
        • 禁用: style 属性、on* 事件属性、javascript: 协议
      </section>
    </div>
  )
}
