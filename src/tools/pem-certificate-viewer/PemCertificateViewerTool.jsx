import { useCallback, useEffect, useState } from 'react'
import {
  analyzePemCertificates,
  certificatesToJson,
  escapeHtml,
  EXAMPLE_LABELS,
  EXAMPLE_PEMS,
  ERROR_CODES,
  getCategoryLabel,
} from './logic'
import './PemCertificateViewerTool.css'

const VIEW_MODES = {
  TABLE: 'table',
  PEM: 'pem',
  JSON: 'json',
}

function getErrorTitle(code) {
  const titles = {
    [ERROR_CODES.EMPTY_INPUT]: '输入为空',
    [ERROR_CODES.NO_VALID_BLOCKS]: '无有效证书',
    [ERROR_CODES.INVALID_BASE64]: 'Base64 解码失败',
    [ERROR_CODES.MALFORMED_ASN1]: '证书结构异常',
    [ERROR_CODES.NOT_A_CERTIFICATE]: '非证书类型',
    [ERROR_CODES.CERTIFICATE_PARSE_FAILED]: '证书解析失败',
    [ERROR_CODES.INVALID_PEM_FORMAT]: 'PEM 格式错误',
  }
  return titles[code] || '操作失败'
}

export default function PemCertificateViewerTool() {
  const [pemInput, setPemInput] = useState('')
  const [viewMode, setViewMode] = useState(VIEW_MODES.TABLE)
  const [activeCertIndex, setActiveCertIndex] = useState(0)
  const [copyStatus, setCopyStatus] = useState(null)
  const [parseResult, setParseResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeExample, setActiveExample] = useState(null)

  useEffect(() => {
    if (!pemInput.trim()) {
      setParseResult(null)
      return
    }

    let cancelled = false
    setIsAnalyzing(true)

    analyzePemCertificates(pemInput)
      .then(result => {
        if (!cancelled) {
          setParseResult(result)
          setActiveCertIndex(0)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAnalyzing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [pemInput])

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

  const handleExampleFill = useCallback((exampleKey) => {
    const pem = EXAMPLE_PEMS[exampleKey]
    setPemInput(pem)
    setActiveExample(exampleKey)
  }, [])

  const handleClear = useCallback(() => {
    setPemInput('')
    setParseResult(null)
    setActiveCertIndex(0)
    setActiveExample(null)
  }, [])

  const renderErrorBox = (err) => {
    if (!err) return null

    return (
      <div className="error-box">
        <strong>{getErrorTitle(err.code)}</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
        {err.details && (
          <p className="error-details" dangerouslySetInnerHTML={{ __html: escapeHtml(err.details) }} />
        )}
        {err.code && (
          <div className="error-code">错误代码：<code>{err.code}</code></div>
        )}
      </div>
    )
  }

  const renderPrivateKeyWarning = () => (
    <div className="warning-box">
      <strong>检测到私钥块</strong>
      <p>已检测到 PEM 私钥块（BEGIN PRIVATE KEY、BEGIN RSA PRIVATE KEY 等）。</p>
      <p>出于安全考虑，本工具<strong>不会解析或展示私钥内容</strong>，仅提示已检测到。请妥善保管您的私钥。</p>
    </div>
  )

  const renderWarnings = (warnings) => {
    if (!warnings || warnings.length === 0) return null

    return warnings.map((warning, index) => (
      <div key={index} className="warning-box">
        <strong>警告</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(warning.message) }} />
      </div>
    ))
  }

  const renderExamplesPanel = () => (
    <div className="examples-panel">
      <h3>示例</h3>
      <div className="examples-grid">
        {Object.entries(EXAMPLE_PEMS).map(([key, value]) => (
          <button
            key={key}
            className={`example-btn ${activeExample === key ? 'active' : ''}`}
            onClick={() => handleExampleFill(key)}
            title={value ? value.substring(0, 100) + '...' : '空字符串'}
          >
            {EXAMPLE_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  )

  const renderSummaryLine = (result) => {
    if (!result || !result.certificates) return null

    const certCount = result.certificates.length
    const firstCert = result.certificates[0]

    let summaryText = `检测到 ${certCount} 个证书`
    if (firstCert?.summary?.subject) {
      summaryText += ` | 主题: ${firstCert.summary.subject.substring(0, 80)}${firstCert.summary.subject.length > 80 ? '...' : ''}`
    }

    return (
      <div className="summary-line">
        <span className="summary-label">概要：</span>
        <span className="summary-text" dangerouslySetInnerHTML={{ __html: escapeHtml(summaryText) }} />
      </div>
    )
  }

  const renderCertTabs = (certificates) => {
    if (!certificates || certificates.length <= 1) return null

    return (
      <div className="cert-tabs">
        {certificates.map((cert, index) => (
          <button
            key={index}
            className={`cert-tab ${activeCertIndex === index ? 'active' : ''}`}
            onClick={() => setActiveCertIndex(index)}
          >
            证书 #{index + 1}
          </button>
        ))}
      </div>
    )
  }

  const renderTableView = (cert) => {
    if (!cert || !cert.summaryTable || cert.summaryTable.length === 0) {
      return (
        <div className="cert-card">
          <div className="cert-card-header">
            <span className="cert-card-title">证书详情</span>
          </div>
          <div className="empty-table">暂无解析结果</div>
        </div>
      )
    }

    const categories = {}
    for (const item of cert.summaryTable) {
      const cat = item.category || 'unknown'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push(item)
    }

    return (
      <div className="cert-card">
        <div className="cert-card-header">
          <span className="cert-card-title">
            证书 #{cert.index + 1} 详情
          </span>
          <button
            className="copy-btn small"
            onClick={() => handleCopy(
              cert.summaryTable.map((i) => `${i.label}: ${i.value}`).join('\n'),
              '证书摘要'
            )}
          >
            复制全部
          </button>
        </div>
        <div className="table-content">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category} className="category-group">
              <div className="category-header">{getCategoryLabel(category)}</div>
              <div className="category-items">
                {items.map((item, index) => (
                  <div key={`${item.key}-${index}`} className="table-row">
                    <div className="table-cell key-cell">
                      <span className="field-key">{item.label}</span>
                    </div>
                    <div className="table-cell value-cell">
                      <code className="field-value" dangerouslySetInnerHTML={{ __html: escapeHtml(String(item.value)) }} />
                      <button
                        className="copy-btn small"
                        style={{ marginTop: '0.25rem' }}
                        onClick={() => handleCopy(String(item.value), item.label)}
                      >
                        复制
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderPemView = (cert) => {
    if (!cert || !cert.rawPem) {
      return (
        <div className="cert-card">
          <div className="cert-card-header">
            <span className="cert-card-title">原始 PEM</span>
          </div>
          <div className="empty-table">暂无内容</div>
        </div>
      )
    }

    return (
      <div className="cert-card">
        <div className="cert-card-header">
          <span className="cert-card-title">证书 #{cert.index + 1} 原始 PEM</span>
          <button
            className="copy-btn small"
            onClick={() => handleCopy(cert.rawPem, 'PEM 证书')}
          >
            复制
          </button>
        </div>
        <pre
          className="raw-content"
          dangerouslySetInnerHTML={{ __html: escapeHtml(cert.rawPem) }}
        />
      </div>
    )
  }

  const renderJsonView = (result) => {
    const jsonString = certificatesToJson(result)

    return (
      <div className="cert-card">
        <div className="cert-card-header">
          <span className="cert-card-title">JSON 格式</span>
          <button
            className="copy-btn small"
            onClick={() => handleCopy(jsonString, 'JSON 结果')}
          >
            复制
          </button>
        </div>
        <pre
          className="json-content"
          dangerouslySetInnerHTML={{ __html: escapeHtml(jsonString) }}
        />
      </div>
    )
  }

  const activeCert = parseResult?.result?.certificates?.[activeCertIndex]

  return (
    <div className="pem-certificate-viewer">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>输入 PEM 证书</h2>

        {renderExamplesPanel()}

        <div className="input-section">
          <div className="input-header">
            <label htmlFor="pem-input">PEM 内容</label>
            <div className="input-meta">
              <span>
                字符：<code>{pemInput.length.toLocaleString()}</code>
              </span>
            </div>
          </div>
          <textarea
            id="pem-input"
            className="pem-textarea"
            value={pemInput}
            onChange={(e) => setPemInput(e.target.value)}
            placeholder="粘贴 PEM 格式的证书内容...&#10;&#10;支持格式：&#10;-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----&#10;&#10;也支持证书链（多个证书块）。"
            spellCheck={false}
          />

          <div className="action-row">
            <button
              className="secondary-btn"
              onClick={handleClear}
              disabled={!pemInput}
            >
              清除
            </button>
          </div>
        </div>
      </section>

      {parseResult && (
        <>
          <section className="tool-section">
            <div className="results-header">
              <h2>解析结果</h2>

              <div className="view-tabs">
                <button
                  className={`view-tab ${viewMode === VIEW_MODES.TABLE ? 'active' : ''}`}
                  onClick={() => setViewMode(VIEW_MODES.TABLE)}
                >
                  字段详情
                </button>
                <button
                  className={`view-tab ${viewMode === VIEW_MODES.PEM ? 'active' : ''}`}
                  onClick={() => setViewMode(VIEW_MODES.PEM)}
                >
                  原始 PEM
                </button>
                <button
                  className={`view-tab ${viewMode === VIEW_MODES.JSON ? 'active' : ''}`}
                  onClick={() => setViewMode(VIEW_MODES.JSON)}
                >
                  JSON
                </button>
              </div>
            </div>

            {parseResult.success && renderSummaryLine(parseResult.result)}

            {!parseResult.success && renderErrorBox(parseResult.error)}

            {parseResult.result?.privateKeyDetected && renderPrivateKeyWarning()}

            {renderWarnings(parseResult.result?.warnings)}

            {parseResult.success && (
              <>
                {renderCertTabs(parseResult.result.certificates)}

                {viewMode === VIEW_MODES.TABLE && activeCert && renderTableView(activeCert)}

                {viewMode === VIEW_MODES.PEM && activeCert && renderPemView(activeCert)}

                {viewMode === VIEW_MODES.JSON && renderJsonView(parseResult.result)}
              </>
            )}
          </section>
        </>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有解析均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>离线解析：</strong>基于内置 ASN.1 解析器进行解析，无需网络连接。
          </li>
          <li>
            <strong>安全保护：</strong>
            <ul>
              <li>本工具<strong>不支持私钥解析</strong>，仅提示已检测到私钥块。</li>
              <li>用户输入以纯文本方式渲染，自动转义特殊字符，防止 XSS 攻击。</li>
            </ul>
          </li>
          <li>
            <strong>功能限制：</strong>
            <ul>
              <li>不进行证书吊销状态校验（不联网查询 CRL/OCSP）。</li>
              <li>不执行证书信任链验证。</li>
              <li>仅展示解析结果，不做任何安全评估。</li>
            </ul>
          </li>
          <li>
            <strong>支持格式：</strong>
            <ul>
              <li>单段证书：<code>-----BEGIN CERTIFICATE-----</code></li>
              <li>证书链：多个证书块依次排列</li>
              <li>兼容 <code>X509 CERTIFICATE</code>、<code>TRUSTED CERTIFICATE</code> 等标签</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  )
}
