import { useCallback, useEffect, useState, useRef } from 'react'
import {
  PROVIDERS,
  EXAMPLES,
  STEP_TYPES,
  buildWebhookSignatureSteps,
  computeSignatureValues,
  isWebCryptoSupported,
  minifyJson,
  countUtf8Bytes,
} from './logic/index.js'
import './WebhookSignaturePlaybook.css'

const PROVIDER_LABELS = {
  [PROVIDERS.HMAC_SHA256]: '通用 HMAC-SHA256',
  [PROVIDERS.STRIPE_V1]: 'Stripe v1',
  [PROVIDERS.GITHUB_SHA256]: 'GitHub SHA256',
}

function StepCard({ step, index, onCopy }) {
  const isComputed = step.needsCompute && step.fullValue

  return (
    <div className={`step-card ${isComputed ? 'computed' : ''}`}>
      <div className="step-header">
        <div className="step-number">{index + 1}</div>
        <div className="step-title">{step.title}</div>
      </div>
      <div className="step-formula">
        <code>{step.formula}</code>
      </div>
      <div className="step-value">
        <span className="value-label">值:</span>
        <div className={`value-content ${step.valuePreview.truncated ? 'truncated' : ''}`}>
          {step.valuePreview.value}
        </div>
        {step.fullValue && (
          <button className="copy-btn" onClick={() => onCopy(step.fullValue)}>
            复制
          </button>
        )}
      </div>
      {step.byteCount !== undefined && (
        <div className="byte-count">
          📊 UTF-8 字节数: {step.byteCount}
        </div>
      )}
      {step.valuePreview.truncated && (
        <div className="byte-count">
          ⚠️ 已截断，原始长度: {step.valuePreview.originalLength} 字符
        </div>
      )}
    </div>
  )
}

function SecurityCard() {
  return (
    <div className="security-card">
      <h3>安全最佳实践</h3>
      <div className="security-content">
        <ul>
          <li>
            <strong>密钥不落盘:</strong> 本工具仅在内存中处理密钥，页面卸载后立即清空。
            切勿将密钥存入 <code>localStorage</code> 或日志中。
          </li>
          <li>
            <strong>禁止 URL 传输:</strong> 签名密钥绝不能出现在 URL query 参数中。
            使用 HTTP Header（如 <code>X-Hub-Signature-256</code>、<code>Stripe-Signature</code>）传输。
          </li>
          <li>
            <strong>重放攻击防护:</strong> 验证 <code>timestamp</code> 容差（通常 5 分钟内）。
            伪代码: <code>Math.abs(now - timestamp) &lt;= 300</code>
          </li>
          <li>
            <strong>原始 Body 验证:</strong> Webhook 签名是基于原始 HTTP Body 计算的。
            JSON 解析后再序列化可能因空格、换行差异导致验证失败。
          </li>
        </ul>
        <div className="timing-safe-note">
          <h4>🔐 常数时间比较 (Timing-Safe Equal)</h4>
          <p>
            <strong>重要:</strong> 普通字符串比较 <code>===</code> 会在第一个不匹配字符时提前返回，
            攻击者可通过测量响应时间差异逐字节猜出签名。
            <br /><br />
            <strong>前端限制:</strong> 浏览器 JavaScript 无原生 <code>crypto.timingSafeEqual</code> API。
            此页面仅用于调试演示，生产环境签名验证<strong>必须在后端完成</strong>。
            <br /><br />
            <strong>后端实现示例 (Node.js):</strong>
            <br />
            <code>crypto.timingSafeEqual(Buffer.from(sig1), Buffer.from(sig2))</code>
          </p>
        </div>
      </div>
    </div>
  )
}

function JsonComparison({ original, minified, computedSignature, expectedSignature }) {
  const originalBytes = countUtf8Bytes(original)
  const minifiedBytes = countUtf8Bytes(minified)

  return (
    <div className="comparison-section">
      <div className="comparison-header">
        <h3>🔍 原始 JSON vs 压缩 JSON 对比</h3>
      </div>
      <div className="diff-view">
        <div className="diff-column">
          <h4>原始格式化 JSON</h4>
          <div className="diff-content diff-removed">
            {original}
          </div>
          <div className="byte-count">字节数: {originalBytes}</div>
        </div>
        <div className="diff-column">
          <h4>压缩 JSON (无空格)</h4>
          <div className="diff-content diff-added">
            {minified}
          </div>
          <div className="byte-count">字节数: {minifiedBytes}</div>
        </div>
      </div>
      <div className={`comparison-result ${originalBytes === minifiedBytes ? 'match' : 'mismatch'}`}>
        {originalBytes === minifiedBytes
          ? '✅ 字节数相同，签名结果一致'
          : '⚠️ 字节数不同！这是签名验证失败的常见原因 - Webhook 服务器使用原始 Body 计算签名'}
      </div>
      {(computedSignature || expectedSignature) && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <div className="diff-view">
            <div className="diff-column">
              <h4>计算得到的签名</h4>
              <div className={`diff-content ${computedSignature === expectedSignature ? 'diff-added' : 'diff-removed'}`}>
                {computedSignature || '未计算'}
              </div>
            </div>
            <div className="diff-column">
              <h4>预期签名</h4>
              <div className={`diff-content ${computedSignature === expectedSignature ? 'diff-added' : 'diff-removed'}`}>
                {expectedSignature || '未输入'}
              </div>
            </div>
          </div>
          <div className={`comparison-result ${computedSignature === expectedSignature ? 'match' : 'mismatch'}`}>
            {computedSignature === expectedSignature
              ? '✅ 签名匹配！验证通过'
              : '❌ 签名不匹配！请检查 Body、密钥、时间戳是否正确'}
          </div>
        </div>
      )}
    </div>
  )
}

function SignatureDiffColumns({ bodyBytesPreview, signingString, finalSignature, showBytesPreview, onCopy }) {
  return (
    <div className="diff-columns-section">
      <div className="diff-columns-header">
        <h3>📊 签名结果三列对比</h3>
      </div>
      <div className="diff-columns">
        <div className="diff-column-card">
          <div className="diff-column-title">
            <span className="column-icon">📦</span>
            <span>Body 字节</span>
          </div>
          <div className="diff-column-formula">
            <code>UTF8_Encode(body)</code>
          </div>
          <div className="diff-column-content">
            {showBytesPreview ? (
              <pre className="bytes-preview">{bodyBytesPreview}</pre>
            ) : (
              <div className="bytes-hidden">已隐藏字节预览，点击开关显示</div>
            )}
          </div>
          <div className="diff-column-actions">
            {showBytesPreview && (
              <button className="secondary-btn small-btn" onClick={() => onCopy(bodyBytesPreview)}>
                复制字节
              </button>
            )}
          </div>
        </div>

        <div className="diff-column-card">
          <div className="diff-column-title">
            <span className="column-icon">🔗</span>
            <span>签名串</span>
          </div>
          <div className="diff-column-formula">
            <code>signing_string</code>
          </div>
          <div className="diff-column-content">
            <pre className="signing-string-preview">{signingString || '等待计算...'}</pre>
          </div>
          <div className="diff-column-actions">
            {signingString && (
              <button className="secondary-btn small-btn" onClick={() => onCopy(signingString)}>
                复制签名串
              </button>
            )}
          </div>
        </div>

        <div className="diff-column-card">
          <div className="diff-column-title">
            <span className="column-icon">🔐</span>
            <span>Hex / Base64</span>
          </div>
          <div className="diff-column-formula">
            <code>Hex_Encode(HMAC_SHA256(...))</code>
          </div>
          <div className="diff-column-content">
            <pre className="signature-preview">{finalSignature || '等待计算...'}</pre>
          </div>
          <div className="diff-column-actions">
            {finalSignature && (
              <button className="secondary-btn small-btn" onClick={() => onCopy(finalSignature)}>
                复制签名
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WebhookSignaturePlaybook() {
  const [provider, setProvider] = useState(PROVIDERS.STRIPE_V1)
  const [body, setBody] = useState('')
  const [secret, setSecret] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [expectedSignature, setExpectedSignature] = useState('')
  const [steps, setSteps] = useState([])
  const [isComputing, setIsComputing] = useState(false)
  const [revealSecret, setRevealSecret] = useState(false)
  const [showMinified, setShowMinified] = useState(false)
  const [showBytesPreview, setShowBytesPreview] = useState(true)
  const [toast, setToast] = useState(null)
  const [hasComputed, setHasComputed] = useState(false)

  const cryptoSupported = isWebCryptoSupported()

  useEffect(() => {
    return () => {
      setSecret('')
      setBody('')
      setTimestamp('')
    }
  }, [])

  const showToast = useCallback((type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleCopy = useCallback(async (value) => {
    try {
      await navigator.clipboard.writeText(value)
      showToast('success', '已复制到剪贴板')
    } catch {
      showToast('error', '复制失败')
    }
  }, [showToast])

  const handleLoadExample = useCallback(() => {
    const example = EXAMPLES[provider]
    if (!example) return

    setBody(example.body)
    setSecret(example.secret)
    setTimestamp(example.timestamp || '')
    setExpectedSignature(example.signatureHeader || '')
    setSteps([])
    setHasComputed(false)
    showToast('info', `已加载 ${PROVIDER_LABELS[provider]} 示例`)
  }, [provider, showToast])

  const handleClear = useCallback(() => {
    setBody('')
    setSecret('')
    setTimestamp('')
    setExpectedSignature('')
    setSteps([])
    setHasComputed(false)
    showToast('info', '已清空所有内容')
  }, [showToast])

  const handleCompute = useCallback(async () => {
    if (!secret) {
      showToast('error', '请输入签名密钥')
      return
    }

    if (provider === PROVIDERS.STRIPE_V1 && !timestamp) {
      showToast('error', 'Stripe v1 签名需要时间戳')
      return
    }

    if (!cryptoSupported) {
      showToast('error', '您的浏览器不支持 Web Crypto API')
      return
    }

    setIsComputing(true)

    try {
      const parts = { body, secret, timestamp }
      const initialSteps = buildWebhookSignatureSteps(provider, parts)
      setSteps(initialSteps)

      const computedSteps = await computeSignatureValues(initialSteps, provider, parts)
      setSteps(computedSteps)
      setHasComputed(true)
      showToast('success', '签名计算完成')
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setIsComputing(false)
    }
  }, [body, secret, timestamp, provider, cryptoSupported, showToast])

  const minifiedBody = minifyJson(body)
  const finalSignature = steps.find(s => s.type === STEP_TYPES.FINAL_SIGNATURE)?.fullValue
  const bodyBytesStep = steps.find(s => s.type === STEP_TYPES.BODY_BYTES)
  const bodyBytesPreview = bodyBytesStep?.valuePreview.value || ''
  const signingStringStep = steps.find(s => s.type === STEP_TYPES.SIGNING_STRING)
  const signingString = signingStringStep?.fullValue || ''

  return (
    <div className="webhook-playbook-page">
      <header className="page-header">
        <h1>🔐 Webhook 签名算法可视化</h1>
        <p>逐步演示 HMAC-SHA256、Stripe v1、GitHub SHA256 签名计算过程，帮助调试 Webhook 验证失败问题</p>
      </header>

      {!cryptoSupported && (
        <div className="crypto-warning">
          <p>⚠️ 您的浏览器不支持 Web Crypto API，无法进行签名计算。请使用现代浏览器（Chrome, Firefox, Safari, Edge）。</p>
        </div>
      )}

      <section className="config-section">
        <div className="provider-selector">
          <label>选择签名提供商:</label>
          <div className="provider-buttons">
            {Object.values(PROVIDERS).map((p) => (
              <button
                key={p}
                className={`provider-btn ${provider === p ? 'active' : ''}`}
                onClick={() => {
                  setProvider(p)
                  setSteps([])
                  setHasComputed(false)
                }}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="input-grid">
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="body-input">请求 Body (Raw JSON)</label>
            <textarea
              id="body-input"
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                setSteps([])
                setHasComputed(false)
              }}
              placeholder='{"event": "payment.success", "data": {...}}'
              spellCheck={false}
            />
          </div>

          <div className="input-group">
            <label htmlFor="secret-input">签名密钥</label>
            <div className="secret-input-wrapper">
              <input
                id="secret-input"
                type={revealSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value)
                  setSteps([])
                  setHasComputed(false)
                }}
                placeholder="whsec_xxx 或 webhook_secret"
                autoComplete="off"
              />
              <button
                type="button"
                className="reveal-btn"
                onClick={() => setRevealSecret(!revealSecret)}
                title={revealSecret ? '隐藏密钥' : '显示密钥'}
              >
                {revealSecret ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          {provider === PROVIDERS.STRIPE_V1 && (
            <div className="input-group">
              <label htmlFor="timestamp-input">时间戳 (t)</label>
              <input
                id="timestamp-input"
                type="text"
                value={timestamp}
                onChange={(e) => {
                  setTimestamp(e.target.value)
                  setSteps([])
                  setHasComputed(false)
                }}
                placeholder="1620000000"
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="expected-input">预期签名（可选，用于对比）</label>
            <input
              id="expected-input"
              type="text"
              value={expectedSignature}
              onChange={(e) => setExpectedSignature(e.target.value)}
              placeholder="sha256=xxx 或 t=...,v1=..."
            />
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleCompute}
            disabled={isComputing || !cryptoSupported}
          >
            {isComputing ? '计算中...' : '🔨 计算签名'}
          </button>
          <button className="secondary-btn" onClick={handleLoadExample}>
            📋 加载示例
          </button>
          <button className="danger-btn" onClick={handleClear}>
            🗑️ 清空
          </button>
          <div className="toggle-group">
            <label>
              <input
                type="checkbox"
                checked={showMinified}
                onChange={(e) => setShowMinified(e.target.checked)}
              />
              显示 JSON 压缩对比
            </label>
            <label>
              <input
                type="checkbox"
                checked={showBytesPreview}
                onChange={(e) => setShowBytesPreview(e.target.checked)}
              />
              显示 UTF-8 字节预览
            </label>
          </div>
        </div>
      </section>

      {showMinified && body && (
        <JsonComparison
          original={body}
          minified={minifiedBody}
          computedSignature={finalSignature}
          expectedSignature={expectedSignature}
        />
      )}

      {steps.length > 0 && (
        <>
          <SignatureDiffColumns
            bodyBytesPreview={bodyBytesPreview}
            signingString={signingString}
            finalSignature={finalSignature}
            showBytesPreview={showBytesPreview}
            onCopy={handleCopy}
          />
          <section className="steps-section">
            <div className="steps-header">
              <h2>📝 签名计算步骤</h2>
            </div>
            <div className="steps-list">
              {steps.map((step, index) => (
                <StepCard
                  key={step.type + '-' + index}
                  step={step}
                  index={index}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <SecurityCard />

      <div className="disclaimer-card">
        <p>
          <strong>免责声明:</strong> 本工具仅用于学习和调试目的。密钥仅在浏览器内存中处理，不会发送到任何服务器。
          生产环境中的签名验证<strong>必须在后端完成</strong>，并使用常数时间比较防止时序攻击。
          <br /><br />
          本工具不承担因使用不当导致的任何安全责任。如需安全审计，请联系专业安全团队。
        </p>
      </div>

      {toast && (
        <div className={`status-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
