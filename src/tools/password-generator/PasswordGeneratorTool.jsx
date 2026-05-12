import { useCallback, useState } from 'react'
import {
  generatePasswords,
  CHARACTER_CLASSES,
  CHARACTER_CLASS_LABELS,
  PRESET_RULES,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_BATCH_COUNT,
  MAX_BATCH_COUNT,
  MAX_TOTAL_OUTPUT_LENGTH,
} from './logic/index.js'
import './PasswordGeneratorTool.css'

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

function getStrengthClass(strength) {
  switch (strength) {
    case '极强':
      return 'strength-very-strong'
    case '强':
      return 'strength-strong'
    case '中等':
      return 'strength-medium'
    case '弱':
      return 'strength-weak'
    case '极弱':
    default:
      return 'strength-very-weak'
  }
}

export default function PasswordGeneratorTool() {
  const [minLength, setMinLength] = useState(16)
  const [maxLength, setMaxLength] = useState(20)
  const [requiredClasses, setRequiredClasses] = useState([
    CHARACTER_CLASSES.UPPERCASE,
    CHARACTER_CLASSES.LOWERCASE,
    CHARACTER_CLASSES.DIGITS,
    CHARACTER_CLASSES.SYMBOLS,
  ])
  const [optionalClasses, setOptionalClasses] = useState([])
  const [excludeConfusing, setExcludeConfusing] = useState(true)
  const [customExclusionsInput, setCustomExclusionsInput] = useState('')
  const [batchCount, setBatchCount] = useState(5)
  const [generatedPasswords, setGeneratedPasswords] = useState(null)
  const [error, setError] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [activePreset, setActivePreset] = useState(null)

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

  const handleCopyAll = useCallback(() => {
    if (!generatedPasswords || generatedPasswords.length === 0) return
    const allPasswords = generatedPasswords.map(p => p.password).join('\n')
    handleCopy(allPasswords, '全部密码')
  }, [generatedPasswords, handleCopy])

  const handleGenerate = useCallback(() => {
    setError(null)

    const customExclusions = customExclusionsInput
      .split(/[,，\s]+/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim())

    const result = generatePasswords({
      minLength,
      maxLength,
      requiredClasses,
      optionalClasses,
      excludeConfusing,
      customExclusions,
      batchCount,
    })

    if (!result.success) {
      setError({
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        suggestions: result.suggestions || [],
      })
      setGeneratedPasswords(null)
      return
    }

    setGeneratedPasswords(result.passwords)
  }, [
    minLength,
    maxLength,
    requiredClasses,
    optionalClasses,
    excludeConfusing,
    customExclusionsInput,
    batchCount,
  ])

  const handleRefresh = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])

  const handleLoadPreset = useCallback((presetKey, preset) => {
    setActivePreset(presetKey)
    setMinLength(preset.minLength)
    setMaxLength(preset.maxLength)
    setRequiredClasses([...preset.requiredClasses])
    setOptionalClasses([...preset.optionalClasses])
    setExcludeConfusing(preset.excludeConfusing)
    setCustomExclusionsInput(preset.customExclusions.join(', '))
    setError(null)
    setGeneratedPasswords(null)
  }, [])

  const handleClear = useCallback(() => {
    setGeneratedPasswords(null)
    setError(null)
  }, [])

  const toggleRequiredClass = useCallback((cls) => {
    setRequiredClasses(prev => {
      if (prev.includes(cls)) {
        return prev.filter(c => c !== cls)
      }
      return [...prev, cls]
    })
  }, [])

  const toggleOptionalClass = useCallback((cls) => {
    setOptionalClasses(prev => {
      if (prev.includes(cls)) {
        return prev.filter(c => c !== cls)
      }
      return [...prev, cls]
    })
  }, [])

  const renderErrorBox = () => {
    if (!error) return null
    return (
      <div className="error-box">
        <strong>生成失败</strong>
        <p>{error.errorMessage}</p>
        {error.suggestions && error.suggestions.length > 0 && (
          <ul className="suggestions-list">
            {error.suggestions.map((suggestion, idx) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
        )}
        <div className="error-code">错误码：{error.errorCode}</div>
      </div>
    )
  }

  const renderPasswordList = () => {
    if (!generatedPasswords || generatedPasswords.length === 0) return null

    return (
      <div className="passwords-section">
        <div className="section-header">
          <h3>生成结果</h3>
          <div className="action-buttons">
            <button
              className="secondary-btn small"
              onClick={handleRefresh}
            >
              刷新
            </button>
            <button
              className="secondary-btn small"
              onClick={handleCopyAll}
            >
              复制全部
            </button>
          </div>
        </div>

        <div className="passwords-list">
          {generatedPasswords.map((item, idx) => (
            <div key={idx} className="password-item">
              <div className="password-header">
                <span className="password-index">#{idx + 1}</span>
                <div className="password-meta">
                  <span className={`strength-badge ${getStrengthClass(item.strength)}`}>
                    {item.strength}
                  </span>
                  <span className="entropy-badge">熵：{item.entropy} bits</span>
                  <span className="length-badge">{item.length} 位</span>
                </div>
                <button
                  className="copy-btn small"
                  onClick={() => handleCopy(item.password, `密码 #${idx + 1}`)}
                >
                  复制
                </button>
              </div>
              <pre
                className="password-value"
                dangerouslySetInnerHTML={{ __html: escapeHtml(item.password) }}
              />
              <div className="password-classes">
                使用字符类：{item.usedClasses.map(c => CHARACTER_CLASS_LABELS[c]).join('、')}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="password-generator-tool">
      {copyStatus && (
        <div className={`tool-toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>规则设置</h2>

        <div className="presets-section">
          <h3>快速预设</h3>
          <div className="presets-grid">
            {Object.entries(PRESET_RULES).map(([key, preset]) => (
              <button
                key={key}
                className={`preset-btn ${activePreset === key ? 'active' : ''}`}
                onClick={() => handleLoadPreset(key, preset)}
                title={preset.description}
              >
                <span className="preset-name">{preset.name}</span>
                <span className="preset-desc">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="length-section">
          <h3>长度设置</h3>
          <div className="length-inputs">
            <div className="form-group">
              <label htmlFor="min-length">最小长度</label>
              <input
                id="min-length"
                type="number"
                min={MIN_PASSWORD_LENGTH}
                max={MAX_PASSWORD_LENGTH}
                value={minLength}
                onChange={(e) => setMinLength(Math.max(MIN_PASSWORD_LENGTH, Math.min(MAX_PASSWORD_LENGTH, parseInt(e.target.value) || MIN_PASSWORD_LENGTH)))}
              />
            </div>
            <div className="length-separator">-</div>
            <div className="form-group">
              <label htmlFor="max-length">最大长度</label>
              <input
                id="max-length"
                type="number"
                min={MIN_PASSWORD_LENGTH}
                max={MAX_PASSWORD_LENGTH}
                value={maxLength}
                onChange={(e) => setMaxLength(Math.max(MIN_PASSWORD_LENGTH, Math.min(MAX_PASSWORD_LENGTH, parseInt(e.target.value) || MAX_PASSWORD_LENGTH)))}
              />
            </div>
          </div>
          <div className="length-hint">
            允许范围：{MIN_PASSWORD_LENGTH}-{MAX_PASSWORD_LENGTH} 位
          </div>
        </div>

        <div className="character-classes-section">
          <h3>字符类设置</h3>
          <div className="character-classes-container">
            <div className="character-classes-row">
              <span className="class-type-label">必选：</span>
              <div className="class-checkboxes">
                {Object.entries(CHARACTER_CLASS_LABELS).map(([key, label]) => (
                  <label key={key} className="class-checkbox">
                    <input
                      type="checkbox"
                      checked={requiredClasses.includes(key)}
                      onChange={() => toggleRequiredClass(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="character-classes-row">
              <span className="class-type-label">可选：</span>
              <div className="class-checkboxes">
                {Object.entries(CHARACTER_CLASS_LABELS).map(([key, label]) => (
                  <label key={key} className="class-checkbox">
                    <input
                      type="checkbox"
                      checked={optionalClasses.includes(key)}
                      disabled={requiredClasses.includes(key)}
                      onChange={() => toggleOptionalClass(key)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <span className="optional-hint">（可能包含，也可能不包含）</span>
            </div>
          </div>
        </div>

        <div className="advanced-section">
          <h3>高级设置</h3>
          <div className="advanced-options">
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={excludeConfusing}
                onChange={(e) => setExcludeConfusing(e.target.checked)}
              />
              <span>排除易混淆字符（0、O、1、l、I 等）</span>
            </label>

            <div className="form-group full-width">
              <label htmlFor="custom-exclusions">排除自定义字符/子串（逗号或空格分隔）</label>
              <input
                id="custom-exclusions"
                type="text"
                value={customExclusionsInput}
                onChange={(e) => setCustomExclusionsInput(e.target.value)}
                placeholder="例如：@, #, test, 123"
              />
            </div>
          </div>
        </div>

        <div className="batch-section">
          <h3>批量生成</h3>
          <div className="batch-input">
            <div className="form-group">
              <label htmlFor="batch-count">生成数量</label>
              <input
                id="batch-count"
                type="number"
                min={MIN_BATCH_COUNT}
                max={MAX_BATCH_COUNT}
                value={batchCount}
                onChange={(e) => setBatchCount(Math.max(MIN_BATCH_COUNT, Math.min(MAX_BATCH_COUNT, parseInt(e.target.value) || MIN_BATCH_COUNT)))}
              />
            </div>
            <div className="batch-hint">
              允许范围：{MIN_BATCH_COUNT}-{MAX_BATCH_COUNT} 条，总输出不超过 {MAX_TOTAL_OUTPUT_LENGTH} 字符
            </div>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleGenerate}
          >
            生成密码
          </button>
          {generatedPasswords && (
            <button
              className="secondary-btn"
              onClick={handleClear}
            >
              清除结果
            </button>
          )}
        </div>
      </section>

      {renderErrorBox()}
      {renderPasswordList()}

      <div className="notes-section">
        <h3>强度与熵说明</h3>
        <ul>
          <li>
            <strong>熵（Entropy）：</strong>衡量密码随机性的指标，单位为 bits。
            熵值越高，密码越难被暴力破解。
            计算公式：<code>熵 = 长度 × log₂(字符集大小)</code>
          </li>
          <li>
            <strong>强度等级：</strong>
            <span className="strength-demo strength-very-weak">极弱</span>（熵 &lt; 40 bits）、
            <span className="strength-demo strength-weak">弱</span>（40-63 bits）、
            <span className="strength-demo strength-medium">中等</span>（64-95 bits）、
            <span className="strength-demo strength-strong">强</span>（96-127 bits）、
            <span className="strength-demo strength-very-strong">极强</span>（≥ 128 bits）
          </li>
          <li>
            <strong>安全建议：</strong>对于高安全场景，建议使用 16 位以上、包含 4 种字符类的密码（熵 ≥ 100 bits）。
          </li>
          <li>
            <strong>随机源：</strong>使用浏览器原生 <code>crypto.getRandomValues()</code> 生成密码学安全的随机数。
          </li>
          <li>
            <strong>纯前端实现：</strong>所有操作均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
        </ul>
      </div>
    </div>
  )
}
