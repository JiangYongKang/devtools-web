import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  HISTORY_MODES,
  WARNING_CODES,
  ERROR_CODES,
  zod,
  createFormQuerySync,
  queryToForm,
  EXAMPLES,
  getDefaults,
  createAsyncValidator,
  ENCODING_DIFFERENCES,
  HTTP_027_COMPATIBLE_SCHEMA,
} from './logic/index.js'

const DEMO_SCHEMA = zod.object({
  username: zod.string({ default: '', required: true, queryKeys: ['user', 'u'] }),
  password: zod.string({ default: '' }),
  remember: zod.boolean({ default: false }),
  page: zod.number({ default: 1 }),
  tags: zod.array(zod.string(), { default: [] }),
  user: zod.object({
    name: zod.string({ default: '' }),
    email: zod.string({ default: '' }),
  }),
})

const COLORS = {
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryDisabled: '#9ca3af',
  secondary: '#f8fafc',
  secondaryBorder: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  success: '#10b981',
  successBg: '#ecfdf5',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  infoBg: '#eff6ff',
}

const styles = {
  buttonPrimary: {
    padding: '12px 20px',
    background: COLORS.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  buttonPrimaryDisabled: {
    padding: '12px 20px',
    background: COLORS.primaryDisabled,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '14px',
    fontWeight: 500,
  },
  buttonSecondary: {
    padding: '12px 20px',
    background: 'white',
    color: COLORS.textSecondary,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  buttonDanger: {
    padding: '12px 20px',
    background: 'white',
    color: COLORS.danger,
    border: '1px solid #fecaca',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  buttonGhost: {
    padding: '10px 16px',
    background: 'transparent',
    color: COLORS.textMuted,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 400,
    transition: 'all 0.2s',
  },
  tabActive: {
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    color: COLORS.primary,
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: '3px solid ' + COLORS.primary,
    marginBottom: '-2px',
  },
  tabInactive: {
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    color: COLORS.textMuted,
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    marginBottom: '-2px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid ' + COLORS.secondaryBorder,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: COLORS.textSecondary,
    fontSize: '14px',
  },
  sectionTitle: {
    fontSize: '18px',
    marginBottom: '20px',
    color: COLORS.textPrimary,
    fontWeight: 600,
    marginTop: 0,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },
}

function createMemoryLocation(initialSearch = '') {
  let internalSearch = initialSearch
  const listeners = []
  return {
    get origin() { return 'https://example.com' },
    get pathname() { return '/demo/form-query-sync' },
    get search() { return internalSearch },
    set search(val) { internalSearch = val },
    __setSearch(val) { internalSearch = val },
    __addListener(fn) { listeners.push(fn) },
    __notify() { listeners.forEach((fn) => fn(internalSearch)) },
  }
}

function createMemoryNavigate() {
  const history = []
  let currentIndex = -1
  const navigate = (to, options = {}) => {
    const replace = options.replace === true
    const entry = {
      search: to.search || '',
      replace,
      timestamp: Date.now(),
    }
    if (replace && currentIndex >= 0) {
      history[currentIndex] = entry
    } else {
      history.splice(currentIndex + 1)
      history.push(entry)
      currentIndex = history.length - 1
    }
    return { history: [...history], currentIndex }
  }
  navigate.__getHistory = () => ({
    entries: [...history],
    currentIndex,
    pushCount: history.filter((h, i) => i === 0 || !h.replace).length,
    replaceCount: history.filter((h) => h.replace).length,
  })
  return navigate
}

export default function FormQuerySyncDemo() {
  const [uiState, setUiState] = useState(() => getDefaults(DEMO_SCHEMA))
  const [historyMode, setHistoryMode] = useState(HISTORY_MODES.PUSH)
  const [debounceMs, setDebounceMs] = useState(300)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [syncLocked, setSyncLocked] = useState(false)
  const [currentQueryString, setCurrentQueryString] = useState('')
  const [warnings, setWarnings] = useState([])
  const [errors, setErrors] = useState([])
  const [hydrationInfo, setHydrationInfo] = useState(null)
  const [selectedExample, setSelectedExample] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('editor')
  const [validationErrors, setValidationErrors] = useState({})
  const [asyncValidationStatus, setAsyncValidationStatus] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [dirtyFields, setDirtyFields] = useState([])

  const locationRef = useRef(createMemoryLocation())
  const navigateRef = useRef(createMemoryNavigate())
  const formSyncRef = useRef(null)
  const asyncValidator = useMemo(() => createAsyncValidator(300), [])

  const formSync = useMemo(() => {
    const fs = createFormQuerySync({
      schema: DEMO_SCHEMA,
      location: locationRef.current,
      navigate: navigateRef.current,
      debounceMs,
      historyMode,
    })
    formSyncRef.current = fs
    return fs
  }, [debounceMs, historyMode])

  const historyStats = useMemo(() => {
    return navigateRef.current.__getHistory()
  }, [uiState])

  useEffect(() => {
    if (formSyncRef.current) {
      setIsDirty(formSyncRef.current.isDirty())
      setDirtyFields(formSyncRef.current.getDirtyFields())
    }
  }, [uiState])

  const handleStateChange = useCallback((fieldPath, value) => {
    const parts = fieldPath.split('.')
    const newState = JSON.parse(JSON.stringify(uiState))
    let current = newState
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
    setUiState(newState)

    if (fieldPath === 'username' && value.length > 2) {
      setAsyncValidationStatus((prev) => ({ ...prev, username: 'validating' }))
      asyncValidator(value, (val) => {
        if (val === 'admin') {
          return { valid: false, message: '用户名已被占用' }
        }
        return { valid: true }
      }).then((result) => {
        setAsyncValidationStatus((prev) => ({
          ...prev,
          username: result.valid ? 'valid' : 'invalid',
        }))
        setValidationErrors((prev) => ({
          ...prev,
          username: result.valid ? null : result.message,
        }))
      }).catch((err) => {
        if (!err.aborted) {
          setAsyncValidationStatus((prev) => ({ ...prev, username: 'idle' }))
        }
      })
    }
  }, [uiState, asyncValidator])

  const handleTagChange = useCallback((index, value) => {
    setUiState((prev) => {
      const newTags = [...(prev.tags || [])]
      newTags[index] = value
      return { ...prev, tags: newTags }
    })
  }, [])

  const handleAddTag = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      tags: [...(prev.tags || []), ''],
    }))
  }, [])

  const handleRemoveTag = useCallback((index) => {
    setUiState((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== index),
    }))
  }, [])

  const handleApplyState = useCallback(() => {
    if (!formSyncRef.current) return
    if (syncLocked) {
      setErrors([{ code: ERROR_CODES.SYNC_LOCKED, message: '同步已锁定，请先解锁' }])
      return
    }
    const result = formSyncRef.current.setState(uiState, { write: syncEnabled, immediate: true })
    if (result.changed) {
      const queryResult = formSyncRef.current.formToQuery(uiState)
      setCurrentQueryString(queryResult.queryString)
      setWarnings(queryResult.warnings)
      setErrors(queryResult.errors)
    }
  }, [uiState, syncEnabled, syncLocked])

  const handleLoadExample = useCallback((exampleKey) => {
    const example = EXAMPLES[exampleKey]
    if (!example) return

    setSelectedExample(exampleKey)
    locationRef.current.__setSearch(`?${example.queryString}`)

    const result = queryToForm(example.queryString, DEMO_SCHEMA)
    setWarnings(result.warnings)
    setUiState(result.state)

    navigateRef.current = createMemoryNavigate()
    setActiveTab('result')
  }, [])

  const handleHydrate = useCallback(() => {
    if (!formSyncRef.current) return
    const result = formSyncRef.current.hydrate()
    setUiState(result.state)
    setWarnings(result.warnings)
    setCurrentQueryString(locationRef.current.search)
    setActiveTab('result')
  }, [])

  const handleInjectConflicts = useCallback(() => {
    const conflictQuery = 'user=conflict&user[name]=admin&tags=a&tags=a'
    locationRef.current.__setSearch(`?${conflictQuery}`)
    const result = queryToForm(conflictQuery, DEMO_SCHEMA)
    setWarnings(result.warnings)
    setUiState(result.state)
    setActiveTab('result')
  }, [])

  const handleCopy = useCallback(async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      setCopyStatus({ type: 'error', message: `复制失败：${err?.message || '未知错误'}` })
    }
    setTimeout(() => setCopyStatus(null), 2500)
  }, [])

  const handleReset = useCallback(() => {
    locationRef.current = createMemoryLocation()
    navigateRef.current = createMemoryNavigate()
    setUiState(getDefaults(DEMO_SCHEMA))
    setCurrentQueryString('')
    setWarnings([])
    setErrors([])
    setHydrationInfo(null)
    setSelectedExample(null)
    setValidationErrors({})
    setAsyncValidationStatus({})
    setActiveTab('editor')
  }, [])

  const handleValidate = useCallback(() => {
    if (!formSyncRef.current) return
    const result = formSyncRef.current.validate(uiState)
    const newErrors = {}
    result.errors.forEach((err) => {
      newErrors[err.field] = err.message
    })
    setValidationErrors(newErrors)
  }, [uiState])

  const handleToggleLock = useCallback(() => {
    if (!formSyncRef.current) return
    if (syncLocked) {
      formSyncRef.current.unlockSync()
      setSyncLocked(false)
    } else {
      formSyncRef.current.lockSync('用户编辑中')
      setSyncLocked(true)
    }
  }, [syncLocked])

  const currentQuery = useMemo(() => {
    if (!formSyncRef.current) return { queryString: '', params: {} }
    return formSyncRef.current.formToQuery(uiState)
  }, [uiState])

  const getFieldErrorId = (fieldName) => {
    return validationErrors[fieldName] ? `error-${fieldName}` : undefined
  }

  const tabs = [
    { id: 'editor', label: '表单编辑器' },
    { id: 'result', label: '同步结果' },
    { id: 'examples', label: '预置示例' },
    { id: 'help', label: '功能说明' },
  ]

  return (
    <div style={{
      padding: '40px',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f8fafc',
      minHeight: '100vh',
    }}>
      {copyStatus && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '14px 24px',
          borderRadius: '10px',
          background: copyStatus.type === 'success' ? COLORS.success : COLORS.danger,
          color: 'white',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {copyStatus.message}
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '28px',
          marginBottom: '8px',
          color: COLORS.textPrimary,
          fontWeight: 700,
        }}>表单-URL 查询参数同步演示</h1>
        <p style={{
          color: COLORS.textMuted,
          fontSize: '14px',
          lineHeight: '1.6',
          margin: 0,
        }}>
          展示表单字段与 URL 查询参数的双向绑定、括号风格嵌套、防抖、历史策略、脏检查等功能
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '2px solid ' + COLORS.secondaryBorder,
        paddingBottom: '0',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id ? styles.tabActive : styles.tabInactive}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'editor' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '28px',
        }}>
          <div style={styles.card}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}>
              <h2 style={styles.sectionTitle}>登录表单</h2>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}>
                {isDirty && (
                  <span style={{
                    ...styles.statusBadge,
                    background: '#fef3c7',
                    color: '#92400e',
                  }}>
                    已修改
                  </span>
                )}
                <span style={{
                  ...styles.statusBadge,
                  background: syncLocked ? COLORS.dangerBg : COLORS.successBg,
                  color: syncLocked ? COLORS.danger : COLORS.success,
                }}>
                  {syncLocked ? '已锁定' : '未锁定'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label htmlFor="username" style={styles.label}>
                  用户名 <span style={{ color: COLORS.danger }}>*</span>
                  {asyncValidationStatus.username === 'validating' && (
                    <span style={{ marginLeft: '8px', color: COLORS.warning }}>验证中...</span>
                  )}
                  {asyncValidationStatus.username === 'valid' && (
                    <span style={{ marginLeft: '8px', color: COLORS.success }}>可用</span>
                  )}
                  {asyncValidationStatus.username === 'invalid' && (
                    <span style={{ marginLeft: '8px', color: COLORS.danger }}>不可用</span>
                  )}
                </label>
                <input
                  id="username"
                  type="text"
                  value={uiState.username}
                  onChange={(e) => handleStateChange('username', e.target.value)}
                  placeholder="输入用户名 (输入 'admin' 测试异步校验)"
                  aria-invalid={!!validationErrors.username}
                  aria-describedby={getFieldErrorId('username')}
                  required
                  style={{
                    ...styles.input,
                    borderColor: validationErrors.username ? '#f87171' : '#d1d5db',
                  }}
                />
                {validationErrors.username && (
                  <div id="error-username" role="alert" style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: COLORS.dangerBg,
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    color: COLORS.danger,
                    fontSize: '13px',
                  }}>
                    {validationErrors.username}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="password" style={styles.label}>
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={uiState.password}
                  onChange={(e) => handleStateChange('password', e.target.value)}
                  placeholder="输入密码 (不会写入 URL)"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>记住登录</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleStateChange('remember', true)}
                    style={{
                      ...styles.buttonSecondary,
                      flex: 1,
                      borderColor: uiState.remember ? COLORS.success : '#d1d5db',
                      background: uiState.remember ? COLORS.successBg : 'white',
                      color: uiState.remember ? COLORS.success : COLORS.textMuted,
                    }}
                  >
                    是
                  </button>
                  <button
                    onClick={() => handleStateChange('remember', false)}
                    style={{
                      ...styles.buttonSecondary,
                      flex: 1,
                      borderColor: !uiState.remember ? COLORS.textSecondary : '#d1d5db',
                      background: !uiState.remember ? COLORS.secondary : 'white',
                      color: !uiState.remember ? COLORS.textSecondary : COLORS.textMuted,
                    }}
                  >
                    否
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="page" style={styles.label}>页码</label>
                <input
                  id="page"
                  type="number"
                  min="1"
                  value={uiState.page}
                  onChange={(e) => handleStateChange('page', Number(e.target.value))}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>筛选标签</label>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '12px',
                }}>
                  {uiState.tags.length === 0 && (
                    <div style={{
                      padding: '16px',
                      border: '2px dashed #d1d5db',
                      borderRadius: '8px',
                      color: COLORS.textMuted,
                      fontSize: '14px',
                      textAlign: 'center',
                    }}>
                      暂无标签，点击下方按钮添加
                    </div>
                  )}
                  {uiState.tags.map((tag, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => handleTagChange(idx, e.target.value)}
                        placeholder={`标签 ${idx + 1}`}
                        style={{
                          ...styles.input,
                          flex: 1,
                          padding: '10px 14px',
                          fontSize: '14px',
                        }}
                      />
                      <button
                        onClick={() => handleRemoveTag(idx)}
                        style={styles.buttonGhost}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddTag}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: COLORS.secondary,
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    color: COLORS.textMuted,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  添加标签
                </button>
              </div>

              <div style={{
                padding: '20px',
                background: COLORS.secondary,
                borderRadius: '10px',
                border: '1px solid ' + COLORS.secondaryBorder,
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  color: COLORS.textSecondary,
                  marginTop: 0,
                }}>
                  用户信息 (嵌套对象，使用 user[name] 格式)
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label htmlFor="user.name" style={{ ...styles.label, fontSize: '13px' }}>
                      姓名
                    </label>
                    <input
                      id="user.name"
                      type="text"
                      value={uiState.user?.name || ''}
                      onChange={(e) => handleStateChange('user.name', e.target.value)}
                      style={{ ...styles.input, padding: '10px 14px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="user.email" style={{ ...styles.label, fontSize: '13px' }}>
                      邮箱
                    </label>
                    <input
                      id="user.email"
                      type="email"
                      value={uiState.user?.email || ''}
                      onChange={(e) => handleStateChange('user.email', e.target.value)}
                      style={{ ...styles.input, padding: '10px 14px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '24px' }}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>同步配置</h2>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <label style={{ ...styles.label, fontWeight: 600 }}>历史写入策略</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}>
                    <button
                      onClick={() => setHistoryMode(HISTORY_MODES.PUSH)}
                      style={{
                        padding: '16px',
                        border: '2px solid',
                        borderColor: historyMode === HISTORY_MODES.PUSH ? COLORS.primary : '#d1d5db',
                        borderRadius: '10px',
                        background: historyMode === HISTORY_MODES.PUSH ? COLORS.infoBg : 'white',
                        color: historyMode === HISTORY_MODES.PUSH ? COLORS.primary : COLORS.textMuted,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>Push 模式</div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'normal',
                        color: historyMode === HISTORY_MODES.PUSH ? COLORS.primary : COLORS.textMuted,
                      }}>
                        每次写入添加新历史条目，可后退
                      </div>
                    </button>
                    <button
                      onClick={() => setHistoryMode(HISTORY_MODES.REPLACE)}
                      style={{
                        padding: '16px',
                        border: '2px solid',
                        borderColor: historyMode === HISTORY_MODES.REPLACE ? COLORS.primary : '#d1d5db',
                        borderRadius: '10px',
                        background: historyMode === HISTORY_MODES.REPLACE ? COLORS.infoBg : 'white',
                        color: historyMode === HISTORY_MODES.REPLACE ? COLORS.primary : COLORS.textMuted,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>Replace 模式</div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'normal',
                        color: historyMode === HISTORY_MODES.REPLACE ? COLORS.primary : COLORS.textMuted,
                      }}>
                        仅替换当前 URL，不污染后退栈
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ ...styles.label, fontWeight: 600 }}>
                    防抖延迟: <span style={{ color: COLORS.primary }}>{debounceMs}ms</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={debounceMs}
                    onChange={(e) => setDebounceMs(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: '#e2e8f0',
                      outline: 'none',
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: COLORS.textMuted,
                  }}>
                    <span>0ms 立即同步</span>
                    <span>1000ms</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: COLORS.secondary,
                  borderRadius: '10px',
                }}>
                  <input
                    type="checkbox"
                    id="syncEnabled"
                    checked={syncEnabled}
                    onChange={(e) => setSyncEnabled(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="syncEnabled" style={{
                      fontWeight: 600,
                      color: COLORS.textSecondary,
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}>
                      启用 URL 自动同步
                    </label>
                    <div style={{
                      fontSize: '12px',
                      color: COLORS.textMuted,
                      marginTop: '2px',
                    }}>
                      禁用时仅在点击「同步到 URL」时才写入
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: syncLocked ? COLORS.dangerBg : COLORS.warningBg,
                  borderRadius: '10px',
                  border: `1px solid ${syncLocked ? '#fecaca' : '#fcd34d'}`,
                }}>
                  <input
                    type="checkbox"
                    id="syncLocked"
                    checked={syncLocked}
                    onChange={handleToggleLock}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor="syncLocked" style={{
                      fontWeight: 600,
                      color: syncLocked ? COLORS.danger : '#92400e',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}>
                      暂停 URL 回写 (编辑锁)
                    </label>
                    <div style={{
                      fontSize: '12px',
                      color: syncLocked ? COLORS.danger : '#d97706',
                      marginTop: '2px',
                    }}>
                      开启时禁止写入 URL，模拟用户编辑中场景
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>执行操作</h2>

              <div style={{ display: 'grid', gap: '14px' }}>
                <button
                  onClick={handleApplyState}
                  style={syncLocked ? styles.buttonPrimaryDisabled : styles.buttonPrimary}
                >
                  {syncLocked ? '同步已锁定' : (syncEnabled ? '立即同步到 URL' : '手动同步到 URL')}
                </button>
                <button
                  onClick={handleValidate}
                  style={styles.buttonSecondary}
                >
                  校验表单
                </button>
                <button
                  onClick={handleHydrate}
                  style={styles.buttonSecondary}
                >
                  从当前 URL 恢复
                </button>
                <button
                  onClick={handleInjectConflicts}
                  style={styles.buttonSecondary}
                >
                  注入冲突键与重复数组
                </button>
                <button
                  onClick={handleReset}
                  style={styles.buttonDanger}
                >
                  重置所有状态
                </button>
              </div>
            </div>

            <div style={{
              background: COLORS.successBg,
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #bbf7d0',
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: COLORS.success,
                marginTop: 0,
              }}>
                脏字段信息
              </h3>
              <div style={{
                color: '#15803d',
                fontSize: '13px',
                lineHeight: '1.8',
              }}>
                <div>是否脏: <strong>{isDirty ? '是' : '否'}</strong></div>
                <div>
                  脏字段列表: 
                  {dirtyFields.length === 0 ? (
                    <span style={{ marginLeft: '8px', color: '#65a30d' }}>(无)</span>
                  ) : (
                    <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                      {dirtyFields.map((field, idx) => (
                        <li key={idx} style={{ color: '#b45309' }}>{field}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #bbf7d0' }}>
                  <strong>提示：</strong>提交按钮在「仅 query 变更未触发表单 dirty」时可保持禁用，避免用户误提交。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'result' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '28px',
        }}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>当前 URL</h2>
            <pre style={{
              padding: '20px',
              background: COLORS.textPrimary,
              color: '#e2e8f0',
              borderRadius: '10px',
              fontSize: '13px',
              fontFamily: 'ui-monospace, "SFMono-Regular", monospace',
              overflow: 'auto',
              maxHeight: '200px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: '1.6',
              margin: 0,
            }}>
              {locationRef.current.origin}
              {locationRef.current.pathname}
              {currentQuery.queryString ? `?${currentQuery.queryString}` : '(无查询参数)'}
            </pre>

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => handleCopy(
                  `${locationRef.current.origin}${locationRef.current.pathname}${currentQuery.queryString ? `?${currentQuery.queryString}` : ''}`,
                  '完整 URL'
                )}
                style={{ ...styles.buttonPrimary, width: '100%' }}
              >
                复制 URL
              </button>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: COLORS.secondary,
              borderRadius: '10px',
              border: '1px solid ' + COLORS.secondaryBorder,
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '16px',
                color: COLORS.textSecondary,
                marginTop: 0,
              }}>
                历史记录统计
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  padding: '16px 8px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid ' + COLORS.secondaryBorder,
                }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: COLORS.primary,
                    marginBottom: '4px',
                  }}>
                    {historyStats.pushCount}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.textMuted }}>Push 次数</div>
                </div>
                <div style={{
                  padding: '16px 8px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid ' + COLORS.secondaryBorder,
                }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: COLORS.success,
                    marginBottom: '4px',
                  }}>
                    {historyStats.replaceCount}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.textMuted }}>Replace 次数</div>
                </div>
                <div style={{
                  padding: '16px 8px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid ' + COLORS.secondaryBorder,
                }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: COLORS.warning,
                    marginBottom: '4px',
                  }}>
                    {historyStats.entries.length}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.textMuted }}>总条目</div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: COLORS.infoBg,
              borderRadius: '10px',
              border: '1px solid #bfdbfe',
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: COLORS.primary,
                marginTop: 0,
              }}>
                当前表单状态 (JSON)
              </h3>
              <pre style={{
                padding: '16px',
                background: 'white',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'ui-monospace, monospace',
                overflow: 'auto',
                maxHeight: '200px',
                margin: 0,
                border: '1px solid ' + COLORS.secondaryBorder,
              }}>
                {JSON.stringify(uiState, null, 2)}
              </pre>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '24px' }}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>警告</h2>

              {warnings.length === 0 ? (
                <div style={{
                  padding: '40px',
                  background: COLORS.successBg,
                  borderRadius: '10px',
                  border: '2px dashed #bbf7d0',
                  textAlign: 'center',
                }}>
                  <div style={{
                    color: COLORS.success,
                    fontWeight: 600,
                    fontSize: '16px',
                  }}>
                    暂无警告
                  </div>
                  <div style={{
                    color: '#4ade80',
                    fontSize: '13px',
                    marginTop: '4px',
                  }}>
                    所有参数均有效
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gap: '12px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}>
                  {warnings.map((w, idx) => (
                    <div key={idx} style={{
                      padding: '16px',
                      background: COLORS.warningBg,
                      border: '1px solid #fcd34d',
                      borderRadius: '10px',
                    }}>
                      <div style={{
                        fontWeight: 600,
                        color: '#92400e',
                        fontSize: '14px',
                        marginBottom: '8px',
                      }}>
                        {w.code}
                        {w.field && <span style={{ color: '#b45309', fontWeight: 'normal' }}> ({w.field})</span>}
                      </div>
                      <div style={{
                        color: '#78350f',
                        fontSize: '13px',
                        lineHeight: '1.5',
                      }}>
                        {w.message}
                      </div>
                      {w.value !== null && w.value !== undefined && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          background: '#fef3c7',
                          borderRadius: '6px',
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '12px',
                          color: '#92400e',
                        }}>
                          值: {String(w.value)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>错误</h2>

              {errors.length === 0 && Object.keys(validationErrors).length === 0 ? (
                <div style={{
                  padding: '40px',
                  background: COLORS.successBg,
                  borderRadius: '10px',
                  border: '2px dashed #bbf7d0',
                  textAlign: 'center',
                }}>
                  <div style={{
                    color: COLORS.success,
                    fontWeight: 600,
                    fontSize: '16px',
                  }}>
                    暂无错误
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gap: '12px',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}>
                  {errors.map((e, idx) => (
                    <div key={idx} style={{
                      padding: '16px',
                      background: COLORS.dangerBg,
                      border: '1px solid #fecaca',
                      borderRadius: '10px',
                    }}>
                      <div style={{
                        fontWeight: 600,
                        color: COLORS.danger,
                        fontSize: '14px',
                        marginBottom: '8px',
                      }}>
                        {e.code}
                        {e.field && <span style={{ color: '#dc2626', fontWeight: 'normal' }}> ({e.field})</span>}
                      </div>
                      <div style={{
                        color: '#7f1d1d',
                        fontSize: '13px',
                        lineHeight: '1.5',
                      }}>
                        {e.message}
                      </div>
                    </div>
                  ))}
                  {Object.entries(validationErrors).map(([field, message]) => (
                    message && (
                      <div key={field} style={{
                        padding: '16px',
                        background: COLORS.dangerBg,
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                      }}>
                        <div style={{
                          fontWeight: 600,
                          color: COLORS.danger,
                          fontSize: '14px',
                          marginBottom: '8px',
                        }}>
                          校验错误 ({field})
                        </div>
                        <div style={{
                          color: '#7f1d1d',
                          fontSize: '13px',
                          lineHeight: '1.5',
                        }}>
                          {message}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'examples' && (
        <div style={styles.card}>
          <h2 style={{ ...styles.sectionTitle, marginBottom: '8px' }}>预置示例</h2>
          <p style={{
            color: COLORS.textMuted,
            marginBottom: '28px',
            fontSize: '14px',
          }}>
            点击下方卡片加载预设的查询串，体验不同场景
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '20px',
          }}>
            {Object.entries(EXAMPLES).map(([key, example]) => (
              <button
                key={key}
                onClick={() => handleLoadExample(key)}
                style={{
                  padding: '24px',
                  border: '2px solid',
                  borderColor: selectedExample === key ? COLORS.success : '#d1d5db',
                  borderRadius: '12px',
                  background: selectedExample === key ? COLORS.successBg : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: selectedExample === key ? COLORS.success : COLORS.textPrimary,
                  marginBottom: '8px',
                }}>
                  {example.name}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: selectedExample === key ? COLORS.success : COLORS.textMuted,
                  lineHeight: '1.6',
                  marginBottom: '12px',
                }}>
                  {key === 'valid' && '所有参数均有效，无警告生成'}
                  {key === 'withNested' && '包含 user[name] 风格的嵌套字段'}
                  {key === 'withConflicts' && '包含冲突键和重复数组，测试冲突处理'}
                  {key === 'malicious' && '超长查询串，测试长度限制'}
                </div>
                <div style={{
                  padding: '12px',
                  background: COLORS.secondary,
                  borderRadius: '8px',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '11px',
                  color: COLORS.textSecondary,
                  wordBreak: 'break-all',
                  maxHeight: '60px',
                  overflow: 'hidden',
                }}>
                  {example.queryString}
                </div>
              </button>
            ))}
          </div>

          <div style={{
            marginTop: '40px',
            padding: '24px',
            background: COLORS.secondary,
            borderRadius: '12px',
            border: '1px solid ' + COLORS.secondaryBorder,
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              color: COLORS.textPrimary,
              marginTop: 0,
            }}>
              HTTP 027 兼容示例 JSON
            </h3>
            <pre style={{
              padding: '20px',
              background: COLORS.textPrimary,
              color: '#e2e8f0',
              borderRadius: '10px',
              fontSize: '13px',
              fontFamily: 'ui-monospace, monospace',
              overflow: 'auto',
              lineHeight: '1.6',
              margin: 0,
            }}>
              {JSON.stringify(HTTP_027_COMPATIBLE_SCHEMA, null, 2)}
            </pre>
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={() => handleCopy(JSON.stringify(HTTP_027_COMPATIBLE_SCHEMA, null, 2), '示例 JSON')}
                style={styles.buttonPrimary}
              >
                复制 JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>功能说明</h2>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', color: COLORS.primary, marginBottom: '8px' }}>
                  表单字段与 URL 查询参数双向绑定
                </h3>
                <ul style={{ margin: 0, paddingLeft: '24px', color: COLORS.textSecondary, lineHeight: '1.8', fontSize: '14px' }}>
                  <li>支持 string、number、boolean、enum、date、array、object 类型</li>
                  <li>每个字段可定义：类型、必填、默认值、同义 query 键名（queryKeys）、序列化格式</li>
                  <li>嵌套对象使用 `user[name]` 风格的 query 参数（括号风格）</li>
                  <li>数组使用重复键（如 `tags=a&tags=b`）</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: '15px', color: COLORS.primary, marginBottom: '8px' }}>
                  往返转换
                </h3>
                <ul style={{ margin: 0, paddingLeft: '24px', color: COLORS.textSecondary, lineHeight: '1.8', fontSize: '14px' }}>
                  <li>`formToQuery`: 表单状态 → URL 查询字符串</li>
                  <li>`queryToForm`: URL 查询字符串 → 表单状态</li>
                  <li>自动合并默认值</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: '15px', color: COLORS.primary, marginBottom: '8px' }}>
                  部分更新与脏检查
                </h3>
                <ul style={{ margin: 0, paddingLeft: '24px', color: COLORS.textSecondary, lineHeight: '1.8', fontSize: '14px' }}>
                  <li>`partialUpdate`: 深合并更新部分字段</li>
                  <li>`isDirty`: 检测表单是否被修改</li>
                  <li>`getDirtyFields`: 获取所有被修改的字段路径</li>
                  <li>可用于决定提交按钮启用/禁用状态</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: '15px', color: COLORS.primary, marginBottom: '8px' }}>
                  非法参数处理
                </h3>
                <ul style={{ margin: 0, paddingLeft: '24px', color: COLORS.textSecondary, lineHeight: '1.8', fontSize: '14px' }}>
                  <li>非法参数被剔除，不抛出异常</li>
                  <li>警告信息写入 `warnings` 数组（包含 code、field、value、message）</li>
                  <li>致命错误写入 `errors` 数组（与 warnings 不混用）</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>与任务 060 (route-sync) 编码差异</h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}>
                <thead>
                  <tr style={{ background: COLORS.secondary }}>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: COLORS.textSecondary,
                    }}>特性</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: COLORS.primary,
                    }}>form-query-sync (本任务)</th>
                    <th style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: '#7c3aed',
                    }}>route-sync (任务 060)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      fontWeight: 500,
                    }}>嵌套对象格式</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      fontFamily: 'monospace',
                      color: COLORS.primary,
                    }}>{ENCODING_DIFFERENCES.formQuerySync.nestedFormat} ({ENCODING_DIFFERENCES.formQuerySync.example})</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      fontFamily: 'monospace',
                      color: '#7c3aed',
                    }}>{ENCODING_DIFFERENCES.routeSync.nestedFormat} ({ENCODING_DIFFERENCES.routeSync.example})</td>
                  </tr>
                  <tr style={{ background: '#fafafa' }}>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      fontWeight: 500,
                    }}>日期类型支持</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: COLORS.primary,
                    }}>{ENCODING_DIFFERENCES.formQuerySync.dateFormat}</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: '#7c3aed',
                    }}>{ENCODING_DIFFERENCES.routeSync.dateFormat}</td>
                  </tr>
                  <tr>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      fontWeight: 500,
                    }}>数组编码</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: COLORS.primary,
                    }}>{ENCODING_DIFFERENCES.formQuerySync.arrayEncoding}</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: '#7c3aed',
                    }}>{ENCODING_DIFFERENCES.routeSync.arrayEncoding}</td>
                  </tr>
                  <tr style={{ background: '#fafafa' }}>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      fontWeight: 500,
                    }}>同义 query 键名</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: COLORS.primary,
                    }}>支持 (queryKeys 选项)</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: '#7c3aed',
                    }}>不支持</td>
                  </tr>
                  <tr>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      fontWeight: 500,
                    }}>字段序列化/反序列化</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: COLORS.primary,
                    }}>支持 (serialize/parse 选项)</td>
                    <td style={{
                      padding: '12px 16px',
                      border: '1px solid ' + COLORS.secondaryBorder,
                      color: '#7c3aed',
                    }}>不支持</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>校验与无障碍</h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                padding: '20px',
                background: COLORS.warningBg,
                borderRadius: '10px',
                border: '1px solid #fcd34d',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#92400e',
                  marginTop: 0,
                }}>同步校验 (aria 支持)</h3>
                <p style={{ margin: 0, color: '#78350f', fontSize: '14px', lineHeight: '1.6' }}>
                  表单字段设置 <code style={{ background: '#fffbeb', padding: '2px 6px', borderRadius: '4px' }}>aria-invalid</code> 
                  指向是否有校验错误；<code style={{ background: '#fffbeb', padding: '2px 6px', borderRadius: '4px' }}>aria-describedby</code> 
                  指向对应错误描述的 id 列表（页面层实现）。
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: COLORS.infoBg,
                borderRadius: '10px',
                border: '1px solid #7dd3fc',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#0369a1',
                  marginTop: 0,
                }}>异步校验 (可取消)</h3>
                <p style={{ margin: 0, color: '#075985', fontSize: '14px', lineHeight: '1.6' }}>
                  异步校验使用 <code style={{ background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>AbortController</code> 实现可取消。
                  演示中输入用户名时，新输入会取消上一次校验（模拟 300ms 延迟）。
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: COLORS.successBg,
                borderRadius: '10px',
                border: '1px solid #bbf7d0',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: COLORS.success,
                  marginTop: 0,
                }}>提交按钮启用规则</h3>
                <p style={{ margin: 0, color: '#15803d', fontSize: '14px', lineHeight: '1.6' }}>
                  提交按钮在「仅 query 变更未触发表单 dirty」时可保持禁用。
                  使用 <code style={{ background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>isDirty()</code> 
                  或 <code style={{ background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>getDirtyFields()</code> 判断。
                </p>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>边界条件</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{
                padding: '20px',
                background: COLORS.dangerBg,
                borderRadius: '10px',
                border: '1px solid #fecaca',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: COLORS.danger,
                  marginTop: 0,
                }}>超长 query</h3>
                <p style={{ margin: 0, color: '#7f1d1d', fontSize: '14px', lineHeight: '1.6' }}>
                  超过配置长度时拒绝写入 URL 并返回错误
                  (errorCode: <code style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>URL_LENGTH_EXCEEDED</code>)
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: COLORS.warningBg,
                borderRadius: '10px',
                border: '1px solid #fcd34d',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#92400e',
                  marginTop: 0,
                }}>+ 与空格</h3>
                <p style={{ margin: 0, color: '#78350f', fontSize: '14px', lineHeight: '1.6' }}>
                  解析时 <code style={{ background: '#fffbeb', padding: '2px 6px', borderRadius: '4px' }}>+</code> 被转换为空格；
                  序列化时使用标准 <code style={{ background: '#fffbeb', padding: '2px 6px', borderRadius: '4px' }}>%20</code>
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: COLORS.successBg,
                borderRadius: '10px',
                border: '1px solid #bbf7d0',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: COLORS.success,
                  marginTop: 0,
                }}>File/Blob</h3>
                <p style={{ margin: 0, color: '#15803d', fontSize: '14px', lineHeight: '1.6' }}>
                  File/Blob 字段禁止进入 query，显式拒绝
                  (errorCode: <code style={{ background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>FILE_FIELD_NOT_ALLOWED</code>)
                </p>
              </div>

              <div style={{
                padding: '20px',
                background: COLORS.infoBg,
                borderRadius: '10px',
                border: '1px solid #bfdbfe',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: COLORS.primary,
                  marginTop: 0,
                }}>后退栈污染</h3>
                <p style={{ margin: 0, color: COLORS.primary, fontSize: '14px', lineHeight: '1.6' }}>
                  连续 push 计数超过阈值时提示
                  (warningCode: <code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: '4px' }}>HISTORY_PUSH_THRESHOLD_EXCEEDED</code>)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
