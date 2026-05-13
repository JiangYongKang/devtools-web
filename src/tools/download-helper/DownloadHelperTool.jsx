import { useCallback, useRef, useState } from 'react'
import {
  EXAMPLES,
  DEFAULT_BLOB_SIZE_LIMIT,
  DEFAULT_REVOKE_TIMEOUT_MS,
  ERROR_CODES,
  getErrorMessage,
  sanitizeFilename,
  generateStableShortHash,
  percentEncodeFilename,
  parseContentDisposition,
  buildDownloadDescriptor,
  triggerDownloadFromDescriptor,
  formatSize,
  debounce,
} from './logic/index.js'
import './DownloadHelperTool.css'

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

const DEMO_TABS = {
  SMALL_TEXT: 'small-text',
  LARGE_BLOB: 'large-blob',
  REVOKE_DEMO: 'revoke-demo',
  FILENAME_TEST: 'filename-test',
  CONTENT_DISPOSITION: 'content-disposition',
}

export default function DownloadHelperTool() {
  const [activeTab, setActiveTab] = useState(DEMO_TABS.SMALL_TEXT)

  const [textInput, setTextInput] = useState(EXAMPLES.smallText)
  const [filenameInput, setFilenameInput] = useState('users.csv')
  const [forceBom, setForceBom] = useState(false)
  const [memoryLimit, setMemoryLimit] = useState(DEFAULT_BLOB_SIZE_LIMIT)
  const [revokeTimeout, setRevokeTimeout] = useState(DEFAULT_REVOKE_TIMEOUT_MS)
  const [overrideMime, setOverrideMime] = useState('')
  const [downloadMode, setDownloadMode] = useState('anchor')
  const [activeSmallTextExample, setActiveSmallTextExample] = useState('csv')
  const [activeFilenameTest, setActiveFilenameTest] = useState(null)
  const [activeCDExample, setActiveCDExample] = useState('utf8')

  const [largeBlobSize, setLargeBlobSize] = useState(10)
  const [largeBlobChunks, setLargeBlobChunks] = useState(10)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  const [revokeEarly, setRevokeEarly] = useState(false)

  const [dispositionHeader, setDispositionHeader] = useState("attachment; filename*=UTF-8''%E4%B8%AD%E6%96%87%E6%96%87%E4%BB%B6.csv; filename=fallback.csv")

  const [result, setResult] = useState(null)
  const [currentDescriptor, setCurrentDescriptor] = useState(null)
  const [status, setStatus] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

  const fileInputRef = useRef(null)

  const showStatus = useCallback((message, type = 'success') => {
    setStatus({ message, type })
    setTimeout(() => setStatus(null), 3000)
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
    setResult(null)
    setCurrentDescriptor(null)
    setActiveSmallTextExample(exampleType)
    switch (exampleType) {
      case 'csv':
        setTextInput(EXAMPLES.smallText)
        setFilenameInput('users.csv')
        setOverrideMime('')
        break
      case 'json':
        setTextInput(EXAMPLES.jsonText)
        setFilenameInput('data.json')
        setOverrideMime('')
        break
      case 'emoji':
        setTextInput(EXAMPLES.emojiText)
        setFilenameInput('你好🌍世界.txt')
        setOverrideMime('')
        break
      default:
        break
    }
  }, [])

  const handleSmallTextDownload = useCallback(async () => {
    setResult(null)
    setCurrentDescriptor(null)

    const descriptor = await buildDownloadDescriptor(textInput, {
      filename: filenameInput,
      overrideMime: overrideMime || null,
      forceBom,
      memoryLimit,
      revokeTimeout,
      memoryWarningOnly: true,
    })

    if (!descriptor.success) {
      setResult({ type: 'error', data: descriptor.error })
      showStatus(getErrorMessage(descriptor.error?.errorCode) || '构建失败', 'error')
      return
    }

    setCurrentDescriptor(descriptor)

    if (descriptor.memoryCheck.isOverLimit) {
      showStatus(`内存警告：${descriptor.memoryCheck.humanSize} 超过 ${descriptor.memoryCheck.humanLimit} 限制`, 'warning')
    }

    if (revokeEarly && descriptor.revoke) {
      descriptor.revoke()
      showStatus('URL 已提前 revoke（演示用）', 'warning')
    }

    const triggerResult = await triggerDownloadFromDescriptor(descriptor, {
      mode: downloadMode,
      revokeAfter: !revokeEarly,
    })

    if (!triggerResult.success && !triggerResult.aborted) {
      setResult({ type: 'error', data: triggerResult.error })
    } else if (triggerResult.aborted) {
      showStatus('用户取消保存', 'warning')
    } else {
      setResult({
        type: 'success',
        data: {
          filename: descriptor.filename,
          mime: descriptor.mime,
          size: descriptor.blobSize,
          mode: triggerResult.mode,
          memoryCheck: descriptor.memoryCheck,
          revokedEarly: revokeEarly,
        },
      })
      showStatus(`下载已触发（${triggerResult.mode}）`, 'success')
    }
  }, [textInput, filenameInput, overrideMime, forceBom, memoryLimit, revokeTimeout, revokeEarly, downloadMode, showStatus])

  const handleGenerateLargeBlob = useCallback(async () => {
    setIsGenerating(true)
    setGenerationProgress(0)

    const chunks = []
    const chunkSize = (largeBlobSize * 1024 * 1024) / largeBlobChunks
    const basePattern = 'Hello, World! 1234567890 '
    const chunkContent = basePattern.repeat(Math.ceil(chunkSize / basePattern.length)).slice(0, chunkSize)

    for (let i = 0; i < largeBlobChunks; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10))
      chunks.push(chunkContent)
      setGenerationProgress(Math.round(((i + 1) / largeBlobChunks) * 100))
    }

    const blob = new Blob(chunks, { type: 'text/plain;charset=utf-8' })

    const descriptor = await buildDownloadDescriptor(blob, {
      filename: `large-file-${Date.now()}.txt`,
      memoryLimit,
      memoryWarningOnly: true,
    })

    if (!descriptor.success) {
      setResult({ type: 'error', data: descriptor.error })
      showStatus(getErrorMessage(descriptor.error?.errorCode) || '构建失败', 'error')
      setIsGenerating(false)
      return
    }

    setCurrentDescriptor(descriptor)

    const triggerResult = await triggerDownloadFromDescriptor(descriptor, {
      mode: downloadMode,
    })

    if (triggerResult.success || triggerResult.aborted) {
      setResult({
        type: 'success',
        data: {
          filename: descriptor.filename,
          mime: descriptor.mime,
          size: descriptor.blobSize,
          mode: triggerResult.mode,
          memoryCheck: descriptor.memoryCheck,
          chunksCount: largeBlobChunks,
        },
      })
      showStatus(`大文件下载已触发（${formatSize(descriptor.blobSize)}）`, 'success')
    } else {
      setResult({ type: 'error', data: triggerResult.error })
    }

    setIsGenerating(false)
  }, [largeBlobSize, largeBlobChunks, memoryLimit, downloadMode, showStatus])

  const handleRevokeDemo = useCallback(async () => {
    setResult(null)
    setCurrentDescriptor(null)

    const descriptor = await buildDownloadDescriptor('这是 revoke 演示的测试内容', {
      filename: 'revoke-demo.txt',
      revokeTimeout: 5000,
    })

    if (!descriptor.success) {
      setResult({ type: 'error', data: descriptor.error })
      return
    }

    setCurrentDescriptor(descriptor)

    const demoResults = []

    demoResults.push({
      label: '初始状态',
      isRevoked: descriptor.isRevoked(),
    })

    if (revokeEarly) {
      descriptor.revoke()
      demoResults.push({
        label: '手动 revoke 后',
        isRevoked: descriptor.isRevoked(),
      })
    }

    setResult({
      type: 'info',
      data: {
        url: descriptor.url,
        filename: descriptor.filename,
        revokeTimeout: 5000,
        demoResults,
        canUseFilePicker: typeof showSaveFilePicker !== 'undefined',
        canUseUrl: descriptor.url !== null,
      },
    })

    if (descriptor.url) {
      showStatus('对象 URL 已生成（5秒后自动 revoke）', 'success')
    } else {
      showStatus('当前环境不支持 createObjectURL', 'warning')
    }
  }, [revokeEarly, showStatus])

  const handleFilenameTest = useCallback(() => {
    const sanitized = sanitizeFilename(filenameInput, {
      maxLength: 255,
      crossPlatform: true,
    })

    const percentEncoded = percentEncodeFilename(filenameInput)
    const hash = generateStableShortHash(filenameInput)

    setResult({
      type: 'filename',
      data: {
        raw: filenameInput,
        sanitized,
        percentEncoded,
        hash,
      },
    })

    showStatus('文件名分析完成', 'success')
  }, [filenameInput, showStatus])

  const handleContentDispositionTest = useCallback(() => {
    const parsed = parseContentDisposition(dispositionHeader)

    if (!parsed.success) {
      setResult({ type: 'error', data: parsed.error })
      showStatus(parsed.error?.errorMessage || '解析失败', 'error')
      return
    }

    if (parsed.decodedFilename) {
      const sanitized = sanitizeFilename(parsed.decodedFilename)
      parsed.sanitizedFilename = sanitized.sanitized
    }

    setResult({
      type: 'disposition',
      data: parsed,
    })
    showStatus('Content-Disposition 解析完成', 'success')
  }, [dispositionHeader, showStatus])

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

  const renderResultBox = () => {
    if (!result) return null

    if (result.type === 'error') {
      return renderErrorBox(result.data)
    }

    if (result.type === 'success') {
      const { data } = result
      return (
        <div className="result-box">
          <div className="result-header">
            <span className="result-label">下载结果</span>
          </div>
          <div className="result-info">
            <div className="info-item">
              <span className="info-label">文件名</span>
              <code>{escapeHtml(data.filename)}</code>
            </div>
            <div className="info-item">
              <span className="info-label">MIME 类型</span>
              <code>{escapeHtml(data.mime)}</code>
            </div>
            <div className="info-item">
              <span className="info-label">文件大小</span>
              <code>{formatSize(data.size)}</code>
            </div>
            <div className="info-item">
              <span className="info-label">下载模式</span>
              <code>{data.mode}</code>
            </div>
            {data.chunksCount && (
              <div className="info-item">
                <span className="info-label">分片数量</span>
                <code>{data.chunksCount}</code>
              </div>
            )}
            {data.memoryCheck && (
              <div className="info-item full-width">
                <span className="info-label">内存检查</span>
                <div className={data.memoryCheck.isOverLimit ? 'status-badge miss' : 'status-badge hit'}>
                  {data.memoryCheck.humanSize} / {data.memoryCheck.humanLimit}
                  {data.memoryCheck.isOverLimit ? '（超出限制）' : '（正常）'}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (result.type === 'info') {
      const { data } = result
      return (
        <div className="result-box">
          <div className="result-header">
            <span className="result-label">Revoke 演示信息</span>
          </div>
          <div className="result-info">
            <div className="info-item">
              <span className="info-label">Object URL</span>
              <code>{data.url || '(当前环境不支持)'}</code>
            </div>
            <div className="info-item">
              <span className="info-label">文件名</span>
              <code>{escapeHtml(data.filename)}</code>
            </div>
            <div className="info-item">
              <span className="info-label">自动超时</span>
              <code>{data.revokeTimeout}ms</code>
            </div>
            <div className="info-item">
              <span className="info-label">环境支持</span>
              <div className="match-details">
                <span className={`status-badge ${data.canUseUrl ? 'hit' : 'miss'}`}>
                  createObjectURL: {data.canUseUrl ? '支持' : '不支持'}
                </span>
                <span className={`status-badge ${data.canUseFilePicker ? 'hit' : 'miss'}`}>
                  showSaveFilePicker: {data.canUseFilePicker ? '支持' : '不支持'}
                </span>
              </div>
            </div>
            <div className="info-item full-width">
              <span className="info-label">Revoke 状态检查</span>
              <div className="match-details">
                {data.demoResults.map((r, i) => (
                  <span key={i} className={`status-badge ${r.isRevoked ? 'miss' : 'hit'}`}>
                    {r.label}: {r.isRevoked ? '已 Revoke' : '可用'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (result.type === 'filename') {
      const { data } = result
      return (
        <div className="result-box">
          <div className="result-header">
            <span className="result-label">文件名分析结果</span>
          </div>
          <div className="result-info">
            <div className="info-item">
              <span className="info-label">原始文件名</span>
              <code>{escapeHtml(data.raw)}</code>
            </div>
            <div className="info-item">
              <span className="info-label">净化后文件名</span>
              <code>{data.sanitized.success ? escapeHtml(data.sanitized.sanitized) : '(错误)'}</code>
            </div>
            <div className="info-item">
              <span className="info-label">RFC 5987 编码</span>
              <code>{escapeHtml(data.percentEncoded)}</code>
            </div>
            <div className="info-item">
              <span className="info-label">稳定短哈希</span>
              <code>{data.hash}</code>
            </div>
          </div>
        </div>
      )
    }

    if (result.type === 'disposition') {
      const { data } = result
      return (
        <div className="result-box">
          <div className="result-header">
            <span className="result-label">Content-Disposition 解析结果</span>
          </div>
          <div className="result-info">
            <div className="info-item">
              <span className="info-label">filename (ASCII)</span>
              <code>{escapeHtml(data.filename || '(未设置)')}</code>
            </div>
            <div className="info-item">
              <span className="info-label">filename* (原始)</span>
              <code>{escapeHtml(data.filenameStar || '(未设置)')}</code>
            </div>
            <div className="info-item">
              <span className="info-label">decodedFilename (解码后)</span>
              <code>{escapeHtml(data.decodedFilename || '(未设置)')}</code>
            </div>
            {data.sanitizedFilename && (
              <div className="info-item">
                <span className="info-label">净化后文件名</span>
                <code>{escapeHtml(data.sanitizedFilename)}</code>
              </div>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="download-helper">
      {status && (
        <div className={`toast ${status.type}`}>
          <span>{status.message}</span>
        </div>
      )}

      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="main-card">
        <div className="card-header">
          <h1 className="card-title">下载助手</h1>
          <p className="card-subtitle">
            统一的文件下载入口：从 <code>string</code>、<code>Blob</code>、<code>ArrayBuffer</code> 生成对象 URL，自动管理 <code>revoke</code>
          </p>
        </div>

        <div className="tab-bar">
          {[
            { id: DEMO_TABS.SMALL_TEXT, label: '小文本下载', icon: '📄' },
            { id: DEMO_TABS.LARGE_BLOB, label: '大 Blob 下载', icon: '💾' },
            { id: DEMO_TABS.REVOKE_DEMO, label: 'Revoke 演示', icon: '🔄' },
            { id: DEMO_TABS.FILENAME_TEST, label: '文件名测试', icon: '📝' },
            { id: DEMO_TABS.CONTENT_DISPOSITION, label: 'CD 解析', icon: '🔍' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="card-body">
          <div className="settings-panel">
            <div className="setting-group">
              <label className="setting-label">全局设置</label>
              <div className="option-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={forceBom}
                    onChange={(e) => setForceBom(e.target.checked)}
                  />
                  <span>强制 UTF-8 BOM（CSV 默认添加）</span>
                </label>
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">下载模式</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="downloadMode"
                    value="anchor"
                    checked={downloadMode === 'anchor'}
                    onChange={(e) => setDownloadMode(e.target.value)}
                  />
                  <span>Anchor 方式（兼容）</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="downloadMode"
                    value="filePicker"
                    checked={downloadMode === 'filePicker'}
                    onChange={(e) => setDownloadMode(e.target.value)}
                  />
                  <span>File System Access（现代浏览器）</span>
                </label>
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">内存限制（MB）</label>
              <input
                type="number"
                className="value-input"
                value={memoryLimit / (1024 * 1024)}
                onChange={(e) => setMemoryLimit(Number(e.target.value) * 1024 * 1024)}
                min={1}
                max={1000}
              />
            </div>
          </div>

          {activeTab === DEMO_TABS.SMALL_TEXT && (
            <div className="content-section">
              <div className="form-group">
                <label htmlFor="text-input" className="input-label">文本内容</label>
                <textarea
                  id="text-input"
                  className="batch-textarea"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="输入要下载的文本内容..."
                  spellCheck={false}
                />
              </div>

              <div className="examples-panel">
                <span className="examples-title">示例：</span>
                <button
                  className={`chip ${activeSmallTextExample === 'csv' ? 'chip-active' : ''}`}
                  onClick={() => handleLoadExample('csv')}
                  type="button"
                >
                  CSV
                </button>
                <button
                  className={`chip ${activeSmallTextExample === 'json' ? 'chip-active' : ''}`}
                  onClick={() => handleLoadExample('json')}
                  type="button"
                >
                  JSON
                </button>
                <button
                  className={`chip ${activeSmallTextExample === 'emoji' ? 'chip-active' : ''}`}
                  onClick={() => handleLoadExample('emoji')}
                  type="button"
                >
                  Emoji
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="filename-input" className="input-label">文件名</label>
                <input
                  id="filename-input"
                  type="text"
                  className="value-input"
                  value={filenameInput}
                  onChange={(e) => setFilenameInput(e.target.value)}
                  placeholder="report.csv"
                />
              </div>

              <div className="form-group">
                <label htmlFor="mime-input" className="input-label">MIME 类型覆盖（可选）</label>
                <input
                  id="mime-input"
                  type="text"
                  className="value-input"
                  value={overrideMime}
                  onChange={(e) => setOverrideMime(e.target.value)}
                  placeholder="例如：text/csv;charset=utf-8"
                />
                <p className="input-hint">留空则根据内容或扩展名自动推断</p>
              </div>

              <div className="option-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={revokeEarly}
                    onChange={(e) => setRevokeEarly(e.target.checked)}
                  />
                  <span>演示：提前 Revoke URL（模拟错误场景）</span>
                </label>
              </div>

              <div className="action-bar">
                <button
                  className="btn btn-primary"
                  onClick={handleSmallTextDownload}
                  disabled={!textInput.trim() || !filenameInput.trim()}
                  type="button"
                >
                  下载文件
                </button>
                {currentDescriptor?.url && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleCopy(currentDescriptor.url, 'Object URL')}
                    type="button"
                  >
                    复制 URL
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === DEMO_TABS.LARGE_BLOB && (
            <div className="content-section">
              <div className="form-group">
                <label htmlFor="blob-size" className="input-label">生成大小（MB）</label>
                <input
                  id="blob-size"
                  type="number"
                  className="value-input"
                  value={largeBlobSize}
                  onChange={(e) => setLargeBlobSize(Number(e.target.value))}
                  min={1}
                  max={500}
                />
              </div>

              <div className="form-group">
                <label htmlFor="blob-chunks" className="input-label">分片数量</label>
                <input
                  id="blob-chunks"
                  type="number"
                  className="value-input"
                  value={largeBlobChunks}
                  onChange={(e) => setLargeBlobChunks(Number(e.target.value))}
                  min={1}
                  max={100}
                />
                <p className="input-hint">分帧生成避免阻塞主线程</p>
              </div>

              {isGenerating && (
                <div className="result-box">
                  <div className="result-info">
                    <div className="info-item full-width">
                      <span className="info-label">生成进度</span>
                      <div style={{
                        width: '100%',
                        height: '20px',
                        background: 'var(--bg)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${generationProgress}%`,
                          height: '100%',
                          background: 'var(--accent)',
                          transition: 'width 0.2s ease',
                        }} />
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {generationProgress}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="action-bar">
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateLargeBlob}
                  disabled={isGenerating}
                  type="button"
                >
                  {isGenerating ? '生成中...' : '生成并下载'}
                </button>
              </div>
            </div>
          )}

          {activeTab === DEMO_TABS.REVOKE_DEMO && (
            <div className="content-section">
              <div className="option-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={revokeEarly}
                    onChange={(e) => setRevokeEarly(e.target.checked)}
                  />
                  <span>手动立即 Revoke（演示 revoke 过早场景）</span>
                </label>
              </div>

              <div className="result-info info-panel">
                <div className="info-item full-width">
                  <span className="info-label">说明</span>
                  <p>
                    此演示展示 <code>revokeObjectURL</code> 的两种路径：
                    <br />• <strong>正常路径</strong>：5秒后自动 revoke（模拟合理超时清理）
                    <br />• <strong>过早路径</strong>：下载前就 revoke（展示常见错误）
                  </p>
                </div>
              </div>

              <div className="action-bar">
                <button
                  className="btn btn-primary"
                  onClick={handleRevokeDemo}
                  type="button"
                >
                  开始 Revoke 演示
                </button>
              </div>
            </div>
          )}

          {activeTab === DEMO_TABS.FILENAME_TEST && (
            <div className="content-section">
              <div className="form-group">
                <label htmlFor="test-filename" className="input-label">测试文件名</label>
                <input
                  id="test-filename"
                  type="text"
                  className="value-input"
                  value={filenameInput}
                  onChange={(e) => setFilenameInput(e.target.value)}
                  placeholder="输入要测试的文件名..."
                />
                <p className="input-hint">测试 Windows/macOS/Linux 保留字、非法字符、长度截断等</p>
              </div>

              <div className="examples-panel">
                <span className="examples-title">测试用例：</span>
                <button
                  className={`chip ${activeFilenameTest === 'reserved' ? 'chip-active' : ''}`}
                  onClick={() => {
                    setFilenameInput('CON')
                    setActiveFilenameTest('reserved')
                  }}
                  type="button"
                >
                  保留字
                </button>
                <button
                  className={`chip ${activeFilenameTest === 'illegal' ? 'chip-active' : ''}`}
                  onClick={() => {
                    setFilenameInput('normal"file".txt')
                    setActiveFilenameTest('illegal')
                  }}
                  type="button"
                >
                  非法字符
                </button>
                <button
                  className={`chip ${activeFilenameTest === 'whitespace' ? 'chip-active' : ''}`}
                  onClick={() => {
                    setFilenameInput('  .hidden  ')
                    setActiveFilenameTest('whitespace')
                  }}
                  type="button"
                >
                  首尾空格
                </button>
                <button
                  className={`chip ${activeFilenameTest === 'long' ? 'chip-active' : ''}`}
                  onClick={() => {
                    setFilenameInput('a'.repeat(300) + '.txt')
                    setActiveFilenameTest('long')
                  }}
                  type="button"
                >
                  超长
                </button>
                <button
                  className={`chip ${activeFilenameTest === 'emoji' ? 'chip-active' : ''}`}
                  onClick={() => {
                    setFilenameInput('📄报告_2024.csv')
                    setActiveFilenameTest('emoji')
                  }}
                  type="button"
                >
                  Emoji
                </button>
              </div>

              <div className="action-bar">
                <button
                  className="btn btn-primary"
                  onClick={handleFilenameTest}
                  disabled={!filenameInput.trim()}
                  type="button"
                >
                  分析文件名
                </button>
              </div>
            </div>
          )}

          {activeTab === DEMO_TABS.CONTENT_DISPOSITION && (
            <div className="content-section">
              <div className="form-group">
                <label htmlFor="disposition-input" className="input-label">Content-Disposition Header</label>
                <input
                  id="disposition-input"
                  type="text"
                  className="value-input"
                  value={dispositionHeader}
                  onChange={(e) => setDispositionHeader(e.target.value)}
                  placeholder="attachment; filename=file.txt"
                />
              </div>

              <div className="examples-panel">
                <span className="examples-title">示例：</span>
                <button
                  className={`chip ${activeCDExample === 'utf8' ? 'chip-active' : ''}`}
                  onClick={() => {
                    setDispositionHeader("attachment; filename*=UTF-8''%E4%B8%AD%E6%96%87.csv; filename=fallback.csv")
                    setActiveCDExample('utf8')
                  }}
                  type="button"
                >
                  UTF-8 filename*
                </button>
                <button
                  className={`chip ${activeCDExample === 'ascii' ? 'chip-active' : ''}`}
                  onClick={() => {
                    setDispositionHeader('attachment; filename="report.csv"')
                    setActiveCDExample('ascii')
                  }}
                  type="button"
                >
                  ASCII filename
                </button>
              </div>

              <div className="action-bar">
                <button
                  className="btn btn-primary"
                  onClick={handleContentDispositionTest}
                  disabled={!dispositionHeader.trim()}
                  type="button"
                >
                  解析 Header
                </button>
              </div>
            </div>
          )}

          {renderResultBox()}
        </div>
      </div>

      <div className="card card-light">
        <div className="card-header card-header-light">
          <h2 className="card-title card-title-sm">说明</h2>
        </div>
        <div className="card-body">
          <ul className="notes-list">
            <li>
              <strong>统一入口：</strong>支持 <code>string</code>、<code>Blob</code>、<code>ArrayBuffer</code>、<code>ReadableStream</code>（若环境支持）。
            </li>
            <li>
              <strong>自动 Revoke：</strong>对象 URL 在超时后或下载完成后自动 <code>revokeObjectURL</code>，也可手动调用。
            </li>
            <li>
              <strong>UTF-8 BOM：</strong>CSV 文件默认添加 BOM 以兼容 Excel；其他类型可通过 <code>forceBom</code> 强制添加。
            </li>
            <li>
              <strong>MIME 推断：</strong>优先从扩展名推断，其次检查内容格式（JSON/HTML/XML），兜底为 <code>application/octet-stream</code>。
            </li>
            <li>
              <strong>文件名净化：</strong>剥离 Windows/macOS/Linux 保留字与非法字符，修剪首尾空格与点号，超长时使用稳定短哈希截断。
            </li>
            <li>
              <strong>iOS Safari 限制：</strong>iOS Safari 对 <code>download</code> 属性支持有限，建议使用 <code>showSaveFilePicker</code> 或让用户手动保存。
            </li>
            <li>
              <strong>内存压力：</strong>可配置 <code>Blob</code> 大小上限，超出时触发警告或错误。
            </li>
            <li>
              <strong>安全提醒：</strong>本工具纯前端运行。若涉及后端下载，<strong>切勿对用户提供的路径字符串做 shell 拼接</strong>，以防命令注入攻击。
            </li>
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-header card-header-light">
          <h2 className="card-title card-title-sm">浏览器行为表（文件名）</h2>
        </div>
        <div className="card-body">
          <div className="browser-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>文件名示例</th>
                  <th>Chrome</th>
                  <th>Firefox</th>
                  <th>Safari</th>
                  <th>iOS Safari</th>
                  <th>Edge</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>report.csv</code></td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td><code>中文文件.csv</code></td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td><code>📄报告_2024.csv</code></td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td><code>very{"long".repeat(50)}name.csv</code></td>
                  <td>自动截断</td>
                  <td>自动截断</td>
                  <td>自动截断</td>
                  <td>可能失败</td>
                  <td>自动截断</td>
                </tr>
                <tr>
                  <td><code>CON</code>（Windows 保留字）</td>
                  <td>净化后下载</td>
                  <td>净化后下载</td>
                  <td>正常</td>
                  <td>正常</td>
                  <td>净化后下载</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="input-hint" style={{ marginTop: '1rem' }}>
            注：本工具的 <code>sanitizeFilename</code> 函数会在客户端自动处理保留字、非法字符和长度问题，确保跨平台兼容性。
          </p>
        </div>
      </div>
    </div>
  )
}
