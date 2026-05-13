import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    contrastRatio,
    extractHueFromColor,
    generateColorScale,
    hslToRgb,
    isValidColor,
    rgbToHex,
} from './logic/colorUtils.js'
import {
    DEFAULT_PRIMARY_HUE,
    DEFAULT_RADIUS,
    DOMAINS,
    STORAGE_KEY,
    THEMES,
} from './logic/constants.js'
import {
    buildThemeManifest,
    filterTokens,
    loadFromStorage,
    parseUrlParams,
    saveToStorage,
} from './logic/core.js'
import {
    generateDarkTokenSet,
    generateLightTokenSet,
    tokensToCSSVars,
} from './logic/tokens.js'
import './ThemeSystem.css'

const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'background', label: '背景色' },
  { value: 'surface', label: '表面色' },
  { value: 'border', label: '边框色' },
  { value: 'semantic', label: '语义色' },
  { value: 'spacing', label: '间距' },
  { value: 'radius', label: '圆角' },
  { value: 'typography', label: '字体' },
  { value: 'shadow', label: '阴影' },
  { value: 'motion', label: '动效' },
  { value: 'zIndex', label: 'Z-Index' },
]

const BRAND_PRESETS = [
  { name: '紫罗兰', hue: 260, color: '#6d4bd4' },
  { name: '珊瑚', hue: 14, color: '#f97316' },
  { name: '海洋', hue: 217, color: '#3b82f6' },
  { name: '自然', hue: 142, color: '#22c55e' },
  { name: '警告', hue: 38, color: '#f59e0b' },
  { name: '粉色', hue: 330, color: '#ec4899' },
]

function hueToHex(hue, saturation = 65, lightness = 57) {
  const rgb = hslToRgb(hue, saturation, lightness)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

function getInitialState() {
  if (typeof window === 'undefined') {
    return {
      themePreference: THEMES.SYSTEM,
      primaryHue: DEFAULT_PRIMARY_HUE,
      radiusBase: DEFAULT_RADIUS,
      urlErrors: [],
    }
  }
  
  const urlParams = parseUrlParams(new URLSearchParams(window.location.search))
  const stored = loadFromStorage(localStorage, STORAGE_KEY)
  
  let themePreference = THEMES.SYSTEM
  let primaryHue = DEFAULT_PRIMARY_HUE
  let radiusBase = DEFAULT_RADIUS
  
  if (stored) {
    if (stored.theme) themePreference = stored.theme
    if (typeof stored.primaryHue === 'number') primaryHue = stored.primaryHue
    if (typeof stored.radiusBase === 'number') radiusBase = stored.radiusBase
  }
  
  if (urlParams.theme && [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM].includes(urlParams.theme)) {
    themePreference = urlParams.theme
  }
  if (typeof urlParams.primaryHue === 'number') {
    primaryHue = urlParams.primaryHue
  }
  if (typeof urlParams.radiusBase === 'number') {
    radiusBase = urlParams.radiusBase
  }
  
  return {
    themePreference,
    primaryHue,
    radiusBase,
    urlErrors: urlParams.errors,
  }
}

export default function ThemeSystem() {
  const [activeTab, setActiveTab] = useState('palette')
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [copyStatus, setCopyStatus] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [showJson, setShowJson] = useState(false)
  const [initialState] = useState(getInitialState)
  const [themePreference, setThemePreference] = useState(initialState.themePreference)
  const [primaryHue, setPrimaryHue] = useState(initialState.primaryHue)
  const [radiusBase, setRadiusBase] = useState(initialState.radiusBase)
  const [urlErrors] = useState(initialState.urlErrors)
  
  const systemDark = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-color-scheme: dark)').matches 
    : false
  
  const appliedTheme = themePreference === THEMES.SYSTEM
    ? (systemDark ? THEMES.DARK : THEMES.LIGHT)
    : themePreference

  useEffect(() => {
    saveToStorage(localStorage, {
      theme: themePreference,
      primaryHue,
      radiusBase,
    }, STORAGE_KEY)
  }, [themePreference, primaryHue, radiusBase])

  const tokens = useMemo(() => {
    const isDark = appliedTheme === THEMES.DARK
    return isDark
      ? generateDarkTokenSet({ primaryHue, radiusBase })
      : generateLightTokenSet({ primaryHue, radiusBase })
  }, [appliedTheme, primaryHue, radiusBase])

  const filteredTokens = useMemo(() => {
    return filterTokens(tokens, {
      search: searchQuery,
      category: category === 'all' ? null : category,
    })
  }, [tokens, searchQuery, category])

  const semanticColors = useMemo(() => {
    const isDark = appliedTheme === THEMES.DARK
    const accentScale = generateColorScale(primaryHue, isDark)
    const successScale = generateColorScale(142, isDark)
    const warningScale = generateColorScale(38, isDark)
    const errorScale = generateColorScale(0, isDark)
    const infoScale = generateColorScale(217, isDark)

    const bgKey = tokens['-background-default']
    const textKey = tokens['-text-default']

    const checkContrast = (color, bg) => {
      const result = contrastRatio(color, bg)
      return result.success ? result : null
    }

    return {
      accent: { scale: accentScale, checkContrast },
      success: { scale: successScale, checkContrast },
      warning: { scale: warningScale, checkContrast },
      error: { scale: errorScale, checkContrast },
      info: { scale: infoScale, checkContrast },
      bg: bgKey,
      text: textKey,
    }
  }, [appliedTheme, tokens, primaryHue])

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

  const handlePrimaryColorChange = useCallback((e) => {
    const value = e.target.value
    if (isValidColor(value)) {
      const hue = extractHueFromColor(value)
      setPrimaryHue(hue)
    }
  }, [])

  const handleHueChange = useCallback((e) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setPrimaryHue(Math.min(Math.max(value, 0), 360))
    }
  }, [])

  const handleRadiusChange = useCallback((e) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value)) {
      setRadiusBase(Math.min(Math.max(value, 0), 9999))
    }
  }, [])

  const handleBrandPresetClick = useCallback((hue) => {
    setPrimaryHue(hue)
  }, [])

  const themeManifest = useMemo(() => {
    return buildThemeManifest({
      primaryHue,
      radiusBase,
    })
  }, [primaryHue, radiusBase])

  const cssVarsLight = useMemo(() => {
    const lightTokens = generateLightTokenSet({ primaryHue, radiusBase })
    return `:root {\n${tokensToCSSVars(lightTokens)}\n}`
  }, [primaryHue, radiusBase])

  const cssVarsDark = useMemo(() => {
    const darkTokens = generateDarkTokenSet({ primaryHue, radiusBase })
    return `[data-theme="dark"] {\n${tokensToCSSVars(darkTokens)}\n}`
  }, [primaryHue, radiusBase])

  const renderColorPalette = () => {
    const colors = semanticColors
    const types = ['accent', 'success', 'warning', 'error', 'info']

    return (
      <div className="color-palette-section">
        <div className="brand-demo">
          <div className="brand-demo-preview">
            {BRAND_PRESETS.map((preset) => (
              <div
                key={preset.name}
                className="brand-demo-item"
                onClick={() => handleBrandPresetClick(preset.hue)}
              >
                <div
                  className="brand-demo-color"
                  style={{ backgroundColor: preset.color }}
                />
                <span className="brand-demo-label">{preset.name}</span>
                <span className="brand-demo-value">{preset.color}</span>
              </div>
            ))}
          </div>
        </div>

        {types.map((type) => {
          const colorData = colors[type]
          const scale = colorData.scale
          const levels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

          const typeLabels = {
            accent: '主色',
            success: '成功',
            warning: '警告',
            error: '错误',
            info: '信息',
          }

          return (
            <div key={type} style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.9375rem', margin: '0 0 1rem', color: 'var(--text-h)' }}>
                {typeLabels[type]}色阶
              </h3>
              <div className="color-palette">
                {levels.map((level) => {
                  const color = scale[level]
                  const contrastOnBg = colorData.checkContrast(color, colors.bg)

                  return (
                    <div key={level} className="color-swatch" onClick={() => handleCopy(color, '颜色值')}>
                      <div
                        className="color-swatch-preview"
                        style={{ backgroundColor: color }}
                      >
                        {contrastOnBg && (
                          <span className={`color-swatch-contrast ${contrastOnBg.aa ? 'pass' : 'fail'}`}>
                            {contrastOnBg.ratio}
                          </span>
                        )}
                      </div>
                      <div className="color-swatch-info">
                        <span className="color-swatch-name">{type}-{level}</span>
                        <span className="color-swatch-value">{color}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="demo-cards">
          <div className="demo-card success">
            <h3>操作成功</h3>
            <p>这是一个成功状态的示例卡片，展示了语义色在界面中的实际应用效果。</p>
          </div>
          <div className="demo-card warning">
            <h3>注意事项</h3>
            <p>这是一个警告状态的示例卡片，提醒用户需要注意的信息。</p>
          </div>
          <div className="demo-card error">
            <h3>出错了</h3>
            <p>这是一个错误状态的示例卡片，显示操作失败或需要纠正。</p>
          </div>
          <div className="demo-card info">
            <h3>提示信息</h3>
            <p>这是一个信息状态的示例卡片，提供一般性的提示内容。</p>
          </div>
        </div>
      </div>
    )
  }

  const renderTokens = () => {
    const tokenEntries = Object.entries(filteredTokens)

    if (tokenEntries.length === 0) {
      return <div className="no-results">未找到匹配的令牌</div>
    }

    return (
      <div className="tokens-section">
        <div className="search-row">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="搜索令牌..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="category-filter">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tokens-grid">
          {tokenEntries.map(([key, value]) => (
            <div
              key={key}
              className="token-card"
              onClick={() => handleCopy(value, key)}
            >
              <span className="token-name">{key}</span>
              <span className="token-value">{value}</span>
              {value.startsWith('#') || value.startsWith('rgb') ? (
                <div
                  className="token-preview"
                  style={{ backgroundColor: value }}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="action-bar">
          <button
            className="primary-btn"
            onClick={() => handleCopy(showJson ? JSON.stringify(themeManifest, null, 2) : cssVarsLight, showJson ? '主题 JSON' : 'CSS 变量')}
          >
            复制 {showJson ? '主题 JSON' : 'CSS 变量'}
          </button>
          <button
            className="secondary-btn"
            onClick={() => handleCopy(cssVarsDark, '暗色 CSS 变量')}
          >
            复制暗色 CSS
          </button>
          <button
            className="secondary-btn"
            onClick={() => setShowJson(!showJson)}
          >
            {showJson ? '查看 CSS' : '查看 JSON'}
          </button>
        </div>

        {showJson ? (
          <div className="json-output">
            <pre>{JSON.stringify(themeManifest, null, 2)}</pre>
          </div>
        ) : (
          <div className="json-output">
            <pre>{cssVarsLight}</pre>
            <pre style={{ marginTop: '1rem' }}>{cssVarsDark}</pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="theme-system-page">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <div className="theme-header">
          <h1>主题系统</h1>
          <p className="theme-subtitle">设计令牌体系演示页 - 亮色/暗色/系统三态切换</p>
        </div>

        <div className="controls-row">
          <div className="control-group">
            <label>主题模式</label>
            <div className="theme-switch">
              <button
                className={`theme-btn ${themePreference === THEMES.LIGHT ? 'active' : ''}`}
                onClick={() => setThemePreference(THEMES.LIGHT)}
              >
                亮色
              </button>
              <button
                className={`theme-btn ${themePreference === THEMES.DARK ? 'active' : ''}`}
                onClick={() => setThemePreference(THEMES.DARK)}
              >
                暗色
              </button>
              <button
                className={`theme-btn ${themePreference === THEMES.SYSTEM ? 'active' : ''}`}
                onClick={() => setThemePreference(THEMES.SYSTEM)}
              >
                跟随系统
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>主色调</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={hueToHex(primaryHue)}
                onChange={handlePrimaryColorChange}
                title="选择主色"
              />
              <input
                type="number"
                min="0"
                max="360"
                value={primaryHue}
                onChange={handleHueChange}
                title="Hue (0-360)"
              />
            </div>
          </div>

          <div className="control-group">
            <label>基础圆角 (px)</label>
            <input
              type="number"
              min="0"
              max="9999"
              value={radiusBase}
              onChange={handleRadiusChange}
            />
          </div>

          <div className="control-group">
            <label>域</label>
            <select
              value={selectedDomain || ''}
              onChange={(e) => setSelectedDomain(e.target.value || null)}
            >
              <option value="">全局</option>
              <option value={DOMAINS.SHELL}>Shell</option>
              <option value={DOMAINS.TOOL}>Tool</option>
              <option value={DOMAINS.CODE}>Code</option>
            </select>
          </div>
        </div>

        {urlErrors.length > 0 && (
          <div className="error-display">
            {urlErrors.map((err, idx) => (
              <div key={idx}>
                <strong>{err.errorCode}</strong>
                <p>{err.errorMessage}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="tool-section">
        <div className="section-tabs">
          <button
            className={`tab-btn ${activeTab === 'palette' ? 'active' : ''}`}
            onClick={() => setActiveTab('palette')}
          >
            色板
          </button>
          <button
            className={`tab-btn ${activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => setActiveTab('tokens')}
          >
            令牌
          </button>
        </div>

        {activeTab === 'palette' ? renderColorPalette() : renderTokens()}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>主题切换策略：</strong>
            读取顺序为 URL 参数覆盖 → <code>localStorage</code> → <code>matchMedia</code>。
            页面加载前通过内联 critical 片段设置 <code>data-theme</code> 避免 FOUC。
          </li>
          <li>
            <strong>URL 参数：</strong>
            支持 <code>?theme=light|dark|system</code>、
            <code>?primary=%23ff0000</code>、
            <code>?radius=12</code>。
            仅会话有效，刷新后从存储恢复。
          </li>
          <li>
            <strong>对比度检查：</strong>
            使用 WCAG 相对亮度公式。
            色卡角落显示与背景色的对比度比值。
            绿色表示通过 AA 标准。
          </li>
          <li>
            <strong>HSL 衍生色阶：</strong>
            通过调整明度 (L) 生成 11 个色阶。
            饱和度固定，不保证医疗级色觉无障碍。
          </li>
          <li>
            <strong>边界情况：</strong>
            <code>forced-colors</code> 高对比度模式下减少阴影、增强边框。
            打印时隐藏装饰阴影。
          </li>
          <li>
            <strong>域前缀：</strong>
            支持 <code>shell-</code>、<code>tool-</code>、<code>code-</code> 前缀化令牌，
            避免工具页污染全局样式。
          </li>
        </ul>
      </div>
    </div>
  )
}
