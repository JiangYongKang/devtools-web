import { useCallback, useMemo, useState } from 'react'
import './ErrorMessageMapperDemo.css'
import {
  DOMAINS,
  SEVERITY,
  ERROR_CODES,
  ENVIRONMENTS,
  DEFAULT_MAPPINGS,
  getEnvironmentOverrides,
  buildMergedMappings,
  mapError,
  mapFetchError,
  getDemoPatchData,
  validatePatchSchema,
  normalizePatch,
  parseRetryAfter,
} from './logic/index.js'

const SAMPLE_HTTP_STATUSES = [
  { code: 400, label: '400 Bad Request' },
  { code: 401, label: '401 Unauthorized' },
  { code: 403, label: '403 Forbidden' },
  { code: 404, label: '404 Not Found' },
  { code: 429, label: '429 Too Many Requests' },
  { code: 500, label: '500 Internal Server Error' },
  { code: 503, label: '503 Service Unavailable' },
]

const SAMPLE_BUSINESS_CODES = [
  { code: null, label: '(无业务码)' },
  { code: 'TIMEOUT', label: 'TIMEOUT' },
  { code: 'NETWORK', label: 'NETWORK' },
  { code: 'ABORTED', label: 'ABORTED' },
  { code: 'UNKNOWN_CODE', label: 'UNKNOWN_CODE (未知)' },
]

const ERROR_INJECTION_TYPES = [
  {
    type: 'TypeError',
    name: 'TypeError: Failed to fetch',
    create: () => new TypeError('Failed to fetch'),
  },
  {
    type: 'AbortError',
    name: 'AbortError: Operation aborted',
    create: () => new DOMException('Operation aborted', 'AbortError'),
  },
  {
    type: 'SecurityError',
    name: 'DOMException: SecurityError',
    create: () => new DOMException('Permission denied', 'SecurityError'),
  },
  {
    type: 'QuotaExceededError',
    name: 'DOMException: QuotaExceededError',
    create: () => new DOMException('Storage quota exceeded', 'QuotaExceededError'),
  },
  {
    type: 'CircularCause',
    name: '循环引用 Cause 链',
    create: () => {
      const error1 = new Error('Error 1')
      const error2 = new Error('Error 2')
      error1.cause = error2
      error2.cause = error1
      return error1
    },
  },
]

function MatrixTable({ mappings, onCellClick, selectedCell, copiedCellKey }) {
  const getCellKey = (status, businessCode) => {
    return `http:${status}:${businessCode || 'null'}`
  }

  return (
    <div className="matrix-container">
      <h3>HTTP 状态 × 业务码 映射矩阵</h3>
      <div className="table-wrapper">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="corner-cell">HTTP 状态 \ 业务码</th>
              {SAMPLE_BUSINESS_CODES.map((bc) => (
                <th key={bc.label} className="header-cell">
                  {bc.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAMPLE_HTTP_STATUSES.map((status) => (
              <tr key={status.code}>
                <td className="row-header">{status.label}</td>
                {SAMPLE_BUSINESS_CODES.map((bc) => {
                  const input = {
                    domain: DOMAINS.HTTP,
                    httpStatus: status.code,
                    businessCode: bc.code,
                  }
                  
                  const result = mapError(input, {
                    mergedMappings: mappings,
                    locale: 'zh',
                    fallbackLocale: 'en',
                  })

                  const cellKey = getCellKey(status.code, bc.code)
                  const isSelected = selectedCell &&
                    selectedCell.httpStatus === status.code &&
                    selectedCell.businessCode === bc.code
                  const isCopied = copiedCellKey === cellKey

                  return (
                    <td
                      key={bc.label}
                      className={`matrix-cell ${isSelected ? 'selected' : ''} ${isCopied ? 'copied' : ''} severity-${result.severity}`}
                      onClick={() => onCellClick(status.code, bc.code, result)}
                    >
                      <div className="cell-error-code">{result.errorCode}</div>
                      <div className={`cell-retryable ${result.retryable ? 'yes' : 'no'}`}>
                        {result.retryable ? `可重试 (${result.suggestedRetryDelaySeconds}s)` : '不可重试'}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultPanel({ result, input }) {
  if (!result) {
    return (
      <div className="result-panel empty">
        <p>点击矩阵表中的单元格查看详细信息</p>
      </div>
    )
  }

  return (
    <div className="result-panel">
      <h3>映射结果详情</h3>
      
      <div className="result-section">
        <div className="result-label">输入参数</div>
        <div className="result-value">
          <pre>
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      </div>

      <div className="result-section">
        <div className="result-label">用户标题</div>
        <div className="result-value title">{result.userTitle}</div>
      </div>

      <div className="result-section">
        <div className="result-label">用户详情</div>
        <div className="result-value detail">{result.userDetail}</div>
      </div>

      <div className="result-section">
        <div className="result-label">恢复建议</div>
        <div className="result-value">
          <ul className="recovery-hints">
            {result.recoveryHints.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="result-meta">
        <div className="meta-item">
          <span className="meta-label">错误码:</span>
          <span className="meta-value code">{result.errorCode}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">严重程度:</span>
          <span className={`meta-value severity severity-${result.severity}`}>
            {result.severity}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">是否可重试:</span>
          <span className={`meta-value retryable ${result.retryable ? 'yes' : 'no'}`}>
            {result.retryable ? '是' : '否'}
          </span>
        </div>
        {result.retryable && (
          <div className="meta-item">
            <span className="meta-label">建议退避:</span>
            <span className="meta-value">{result.suggestedRetryDelaySeconds} 秒</span>
          </div>
        )}
      </div>

      {result.causeChain && result.causeChain.length > 0 && (
        <div className="result-section">
          <div className="result-label">Cause 链</div>
          <div className="result-value">
            <pre>
              {JSON.stringify(result.causeChain, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function ErrorInjectionPanel({ onInjectError }) {
  return (
    <div className="error-injection-panel">
      <h3>错误注入测试</h3>
      <p>点击以下按钮注入典型错误类型，观察映射结果：</p>
      
      <div className="injection-buttons">
        {ERROR_INJECTION_TYPES.map((errorType) => (
          <button
            key={errorType.type}
            className="demo-btn"
            onClick={() => onInjectError(errorType)}
          >
            {errorType.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function ConfigurationPanel({
  selectedEnvironment,
  onEnvironmentChange,
  applyRemotePatch,
  patchStatus,
  locale,
  onLocaleChange,
  patchButtonClicked,
}) {
  const environments = [
    { value: ENVIRONMENTS.DEVELOPMENT, label: 'Development' },
    { value: ENVIRONMENTS.STAGING, label: 'Staging' },
    { value: ENVIRONMENTS.PRODUCTION, label: 'Production' },
  ]

  const locales = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français (测试回退)' },
  ]

  return (
    <div className="config-panel">
      <h3>配置选项</h3>
      
      <div className="config-group">
        <label>环境:</label>
        <select
          value={selectedEnvironment}
          onChange={(e) => onEnvironmentChange(e.target.value)}
        >
          {environments.map((env) => (
            <option key={env.value} value={env.value}>
              {env.label}
            </option>
          ))}
        </select>
      </div>

      <div className="config-group">
        <label>语言:</label>
        <select
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value)}
        >
          {locales.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>

      <div className="config-group">
        <label>远程补丁:</label>
        <div className="patch-status">
          <span className={`status-badge ${patchStatus}`}>
            {patchStatus === 'idle' ? '未加载' : 
             patchStatus === 'loaded' ? '已应用' :
             patchStatus === 'error' ? '加载失败' : patchStatus}
          </span>
          <button 
            className={`demo-btn ${patchButtonClicked ? 'clicked' : ''}`} 
            onClick={applyRemotePatch}
          >
            应用演示补丁
          </button>
        </div>
      </div>
    </div>
  )
}

function RetryAfterDemo({ onTest }) {
  const [retryAfterValue, setRetryAfterValue] = useState('30')
  const [parseResult, setParseResult] = useState(null)

  const testParse = useCallback(() => {
    const headers = {
      get: (name) => name.toLowerCase() === 'retry-after' ? retryAfterValue : null,
    }
    const result = parseRetryAfter(headers)
    setParseResult(result)
    if (onTest) {
      onTest(retryAfterValue, result)
    }
  }, [retryAfterValue, onTest])

  return (
    <div className="retry-after-demo">
      <h3>Retry-After 头解析测试</h3>
      <div className="config-group">
        <label>Retry-After 值:</label>
        <input
          type="text"
          value={retryAfterValue}
          onChange={(e) => setRetryAfterValue(e.target.value)}
          placeholder="输入秒数或 HTTP-date"
        />
        <button className="demo-btn" onClick={testParse}>
          解析
        </button>
      </div>
      {parseResult !== null && (
        <div className="parse-result">
          解析结果: <strong>{parseResult}</strong> 秒
        </div>
      )}
    </div>
  )
}

function ExportPanel({ mappings, onExport }) {
  const exportToCSV = useCallback(() => {
    const headers = [
      'Domain',
      'HTTP Status',
      'Business Code',
      'Error Code',
      'User Title (zh)',
      'User Title (en)',
      'User Detail (zh)',
      'User Detail (en)',
      'Severity',
      'Retryable',
      'Suggested Retry Delay (s)',
    ]

    const rows = mappings.map((mapping) => {
      return [
        mapping.match.domain || '',
        mapping.match.httpStatus !== null ? mapping.match.httpStatus : '',
        mapping.match.businessCode || '',
        mapping.template.errorCode,
        mapping.template.userTitle?.zh || '',
        mapping.template.userTitle?.en || '',
        mapping.template.userDetail?.zh || '',
        mapping.template.userDetail?.en || '',
        mapping.template.severity,
        mapping.template.retryable ? 'Yes' : 'No',
        mapping.template.suggestedRetryDelaySeconds || '',
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    
    if (onExport) {
      onExport(csv)
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'error-mappings.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [mappings, onExport])

  return (
    <div className="export-panel">
      <h3>导出功能</h3>
      <button className="demo-btn" onClick={exportToCSV}>
        导出映射表为 CSV
      </button>
      <p className="hint">导出当前合并后的完整映射表，包含所有默认、环境和远程覆盖。</p>
    </div>
  )
}

function ErrorMessageMapperDemo() {
  const [selectedEnvironment, setSelectedEnvironment] = useState(ENVIRONMENTS.DEVELOPMENT)
  const [remoteOverrides, setRemoteOverrides] = useState([])
  const [patchStatus, setPatchStatus] = useState('idle')
  const [patchButtonClicked, setPatchButtonClicked] = useState(false)
  const [locale, setLocale] = useState('zh')
  const [selectedCell, setSelectedCell] = useState(null)
  const [currentResult, setCurrentResult] = useState(null)
  const [currentInput, setCurrentInput] = useState(null)
  const [copiedCellKey, setCopiedCellKey] = useState(null)
  const [activeTab, setActiveTab] = useState('matrix')

  const mergedMappings = useMemo(() => {
    return buildMergedMappings({
      environment: selectedEnvironment,
      remoteOverrides,
    })
  }, [selectedEnvironment, remoteOverrides])

  const getCellKey = (httpStatus, businessCode) => {
    return `http:${httpStatus}:${businessCode || 'null'}`
  }

  const handleCellClick = useCallback(async (httpStatus, businessCode, result) => {
    const input = {
      domain: DOMAINS.HTTP,
      httpStatus,
      businessCode,
    }

    const finalResult = result || mapError(input, {
      mergedMappings,
      locale,
      fallbackLocale: 'en',
    })

    setSelectedCell({ httpStatus, businessCode })
    setCurrentResult(finalResult)
    setCurrentInput(input)

    const textToCopy = JSON.stringify({
      input,
      result: finalResult,
    }, null, 2)

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
        } finally {
          document.body.removeChild(textArea)
        }
      }

      const cellKey = getCellKey(httpStatus, businessCode)
      setCopiedCellKey(cellKey)
      
      setTimeout(() => {
        setCopiedCellKey((current) => current === cellKey ? null : current)
      }, 2000)
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err)
    }
  }, [mergedMappings, locale])

  const handleInjectError = useCallback((errorType) => {
    const error = errorType.create()
    const result = mapFetchError(error, null, {
      locale,
      fallbackLocale: 'en',
    })

    setCurrentResult(result)
    setCurrentInput({
      errorType: errorType.type,
      errorName: error.name,
      errorMessage: error.message,
    })
  }, [locale])

  const handleApplyRemotePatch = useCallback(() => {
    setPatchButtonClicked(true)
    
    const demoPatch = getDemoPatchData()
    
    if (validatePatchSchema(demoPatch)) {
      const normalized = normalizePatch(demoPatch)
      setRemoteOverrides(normalized.overrides)
      setPatchStatus('loaded')
    } else {
      setPatchStatus('error')
    }

    setTimeout(() => {
      setPatchButtonClicked(false)
    }, 500)
  }, [])

  const tabs = [
    { id: 'matrix', label: '矩阵表预览' },
    { id: 'injection', label: '错误注入' },
    { id: 'tools', label: '工具与导出' },
  ]

  return (
    <div className="error-message-mapper-demo">
      <section className="tool-section">
        <div className="demo-header">
          <h2>错误消息映射器演示</h2>
          <p>
            统一错误映射层：支持 domain、httpStatus、businessCode 映射，
            分层覆盖（默认 → 环境 → 远程补丁），多语言回退
          </p>
        </div>

        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ConfigurationPanel
          selectedEnvironment={selectedEnvironment}
          onEnvironmentChange={setSelectedEnvironment}
          applyRemotePatch={handleApplyRemotePatch}
          patchStatus={patchStatus}
          locale={locale}
          onLocaleChange={setLocale}
          patchButtonClicked={patchButtonClicked}
        />

        <div className="tab-content-wrapper">
          {activeTab === 'matrix' && (
            <div className="tab-content">
              <MatrixTable
                mappings={mergedMappings}
                onCellClick={handleCellClick}
                selectedCell={selectedCell}
                copiedCellKey={copiedCellKey}
              />
              <ResultPanel result={currentResult} input={currentInput} />
            </div>
          )}

          {activeTab === 'injection' && (
            <div className="tab-content">
              <ErrorInjectionPanel onInjectError={handleInjectError} />
              <ResultPanel result={currentResult} input={currentInput} />
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="tab-content">
              <RetryAfterDemo />
              <ExportPanel mappings={mergedMappings} />
              
              <div className="info-panel">
                <h3>与任务 057/027 衔接示例</h3>
                <p>导出的 <code>mapFetchError(error, responseMeta)</code> 纯函数：</p>
                <pre>{`// responseMeta 仅包含 status、statusText、headers
// 不依赖真实 Response 对象构造，单测可用手写对象

// 使用示例：
const result = mapFetchError(error, {
  status: 503,
  statusText: 'Service Unavailable',
  headers: {
    get: (name) => name.toLowerCase() === 'retry-after' ? '30' : null
  }
}, {
  locale: 'zh',
  fallbackLocale: 'en'
})

// 结果包含：
// { userTitle, userDetail, recoveryHints[], errorCode, severity, retryable, suggestedRetryDelaySeconds }`}</pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default ErrorMessageMapperDemo
