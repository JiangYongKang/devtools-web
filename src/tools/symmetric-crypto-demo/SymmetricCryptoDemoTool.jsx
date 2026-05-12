import { useCallback, useState } from 'react'
import {
  ALGORITHMS,
  INPUT_FORMATS,
  MAX_TEXT_LENGTH,
  EXAMPLE_PLAINTEXT,
  EXAMPLE_METADATA,
  SECURITY_WARNINGS,
  AUDIT_NOTE,
  isCryptoAvailable,
  getAlgorithmById,
  generateRandomKey,
  generateRandomIV,
  encrypt,
  decrypt,
  ERROR_CODES,
  getErrorMessage,
} from './logic/index.js'
import './SymmetricCryptoDemoTool.css'

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export default function SymmetricCryptoDemoTool() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('AES-GCM-128')
  const [keyFormat, setKeyFormat] = useState('base64')
  const [ivFormat, setIvFormat] = useState('base64')
  const [ciphertextFormat, setCiphertextFormat] = useState('base64')
  const [key, setKey] = useState('')
  const [iv, setIv] = useState('')
  const [plaintext, setPlaintext] = useState('')
  const [ciphertext, setCiphertext] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showIv, setShowIv] = useState(false)
  const [encryptResult, setEncryptResult] = useState(null)
  const [decryptResult, setDecryptResult] = useState(null)
  const [encryptError, setEncryptError] = useState(null)
  const [decryptError, setDecryptError] = useState(null)
  const [loading, setLoading] = useState({ encrypt: false, decrypt: false })
  const [copyStatus, setCopyStatus] = useState(null)
  const [storageConfirmed, setStorageConfirmed] = useState(false)
  const [persistKey, setPersistKey] = useState(false)

  const cryptoAvailable = isCryptoAvailable()
  const algorithm = getAlgorithmById(selectedAlgorithm)

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

  const handleCopyWithMetadata = useCallback((ct, meta) => {
    const metadata = {
      algorithm: meta.algorithm,
      ciphertextFormat: meta.ciphertextFormat,
      keyFormat,
      ivFormat,
      timestamp: new Date().toISOString(),
    }
    const fullText = `${ct}\n\n--- METADATA ---\n${JSON.stringify(metadata, null, 2)}`
    handleCopy(fullText, '密文与元数据')
  }, [keyFormat, ivFormat, handleCopy])

  const handleGenerateKey = useCallback(() => {
    if (!algorithm) return
    const newKey = generateRandomKey(algorithm.keyLength, keyFormat)
    setKey(newKey)
    setEncryptError(null)
    setDecryptError(null)
  }, [algorithm, keyFormat])

  const handleGenerateIV = useCallback(() => {
    if (!algorithm) return
    const newIv = generateRandomIV(algorithm.ivLength, ivFormat)
    setIv(newIv)
    setEncryptError(null)
    setDecryptError(null)
  }, [algorithm, ivFormat])

  const handleLoadExample = useCallback(() => {
    setSelectedAlgorithm('AES-GCM-128')
    setKeyFormat('base64')
    setIvFormat('base64')
    setCiphertextFormat('base64')
    setKey(EXAMPLE_METADATA.key)
    setIv(EXAMPLE_METADATA.iv)
    setPlaintext(EXAMPLE_PLAINTEXT)
    setCiphertext('')
    setEncryptResult(null)
    setDecryptResult(null)
    setEncryptError(null)
    setDecryptError(null)
  }, [])

  const handleClear = useCallback(() => {
    setPlaintext('')
    setCiphertext('')
    setEncryptResult(null)
    setDecryptResult(null)
    setEncryptError(null)
    setDecryptError(null)
  }, [])

  const handleClearAll = useCallback(() => {
    setKey('')
    setIv('')
    setPlaintext('')
    setCiphertext('')
    setEncryptResult(null)
    setDecryptResult(null)
    setEncryptError(null)
    setDecryptError(null)
  }, [])

  const handlePersistKeyToggle = useCallback((checked) => {
    setPersistKey(checked)
    if (checked) {
      setStorageConfirmed(true)
    }
  }, [])

  const handleEncrypt = useCallback(async () => {
    setLoading((prev) => ({ ...prev, encrypt: true }))
    setEncryptError(null)
    setEncryptResult(null)

    try {
      const result = await encrypt({
        algorithmId: selectedAlgorithm,
        plaintext,
        key,
        keyFormat,
        iv,
        ivFormat,
        outputFormat: ciphertextFormat,
      })

      if (!result.success) {
        setEncryptError({
          code: result.errorCode,
          message: result.errorMessage,
        })
        return
      }

      setEncryptResult(result)
      setCiphertext(result.ciphertext)
    } catch (err) {
      setEncryptError({
        code: ERROR_CODES.ENCRYPTION_FAILED,
        message: err?.message || getErrorMessage(ERROR_CODES.ENCRYPTION_FAILED),
      })
    } finally {
      setLoading((prev) => ({ ...prev, encrypt: false }))
    }
  }, [selectedAlgorithm, plaintext, key, keyFormat, iv, ivFormat, ciphertextFormat])

  const handleDecrypt = useCallback(async () => {
    setLoading((prev) => ({ ...prev, decrypt: true }))
    setDecryptError(null)
    setDecryptResult(null)

    try {
      const result = await decrypt({
        algorithmId: selectedAlgorithm,
        ciphertext,
        ciphertextFormat,
        key,
        keyFormat,
        iv,
        ivFormat,
      })

      if (!result.success) {
        setDecryptError({
          code: result.errorCode,
          message: result.errorMessage,
        })
        return
      }

      setDecryptResult(result)
      setPlaintext(result.plaintext)
    } catch (err) {
      setDecryptError({
        code: ERROR_CODES.DECRYPTION_FAILED,
        message: err?.message || getErrorMessage(ERROR_CODES.DECRYPTION_FAILED),
      })
    } finally {
      setLoading((prev) => ({ ...prev, decrypt: false }))
    }
  }, [selectedAlgorithm, ciphertext, ciphertextFormat, key, keyFormat, iv, ivFormat])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <code className="error-code">{escapeHtml(err.code)}</code>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  const canEncrypt = plaintext.trim() && key.trim() && iv.trim()
  const canDecrypt = ciphertext.trim() && key.trim() && iv.trim()

  const plaintextCount = plaintext.length
  const plaintextOverLimit = plaintextCount > MAX_TEXT_LENGTH

  if (!cryptoAvailable) {
    return (
      <div className="symmetric-crypto-tool">
        <div className="crypto-unavailable">
          <h3>环境不支持</h3>
          <p>
            <code className="error-code">{ERROR_CODES.CRYPTO_NOT_AVAILABLE}</code>
          </p>
          <p>
            当前浏览器环境不支持 Web Crypto API。该工具需要现代浏览器（Chrome、Firefox、Safari、Edge）
            且在安全上下文（HTTPS 或 localhost）下运行。
          </p>
        </div>
        <div className="notes-section">
          <h3>降级说明</h3>
          <ul>
            <li>Web Crypto API 是现代浏览器提供的标准加密接口</li>
            <li>该工具使用 AES-GCM 算法，需要浏览器原生支持</li>
            <li>请确保使用最新版本的现代浏览器并在安全环境中访问</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="symmetric-crypto-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <div className="security-warning-box">
        <div className="warning-icon">⚠</div>
        <div className="warning-content">
          <strong className="warning-title">{SECURITY_WARNINGS.DEMO_PURPOSE}</strong>
          <p className="warning-note">
            {SECURITY_WARNINGS.DO_NOT_PASTE_PRODUCTION_KEYS}。{SECURITY_WARNINGS.NO_PERSISTENCE}。
          </p>
        </div>
      </div>

      <section className="tool-section">
        <h2>算法选择</h2>
        <div className="algorithm-list">
          {ALGORITHMS.map((algo) => (
            <label
              key={algo.id}
              className={`algorithm-item ${selectedAlgorithm === algo.id ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="algorithm"
                checked={selectedAlgorithm === algo.id}
                onChange={() => {
                  setSelectedAlgorithm(algo.id)
                  setEncryptError(null)
                  setDecryptError(null)
                }}
              />
              <div className="algo-info">
                <div className="algo-name-row">
                  <span className="algo-name">{algo.name}</span>
                  {algo.recommended && (
                    <span className="security-badge strong">推荐</span>
                  )}
                </div>
                <span className="algo-desc">{algo.description}</span>
                <span className="algo-meta">
                  密钥长度：{algo.keyLength} 字节 / IV 长度：{algo.ivLength} 字节 / 认证标签：{algo.tagLength} 字节
                </span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <h2>密钥与初始化向量</h2>

        <div className="form-row with-top-gap">
          <div className="form-group full-width">
            <label>{`密钥（${algorithm?.keyLength || 16} 字节）`}</label>
            <div className="input-with-generate">
              <div className="sensitive-input">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="crypto-input"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={`请输入 ${algorithm?.keyLength || 16} 字节密钥（${keyFormat === 'base64' ? 'Base64' : '十六进制'}）`}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? '隐藏' : '短暂显示'}
                >
                  {showKey ? '🙈' : '👁'}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={handleGenerateKey}
                disabled={loading.encrypt || loading.decrypt}
              >
                生成随机密钥
              </button>
            </div>
          </div>
        </div>

        <div className="form-row with-top-gap">
          <div className="form-group">
            <label>密钥格式</label>
            <select
              value={keyFormat}
              onChange={(e) => {
                setKeyFormat(e.target.value)
                setKey('')
              }}
            >
              {INPUT_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row with-top-gap">
          <div className="form-group full-width">
            <label>{`初始化向量 (IV)（${algorithm?.ivLength || 12} 字节）`}</label>
            <div className="input-with-generate">
              <div className="sensitive-input">
                <input
                  type={showIv ? 'text' : 'password'}
                  className="crypto-input"
                  value={iv}
                  onChange={(e) => setIv(e.target.value)}
                  placeholder={`请输入 ${algorithm?.ivLength || 12} 字节 IV（${ivFormat === 'base64' ? 'Base64' : '十六进制'}）`}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowIv(!showIv)}
                  title={showIv ? '隐藏' : '短暂显示'}
                >
                  {showIv ? '🙈' : '👁'}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={handleGenerateIV}
                disabled={loading.encrypt || loading.decrypt}
              >
                生成随机 IV
              </button>
            </div>
          </div>
        </div>

        <div className="form-row with-top-gap">
          <div className="form-group">
            <label>IV 格式</label>
            <select
              value={ivFormat}
              onChange={(e) => {
                setIvFormat(e.target.value)
                setIv('')
              }}
            >
              {INPUT_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="checkbox-group">
          <input
            type="checkbox"
            id="persist-key"
            checked={persistKey}
            onChange={(e) => handlePersistKeyToggle(e.target.checked)}
          />
          <label htmlFor="persist-key">
            保存密钥到 localStorage（仅限当前浏览器）
          </label>
        </div>

        {storageConfirmed && persistKey && (
          <div className="storage-warning-box">
            <strong>⚠ 安全警告</strong>
            <p>
              {SECURITY_WARNINGS.STORAGE_OPTIONAL}。localStorage 不是安全存储，
              任何能访问此浏览器的人都可能读取存储的密钥。请谨慎使用，
              仅用于测试和演示目的。
            </p>
          </div>
        )}
      </section>

      <section className="tool-section">
        <h2>加解密操作</h2>

        <div className="form-row with-top-gap">
          <div className="form-group">
            <label>密文格式</label>
            <select
              value={ciphertextFormat}
              onChange={(e) => setCiphertextFormat(e.target.value)}
            >
              {INPUT_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row with-top-gap">
          <div className="form-group full-width">
            <label htmlFor="plaintext-input">
              明文输入
              <span className={`text-count ${plaintextOverLimit ? 'over-limit' : ''}`}>
                {' '}（{plaintextCount}/{MAX_TEXT_LENGTH.toLocaleString()} 字符）
              </span>
            </label>
            <textarea
              id="plaintext-input"
              className="crypto-textarea"
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder="输入要加密的文本..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="form-row with-top-gap">
          <div className="form-group full-width">
            <label htmlFor="ciphertext-input">
              {`密文输入（${ciphertextFormat === 'base64' ? 'Base64' : '十六进制'}）`}
            </label>
            <textarea
              id="ciphertext-input"
              className="crypto-textarea"
              value={ciphertext}
              onChange={(e) => setCiphertext(e.target.value)}
              placeholder="输入要解密的密文..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="action-row">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleEncrypt}
            disabled={loading.encrypt || !canEncrypt || plaintextOverLimit}
          >
            {loading.encrypt ? '加密中...' : '加密'}
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleDecrypt}
            disabled={loading.decrypt || !canDecrypt}
          >
            {loading.decrypt ? '解密中...' : '解密'}
          </button>
          <button
            className="btn btn-secondary btn-md"
            onClick={handleLoadExample}
          >
            填充示例
          </button>
          <button
            className="btn btn-secondary btn-md"
            onClick={handleClear}
          >
            清除结果
          </button>
          <button
            className="btn btn-secondary btn-md"
            onClick={handleClearAll}
          >
            全部清除
          </button>
        </div>

        {encryptResult && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">{`加密结果（${ciphertextFormat === 'base64' ? 'Base64' : '十六进制'}）`}</span>
              <div className="result-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopy(encryptResult.ciphertext, '密文')}
                >
                  复制密文
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopyWithMetadata(encryptResult.ciphertext, encryptResult)}
                >
                  复制密文+元数据
                </button>
              </div>
            </div>
            <pre
              className="result-text"
              dangerouslySetInnerHTML={{ __html: escapeHtml(encryptResult.ciphertext) }}
            />
            <div className="result-meta">
              <span>
                算法：<code>{escapeHtml(encryptResult.algorithm)}</code>
              </span>
              <span>
                明文长度：<code>{escapeHtml(encryptResult.plaintextLength)}</code> 字符
              </span>
              <span>
                密文长度：<code>{escapeHtml(encryptResult.ciphertextLength)}</code> 字符
              </span>
            </div>
          </div>
        )}

        {decryptResult && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">解密结果（明文）</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopy(decryptResult.plaintext, '明文')}
              >
                复制
              </button>
            </div>
            <pre
              className="result-text"
              dangerouslySetInnerHTML={{ __html: escapeHtml(decryptResult.plaintext) }}
            />
            <div className="result-meta">
              <span>
                算法：<code>{escapeHtml(decryptResult.algorithm)}</code>
              </span>
              <span>
                密文长度：<code>{escapeHtml(decryptResult.ciphertextLength)}</code> 字符
              </span>
              <span>
                明文长度：<code>{escapeHtml(decryptResult.plaintextLength)}</code> 字符
              </span>
            </div>
          </div>
        )}

        {renderErrorBox(encryptError)}
        {renderErrorBox(decryptError)}
      </section>

      <div className="notes-section">
        <h3>安全说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>{AUDIT_NOTE}
          </li>
          <li>
            <strong>IV 重要性：</strong>{SECURITY_WARNINGS.ALWAYS_USE_NEW_IV}。
            在 GCM 模式下，重复使用同一 IV 可能导致密钥泄露。
          </li>
          <li>
            <strong>认证标签：</strong>AES-GCM 会自动生成认证标签，
            密文被篡改时解密将失败并提示「认证标签不匹配」。
          </li>
          <li>
            <strong>输出格式：</strong>密文包含加密数据和认证标签，
            GCM 模式的认证标签默认为 16 字节。
          </li>
          <li>
            <strong>长度限制：</strong>为保证浏览器性能，
            明文最大限制为 {MAX_TEXT_LENGTH.toLocaleString()} 字符。
          </li>
        </ul>
      </div>
    </div>
  )
}
