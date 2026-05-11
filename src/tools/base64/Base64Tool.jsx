import { useCallback, useRef, useState } from 'react'
import './Base64Tool.css'

const MAX_SAFE_FILE_SIZE = 5 * 1024 * 1024
const CHUNK_SIZE = 1024 * 1024
const YIELD_INTERVAL = 50

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

async function processInChunks(buffer, callback, chunkSize = CHUNK_SIZE) {
  const totalChunks = Math.ceil(buffer.byteLength / chunkSize)
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, buffer.byteLength)
    const chunk = buffer.slice(start, end)
    callback(chunk, i)
    if (i % YIELD_INTERVAL === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToText(buffer, encoding = 'utf-8') {
  try {
    const decoder = new TextDecoder(encoding, { fatal: false })
    return decoder.decode(buffer)
  } catch {
    const bytes = new Uint8Array(buffer)
    let text = ''
    for (let i = 0; i < bytes.length; i++) {
      text += String.fromCharCode(bytes[i])
    }
    return text
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function isValidBase64(str) {
  if (!str) return false
  const trimmed = str.trim()
  if (trimmed.length === 0) return false
  if (!/^[A-Za-z0-9+/=]*$/.test(trimmed.replace(/\s+/g, ''))) return false
  const clean = trimmed.replace(/\s+/g, '')
  if (clean.length % 4 !== 0) return false
  try {
    atob(clean)
    return true
  } catch {
    return false
  }
}

export default function Base64Tool() {
  const [inputMode, setInputMode] = useState('text')
  const [textInput, setTextInput] = useState('')
  const [decodeInput, setDecodeInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [encodeResult, setEncodeResult] = useState(null)
  const [decodeResult, setDecodeResult] = useState(null)
  const [loading, setLoading] = useState({ encode: false, decode: false })
  const [error, setError] = useState({ encode: null, decode: null })
  const [copyStatus, setCopyStatus] = useState(null)
  const [textEncoding, setTextEncoding] = useState('utf-8')
  const [decodeOutputFormat, setDecodeOutputFormat] = useState('text')

  const fileInputRef = useRef(null)
  const encodeResultRef = useRef(null)
  const decodeResultRef = useRef(null)

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
        setError((prev) => ({
          ...prev,
          encode: { message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件` },
        }))
        return
      }
      setSelectedFile(file)
      setError((prev) => ({ ...prev, encode: null }))
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > MAX_SAFE_FILE_SIZE) {
        setError((prev) => ({
          ...prev,
          encode: { message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件` },
        }))
        return
      }
      setSelectedFile(file)
      setError((prev) => ({ ...prev, encode: null }))
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
    setEncodeResult(null)
    setError((prev) => ({ ...prev, encode: null }))
  }, [])

  const handleInputModeChange = useCallback((mode) => {
    setInputMode(mode)
    if (mode === 'text') {
      setSelectedFile(null)
    } else {
      setTextInput('')
    }
    setEncodeResult(null)
    setError((prev) => ({ ...prev, encode: null }))
  }, [])

  const clearEncode = useCallback(() => {
    setTextInput('')
    setSelectedFile(null)
    setEncodeResult(null)
    setError((prev) => ({ ...prev, encode: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const clearDecode = useCallback(() => {
    setDecodeInput('')
    setDecodeResult(null)
    setError((prev) => ({ ...prev, decode: null }))
  }, [])

  const handleEncode = useCallback(async () => {
    setLoading((prev) => ({ ...prev, encode: true }))
    setError((prev) => ({ ...prev, encode: null }))
    setEncodeResult(null)

    try {
      let buffer
      let fileName
      let originalSize

      if (inputMode === 'file') {
        if (!selectedFile) {
          throw new Error('请先选择一个文件')
        }
        buffer = await readFileAsArrayBuffer(selectedFile)
        fileName = selectedFile.name
        originalSize = selectedFile.size
      } else {
        if (!textInput.trim()) {
          throw new Error('请输入要编码的文本')
        }
        const encoder = new TextEncoder()
        buffer = encoder.encode(textInput).buffer
        originalSize = buffer.byteLength
      }

      let base64
      if (buffer.byteLength > CHUNK_SIZE) {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        await processInChunks(buffer, (chunk) => {
          const chunkBytes = new Uint8Array(chunk)
          for (let i = 0; i < chunkBytes.length; i++) {
            binary += String.fromCharCode(chunkBytes[i])
          }
        })
        base64 = btoa(binary)
      } else {
        base64 = arrayBufferToBase64(buffer)
      }

      setEncodeResult({
        base64,
        fileName,
        originalSize,
        encodedSize: base64.length,
        mode: inputMode,
      })
    } catch (err) {
      setError((prev) => ({
        ...prev,
        encode: { message: err?.message || '编码失败' },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, encode: false }))
    }
  }, [inputMode, selectedFile, textInput])

  const handleDecode = useCallback(async () => {
    setLoading((prev) => ({ ...prev, decode: true }))
    setError((prev) => ({ ...prev, decode: null }))
    setDecodeResult(null)

    try {
      if (!decodeInput.trim()) {
        throw new Error('请输入要解码的 Base64 字符串')
      }

      const base64Str = decodeInput.trim().replace(/\s+/g, '')

      if (!isValidBase64(base64Str)) {
        throw new Error('无效的 Base64 字符串，请检查输入')
      }

      let buffer
      if (base64Str.length > CHUNK_SIZE * 1.34) {
        const chunkCount = Math.ceil(base64Str.length / (CHUNK_SIZE * 1.34))
        const chunkSize = Math.ceil(base64Str.length / chunkCount / 4) * 4
        const chunks = []
        for (let i = 0; i < base64Str.length; i += chunkSize) {
          chunks.push(base64Str.slice(i, i + chunkSize))
        }

        const totalBytes = new Uint8Array(Math.ceil((base64Str.length * 3) / 4))
        let offset = 0
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          const binary = atob(chunk)
          for (let j = 0; j < binary.length; j++) {
            totalBytes[offset + j] = binary.charCodeAt(j)
          }
          offset += binary.length
          if (i % 20 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }
        buffer = totalBytes.buffer.slice(0, offset)
      } else {
        buffer = base64ToArrayBuffer(base64Str)
      }

      let decodedText
      let isTextSafe = true

      if (decodeOutputFormat === 'text') {
        decodedText = arrayBufferToText(buffer, textEncoding)
        const bytes = new Uint8Array(buffer)
        for (let i = 0; i < Math.min(bytes.length, 1024); i++) {
          if (bytes[i] === 0) {
            isTextSafe = false
            break
          }
        }
      }

      setDecodeResult({
        buffer,
        text: decodedText,
        isTextSafe,
        originalSize: base64Str.length,
        decodedSize: buffer.byteLength,
      })
    } catch (err) {
      setError((prev) => ({
        ...prev,
        decode: { message: err?.message || '解码失败' },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, decode: false }))
    }
  }, [decodeInput, textEncoding, decodeOutputFormat])

  const downloadDecoded = useCallback(() => {
    if (!decodeResult?.buffer) return
    const blob = new Blob([decodeResult.buffer])
    downloadBlob(blob, 'decoded.bin')
  }, [decodeResult])

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
              setError((prev) => ({
                ...prev,
                encode: { message: `文件过大（${formatBytes(file.size)}），建议使用小于 ${formatBytes(MAX_SAFE_FILE_SIZE)} 的文件` },
              }))
              return
            }
            setSelectedFile(file)
            setInputMode('file')
            setError((prev) => ({ ...prev, encode: null }))
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

  return (
    <div className="base64-tool" onPaste={handlePaste}>
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>Base64 编码</h2>

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
              className="base64-textarea"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="粘贴或输入要编码的文本...&#10;&#10;也可以直接粘贴图片等文件到页面上"
              spellCheck={false}
            />
            <div className="form-row with-top-gap">
              <div className="form-group">
                <label htmlFor="text-encoding">文本编码</label>
                <select
                  id="text-encoding"
                  value={textEncoding}
                  onChange={(e) => setTextEncoding(e.target.value)}
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="gbk">GBK</option>
                  <option value="gb2312">GB2312</option>
                  <option value="big5">Big5</option>
                  <option value="shift-jis">Shift-JIS</option>
                </select>
              </div>
            </div>
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
            onClick={handleEncode}
            disabled={loading.encode || (inputMode === 'text' ? !textInput.trim() : !selectedFile)}
          >
            {loading.encode ? '编码中...' : '编码'}
          </button>
          <button
            className="secondary-btn"
            onClick={clearEncode}
          >
            清除
          </button>
        </div>

        {renderErrorBox(error.encode)}

        {encodeResult && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">编码结果（Base64）</span>
              <button
                className="copy-btn"
                onClick={() => handleCopy(encodeResult.base64, 'Base64 结果')}
              >
                复制
              </button>
            </div>
            <pre
              ref={encodeResultRef}
              className="result-text"
              dangerouslySetInnerHTML={{ __html: escapeHtml(encodeResult.base64) }}
            />
            <div className="result-meta">
              <span dangerouslySetInnerHTML={{
                __html: `原大小：<code>${formatBytes(encodeResult.originalSize)}</code>`,
              }} />
              <span dangerouslySetInnerHTML={{
                __html: `编码后：<code>${formatBytes(encodeResult.encodedSize)}</code>`,
              }} />
              <span dangerouslySetInnerHTML={{
                __html: `增长：<code>${((encodeResult.encodedSize - encodeResult.originalSize) / encodeResult.originalSize * 100).toFixed(1)}%</code>`,
              }} />
              {encodeResult.fileName && (
                <span dangerouslySetInnerHTML={{
                  __html: `文件：<code>${escapeHtml(encodeResult.fileName)}</code>`,
                }} />
              )}
            </div>
          </div>
        )}
      </section>

      <section className="tool-section">
        <h2>Base64 解码</h2>

        <div className="form-group full-width">
          <label htmlFor="decode-input">Base64 输入</label>
          <textarea
            id="decode-input"
            className="base64-textarea"
            value={decodeInput}
            onChange={(e) => setDecodeInput(e.target.value)}
            placeholder="粘贴 Base64 字符串..."
            spellCheck={false}
          />
          <div className="form-row with-top-gap">
            <div className="form-group">
              <label htmlFor="decode-encoding">解码文本编码</label>
              <select
                id="decode-encoding"
                value={textEncoding}
                onChange={(e) => setTextEncoding(e.target.value)}
              >
                <option value="utf-8">UTF-8</option>
                <option value="gbk">GBK</option>
                <option value="gb2312">GB2312</option>
                <option value="big5">Big5</option>
                <option value="shift-jis">Shift-JIS</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="decode-output-format">输出格式</label>
              <select
                id="decode-output-format"
                value={decodeOutputFormat}
                onChange={(e) => setDecodeOutputFormat(e.target.value)}
              >
                <option value="text">文本</option>
                <option value="binary">二进制（下载）</option>
              </select>
            </div>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleDecode}
            disabled={loading.decode || !decodeInput.trim()}
          >
            {loading.decode ? '解码中...' : '解码'}
          </button>
          <button
            className="secondary-btn"
            onClick={clearDecode}
          >
            清除
          </button>
        </div>

        {renderErrorBox(error.decode)}

        {decodeResult && (
          <div className="result-box">
            <div className="result-header">
              <span className="result-label">解码结果</span>
              <div className="result-actions">
                {decodeOutputFormat === 'text' && (
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(decodeResult.text || '', '解码结果')}
                  >
                    复制
                  </button>
                )}
                <button
                  className="copy-btn"
                  onClick={downloadDecoded}
                >
                  下载为文件
                </button>
              </div>
            </div>
            {decodeOutputFormat === 'text' ? (
              <>
                {!decodeResult.isTextSafe && (
                  <div className="warning-hint">
                    检测到可能的二进制数据，建议选择「二进制（下载）」格式
                  </div>
                )}
                <pre
                  ref={decodeResultRef}
                  className="result-text"
                  dangerouslySetInnerHTML={{ __html: escapeHtml(decodeResult.text || '') }}
                />
              </>
            ) : (
              <div className="binary-preview">
                二进制数据已就绪，点击「下载为文件」保存
              </div>
            )}
            <div className="result-meta">
              <span dangerouslySetInnerHTML={{
                __html: `原大小：<code>${formatBytes(decodeResult.originalSize)}</code>`,
              }} />
              <span dangerouslySetInnerHTML={{
                __html: `解码后：<code>${formatBytes(decodeResult.decodedSize)}</code>`,
              }} />
            </div>
          </div>
        )}
      </section>

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>所有编解码操作均在浏览器本地执行，不会向任何服务器发送数据</li>
          <li>支持文本和文件两种输入方式；可直接粘贴文件到页面</li>
          <li>大文件处理：采用分块处理策略，避免页面明显卡顿</li>
          <li>安全限制：浏览器环境下单次建议处理 {formatBytes(MAX_SAFE_FILE_SIZE)} 以内的文件</li>
          <li>所有用户输入、错误信息与结果均经转义展示，避免 XSS</li>
        </ul>
      </div>
    </div>
  )
}
