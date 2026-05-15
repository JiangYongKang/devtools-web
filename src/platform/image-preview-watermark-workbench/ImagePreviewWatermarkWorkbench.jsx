import { useCallback, useEffect, useRef, useState } from 'react'
import './ImagePreviewWatermarkWorkbench.css'
import {
  ERROR_CODES,
  ANCHOR_POSITIONS,
  WATERMARK_TYPES,
  TILE_MODES,
  DEFAULT_TEXT_WATERMARK,
  SAFE_ZOOM_MIN,
  SAFE_ZOOM_MAX,
  ZOOM_STEP,
  WHEEL_ZOOM_FACTOR,

  loadImage,
  buildWatermarkPlan,
  rasterizePreview,
  rasterizeCompare,
  downloadCanvas,
  canvasToDataUrl,
} from './logic/index.js'

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function createExampleImage(type) {
  const canvas = document.createElement('canvas')

  switch (type) {
    case 'icon':
      canvas.width = 256
      canvas.height = 256
      break
    case 'wide':
      canvas.width = 800
      canvas.height = 400
      break
    case 'transparent':
      canvas.width = 400
      canvas.height = 400
      break
    default:
      canvas.width = 512
      canvas.height = 512
  }

  const ctx = canvas.getContext('2d')

  if (type === 'icon') {
    const gradient = ctx.createLinearGradient(0, 0, 256, 256)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(1, '#764ba2')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.font = 'bold 80px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ICON', 128, 128)
  } else if (type === 'wide') {
    const gradient = ctx.createLinearGradient(0, 0, 800, 400)
    gradient.addColorStop(0, '#f093fb')
    gradient.addColorStop(0.5, '#f5576c')
    gradient.addColorStop(1, '#4facfe')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 800, 400)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = 'bold 60px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('WIDE BANNER', 400, 200)
  } else if (type === 'transparent') {
    ctx.clearRect(0, 0, 400, 400)

    ctx.fillStyle = 'rgba(102, 126, 234, 0.8)'
    ctx.beginPath()
    ctx.arc(200, 200, 150, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.font = 'bold 50px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('LOGO', 200, 200)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '20px Arial'
    ctx.fillText('PNG Transparent', 200, 240)
  }

  return canvas
}

export default function ImagePreviewWatermarkWorkbench() {
  const [activeTab, setActiveTab] = useState('workbench')

  const [imageSource, setImageSource] = useState(null)
  const [imageMeta, setImageMeta] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const [watermarkConfig, setWatermarkConfig] = useState({
    type: WATERMARK_TYPES.TEXT,
    content: DEFAULT_TEXT_WATERMARK.content,
    fontFamily: DEFAULT_TEXT_WATERMARK.fontFamily,
    fontSize: DEFAULT_TEXT_WATERMARK.fontSize,
    color: '#000000',
    opacity: DEFAULT_TEXT_WATERMARK.opacity,
    rotation: DEFAULT_TEXT_WATERMARK.rotation,
    antialias: DEFAULT_TEXT_WATERMARK.antialias,
    tileMode: DEFAULT_TEXT_WATERMARK.tileMode,
    tileSpacingX: 100,
    tileSpacingY: 100,
    tileOffsetY: 0,
    anchor: DEFAULT_TEXT_WATERMARK.anchor,
    marginX: 0,
    marginY: 0,
  })

  const [watermarkPlan, setWatermarkPlan] = useState(null)
  const [renderedCanvas, setRenderedCanvas] = useState(null)
  const [originalCanvas, setOriginalCanvas] = useState(null)
  const [isRendering, setIsRendering] = useState(false)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [compareMode, setCompareMode] = useState(false)

  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const fileInputRef = useRef(null)
  const viewerRef = useRef(null)

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return

    setIsLoading(true)
    setLoadError(null)

    try {
      const result = await loadImage(file)

      if (!result.success) {
        setLoadError(result.error)
        return
      }

      setImageSource(result.image)
      setImageMeta({
        width: result.width,
        height: result.height,
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight,
        exifOrientation: result.exifOrientation,
        memoryUsage: result.memoryUsage,
        wasDownscaled: result.wasDownscaled,
      })

      setZoom(1)
      setPan({ x: 0, y: 0 })
    } catch (err) {
      setLoadError({
        errorCode: ERROR_CODES.IMAGE_LOAD_ERROR,
        errorMessage: err?.message || '加载图片失败',
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDraggingOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false)
  }, [])

  const handleLoadExample = useCallback((type) => {
    const exampleCanvas = createExampleImage(type)

    setImageSource(exampleCanvas)
    setImageMeta({
      width: exampleCanvas.width,
      height: exampleCanvas.height,
      originalWidth: exampleCanvas.width,
      originalHeight: exampleCanvas.height,
    })

    setZoom(1)
    setPan({ x: 0, y: 0 })
    setLoadError(null)
  }, [])

  const handleConfigChange = useCallback((key, value) => {
    setWatermarkConfig((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, SAFE_ZOOM_MAX))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, SAFE_ZOOM_MIN))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleMouseDown = useCallback((e) => {
    setIsPanning(true)
    setPanStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    })
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    })
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  useEffect(() => {
    if (!imageSource || !imageMeta) {
      setWatermarkPlan(null)
      setRenderedCanvas(null)
      setOriginalCanvas(null)
      return
    }

    const config = {
      ...watermarkConfig,
      color: hexToRgba(watermarkConfig.color, watermarkConfig.opacity),
    }

    const plan = buildWatermarkPlan(config, imageMeta)
    setWatermarkPlan(plan)

    let cancelled = false

    async function render() {
      if (!plan.success) return

      setIsRendering(true)

      try {
        if (compareMode) {
          const result = await rasterizeCompare(plan, imageSource, { useOffscreen: false })
          if (!cancelled && result.success) {
            setOriginalCanvas(result.original)
            setRenderedCanvas(result.watermarked)
          }
        } else {
          const result = await rasterizePreview(plan, imageSource, { useOffscreen: false })
          if (!cancelled && result.success) {
            setRenderedCanvas(result.canvas)
          }
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false)
        }
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [imageSource, imageMeta, watermarkConfig, compareMode])

  const handleExport = useCallback(async () => {
    if (!renderedCanvas) return

    const result = await downloadCanvas(renderedCanvas, 'watermarked-image.png')
    if (!result.success) {
      console.error('Export failed:', result.error)
    }
  }, [renderedCanvas])

  const handleKeyDown = useCallback((e) => {
    if (e.key === '+' || e.key === '=') {
      handleZoomIn()
    } else if (e.key === '-') {
      handleZoomOut()
    } else if (e.key === '0') {
      handleResetView()
    }
  }, [handleZoomIn, handleZoomOut, handleResetView])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    const viewerElement = viewerRef.current
    if (!viewerElement) return

    const wheelHandler = (e) => {
      e.preventDefault()
      const delta = -e.deltaY * WHEEL_ZOOM_FACTOR
      setZoom((prev) => Math.max(SAFE_ZOOM_MIN, Math.min(prev + delta, SAFE_ZOOM_MAX)))
    }

    viewerElement.addEventListener('wheel', wheelHandler, { passive: false })
    return () => viewerElement.removeEventListener('wheel', wheelHandler)
  }, [WHEEL_ZOOM_FACTOR, SAFE_ZOOM_MIN, SAFE_ZOOM_MAX])

  const getAnchorLabel = (anchor) => {
    const labels = {
      [ANCHOR_POSITIONS.TOP_LEFT]: '左上',
      [ANCHOR_POSITIONS.TOP_CENTER]: '上中',
      [ANCHOR_POSITIONS.TOP_RIGHT]: '右上',
      [ANCHOR_POSITIONS.CENTER_LEFT]: '左中',
      [ANCHOR_POSITIONS.CENTER]: '居中',
      [ANCHOR_POSITIONS.CENTER_RIGHT]: '右中',
      [ANCHOR_POSITIONS.BOTTOM_LEFT]: '左下',
      [ANCHOR_POSITIONS.BOTTOM_CENTER]: '下中',
      [ANCHOR_POSITIONS.BOTTOM_RIGHT]: '右下',
    }
    return labels[anchor] || anchor
  }

  const renderExamples = () => (
    <div className="examples-section">
      <h3>示例图片</h3>
      <div className="example-buttons">
        <button className="action-btn" onClick={() => handleLoadExample('icon')}>
          🖼️ 小图标 (256x256)
        </button>
        <button className="action-btn" onClick={() => handleLoadExample('wide')}>
          🌅 宽幅照片 (800x400)
        </button>
        <button className="action-btn" onClick={() => handleLoadExample('transparent')}>
          💠 透明 PNG (400x400)
        </button>
      </div>
    </div>
  )

  const renderUploadArea = () => (
    <div className="upload-area">
      <div
        className={`drop-zone ${isDraggingOver ? 'dragging' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="drop-zone-icon">📷</div>
        <h3>{isLoading ? '加载中...' : '拖拽图片到此处或点击选择'}</h3>
        <p>支持 JPG、PNG、WebP、GIF 等常见格式</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={handleInputChange}
        />
      </div>
    </div>
  )

  const renderError = () => {
    if (!loadError) return null

    return (
      <div className="error-display">
        <div className="error-title">❌ 加载失败</div>
        <div className="error-message">{loadError.errorMessage}</div>
        {loadError.recoveryHint && (
          <div className="error-hint">提示: {loadError.recoveryHint}</div>
        )}
      </div>
    )
  }

  const renderImageViewer = (canvas, title) => (
    <div className="canvas-panel">
      {title && <h4>{title}</h4>}
      <div
        ref={viewerRef}
        className="image-viewer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="image-content"
          style={{
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          }}
        >
          {canvas && (
            <canvas
              ref={(el) => {
                if (el) {
                  const ctx = el.getContext('2d')
                  el.width = canvas.width
                  el.height = canvas.height
                  ctx.drawImage(canvas, 0, 0)
                }
              }}
              style={{ display: 'block' }}
            />
          )}
        </div>

        <div className="viewer-controls">
          <button className="zoom-btn" onClick={handleZoomOut} title="缩小 (减号)">
            −
          </button>
          <span className="zoom-info">{Math.round(zoom * 100)}%</span>
          <button className="zoom-btn" onClick={handleZoomIn} title="放大 (加号)">
            +
          </button>
          <button className="zoom-btn" onClick={handleResetView} title="重置视图 (0)">
            ⟲
          </button>
        </div>
      </div>

      {imageMeta && (
        <div className="image-info">
          <div>尺寸: {imageMeta.width} × {imageMeta.height} px</div>
          {imageMeta.wasDownscaled && (
            <div>原始尺寸: {imageMeta.originalWidth} × {imageMeta.originalHeight} px (已自动缩小)</div>
          )}
          {imageMeta.memoryUsage && (
            <div>内存占用: {imageMeta.memoryUsage.megabytes.toFixed(2)} MB</div>
          )}
        </div>
      )}
    </div>
  )

  const renderConfigPanel = () => (
    <div className="config-panel">
      <h3>水印参数</h3>

      <div className="config-section">
        <h4>文本设置</h4>
        <div className="config-item">
          <label>水印内容</label>
          <input
            type="text"
            value={watermarkConfig.content}
            onChange={(e) => handleConfigChange('content', e.target.value)}
          />
        </div>
        <div className="config-item">
          <label>字体</label>
          <select
            value={watermarkConfig.fontFamily}
            onChange={(e) => handleConfigChange('fontFamily', e.target.value)}
          >
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
          </select>
        </div>
        <div className="config-item">
          <label>字号: {watermarkConfig.fontSize}px</label>
          <input
            type="range"
            min="8"
            max="200"
            value={watermarkConfig.fontSize}
            onChange={(e) => handleConfigChange('fontSize', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="config-section">
        <h4>外观设置</h4>
        <div className="config-item">
          <label>颜色</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={watermarkConfig.color}
              onChange={(e) => handleConfigChange('color', e.target.value)}
            />
            <input
              type="text"
              value={watermarkConfig.color}
              onChange={(e) => handleConfigChange('color', e.target.value)}
            />
          </div>
        </div>
        <div className="config-item">
          <label>透明度: {Math.round(watermarkConfig.opacity * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={watermarkConfig.opacity}
            onChange={(e) => handleConfigChange('opacity', parseFloat(e.target.value))}
          />
        </div>
        <div className="config-item">
          <label>旋转角度: {watermarkConfig.rotation}°</label>
          <input
            type="range"
            min="0"
            max="360"
            value={watermarkConfig.rotation}
            onChange={(e) => handleConfigChange('rotation', parseInt(e.target.value))}
          />
        </div>
        <div className="config-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={watermarkConfig.antialias}
              onChange={(e) => handleConfigChange('antialias', e.target.checked)}
            />
            抗锯齿
          </label>
        </div>
      </div>

      <div className="config-section">
        <h4>平铺设置</h4>
        <div className="config-item">
          <label>平铺模式</label>
          <select
            value={watermarkConfig.tileMode}
            onChange={(e) => handleConfigChange('tileMode', e.target.value)}
          >
            <option value={TILE_MODES.NONE}>无（单个水印）</option>
            <option value={TILE_MODES.GRID}>网格平铺</option>
            <option value={TILE_MODES.DIAGONAL}>斜向平铺</option>
          </select>
        </div>
        {watermarkConfig.tileMode !== TILE_MODES.NONE && (
          <>
            <div className="config-item">
              <label>水平间距: {watermarkConfig.tileSpacingX}px</label>
              <input
                type="range"
                min="0"
                max="500"
                value={watermarkConfig.tileSpacingX}
                onChange={(e) => handleConfigChange('tileSpacingX', parseInt(e.target.value))}
              />
            </div>
            <div className="config-item">
              <label>垂直间距: {watermarkConfig.tileSpacingY}px</label>
              <input
                type="range"
                min="0"
                max="500"
                value={watermarkConfig.tileSpacingY}
                onChange={(e) => handleConfigChange('tileSpacingY', parseInt(e.target.value))}
              />
            </div>
          </>
        )}
      </div>

      {watermarkConfig.tileMode === TILE_MODES.NONE && (
        <div className="config-section">
          <h4>位置设置</h4>
          <div className="config-item">
            <label>锚点位置</label>
            <select
              value={watermarkConfig.anchor}
              onChange={(e) => handleConfigChange('anchor', e.target.value)}
            >
              {Object.values(ANCHOR_POSITIONS).map((anchor) => (
                <option key={anchor} value={anchor}>
                  {getAnchorLabel(anchor)}
                </option>
              ))}
            </select>
          </div>
          <div className="config-item">
            <label>水平边距: {watermarkConfig.marginX}px</label>
            <input
              type="range"
              min="-200"
              max="200"
              value={watermarkConfig.marginX}
              onChange={(e) => handleConfigChange('marginX', parseInt(e.target.value))}
            />
          </div>
          <div className="config-item">
            <label>垂直边距: {watermarkConfig.marginY}px</label>
            <input
              type="range"
              min="-200"
              max="200"
              value={watermarkConfig.marginY}
              onChange={(e) => handleConfigChange('marginY', parseInt(e.target.value))}
            />
          </div>
        </div>
      )}

      <div className="config-section">
        <h4>显示模式</h4>
        <div className="config-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
            />
            对比模式（原图 / 加水印）
          </label>
        </div>
      </div>

      {watermarkPlan?.warnings?.length > 0 && (
        <div className="config-section">
          <h4>⚠️ 警告</h4>
          {watermarkPlan.warnings.map((warning, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#d97706', marginBottom: '4px' }}>
              {warning.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">🖼️</div>
      <h3>尚未加载图片</h3>
      <p>请上传图片或使用上方的示例按钮开始体验</p>
    </div>
  )

  const renderAboutTab = () => (
    <div className="tab-panel about-panel">
      <div className="config-panel">
        <h3>功能说明</h3>
        <ul className="feature-list">
          <li>
            <strong>🔍 GPU 友好缩放</strong> - 滚轮、捏合或键盘 +/- 进行平滑缩放，边界自动钳制
          </li>
          <li>
            <strong>✋ 拖拽平移</strong> - 按住鼠标拖拽平移图片，支持快速定位
          </li>
          <li>
            <strong>🔄 EXIF 方向矫正</strong> - 自动读取并应用图片 EXIF 方向信息
          </li>
          <li>
            <strong>📐 大图片自动降级</strong> - 超大图片自动缩小到 GPU 友好尺寸，减少内存占用
          </li>
          <li>
            <strong>📝 文本水印</strong> - 支持自定义内容、字体、字号、颜色、透明度、旋转角度
          </li>
          <li>
            <strong>🧩 平铺模式</strong> - 网格或斜向平铺，支持自定义间距和抗锯齿开关
          </li>
          <li>
            <strong>📍 九宫格锚点</strong> - 单个水印可定位到任意角落和中心，支持边距调整
          </li>
          <li>
            <strong>👀 对比预览</strong> - 并排对比原图和加水印效果，便于参数调优
          </li>
          <li>
            <strong>💾 本地导出</strong> - 导出 PNG 图片到本地，全程不上传服务器
          </li>
          <li>
            <strong>🛡️ XSS 安全防护</strong> - 用户输入和文件名自动转义，防范脚本注入
          </li>
          <li>
            <strong>🎯 示例覆盖边界</strong> - 内置小图标、宽幅照片、透明 PNG 三种测试场景
          </li>
        </ul>
      </div>

      <div className="config-panel" style={{ marginTop: '20px' }}>
        <h3>键盘快捷键</h3>
        <ul className="feature-list">
          <li><strong>+ / =</strong> - 放大</li>
          <li><strong>−</strong> - 缩小</li>
          <li><strong>0</strong> - 重置视图</li>
        </ul>
      </div>

      <div className="config-panel" style={{ marginTop: '20px' }}>
        <h3>技术栈</h3>
        <ul className="feature-list">
          <li><strong>纯前端实现</strong> - 基于 HTML5 Canvas 2D 渲染</li>
          <li><strong>OffscreenCanvas</strong> - 支持离屏渲染（如浏览器支持）</li>
          <li><strong>createImageBitmap</strong> - 高效图片解码</li>
          <li><strong>结构化错误码</strong> - 统一的错误处理和恢复提示</li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="image-workbench">
      <header className="tool-header">
        <h1>图片工作台与水印预览</h1>
        <p className="subtitle">
          GPU 友好缩放、平移边界钳制、纯客户端水印渲染与导出
        </p>
      </header>

      <nav className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'workbench' ? 'active' : ''}`}
          onClick={() => setActiveTab('workbench')}
        >
          工作台
        </button>
        <button
          className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          功能说明
        </button>
      </nav>

      {activeTab === 'workbench' && (
        <section className="tab-panel">
          {renderExamples()}
          {renderError()}

          {!imageSource ? (
            renderUploadArea()
          ) : (
            <>
              <div className={`canvas-container ${compareMode ? 'compare-mode' : ''}`}>
                {compareMode ? (
                  <>
                    {renderImageViewer(originalCanvas, '原图')}
                    {renderImageViewer(renderedCanvas, '加水印')}
                  </>
                ) : (
                  renderImageViewer(renderedCanvas)
                )}
                {renderConfigPanel()}
              </div>

              <div className="export-actions">
                <button
                  className="action-btn success"
                  onClick={handleExport}
                  disabled={!renderedCanvas || isRendering}
                >
                  💾 导出 PNG 图片
                </button>
                <button
                  className="action-btn"
                  onClick={() => {
                    setImageSource(null)
                    setImageMeta(null)
                    setRenderedCanvas(null)
                    setOriginalCanvas(null)
                  }}
                >
                  🗑️ 清除图片
                </button>
              </div>
            </>
          )}

          {!imageSource && renderEmptyState()}
        </section>
      )}

      {activeTab === 'about' && renderAboutTab()}
    </div>
  )
}
