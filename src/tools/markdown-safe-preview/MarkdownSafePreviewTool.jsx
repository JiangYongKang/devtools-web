import { useCallback, useEffect, useRef, useState } from 'react'
import {
  processMarkdown,
  MAX_SOURCE_LENGTH,
  getSecurityPolicyInfo,
} from './logic/index.js'
import './MarkdownSafePreviewTool.css'

export default function MarkdownSafePreviewTool() {
  const [markdownSource, setMarkdownSource] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [securityInfo] = useState(() => getSecurityPolicyInfo())
  const textareaRef = useRef(null)

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(textarea.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [markdownSource, adjustTextareaHeight])

  useEffect(() => {
    if (!markdownSource) {
      setResult(null)
      setError(null)
      return
    }

    const timer = setTimeout(() => {
      const processed = processMarkdown(markdownSource)

      if (processed.success) {
        setResult(processed)
        setError(null)
      } else {
        setResult(processed)
        setError({
          code: processed.errorCode,
          message: processed.errorMessage,
        })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [markdownSource])

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
    setMarkdownSource('')
    setResult(null)
    setError(null)
  }, [])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <p>{err.message}</p>
      </div>
    )
  }

  const sourceLength = markdownSource.length
  const isNearLimit = sourceLength > MAX_SOURCE_LENGTH * 0.8
  const isOverLimit = sourceLength > MAX_SOURCE_LENGTH

  const hasSanitizationNotes = result?.sanitizationNotes?.length > 0

  return (
    <div className="markdown-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>Markdown 编辑器与预览</h2>

        <div className="editor-preview-container">
          <div className="editor-panel">
            <div className="panel-header">
              <h3>输入 Markdown</h3>
              <div className="input-meta">
                <span>
                  字符数：<code>{sourceLength.toLocaleString()}</code>
                  <code className={isOverLimit ? 'danger' : isNearLimit ? 'warning' : ''}>
                    / {MAX_SOURCE_LENGTH.toLocaleString()}
                  </code>
                </span>
              </div>
            </div>

            {isNearLimit && !isOverLimit && (
              <div className="warning-hint">
                输入内容接近最大限制（{MAX_SOURCE_LENGTH.toLocaleString()} 字符），过大内容可能导致性能问题。
              </div>
            )}

            {isOverLimit && (
              <div className="warning-hint">
                输入内容超过最大限制（{MAX_SOURCE_LENGTH.toLocaleString()} 字符），已禁用预览。
              </div>
            )}

            <textarea
              ref={textareaRef}
              className="markdown-textarea"
              value={markdownSource}
              onChange={(e) => setMarkdownSource(e.target.value)}
              placeholder="# Markdown 预览\n\n这是一个安全的 Markdown 预览工具。\n\n## 支持的语法\n\n- **粗体文本** 和 *斜体文本*\n- ~~删除线~~ 和 `行内代码`\n- 有序和无序列表\n- 代码块、引用等\n\n## 安全策略\n\n所有渲染内容都会经过安全净化处理：\n- 移除 script、style、iframe 标签\n- 过滤内联事件处理器\n- 仅允许 http:、https:、mailto:、tel: 协议\n\n> 实时预览功能仅在浏览器本地执行。"
              spellCheck={false}
            />
          </div>

          <div className="preview-panel">
            <div className="panel-header">
              <h3>渲染预览</h3>
              {result && !error && (
                <div className="input-meta">
                  <span>
                    输出长度：<code>{result.renderedLength.toLocaleString()}</code>
                  </span>
                </div>
              )}
            </div>

            {renderErrorBox(error)}

            {!error && !result && (
              <div className="preview-content preview-empty">
                在左侧输入 Markdown 文本以查看预览
              </div>
            )}

            {!error && result?.previewHtml && (
              <div
                className="preview-content"
                dangerouslySetInnerHTML={{ __html: result.previewHtml }}
              />
            )}
          </div>
        </div>

        <div className="action-row" style={{ marginTop: '1rem' }}>
          <button
            className="secondary-btn"
            onClick={() => handleCopy(markdownSource, 'Markdown 源码')}
            disabled={!markdownSource}
          >
            复制源码
          </button>
          <button
            className="secondary-btn"
            onClick={() => handleCopy(result?.previewHtml || '', 'HTML 结果')}
            disabled={!result?.previewHtml}
          >
            复制 HTML
          </button>
          <button className="secondary-btn" onClick={handleClear}>
            清除
          </button>
        </div>
      </section>

      {hasSanitizationNotes && (
        <section className="tool-section">
          <h2>安全净化说明</h2>
          <div className="warning-hint">
            <strong>注意：</strong>以下内容已被自动移除以确保渲染安全。
          </div>
          <div className="sanitization-notes" style={{ marginTop: '0.75rem' }}>
            {result.sanitizationNotes.map((note, index) => (
              <div key={index} className="sanitization-note">
                <code style={{ marginRight: '0.5rem' }}>{note.key}</code>
                {note.message}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="tool-section">
        <div className="security-info-panel">
          <h3>安全策略信息</h3>
          <p>
            策略版本：<code>{securityInfo.securityPolicyVersion}</code>
          </p>
          <p>
            最大输入长度：<code>{securityInfo.maxSourceLength.toLocaleString()} 字符</code>
          </p>
          <p>允许的协议：</p>
          <div className="protocol-list">
            {securityInfo.allowedProtocols.map((protocol) => (
              <span key={protocol} className="protocol-tag">
                {protocol}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有处理均在浏览器本地执行，不向任何后端服务器发送数据，支持离线使用。
          </li>
          <li>
            <strong>实时预览：</strong>输入 Markdown 后自动渲染，无需手动触发。
          </li>
          <li>
            <strong>安全渲染：</strong>
            <ul>
              <li>严格过滤 script、style、iframe 等危险标签</li>
              <li>移除内联事件处理器（onclick、onload 等）</li>
              <li>禁用 javascript:、data: 等危险协议</li>
              <li>过滤内联样式属性</li>
            </ul>
          </li>
          <li>
            <strong>净化反馈：</strong>当输入内容包含危险元素时，会在页面下方显示净化说明。
          </li>
          <li>
            <strong>安全降级：</strong>错误时保留安全策略信息，不执行不安全渲染。
          </li>
        </ul>
      </div>
    </div>
  )
}
