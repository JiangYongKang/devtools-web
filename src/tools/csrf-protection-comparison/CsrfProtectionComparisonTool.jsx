import { useCallback, useState, useMemo } from 'react'
import {
  CSRF_STRATEGIES,
  REQUEST_TYPES,
  SAME_SITE_VALUES,
  generateToken,
  evaluateStrategy,
  validateOrigin,
  generateChecklist,
  checklistToMarkdown,
  PRESET_SCENARIOS,
} from './logic/csrf.js'
import './CsrfProtectionComparisonTool.css'

const STRATEGY_INFO = {
  [CSRF_STRATEGIES.DOUBLE_SUBMIT_COOKIE]: {
    name: 'Double Submit Cookie',
    description: 'Cookie 中存储 Token，请求中携带相同 Token，服务端比对两者是否一致',
    icon: '🍪',
  },
  [CSRF_STRATEGIES.SYNCHRONIZER_TOKEN]: {
    name: 'Synchronizer Token',
    description: '服务端会话存储 Token，表单/请求中携带 Token，服务端与会话比对',
    icon: '🔐',
  },
  [CSRF_STRATEGIES.SAMESITE_COOKIE]: {
    name: 'SameSite Cookie',
    description: '通过 Cookie 的 SameSite 属性控制跨站请求是否携带 Cookie',
    icon: '🛡️',
  },
}

export default function CsrfProtectionComparisonTool() {
  const [activeTab, setActiveTab] = useState('comparison')
  const [activePreset, setActivePreset] = useState(null)

  const [cookieConfig, setCookieConfig] = useState({
    name: 'csrf_token',
    value: generateToken(),
    sameSite: SAME_SITE_VALUES.LAX,
    secure: true,
    httpOnly: true,
  })

  const [scenarioConfig, setScenarioConfig] = useState({
    strategy: CSRF_STRATEGIES.DOUBLE_SUBMIT_COOKIE,
    requestType: REQUEST_TYPES.LEGITIMATE,
    method: 'POST',
    cookieToken: cookieConfig.value,
    requestToken: cookieConfig.value,
    sessionToken: cookieConfig.value,
    cookieSent: true,
    isTopLevelNavigation: false,
    requireCustomHeader: false,
    customHeaderPresent: false,
  })

  const [originConfig, setOriginConfig] = useState({
    requestOrigin: 'https://example.com',
    referer: 'https://example.com/form',
    allowedOrigins: 'https://example.com\nhttps://api.example.com',
    allowMissingReferer: false,
  })

  const [checklistConfig, setChecklistConfig] = useState({
    useDoubleSubmit: true,
    useSynchronizerToken: false,
    sameSite: SAME_SITE_VALUES.LAX,
    secure: true,
    httpOnly: true,
    requireCustomHeader: false,
    checkOrigin: true,
    corsCorrect: true,
  })

  const [scenarioResult, setScenarioResult] = useState(null)
  const [originResult, setOriginResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

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

  const runScenario = useCallback(() => {
    const result = evaluateStrategy(scenarioConfig.strategy, {
      ...scenarioConfig,
      cookieToken: scenarioConfig.strategy === CSRF_STRATEGIES.DOUBLE_SUBMIT_COOKIE ? cookieConfig.value : scenarioConfig.cookieToken,
    })
    setScenarioResult(result)
  }, [scenarioConfig, cookieConfig.value])

  const runOriginCheck = useCallback(() => {
    const allowedOrigins = originConfig.allowedOrigins.split('\n').filter(o => o.trim())
    const result = validateOrigin(
      originConfig.requestOrigin || null,
      originConfig.referer || null,
      allowedOrigins,
      { allowMissingReferer: originConfig.allowMissingReferer }
    )
    setOriginResult(result)
  }, [originConfig])

  const loadPreset = useCallback((presetKey) => {
    const preset = PRESET_SCENARIOS[presetKey]
    if (preset) {
      setScenarioConfig(prev => ({
        ...prev,
        ...preset,
      }))
      if (preset.cookieToken) {
        setCookieConfig(prev => ({ ...prev, value: preset.cookieToken }))
      }
      setActivePreset(presetKey)
      setScenarioResult(null)
      setActiveTab('cookie')
    }
  }, [])

  const regenerateToken = useCallback(() => {
    const newToken = generateToken()
    setCookieConfig(prev => ({ ...prev, value: newToken }))
    setScenarioConfig(prev => ({
      ...prev,
      cookieToken: newToken,
      requestToken: newToken,
      sessionToken: newToken,
    }))
  }, [])

  const checklist = useMemo(() => generateChecklist(checklistConfig), [checklistConfig])
  const checklistMarkdown = useMemo(() => checklistToMarkdown(checklist, checklistConfig), [checklist, checklistConfig])

  const checklistScore = useMemo(() => {
    const passed = checklist.filter(item => item.checked).length
    return Math.round((passed / checklist.length) * 100)
  }, [checklist])

  const updateCookieConfig = useCallback((key, value) => {
    setCookieConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateScenarioConfig = useCallback((key, value) => {
    setScenarioConfig(prev => ({ ...prev, [key]: value }))
    setScenarioResult(null)
  }, [])

  const updateOriginConfig = useCallback((key, value) => {
    setOriginConfig(prev => ({ ...prev, [key]: value }))
    setOriginResult(null)
  }, [])

  const updateChecklistConfig = useCallback((key, value) => {
    setChecklistConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const renderStrategyCard = (strategy, type) => {
    const info = STRATEGY_INFO[strategy]
    const isLegitimate = type === REQUEST_TYPES.LEGITIMATE
    const scenario = {
      strategy,
      requestType: type,
      cookieToken: isLegitimate ? 'valid_token_123' : 'valid_token_123',
      requestToken: isLegitimate ? 'valid_token_123' : '',
      sessionToken: isLegitimate ? 'valid_token_123' : '',
      sameSite: SAME_SITE_VALUES.LAX,
      cookieSent: isLegitimate || strategy === CSRF_STRATEGIES.SAMESITE_COOKIE,
    }

    if (strategy === CSRF_STRATEGIES.SAMESITE_COOKIE) {
      scenario.sameSite = SAME_SITE_VALUES.STRICT
      scenario.cookieSent = isLegitimate
    }

    const result = evaluateStrategy(strategy, scenario)
    const success = result.valid

    return (
      <div key={`${strategy}-${type}`} className={`strategy-card ${success ? 'success' : 'failure'}`}>
        <div className="strategy-header">
          <span className="strategy-icon">{info.icon}</span>
          <div>
            <div className="strategy-name">{info.name}</div>
            <div className="scenario-type">{isLegitimate ? '✅ 合法请求' : '⚠️ 跨站伪造'}</div>
          </div>
          <span className={`result-badge ${success ? 'success' : 'failure'}`}>
            {success ? '通过' : '拦截'}
          </span>
        </div>
        <div className="strategy-description">{info.description}</div>
        <div className="result-reason">
          <strong>判定原因：</strong>{result.reason}
        </div>
      </div>
    )
  }

  return (
    <div className="csrf-protection-comparison">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          策略对比
        </button>
        <button
          className={`tab-btn ${activeTab === 'cookie' ? 'active' : ''}`}
          onClick={() => setActiveTab('cookie')}
        >
          Cookie 模拟
        </button>
        <button
          className={`tab-btn ${activeTab === 'origin' ? 'active' : ''}`}
          onClick={() => setActiveTab('origin')}
        >
          Origin 校验
        </button>
        <button
          className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          修复建议
        </button>
      </div>

      {activeTab === 'comparison' && (
        <section className="tool-section">
          <h2>CSRF 防护策略对比</h2>
          <p className="section-description">
            并排演示三种主流 CSRF 防护模型在「合法请求」与「跨站伪造请求」下的行为
          </p>

          <div className="preset-scenarios">
            <h3>快速加载预设场景</h3>
            <div className="preset-buttons">
              {Object.entries(PRESET_SCENARIOS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-btn ${activePreset === key ? 'active' : ''}`}
                  onClick={() => loadPreset(key)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="comparison-grid">
            <div className="comparison-column">
              <h3>🍀 合法请求</h3>
              {Object.values(CSRF_STRATEGIES).map(strategy => renderStrategyCard(strategy, REQUEST_TYPES.LEGITIMATE))}
            </div>
            <div className="comparison-column">
              <h3>⚠️ 跨站伪造请求</h3>
              {Object.values(CSRF_STRATEGIES).map(strategy => renderStrategyCard(strategy, REQUEST_TYPES.CSRF))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'cookie' && (
        <section className="tool-section">
          <h2>Cookie 模拟编辑器</h2>
          <p className="section-description">
            配置 Cookie 属性并观察浏览器在不同场景下的行为
          </p>

          <div className="config-row">
            <div className="config-panel">
              <h3>Cookie 配置</h3>
              <div className="form-group">
                <label>Cookie 名称</label>
                <input
                  type="text"
                  value={cookieConfig.name}
                  onChange={(e) => updateCookieConfig('name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Token 值</label>
                <div className="input-with-btn">
                  <input
                    type="text"
                    value={cookieConfig.value}
                    onChange={(e) => updateCookieConfig('value', e.target.value)}
                  />
                  <button className="icon-btn" onClick={regenerateToken} title="重新生成">
                    🔄
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>SameSite</label>
                <select
                  value={cookieConfig.sameSite}
                  onChange={(e) => updateCookieConfig('sameSite', e.target.value)}
                >
                  <option value={SAME_SITE_VALUES.STRICT}>Strict</option>
                  <option value={SAME_SITE_VALUES.LAX}>Lax</option>
                  <option value={SAME_SITE_VALUES.NONE}>None</option>
                </select>
              </div>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={cookieConfig.secure}
                    onChange={(e) => updateCookieConfig('secure', e.target.checked)}
                  />
                  Secure
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={cookieConfig.httpOnly}
                    onChange={(e) => updateCookieConfig('httpOnly', e.target.checked)}
                  />
                  HttpOnly
                </label>
              </div>

              <div className="cookie-preview">
                <strong>Set-Cookie:</strong>
                <code>
                  {cookieConfig.name}={cookieConfig.value}
                  {cookieConfig.sameSite ? `; SameSite=${cookieConfig.sameSite}` : ''}
                  {cookieConfig.secure ? '; Secure' : ''}
                  {cookieConfig.httpOnly ? '; HttpOnly' : ''}
                </code>
              </div>
            </div>

            <div className="config-panel">
              <h3>场景配置</h3>
              <div className="form-group">
                <label>防护策略</label>
                <select
                  value={scenarioConfig.strategy}
                  onChange={(e) => updateScenarioConfig('strategy', e.target.value)}
                >
                  <option value={CSRF_STRATEGIES.DOUBLE_SUBMIT_COOKIE}>Double Submit Cookie</option>
                  <option value={CSRF_STRATEGIES.SYNCHRONIZER_TOKEN}>Synchronizer Token</option>
                  <option value={CSRF_STRATEGIES.SAMESITE_COOKIE}>SameSite Cookie</option>
                </select>
              </div>
              <div className="form-group">
                <label>请求类型</label>
                <select
                  value={scenarioConfig.requestType}
                  onChange={(e) => updateScenarioConfig('requestType', e.target.value)}
                >
                  <option value={REQUEST_TYPES.LEGITIMATE}>合法请求（同源）</option>
                  <option value={REQUEST_TYPES.CSRF}>跨站伪造请求</option>
                </select>
              </div>
              <div className="form-group">
                <label>HTTP 方法</label>
                <select
                  value={scenarioConfig.method}
                  onChange={(e) => updateScenarioConfig('method', e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              {scenarioConfig.strategy !== CSRF_STRATEGIES.SAMESITE_COOKIE && (
                <div className="form-group">
                  <label>请求中的 Token</label>
                  <input
                    type="text"
                    value={scenarioConfig.requestToken}
                    onChange={(e) => updateScenarioConfig('requestToken', e.target.value)}
                  />
                </div>
              )}

              {scenarioConfig.strategy === CSRF_STRATEGIES.SYNCHRONIZER_TOKEN && (
                <div className="form-group">
                  <label>会话中的 Token</label>
                  <input
                    type="text"
                    value={scenarioConfig.sessionToken}
                    onChange={(e) => updateScenarioConfig('sessionToken', e.target.value)}
                  />
                </div>
              )}

              {scenarioConfig.strategy === CSRF_STRATEGIES.SAMESITE_COOKIE && (
                <>
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={scenarioConfig.cookieSent}
                        onChange={(e) => updateScenarioConfig('cookieSent', e.target.checked)}
                      />
                      Cookie 已发送
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={scenarioConfig.isTopLevelNavigation}
                        onChange={(e) => updateScenarioConfig('isTopLevelNavigation', e.target.checked)}
                      />
                      顶级导航
                    </label>
                  </div>
                </>
              )}

              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={scenarioConfig.requireCustomHeader}
                    onChange={(e) => updateScenarioConfig('requireCustomHeader', e.target.checked)}
                  />
                  要求自定义请求头
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={scenarioConfig.customHeaderPresent}
                    onChange={(e) => updateScenarioConfig('customHeaderPresent', e.target.checked)}
                  />
                  自定义请求头存在
                </label>
              </div>

              <button className="primary-btn" onClick={runScenario}>
                运行模拟
              </button>
            </div>
          </div>

          {scenarioResult && (
            <div className={`result-panel ${scenarioResult.valid ? 'success' : 'failure'}`}>
              <div className="result-header">
                <span className="result-icon">
                  {scenarioResult.valid ? '✅' : '❌'}
                </span>
                <span className="result-title">
                  {scenarioResult.protected ? '防护成功' : scenarioResult.valid ? '请求通过' : '请求拦截'}
                </span>
              </div>
              <div className="result-content">
                <p><strong>判定：</strong>{scenarioResult.reason}</p>
                <div className="request-details">
                  <h4>请求详情模拟</h4>
                  <div className="detail-row">
                    <span>Cookie 头：</span>
                    <code>
                      {scenarioConfig.cookieSent
                        ? `${cookieConfig.name}=${cookieConfig.value}`
                        : '(未发送)'}
                    </code>
                  </div>
                  {scenarioConfig.customHeaderPresent && (
                    <div className="detail-row">
                      <span>X-CSRF-Token：</span>
                      <code>{scenarioConfig.requestToken || '(空)'}</code>
                    </div>
                  )}
                  <div className="detail-row">
                    <span>请求类型：</span>
                    <code>{scenarioConfig.requestType === REQUEST_TYPES.LEGITIMATE ? '同源' : '跨站'}</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'origin' && (
        <section className="tool-section">
          <h2>Origin / Referer 校验</h2>
          <p className="section-description">
            模拟同源与跨站请求，验证 Origin/Referer 白名单匹配逻辑
          </p>

          <div className="config-row">
            <div className="config-panel">
              <h3>请求头配置</h3>
              <div className="form-group">
                <label>Origin 请求头</label>
                <input
                  type="text"
                  value={originConfig.requestOrigin}
                  onChange={(e) => updateOriginConfig('requestOrigin', e.target.value)}
                  placeholder="留空表示缺失 Origin 头"
                />
              </div>
              <div className="form-group">
                <label>Referer 请求头</label>
                <input
                  type="text"
                  value={originConfig.referer}
                  onChange={(e) => updateOriginConfig('referer', e.target.value)}
                  placeholder="留空表示缺失 Referer 头"
                />
              </div>
            </div>

            <div className="config-panel">
              <h3>白名单配置</h3>
              <div className="form-group">
                <label>允许的 Origin（每行一个）</label>
                <textarea
                  value={originConfig.allowedOrigins}
                  onChange={(e) => updateOriginConfig('allowedOrigins', e.target.value)}
                  rows={5}
                />
              </div>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={originConfig.allowMissingReferer}
                    onChange={(e) => updateOriginConfig('allowMissingReferer', e.target.checked)}
                  />
                  缺失 Origin/Referer 时降级通过
                </label>
              </div>

              <button className="primary-btn" onClick={runOriginCheck}>
                执行校验
              </button>
            </div>
          </div>

          {originResult && (
            <div className={`result-panel ${originResult.valid ? 'success' : 'failure'}`}>
              <div className="result-header">
                <span className="result-icon">
                  {originResult.warning ? '⚠️' : originResult.valid ? '✅' : '❌'}
                </span>
                <span className="result-title">
                  {originResult.valid ? '校验通过' : '校验失败'}
                </span>
              </div>
              <div className="result-content">
                <p><strong>判定：</strong>{originResult.reason}</p>
                {originResult.origin && (
                  <div className="detail-row">
                    <span>检测到的来源：</span>
                    <code>{originResult.origin}</code>
                  </div>
                )}
                {originResult.warning && (
                  <div className="warning-box">
                    <strong>⚠️ 安全警告：</strong>
                    允许缺失 Referer 的请求通过可能存在安全风险，
                    攻击者可能通过隐藏 Referer 来绕过校验。
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="notes-section">
            <h3>降级策略说明</h3>
            <ul>
              <li>
                <strong>优先级：</strong>优先使用 Origin 头，其次使用 Referer 头
              </li>
              <li>
                <strong>Origin 头：</strong>现代浏览器在跨域请求中会自动发送 Origin 头，
                无法被 JavaScript 伪造
              </li>
              <li>
                <strong>Referer 头：</strong>包含完整的 URL 路径，可用于更精细的校验，
                但在某些隐私设置下可能被禁用
              </li>
              <li>
                <strong>缺失处理：</strong>
                <ul>
                  <li>严格模式：拒绝无 Origin/Referer 的请求（推荐）</li>
                  <li>降级模式：允许无 Origin/Referer 的请求通过（存在风险）</li>
                </ul>
              </li>
            </ul>
          </div>
        </section>
      )}

      {activeTab === 'checklist' && (
        <section className="tool-section">
          <h2>CSRF 防护 Checklist</h2>
          <p className="section-description">
            根据当前配置生成安全检查清单，导出 Markdown 格式
          </p>

          <div className="score-card">
            <div className="score-display">
              <span className="score-value">{checklistScore}</span>
              <span className="score-label">/ 100</span>
            </div>
            <div className={`score-rating ${checklistScore >= 80 ? 'good' : checklistScore >= 60 ? 'medium' : 'poor'}`}>
              {checklistScore >= 80 ? '✅ 配置良好' : checklistScore >= 60 ? '📝 需要改进' : '⚠️ 风险较高'}
            </div>
          </div>

          <div className="config-panel">
            <h3>配置项</h3>
            <div className="config-grid">
              <label className="config-item">
                <input
                  type="checkbox"
                  checked={checklistConfig.useDoubleSubmit}
                  onChange={(e) => {
                    updateChecklistConfig('useDoubleSubmit', e.target.checked)
                    if (e.target.checked) updateChecklistConfig('useSynchronizerToken', false)
                  }}
                />
                <span>使用 Double Submit Cookie</span>
              </label>
              <label className="config-item">
                <input
                  type="checkbox"
                  checked={checklistConfig.useSynchronizerToken}
                  onChange={(e) => {
                    updateChecklistConfig('useSynchronizerToken', e.target.checked)
                    if (e.target.checked) updateChecklistConfig('useDoubleSubmit', false)
                  }}
                />
                <span>使用 Synchronizer Token</span>
              </label>
              <div className="config-item">
                <label>SameSite 设置</label>
                <select
                  value={checklistConfig.sameSite}
                  onChange={(e) => updateChecklistConfig('sameSite', e.target.value)}
                >
                  <option value={SAME_SITE_VALUES.STRICT}>Strict</option>
                  <option value={SAME_SITE_VALUES.LAX}>Lax</option>
                  <option value={SAME_SITE_VALUES.NONE}>None</option>
                </select>
              </div>
              <label className="config-item">
                <input
                  type="checkbox"
                  checked={checklistConfig.secure}
                  onChange={(e) => updateChecklistConfig('secure', e.target.checked)}
                />
                <span>启用 Secure Cookie</span>
              </label>
              <label className="config-item">
                <input
                  type="checkbox"
                  checked={checklistConfig.httpOnly}
                  onChange={(e) => updateChecklistConfig('httpOnly', e.target.checked)}
                />
                <span>启用 HttpOnly Cookie</span>
              </label>
              <label className="config-item">
                <input
                  type="checkbox"
                  checked={checklistConfig.requireCustomHeader}
                  onChange={(e) => updateChecklistConfig('requireCustomHeader', e.target.checked)}
                />
                <span>要求自定义请求头</span>
              </label>
              <label className="config-item">
                <input
                  type="checkbox"
                  checked={checklistConfig.checkOrigin}
                  onChange={(e) => updateChecklistConfig('checkOrigin', e.target.checked)}
                />
                <span>启用 Origin/Referer 校验</span>
              </label>
              <label className="config-item">
                <input
                  type="checkbox"
                  checked={checklistConfig.corsCorrect}
                  onChange={(e) => updateChecklistConfig('corsCorrect', e.target.checked)}
                />
                <span>CORS 配置正确</span>
              </label>
            </div>
          </div>

          <div className="checklist-panel">
            <div className="checklist-header">
              <h3>检查清单</h3>
              <button
                className="secondary-btn"
                onClick={() => handleCopy(checklistMarkdown, 'Checklist')}
              >
                导出 Markdown
              </button>
            </div>
            <div className="checklist-items">
              {checklist.map((item) => (
                <div key={item.id} className={`checklist-item ${item.checked ? 'checked' : 'unchecked'}`}>
                  <span className="check-icon">{item.checked ? '✅' : '❌'}</span>
                  <div className="check-content">
                    <div className="check-label">
                      {item.label}
                      <span className={`severity-badge ${item.severity}`}>
                        {item.severity === 'high' ? '高' : '中'}
                      </span>
                    </div>
                    <div className="check-description">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="notes-section">
            <h3>最佳实践建议</h3>
            <ul>
              <li>
                <strong>分层防御：</strong>
                结合使用 Token 防护 + SameSite Cookie + Origin 校验，提供多层保护
              </li>
              <li>
                <strong>SameSite：</strong>
                优先使用 SameSite=Strict，如需要兼容顶级导航跳转可使用 Lax
              </li>
              <li>
                <strong>Token 生成：</strong>
                使用密码学安全的随机数生成器，长度不少于 32 字节
              </li>
              <li>
                <strong>CORS：</strong>
                切勿使用 Access-Control-Allow-Origin: *，应明确指定允许的来源
              </li>
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
