import { useCallback, useEffect, useRef, useState } from 'react'
import './FileUploadSurface.css'
import {
    ALLOWED_EXTENSIONS_DEFAULT,
    buildDownloadDescriptors,
    createDragStateMachine,
    deduplicateFilenames,
    DEFAULT_ALLOW_EMPTY_FILE,
    DEFAULT_MAX_FILES,
    DEFAULT_MAX_SINGLE_FILE_SIZE,
    DEFAULT_MAX_TOTAL_SIZE,
    DEFAULT_PARTIAL_PASS,
    DRAG_STATES,
    ERROR_CODES,
    formatSize,
    READ_MODES,
    readClipboardFiles,
    readFilesWithProgress,
    validateFiles,
} from './logic/index.js'

function createMockFileFromBlob(blob, name) {
  return new File([blob], name, { type: blob.type })
}

function createLargeBlob(size) {
  const chunkSize = 1024 * 1024
  const chunks = []
  const pattern = new Uint8Array(chunkSize)
  for (let i = 0; i < chunkSize; i++) {
    pattern[i] = 0x41 + (i % 26)
  }

  let remaining = size
  while (remaining > 0) {
    const toWrite = Math.min(remaining, chunkSize)
    if (toWrite === chunkSize) {
      chunks.push(pattern)
    } else {
      chunks.push(pattern.slice(0, toWrite))
    }
    remaining -= toWrite
  }

  return new Blob(chunks, { type: 'application/octet-stream' })
}

function createPngLikeBlob() {
  const pngMagic = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const filler = new Uint8Array(100)
  for (let i = 0; i < filler.length; i++) {
    filler[i] = 0x00
  }
  return new Blob([pngMagic, filler], { type: 'image/png' })
}

function createExeLikeBlob() {
  const exeMagic = new Uint8Array([0x4D, 0x5A])
  const filler = new Uint8Array(100)
  for (let i = 0; i < filler.length; i++) {
    filler[i] = 0x90
  }
  return new Blob([exeMagic, filler], { type: 'application/vnd.microsoft.portable-executable' })
}

function createTxtLikeBlob() {
  const utf8Bom = new Uint8Array([0xEF, 0xBB, 0xBF])
  const text = new TextEncoder().encode('Hello, this is a text file content.')
  return new Blob([utf8Bom, text], { type: 'text/plain' })
}

function getFileIcon(extension) {
  const ext = (extension || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp'].includes(ext)) {
    return '🖼️'
  }
  if (['pdf'].includes(ext)) {
    return '📄'
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return '🗜️'
  }
  if (['json', 'js', 'mjs', 'css', 'html', 'htm', 'xml', 'txt', 'md', 'csv'].includes(ext)) {
    return '📝'
  }
  if (['exe', 'msi', 'bin', 'dmg', 'deb', 'rpm'].includes(ext)) {
    return '⚠️'
  }
  return '📁'
}

export default function FileUploadSurface() {
  const [activeTab, setActiveTab] = useState('upload')
  const [config, setConfig] = useState({
    maxFiles: DEFAULT_MAX_FILES,
    maxSingleFileSize: DEFAULT_MAX_SINGLE_FILE_SIZE,
    maxTotalSize: DEFAULT_MAX_TOTAL_SIZE,
    allowEmptyFile: DEFAULT_ALLOW_EMPTY_FILE,
    partialPass: DEFAULT_PARTIAL_PASS,
    checkMagicNumber: true,
    allowedExtensions: Array.from(ALLOWED_EXTENSIONS_DEFAULT),
    readMode: READ_MODES.READ_CONTENT,
  })

  const [validationResult, setValidationResult] = useState(null)
  const [readProgress, setReadProgress] = useState({})
  const [isReading, setIsReading] = useState(false)
  const [dragState, setDragState] = useState(DRAG_STATES.IDLE)
  const [operationResult, setOperationResult] = useState(null)
  const [downloadDescriptors, setDownloadDescriptors] = useState([])
  const [clipboardResult, setClipboardResult] = useState(null)

  const fileInputRef = useRef(null)
  const dragMachineRef = useRef(createDragStateMachine())
  const dropZoneRef = useRef(null)

  useEffect(() => {
    const machine = dragMachineRef.current
    const zone = dropZoneRef.current
    if (!zone) return

    const handleDragEnter = (e) => {
      e.preventDefault()
      e.stopPropagation()
      machine.enter()
      setDragState(machine.getState())
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      e.stopPropagation()
      machine.leave()
      setDragState(machine.getState())
    }

    const handleDragOver = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e) => {
      e.preventDefault()
      e.stopPropagation()
      machine.drop()
      setDragState(machine.getState())

      handleDataTransfer(e.dataTransfer)
    }

    zone.addEventListener('dragenter', handleDragEnter)
    zone.addEventListener('dragleave', handleDragLeave)
    zone.addEventListener('dragover', handleDragOver)
    zone.addEventListener('drop', handleDrop)

    return () => {
      zone.removeEventListener('dragenter', handleDragEnter)
      zone.removeEventListener('dragleave', handleDragLeave)
      zone.removeEventListener('dragover', handleDragOver)
      zone.removeEventListener('drop', handleDrop)
    }
  }, [])

  const handleDataTransfer = useCallback(async (dataTransfer) => {
    if (!dataTransfer) return

    const files = Array.from(dataTransfer.files || [])
    if (files.length === 0) return

    await processFiles(files)
  }, [config])

  const processFiles = useCallback(async (files) => {
    setOperationResult(null)
    setReadProgress({})

    const validationOpts = {
      maxFiles: config.maxFiles,
      maxSingleFileSize: config.maxSingleFileSize,
      maxTotalSize: config.maxTotalSize,
      allowEmptyFile: config.allowEmptyFile,
      partialPass: config.partialPass,
      checkMagicNumber: config.checkMagicNumber,
      allowedExtensions: config.allowedExtensions,
    }

    const result = await validateFiles(files, validationOpts)
    setValidationResult(result)

    if (!result.success) {
      setOperationResult({
        success: false,
        error: result.error,
      })
      return
    }

    if (config.readMode === READ_MODES.VALIDATE_ONLY) {
      setOperationResult({
        success: true,
        message: '仅校验模式，未读取文件内容',
        stats: result.stats,
      })

      const descriptors = buildDownloadDescriptors(result.passedFiles)
      setDownloadDescriptors(descriptors)
      return
    }

    setIsReading(true)
    try {
      const readResult = await readFilesWithProgress(result.passedFiles, {
        readMode: config.readMode,
        onFileStart: ({ index }) => {
          setReadProgress((prev) => ({
            ...prev,
            [index]: { progress: 0, bytesRead: 0, totalBytes: result.passedFiles[index]?.size || 0 },
          }))
        },
        onFileProgress: ({ index, ...progress }) => {
          setReadProgress((prev) => ({
            ...prev,
            [index]: progress,
          }))
        },
        onFileComplete: ({ index, result: fileResult }) => {
          setReadProgress((prev) => ({
            ...prev,
            [index]: {
              ...prev[index],
              progress: 1,
              bytesRead: fileResult.totalBytes,
              complete: true,
            },
          }))
        },
      })

      setIsReading(false)
      setOperationResult({
        success: true,
        message: '所有文件已处理完成',
        stats: result.stats,
        readResults: readResult.results,
      })

      const descriptors = buildDownloadDescriptors(result.passedFiles)
      setDownloadDescriptors(descriptors)
    } catch (err) {
      setIsReading(false)
      setOperationResult({
        success: false,
        error: {
          errorCode: ERROR_CODES.FILE_READ_ERROR,
          errorMessage: err?.message || '读取文件时出错',
        },
      })
    }
  }, [config])

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    await processFiles(files)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processFiles])

  const handleClick = useCallback(() => {
    if (isReading) return
    fileInputRef.current?.click()
  }, [isReading])

  const handleLoadExamples = useCallback(async (type) => {
    let files = []

    switch (type) {
      case 'mixed-valid': {
        const pngBlob = createPngLikeBlob()
        const txtBlob = createTxtLikeBlob()
        files = [
          createMockFileFromBlob(pngBlob, 'image.png'),
          createMockFileFromBlob(txtBlob, 'document.txt'),
        ]
        break
      }

      case 'exe-renamed': {
        const exeBlob = createExeLikeBlob()
        files = [
          createMockFileFromBlob(exeBlob, 'malicious.txt'),
        ]
        break
      }

      case 'large-file': {
        const largeBlob = createLargeBlob(10 * 1024 * 1024)
        files = [
          createMockFileFromBlob(largeBlob, 'large-file.txt'),
        ]
        break
      }

      case 'empty-file': {
        const emptyBlob = new Blob([], { type: 'text/plain' })
        files = [
          createMockFileFromBlob(emptyBlob, 'empty.txt'),
        ]
        break
      }

      case 'duplicate-names': {
        const blob1 = new Blob(['content 1'], { type: 'text/plain' })
        const blob2 = new Blob(['content 2'], { type: 'text/plain' })
        const blob3 = new Blob(['content 3'], { type: 'text/plain' })
        files = [
          createMockFileFromBlob(blob1, 'note.txt'),
          createMockFileFromBlob(blob2, 'note.txt'),
          createMockFileFromBlob(blob3, 'note.txt'),
        ]
        break
      }

      default:
        return
    }

    await processFiles(files)
  }, [processFiles])

  const handlePaste = useCallback(async () => {
    const result = await readClipboardFiles({
      maxFiles: config.maxFiles,
      includeTextAsFile: true,
    })

    setClipboardResult(result)

    if (result.success && result.files.length > 0) {
      const actualFiles = result.files.map((f) => f.file)
      await processFiles(actualFiles)
    }
  }, [config.maxFiles, processFiles])

  const handleConfigChange = useCallback((key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const handleClear = useCallback(() => {
    setValidationResult(null)
    setReadProgress({})
    setOperationResult(null)
    setDownloadDescriptors([])
    setClipboardResult(null)
  }, [])

  const renderConfigPanel = () => {
    return (
      <div className="config-panel">
        <h3>校验配置</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>最大文件数</label>
            <input
              type="number"
              min="1"
              value={config.maxFiles}
              onChange={(e) => handleConfigChange('maxFiles', parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="config-item">
            <label>单文件大小上限 (MB)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={config.maxSingleFileSize / (1024 * 1024)}
              onChange={(e) => handleConfigChange('maxSingleFileSize', parseFloat(e.target.value) * 1024 * 1024 || 1024 * 1024)}
            />
          </div>
          <div className="config-item">
            <label>总大小上限 (MB)</label>
            <input
              type="number"
              min="0.1"
              step="1"
              value={config.maxTotalSize / (1024 * 1024)}
              onChange={(e) => handleConfigChange('maxTotalSize', parseFloat(e.target.value) * 1024 * 1024 || 10 * 1024 * 1024)}
            />
          </div>
          <div className="config-item">
            <label>读取模式</label>
            <select
              value={config.readMode}
              onChange={(e) => handleConfigChange('readMode', e.target.value)}
            >
              <option value={READ_MODES.READ_CONTENT}>读取内容</option>
              <option value={READ_MODES.VALIDATE_ONLY}>仅校验不读内容</option>
            </select>
          </div>
          <div className="config-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.allowEmptyFile}
                onChange={(e) => handleConfigChange('allowEmptyFile', e.target.checked)}
              />
              允许空文件
            </label>
          </div>
          <div className="config-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.partialPass}
                onChange={(e) => handleConfigChange('partialPass', e.target.checked)}
              />
              部分通过策略
            </label>
          </div>
          <div className="config-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.checkMagicNumber}
                onChange={(e) => handleConfigChange('checkMagicNumber', e.target.checked)}
              />
              魔数检查
            </label>
          </div>
        </div>
      </div>
    )
  }

  const renderDropZone = () => {
    const isDragging = dragState === DRAG_STATES.DRAGGING_OVER

    return (
      <div
        ref={dropZoneRef}
        className={`drop-zone ${isDragging ? 'is-dragging' : ''} ${isReading ? 'disabled' : ''}`}
        onClick={handleClick}
      >
        <div className="drop-zone-content">
          <div className="drop-zone-icon">
            {isDragging ? '📥' : '📁'}
          </div>
          <div className="drop-zone-text">
            <h3>
              {isDragging ? '松开以上传文件' : '拖拽文件到此处'}
            </h3>
            <p>或点击选择文件，也支持粘贴剪贴板内容</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden-input"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    )
  }

  const renderActionButtons = () => {
    return (
      <div className="action-buttons">
        <button
          className="action-btn primary"
          onClick={handlePaste}
          disabled={isReading}
        >
          📋 粘贴剪贴板
        </button>
        <button
          className="action-btn danger"
          onClick={handleClear}
          disabled={isReading}
        >
          🗑️ 清空
        </button>
      </div>
    )
  }

  const renderExamples = () => {
    return (
      <div className="examples-section">
        <h3>测试示例</h3>
        <p>点击按钮生成示例文件进行测试：</p>
        <div className="example-buttons">
          <button
            className="action-btn"
            onClick={() => handleLoadExamples('mixed-valid')}
          >
            ✅ 多文件 (PNG + TXT)
          </button>
          <button
            className="action-btn"
            onClick={() => handleLoadExamples('exe-renamed')}
          >
            ⚠️ EXE 改名为 .txt
          </button>
          <button
            className="action-btn"
            onClick={() => handleLoadExamples('large-file')}
          >
            📦 10MB 大文件
          </button>
          <button
            className="action-btn"
            onClick={() => handleLoadExamples('empty-file')}
          >
            📄 空文件
          </button>
          <button
            className="action-btn"
            onClick={() => handleLoadExamples('duplicate-names')}
          >
            📝 同名文件 (3个)
          </button>
        </div>
      </div>
    )
  }

  const renderMobileNotice = () => {
    return (
      <div className="mobile-notice">
        <p>
          <strong>移动端 UX 说明：</strong>在移动端浏览器中，拖拽功能通常不可用。
          请使用「点击选择文件」或「粘贴剪贴板」方式上传。
          所有校验逻辑在移动端完全一致。
        </p>
      </div>
    )
  }

  const renderResults = () => {
    if (!validationResult && !operationResult) {
      return (
        <div className="results-section">
          <div className="empty-state">
            <p>尚未上传文件。请拖拽文件、点击选择或使用测试示例。</p>
          </div>
        </div>
      )
    }

    const result = validationResult

    return (
      <div className="results-section">
        <div className="section-header">
          <h3>校验结果</h3>
        </div>

        {operationResult && (
          <div className={`result ${operationResult.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {operationResult.success ? '✅' : '❌'}
            </div>
            <div className="result-content">
              <h4>
                {operationResult.success ? '操作成功' : '操作失败'}
              </h4>
              <p>{operationResult.message || operationResult.error?.errorMessage}</p>
              {operationResult.error?.errorCode && (
                <p className="error-code">错误码: {operationResult.error.errorCode}</p>
              )}
              {operationResult.error?.recoveryHint && (
                <p className="error-hint">提示: {operationResult.error.recoveryHint}</p>
              )}
            </div>
          </div>
        )}

        {result && (
          <>
            <div className="stats-bar">
              <div className="stat-item">
                <span className="stat-label">总文件数</span>
                <span className="stat-value">{result.stats?.totalFiles || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">通过</span>
                <span className="stat-value success">{result.stats?.passedCount || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">失败</span>
                <span className="stat-value error">{result.stats?.failedCount || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">总大小</span>
                <span className="stat-value">{result.stats?.totalSizeHuman || '0 B'}</span>
              </div>
            </div>

            <div className="file-list">
              {result.results?.map((item, index) => {
                const file = item.file
                const ext = file.name.split('.').pop()
                const progress = readProgress[index]

                return (
                  <div
                    key={index}
                    className={`file-item ${item.passed ? 'passed' : 'failed'}`}
                  >
                    <div className="file-header">
                      <div className="file-info">
                        <span className="file-icon">
                          {getFileIcon(ext)}
                        </span>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-meta">
                            {formatSize(file.size)}
                            {ext && ` • ${ext.toUpperCase()}`}
                            {file.type && ` • ${file.type}`}
                          </div>
                        </div>
                      </div>
                      <div className="file-status">
                        <span className={`status-badge ${item.passed ? 'passed' : 'failed'}`}>
                          {item.passed ? '通过' : '失败'}
                        </span>
                      </div>
                    </div>

                    {progress && !progress.complete && (
                      <div className="progress-container">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${(progress.progress || 0) * 100}%` }}
                          />
                        </div>
                        <div className="progress-text">
                          {formatSize(progress.bytesRead || 0)} / {formatSize(progress.totalBytes || 0)}
                          {' '}({Math.round((progress.progress || 0) * 100)}%)
                        </div>
                      </div>
                    )}

                    {item.diagnostics && item.diagnostics.length > 0 && (
                      <div className="diagnostics">
                        {item.diagnostics.map((diag, dIdx) => (
                          <div key={dIdx} className="diagnostic-item">
                            <span className="diagnostic-icon">⚠️</span>
                            <div className="diagnostic-content">
                              <div className="diagnostic-code">{diag.errorCode}</div>
                              <div className="diagnostic-message">{diag.errorMessage}</div>
                              {diag.recoveryHint && (
                                <div className="diagnostic-hint">{diag.recoveryHint}</div>
                              )}
                              {diag.details && Object.keys(diag.details).length > 0 && (
                                <div className="diagnostic-details">
                                  {JSON.stringify(diag.details, null, 2)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {result.passedFiles && result.passedFiles.length > 0 && (
              <div className="descriptor-output">
                <div className="result success">
                  <div className="result-icon">📥</div>
                  <div className="result-content">
                    <h4>DownloadDescriptor 兼容输出</h4>
                    <p>已生成 {downloadDescriptors.length} 个下载描述符供宿主使用</p>
                    <p className="descriptor-note">
                      可通过 buildDownloadDescriptor(file) 获取 url, filename, mime, size, fileHandle 等字段
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const renderDedupeDemo = () => {
    if (!validationResult || !validationResult.passedFiles) {
      return null
    }

    const deduplicated = deduplicateFilenames(validationResult.passedFiles)
    const hasDuplicates = deduplicated.some((d) => d.isDuplicate)

    if (!hasDuplicates) {
      return null
    }

    return (
      <div className="results-section">
        <h3>文件名去重处理</h3>
        <div className="file-list">
          {deduplicated.filter((d) => d.isDuplicate).map((item, index) => (
            <div key={index} className="file-item passed">
              <div className="file-header">
                <div className="file-info">
                  <span className="file-icon">📝</span>
                  <div className="file-details">
                    <div className="file-name">
                      {item.originalName} → <strong>{item.finalName}</strong>
                    </div>
                    <div className="file-meta">
                      第 {item.duplicateIndex} 个重复，已添加后缀 _1
                    </div>
                  </div>
                </div>
                <div className="file-status">
                  <span className="status-badge passed">已重命名</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="file-upload-surface">
      <header className="tool-header">
        <h1>File Upload Surface 演示</h1>
        <p className="subtitle">
          通用文件上传表面：拖拽、选择、粘贴、校验管道、进度展示
        </p>
      </header>

      <nav className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          上传演示
        </button>
        <button
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          配置选项
        </button>
        <button
          className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          功能说明
        </button>
      </nav>

      {activeTab === 'upload' && (
        <section className="tab-panel">
          {renderMobileNotice()}
          {renderExamples()}
          {renderDropZone()}
          {renderActionButtons()}
          {renderResults()}
          {renderDedupeDemo()}
        </section>
      )}

      {activeTab === 'config' && (
        <section className="tab-panel">
          {renderConfigPanel()}
        </section>
      )}

      {activeTab === 'about' && (
        <section className="tab-panel about-panel">
          <div className="config-panel">
            <h3>功能清单</h3>
            <ul className="feature-list">
              <li><strong>通用文件入口：</strong>点击选择、拖拽、粘贴（从 ClipboardItem 提取）</li>
              <li><strong>拖拽状态机：</strong>防止子元素抖动的 enter/leave/drop 状态管理</li>
              <li><strong>校验管道：</strong>扩展名白名单 → MIME+魔数交叉判定 → 大小/数量上界</li>
              <li><strong>行级诊断：</strong>每项失败带 errorCode、文件名、原因、可重试提示</li>
              <li><strong>部分通过策略：</strong>可切换丢弃非法项继续处理</li>
              <li><strong>进度展示：</strong>stream().getReader() 或 FileReader 分块计数</li>
              <li><strong>快速路径：</strong>支持「仅校验不读内容」模式</li>
              <li><strong>DownloadDescriptor 兼容：</strong>校验通过后输出兼容 056 的结构</li>
              <li><strong>边界处理：</strong>空文件、同名去重、非 UTF-8 文件名、目录检测</li>
            </ul>
          </div>

          <div className="config-panel">
            <h3>魔数表 (精简版)</h3>
            <p className="magic-note">
              本任务内置的魔数检测表与 TASK_080 语义对齐：
            </p>
            <ul className="magic-list">
              <li>PDF: 25 50 44 46 (%PDF)</li>
              <li>PNG: 89 50 4E 47 0D 0A 1A 0A</li>
              <li>JPEG: FF D8 FF</li>
              <li>GIF: 47 49 46 38</li>
              <li>WebP: 52 49 46 46 + WEBP 签名</li>
              <li>ZIP: 50 4B 03 04 / 05 06 / 07 08</li>
              <li>PE 可执行文件 (EXE): 4D 5A (MZ)</li>
              <li>XML: 3C 3F 78 6D 6C</li>
              <li>UTF-8 BOM 文本: EF BB BF</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
