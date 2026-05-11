import { useCallback, useRef, useState } from 'react'
import {
  COMPRESSION_LEVELS,
  FORMAT_OPTIONS,
  formatCSS,
  compressCSS,
  escapeHtml,
  formatBytes,
} from './cssUtils'
import './CSSTool.css'

const MAX_SAFE_FILE_SIZE = 2 * 1024 * 1024

export default function CSSTool() {
  const [inputMode, setInputMode] = useState('text')
  const [textInput, setTextInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [operation, setOperation] = useState('format')
  const [formatIndent, setFormatIndent] = useState('2')
  const [formatRemoveComments, setFormatRemoveComments] = useState(false)
  const [compressionLevel, setCompressionLevel] = useState('standard')
  const [compressRemoveComments, setCompressRemoveComments] = useState(true)
  const [keepImportantComments, setKeepImportantComments] = useState(false)
  const [keepSourceMap, setKeepSourceMap] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)

  const fileInputRef = useRef(null)
  const resultRef = useRef(null)

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

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SAFE_FILE_SIZE) {
      setError({ message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件` })
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = () => {
        setFileContent(reader.result)
        setSelectedFile(file)
        setError(null)
      }
      reader.onerror = () => {
        setError({ message: '读取文件失败' })
      }
      reader.readAsText(file, 'utf-8')
    } catch (err) {
      setError({ message: err?.message || '读取文件失败' })
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.size > MAX_SAFE_FILE_SIZE) {
      setError({ message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件` })
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = () => {
        setFileContent(reader.result)
        setSelectedFile(file)
        setInputMode('file')
        setError(null)
      }
      reader.onerror = () => {
        setError({ message: '读取文件失败' })
      }
      reader.readAsText(file, 'utf-8')
    } catch (err) {
      setError({ message: err?.message || '读取文件失败' })
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    setFileContent(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setResult(null)
    setError(null)
  }, [])

  const handleInputModeChange = useCallback((mode) => {
    setInputMode(mode)
    if (mode === 'text') {
      setSelectedFile(null)
      setFileContent(null)
    } else {
      setTextInput('')
    }
    setResult(null)
    setError(null)
  }, [])

  const handleClear = useCallback(() => {
    setTextInput('')
    setSelectedFile(null)
    setFileContent(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleProcess = useCallback(() => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let sourceCSS
      let sourceName
      let sourceSize

      if (inputMode === 'file') {
        if (!fileContent) {
          throw new Error('请先选择或读取一个 CSS 文件')
        }
        sourceCSS = fileContent
        sourceName = selectedFile?.name || '文件输入'
        sourceSize = selectedFile?.size || fileContent.length
      } else {
        if (!textInput.trim()) {
          throw new Error('请输入要处理的 CSS 文本')
        }
        sourceCSS = textInput
        sourceName = '文本输入'
        const encoder = new TextEncoder()
        sourceSize = encoder.encode(textInput).byteLength
      }

      let processResult

      if (operation === 'format') {
        processResult = formatCSS(sourceCSS, {
          indent: formatIndent,
          removeComments: formatRemoveComments,
          keepImportant: keepImportantComments,
          keepSourceMap,
        })
      } else {
        const level = COMPRESSION_LEVELS.find(l => l.id === compressionLevel) || COMPRESSION_LEVELS[1]
        processResult = compressCSS(sourceCSS, {
          level,
          removeComments: compressRemoveComments,
          keepImportant: keepImportantComments,
          keepSourceMap,
        })
      }

      if (!processResult.success) {
        throw new Error(processResult.error || '处理失败')
      }

      const encoder = new TextEncoder()
      const resultBytes = encoder.encode(processResult.result).byteLength

      setResult({
        content: processResult.result,
        sourceName,
        sourceSize,
        resultSize: resultBytes,
        reduction: sourceSize > 0 ? ((sourceSize - resultBytes) / sourceSize * 100).toFixed(1) : '0.0',
        operation,
      })
    } catch (err) {
      setError({ message: err?.message || '处理失败' })
    } finally {
      setLoading(false)
    }
  }, [inputMode, fileContent, selectedFile, textInput, operation, formatIndent, formatRemoveComments, compressionLevel, compressRemoveComments, keepImportantComments, keepSourceMap])

  const handleDownload = useCallback(() => {
    if (!result?.content) return

    const blob = new Blob([result.content], { type: 'text/css;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = operation === 'format' ? 'formatted.css' : 'minified.css'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [result, operation])

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
              setError({ message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件` })
              return
            }

            const reader = new FileReader()
            reader.onload = () => {
              setFileContent(reader.result)
              setSelectedFile(file)
              setInputMode('file')
              setError(null)
            }
            reader.readAsText(file, 'utf-8')
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

  const canProcess = (inputMode === 'text' ? textInput.trim() : fileContent)
  const currentLevel = COMPRESSION_LEVELS.find(l => l.id === compressionLevel)

  return (
    <div className="css-tool" onPaste={handlePaste}>
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>操作模式</h2>
        <div className="operation-switch">
          <button
            className={`operation-btn ${operation === 'format' ? 'active' : ''}`}
            onClick={() => setOperation('format')}
          >
            排版整理
          </button>
          <button
            className={`operation-btn ${operation === 'compress' ? 'active' : ''}`}
            onClick={() => setOperation('compress')}
          >
            压缩
          </button>
        </div>

        {operation === 'format' && (
          <div className="options-panel">
            <div className="options-row">
              <div className="option-group">
                <label htmlFor="format-indent">缩进方式</label>
                <select
                  id="format-indent"
                  value={formatIndent}
                  onChange={(e) => setFormatIndent(e.target.value)}
                >
                  {FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div className="option-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formatRemoveComments}
                    onChange={(e) => setFormatRemoveComments(e.target.checked)}
                  />
                  移除注释
                </label>
              </div>
            </div>
          </div>
        )}

        {operation === 'compress' && (
          <div className="options-panel">
            <div className="compression-levels">
              {COMPRESSION_LEVELS.map((level) => (
                <label
                  key={level.id}
                  className={`level-card ${compressionLevel === level.id ? 'selected' : ''} risk-${level.risk}`}
                >
                  <input
                    type="radio"
                    name="compression-level"
                    value={level.id}
                    checked={compressionLevel === level.id}
                    onChange={() => setCompressionLevel(level.id)}
                  />
                  <div className="level-content">
                    <span className="level-name">{level.name}</span>
                    <span className="level-desc">{level.description}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="options-row">
              <div className="option-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={compressRemoveComments}
                    onChange={(e) => setCompressRemoveComments(e.target.checked)}
                  />
                  移除普通注释
                </label>
              </div>
              <div className="option-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={keepImportantComments}
                    onChange={(e) => setKeepImportantComments(e.target.checked)}
                  />
                  保留 /*! 重要注释
                </label>
              </div>
              <div className="option-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={keepSourceMap}
                    onChange={(e) => setKeepSourceMap(e.target.checked)}
                  />
                  保留 sourceMappingURL
                </label>
              </div>
            </div>

            {currentLevel?.risk === 'high' && (
              <div className="warning-hint">
                高度压缩包含零值单位省略、移除最后分号等激进优化，<strong>请测试后再用于生产环境</strong>。
              </div>
            )}
          </div>
        )}
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
            <label htmlFor="css-input">CSS 输入</label>
            <textarea
              id="css-input"
              className="css-textarea"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="粘贴或输入 CSS 代码...&#10;&#10;也可以直接粘贴 CSS 文件到页面上"
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
              accept=".css"
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
                <span>点击选择文件或拖拽 CSS 文件到此处</span>
                <span className="drop-hint-small">支持 .css 文件（建议 {formatBytes(MAX_SAFE_FILE_SIZE)} 以内）</span>
              </div>
            )}
          </div>
        )}

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleProcess}
            disabled={loading || !canProcess}
          >
            {loading ? '处理中...' : (operation === 'format' ? '排版' : '压缩')}
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

      {result && (
        <section className="tool-section">
          <div className="result-header-row">
            <h2>处理结果</h2>
            <div className="result-actions">
              <button
                className="copy-btn"
                onClick={() => handleCopy(result.content, 'CSS 结果')}
              >
                复制
              </button>
              <button
                className="download-btn"
                onClick={handleDownload}
              >
                下载
              </button>
            </div>
          </div>

          <div className="result-meta-row">
            <span dangerouslySetInnerHTML={{
              __html: `来源：<code>${escapeHtml(result.sourceName)}</code>`,
            }} />
            <span dangerouslySetInnerHTML={{
              __html: `原大小：<code>${formatBytes(result.sourceSize)}</code>`,
            }} />
            <span dangerouslySetInnerHTML={{
              __html: `处理后：<code>${formatBytes(result.resultSize)}</code>`,
            }} />
            {result.operation === 'compress' && (
              <span className={`reduction-badge ${parseFloat(result.reduction) > 0 ? 'positive' : ''}`}>
                {parseFloat(result.reduction) > 0 ? '-' : ''}{result.reduction}%
              </span>
            )}
          </div>

          <pre
            ref={resultRef}
            className="result-text"
            dangerouslySetInnerHTML={{ __html: escapeHtml(result.content) }}
          />
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li><strong>纯前端实现：</strong>所有处理均在浏览器本地执行，不向任何后端服务器发送数据。</li>
          <li><strong>排版整理：</strong>对 CSS 进行结构化缩进，支持 2/4 空格或 Tab，可选择是否移除注释。</li>
          <li><strong>压缩策略：</strong>
            <ul>
              <li><strong>轻度压缩：</strong>仅移除多余空白和普通注释（/* ... */），风险最低。</li>
              <li><strong>标准压缩：</strong>包含颜色缩短（#FFFFFF → #fff）、合并重复声明，中等风险。</li>
              <li><strong>高度压缩：</strong>额外移除零值单位（0px → 0）、最后一个分号等，较高风险。</li>
            </ul>
          </li>
          <li><strong>重要注释：</strong>以 /*! 开头的注释（常用于许可证信息）可独立选择保留。</li>
          <li><strong>Source Map：</strong>输入中的 /*# sourceMappingURL= 可选择保留。</li>
          <li><strong>错误反馈：</strong>解析失败时会显示错误提示，不执行后续处理。</li>
        </ul>
      </div>
    </div>
  )
}
