import { useCallback, useRef, useState } from 'react'
import './UploadMagicByteGate.css'
import {
    DEFAULT_SIZE_TIER,
    FILE_STATES,
    formatSize,
    processSingleFile,
    SEVERITY
} from './logic/index.js'

const UploadMagicByteGate = ({
  maxFiles = 20,
  sizeTier = DEFAULT_SIZE_TIER,
  className = '',
}) => {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [abortController, setAbortController] = useState(null)
  const fileInputRef = useRef(null)

  const processFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return

    setIsProcessing(true)
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const initialFiles = Array.from(fileList).slice(0, maxFiles - files.length).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        state: FILE_STATES.PENDING,
        validationResult: null,
      }))

      setFiles((prev) => [...prev, ...initialFiles])

      for (const fileItem of initialFiles) {
        if (controller.signal.aborted) break

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, state: FILE_STATES.VALIDATING } : f
          )
        )

        const result = await processSingleFile(
          fileItem.file,
          { sizeTier },
          controller.signal
        )

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  state: result.state,
                  validationResult: result.validationResult,
                }
              : f
          )
        )
      }
    } finally {
      setIsProcessing(false)
      setAbortController(null)
    }
  }, [files, maxFiles, sizeTier])

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFiles = e.dataTransfer?.files
      if (droppedFiles && droppedFiles.length > 0) {
        processFiles(droppedFiles)
      }
    },
    [processFiles]
  )

  const handleFileSelect = useCallback(
    (e) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        processFiles(selectedFiles)
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [processFiles]
  )

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const removeFile = useCallback((fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      next.delete(fileId)
      return next
    })
  }, [])

  const retryFile = useCallback(
    async (fileId) => {
      const fileItem = files.find((f) => f.id === fileId)
      if (!fileItem) return

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, state: FILE_STATES.VALIDATING } : f
        )
      )

      const result = await processSingleFile(fileItem.file, { sizeTier })

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                state: result.state,
                validationResult: result.validationResult,
              }
            : f
        )
      )
    },
    [files, sizeTier]
  )

  const toggleExpand = useCallback((fileId) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setFiles([])
    setExpandedFiles(new Set())
  }, [])

  const cancelProcessing = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
  }, [abortController])

  const addDemoFile = useCallback(
    (type) => {
      let blob
      let fileName

      switch (type) {
        case 'valid-png': {
          const pngSignature = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
          ])
          const rest = new Uint8Array(100).fill(0x00)
          const combined = new Uint8Array(pngSignature.length + rest.length)
          combined.set(pngSignature)
          combined.set(rest, pngSignature.length)
          blob = new Blob([combined], { type: 'image/png' })
          fileName = 'valid-image.png'
          break
        }
        case 'mismatch-png': {
          const textContent = new TextEncoder().encode('This is actually text file, not an image!')
          blob = new Blob([textContent], { type: 'image/png' })
          fileName = 'fake-image.png'
          break
        }
        case 'large-file': {
          const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
          const size = 15 * 1024 * 1024
          const parts = [header]
          let remaining = size - header.length
          const chunkSize = 1024 * 1024
          while (remaining > 0) {
            const chunk = new Uint8Array(Math.min(chunkSize, remaining)).fill(0x00)
            parts.push(chunk)
            remaining -= chunk.length
          }
          blob = new Blob(parts, { type: 'application/octet-stream' })
          Object.defineProperty(blob, 'name', { value: 'large-virtual-file.bin' })
          fileName = 'large-virtual-file.bin'
          break
        }
        default:
          return
      }

      const file = new File([blob], fileName, { type: blob.type })
      processFiles([file])
    },
    [processFiles]
  )

  const getStatusBadgeClass = (state, result) => {
    if (state === FILE_STATES.PASSED) {
      const hasWarnings = result?.issues?.some((i) => i.severity === SEVERITY.WARNING)
      if (hasWarnings) return 'upload-magic-gate__file-status-badge--warning'
      return 'upload-magic-gate__file-status-badge--passed'
    }
    if (state === FILE_STATES.FAILED) return 'upload-magic-gate__file-status-badge--failed'
    if (state === FILE_STATES.VALIDATING) return 'upload-magic-gate__file-status-badge--validating'
    return 'upload-magic-gate__file-status-badge--pending'
  }

  const getStatusText = (state, result) => {
    if (state === FILE_STATES.PASSED) {
      const hasWarnings = result?.issues?.some((i) => i.severity === SEVERITY.WARNING)
      if (hasWarnings) return '有警告'
      return '通过'
    }
    if (state === FILE_STATES.FAILED) return '未通过'
    if (state === FILE_STATES.VALIDATING) return '校验中...'
    return '等待中'
  }

  const getFileIcon = (result) => {
    const mime = result?.detectedMime || result?.declaredMime || ''
    if (mime.includes('image')) return '🖼️'
    if (mime.includes('pdf')) return '📄'
    if (mime.includes('zip') || mime.includes('archive')) return '📦'
    if (mime.includes('executable') || mime.includes('octet')) return '⚠️'
    if (mime.includes('text')) return '📝'
    if (mime.includes('video')) return '🎬'
    if (mime.includes('audio')) return '🎵'
    return '📁'
  }

  const getIssueClass = (severity) => {
    if (severity === SEVERITY.ERROR) return 'upload-magic-gate__issue-item--error'
    if (severity === SEVERITY.WARNING) return 'upload-magic-gate__issue-item--warning'
    return 'upload-magic-gate__issue-item--info'
  }

  const formatHexPreview = (bytes) => {
    if (!bytes || bytes.length === 0) return null

    const rows = []
    const bytesPerRow = 16
    const maxRows = 4

    for (let i = 0; i < Math.min(bytes.length, maxRows * bytesPerRow); i += bytesPerRow) {
      const slice = bytes.slice(i, i + bytesPerRow)
      const hexParts = []
      for (let j = 0; j < slice.length; j++) {
        hexParts.push(slice[j].toString(16).padStart(2, '0').toUpperCase())
      }
      while (hexParts.length < bytesPerRow) {
        hexParts.push('  ')
      }

      const ascii = Array.from(slice)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('')

      rows.push({
        offset: i.toString(16).padStart(4, '0').toUpperCase(),
        hex: hexParts.join(' '),
        ascii: ascii.padEnd(bytesPerRow, ' '),
      })
    }

    return rows
  }

  const passedCount = files.filter((f) => f.state === FILE_STATES.PASSED).length
  const failedCount = files.filter((f) => f.state === FILE_STATES.FAILED).length
  const hasErrors = failedCount > 0
  const hasWarnings = files.some((f) =>
    f.validationResult?.issues?.some((i) => i.severity === SEVERITY.WARNING)
  )

  return (
    <div className={`upload-magic-gate ${className}`}>
      <h1 className="upload-magic-gate__title">文件上传安全闸</h1>

      {files.length > 0 && (
        <div
          className={`upload-magic-gate__summary-banner upload-magic-gate__summary-banner--${
            hasErrors ? 'error' : hasWarnings ? 'warning' : 'success'
          }`}
        >
          <div className="upload-magic-gate__summary-title">
            {hasErrors
              ? '存在安全问题'
              : hasWarnings
              ? '需要注意的问题'
              : '所有文件校验通过'}
          </div>
          <div className="upload-magic-gate__summary-text">
            共 {files.length} 个文件，通过: {passedCount}，未通过: {failedCount}
          </div>
        </div>
      )}

      <div
        className={`upload-magic-gate__dropzone ${
          isDragging ? 'upload-magic-gate__dropzone--dragging' : ''
        }`}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="upload-magic-gate__dropzone-icon">📥</div>
        <div className="upload-magic-gate__dropzone-text">
          点击或拖拽文件到此处上传
        </div>
        <div className="upload-magic-gate__dropzone-hint">
          支持多文件上传，最大 {maxFiles} 个文件
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="upload-magic-gate__file-input"
          onChange={handleFileSelect}
        />
      </div>

      {isProcessing && (
        <div className="upload-magic-gate__actions">
          <button
            className="upload-magic-gate__btn upload-magic-gate__btn--danger"
            onClick={cancelProcessing}
          >
            取消处理
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="upload-magic-gate__file-list">
          <div className="upload-magic-gate__file-list-header">
            <span className="upload-magic-gate__file-list-title">文件列表</span>
            <div className="upload-magic-gate__file-list-stats">
              <span>
                {passedCount} / {files.length} 通过
              </span>
              <button
                className="upload-magic-gate__btn upload-magic-gate__btn--secondary"
                style={{ marginLeft: 12, padding: '6px 12px', fontSize: 12 }}
                onClick={clearAll}
              >
                清空全部
              </button>
            </div>
          </div>

          {files.map((fileItem) => {
            const isExpanded = expandedFiles.has(fileItem.id)
            const { validationResult } = fileItem
            const hexRows = formatHexPreview(validationResult?.bytes)

            return (
              <div key={fileItem.id} className="upload-magic-gate__file-item">
                <div className="upload-magic-gate__file-item-header">
                  <span className="upload-magic-gate__file-icon">
                    {getFileIcon(validationResult)}
                  </span>
                  <div className="upload-magic-gate__file-info">
                    <div className="upload-magic-gate__file-name">
                      {fileItem.file.name}
                    </div>
                    <div className="upload-magic-gate__file-meta">
                      {formatSize(fileItem.file.size)}
                      {validationResult?.detectedMime && (
                        <span style={{ marginLeft: 8 }}>
                          · {validationResult.detectedMime}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`upload-magic-gate__file-status-badge ${getStatusBadgeClass(
                      fileItem.state,
                      validationResult
                    )}`}
                  >
                    {getStatusText(fileItem.state, validationResult)}
                  </span>
                  <div className="upload-magic-gate__file-actions">
                    {fileItem.state === FILE_STATES.FAILED && (
                      <button
                        className="upload-magic-gate__file-btn"
                        title="重试"
                        onClick={() => retryFile(fileItem.id)}
                      >
                        🔄
                      </button>
                    )}
                    <button
                      className="upload-magic-gate__file-btn"
                      title={isExpanded ? '收起详情' : '展开详情'}
                      onClick={() => toggleExpand(fileItem.id)}
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    <button
                      className="upload-magic-gate__file-btn upload-magic-gate__file-btn--danger"
                      title="移除"
                      onClick={() => removeFile(fileItem.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {isExpanded && validationResult && (
                  <div className="upload-magic-gate__file-details">
                    {validationResult.issues && validationResult.issues.length > 0 && (
                      <div className="upload-magic-gate__file-detail-section">
                        <div className="upload-magic-gate__file-detail-title">
                          检查结果 ({validationResult.issues.length})
                        </div>
                        <div className="upload-magic-gate__issues-list">
                          {validationResult.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className={`upload-magic-gate__issue-item ${getIssueClass(
                                issue.severity
                              )}`}
                            >
                              <div className="upload-magic-gate__issue-message">
                                [{issue.code}] {issue.message}
                              </div>
                              {issue.hint && (
                                <div className="upload-magic-gate__issue-hint">
                                  提示: {issue.hint}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {hexRows && hexRows.length > 0 && (
                      <div className="upload-magic-gate__file-detail-section">
                        <div className="upload-magic-gate__file-detail-title">
                          十六进制预览 (前 {validationResult.bytes?.length || 0} 字节)
                        </div>
                        <div className="upload-magic-gate__hex-preview">
                          {hexRows.map((row, idx) => (
                            <div key={idx} className="upload-magic-gate__hex-row">
                              <span className="upload-magic-gate__hex-offset">
                                {row.offset}
                              </span>
                              <span className="upload-magic-gate__hex-bytes">{row.hex}</span>
                              <span className="upload-magic-gate__hex-ascii">{row.ascii}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {files.length === 0 && (
        <div className="upload-magic-gate__empty-state">
          <div className="upload-magic-gate__empty-state-icon">📁</div>
          <div className="upload-magic-gate__empty-state-text">
            还没有上传任何文件，点击上方区域或拖拽文件开始
          </div>
        </div>
      )}

      <div className="upload-magic-gate__demo-buttons">
        <button
          className="upload-magic-gate__demo-btn"
          onClick={() => addDemoFile('valid-png')}
        >
          <span className="upload-magic-gate__demo-btn-icon">✅</span>
          <span>示例: 正确 PNG 头</span>
        </button>
        <button
          className="upload-magic-gate__demo-btn"
          onClick={() => addDemoFile('mismatch-png')}
        >
          <span className="upload-magic-gate__demo-btn-icon">⚠️</span>
          <span>示例: 伪装成 PNG 的文本</span>
        </button>
        <button
          className="upload-magic-gate__demo-btn"
          onClick={() => addDemoFile('large-file')}
        >
          <span className="upload-magic-gate__demo-btn-icon">📦</span>
          <span>示例: 15MB 虚拟大文件</span>
        </button>
      </div>
    </div>
  )
}

export { UploadMagicByteGate }
export default UploadMagicByteGate
