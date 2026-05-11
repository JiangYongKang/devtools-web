import { useCallback, useRef, useState } from 'react'
import {
  ALGORITHMS,
  escapeHtml,
  formatBytes,
  readFileAsArrayBuffer,
  computeDigest,
} from './digestUtils'
import './DigestTool.css'

const MAX_SAFE_FILE_SIZE = 10 * 1024 * 1024

export default function DigestTool() {
  const [inputMode, setInputMode] = useState('text')
  const [textInput, setTextInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedAlgorithms, setSelectedAlgorithms] = useState(['SHA-256'])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copyStatus, setCopyStatus] = useState(null)

  const fileInputRef = useRef(null)

  const handleAlgorithmToggle = useCallback((algoId) => {
    setSelectedAlgorithms((prev) => {
      if (prev.includes(algoId)) {
        if (prev.length === 1) return prev
        return prev.filter((id) => id !== algoId)
      }
      return [...prev, algoId]
    })
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

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_SAFE_FILE_SIZE) {
        setError({
          message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件`,
        })
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > MAX_SAFE_FILE_SIZE) {
        setError({
          message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件`,
        })
        return
      }
      setSelectedFile(file)
      setInputMode('file')
      setError(null)
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setResults(null)
    setError(null)
  }, [])

  const handleInputModeChange = useCallback((mode) => {
    setInputMode(mode)
    if (mode === 'text') {
      setSelectedFile(null)
    } else {
      setTextInput('')
    }
    setResults(null)
    setError(null)
  }, [])

  const handleClear = useCallback(() => {
    setTextInput('')
    setSelectedFile(null)
    setResults(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleCompute = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      let buffer
      let sourceName
      let sourceSize

      if (inputMode === 'file') {
        if (!selectedFile) {
          throw new Error('请先选择一个文件')
        }
        buffer = await readFileAsArrayBuffer(selectedFile)
        sourceName = selectedFile.name
        sourceSize = selectedFile.size
      } else {
        if (!textInput.trim()) {
          throw new Error('请输入要计算的文本')
        }
        const encoder = new TextEncoder()
        buffer = encoder.encode(textInput).buffer
        sourceName = '文本输入'
        sourceSize = buffer.byteLength
      }

      const newResults = {}
      for (const algoId of selectedAlgorithms) {
        try {
          const hex = await computeDigest(buffer, algoId)
          newResults[algoId] = { hex, error: null }
        } catch (err) {
          newResults[algoId] = { hex: null, error: err?.message || '计算失败' }
        }
      }

      setResults({
        items: newResults,
        sourceName,
        sourceSize,
        computedAt: Date.now(),
      })
    } catch (err) {
      setError({ message: err?.message || '计算失败' })
    } finally {
      setLoading(false)
    }
  }, [inputMode, selectedFile, textInput, selectedAlgorithms])

  const downloadAllResults = useCallback(() => {
    if (!results) return
    const lines = []
    lines.push(`# Hash Digest Results`)
    lines.push(`# Source: ${results.sourceName}`)
    lines.push(`# Size: ${formatBytes(results.sourceSize)}`)
    lines.push(`# Generated at: ${new Date(results.computedAt).toISOString()}`)
    lines.push('')
    for (const algoId of Object.keys(results.items)) {
      const item = results.items[algoId]
      if (item.error) {
        lines.push(`# ${algoId}: ${item.error}`)
      } else {
        lines.push(`${algoId.toLowerCase()}: ${item.hex}`)
      }
    }
    lines.push('')
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `digest-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [results])

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            if (file.size > MAX_SAFE_FILE_SIZE) {
              setError({
                message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件`,
              })
              return
            }
            setSelectedFile(file)
            setInputMode('file')
            setError(null)
          }
        }
      }
    }
  }, [])

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>操作失败</strong>
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  const canCompute = (inputMode === 'text' ? textInput.trim() : selectedFile) && selectedAlgorithms.length > 0

  return (
    <div className="digest-tool" onPaste={handlePaste}>
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>算法选择</h2>
        <div className="algorithm-list">
          {ALGORITHMS.map((algo) => (
            <label key={algo.id} className={`algorithm-item ${algo.security === 'weak' ? 'weak-algo' : ''}`}>
              <input
                type="checkbox"
                checked={selectedAlgorithms.includes(algo.id)}
                onChange={() => handleAlgorithmToggle(algo.id)}
              />
              <div className="algo-info">
                <div className="algo-name-row">
                  <span className="algo-name">{algo.name}</span>
                  {algo.security === 'weak' && (
                    <span className="security-badge weak">已废弃</span>
                  )}
                  {algo.security === 'strong' && (
                    <span className="security-badge strong">推荐</span>
                  )}
                </div>
                <span className="algo-desc">{algo.description}</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="tool-section">
        <h2>输入数据</h2>

        <div className="form-row with-top-gap">
          <div className="form-group full-width">
            <label>输入方式</label>
            <div className="mode-switch">
              <button
                className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
                onClick={() => handleInputModeChange('text')}
              >
                文本输入
              </button>
              <button
                className={`mode-btn ${inputMode === 'file' ? 'active' : ''}`}
                onClick={() => handleInputModeChange('file')}
              >
                文件输入
              </button>
            </div>
          </div>
        </div>

        {inputMode === 'text' ? (
          <div className="form-group full-width">
            <label htmlFor="text-input">文本输入</label>
            <textarea
              id="text-input"
              className="digest-textarea"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="粘贴或输入要计算的文本...&#10;&#10;也可以直接粘贴图片等文件到页面上"
              spellCheck={false}
            />
          </div>
        ) : (
          <div
            className="file-drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="file-input"
              onChange={handleFileSelect}
              className="file-input"
            />
            {selectedFile ? (
              <div className="file-info">
                <span className="file-name" dangerouslySetInnerHTML={{ __html: escapeHtml(selectedFile.name) }} />
                <span className="file-size">{formatBytes(selectedFile.size)}</span>
                <div className="file-actions">
                  <button
                    type="button"
                    className="clear-file-btn"
                    onClick={clearFile}
                  >
                    清除
                  </button>
                </div>
              </div>
            ) : (
              <div className="drop-hint">
                <span>点击选择文件或拖拽文件到此处</span>
                <span className="drop-hint-small">支持任意类型文件（建议 {formatBytes(MAX_SAFE_FILE_SIZE)} 以内）</span>
              </div>
            )}
          </div>
        )}

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleCompute}
            disabled={loading || !canCompute}
          >
            {loading ? '计算中...' : '计算摘要'}
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
          >
            清除
          </button>
        </div>

        {renderErrorBox(error)}
      </section>

      {results && (
        <section className="tool-section">
          <div className="result-header-row">
            <h2>计算结果</h2>
            <button
              className="download-all-btn"
              onClick={downloadAllResults}
            >
              下载全部
            </button>
          </div>
          <div className="result-meta-row">
            <span dangerouslySetInnerHTML={{
              __html: `来源：<code>${escapeHtml(results.sourceName)}</code>`,
            }} />
            <span dangerouslySetInnerHTML={{
              __html: `大小：<code>${formatBytes(results.sourceSize)}</code>`,
            }} />
            <span dangerouslySetInnerHTML={{
              __html: `时间：<code>${new Date(results.computedAt).toLocaleString()}</code>`,
            }} />
          </div>
          <div className="result-list">
            {Object.keys(results.items).map((algoId) => {
              const item = results.items[algoId]
              const algo = ALGORITHMS.find((a) => a.id === algoId)
              return (
                <div key={algoId} className={`result-item ${algo?.security === 'weak' ? 'weak-result' : ''}`}>
                  <div className="result-item-header">
                    <div className="result-algo-info">
                      <span className="result-algo-name">{algoId}</span>
                      {algo?.security === 'weak' && (
                        <span className="security-badge weak">已废弃</span>
                      )}
                      {algo?.security === 'strong' && (
                        <span className="security-badge strong">推荐</span>
                      )}
                    </div>
                    <button
                      className="copy-btn"
                      onClick={() => handleCopy(item.hex || '', `${algoId} 结果`)}
                      disabled={!item.hex}
                    >
                      复制
                    </button>
                  </div>
                  {item.error ? (
                    <div className="result-error">{escapeHtml(item.error)}</div>
                  ) : (
                    <pre className="result-hex">{escapeHtml(item.hex)}</pre>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="notes-section">
        <h3>安全说明</h3>
        <ul>
          <li>
            <strong>弱摘要算法警告：</strong>MD5 和 SHA-1 已被密码分析学证明存在碰撞风险，<strong>不可用于数字签名、消息认证、密码存储等安全敏感场景</strong>，仅可用于非安全场景的完整性校验或兼容性用途。
          </li>
          <li>
            <strong>推荐使用：</strong>对于安全相关场景，请使用 SHA-2 家族算法（SHA-256、SHA-384、SHA-512）。
          </li>
          <li>
            <strong>纯前端实现：</strong>所有计算均在浏览器本地执行，不向任何后端服务器发送数据。
          </li>
          <li>
            <strong>算法实现：</strong>SHA 系列使用浏览器原生 Web Crypto API；MD5 使用纯 JavaScript 实现（Web Crypto 不包含此算法）。
          </li>
          <li>
            <strong>输出格式：</strong>所有结果均以十六进制（hex / lowercase）字符串表示，这是业界最常用的表示方式。
          </li>
          <li>
            <strong>大文件限制：</strong>浏览器环境下建议处理 {formatBytes(MAX_SAFE_FILE_SIZE)} 以内的文件；超大文件可能导致页面卡顿或内存不足。
          </li>
        </ul>
      </div>
    </div>
  )
}
