import { useCallback, useEffect, useRef, useState } from 'react'
import { processShellEscape } from './logic/index.js'
import {
  SHELL_PROFILES,
  SHELL_PROFILE_NAMES,
  EXAMPLE_CASES,
  QUICK_REFERENCE_CATEGORIES,
  RULE_DESCRIPTIONS,
  MAX_INPUT_CHARS,
} from './logic/constants.js'
import './ShellEscapeReferenceTool.css'

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

function charToVisible(char) {
  switch (char) {
    case ' ':
      return '␣'
    case '\t':
      return '→'
    case '\n':
      return '↵'
    case '\r':
      return '␍'
    default:
      return char
  }
}

function getRiskClass(riskLevel) {
  switch (riskLevel) {
    case 'critical':
      return 'risk-critical'
    case 'high':
      return 'risk-high'
    case 'medium':
      return 'risk-medium'
    case 'low':
    default:
      return 'risk-low'
  }
}

function getRiskLabel(riskLevel) {
  switch (riskLevel) {
    case 'critical':
      return '极高风险'
    case 'high':
      return '高风险'
    case 'medium':
      return '中等风险'
    case 'low':
    default:
      return '低风险'
  }
}

export default function ShellEscapeReferenceTool() {
  const [activeTab, setActiveTab] = useState('forward')
  const [rawText, setRawText] = useState('')
  const [shellProfile, setShellProfile] = useState(SHELL_PROFILES.POSIX_BASH_LITE)
  const [primaryQuoteStrategy, setPrimaryQuoteStrategy] = useState('double')
  const [showSpans, setShowSpans] = useState(false)
  const [result, setResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const debounceRef = useRef(null)

  const inverseMode = activeTab === 'inverse'

  const handleProcess = useCallback(() => {
    const processed = processShellEscape({
      rawText,
      shellProfile,
      primaryQuoteStrategy,
      inverseMode,
      maxInputChars: MAX_INPUT_CHARS,
    })
    setResult(processed)
  }, [rawText, shellProfile, primaryQuoteStrategy, inverseMode])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (rawText) {
        handleProcess()
      } else {
        setResult(null)
      }
    }, 300)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [rawText, shellProfile, primaryQuoteStrategy, inverseMode, handleProcess])

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

  const handleLoadExample = useCallback((example) => {
    setRawText(example.rawText)
    setResult(null)
  }, [])

  const handleClear = useCallback(() => {
    setRawText('')
    setResult(null)
  }, [])

  const handleProcessNow = useCallback(() => {
    handleProcess()
  }, [handleProcess])

  const renderErrorBox = () => {
    if (!result?.errorCode) return null
    return (
      <div className="error-box">
        <strong>处理错误</strong>
        <p>{result.errorMessage}</p>
        <div className="error-code">错误码：{result.errorCode}</div>
      </div>
    )
  }

  const renderResults = () => {
    if (!result || result.errorCode) return null

    if (inverseMode) {
      return (
        <>
          <div className="results-grid">
            <div className="result-card">
              <div className="result-card-header">
                <h4>解析结果（展开后原文）</h4>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(result.inverseExplanation?.expandedValue || '', '展开结果')}
                >
                  复制
                </button>
              </div>
              <div className="result-card-body">
                <pre className="result-value">
                  {escapeHtml(result.inverseExplanation?.expandedValue || '')}
                </pre>
              </div>
            </div>
          </div>

          <div className="inverse-section">
            <h3>分段拆解</h3>
            <div className="segments-list">
              {result.inverseExplanation?.segments?.map((segment, idx) => (
                <div key={idx} className="segment-item">
                  <span className={`segment-type type-${segment.type}`}>
                    {segment.type === 'double_quoted' && '双引号'}
                    {segment.type === 'single_quoted' && '单引号'}
                    {segment.type === 'escaped' && '转义'}
                    {segment.type === 'literal' && '字面量'}
                  </span>
                  <span className="segment-content">
                    <strong>原：</strong><code>{escapeHtml(segment.raw)}</code>
                    {' → '}
                    <strong>值：</strong><code>{escapeHtml(segment.value)}</code>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="results-grid">
          <div className="result-card">
            <div className="result-card-header">
              <h4>双引号字面量</h4>
              <button
                className="copy-btn"
                onClick={() => handleCopy(result.quotedDouble, '双引号结果')}
              >
                复制
              </button>
            </div>
            <div className="result-card-body">
              <pre className="result-value">{escapeHtml(result.quotedDouble)}</pre>
            </div>
          </div>

          <div className="result-card">
            <div className="result-card-header">
              <h4>单引号字面量</h4>
              <button
                className="copy-btn"
                onClick={() => handleCopy(result.quotedSingle, '单引号结果')}
              >
                复制
              </button>
            </div>
            <div className="result-card-body">
              <pre className="result-value">{escapeHtml(result.quotedSingle)}</pre>
            </div>
          </div>

          <div className="result-card">
            <div className="result-card-header">
              <h4>无引号分析</h4>
            </div>
            <div className="result-card-body">
              <pre className="result-value">
                {escapeHtml(result.bareLineGuidance?.recommendation || '')}
              </pre>
              {result.bareLineGuidance?.issues?.length > 0 && (
                <div className={`risk-box ${getRiskClass(result.riskMarkers?.overallRisk)}`}>
                  <strong>风险提示：</strong>
                  <ul>
                    {result.bareLineGuidance.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {result.riskMarkers && (
          <div className="tool-section">
            <h3>风险评估</h3>
            <div className={`risk-box ${getRiskClass(result.riskMarkers.overallRisk)}`}>
              <strong>整体风险等级：{getRiskLabel(result.riskMarkers.overallRisk)}</strong>
            </div>
            <div className="stats-row" style={{ marginTop: '12px' }}>
              {result.riskMarkers.criticalCount > 0 && (
                <span className="stat-item">
                  <span className="stat-badge risk-critical">极高风险</span>
                  <span>{result.riskMarkers.criticalCount} 处</span>
                </span>
              )}
              {result.riskMarkers.highCount > 0 && (
                <span className="stat-item">
                  <span className="stat-badge risk-high">高风险</span>
                  <span>{result.riskMarkers.highCount} 处</span>
                </span>
              )}
              {result.riskMarkers.mediumCount > 0 && (
                <span className="stat-item">
                  <span className="stat-badge risk-medium">中等</span>
                  <span>{result.riskMarkers.mediumCount} 处</span>
                </span>
              )}
            </div>
            {result.riskMarkers.highRiskSpans?.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong>高危片段：</strong>
                <ul>
                  {result.riskMarkers.highRiskSpans.map((span, idx) => (
                    <li key={idx}>
                      <code>{escapeHtml(span.text)}</code> - {span.categoryName}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {showSpans && result.explainedSpans?.length > 0 && (
          <div className="spans-section tool-section">
            <h3>字符规则拆解</h3>
            <div className="spans-display">
              {result.explainedSpans.map((span, idx) => (
                <span
                  key={idx}
                  className={`span-item span-${span.category}`}
                  title={`${span.categoryName} (风险: ${getRiskLabel(span.riskLevel)})`}
                >
                  {Array.from(span.text).map((c, i) => (
                    <span key={i}>{charToVisible(c)}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  const renderQuickReference = () => (
    <div className="quick-reference tool-section">
      <h3>分类速查</h3>
      {QUICK_REFERENCE_CATEGORIES.map((cat, idx) => (
        <div key={idx} className="reference-category">
          <h4>{cat.category}</h4>
          <table className="reference-table">
            <thead>
              <tr>
                <th>字符</th>
                <th>名称</th>
                <th>双引号</th>
                <th>单引号</th>
                <th>无引号</th>
              </tr>
            </thead>
            <tbody>
              {cat.items.map((item, itemIdx) => (
                <tr key={itemIdx}>
                  <td><code>{escapeHtml(item.char)}</code></td>
                  <td>{item.name}</td>
                  <td>{item.double}</td>
                  <td>{item.single}</td>
                  <td>{item.bare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )

  const renderRulesSection = () => (
    <div className="rules-section tool-section">
      <h3>引号规则详情</h3>
      <div className="rules-list">
        {Object.entries(RULE_DESCRIPTIONS).map(([key, rule]) => (
          <div key={key} className="rule-item">
            <h4>{rule.name}</h4>
            <p>{rule.description}</p>
            {rule.rules.length > 0 && (
              <ul>
                {rule.rules.map((item, idx) => (
                  <li key={idx}>
                    <code>{escapeHtml(item.char)}</code>: {item.rule}
                    {item.note && (
                      <span style={{ color: '#6c757d', fontSize: '12px' }}>
                        {' '}（{item.note}）
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderDisclaimer = () => (
    <div className="disclaimer">
      <h4>⚠️ 安全声明</h4>
      <p>
        此工具<strong>仅用于字符串规则演示</strong>，不会执行任何真实的 shell 命令或 subprocess。
        请始终注意以下事项：
      </p>
      <ul>
        <li>
          转义规则基于常见的 Bash/POSIX 约定，实际行为可能因 shell 版本、配置和交互模式而异。
        </li>
        <li>
          切勿直接复制不可信来源的命令片段到生产环境执行。
        </li>
        <li>
          包含命令替换（<code>`</code> 或 <code>$()</code>）的片段应被视为极度危险。
        </li>
        <li>
          在处理用户输入时，应始终使用编程语言的安全 API 而非字符串拼接。
        </li>
      </ul>
    </div>
  )

  return (
    <div className="shell-escape-tool">
      {copyStatus && (
        <div className={`tool-toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>Shell 转义工作台</h2>
        
        <div className="tab-container">
          <button
            className={`tab-btn ${activeTab === 'forward' ? 'active' : ''}`}
            onClick={() => { setActiveTab('forward'); setResult(null) }}
          >
            正向模式（原文 → 脚本片段）
          </button>
          <button
            className={`tab-btn ${activeTab === 'inverse' ? 'active' : ''}`}
            onClick={() => { setActiveTab('inverse'); setResult(null) }}
          >
            反向模式（已转义片段 → 拆解解读）
          </button>
        </div>

        <div className="form-group full-width">
          <label htmlFor="raw-text">
            {activeTab === 'forward' ? '输入原文（要放入脚本的文本）' : '输入已转义/引号包裹的片段'}
          </label>
          <textarea
            id="raw-text"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              activeTab === 'forward'
                ? '例如：Hello $World `whoami` 或包含特殊字符的任意文本...'
                : '例如："hello \\"world\\"" 或 \'single quoted\''
            }
            spellCheck={false}
          />
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
            字符数：{rawText.length} / {MAX_INPUT_CHARS}
            {rawText.length > MAX_INPUT_CHARS * 0.9 && (
              <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                ⚠️ 接近上限
              </span>
            )}
          </div>
        </div>

        <div className="options-row">
          <div className="option-item">
            <label htmlFor="shell-profile">Shell 配置：</label>
            <select
              id="shell-profile"
              value={shellProfile}
              onChange={(e) => setShellProfile(e.target.value)}
            >
              {Object.entries(SHELL_PROFILE_NAMES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <label className="option-item">
            <input
              type="checkbox"
              checked={showSpans}
              onChange={(e) => setShowSpans(e.target.checked)}
            />
            <span>显示字符规则拆解</span>
          </label>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleProcessNow}
            disabled={!rawText.trim()}
          >
            处理
          </button>
          {rawText && (
            <button className="secondary-btn" onClick={handleClear}>
              清除
            </button>
          )}
        </div>

        <div className="examples-section">
          <h3>示例（点击填入）</h3>
          <div className="examples-grid">
            {EXAMPLE_CASES.map((example, idx) => (
              <button
                key={idx}
                className="example-btn"
                onClick={() => handleLoadExample(example)}
                title={example.description}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {renderErrorBox()}
      {renderResults()}
      {renderQuickReference()}
      {renderRulesSection()}
      {renderDisclaimer()}
    </div>
  )
}
