import { useCallback, useEffect, useRef, useState } from 'react'
import {
    addEvent,
    clearEvents,
    detectContentTypeFromHeaders,
    exportEvents,
    filterEvents,
    generateCurl,
    generateFetch,
    generateSampleRequest,
    getEventsFromStorage,
    HEADER_CATEGORIES,
    importEvents,
    isSameOrigin,
    MAX_EVENTS,
    parseBody,
    parseHttpRequest,
    parseRawTextToEvent,
    removeEvent,
    SAMPLE_WEBHOOKS,
} from './logic/index.js'
import './WebhookDebugReceiver.css'

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export default function WebhookDebugReceiver() {
  const [activeTab, setActiveTab] = useState('receive')
  const [rawInput, setRawInput] = useState('')
  const [parsedRequest, setParsedRequest] = useState(null)
  const [bodyParsing, setBodyParsing] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

  const [events, setEvents] = useState([])
  const [expandedEventId, setExpandedEventId] = useState(null)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [importText, setImportText] = useState('')

  const [testRunUrl, setTestRunUrl] = useState('https://example.com/webhook')
  const [testRunMethod, setTestRunMethod] = useState('POST')
  const [testRunHeaders, setTestRunHeaders] = useState('')
  const [testRunBody, setTestRunBody] = useState('')
  const [testRunResult, setTestRunResult] = useState(null)
  const [testRunLoading, setTestRunLoading] = useState(false)

  const fileInputRef = useRef(null)
  const rawInputRef = useRef(null)

  const adjustTextareaHeight = useCallback(() => {
    const textarea = rawInputRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  useEffect(() => {
    const stored = getEventsFromStorage()
    setEvents(stored)
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [rawInput, adjustTextareaHeight])

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

  const handleParse = useCallback(() => {
    setParseError(null)
    setParsedRequest(null)
    setBodyParsing(null)

    if (!rawInput.trim()) {
      setParseError({ message: '请输入要解析的内容' })
      return
    }

    const parsed = parseHttpRequest(rawInput)

    if (parsed.error) {
      setParseError({ message: parsed.error.errorMessage })
      setParsedRequest(parsed)
      return
    }

    setParsedRequest(parsed)

    const detectedType = detectContentTypeFromHeaders(parsed.headers)
    const parsedBody = parseBody(parsed.rawBody, detectedType)
    setBodyParsing(parsedBody)

    if (parsedBody.error) {
      setParseError({ message: parsedBody.error.errorMessage })
    }
  }, [rawInput])

  const handleAddToTimeline = useCallback(() => {
    if (!rawInput.trim()) {
      return
    }

    const event = parseRawTextToEvent(rawInput)
    const updated = addEvent(events, event)
    setEvents(updated)
    setExpandedEventId(event.id)
    setActiveTab('timeline')
  }, [rawInput, events])

  const handleLoadSample = useCallback((sampleKey) => {
    const sample = SAMPLE_WEBHOOKS[sampleKey]
    if (!sample) return

    let bodyText
    if (sample.bodyRaw) {
      bodyText = sample.bodyRaw
    } else {
      bodyText = JSON.stringify(sample.body, null, 2)
    }

    const headersText = Object.entries(sample.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    const fullRequest = [
      `${sample.method || 'POST'} /webhook HTTP/1.1`,
      headersText,
      '',
      bodyText,
    ].join('\n')

    setRawInput(fullRequest)
    setParseError(null)
    setParsedRequest(null)
    setBodyParsing(null)
  }, [])

  const handleExpandEvent = useCallback((eventId) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId)
  }, [expandedEventId])

  const handleRemoveEvent = useCallback((eventId) => {
    const updated = removeEvent(events, eventId)
    setEvents(updated)
    if (expandedEventId === eventId) {
      setExpandedEventId(null)
    }
  }, [events, expandedEventId])

  const handleClearEvents = useCallback(() => {
    clearEvents()
    setEvents([])
    setExpandedEventId(null)
  }, [])

  const handleExportEvents = useCallback(() => {
    const json = exportEvents(events)
    handleCopy(json, '事件数据')
  }, [events, handleCopy])

  const handleDownloadEvents = useCallback(() => {
    const json = exportEvents(events)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `webhook-events-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [events])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileImport = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = importEvents(event.target.result)
      if (result.success) {
        setEvents(result.events)
        setCopyStatus({ type: 'success', message: `成功导入 ${result.events.length} 条事件` })
        setTimeout(() => setCopyStatus(null), 2500)
      } else {
        setCopyStatus({ type: 'error', message: result.error?.errorMessage || '导入失败' })
        setTimeout(() => setCopyStatus(null), 2500)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleLoadTemplate = useCallback((templateType) => {
    const template = generateSampleRequest(templateType)
    setTestRunUrl(template.url)
    setTestRunMethod(template.method || 'POST')
    setTestRunHeaders(Object.entries(template.headers).map(([k, v]) => `${k}: ${v}`).join('\n'))
    setTestRunBody(typeof template.body === 'object' ? JSON.stringify(template.body, null, 2) : template.body)
  }, [])

  const handleGenerateCurl = useCallback(() => {
    let headers = {}
    try {
      const lines = testRunHeaders.split('\n').filter((l) => l.trim())
      for (const line of lines) {
        const colonIdx = line.indexOf(':')
        if (colonIdx > 0) {
          headers[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
        }
      }
    } catch (err) {
      void err
    }

    let body = testRunBody
    if (body.trim() && !testRunHeaders.toLowerCase().includes('content-type')) {
      headers['Content-Type'] = 'application/json'
    }

    const curl = generateCurl({
      url: testRunUrl,
      method: testRunMethod,
      headers,
      body: body.trim() ? body : null,
    })
    handleCopy(curl, 'curl 命令')
  }, [testRunUrl, testRunMethod, testRunHeaders, testRunBody, handleCopy])

  const handleGenerateFetch = useCallback(() => {
    let headers = {}
    try {
      const lines = testRunHeaders.split('\n').filter((l) => l.trim())
      for (const line of lines) {
        const colonIdx = line.indexOf(':')
        if (colonIdx > 0) {
          headers[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
        }
      }
    } catch (err) {
      void err
    }

    let body = testRunBody
    let contentType = 'application/json'

    const fetchCode = generateFetch({
      url: testRunUrl,
      method: testRunMethod,
      headers,
      body: body.trim() ? body : null,
      contentType,
    })
    handleCopy(fetchCode, 'fetch 代码')
  }, [testRunUrl, testRunMethod, testRunHeaders, testRunBody, handleCopy])

  const handleTestRun = useCallback(async () => {
    setTestRunLoading(true)
    setTestRunResult(null)

    const sameOrigin = isSameOrigin(testRunUrl)

    if (!sameOrigin) {
      setTestRunResult({
        type: 'cors-note',
        message: `目标 URL 与当前页面不同源，预计将发生 CORS 错误。\n\n这是浏览器的安全限制，不是工具缺陷。\n\n预期错误形态：\n- 控制台显示 "Access-Control-Allow-Origin" 错误\n- fetch promise 可能 reject 或返回 opaque response\n\n解决方案：\n1. 使用同源后端服务\n2. 目标服务配置 CORS 允许当前源\n3. 使用浏览器扩展或代理绕过 CORS`,
      })
      setTestRunLoading(false)
      return
    }

    try {
      let headers = {}
      const lines = testRunHeaders.split('\n').filter((l) => l.trim())
      for (const line of lines) {
        const colonIdx = line.indexOf(':')
        if (colonIdx > 0) {
          headers[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
        }
      }

      const options = {
        method: testRunMethod,
        headers,
      }

      if (testRunBody.trim() && ['POST', 'PUT', 'PATCH'].includes(testRunMethod)) {
        if (!headers['Content-Type'] && !headers['content-type']) {
          options.headers['Content-Type'] = 'application/json'
        }
        options.body = testRunBody
      }

      const startTime = Date.now()
      const response = await fetch(testRunUrl, options)
      const duration = Date.now() - startTime

      const text = await response.text()

      setTestRunResult({
        type: 'success',
        message: `请求成功！\n\n状态码: ${response.status} ${response.statusText}\n耗时: ${duration}ms\n\n响应内容预览:`,
        response: text.substring(0, 2000) + (text.length > 2000 ? '\n...(内容已截断)' : ''),
      })
    } catch (err) {
      setTestRunResult({
        type: 'error',
        message: `请求失败：${err?.message || '未知错误'}`,
      })
    } finally {
      setTestRunLoading(false)
    }
  }, [testRunUrl, testRunMethod, testRunHeaders, testRunBody])

  const filteredEvents = filterEvents(events, filterKeyword)

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>解析失败</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  const renderHeaders = (headers) => {
    if (!headers || Object.keys(headers).length === 0) {
      return <p>无请求头</p>
    }

    const signatureNames = HEADER_CATEGORIES.SIGNATURE.map((n) => n.toLowerCase())
    const xNames = HEADER_CATEGORIES.SECURITY.map((n) => n.toLowerCase())

    return (
      <div className="headers-grid">
        {Object.entries(headers).map(([name, value]) => {
          const lowerName = name.toLowerCase()
          let extraClass = ''
          if (signatureNames.some((s) => lowerName.includes(s.toLowerCase()))) {
            extraClass = 'signature-header'
          } else if (lowerName.startsWith('x-') || xNames.some((x) => lowerName.includes(x.toLowerCase()))) {
            extraClass = 'x-header'
          }

          return (
            <div key={name} className={`header-item ${extraClass}`}>
              <span className="header-name">{escapeHtml(name)}</span>
              <span className="header-value">{escapeHtml(value)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderBodyContent = (parsing) => {
    if (!parsing) return null

    if (parsing.type === 'application/json') {
      if (parsing.error) {
        return (
          <div>
            {renderErrorBox({ message: parsing.error.errorMessage })}
            <pre dangerouslySetInnerHTML={{ __html: escapeHtml(parsing.raw) }} />
          </div>
        )
      }

      const hasXss = checkForXss(parsing.parsed)

      return (
        <div>
          {hasXss && (
            <div className="xss-warning">
              <strong>⚠️ 安全提示：</strong>检测到内容中包含可能的 XSS 攻击代码。
              本工具仅做文本展示，不会执行这些脚本。
            </div>
          )}
          <pre dangerouslySetInnerHTML={{ __html: escapeHtml(parsing.beautified || parsing.raw) }} />
        </div>
      )
    }

    if (parsing.type === 'application/x-www-form-urlencoded') {
      if (parsing.error) {
        return (
          <div>
            {renderErrorBox({ message: parsing.error.errorMessage })}
            <pre dangerouslySetInnerHTML={{ __html: escapeHtml(parsing.raw) }} />
          </div>
        )
      }

      return (
        <table className="form-table">
          <thead>
            <tr>
              <th>字段名</th>
              <th>值</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(parsing.parsed).map(([key, value]) => (
              <tr key={key}>
                <td>{escapeHtml(key)}</td>
                <td>{escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    if (parsing.type === 'multipart/form-data') {
      if (parsing.error) {
        return (
          <div>
            {renderErrorBox({ message: parsing.error.errorMessage })}
            <pre dangerouslySetInnerHTML={{ __html: escapeHtml(parsing.raw) }} />
          </div>
        )
      }

      return (
        <div>
          {parsing.parsed.map((part, idx) => (
            <div key={idx} className="result-box" style={{ marginBottom: '0.5rem' }}>
              <div className="result-header">
                <span className="result-label">
                  Part {idx + 1}: {escapeHtml(part.name)}
                  {part.filename && ` (${escapeHtml(part.filename)})`}
                </span>
              </div>
              <p>Content-Type: <code>{escapeHtml(part.contentType)}</code></p>
              <pre dangerouslySetInnerHTML={{ __html: escapeHtml(part.body) }} />
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="hex-compare">
        <div>
          <h3>纯文本</h3>
          <pre dangerouslySetInnerHTML={{ __html: escapeHtml(parsing.parsed) }} />
        </div>
        <div>
          <h3>十六进制（前 1KB）</h3>
          <pre dangerouslySetInnerHTML={{ __html: escapeHtml(parsing.hexString || '') }} />
        </div>
      </div>
    )
  }

  const checkForXss = (obj) => {
    if (obj === null || obj === undefined) return false
    if (typeof obj === 'string') {
      const lower = obj.toLowerCase()
      return lower.includes('<script') || lower.includes('onerror') ||
        lower.includes('onload') || lower.includes('<iframe') ||
        lower.includes('javascript:')
    }
    if (Array.isArray(obj)) {
      return obj.some(checkForXss)
    }
    if (typeof obj === 'object') {
      return Object.values(obj).some(checkForXss)
    }
    return false
  }

  const renderEventCard = (event) => {
    const isExpanded = expandedEventId === event.id
    const hasError = event.errorCode

    return (
      <div key={event.id} className={`event-card ${hasError ? 'error' : ''}`}>
        <div className="event-header" onClick={() => handleExpandEvent(event.id)}>
          <div className="event-title">
            <span className={`method-badge ${event.derivedHeaders?.method || 'UNKNOWN'}`}>
              {event.derivedHeaders?.method || 'UNKNOWN'}
            </span>
            <span>{escapeHtml(event.derivedHeaders?.path || '/')}</span>
            <span className="event-time">
              {new Date(event.receivedAt).toLocaleString()}
            </span>
          </div>
          <div className="event-actions">
            <button
              className="copy-btn small"
              onClick={(e) => {
                e.stopPropagation()
                handleCopy(event.rawRequestText, '原始报文')
              }}
            >
              复制
            </button>
            <button
              className="secondary-btn small"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveEvent(event.id)
              }}
            >
              删除
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="event-content expanded">
            <div className="headers-section">
              <h3>请求头</h3>
              {renderHeaders(event.derivedHeaders)}
            </div>
            <div className="body-section">
              <h3>请求体</h3>
              {renderBodyContent(event.bodyParsing)}
            </div>
            {hasError && (
              <div className="error-box" style={{ marginTop: '1rem' }}>
                <strong>解析错误</strong>
                <p>{escapeHtml(event.errorMessage || '')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="webhook-debug-receiver">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'receive' ? 'active' : ''}`}
          onClick={() => setActiveTab('receive')}
        >
          报文解析
        </button>
        <button
          className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          请求构造
        </button>
        <button
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          时间线 ({events.length}/{MAX_EVENTS})
        </button>
      </div>

      {activeTab === 'receive' && (
        <section className="tool-section">
          <h2>本地 Webhook 调试</h2>

          <div className="endpoint-info">
            <h3>配合外置隧道使用</h3>
            <div className="endpoint-row">
              <strong>回调路径：</strong>
              <code>/webhook</code>
              <button
                className="copy-btn small"
                onClick={() => handleCopy('/webhook', '回调路径')}
              >
                复制
              </button>
            </div>
            <div className="endpoint-row">
              <strong>推荐方法：</strong>
              <code>POST</code>
              <button
                className="copy-btn small"
                onClick={() => handleCopy('POST', 'HTTP 方法')}
              >
                复制
              </button>
            </div>
            <p style={{ marginTop: '0.5rem', color: '#065f46', fontSize: '0.9rem' }}>
              配合 <code>ngrok</code> 或 <code>cloudflared</code> 等隧道工具使用时，
              将外部 URL 指向 <code>http://localhost:PORT/webhook</code>。
              签名字段通常位于 <code>X-Webhook-Signature</code>、
              <code>Stripe-Signature</code>、<code>X-Hub-Signature-256</code> 等头中。
            </p>
          </div>

          <div className="form-group full-width">
            <label htmlFor="raw-input">
              粘贴原始 HTTP 报文（完整报文或仅 Body）
            </label>
            <textarea
              id="raw-input"
              ref={rawInputRef}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={`示例（完整 HTTP 报文）：\nPOST /webhook HTTP/1.1\nContent-Type: application/json\nX-Webhook-Signature: sha256=YOUR_SIGNATURE\n\n{"event": "test", "data": "hello"}\n\n或仅粘贴 Body：\n{"key": "value"}`}
              spellCheck={false}
              style={{ height: 'auto', minHeight: '120px', resize: 'vertical' }}
            />
          </div>

          <div className="sample-section">
            <span className="form-group-label">快速填充示例：</span>
            <div className="sample-buttons">
              <button
                className="sample-btn"
                onClick={() => handleLoadSample('GITHUB_PUSH')}
              >
                GitHub Push
              </button>
              <button
                className="sample-btn"
                onClick={() => handleLoadSample('STRIPE_CHARGE')}
              >
                Stripe Charge
              </button>
              <button
                className="sample-btn"
                onClick={() => handleLoadSample('FORM_URLENCODED')}
              >
                表单数据
              </button>
              <button
                className="sample-btn"
                onClick={() => handleLoadSample('XSS_ATTACK')}
              >
                XSS 攻击示例
              </button>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleParse}
              disabled={!rawInput.trim()}
            >
              解析
            </button>
            <button
              className="secondary-btn"
              onClick={handleAddToTimeline}
              disabled={!rawInput.trim()}
            >
              添加到时间线
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                setRawInput('')
                setParsedRequest(null)
                setBodyParsing(null)
                setParseError(null)
              }}
            >
              清除
            </button>
          </div>

          {renderErrorBox(parseError)}

          {parsedRequest && !parsedRequest.error && (
            <div>
              <div className="two-column">
                <div className="headers-section">
                  <h3>请求头</h3>
                  <div className="result-box">
                    <div className="result-header">
                      <span className="result-label">
                        {parsedRequest.method} {parsedRequest.path}
                      </span>
                    </div>
                    {renderHeaders(parsedRequest.headers)}
                  </div>
                </div>

                <div className="body-section">
                  <h3>请求体</h3>
                  <div className="result-box">
                    <div className="result-header body-result-header">
                      <span className="result-label">
                        Content-Type: {escapeHtml(parsedRequest.contentType)}
                      </span>
                    </div>
                    {renderBodyContent(bodyParsing)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'send' && (
        <section className="tool-section">
          <h2>请求构造模板</h2>

          <div className="two-column">
            <div>
              <div className="form-group">
                <label htmlFor="test-url">目标 URL</label>
                <input
                  id="test-url"
                  type="url"
                  value={testRunUrl}
                  onChange={(e) => setTestRunUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                />
              </div>

              <div className="form-group">
                <label htmlFor="test-method">HTTP 方法</label>
                <select
                  id="test-method"
                  value={testRunMethod}
                  onChange={(e) => setTestRunMethod(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option>POST</option>
                  <option>GET</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                  <option>PATCH</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="test-headers">请求头（每行一个，格式：Name: Value）</label>
                <textarea
                  id="test-headers"
                  value={testRunHeaders}
                  onChange={(e) => setTestRunHeaders(e.target.value)}
                  placeholder="X-Webhook-Signature: sha256=YOUR_SIGNATURE\nX-Custom-Header: value"
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="test-body">请求体</label>
                <textarea
                  id="test-body"
                  value={testRunBody}
                  onChange={(e) => setTestRunBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  style={{ minHeight: '120px' }}
                />
              </div>
            </div>

            <div>
              <div className="form-group">
                <label>快速模板</label>
                <div className="sample-buttons">
                  <button
                    className="sample-btn"
                    onClick={() => handleLoadTemplate('GITHUB_PUSH')}
                  >
                    GitHub
                  </button>
                  <button
                    className="sample-btn"
                    onClick={() => handleLoadTemplate('STRIPE')}
                  >
                    Stripe
                  </button>
                  <button
                    className="sample-btn"
                    onClick={() => handleLoadTemplate('SLACK')}
                  >
                    Slack
                  </button>
                  <button
                    className="sample-btn"
                    onClick={() => handleLoadTemplate('GENERIC_JSON')}
                  >
                    通用
                  </button>
                  <button
                    className="sample-btn"
                    onClick={() => handleLoadTemplate('FORM_URLENCODED')}
                  >
                    表单
                  </button>
                </div>
              </div>

              <div className="action-row">
                <button
                  className="primary-btn"
                  onClick={handleGenerateCurl}
                >
                  复制 curl
                </button>
                <button
                  className="secondary-btn"
                  onClick={handleGenerateFetch}
                >
                  复制 fetch
                </button>
                <button
                  className="primary-btn"
                  onClick={handleTestRun}
                  disabled={testRunLoading || !testRunUrl.trim()}
                >
                  {testRunLoading ? '发送中...' : '试运行'}
                </button>
              </div>

              {testRunResult && (
                <div className={`test-run-result ${testRunResult.type}`}>
                  <pre
                    style={{ whiteSpace: 'pre-wrap', margin: 0 }}
                    dangerouslySetInnerHTML={{
                      __html: escapeHtml(testRunResult.message) +
                        (testRunResult.response ? '\n\n' + escapeHtml(testRunResult.response) : ''),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'timeline' && (
        <section className="tool-section">
          <h2>载荷时间线</h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            数据存储在浏览器本地 sessionStorage 中，不发送到任何服务器。
            最多保存 {MAX_EVENTS} 条最近事件。
          </p>

          <div className="events-controls">
            <input
              type="text"
              placeholder="搜索过滤..."
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
            />
            <button
              className="secondary-btn"
              onClick={handleExportEvents}
              disabled={events.length === 0}
            >
              复制 JSON
            </button>
            <button
              className="secondary-btn"
              onClick={handleDownloadEvents}
              disabled={events.length === 0}
            >
              导出
            </button>
            <button
              className="secondary-btn"
              onClick={handleImportClick}
            >
              导入
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />
            <button
              className="secondary-btn"
              onClick={handleClearEvents}
              disabled={events.length === 0}
            >
              清空
            </button>
          </div>

          <div className="form-group full-width">
            <label htmlFor="paste-events">或粘贴 JSON 数据导入</label>
            <textarea
              id="paste-events"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="粘贴 JSON 数组格式的事件数据..."
              style={{ minHeight: '80px' }}
            />
            <div className="action-row" style={{ marginTop: '0.5rem' }}>
              <button
                className="primary-btn"
                onClick={() => {
                  const result = importEvents(importText)
                  if (result.success) {
                    setEvents(result.events)
                    setImportText('')
                    setCopyStatus({ type: 'success', message: `成功导入 ${result.events.length} 条事件` })
                    setTimeout(() => setCopyStatus(null), 2500)
                  } else {
                    setCopyStatus({ type: 'error', message: result.error?.errorMessage || '导入失败' })
                    setTimeout(() => setCopyStatus(null), 2500)
                  }
                }}
                disabled={!importText.trim()}
              >
                导入粘贴内容
              </button>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="empty-state">
              {events.length === 0
                ? '暂无事件记录。在「报文解析」标签页中点击「添加到时间线」来记录事件。'
                : '没有匹配的事件，请尝试调整搜索关键词。'}
            </div>
          ) : (
            <div className="events-list">
              {filteredEvents.map(renderEventCard)}
            </div>
          )}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有解析、时间线管理、试运行等功能均在浏览器本地执行，
            不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>配合隧道使用：</strong>本工具不直接监听 HTTP 端口，需配合
            <code>ngrok</code>、<code>cloudflared</code> 或反向代理将外部 Webhook 转发到本地。
          </li>
          <li>
            <strong>试运行 CORS：</strong>「试运行」功能仅对同源或配置了 CORS 的目标有效。
            非同源请求将在结果区显示预期的 CORS 失败形态，这是浏览器的安全限制，不是工具缺陷。
          </li>
          <li>
            <strong>安全渲染：</strong>所有用户输入内容均采用安全文本渲染，防止 XSS 攻击。
            即使输入中包含 <code>{'<script>'}</code> 标签也不会执行。
          </li>
          <li>
            <strong>签名验证：</strong>工具提供签名字段的识别和展示，但不做签名验证计算。
            用户需根据各自平台的文档进行签名验证。
          </li>
          <li>
            <strong>数据持久化：</strong>时间线数据存储在 <code>sessionStorage</code> 中，
            关闭浏览器标签页后将自动清除。可使用「导出」功能保存到本地文件。
          </li>
        </ul>
      </div>
    </div>
  )
}
