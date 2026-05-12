import { useCallback, useRef, useState } from 'react'
import {
  HTTP_METHODS,
  BODY_MODES,
  ERROR_CODES,
  MAX_TIMEOUT_MS,
  buildFetchInit,
  classifyFetchError,
  readResponseBody,
  summarizeResponse,
  exportHar,
  copyToClipboard,
  downloadBlob,
  formatDuration,
  getStatusCategory,
  getErrorMessage,
  getPresetTemplates,
  getDefaultParams,
  isSensitiveHeader,
  maskSensitiveValue,
  tryParseJson,
} from './logic/index.js'
import './HttpRequestPlaygroundTool.css'

function JsonTree({ data, maxDepth = 10 }) {
  const [expanded, setExpanded] = useState({})

  const toggle = (path) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }))
  }

  const renderNode = (node, path = '', depth = 0) => {
    if (depth > maxDepth) {
      return <span className="json-null">... (max depth)</span>
    }

    if (node === null) {
      return <span className="json-null">null</span>
    }

    if (typeof node === 'boolean') {
      return <span className="json-boolean">{String(node)}</span>
    }

    if (typeof node === 'number') {
      return <span className="json-number">{node}</span>
    }

    if (typeof node === 'string') {
      return <span className="json-string">"{node}"</span>
    }

    if (Array.isArray(node)) {
      const isExpanded = expanded[path] !== false
      const items = node.map((item, index) => (
        <div key={index} className="json-node">
          <span className="json-key">{index}:</span>{' '}
          {renderNode(item, `${path}[${index}]`, depth + 1)}
          {index < node.length - 1 ? ',' : ''}
        </div>
      ))

      if (node.length === 0) {
        return <span className="json-null">[]</span>
      }

      return (
        <span>
          <span className="json-toggle" onClick={() => toggle(path)}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <span>Array[{node.length}]</span>
          {isExpanded && (
            <div className="json-node">
              [{items}]
            </div>
          )}
        </span>
      )
    }

    if (typeof node === 'object') {
      const keys = Object.keys(node)
      const isExpanded = expanded[path] !== false

      if (keys.length === 0) {
        return <span className="json-null">{}</span>
      }

      return (
        <span>
          <span className="json-toggle" onClick={() => toggle(path)}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <span>Object</span>
          {isExpanded && (
            <div className="json-node">
              {'{'}
              {keys.map((key, index) => (
                <div key={key} className="json-node">
                  <span className="json-key">"{key}"</span>:{' '}
                  {renderNode(node[key], `${path}.${key}`, depth + 1)}
                  {index < keys.length - 1 ? ',' : ''}
                </div>
              ))}
              {'}'}
            </div>
          )}
        </span>
      )
    }

    return <span className="json-null">undefined</span>
  }

  return <div className="json-tree">{renderNode(data)}</div>
}

function KeyValueEditor({ items, onChange, onAdd, onRemove, placeholderKey = 'Key', placeholderValue = 'Value', showCheckbox = true }) {
  return (
    <div>
      {items.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div>暂无数据，点击下方按钮添加</div>
        </div>
      )}

      {items.length > 0 && (
        <table className="key-value-table">
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                {showCheckbox && (
                  <td style={{ width: '32px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={item.enabled !== false}
                      onChange={(e) => {
                        const newItems = [...items]
                        newItems[index] = { ...item, enabled: e.target.checked }
                        onChange(newItems)
                      }}
                    />
                  </td>
                )}
                <td>
                  <input
                    type="text"
                    className="input"
                    value={item.key || ''}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[index] = { ...item, key: e.target.value }
                      onChange(newItems)
                    }}
                    placeholder={placeholderKey}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="input"
                    value={item.sensitive ? maskSensitiveValue(item.key, item.value) : (item.value || '')}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[index] = { ...item, value: e.target.value, sensitive: false }
                      onChange(newItems)
                    }}
                    placeholder={placeholderValue}
                    style={isSensitiveHeader(item.key) ? { fontFamily: 'var(--mono)' } : {}}
                  />
                </td>
                <td style={{ width: '80px' }}>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => onRemove(index)}
                  >
                    移除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        type="button"
        className="add-btn"
        onClick={onAdd}
        style={{ marginTop: '0.75rem' }}
      >
        + 添加
      </button>
    </div>
  )
}

export default function HttpRequestPlaygroundTool() {
  const [params, setParams] = useState(getDefaultParams())
  const [activeTab, setActiveTab] = useState('query')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [requestStartTime, setRequestStartTime] = useState(null)
  const [abortController, setAbortController] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [activeTemplate, setActiveTemplate] = useState(null)

  const handleMethodChange = useCallback((e) => {
    setParams((prev) => ({ ...prev, method: e.target.value }))
  }, [])

  const handleUrlChange = useCallback((e) => {
    setParams((prev) => ({ ...prev, url: e.target.value }))
  }, [])

  const handleTimeoutChange = useCallback((e) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 0 && value <= MAX_TIMEOUT_MS) {
      setParams((prev) => ({ ...prev, timeout: value }))
    }
  }, [])

  const handleBodyModeChange = useCallback((mode) => {
    setParams((prev) => ({ ...prev, bodyMode: mode }))
  }, [])

  const handleJsonBodyChange = useCallback((e) => {
    setParams((prev) => ({ ...prev, jsonBody: e.target.value }))
  }, [])

  const handleRawBodyChange = useCallback((e) => {
    setParams((prev) => ({ ...prev, rawBody: e.target.value }))
  }, [])

  const handleQueryParamsChange = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, queryParams: newParams }))
  }, [])

  const handleAddQueryParam = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      queryParams: [...prev.queryParams, { key: '', value: '', enabled: true }],
    }))
  }, [])

  const handleRemoveQueryParam = useCallback((index) => {
    setParams((prev) => ({
      ...prev,
      queryParams: prev.queryParams.filter((_, i) => i !== index),
    }))
  }, [])

  const handleHeadersChange = useCallback((newHeaders) => {
    setParams((prev) => ({ ...prev, headers: newHeaders }))
  }, [])

  const handleAddHeader = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '', enabled: true }],
    }))
  }, [])

  const handleRemoveHeader = useCallback((index) => {
    setParams((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }))
  }, [])

  const handleFormDataChange = useCallback((newData) => {
    setParams((prev) => ({ ...prev, formData: newData }))
  }, [])

  const handleAddFormData = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      formData: [...prev.formData, { key: '', value: '', enabled: true }],
    }))
  }, [])

  const handleRemoveFormData = useCallback((index) => {
    setParams((prev) => ({
      ...prev,
      formData: prev.formData.filter((_, i) => i !== index),
    }))
  }, [])

  const handleFormUrlEncodedChange = useCallback((newData) => {
    setParams((prev) => ({ ...prev, formUrlEncoded: newData }))
  }, [])

  const handleAddFormUrlEncoded = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      formUrlEncoded: [...prev.formUrlEncoded, { key: '', value: '', enabled: true }],
    }))
  }, [])

  const handleRemoveFormUrlEncoded = useCallback((index) => {
    setParams((prev) => ({
      ...prev,
      formUrlEncoded: prev.formUrlEncoded.filter((_, i) => i !== index),
    }))
  }, [])

  const handleApplyPreset = useCallback((template) => {
    setParams({ ...template.params })
    setResponse(null)
    setError(null)
    setWarnings([])
    setActiveTemplate(template.id)
  }, [])

  const handleCopy = useCallback(async (text, label) => {
    if (!text) return
    try {
      await copyToClipboard(text)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      setCopyStatus({ type: 'error', message: `复制失败：${err?.message || '未知错误'}` })
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

  const handleCopyRequest = useCallback(() => {
    const requestText = `${params.method} ${params.url}\n\nHeaders:\n${params.headers
      .filter((h) => h.enabled !== false && h.key)
      .map((h) => `${h.key}: ${maskSensitiveValue(h.key, h.value)}`)
      .join('\n')}\n\nBody:\n${params.bodyMode === 'json' ? params.jsonBody : params.bodyMode === 'raw' ? params.rawBody : ''}`
    handleCopy(requestText, '请求信息')
  }, [params, handleCopy])

  const handleCopyResponse = useCallback(() => {
    if (!response) return
    const responseText = `HTTP ${response.status} ${response.statusText}\n\nHeaders:\n${Object.entries(response.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')}\n\nBody:\n${response.body?.text || ''}`
    handleCopy(responseText, '响应信息')
  }, [response, handleCopy])

  const handleExportHar = useCallback(() => {
    if (!response || !requestStartTime) return

    const fetchInit = buildFetchInit(params)
    const har = exportHar(
      fetchInit,
      response,
      requestStartTime,
      requestStartTime + (response?.durationMs || 0)
    )
    const harJson = JSON.stringify(har, null, 2)
    const blob = new Blob([harJson], { type: 'application/json' })
    downloadBlob(blob, `request-${Date.now()}.har`)
  }, [response, requestStartTime, params])

  const handleDownloadBody = useCallback(() => {
    if (!response?.body?.blob) return
    const contentType = response.contentType || 'application/octet-stream'
    const extension = contentType.includes('json') ? '.json' : '.bin'
    downloadBlob(response.body.blob, `response${extension}`)
  }, [response])

  const handleUseResponseAsTemplate = useCallback(() => {
    if (!response) return

    const bodyText = response.body?.text || ''
    const jsonParse = tryParseJson(bodyText)

    const newParams = getDefaultParams()

    if (jsonParse.json) {
      newParams.bodyMode = 'json'
      newParams.jsonBody = JSON.stringify(jsonParse.json, null, 2)
    } else if (bodyText) {
      newParams.bodyMode = 'raw'
      newParams.rawBody = bodyText
    }

    setParams(newParams)
  }, [response])

  const handleSendRequest = useCallback(async () => {
    setIsLoading(true)
    setResponse(null)
    setError(null)
    setWarnings([])

    const fetchInit = buildFetchInit(params)

    if (fetchInit.warnings.length > 0) {
      setWarnings(fetchInit.warnings)
    }

    if (fetchInit.errors.length > 0) {
      const firstError = fetchInit.errors[0]
      setError({
        code: firstError.code,
        message: getErrorMessage(firstError.code),
        field: firstError.field,
      })
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setAbortController(controller)

    const timeoutId = setTimeout(() => {
      controller.abort()
    }, params.timeout || 30000)

    const startTime = Date.now()
    setRequestStartTime(startTime)

    try {
      const init = {
        ...fetchInit.init,
        signal: controller.signal,
        credentials: 'omit',
      }

      const rawResponse = await fetch(fetchInit.url, init)
      clearTimeout(timeoutId)

      const bodyResult = await readResponseBody(rawResponse)
      const durationMs = Date.now() - startTime

      if (bodyResult.error) {
        setError(bodyResult.error)
        setIsLoading(false)
        setAbortController(null)
        return
      }

      const summary = summarizeResponse({
        response: rawResponse,
        bodyText: bodyResult.text,
        bodyBlob: bodyResult.blob,
        tooLarge: bodyResult.tooLarge,
        truncated: bodyResult.truncated,
        durationMs,
      })

      setResponse(summary)

      if (summary.status >= 400) {
        setError({
          code: ERROR_CODES.HTTP_ERROR,
          message: `服务器返回 ${summary.status} ${summary.statusText}`,
          status: summary.status,
        })
      }
    } catch (err) {
      clearTimeout(timeoutId)

      const classified = classifyFetchError(err)

      if (classified.code === ERROR_CODES.ABORTED) {
        setError({
          code: classified.code,
          message: classified.message,
        })
      } else {
        setError(classified)
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }, [params])

  const handleCancelRequest = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
  }, [abortController])

  const handleClear = useCallback(() => {
    setParams(getDefaultParams())
    setResponse(null)
    setError(null)
    setWarnings([])
  }, [])

  const statusCategory = response ? getStatusCategory(response.status) : 'unknown'

  return (
    <div className="http-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>HTTP 请求构造</h2>

        <div className="form-row">
          <select
            className="method-select"
            value={params.method}
            onChange={handleMethodChange}
            disabled={isLoading}
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <input
            type="text"
            className="url-input"
            value={params.url}
            onChange={handleUrlChange}
            placeholder="https://api.example.com/endpoint"
            disabled={isLoading}
          />

          <button
            type="button"
            className="action-btn primary-btn"
            onClick={handleSendRequest}
            disabled={isLoading || !params.url}
          >
            {isLoading ? '发送中...' : '发送'}
          </button>

          {isLoading && (
            <button
              type="button"
              className="action-btn danger-btn"
              onClick={handleCancelRequest}
            >
              取消
            </button>
          )}
        </div>

        <div>
          <h3>预置模板</h3>
          <div className="preset-list">
            {getPresetTemplates().map((template) => (
              <button
                key={template.id}
                type="button"
                className={`preset-btn ${activeTemplate === template.id ? 'active' : ''}`}
                onClick={() => handleApplyPreset(template)}
                title={template.description}
                disabled={isLoading}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <hr className="section-divider" />

        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'query' ? 'active' : ''}`}
            onClick={() => setActiveTab('query')}
          >
            查询参数
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
            onClick={() => setActiveTab('headers')}
          >
            请求头
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            请求体
          </button>
        </div>

        <div className={`tab-content ${activeTab === 'query' ? 'active' : ''}`}>
          <h3>Query Parameters</h3>
          <KeyValueEditor
            items={params.queryParams}
            onChange={handleQueryParamsChange}
            onAdd={handleAddQueryParam}
            onRemove={handleRemoveQueryParam}
            placeholderKey="param_name"
            placeholderValue="value"
          />
        </div>

        <div className={`tab-content ${activeTab === 'headers' ? 'active' : ''}`}>
          <h3>Request Headers</h3>
          <KeyValueEditor
            items={params.headers}
            onChange={handleHeadersChange}
            onAdd={handleAddHeader}
            onRemove={handleRemoveHeader}
            placeholderKey="Header-Name"
            placeholderValue="value"
          />
          <div className="warning-hint" style={{ marginTop: '0.75rem' }}>
            <strong>提示：</strong> 浏览器禁止设置部分 Header（如 Cookie、Host、Content-Length 等）。
            敏感头（如 Authorization）在显示时会自动遮罩。
          </div>
        </div>

        <div className={`tab-content ${activeTab === 'body' ? 'active' : ''}`}>
          <h3>Request Body</h3>

          <div className="preset-list" style={{ marginBottom: '1rem' }}>
            {BODY_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`preset-btn ${params.bodyMode === mode ? 'active' : ''}`}
                onClick={() => handleBodyModeChange(mode)}
                style={{
                  background: params.bodyMode === mode ? 'var(--accent-soft)' : undefined,
                  borderColor: params.bodyMode === mode ? 'var(--accent)' : undefined,
                  color: params.bodyMode === mode ? 'var(--accent)' : undefined,
                }}
              >
                {mode === 'none' ? '无' :
                  mode === 'raw' ? 'Raw' :
                    mode === 'json' ? 'JSON' :
                      mode === 'form-data' ? 'Form Data' :
                        'x-www-form-urlencoded'}
              </button>
            ))}
          </div>

          {params.bodyMode === 'raw' && (
            <textarea
              className="textarea"
              value={params.rawBody}
              onChange={handleRawBodyChange}
              placeholder="输入原始请求体内容..."
              disabled={isLoading}
            />
          )}

          {params.bodyMode === 'json' && (
            <textarea
              className="textarea"
              value={params.jsonBody}
              onChange={handleJsonBodyChange}
              placeholder='{"key": "value"}'
              disabled={isLoading}
            />
          )}

          {params.bodyMode === 'form-data' && (
            <KeyValueEditor
              items={params.formData}
              onChange={handleFormDataChange}
              onAdd={handleAddFormData}
              onRemove={handleRemoveFormData}
              placeholderKey="field_name"
              placeholderValue="value"
            />
          )}

          {params.bodyMode === 'x-www-form-urlencoded' && (
            <KeyValueEditor
              items={params.formUrlEncoded}
              onChange={handleFormUrlEncodedChange}
              onAdd={handleAddFormUrlEncoded}
              onRemove={handleRemoveFormUrlEncoded}
              placeholderKey="field_name"
              placeholderValue="value"
            />
          )}

          {params.bodyMode === 'none' && (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div>此请求不包含请求体</div>
            </div>
          )}
        </div>

        <div className="timeout-row">
          <label className="timeout-label">超时时间（毫秒）：</label>
          <input
            type="number"
            className="timeout-input"
            value={params.timeout}
            onChange={handleTimeoutChange}
            min={0}
            max={MAX_TIMEOUT_MS}
            disabled={isLoading}
          />
          <span className="timeout-label" style={{ color: 'var(--text-muted)' }}>
            最大 {MAX_TIMEOUT_MS / 1000} 秒
          </span>
        </div>

        <div className="action-row">
          <button
            type="button"
            className="action-btn"
            onClick={handleCopyRequest}
            disabled={!params.url || isLoading}
          >
            复制请求
          </button>
          <button
            type="button"
            className="action-btn"
            onClick={handleClear}
            disabled={isLoading}
          >
            清空
          </button>
        </div>
      </section>

      {isLoading && (
        <section className="tool-section">
          <div className="loading-indicator">
            <div className="spinner" />
            <span>请求执行中，点击「取消」可中断...</span>
          </div>
        </section>
      )}

      {error && (
        <section className="tool-section">
          <h2>错误</h2>
          <div className="error-box">
            <strong>{error.code}</strong>
            <p>{error.message}</p>
            <span className="error-code">errorCode: {error.code}</span>
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <section className="tool-section">
          <h2>警告</h2>
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="warning-hint"
              style={{ marginBottom: index < warnings.length - 1 ? '0.5rem' : 0 }}
            >
              <strong>{warning.reason}:</strong> {warning.message}
            </div>
          ))}
        </section>
      )}

      {response && (
        <section className="tool-section">
          <h2>响应结果</h2>

          <div className="response-status">
            <span className={`status-badge ${statusCategory}`}>
              {response.status} {response.statusText}
            </span>
            <div className="response-meta">
              <span>耗时：<code>{formatDuration(response.durationMs)}</code></span>
              {response.redirected && (
                <span>发生重定向</span>
              )}
              {response.body?.size != null && (
                <span>Body 大小：<code>{response.body.size.toLocaleString()} 字节</code></span>
              )}
            </div>
          </div>

          {response.corsLimitations.length > 0 && (
            <div className="cors-notice">
              {response.corsLimitations.map((note, i) => (
                <div key={i}>⚠️ {note}</div>
              ))}
            </div>
          )}

          <div className="tabs">
            <button
              type="button"
              className="tab active"
            >
              响应头
            </button>
          </div>

          {Object.keys(response.headers).length > 0 ? (
            <table className="headers-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>值</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers).map(([key, value]) => (
                  <tr key={key}>
                    <td><code>{key}</code></td>
                    <td>
                      <code className={isSensitiveHeader(key) ? 'sensitive-header' : ''}>
                        {isSensitiveHeader(key) ? maskSensitiveValue(key, value) : value}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div>无响应头（可能是 CORS 限制）</div>
            </div>
          )}

          <hr className="section-divider" />

          <h3>响应体</h3>

          {response.body?.tooLarge && (
            <div className="warning-hint" style={{ marginBottom: '0.75rem' }}>
              <strong>注意：</strong> 响应体过大（超过 500KB），已截断预览。
              请使用「下载」按钮获取完整内容。
            </div>
          )}

          {response.body?.isBinary ? (
            <div className="binary-body">
              <div className="empty-state-icon">📦</div>
              <div>二进制响应体（{response.body?.size?.toLocaleString() || 0} 字节）</div>
              <button
                type="button"
                className="action-btn primary-btn"
                onClick={handleDownloadBody}
              >
                下载
              </button>
            </div>
          ) : response.body?.text ? (
            <div className="body-preview">
              {response.body?.json ? (
                <JsonTree data={response.body.json} />
              ) : (
                response.body.text
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div>响应体为空</div>
            </div>
          )}

          <div className="action-row">
            <button
              type="button"
              className="action-btn"
              onClick={handleCopyResponse}
            >
              复制响应
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={handleExportHar}
            >
              导出 HAR
            </button>
            {response.body?.blob && (
              <button
                type="button"
                className="action-btn"
                onClick={handleDownloadBody}
              >
                下载 Body
              </button>
            )}
            <button
              type="button"
              className="action-btn"
              onClick={handleUseResponseAsTemplate}
            >
              使用响应作为新请求模板
            </button>
          </div>
        </section>
      )}

      {!response && !error && !isLoading && (
        <section className="tool-section">
          <div className="empty-state">
            <div className="empty-state-icon">🌐</div>
            <div>输入 URL 并点击「发送」开始测试</div>
          </div>
        </section>
      )}

      <section className="notes-section">
        <h3>说明与限制</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有请求由您的浏览器直接发出，不经过任何中间服务器。
          </li>
          <li>
            <strong>CORS 限制：</strong>跨域请求需要目标服务器返回正确的
            <code>Access-Control-Allow-Origin</code> 头。
            部分响应头（非 safelisted）还需要
            <code>Access-Control-Expose-Headers</code> 才能在脚本中读取。
          </li>
          <li>
            <strong>安全策略：</strong>
            <ul>
              <li>阻止 <code>javascript:</code> 协议的 URL</li>
              <li>敏感头（如 Authorization、Cookie）默认遮罩显示</li>
              <li>完整令牌不会被持久化到本地存储</li>
            </ul>
          </li>
          <li>
            <strong>错误分类：</strong>
            <ul>
              <li><code>ABORTED</code> - 用户手动取消</li>
              <li><code>TIMEOUT_ERROR</code> - 超时</li>
              <li><code>CORS_ERROR</code> - 跨域被拒绝</li>
              <li><code>NETWORK_ERROR</code> - 网络或 DNS 问题</li>
              <li><code>HTTP_ERROR</code> - 非 2xx 状态码</li>
            </ul>
          </li>
        </ul>
      </section>
    </div>
  )
}
