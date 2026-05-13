import { useCallback, useEffect, useRef, useState } from 'react'
import {
  joinSafe,
  parseBatchInput,
  processBatch,
  validateBatchInput,
  loadPresets,
  savePreset,
  deletePreset,
  EXAMPLES,
  MODE,
  QUERY_HASH_POLICY,
  DEFAULT_PRESET,
  WARNING_LEVEL,
  MAX_SEGMENTS_PER_GROUP,
  MAX_SINGLE_SEGMENT_LENGTH,
  MAX_TOTAL_LENGTH,
  MAX_BATCH_LINES,
  LARGE_BATCH_THRESHOLD,
} from './logic/index.js'
import './SafeUrlPathJoinerTool.css'

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

function toForwardSlash(path) {
  return path.replace(/\\/g, '/')
}

function toBackSlash(path) {
  return path.replace(/\//g, '\\')
}

export default function SafeUrlPathJoinerTool() {
  const [inputText, setInputText] = useState('')
  const [separator, setSeparator] = useState('|')
  const [showFirstErrorOnly, setShowFirstErrorOnly] = useState(false)
  const [displayFormat, setDisplayFormat] = useState('original')

  const [options, setOptions] = useState({ ...DEFAULT_PRESET })
  const [result, setResult] = useState(null)
  const [batchResult, setBatchResult] = useState(null)

  const [presets, setPresets] = useState([])
  const [selectedPresetId, setSelectedPresetId] = useState('default')
  const [showPresetDialog, setShowPresetDialog] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  const [copyStatus, setCopyStatus] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(null)

  const debounceTimeoutRef = useRef(null)

  useEffect(() => {
    setPresets(loadPresets())
  }, [])

  const runProcessing = useCallback((text) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (!text || text.trim().length === 0) {
      setResult(null)
      setBatchResult(null)
      setProgress(0)
      return
    }

    const lineCount = (text.match(/\n/g) || []).length + 1
    const isLarge = lineCount > LARGE_BATCH_THRESHOLD

    if (isLarge) {
      setIsProcessing(true)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (lineCount > 1) {
        const batchValidation = validateBatchInput(text)
        if (!batchValidation.valid) {
          setBatchResult({
            success: false,
            error: batchValidation.error,
            totalLines: 0,
            successCount: 0,
            errorCount: 0,
            results: [],
          })
          setResult(null)
          setIsProcessing(false)
          return
        }

        const parsed = parseBatchInput(text, separator)
        const batchProcResult = processBatch(parsed, options)
        setBatchResult(batchProcResult)
        setResult(null)
      } else {
        const segments = text.split(separator).map(s => s.trim())
        const singleResult = joinSafe(segments, options)
        setResult(singleResult)
        setBatchResult(null)
      }

      setIsProcessing(false)
      setProgress(100)
    }, isLarge ? 500 : DEBOUNCE_DELAY)
  }, [separator, options])

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value
    setInputText(newText)
    setSelectedExampleIndex(null)
    runProcessing(newText)
  }, [runProcessing])

  const handleOptionChange = useCallback((key, value) => {
    setOptions(prev => {
      const updated = { ...prev, [key]: value }
      runProcessing(inputText)
      return updated
    })
  }, [inputText, runProcessing])

  const handleApplyExample = useCallback((example, idx) => {
    setInputText(example.input)
    setSelectedExampleIndex(idx)
    runProcessing(example.input)
  }, [runProcessing])

  const handleClear = useCallback(() => {
    setInputText('')
    setResult(null)
    setBatchResult(null)
    setProgress(0)
    setSelectedExampleIndex(null)
  }, [])

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

  const handleApplyPreset = useCallback((presetId) => {
    const allPresets = loadPresets()
    const preset = allPresets.find(p => p.id === presetId)
    if (preset) {
      const { id, name, ...optionsWithoutMeta } = preset
      setOptions(optionsWithoutMeta)
      setSelectedPresetId(presetId)
      runProcessing(inputText)
    }
  }, [inputText, runProcessing])

  const handleSavePreset = useCallback(() => {
    if (!newPresetName.trim()) return

    savePreset({
      name: newPresetName.trim(),
      ...options,
    })
    setPresets(loadPresets())
    setShowPresetDialog(false)
    setNewPresetName('')
    setCopyStatus({ type: 'success', message: '预设已保存' })
    setTimeout(() => setCopyStatus(null), 2500)
  }, [newPresetName, options])

  const handleDeletePreset = useCallback((presetId) => {
    if (presetId.startsWith('user-')) {
      deletePreset(presetId)
      setPresets(loadPresets())
      if (selectedPresetId === presetId) {
        setSelectedPresetId('default')
      }
    }
  }, [selectedPresetId])

  const formatDiagnostics = useCallback((result) => {
    if (!result) return ''
    return JSON.stringify(
      {
        success: result.success,
        result: result.result,
        errors: result.errors,
        warnings: result.warnings,
        diagnostics: result.diagnostics,
      },
      null,
      2
    )
  }, [])

  const getDisplayValue = useCallback((value) => {
    if (!value) return value
    switch (displayFormat) {
      case 'forward':
        return toForwardSlash(value)
      case 'backward':
        return toBackSlash(value)
      default:
        return value
    }
  }, [displayFormat])

  const renderWarningLevel = (level) => {
    const colors = {
      [WARNING_LEVEL.INFO]: 'info',
      [WARNING_LEVEL.WARNING]: 'warning',
      [WARNING_LEVEL.ERROR]: 'danger',
      [WARNING_LEVEL.CRITICAL]: 'critical',
    }
    return colors[level] || 'info'
  }

  const renderErrors = (errors) => {
    if (!errors || errors.length === 0) return null

    const displayErrors = showFirstErrorOnly ? [errors[0]] : errors

    return (
      <div className="errors-list">
        {displayErrors.map((err, idx) => (
          <div key={idx} className={`error-item ${renderWarningLevel(err.level)}`}>
            <span className="error-code">{err.code}</span>
            <span className="error-msg">{err.message}</span>
            {err.details && (
              <pre className="error-details">{escapeHtml(JSON.stringify(err.details, null, 2))}</pre>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="safe-url-path-joiner">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <section className="tool-section">
        <h2>安全 URL 与路径拼接</h2>

        <div className="security-notice">
          <h4>🔒 安全说明</h4>
          <ul>
            <li>本工具在浏览器端完成所有拼接和规范化，无后端 HTTP 调用</li>
            <li>默认拒绝路径穿越 (<code>..</code>) 和危险 scheme（<code>javascript:</code> 等）</li>
            <li>所有输出以纯文本或代码块展示，内置防 XSS</li>
            <li>配置预设仅保存在本地 <code>localStorage</code>，键名页内固定</li>
          </ul>
        </div>

        <div className="form-group">
          <label>输入片段（用分隔符分隔；批量时每行一组）</label>
          <textarea
            className="input-textarea"
            value={inputText}
            onChange={handleTextChange}
            placeholder={`示例：https://example.com|api|v2|users\n\n批量模式：\nhttps://a.com|path1\n/var/www|html|index.html`}
            spellCheck={false}
          />
          <div className="meta-info">
            <span>字符数: {inputText.length}</span>
            <span>行数: {(inputText.match(/\n/g) || []).length + 1}</span>
            {inputText.length > LARGE_BATCH_THRESHOLD * 50 && (
              <span className="warning-text">大体量输入，已启用节流</span>
            )}
          </div>
        </div>

        <div className="options-panel">
          <h3>模式与选项</h3>

          <div className="options-grid">
            <div className="selects-row">
              <div className="option-group">
                <label>模式切换</label>
                <select
                  value={options.mode}
                  onChange={(e) => handleOptionChange('mode', e.target.value)}
                  className="option-select"
                >
                  <option value={MODE.AUTO_DETECT}>自动探测</option>
                  <option value={MODE.URL_ONLY}>仅 URL</option>
                  <option value={MODE.POSIX_ONLY}>仅 POSIX</option>
                  <option value={MODE.WINDOWS_ONLY}>仅 Windows</option>
                </select>
              </div>

              <div className="option-group">
                <label>Query / Hash 策略</label>
                <select
                  value={options.queryHashPolicy}
                  onChange={(e) => handleOptionChange('queryHashPolicy', e.target.value)}
                  className="option-select"
                >
                  <option value={QUERY_HASH_POLICY.PRESERVE}>保留</option>
                  <option value={QUERY_HASH_POLICY.STRIP}>剥离</option>
                  <option value={QUERY_HASH_POLICY.MERGE_LAST}>合并最后</option>
                </select>
              </div>

              <div className="option-group">
                <label>分隔符</label>
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  className="option-select"
                >
                  <option value="|">竖线 (|)</option>
                  <option value="\t">制表符 (Tab)</option>
                </select>
              </div>

              <div className="option-group">
                <label>展示格式</label>
                <select
                  value={displayFormat}
                  onChange={(e) => setDisplayFormat(e.target.value)}
                  className="option-select"
                >
                  <option value="original">原始</option>
                  <option value="forward">正斜杠统一</option>
                  <option value="backward">反斜杠统一</option>
                </select>
              </div>
            </div>

            <div className="checkboxes-row">
              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.resolveDotDot}
                    onChange={(e) => handleOptionChange('resolveDotDot', e.target.checked)}
                  />
                  消解 ..
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.collapseRepeated}
                    onChange={(e) => handleOptionChange('collapseRepeated', e.target.checked)}
                  />
                  折叠重复分隔符
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.preserveTrailingSlash}
                    onChange={(e) => handleOptionChange('preserveTrailingSlash', e.target.checked)}
                  />
                  保留尾部斜杠
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.forceAbsoluteRoot}
                    onChange={(e) => handleOptionChange('forceAbsoluteRoot', e.target.checked)}
                  />
                  强制绝对根
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.stripDefaultPort}
                    onChange={(e) => handleOptionChange('stripDefaultPort', e.target.checked)}
                  />
                  剥离默认端口
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.normalizePercentEncoding}
                    onChange={(e) => handleOptionChange('normalizePercentEncoding', e.target.checked)}
                  />
                  百分号编码归一
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.rejectTraversal}
                    onChange={(e) => handleOptionChange('rejectTraversal', e.target.checked)}
                  />
                  拒绝路径穿越
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.rejectDangerousSchemes}
                    onChange={(e) => handleOptionChange('rejectDangerousSchemes', e.target.checked)}
                  />
                  拒绝危险 scheme
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.allowFileScheme}
                    onChange={(e) => handleOptionChange('allowFileScheme', e.target.checked)}
                  />
                  允许 file:（强警示）
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.rejectWindowsReserved}
                    onChange={(e) => handleOptionChange('rejectWindowsReserved', e.target.checked)}
                  />
                  拒绝 Windows 保留名
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={options.diagnosticMode}
                    onChange={(e) => handleOptionChange('diagnosticMode', e.target.checked)}
                  />
                  诊断模式
                </label>
              </div>

              <div className="option-check">
                <label>
                  <input
                    type="checkbox"
                    checked={showFirstErrorOnly}
                    onChange={(e) => setShowFirstErrorOnly(e.target.checked)}
                  />
                  仅显示第一处错误
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="presets-panel">
          <div className="presets-header">
            <h3>常用预设</h3>
            <button
              type="button"
              className="secondary-btn small"
              onClick={() => setShowPresetDialog(true)}
            >
              保存当前
            </button>
          </div>

          <div className="presets-list">
            {presets.map((preset) => (
              <div key={preset.id} className="preset-item">
                <button
                  type="button"
                  className={`preset-btn ${selectedPresetId === preset.id ? 'active' : ''}`}
                  onClick={() => handleApplyPreset(preset.id)}
                >
                  {preset.name}
                </button>
                {preset.id.startsWith('user-') && (
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDeletePreset(preset.id)}
                    title="删除预设"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="example-panel">
          <h3>示例</h3>
          <div className="example-buttons">
            {EXAMPLES.map((example, idx) => (
              <button
                key={idx}
                type="button"
                className={`example-btn ${selectedExampleIndex === idx ? 'active' : ''}`}
                onClick={() => handleApplyExample(example, idx)}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>

        <div className="action-row">
          <button className="secondary-btn" onClick={handleClear}>
            清空
          </button>
        </div>
      </section>

      {isProcessing && (
        <section className="tool-section">
          <div className="info-banner">
            ⏳ 处理中... {progress > 0 && `${Math.round(progress)}%`}
          </div>
        </section>
      )}

      {result && (
        <section className="tool-section">
          <div className={`result-box ${result.success ? 'success' : 'error'}`}>
            <h3>{result.success ? '✅ 拼接成功' : '❌ 拼接失败'}</h3>

            {result.result && (
              <div className="result-value">
                <pre><code>{escapeHtml(getDisplayValue(result.result))}</code></pre>
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => handleCopy(getDisplayValue(result.result), '结果')}
                >
                  复制
                </button>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="errors-section">
                <h4>错误</h4>
                {renderErrors(result.errors)}
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="warnings-section">
                <h4>警告</h4>
                {renderErrors(result.warnings)}
              </div>
            )}

            {options.diagnosticMode && result.diagnostics && (
              <div className="diagnostics-section">
                <h4>诊断信息</h4>
                <pre className="diagnostics-code">
                  {escapeHtml(JSON.stringify(result.diagnostics, null, 2))}
                </pre>
              </div>
            )}

            <div className="action-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => handleCopy(formatDiagnostics(result), '诊断 JSON')}
              >
                复制诊断 JSON
              </button>
            </div>
          </div>
        </section>
      )}

      {batchResult && (
        <section className="tool-section">
          <div className={`result-box ${batchResult.errorCount === 0 ? 'success' : 'error'}`}>
            <h3>
              批量结果：
              {batchResult.successCount} 成功 /
              {batchResult.errorCount} 失败 /
              {batchResult.totalLines} 行
            </h3>

            <div className="batch-table">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>输入</th>
                    <th>结果</th>
                    <th style={{ width: '100px' }}>状态</th>
                    <th style={{ width: '80px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResult.results.map((row, idx) => {
                    const shouldHideError = showFirstErrorOnly &&
                      !row.success &&
                      idx > batchResult.results.findIndex(r => !r.success)

                    if (shouldHideError && !row.success) {
                      return null
                    }

                    return (
                      <tr key={idx} className={row.success ? 'row-success' : 'row-error'}>
                        <td>{row.lineNumber}</td>
                        <td className="input-cell">
                          <pre>{escapeHtml(row.rawLine)}</pre>
                        </td>
                        <td className="result-cell">
                          {row.result ? (
                            <pre>{escapeHtml(getDisplayValue(row.result))}</pre>
                          ) : (
                            <span className="error-text">
                              {row.errors?.[0]?.code || '错误'}
                            </span>
                          )}
                        </td>
                        <td>
                          {row.success ? (
                            <span className="status-badge success">✓</span>
                          ) : (
                            <span className="status-badge error">✗</span>
                          )}
                        </td>
                        <td>
                          {row.result && (
                            <button
                              type="button"
                              className="copy-btn"
                              onClick={() => handleCopy(getDisplayValue(row.result), `第${row.lineNumber}行结果`)}
                            >
                              复制
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {!result && !batchResult && inputText.trim().length > 0 && !isProcessing && (
        <section className="tool-section">
          <div className="empty-state">
            处理中...
          </div>
        </section>
      )}

      {!result && !batchResult && inputText.trim().length === 0 && (
        <section className="tool-section">
          <div className="empty-state">
            请输入要拼接的片段，或点击上方示例开始
          </div>
        </section>
      )}

      <section className="notes-section">
        <h4>📖 算法说明与安全边界</h4>
        <ul>
          <li>
            <strong>模式切换：</strong>
            支持 <code>URL_ONLY</code> / <code>POSIX_ONLY</code> / <code>WINDOWS_ONLY</code> /
            <code>AUTO_DETECT</code> 四种模式。自动探测时优先识别 UNC / 盘符 / scheme。
          </li>
          <li>
            <strong>URL 侧：</strong>
            scheme 检测覆盖 <code>[a-zA-Z][a-zA-Z0-9+\-.]*:</code>；
            默认端口（80/443/21 等）可剥离；
            query/hash 支持保留/剥离/合并最后策略；
            百分号编码归一：十六进制大写、<code>+</code> 转 <code>%20</code>。
          </li>
          <li>
            <strong>路径侧：</strong>
            POSIX 路径以 <code>/</code> 判定；
            Windows 路径含 UNC（<code>\\server\share</code>）与盘符；
            支持可疑 UNC 前缀 / 小写盘符高亮。
          </li>
          <li>
            <strong>安全策略：</strong>
            <ul>
              <li>拒绝含 <code>..</code> 的路径穿越输出：<code>TRAVERSAL_DETECTED</code></li>
              <li>拒绝危险 scheme：<code>javascript:</code> <code>vbscript:</code> <code>data:</code> <code>blob:</code></li>
              <li>可选允许 <code>file:</code> 但标记警告</li>
              <li>Windows 保留设备名：CON/PRN/AUX/NUL/COM1-9/LPT1-9</li>
            </ul>
          </li>
          <li>
            <strong>批处理：</strong>
            多行输入自动切换批量；支持 <code>|</code> 或制表符分隔；
            大体量时使用分帧（setTimeout chunking）避免阻塞 UI。
          </li>
          <li>
            <strong>长度守卫：</strong>
            <ul>
              <li>单组片段上限：{MAX_SEGMENTS_PER_GROUP}</li>
              <li>单段长度上限：{MAX_SINGLE_SEGMENT_LENGTH} 字符</li>
              <li>合并总长上限：{MAX_TOTAL_LENGTH} 字符</li>
              <li>批量行数上限：{MAX_BATCH_LINES}</li>
            </ul>
          </li>
          <li>
            <strong>错误码约定：</strong>
            <ul>
              <li><code>EMPTY_INPUT</code>：整行空</li>
              <li><code>EMPTY_SEGMENT</code>：片段为空（非致命警告）</li>
              <li><code>WHITESPACE_ONLY</code>：片段仅空白</li>
              <li><code>TOO_MANY_SEGMENTS</code>：片段数超限</li>
              <li><code>SEGMENT_TOO_LONG</code>：单段过长</li>
              <li><code>TOTAL_TOO_LONG</code>：总长超限</li>
              <li><code>TOO_MANY_LINES</code>：批量行数超限</li>
              <li><code>TRAVERSAL_DETECTED</code>：路径穿越</li>
              <li><code>DANGEROUS_SCHEME</code>：危险 scheme</li>
              <li><code>WINDOWS_RESERVED_NAME</code>：Windows 保留名</li>
              <li><code>SUSPICIOUS_UNC_PREFIX</code>：可疑 UNC 前缀</li>
              <li><code>SUSPICIOUS_DRIVE_LETTER</code>：小写盘符</li>
            </ul>
          </li>
        </ul>
      </section>

      {showPresetDialog && (
        <div className="modal-overlay" onClick={() => setShowPresetDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>保存预设</h3>
            <div className="form-group">
              <label>预设名称</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="输入预设名称"
                className="text-input"
                autoFocus
              />
            </div>
            <div className="action-row" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowPresetDialog(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
