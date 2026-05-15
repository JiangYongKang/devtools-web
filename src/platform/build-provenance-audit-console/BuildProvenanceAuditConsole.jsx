import React, { useState } from 'react'
import './BuildProvenanceAuditConsole.css'
import {
  getBuildInfo,
  formatBuildTime,
  shortenCommitHash,
  generateDemoBuildInfo
} from './logic/versionPanel'
import {
  parseAuditJson,
  getAuditSummary
} from './logic/auditParser'
import {
  vulnerabilitiesToCsv
} from './logic/csvExport'
import {
  parseLicensesJson,
  getLicenseSummary,
  licensesToCsv
} from './logic/licenseParser'
import {
  checkSourceMapLeaks
} from './logic/riskCheck'
import {
  SOURCE_MAP_STRATEGIES,
  MERMAID_ERROR_REPORT_FLOW,
  SOURCEMAP_LEAK_CHECKS
} from './logic/constants'
import demoAudit from './logic/fixtures/demoAudit.json'
import demoLicenses from './logic/fixtures/demoLicenses.json'
import demoSBOM from './logic/fixtures/demoSBOM.xml?raw'
import SequenceDiagram from './SequenceDiagram'

const BuildProvenanceAuditConsole = () => {
  const [activeTab, setActiveTab] = useState('version')
  const [auditJson, setAuditJson] = useState('')
  const [auditResult, setAuditResult] = useState(null)
  const [licensesJson, setLicensesJson] = useState('')
  const [licensesResult, setLicensesResult] = useState(null)
  const [riskConfig, setRiskConfig] = useState({
    hasPublicMapFiles: false,
    hasInlineSourceMap: false,
    hasSourceMappingURL: true,
    hasWideCORS: false,
    buildConfig: ''
  })

  const buildInfo = typeof window !== 'undefined' 
    ? getBuildInfo() 
    : generateDemoBuildInfo()

  const handleParseAudit = () => {
    try {
      const data = parseAuditJson(auditJson || JSON.stringify(demoAudit))
      setAuditResult(getAuditSummary(data))
    } catch (e) {
      alert('解析失败: ' + e.message)
    }
  }

  const handleLoadDemoAudit = () => {
    setAuditJson(JSON.stringify(demoAudit, null, 2))
  }

  const handleExportAuditCsv = () => {
    if (!auditResult) return
    const csv = vulnerabilitiesToCsv(auditResult.vulnerabilities)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'audit-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleParseLicenses = () => {
    try {
      const data = parseLicensesJson(licensesJson || JSON.stringify(demoLicenses))
      setLicensesResult(getLicenseSummary(data))
    } catch (e) {
      alert('解析失败: ' + e.message)
    }
  }

  const handleLoadDemoLicenses = () => {
    setLicensesJson(JSON.stringify(demoLicenses, null, 2))
  }

  const handleExportLicensesCsv = () => {
    if (!licensesResult) return
    const csv = licensesToCsv(licensesResult.licenses)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'licenses-report.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const riskCheckResult = checkSourceMapLeaks(riskConfig)

  const getSeverityBadgeClass = (severity) => {
    const s = severity?.toLowerCase()
    if (s === 'critical') return 'bpac-badge-critical'
    if (s === 'high') return 'bpac-badge-high'
    if (s === 'medium') return 'bpac-badge-medium'
    if (s === 'low') return 'bpac-badge-low'
    return 'bpac-badge-success'
  }

  const getSeverityLabel = (severity) => {
    const labels = { critical: '严重', high: '高危', medium: '中危', low: '低危' }
    return labels[severity?.toLowerCase()] || severity
  }

  return (
    <div className="bpac-container">
      <div className="bpac-header">
        <h1 className="bpac-title">构建来源审计控制台</h1>
        <p className="bpac-subtitle">
          版本信息 · Source Map 策略 · 安全漏洞审计 · 许可证合规
        </p>
      </div>

      <div className="bpac-tabs">
        <button
          className={`bpac-tab ${activeTab === 'version' ? 'active' : ''}`}
          onClick={() => setActiveTab('version')}
        >
          版本信息
        </button>
        <button
          className={`bpac-tab ${activeTab === 'sourcemap' ? 'active' : ''}`}
          onClick={() => setActiveTab('sourcemap')}
        >
          Source Map 策略
        </button>
        <button
          className={`bpac-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          安全审计
        </button>
        <button
          className={`bpac-tab ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          许可证
        </button>
        <button
          className={`bpac-tab ${activeTab === 'risks' ? 'active' : ''}`}
          onClick={() => setActiveTab('risks')}
        >
          风险清单
        </button>
      </div>

      {activeTab === 'version' && (
        <div className="bpac-section">
          <h2 className="bpac-section-title">运行时版本信息</h2>
          <div className="bpac-version-info">
            <div className="bpac-version-card">
              <div className="bpac-version-label">应用版本</div>
              <div className="bpac-version-value">{buildInfo.packageVersion}</div>
            </div>
            <div className="bpac-version-card">
              <div className="bpac-version-label">Git Commit</div>
              <div className="bpac-version-value">{shortenCommitHash(buildInfo.gitCommit)}</div>
            </div>
            <div className="bpac-version-card">
              <div className="bpac-version-label">构建时间</div>
              <div className="bpac-version-value">{formatBuildTime(buildInfo.buildTime)}</div>
            </div>
            <div className="bpac-version-card">
              <div className="bpac-version-label">运行环境</div>
              <div className="bpac-version-value">{buildInfo.environment}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sourcemap' && (
        <>
          <div className="bpac-section">
            <h2 className="bpac-section-title">Source Map 策略对比</h2>
            {SOURCE_MAP_STRATEGIES.map((strategy) => (
              <div key={strategy.id} className="bpac-strategy-card">
                <div className="bpac-strategy-name">{strategy.name}</div>
                <div className="bpac-strategy-desc">{strategy.description}</div>
                <div className="bpac-pros-cons">
                  <div>
                    <strong style={{ color: '#16a34a', fontSize: '13px' }}>优点</strong>
                    <ul className="bpac-pros-list">
                      {strategy.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                    </ul>
                  </div>
                  <div>
                    <strong style={{ color: '#dc2626', fontSize: '13px' }}>缺点</strong>
                    <ul className="bpac-cons-list">
                      {strategy.cons.map((con, i) => <li key={i}>{con}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bpac-section">
            <h2 className="bpac-section-title">错误上报时序图</h2>
            <div className="bpac-mermaid-container">
              <SequenceDiagram code={MERMAID_ERROR_REPORT_FLOW} renderMode="svg" />
            </div>
          </div>
        </>
      )}

      {activeTab === 'audit' && (
        <div className="bpac-section">
          <h2 className="bpac-section-title">安全漏洞审计</h2>
          <div className="bpac-textarea-container">
            <textarea
              className="bpac-textarea"
              value={auditJson}
              onChange={(e) => setAuditJson(e.target.value)}
              placeholder="粘贴 npm audit 或 yarn audit 的 JSON 输出..."
            />
          </div>
          <div className="bpac-btn-group">
            <button className="bpac-btn bpac-btn-primary" onClick={handleParseAudit}>
              解析审计报告
            </button>
            <button className="bpac-btn bpac-btn-secondary" onClick={handleLoadDemoAudit}>
              加载示例数据
            </button>
            {auditResult && (
              <button className="bpac-btn bpac-btn-secondary" onClick={handleExportAuditCsv}>
                导出 CSV
              </button>
            )}
          </div>

          {auditResult && (
            <>
              <div className="bpac-stats" style={{ marginTop: '24px' }}>
                <div className="bpac-stat-card bpac-stat-critical">
                  <div className="bpac-stat-value">{auditResult.counts.critical}</div>
                  <div className="bpac-stat-label">严重</div>
                </div>
                <div className="bpac-stat-card bpac-stat-high">
                  <div className="bpac-stat-value">{auditResult.counts.high}</div>
                  <div className="bpac-stat-label">高危</div>
                </div>
                <div className="bpac-stat-card bpac-stat-medium">
                  <div className="bpac-stat-value">{auditResult.counts.medium}</div>
                  <div className="bpac-stat-label">中危</div>
                </div>
                <div className="bpac-stat-card bpac-stat-low">
                  <div className="bpac-stat-value">{auditResult.counts.low}</div>
                  <div className="bpac-stat-label">低危</div>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>按包分组</h3>
              {auditResult.groupedPackages.map((pkg, i) => (
                <div key={i} className="bpac-package-group">
                  <div className="bpac-package-header">
                    <span className="bpac-package-name">{pkg.packageName}</span>
                    <span className={`bpac-badge ${getSeverityBadgeClass(pkg.maxSeverity)}`}>
                      {getSeverityLabel(pkg.maxSeverity)}
                    </span>
                  </div>
                  <div className="bpac-table-container">
                    <table className="bpac-table">
                      <thead>
                        <tr>
                          <th>漏洞标题</th>
                          <th>严重级别</th>
                          <th>CVSS 分数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pkg.vulnerabilities.map((vuln, j) => (
                          <tr key={j}>
                            <td>{vuln.title}</td>
                            <td>
                              <span className={`bpac-badge ${getSeverityBadgeClass(vuln.severity)}`}>
                                {getSeverityLabel(vuln.severity)}
                              </span>
                            </td>
                            <td>{vuln.cvssScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'licenses' && (
        <div className="bpac-section">
          <h2 className="bpac-section-title">许可证合规检查</h2>
          <div className="bpac-textarea-container">
            <textarea
              className="bpac-textarea"
              value={licensesJson}
              onChange={(e) => setLicensesJson(e.target.value)}
              placeholder="粘贴 license-checker 或类似工具的 JSON 输出..."
            />
          </div>
          <div className="bpac-btn-group">
            <button className="bpac-btn bpac-btn-primary" onClick={handleParseLicenses}>
              解析许可证
            </button>
            <button className="bpac-btn bpac-btn-secondary" onClick={handleLoadDemoLicenses}>
              加载示例数据
            </button>
            {licensesResult && (
              <button className="bpac-btn bpac-btn-secondary" onClick={handleExportLicensesCsv}>
                导出 CSV
              </button>
            )}
          </div>

          {licensesResult && (
            <>
              <div className="bpac-stats" style={{ marginTop: '24px' }}>
                <div className="bpac-stat-card bpac-stat-low">
                  <div className="bpac-stat-value">{licensesResult.allowlistedCount}</div>
                  <div className="bpac-stat-label">合规数量</div>
                </div>
                <div className="bpac-stat-card bpac-stat-critical">
                  <div className="bpac-stat-value">{licensesResult.conflictCount}</div>
                  <div className="bpac-stat-label">冲突数量</div>
                </div>
                <div className="bpac-stat-card" style={{ background: '#f0f9ff' }}>
                  <div className="bpac-stat-value" style={{ color: '#0284c7' }}>
                    {licensesResult.totalPackages}
                  </div>
                  <div className="bpac-stat-label">总依赖数</div>
                </div>
              </div>

              {licensesResult.conflictCount > 0 && (
                <>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>⚠️ 许可证冲突</h3>
                  <div className="bpac-table-container" style={{ marginBottom: '24px' }}>
                    <table className="bpac-table">
                      <thead>
                        <tr>
                          <th>包名</th>
                          <th>版本</th>
                          <th>许可证</th>
                        </tr>
                      </thead>
                      <tbody>
                        {licensesResult.conflicts.map((pkg, i) => (
                          <tr key={i}>
                            <td style={{ fontFamily: 'monospace' }}>{pkg.packageName}</td>
                            <td>{pkg.version}</td>
                            <td>
                              <span className="bpac-badge bpac-badge-danger">{pkg.license}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>许可证类型统计</h3>
              {licensesResult.groupedByType.map((group, i) => (
                <div key={i} className="bpac-license-type">
                  <span>
                    <span className="bpac-license-name">{group.license}</span>
                    {' '}
                    {!group.isAllowlisted && (
                      <span className="bpac-badge bpac-badge-warning">不在白名单</span>
                    )}
                    {group.isAllowlisted && (
                      <span className="bpac-badge bpac-badge-success">合规</span>
                    )}
                  </span>
                  <span className="bpac-license-count">{group.count} 个包</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'risks' && (
        <>
          <div className="bpac-section">
            <h2 className="bpac-section-title">Source Map 泄露风险检查</h2>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={riskConfig.hasPublicMapFiles}
                    onChange={(e) => setRiskConfig({ ...riskConfig, hasPublicMapFiles: e.target.checked })}
                  />
                  <span>public 目录暴露 .map 文件</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={riskConfig.hasInlineSourceMap}
                    onChange={(e) => setRiskConfig({ ...riskConfig, hasInlineSourceMap: e.target.checked })}
                  />
                  <span>使用 inline-source-map</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={riskConfig.hasSourceMappingURL}
                    onChange={(e) => setRiskConfig({ ...riskConfig, hasSourceMappingURL: e.target.checked })}
                  />
                  <span>文件末尾保留 sourceMappingURL</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={riskConfig.hasWideCORS}
                    onChange={(e) => setRiskConfig({ ...riskConfig, hasWideCORS: e.target.checked })}
                  />
                  <span>Source Map 服务器 CORS 配置过宽</span>
                </label>
              </div>
            </div>

            <div className="bpac-stats">
              <div className={`bpac-stat-card ${riskCheckResult.findings.length > 0 ? 'bpac-stat-critical' : 'bpac-stat-low'}`}>
                <div className="bpac-stat-value">{riskCheckResult.findings.length}</div>
                <div className="bpac-stat-label">发现风险</div>
              </div>
              <div className="bpac-stat-card bpac-stat-low">
                <div className="bpac-stat-value">{riskCheckResult.passedChecks}</div>
                <div className="bpac-stat-label">通过检查</div>
              </div>
              <div className="bpac-stat-card" style={{ background: '#f0f9ff' }}>
                <div className="bpac-stat-value" style={{ color: '#0284c7' }}>{riskCheckResult.totalChecks}</div>
                <div className="bpac-stat-label">总检查项</div>
              </div>
            </div>

            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>检查结果</h3>
            <ul className="bpac-risk-checklist">
              {SOURCEMAP_LEAK_CHECKS.map((check) => {
                const hasFinding = riskCheckResult.findings.some(f => f.id === check.id)
                return (
                  <li key={check.id} className="bpac-risk-item">
                    <span className="bpac-risk-status">{hasFinding ? '⚠️' : '✅'}</span>
                    <div className="bpac-risk-content">
                      <div className="bpac-risk-name">{check.name}</div>
                      <div className="bpac-risk-desc">{check.description}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="bpac-section">
            <h2 className="bpac-section-title">SBOM (CycloneDX) 预览</h2>
            <div className="bpac-textarea-container">
              <textarea
                className="bpac-textarea"
                value={demoSBOM}
                readOnly
                placeholder="SBOM XML 内容..."
              />
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px' }}>
              支持解析 CycloneDX 格式的 SBOM 文件，提取组件名称、版本、许可证信息
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default BuildProvenanceAuditConsole
