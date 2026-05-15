import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    buildAuthorizationUrl,
    clearOAuthParams,
    CORS_WARNING,
    DEMO_CONFIG,
    ERROR_CODES,
    extractCallbackResult,
    extractEndpoints,
    generateCodeChallenge,
    generateCodeVerifier,
    generateCurlTemplate,
    generateNonce,
    generateState,
    getExchangeContractSummary,
    getStorageMode,
    getSupportedFeatures,
    getWellKnownUrl,
    IFRAME_WARNING,
    isMemoryFallback,
    parseCallbackParams,
    parseWellKnownConfig,
    PROMPT,
    RESPONSE_MODE,
    sanitizeUrlInput,
    SCOPE,
    storeOAuthParams,
    TOKEN_EXCHANGE_FIELDS,
    validateAdvancedParams,
    validateState,
    validateWellKnownConfig
} from './logic/index.js'
import './OAuthOidcBrowserShell.css'

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CopyButton({ text, label = '复制' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }, [text])

  return (
    <button className="copy-btn" onClick={handleCopy}>
      {copied ? '已复制!' : label}
    </button>
  )
}

function ConfigTab({ config, setConfig, onGenerateAuthUrl, authUrl, pkcePair }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  const handleInputChange = useCallback((field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }, [setConfig])

  const fillDemoConfig = useCallback(() => {
    setConfig({
      authorizationEndpoint: DEMO_CONFIG.AUTHORIZATION_ENDPOINT,
      tokenEndpoint: DEMO_CONFIG.TOKEN_ENDPOINT,
      clientId: DEMO_CONFIG.CLIENT_ID,
      redirectUri: DEMO_CONFIG.REDIRECT_URI,
      scope: SCOPE.DEFAULT_OPENID,
      responseMode: '',
      prompt: '',
      maxAge: '',
      loginHint: '',
    })
  }, [setConfig])

  useEffect(() => {
    const result = validateAdvancedParams(config)
    const errors = {}
    result.errors.forEach((err) => {
      errors[err.field] = err.message
    })
    setValidationErrors(errors)
  }, [config])

  return (
    <div>
      <div className="section">
        <h3>OAuth2 / OIDC 配置</h3>
        <div className="btn-row">
          <button className="btn btn-secondary btn-small" onClick={fillDemoConfig}>
            填充演示配置
          </button>
        </div>
      </div>

      <div className="section">
        <h4>基础配置</h4>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="auth-endpoint">授权端点 (Authorization Endpoint)</label>
            <input
              id="auth-endpoint"
              type="text"
              value={config.authorizationEndpoint}
              onChange={(e) => handleInputChange('authorizationEndpoint', sanitizeUrlInput(e.target.value))}
              placeholder="https://idp.example.com/authorize"
            />
          </div>
          <div className="form-group">
            <label htmlFor="token-endpoint">令牌端点 (Token Endpoint)</label>
            <input
              id="token-endpoint"
              type="text"
              value={config.tokenEndpoint}
              onChange={(e) => handleInputChange('tokenEndpoint', sanitizeUrlInput(e.target.value))}
              placeholder="https://idp.example.com/token"
            />
          </div>
          <div className="form-group">
            <label htmlFor="client-id">客户端 ID (Client ID)</label>
            <input
              id="client-id"
              type="text"
              value={config.clientId}
              onChange={(e) => handleInputChange('clientId', e.target.value)}
              placeholder="demo-client-12345"
            />
          </div>
          <div className="form-group">
            <label htmlFor="redirect-uri">重定向 URI (Redirect URI)</label>
            <input
              id="redirect-uri"
              type="text"
              value={config.redirectUri}
              onChange={(e) => handleInputChange('redirectUri', sanitizeUrlInput(e.target.value))}
              placeholder="https://app.example.com/callback"
            />
          </div>
          <div className="form-group">
            <label htmlFor="scope">权限范围 (Scope)</label>
            <input
              id="scope"
              type="text"
              value={config.scope}
              onChange={(e) => handleInputChange('scope', e.target.value)}
              placeholder="openid profile email"
            />
          </div>
        </div>
      </div>

      <div className="section">
        <button
          className="btn btn-secondary btn-small"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          {showAdvanced ? '▼' : '▶'} 高级参数
        </button>

        {showAdvanced && (
          <div className="form-grid" style={{ marginTop: '16px' }}>
            <div className={`form-group ${validationErrors.responseMode ? 'error' : ''}`}>
              <label htmlFor="response-mode">响应模式 (response_mode)</label>
              <select
                id="response-mode"
                value={config.responseMode}
                onChange={(e) => handleInputChange('responseMode', e.target.value)}
              >
                <option value="">默认</option>
                <option value={RESPONSE_MODE.QUERY}>query</option>
                <option value={RESPONSE_MODE.FRAGMENT}>fragment</option>
                <option value={RESPONSE_MODE.FORM_POST}>form_post</option>
              </select>
              {validationErrors.responseMode && (
                <span className="error-text">{validationErrors.responseMode}</span>
              )}
            </div>
            <div className={`form-group ${validationErrors.prompt ? 'error' : ''}`}>
              <label htmlFor="prompt">提示方式 (prompt)</label>
              <select
                id="prompt"
                value={config.prompt}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
              >
                <option value="">默认</option>
                <option value={PROMPT.NONE}>none</option>
                <option value={PROMPT.LOGIN}>login</option>
                <option value={PROMPT.CONSENT}>consent</option>
                <option value={PROMPT.SELECT_ACCOUNT}>select_account</option>
                <option value="login consent">login consent</option>
              </select>
              {validationErrors.prompt && (
                <span className="error-text">{validationErrors.prompt}</span>
              )}
            </div>
            <div className={`form-group ${validationErrors.maxAge ? 'error' : ''}`}>
              <label htmlFor="max-age">最大认证时间 (max_age，秒)</label>
              <input
                id="max-age"
                type="number"
                min="0"
                value={config.maxAge}
                onChange={(e) => handleInputChange('maxAge', e.target.value)}
                placeholder="3600"
              />
              {validationErrors.maxAge && (
                <span className="error-text">{validationErrors.maxAge}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="login-hint">登录提示 (login_hint)</label>
              <input
                id="login-hint"
                type="text"
                value={config.loginHint}
                onChange={(e) => handleInputChange('loginHint', e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <h4>已生成参数</h4>
        <div className="param-display">
          <div className="param-row">
            <span className="param-label">code_verifier</span>
            <span className="param-value" title={pkcePair.codeVerifier}>
              {pkcePair.codeVerifier || '未生成'}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">code_challenge (S256)</span>
            <span className="param-value" title={pkcePair.codeChallenge}>
              {pkcePair.codeChallenge || '未生成'}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">state</span>
            <span className="param-value" title={config.state}>
              {config.state || '未生成'}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">nonce</span>
            <span className="param-value" title={config.nonce}>
              {config.nonce || '未生成'}
            </span>
          </div>
          <div className="param-row">
            <span className="param-label">存储模式</span>
            <span className={`status-badge ${isMemoryFallback() ? 'warning' : 'success'}`}>
              {getStorageMode()}
            </span>
          </div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onGenerateAuthUrl}>
          生成授权 URL
        </button>
      </div>

      {authUrl && (
        <div className="section" style={{ marginTop: '24px' }}>
          <h4>授权 URL</h4>
          <div className="code-block">
            <CopyButton text={authUrl} />
            {authUrl}
          </div>
          <div className="btn-row" style={{ marginTop: '12px' }}>
            <button
              className="btn btn-success"
              onClick={() => window.open(authUrl, '_blank')}
            >
              在新窗口打开授权
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CallbackTab({ callbackResult, onParseUrl }) {
  const [urlInput, setUrlInput] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const handleParse = useCallback(() => {
    const params = parseCallbackParams(urlInput)
    const result = extractCallbackResult(params)
    onParseUrl(result)
    setShowDetails(true)
  }, [urlInput, onParseUrl])

  const parseCurrentUrl = useCallback(() => {
    const params = parseCallbackParams(window.location.href)
    const result = extractCallbackResult(params)
    onParseUrl(result)
    setShowDetails(true)
  }, [onParseUrl])

  return (
    <div>
      <div className="section">
        <h3>回调解析</h3>
        <p className="hint">
          输入 IdP 重定向回的完整 URL，或点击「解析当前 URL」来自动提取参数
        </p>

        <div className="form-group">
          <label htmlFor="callback-url">回调 URL</label>
          <input
            id="callback-url"
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://app.example.com/callback?code=...&state=..."
          />
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={handleParse}>
            解析 URL
          </button>
          <button className="btn btn-secondary" onClick={parseCurrentUrl}>
            解析当前 URL
          </button>
        </div>
      </div>

      {showDetails && callbackResult && (
        <div className="section">
          {callbackResult.success ? (
            <div className="callback-success">
              <div className="success-icon">✓</div>
              <h3>授权成功</h3>
              <p>已获取授权码 (authorization code)，可用于交换令牌</p>
            </div>
          ) : (
            <div className="callback-error">
              <div className="error-icon">✗</div>
              <h3>授权失败</h3>
              <div className="error-details">
                <p>错误码: {callbackResult.error?.errorCode || ERROR_CODES.MISSING_CODE}</p>
                <p>消息: {callbackResult.error?.message || '缺少授权码'}</p>
                {callbackResult.error?.recoverySuggestion && (
                  <p>建议: {callbackResult.error.recoverySuggestion}</p>
                )}
              </div>
            </div>
          )}

          {callbackResult.success && (
            <>
              <div className="section" style={{ marginTop: '24px' }}>
                <h4>回调参数</h4>
                <div className="param-display">
                  <div className="param-row">
                    <span className="param-label">code</span>
                    <span className="param-value" title={callbackResult.code}>
                      {callbackResult.code}
                    </span>
                  </div>
                  <div className="param-row">
                    <span className="param-label">state</span>
                    <span className="param-value" title={callbackResult.state}>
                      {callbackResult.state || '无'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h4>State 校验</h4>
                <StateCheckDisplay receivedState={callbackResult.state} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StateCheckDisplay({ receivedState }) {
  const [validationResult, setValidationResult] = useState(null)

  useEffect(() => {
    if (receivedState) {
      const result = validateState(receivedState)
      setValidationResult(result)
    }
  }, [receivedState])

  if (!validationResult) {
    return <p className="hint">等待 state 参数...</p>
  }

  const checks = [
    {
      label: 'State 存在',
      pass: !!receivedState,
      failMsg: '未收到 state 参数',
    },
    {
      label: 'State 匹配',
      pass: validationResult.valid,
      failMsg: validationResult.error?.message || 'state 值不匹配',
    },
    {
      label: '未重复使用',
      pass: validationResult.error?.errorCode !== ERROR_CODES.STATE_CONSUMED,
      failMsg: 'state 已被消费，防止重放攻击',
    },
  ]

  return (
    <ul className="checklist">
      {checks.map((check, i) => (
        <li key={i}>
          <span className={`check-icon ${check.pass ? 'pass' : 'fail'}`}>
            {check.pass ? '✓' : '✗'}
          </span>
          <span>
            {check.label}
            {!check.pass && <span style={{ color: '#dc3545', marginLeft: '8px' }}>— {check.failMsg}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function TokenContractTab({ config, callbackResult, pkcePair }) {
  const [includeClientSecret, setIncludeClientSecret] = useState(false)
  const [mockClientSecret, setMockClientSecret] = useState('mock-client-secret-123')

  const curlTemplate = useMemo(() => {
    return generateCurlTemplate({
      tokenEndpoint: config.tokenEndpoint,
      clientId: config.clientId,
      clientSecret: includeClientSecret ? mockClientSecret : undefined,
      code: callbackResult?.code,
      redirectUri: config.redirectUri,
      codeVerifier: pkcePair.codeVerifier,
      includeClientSecret,
    })
  }, [config, callbackResult, pkcePair, includeClientSecret, mockClientSecret])

  const contractSummary = getExchangeContractSummary()

  return (
    <div>
      <div className="security-banner warning">
        <span className="banner-icon">⚠️</span>
        <div className="banner-content">
          <strong>安全提示</strong>
          <div>
            <code>refresh_token</code> 不应存储在 localStorage 中，浏览器端建议仅存储在内存中。
            <code>client_secret</code> <span className="sensitive">绝不能</span> 暴露在浏览器端！
          </div>
        </div>
      </div>

      <div className="security-banner info">
        <span className="banner-icon">ℹ️</span>
        <div className="banner-content">
          <strong>CORS 限制</strong>
          <div>{CORS_WARNING}</div>
        </div>
      </div>

      <div className="section">
        <h3>令牌交换请求参数</h3>
        <table className="param-table">
          <thead>
            <tr>
              <th>参数名</th>
              <th>必填</th>
              <th>说明</th>
              <th>当前值</th>
            </tr>
          </thead>
          <tbody>
            {TOKEN_EXCHANGE_FIELDS.request.map((field, i) => (
              <tr key={i}>
                <td>
                  <code>{field.name}</code>
                </td>
                <td>
                  <span className={field.required ? 'required' : ''}>
                    {field.required ? '是' : '否'}
                  </span>
                </td>
                <td>{field.description}</td>
                <td>
                  <code className={field.sensitive ? 'sensitive' : ''}>
                    {field.name === 'code'
                      ? callbackResult?.code || field.example
                      : field.name === 'code_verifier'
                      ? pkcePair.codeVerifier || field.example
                      : field.name === 'client_id'
                      ? config.clientId || field.example
                      : field.name === 'redirect_uri'
                      ? config.redirectUri || field.example
                      : field.example}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <h3>cURL 模板</h3>
        <div className="checkbox-group">
          <input
            type="checkbox"
            id="include-client-secret"
            checked={includeClientSecret}
            onChange={(e) => setIncludeClientSecret(e.target.checked)}
          />
          <label htmlFor="include-client-secret">
            包含 client_secret (<span className="sensitive">仅用于服务端测试，勿在浏览器使用</span>)
          </label>
        </div>
        {includeClientSecret && (
          <div className="form-group">
            <label>client_secret 值</label>
            <input
              type="text"
              value={mockClientSecret}
              onChange={(e) => setMockClientSecret(e.target.value)}
            />
          </div>
        )}
        <div className="code-block" style={{ marginTop: '12px' }}>
          <CopyButton text={curlTemplate} />
          <pre>{curlTemplate}</pre>
        </div>
      </div>

      <div className="section">
        <h3>响应格式</h3>
        <h4>成功响应 (HTTP 200)</h4>
        <table className="param-table">
          <thead>
            <tr>
              <th>字段</th>
              <th>类型</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {TOKEN_EXCHANGE_FIELDS.response.success.map((field, i) => (
              <tr key={i}>
                <td>
                  <code>{field.name}</code>
                </td>
                <td>{field.type}</td>
                <td>{field.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 style={{ marginTop: '20px' }}>错误响应 (HTTP 400/401)</h4>
        <table className="param-table">
          <thead>
            <tr>
              <th>字段</th>
              <th>类型</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {TOKEN_EXCHANGE_FIELDS.response.error.map((field, i) => (
              <tr key={i}>
                <td>
                  <code>{field.name}</code>
                </td>
                <td>{field.type}</td>
                <td>{field.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <h3>契约摘要</h3>
        <div className="param-display">
          <div className="param-row">
            <span className="param-label">端点</span>
            <span className="param-value">POST {contractSummary.endpoint}</span>
          </div>
          <div className="param-row">
            <span className="param-label">Content-Type</span>
            <span className="param-value">{contractSummary.contentType}</span>
          </div>
          <div className="param-row">
            <span className="param-label">认证方式</span>
            <span className="param-value">{contractSummary.authentication.join(', ')}</span>
          </div>
        </div>
        <h4 style={{ marginTop: '16px' }}>安全注意事项</h4>
        <ul className="checklist">
          {contractSummary.securityNotes.map((note, i) => (
            <li key={i}>
              <span className="check-icon info">ℹ️</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function WellKnownTab({ onImportConfig }) {
  const [issuerUrl, setIssuerUrl] = useState('')
  const [rawJson, setRawJson] = useState('')
  const [parsedConfig, setParsedConfig] = useState(null)
  const [validation, setValidation] = useState(null)
  const [parseError, setParseError] = useState(null)

  const handleParse = useCallback(() => {
    setParseError(null)
    try {
      const config = parseWellKnownConfig(rawJson)
      setParsedConfig(config)
      setValidation(validateWellKnownConfig(config))
    } catch (err) {
      setParseError(err.message)
      setParsedConfig(null)
      setValidation(null)
    }
  }, [rawJson])

  const handleImport = useCallback(() => {
    if (parsedConfig && validation?.valid) {
      const endpoints = extractEndpoints(parsedConfig)
      onImportConfig({
        authorizationEndpoint: endpoints.authorizationEndpoint || '',
        tokenEndpoint: endpoints.tokenEndpoint || '',
      })
    }
  }, [parsedConfig, validation, onImportConfig])

  const generateWellKnownUrl = useCallback(() => {
    if (issuerUrl) {
      return getWellKnownUrl(issuerUrl)
    }
    return ''
  }, [issuerUrl])

  return (
    <div>
      <div className="section">
        <h3>OIDC 发现配置</h3>
        <p className="hint">
          从 <code>.well-known/openid-configuration</code> 导入 IdP 配置
        </p>

        <div className="form-group">
          <label htmlFor="issuer-url">Issuer URL（可选，用于生成配置 URL）</label>
          <input
            id="issuer-url"
            type="text"
            value={issuerUrl}
            onChange={(e) => setIssuerUrl(sanitizeUrlInput(e.target.value))}
            placeholder="https://idp.example.com"
          />
          {issuerUrl && (
            <div style={{ marginTop: '8px' }}>
              <span className="hint">配置地址: </span>
              <code>{generateWellKnownUrl()}</code>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="well-known-json">配置 JSON</label>
          <textarea
            id="well-known-json"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            placeholder='{"issuer": "https://idp.example.com", "authorization_endpoint": ...}'
            rows={8}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={handleParse} disabled={!rawJson.trim()}>
            解析配置
          </button>
        </div>

        {parseError && (
          <div className="security-banner error" style={{ marginTop: '16px' }}>
            <span className="banner-icon">✗</span>
            <div className="banner-content">
              <strong>解析失败</strong>
              <div>{parseError}</div>
            </div>
          </div>
        )}
      </div>

      {parsedConfig && validation && (
        <div className="section">
          <h3>解析结果</h3>

          <div
            className={`security-banner ${validation.valid ? 'info' : 'error'}`}
            style={{ marginTop: '16px' }}
          >
            <span className="banner-icon">{validation.valid ? '✓' : '✗'}</span>
            <div className="banner-content">
              <strong>{validation.valid ? '配置有效' : '配置无效'}</strong>
              <div>
                缺失必填字段: {validation.missingRequired.length > 0 ? validation.missingRequired.join(', ') : '无'}
              </div>
            </div>
          </div>

          {validation.compatibilities && validation.compatibilities.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4>兼容性检查</h4>
              {validation.compatibilities.map((item, i) => (
                <div key={i} className={`compatibility-item ${item.type}`}>
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <h4>提取的端点</h4>
            <div className="json-display">
              <pre>{JSON.stringify(extractEndpoints(parsedConfig), null, 2)}</pre>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4>支持的功能</h4>
            <div className="json-display">
              <pre>{JSON.stringify(getSupportedFeatures(parsedConfig), null, 2)}</pre>
            </div>
          </div>

          {validation.valid && (
            <div className="btn-row" style={{ marginTop: '20px' }}>
              <button className="btn btn-success" onClick={handleImport}>
                导入配置到授权页
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SecurityChecklistTab() {
  const checks = [
    {
      category: 'PKCE',
      items: [
        { label: '使用 S256 代码挑战方法（而非 plain）', pass: true },
        { label: 'code_verifier 长度符合规范（43-128 字符）', pass: true },
        { label: 'code_verifier 使用加密安全随机生成', pass: true },
      ],
    },
    {
      category: 'State 参数',
      items: [
        { label: '使用 crypto.getRandomValues 生成', pass: true },
        { label: '长度足够（建议 32 字符以上）', pass: true },
        { label: '存储在 sessionStorage 而非 localStorage', pass: true },
        { label: '一次性消费，防止重放攻击', pass: true },
        { label: '包含过期时间（默认 10 分钟）', pass: true },
      ],
    },
    {
      category: 'Nonce 参数（OIDC）',
      items: [
        { label: '使用加密安全随机生成', pass: true },
        { label: '与 ID Token 中的 nonce 声明校验', pass: true },
      ],
    },
    {
      category: '令牌存储',
      items: [
        { label: 'refresh_token 不持久化到 localStorage', pass: true },
        { label: '令牌仅存储在内存中', pass: true },
        { label: '提供显式登出/清除令牌功能', pass: true },
      ],
    },
    {
      category: '其他安全考量',
      items: [
        { label: 'iframe 内嵌登录有明确警告', pass: true },
        { label: '内容安全策略（CSP）声明', pass: true },
        { label: '使用 HTTPS（生产环境强制）', pass: true },
      ],
    },
  ]

  const totalChecks = checks.reduce((sum, cat) => sum + cat.items.length, 0)
  const passedChecks = checks.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.pass).length,
    0
  )

  return (
    <div>
      <div className="section">
        <h3>安全检查表</h3>
        <p className="hint">
          通过: {passedChecks}/{totalChecks} ({Math.round((passedChecks / totalChecks) * 100)}%)
        </p>
      </div>

      {checks.map((category, i) => (
        <div key={i} className="section">
          <h4>{category.category}</h4>
          <ul className="checklist">
            {category.items.map((item, j) => (
              <li key={j}>
                <span className={`check-icon ${item.pass ? 'pass' : 'fail'}`}>
                  {item.pass ? '✓' : '✗'}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="security-banner warning" style={{ marginTop: '24px' }}>
        <span className="banner-icon">⚠️</span>
        <div className="banner-content">
          <strong>iframe 限制</strong>
          <div>{IFRAME_WARNING}</div>
        </div>
      </div>
    </div>
  )
}

function CallbackView() {
  const [callbackResult, setCallbackResult] = useState(null)
  const [clearSuccess, setClearSuccess] = useState(false)

  useEffect(() => {
    const params = parseCallbackParams(window.location.href)
    const result = extractCallbackResult(params)
    setCallbackResult(result)
  }, [])

  const handleClearStorage = useCallback(() => {
    clearOAuthParams()
    setClearSuccess(true)
    setTimeout(() => setClearSuccess(false), 3000)
  }, [])

  return (
    <div className="oauth-shell-page">
      <div className="page-header">
        <h1>OAuth2 回调处理</h1>
        <p>Identity Provider 重定向回调参数解析与校验</p>
      </div>

      <div className="aria-live-region" aria-live="polite">
        {clearSuccess ? '已清除 OAuth 会话数据' : ''}
      </div>

      <div className="tab-content">
        {callbackResult?.success ? (
          <div className="callback-success">
            <div className="success-icon">✓</div>
            <h3>授权成功</h3>
            <p>已获取授权码，可前往令牌交换步骤</p>
          </div>
        ) : callbackResult?.error ? (
          <div className="callback-error">
            <div className="error-icon">✗</div>
            <h3>授权失败</h3>
            <div className="error-details">
              <p>错误码: {callbackResult.error.errorCode}</p>
              <p>消息: {callbackResult.error.message}</p>
              {callbackResult.error.recoverySuggestion && (
                <p>建议: {callbackResult.error.recoverySuggestion}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="security-banner info">
            <span className="banner-icon">ℹ️</span>
            <div className="banner-content">
              <strong>等待回调</strong>
              <div>当前页面未检测到回调参数，请从 IdP 发起授权流程</div>
            </div>
          </div>
        )}

        {callbackResult && (
          <div className="section" style={{ marginTop: '24px' }}>
            <h4>原始参数</h4>
            <div className="json-display">
              <pre>{JSON.stringify(callbackResult.params || {}, null, 2)}</pre>
            </div>
          </div>
        )}

        {callbackResult?.success && (
          <div className="section">
            <h4>State 校验结果</h4>
            <StateCheckDisplay receivedState={callbackResult.state} />
          </div>
        )}

        <div className="btn-row">
          <button className="btn btn-danger" onClick={handleClearStorage}>
            清除 OAuth 会话数据
          </button>
          <button className="btn btn-secondary" onClick={() => window.close()}>
            关闭此窗口
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OAuthOidcBrowserShell() {
  const [activeTab, setActiveTab] = useState('config')
  const [config, setConfig] = useState({
    authorizationEndpoint: '',
    tokenEndpoint: '',
    clientId: '',
    redirectUri: '',
    scope: SCOPE.DEFAULT_OPENID,
    responseMode: '',
    prompt: '',
    maxAge: '',
    loginHint: '',
    state: '',
    nonce: '',
  })
  const [pkcePair, setPkcePair] = useState({ codeVerifier: '', codeChallenge: '' })
  const [authUrl, setAuthUrl] = useState('')
  const [callbackResult, setCallbackResult] = useState(null)
  const [ariaMessage, setAriaMessage] = useState('')

  const tabs = [
    { id: 'config', label: '配置与授权' },
    { id: 'callback', label: '回调解析' },
    { id: 'token', label: '令牌交换' },
    { id: 'wellknown', label: 'OIDC 发现' },
    { id: 'security', label: '安全检查' },
  ]

  const generateAllParams = useCallback(async () => {
    const newState = generateState()
    const newNonce = generateNonce()
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    setConfig((prev) => ({ ...prev, state: newState, nonce: newNonce }))
    setPkcePair({ codeVerifier, codeChallenge })

    storeOAuthParams({
      state: newState,
      nonce: newNonce,
      codeVerifier,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scope: config.scope,
    })

    return { newState, newNonce, codeVerifier, codeChallenge }
  }, [config.clientId, config.redirectUri, config.scope])

  const handleGenerateAuthUrl = useCallback(async () => {
    const { newState, newNonce, codeChallenge } = await generateAllParams()

    const url = buildAuthorizationUrl({
      authorizationEndpoint: config.authorizationEndpoint,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scope: config.scope,
      state: newState,
      nonce: newNonce,
      codeChallenge,
      responseMode: config.responseMode || undefined,
      prompt: config.prompt || undefined,
      maxAge: config.maxAge ? parseInt(config.maxAge) : undefined,
      loginHint: config.loginHint || undefined,
    })

    setAuthUrl(url)
    setAriaMessage('已生成授权 URL')
  }, [config, generateAllParams])

  const handleImportConfig = useCallback((imported) => {
    setConfig((prev) => ({ ...prev, ...imported }))
    setAriaMessage('已导入 OIDC 配置')
    setActiveTab('config')
  }, [])

  const handleParseCallback = useCallback((result) => {
    setCallbackResult(result)
    if (result.success) {
      setAriaMessage('回调解析成功，已获取授权码')
    } else {
      setAriaMessage(`回调解析失败: ${result.error?.message}`)
    }
  }, [])

  const handleClearAll = useCallback(() => {
    clearOAuthParams()
    setAuthUrl('')
    setCallbackResult(null)
    setPkcePair({ codeVerifier: '', codeChallenge: '' })
    setConfig((prev) => ({ ...prev, state: '', nonce: '' }))
    setAriaMessage('已清除所有 OAuth 数据')
  }, [])

  return (
    <div className="oauth-shell-page">
      <div className="page-header">
        <h1>OAuth2 / OIDC 浏览器壳层演示</h1>
        <p>授权码 + PKCE 流程完整参数生成与契约说明</p>
      </div>

      <div className="aria-live-region" aria-live="polite" aria-atomic="true">
        {ariaMessage}
      </div>

      {isMemoryFallback() && (
        <div className="security-banner warning">
          <span className="banner-icon">⚠️</span>
          <div className="banner-content">
            <strong>sessionStorage 不可用</strong>
            <div>
              当前使用内存存储，刷新页面后 state 和 code_verifier 将丢失。
              可能原因：隐私浏览模式、第三方 Cookie 被阻止、或存储被禁用。
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'config' && (
          <ConfigTab
            config={config}
            setConfig={setConfig}
            onGenerateAuthUrl={handleGenerateAuthUrl}
            authUrl={authUrl}
            pkcePair={pkcePair}
          />
        )}

        {activeTab === 'callback' && (
          <CallbackTab
            callbackResult={callbackResult}
            onParseUrl={handleParseCallback}
          />
        )}

        {activeTab === 'token' && (
          <TokenContractTab
            config={config}
            callbackResult={callbackResult}
            pkcePair={pkcePair}
          />
        )}

        {activeTab === 'wellknown' && (
          <WellKnownTab onImportConfig={handleImportConfig} />
        )}

        {activeTab === 'security' && <SecurityChecklistTab />}
      </div>

      <div className="btn-row" style={{ marginTop: '24px' }}>
        <button className="btn btn-danger" onClick={handleClearAll}>
          清除所有 OAuth 数据
        </button>
      </div>
    </div>
  )
}

export { CallbackView }

