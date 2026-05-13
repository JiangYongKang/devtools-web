import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './ChangelogDraftBuilderTool.css'
import { LARGE_TEXT_THRESHOLD, LOCAL_STORAGE_KEY } from './logic/errors.js'
import {
    COMMIT_EXTRACT_RULES,
    DATE_FORMATS,
    ERROR_CODES,
    ISSUE_LINK_TEMPLATES,
    ITEM_TYPES,
    MAX_SAFE_ITEMS,
    MAX_SAFE_OUTPUT_SIZE,
    MISSING_PLACEHOLDER_STRATEGIES,
    PLACEHOLDER_DOCS,
    TEMPLATES,
    addPrefixToItems,
    addPrefixToSelection,
    bumpVersion,
    createEmptyItem,
    extractCommitFromText,
    findPlaceholders,
    formatDate,
    generateChangelogDraft,
    getDefaultTemplate,
    reorderItems,
    validateSemVer
} from './logic/index.js'

const DEBOUNCE_DELAY = 250

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

const SAMPLE_ITEMS = [
  { id: 's1', type: 'feat', scope: 'auth', content: '添加用户认证功能', contentEn: 'Add user authentication', issue: '123' },
  { id: 's2', type: 'fix', scope: 'ui', content: '修复登录按钮布局问题', contentEn: 'Fix login button layout', issue: '124' },
  { id: 's3', type: 'BREAKING', scope: 'api', content: '重构 API 响应格式', contentEn: 'Refactor API response format', issue: '100' },
  { id: 's4', type: 'docs', scope: '', content: '更新 README 文档', contentEn: 'Update README documentation', issue: '' },
]

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      return data
    }
  } catch (e) {
    // ignore
  }
  return null
}

function saveToLocalStorage(state) {
  try {
    const toSave = {
      template: state.template,
      version: state.version,
      dateFormat: state.dateFormat,
      items: state.items,
      groupByType: state.groupByType,
      numbered: state.numbered,
      includeEnglish: state.includeEnglish,
      issueLinkTemplate: state.issueLinkTemplate,
      issueLinkTemplateId: state.issueLinkTemplateId,
      missingPlaceholderStrategy: state.missingPlaceholderStrategy,
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    // ignore
  }
}

export default function ChangelogDraftBuilderTool() {
  const savedState = useMemo(() => loadFromLocalStorage(), [])

  const [template, setTemplate] = useState(savedState?.template || getDefaultTemplate('keepachangelog').template)
  const [activeTemplateId, setActiveTemplateId] = useState(savedState?.activeTemplateId || 'keepachangelog')
  const [version, setVersion] = useState(savedState?.version || '1.0.0')
  const [dateFormat, setDateFormat] = useState(savedState?.dateFormat || 'local')
  const [items, setItems] = useState(savedState?.items || [])
  const [groupByType, setGroupByType] = useState(savedState?.groupByType ?? true)
  const [numbered, setNumbered] = useState(savedState?.numbered ?? false)
  const [includeEnglish, setIncludeEnglish] = useState(savedState?.includeEnglish ?? false)
  const [issueLinkTemplateId, setIssueLinkTemplateId] = useState(savedState?.issueLinkTemplateId || 'custom')
  const [issueLinkTemplate, setIssueLinkTemplate] = useState(savedState?.issueLinkTemplate || ISSUE_LINK_TEMPLATES.custom.template)
  const [missingPlaceholderStrategy, setMissingPlaceholderStrategy] = useState(savedState?.missingPlaceholderStrategy || 'empty')
  const [previewMode, setPreviewMode] = useState('rendered')
  const [renderResult, setRenderResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [selectedItemIds, setSelectedItemIds] = useState([])
  const [prefixText, setPrefixText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [commitPasteText, setCommitPasteText] = useState('')
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [showTemplateDocs, setShowTemplateDocs] = useState(false)

  const debounceTimeoutRef = useRef(null)

  const date = useMemo(() => {
    const result = formatDate(new Date(), dateFormat)
    return result.valid ? result.formatted : ''
  }, [dateFormat])

  const placeholdersInTemplate = useMemo(() => {
    return findPlaceholders(template)
  }, [template])

  const isLargeTemplate = template.length > LARGE_TEXT_THRESHOLD
  const totalItemSize = items.reduce((sum, item) => sum + (item.content?.length || 0) + (item.contentEn?.length || 0), 0)
  const isLargeItems = totalItemSize > LARGE_TEXT_THRESHOLD
  const shouldDebounce = isLargeTemplate || isLargeItems

  const updatePreview = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (shouldDebounce) {
      setIsProcessing(true)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const result = generateChangelogDraft({
        template,
        version,
        date,
        items,
        format: activeTemplateId,
        groupByType,
        numbered,
        includeEnglish,
        issueLinkTemplate,
        missingPlaceholderStrategy,
      })
      setRenderResult(result)
      setIsProcessing(false)
    }, shouldDebounce ? 500 : DEBOUNCE_DELAY)
  }, [template, version, date, items, activeTemplateId, groupByType, numbered, includeEnglish, issueLinkTemplate, missingPlaceholderStrategy, shouldDebounce])

  useEffect(() => {
    updatePreview()
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [updatePreview])

  useEffect(() => {
    const state = {
      template,
      version,
      dateFormat,
      items,
      groupByType,
      numbered,
      includeEnglish,
      issueLinkTemplate,
      issueLinkTemplateId,
      missingPlaceholderStrategy,
    }
    saveToLocalStorage(state)
  }, [template, version, dateFormat, items, groupByType, numbered, includeEnglish, issueLinkTemplate, issueLinkTemplateId, missingPlaceholderStrategy])

  const handleAddItem = useCallback(() => {
    const newItem = createEmptyItem()
    setItems(prev => [...prev, newItem])
  }, [])

  const handleRemoveItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id))
    setSelectedItemIds(prev => prev.filter(i => i !== id))
  }, [])

  const handleUpdateItem = useCallback((id, updates) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }, [])

  const handleApplyTemplate = useCallback((templateId) => {
    const templateObj = TEMPLATES[templateId]
    if (templateObj) {
      setActiveTemplateId(templateId)
      setTemplate(templateObj.template)
    }
  }, [])

  const handleApplySample = useCallback(() => {
    setItems(SAMPLE_ITEMS.map(item => ({ ...item, id: createEmptyItem().id })))
    setVersion('1.0.0')
  }, [])

  const handleClearAll = useCallback(() => {
    setItems([])
    setSelectedItemIds([])
    setCommitPasteText('')
  }, [])

  const handleResetTemplate = useCallback(() => {
    handleApplyTemplate(activeTemplateId)
  }, [activeTemplateId, handleApplyTemplate])

  const handleBumpVersion = useCallback((type) => {
    const result = bumpVersion(version, type)
    if (result.valid) {
      setVersion(result.version)
    }
  }, [version])

  const handleCopy = useCallback(async (content, label) => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopyStatus({ type: 'success', message: `${label} 已复制到剪贴板` })
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
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

  const handleDownload = useCallback(() => {
    if (!renderResult?.output) return
    const blob = new Blob([renderResult.output], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CHANGELOG-draft.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [renderResult])

  const handleExtractCommits = useCallback(() => {
    if (!commitPasteText.trim()) return
    const extracted = extractCommitFromText(commitPasteText)
    if (extracted.length > 0) {
      setItems(prev => [...prev, ...extracted])
      setCommitPasteText('')
    }
  }, [commitPasteText])

  const handleAppendFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && text.trim()) {
        const extracted = extractCommitFromText(text)
        if (extracted.length > 0) {
          setItems(prev => [...prev, ...extracted])
        }
      }
    } catch (err) {
      setCopyStatus({ type: 'error', message: '无法读取剪贴板：' + (err?.message || '未知错误') })
      setTimeout(() => setCopyStatus(null), 2500)
    }
  }, [])

  const handleApplyPrefix = useCallback(() => {
    if (!prefixText.trim()) return
    if (selectedItemIds.length > 0) {
      setItems(prev => addPrefixToSelection(prev, selectedItemIds, prefixText))
    } else {
      setItems(prev => addPrefixToItems(prev, prefixText))
    }
  }, [prefixText, selectedItemIds])

  const handleClearDraft = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    setTemplate(getDefaultTemplate('keepachangelog').template)
    setActiveTemplateId('keepachangelog')
    setVersion('1.0.0')
    setItems([])
    setSelectedItemIds([])
  }, [])

  const handleDragStart = useCallback((e, index) => {
    e.dataTransfer.setData('text/plain', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
      setItems(prev => reorderItems(prev, fromIndex, toIndex))
    }
    setDragOverIndex(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const toggleItemSelection = useCallback((id) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }, [])

  const selectAllItems = useCallback(() => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([])
    } else {
      setSelectedItemIds(items.map(i => i.id))
    }
  }, [items, selectedItemIds])

  const deleteSelectedItems = useCallback(() => {
    if (selectedItemIds.length === 0) return
    setItems(prev => prev.filter(item => !selectedItemIds.includes(item.id)))
    setSelectedItemIds([])
  }, [selectedItemIds])

  const handleIssueLinkTemplateChange = useCallback((templateId) => {
    setIssueLinkTemplateId(templateId)
    const templateObj = ISSUE_LINK_TEMPLATES[templateId]
    if (templateObj) {
      setIssueLinkTemplate(templateObj.template)
    }
  }, [])

  const versionValid = validateSemVer(version)

  const displayedItems = isLargeItems && items.length > 100 ? items.slice(0, 100) : items
  const isVirtual = items.length > 100

  return (
    <div className="changelog-draft-builder">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>发版草稿构建器</h2>
        
        <div className="standard-notice">
          <h4>📋 功能概览</h4>
          <ul>
            <li>支持多套预设模板：Keep a Changelog、简单列表、Conventional Commits、双语详细版</li>
            <li>支持自定义模板与 <code>{'{{version}}'}</code> <code>{'{{date}}'}</code> <code>{'{{sections}}'}</code> <code>{'{{items}}'}</code> 等占位符</li>
            <li>条目级功能：类型/Scope/Issue、双语、拖拽排序、批量前缀、Conventional Commits 智能提取</li>
            <li>安全策略：所有输出为纯文本，模板转义语法 <code>{'\\{{'}</code> <code>{'\\}}'}</code></li>
          </ul>
        </div>

        <div className="tool-grid">
          <div className="grid-column">
            <div className="form-group">
              <div className="textarea-header">
                <label>预设模板</label>
              </div>
              <div className="template-selector">
                {Object.values(TEMPLATES).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`template-btn ${activeTemplateId === t.id ? 'active' : ''}`}
                    onClick={() => handleApplyTemplate(t.id)}
                  >
                    <span className="name">{t.name}</span>
                    <span className="desc">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <div className="textarea-header">
                <label>自定义模板文本</label>
                <span className="char-count">{template.length} 字符</span>
              </div>
              <textarea
                className="template-editor"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="在此输入自定义模板，使用 {{placeholder}} 插入变量..."
                spellCheck={false}
              />
              <div className="button-row" style={{ marginTop: '8px' }}>
                <button className="secondary-btn icon-btn" onClick={handleResetTemplate}>
                  恢复预设模板
                </button>
                <button className="secondary-btn icon-btn" onClick={() => setShowTemplateDocs(!showTemplateDocs)}>
                  {showTemplateDocs ? '隐藏' : '显示'}占位符说明
                </button>
              </div>
              {showTemplateDocs && (
                <div className="placeholder-docs" style={{ marginTop: '8px' }}>
                  <h4>可用占位符</h4>
                  <div className="placeholder-list">
                    {PLACEHOLDER_DOCS.map(p => (
                      <div key={p.name} className="placeholder-item">
                        <code>{p.name}</code>
                        <span>{p.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="escape-note">
                转义语法：使用 <code>{'\\{{'}</code> 和 <code>{'\\}}'}</code> 输出字面量 <code>{'{{'}</code> 和 <code>{'}}'}</code>
              </div>
              {placeholdersInTemplate.length > 0 && (
                <div className="autocomplete-hint">
                  检测到占位符: {placeholdersInTemplate.map(p => p.key).join(', ')}
                </div>
              )}
            </div>

            <div className="split-view">
              <div className="form-group">
                <label>版本号 (SemVer)</label>
                <div className="version-input-group">
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    style={{ borderColor: !versionValid ? '#dc2626' : undefined }}
                  />
                  <div className="bump-buttons">
                    <button type="button" className="secondary-btn icon-btn" onClick={() => handleBumpVersion('major')}>
                      major
                    </button>
                    <button type="button" className="secondary-btn icon-btn" onClick={() => handleBumpVersion('minor')}>
                      minor
                    </button>
                    <button type="button" className="secondary-btn icon-btn" onClick={() => handleBumpVersion('patch')}>
                      patch
                    </button>
                  </div>
                </div>
                {!versionValid && version && (
                  <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                    ⚠️ 版本号不符合 SemVer 规范
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>日期格式</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                >
                  {DATE_FORMATS.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  当前: {date}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>未填充占位符策略</label>
              <div className="strategy-select">
                {MISSING_PLACEHOLDER_STRATEGIES.map(s => (
                  <div 
                    key={s.id} 
                    className={`strategy-option ${missingPlaceholderStrategy === s.id ? 'active' : ''}`}
                    onClick={() => setMissingPlaceholderStrategy(s.id)}
                  >
                    <input
                      type="radio"
                      id={`strategy-${s.id}`}
                      name="strategy"
                      checked={missingPlaceholderStrategy === s.id}
                      onChange={() => setMissingPlaceholderStrategy(s.id)}
                    />
                    <label htmlFor={`strategy-${s.id}`}>{s.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Issue 链接模板</label>
              <div className="form-row" style={{ alignItems: 'center' }}>
                <select
                  value={issueLinkTemplateId}
                  onChange={(e) => handleIssueLinkTemplateChange(e.target.value)}
                  style={{ flex: '0 0 120px' }}
                >
                  {Object.values(ISSUE_LINK_TEMPLATES).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={issueLinkTemplate}
                  onChange={(e) => {
                    setIssueLinkTemplate(e.target.value)
                    setIssueLinkTemplateId('custom')
                  }}
                  placeholder="使用 {{issue}} 作为变量"
                />
              </div>
            </div>

            <div className="form-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={groupByType}
                  onChange={(e) => setGroupByType(e.target.checked)}
                />
                按类型分组
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={numbered}
                  onChange={(e) => setNumbered(e.target.checked)}
                />
                自动编号
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeEnglish}
                  onChange={(e) => setIncludeEnglish(e.target.checked)}
                />
                显示英文列
              </label>
            </div>
          </div>

          <div className="grid-column">
            <div className="section-header">
              <h3>变更条目 ({items.length})</h3>
              <div className="stats-row">
                <span>上限: <code>{MAX_SAFE_ITEMS}</code></span>
              </div>
            </div>

            <div className="form-group">
              <label>从 Commit 文本智能提取（支持 Conventional Commits）</label>
              <textarea
                value={commitPasteText}
                onChange={(e) => setCommitPasteText(e.target.value)}
                placeholder="粘贴 commit 列表，每行一条 commit..."
                spellCheck={false}
                style={{ minHeight: '80px' }}
              />
              <div className="button-row" style={{ marginTop: '8px' }}>
                <button className="primary-btn icon-btn" onClick={handleExtractCommits}>
                  提取并追加
                </button>
                <button className="secondary-btn icon-btn" onClick={handleAppendFromClipboard}>
                  从剪贴板追加
                </button>
              </div>
              <div className="commit-extract-notice" style={{ marginTop: '8px' }}>
                <strong>提取规则：</strong>支持 <code>type(scope)!: subject</code> 格式，
                例如 <code>feat(api): add auth</code>、<code>fix!: breaking</code>。
                无法识别的 commit 将作为 <code>other</code> 类型。
              </div>
            </div>

            <div className="button-row">
              <button className="primary-btn" onClick={handleAddItem}>+ 添加条目</button>
              <button className="secondary-btn icon-btn" onClick={handleApplySample}>示例数据</button>
              <button className="secondary-btn icon-btn" onClick={handleClearAll}>清空</button>
              <button className="secondary-btn icon-btn" onClick={selectAllItems}>
                {selectedItemIds.length === items.length && items.length > 0 ? '取消全选' : '全选'}
              </button>
              {selectedItemIds.length > 0 && (
                <button className="danger-btn icon-btn" onClick={deleteSelectedItems}>
                  删除选中 ({selectedItemIds.length})
                </button>
              )}
            </div>

            {selectedItemIds.length > 0 && (
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>批量前缀（对 {selectedItemIds.length > 0 ? '选中条目' : '所有条目'}）</label>
                <div className="form-row" style={{ alignItems: 'center' }}>
                  <input
                    type="text"
                    value={prefixText}
                    onChange={(e) => setPrefixText(e.target.value)}
                    placeholder="输入前缀文本..."
                  />
                  <button 
                    className="secondary-btn icon-btn" 
                    onClick={handleApplyPrefix}
                    disabled={!prefixText.trim()}
                  >
                    应用前缀
                  </button>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📝</div>
                <div>暂无条目，点击「添加条目」或粘贴 commit 文本开始</div>
              </div>
            ) : (
              <div className="items-section">
                {isVirtual && (
                  <div className="info-banner" style={{ margin: '12px' }}>
                    大体量条目（{items.length} 条），仅渲染前 100 条。完整内容可在预览中查看。
                  </div>
                )}
                {displayedItems.map((item, index) => {
                  const isSelected = selectedItemIds.includes(item.id)
                  const isDragOver = dragOverIndex === index
                  
                  return (
                    <div key={item.id}>
                      {isDragOver && <div className="drop-indicator" />}
                      <div
                        className={`item-card ${isSelected ? 'selected' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="drag-handle">⋮⋮</div>
                        <div className="item-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemSelection(item.id)}
                          />
                        </div>
                        <div className="item-content">
                          <div className="item-row">
                            <select
                              className="type-select"
                              value={item.type}
                              onChange={(e) => handleUpdateItem(item.id, { type: e.target.value })}
                            >
                              {ITEM_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                            </select>
                            <input
                              className="scope-input"
                              type="text"
                              value={item.scope}
                              onChange={(e) => handleUpdateItem(item.id, { scope: e.target.value })}
                              placeholder="Scope"
                            />
                            <input
                              className="issue-input"
                              type="text"
                              value={item.issue}
                              onChange={(e) => handleUpdateItem(item.id, { issue: e.target.value })}
                              placeholder="Issue #"
                            />
                          </div>
                          <div className="item-row">
                            <input
                              className="content-input"
                              type="text"
                              value={item.content}
                              onChange={(e) => handleUpdateItem(item.id, { content: e.target.value })}
                              placeholder="变更内容（中文）..."
                            />
                          </div>
                          {includeEnglish && (
                            <div className="item-row">
                              <input
                                className="content-input"
                                type="text"
                                value={item.contentEn}
                                onChange={(e) => handleUpdateItem(item.id, { contentEn: e.target.value })}
                                placeholder="变更内容（English）..."
                              />
                            </div>
                          )}
                        </div>
                        <div className="item-actions">
                          <span className={`type-badge ${item.type}`}>{ITEM_TYPES.find(t => t.id === item.type)?.icon}</span>
                          <button
                            type="button"
                            className="danger-btn icon-btn"
                            onClick={() => handleRemoveItem(item.id)}
                            title="删除"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="tool-section">
        <div className="section-header">
          <h3>预览</h3>
          <div className="stats-row">
            {renderResult?.output && (
              <>
                <span>字符数: <code>{renderResult.output.length}</code></span>
                <span>上限: <code>{MAX_SAFE_OUTPUT_SIZE.toLocaleString()}</code></span>
              </>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="info-banner">
            ⏳ 渲染中...
          </div>
        )}

        <div className="preview-header">
          <div className="mode-buttons">
            <button
              type="button"
              className={`mode-btn ${previewMode === 'rendered' ? 'active' : ''}`}
              onClick={() => setPreviewMode('rendered')}
            >
              渲染结果
            </button>
            <button
              type="button"
              className={`mode-btn ${previewMode === 'source' ? 'active' : ''}`}
              onClick={() => setPreviewMode('source')}
            >
              源码
            </button>
          </div>
          <div className="button-row">
            <button 
              className="primary-btn" 
              onClick={() => handleCopy(renderResult?.output || '', '发版草稿')}
              disabled={!renderResult?.output}
            >
              复制全文
            </button>
            <button 
              className="secondary-btn" 
              onClick={handleDownload}
              disabled={!renderResult?.output}
            >
              下载 CHANGELOG-draft.md
            </button>
            <button 
              className="danger-btn" 
              onClick={handleClearDraft}
            >
              清除本地草稿
            </button>
          </div>
        </div>

        {renderResult?.errorCode === ERROR_CODES.MISSING_PLACEHOLDER && missingPlaceholderStrategy === 'error' && (
          <div className="error-box">
            <h3>⚠️ 存在未填充的占位符</h3>
            <div className="error-code">
              <span className="error-label">错误码</span>
              <code>{renderResult.errorCode}</code>
            </div>
            <p>{renderResult.error?.message}</p>
            {renderResult.error?.details?.placeholders && (
              <p>未填充的占位符: {renderResult.error.details.placeholders.join(', ')}</p>
            )}
          </div>
        )}

        {renderResult?.errorCode === ERROR_CODES.INVALID_TEMPLATE && (
          <div className="error-box">
            <h3>❌ 模板语法错误</h3>
            <div className="error-code">
              <span className="error-label">错误码</span>
              <code>{renderResult.errorCode}</code>
            </div>
            <p>{renderResult.error?.message}</p>
            {renderResult.error?.details?.reason && (
              <p>原因: {renderResult.error.details.reason}</p>
            )}
          </div>
        )}

        {renderResult?.errorCode === ERROR_CODES.CIRCULAR_REFERENCE && (
          <div className="error-box">
            <h3>❌ 模板循环引用</h3>
            <div className="error-code">
              <span className="error-label">错误码</span>
              <code>{renderResult.errorCode}</code>
            </div>
            <p>{renderResult.error?.message}</p>
          </div>
        )}

        {renderResult?.errorCode === ERROR_CODES.INPUT_TOO_LARGE && (
          <div className="error-box">
            <h3>❌ 输出内容过大</h3>
            <div className="error-code">
              <span className="error-label">错误码</span>
              <code>{renderResult.errorCode}</code>
            </div>
            <p>{renderResult.error?.message}</p>
            {renderResult.error?.details && (
              <p>实际: {renderResult.error.details.actualSize?.toLocaleString()} 字符 / 上限: {renderResult.error.details.maxSize?.toLocaleString()} 字符</p>
            )}
          </div>
        )}

        {renderResult?.errorCode === ERROR_CODES.TOO_MANY_ITEMS && (
          <div className="error-box">
            <h3>❌ 条目数量超出上限</h3>
            <div className="error-code">
              <span className="error-label">错误码</span>
              <code>{renderResult.errorCode}</code>
            </div>
            <p>{renderResult.error?.message}</p>
            {renderResult.error?.details && (
              <p>实际: {renderResult.error.details.actual} 条 / 上限: {renderResult.error.details.max} 条</p>
            )}
          </div>
        )}

        {renderResult?.output && (
          <>
            {renderResult.valid ? (
              <div className="success-box" style={{ marginBottom: '12px' }}>
                <h3>✅ 渲染成功</h3>
                {renderResult.missingPlaceholders?.length > 0 && missingPlaceholderStrategy !== 'error' && (
                  <p>提示: 以下占位符未填充，已按策略处理: {renderResult.missingPlaceholders.join(', ')}</p>
                )}
              </div>
            ) : renderResult.errorCode === ERROR_CODES.MISSING_PLACEHOLDER && missingPlaceholderStrategy !== 'error' ? (
              <div className="info-banner" style={{ marginBottom: '12px' }}>
                仅渲染模式：未填充的占位符已按策略处理（不阻断预览）
              </div>
            ) : null}
            
            <textarea
              className="preview"
              value={renderResult.output}
              readOnly
              spellCheck={false}
            />
          </>
        )}

        {!renderResult && !isProcessing && (
          <div className="empty-state">
            <div className="icon">📋</div>
            <div>添加条目或点击「示例数据」查看预览效果</div>
          </div>
        )}
      </section>

      <section className="notes-section">
        <h4>📖 使用说明与限制</h4>
        <ul>
          <li>
            <strong>模板占位符：</strong>
            <ul>
              <li><code>{'{{version}}'}</code> - 版本号（SemVer 校验，支持 major/minor/patch bump）</li>
              <li><code>{'{{date}}'}</code> - 发布日期（支持 ISO/本地短日期/时间戳格式）</li>
              <li><code>{'{{sections}}'}</code> - 按类型分组的所有变更</li>
              <li><code>{'{{items}}'}</code> - 扁平化的所有变更条目</li>
              <li><code>{'\\{{'}</code> / <code>{'\\}}'}</code> - 输出字面量大括号</li>
            </ul>
          </li>
          <li>
            <strong>条目功能：</strong>
            <ul>
              <li>类型: feat/fix/BREAKING/refactor/perf/docs/style/test/ci/chore/other</li>
              <li>支持 Scope、Issue 链接模板、中英文双语</li>
              <li>拖拽排序、批量前缀插入、全选批量删除</li>
              <li>Conventional Commits 智能提取：<code>type(scope)!: subject</code></li>
            </ul>
          </li>
          <li>
            <strong>安全策略：</strong>
            <ul>
              <li>所有渲染为纯文本，禁止执行用户模板中的脚本</li>
              <li>支持模板变量转义语法 <code>{'\\{{'}</code> <code>{'\\}}'}</code></li>
              <li>检测循环引用的占位符并报错</li>
            </ul>
          </li>
          <li>
            <strong>体积限制：</strong>
            <ul>
              <li>条目数上限: <code>{MAX_SAFE_ITEMS}</code> 条</li>
              <li>输出上限: <code>{(MAX_SAFE_OUTPUT_SIZE / 1024 / 1024).toFixed(0)}MB</code></li>
              <li>超过 100KB 自动启用节流模式</li>
              <li>超过 100 条启用虚拟列表（仅渲染可见部分）</li>
            </ul>
          </li>
          <li>
            <strong>数据持久化：</strong>
            <ul>
              <li>当前模板与条目自动保存到 localStorage（键名: <code>{LOCAL_STORAGE_KEY}</code>）</li>
              <li>可随时点击「清除本地草稿」重置</li>
            </ul>
          </li>
          <li>
            <strong>错误码说明：</strong>
            <ul>
              <li><code>{ERROR_CODES.MISSING_PLACEHOLDER}</code>：存在未填充的占位符（标红策略）</li>
              <li><code>{ERROR_CODES.INVALID_TEMPLATE}</code>：模板语法错误（如未配对的大括号）</li>
              <li><code>{ERROR_CODES.CIRCULAR_REFERENCE}</code>：模板存在循环引用</li>
              <li><code>{ERROR_CODES.INVALID_VERSION}</code>：版本号不符合 SemVer</li>
              <li><code>{ERROR_CODES.TOO_MANY_ITEMS}</code>：条目数量超出上限</li>
              <li><code>{ERROR_CODES.INPUT_TOO_LARGE}</code>：输出内容超出大小上限</li>
            </ul>
          </li>
        </ul>
        <div style={{ marginTop: '16px' }}>
          <details>
            <summary style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: '500' }}>
              查看 Commit 提取完整规则
            </summary>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              background: '#f8fafc', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '13px',
              marginTop: '8px',
              border: '1px solid #e2e8f0'
            }}>{COMMIT_EXTRACT_RULES}</pre>
          </details>
        </div>
      </section>
    </div>
  )
}
