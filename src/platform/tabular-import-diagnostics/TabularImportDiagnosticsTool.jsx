import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  parseCsvSync,
  parseCsvAsync,
  createCancelToken,
  exportErrorsToCsv,
  getExample,
  readFileAsText,
  checkFileSize,
  formatFileSize,
  PRESET_DELIMITERS,
  ERROR_CODES,
  DEFAULT_PREVIEW_ROWS,
  LARGE_FILE_BYTE_THRESHOLD,
  XLSX_LIBRARY_INFO,
} from './logic/index.js'
import './TabularImportDiagnosticsTool.css'

export default function TabularImportDiagnosticsTool() {
  const [rawInput, setRawInput] = useState('')
  const [parseResult, setParseResult] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseProgress, setParseProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragError, setDragError] = useState('')
  const [primaryKeyColumn, setPrimaryKeyColumn] = useState('')
  const [errorFilterColumn, setErrorFilterColumn] = useState('')
  const [errorFilterCode, setErrorFilterCode] = useState('')
  const [showXlsxCard, setShowXlsxCard] = useState(false)
  const [xlsxLoaded, setXlsxLoaded] = useState(false)

  const fileInputRef = useRef(null)
  const cancelTokenRef = useRef(null)
  const textareaRef = useRef(null)

  const handleParse = useCallback(async () => {
    if (!rawInput.trim()) return

    setIsParsing(true)
    setParseProgress(0)

    try {
      const options = {
        primaryKeyColumn: primaryKeyColumn || null,
        previewRows: DEFAULT_PREVIEW_ROWS,
        onProgress: (rows) => setParseProgress(Math.min(rows / 1000, 0.9)),
      }

      cancelTokenRef.current = createCancelToken()
      options.cancelToken = cancelTokenRef.current

      const result = rawInput.length > 100000
        ? await parseCsvAsync(rawInput, options)
        : parseCsvSync(rawInput, options)

      setParseResult(result)
      setParseProgress(1)
    } catch (error) {
      console.error('Parse error:', error)
    } finally {
      setIsParsing(false)
    }
  }, [rawInput, primaryKeyColumn])

  const handleCancel = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel()
    }
    setIsParsing(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    setDragError('')
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setIsDragging(false)
    setDragError('')

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]

    if (file.type === 'application/vnd.google-apps.folder' || !file.type) {
      try {
        if (file.size === 0 && file.name.indexOf('.') === -1) {
          setDragError('不支持拖拽文件夹，请上传单个 CSV 文件')
          return
        }
      } catch (e) {}
    }

    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.xlsm')
    if (isXlsx) {
      setShowXlsxCard(true)
      return
    }

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv')) {
      setDragError('不支持的文件格式，请上传 CSV 或 TSV 文件')
      return
    }

    try {
      const content = await readFileAsText(file)
      setRawInput(content)
    } catch (error) {
      setDragError('文件读取失败: ' + error.message)
    }
  }, [])

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const content = await readFileAsText(file)
      setRawInput(content)
    } catch (error) {
      setDragError('文件读取失败: ' + error.message)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setRawInput(text)
      }
    } catch {
      textareaRef.current?.focus()
    }
  }, [])

  const handleExample = useCallback((type) => {
    setRawInput(getExample(type))
    setShowXlsxCard(false)
  }, [])

  const handleExportErrors = useCallback(() => {
    if (!parseResult?.errors?.length) return
    const csv = exportErrorsToCsv(parseResult.errors)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'import_errors.csv'
    link.click()
  }, [parseResult])

  const handleClear = useCallback(() => {
    setRawInput('')
    setParseResult(null)
    setShowXlsxCard(false)
    setDragError('')
    setPrimaryKeyColumn('')
    setErrorFilterColumn('')
    setErrorFilterCode('')
  }, [])

  const loadXlsxLibrary = useCallback(() => {
    if (typeof window !== 'undefined' && !window.XLSX) {
      const script = document.createElement('script')
      script.src = XLSX_LIBRARY_INFO.url
      script.onload = () => setXlsxLoaded(true)
      document.head.appendChild(script)
    } else {
      setXlsxLoaded(true)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (rawInput.trim()) {
        handleParse()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [rawInput, handleParse])

  const getFilteredErrors = useCallback(() => {
    if (!parseResult?.errors) return []

    let errors = parseResult.errors.filter(e => e.rowIndex >= 0 || e.code === ERROR_CODES.UTF8_REPLACEMENT_CHAR)

    if (errorFilterColumn) {
      errors = errors.filter(e => e.columnKey === errorFilterColumn)
    }

    if (errorFilterCode) {
      errors = errors.filter(e => e.code === errorFilterCode)
    }

    return errors
  }, [parseResult, errorFilterColumn, errorFilterCode])

  const uniqueColumns = parseResult?.headers ? ['', ...parseResult.headers] : ['']
  const uniqueErrorCodes = ['', ...new Set(parseResult?.errors?.map(e => e.code) || [])]

  return (
    <div className="tabular-import-diagnostics">
      <h1>表格导入诊断工具</h1>

      <section className="tool-section">
        <h2>数据输入</h2>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${dragError ? 'error' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-icon">📁</div>
          <div className="drop-text">
            {dragError || '拖拽 CSV/TSV 文件到此处，或点击选择文件'}
          </div>
          <div className="drop-hint">支持 .csv, .tsv 格式，最大 {formatFileSize(LARGE_FILE_BYTE_THRESHOLD)}</div>
          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            accept=".csv,.tsv"
            onChange={handleFileSelect}
          />
        </div>

        {showXlsxCard && (
          <div className="xlsx-card">
            <h4>Excel 文件支持</h4>
            <p>
              检测到您上传了 Excel 文件。此功能需要动态加载 SheetJS 库
              (约 400KB) 来解析 Excel 格式。
            </p>
            <p>支持格式: {XLSX_LIBRARY_INFO.supportedFormats.join(', ')}</p>
            {!xlsxLoaded ? (
              <button onClick={loadXlsxLibrary}>加载解析库</button>
            ) : (
              <div style={{ color: '#10b981' }}>✓ 库已加载（实际解析需对接）</div>
            )}
          </div>
        )}

        <div className="paste-area">
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            或粘贴文本数据
          </label>
          <textarea
            ref={textareaRef}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="在此粘贴 CSV 或 TSV 格式的表格数据..."
          />
          <div className="example-buttons">
            <button className="example-btn" onClick={handlePaste}>📋 从剪贴板粘贴</button>
            <button className="example-btn" onClick={() => handleExample('standard')}>📊 标准 CSV 示例</button>
            <button className="example-btn" onClick={() => handleExample('european')}>🇪🇺 欧洲格式示例</button>
            <button className="example-btn" onClick={() => handleExample('errors')}>⚠️ 含错误的示例</button>
          </div>
        </div>

        <div className="options-row">
          <div className="option-group">
            <label htmlFor="pk-select">主键列（用于重复检测）</label>
            <select
              id="pk-select"
              value={primaryKeyColumn}
              onChange={(e) => setPrimaryKeyColumn(e.target.value)}
            >
              <option value="">无</option>
              {parseResult?.headers?.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="action-buttons">
          {isParsing ? (
            <>
              <div>
                <span className="loading-spinner" />
                解析中...
              </div>
              <button className="danger-btn" onClick={handleCancel}>取消</button>
            </>
          ) : (
            <button
              className="primary-btn"
              onClick={handleParse}
              disabled={!rawInput.trim()}
            >
              立即解析
            </button>
          )}
          <button className="secondary-btn" onClick={handleClear}>清空</button>
        </div>

        {isParsing && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${parseProgress * 100}%` }} />
          </div>
        )}
      </section>

      {parseResult && (
        <section className="tool-section">
          <h2>
            解析摘要
            {parseResult.isSampled && <span className="sample-badge">抽样预览</span>}
          </h2>

          {parseResult.hadBOM && (
            <div className="info-banner">
              ℹ️ 检测到 UTF-8 BOM 标记，已自动剥离
            </div>
          )}

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">总行数</span>
              <span className="stat-value">{parseResult.rawRowCount?.toLocaleString() || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">成功行数</span>
              <span className="stat-value success">{parseResult.successRowCount?.toLocaleString() || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">列数</span>
              <span className="stat-value">{parseResult.headers?.length || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">检测到的分隔符</span>
              <span className="stat-value">
                {parseResult.detectedDelimiter === PRESET_DELIMITERS.COMMA ? '逗号 (,)' :
                 parseResult.detectedDelimiter === PRESET_DELIMITERS.SEMICOLON ? '分号 (;)' :
                 parseResult.detectedDelimiter === PRESET_DELIMITERS.TAB ? '制表符 (\\t)' :
                 parseResult.detectedDelimiter}
              </span>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${(parseResult.delimiterConfidence || 0) * 100}%` }} />
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-label">小数点格式</span>
              <span className="stat-value">
                {parseResult.decimalSeparator === '.' ? '句号 (.)' : '逗号 (,)'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">错误数</span>
              <span className={`stat-value ${getFilteredErrors().length > 0 ? 'error' : ''}`}>
                {getFilteredErrors().length}
              </span>
            </div>
          </div>

          <h3 style={{ marginTop: '24px' }}>列类型推断</h3>
          <div className="schema-list">
            {parseResult.columnSchema?.map((col, idx) => (
              <div key={idx} className="schema-item">
                <span className="schema-name">{col.name}</span>
                <span className={`type-badge ${col.type}`}>{col.type}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {parseResult && parseResult.rows?.length > 0 && (
        <section className="tool-section">
          <h2>数据预览 (前 {Math.min(DEFAULT_PREVIEW_ROWS, parseResult.rows.length)} 行)</h2>

          <div className="table-wrapper">
            <table className="data-table">
              <caption>表格数据预览 - 仅显示部分数据用于验证</caption>
              <thead>
                <tr>
                  <th aria-sort="none">#</th>
                  {parseResult.headers?.map((h, idx) => (
                    <th key={idx} aria-sort="none">
                      {h}
                      <span className={`type-badge ${parseResult.columnSchema?.[idx]?.type}`}>
                        {parseResult.columnSchema?.[idx]?.type}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.slice(0, DEFAULT_PREVIEW_ROWS).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td>{rowIdx + 1}</td>
                    {parseResult.headers?.map((h, colIdx) => (
                      <td key={colIdx}>{row[h] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {getFilteredErrors().length > 0 && (
        <section className="tool-section">
          <h2>错误列表</h2>

          <div className="error-summary">
            <div className="error-summary-item">
              <span className="error-summary-count">{getFilteredErrors().length}</span>
              <span className="error-summary-label">个检测到的错误</span>
            </div>
          </div>

          <div className="error-filters">
            <div className="option-group">
              <label>按列筛选</label>
              <select
                value={errorFilterColumn}
                onChange={(e) => setErrorFilterColumn(e.target.value)}
              >
                {uniqueColumns.map(c => (
                  <option key={c || 'all'} value={c}>{c || '全部列'}</option>
                ))}
              </select>
            </div>
            <div className="option-group">
              <label>按错误码筛选</label>
              <select
                value={errorFilterCode}
                onChange={(e) => setErrorFilterCode(e.target.value)}
              >
                {uniqueErrorCodes.map(c => (
                  <option key={c || 'all'} value={c}>{c || '全部错误'}</option>
                ))}
              </select>
            </div>
            <button className="secondary-btn" onClick={handleExportErrors}>
              📥 导出错误 CSV
            </button>
          </div>

          <div className="error-list">
            {getFilteredErrors().map((error, idx) => (
              <div key={idx} className="error-item">
                <div className="error-header">
                  <span className="error-code">{error.code}</span>
                  <span className="error-row-col">
                    {error.rowIndex >= 0 && `行 ${error.rowIndex + 1}`}
                    {error.columnKey && ` · 列 "${error.columnKey}"`}
                    {error.rowIndex < 0 && !error.columnKey && '全局问题'}
                  </span>
                </div>
                <div className="error-message">{error.message}</div>
                {error.raw && (
                  <div className="error-raw">原始值: {error.raw}</div>
                )}
                {error.details && (
                  <div className="error-raw">详情: {JSON.stringify(error.details)}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {parseResult && parseResult.rawRowCount === 0 && (
        <section className="tool-section">
          <div className="empty-state">
            输入数据为空或无法解析
          </div>
        </section>
      )}

      {!parseResult && !rawInput && (
        <section className="tool-section">
          <div className="empty-state">
            上传文件或粘贴数据开始解析
          </div>
        </section>
      )}
    </div>
  )
}
