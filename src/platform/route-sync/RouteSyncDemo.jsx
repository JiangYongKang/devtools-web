import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  HISTORY_MODES,
  WARNING_CODES,
  zod,
  createRouteSync,
  deserializeState,
  EXAMPLES,
  getDefaults,
  URL_LIMITS,
} from './logic/index.js'

const DEMO_SCHEMA = zod.object({
  name: zod.string({ default: '' }),
  active: zod.boolean({ default: false }),
  count: zod.number({ default: 0 }),
  theme: zod.enum(['light', 'dark', 'auto'], { default: 'light' }),
  tags: zod.array(zod.string(), { default: [] }),
  config: zod.object({
    autoSave: zod.boolean({ default: true }),
    fontSize: zod.number({ default: 14 }),
    language: zod.string({ default: 'zh-CN' }),
  }),
})

function createMemoryLocation(initialSearch = '') {
  let internalSearch = initialSearch
  const listeners = []
  return {
    get origin() { return 'https://example.com' },
    get pathname() { return '/demo/route-sync' },
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

function createMemoryStorage() {
  const store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value },
    removeItem: (key) => { delete store[key] },
  }
}

export default function RouteSyncDemo() {
  const [uiState, setUiState] = useState(() => getDefaults(DEMO_SCHEMA))
  const [historyMode, setHistoryMode] = useState(HISTORY_MODES.PUSH)
  const [debounceMs, setDebounceMs] = useState(300)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [currentQueryString, setCurrentQueryString] = useState('')
  const [warnings, setWarnings] = useState([])
  const [hydrationInfo, setHydrationInfo] = useState(null)
  const [selectedExample, setSelectedExample] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('editor')

  const locationRef = useRef(createMemoryLocation())
  const navigateRef = useRef(createMemoryNavigate())
  const storageRef = useRef(createMemoryStorage())
  const routeSyncRef = useRef(null)

  const routeSync = useMemo(() => {
    const rs = createRouteSync({
      schema: DEMO_SCHEMA,
      location: locationRef.current,
      navigate: navigateRef.current,
      storage: storageRef.current,
      debounceMs,
      historyMode,
      onHydrated: (state, info) => {
        setHydrationInfo(info)
      },
    })
    routeSyncRef.current = rs
    return rs
  }, [debounceMs, historyMode])

  const historyStats = useMemo(() => {
    return navigateRef.current.__getHistory()
  }, [uiState])

  const shareUrls = useMemo(() => {
    return routeSyncRef.current?.generateShareUrls() || { full: '', minimal: '' }
  }, [uiState])

  const handleStateChange = useCallback((fieldPath, value) => {
    const parts = fieldPath.split('.')
    setUiState((prev) => {
      const newState = JSON.parse(JSON.stringify(prev))
      let current = newState
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) current[parts[i]] = {}
        current = current[parts[i]]
      }
      current[parts[parts.length - 1]] = value
      return newState
    })
  }, [])

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
    if (!routeSyncRef.current) return
    const result = routeSyncRef.current.setState(uiState, { write: syncEnabled, immediate: true })
    setCurrentQueryString(locationRef.current.search)
  }, [uiState, syncEnabled])

  const handleLoadExample = useCallback((exampleKey) => {
    const example = EXAMPLES[exampleKey]
    if (!example) return

    setSelectedExample(exampleKey)
    locationRef.current.__setSearch(`?${example.queryString}`)

    const result = deserializeState(example.queryString, DEMO_SCHEMA)
    setWarnings(result.warnings)
    setUiState(result.state)

    navigateRef.current = createMemoryNavigate()
    setActiveTab('result')
  }, [])

  const handleHydrate = useCallback(() => {
    if (!routeSyncRef.current) return
    const result = routeSyncRef.current.hydrate()
    setUiState(result.state)
    setWarnings(result.warnings)
    setCurrentQueryString(locationRef.current.search)
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
    storageRef.current = createMemoryStorage()
    setUiState(getDefaults(DEMO_SCHEMA))
    setCurrentQueryString('')
    setWarnings([])
    setHydrationInfo(null)
    setSelectedExample(null)
    setActiveTab('editor')
  }, [])

  const toggleBooleanField = useCallback((fieldPath) => {
    const parts = fieldPath.split('.')
    setUiState((prev) => {
      const newState = JSON.parse(JSON.stringify(prev))
      let current = newState
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) current[parts[i]] = {}
        current = current[parts[i]]
      }
      current[parts[parts.length - 1]] = !current[parts[parts.length - 1]]
      return newState
    })
  }, [])

  return (
    <div style={{
      padding: '40px',
      maxWidth: '1200px',
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
          background: copyStatus.type === 'success' ? '#10b981' : '#ef4444',
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
          fontSize: '32px',
          marginBottom: '8px',
          color: '#0f172a',
          fontWeight: 700,
        }}>路由同步演示</h1>
        <p style={{
          color: '#64748b',
          fontSize: '16px',
          lineHeight: '1.6',
        }}>
          展示查询参数与 UI 状态的双向同步、防抖、历史策略、深层链接恢复等功能
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0',
      }}>
        {[
          { id: 'editor', label: '状态编辑器', icon: '✏️' },
          { id: 'result', label: '同步结果', icon: '📊' },
          { id: 'examples', label: '预置示例', icon: '📁' },
          { id: 'help', label: '功能说明', icon: '❓' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#64748b',
              fontSize: '15px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
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
          <div style={{
            background: 'white',
            borderRadius: '14px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
          }}>
            <h2 style={{
              fontSize: '20px',
              marginBottom: '24px',
              color: '#0f172a',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '24px' }}>🎛️</span>
              编辑状态
            </h2>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  color: '#334155',
                  fontSize: '14px',
                }}>
                  name (string)
                </label>
                <input
                  type="text"
                  value={uiState.name}
                  onChange={(e) => handleStateChange('name', e.target.value)}
                  placeholder="输入名称..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  color: '#334155',
                  fontSize: '14px',
                }}>
                  active (boolean)
                </label>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                }}>
                  <button
                    onClick={() => handleStateChange('active', true)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid',
                      borderColor: uiState.active ? '#10b981' : '#d1d5db',
                      borderRadius: '8px',
                      background: uiState.active ? '#ecfdf5' : 'white',
                      color: uiState.active ? '#059669' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    ✓ 是 (true)
                  </button>
                  <button
                    onClick={() => handleStateChange('active', false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid',
                      borderColor: !uiState.active ? '#64748b' : '#d1d5db',
                      borderRadius: '8px',
                      background: !uiState.active ? '#f8fafc' : 'white',
                      color: !uiState.active ? '#475569' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                  >
                    ✕ 否 (false)
                  </button>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  color: '#334155',
                  fontSize: '14px',
                }}>
                  count (number)
                </label>
                <input
                  type="number"
                  value={uiState.count}
                  onChange={(e) => handleStateChange('count', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                  color: '#334155',
                  fontSize: '14px',
                }}>
                  theme (enum: light | dark | auto)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {['light', 'dark', 'auto'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleStateChange('theme', theme)}
                      style={{
                        padding: '12px 16px',
                        border: '2px solid',
                        borderColor: uiState.theme === theme ? '#3b82f6' : '#d1d5db',
                        borderRadius: '8px',
                        background: uiState.theme === theme ? '#eff6ff' : 'white',
                        color: uiState.theme === theme ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                      }}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontWeight: 500,
                  color: '#334155',
                  fontSize: '14px',
                }}>
                  tags (array of strings)
                </label>
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
                      color: '#94a3b8',
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
                          flex: 1,
                          padding: '10px 14px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleRemoveTag(idx)}
                        style={{
                          padding: '10px 16px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
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
                    padding: '12px',
                    background: '#f1f5f9',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  + 添加标签
                </button>
              </div>

              <div style={{
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}>
                <h3 style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>📦</span>
                  config (嵌套对象)
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 500,
                      color: '#475569',
                      fontSize: '13px',
                    }}>
                      autoSave (boolean)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleStateChange('config.autoSave', true)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: '2px solid',
                          borderColor: uiState.config?.autoSave ? '#10b981' : '#d1d5db',
                          borderRadius: '8px',
                          background: uiState.config?.autoSave ? '#ecfdf5' : 'white',
                          color: uiState.config?.autoSave ? '#059669' : '#64748b',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        ✓ 启用
                      </button>
                      <button
                        onClick={() => handleStateChange('config.autoSave', false)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: '2px solid',
                          borderColor: !uiState.config?.autoSave ? '#64748b' : '#d1d5db',
                          borderRadius: '8px',
                          background: !uiState.config?.autoSave ? '#f8fafc' : 'white',
                          color: !uiState.config?.autoSave ? '#475569' : '#64748b',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        ✕ 禁用
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 500,
                      color: '#475569',
                      fontSize: '13px',
                    }}>
                      fontSize (number)
                    </label>
                    <input
                      type="number"
                      value={uiState.config?.fontSize}
                      onChange={(e) => handleStateChange('config.fontSize', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: 500,
                      color: '#475569',
                      fontSize: '13px',
                    }}>
                      language (string)
                    </label>
                    <input
                      type="text"
                      value={uiState.config?.language}
                      onChange={(e) => handleStateChange('config.language', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gap: '24px',
          }}>
            <div style={{
              background: 'white',
              borderRadius: '14px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
            }}>
              <h2 style={{
                fontSize: '20px',
                marginBottom: '24px',
                color: '#0f172a',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '24px' }}>⚙️</span>
                同步配置
              </h2>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    fontSize: '15px',
                  }}>
                    历史写入策略
                  </label>
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
                        borderColor: historyMode === HISTORY_MODES.PUSH ? '#3b82f6' : '#d1d5db',
                        borderRadius: '10px',
                        background: historyMode === HISTORY_MODES.PUSH ? '#eff6ff' : 'white',
                        color: historyMode === HISTORY_MODES.PUSH ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>📥 Push 模式</div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'normal',
                        color: historyMode === HISTORY_MODES.PUSH ? '#3b82f6' : '#94a3b8',
                      }}>
                        每次写入添加新历史条目，可后退
                      </div>
                    </button>
                    <button
                      onClick={() => setHistoryMode(HISTORY_MODES.REPLACE)}
                      style={{
                        padding: '16px',
                        border: '2px solid',
                        borderColor: historyMode === HISTORY_MODES.REPLACE ? '#3b82f6' : '#d1d5db',
                        borderRadius: '10px',
                        background: historyMode === HISTORY_MODES.REPLACE ? '#eff6ff' : 'white',
                        color: historyMode === HISTORY_MODES.REPLACE ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ marginBottom: '4px' }}>🔄 Replace 模式</div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'normal',
                        color: historyMode === HISTORY_MODES.REPLACE ? '#3b82f6' : '#94a3b8',
                      }}>
                        仅替换当前 URL，不污染后退栈
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    fontSize: '15px',
                  }}>
                    防抖延迟: <span style={{ color: '#3b82f6' }}>{debounceMs}ms</span>
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
                    color: '#94a3b8',
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
                  background: '#f8fafc',
                  borderRadius: '10px',
                }}>
                  <input
                    type="checkbox"
                    id="syncEnabled"
                    checked={syncEnabled}
                    onChange={(e) => setSyncEnabled(e.target.checked)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                    }}
                  />
                  <div>
                    <label htmlFor="syncEnabled" style={{
                      fontWeight: 600,
                      color: '#334155',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}>
                      启用 URL 自动同步
                    </label>
                    <div style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      marginTop: '2px',
                    }}>
                      禁用时仅在点击「同步到 URL」时才写入
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '14px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
            }}>
              <h2 style={{
                fontSize: '20px',
                marginBottom: '24px',
                color: '#0f172a',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '24px' }}>🚀</span>
                执行操作
              </h2>

              <div style={{ display: 'grid', gap: '14px' }}>
                <button
                  onClick={handleApplyState}
                  style={{
                    padding: '14px 24px',
                    background: syncEnabled ? '#3b82f6' : '#64748b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  {syncEnabled ? '🔄 立即同步到 URL' : '📤 手动同步到 URL'}
                </button>
                <button
                  onClick={handleHydrate}
                  style={{
                    padding: '14px 24px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  📥 从 URL 恢复状态
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '14px 24px',
                    background: 'white',
                    color: '#dc2626',
                    border: '2px solid #fecaca',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  🗑️ 重置所有状态
                </button>
              </div>
            </div>

            <div style={{
              background: '#fef3c7',
              borderRadius: '14px',
              padding: '24px',
              border: '1px solid #fcd34d',
            }}>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '12px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span>💡</span>
                使用提示
              </h3>
              <ul style={{
                color: '#78350f',
                fontSize: '13px',
                lineHeight: '1.8',
                paddingLeft: '20px',
                margin: 0,
              }}>
                <li>编辑左侧状态后，点击「同步到 URL」或等待防抖延迟</li>
                <li>切换到「同步结果」标签页查看生成的 URL 和警告</li>
                <li>「预置示例」标签页有三种预设查询串可快速加载</li>
              </ul>
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
          <div style={{
            background: 'white',
            borderRadius: '14px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
          }}>
            <h2 style={{
              fontSize: '20px',
              marginBottom: '24px',
              color: '#0f172a',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '24px' }}>🌐</span>
              当前 URL
            </h2>
            <pre style={{
              padding: '20px',
              background: '#0f172a',
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
              {locationRef.current.search || '(无查询参数)'}
            </pre>

            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '16px',
                color: '#334155',
              }}>
                📊 历史记录统计
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
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#3b82f6',
                    marginBottom: '4px',
                  }}>
                    {historyStats.pushCount}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                  }}>Push 次数</div>
                </div>
                <div style={{
                  padding: '16px 8px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    marginBottom: '4px',
                  }}>
                    {historyStats.replaceCount}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                  }}>Replace 次数</div>
                </div>
                <div style={{
                  padding: '16px 8px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#f59e0b',
                    marginBottom: '4px',
                  }}>
                    {historyStats.entries.length}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                  }}>总条目</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gap: '24px',
          }}>
            <div style={{
              background: 'white',
              borderRadius: '14px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
            }}>
              <h2 style={{
                fontSize: '20px',
                marginBottom: '24px',
                color: '#0f172a',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '24px' }}>🔗</span>
                分享链接
              </h2>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                    <label style={{
                      fontWeight: 600,
                      color: '#334155',
                      fontSize: '14px',
                    }}>完整链接 (包含所有字段)</label>
                    <span style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                    }}>{shareUrls.full.length} 字符</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={shareUrls.full}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontFamily: 'ui-monospace, monospace',
                        background: '#f8fafc',
                      }}
                    />
                    <button
                      onClick={() => handleCopy(shareUrls.full, '完整链接')}
                      style={{
                        padding: '12px 20px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      复制
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                    <label style={{
                      fontWeight: 600,
                      color: '#334155',
                      fontSize: '14px',
                    }}>最小链接 (只含非默认值)</label>
                    <span style={{
                      fontSize: '12px',
                      color: '#10b981',
                      fontWeight: 500,
                    }}>✓ {shareUrls.minimal.length} 字符</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={shareUrls.minimal}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontFamily: 'ui-monospace, monospace',
                        background: '#ecfdf5',
                        borderColor: '#6ee7b7',
                      }}
                    />
                    <button
                      onClick={() => handleCopy(shareUrls.minimal, '最小链接')}
                      style={{
                        padding: '12px 20px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      复制
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '14px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
            }}>
              <h2 style={{
                fontSize: '20px',
                marginBottom: '24px',
                color: '#0f172a',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                警告 (Warnings)
              </h2>

              {warnings.length === 0 ? (
                <div style={{
                  padding: '40px',
                  background: '#f0fdf4',
                  borderRadius: '10px',
                  border: '2px dashed #bbf7d0',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '12px',
                  }}>✅</div>
                  <div style={{
                    color: '#166534',
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
                      background: '#fffbeb',
                      border: '1px solid #fcd34d',
                      borderRadius: '10px',
                    }}>
                      <div style={{
                        fontWeight: 600,
                        color: '#92400e',
                        fontSize: '14px',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <span>⚠️</span>
                        {w.code}
                        {w.field && <span style={{ color: '#b45309', fontWeight: 'normal' }}>({w.field})</span>}
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
          </div>
        </div>
      )}

      {activeTab === 'examples' && (
        <div style={{
          background: 'white',
          borderRadius: '14px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{
            fontSize: '20px',
            marginBottom: '8px',
            color: '#0f172a',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '24px' }}>📁</span>
            预置示例
          </h2>
          <p style={{
            color: '#64748b',
            marginBottom: '28px',
            fontSize: '14px',
          }}>
            点击下方卡片加载预设的查询串，体验不同场景
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '20px',
          }}>
            <button
              onClick={() => handleLoadExample('valid')}
              style={{
                padding: '24px',
                border: '2px solid',
                borderColor: selectedExample === 'valid' ? '#10b981' : '#d1d5db',
                borderRadius: '14px',
                background: selectedExample === 'valid' ? '#ecfdf5' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                fontSize: '40px',
                marginBottom: '12px',
              }}>✅</div>
              <div style={{
                fontSize: '17px',
                fontWeight: 700,
                color: selectedExample === 'valid' ? '#059669' : '#0f172a',
                marginBottom: '8px',
              }}>
                合法查询串
              </div>
              <div style={{
                fontSize: '13px',
                color: selectedExample === 'valid' ? '#10b981' : '#64748b',
                lineHeight: '1.6',
                marginBottom: '12px',
              }}>
                所有参数均有效，无警告生成
              </div>
              <div style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '11px',
                color: '#475569',
                wordBreak: 'break-all',
                maxHeight: '60px',
                overflow: 'hidden',
              }}>
                {EXAMPLES.valid.queryString}
              </div>
            </button>

            <button
              onClick={() => handleLoadExample('partialInvalid')}
              style={{
                padding: '24px',
                border: '2px solid',
                borderColor: selectedExample === 'partialInvalid' ? '#f59e0b' : '#d1d5db',
                borderRadius: '14px',
                background: selectedExample === 'partialInvalid' ? '#fffbeb' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                fontSize: '40px',
                marginBottom: '12px',
              }}>⚠️</div>
              <div style={{
                fontSize: '17px',
                fontWeight: 700,
                color: selectedExample === 'partialInvalid' ? '#d97706' : '#0f172a',
                marginBottom: '8px',
              }}>
                部分非法查询串
              </div>
              <div style={{
                fontSize: '13px',
                color: selectedExample === 'partialInvalid' ? '#f59e0b' : '#64748b',
                lineHeight: '1.6',
                marginBottom: '12px',
              }}>
                包含无效布尔值、无效数值和未知字段
              </div>
              <div style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '11px',
                color: '#475569',
                wordBreak: 'break-all',
                maxHeight: '60px',
                overflow: 'hidden',
              }}>
                {EXAMPLES.partialInvalid.queryString}
              </div>
            </button>

            <button
              onClick={() => handleLoadExample('malicious')}
              style={{
                padding: '24px',
                border: '2px solid',
                borderColor: selectedExample === 'malicious' ? '#ef4444' : '#d1d5db',
                borderRadius: '14px',
                background: selectedExample === 'malicious' ? '#fef2f2' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                fontSize: '40px',
                marginBottom: '12px',
              }}>🛑</div>
              <div style={{
                fontSize: '17px',
                fontWeight: 700,
                color: selectedExample === 'malicious' ? '#dc2626' : '#0f172a',
                marginBottom: '8px',
              }}>
                恶意超长查询串
              </div>
              <div style={{
                fontSize: '13px',
                color: selectedExample === 'malicious' ? '#ef4444' : '#64748b',
                lineHeight: '1.6',
                marginBottom: '12px',
              }}>
                测试 URL 长度超限后的自动截断策略
              </div>
              <div style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '11px',
                color: '#475569',
                wordBreak: 'break-all',
                maxHeight: '60px',
                overflow: 'hidden',
              }}>
                {EXAMPLES.malicious.queryString.substring(0, 80)}...
              </div>
            </button>
          </div>

          <div style={{
            marginTop: '32px',
            padding: '24px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '16px',
              color: '#334155',
            }}>
              📋 可用的查询串示例 (直接复制测试)
            </h3>
            <div style={{
              display: 'grid',
              gap: '12px',
            }}>
              {Object.entries(EXAMPLES).map(([key, example]) => (
                <div key={key} style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    padding: '6px 12px',
                    background: '#e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    whiteSpace: 'nowrap',
                  }}>
                    {example.name}
                  </div>
                  <input
                    type="text"
                    value={`?${example.queryString}`}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'ui-monospace, monospace',
                      background: 'white',
                    }}
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => handleCopy(`?${example.queryString}`, example.name)}
                    style={{
                      padding: '10px 16px',
                      background: '#f1f5f9',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#475569',
                    }}
                  >
                    复制
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div style={{
          background: 'white',
          borderRadius: '14px',
          padding: '40px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{
            fontSize: '24px',
            marginBottom: '28px',
            color: '#0f172a',
            fontWeight: 600,
          }}>
            📖 功能说明
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}>
            {[
              {
                icon: '🔄',
                title: '双向同步',
                desc: 'UI 状态可序列化到 URL 查询参数，也可从 URL 反序列化回状态，实现无缝的链接分享与状态恢复。',
              },
              {
                icon: '📦',
                title: '嵌套对象支持',
                desc: '使用点号键展平，如 config.autoSave=true，支持任意层级的嵌套对象结构。',
              },
              {
                icon: '📋',
                title: '数组编码',
                desc: '使用重复键编码数组，如 tags=a&tags=b&tags=c，支持任意长度的字符串数组。',
              },
              {
                icon: '🎯',
                title: '智能类型转换',
                desc: '布尔值支持 true/false/1/0/yes/no/on/off 多种格式；数字自动解析；枚举值严格校验。',
              },
              {
                icon: '⚠️',
                title: '警告而非静默失败',
                desc: '非法参数不静默丢弃，生成 warnings 数组详细说明被剔除的字段、原因和原始值。',
              },
              {
                icon: '🔗',
                title: '压缩分享链接',
                desc: '「最小链接」自动去掉所有默认值字段，并稳定排序保证可比较，大幅缩短分享链接长度。',
              },
              {
                icon: '📜',
                title: '历史策略切换',
                desc: 'Push 模式每次添加新历史项，支持后退；Replace 模式仅替换当前项，避免污染后退栈。',
              },
              {
                icon: '⏱️',
                title: '防抖延迟',
                desc: '可配置 0-1000ms 的防抖延迟，避免快速输入时频繁触发 URL 写入。',
              },
              {
                icon: '🏷️',
                title: '版本计数器',
                desc: '内部维护版本计数器，并发编辑冲突时采用「最后一次写入胜出」策略。',
              },
              {
                icon: '🔗',
                title: '深层链接恢复',
                desc: '冷启动时触发 onHydrated 回调，支持 sessionStorage 备份，恢复失败时可回退到备份状态。',
              },
              {
                icon: '🛡️',
                title: '边界处理',
                desc: '超长 URL 自动截断并警告；+ 与 %20 语义一致；非法百分号序列安全处理不崩溃。',
              },
              {
                icon: '🌐',
                title: 'SSR 友好',
                desc: '无 history API 时仅解析不入写，兼容 SSR 和静态导出场景。',
              },
            ].map((item, idx) => (
              <div key={idx} style={{
                padding: '24px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '28px' }}>{item.icon}</span>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#0f172a',
                    margin: 0,
                  }}>
                    {item.title}
                  </h3>
                </div>
                <p style={{
                  color: '#475569',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {hydrationInfo && (
            <div style={{
              marginTop: '32px',
              padding: '24px',
              background: '#f0fdf4',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '16px',
                color: '#166534',
              }}>
                📊 最近一次恢复信息
              </h3>
              <pre style={{
                padding: '16px',
                background: 'white',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'ui-monospace, monospace',
                overflow: 'auto',
                margin: 0,
                border: '1px solid #d1fae5',
              }}>
                {JSON.stringify(hydrationInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
