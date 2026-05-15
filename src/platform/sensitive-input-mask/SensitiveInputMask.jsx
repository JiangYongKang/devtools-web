import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  analyzePassword,
  createClipboardWrapper,
  createConfirmableClipboard,
  createMetadata,
  createPasteAnimationHelper,
  createProtectedStorage,
  createSensitiveInputState,
  createUserGestureToken,
  DEFAULT_REVEAL_DURATION_SECONDS,
  isSensitiveKey,
  PASSWORD_STRENGTH_LABELS,
  REVEAL_STRATEGIES,
} from './logic/index.js'
import './SensitiveInputMask.css'

function EyeIcon({ revealed }) {
  if (revealed) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function StrengthIndicator({ analysis }) {
  const score = analysis?.strength?.score ?? -1
  const level = analysis?.strength?.level

  return (
    <div className="field-hint strength">
      <div className="strength-bar">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`strength-segment ${i <= score ? `active-${Math.min(score, 3)}` : ''}`}
          />
        ))}
      </div>
      {level && (
        <span className={`strength-label ${level}`}>
          {PASSWORD_STRENGTH_LABELS[level]}
        </span>
      )}
    </div>
  )
}

function MetadataDisplay({ metadata }) {
  if (!metadata || metadata.length === 0) {
    return null
  }

  return (
    <div className="metadata-card">
      <h4>元数据（仅长度与熵，不存原文）</h4>
      <div className="metadata-grid">
        <div className="metadata-item">
          <span className="metadata-label">长度</span>
          <span className="metadata-value">{metadata.length}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">原始熵 (bits)</span>
          <span className="metadata-value">{metadata.rawEntropy.toFixed(1)}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">调整后熵 (bits)</span>
          <span className="metadata-value">{metadata.adjustedEntropy.toFixed(1)}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">强度评分</span>
          <span className="metadata-value">{metadata.strengthScore}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">包含小写</span>
          <span className="metadata-value">{metadata.hasLowercase ? '是' : '否'}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">包含大写</span>
          <span className="metadata-value">{metadata.hasUppercase ? '是' : '否'}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">包含数字</span>
          <span className="metadata-value">{metadata.hasDigit ? '是' : '否'}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">包含符号</span>
          <span className="metadata-value">{metadata.hasSymbol ? '是' : '否'}</span>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-modal" role="dialog" aria-modal="true">
      <div className="confirm-modal-content">
        <h3>确认复制</h3>
        <p>{message}</p>
        <div className="confirm-modal-actions">
          <button className="secondary-btn" onClick={onCancel}>
            取消
          </button>
          <button className="primary-btn" onClick={onConfirm}>
            确认复制
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SensitiveInputMask() {
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [revealed, setRevealed] = useState({
    password: false,
    token: false,
    recoveryCode: false,
  })
  const [pasteAnimating, setPasteAnimating] = useState({
    password: false,
    token: false,
    recoveryCode: false,
  })
  const [strategy, setStrategy] = useState(REVEAL_STRATEGIES.CLICK)
  const [revealDuration, setRevealDuration] = useState(DEFAULT_REVEAL_DURATION_SECONDS)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingCopyValue, setPendingCopyValue] = useState(null)
  const [toast, setToast] = useState(null)
  const [storageKey, setStorageKey] = useState('myPassword')
  const [storageValue, setStorageValue] = useState('secret123')
  const [storageResult, setStorageResult] = useState(null)
  const [clipboardTestValue, setClipboardTestValue] = useState('test-token-12345-abcde')
  const [clipboardMaxLength, setClipboardMaxLength] = useState(20)
  const [showBanner, setShowBanner] = useState(true)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const [focusedField, setFocusedField] = useState(null)

  const inputStates = useRef({
    password: null,
    token: null,
    recoveryCode: null,
  })

  const timers = useRef({
    password: null,
    token: null,
    recoveryCode: null,
  })

  const pasteHelpers = useRef({
    password: createPasteAnimationHelper(),
    token: createPasteAnimationHelper(),
    recoveryCode: createPasteAnimationHelper(),
  })

  const showToast = useCallback((type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    for (const field of ['password', 'token', 'recoveryCode']) {
      inputStates.current[field] = createSensitiveInputState({
        strategy,
        revealDurationSeconds: revealDuration,
        onChange: (event) => {
          if (event.type === 'mask') {
            setRevealed((prev) => ({ ...prev, [field]: false }))
          }
        },
      })
      inputStates.current[field].attach()
    }

    return () => {
      for (const field of ['password', 'token', 'recoveryCode']) {
        inputStates.current[field]?.detach()
        if (timers.current[field]) {
          clearTimeout(timers.current[field])
        }
      }
    }
  }, [strategy, revealDuration])

  useEffect(() => {
    if (!shortcutsEnabled) return

    const handleKeyDown = (e) => {
      if (!focusedField) return

      const key = e.key?.toUpperCase?.()
      if (key !== 'L') return

      const hasModifier = (e.ctrlKey || e.metaKey) && e.shiftKey
      if (hasModifier) {
        e.preventDefault()
        toggleReveal(focusedField)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcutsEnabled, focusedField])

  const toggleReveal = useCallback((field) => {
    if (strategy === REVEAL_STRATEGIES.DISABLED) return

    if (timers.current[field]) {
      clearTimeout(timers.current[field])
      timers.current[field] = null
    }

    const currentlyRevealed = revealed[field]
    const newValue = !currentlyRevealed

    setRevealed((prev) => ({ ...prev, [field]: newValue }))

    if (newValue) {
      timers.current[field] = setTimeout(() => {
        setRevealed((prev) => ({ ...prev, [field]: false }))
        timers.current[field] = null
      }, revealDuration * 1000)
    }
  }, [revealed, strategy, revealDuration])

  const handleHoldStart = useCallback((field) => {
    if (strategy !== REVEAL_STRATEGIES.HOLD) return
    setRevealed((prev) => ({ ...prev, [field]: true }))
  }, [strategy])

  const handleHoldEnd = useCallback((field) => {
    if (strategy !== REVEAL_STRATEGIES.HOLD) return
    if (timers.current[field]) {
      clearTimeout(timers.current[field])
    }
    setRevealed((prev) => ({ ...prev, [field]: false }))
  }, [strategy])

  const handleFieldClick = useCallback((field) => {
    if (strategy === REVEAL_STRATEGIES.CLICK) {
      toggleReveal(field)
    } else if (strategy === REVEAL_STRATEGIES.DOUBLE_CLICK) {
    }
  }, [strategy, toggleReveal])

  const handleFieldDoubleClick = useCallback((field) => {
    if (strategy === REVEAL_STRATEGIES.DOUBLE_CLICK) {
      toggleReveal(field)
    }
  }, [strategy, toggleReveal])

  const handlePaste = useCallback((field, e) => {
    const pastedText = e.clipboardData?.getData('text') || ''

    if (field === 'password') setPassword(pastedText)
    else if (field === 'token') setToken(pastedText)
    else if (field === 'recoveryCode') setRecoveryCode(pastedText)

    setPasteAnimating((prev) => ({ ...prev, [field]: true }))
    pasteHelpers.current[field].start(() => {
      setPasteAnimating((prev) => ({ ...prev, [field]: false }))
    })

    showToast('success', '粘贴成功，已遮罩')
  }, [showToast])

  const handleCopy = useCallback((field, value) => {
    if (!value) {
      showToast('error', '没有可复制的内容')
      return
    }

    setPendingCopyValue(value)
    setShowConfirmModal(true)
  }, [showToast])

  const confirmCopy = useCallback(async () => {
    setShowConfirmModal(false)

    try {
      const gestureToken = createUserGestureToken()
      const wrapper = createClipboardWrapper({ maxLength: 4096 })

      const sanitizeResult = wrapper.sanitize(pendingCopyValue)

      if (sanitizeResult.wasTruncated) {
        showToast('warning', `内容过长，已截断到 ${sanitizeResult.finalLength} 字符`)
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sanitizeResult.sanitized)
        showToast('success', '已复制到剪贴板')
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = sanitizeResult.sanitized
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        showToast('success', '已复制到剪贴板（降级方式）')
      }
    } catch (err) {
      showToast('error', `复制失败: ${err.message}`)
    }

    setPendingCopyValue(null)
  }, [pendingCopyValue, showToast])

  const cancelCopy = useCallback(() => {
    setShowConfirmModal(false)
    setPendingCopyValue(null)
  }, [])

  const testStorageWrite = useCallback(() => {
    class MemoryStorage {
      constructor() { this.map = new Map() }
      setItem(k, v) { this.map.set(k, v) }
      getItem(k) { return this.map.get(k) ?? null }
      removeItem(k) { this.map.delete(k) }
      clear() { this.map.clear() }
      key(i) { return Array.from(this.map.keys())[i] ?? null }
      get length() { return this.map.size }
    }

    const memoryStorage = new MemoryStorage()
    const protectedStorage = createProtectedStorage(memoryStorage, { errorOnReject: false })

    const isSensitive = isSensitiveKey(storageKey)

    try {
      protectedStorage.setItem(storageKey, storageValue)

      if (isSensitive) {
        const actualValue = memoryStorage.getItem(storageKey)
        if (actualValue === null) {
          setStorageResult({ type: 'success', message: `✓ 敏感键 "${storageKey}" 写入已被拒绝` })
        } else {
          setStorageResult({ type: 'success', message: `写入成功（键名未被识别为敏感）` })
        }
      } else {
        setStorageResult({ type: 'success', message: `✓ 非敏感键 "${storageKey}" 写入成功` })
      }
    } catch (err) {
      setStorageResult({ type: 'error', message: `✗ 拒绝: ${err.errorCode} - ${err.errorMessage}` })
    }
  }, [storageKey, storageValue])

  const testClipboardSanitize = useCallback(() => {
    const wrapper = createClipboardWrapper({ maxLength: clipboardMaxLength })
    const result = wrapper.sanitize(clipboardTestValue)

    if (result.wasTruncated) {
      showToast('success', `已截断: ${result.originalLength} → ${result.finalLength} 字符`)
    } else if (result.wasEmpty) {
      showToast('error', '值为空')
    } else {
      showToast('success', `无需截断: ${result.finalLength} 字符`)
    }
  }, [clipboardTestValue, clipboardMaxLength, showToast])

  const passwordAnalysis = useMemo(() => analyzePassword(password), [password])
  const tokenAnalysis = useMemo(() => analyzePassword(token), [token])
  const recoveryAnalysis = useMemo(() => analyzePassword(recoveryCode), [recoveryCode])

  const passwordMetadata = useMemo(() => createMetadata(password), [password])
  const tokenMetadata = useMemo(() => createMetadata(token), [token])
  const recoveryMetadata = useMemo(() => createMetadata(recoveryCode), [recoveryCode])

  const strategyOptions = [
    { value: REVEAL_STRATEGIES.CLICK, label: '单击切换' },
    { value: REVEAL_STRATEGIES.HOLD, label: '按住显示' },
    { value: REVEAL_STRATEGIES.DOUBLE_CLICK, label: '双击切换' },
    { value: REVEAL_STRATEGIES.DISABLED, label: '禁用' },
  ]

  return (
    <div className="sensitive-input-mask-page">
      <div className="live-region" aria-live="polite" aria-atomic="true">
        {focusedField && revealed[focusedField] ? '内容已显示' : '内容已遮罩'}
      </div>

      {showBanner && (
        <div className="banner banner-warning">
          <span className="banner-icon">⚠️</span>
          <div className="banner-content">
            <strong>屏幕录制风险提示</strong>
            <small>
              正在进行屏幕录制时，请注意不要显示敏感内容。
              按 <code>Ctrl+Shift+L</code> 可在聚焦字段时快速切换遮罩。
            </small>
          </div>
          <button
            className="secondary-btn"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            onClick={() => setShowBanner(false)}
          >
            关闭
          </button>
        </div>
      )}

      <section className="tool-section">
        <div className="section-header">
          <h1>敏感输入遮罩</h1>
          <p>密码/令牌/恢复码的安全输入与显示控制</p>
        </div>

        <div className="config-row" style={{ marginBottom: '1.5rem' }}>
          <div className="config-row">
            <span className="config-label">显示策略：</span>
            <div className="strategy-selector">
              {strategyOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`strategy-btn ${strategy === opt.value ? 'active' : ''}`}
                  onClick={() => setStrategy(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="config-row">
            <span className="config-label">自动恢复时间：</span>
            <input
              type="number"
              className="config-input"
              min="3"
              max="15"
              value={revealDuration}
              onChange={(e) => setRevealDuration(Math.max(3, Math.min(15, parseInt(e.target.value) || 5)))}
            />
            <span className="config-label">秒</span>
          </div>

          <label className="checkbox-group">
            <input
              type="checkbox"
              checked={shortcutsEnabled}
              onChange={(e) => setShortcutsEnabled(e.target.checked)}
            />
            启用快捷键
          </label>
        </div>
      </section>

      <section className="tool-section">
        <div className="section-header">
          <h2>多字段表单</h2>
          <p>密码、API 令牌、恢复码的遮罩输入演示</p>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="password-input">账户密码</label>
            <div className="input-wrapper">
              <input
                id="password-input"
                type={revealed.password ? 'text' : 'password'}
                value={password}
                className={`${revealed.password ? 'revealed' : ''} ${pasteAnimating.password ? 'paste-animation' : ''}`}
                placeholder="输入密码..."
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onPaste={(e) => handlePaste('password', e)}
                autoComplete="current-password"
                aria-describedby="password-hint"
              />
              <button
                className={`reveal-btn ${revealed.password ? 'active' : ''}`}
                onClick={() => handleFieldClick('password')}
                onMouseDown={() => handleHoldStart('password')}
                onMouseUp={() => handleHoldEnd('password')}
                onMouseLeave={() => handleHoldEnd('password')}
                onTouchStart={() => handleHoldStart('password')}
                onTouchEnd={() => handleHoldEnd('password')}
                onDoubleClick={() => handleFieldDoubleClick('password')}
                aria-pressed={revealed.password}
                aria-label={revealed.password ? '遮罩内容' : '显示内容'}
                disabled={strategy === REVEAL_STRATEGIES.DISABLED}
              >
                <EyeIcon revealed={revealed.password} />
              </button>
            </div>
            <StrengthIndicator analysis={passwordAnalysis} />
            {password && <MetadataDisplay metadata={passwordMetadata} />}
          </div>

          <div className="field-group">
            <label htmlFor="token-input">API 令牌</label>
            <div className="input-wrapper">
              <input
                id="token-input"
                type={revealed.token ? 'text' : 'password'}
                value={token}
                className={`${revealed.token ? 'revealed' : ''} ${pasteAnimating.token ? 'paste-animation' : ''}`}
                placeholder="sk_xxx 或 ghp_xxx..."
                onChange={(e) => setToken(e.target.value)}
                onFocus={() => setFocusedField('token')}
                onBlur={() => setFocusedField(null)}
                onPaste={(e) => handlePaste('token', e)}
                autoComplete="off"
                aria-describedby="token-hint"
              />
              <button
                className={`reveal-btn ${revealed.token ? 'active' : ''}`}
                onClick={() => handleFieldClick('token')}
                onMouseDown={() => handleHoldStart('token')}
                onMouseUp={() => handleHoldEnd('token')}
                onMouseLeave={() => handleHoldEnd('token')}
                onTouchStart={() => handleHoldStart('token')}
                onTouchEnd={() => handleHoldEnd('token')}
                onDoubleClick={() => handleFieldDoubleClick('token')}
                aria-pressed={revealed.token}
                aria-label={revealed.token ? '遮罩内容' : '显示内容'}
                disabled={strategy === REVEAL_STRATEGIES.DISABLED}
              >
                <EyeIcon revealed={revealed.token} />
              </button>
            </div>
            <StrengthIndicator analysis={tokenAnalysis} />
            {token && <MetadataDisplay metadata={tokenMetadata} />}
          </div>

          <div className="field-group">
            <label htmlFor="recovery-input">恢复码 (空格分隔)</label>
            <div className="input-wrapper">
              <input
                id="recovery-input"
                type={revealed.recoveryCode ? 'text' : 'password'}
                value={recoveryCode}
                className={`${revealed.recoveryCode ? 'revealed' : ''} ${pasteAnimating.recoveryCode ? 'paste-animation' : ''}`}
                placeholder="word1 word2 word3..."
                onChange={(e) => setRecoveryCode(e.target.value)}
                onFocus={() => setFocusedField('recoveryCode')}
                onBlur={() => setFocusedField(null)}
                onPaste={(e) => handlePaste('recoveryCode', e)}
                autoComplete="one-time-code"
                aria-describedby="recovery-hint"
              />
              <button
                className={`reveal-btn ${revealed.recoveryCode ? 'active' : ''}`}
                onClick={() => handleFieldClick('recoveryCode')}
                onMouseDown={() => handleHoldStart('recoveryCode')}
                onMouseUp={() => handleHoldEnd('recoveryCode')}
                onMouseLeave={() => handleHoldEnd('recoveryCode')}
                onTouchStart={() => handleHoldStart('recoveryCode')}
                onTouchEnd={() => handleHoldEnd('recoveryCode')}
                onDoubleClick={() => handleFieldDoubleClick('recoveryCode')}
                aria-pressed={revealed.recoveryCode}
                aria-label={revealed.recoveryCode ? '遮罩内容' : '显示内容'}
                disabled={strategy === REVEAL_STRATEGIES.DISABLED}
              >
                <EyeIcon revealed={revealed.recoveryCode} />
              </button>
            </div>
            <StrengthIndicator analysis={recoveryAnalysis} />
            {recoveryCode && <MetadataDisplay metadata={recoveryMetadata} />}
          </div>
        </div>

        <div className="action-row">
          <button className="secondary-btn" onClick={() => handleCopy('password', password)} disabled={!password}>
            <CopyIcon /> 复制密码
          </button>
          <button className="secondary-btn" onClick={() => handleCopy('token', token)} disabled={!token}>
            <CopyIcon /> 复制令牌
          </button>
          <button className="secondary-btn" onClick={() => handleCopy('recoveryCode', recoveryCode)} disabled={!recoveryCode}>
            <CopyIcon /> 复制恢复码
          </button>
        </div>
      </section>

      <section className="tool-section">
        <div className="section-header">
          <h2>存储保护演示</h2>
          <p>禁止将敏感值写入 localStorage（检测敏感键名模式）</p>
        </div>

        <div className="storage-demo-card">
          <h4>测试键名检测</h4>
          <div className="storage-demo-form">
            <label>
              键名
              <input
                type="text"
                value={storageKey}
                onChange={(e) => setStorageKey(e.target.value)}
                placeholder="例如: userToken"
              />
            </label>
            <label>
              值
              <input
                type="text"
                value={storageValue}
                onChange={(e) => setStorageValue(e.target.value)}
                placeholder="敏感值"
              />
            </label>
            <button className="primary-btn" onClick={testStorageWrite}>
              尝试写入
            </button>
          </div>
          {storageResult && (
            <div className={`storage-result ${storageResult.type}`}>
              {storageResult.message}
            </div>
          )}
          <div className="field-hint" style={{ marginTop: '0.75rem' }}>
            敏感键名模式: password, token, secret, apiKey, credential, jwt, otp 等
          </div>
        </div>
      </section>

      <section className="tool-section">
        <div className="section-header">
          <h2>剪贴板包装演示</h2>
          <p>消毒 + 长度上限（与任务 055 衔接）</p>
        </div>

        <div className="clipboard-demo-card">
          <h4>测试长度截断</h4>
          <div className="clipboard-demo-form">
            <label>
              测试值
              <input
                type="text"
                value={clipboardTestValue}
                onChange={(e) => setClipboardTestValue(e.target.value)}
                placeholder="输入测试值"
              />
            </label>
            <label>
              最大长度
              <input
                type="number"
                min="1"
                max="100"
                value={clipboardMaxLength}
                onChange={(e) => setClipboardMaxLength(parseInt(e.target.value) || 20)}
              />
            </label>
            <button className="primary-btn" onClick={testClipboardSanitize}>
              测试消毒
            </button>
          </div>
          <div className="field-hint" style={{ marginTop: '0.75rem' }}>
            当前长度: {clipboardTestValue.length} 字符
          </div>
        </div>
      </section>

      <section className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>遮罩与显示：</strong>
            默认使用 <code>type=password</code> 或自定义圆点渲染。
            支持单击、按住、双击三种 <code>autoReveal</code> 策略。
            显示明文后自动恢复计时器可配置 3～15 秒。
          </li>
          <li>
            <strong>可见性隐藏：</strong>
            当 <code>visibilitychange</code> 为 <code>hidden</code> 时立即恢复遮罩，
            防止屏幕录制或后台偷窥。
          </li>
          <li>
            <strong>粘贴检测：</strong>
            粘贴后触发闪烁动画提示，日志中仅记录遮罩值，不落真实密码。
          </li>
          <li>
            <strong>二次确认复制：</strong>
            一键复制须二次确认对话框，仅在用户手势内调用剪贴板 API。
          </li>
          <li>
            <strong>存储保护：</strong>
            检测敏感键名模式（如 <code>password</code>、<code>token</code>、<code>secret</code>、<code>jwt</code>）时拒绝写入。
          </li>
          <li>
            <strong>元数据：</strong>
            提供「可记忆长度」元数据，仅存储长度与熵估算，不存原文。
            强度评估基于启发式规则集（无外部依赖）。
          </li>
          <li>
            <strong>键盘快捷键：</strong>
            聚焦字段时按 <code>Ctrl+Shift+L</code>（或 <code>Cmd+Shift+L</code>）切换遮罩。
            可在上方开关禁用。
          </li>
          <li>
            <strong>无障碍：</strong>
            使用 <code>aria-pressed</code> 状态与 live 区域，
            仅朗读状态变化（显示/遮罩），不朗读完整秘密。
          </li>
          <li>
            <strong>IME 组合输入：</strong>
            中文输入法等组合输入期间不触发 reveal，避免误操作。
          </li>
          <li>
            <strong>与浏览器密码管理器：</strong>
            使用 <code>autocomplete</code> 属性（<code>current-password</code>、<code>new-password</code>、<code>one-time-code</code>）
            引导浏览器正确填充。
          </li>
          <li>
            <strong>色弱模式：</strong>
            强度指示器使用多段式条形与标签双重提示，
            边框对比度与主题系统（任务 053）的最小对比建议对齐。
          </li>
        </ul>
      </section>

      {showConfirmModal && (
        <ConfirmModal
          message="确认将此敏感内容复制到剪贴板？请注意剪贴板内容可能被其他应用读取。"
          onConfirm={confirmCopy}
          onCancel={cancelCopy}
        />
      )}

      {toast && (
        <div className={`status-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
