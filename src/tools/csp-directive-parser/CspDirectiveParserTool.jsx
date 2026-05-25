import { useCallback, useState } from 'react'
import { parseDirectives, comparePolicies } from './logic/directive-parser.js'
import { detectConflicts, checkSecurityIssues } from './logic/conflict-detector.js'
import { simulateResourceLoad, simulateInlineScript, generateViolationReport } from './logic/violation-simulator.js'
import { generateSampleViolationReport, getReportingApiVsLegacyComparison, getReportingConfig, prettyPrintJson } from './logic/report-generator.js'
import { EXAMPLE_POLICIES, STANDARD_DIRECTIVES } from './logic/constants.js'
import './CspDirectiveParserTool.css'

export default function CspDirectiveParserTool() {
  const [activeTab, setActiveTab] = useState('parser')

  const [policyInput, setPolicyInput] = useState(EXAMPLE_POLICIES.strict.policy)
  const [reportOnlyInput, setReportOnlyInput] = useState(EXAMPLE_POLICIES.reportOnly.policy)
  const [parsedResult, setParsedResult] = useState(null)
  const [compareResult, setCompareResult] = useState(null)
  const [conflictsResult, setConflictsResult] = useState(null)
  const [securityIssues, setSecurityIssues] = useState(null)

  const [simulateDocumentUrl, setSimulateDocumentUrl] = useState('https://example.com/page')
  const [simulateResourceType, setSimulateResourceType] = useState('script')
  const [simulateResourceUrl, setSimulateResourceUrl] = useState('https://analytics.example.com/tracker.js')
  const [simulateInlineScript, setSimulateInlineScript] = useState('console.log("hello")')
  const [simulateNonce, setSimulateNonce] = useState('')
  const [simulationResult, setSimulationResult] = useState(null)
  const [simulationType, setSimulationType] = useState('resource')

  const [reportEndpoint, setReportEndpoint] = useState('https://example.com/csp-report')
  const [sampleReport, setSampleReport] = useState(null)
  const [reportingConfig, setReportingConfig] = useState(null)

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

  const handleParse = useCallback(() => {
    const parsed = parseDirectives(policyInput)
    setParsedResult(parsed)

    const conflicts = detectConflicts(parsed)
    setConflictsResult(conflicts)

    const issues = checkSecurityIssues(parsed)
    setSecurityIssues(issues)

    const reporting = getReportingConfig(parsed)
    setReportingConfig(reporting)

    setCompareResult(null)
    setSimulationResult(null)
  }, [policyInput])

  const handleCompare = useCallback(() => {
    const compared = comparePolicies(policyInput, reportOnlyInput)
    setCompareResult(compared)
  }, [policyInput, reportOnlyInput])

  const handleSimulate = useCallback(() => {
    if (!parsedResult) {
      handleParse()
      return
    }

    let result
    if (simulationType === 'resource') {
      result = simulateResourceLoad(
        parsedResult,
        simulateResourceType,
        simulateResourceUrl,
        simulateDocumentUrl
      )
    } else {
      result = simulateInlineScript(
        parsedResult,
        simulateInlineScript,
        !!simulateNonce,
        simulateNonce
      )
    }

    setSimulationResult(result)

    if (!result.allowed) {
      const report = generateViolationReport(result, false)
      setSampleReport(report)
    } else {
      setSampleReport(null)
    }
  }, [parsedResult, simulationType, simulateResourceType, simulateResourceUrl, simulateDocumentUrl, simulateInlineScript, simulateNonce, handleParse])

  const handleLoadExample = useCallback((exampleKey) => {
    const example = EXAMPLE_POLICIES[exampleKey]
    if (example) {
      setPolicyInput(example.policy)
      setParsedResult(null)
      setConflictsResult(null)
      setSecurityIssues(null)
      setSimulationResult(null)
      setSampleReport(null)
    }
  }, [])

  const handleGenerateSampleReport = useCallback(() => {
    const report = generateSampleViolationReport({
      documentUri: simulateDocumentUrl,
      blockedUri: simulateResourceUrl,
    })
    setSampleReport(report)
  }, [simulateDocumentUrl, simulateResourceUrl])

  const escapeHtml = (text) => {
    if (text == null) return ''
    const str = String(text)
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const getSourceTypeBadge = (source) => {
    const type = source.parsed?.type
    const badges = {
      special: { className: 'badge-special', label: '特殊' },
      nonce: { className: 'badge-nonce', label: 'Nonce' },
      hash: { className: 'badge-hash', label: 'Hash' },
      scheme: { className: 'badge-scheme', label: '协议' },
      host: { className: 'badge-host', label: '主机' },
    }
    return badges[type] || { className: 'badge-unknown', label: '未知' }
  }

  const renderDirectiveTable = (directives) => {
    return (
      <div className="directive-table">
        {Object.entries(directives).map(([name, directive]) => (
          <div key={name} className="directive-row">
            <div className="directive-name">
              <span className="directive-name-text">{name}</span>
              {directive.count > 1 && (
                <span className="badge-duplicate">×{directive.count}</span>
              )}
              {STANDARD_DIRECTIVES[name]?.description && (
                <span className="directive-description">
                  {STANDARD_DIRECTIVES[name].description}
                </span>
              )}
            </div>
            <div className="directive-sources">
              {directive.sources.map((source, idx) => {
                const badge = getSourceTypeBadge(source)
                return (
                  <span
                    key={idx}
                    className={`source-badge ${badge.className} ${!source.valid ? 'invalid' : ''}`}
                    title={source.warnings?.[0] || source.errors?.[0] || ''}
                  >
                    <span className="source-badge-type">{badge.label}</span>
                    <code className="source-badge-value">{escapeHtml(source.raw)}</code>
                  </span>
                )
              })}
              {directive.sources.length === 0 && (
                <span className="no-sources">（无源，仅启用指令）</span>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderConflicts = (conflicts) => {
    if (!conflicts || conflicts.count === 0) {
      return <div className="no-issues">未检测到指令冲突</div>
    }

    return (
      <div className="conflict-list">
        {conflicts.conflicts.map((conflict, idx) => (
          <div key={idx} className={`conflict-item severity-${conflict.severity}`}>
            <div className="conflict-header">
              <span className={`severity-badge ${conflict.severity}`}>
                {conflict.severity === 'error' ? '错误' : conflict.severity === 'warning' ? '警告' : '提示'}
              </span>
              <span className="conflict-type">{conflict.type}</span>
            </div>
            <div className="conflict-message">{conflict.message}</div>
            <div className="conflict-directives">
              涉及指令：{conflict.directives.join(', ')}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderSecurityIssues = (issues) => {
    if (!issues || issues.count === 0) {
      return <div className="no-issues">未检测到安全问题</div>
    }

    return (
      <div className="issue-list">
        {issues.issues.map((issue, idx) => (
          <div key={idx} className={`issue-item severity-${issue.severity}`}>
            <span className={`severity-badge ${issue.severity}`}>
              {issue.severity === 'error' ? '严重' : issue.severity === 'warning' ? '警告' : '提示'}
            </span>
            <span className="issue-message">{issue.message}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderComparison = (comparison) => {
    if (!comparison) return null

    return (
      <div className="comparison-view">
        <div className="comparison-summary">
          <div className="summary-both">
            <strong>共有指令：</strong> {comparison.common.length > 0 ? comparison.common.join(', ') : '无'}
          </div>
          <div className="summary-only-a">
            <strong>仅强制模式：</strong> {comparison.onlyInA.length > 0 ? comparison.onlyInA.join(', ') : '无'}
          </div>
          <div className="summary-only-b">
            <strong>仅报告模式：</strong> {comparison.onlyInB.length > 0 ? comparison.onlyInB.join(', ') : '无'}
          </div>
        </div>
        <div className="comparison-table">
          {Object.entries(comparison.comparison).map(([name, data]) => (
            <div key={name} className={`comparison-row ${!data.inA || !data.inB ? 'different' : ''}`}>
              <div className="comparison-directive">{name}</div>
              <div className={`comparison-col ${data.inA ? 'present' : 'missing'}`}>
                {data.inA ? data.sourcesA.join(' ') : '（无）'}
              </div>
              <div className={`comparison-col ${data.inB ? 'present' : 'missing'}`}>
                {data.inB ? data.sourcesB.join(' ') : '（无）'}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="csp-directive-parser">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'parser' ? 'active' : ''}`}
          onClick={() => setActiveTab('parser')}
        >
          策略解析
        </button>
        <button
          className={`tab-btn ${activeTab === 'conflicts' ? 'active' : ''}`}
          onClick={() => setActiveTab('conflicts')}
        >
          冲突检测
        </button>
        <button
          className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          违规模拟
        </button>
        <button
          className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          报告配置
        </button>
      </div>

      <div className="example-buttons">
        <span className="example-label">加载示例：</span>
        {Object.entries(EXAMPLE_POLICIES).map(([key, example]) => (
          <button
            key={key}
            className="example-btn"
            onClick={() => handleLoadExample(key)}
          >
            {example.name}
          </button>
        ))}
      </div>

      {activeTab === 'parser' && (
        <section className="tool-section">
          <h2>CSP 策略解析</h2>

          <div className="input-section">
            <div className="form-group full-width">
              <label htmlFor="policy-input">输入 CSP 策略（支持 HTTP 头或 meta 标签格式）</label>
              <textarea
                id="policy-input"
                className="policy-textarea"
                value={policyInput}
                onChange={(e) => setPolicyInput(e.target.value)}
                placeholder="粘贴 Content-Security-Policy 头或 meta 标签内容..."
                spellCheck={false}
              />
            </div>

            <div className="action-row">
              <button
                className="primary-btn"
                onClick={handleParse}
                disabled={!policyInput.trim()}
              >
                解析策略
              </button>
              <button
                className="secondary-btn"
                onClick={() => { setPolicyInput(''); setParsedResult(null); setConflictsResult(null); setSecurityIssues(null) }}
              >
                清除
              </button>
            </div>
          </div>

          {parsedResult && (
            <div className="result-section">
              <div className="result-header">
                <h3>解析结果</h3>
                <div className="result-stats">
                  <span className="stat-item">指令数: {parsedResult.directiveCount}</span>
                  <span className="stat-item">Token 数: {parsedResult.tokenCount}</span>
                  {parsedResult.warnings.length > 0 && (
                    <span className="stat-item warning">警告: {parsedResult.warnings.length}</span>
                  )}
                </div>
              </div>

              {parsedResult.warnings.length > 0 && (
                <div className="warnings-box">
                  {parsedResult.warnings.map((w, i) => (
                    <div key={i} className="warning-item">⚠️ {w.message}</div>
                  ))}
                </div>
              )}

              {renderDirectiveTable(parsedResult.directives)}
            </div>
          )}
        </section>
      )}

      {activeTab === 'conflicts' && (
        <section className="tool-section">
          <h2>冲突检测与安全检查</h2>

          <div className="input-section">
            <div className="dual-input">
              <div className="form-group">
                <label htmlFor="enforce-policy">强制策略 (enforce)</label>
                <textarea
                  id="enforce-policy"
                  className="policy-textarea small"
                  value={policyInput}
                  onChange={(e) => setPolicyInput(e.target.value)}
                  placeholder="Content-Security-Policy..."
                  spellCheck={false}
                />
              </div>
              <div className="form-group">
                <label htmlFor="report-policy">仅报告策略 (report-only)</label>
                <textarea
                  id="report-policy"
                  className="policy-textarea small"
                  value={reportOnlyInput}
                  onChange={(e) => setReportOnlyInput(e.target.value)}
                  placeholder="Content-Security-Policy-Report-Only..."
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="action-row">
              <button
                className="primary-btn"
                onClick={() => { handleParse(); handleCompare() }}
              >
                检测冲突与对比
              </button>
            </div>
          </div>

          {conflictsResult && (
            <div className="result-section">
              <h3>指令冲突</h3>
              {renderConflicts(conflictsResult)}
            </div>
          )}

          {securityIssues && (
            <div className="result-section">
              <h3>安全建议</h3>
              {renderSecurityIssues(securityIssues)}
            </div>
          )}

          {compareResult && (
            <div className="result-section">
              <h3>双栏对比</h3>
              <div className="compare-header">
                <span>强制策略</span>
                <span>仅报告策略</span>
              </div>
              {renderComparison(compareResult)}
            </div>
          )}
        </section>
      )}

      {activeTab === 'simulator' && (
        <section className="tool-section">
          <h2>违规模拟</h2>

          <div className="simulator-form">
            <div className="form-group">
              <label>模拟类型</label>
              <div className="radio-group">
                <label className="radio-item">
                  <input
                    type="radio"
                    value="resource"
                    checked={simulationType === 'resource'}
                    onChange={(e) => setSimulationType(e.target.value)}
                  />
                  <span>资源加载</span>
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    value="inline"
                    checked={simulationType === 'inline'}
                    onChange={(e) => setSimulationType(e.target.value)}
                  />
                  <span>内联脚本</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="document-url">文档 URL</label>
              <input
                id="document-url"
                type="text"
                className="value-input"
                value={simulateDocumentUrl}
                onChange={(e) => setSimulateDocumentUrl(e.target.value)}
                placeholder="https://example.com/page"
              />
            </div>

            {simulationType === 'resource' ? (
              <>
                <div className="form-group">
                  <label htmlFor="resource-type">资源类型</label>
                  <select
                    id="resource-type"
                    value={simulateResourceType}
                    onChange={(e) => setSimulateResourceType(e.target.value)}
                    className="select-input"
                  >
                    <option value="script">脚本 (script)</option>
                    <option value="style">样式 (style)</option>
                    <option value="image">图片 (image)</option>
                    <option value="font">字体 (font)</option>
                    <option value="connect">连接 (connect)</option>
                    <option value="media">媒体 (media)</option>
                    <option value="frame">框架 (frame)</option>
                    <option value="worker">Worker</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="resource-url">资源 URL</label>
                  <input
                    id="resource-url"
                    type="text"
                    className="value-input"
                    value={simulateResourceUrl}
                    onChange={(e) => setSimulateResourceUrl(e.target.value)}
                    placeholder="https://cdn.example.com/script.js"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="inline-script">内联脚本内容</label>
                  <textarea
                    id="inline-script"
                    className="policy-textarea small"
                    value={simulateInlineScript}
                    onChange={(e) => setSimulateInlineScript(e.target.value)}
                    placeholder="console.log('inline')"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="nonce-value">Nonce 值（可选）</label>
                  <input
                    id="nonce-value"
                    type="text"
                    className="value-input"
                    value={simulateNonce}
                    onChange={(e) => setSimulateNonce(e.target.value)}
                    placeholder="abc123xyz..."
                  />
                </div>
              </>
            )}

            <div className="action-row">
              <button
                className="primary-btn"
                onClick={handleSimulate}
              >
                模拟执行
              </button>
            </div>
          </div>

          {simulationResult && (
            <div className="result-section">
              <h3>模拟结果</h3>
              <div className={`simulation-result ${simulationResult.allowed ? 'allowed' : 'blocked'}`}>
                <div className="simulation-status">
                  {simulationResult.allowed ? '✅ 允许' : '❌ 阻止'}
                </div>
                <div className="simulation-details">
                  <div className="detail-item">
                    <span className="detail-label">生效指令</span>
                    <code>{simulationResult.effectiveDirective}</code>
                    {simulationResult.fromFallback && (
                      <span className="fallback-badge">（回退）</span>
                    )}
                  </div>
                  {!simulationResult.allowed && (
                    <div className="detail-item">
                      <span className="detail-label">违规指令</span>
                      <code>{simulationResult.violatedDirective}</code>
                    </div>
                  )}
                  {simulationResult.matchDetails && (
                    <div className="detail-item">
                      <span className="detail-label">匹配详情</span>
                      <div className="match-details">
                        {simulationResult.matchDetails.map((m, i) => (
                          <div key={i} className={`match-item ${m.allowed ? 'match' : 'no-match'}`}>
                            <code>{m.source}</code> → {m.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {simulationResult.reasons && (
                    <div className="detail-item">
                      <span className="detail-label">原因</span>
                      <ul>
                        {simulationResult.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {sampleReport && (
                <div className="report-output">
                  <div className="report-header">
                    <h4>违规报告 JSON</h4>
                    <button
                      className="copy-btn"
                      onClick={() => handleCopy(prettyPrintJson(sampleReport), '违规报告')}
                    >
                      复制
                    </button>
                  </div>
                  <pre className="json-output">{prettyPrintJson(sampleReport)}</pre>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'report' && (
        <section className="tool-section">
          <h2>Report URI 配置</h2>

          {reportingConfig && (
            <div className="reporting-config">
              <h3>当前策略的报告配置</h3>
              <div className="config-status">
                <div className={`config-item ${reportingConfig.hasReportUri ? 'ok' : 'missing'}`}>
                  report-uri: {reportingConfig.hasReportUri ? reportingConfig.reportUri.join(', ') : '未设置'}
                </div>
                <div className={`config-item ${reportingConfig.hasReportTo ? 'ok' : 'missing'}`}>
                  report-to: {reportingConfig.hasReportTo ? reportingConfig.reportTo.join(', ') : '未设置'}
                </div>
                <div className="config-recommendation">
                  💡 {reportingConfig.recommendation}
                </div>
              </div>
            </div>
          )}

          <div className="report-generator">
            <h3>生成示例违规报告</h3>
            <div className="form-group">
              <label htmlFor="report-endpoint">报告端点 URL</label>
              <input
                id="report-endpoint"
                type="text"
                className="value-input"
                value={reportEndpoint}
                onChange={(e) => setReportEndpoint(e.target.value)}
              />
            </div>
            <div className="action-row">
              <button
                className="primary-btn"
                onClick={handleGenerateSampleReport}
              >
                生成示例报告
              </button>
            </div>

            {sampleReport && (
              <div className="report-output">
                <div className="report-header">
                  <h4>Legacy report-uri 格式</h4>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(prettyPrintJson(sampleReport), '示例报告')}
                  >
                    复制
                  </button>
                </div>
                <pre className="json-output">{prettyPrintJson(sampleReport)}</pre>
              </div>
            )}
          </div>

          <div className="reporting-comparison">
            <h3>Reporting API vs Legacy report-uri</h3>
            {(() => {
              const comparison = getReportingApiVsLegacyComparison()
              return (
                <div className="comparison-grid">
                  <div className="comparison-card">
                    <h4>{comparison.reportUri.name}</h4>
                    <p>{comparison.reportUri.description}</p>
                    <ul>
                      <li><strong>格式：</strong>{comparison.reportUri.format}</li>
                      <li><strong>方法：</strong>{comparison.reportUri.method}</li>
                      <li><strong>浏览器支持：</strong>{comparison.reportUri.browserSupport}</li>
                    </ul>
                    {comparison.reportUri.deprecated && (
                      <span className="deprecated-badge">已废弃</span>
                    )}
                  </div>
                  <div className="comparison-card">
                    <h4>{comparison.reportTo.name}</h4>
                    <p>{comparison.reportTo.description}</p>
                    <ul>
                      <li><strong>格式：</strong>{comparison.reportTo.format}</li>
                      <li><strong>方法：</strong>{comparison.reportTo.method}</li>
                      <li><strong>浏览器支持：</strong>{comparison.reportTo.browserSupport}</li>
                    </ul>
                  </div>
                </div>
              )
            })()}

            <div className="differences-list">
              <h4>主要差异</h4>
              <ul>
                {getReportingApiVsLegacyComparison().differences.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有解析和模拟均在浏览器本地执行，不发送任何数据。
          </li>
          <li>
            <strong>指令合并：</strong>重复的指令会自动合并源列表，符合 CSP 规范。
          </li>
          <li>
            <strong>违规模拟：</strong>模拟结果仅供参考，实际行为以浏览器为准。
          </li>
          <li>
            <strong>Hash/Nonce：</strong>内联脚本的 hash/nonce 验证需要在实际运行时计算。
          </li>
        </ul>
      </div>
    </div>
  )
}
