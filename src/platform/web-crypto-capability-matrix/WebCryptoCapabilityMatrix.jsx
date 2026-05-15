import { useState, useCallback, useEffect, useRef } from 'react'
import './WebCryptoCapabilityMatrix.css'
import {
  probeSubtleCapabilities,
  SUPPORT_STATUS,
  ENV_SCENARIOS,
  SCHEMA_VERSION,
} from './logic/index.js'

function getStatusIcon(status) {
  switch (status) {
    case SUPPORT_STATUS.FULL:
      return '✅'
    case SUPPORT_STATUS.NOT_SUPPORTED:
      return '❌'
    case SUPPORT_STATUS.PARTIAL:
      return '⚠️'
    default:
      return '❓'
  }
}

function getStatusClass(status) {
  switch (status) {
    case SUPPORT_STATUS.FULL:
      return 'supported'
    case SUPPORT_STATUS.NOT_SUPPORTED:
      return 'not-supported'
    case SUPPORT_STATUS.PARTIAL:
      return 'partial'
    default:
      return 'unknown'
  }
}

function getEnvironmentLabel(scenario) {
  const labels = {
    [ENV_SCENARIOS.SECURE_LOCALHOST]: '本地安全环境 (localhost)',
    [ENV_SCENARIOS.SECURE_PUBLIC]: '公网安全环境 (HTTPS)',
    [ENV_SCENARIOS.INSECURE_HTTP]: '非安全环境 (HTTP)',
    [ENV_SCENARIOS.INSECURE_FILE]: '本地文件协议 (file://)',
    [ENV_SCENARIOS.MIXED_CONTENT]: '混合内容环境',
    [ENV_SCENARIOS.IFRAME_WITHOUT_CRYPTO_KEY]: 'iframe 无 crypto-key 权限',
  }
  return labels[scenario] || scenario
}

function debounce(fn, delay) {
  let timer = null
  return (...args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function WebCryptoCapabilityMatrix() {
  const [probeResult, setProbeResult] = useState(null)
  const [isProbing, setIsProbing] = useState(false)
  const [probeOptions, setProbeOptions] = useState({
    skipHeavyOperations: false,
    rsaKeySize: 2048,
    includeWorkerProbe: true,
  })

  const abortControllerRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const MIN_PROBE_DURATION = 1500

  const runProbe = useCallback(async (options = {}) => {
    if (isProbing) return

    setIsProbing(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const startTime = Date.now()

    try {
      const result = await probeSubtleCapabilities({
        ...probeOptions,
        ...options,
        signal: abortControllerRef.current.signal,
        timeout: 15000,
      })

      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, MIN_PROBE_DURATION - elapsed)
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }

      if (isMountedRef.current) {
        setProbeResult(result)
      }
    } catch (error) {
      console.error('Probe failed:', error)
    } finally {
      if (isMountedRef.current) {
        setIsProbing(false)
      }
    }
  }, [isProbing, probeOptions])

  const debouncedProbe = useCallback(debounce(runProbe, 300), [runProbe])

  const handlePresetAllGreen = useCallback(() => {
    setProbeOptions({
      skipHeavyOperations: false,
      rsaKeySize: 2048,
      includeWorkerProbe: true,
    })
    debouncedProbe({
      skipHeavyOperations: false,
      rsaKeySize: 2048,
    })
  }, [debouncedProbe])

  const handlePresetRsaFailure = useCallback(() => {
    setProbeOptions({
      skipHeavyOperations: false,
      rsaKeySize: 512,
      includeWorkerProbe: true,
    })
    debouncedProbe({
      skipHeavyOperations: false,
      rsaKeySize: 512,
    })
  }, [debouncedProbe])

  const handlePresetNoWorker = useCallback(() => {
    setProbeOptions({
      skipHeavyOperations: false,
      rsaKeySize: 2048,
      includeWorkerProbe: false,
    })
    debouncedProbe({
      includeWorkerProbe: false,
    })
  }, [debouncedProbe])

  const handleExportJson = useCallback(() => {
    if (!probeResult) return

    const sanitizedResult = {
      schemaVersion: probeResult.schemaVersion,
      timestamp: probeResult.timestamp,
      isSecureContext: probeResult.isSecureContext,
      environmentScenario: probeResult.environmentScenario,
      hasSubtleCrypto: probeResult.hasSubtleCrypto,
      workerAvailable: probeResult.workerAvailable,
      summary: probeResult.summary,
      duration: probeResult.duration,
      options: probeResult.options,
      probeResults: probeResult.probeResults?.map((r) => ({
        algorithm: r.algorithm,
        operation: r.operation,
        status: r.status,
        duration: r.duration,
        errorCode: r.error?.errorCode || null,
        skipped: r.skipped || false,
      })),
    }

    const blob = new Blob([JSON.stringify(sanitizedResult, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `web-crypto-capabilities-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [probeResult])

  const renderInsecureWarning = () => {
    if (!probeResult || probeResult.isSecureContext) return null

    return (
      <section className="insecure-warning">
        <h3>
          <span>🔒</span>
          Web Crypto API 需要安全上下文
        </h3>
        <p>
          您当前的运行环境不符合 Web Crypto API 的安全要求。
          这意味着无法进行加密操作能力探测。
        </p>
        <div className="checklist">
          <h4>迁移检查清单</h4>
          <ul>
            <li>使用 HTTPS 协议部署您的应用</li>
            <li>本地开发可使用 localhost 或 127.0.0.1</li>
            <li>检查 iframe 是否设置了 allow="crypto-key" 属性</li>
            <li>避免混合内容（HTTP 资源加载到 HTTPS 页面）</li>
            <li>在 Service Worker 中确保在安全上下文中注册</li>
          </ul>
        </div>
        <div className="polyfill-note">
          <strong>⚠️ Polyfill 不可行：</strong> Web Crypto API 是浏览器
          内置的安全原生接口，无法通过 JavaScript Polyfill 完全模拟。
          部分加密库（如 crypto-js）可提供有限替代，但缺乏硬件安全
          模块支持与浏览器安全沙箱保障。
        </div>
      </section>
    )
  }

  const renderEnvironmentInfo = () => {
    if (!probeResult) return null

    return (
      <section className="environment-info">
        <h3>环境信息</h3>
        <div className="environment-status">
          <span className={`status-badge ${probeResult.isSecureContext ? 'secure' : 'insecure'}`}>
            <span className="icon">{probeResult.isSecureContext ? '🔒' : '⚠️'}</span>
            {probeResult.isSecureContext ? '安全上下文' : '非安全上下文'}
          </span>
          <span className="status-badge">
            <span className="icon">{probeResult.hasSubtleCrypto ? '✅' : '❌'}</span>
            SubtleCrypto: {probeResult.hasSubtleCrypto ? '可用' : '不可用'}
          </span>
          <span className={`status-badge ${probeResult.workerAvailable ? 'worker' : 'insecure'}`}>
            <span className="icon">{probeResult.workerAvailable ? '✅' : '❌'}</span>
            Worker: {probeResult.workerAvailable ? '可用' : '不可用'}
          </span>
          <span className="status-badge">
            <span className="icon">📍</span>
            {getEnvironmentLabel(probeResult.environmentScenario)}
          </span>
        </div>
      </section>
    )
  }

  const renderSummary = () => {
    if (!probeResult || !probeResult.summary) return null

    const { summary } = probeResult

    return (
      <section className="summary-section">
        <h3>探测概览</h3>
        <div className="summary-stats">
          <div className="stat-card">
            <span className="value">{summary.total}</span>
            <span className="label">总计</span>
          </div>
          <div className="stat-card supported">
            <span className="value">{summary.supported}</span>
            <span className="label">支持</span>
          </div>
          <div className="stat-card not-supported">
            <span className="value">{summary.notSupported}</span>
            <span className="label">不支持</span>
          </div>
          <div className="stat-card partial">
            <span className="value">{summary.partial}</span>
            <span className="label">部分支持</span>
          </div>
          <div className="stat-card unknown">
            <span className="value">{summary.unknown}</span>
            <span className="label">未知</span>
          </div>
        </div>
      </section>
    )
  }

  const renderProbeTable = () => {
    if (!probeResult || !probeResult.probeResults) return null

    return (
      <section className="matrix-table">
        <h3>能力矩阵详情</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>算法</th>
                <th>操作</th>
                <th>状态</th>
                <th>耗时</th>
                <th>错误码</th>
              </tr>
            </thead>
            <tbody>
              {probeResult.probeResults.map((result, index) => (
                <tr key={`${result.algorithm}-${result.operation}-${index}`}>
                  <td>
                    <code>{result.algorithm}</code>
                  </td>
                  <td>{result.operation}</td>
                  <td>
                    <span className="status-cell">
                      <span className={`status-icon ${getStatusClass(result.status)}`}>
                        {getStatusIcon(result.status)}
                      </span>
                      {result.skipped ? '(已跳过)' : ''}
                    </span>
                  </td>
                  <td>
                    <span className="duration">{result.duration}ms</span>
                  </td>
                  <td>
                    {result.error?.errorCode && (
                      <span className="error-code">{result.error.errorCode}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  const renderWorkerComparison = () => {
    if (!probeResult) return null

    if (!probeResult.workerAvailable) {
      return (
        <section className="worker-section">
          <h3>Worker 探测结果</h3>
          <div className="worker-unavailable">
            <span>⚙️</span>
            <p>Worker 不可用或已禁用探测</p>
            <p style={{ fontSize: '13px', marginTop: '8px', color: '#9c4221' }}>
              部分浏览器在非安全上下文中可能限制 Worker 功能
            </p>
          </div>
        </section>
      )
    }

    if (!probeResult.workerResults || probeResult.workerResults.length === 0) {
      return null
    }

    return (
      <section className="worker-section">
        <h3>主线程 vs Worker 对比</h3>
        <div className="worker-comparison">
          <div className="comparison-column">
            <h4>主线程结果</h4>
            <ul>
              {probeResult.probeResults?.slice(0, 5).map((r, i) => (
                <li key={i}>
                  {r.algorithm}: {getStatusIcon(r.status)} ({r.duration}ms)
                </li>
              ))}
            </ul>
          </div>
          <div className="comparison-column">
            <h4>Worker 结果</h4>
            <ul>
              {probeResult.workerResults.map((r, i) => (
                <li key={i}>
                  {r.algorithm}: {getStatusIcon(r.status)} ({r.duration}ms)
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="web-crypto-matrix">
      <header>
        <h1>Web Crypto 能力矩阵</h1>
        <p className="subtitle">
          探测浏览器 SubtleCrypto API 对各种算法与操作的支持情况
          <br />
          Schema 版本: {SCHEMA_VERSION}
        </p>
      </header>

      {renderEnvironmentInfo()}
      {renderInsecureWarning()}

      <section className="control-panel">
        <h3>探测控制</h3>
        <div className="preset-buttons">
          <button
            className="preset-btn green"
            onClick={handlePresetAllGreen}
            disabled={isProbing}
          >
            <span>✅</span>
            现代浏览器预期（全绿）
          </button>
          <button
            className="preset-btn orange"
            onClick={handlePresetRsaFailure}
            disabled={isProbing}
          >
            <span>⚠️</span>
            短 RSA 模数（预期失败）
          </button>
          <button
            className="preset-btn red"
            onClick={handlePresetNoWorker}
            disabled={isProbing}
          >
            <span>🔌</span>
            禁用 Worker 探测
          </button>
        </div>
        <div className="action-buttons">
          <button
            className="probe-btn"
            onClick={() => runProbe()}
            disabled={isProbing}
          >
            {isProbing ? (
              <>
                <span className="spinner"></span>
                探测中...
              </>
            ) : (
              <>
                <span>🔍</span>
                开始探测
              </>
            )}
          </button>
          <button
            className="export-btn"
            onClick={handleExportJson}
            disabled={!probeResult || isProbing}
          >
            📋 导出诊断 JSON
          </button>
          {isProbing && (
            <span className="probe-progress">
              正在执行加密能力探测，请稍候...
            </span>
          )}
        </div>
      </section>

      {probeResult ? (
        <>
          {renderSummary()}
          {renderProbeTable()}
          {renderWorkerComparison()}
        </>
      ) : (
        <section className="no-data">
          <div className="icon">🔐</div>
          <p>点击「开始探测」按钮以检测您的浏览器加密能力</p>
        </section>
      )}
    </div>
  )
}
