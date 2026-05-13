import { useCallback, useEffect, useRef, useState } from 'react'
import './RestMockRulesDraftTool.css'
import {
    detectConflicts,
    groupConflictsByRule,
} from './logic/conflictDetection'
import {
    CORS_TEMPLATES,
    HTTP_METHODS,
    PATH_MATCH_TYPES,
    SHARE_PARAM_MAX_LENGTH,
} from './logic/constants'
import {
    generateCurlExample,
    generateJsonServerRoutes,
    getDraftSummary,
} from './logic/documentation'
import {
    clearFromLocalStorage,
    decodeShareUrl,
    encodeShareUrl,
    exportDraftToJson,
    importDraftFromText,
    loadFromLocalStorage,
    saveToLocalStorage,
} from './logic/importExport'
import {
    createDefaultRule,
    generateId,
    normalizeDraft,
    normalizeRule,
    reorderRules,
} from './logic/normalization'
import {
    tryExtractFromClipboardContent,
} from './logic/openapiParser'
import {
    detectPlaceholders,
    expandPlaceholders,
} from './logic/placeholders'
import {
    SCENARIOS,
    mergeScenario,
} from './logic/scenarios'
import {
    validateDraft,
} from './logic/validation'

const STATUS_CATEGORIES = {
  success: [200, 201, 202, 204, 206],
  redirect: [301, 302, 304],
  clientError: [400, 401, 403, 404, 409, 422, 429],
  serverError: [500, 502, 503],
}

function getStatusCategory(statusCode) {
  if (STATUS_CATEGORIES.success.includes(statusCode)) return 'success'
  if (STATUS_CATEGORIES.redirect.includes(statusCode)) return 'redirect'
  if (STATUS_CATEGORIES.clientError.includes(statusCode)) return 'client-error'
  return 'server-error'
}

function loadInitialDraft() {
  try {
    const params = new URLSearchParams(window.location.search)
    const shareData = params.get('draft')
    if (shareData) {
      const result = decodeShareUrl(shareData)
      if (result.success) {
        return normalizeDraft(result.draft)
      }
    }
  } catch (e) {
    console.warn('Failed to load share URL:', e)
  }

  try {
    const saved = loadFromLocalStorage()
    if (saved) {
      return normalizeDraft(saved)
    }
  } catch (e) {
    console.warn('Failed to load from localStorage:', e)
  }

  return {
    name: 'REST Mock Rules Draft',
    description: '',
    rules: [],
    baseUrl: 'http://localhost:3000',
  }
}

export default function RestMockRulesDraftTool() {
  const [draft, setDraft] = useState(loadInitialDraft)
  const [activeTab, setActiveTab] = useState('editor')
  const [selectedRuleId, setSelectedRuleId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [conflicts, setConflicts] = useState([])
  const [conflictsByRule, setConflictsByRule] = useState({})
  const [toast, setToast] = useState(null)
  const [jsonPrecheckEnabled, setJsonPrecheckEnabled] = useState(true)
  const [expandedAccordions, setExpandedAccordions] = useState({ scenarios: true, conflicts: true })

  const fileInputRef = useRef(null)
  const debounceTimerRef = useRef(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('已复制到剪贴板', 'success'))
      .catch(() => showToast('复制失败', 'error'))
  }, [showToast])

  useEffect(() => {
    try {
      saveToLocalStorage(draft)
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }
  }, [draft])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      const errors = validateDraft(draft, { jsonPrecheckEnabled })
      setValidationErrors(errors)

      const foundConflicts = detectConflicts(draft.rules)
      setConflicts(foundConflicts)
      setConflictsByRule(groupConflictsByRule(foundConflicts))
    }, 200)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [draft, jsonPrecheckEnabled])

  const handleExport = useCallback(() => {
    const json = exportDraftToJson(draft)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rest-mock-draft-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('已导出草稿', 'success')
  }, [draft, showToast])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileImport = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target.result
        const result = importDraftFromText(content)
        if (result.success) {
          setDraft(normalizeDraft(result.draft))
          setSelectedRuleId(null)
          showToast('已导入草稿', 'success')
        } else {
          showToast(result.error.message, 'error')
        }
      } catch (err) {
        showToast('导入失败：' + err.message, 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [showToast])

  const handleShare = useCallback(() => {
    try {
      const result = encodeShareUrl(draft)
      if (result.success) {
        const url = `${window.location.origin}${window.location.pathname}?draft=${result.param}`
        navigator.clipboard.writeText(url)
          .then(() => showToast('分享链接已复制到剪贴板', 'success'))
          .catch(() => showToast('链接生成成功，但复制失败', 'warning'))
      } else {
        showToast(result.error.message, 'error')
      }
    } catch (err) {
      showToast('生成分享链接失败：' + err.message, 'error')
    }
  }, [draft, showToast])

  const handleClear = useCallback(() => {
    if (window.confirm('确定要清除所有草稿数据吗？此操作不可撤销。')) {
      clearFromLocalStorage()
      setDraft({
        name: 'REST Mock Rules Draft',
        description: '',
        rules: [],
        baseUrl: 'http://localhost:3000',
      })
      setSelectedRuleId(null)
      const url = new URL(window.location.href)
      url.searchParams.delete('draft')
      window.history.replaceState({}, '', url.toString())
      showToast('已清除草稿', 'success')
    }
  }, [showToast])

  const handleAddRule = useCallback(() => {
    const newRule = createDefaultRule()
    setDraft(prev => ({
      ...prev,
      rules: [...prev.rules, newRule],
    }))
    setSelectedRuleId(newRule.id)
  }, [])

  const handleDuplicateRule = useCallback((ruleId) => {
    const rule = draft.rules.find(r => r.id === ruleId)
    if (!rule) return

    const duplicated = normalizeRule({
      ...rule,
      id: generateId(),
      path: rule.path + ' (copy)',
    })

    const index = draft.rules.findIndex(r => r.id === ruleId)
    const newRules = [...draft.rules]
    newRules.splice(index + 1, 0, duplicated)

    setDraft(prev => ({ ...prev, rules: newRules }))
    setSelectedRuleId(duplicated.id)
    showToast('已复制规则', 'success')
  }, [draft.rules, showToast])

  const handleDeleteRule = useCallback((ruleId) => {
    if (!window.confirm('确定要删除这条规则吗？')) return

    setDraft(prev => ({
      ...prev,
      rules: prev.rules.filter(r => r.id !== ruleId),
    }))

    if (selectedRuleId === ruleId) {
      setSelectedRuleId(null)
    }
    showToast('已删除规则', 'success')
  }, [selectedRuleId, showToast])

  const handleUpdateRule = useCallback((ruleId, updates) => {
    setDraft(prev => ({
      ...prev,
      rules: prev.rules.map(r =>
        r.id === ruleId ? normalizeRule({ ...r, ...updates }) : r
      ),
    }))
  }, [])

  const handleMergeScenario = useCallback((scenarioKey) => {
    const scenario = SCENARIOS[scenarioKey]
    if (!scenario) return

    setDraft(prev => mergeScenario(prev, scenario))
    showToast(`已添加场景：${scenario.name}`, 'success')
  }, [showToast])

  const handleOpenapiPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      const result = tryExtractFromClipboardContent(text)

      if (result.success && result.data.length > 0) {
        const newRules = result.data.map(r => normalizeRule(r))
        setDraft(prev => ({
          ...prev,
          rules: [...prev.rules, ...newRules],
        }))
        showToast(`已添加 ${newRules.length} 条规则（提示性预填，请手动校验）`, 'info')
      } else {
        showToast('无法从剪贴板内容解析 OpenAPI 路径。请确保粘贴的是有效的 OpenAPI 3.0+ 或 Swagger 2.0 片段。', 'warning')
      }
    } catch (err) {
      showToast('读取剪贴板失败：' + err.message, 'error')
    }
  }, [showToast])

  const handleMoveRule = useCallback((ruleId, direction) => {
    const index = draft.rules.findIndex(r => r.id === ruleId)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= draft.rules.length) return

    const newRules = reorderRules(draft.rules, index, newIndex)
    setDraft(prev => ({ ...prev, rules: newRules }))
  }, [draft.rules])

  const handleReorderDrop = useCallback((draggedId, targetId) => {
    if (draggedId === targetId) return

    const draggedIndex = draft.rules.findIndex(r => r.id === draggedId)
    const targetIndex = draft.rules.findIndex(r => r.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newRules = [...draft.rules]
    const [dragged] = newRules.splice(draggedIndex, 1)
    newRules.splice(targetIndex, 0, dragged)

    setDraft(prev => ({ ...prev, rules: newRules }))
  }, [draft.rules])

  const allTags = Array.from(new Set(draft.rules.flatMap(r => r.tags || []))).filter(Boolean)

  const filteredRules = draft.rules.filter(rule => {
    if (selectedTag && (!rule.tags || !rule.tags.includes(selectedTag))) {
      return false
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        rule.path.toLowerCase().includes(q) ||
        rule.description?.toLowerCase().includes(q) ||
        rule.tags?.some(t => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  const selectedRule = draft.rules.find(r => r.id === selectedRuleId)
  const summary = getDraftSummary(draft)
  const ruleValidationErrors = selectedRuleId ? validationErrors.rules?.[selectedRuleId] : []
  const ruleConflicts = selectedRuleId ? (conflictsByRule[selectedRuleId] || []) : []

  const [dragOverId, setDragOverId] = useState(null)

  return (
    <div className="rest-mock-draft-tool">
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json,.yaml,.yml"
        style={{ display: 'none' }}
      />

      <div className="main-header">
        <div>
          <h2>REST Mock Rules Draft</h2>
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-value">{summary.totalRules}</span>
              <span className="stat-label">规则数</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{summary.uniqueMethods}</span>
              <span className="stat-label">方法覆盖</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{summary.maxDelay}ms</span>
              <span className="stat-label">最大延迟</span>
            </div>
            {conflicts.length > 0 && (
              <div className="stat-item">
                <span className="stat-value" style={{ color: '#ef4444' }}>{conflicts.length}</span>
                <span className="stat-label">冲突</span>
              </div>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button className="primary-btn" onClick={handleAddRule}>
            + 添加规则
          </button>
          <button className="secondary-btn" onClick={handleExport}>
            导出 JSON
          </button>
          <button className="secondary-btn" onClick={handleImportClick}>
            导入
          </button>
          <button className="secondary-btn" onClick={handleShare}>
            分享链接
          </button>
          <button className="danger-btn" onClick={handleClear}>
            清除
          </button>
        </div>
      </div>

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          规则编辑
        </button>
        <button
          className={`tab-btn ${activeTab === 'scenarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('scenarios')}
        >
          场景包
        </button>
        <button
          className={`tab-btn ${activeTab === 'documentation' ? 'active' : ''}`}
          onClick={() => setActiveTab('documentation')}
        >
          配合说明
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="tool-panel">
          <div className="panel-header">
            <h3>草稿设置</h3>
            <div className="inline-flex">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={jsonPrecheckEnabled}
                  onChange={(e) => setJsonPrecheckEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>JSON 响应体预检</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>草稿名称</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Mock 服务地址</label>
              <input
                type="text"
                value={draft.baseUrl}
                onChange={(e) => setDraft(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="http://localhost:3000"
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>描述</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
              placeholder="可选的草稿描述..."
              rows={2}
            />
          </div>

          <div className="divider" />

          {draft.rules.length === 0 ? (
            <div className="empty-rules">
              <p>还没有任何规则</p>
              <div className="action-row" style={{ justifyContent: 'center' }}>
                <button className="primary-btn" onClick={handleAddRule}>
                  添加第一条规则
                </button>
                <button className="secondary-btn" onClick={() => setActiveTab('scenarios')}>
                  使用示例场景
                </button>
              </div>
            </div>
          ) : (
            <div className="split-view">
              <div className="list-panel">
                <div className="filter-bar">
                  <input
                    type="text"
                    placeholder="搜索路径、描述、标签..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {allTags.length > 0 && (
                    <div className="tag-filters">
                      <button
                        className={`tag-btn ${!selectedTag ? 'active' : ''}`}
                        onClick={() => setSelectedTag(null)}
                      >
                        全部
                      </button>
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
                          onClick={() => setSelectedTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rules-list">
                  {filteredRules.length === 0 ? (
                    <div className="empty-rules" style={{ padding: '2rem' }}>
                      没有匹配的规则
                    </div>
                  ) : (
                    filteredRules.map((rule, index) => {
                      const methodBadge = rule.methods.length === 1
                        ? rule.methods[0]
                        : 'MULTI'
                      const hasConflict = conflictsByRule[rule.id]?.length > 0

                      return (
                        <div
                          key={rule.id}
                          className={`rule-item ${selectedRuleId === rule.id ? 'active' : ''} ${hasConflict ? 'conflict' : ''}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', rule.id)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDragOverId(rule.id)
                          }}
                          onDragLeave={() => setDragOverId(null)}
                          onDrop={(e) => {
                            e.preventDefault()
                            setDragOverId(null)
                            const draggedId = e.dataTransfer.getData('text/plain')
                            handleReorderDrop(draggedId, rule.id)
                          }}
                          onClick={() => setSelectedRuleId(rule.id)}
                          style={{
                            borderColor: dragOverId === rule.id ? '#2563eb' : undefined,
                          }}
                        >
                          <span className="drag-handle" onClick={(e) => e.stopPropagation()}>
                            ⋮⋮
                          </span>
                          <span className={`rule-method-badge ${methodBadge}`}>
                            {methodBadge}
                          </span>
                          <span className="rule-path">
                            <small style={{ color: '#9ca3af' }}>
                              {PATH_MATCH_TYPES.find(t => t.value === rule.pathMatchType)?.label || '精确'}:
                            </small>{' '}
                            {rule.path}
                          </span>
                          <span className={`rule-status ${getStatusCategory(rule.statusCode)}`}>
                            {rule.statusCode}
                          </span>
                          <div className="rule-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="secondary-btn btn-sm"
                              onClick={() => handleMoveRule(rule.id, 'up')}
                              disabled={index === 0}
                            >
                              ↑
                            </button>
                            <button
                              className="secondary-btn btn-sm"
                              onClick={() => handleMoveRule(rule.id, 'down')}
                              disabled={index === filteredRules.length - 1}
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="editor-panel">
                {selectedRule ? (
                  <RuleEditor
                    rule={selectedRule}
                    errors={ruleValidationErrors}
                    conflicts={ruleConflicts}
                    jsonPrecheckEnabled={jsonPrecheckEnabled}
                    onUpdate={(updates) => handleUpdateRule(selectedRule.id, updates)}
                    onDuplicate={() => handleDuplicateRule(selectedRule.id)}
                    onDelete={() => handleDeleteRule(selectedRule.id)}
                    onOpenapiPaste={handleOpenapiPaste}
                    copyToClipboard={copyToClipboard}
                    baseUrl={draft.baseUrl}
                  />
                ) : (
                  <div className="empty-rules" style={{ border: 'none', padding: '2rem' }}>
                    选择一条规则进行编辑
                  </div>
                )}
              </div>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="divider" />
          )}

          {conflicts.length > 0 && (
            <div className="accordion-item">
              <div
                className="accordion-header"
                onClick={() => setExpandedAccordions(prev => ({ ...prev, conflicts: !prev.conflicts }))}
              >
                <h4>⚠️ 检测到 {conflicts.length} 个规则冲突</h4>
                <span>{expandedAccordions.conflicts ? '▼' : '▶'}</span>
              </div>
              {expandedAccordions.conflicts && (
                <div className="accordion-content expanded">
                  <div className="conflict-list">
                    {conflicts.map((conflict, index) => (
                      <div key={index} className="conflict-item">
                        <h5>{conflict.message}</h5>
                        <p>
                          <code>{conflict.errorCode}</code> — 路径: {conflict.path}，方法: {conflict.methods.join(', ')}
                        </p>
                        <p style={{ marginTop: '0.25rem' }}>
                          涉及规则: {conflict.ruleIds.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="tool-panel">
          <h3>静态场景包</h3>
          <p className="input-hint" style={{ marginBottom: '1rem' }}>
            点击下方按钮将示例场景合并到当前草稿。场景包含常用的 CRUD、分页和错误响应规则。
          </p>

          <div className="scenario-buttons">
            {Object.entries(SCENARIOS).map(([key, scenario]) => (
              <button
                key={key}
                className="scenario-btn"
                onClick={() => handleMergeScenario(key)}
              >
                {scenario.name}
              </button>
            ))}
          </div>

          <div className="divider" />

          <h3>从 OpenAPI 导入</h3>
          <div className="warning-box">
            <h4>⚠️ 提示性预填</h4>
            <p>
              将 OpenAPI 3.0+ 或 Swagger 2.0 片段复制到剪贴板，点击下方按钮进行弱解析。
              解析结果仅作为预填提示，不会静默声称已完整转换，请手动校验生成的规则。
            </p>
          </div>
          <button className="secondary-btn" onClick={handleOpenapiPaste}>
            从剪贴板解析 OpenAPI
          </button>
        </div>
      )}

      {activeTab === 'documentation' && (
        <div className="tool-panel">
          <div className="summary-card">
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-value">{summary.totalRules}</div>
                <div className="summary-label">总规则数</div>
              </div>
              <div className="summary-item">
                <div className="summary-value">{summary.uniquePaths}</div>
                <div className="summary-label">唯一路径</div>
              </div>
              <div className="summary-item">
                <div className="summary-value">{summary.uniqueMethods}</div>
                <div className="summary-label">方法覆盖</div>
              </div>
              <div className="summary-item">
                <div className="summary-value">{summary.maxDelay}ms</div>
                <div className="summary-label">最大延迟</div>
              </div>
              <div className="summary-item">
                <div className="summary-value">{summary.rulesWithProbability}</div>
                <div className="summary-label">概率触发</div>
              </div>
              <div className="summary-item">
                <div className="summary-value">{summary.rulesWithCors}</div>
                <div className="summary-label">CORS 规则</div>
              </div>
            </div>
          </div>

          <div className="divider" />

          {draft.rules.length > 0 && (
            <>
              <h3>cURL 示例</h3>
              <div className="accordion-item">
                {draft.rules.slice(0, 3).map((rule) => (
                  <div key={rule.id} className="accordion-item">
                    <div
                      className="accordion-header"
                      onClick={() => setExpandedAccordions(prev => ({
                        ...prev,
                        [`curl-${rule.id}`]: !prev[`curl-${rule.id}`],
                      }))}
                    >
                      <h4>
                        {rule.methods.join('/')} {rule.path}
                      </h4>
                      <span>{expandedAccordions[`curl-${rule.id}`] ? '▼' : '▶'}</span>
                    </div>
                    {expandedAccordions[`curl-${rule.id}`] && (
                      <div className="accordion-content expanded">
                        <div className="code-header">
                          <h4>curl 命令</h4>
                          <button
                            className="secondary-btn btn-sm"
                            onClick={() => copyToClipboard(generateCurlExample(rule, draft.baseUrl))}
                          >
                            复制
                          </button>
                        </div>
                        <pre className="code-block">
                          {generateCurlExample(rule, draft.baseUrl)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {draft.rules.length > 3 && (
                <p className="input-hint" style={{ marginTop: '0.5rem' }}>
                  还有 {draft.rules.length - 3} 条规则未显示...
                </p>
              )}

              <div className="divider" />

              <h3>JSON Server 风格路由</h3>
              <div className="code-header">
                <h4>routes.json 配置</h4>
                <button
                  className="secondary-btn btn-sm"
                  onClick={() => copyToClipboard(generateJsonServerRoutes(draft.rules))}
                >
                  复制
                </button>
              </div>
              <pre className="code-block">
                {generateJsonServerRoutes(draft.rules)}
              </pre>

              <div className="divider" />

              <h3>nginx 风格片段</h3>
              <div className="info-box">
                <h4>ℹ️ 使用说明</h4>
                <p>
                  以下是 nginx <code>location</code> 块的示例配置。这只是一个参考格式，
                  实际使用时需要根据您的 mock 服务器进行调整。
                </p>
              </div>
              <div className="accordion-item">
                {draft.rules.slice(0, 2).map((rule, idx) => {
                  const locationPath = rule.pathMatchType === 'prefix'
                    ? `^~ ${rule.path}`
                    : rule.pathMatchType === 'regex'
                    ? `~ ${rule.path}`
                    : `= ${rule.path}`

                  return (
                    <div key={rule.id} className="accordion-item">
                      <div
                        className="accordion-header"
                        onClick={() => setExpandedAccordions(prev => ({
                          ...prev,
                          [`nginx-${rule.id}`]: !prev[`nginx-${rule.id}`],
                        }))}
                      >
                        <h4>示例 {idx + 1}: {rule.path}</h4>
                        <span>{expandedAccordions[`nginx-${rule.id}`] ? '▼' : '▶'}</span>
                      </div>
                      {expandedAccordions[`nginx-${rule.id}`] && (
                        <div className="accordion-content expanded">
                          <pre className="code-block">{`location ${locationPath} {
    return ${rule.statusCode} '${typeof rule.responseBody === 'string' ? rule.responseBody : JSON.stringify(rule.responseBody)}';
    add_header Content-Type application/json;${rule.delay > 0 ? `
    # 延迟 ${rule.delay}ms (需要 ngx_http_echo_module 或其他模块支持)` : ''}
}`}</pre>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="notes-section">
            <h3>占位符说明</h3>
            <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>
              支持以下变量占位符（仅在预览中展示，不执行任意代码）：
            </p>
            <ul>
              <li><code>{`{{now}}`}</code> — 当前 ISO 时间戳，例如 <code>2024-01-15T10:30:00.000Z</code></li>
              <li><code>{`{{uuid}}`}</code> — 示例 UUID，例如 <code>550e8400-e29b-41d4-a716-446655440000</code></li>
            </ul>
          </div>

          <div className="notes-section">
            <h3>路径匹配类型</h3>
            <ul>
              <li><strong>精确匹配</strong> — 路径必须完全一致</li>
              <li><strong>前缀匹配</strong> — 请求路径以前缀开头即可匹配</li>
              <li><strong>正则匹配</strong> — 使用正则表达式匹配路径</li>
            </ul>
          </div>
        </div>
      )}

      <div className="notes-section">
        <h3>数据安全</h3>
        <ul>
          <li>所有数据存储在浏览器本地 <code>localStorage</code> 中</li>
          <li>不向任何外部服务器发送 HTTP 请求</li>
          <li>所有渲染使用纯文本，防 XSS 攻击</li>
          <li>分享链接最大长度 {SHARE_PARAM_MAX_LENGTH} 字符，超限自动拒绝</li>
        </ul>
      </div>
    </div>
  )
}

function RuleEditor({
  rule,
  errors,
  conflicts,
  jsonPrecheckEnabled,
  onUpdate,
  onDuplicate,
  onDelete,
  copyToClipboard,
  baseUrl,
}) {
  const pathErrors = errors.filter(e => e.field === 'path')
  const methodErrors = errors.filter(e => e.field === 'methods')
  const statusErrors = errors.filter(e => e.field === 'statusCode')
  const bodyErrors = errors.filter(e => e.field === 'responseBody')
  const delayErrors = errors.filter(e => e.field === 'delay')
  const probabilityErrors = errors.filter(e => e.field === 'probability')

  const detectedPlaceholders = detectPlaceholders(JSON.stringify(rule.responseBody || ''))
  const expandedPreview = detectedPlaceholders.length > 0
    ? expandPlaceholders(JSON.stringify(rule.responseBody || '', null, 2))
    : null

  const handleMethodToggle = (method) => {
    const newMethods = rule.methods.includes(method)
      ? rule.methods.filter(m => m !== method)
      : [...rule.methods, method]
    onUpdate({ methods: newMethods })
  }

  const handleHeaderUpdate = (index, field, value) => {
    const newHeaders = { ...rule.headers }
    const keys = Object.keys(newHeaders)
    const key = keys[index]
    if (field === 'key') {
      const oldValue = newHeaders[key]
      delete newHeaders[key]
      if (value) newHeaders[value] = oldValue
    } else {
      if (key) newHeaders[key] = value
    }
    onUpdate({ headers: newHeaders })
  }

  const handleAddHeader = () => {
    onUpdate({ headers: { ...rule.headers, '': '' } })
  }

  const handleRemoveHeader = (index) => {
    const newHeaders = { ...rule.headers }
    const keys = Object.keys(newHeaders)
    delete newHeaders[keys[index]]
    onUpdate({ headers: newHeaders })
  }

  const handleTagInput = (e) => {
    const value = e.target.value
    if (value.endsWith(',')) {
      const tag = value.slice(0, -1).trim()
      if (tag && !rule.tags?.includes(tag)) {
        onUpdate({ tags: [...(rule.tags || []), tag] })
      }
      e.target.value = ''
    }
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = e.target.value.trim()
      if (value && !rule.tags?.includes(value)) {
        onUpdate({ tags: [...(rule.tags || []), value] })
        e.target.value = ''
      }
    } else if (e.key === 'Backspace' && !e.target.value && rule.tags?.length > 0) {
      onUpdate({ tags: rule.tags.slice(0, -1) })
    }
  }

  const handleRemoveTag = (tag) => {
    onUpdate({ tags: rule.tags?.filter(t => t !== tag) })
  }

  const handleBodyChange = (value) => {
    onUpdate({ responseBody: value })
  }

  const [tagInput, setTagInput] = useState('')

  const headerEntries = Object.entries(rule.headers || {})

  return (
    <div>
      <div className="panel-header">
        <h3>编辑规则</h3>
        <div className="action-row" style={{ margin: 0 }}>
          <button className="secondary-btn btn-sm" onClick={onDuplicate}>
            复制
          </button>
          <button className="danger-btn btn-sm" onClick={onDelete}>
            删除
          </button>
        </div>
      </div>

      {(errors.length > 0 || conflicts.length > 0) && (
        <div className="error-box">
          <h4>⚠️ 规则有问题</h4>
          <ul>
            {errors.map((err, idx) => (
              <li key={`e-${idx}`}>
                <code>{err.code}</code> — {err.message}
              </li>
            ))}
            {conflicts.map((conflict, idx) => (
              <li key={`c-${idx}`}>
                <code>{conflict.errorCode}</code> — {conflict.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>路径匹配类型</label>
          <select
            value={rule.pathMatchType}
            onChange={(e) => onUpdate({ pathMatchType: e.target.value })}
          >
            {PATH_MATCH_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>路径</label>
          <input
            type="text"
            value={rule.path}
            onChange={(e) => onUpdate({ path: e.target.value })}
            placeholder="/api/users"
            className={pathErrors.length > 0 ? 'error' : ''}
          />
          {pathErrors.length > 0 && (
            <span className="input-error">{pathErrors[0].message}</span>
          )}
          <span className="input-hint">
            {rule.pathMatchType === 'regex' ? 'JavaScript 正则表达式语法' : '以 / 开头的 URL 路径'}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label>HTTP 方法</label>
        <div className="checkbox-group">
          {HTTP_METHODS.map(method => (
            <div key={method} className="checkbox-item">
              <input
                type="checkbox"
                id={`method-${method}-${rule.id}`}
                checked={rule.methods.includes(method)}
                onChange={() => handleMethodToggle(method)}
              />
              <label htmlFor={`method-${method}-${rule.id}`}>{method}</label>
            </div>
          ))}
        </div>
        {methodErrors.length > 0 && (
          <span className="input-error">{methodErrors[0].message}</span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>状态码</label>
          <input
            type="number"
            value={rule.statusCode}
            onChange={(e) => onUpdate({ statusCode: parseInt(e.target.value) || 200 })}
            min={100}
            max={599}
            className={statusErrors.length > 0 ? 'error' : ''}
          />
          {statusErrors.length > 0 && (
            <span className="input-error">{statusErrors[0].message}</span>
          )}
        </div>
        <div className="form-group">
          <label>延迟 (ms)</label>
          <input
            type="number"
            value={rule.delay}
            onChange={(e) => onUpdate({ delay: parseInt(e.target.value) || 0 })}
            min={0}
            max={60000}
            className={delayErrors.length > 0 ? 'error' : ''}
          />
          {delayErrors.length > 0 && (
            <span className="input-error">{delayErrors[0].message}</span>
          )}
        </div>
        <div className="form-group">
          <label>触发概率 (%)</label>
          <input
            type="number"
            value={rule.probability}
            onChange={(e) => onUpdate({ probability: parseInt(e.target.value) || 100 })}
            min={0}
            max={100}
            className={probabilityErrors.length > 0 ? 'error' : ''}
          />
          {probabilityErrors.length > 0 && (
            <span className="input-error">{probabilityErrors[0].message}</span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>描述</label>
        <input
          type="text"
          value={rule.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="可选的规则描述..."
        />
      </div>

      <div className="form-group">
        <label>标签</label>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem',
          padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '40px'
        }}>
          {(rule.tags || []).map(tag => (
            <span
              key={tag}
              className="tag-btn active"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                style={{
                  background: 'none', border: 'none', color: 'white', cursor: 'pointer',
                  padding: 0, fontSize: '0.8rem'
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              handleTagKeyDown(e)
              if (e.key === 'Enter' || e.key === ',') {
                setTagInput('')
              }
            }}
            onInput={(e) => {
              handleTagInput(e)
              if (e.target.value.endsWith(',')) {
                setTagInput('')
              }
            }}
            placeholder="输入标签后按回车或逗号..."
            style={{
              flex: 1, minWidth: '100px', border: 'none', outline: 'none', padding: '0.25rem',
              background: 'transparent'
            }}
          />
        </div>
        <span className="input-hint">按回车或逗号添加标签</span>
      </div>

      <div className="form-group">
        <label>CORS 头模板</label>
        <div className="radio-group">
          <div
            className={`radio-item ${rule.corsTemplate === 'none' ? 'active' : ''}`}
            onClick={() => onUpdate({ corsTemplate: 'none' })}
          >
            <input
              type="radio"
              checked={rule.corsTemplate === 'none'}
              onChange={() => onUpdate({ corsTemplate: 'none' })}
            />
            <label>无</label>
          </div>
          {Object.entries(CORS_TEMPLATES).map(([key, template]) => (
            <div
              key={key}
              className={`radio-item ${rule.corsTemplate === key ? 'active' : ''}`}
              onClick={() => onUpdate({ corsTemplate: key })}
            >
              <input
                type="radio"
                checked={rule.corsTemplate === key}
                onChange={() => onUpdate({ corsTemplate: key })}
              />
              <label>{template.name}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="form-group">
        <label>响应头 ({Object.keys(rule.headers || {}).length})</label>
        {headerEntries.length > 0 && (
          <table className="header-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Header Name</th>
                <th style={{ width: '50%' }}>Value</th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {headerEntries.map(([key, value], index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleHeaderUpdate(index, 'key', e.target.value)}
                      placeholder="Content-Type"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleHeaderUpdate(index, 'value', e.target.value)}
                      placeholder="application/json"
                    />
                  </td>
                  <td>
                    <button
                      className="danger-btn btn-sm remove-btn"
                      onClick={() => handleRemoveHeader(index)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="secondary-btn" onClick={handleAddHeader} style={{ marginTop: '0.5rem' }}>
          + 添加 Header
        </button>
      </div>

      <div className="divider" />

      <div className="form-group">
        <label>响应体</label>
        <textarea
          className={`large ${bodyErrors.length > 0 ? 'error' : ''}`}
          value={typeof rule.responseBody === 'string' ? rule.responseBody : JSON.stringify(rule.responseBody, null, 2)}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder={`{
  "message": "Hello World"
}`}
        />
        {jsonPrecheckEnabled && bodyErrors.length > 0 && (
          <span className="input-error">{bodyErrors[0].message}</span>
        )}
        <span className="input-hint">
          {jsonPrecheckEnabled ? 'JSON 预检已启用：无效 JSON 将显示错误' : 'JSON 预检已禁用'}
        </span>
      </div>

      {detectedPlaceholders.length > 0 && (
        <div className="placeholder-info">
          <h5>✨ 检测到占位符</h5>
          <div className="placeholder-list">
            {detectedPlaceholders.map((ph, idx) => (
              <span key={idx} className="placeholder-tag">{`{{${ph}}}`}</span>
            ))}
          </div>
          {expandedPreview && (
            <div className="preview-panel">
              <h5>预览展开效果（示例）</h5>
              <pre className="code-block" style={{ fontSize: '0.75rem', maxHeight: '150px' }}>
                {expandedPreview}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="divider" />

      <div className="code-header">
        <h4>cURL 示例</h4>
        <button
          className="secondary-btn btn-sm"
          onClick={() => copyToClipboard(generateCurlExample(rule, baseUrl))}
        >
          复制
        </button>
      </div>
      <pre className="code-block" style={{ fontSize: '0.75rem' }}>
        {generateCurlExample(rule, baseUrl)}
      </pre>
    </div>
  )
}
