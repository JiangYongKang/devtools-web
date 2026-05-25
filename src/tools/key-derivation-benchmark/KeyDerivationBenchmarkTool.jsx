import { useCallback, useState } from 'react'
import './KeyDerivationBenchmarkTool.css'
import {
    ALGORITHMS,
    bytesToBase64,
    bytesToHex,
    DEFAULT_PARAMS,
    deriveKey,
    EDUCATION_CONTENT,
    exportParamsToJson,
    generateSalt,
    measureTimeAsync,
    OWASP_RECOMMENDATIONS,
    PARAMETER_PRESETS,
    parseSaltInput,
} from './logic/index.js'

/**
 * @template T
 * @typedef {import('react').Dispatch<import('react').SetStateAction<T>>} Dispatch
 */

/**
 * @typedef {Object} DerivationResult
 * @property {Uint8Array|null} [derivedKey]
 * @property {Object} [params]
 * @property {Array} [warnings]
 * @property {Object} [info]
 * @property {string|null} [errorCode]
 * @property {string|null} [errorMessage]
 * @property {number} [durationMs]
 */

/**
 * @typedef {Object} ResultsState
 * @property {DerivationResult|null} pbkdf2
 * @property {DerivationResult|null} scrypt
 * @property {DerivationResult|null} argon2
 */

/** @type {ResultsState} */
const initialResults = {
  pbkdf2: null,
  scrypt: null,
  argon2: null,
}

function KeyDerivationBenchmarkTool() {
  const [activeTab, setActiveTab] = useState('compare')

  const [password, setPassword] = useState('')
  const [saltInput, setSaltInput] = useState('')
  const [saltBytes, setSaltBytes] = useState(() => generateSalt(16))
  const [saltIsRandom, setSaltIsRandom] = useState(true)
  const [keyLength, setKeyLength] = useState(32)

  const [pbkdf2Iterations, setPbkdf2Iterations] = useState(DEFAULT_PARAMS.PBKDF2.iterations)
  const [pbkdf2Hash, setPbkdf2Hash] = useState(DEFAULT_PARAMS.PBKDF2.hash)

  const [scryptN, setScryptN] = useState(DEFAULT_PARAMS.SCRYPT.N)
  const [scryptR, setScryptR] = useState(DEFAULT_PARAMS.SCRYPT.r)
  const [scryptP, setScryptP] = useState(DEFAULT_PARAMS.SCRYPT.p)

  const [argon2Type, setArgon2Type] = useState(DEFAULT_PARAMS.ARGON2.type)
  const [argon2Memory, setArgon2Memory] = useState(DEFAULT_PARAMS.ARGON2.memory)
  const [argon2Iterations, setArgon2Iterations] = useState(DEFAULT_PARAMS.ARGON2.iterations)
  const [argon2Parallelism, setArgon2Parallelism] = useState(DEFAULT_PARAMS.ARGON2.parallelism)

  /** @type {[ResultsState, Dispatch<ResultsState>]} */
  const [results, setResults] = useState(initialResults)

  const [isRunning, setIsRunning] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)

  const handleDownloadJson = useCallback((jsonContent, algorithm) => {
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kdf-params-${algorithm}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setCopyStatus({ type: 'success', message: '参数 JSON 已下载' })
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

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

  const handleGenerateSalt = useCallback(() => {
    const newSalt = generateSalt(16)
    setSaltBytes(newSalt)
    setSaltIsRandom(true)
    setSaltInput('')
  }, [])

  const handleSaltChange = useCallback((value) => {
    setSaltInput(value)
    const parsed = parseSaltInput(value, 16)
    setSaltBytes(parsed.salt)
    setSaltIsRandom(parsed.isRandom)
  }, [])

  const handlePresetSelect = useCallback((preset) => {
    setPbkdf2Iterations(preset.pbkdf2Iterations)
    setScryptN(preset.scryptN)
  }, [])

  const runDerivation = useCallback(async () => {
    if (!password) return

    setIsRunning(true)
    const salt = saltBytes
    const currentKeyLength = keyLength

    try {
      const pbkdf2Promise = measureTimeAsync(() =>
        deriveKey(ALGORITHMS.PBKDF2, {
          password,
          salt,
          iterations: pbkdf2Iterations,
          hash: pbkdf2Hash,
          keyLength: currentKeyLength,
        })
      )

      const scryptPromise = measureTimeAsync(() =>
        deriveKey(ALGORITHMS.SCRYPT, {
          password,
          salt,
          N: scryptN,
          r: scryptR,
          p: scryptP,
          keyLength: currentKeyLength,
        })
      )

      const argon2Promise = measureTimeAsync(() =>
        deriveKey(ALGORITHMS.ARGON2, {
          password,
          salt,
          type: argon2Type,
          memory: argon2Memory,
          iterations: argon2Iterations,
          parallelism: argon2Parallelism,
          keyLength: currentKeyLength,
        })
      )

      const [pbkdf2Result, scryptResult, argon2Result] = await Promise.all([
        pbkdf2Promise,
        scryptPromise,
        argon2Promise,
      ])

      setResults({
        pbkdf2: { ...pbkdf2Result.result, durationMs: pbkdf2Result.durationMs },
        scrypt: { ...scryptResult.result, durationMs: scryptResult.durationMs },
        argon2: { ...argon2Result.result, durationMs: argon2Result.durationMs },
      })
    } catch (error) {
      console.error('Derivation error:', error)
    } finally {
      setIsRunning(false)
    }
  }, [password, saltBytes, keyLength, pbkdf2Iterations, pbkdf2Hash, scryptN, scryptR, scryptP, argon2Type, argon2Memory, argon2Iterations, argon2Parallelism])

  const saltHex = bytesToHex(saltBytes)

  const renderResultCard = (algorithm, result, label, color) => {
    if (!result) return null

    const hasError = result.errorCode
    const hasWarnings = result.warnings && result.warnings.length > 0
    const derivedKey = result.derivedKey
    const derivedKeyHex = derivedKey ? bytesToHex(derivedKey) : null
    const derivedKeyBase64 = derivedKey ? bytesToBase64(derivedKey) : null

    return (
      <div className={`result-card ${color} ${hasError ? 'has-error' : ''}`}>
        <div className="result-card-header">
          <span className="algorithm-label">{label}</span>
          {result.durationMs != null && (
            <span className="duration-badge">{result.durationMs.toFixed(2)} ms</span>
          )}
        </div>

        {hasWarnings && (
          <div className="warning-box">
            <strong>⚠️ 安全警告</strong>
            {result.warnings.map((w, i) => (
              <p key={i}>{w.message}</p>
            ))}
          </div>
        )}

        {result.info && (
          <div className="info-box">
            <strong>ℹ️ 提示</strong>
            <p>{result.info.message}</p>
            <p className="info-note">{result.info.note}</p>
          </div>
        )}

        {hasError ? (
          <div className="error-box">
            <strong>派生失败</strong>
            <p>{result.errorMessage}</p>
          </div>
        ) : derivedKey ? (
          <>
            <div className="result-section">
              <div className="result-row">
                <span className="result-label">Hex</span>
                <code className="result-value-mono">{derivedKeyHex}</code>
                <button className="copy-small-btn" onClick={() => handleCopy(derivedKeyHex, 'Hex 密钥')}>复制</button>
              </div>
              <div className="result-row">
                <span className="result-label">Base64</span>
                <code className="result-value-mono">{derivedKeyBase64}</code>
                <button className="copy-small-btn" onClick={() => handleCopy(derivedKeyBase64, 'Base64 密钥')}>复制</button>
              </div>
            </div>

            <div className="params-section">
              <h4>参数配置</h4>
              <pre className="params-json">
                {exportParamsToJson(result.params, algorithm, saltHex)}
              </pre>
              <button
                className="primary-btn full-width"
                onClick={() => handleDownloadJson(exportParamsToJson(result.params, algorithm, saltHex), algorithm)}
              >
                导出参数 JSON
              </button>
            </div>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="key-derivation-benchmark">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          算法对比
        </button>
        <button
          className={`tab-btn ${activeTab === 'education' ? 'active' : ''}`}
          onClick={() => setActiveTab('education')}
        >
          安全说明
        </button>
      </div>

      {activeTab === 'compare' && (
        <section className="tool-section">
          <div className="privacy-notice">
            <strong>🔒 隐私保护</strong>
            <p>所有计算均在浏览器本地执行，密码不会发送到任何服务器，也不会持久化存储。</p>
          </div>

          <div className="input-section">
            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入要派生的密码"
                className="value-input"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="salt">
                盐值 {saltIsRandom && <span className="badge-random">随机生成</span>}
              </label>
              <div className="salt-input-row">
                <input
                  id="salt"
                  type="text"
                  value={saltInput}
                  onChange={(e) => handleSaltChange(e.target.value)}
                  placeholder="留空自动生成，或输入十六进制/字符串"
                  className="value-input"
                />
                <button className="secondary-btn" onClick={handleGenerateSalt}>
                  重新生成
                </button>
              </div>
              <div className="salt-preview">
                <span>Salt (Hex):</span>
                <code>{saltHex}</code>
                <button className="copy-small-btn" onClick={() => handleCopy(saltHex, '盐值')}>复制</button>
              </div>
            </div>

            <div className="options-grid">
              <div className="option-item option-input">
                <label htmlFor="key-length">密钥长度 (字节)</label>
                <input
                  id="key-length"
                  type="number"
                  min="16"
                  max="128"
                  value={keyLength}
                  onChange={(e) => setKeyLength(Math.max(16, Math.min(128, Number(e.target.value))))}
                />
              </div>
            </div>
          </div>

          <div className="presets-section">
            <h3>快速预设</h3>
            <div className="preset-buttons">
              {PARAMETER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  className="preset-btn"
                  onClick={() => handlePresetSelect(preset)}
                  title={preset.warning}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="algorithms-config">
            <div className="algorithm-config">
              <h3>PBKDF2 参数</h3>
              <div className="slider-group">
                <label>迭代次数: {pbkdf2Iterations.toLocaleString()}</label>
                <input
                  type="range"
                  min="1000"
                  max="2000000"
                  step="1000"
                  value={pbkdf2Iterations}
                  onChange={(e) => setPbkdf2Iterations(Number(e.target.value))}
                />
              </div>
              <div className="options-grid">
                <div className="option-item option-input">
                  <label>哈希算法</label>
                  <select value={pbkdf2Hash} onChange={(e) => setPbkdf2Hash(e.target.value)}>
                    <option value="SHA-256">SHA-256</option>
                    <option value="SHA-512">SHA-512</option>
                  </select>
                </div>
              </div>
              <p className="owasp-hint">
                OWASP 推荐: {OWASP_RECOMMENDATIONS.PBKDF2.SHA256.iterations.toLocaleString()} 次迭代 (SHA-256)
              </p>
            </div>

            <div className="algorithm-config">
              <h3>scrypt 参数</h3>
              <div className="slider-group">
                <label>N (CPU/内存成本): {scryptN.toLocaleString()} (2^{Math.log2(scryptN)})</label>
                <input
                  type="range"
                  min="10"
                  max="18"
                  step="1"
                  value={Math.log2(scryptN)}
                  onChange={(e) => setScryptN(Math.pow(2, Number(e.target.value)))}
                />
              </div>
              <div className="options-grid">
                <div className="option-item option-input">
                  <label>r (块大小)</label>
                  <input
                    type="number"
                    min="1"
                    max="32"
                    value={scryptR}
                    onChange={(e) => setScryptR(Math.max(1, Math.min(32, Number(e.target.value))))}
                  />
                </div>
                <div className="option-item option-input">
                  <label>p (并行度)</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={scryptP}
                    onChange={(e) => setScryptP(Math.max(1, Math.min(16, Number(e.target.value))))}
                  />
                </div>
              </div>
              <p className="owasp-hint">
                OWASP 推荐: N=131072, r=8, p=1
              </p>
            </div>

            <div className="algorithm-config">
              <h3>Argon2 参数 (配置预览)</h3>
              <div className="options-grid">
                <div className="option-item option-input">
                  <label>类型</label>
                  <select value={argon2Type} onChange={(e) => setArgon2Type(e.target.value)}>
                    <option value="d">Argon2d</option>
                    <option value="i">Argon2i</option>
                    <option value="id">Argon2id</option>
                  </select>
                </div>
                <div className="option-item option-input">
                  <label>内存 (KB)</label>
                  <input
                    type="number"
                    min="8"
                    max="131072"
                    value={argon2Memory}
                    onChange={(e) => setArgon2Memory(Math.max(8, Math.min(131072, Number(e.target.value))))}
                  />
                </div>
                <div className="option-item option-input">
                  <label>迭代次数</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={argon2Iterations}
                    onChange={(e) => setArgon2Iterations(Math.max(1, Math.min(10, Number(e.target.value))))}
                  />
                </div>
                <div className="option-item option-input">
                  <label>并行度</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={argon2Parallelism}
                    onChange={(e) => setArgon2Parallelism(Math.max(1, Math.min(8, Number(e.target.value))))}
                  />
                </div>
              </div>
              <p className="owasp-hint">
                OWASP 推荐: m=12288, t=3, p=1 (Argon2id)
              </p>
            </div>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={runDerivation}
              disabled={!password || isRunning}
            >
              {isRunning ? '计算中...' : '开始派生'}
            </button>
          </div>

          <div className="results-grid">
            {renderResultCard(ALGORITHMS.PBKDF2, results.pbkdf2, 'PBKDF2', 'blue')}
            {renderResultCard(ALGORITHMS.SCRYPT, results.scrypt, 'scrypt', 'green')}
            {renderResultCard(ALGORITHMS.ARGON2, results.argon2, 'Argon2', 'purple')}
          </div>
        </section>
      )}

      {activeTab === 'education' && (
        <section className="tool-section">
          <div className="education-content">
            <div className="education-card">
              <h3>{EDUCATION_CONTENT.saltExplanation.title}</h3>
              <ul>
                {EDUCATION_CONTENT.saltExplanation.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="education-card">
              <h3>{EDUCATION_CONTENT.pepperExplanation.title}</h3>
              <ul>
                {EDUCATION_CONTENT.pepperExplanation.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="education-card">
              <h3>{EDUCATION_CONTENT.passwordStorage.title}</h3>
              <ul>
                {EDUCATION_CONTENT.passwordStorage.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="education-card">
              <h3>{EDUCATION_CONTENT.algorithmComparison.title}</h3>
              <div className="algorithm-compare">
                {EDUCATION_CONTENT.algorithmComparison.algorithms.map((algo, i) => (
                  <div key={i} className="algo-compare-card">
                    <h4>{algo.name}</h4>
                    <div className="compare-section">
                      <strong>优点</strong>
                      <ul>
                        {algo.pros.map((p, j) => <li key={j}>{p}</li>)}
                      </ul>
                    </div>
                    <div className="compare-section">
                      <strong>缺点</strong>
                      <ul>
                        {algo.cons.map((c, j) => <li key={j}>{c}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="education-card">
              <h3>OWASP 推荐参数参考</h3>
              <table className="params-table">
                <thead>
                  <tr>
                    <th>算法</th>
                    <th>参数配置</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>PBKDF2-HMAC-SHA256</td>
                    <td><code>iterations = 600,000</code></td>
                  </tr>
                  <tr>
                    <td>PBKDF2-HMAC-SHA512</td>
                    <td><code>iterations = 210,000</code></td>
                  </tr>
                  <tr>
                    <td>scrypt</td>
                    <td><code>N=131072, r=8, p=1</code></td>
                  </tr>
                  <tr>
                    <td>Argon2id</td>
                    <td><code>m=12288 KB, t=3, p=1</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default KeyDerivationBenchmarkTool
