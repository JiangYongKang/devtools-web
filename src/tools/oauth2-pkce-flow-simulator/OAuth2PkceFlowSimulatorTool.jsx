import { useCallback, useEffect, useState } from 'react'
import {
  generateCodeVerifier,
  isValidCodeVerifier,
  computeCodeChallengeWithSteps,
  generateCodeChallenge,
  MIN_VERIFIER_LENGTH,
  MAX_VERIFIER_LENGTH,
} from './logic/pkce.js'
import {
  generateRandomState,
  buildAuthorizationUrl,
  parseCallbackUrl,
  compareStates,
  buildTokenRequestBody,
  buildTokenFetchTemplate,
  EXAMPLE_FLOW,
} from './logic/oauth.js'
import './OAuth2PkceFlowSimulatorTool.css'

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default function OAuth2PkceFlowSimulatorTool() {
  const [activeStep, setActiveStep] = useState(0)
  const [copyStatus, setCopyStatus] = useState(null)

  const [codeVerifier, setCodeVerifier] = useState('')
  const [codeChallenge, setCodeChallenge] = useState('')
  const [challengeMethod, setChallengeMethod] = useState('S256')
  const [challengeSteps, setChallengeSteps] = useState([])
  const [manualVerifier, setManualVerifier] = useState('')

  const [clientId, setClientId] = useState(EXAMPLE_FLOW.clientId)
  const [redirectUri, setRedirectUri] = useState(EXAMPLE_FLOW.redirectUri)
  const [scope, setScope] = useState(EXAMPLE_FLOW.scope)
  const [authorizationEndpoint, setAuthorizationEndpoint] = useState(
    EXAMPLE_FLOW.authorizationEndpoint
  )
  const [state, setState] = useState('')
  const [nonce, setNonce] = useState('')
  const [authUrlResult, setAuthUrlResult] = useState(null)

  const [callbackInput, setCallbackInput] = useState('')
  const [callbackResult, setCallbackResult] = useState(null)
  const [stateComparison, setStateComparison] = useState(null)

  const [tokenEndpoint, setTokenEndpoint] = useState(EXAMPLE_FLOW.tokenEndpoint)
  const [tokenRequestBody, setTokenRequestBody] = useState(null)
  const [tokenFetchTemplate, setTokenFetchTemplate] = useState(null)

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
        setCopyStatus({
          type: 'error',
          message: `复制失败：${err?.message || '未知错误'}`,
        })
      }
      document.body.removeChild(textarea)
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

  const handleGenerateVerifier = useCallback(() => {
    const verifier = generateCodeVerifier(64)
    setCodeVerifier(verifier)
    setCodeChallenge('')
    setChallengeSteps([])
  }, [])

  const handleGenerateChallenge = useCallback(async () => {
    if (!codeVerifier) return

    if (challengeMethod === 'S256') {
      const result = await computeCodeChallengeWithSteps(codeVerifier)
      setCodeChallenge(result.challenge)
      setChallengeSteps(result.steps)
    } else {
      const result = await generateCodeChallenge(codeVerifier, 'plain')
      setCodeChallenge(result.challenge)
      setChallengeSteps([
        {
          step: 1,
          title: 'Plain 模式',
          description: '直接使用 code_verifier 作为 code_challenge',
          value: result.challenge,
        },
      ])
    }
  }, [codeVerifier, challengeMethod])

  const handleVerifyVerifier = useCallback(async () => {
    if (!manualVerifier) return

    const isValid = isValidCodeVerifier(manualVerifier)
    if (!isValid) {
      alert(
        `无效的 code_verifier\n\n必须满足：\n- 长度 ${MIN_VERIFIER_LENGTH}-${MAX_VERIFIER_LENGTH} 字符\n- 仅包含字母、数字和 -._~ 字符`
      )
      return
    }

    const result = await computeCodeChallengeWithSteps(manualVerifier)
    setCodeChallenge(result.challenge)
    setChallengeSteps(result.steps)
    alert(`计算完成！\n\ncode_challenge = ${result.challenge}`)
  }, [manualVerifier])

  const handleGenerateState = useCallback(() => {
    setState(generateRandomState())
  }, [])

  const handleGenerateNonce = useCallback(() => {
    setNonce(generateRandomState())
  }, [])

  const handleBuildAuthUrl = useCallback(() => {
    if (!authorizationEndpoint || !clientId || !redirectUri) {
      alert('请填写 authorization_endpoint、client_id 和 redirect_uri')
      return
    }

    const result = buildAuthorizationUrl({
      authorizationEndpoint,
      clientId,
      redirectUri,
      scope,
      state,
      nonce,
      codeChallenge,
      codeChallengeMethod: challengeMethod,
    })
    setAuthUrlResult(result)
  }, [authorizationEndpoint, clientId, redirectUri, scope, state, nonce, codeChallenge, challengeMethod])

  const handleParseCallback = useCallback(() => {
    if (!callbackInput.trim()) return

    const result = parseCallbackUrl(callbackInput)
    setCallbackResult(result)

    if (result.state || state) {
      const comparison = compareStates(state, result.state)
      setStateComparison(comparison)
    } else {
      setStateComparison(null)
    }

    if (result.hasCode && result.code) {
      const tokenBody = buildTokenRequestBody({
        code: result.code,
        redirectUri,
        clientId,
        codeVerifier,
      })
      setTokenRequestBody(tokenBody)

      const fetchTemplate = buildTokenFetchTemplate({
        tokenEndpoint,
        body: tokenBody.body,
        contentType: tokenBody.contentType,
      })
      setTokenFetchTemplate(fetchTemplate)
    } else {
      setTokenRequestBody(null)
      setTokenFetchTemplate(null)
    }
  }, [callbackInput, state, redirectUri, clientId, codeVerifier, tokenEndpoint])

  const handleLoadExample = useCallback(() => {
    const exampleCallback = `https://example.com/callback?code=SampleAuthCode123&state=${state || 'example-state-xyz'}`
    setCallbackInput(exampleCallback)
  }, [state])

  const handleFillExample = useCallback(() => {
    setClientId(EXAMPLE_FLOW.clientId)
    setRedirectUri(EXAMPLE_FLOW.redirectUri)
    setScope(EXAMPLE_FLOW.scope)
    setAuthorizationEndpoint(EXAMPLE_FLOW.authorizationEndpoint)
    setTokenEndpoint(EXAMPLE_FLOW.tokenEndpoint)
    handleGenerateState()
    handleGenerateNonce()
    handleGenerateVerifier()
  }, [handleGenerateState, handleGenerateNonce, handleGenerateVerifier])

  useEffect(() => {
    if (codeVerifier) {
      handleGenerateChallenge()
    }
  }, [codeVerifier, challengeMethod, handleGenerateChallenge])

  const steps = [
    { id: 0, title: '1. PKCE 参数', icon: '🔑' },
    { id: 1, title: '2. 授权 URL', icon: '🔗' },
    { id: 2, title: '3. 回调解析', icon: '📥' },
    { id: 3, title: '4. Token 草稿', icon: '📝' },
  ]

  return (
    <div className="oauth2-pkce-simulator">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="stepper-header">
        {steps.map((step) => (
          <button
            key={step.id}
            className={`step-btn ${activeStep === step.id ? 'active' : ''} ${
              activeStep > step.id ? 'completed' : ''
            }`}
            onClick={() => setActiveStep(step.id)}
          >
            <span className="step-icon">{step.icon}</span>
            <span className="step-title">{step.title}</span>
          </button>
        ))}
      </div>

      {activeStep === 0 && (
        <section className="tool-section">
          <div className="section-header">
            <h2>PKCE 参数生成</h2>
            <button className="secondary-btn" onClick={handleFillExample}>
              一键填充示例
            </button>
          </div>

          <div className="card">
            <h3>code_verifier</h3>
            <p className="card-desc">
              43~128 位随机字符串，包含字母、数字和 -._~ 字符
            </p>

            <div className="input-row">
              <textarea
                className="code-input"
                value={codeVerifier}
                onChange={(e) => setCodeVerifier(e.target.value)}
                placeholder="点击下方按钮生成或手动输入..."
                rows={3}
              />
            </div>

            <div className="action-row">
              <button className="primary-btn" onClick={handleGenerateVerifier}>
                生成 code_verifier
              </button>
              <button
                className="secondary-btn"
                onClick={() => handleCopy(codeVerifier, 'code_verifier')}
                disabled={!codeVerifier}
              >
                复制
              </button>
            </div>

            {codeVerifier && (
              <div className="info-badge">
                长度：<strong>{codeVerifier.length}</strong> 字符
                {isValidCodeVerifier(codeVerifier) ? (
                  <span className="badge success">格式有效</span>
                ) : (
                  <span className="badge error">格式无效</span>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3>code_challenge</h3>
            <p className="card-desc">根据 code_verifier 计算得到的挑战值</p>

            <div className="method-selector">
              <label>
                <input
                  type="radio"
                  value="S256"
                  checked={challengeMethod === 'S256'}
                  onChange={(e) => setChallengeMethod(e.target.value)}
                />
                <span>S256 (推荐)</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="plain"
                  checked={challengeMethod === 'plain'}
                  onChange={(e) => setChallengeMethod(e.target.value)}
                />
                <span>Plain</span>
              </label>
            </div>

            {codeChallenge && (
              <div className="result-box">
                <div className="result-header">
                  <span className="result-label">code_challenge</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(codeChallenge, 'code_challenge')}
                  >
                    复制
                  </button>
                </div>
                <pre
                  className="result-value"
                  dangerouslySetInnerHTML={{ __html: escapeHtml(codeChallenge) }}
                />
              </div>
            )}

            {challengeSteps.length > 0 && (
              <div className="steps-display">
                <h4>计算步骤</h4>
                {challengeSteps.map((step) => (
                  <div key={step.step} className="step-item">
                    <div className="step-number">{step.step}</div>
                    <div className="step-content">
                      <div className="step-title">{step.title}</div>
                      <div className="step-desc">{step.description}</div>
                      {step.value && (
                        <pre className="step-value">
                          {step.value.length > 100
                            ? step.value.slice(0, 100) + '...'
                            : step.value}
                        </pre>
                      )}
                      {step.note && (
                        <div className="step-note">{step.note}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3>手动校验</h3>
            <p className="card-desc">
              粘贴现有 code_verifier，反算 code_challenge 进行校验
            </p>

            <div className="input-row">
              <textarea
                className="code-input"
                value={manualVerifier}
                onChange={(e) => setManualVerifier(e.target.value)}
                placeholder="粘贴 code_verifier 进行校验..."
                rows={3}
              />
            </div>

            <div className="action-row">
              <button
                className="primary-btn"
                onClick={handleVerifyVerifier}
                disabled={!manualVerifier}
              >
                计算并校验
              </button>
            </div>
          </div>
        </section>
      )}

      {activeStep === 1 && (
        <section className="tool-section">
          <div className="section-header">
            <h2>授权 URL 组装</h2>
            <button className="secondary-btn" onClick={handleFillExample}>
              一键填充示例
            </button>
          </div>

          <div className="card">
            <h3>配置参数</h3>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="auth-endpoint">authorization_endpoint</label>
                <input
                  id="auth-endpoint"
                  type="text"
                  value={authorizationEndpoint}
                  onChange={(e) => setAuthorizationEndpoint(e.target.value)}
                  placeholder="https://auth.example.com/authorize"
                />
              </div>

              <div className="form-group">
                <label htmlFor="client-id">client_id</label>
                <input
                  id="client-id"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="your-client-id"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="redirect-uri">redirect_uri</label>
                <input
                  id="redirect-uri"
                  type="text"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  placeholder="https://your-app.com/callback"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="scope">scope</label>
                <input
                  id="scope"
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="openid profile email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">state</label>
                <div className="input-with-btn">
                  <input
                    id="state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="随机生成或手动输入"
                  />
                  <button
                    className="input-btn"
                    onClick={handleGenerateState}
                    title="生成随机 state"
                  >
                    🎲
                  </button>
                  <button
                    className="input-btn"
                    onClick={() => handleCopy(state, 'state')}
                    disabled={!state}
                    title="复制"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="nonce">nonce (可选)</label>
                <div className="input-with-btn">
                  <input
                    id="nonce"
                    type="text"
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value)}
                    placeholder="随机生成或手动输入"
                  />
                  <button
                    className="input-btn"
                    onClick={handleGenerateNonce}
                    title="生成随机 nonce"
                  >
                    🎲
                  </button>
                  <button
                    className="input-btn"
                    onClick={() => handleCopy(nonce, 'nonce')}
                    disabled={!nonce}
                    title="复制"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            <div className="action-row">
              <button className="primary-btn" onClick={handleBuildAuthUrl}>
                生成授权 URL
              </button>
            </div>
          </div>

          {authUrlResult && (
            <div className="card">
              <h3>生成的授权 URL</h3>

              <div className="result-box">
                <div className="result-header">
                  <span className="result-label">完整 URL</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(authUrlResult.url, '授权 URL')}
                  >
                    复制
                  </button>
                </div>
                <pre
                  className="result-value url-value"
                  dangerouslySetInnerHTML={{ __html: escapeHtml(authUrlResult.url) }}
                />
              </div>

              <div className="params-list">
                <h4>参数明细</h4>
                <div className="param-header">
                  <span>Base URL</span>
                  <code>{authUrlResult.baseUrl}</code>
                </div>
                {authUrlResult.params.map((param, idx) => (
                  <div key={idx} className="param-item">
                    <span className={`param-tag ${param.isRequired ? 'required' : ''} ${
                      param.isSecurity ? 'security' : ''
                    }`}>
                      {param.isRequired && '必需 '}
                      {param.isSecurity && '安全 '}
                      {param.key}
                    </span>
                    <code
                      className="param-value"
                      dangerouslySetInnerHTML={{ __html: escapeHtml(param.value) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeStep === 2 && (
        <section className="tool-section">
          <h2>回调解析</h2>

          <div className="card">
            <h3>输入回调 URL</h3>
            <p className="card-desc">
              粘贴完整回调 URL 或仅 query 字符串，将自动解析 code、state、error 等参数
            </p>

            <div className="input-row">
              <textarea
                className="code-input"
                value={callbackInput}
                onChange={(e) => setCallbackInput(e.target.value)}
                placeholder="https://example.com/callback?code=xxx&state=yyy"
                rows={4}
              />
            </div>

            <div className="action-row">
              <button
                className="primary-btn"
                onClick={handleParseCallback}
                disabled={!callbackInput.trim()}
              >
                解析
              </button>
              <button className="secondary-btn" onClick={handleLoadExample}>
                加载示例
              </button>
            </div>
          </div>

          {callbackResult && (
            <div className="card">
              <h3>解析结果</h3>

              <div className={`status-box ${callbackResult.status}`}>
                <strong>
                  {callbackResult.status === 'success' && '✅ '}
                  {callbackResult.status === 'error' && '❌ '}
                  {callbackResult.status === 'warning' && '⚠️ '}
                  {callbackResult.statusMessage}
                </strong>
              </div>

              <div className="result-grid">
                <div className="result-item">
                  <span className="result-item-label">code</span>
                  <code
                    className={callbackResult.code ? '' : 'missing'}
                  >
                    {callbackResult.code || '(缺失)'}
                  </code>
                </div>

                <div className="result-item">
                  <span className="result-item-label">state</span>
                  <code className={callbackResult.state ? '' : 'missing'}>
                    {callbackResult.state || '(缺失)'}
                  </code>
                </div>

                {callbackResult.error && (
                  <>
                    <div className="result-item">
                      <span className="result-item-label">error</span>
                      <code className="error-value">
                        {callbackResult.error}
                      </code>
                    </div>
                    <div className="result-item">
                      <span className="result-item-label">error_description</span>
                      <code className="error-value">
                        {callbackResult.errorDescription || '(无)'}
                      </code>
                    </div>
                  </>
                )}
              </div>

              {stateComparison && (
                <div className="comparison-box">
                  <h4>state 比对</h4>
                  <div className={`state-result ${stateComparison.severity}`}>
                    <strong>{stateComparison.message}</strong>
                  </div>
                  <div className="state-values">
                    <div>
                      <span className="state-label">发起值:</span>
                      <code>{state || '(无)'}</code>
                    </div>
                    <div>
                      <span className="state-label">接收值:</span>
                      <code>{callbackResult.state || '(无)'}</code>
                    </div>
                  </div>
                </div>
              )}

              {!callbackResult.hasCode && !callbackResult.hasError && (
                <div className="warning-box">
                  <strong>缺少 code 参数说明：</strong>
                  <ul>
                    <li>可能是授权请求被用户取消</li>
                    <li>可能是授权服务器配置问题</li>
                    <li>检查 redirect_uri 是否与注册的一致</li>
                    <li>检查 response_type 是否为 'code'</li>
                  </ul>
                </div>
              )}

              {callbackResult.allParams.length > 0 && (
                <div className="all-params">
                  <h4>所有参数</h4>
                  <div className="param-grid">
                    {callbackResult.allParams.map((param, idx) => (
                      <div key={idx} className="param-row">
                        <span className="param-key">{param.key}</span>
                        <span
                          className="param-val"
                          dangerouslySetInnerHTML={{ __html: escapeHtml(param.value) }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeStep === 3 && (
        <section className="tool-section">
          <h2>Token 交换草稿</h2>

          {tokenRequestBody ? (
            <>
              <div className="card">
                <h3>请求 Body</h3>
                <p className="card-desc">
                  application/x-www-form-urlencoded 格式
                </p>

                <div className="result-box">
                  <div className="result-header">
                    <span className="result-label">Body 内容</span>
                    <button
                      className="copy-btn"
                      onClick={() => handleCopy(tokenRequestBody.body, 'Token Body')}
                    >
                      复制
                    </button>
                  </div>
                  <pre
                    className="result-value"
                    dangerouslySetInnerHTML={{ __html: escapeHtml(tokenRequestBody.body) }}
                  />
                </div>

                <div className="params-list">
                  <h4>参数明细</h4>
                  {tokenRequestBody.params.map((param, idx) => (
                    <div key={idx} className="param-item">
                      <span className={`param-tag ${param.isSensitive ? 'security' : ''}`}>
                        {param.isSensitive && '敏感 '}
                        {param.key}
                      </span>
                      <code className="param-value">
                        {param.isSensitive
                          ? param.value.slice(0, 8) + '...' + param.value.slice(-8)
                          : param.value}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {tokenFetchTemplate && (
                <div className="card">
                  <h3>代码模板</h3>

                  <div className="template-section">
                    <h4>Fetch API</h4>
                    <div className="result-box">
                      <div className="result-header">
                        <span className="result-label">JavaScript 代码</span>
                        <button
                          className="copy-btn"
                          onClick={() =>
                            handleCopy(tokenFetchTemplate.fetchTemplate, 'Fetch 模板')
                          }
                        >
                          复制
                        </button>
                      </div>
                      <pre
                        className="result-value code"
                        dangerouslySetInnerHTML={{ __html: escapeHtml(tokenFetchTemplate.fetchTemplate) }}
                      />
                    </div>
                  </div>

                  <div className="template-section">
                    <h4>cURL</h4>
                    <div className="result-box">
                      <div className="result-header">
                        <span className="result-label">命令行</span>
                        <button
                          className="copy-btn"
                          onClick={() =>
                            handleCopy(tokenFetchTemplate.curlTemplate, 'cURL 命令')
                          }
                        >
                          复制
                        </button>
                      </div>
                      <pre
                        className="result-value code"
                        dangerouslySetInnerHTML={{ __html: escapeHtml(tokenFetchTemplate.curlTemplate) }}
                      />
                    </div>
                  </div>

                  <div className="notes-list">
                    {tokenFetchTemplate.notes.map((note, idx) => (
                      <div key={idx} className={`note-item ${note.type}`}>
                        <strong>{note.title}</strong>
                        <p>{note.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <h3>说明</h3>
              <p className="card-desc">
                请先完成「回调解析」步骤，获取 authorization code 后，这里将自动生成 token 交换请求草稿。
              </p>
              <ul className="info-list">
                <li>使用 <strong>authorization_code</strong> 授权模式</li>
                <li>包含 <strong>code_verifier</strong> 用于 PKCE 校验</li>
                <li><strong>重要：</strong>Token 交换必须在后端或可信环境中完成</li>
                <li>前端仅用于 Public Client PKCE 演示</li>
                <li>绝不要在前端代码中暴露 client_secret</li>
              </ul>
              <button
                className="primary-btn"
                onClick={() => setActiveStep(2)}
              >
                前往回调解析 →
              </button>
            </div>
          )}
        </section>
      )}

      <div className="notes-section">
        <h3>OAuth 2.0 PKCE Flow 说明</h3>
        <ol>
          <li>
            <strong>生成 PKCE 参数：</strong>
            创建 code_verifier 并计算 code_challenge
          </li>
          <li>
            <strong>发起授权请求：</strong>
            将 code_challenge 与其他参数一起发送到授权端点
          </li>
          <li>
            <strong>用户授权：</strong>
            用户在授权服务器上登录并授权应用
          </li>
          <li>
            <strong>接收回调：</strong>
            授权服务器将 authorization code 发送到 redirect_uri
          </li>
          <li>
            <strong>交换 Token：</strong>
            使用 code + code_verifier 向 token 端点交换 access_token
          </li>
        </ol>
        <p className="note">
          💡 <strong>PKCE 的作用：</strong>
          防止授权码被拦截后滥用，确保只有原始请求者才能用 code 换取 token
        </p>
      </div>
    </div>
  )
}
