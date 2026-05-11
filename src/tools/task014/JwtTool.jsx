import { useCallback, useState } from 'react'
import { parseToken } from './logic'
import './JwtTool.css'

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

const SEGMENT_LABELS = [
  { key: 'header', label: 'Header', description: '包含算法和 token 类型信息' },
  { key: 'payload', label: 'Payload', description: '包含声明（claims）数据' },
  { key: 'signature', label: 'Signature', description: '用于验证 token 完整性（未验证）' },
]

export default function JwtTool() {
  const [tokenInput, setTokenInput] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [parseError, setParseError] = useState(null)
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
    setParseError(null)
    setParseResult(null)

    const result = parseToken(tokenInput)

    if (!result.success) {
      setParseError({
        code: result.errorCode,
        message: result.errorMessage,
      })
      return
    }

    setParseResult(result)
  }, [tokenInput])

  const handleClear = useCallback(() => {
    setTokenInput('')
    setParseResult(null)
    setParseError(null)
  }, [])

  const handleExample = useCallback(() => {
    const exampleHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const examplePayload = btoa(JSON.stringify({
      sub: '1234567890',
      name: 'John Doe',
      iat: 1516239022,
      exp: 1516242622,
      iss: 'example.com',
      aud: 'client-app',
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const exampleSignature = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    setTokenInput(`${exampleHeader}.${examplePayload}.${exampleSignature}`)
    setParseResult(null)
    setParseError(null)
  }, [])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <p>
          <code className="error-code">{escapeHtml(err.code)}</code>
        </p>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  const renderSegmentBox = (label, description, segment, jsonContent, segmentKey) => {
    return (
      <div className="segment-box" key={segmentKey}>
        <div className="segment-header">
          <span className="segment-label">{label}</span>
          <span className="segment-description">{description}</span>
        </div>

        <div className="segment-raw">
          <div className="section-header">
            <div className="raw-label">原始 Base64URL</div>
            <button
              className="copy-btn small"
              onClick={() => handleCopy(segment, `${label} 原始 Base64URL`)}
            >
              复制
            </button>
          </div>
          <pre
            className="raw-content"
            dangerouslySetInnerHTML={{ __html: escapeHtml(segment) }}
          />
        </div>

        {jsonContent !== undefined && (
          <div className="segment-json">
            <div className="section-header">
              <div className="json-label">解析 JSON</div>
              <button
                className="copy-btn small"
                onClick={() => handleCopy(jsonContent, `${label} 解析 JSON`)}
              >
                复制
              </button>
            </div>
            <pre
              className="json-content"
              dangerouslySetInnerHTML={{ __html: escapeHtml(jsonContent) }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="jwt-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>输入 JWT</h2>

        <div className="form-group full-width">
          <label htmlFor="jwt-input">粘贴 Token</label>
          <textarea
            id="jwt-input"
            className="jwt-textarea"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder={'请粘贴 JWT Token，格式为：\nheader.payload.signature'}
            spellCheck={false}
          />
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleParse}
            disabled={!tokenInput.trim()}
          >
            解码
          </button>
          <button
            className="secondary-btn"
            onClick={handleExample}
          >
            示例
          </button>
          {tokenInput && (
            <button
              className="secondary-btn"
              onClick={handleClear}
            >
              清除
            </button>
          )}
        </div>

        {renderErrorBox(parseError)}

        {parseResult && (
          <>
            <div className="security-warning-box">
              <div className="warning-icon">⚠</div>
              <div className="warning-content">
                <strong className="warning-title">{escapeHtml(parseResult.securityWarning)}</strong>
                <p className="warning-note">{escapeHtml(parseResult.auditNote)}</p>
              </div>
            </div>

            <div className="segments-section">
              <h3>Token 分段</h3>

              {renderSegmentBox(
                SEGMENT_LABELS[0].label,
                SEGMENT_LABELS[0].description,
                parseResult.headerSegment,
                parseResult.headerJson,
                SEGMENT_LABELS[0].key
              )}

              {renderSegmentBox(
                SEGMENT_LABELS[1].label,
                SEGMENT_LABELS[1].description,
                parseResult.payloadSegment,
                parseResult.payloadJson,
                SEGMENT_LABELS[1].key
              )}

              {renderSegmentBox(
                SEGMENT_LABELS[2].label,
                SEGMENT_LABELS[2].description,
                parseResult.signatureSegment,
                undefined,
                SEGMENT_LABELS[2].key
              )}
            </div>

            <div className="payload-info-box">
              <h3>载荷信息</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">显示长度</span>
                  <code className="info-value">{parseResult.payloadDisplayedLength}</code>
                </div>
                <div className="info-item">
                  <span className="info-label">是否截断</span>
                  <code className={`info-value ${parseResult.payloadTruncated ? 'truncated' : 'not-truncated'}`}>
                    {parseResult.payloadTruncated ? '是' : '否'}
                  </code>
                </div>
                <div className="info-item full">
                  <span className="info-label">验证状态</span>
                  <code className="info-value unverified">未验证签名</code>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有操作均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>仅解码不验签：</strong>本工具仅解码 JWT 的 Header 和 Payload，
            <strong>不会验证 Signature</strong>。
          </li>
          <li>
            <strong>安全注意：</strong>在生产环境中，必须始终验证 JWT 的签名有效性，
            仅解码不足以确认 token 的真实性。
          </li>
          <li>
            <strong>格式要求：</strong>标准 JWT 格式为 <code>header.payload.signature</code>，
            每段使用 Base64URL 编码。
          </li>
        </ul>
      </div>
    </div>
  )
}
