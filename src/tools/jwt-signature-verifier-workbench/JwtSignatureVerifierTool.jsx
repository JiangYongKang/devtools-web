import { useCallback, useState } from 'react'
import { parseJwt, formatJson } from './logic/jwtParser.js'
import { parseJwks, findMatchingKey, selectBestKey, importJwk, importSecretKey, getKeySummary } from './logic/jwks.js'
import { verifySignature, validateAlgorithm } from './logic/signatureVerifier.js'
import { validateClaims, buildDefaultRules } from './logic/claimsValidator.js'
import { SUPPORTED_ALGORITHMS } from './logic/errors.js'
import './JwtSignatureVerifierTool.css'

const EXAMPLE_JWTS = {
  hs256: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  rs256: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxOTk5OTk5OTk5fQ.dummy-signature',
}

const EXAMPLE_SECRETS = {
  hs256: 'your-256-bit-secret',
}

const EXAMPLE_JWKS = JSON.stringify({
  keys: [
    {
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: 'key-1',
      n: 'abc123...',
      e: 'AQAB',
    },
  ],
}, null, 2)

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

export default function JwtSignatureVerifierTool() {
  const [jwtInput, setJwtInput] = useState('')
  const [parsedJwt, setParsedJwt] = useState(null)
  const [parseError, setParseError] = useState(null)

  const [activeTab, setActiveTab] = useState('secret')
  const [jwksInput, setJwksInput] = useState('')
  const [secretInput, setSecretInput] = useState('')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('HS256')

  const [verificationResult, setVerificationResult] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const [claimRules, setClaimRules] = useState(buildDefaultRules())
  const [claimsResult, setClaimsResult] = useState(null)

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

  const handleParseJwt = useCallback(() => {
    const result = parseJwt(jwtInput)
    if (result.success) {
      setParsedJwt(result.parsed)
      setParseError(null)
      if (result.parsed.header?.alg) {
        setSelectedAlgorithm(result.parsed.header.alg)
      }
    } else {
      setParsedJwt(null)
      setParseError(result)
    }
    setVerificationResult(null)
    setClaimsResult(null)
  }, [jwtInput])

  const handleVerify = useCallback(async () => {
    if (!parsedJwt) {
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)
    setClaimsResult(null)

    try {
      const algValidation = validateAlgorithm(
        parsedJwt.header?.alg,
        selectedAlgorithm
      )

      if (!algValidation.success) {
        setVerificationResult({
          isValid: false,
          error: algValidation.error,
        })
        setIsVerifying(false)
        return
      }

      const algorithm = algValidation.algorithm

      let keyImportResult
      if (activeTab === 'secret') {
        if (!secretInput) {
          setVerificationResult({
            isValid: false,
            error: { errorMessage: '请输入对称密钥' },
          })
          setIsVerifying(false)
          return
        }
        keyImportResult = await importSecretKey(secretInput, algorithm)
      } else {
        const jwksResult = parseJwks(jwksInput)
        if (!jwksResult.success) {
          setVerificationResult({
            isValid: false,
            error: jwksResult.error,
          })
          setIsVerifying(false)
          return
        }

        const matchResults = findMatchingKey(
          jwksResult.keys,
          parsedJwt.header?.alg,
          parsedJwt.header?.kid
        )
        const keySelection = selectBestKey(matchResults)

        if (!keySelection.success) {
          setVerificationResult({
            isValid: false,
            error: keySelection.error,
            availableKeys: keySelection.availableKeys,
          })
          setIsVerifying(false)
          return
        }

        keyImportResult = await importJwk(keySelection.key, algorithm)
      }

      if (!keyImportResult.success) {
        setVerificationResult({
          isValid: false,
          error: keyImportResult.error,
        })
        setIsVerifying(false)
        return
      }

      const sigResult = await verifySignature(
        parsedJwt.signingInput,
        parsedJwt.segments[2].raw,
        keyImportResult.cryptoKey,
        algorithm,
        keyImportResult.subtleAlg
      )

      if (!sigResult.success) {
        setVerificationResult({
          isValid: false,
          error: sigResult.error,
        })
      } else {
        setVerificationResult({
          isValid: sigResult.isValid,
          algorithm: sigResult.algorithm,
          error: sigResult.isValid ? null : { errorMessage: '签名无效' },
        })
      }

      if (parsedJwt.payload) {
        const claimsValidation = validateClaims(parsedJwt.payload, claimRules)
        setClaimsResult(claimsValidation)
      }
    } catch (e) {
      setVerificationResult({
        isValid: false,
        error: { errorMessage: `验证失败: ${e.message}` },
      })
    }

    setIsVerifying(false)
  }, [parsedJwt, selectedAlgorithm, activeTab, secretInput, jwksInput, claimRules])

  const handleClear = useCallback(() => {
    setJwtInput('')
    setParsedJwt(null)
    setParseError(null)
    setVerificationResult(null)
    setClaimsResult(null)
  }, [])

  const handleLoadExample = useCallback((type) => {
    if (type === 'hs256') {
      setJwtInput(EXAMPLE_JWTS.hs256)
      setSecretInput(EXAMPLE_SECRETS.hs256)
      setSelectedAlgorithm('HS256')
      setActiveTab('secret')
    } else if (type === 'rs256') {
      setJwtInput(EXAMPLE_JWTS.rs256)
      setJwksInput(EXAMPLE_JWKS)
      setSelectedAlgorithm('RS256')
      setActiveTab('jwks')
    }
    setParsedJwt(null)
    setParseError(null)
    setVerificationResult(null)
    setClaimsResult(null)
  }, [])

  const renderSegment = (segment) => {
    const hasError = segment.decodeError || segment.jsonError
    const error = segment.decodeError || segment.jsonError
    const formattedJson = segment.json ? formatJson(segment.json) : ''

    return (
      <div key={segment.index} className={`segment-card ${hasError ? 'error' : ''}`}>
        <div className="segment-header">
          <span className="segment-title">{segment.name}</span>
          <div className="segment-actions">
            <button
              className="copy-btn"
              onClick={() => handleCopy(segment.raw, `${segment.name} 原始值`)}
              title="复制原始值"
            >
              复制原始
            </button>
            {segment.json && (
              <button
                className="copy-btn"
                onClick={() => handleCopy(formattedJson, `${segment.name} JSON`)}
                title="复制格式化 JSON"
              >
                复制 JSON
              </button>
            )}
            <span className="segment-index">段 {segment.index + 1}</span>
          </div>
        </div>
        <div className="segment-raw" title={segment.raw}>
          {segment.raw}
        </div>
        {hasError && (
          <div className="error-box">
            <strong>解码失败</strong>
            <p>{error?.errorMessage}</p>
            {error?.errorCode && (
              <div className="error-code">错误码：{error.errorCode}</div>
            )}
          </div>
        )}
        {!hasError && segment.json && (
          <pre
            className="segment-decoded"
            dangerouslySetInnerHTML={{ __html: escapeHtml(formattedJson) }}
          />
        )}
        {!hasError && segment.index === 2 && (
          <div className="info-text">
            签名长度: {segment.bytes?.length || 0} 字节
          </div>
        )}
      </div>
    )
  }

  const renderVerificationResult = () => {
    if (!verificationResult) return null

    const isValid = verificationResult.isValid
    const claimsValid = claimsResult?.allValid ?? true

    return (
      <div className={`verification-result ${isValid && claimsValid ? 'valid' : 'invalid'}`}>
        <div className="verification-status">
          <span className={`status-icon ${isValid && claimsValid ? 'valid' : 'invalid'}`}>
            {isValid && claimsValid ? '✓' : '✗'}
          </span>
          <span>
            {isValid && claimsValid ? '验证通过' : '验证失败'}
          </span>
        </div>

        {verificationResult.error && (
          <div className="error-box">
            <p>{verificationResult.error.errorMessage}</p>
          </div>
        )}

        {verificationResult.algorithm && (
          <div className="key-info">
            <div className="key-item">
              <span className="key-label">算法</span>
              <span className="key-value">{verificationResult.algorithm}</span>
            </div>
          </div>
        )}

        {verificationResult.availableKeys && (
          <div className="key-info">
            <strong>可用密钥:</strong>
            {verificationResult.availableKeys.map((key, idx) => (
              <div key={idx} className="key-item">
                <span className="key-label">{key.kid}</span>
                <span className="key-value">{key.kty} / {key.alg}</span>
              </div>
            ))}
          </div>
        )}

        {claimsResult && (
          <div className="claims-results">
            <h4>Claims 校验</h4>
            {claimsResult.results?.map((claim, idx) => (
              <div key={idx} className={`claim-item ${claim.valid ? 'valid' : 'invalid'}`}>
                <span className="claim-name">{claim.claim}</span>
                <span className="claim-message">{claim.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="jwt-signature-verifier">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>JWT 签名验证工作台</h2>

        <div className="form-group">
          <label htmlFor="jwt-input">JWT 字符串</label>
          <textarea
            id="jwt-input"
            className="jwt-input"
            value={jwtInput}
            onChange={(e) => setJwtInput(e.target.value)}
            placeholder="粘贴 JWT 字符串..."
            spellCheck={false}
          />
        </div>

        <div className="form-group">
          <label>快速示例</label>
          <div className="example-buttons">
            <button className="example-btn" onClick={() => handleLoadExample('hs256')}>
              HS256 示例
            </button>
            <button className="example-btn" onClick={() => handleLoadExample('rs256')}>
              RS256 示例
            </button>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleParseJwt}
            disabled={!jwtInput.trim()}
          >
            解析 JWT
          </button>
          {parsedJwt && (
            <button
              className="primary-btn"
              onClick={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? '验证中...' : '验证签名'}
            </button>
          )}
          {(parsedJwt || parseError) && (
            <button className="secondary-btn" onClick={handleClear}>
              清除
            </button>
          )}
        </div>

        {parseError && (
          <div className="error-box">
            <strong>解析失败</strong>
            <p>{parseError.errorMessage}</p>
            {parseError.errorCode && (
              <div className="error-code">错误码：{parseError.errorCode}</div>
            )}
          </div>
        )}

        {parsedJwt && (
          <div className="segments-container">
            {parsedJwt.segments.map(renderSegment)}
          </div>
        )}
      </section>

      {parsedJwt && (
        <section className="tool-section">
          <h3>密钥配置</h3>

          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'secret' ? 'active' : ''}`}
              onClick={() => setActiveTab('secret')}
            >
              对称密钥 (HS*)
            </button>
            <button
              className={`tab-btn ${activeTab === 'jwks' ? 'active' : ''}`}
              onClick={() => setActiveTab('jwks')}
            >
              JWKS (RS*/ES*)
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="algorithm">算法</label>
            <select
              id="algorithm"
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value)}
            >
              {SUPPORTED_ALGORITHMS.map((alg) => (
                <option key={alg} value={alg}>{alg}</option>
              ))}
            </select>
          </div>

          {activeTab === 'secret' && (
            <div className="form-group">
              <label htmlFor="secret-input">对称密钥</label>
              <input
                id="secret-input"
                type="text"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="输入 HMAC 密钥..."
                spellCheck={false}
              />
              <div className="warning-text">
                ⚠️ 仅用于演示，请勿在此输入生产环境密钥
              </div>
            </div>
          )}

          {activeTab === 'jwks' && (
            <div className="form-group">
              <label htmlFor="jwks-input">JWKS JSON</label>
              <textarea
                id="jwks-input"
                className="jwks-input"
                value={jwksInput}
                onChange={(e) => setJwksInput(e.target.value)}
                placeholder='粘贴 JWKS JSON，例如: {"keys": [...]}'
                spellCheck={false}
              />
            </div>
          )}
        </section>
      )}

      {parsedJwt && (
        <section className="tool-section">
          <h3>Claims 校验规则</h3>

          <div className="options-grid">
            <label className="option-item">
              <input
                type="checkbox"
                checked={claimRules.validateExp}
                onChange={(e) => setClaimRules({ ...claimRules, validateExp: e.target.checked })}
              />
              <span>验证 exp (过期时间)</span>
            </label>

            <label className="option-item">
              <input
                type="checkbox"
                checked={claimRules.validateNbf}
                onChange={(e) => setClaimRules({ ...claimRules, validateNbf: e.target.checked })}
              />
              <span>验证 nbf (生效时间)</span>
            </label>

            <label className="option-item">
              <input
                type="checkbox"
                checked={claimRules.validateIss}
                onChange={(e) => setClaimRules({ ...claimRules, validateIss: e.target.checked })}
              />
              <span>验证 iss (发行者)</span>
            </label>

            <label className="option-item">
              <input
                type="checkbox"
                checked={claimRules.validateAud}
                onChange={(e) => setClaimRules({ ...claimRules, validateAud: e.target.checked })}
              />
              <span>验证 aud (受众)</span>
            </label>

            <div className="option-item option-input">
              <label htmlFor="clock-skew">Clock Skew (秒)</label>
              <input
                id="clock-skew"
                type="number"
                min="0"
                max="3600"
                value={claimRules.clockSkewSeconds}
                onChange={(e) => setClaimRules({
                  ...claimRules,
                  clockSkewSeconds: Math.max(0, Math.min(3600, Number(e.target.value) || 0))
                })}
              />
            </div>

            <div className="option-item option-input">
              <label htmlFor="expected-iss">期望 iss</label>
              <input
                id="expected-iss"
                type="text"
                value={claimRules.expectedIss}
                onChange={(e) => setClaimRules({ ...claimRules, expectedIss: e.target.value })}
                placeholder="例如: https://issuer.example.com"
                spellCheck={false}
              />
            </div>

            <div className="option-item option-input">
              <label htmlFor="expected-aud">期望 aud</label>
              <input
                id="expected-aud"
                type="text"
                value={claimRules.expectedAud}
                onChange={(e) => setClaimRules({ ...claimRules, expectedAud: e.target.value })}
                placeholder="例如: my-api"
                spellCheck={false}
              />
            </div>
          </div>
        </section>
      )}

      {renderVerificationResult()}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有操作均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>支持算法：</strong>
            <code>HS256</code>、<code>HS384</code>、<code>HS512</code>、
            <code>RS256</code>、<code>RS384</code>、<code>RS512</code>、
            <code>ES256</code>、<code>ES384</code>、<code>ES512</code>
          </li>
          <li>
            <strong>JWT 结构：</strong>JWT 由三部分组成，用 <code>.</code> 分隔：
            <ul>
              <li>Header (Base64URL 编码的 JSON)</li>
              <li>Payload (Base64URL 编码的 JSON)</li>
              <li>Signature (签名)</li>
            </ul>
          </li>
          <li>
            <strong>安全提示：</strong>请勿在此工具中粘贴生产环境的敏感密钥或 JWT。
          </li>
          <li>
            <strong>JWKS 导入：</strong>支持粘贴完整的 JWKS JSON 对象（包含 <code>keys</code> 数组）或单个 JWK 对象。
          </li>
        </ul>
      </div>
    </div>
  )
}
