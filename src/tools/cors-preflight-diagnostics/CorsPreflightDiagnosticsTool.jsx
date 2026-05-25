import { useState, useCallback, useMemo } from 'react'
import {
  classifyRequest,
  buildPreflightRequest,
  buildPreflightResponseHeaders,
  validatePreflightResponse,
  validateSimpleRequest,
  generateFixSuggestions,
  generateWildcardVsSpecificComparison,
  generateMultiOriginConfig,
  EXAMPLES,
} from './logic/index.js'
import './CorsPreflightDiagnosticsTool.css'

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

export default function CorsPreflightDiagnosticsTool() {
  const [activeTab, setActiveTab] = useState('classify')

  const [origin, setOrigin] = useState('https://example.com')
  const [method, setMethod] = useState('GET')
  const [requestHeaders, setRequestHeaders] = useState([
    { id: 1, name: 'Accept', value: 'application/json' },
  ])
  const [withCredentials, setWithCredentials] = useState(false)

  const [allowOrigin, setAllowOrigin] = useState('*')
  const [allowMethods, setAllowMethods] = useState('GET, POST, PUT, DELETE')
  const [allowHeaders, setAllowHeaders] = useState('Content-Type, Authorization')
  const [allowCredentials, setAllowCredentials] = useState(false)
  const [maxAge, setMaxAge] = useState('86400')

  const [multiOrigins, setMultiOrigins] = useState([
    'https://example.com',
    'https://app.example.com',
    'https://admin.example.com',
  ])
  const [multiOriginInput, setMultiOriginInput] = useState('')

  const classification = useMemo(() => {
    return classifyRequest({
      origin,
      method,
      headers: requestHeaders.filter(h => h.name),
      withCredentials,
    })
  }, [origin, method, requestHeaders, withCredentials])

  const preflightRequest = useMemo(() => {
    return buildPreflightRequest({
      origin,
      method,
      headers: requestHeaders.filter(h => h.name),
    })
  }, [origin, method, requestHeaders])

  const responseConfig = useMemo(() => ({
    allowOrigin,
    allowMethods: allowMethods.split(',').map(m => m.trim()).filter(Boolean),
    allowHeaders: allowHeaders.split(',').map(h => h.trim()).filter(Boolean),
    allowCredentials,
    maxAge: parseInt(maxAge, 10) || 0,
  }), [allowOrigin, allowMethods, allowHeaders, allowCredentials, maxAge])

  const preflightResponseHeaders = useMemo(() => {
    return buildPreflightResponseHeaders(responseConfig)
  }, [responseConfig])

  const validation = useMemo(() => {
    const request = {
      origin,
      method,
      headers: requestHeaders.filter(h => h.name),
      withCredentials,
    }
    if (classification.requiresPreflight) {
      return validatePreflightResponse(request, responseConfig)
    }
    return validateSimpleRequest(request, responseConfig)
  }, [origin, method, requestHeaders, withCredentials, responseConfig, classification.requiresPreflight])

  const fixes = useMemo(() => {
    const request = {
      origin,
      method,
      headers: requestHeaders.filter(h => h.name),
      withCredentials,
    }
    return generateFixSuggestions(request, responseConfig, validation)
  }, [origin, method, requestHeaders, withCredentials, responseConfig, validation])

  const wildcardComparison = useMemo(() => {
    return generateWildcardVsSpecificComparison(origin, withCredentials)
  }, [origin, withCredentials])

  const multiOriginConfigs = useMemo(() => {
    return generateMultiOriginConfig(multiOrigins, { allowCredentials })
  }, [multiOrigins, allowCredentials])

  const addHeader = useCallback(() => {
    const newId = Math.max(0, ...requestHeaders.map(h => h.id)) + 1
    setRequestHeaders([...requestHeaders, { id: newId, name: '', value: '' }])
  }, [requestHeaders])

  const updateHeader = useCallback((id, field, value) => {
    setRequestHeaders(requestHeaders.map(h =>
      h.id === id ? { ...h, [field]: value } : h
    ))
  }, [requestHeaders])

  const removeHeader = useCallback((id) => {
    if (requestHeaders.length > 1) {
      setRequestHeaders(requestHeaders.filter(h => h.id !== id))
    }
  }, [requestHeaders])

  const loadExample = useCallback((exampleKey) => {
    const example = EXAMPLES[exampleKey]
    if (!example) return

    setOrigin(example.origin)
    setMethod(example.method)
    setRequestHeaders(example.headers.map((h, i) => ({ id: i + 1, ...h })))
    setWithCredentials(example.withCredentials || false)

    if (example.responseConfig) {
      setAllowOrigin(example.responseConfig.allowOrigin)
      setAllowMethods(example.responseConfig.allowMethods.join(', '))
      setAllowHeaders(example.responseConfig.allowHeaders.join(', '))
      setAllowCredentials(example.responseConfig.allowCredentials)
      setMaxAge(String(example.responseConfig.maxAge || ''))
    }
  }, [])

  const addMultiOrigin = useCallback(() => {
    if (multiOriginInput.trim() && !multiOrigins.includes(multiOriginInput.trim())) {
      setMultiOrigins([...multiOrigins, multiOriginInput.trim()])
      setMultiOriginInput('')
    }
  }, [multiOriginInput, multiOrigins])

  const removeMultiOrigin = useCallback((originToRemove) => {
    setMultiOrigins(multiOrigins.filter(o => o !== originToRemove))
  }, [multiOrigins])

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.warn('Clipboard API not available, copy failed')
    }
  }, [])

  return (
    <div className="cors-diagnostics">
      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'classify' ? 'active' : ''}`}
          onClick={() => setActiveTab('classify')}
        >
          请求分类
        </button>
        <button
          className={`tab-btn ${activeTab === 'preflight' ? 'active' : ''}`}
          onClick={() => setActiveTab('preflight')}
        >
          预检模拟
        </button>
        <button
          className={`tab-btn ${activeTab === 'fixes' ? 'active' : ''}`}
          onClick={() => setActiveTab('fixes')}
        >
          修复建议
        </button>
        <button
          className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          配置对比
        </button>
      </div>

      <div className="examples-bar">
        <span className="examples-label">快速示例：</span>
        {Object.entries(EXAMPLES).map(([key, example]) => (
          <button
            key={key}
            className="example-btn"
            onClick={() => loadExample(key)}
            title={example.description}
          >
            {example.name}
          </button>
        ))}
      </div>

      {activeTab === 'classify' && (
        <div className="tab-content">
          <div className="two-column">
            <div className="column">
              <h2>请求信息</h2>
              <div className="form-group">
                <label>Origin</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="form-group">
                <label>Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {HTTP_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={withCredentials}
                    onChange={(e) => setWithCredentials(e.target.checked)}
                  />
                  <span>携带凭证 (withCredentials)</span>
                </label>
              </div>
              <div className="form-group">
                <label>Request Headers</label>
                <div className="headers-list">
                  {requestHeaders.map((header) => (
                    <div key={header.id} className="header-row">
                      <input
                        type="text"
                        value={header.name}
                        onChange={(e) => updateHeader(header.id, 'name', e.target.value)}
                        placeholder="Header Name"
                        className="header-name"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                        placeholder="Header Value"
                        className="header-value"
                      />
                      <button
                        className="remove-btn"
                        onClick={() => removeHeader(header.id)}
                        disabled={requestHeaders.length <= 1}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="add-btn" onClick={addHeader}>
                    + 添加请求头
                  </button>
                </div>
              </div>
            </div>

            <div className="column">
              <h2>分类结果</h2>
              <div className={`result-card ${classification.isSimpleRequest ? 'success' : 'warning'}`}>
                <div className="result-header">
                  <span className="result-icon">
                    {classification.isSimpleRequest ? '✓' : '⚠'}
                  </span>
                  <span className="result-title">
                    {classification.isSimpleRequest ? '简单请求' : '需预检的非简单请求'}
                  </span>
                </div>
                <p className="result-summary">{classification.summary}</p>
              </div>

              {classification.requiresPreflight && (
                <div className="trigger-reasons">
                  <h3>触发预检的条件链</h3>
                  {classification.triggerReasons.map((reason, idx) => (
                    <div key={idx} className="reason-item">
                      <div className="reason-message">{reason.message}</div>
                      <div className="reason-detail">{reason.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="request-info">
                <h3>请求详情</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Origin</span>
                    <code>{classification.origin || '(未设置)'}</code>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Method</span>
                    <code>{classification.method || '(未设置)'}</code>
                  </div>
                  <div className="info-item">
                    <span className="info-label">请求头数量</span>
                    <code>{classification.headersCount}</code>
                  </div>
                  <div className="info-item">
                    <span className="info-label">携带凭证</span>
                    <code>{classification.withCredentials ? '是' : '否'}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preflight' && (
        <div className="tab-content">
          <div className="two-column">
            <div className="column">
              <h2>服务器响应配置</h2>
              <div className="form-group">
                <label>Access-Control-Allow-Origin</label>
                <input
                  type="text"
                  value={allowOrigin}
                  onChange={(e) => setAllowOrigin(e.target.value)}
                  placeholder="* 或具体 Origin"
                />
              </div>
              <div className="form-group">
                <label>Access-Control-Allow-Methods</label>
                <input
                  type="text"
                  value={allowMethods}
                  onChange={(e) => setAllowMethods(e.target.value)}
                  placeholder="GET, POST, PUT"
                />
              </div>
              <div className="form-group">
                <label>Access-Control-Allow-Headers</label>
                <input
                  type="text"
                  value={allowHeaders}
                  onChange={(e) => setAllowHeaders(e.target.value)}
                  placeholder="Content-Type, Authorization"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowCredentials}
                    onChange={(e) => setAllowCredentials(e.target.checked)}
                  />
                  <span>Access-Control-Allow-Credentials: true</span>
                </label>
              </div>
              <div className="form-group">
                <label>Access-Control-Max-Age (秒)</label>
                <input
                  type="number"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  placeholder="86400"
                />
              </div>
            </div>

            <div className="column">
              <h2>预检模拟结果</h2>
              <div className={`result-card ${validation.passed ? 'success' : 'error'}`}>
                <div className="result-header">
                  <span className="result-icon">
                    {validation.passed ? '✓' : '✗'}
                  </span>
                  <span className="result-title">
                    {validation.passed ? '预检通过' : '预检失败'}
                  </span>
                </div>
                <p className="result-summary">{validation.summary}</p>
              </div>

              {validation.errors.length > 0 && (
                <div className="errors-list">
                  <h3>错误详情</h3>
                  {validation.errors.map((error, idx) => (
                    <div key={idx} className={`error-item severity-${error.severity}`}>
                      <div className="error-message">{error.message}</div>
                      {error.detail && <div className="error-detail">{error.detail}</div>}
                    </div>
                  ))}
                </div>
              )}

              {classification.requiresPreflight && (
                <div className="preflight-request">
                  <h3>预检请求 (OPTIONS)</h3>
                  <div className="code-block">
                    <pre>{`OPTIONS /api/resource HTTP/1.1
Origin: ${preflightRequest.headers.Origin}
Access-Control-Request-Method: ${preflightRequest.headers['Access-Control-Request-Method']}
Access-Control-Request-Headers: ${preflightRequest.headers['Access-Control-Request-Headers'] || '(无)'}`}</pre>
                  </div>
                </div>
              )}

              <div className="preflight-response">
                <h3>响应头</h3>
                <div className="code-block">
                  <pre>{Object.entries(preflightResponseHeaders)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('\n') || '(未配置)'}</pre>
                </div>
              </div>

              {preflightResponseHeaders['Vary'] === 'Origin' && (
                <div className="vary-note">
                  <strong>💡 Vary: Origin 说明：</strong>
                  当 Access-Control-Allow-Origin 为具体值而非通配符时，
                  需要添加 Vary: Origin 响应头，以告知代理服务器根据 Origin 缓存不同的响应。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fixes' && (
        <div className="tab-content">
          <h2>修复建议</h2>
          {fixes.length > 0 ? (
            <div className="fixes-list">
              {fixes.map((fix) => (
                <div key={fix.id} className={`fix-card severity-${fix.severity}`}>
                  <div className="fix-header">
                    <span className={`severity-badge ${fix.severity}`}>
                      {fix.severity === 'critical' ? '严重' : fix.severity === 'high' ? '高' : '中'}
                    </span>
                    <span className="fix-title">{fix.title}</span>
                  </div>
                  <p className="fix-description">{fix.description}</p>
                  <div className="fix-code">
                    <div className="code-header">
                      <span>修复代码</span>
                      <button
                        className="copy-btn-small"
                        onClick={() => copyToClipboard(fix.codeExample, '修复代码')}
                      >
                        复制
                      </button>
                    </div>
                    <pre>{fix.codeExample}</pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-fixes">
              <div className="success-icon">✓</div>
              <p>当前配置正确，无需修复</p>
            </div>
          )}

          <div className="multi-origin-section">
            <h3>多 Origin 场景配置</h3>
            <div className="multi-origin-input">
              <input
                type="text"
                value={multiOriginInput}
                onChange={(e) => setMultiOriginInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMultiOrigin()}
                placeholder="输入 Origin 后按回车添加"
              />
              <button className="add-btn" onClick={addMultiOrigin}>添加</button>
            </div>
            <div className="origins-table">
              <table>
                <thead>
                  <tr>
                    <th>Origin</th>
                    <th>响应头配置</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {multiOriginConfigs.map((item, idx) => (
                    <tr key={idx}>
                      <td><code>{item.origin}</code></td>
                      <td>
                        <pre className="inline-pre">{Object.entries(item.responseHeaders)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join('\n')}</pre>
                      </td>
                      <td>
                        <button
                          className="remove-btn-small"
                          onClick={() => removeMultiOrigin(item.origin)}
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="tab-content">
          <h2>Wildcard vs 具体 Origin 对比</h2>
          <div className="comparison-grid">
            {wildcardComparison.map((item) => (
              <div
                key={item.type}
                className={`comparison-card ${!item.supported ? 'unsupported' : ''}`}
              >
                <div className="comparison-header">
                  <h3>{item.title}</h3>
                  {!item.supported && <span className="unsupported-badge">不支持</span>}
                </div>
                <p className="comparison-desc">{item.description}</p>

                <div className="comparison-section">
                  <h4>优点</h4>
                  <ul>
                    {item.advantages.map((a, i) => <li key={i}>✓ {a}</li>)}
                  </ul>
                </div>

                <div className="comparison-section">
                  <h4>缺点</h4>
                  <ul>
                    {item.disadvantages.map((d, i) => <li key={i}>✗ {d}</li>)}
                  </ul>
                </div>

                <div className="comparison-code">
                  <h4>示例配置</h4>
                  <pre>{item.codeExample}</pre>
                </div>
              </div>
            ))}
          </div>

          <div className="notes-section">
            <h3>重要说明</h3>
            <ul>
              <li>
                <strong>简单请求 vs 预检请求：</strong>
                GET/HEAD/POST + safelist 请求头 + safelist Content-Type = 简单请求
              </li>
              <li>
                <strong>safelist 方法：</strong>
                GET、HEAD、POST
              </li>
              <li>
                <strong>safelist 请求头：</strong>
                Accept、Accept-Language、Content-Language、Content-Type
              </li>
              <li>
                <strong>safelist Content-Type：</strong>
                application/x-www-form-urlencoded、multipart/form-data、text/plain
              </li>
              <li>
                <strong>Credentials 限制：</strong>
                当 withCredentials 为 true 时，Allow-Origin 不能使用 *
              </li>
              <li>
                <strong>Vary: Origin：</strong>
                当 Allow-Origin 为具体值时需要添加，避免缓存冲突
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
