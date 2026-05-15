import React, { useState } from 'react'
import { escapeHtml } from './logic'
import './TemplatedNotificationPreview.css'

const TAB_PLAIN_TEXT = 'plain'
const TAB_HTML = 'html'
const TAB_EMAIL = 'email'

export function PreviewPanel({ output, error }) {
  const [activeTab, setActiveTab] = useState(TAB_PLAIN_TEXT)
  const htmlOutput = escapeHtml(output).replace(/\n/g, '<br/>')

  return (
    <div className="preview-panel">
      <div className="panel-header">
        <h3>预览输出</h3>
      </div>

      {error && (
        <div className="error-panel">
          <div className="error-header">
            <span className="error-icon">❌</span>
            模板解析错误
          </div>
          <div className="error-details">
            <div className="error-location">
              位置: 第 {error.line} 行, 第 {error.column} 列
            </div>
            <div className="error-message">{error.message}</div>
            {error.source && (
              <div className="error-source">
                相关内容: <code>{error.source}</code>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="preview-tabs">
        <button
          className={`preview-tab ${activeTab === TAB_PLAIN_TEXT ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_PLAIN_TEXT)}
        >
          纯文本
        </button>
        <button
          className={`preview-tab ${activeTab === TAB_HTML ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_HTML)}
        >
          HTML 转义
        </button>
        <button
          className={`preview-tab ${activeTab === TAB_EMAIL ? 'active' : ''}`}
          onClick={() => setActiveTab(TAB_EMAIL)}
        >
          邮件预览
        </button>
      </div>

      <div className="preview-content">
        {activeTab === TAB_PLAIN_TEXT && (
          <div className="preview-section plain-text">
            <pre>{output}</pre>
          </div>
        )}

        {activeTab === TAB_HTML && (
          <div className="preview-section html-view">
            <div className="html-content" dangerouslySetInnerHTML={{ __html: htmlOutput }} />
          </div>
        )}

        {activeTab === TAB_EMAIL && (
          <div className="preview-section email-view">
            <div className="email-header">
              <div className="email-field">
                <span className="email-label">发件人:</span>
                <span className="email-value">系统通知 &lt;no-reply@example.com&gt;</span>
              </div>
              <div className="email-field">
                <span className="email-label">收件人:</span>
                <span className="email-value">user@example.com</span>
              </div>
              <div className="email-field">
                <span className="email-label">主题:</span>
                <span className="email-value">您的通知</span>
              </div>
            </div>
            <div className="email-body" dangerouslySetInnerHTML={{ __html: htmlOutput }} />
          </div>
        )}
      </div>
    </div>
  )
}
