import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BAD_BUNDLES,
  DEMO_BUNDLES,
  DEMO_LOCALES,
  USED_INTERPOLATION_STYLE,
  createI18nStore,
  createSyncI18n,
  formatCurrency,
  formatDate,
  formatNumber,
  getDirection,
  hasKey,
  isRTL,
  localizeMappedError,
  localizeRecoveryHints,
  registerBundleInStore,
  setLocale,
  simpleChecksum,
  t,
  validatePatch,
  validateTranslationSchema,
} from './logic/index.js'
import './I18nKitDemo.css'

function safeStringify(obj, indent = 2) {
  const seen = new WeakSet()
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]'
      }
      seen.add(value)
    }
    return value
  }, indent)
}

function getInitialStore() {
  const store = createI18nStore({
    defaultLocale: DEMO_LOCALES.EN_US,
    fallbackLocale: DEMO_LOCALES.EN_US,
  })
  for (const [locale, namespaces] of Object.entries(DEMO_BUNDLES)) {
    for (const [ns, data] of Object.entries(namespaces)) {
      registerBundleInStore(store, locale, ns, data, { version: '1.0.0' })
    }
  }
  return store
}

export default function I18nKitDemo() {
  const [store] = useState(getInitialStore)
  const [currentLocale, setCurrentLocaleState] = useState(DEMO_LOCALES.EN_US)
  const [activeTab, setActiveTab] = useState('basics')
  const [interpolationName, setInterpolationName] = useState('Alice')
  const [interpolationCount, setInterpolationCount] = useState(5)
  const [testKey, setTestKey] = useState('greeting')
  const [testParams, setTestParams] = useState(safeStringify({ name: 'Test' }, 2))
  const [validationResult, setValidationResult] = useState(null)
  const [errorBridgeResult, setErrorBridgeResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

  useEffect(() => {
    setLocale(store, currentLocale)
  }, [store, currentLocale])

  const direction = useMemo(() => getDirection(currentLocale), [currentLocale])
  const isRtl = useMemo(() => isRTL(currentLocale), [currentLocale])

  const handleLocaleChange = useCallback((e) => {
    const locale = e.target.value
    if (locale === DEMO_LOCALES.FICTITIOUS) {
      const fictitiousBundle = {
        greeting: 'XX-{{name}}-XX',
        welcome: 'XX-Welcome-XX',
        home: 'XX-Home-XX',
      }
      registerBundleInStore(store, DEMO_LOCALES.FICTITIOUS, 'common', fictitiousBundle, { version: '1.0.0' })
    }
    setCurrentLocaleState(locale)
  }, [store])

  const handleCopy = useCallback((text, label) => {
    if (!text) return

    const showSuccess = () => {
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
      setTimeout(() => setCopyStatus(null), 2500)
    }

    const showError = (msg) => {
      setCopyStatus({ type: 'error', message: `复制失败：${msg}` })
      setTimeout(() => setCopyStatus(null), 2500)
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(showSuccess)
        .catch((err) => showError(err?.message || '未知错误'))
      return
    }

    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      textarea.style.width = '1px'
      textarea.style.height = '1px'
      textarea.style.padding = '0'
      textarea.style.border = 'none'
      textarea.style.outline = 'none'
      textarea.style.boxShadow = 'none'
      textarea.style.background = 'transparent'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, text.length)
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (successful) {
        showSuccess()
      } else {
        showError('execCommand 失败')
      }
    } catch (err) {
      showError(err?.message || '未知错误')
    }
  }, [])

  const handleTestKeyChange = useCallback((e) => {
    setTestKey(e.target.value)
  }, [])

  const handleTestParamsChange = useCallback((e) => {
    setTestParams(e.target.value)
  }, [])

  const parsedTestParams = useMemo(() => {
    try {
      return JSON.parse(testParams)
    } catch {
      return {}
    }
  }, [testParams])

  const testTranslation = useMemo(() => {
    return t(store, testKey, parsedTestParams)
  }, [store, testKey, parsedTestParams])

  const testKeyExists = useMemo(() => {
    return hasKey(store, testKey)
  }, [store, testKey])

  const handleValidateBundle = useCallback((bundleKey) => {
    const bundleInfo = BAD_BUNDLES[bundleKey]
    if (!bundleInfo) return

    const result = validateTranslationSchema(bundleInfo.data)
    const checksumResult = bundleKey === 'badChecksum'
      ? validatePatch({ version: '1.0.0' }, bundleInfo.data, { requireChecksum: true })
      : null
    const versionResult = bundleKey === 'versionConflict'
      ? validatePatch({ version: '1.0.0' }, bundleInfo.data, { requireVersion: true })
      : null

    setValidationResult({
      bundleKey,
      description: bundleInfo.description,
      schema: result,
      checksum: checksumResult,
      version: versionResult,
    })
  }, [])

  const handleTestErrorBridge = useCallback(() => {
    const mockMappedError = {
      userTitle: 'Default Title',
      userDetail: 'Default Detail',
      errorCode: 'HTTP_502',
      severity: 'error',
      retryable: false,
      recoveryHints: ['common:button.save', 'common:button.cancel'],
      originalInput: {
        httpStatus: 502,
        domain: 'http',
      },
    }
    const localized = localizeMappedError(store, mockMappedError)
    const localizedHints = localizeRecoveryHints(store, mockMappedError.recoveryHints)
    setErrorBridgeResult({
      original: mockMappedError,
      localized,
      localizedHints,
    })
  }, [store])

  const today = useMemo(() => new Date(), [])
  const formattedDate = useMemo(() => formatDate(today, currentLocale), [today, currentLocale])
  const formattedNumber = useMemo(() => formatNumber(1234567.89, currentLocale), [currentLocale])
  const formattedCurrency = useMemo(() => formatCurrency(99.99, currentLocale, 'USD'), [currentLocale])

  const renderBasicsTab = () => {
    const greeting = t(store, 'greeting', { name: interpolationName })
    const welcome = t(store, 'welcome')
    const items = interpolationCount === 1
      ? t(store, 'items.one')
      : t(store, 'items.many', { count: interpolationCount })
    const deepKey = t(store, 'deep.nested.key')
    const home = t(store, 'home')
    const settings = t(store, 'settings')

    const greetingFallback = !hasKey(store, 'greeting', { locale: currentLocale })
    const deepKeyFallback = !hasKey(store, 'deep.nested.key', { locale: currentLocale })

    return (
      <div className="demo-grid">
        <div className="demo-card">
          <h3>问候语 (带插值)</h3>
          <div className="key-display">greeting, params: {'{ "name": "' + interpolationName + '" }'}</div>
          <div className="value-display" dir={direction}>{greeting}</div>
          {greetingFallback && (
            <div className="status-row">
              <span className="badge fail">回退至 fallbackLocale</span>
            </div>
          )}
        </div>

        <div className="demo-card">
          <h3>欢迎语</h3>
          <div className="key-display">welcome</div>
          <div className="value-display" dir={direction}>{welcome}</div>
        </div>

        <div className="demo-card">
          <h3>项目计数</h3>
          <div className="key-display">items.one / items.many</div>
          <div className="value-display" dir={direction}>{items}</div>
        </div>

        <div className="demo-card">
          <h3>深层嵌套键</h3>
          <div className="key-display">deep.nested.key</div>
          <div className="value-display" dir={direction}>{deepKey}</div>
          {deepKeyFallback && (
            <div className="status-row">
              <span className="badge fail">回退至 fallbackLocale</span>
            </div>
          )}
        </div>

        <div className="demo-card">
          <h3>导航键</h3>
          <div className="key-display">home, settings</div>
          <div className="value-display" dir={direction}>
            {home} / {settings}
          </div>
        </div>

        <div className="demo-card">
          <h3>命名空间语法</h3>
          <div className="key-display">common:greeting</div>
          <div className="value-display" dir={direction}>
            {t(store, 'common:greeting', { name: 'NS-Test' })}
          </div>
        </div>
      </div>
    )
  }

  const renderInterpolationTab = () => {
    return (
      <div className="tool-section">
        <h3 style={{ marginTop: 0 }}>插值测试</h3>
        <p style={{ color: 'var(--text-p)', marginBottom: '1.5rem' }}>
          使用 <code>{USED_INTERPOLATION_STYLE}</code> 风格的占位符
        </p>

        <div className="controls-row">
          <div className="control-group" style={{ minWidth: 300 }}>
            <label>测试键</label>
            <input
              type="text"
              value={testKey}
              onChange={handleTestKeyChange}
              placeholder="例如: greeting, errors.HTTP_404"
            />
          </div>
        </div>

        <div className="control-group" style={{ minWidth: '100%', marginBottom: '1.5rem' }}>
          <label>参数 (JSON)</label>
          <textarea
            value={testParams}
            onChange={handleTestParamsChange}
            rows={4}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              fontFamily: 'Monaco, Menlo, monospace',
              fontSize: '0.875rem',
            }}
          />
        </div>

        <div className="demo-card">
          <h3>翻译结果</h3>
          <div className="status-row">
            <span className={`badge ${testKeyExists ? 'pass' : 'fail'}`}>
              {testKeyExists ? '键存在' : '键不存在 (将返回原键)'}
            </span>
          </div>
          <div className="value-display" dir={direction} style={{ marginTop: '0.75rem' }}>
            {testTranslation}
          </div>
        </div>

        <div className="action-bar">
          <button
            className="primary-btn"
            onClick={() => handleCopy(testTranslation, '翻译结果')}
          >
            复制结果
          </button>
        </div>
      </div>
    )
  }

  const renderFormattersTab = () => {
    return (
      <div className="demo-grid">
        <div className="demo-card">
          <h3>日期格式化</h3>
          <div className="key-display">formatDate(today, '{currentLocale}')</div>
          <div className="value-display">{formattedDate}</div>
        </div>

        <div className="demo-card">
          <h3>数字格式化</h3>
          <div className="key-display">formatNumber(1234567.89, '{currentLocale}')</div>
          <div className="value-display">{formattedNumber}</div>
        </div>

        <div className="demo-card">
          <h3>货币格式化</h3>
          <div className="key-display">formatCurrency(99.99, '{currentLocale}', 'USD')</div>
          <div className="value-display">{formattedCurrency}</div>
        </div>
      </div>
    )
  }

  const renderValidationTab = () => {
    return (
      <div>
        <h3 style={{ marginTop: 0 }}>语言包校验测试</h3>
        <p style={{ color: 'var(--text-p)', marginBottom: '1.5rem' }}>
          点击下方按钮测试各种校验场景
        </p>

        <div className="action-bar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            className="secondary-btn"
            onClick={() => handleValidateBundle('missingKeys')}
          >
            缺少键
          </button>
          <button
            className="secondary-btn"
            onClick={() => handleValidateBundle('badInterpolation')}
          >
            坏插值
          </button>
          <button
            className="secondary-btn"
            onClick={() => handleValidateBundle('extraPlaceholder')}
          >
            多余占位符
          </button>
          <button
            className="danger-btn"
            onClick={() => handleValidateBundle('script')}
          >
            含 script
          </button>
          <button
            className="danger-btn"
            onClick={() => handleValidateBundle('circular')}
          >
            循环引用
          </button>
          <button
            className="danger-btn"
            onClick={() => handleValidateBundle('versionConflict')}
          >
            版本冲突
          </button>
          <button
            className="danger-btn"
            onClick={() => handleValidateBundle('badChecksum')}
          >
            校验和错误
          </button>
        </div>

        {validationResult && (
          <div className="demo-card">
            <h3>校验结果: {validationResult.description}</h3>
            <div className="badge-list">
              <span className={`badge ${validationResult.schema.valid ? 'pass' : 'fail'}`}>
                Schema: {validationResult.schema.valid ? '通过' : '失败'}
              </span>
              {validationResult.checksum && (
                <span className={`badge ${validationResult.checksum.valid ? 'pass' : 'fail'}`}>
                  Checksum: {validationResult.checksum.valid ? '通过' : '失败'}
                </span>
              )}
              {validationResult.version && (
                <span className={`badge ${validationResult.version.valid ? 'pass' : 'fail'}`}>
                  Version: {validationResult.version.valid ? '通过' : '失败'}
                </span>
              )}
            </div>
            {!validationResult.schema.valid && validationResult.schema.error && (
              <div className="error-display" style={{ marginTop: '1rem' }}>
                <div>
                  <strong>{validationResult.schema.error.errorCode}</strong>
                  <p>{validationResult.schema.error.errorMessage}</p>
                </div>
              </div>
            )}
            {validationResult.checksum && !validationResult.checksum.valid && validationResult.checksum.error && (
              <div className="error-display" style={{ marginTop: '1rem' }}>
                <div>
                  <strong>{validationResult.checksum.error.errorCode}</strong>
                  <p>{validationResult.checksum.error.errorMessage}</p>
                </div>
              </div>
            )}
            {validationResult.version && !validationResult.version.valid && validationResult.version.error && (
              <div className="error-display" style={{ marginTop: '1rem' }}>
                <div>
                  <strong>{validationResult.version.error.errorCode}</strong>
                  <p>{validationResult.version.error.errorMessage}</p>
                </div>
              </div>
            )}
            <div className="json-output">
              <pre>{safeStringify(BAD_BUNDLES[validationResult.bundleKey].data, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderErrorBridgeTab = () => {
    return (
      <div>
        <h3 style={{ marginTop: 0 }}>与任务 064 衔接</h3>
        <p style={{ color: 'var(--text-p)', marginBottom: '1.5rem' }}>
          演示如何在 <code>mapError</code> 后二次套用 i18n
        </p>

        <div className="action-bar" style={{ marginBottom: '1.5rem' }}>
          <button
            className="primary-btn"
            onClick={handleTestErrorBridge}
          >
            测试错误本地化
          </button>
        </div>

        {errorBridgeResult && (
          <div className="demo-grid">
            <div className="demo-card">
              <h3>原始错误映射 (模拟 064 输出)</h3>
              <div className="json-output">
                <pre>{safeStringify(errorBridgeResult.original, 2)}</pre>
              </div>
            </div>

            <div className="demo-card">
              <h3>本地化后错误</h3>
              <div className="json-output">
                <pre>{safeStringify(errorBridgeResult.localized, 2)}</pre>
              </div>
            </div>

            <div className="demo-card">
              <h3>本地化恢复提示</h3>
              <div className="json-output">
                <pre>{safeStringify(errorBridgeResult.localizedHints, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        <div className="demo-card" style={{ marginTop: '1.5rem' }}>
          <h3>SSR 同步子集测试</h3>
          <div className="action-bar" style={{ marginBottom: '1rem' }}>
            <button
              className="secondary-btn"
              onClick={() => {
                const ssrI18n = createSyncI18n(DEMO_BUNDLES, {
                  defaultLocale: currentLocale,
                })
                const ssrResult = {
                  greeting: ssrI18n.t('greeting', { name: 'SSR-User' }),
                  hasKey: ssrI18n.hasKey('greeting'),
                  locale: ssrI18n.getLocale(),
                }
                handleCopy(safeStringify(ssrResult, 2), 'SSR 测试结果')
              }}
            >
              测试 SSR 模式
            </button>
          </div>
          <p style={{ color: 'var(--text-p)', fontSize: '0.875rem' }}>
            SSR 模式导出同步 <code>t</code> 函数和 <code>preloadLocale</code> no-op
          </p>
        </div>
      </div>
    )
  }

  const renderChecksumDemo = () => {
    const sampleData = { greeting: 'Hello', welcome: 'Welcome' }
    const checksum = simpleChecksum(sampleData)
    const withChecksum = {
      ...sampleData,
      __meta__: { version: '1.0.0', checksum },
    }

    return (
      <div className="demo-card">
        <h3>校验和演示</h3>
        <div className="json-output">
          <pre>{safeStringify(withChecksum, 2)}</pre>
        </div>
        <div className="action-bar">
          <button
            className="secondary-btn"
            onClick={() => handleCopy(safeStringify(withChecksum, 2), '带校验和的语言包')}
          >
            复制语言包
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="i18n-kit-page" dir={direction}>
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <div className="theme-header">
          <h1>轻量 i18n 运行时</h1>
          <p className="theme-subtitle">
            命名空间分段、{'{{name}}'} 插值、回退链、懒加载、校验与 SSR 适配
          </p>
        </div>

        <div className="controls-row">
          <div className="control-group">
            <label>语言区域</label>
            <select value={currentLocale} onChange={handleLocaleChange}>
              <option value={DEMO_LOCALES.EN_US}>English (US)</option>
              <option value={DEMO_LOCALES.ZH_CN}>中文 (简体)</option>
              <option value={DEMO_LOCALES.FICTITIOUS}>虚构语言 (xx) - 测试回退</option>
            </select>
          </div>

          <div className="control-group">
            <label>文本方向</label>
            <span className={`direction-badge ${isRtl ? 'rtl' : 'ltr'}`}>
              {isRtl ? 'RTL (右到左)' : 'LTR (左到右)'}
            </span>
          </div>

          <div className="control-group">
            <label>名称 (插值测试)</label>
            <input
              type="text"
              value={interpolationName}
              onChange={(e) => setInterpolationName(e.target.value)}
            />
          </div>

          <div className="control-group">
            <label>项目数 (plural 模拟)</label>
            <input
              type="number"
              min="0"
              value={interpolationCount}
              onChange={(e) => setInterpolationCount(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
      </section>

      <section className="tool-section">
        <div className="section-tabs">
          <button
            className={`tab-btn ${activeTab === 'basics' ? 'active' : ''}`}
            onClick={() => setActiveTab('basics')}
          >
            基础演示
          </button>
          <button
            className={`tab-btn ${activeTab === 'interpolation' ? 'active' : ''}`}
            onClick={() => setActiveTab('interpolation')}
          >
            插值测试
          </button>
          <button
            className={`tab-btn ${activeTab === 'formatters' ? 'active' : ''}`}
            onClick={() => setActiveTab('formatters')}
          >
            格式化
          </button>
          <button
            className={`tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
          >
            校验测试
          </button>
          <button
            className={`tab-btn ${activeTab === 'bridge' ? 'active' : ''}`}
            onClick={() => setActiveTab('bridge')}
          >
            错误桥接
          </button>
        </div>

        {activeTab === 'basics' && renderBasicsTab()}
        {activeTab === 'interpolation' && renderInterpolationTab()}
        {activeTab === 'formatters' && renderFormattersTab()}
        {activeTab === 'validation' && renderValidationTab()}
        {activeTab === 'bridge' && renderErrorBridgeTab()}
      </section>

      <section className="tool-section">
        {renderChecksumDemo()}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>回退链：</strong>
            <code>{currentLocale}</code> → <code>en-US</code> → <code>key</code> 原样。
            切换到虚构语言 <code>xx</code> 可观察部分键回退效果。
          </li>
          <li>
            <strong>插值风格：</strong>
            固定使用 <code>{'{{name}}'}</code>，不支持 ICU plural。
            复数通过不同键（如 <code>items.one</code> / <code>items.many</code>）模拟。
          </li>
          <li>
            <strong>语言包 URL：</strong>
            <code>GET /locales/{'{locale}'}/{'{namespace}'}.json</code>。
            <code>Accept-Language</code> 不参与，应用显式传 <code>locale</code>。
          </li>
          <li>
            <strong>校验：</strong>
            非空键、无 <code>{'<script'}</code>、无循环引用；
            可选 <code>checksum</code> 校验和 <code>version</code> 版本冲突检测。
          </li>
          <li>
            <strong>格式化：</strong>
            <code>formatDate</code> / <code>formatNumber</code> 基于 <code>Intl</code>，
            不可用时降级为纯文本。
          </li>
          <li>
            <strong>与 064 衔接：</strong>
            <code>localizeMappedError</code> 组合函数在本目录内，
            不修改 <code>error-message-mapper</code> 文件。
          </li>
          <li>
            <strong>SSR：</strong>
            仅导出 <code>t</code> 同步子集与 <code>preloadLocale</code> no-op，
            通过 <code>createSyncI18n(bundles)</code> 创建实例。
          </li>
          <li>
            <strong>边界：</strong>
            RTL 检测与 <code>dir</code> 提示；超长键拒绝；
            循环引用 JSON 拒绝。
          </li>
        </ul>
      </div>
    </div>
  )
}
