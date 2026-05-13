import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  processFilePaths,
  exportToForwardSlash,
  exportToBackslash,
  toFileUrl,
  buildStructuredJson,
  joinPaths,
  MAX_LINES,
  MAX_LINE_LENGTH,
  FRAME_SIZE,
  PLATFORM,
  PLATFORM_LABELS,
  EXAMPLE_CASES,
  PRESETS,
  DEFAULT_OPTIONS,
  STORAGE_KEY,
  STORAGE_VERSION,
} from './logic/index.js'
import './FilepathNormalizerTool.css'

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

function getPlatformLabel(platform) {
  return PLATFORM_LABELS[platform] || platform
}

function getDiagnosticClass(type) {
  if (type === 'reserved_name') return 'warning'
  if (type === 'trailing_dot') return 'warning'
  if (type === 'empty_segment') return 'warning'
  return 'warning'
}

function getSegmentClass(segment, diagnostics) {
  const hasReserved = diagnostics.some(d => d.type === 'reserved_name' && d.segment === segment)
  const hasTrailingDot = diagnostics.some(d => d.type === 'trailing_dot' && d.segment === segment)
  if (hasReserved) return 'reserved'
  if (hasTrailingDot) return 'trailing-dot'
  return ''
}

function escapeJson(text) {
  return JSON.stringify(text, null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function FilepathNormalizerTool() {
  const [rawText, setRawText] = useState('')
  const [result, setResult] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('results')

  const [options, setOptions] = useState({
    ...DEFAULT_OPTIONS,
  })

  const [joinBase, setJoinBase] = useState('')
  const [joinSub, setJoinSub] = useState('')
  const [joinResult, setJoinResult] = useState(null)

  const debounceRef = useRef(null)
  const renderFrameRef = useRef(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.version === STORAGE_VERSION && parsed.options) {
          setOptions({ ...DEFAULT_OPTIONS, ...parsed.options })
        }
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: STORAGE_VERSION,
        options,
      }))
    } catch (e) {}
  }, [options])

  const handleProcess = useCallback(() => {
    const processed = processFilePaths({
      rawText,
      options,
    })
    setResult(processed)
  }, [rawText, options])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (rawText.trim()) {
        handleProcess()
      } else {
        setResult(null)
      }
    }, 250)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [rawText, options, handleProcess])

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

  const handleLoadExample = useCallback((example) => {
    setRawText(example.paths)
    setResult(null)
  }, [])

  const handleClear = useCallback(() => {
    setRawText('')
    setResult(null)
  }, [])

  const handleApplyPreset = useCallback((presetKey) => {
    const preset = PRESETS[presetKey]
    if (preset) {
      setOptions({
        ...options,
        ...preset,
      })
    }
  }, [options])

  const handleOptionChange = useCallback((key, value) => {
    setOptions(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const handleProcessNow = useCallback(() => {
    handleProcess()
  }, [handleProcess])

  const handleJoin = useCallback(() => {
    if (!joinBase.trim()) {
      setJoinResult(null)
      return
    }
    const result = joinPaths(joinBase, joinSub, options)
    setJoinResult(result)
  }, [joinBase, joinSub, options])

  const renderErrorBox = () => {
    if (!result?.errorCode) return null
    return (
      <div className="error-box">
        <strong>处理错误</strong>
        <p>{result.errorMessage}</p>
        <div className="error-code">错误码：{result.errorCode}</div>
      </div>
    )
  }

  const renderSummary = () => {
    if (!result?.summary) return null
    const { summary } = result

    return (
      <div className="summary-section">
        <h3>概览</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">总行数</span>
            <span className="summary-value">{summary.totalLines}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">有效路径</span>
            <span className="summary-value">{summary.nonEmptyLines}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">UNC</span>
            <span className="summary-value">{summary.uncPaths}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Windows</span>
            <span className="summary-value">{summary.windowsPaths}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">POSIX</span>
            <span className="summary-value">{summary.posixPaths}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">绝对路径</span>
            <span className="summary-value">{summary.absolutePaths}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">相对路径</span>
            <span className="summary-value">{summary.relativePaths}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">混合分隔符</span>
            <span className="summary-value">{summary.mixedSeparators}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">警告</span>
            <span className="summary-value">{summary.pathsWithWarnings}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">错误</span>
            <span className="summary-value">{summary.pathsWithErrors}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderHighlightedPath = (highlighted) => {
    if (!highlighted) return null
    return highlighted.map((seg, idx) => {
      const className = seg.type === 'separator-forward' ? 'separator-forward' :
        seg.type === 'separator-backward' ? 'separator-backward' : ''
      return (
        <span key={idx} className={className}>{escapeHtml(seg.text)}</span>
      )
    })
  }

  const renderDiff = (diff) => {
    if (!diff?.segments) return null
    return diff.segments.map((seg, idx) => {
      let className = ''
      if (seg.type === 'removed') className = 'diff-removed'
      else if (seg.type === 'added') className = 'diff-added'
      return (
        <span key={idx} className={className}>{escapeHtml(seg.text)}</span>
      )
    })
  }

  const renderPathItem = (lineItem) => {
    if (lineItem.isEmpty) {
      return (
        <div key={lineItem.lineNumber} className="empty-line">
          第 {lineItem.lineNumber} 行：空行
        </div>
      )
    }

    const { parsed, diff, highlighted } = lineItem
    const structuredJson = buildStructuredJson(parsed)

    return (
      <div
        key={lineItem.lineNumber}
        className={`path-item ${parsed.isDangerous ? 'dangerous' : ''}`}
      >
        <div className="path-header">
          <span className="line-number">第 {lineItem.lineNumber} 行</span>
          {parsed.isUnc ? (
            <span className="platform-badge unc">UNC</span>
          ) : (
            <span className={`platform-badge ${parsed.detectedPlatform}`}>
              {parsed.detectedPlatform === 'windows' ? 'Windows' : 'POSIX'}
            </span>
          )}
          <span className={`type-badge ${parsed.isAbsolute ? 'absolute' : 'relative'}`}>
            {parsed.isAbsolute ? '绝对路径' : '相对路径'}
          </span>
          {parsed.isDangerous && (
            <span className="type-badge dangerous">危险穿越</span>
          )}
        </div>

        <div className="path-body">
          <div className="path-row">
            <div className="path-col">
              <div className="path-label">原始路径</div>
              <div className="path-value">
                {renderHighlightedPath(highlighted)}
              </div>
            </div>
            <div className="path-col">
              <div className="path-label">规范化路径</div>
              <div className="path-value">
                {renderDiff(diff)}
              </div>
            </div>
          </div>

          {parsed.diagnostics.length > 0 && (
            <div className="path-diagnostics">
              {parsed.diagnostics.map((diag, dIdx) => (
                <div key={dIdx} className={`diagnostic-item ${getDiagnosticClass(diag.type)}`}>
                  ⚠️ {diag.message}
                </div>
              ))}
            </div>
          )}

          <div className="path-info">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">根</div>
                <div className="info-value">{escapeHtml(parsed.root) || '(无)'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">基础名</div>
                <div className="info-value">{escapeHtml(parsed.basename) || '(无)'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">扩展名</div>
                <div className="info-value">{escapeHtml(parsed.ext) || '(无)'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">完整文件名</div>
                <div className="info-value">{escapeHtml(parsed.fullBasename) || '(无)'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">输出分隔符</div>
                <div className="info-value">{escapeHtml(parsed.outputSeparator === '/' ? '/' : '\\\\')}</div>
              </div>
            </div>
          </div>

          {parsed.normalizedSegments.length > 0 && (
            <div className="segments-display">
              <h4>规范化段</h4>
              <div className="segments-list">
                {parsed.normalizedSegments.map((seg, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="segment-sep">|</span>}
                    <span className={`segment-badge ${getSegmentClass(seg, parsed.diagnostics)}`}>
                      {escapeHtml(seg)}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="json-display">
            <div className="section-header">
              <h4>结构化 JSON</h4>
              <button
                className="copy-btn small"
                onClick={() => handleCopy(escapeJson(structuredJson), '结构化 JSON')}
              >
                复制
              </button>
            </div>
            <pre className="json-preview" dangerouslySetInnerHTML={{ __html: escapeJson(structuredJson) }} />
          </div>

          <div className="section-header" style={{ marginTop: '14px' }}>
            <h4>导出格式</h4>
            <div className="action-buttons">
              <button
                className="export-btn"
                onClick={() => handleCopy(exportToForwardSlash(parsed.normalizedPath), '正斜杠路径')}
              >
                正斜杠导出
              </button>
              <button
                className="export-btn"
                onClick={() => handleCopy(exportToBackslash(parsed.normalizedPath), '反斜杠路径')}
              >
                反斜杠导出
              </button>
              <button
                className="copy-btn small"
                onClick={() => handleCopy(toFileUrl(parsed.normalizedPath, parsed.detectedPlatform), 'File URL')}
              >
                复制 File URL
              </button>
            </div>
          </div>

          <div className="file-url-preview">
            <h4>File URL 预览</h4>
            <div className="file-url-value">
              {escapeHtml(toFileUrl(parsed.normalizedPath, parsed.detectedPlatform))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderResults = () => {
    if (!result?.lines) return null

    const nonEmptyLines = result.lines.filter(l => !l.isEmpty)
    const total = result.lines.length

    const needsFraming = total > FRAME_SIZE * 2
    const displayedLines = needsFraming
      ? result.lines.slice(0, FRAME_SIZE)
      : result.lines

    return (
      <div className="results-section">
        <div className="section-header">
          <h3>解析结果</h3>
          <div className="action-buttons">
            {nonEmptyLines.length > 0 && (
              <>
                <button
                  className="copy-btn"
                  onClick={() => handleCopy(
                    nonEmptyLines.map(l => l.parsed.normalizedPath).join('\n'),
                    '全部规范化结果')}
                >
                  复制全部规范化结果
                </button>
                <button
                  className="export-btn"
                  onClick={() => handleCopy(
                    nonEmptyLines.map(l => exportToForwardSlash(l.parsed.normalizedPath)).join('\n'),
                    '正斜杠全部')}
                >
                  正斜杠全部导出
                </button>
                <button
                  className="export-btn"
                  onClick={() => handleCopy(
                    nonEmptyLines.map(l => exportToBackslash(l.parsed.normalizedPath)).join('\n'),
                    '反斜杠全部导出')}
                >
                  反斜杠全部导出
                </button>
              </>
            )}
          </div>
        </div>

        <div className="path-list">
          {displayedLines.map(renderPathItem)}
        </div>

        {needsFraming && (
          <div className="frame-note">
            ⚠️ 行数较多（共 {total} 行），已启用分帧渲染。当前展示前 {FRAME_SIZE} 行。
            <div className="rendering-info">
              大体量行数上限：{MAX_LINES} 行，单条路径最大长度：{MAX_LINE_LENGTH} 字符
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderJoinSection = () => {
    return (
      <div className="join-section">
        <h3>子路径追加（简化版，仅本页使用）</h3>
        <div className="join-inputs">
          <input
            type="text"
            className="value-input"
            style={{ flex: '1', minWidth: '200px' }}
            value={joinBase}
            onChange={(e) => setJoinBase(e.target.value)}
            placeholder="基础路径，例如：/home/user 或 C:\\Users\\name"
          />
          <span className="join-sep">+</span>
          <input
            type="text"
            className="value-input"
            style={{ flex: '1', minWidth: '200px' }}
            value={joinSub}
            onChange={(e) => setJoinSub(e.target.value)}
            placeholder="子路径，例如：docs/file.txt 或 ..\\docs"
          />
          <button className="primary-btn" onClick={handleJoin}>拼接</button>
        </div>

        {joinResult && (
          <div style={{ marginTop: '12px' }}>
            <div className="path-col">
              <div className="path-label">拼接结果</div>
              <div className="path-value">
                {escapeHtml(joinResult.normalizedPath)}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPresets = () => {
    return (
      <div className="presets-section">
        <h3>快捷预设</h3>
        <div className="presets-grid">
          <button
            className="preset-btn"
            onClick={() => handleApplyPreset('NORMALIZE_ONLY')}
          >
            {PRESETS.NORMALIZE_ONLY.name}
          </button>
          <button
            className="preset-btn"
            onClick={() => handleApplyPreset('STRICT_POSIX')}
          >
            {PRESETS.STRICT_POSIX.name}
          </button>
        </div>
      </div>
    )
  }

  const renderOptions = () => {
    return (
      <div className="options-section">
        <h3>选项</h3>
        <div className="options-grid">
          <div className="form-group">
            <label htmlFor="platform-select">目标平台</label>
            <select
              id="platform-select"
              className="select-input"
              value={options.platform}
              onChange={(e) => handleOptionChange('platform', e.target.value)}
            >
              <option value={PLATFORM.NEUTRAL}>{getPlatformLabel(PLATFORM.NEUTRAL)}</option>
              <option value={PLATFORM.POSIX}>{getPlatformLabel(PLATFORM.POSIX)}</option>
              <option value={PLATFORM.WINDOWS}>{getPlatformLabel(PLATFORM.WINDOWS)}</option>
            </select>
          </div>

          <label className="option-item">
            <input
              type="checkbox"
              checked={options.resolveDots}
              onChange={(e) => handleOptionChange('resolveDots', e.target.checked)}
            />
            <span>消解 . 和 ..</span>
          </label>

          <label className="option-item">
            <input
              type="checkbox"
              checked={options.collapseSeparators}
              onChange={(e) => handleOptionChange('collapseSeparators', e.target.checked)}
            />
            <span>折叠重复分隔符</span>
          </label>

          <label className="option-item">
            <input
              type="checkbox"
              checked={options.normalizeDriveCase}
              onChange={(e) => handleOptionChange('normalizeDriveCase', e.target.checked)}
            />
            <span>统一盘符大小写</span>
          </label>

          <label className="option-item">
            <input
              type="checkbox"
              checked={options.rejectDangerous}
              onChange={(e) => handleOptionChange('rejectDangerous', e.target.checked)}
            />
            <span>拒绝危险穿越</span>
          </label>

          <label className="option-item">
            <input
              type="checkbox"
              checked={options.strictPosix}
              onChange={(e) => handleOptionChange('strictPosix', e.target.checked)}
            />
            <span>严格 POSIX</span>
          </label>

          <label className="option-item">
            <input
              type="checkbox"
              checked={options.multiDotExtension}
              onChange={(e) => handleOptionChange('multiDotExtension', e.target.checked)}
            />
            <span>多点扩展名（.tar.gz</span>
          </label>
        </div>
      </div>
    )
  }

  const renderExamples = () => {
    return (
      <div className="examples-section">
        <h3>示例（点击填入）</h3>
        <div className="examples-grid">
          {EXAMPLE_CASES.map((example, idx) => (
            <button
              key={idx}
              className="example-btn"
              onClick={() => handleLoadExample(example)}
              title={example.description}
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderNotes = () => {
    return (
      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有处理均为字符串级，不访问真实文件系统。
          </li>
          <li>
            <strong>Windows 盘符编码差异：</strong>
            Windows 路径在 file:// 协议中使用 <code>file:///C:/</code> 格式（三个斜杠），
            而 POSIX 使用 <code>file:///path</code> 格式。
          </li>
          <li>
            <strong>分隔符高亮：</strong>正斜杠 <code>/</code> 显示为蓝色，反斜杠 <code>\\</code> 显示为红色。
          </li>
          <li>
            <strong>保留名检测：</strong>检测 Windows 系统保留名如 CON、PRN、AUX、NUL、COM1-9、LPT1-9。
          </li>
          <li>
            <strong>危险穿越：</strong>相对路径中残留 <code>..</code> 可能导致目录穿越，
            启用「拒绝危险穿越」会标记此类路径。
          </li>
          <li>
            <strong>用户预设：</strong>您的选项设置自动保存到 <code>localStorage</code>。
          </li>
        </ul>
      </div>
    )
  }

  return (
    <div className="filepath-normalizer-tool">
      {copyStatus && (
        <div className={`tool-toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>文件路径规范化工具</h2>

        <div className="tab-container">
          <button
            className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            路径处理
          </button>
          <button
            className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            对比与导出
          </button>
        </div>

        {activeTab === 'results' && (
          <>
            <div className="form-group full-width">
              <label htmlFor="raw-text">
              输入路径（支持多行，每行一个路径）
            </label>
              <textarea
                id="raw-text"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`例如：
/home/user/file.txt
C:\\Users\\name\\docs\\file.txt
\\\\server\\share\\folder`}
                spellCheck={false}
              />
              <div className="input-stats">
                <span>行数：{rawText.split(/\r?\n/).length} / {MAX_LINES}</span>
                <span>单条最大长度：{MAX_LINE_LENGTH} 字符</span>
              </div>
            </div>

            {renderPresets()}
            {renderOptions()}

            <div className="action-row">
              <button
                className="primary-btn"
                onClick={handleProcessNow}
                disabled={!rawText.trim()}
              >
                立即解析
              </button>
              {rawText && (
                <button className="secondary-btn" onClick={handleClear}>
                  清除
                </button>
              )}
            </div>

            {renderExamples()}
          </>
        )}

        {activeTab === 'compare' && (
          <>
            {renderJoinSection()}

            <div className="compare-section">
              <h3>对比模式说明</h3>
              <div className="compare-grid">
                <div className="compare-col">
                  <h4>原始路径</h4>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    显示原始输入路径，分隔符使用颜色区分。
                  </p>
                  <ul style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '18px' }}>
                    <li><span className="separator-forward">/</span> 蓝色 = 正斜杠</li>
                    <li><span className="separator-backward">\\</span> 红色 = 反斜杠</li>
                  </ul>
                </div>
                <div className="compare-col">
                  <h4>规范化路径</h4>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    显示规范化后的路径，差异字符级标色。
                  </p>
                  <ul style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '18px' }}>
                    <li><span className="diff-removed">删除</span> 红色删除线 = 被移除</li>
                    <li><span className="diff-added">添加</span> 绿色背景 = 新增内容</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {renderErrorBox()}
      {result && !result.errorCode && (
        <>
          {renderSummary()}
          {renderResults()}
        </>
      )}

      {renderNotes()}
    </div>
  )
}
