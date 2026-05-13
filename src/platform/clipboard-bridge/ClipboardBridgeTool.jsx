import { useCallback, useEffect, useRef, useState } from 'react'
import './ClipboardBridgeTool.css'
import {
    approximateByteLength,
    createClipboardBridge,
    createUserGestureToken,
    ERROR_CODES,
    escapeHtmlForDisplay,
    getFeatureMatrix
} from './logic/index.js'

const EXAMPLES = {
  tableTsv: `序号\t名称\t价格\t状态
1\t产品A\t¥99.00\t在售
2\t产品B\t¥199.00\t缺货
3\t产品C\t¥299.00\t在售
4\t产品D\t¥399.00\t限量`,

  logWithTabs: `[2024-01-15 10:30:01] [INFO] User login: user_12345
[2024-01-15 10:30:02] [DEBUG] Request:\tGET /api/users/12345
[2024-01-15 10:30:02] [DEBUG] Headers:\t
\tX-Request-ID:\tabc123
\tAuthorization:\tBearer ****
[2024-01-15 10:30:03] [INFO] Response:\t200 OK (42ms)
[2024-01-15 10:30:05] [WARN] Cache miss for key:\tcache_12345
[2024-01-15 10:30:06] [ERROR] Failed to fetch:\tconnection refused (retries: 3/3)
[2024-01-15 10:30:07] [INFO] Session terminated\tuser_12345`,

  richText: `<div style="background-color: #f0f7ff; padding: 16px; border-radius: 8px;">
  <h2 style="color: #2563eb; margin: 0 0 12px 0;">富文本示例</h2>
  <p style="margin: 8px 0; line-height: 1.6;">
    这是一段<strong>粗体</strong>和<em>斜体</em>的文本。
    点击<a href="https://example.com">这个链接</a>查看更多。
  </p>
  <ul style="margin: 8px 0; padding-left: 20px;">
    <li>列表项 1</li>
    <li>列表项 2</li>
    <li>列表项 3</li>
  </ul>
</div>`,
}

const MOCK_MODES = {
  NORMAL: 'normal',
  PERMISSION_DENIED: 'permission_denied',
  NO_CLIPBOARD_API: 'no_clipboard_api',
  INSECURE_CONTEXT: 'insecure_context',
}

function createMockClipboard(mode) {
  const originalClipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null

  switch (mode) {
    case MOCK_MODES.PERMISSION_DENIED:
      return {
        readText: () => Promise.reject({ name: 'NotAllowedError', message: 'Write permission denied' }),
        writeText: () => Promise.reject({ name: 'NotAllowedError', message: 'Write permission denied' }),
        read: () => Promise.reject({ name: 'NotAllowedError', message: 'Write permission denied' }),
        write: () => Promise.reject({ name: 'NotAllowedError', message: 'Write permission denied' }),
      }

    case MOCK_MODES.NO_CLIPBOARD_API:
      return null

    case MOCK_MODES.INSECURE_CONTEXT:
      return {
        readText: () => Promise.reject({ name: 'SecurityError', message: 'Clipboard API requires a secure context' }),
        writeText: () => Promise.reject({ name: 'SecurityError', message: 'Clipboard API requires a secure context' }),
        read: () => Promise.reject({ name: 'SecurityError', message: 'Clipboard API requires a secure context' }),
        write: () => Promise.reject({ name: 'SecurityError', message: 'Clipboard API requires a secure context' }),
      }

    default:
      return originalClipboard
  }
}

function createMockNavigator(mode) {
  const mockClipboard = createMockClipboard(mode)
  const isSecure = mode !== MOCK_MODES.INSECURE_CONTEXT
  return {
    navigator: mockClipboard ? { clipboard: mockClipboard } : { clipboard: undefined },
    navigatorObj: mockClipboard ? { clipboard: mockClipboard } : { clipboard: undefined },
    env: {
      navigator: mockClipboard ? { clipboard: mockClipboard } : { clipboard: undefined },
      isSecureContext: isSecure,
    },
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function featureToEmoji(feature) {
  if (feature === true) return '✅'
  if (feature === false) return '❌'
  if (feature === null || feature === undefined) return '❓'
  return feature
}

export default function ClipboardBridgeTool() {
  const [activeTab, setActiveTab] = useState('write')
  const [textInput, setTextInput] = useState('Hello, Clipboard Bridge!')
  const [htmlInput, setHtmlInput] = useState(EXAMPLES.richText)
  const [mockMode, setMockMode] = useState(MOCK_MODES.NORMAL)
  const [operationResult, setOperationResult] = useState(null)
  const [capabilityMatrix, setCapabilityMatrix] = useState(null)
  const [readContent, setReadContent] = useState(null)
  const [readViewMode, setReadViewMode] = useState('text')
  const [showManualCopy, setShowManualCopy] = useState(false)
  const [pendingCopyText, setPendingCopyText] = useState('')
  const [writeHistory, setWriteHistory] = useState([])

  const bridgeRef = useRef(null)

  useEffect(() => {
    const mock = createMockNavigator(mockMode)
    bridgeRef.current = createClipboardBridge({
      navigatorObj: mock.navigatorObj,
      allowFallback: true,
    })

    try {
      const matrix = getFeatureMatrix({ env: mock.env, forceRefresh: true })
      setCapabilityMatrix(matrix)
    } catch {
      setCapabilityMatrix(null)
    }
  }, [mockMode])

  const addToHistory = useCallback((type, content, result) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      contentPreview: content.length > 100 ? content.substring(0, 100) + '...' : content,
      contentLength: content.length,
      byteLength: approximateByteLength(content),
      success: result.success,
      method: result.method || 'unknown',
      errorCode: result.error?.errorCode || null,
    }
    setWriteHistory((prev) => [entry, ...prev].slice(0, 10))
  }, [])

  const handleWriteText = useCallback(async () => {
    if (!textInput.trim()) return

    const bridge = bridgeRef.current
    const userGestureToken = createUserGestureToken()

    const result = await bridge.writeText(textInput, {
      userGestureToken,
      useFallback: false,
    })

    if (!result.success && result.error) {
      const shouldShowManual = [
        ERROR_CODES.NOT_ALLOWED,
        ERROR_CODES.SECURITY_ERROR,
        ERROR_CODES.API_NOT_AVAILABLE,
      ].includes(result.error.errorCode)

      if (shouldShowManual) {
        setPendingCopyText(textInput)
        setShowManualCopy(true)
      }
    }

    setOperationResult(result)
    addToHistory('text', textInput, result)
  }, [textInput, addToHistory])

  const handleWriteRichText = useCallback(async () => {
    if (!htmlInput.trim()) return

    const bridge = bridgeRef.current
    const userGestureToken = createUserGestureToken()

    const result = await bridge.writeRichText({
      html: htmlInput,
    }, {
      userGestureToken,
      useFallback: false,
    })

    if (!result.success && result.error) {
      const shouldShowManual = [
        ERROR_CODES.NOT_ALLOWED,
        ERROR_CODES.SECURITY_ERROR,
        ERROR_CODES.API_NOT_AVAILABLE,
      ].includes(result.error.errorCode)

      if (shouldShowManual && result.fallbackText) {
        setPendingCopyText(result.fallbackText)
        setShowManualCopy(true)
      }
    }

    setOperationResult(result)
    addToHistory('rich_text', htmlInput, result)
  }, [htmlInput, addToHistory])

  const handleReadClipboard = useCallback(async () => {
    const bridge = bridgeRef.current
    const userGestureToken = createUserGestureToken()

    const result = await bridge.readClipboard({
      userGestureToken,
    })

    setReadContent(result)
    setOperationResult(result)
    setReadViewMode('text')
  }, [])

  const handleLoadExample = useCallback((exampleType) => {
    setOperationResult(null)
    switch (exampleType) {
      case 'table-tsv':
        setTextInput(EXAMPLES.tableTsv)
        break
      case 'log-content':
        setTextInput(EXAMPLES.logWithTabs)
        break
      case 'rich-text':
        setHtmlInput(EXAMPLES.richText)
        break
      default:
        break
    }
  }, [])

  const handleRefreshCapabilities = useCallback(() => {
    const mock = createMockNavigator(mockMode)
    try {
      const matrix = getFeatureMatrix({ env: mock.env, forceRefresh: true })
      setCapabilityMatrix(matrix)
    } catch {
      setCapabilityMatrix(null)
    }
  }, [mockMode])

  const manualCopyRef = useRef(null)
  const handleManualCopy = useCallback(() => {
    if (manualCopyRef.current) {
      manualCopyRef.current.select()
      try {
        document.execCommand('copy')
      } catch {
      }
    }
  }, [])

  const renderResult = (result) => {
    if (!result) return null

    if (result.success) {
      return (
        <div className="result success">
          <div className="result-icon">✅</div>
          <div className="result-content">
            <h4>操作成功</h4>
            <p>方法: {result.method || 'clipboard API'}</p>
            {result.items && result.items.length > 0 && (
              <div>
                <p>读取到 {result.items.length} 个项目</p>
                <ul className="items-list">
                  {result.items.map((item, idx) => (
                    <li key={idx}>
                      类型: {item.type}
                      {item.byteLength && ` (${formatBytes(item.byteLength)})`}
                      {item.isImage && ` [图片]`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )
    }

    const err = result.error
    return (
      <div className="result error">
        <div className="result-icon">❌</div>
        <div className="result-content">
          <h4>操作失败</h4>
          <p className="error-code">错误码: {err?.errorCode}</p>
          <p className="error-message">{err?.userMessage || err?.errorMessage}</p>
          {err?.recoverable && (
            <p className="error-hint">提示: {err?.recoveryHint}</p>
          )}
        </div>
      </div>
    )
  }

  const renderReadContent = (content) => {
    if (!content || !content.success) return null

    const textItem = content.items?.find((i) => i.type === 'text/plain')
    const htmlItem = content.items?.find((i) => i.type === 'text/html')
    const imageItem = content.items?.find((i) => i.isImage)

    return (
      <div className="read-content">
        <div className="read-tabs">
          {textItem && (
            <button
              className={`tab-btn ${readViewMode === 'text' ? 'active' : ''}`}
              onClick={() => setReadViewMode('text')}
            >
              仅文本
            </button>
          )}
          {htmlItem && (
            <button
              className={`tab-btn ${readViewMode === 'html' ? 'active' : ''}`}
              onClick={() => setReadViewMode('html')}
            >
              原始 HTML (开发者预览)
            </button>
          )}
        </div>

        {readViewMode === 'text' && textItem && (
          <pre className="content-display text-content">{textItem.content || ''}</pre>
        )}

        {readViewMode === 'html' && htmlItem && (
          <pre className="content-display html-content">
            {escapeHtmlForDisplay(htmlItem.content || '')}
          </pre>
        )}

        {imageItem && (
          <div className="image-preview">
            <div className="image-info">
              <p>📸 检测到图片</p>
              <p>类型: {imageItem.type}</p>
              <p>大小: {formatBytes(imageItem.byteLength || 0)}</p>
              <p>建议文件名: {imageItem.suggestedFilename || 'clipboard-image.png'}</p>
              <p className="note">（Blob 已就绪，页面仅展示信息，不执行上传）</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderCapabilityMatrix = () => {
    if (!capabilityMatrix) return null

    const matrix = capabilityMatrix

    return (
      <div className="capability-matrix">
        <h3>浏览器能力矩阵</h3>
        <div className="matrix-grid">
          <div className="matrix-row">
            <span className="matrix-label">安全上下文</span>
            <span className="matrix-value">{featureToEmoji(matrix.isSecureContext)}</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">Clipboard API</span>
            <span className="matrix-value">{featureToEmoji(matrix.hasClipboardApi)}</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">readText</span>
            <span className="matrix-value">{featureToEmoji(matrix.supportsReadText)}</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">writeText</span>
            <span className="matrix-value">{featureToEmoji(matrix.supportsWriteText)}</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">ClipboardItem</span>
            <span className="matrix-value">{featureToEmoji(matrix.supportsClipboardItem)}</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">read (items)</span>
            <span className="matrix-value">{featureToEmoji(matrix.supportsRead)}</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">write (items)</span>
            <span className="matrix-value">{featureToEmoji(matrix.supportsWrite)}</span>
          </div>
          <div className="matrix-row">
            <span className="matrix-label">execCommand 降级</span>
            <span className="matrix-value">{featureToEmoji(matrix.supportsExecCommand)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="clipboard-bridge">
      <header className="tool-header">
        <h1>Clipboard Bridge 演示</h1>
        <p className="subtitle">
          封装现代剪贴板 API 与降级链，支持富文本、权限模型、手势约束
        </p>
      </header>

      <section className="mock-controls">
        <h3>替身环境 (用于测试)</h3>
        <div className="mock-mode-selector">
          {Object.entries(MOCK_MODES).map(([key, value]) => (
            <label key={value} className={`mode-label ${mockMode === value ? 'active' : ''}`}>
              <input
                type="radio"
                name="mockMode"
                value={value}
                checked={mockMode === value}
                onChange={(e) => setMockMode(e.target.value)}
              />
              <span className="mode-text">
                {value === MOCK_MODES.NORMAL && '正常环境'}
                {value === MOCK_MODES.PERMISSION_DENIED && '权限拒绝'}
                {value === MOCK_MODES.NO_CLIPBOARD_API && '无 API'}
                {value === MOCK_MODES.INSECURE_CONTEXT && '非安全上下文'}
              </span>
            </label>
          ))}
        </div>
      </section>

      <nav className="main-tabs">
        <button
          className={`tab-btn ${activeTab === 'write' ? 'active' : ''}`}
          onClick={() => setActiveTab('write')}
        >
          写入
        </button>
        <button
          className={`tab-btn ${activeTab === 'read' ? 'active' : ''}`}
          onClick={() => setActiveTab('read')}
        >
          读取
        </button>
        <button
          className={`tab-btn ${activeTab === 'capabilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('capabilities')}
        >
          能力矩阵
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          写入历史
        </button>
      </nav>

      {activeTab === 'write' && (
        <section className="tab-panel">
          <div className="examples">
            <h4>快速示例</h4>
            <div className="example-buttons">
              <button onClick={() => handleLoadExample('table-tsv')}>
                📊 TSV 表格
              </button>
              <button onClick={() => handleLoadExample('log-content')}>
                📝 大段日志 (含制表符和换行)
              </button>
              <button onClick={() => handleLoadExample('rich-text')}>
                🌈 富文本 HTML
              </button>
            </div>
          </div>

          <div className="input-section">
            <h4>文本写入</h4>
            <textarea
              className="text-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="输入要写入剪贴板的文本..."
              rows={8}
            />
            <div className="input-meta">
              <span>长度: {textInput.length} 字符</span>
              <span>估算字节: {formatBytes(approximateByteLength(textInput))}</span>
            </div>
            <button className="action-btn primary" onClick={handleWriteText}>
              写入剪贴板 (文本)
            </button>
          </div>

          <div className="input-section">
            <h4>富文本写入 (text/html + text/plain)</h4>
            <textarea
              className="text-input html-input"
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              placeholder="输入 HTML..."
              rows={12}
            />
            <button className="action-btn primary" onClick={handleWriteRichText}>
              写入剪贴板 (富文本)
            </button>
          </div>
        </section>
      )}

      {activeTab === 'read' && (
        <section className="tab-panel">
          <button className="action-btn primary" onClick={handleReadClipboard}>
            读取剪贴板
          </button>

          {renderReadContent(readContent)}
        </section>
      )}

      {activeTab === 'capabilities' && (
        <section className="tab-panel">
          <button className="action-btn" onClick={handleRefreshCapabilities}>
            🔄 刷新能力探测
          </button>
          {renderCapabilityMatrix()}
        </section>
      )}

      {activeTab === 'history' && (
        <section className="tab-panel">
          {writeHistory.length === 0 ? (
            <p className="empty-state">暂无写入历史。请先执行写入操作。</p>
          ) : (
            <div className="history-list">
              {writeHistory.map((entry) => (
                <div key={entry.id} className={`history-item ${entry.success ? 'success' : 'error'}`}>
                  <div className="history-header">
                    <span className="history-time">{entry.timestamp}</span>
                    <span className="history-type">
                      {entry.type === 'text' ? '📝 文本' : '🌈 富文本'}
                    </span>
                    <span className={`history-status ${entry.success ? 'success' : 'error'}`}>
                      {entry.success ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="history-preview">{entry.contentPreview}</div>
                  <div className="history-meta">
                    <span>{entry.contentLength} 字符</span>
                    <span>{formatBytes(entry.byteLength)}</span>
                    <span>方法: {entry.method}</span>
                    {entry.errorCode && <span className="error-code">错误: {entry.errorCode}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="result-section">
        <h3>操作结果</h3>
        {renderResult(operationResult)}
      </section>

      {showManualCopy && (
        <div className="modal-overlay" onClick={() => setShowManualCopy(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔧 手动复制</h3>
            <p>自动复制不可用。请手动复制以下内容：</p>
            <textarea
              ref={manualCopyRef}
              className="manual-copy-textarea"
              value={pendingCopyText}
              readOnly
              rows={10}
            />
            <div className="modal-actions">
              <button className="action-btn primary" onClick={handleManualCopy}>
                选中内容 (Ctrl+C)
              </button>
              <button className="action-btn" onClick={() => setShowManualCopy(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
