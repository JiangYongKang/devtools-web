import { useCallback, useState, useRef } from 'react'
import {
  SUPPORTED_ALGORITHMS,
  computeIntegrity,
  computeAllAlgorithms,
  buildIntegrityAttribute,
  getCrossoriginRecommendation,
  verifyIntegrity,
  buildManifestEntry,
  generateManifestJSON,
  formatBytes,
  formatDuration,
} from './logic/sri.js'
import './SubresourceIntegrityGeneratorTool.css'

const EXAMPLE_JS = `// 示例 JavaScript 文件
function helloWorld() {
  console.log("Hello, SRI!");
}

document.addEventListener('DOMContentLoaded', function() {
  helloWorld();
});`

const EXAMPLE_CSS = `/* 示例 CSS 文件 */
body {
  font-family: 'Segoe UI', sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}`

export default function SubresourceIntegrityGeneratorTool() {
  const [activeTab, setActiveTab] = useState('generator')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('sha256')

  const [generatorContent, setGeneratorContent] = useState('')
  const [generatorResults, setGeneratorResults] = useState(null)
  const [generatorFileInfo, setGeneratorFileInfo] = useState(null)

  const [verifyContent, setVerifyContent] = useState('')
  const [verifyIntegrityInput, setVerifyIntegrityInput] = useState('')
  const [verifyResults, setVerifyResults] = useState(null)

  const [batchFiles, setBatchFiles] = useState([])
  const [batchResults, setBatchResults] = useState([])
  const [batchProcessing, setBatchProcessing] = useState(false)

  const [compareContent, setCompareContent] = useState('')
  const [compareResults, setCompareResults] = useState(null)

  const [copyStatus, setCopyStatus] = useState(null)
  const fileInputRef = useRef(null)
  const batchFileInputRef = useRef(null)

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

  const handleGenerate = useCallback(async () => {
    if (!generatorContent.trim()) return

    const startTime = performance.now()
    const results = await computeAllAlgorithms(generatorContent)
    const endTime = performance.now()

    setGeneratorResults({
      ...results,
      totalDuration: endTime - startTime,
      fileSize: new Blob([generatorContent]).size,
    })
  }, [generatorContent])

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        setGeneratorContent(content)
        setGeneratorFileInfo({
          name: file.name,
          size: file.size,
          type: file.type || 'unknown',
        })
        setGeneratorResults(null)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleLoadExample = useCallback((type) => {
    if (type === 'js') {
      setGeneratorContent(EXAMPLE_JS)
      setGeneratorFileInfo({ name: 'example.js', type: 'text/javascript' })
    } else if (type === 'css') {
      setGeneratorContent(EXAMPLE_CSS)
      setGeneratorFileInfo({ name: 'example.css', type: 'text/css' })
    }
    setGeneratorResults(null)
  }, [])

  const handleVerify = useCallback(async () => {
    if (!verifyContent.trim() || !verifyIntegrityInput.trim()) return

    const result = await verifyIntegrity(verifyContent, verifyIntegrityInput)
    setVerifyResults(result)
  }, [verifyContent, verifyIntegrityInput])

  const handleVerifyFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content === 'string') {
        setVerifyContent(content)
        setVerifyResults(null)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleBatchFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || [])
    setBatchFiles((prev) => {
      const newFiles = [...prev]
      files.forEach((file) => {
        if (!newFiles.some((f) => f.name === file.name)) {
          newFiles.push(file)
        }
      })
      return newFiles
    })
    setBatchResults([])
  }, [])

  const handleRemoveBatchFile = useCallback((index) => {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index))
    setBatchResults((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleBatchProcess = useCallback(async () => {
    if (batchFiles.length === 0) return

    setBatchProcessing(true)
    const results = []

    for (const file of batchFiles) {
      try {
        const content = await file.text()
        const integrity = await computeIntegrity(content, selectedAlgorithm)
        results.push({
          success: true,
          fileName: file.name,
          fileSize: file.size,
          algorithm: selectedAlgorithm,
          integrity,
        })
      } catch (error) {
        results.push({
          success: false,
          fileName: file.name,
          error: error.message,
        })
      }
    }

    setBatchResults(results)
    setBatchProcessing(false)
  }, [batchFiles, selectedAlgorithm])

  const handleCopyAllBatch = useCallback(() => {
    const lines = batchResults
      .filter((r) => r.success)
      .map((r) => `integrity="${r.integrity}"`)
      .join('\n')
    handleCopy(lines, '全部 integrity 行')
  }, [batchResults, handleCopy])

  const handleDownloadManifest = useCallback(() => {
    const entries = batchResults
      .filter((r) => r.success)
      .map((r) => buildManifestEntry(r.fileName, r.algorithm, r.integrity))

    const json = generateManifestJSON(entries)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sri-manifest.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [batchResults])

  const handleCompare = useCallback(async () => {
    if (!compareContent.trim()) return

    const results = await computeAllAlgorithms(compareContent)
    setCompareResults({
      results,
      fileSize: new Blob([compareContent]).size,
    })
  }, [compareContent])

  const handleClearGenerator = useCallback(() => {
    setGeneratorContent('')
    setGeneratorResults(null)
    setGeneratorFileInfo(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleClearVerify = useCallback(() => {
    setVerifyContent('')
    setVerifyIntegrityInput('')
    setVerifyResults(null)
  }, [])

  const handleClearBatch = useCallback(() => {
    setBatchFiles([])
    setBatchResults([])
    if (batchFileInputRef.current) batchFileInputRef.current.value = ''
  }, [])

  const handleClearCompare = useCallback(() => {
    setCompareContent('')
    setCompareResults(null)
  }, [])

  return (
    <div className="subresource-integrity-generator">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span>{copyStatus.message}</span>
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          哈希生成
        </button>
        <button
          className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          批量模式
        </button>
        <button
          className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => setActiveTab('verify')}
        >
          校验模式
        </button>
        <button
          className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          算法对比
        </button>
      </div>

      {activeTab === 'generator' && (
        <section className="tool-section">
          <h2>SRI 哈希生成器</h2>
          <p className="section-desc">
            粘贴脚本/样式内容或上传文件，生成 Subresource Integrity 哈希值
          </p>

          <div className="algorithm-selector">
            <label>选择算法：</label>
            {SUPPORTED_ALGORITHMS.map((algo) => (
              <label key={algo} className="radio-label">
                <input
                  type="radio"
                  name="algorithm"
                  value={algo}
                  checked={selectedAlgorithm === algo}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                />
                <span>{algo.toUpperCase()}</span>
              </label>
            ))}
          </div>

          <div className="form-group full-width">
            <label htmlFor="generator-content">输入内容（脚本/样式文本）</label>
            <textarea
              id="generator-content"
              className="content-textarea"
              value={generatorContent}
              onChange={(e) => {
                setGeneratorContent(e.target.value)
                setGeneratorResults(null)
                setGeneratorFileInfo(null)
              }}
              placeholder="粘贴 JavaScript 或 CSS 内容..."
              spellCheck={false}
            />
          </div>

          <div className="file-upload-row">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".js,.css,.txt"
              className="file-input"
            />
            <span className="file-hint">或上传 .js / .css 文件</span>
          </div>

          {generatorFileInfo && (
            <div className="file-info-box">
              <span className="file-info-name">{generatorFileInfo.name}</span>
              <span className="file-info-size">{formatBytes(generatorFileInfo.size || new Blob([generatorContent]).size)}</span>
            </div>
          )}

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleGenerate}
              disabled={!generatorContent.trim()}
            >
              生成哈希
            </button>
            <button
              className="secondary-btn"
              onClick={() => handleLoadExample('js')}
            >
              示例 JS
            </button>
            <button
              className="secondary-btn"
              onClick={() => handleLoadExample('css')}
            >
              示例 CSS
            </button>
            {generatorResults && (
              <button className="secondary-btn" onClick={handleClearGenerator}>
                清除
              </button>
            )}
          </div>

          {generatorResults && (
            <div className="result-section">
              <h3>生成结果</h3>
              <div className="result-item">
                <div className="result-header">
                  <span className="result-label">{selectedAlgorithm.toUpperCase()} Integrity</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopy(
                        buildIntegrityAttribute(generatorResults[selectedAlgorithm].integrity),
                        'Integrity 属性'
                      )
                    }
                  >
                    复制属性
                  </button>
                </div>
                <code className="integrity-code">
                  {buildIntegrityAttribute(generatorResults[selectedAlgorithm].integrity)}
                </code>
              </div>

              <div className="result-item">
                <div className="result-header">
                  <span className="result-label">Integrity 值</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopy(generatorResults[selectedAlgorithm].integrity, 'Integrity 值')
                    }
                  >
                    复制
                  </button>
                </div>
                <code className="integrity-value">
                  {generatorResults[selectedAlgorithm].integrity}
                </code>
              </div>

              <div className="crossorigin-box">
                <h4>Crossorigin 推荐值</h4>
                <code>crossorigin="{getCrossoriginRecommendation().recommended}"</code>
                <p className="crossorigin-desc">
                  {getCrossoriginRecommendation().reason}
                </p>
              </div>

              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-label">文件大小</span>
                  <span className="stat-value">{formatBytes(generatorResults.fileSize)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">计算耗时</span>
                  <span className="stat-value">{formatDuration(generatorResults.totalDuration)}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'batch' && (
        <section className="tool-section">
          <h2>批量哈希生成</h2>
          <p className="section-desc">上传多个文件，批量生成 SRI 哈希值</p>

          <div className="algorithm-selector">
            <label>选择算法：</label>
            {SUPPORTED_ALGORITHMS.map((algo) => (
              <label key={algo} className="radio-label">
                <input
                  type="radio"
                  name="batch-algorithm"
                  value={algo}
                  checked={selectedAlgorithm === algo}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                />
                <span>{algo.toUpperCase()}</span>
              </label>
            ))}
          </div>

          <div className="batch-upload-area">
            <input
              type="file"
              ref={batchFileInputRef}
              onChange={handleBatchFileSelect}
              accept=".js,.css,.txt"
              multiple
              className="file-input"
            />
            <p className="upload-hint">点击选择或拖拽多个 .js / .css 文件</p>
          </div>

          {batchFiles.length > 0 && (
            <div className="file-list">
              <h4>已选择文件 ({batchFiles.length})</h4>
              {batchFiles.map((file, index) => (
                <div key={index} className="file-list-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatBytes(file.size)}</span>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveBatchFile(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleBatchProcess}
              disabled={batchFiles.length === 0 || batchProcessing}
            >
              {batchProcessing ? '处理中...' : '批量处理'}
            </button>
            {batchResults.length > 0 && (
              <>
                <button className="secondary-btn" onClick={handleCopyAllBatch}>
                  复制全部 integrity
                </button>
                <button className="secondary-btn" onClick={handleDownloadManifest}>
                  下载 Manifest JSON
                </button>
              </>
            )}
            {batchFiles.length > 0 && (
              <button className="secondary-btn" onClick={handleClearBatch}>
                清除
              </button>
            )}
          </div>

          {batchResults.length > 0 && (
            <div className="batch-results">
              <h3>批量处理结果</h3>
              <div className="batch-summary">
                <span>成功：{batchResults.filter((r) => r.success).length}</span>
                <span>失败：{batchResults.filter((r) => !r.success).length}</span>
              </div>
              <div className="batch-result-list">
                {batchResults.map((result, index) => (
                  <div
                    key={index}
                    className={`batch-result-item ${result.success ? 'success' : 'error'}`}
                  >
                    <div className="batch-result-header">
                      <span className="batch-result-name">{result.fileName}</span>
                      {result.success && (
                        <button
                          className="copy-btn-small"
                          onClick={() => handleCopy(result.integrity, 'Integrity')}
                        >
                          复制
                        </button>
                      )}
                    </div>
                    {result.success ? (
                      <code className="batch-integrity">{result.integrity}</code>
                    ) : (
                      <span className="batch-error">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'verify' && (
        <section className="tool-section">
          <h2>SRI 校验器</h2>
          <p className="section-desc">
            粘贴 HTML 标签或 integrity 字符串 + 文件内容，验证哈希是否匹配
          </p>

          <div className="form-group">
            <label htmlFor="verify-integrity">Integrity 字符串或 HTML 标签</label>
            <input
              id="verify-integrity"
              type="text"
              className="integrity-input"
              value={verifyIntegrityInput}
              onChange={(e) => {
                setVerifyIntegrityInput(e.target.value)
                setVerifyResults(null)
              }}
              placeholder='integrity="sha256-..." 或直接 sha256-...'
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="verify-content">文件内容</label>
            <textarea
              id="verify-content"
              className="content-textarea"
              value={verifyContent}
              onChange={(e) => {
                setVerifyContent(e.target.value)
                setVerifyResults(null)
              }}
              placeholder="粘贴要校验的文件内容..."
              spellCheck={false}
            />
          </div>

          <div className="file-upload-row">
            <input
              type="file"
              onChange={handleVerifyFileSelect}
              accept=".js,.css,.txt"
              className="file-input"
            />
            <span className="file-hint">或上传文件</span>
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleVerify}
              disabled={!verifyContent.trim() || !verifyIntegrityInput.trim()}
            >
              校验
            </button>
            {verifyResults && (
              <button className="secondary-btn" onClick={handleClearVerify}>
                清除
              </button>
            )}
          </div>

          {verifyResults && (
            <div className={`verify-result ${verifyResults.match ? 'match' : 'mismatch'}`}>
              {verifyResults.error ? (
                <div className="verify-error">
                  <h3>校验错误</h3>
                  <p>{verifyResults.error}</p>
                </div>
              ) : (
                <>
                  <h3>{verifyResults.match ? '✓ 哈希匹配' : '✗ 哈希不匹配'}</h3>
                  <div className="verify-compare">
                    <div className="verify-expected">
                      <span className="verify-label">期望：</span>
                      <code>{verifyResults.expected}</code>
                    </div>
                    <div className="verify-actual">
                      <span className="verify-label">实际：</span>
                      <code>{verifyResults.actual}</code>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'compare' && (
        <section className="tool-section">
          <h2>算法对比</h2>
          <p className="section-desc">
            同一内容三种算法的 digest 并排对比，查看文件大小与计算耗时
          </p>

          <div className="form-group full-width">
            <label htmlFor="compare-content">输入内容</label>
            <textarea
              id="compare-content"
              className="content-textarea"
              value={compareContent}
              onChange={(e) => {
                setCompareContent(e.target.value)
                setCompareResults(null)
              }}
              placeholder="粘贴内容以对比三种算法的哈希结果..."
              spellCheck={false}
            />
          </div>

          <div className="action-row">
            <button
              className="primary-btn"
              onClick={handleCompare}
              disabled={!compareContent.trim()}
            >
              计算对比
            </button>
            {compareResults && (
              <button className="secondary-btn" onClick={handleClearCompare}>
                清除
              </button>
            )}
          </div>

          {compareResults && (
            <div className="compare-section">
              <div className="compare-stats">
                <div className="stat-item">
                  <span className="stat-label">文件大小</span>
                  <span className="stat-value">{formatBytes(compareResults.fileSize)}</span>
                </div>
              </div>

              <div className="compare-grid">
                {SUPPORTED_ALGORITHMS.map((algo) => {
                  const result = compareResults.results[algo]
                  return (
                    <div key={algo} className="compare-card">
                      <h4>{algo.toUpperCase()}</h4>
                      <div className="compare-hash">
                        <code>{result.integrity}</code>
                      </div>
                      <div className="compare-time">
                        耗时：{formatDuration(result.duration)}
                      </div>
                      <button
                        className="copy-btn-small"
                        onClick={() => handleCopy(result.integrity, algo)}
                      >
                        复制
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="large-file-note">
                <h4>大文件处理说明</h4>
                <p>
                  本工具使用 Web Crypto API 进行计算。对于大文件（&gt; 10MB），建议：
                </p>
                <ul>
                  <li>使用 SHA-256 平衡安全性与性能</li>
                  <li>避免在低性能设备上处理 GB 级文件</li>
                  <li>所有计算均在本地浏览器执行，不会上传数据</li>
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="notes-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>纯前端实现：</strong>所有计算均在浏览器本地执行，不向任何服务器发送数据。
          </li>
          <li>
            <strong>支持算法：</strong>SHA-256、SHA-384、SHA-512，遵循 W3C SRI 规范。
          </li>
          <li>
            <strong>Crossorigin：</strong>跨域资源必须配合 <code>crossorigin="anonymous"</code> 或
            <code>crossorigin="use-credentials"</code> 使用。
          </li>
          <li>
            <strong>使用方式：</strong>将生成的 integrity 属性添加到
            <code>&lt;script&gt;</code> 或 <code>&lt;link&gt;</code> 标签中。
          </li>
        </ul>
      </div>
    </div>
  )
}
