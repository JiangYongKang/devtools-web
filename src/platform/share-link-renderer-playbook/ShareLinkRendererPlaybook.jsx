import React, { useState, useCallback } from 'react'
import './ShareLinkRendererPlaybook.css'
import {
  parseShareLink,
  copyToClipboard,
  copyAsMarkdown,
  EXAMPLES,
  isShortlinkDomain,
  tryExpandShortlink,
  OPEN_STRATEGY,
  DEFAULT_OPTIONS,
} from './logic/index.js'

function getRiskIcon(level) {
  switch (level) {
    case 'critical':
      return '🚨'
    case 'high':
      return '⚠️'
    case 'medium':
      return '🔶'
    case 'low':
      return 'ℹ️'
    default:
      return 'ℹ️'
  }
}

function getOpenStrategyDescription(strategy, protocol) {
  switch (strategy) {
    case OPEN_STRATEGY.EXTERNAL_BLANK:
      return `使用 \`_blank\` 在新标签页打开，适用于 ${protocol} 协议的网页链接`
    case OPEN_STRATEGY.DESKTOP_DEEPLINK:
      return `桌面应用深度链接，点击后会尝试唤起 ${protocol} 协议对应的应用程序`
    case OPEN_STRATEGY.MOBILE_UNIVERSAL:
      return `移动端通用链接或自定义协议，可能需要相应的 App 才能处理`
    case OPEN_STRATEGY.SAME_TAB:
      return '在当前标签页打开'
    default:
      return '标准链接打开方式'
  }
}

function ShareLinkRendererPlaybook() {
  const [urlInput, setUrlInput] = useState('')
  const [parsedResult, setParsedResult] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [expandResult, setExpandResult] = useState(null)
  const [isExpanding, setIsExpanding] = useState(false)
  const [selectedExampleId, setSelectedExampleId] = useState(null)

  const showCopyToast = useCallback((message) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }, [])

  const handleParse = useCallback(() => {
    setParseError(null)
    setExpandResult(null)
    setSelectedExampleId(null)

    try {
      const result = parseShareLink(urlInput, DEFAULT_OPTIONS)
      setParsedResult(result)
    } catch (error) {
      setParseError(error)
      setParsedResult(null)
    }
  }, [urlInput])

  const handleExampleClick = useCallback((example) => {
    setUrlInput(example.url)
    setExpandResult(null)
    setParseError(null)
    setSelectedExampleId(example.id)

    try {
      const result = parseShareLink(example.url, DEFAULT_OPTIONS)
      setParsedResult(result)
    } catch (error) {
      setParseError(error)
      setParsedResult(null)
    }
  }, [])

  const handleCopyCanonical = useCallback(async () => {
    if (!parsedResult) return
    const result = await copyToClipboard(parsedResult.canonical)
    if (result.success) {
      showCopyToast('已复制规范化链接')
    }
  }, [parsedResult, showCopyToast])

  const handleCopyStripped = useCallback(async () => {
    if (!parsedResult) return
    const result = await copyToClipboard(parsedResult.strippedUtm)
    if (result.success) {
      showCopyToast('已复制剥离 UTM 参数的链接')
    }
  }, [parsedResult, showCopyToast])

  const handleCopyMarkdown = useCallback(async () => {
    if (!parsedResult) return
    const markdown = copyAsMarkdown(parsedResult)
    const result = await copyToClipboard(markdown)
    if (result.success) {
      showCopyToast('已复制 Markdown 格式链接')
    }
  }, [parsedResult, showCopyToast])

  const handleExpandShortlink = useCallback(async () => {
    if (!parsedResult) return

    setIsExpanding(true)
    setExpandResult(null)

    const result = await tryExpandShortlink(parsedResult.canonical, DEFAULT_OPTIONS)
    setExpandResult(result)
    setIsExpanding(false)
  }, [parsedResult])

  const isShortlink = parsedResult && isShortlinkDomain(
    parsedResult.asciiHost,
    DEFAULT_OPTIONS.shortlinkDomains
  )

  return (
    <div className="share-link-playbook">
      <header>
        <h1>链接解析与分享工具</h1>
        <p className="subtitle">
          解析 URL 结构、检测风险标识、规范化格式、一键复制分享链接
        </p>
      </header>

      <section className="input-section">
        <h3>输入链接</h3>
        <div className="url-input-wrapper">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value)
              setSelectedExampleId(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            placeholder="粘贴或输入 URL 链接..."
            className={parseError ? 'error' : ''}
          />
          <button className="parse-btn" onClick={handleParse}>
            解析链接
          </button>
        </div>
      </section>

      <section className="examples-section">
        <h3>示例链接（点击填充）</h3>
        <div className="examples-grid">
          {EXAMPLES.slice(0, 6).map((example) => (
            <div
              key={example.id}
              className={`example-card ${selectedExampleId === example.id ? 'selected' : ''}`}
              onClick={() => handleExampleClick(example)}
            >
              <h4>{example.title}</h4>
              <p>{example.description}</p>
              <div className="example-tags">
                {example.tags.map((tag) => (
                  <span key={tag} className="example-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="results-section">
        {parseError && (
          <div className="error-message">
            <h4>解析失败</h4>
            <p>{parseError.message}</p>
            {parseError.details?.suggestion && (
              <p style={{ marginTop: '8px', color: '#9ca3af' }}>
                💡 {parseError.details.suggestion}
              </p>
            )}
          </div>
        )}

        {parsedResult && (
          <div className="result-card">
            <div className="result-header">
              <h3>解析结果</h3>
              <div className="action-buttons">
                <button className="action-btn secondary" onClick={handleCopyCanonical}>
                  📋 复制规范化链接
                </button>
                <button className="action-btn secondary" onClick={handleCopyStripped}>
                  🧹 复制纯净链接（去 UTM）
                </button>
                <button className="action-btn secondary" onClick={handleCopyMarkdown}>
                  📝 复制 Markdown 格式
                </button>
              </div>
            </div>

            <div className="result-body">
              <div className="url-display">
                <label>原始链接</label>
                <div className="url-value">{parsedResult.raw}</div>
              </div>

              <div className="url-display">
                <label>规范化链接</label>
                <div className="url-value">{parsedResult.canonical}</div>
              </div>

              {parsedResult.strippedUtm !== parsedResult.canonical && (
                <div className="url-display">
                  <label>剥离 UTM 参数后</label>
                  <div className="url-value">{parsedResult.strippedUtm}</div>
                </div>
              )}

              <div className="info-grid">
                <div className="info-item">
                  <label>主机名</label>
                  <div className="value">{parsedResult.displayHost}</div>
                  {parsedResult.isIdn && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      ASCII: {parsedResult.asciiHost}
                    </div>
                  )}
                </div>
                <div className="info-item">
                  <label>协议</label>
                  <div className="value">{parsedResult.protocol}</div>
                </div>
                <div className="info-item">
                  <label>端口</label>
                  <div className="value">{parsedResult.port || '默认'}</div>
                </div>
                <div className="info-item">
                  <label>路径摘要</label>
                  <div className="value">{parsedResult.pathSummary}</div>
                </div>
                <div className="info-item">
                  <label>查询参数</label>
                  <div className="value">{parsedResult.queryCount} 个</div>
                </div>
                <div className="info-item">
                  <label>Fragment</label>
                  <div className="value">{parsedResult.fragment || '无'}</div>
                </div>
              </div>

              {parsedResult.queryCount > 0 && (
                <div className="query-preview">
                  <h4>查询参数（敏感信息已脱敏）</h4>
                  <div className="query-tags">
                    {parsedResult.queryKeys.map((key) => (
                      <span
                        key={key}
                        className={`query-tag ${['state', 'code', 'token', 'password'].includes(key) ? 'sensitive' : ''}`}
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                  {parsedResult.maskedParams && (
                    <div style={{ marginTop: '12px', fontSize: '12px', fontFamily: 'monospace', color: '#666' }}>
                      ?{parsedResult.maskedParams}
                    </div>
                  )}
                </div>
              )}

              {parsedResult.riskFlags.length > 0 && (
                <div className="risk-flags">
                  <h4>⚠️ 风险检测结果 ({parsedResult.riskFlags.length})</h4>
                  <div className="risk-list">
                    {parsedResult.riskFlags.map((flag, index) => (
                      <div key={index} className={`risk-item ${flag.level}`}>
                        <span className="risk-icon">{getRiskIcon(flag.level)}</span>
                        <div className="risk-content">
                          <h5>{flag.message}</h5>
                          <p>{flag.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="open-strategy-info">
                <h4>🔗 打开方式说明</h4>
                <p>{getOpenStrategyDescription(parsedResult.openStrategy, parsedResult.protocol)}</p>
              </div>

              {isShortlink && (
                <div className="shortlink-section">
                  <div className="shortlink-header">
                    <h4>🔍 检测到短链域名</h4>
                    <button
                      className="expand-btn"
                      onClick={handleExpandShortlink}
                      disabled={isExpanding}
                    >
                      {isExpanding ? '展开中...' : '尝试展开'}
                    </button>
                  </div>
                  <div className="cors-notice">
                    ⚠️ 注意：由于浏览器 CORS 安全限制，部分短链服务可能无法展开。
                    这是正常现象，不是工具缺陷。可手动在新标签页打开查看目标地址。
                  </div>
                  {expandResult && (
                    <div className={`expand-result ${expandResult.success ? 'success' : 'error'}`}>
                      {expandResult.success ? (
                        <>
                          <p>✅ 展开成功（重定向 {expandResult.redirectCount} 次）:</p>
                          <div className="url">{expandResult.finalUrl}</div>
                        </>
                      ) : (
                        <>
                          <p>❌ 展开失败:</p>
                          <div className="url" style={{ color: '#dc2626' }}>
                            {expandResult.error?.message || '未知错误'}
                          </div>
                          {expandResult.error?.details?.suggestion && (
                            <p style={{ marginTop: '8px', fontSize: '12px' }}>
                              💡 {expandResult.error.details.suggestion}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!parsedResult && !parseError && (
          <div className="no-results">
            <div className="icon">🔗</div>
            <p>输入链接并点击「解析链接」查看结果</p>
          </div>
        )}
      </section>

      {showToast && <div className="copy-toast">✅ {toastMessage}</div>}
    </div>
  )
}

export default ShareLinkRendererPlaybook
