import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EXAMPLES,
  SEARCH_MODES,
  MATCH_STATES,
  ERROR_CODES,
  CURRENT_TABLE_VERSION,
  CATEGORY_LABELS,
  getErrorMessage,
  getTableInfo,
  processExtensionsLookup,
  processMimeLookup,
  processFileHeader,
  loadOverrides,
  saveOverrides,
  addOverride,
  removeOverride,
  exportOverrides,
  importOverrides,
  downloadCsvFromResults,
  exportTsvFromResults,
  debounce,
} from './logic/index.js'
import './ExtensionMimeLookupTool.css'

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

export default function ExtensionMimeLookupTool() {
  const [activeTab, setActiveTab] = useState(SEARCH_MODES.EXTENSION_TO_MIME)
  const [tableVersion, setTableVersion] = useState(CURRENT_TABLE_VERSION)
  const [overrides, setOverrides] = useState([])

  const [extInput, setExtInput] = useState('')
  const [mimeInput, setMimeInput] = useState('')

  const [fuzzy, setFuzzy] = useState(false)
  const [fuzzyMode, setFuzzyMode] = useState('substring')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [showMissOnly, setShowMissOnly] = useState(false)

  const [lookupResult, setLookupResult] = useState(null)
  const [fileResult, setFileResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

  const [newOverrideExt, setNewOverrideExt] = useState('')
  const [newOverrideMime, setNewOverrideMime] = useState('')
  const [newOverrideCategory, setNewOverrideCategory] = useState('other')

  const fileInputRef = useRef(null)

  const tableInfo = getTableInfo(tableVersion)

  useEffect(() => {
    const loaded = loadOverrides()
    setOverrides(loaded)
  }, [])

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

  const handleLoadExample = useCallback((exampleType) => {
    setLookupResult(null)
    setFileResult(null)
    switch (exampleType) {
      case 'ext-basic':
        setExtInput(EXAMPLES.extensionToMime)
        setActiveTab(SEARCH_MODES.EXTENSION_TO_MIME)
        break
      case 'mime-basic':
        setMimeInput(EXAMPLES.mimeToExtension)
        setActiveTab(SEARCH_MODES.MIME_TO_EXTENSION)
        break
      default:
        break
    }
  }, [])

  const handleToggleCategory = useCallback((cat) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat)
      }
      return [...prev, cat]
    })
  }, [])

  const handleLookupExtensions = useCallback(() => {
    const result = processExtensionsLookup(extInput, {
      tableVersion,
      overrides,
      fuzzy,
      fuzzyMode,
      categories: selectedCategories.length > 0 ? selectedCategories : null,
    })
    setLookupResult(result)
    setFileResult(null)
  }, [extInput, tableVersion, overrides, fuzzy, fuzzyMode, selectedCategories])

  const handleLookupMimes = useCallback(() => {
    const result = processMimeLookup(mimeInput, {
      tableVersion,
      overrides,
      fuzzy,
      fuzzyMode,
      categories: selectedCategories.length > 0 ? selectedCategories : null,
    })
    setLookupResult(result)
    setFileResult(null)
  }, [mimeInput, tableVersion, overrides, fuzzy, fuzzyMode, selectedCategories])

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await processFileHeader(file, {
      tableVersion,
      overrides,
    })
    setFileResult(result)
    setLookupResult(null)
  }, [tableVersion, overrides])

  const handleAddOverride = useCallback(() => {
    if (!newOverrideExt.trim() || !newOverrideMime.trim()) {
      return
    }
    const result = addOverride(overrides, {
      extension: newOverrideExt.trim(),
      mime: newOverrideMime.trim(),
      category: newOverrideCategory,
      priority: 100,
      isRecommended: false,
    })
    if (result.success) {
      setOverrides(result.overrides)
      saveOverrides(result.overrides)
      setNewOverrideExt('')
      setNewOverrideMime('')
    }
  }, [overrides, newOverrideExt, newOverrideMime, newOverrideCategory])

  const handleRemoveOverride = useCallback((ext, mime) => {
    const result = removeOverride(overrides, ext, mime)
    if (result.success) {
      setOverrides(result.overrides)
      saveOverrides(result.overrides)
    }
  }, [overrides])

  const handleExportOverrides = useCallback(() => {
    const jsonStr = exportOverrides(overrides)
    handleCopy(jsonStr, '覆盖表 JSON')
  }, [overrides, handleCopy])

  const handleImportOverrides = useCallback(async () => {
    const input = prompt('粘贴覆盖表 JSON（数组格式）：')
    if (!input) return
    const result = importOverrides(input)
    if (result.success) {
      setOverrides(result.overrides)
      saveOverrides(result.overrides)
      alert(`导入成功：${result.totalImported} 条${result.totalInvalid > 0 ? `，忽略 ${result.totalInvalid} 条无效数据` : ''}`)
    } else {
      alert(`导入失败：${result.error?.errorMessage || '未知错误'}`)
    }
  }, [])

  const handleClear = useCallback(() => {
    setExtInput('')
    setMimeInput('')
    setLookupResult(null)
    setFileResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleExportCsv = useCallback(() => {
    if (!lookupResult) return
    const csv = downloadCsvFromResults(lookupResult)
    if (!csv) return
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mime-lookup-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [lookupResult])

  const handleCopyTsv = useCallback(() => {
    if (!lookupResult) return
    const tsv = exportTsvFromResults(lookupResult)
    if (!tsv) return
    handleCopy(tsv, 'TSV 结果')
  }, [lookupResult, handleCopy])

  const renderErrorBox = (error) => {
    if (!error) return null
    return (
      <div className="error-box">
        <strong>错误</strong>
        <p>{error.errorMessage}</p>
        {error.errorCode && (
          <div className="error-code">错误码：{error.errorCode}</div>
        )}
      </div>
    )
  }

  const renderMatchState = (state) => {
    const configs = {
      [MATCH_STATES.MATCH]: {
        className: 'match-state match',
        label: '一致',
        icon: '✓',
      },
      [MATCH_STATES.CONFLICT]: {
        className: 'match-state conflict',
        label: '冲突',
        icon: '✗',
      },
      [MATCH_STATES.UNKNOWN]: {
        className: 'match-state unknown',
        label: '未知',
        icon: '?',
      },
    }
    const config = configs[state] || configs[MATCH_STATES.UNKNOWN]
    return (
      <div className={config.className}>
        <span className="match-icon">{config.icon}</span>
        <span className="match-label">{config.label}</span>
      </div>
    )
  }

  const renderLookupResults = () => {
    if (!lookupResult) return null

    if (!lookupResult.success) {
      return renderErrorBox(lookupResult.error)
    }

    const displayResults = showMissOnly
      ? lookupResult.results.filter((r) => !r.hasHit)
      : lookupResult.results

    return (
      <div className="result-box">
        <div className="result-header">
          <div className="result-stats">
            <span className="result-label">查询结果</span>
            <span className="stat-item">共 {lookupResult.totalItems} 项</span>
            <span className="stat-item success">命中 {lookupResult.hitCount}</span>
            <span className="stat-item muted">未命中 {lookupResult.missCount}</span>
            {lookupResult.isFuzzy && (
              <span className="stat-item info">
                模糊模式：{lookupResult.fuzzyMode === 'prefix' ? '前缀匹配' : '子串搜索'}
              </span>
            )}
            {showMissOnly && (
              <span className="stat-item warning">仅显示未命中</span>
            )}
          </div>
          <div className="result-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleCopyTsv}>
              复制 TSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCsv}>
              下载 CSV
            </button>
          </div>
        </div>
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>输入</th>
                <th>归一化</th>
                <th>状态</th>
                <th>匹配详情</th>
              </tr>
            </thead>
            <tbody>
              {displayResults.map((item, idx) => (
                <tr key={idx} className={!item.hasHit ? 'row-miss' : ''}>
                  <td>{idx + 1}</td>
                  <td><code>{escapeHtml(item.query)}</code></td>
                  <td><code>{escapeHtml(item.normalized)}</code></td>
                  <td>
                    <span className={`status-badge ${item.hasHit ? 'hit' : 'miss'}`}>
                      {item.hasHit ? `${item.hitCount} 项` : '未命中'}
                    </span>
                  </td>
                  <td>
                    {item.results.length > 0 ? (
                      <div className="match-details">
                        {item.results.map((entry, eidx) => (
                          <div key={eidx} className="match-entry">
                            {activeTab === SEARCH_MODES.EXTENSION_TO_MIME ? (
                              <>
                                <code className="mime-type">{escapeHtml(entry.mime)}</code>
                                {entry.isRecommended && (
                                  <span className="badge recommended">推荐</span>
                                )}
                              </>
                            ) : (
                              <>
                                <code className="extension">.{escapeHtml(entry.extension)}</code>
                                {entry.isRecommended && (
                                  <span className="badge recommended">推荐</span>
                                )}
                              </>
                            )}
                            <span className="category-tag">
                              {CATEGORY_LABELS[entry.category] || entry.category}
                            </span>
                            {entry.isOverride && (
                              <span className="badge override">覆盖</span>
                            )}
                            <span className="priority">p:{entry.priority}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="no-match">-</span>
                    )}
                    {activeTab === SEARCH_MODES.MIME_TO_EXTENSION && item.recommendedExtension && (
                      <div className="recommended-extension">
                        推荐扩展名：
                        <code>.{escapeHtml(item.recommendedExtension.extension)}</code>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderFileResults = () => {
    if (!fileResult) return null

    if (!fileResult.success) {
      return renderErrorBox(fileResult.error)
    }

    return (
      <div className="result-box">
        <div className="result-header">
          <span className="result-label">文件头检测结果</span>
          {renderMatchState(fileResult.matchState)}
        </div>
        <div className="result-info">
          <div className="info-item">
            <span className="info-label">文件名</span>
            <code>{escapeHtml(fileResult.fileInfo.name)}</code>
          </div>
          <div className="info-item">
            <span className="info-label">文件大小</span>
            <code>{fileResult.fileInfo.size} bytes</code>
          </div>
          <div className="info-item">
            <span className="info-label">扩展名</span>
            <code>.{escapeHtml(fileResult.fileInfo.extension || '(无)')}</code>
          </div>
          <div className="info-item">
            <span className="info-label">读取字节</span>
            <code>{fileResult.fileInfo.headerBytes} bytes</code>
          </div>
          <div className="info-item full-width">
            <span className="info-label">文件头（十六进制预览）</span>
            <code className="hex-preview">{escapeHtml(fileResult.fileInfo.hexPreview)}...</code>
          </div>
          <div className="info-item full-width">
            <span className="info-label">检测说明</span>
            <p>{escapeHtml(fileResult.explanation)}</p>
          </div>
        </div>

        {fileResult.inferredMatches.length > 0 && (
          <div className="inferred-section">
            <h4>从魔数推断的 MIME 类型</h4>
            <div className="match-details">
              {fileResult.inferredMatches.map((match, idx) => (
                <div key={idx} className="match-entry">
                  <code className="mime-type">{escapeHtml(match.mime)}</code>
                  <span className="category-tag">{escapeHtml(match.description)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="extension-mime-lookup">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="main-card">
        <div className="card-header">
          <h1 className="card-title">扩展名 / MIME 双向查询</h1>
          <p className="card-subtitle">
            内置可版本化对照表，支持模糊搜索、批量查询、魔数校验与本地覆盖
          </p>
        </div>

        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === SEARCH_MODES.EXTENSION_TO_MIME ? 'active' : ''}`}
            onClick={() => setActiveTab(SEARCH_MODES.EXTENSION_TO_MIME)}
          >
            <span className="tab-icon">📄</span>
            <span>扩展名 → MIME</span>
          </button>
          <button
            className={`tab-btn ${activeTab === SEARCH_MODES.MIME_TO_EXTENSION ? 'active' : ''}`}
            onClick={() => setActiveTab(SEARCH_MODES.MIME_TO_EXTENSION)}
          >
            <span className="tab-icon">🔗</span>
            <span>MIME → 扩展名</span>
          </button>
          <button
            className={`tab-btn ${activeTab === SEARCH_MODES.FILE_HEADER ? 'active' : ''}`}
            onClick={() => setActiveTab(SEARCH_MODES.FILE_HEADER)}
          >
            <span className="tab-icon">🔍</span>
            <span>文件头检测</span>
          </button>
        </div>

        <div className="card-body">
          <div className="settings-panel">
            <div className="setting-group">
              <label className="setting-label">数据表版本</label>
              <select
                value={tableVersion}
                onChange={(e) => setTableVersion(e.target.value)}
                className="policy-select"
              >
                {tableInfo.allVersions.map((v) => (
                  <option key={v} value={v}>
                    {v} ({getTableInfo(v).count} 条记录)
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label className="setting-label">分类筛选</label>
              <div className="category-tags">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                  const catInfo = tableInfo.categories.find((c) => c.id === key)
                  return (
                    <button
                      key={key}
                      className={`chip ${selectedCategories.includes(key) ? 'chip-active' : ''}`}
                      onClick={() => handleToggleCategory(key)}
                      type="button"
                    >
                      {label}
                      <span className="chip-count">{catInfo?.count || 0}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {activeTab !== SEARCH_MODES.FILE_HEADER && (
              <div className="setting-group">
                <label className="setting-label">搜索选项</label>
                <div className="option-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={fuzzy}
                      onChange={(e) => setFuzzy(e.target.checked)}
                    />
                    <span>启用模糊搜索</span>
                  </label>
                  {fuzzy && (
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="fuzzyMode"
                          value="prefix"
                          checked={fuzzyMode === 'prefix'}
                          onChange={(e) => setFuzzyMode(e.target.value)}
                        />
                        <span>前缀匹配</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="fuzzyMode"
                          value="substring"
                          checked={fuzzyMode === 'substring'}
                          onChange={(e) => setFuzzyMode(e.target.value)}
                        />
                        <span>子串搜索</span>
                      </label>
                      <span className="option-hint">结果上限 100 条</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {activeTab === SEARCH_MODES.EXTENSION_TO_MIME && (
            <div className="content-section">
              <div className="form-group">
                <label htmlFor="ext-input" className="input-label">
                  扩展名（每行一个或用逗号分隔；支持带点 .html 或不带 html）
                </label>
                <textarea
                  id="ext-input"
                  className="batch-textarea"
                  value={extInput}
                  onChange={(e) => setExtInput(e.target.value)}
                  placeholder="html\n.js\ncss\nwebp"
                  spellCheck={false}
                />
              </div>

              <div className="examples-panel">
                <span className="examples-title">示例：</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleLoadExample('ext-basic')}
                  type="button"
                >
                  常用扩展名
                </button>
              </div>

              <div className="action-bar">
                <button
                  className="btn btn-primary"
                  onClick={handleLookupExtensions}
                  disabled={!extInput.trim()}
                  type="button"
                >
                  查询
                </button>
                {lookupResult && (
                  <button className="btn btn-secondary" onClick={handleClear} type="button">
                    清除
                  </button>
                )}
                {lookupResult && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showMissOnly}
                      onChange={(e) => setShowMissOnly(e.target.checked)}
                    />
                    <span>仅显示未命中</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {activeTab === SEARCH_MODES.MIME_TO_EXTENSION && (
            <div className="content-section">
              <div className="form-group">
                <label htmlFor="mime-input" className="input-label">
                  MIME 类型（每行一个或用逗号分隔；自动剥离 ;charset= 等参数）
                </label>
                <textarea
                  id="mime-input"
                  className="batch-textarea"
                  value={mimeInput}
                  onChange={(e) => setMimeInput(e.target.value)}
                  placeholder="text/html\napplication/javascript; charset=utf-8\nimage/png"
                  spellCheck={false}
                />
              </div>

              <div className="examples-panel">
                <span className="examples-title">示例：</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleLoadExample('mime-basic')}
                  type="button"
                >
                  常用 MIME 类型
                </button>
              </div>

              <div className="action-bar">
                <button
                  className="btn btn-primary"
                  onClick={handleLookupMimes}
                  disabled={!mimeInput.trim()}
                  type="button"
                >
                  查询
                </button>
                {lookupResult && (
                  <button className="btn btn-secondary" onClick={handleClear} type="button">
                    清除
                  </button>
                )}
                {lookupResult && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showMissOnly}
                      onChange={(e) => setShowMissOnly(e.target.checked)}
                    />
                    <span>仅显示未命中</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {activeTab === SEARCH_MODES.FILE_HEADER && (
            <div className="content-section">
              <div className="form-group">
                <label htmlFor="file-input" className="input-label">
                  选择文件（仅读取文件头 512 字节，不上传服务器）
                </label>
                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <p className="input-hint">
                  读取上限 512 字节，用于魔数推断。支持 PDF、图片、压缩包、音频、视频等常见格式。
                </p>
              </div>

              {fileResult && (
                <div className="action-bar">
                  <button className="btn btn-secondary" onClick={handleClear} type="button">
                    清除
                  </button>
                </div>
              )}
            </div>
          )}

          {lookupResult && renderLookupResults()}
          {fileResult && renderFileResults()}
        </div>
      </div>

      <div className="card">
        <div className="card-header card-header-light">
          <h2 className="card-title card-title-sm">本地覆盖表</h2>
          <p className="card-subtitle">
            存储在浏览器 <code>localStorage</code> 中，键名固定为 <code>extension_mime_lookup_overrides</code>
          </p>
        </div>

        <div className="card-body">
          <div className="add-override-form">
            <div className="form-group">
              <label className="input-label">扩展名</label>
              <input
                type="text"
                value={newOverrideExt}
                onChange={(e) => setNewOverrideExt(e.target.value)}
                placeholder=".custom 或 custom"
                className="value-input"
              />
            </div>
            <div className="form-group">
              <label className="input-label">MIME 类型</label>
              <input
                type="text"
                value={newOverrideMime}
                onChange={(e) => setNewOverrideMime(e.target.value)}
                placeholder="application/x-custom"
                className="value-input"
              />
            </div>
            <div className="form-group">
              <label className="input-label">分类</label>
              <select
                value={newOverrideCategory}
                onChange={(e) => setNewOverrideCategory(e.target.value)}
                className="policy-select"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="form-group form-group-action">
              <label className="input-label hidden">&nbsp;</label>
              <button
                className="btn btn-primary"
                onClick={handleAddOverride}
                disabled={!newOverrideExt.trim() || !newOverrideMime.trim()}
                type="button"
              >
                添加
              </button>
            </div>
          </div>

          {overrides.length > 0 ? (
            <div className="overrides-table-container">
              <table className="overrides-table">
                <thead>
                  <tr>
                    <th>扩展名</th>
                    <th>MIME 类型</th>
                    <th>分类</th>
                    <th>优先级</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {overrides.map((item, idx) => (
                    <tr key={idx}>
                      <td><code>.{escapeHtml(item.extension)}</code></td>
                      <td><code>{escapeHtml(item.mime)}</code></td>
                      <td>{CATEGORY_LABELS[item.category] || item.category}</td>
                      <td>{item.priority}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveOverride(item.extension, item.mime)}
                          type="button"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">暂无覆盖表条目</p>
          )}

          <div className="action-bar action-bar-start">
            <button className="btn btn-secondary" onClick={handleExportOverrides} type="button">
              复制 JSON
            </button>
            <button className="btn btn-secondary" onClick={handleImportOverrides} type="button">
              导入 JSON
            </button>
          </div>
        </div>
      </div>

      <div className="card card-light">
        <div className="card-header card-header-light">
          <h2 className="card-title card-title-sm">说明</h2>
        </div>
        <div className="card-body">
          <ul className="notes-list">
            <li>
              <strong>双向查询：</strong>支持扩展名查 MIME 或 MIME 查扩展名，内置数据表可切换版本。
            </li>
            <li>
              <strong>归一化规则：</strong>扩展名自动去点、小写；MIME 类型自动剥离 <code>;charset=</code> 等参数、小写。
            </li>
            <li>
              <strong>批量与模糊：</strong>支持多行/逗号分隔批量查询；可开启前缀匹配或子串搜索，结果上限 100 条。
            </li>
            <li>
              <strong>多候选排序：</strong>覆盖表条目优先，其次推荐标记，再次优先级字段（降序），最后字母序。
            </li>
            <li>
              <strong>本地覆盖：</strong>覆盖表存 localStorage，支持导入导出 JSON，键名固定。
            </li>
            <li>
              <strong>文件头检测：</strong>仅在内存中读取文件前 512 字节推断魔数，不上传任何服务器。与扩展名交叉校验后输出「一致 / 冲突 / 未知」三态。
            </li>
            <li>
              <strong>导出功能：</strong>支持复制 TSV、下载 CSV；表格单元纯文本渲染，防 XSS。
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
