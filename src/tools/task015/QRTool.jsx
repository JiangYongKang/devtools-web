import { useCallback, useState } from 'react'
import {
  assembleParams,
  generateQRMatrix,
  renderToCanvas,
  renderToSVG,
  buildMetadata,
  validateOutputSize,
  getMimeType,
  DEFAULT_PARAMS,
  VALID_ERROR_LEVELS,
  VALID_FORMATS,
  computeModuleSizeFromNominalSize,
  estimateVersion,
  getErrorMessage,
  ERROR_CODES,
} from './logic/index.js'
import './QRTool.css'

const PREVIEW_SCALE = 2

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

export default function QRTool() {
  const [content, setContent] = useState('https://example.com')
  const [errorLevel, setErrorLevel] = useState(DEFAULT_PARAMS.errorLevel)
  const [margin, setMargin] = useState(String(DEFAULT_PARAMS.margin))
  const [sizeMode, setSizeMode] = useState('moduleSize')
  const [moduleSize, setModuleSize] = useState(String(DEFAULT_PARAMS.moduleSize))
  const [nominalSizeMm, setNominalSizeMm] = useState('50')
  const [outputFormat, setOutputFormat] = useState(DEFAULT_PARAMS.outputFormat)

  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copyStatus, setCopyStatus] = useState(null)

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

  const handleClear = useCallback(() => {
    setContent('')
    setErrorLevel(DEFAULT_PARAMS.errorLevel)
    setMargin(String(DEFAULT_PARAMS.margin))
    setSizeMode('moduleSize')
    setModuleSize(String(DEFAULT_PARAMS.moduleSize))
    setNominalSizeMm('50')
    setOutputFormat(DEFAULT_PARAMS.outputFormat)
    setResult(null)
    setError(null)
  }, [])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const rawParams = {
        content: content.trim(),
        errorLevel,
        margin: margin ? parseInt(margin, 10) : undefined,
        outputFormat,
      }

      if (sizeMode === 'moduleSize' && moduleSize) {
        rawParams.moduleSize = parseInt(moduleSize, 10)
      } else if (sizeMode === 'nominalSizeMm' && nominalSizeMm) {
        rawParams.nominalSizeMm = parseFloat(nominalSizeMm)
      }

      const params = assembleParams(rawParams)

      const version = estimateVersion(params.content, params.errorLevel)
      if (version > 40) {
        const error = new Error(getErrorMessage(ERROR_CODES.CONTENT_TOO_LONG))
        error.code = ERROR_CODES.CONTENT_TOO_LONG
        throw error
      }

      let effectiveModuleSize = params.moduleSize || DEFAULT_PARAMS.moduleSize
      if (params.nominalSizeMm !== null) {
        effectiveModuleSize = computeModuleSizeFromNominalSize(params.nominalSizeMm, version)
      }

      const matrixSize = (version - 1) * 4 + 21
      const totalPixelSize = (matrixSize + params.margin * 2) * effectiveModuleSize
      validateOutputSize(totalPixelSize)

      const { matrix } = generateQRMatrix(params.content, params.errorLevel)

      let previewImageUrl = null
      let outputBytes = 0
      let downloadUrl = null
      let svgContent = null

      if (params.outputFormat === 'svg') {
        const svg = renderToSVG(matrix, effectiveModuleSize, params.margin)
        svgContent = svg
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        outputBytes = blob.size
        downloadUrl = URL.createObjectURL(blob)
        previewImageUrl = downloadUrl
      } else {
        const canvas = renderToCanvas(matrix, effectiveModuleSize, params.margin)
        const mimeType = getMimeType(params.outputFormat)
        const quality = params.outputFormat === 'jpeg' ? 0.95 : undefined
        previewImageUrl = canvas.toDataURL(mimeType, quality)

        const canvasHiRes = renderToCanvas(matrix, effectiveModuleSize, params.margin, PREVIEW_SCALE)
        const dataUrl = canvasHiRes.toDataURL(mimeType, quality)
        const base64Data = dataUrl.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        outputBytes = byteArray.length

        const blob = new Blob([byteArray], { type: mimeType })
        downloadUrl = URL.createObjectURL(blob)
      }

      const metadata = await buildMetadata({
        content: params.content,
        errorLevel: params.errorLevel,
        margin: params.margin,
        moduleSize: effectiveModuleSize,
        pixelSize: totalPixelSize,
        outputFormat: params.outputFormat,
        outputBytes,
      })

      setResult({
        previewImageUrl,
        downloadUrl,
        svgContent,
        metadata,
        version,
        moduleSize: effectiveModuleSize,
        format: params.outputFormat,
        generatedAt: Date.now(),
      })
    } catch (err) {
      setError({
        code: err.code || ERROR_CODES.INVALID_PARAMETER,
        message: err.message || '生成失败',
      })
    } finally {
      setLoading(false)
    }
  }, [
    content,
    errorLevel,
    margin,
    sizeMode,
    moduleSize,
    nominalSizeMm,
    outputFormat,
  ])

  const handleDownload = useCallback(() => {
    if (!result?.downloadUrl) return
    const a = document.createElement('a')
    a.href = result.downloadUrl
    const ext = result.format === 'jpeg' ? 'jpg' : result.format
    a.download = `qrcode-${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [result])

  const handleSizeModeChange = useCallback((mode) => {
    setSizeMode(mode)
    if (mode === 'moduleSize') {
      setNominalSizeMm('50')
    } else {
      setModuleSize(String(DEFAULT_PARAMS.moduleSize))
    }
  }, [])

  const canGenerate = content.trim().length > 0 && (
    (sizeMode === 'moduleSize' && moduleSize) ||
    (sizeMode === 'nominalSizeMm' && nominalSizeMm) ||
    (sizeMode === 'moduleSize' && !moduleSize)
  )

  const renderErrorBox = (err) => {
    if (!err) return null
    return (
      <div className="error-box">
        <strong>生成失败</strong>
        {err.code && (
          <div className="error-code">
            错误代码：<code>{err.code}</code>
          </div>
        )}
        <p dangerouslySetInnerHTML={{ __html: escapeHtml(err.message) }} />
      </div>
    )
  }

  return (
    <div className="qr-tool">
      {copyStatus && (
        <div className={`toast ${copyStatus.type}`}>
          <span dangerouslySetInnerHTML={{ __html: escapeHtml(copyStatus.message) }} />
        </div>
      )}

      <section className="tool-section">
        <h2>内容输入</h2>
        <div className="form-group full-width">
          <label htmlFor="qr-content">二维码内容</label>
          <textarea
            id="qr-content"
            className="qr-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入要编码的文本或 URL...&#10;&#10;例如：https://example.com"
            spellCheck={false}
          />
          <span className="input-hint">
            支持任意文本内容，包括网址、电话号码、纯文本等
          </span>
        </div>
      </section>

      <section className="tool-section">
        <h2>参数配置</h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="error-level">容错能力</label>
            <select
              id="error-level"
              value={errorLevel}
              onChange={(e) => setErrorLevel(e.target.value)}
            >
              {VALID_ERROR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {
                    level === 'L' ? '低 - 适合无污损场景 (7%)' :
                    level === 'M' ? '中 - 日常使用推荐 (15%)' :
                    level === 'Q' ? '较高 - 适合部分遮挡 (25%)' :
                    '高 - 适合加 Logo 或大面积遮挡 (30%)'
                  }
                </option>
              ))}
            </select>
            <span className="input-hint">
              越高的容错能力可容忍更多的污损、遮盖或在二维码中间加 Logo
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="margin">边距（模块数）</label>
            <input
              id="margin"
              type="number"
              min="0"
              max="20"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder="4"
            />
            <span className="input-hint">
              二维码周围的空白区域，推荐 4（标准）
            </span>
          </div>
        </div>

        <div className="size-mode-section">
          <div className="form-group full-width">
            <label>尺寸模式</label>
            <div className="mode-switch">
              <button
                type="button"
                className={`mode-btn ${sizeMode === 'moduleSize' ? 'active' : ''}`}
                onClick={() => handleSizeModeChange('moduleSize')}
              >
                模块大小
              </button>
              <button
                type="button"
                className={`mode-btn ${sizeMode === 'nominalSizeMm' ? 'active' : ''}`}
                onClick={() => handleSizeModeChange('nominalSizeMm')}
              >
                标称尺寸
              </button>
            </div>
          </div>

          {sizeMode === 'moduleSize' ? (
            <div className="form-group size-input-group">
              <label htmlFor="module-size">模块大小（像素）</label>
              <input
                id="module-size"
                type="number"
                min="1"
                max="50"
                value={moduleSize}
                onChange={(e) => setModuleSize(e.target.value)}
                placeholder={String(DEFAULT_PARAMS.moduleSize)}
              />
              <span className="input-hint">
                每个 QR 码模块（黑点）的像素大小，范围 1-50
              </span>
            </div>
          ) : (
            <div className="form-group size-input-group">
              <label htmlFor="nominal-size">标称尺寸（毫米）</label>
              <input
                id="nominal-size"
                type="number"
                min="10"
                max="500"
                step="0.1"
                value={nominalSizeMm}
                onChange={(e) => setNominalSizeMm(e.target.value)}
                placeholder="例如：50"
              />
              <span className="input-hint">
                打印时的目标尺寸，范围 10-500mm（将自动计算模块大小）
              </span>
            </div>
          )}
        </div>

        <div className="form-row with-top-gap">
          <div className="form-group">
            <label htmlFor="output-format">输出格式</label>
            <select
              id="output-format"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
            >
              {VALID_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
            <span className="input-hint">
              PNG 适合大多数场景，SVG 适合矢量缩放
            </span>
          </div>
        </div>

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
          >
            {loading ? '生成中...' : '生成二维码'}
          </button>
          <button
            className="secondary-btn"
            onClick={handleClear}
          >
            重置
          </button>
        </div>

        {renderErrorBox(error)}
      </section>

      {result && (
        <>
          <section className="tool-section">
            <div className="result-header-row">
              <h2>二维码预览</h2>
              <div className="result-actions">
                <button
                  className="download-btn"
                  onClick={handleDownload}
                >
                  下载图像
                </button>
              </div>
            </div>

            <div className="qr-preview-container">
              <div className="qr-preview-wrapper">
                <img
                  src={result.previewImageUrl}
                  alt="Generated QR Code"
                  className="qr-preview-image"
                />
              </div>
            </div>
          </section>

          <section className="tool-section">
            <h2>元数据</h2>
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">版本</span>
                <span className="metadata-value">
                  <code>V{result.version}</code>
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">纠错级别</span>
                <span className="metadata-value">
                  <code>{result.metadata.errorLevel}</code>
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">模块大小</span>
                <span className="metadata-value">
                  <code>{result.metadata.moduleSize} px</code>
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">边距</span>
                <span className="metadata-value">
                  <code>{result.metadata.margin} 模块</code>
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">图像尺寸</span>
                <span className="metadata-value">
                  <code>{result.metadata.pixelWidth} × {result.metadata.pixelHeight} px</code>
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">MIME 类型</span>
                <span className="metadata-value">
                  <code>{result.metadata.mimeType}</code>
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">文件大小</span>
                <span className="metadata-value">
                  <code>{formatBytes(result.metadata.outputBytes)}</code>
                </span>
              </div>
              {result.metadata.contentDigest && (
                <div className="metadata-item full-width">
                  <div className="metadata-row">
                    <span className="metadata-label">内容摘要 (SHA-256)</span>
                    <button
                      className="copy-btn small"
                      onClick={() => handleCopy(result.metadata.contentDigest, 'SHA-256 摘要')}
                    >
                      复制
                    </button>
                  </div>
                  <span className="metadata-value digest">
                    <code>{result.metadata.contentDigest}</code>
                  </span>
                </div>
              )}
              <div className="metadata-item full-width">
                <span className="metadata-label">生成时间</span>
                <span className="metadata-value">
                  <code>{new Date(result.generatedAt).toLocaleString()}</code>
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="notes-section">
        <h3>使用说明</h3>
        <ul>
          <li>
            <strong>纯前端生成：</strong>所有二维码图像均在浏览器本地生成，不向任何服务器发送数据。
          </li>
          <li>
            <strong>纠错级别：</strong>L（7%）、M（15%）、Q（25%）、H（30%）表示二维码被遮盖后仍能识别的最大比例。
          </li>
          <li>
            <strong>尺寸计算：</strong>图像像素尺寸 = (版本模块数 + 2 × 边距) × 模块大小。版本 1 为 21×21 模块，每增加一个版本增加 4 个模块。
          </li>
          <li>
            <strong>内容长度：</strong>内容长度会影响所需的二维码版本。版本 40（最大）可容纳约 3000 个字符（取决于纠错级别）。
          </li>
          <li>
            <strong>参数冲突：</strong><code>moduleSize</code> 和 <code>nominalSizeMm</code> 不能同时指定，只能选择其中一种尺寸模式。
          </li>
          <li>
            <strong>最大尺寸：</strong>为防止性能问题，输出图像最大限制为 4096×4096 像素。
          </li>
        </ul>
      </div>
    </div>
  )
}
