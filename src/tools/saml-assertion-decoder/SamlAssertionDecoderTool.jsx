import { useCallback, useState } from 'react'
import {
  decodeSamlAssertion,
  validateTiming,
  validateAudience,
  formatSamlTimestamp,
} from './logic/decoder.js'
import { getExample, getAllExamplesInfo } from './logic/examples.js'
import './SamlAssertionDecoderTool.css'

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

function formatXml(xml) {
  const PADDING = '  '
  const reg = /(>)(<)(\/*)/g
  let pad = 0
  let formatted = xml.replace(reg, '$1\n$2$3')
  formatted = formatted.split('\n').map((node) => {
    let indent = 0
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) {
        pad -= 1
      }
    } else if (node.match(/^<\w[^>]*[^/].*>$/)) {
      indent = 1
    } else {
      indent = 0
    }
    const padding = new Array(pad + 1).join(PADDING)
    pad += indent
    return padding + node
  }).join('\n')
  return formatted
}

function XmlTreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  if (node.type === 'text') {
    return (
      <div className="tree-text" style={{ marginLeft: depth * 20 }}>
        {escapeHtml(node.content)}
      </div>
    )
  }
  if (node.type !== 'element') return null
  const hasChildren = node.children && node.children.length > 0
  const attrStr = Object.entries(node.attributes)
    .map(([k, v]) => ` <span class="tree-attribute">${escapeHtml(k)}</span>="<span class="tree-attr-value">${escapeHtml(v)}</span>"`)
    .join('')
  return (
    <div className="tree-node">
      <div className="tree-element">
        {hasChildren && (
          <span
            className="tree-toggle"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '▶'}
          </span>
        )}
        &lt;<span className="tree-element-name">{escapeHtml(node.name)}</span>
        <span dangerouslySetInnerHTML={{ __html: attrStr }} />
        {hasChildren ? '&gt;' : ' /&gt;'}
      </div>
      {expanded && hasChildren && (
        <>
          {node.children.map((child, idx) => (
            <XmlTreeNode key={idx} node={child} depth={depth + 1} />
          ))}
          <div className="tree-element" style={{ marginLeft: 0 }}>
            &lt;/<span className="tree-element-name">{escapeHtml(node.name)}</span>&gt;
          </div>
        </>
      )}
    </div>
  )
}

export default function SamlAssertionDecoderTool() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date().toISOString().slice(0, 16))
  const [expectedSpEntityId, setExpectedSpEntityId] = useState('https://sp.example.com/metadata')
  const examplesInfo = getAllExamplesInfo()
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
  const handleDownload = useCallback((content, filename) => {
    const blob = new Blob([content], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])
  const handleDecode = useCallback(() => {
    setError(null)
    setResult(null)
    try {
      const decodeResult = decodeSamlAssertion(input)
      setResult(decodeResult)
    } catch (e) {
      setError(e)
    }
  }, [input])
  const handleLoadExample = useCallback((exampleKey) => {
    const example = getExample(exampleKey)
    if (example) {
      setInput(example)
      setResult(null)
      setError(null)
    }
  }, [])
  const handleClear = useCallback(() => {
    setInput('')
    setResult(null)
    setError(null)
  }, [])
  const handleUseCurrentTime = useCallback(() => {
    setCurrentTime(new Date().toISOString().slice(0, 16))
  }, [])
  const timingValidation = result?.fields?.conditions
    ? validateTiming(result.fields.conditions, new Date(currentTime))
    : null
  const audienceValidation = result?.fields?.conditions
    ? validateAudience(result.fields.conditions, expectedSpEntityId)
    : null
  const fieldsJson = result ? JSON.stringify(result.fields, null, 2) : ''
  const renderError = () => {
    if (!error) return null
    return (
      <div className="error-box">
        <strong>解码失败</strong>
        <p>{error.errorMessage}</p>
        {error.location && (error.location.line || error.location.column) && (
          <div className="error-location">
            位置：第 {error.location.line || '-'} 行，第 {error.location.column || '-'} 列
          </div>
        )}
      </div>
    )
  }
  const renderValidationResults = () => {
    if (!result) return null
    return (
      <div className="validation-results">
        {timingValidation && (
          <div className={`validation-card ${timingValidation.status}`}>
            <div className="validation-title">时间有效性</div>
            <div className="validation-message">{timingValidation.message}</div>
            {timingValidation.currentTime && (
              <div className="validation-detail">当前时间：{timingValidation.currentTime}</div>
            )}
            {timingValidation.notBefore && (
              <div className="validation-detail">生效时间：{timingValidation.notBefore}</div>
            )}
            {timingValidation.notOnOrAfter && (
              <div className="validation-detail">过期时间：{timingValidation.notOnOrAfter}</div>
            )}
          </div>
        )}
        {audienceValidation && (
          <div className={`validation-card ${audienceValidation.status}`}>
            <div className="validation-title">受众验证</div>
            <div className="validation-message">{audienceValidation.message}</div>
            {audienceValidation.audiences && audienceValidation.audiences.length > 0 && (
              <div className="validation-detail">
                实际受众：
                <ul>
                  {audienceValidation.audiences.map((aud, idx) => (
                    <li key={idx}>{aud}</li>
                  ))}
                </ul>
              </div>
            )}
            {audienceValidation.expected && (
              <div className="validation-detail">期望受众：{audienceValidation.expected}</div>
            )}
          </div>
        )}
      </div>
    )
  }
  const renderFieldsSummary = () => {
    if (!result || !result.fields) return null
    const { fields } = result
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">字段摘要</span>
          <div className="result-actions">
            <button
              className="copy-btn"
              onClick={() => handleCopy(fieldsJson, '字段摘要 JSON')}
            >
              复制
            </button>
            <button
              className="copy-btn"
              onClick={() => handleDownload(fieldsJson, 'saml-fields.json')}
            >
              下载
            </button>
          </div>
        </div>
        <div className="fields-summary">
          <div className="field-card">
            <h4>基本信息</h4>
            <div className="field-row">
              <span className="field-name">包装类型</span>
              <span className="field-value">{fields.wrapper}</span>
            </div>
            <div className="field-row">
              <span className="field-name">版本</span>
              <span className="field-value">{fields.version || '-'}</span>
            </div>
            <div className="field-row">
              <span className="field-name">断言ID</span>
              <span className="field-value">{fields.assertionId || '-'}</span>
            </div>
            <div className="field-row">
              <span className="field-name">签发时间</span>
              <span className="field-value">{fields.issueInstantRaw || '-'}</span>
            </div>
            <div className="field-row">
              <span className="field-name">签发者</span>
              <span className="field-value">{fields.issuer || '-'}</span>
            </div>
            <div className="field-row">
              <span className="field-name">签名</span>
              <span className="field-value">{fields.hasSignature ? '存在' : '不存在'}</span>
            </div>
          </div>
          <div className="field-card">
            <h4>Subject</h4>
            {fields.nameID ? (
              <>
                <div className="field-row">
                  <span className="field-name">NameID</span>
                  <span className="field-value">{fields.nameID.value || '-'}</span>
                </div>
                <div className="field-row">
                  <span className="field-name">Format</span>
                  <span className="field-value">{fields.nameID.format || '-'}</span>
                </div>
                {fields.nameID.nameQualifier && (
                  <div className="field-row">
                    <span className="field-name">NameQualifier</span>
                    <span className="field-value">{fields.nameID.nameQualifier}</span>
                  </div>
                )}
                {fields.nameID.spNameQualifier && (
                  <div className="field-row">
                    <span className="field-name">SPNameQualifier</span>
                    <span className="field-value">{fields.nameID.spNameQualifier}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="field-row">
                <span className="field-value">无 NameID</span>
              </div>
            )}
          </div>
          <div className="field-card">
            <h4>Conditions</h4>
            {fields.conditions ? (
              <>
                <div className="field-row">
                  <span className="field-name">NotBefore</span>
                  <span className="field-value">{fields.conditions.notBeforeRaw || '-'}</span>
                </div>
                <div className="field-row">
                  <span className="field-name">NotOnOrAfter</span>
                  <span className="field-value">{fields.conditions.notOnOrAfterRaw || '-'}</span>
                </div>
                {fields.conditions.audiences.length > 0 && (
                  <div className="field-row">
                    <span className="field-name">Audience</span>
                    <span className="field-value">
                      {fields.conditions.audiences.join(', ')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="field-row">
                <span className="field-value">无 Conditions</span>
              </div>
            )}
          </div>
          <div className="field-card">
            <h4>AuthnStatement</h4>
            {fields.authnStatement ? (
              <>
                <div className="field-row">
                  <span className="field-name">SessionIndex</span>
                  <span className="field-value">{fields.authnStatement.sessionIndex || '-'}</span>
                </div>
                <div className="field-row">
                  <span className="field-name">AuthnInstant</span>
                  <span className="field-value">{fields.authnStatement.authnInstantRaw || '-'}</span>
                </div>
                <div className="field-row">
                  <span className="field-name">ContextClassRef</span>
                  <span className="field-value">{fields.authnStatement.authnContextClassRef || '-'}</span>
                </div>
              </>
            ) : (
              <div className="field-row">
                <span className="field-value">无 AuthnStatement</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  const renderXmlTree = () => {
    if (!result || !result.xmlTree) return null
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">XML 结构树</span>
        </div>
        <div className="xml-tree">
          <XmlTreeNode node={result.xmlTree} />
        </div>
      </div>
    )
  }
  const renderRawXml = () => {
    if (!result || !result.xml) return null
    const formattedXml = formatXml(result.xml)
    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">解码后的 XML (编码: {result.encoding})</span>
          <div className="result-actions">
            <button
              className="copy-btn"
              onClick={() => handleCopy(formattedXml, 'Assertion XML')}
            >
              复制
            </button>
            <button
              className="copy-btn"
              onClick={() => handleDownload(formattedXml, 'saml-assertion.xml')}
            >
              下载
            </button>
          </div>
        </div>
        <pre className="result-value">{escapeHtml(formattedXml)}</pre>
      </div>
    )
  }
  return (
    <div className="saml-assertion-decoder">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}
      <h1>SAML 2.0 断言解码器</h1>
      <section className="tool-section">
        <h2>输入</h2>
        <div className="examples-row">
          {examplesInfo.map((example) => (
            <button
              key={example.key}
              className="example-btn"
              onClick={() => handleLoadExample(example.key)}
              title={example.description}
            >
              {example.name}
            </button>
          ))}
        </div>
        <div className="form-group full-width">
          <label htmlFor="saml-input">SAML Response/Assertion (Base64 或 XML)</label>
          <textarea
            id="saml-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请粘贴 SAML 2.0 Response 或 Assertion 的 Base64 编码，或直接粘贴 XML 内容..."
            spellCheck={false}
          />
        </div>
        <div className="validation-settings">
          <div className="setting-item">
            <label htmlFor="current-time">当前时间（用于时效校验）</label>
            <input
              id="current-time"
              type="datetime-local"
              value={currentTime}
              onChange={(e) => setCurrentTime(e.target.value)}
            />
          </div>
          <div className="setting-item">
            <label htmlFor="sp-entity-id">期望 SP Entity ID</label>
            <input
              id="sp-entity-id"
              type="text"
              value={expectedSpEntityId}
              onChange={(e) => setExpectedSpEntityId(e.target.value)}
              placeholder="https://sp.example.com/metadata"
            />
          </div>
          <div className="setting-item" style={{ justifyContent: 'flex-end' }}>
            <button
              className="secondary-btn"
              onClick={handleUseCurrentTime}
              style={{ marginTop: '20px' }}
            >
              使用当前时间
            </button>
          </div>
        </div>
        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleDecode}
            disabled={!input.trim()}
          >
            解码
          </button>
          {result && (
            <button className="secondary-btn" onClick={handleClear}>
              清除
            </button>
          )}
        </div>
        {renderError()}
      </section>
      {result && (
        <section className="result-section">
          <h2>解码结果</h2>
          {renderValidationResults()}
          {renderFieldsSummary()}
          {renderXmlTree()}
          {renderRawXml()}
        </section>
      )}
      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有解码和校验均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>支持格式：</strong>
            <ul>
              <li>Base64 编码的 SAML 2.0 Response/Assertion</li>
              <li>DEFLATE 压缩的 Base64 编码（HTTP-Redirect 绑定）</li>
              <li>原始 XML 格式</li>
            </ul>
          </li>
          <li>
            <strong>安全说明：</strong>使用字符串解析禁用 XXE，不进行签名验证，仅检查 Signature 元素存在性。
          </li>
          <li>
            <strong>示例数据：</strong>点击上方示例按钮可加载测试用例（有效、过期、Audience 不匹配）。
          </li>
        </ul>
      </div>
    </div>
  )
}
