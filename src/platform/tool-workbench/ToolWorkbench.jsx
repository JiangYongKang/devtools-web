import { useCallback, useEffect, useRef, useState } from 'react'
import './ToolWorkbench.css'
import {
  getDefaultTopology,
  deriveLayoutClassName,
  toggleTopology,
  getBreakpointClassByWidth,
  isNarrowScreen,
  isTouchDevice,
  getTouchDeviceDragRatio,
  clampDragPosition,
  loadLayoutTopology,
  saveLayoutTopology,
  loadOutputFormat,
  saveOutputFormat,
  formatSize,
  countUtf8Bytes,
  getSizeCategory,
  getAllExamples,
  getValidationErrorExample,
  getValidationErrorExampleMetadata,
} from './logic/index.js'
import {
  LAYOUT_TOPOLOGIES,
  OUTPUT_FORMATS,
  OUTPUT_THRESHOLDS,
  DEFAULT_PARTITION_MIN_HEIGHTS,
  DEBOUNCE_DELAY_MS,
  DISPLAY_STATES,
} from './logic/constants.js'

function ToolWorkbench(props) {
  const {
    title = '工具工作台',
    description = '',
    defaultTopology = LAYOUT_TOPOLOGIES.SIDE_BY_SIDE,
    showSidebar = false,
    sidebarContent = null,
    inputContent = null,
    outputContent = null,
    actionsContent = null,
    emptyState = { message: '暂无内容，请输入数据开始操作' },
    loadingState = { message: '加载中...' },
    errorState = { message: '操作出错', errorCode: 'UNKNOWN_ERROR' },
    readOnlyState = { message: '只读模式' },
    onCopy,
    onDownload,
    onNotify,
    onTopologyChange,
    onClearInput,
    onClearOutput,
    onSwap,
    onLoadExample,
    onInjectError,
    examples = getAllExamples(),
    allowSwap = true,
    allowCopy = true,
    allowDownload = true,
    outputThresholds = OUTPUT_THRESHOLDS,
    inputPlaceholder = '请输入数据...',
    outputPlaceholder = '输出将显示在这里...',
  } = props

  const [topology, setTopology] = useState(() => {
    const saved = loadLayoutTopology(null)
    return saved || defaultTopology
  })
  const [outputFormat, setOutputFormat] = useState(() => {
    return loadOutputFormat(OUTPUT_FORMATS.PLAIN_TEXT)
  })
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [displayState, setDisplayState] = useState(DISPLAY_STATES.EMPTY)
  const [isSidebarVisible, setIsSidebarVisible] = useState(showSidebar)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280)
  const [inputMetrics, setInputMetrics] = useState({ utf8Bytes: 0, lines: 0, words: 0 })
  const [outputMetrics, setOutputMetrics] = useState({ utf8Bytes: 0, lines: 0, words: 0 })
  const [selectedExample, setSelectedExample] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(null)

  const debounceTimerRef = useRef(null)
  const inputTextareaRef = useRef(null)
  const isTouch = isTouchDevice(typeof navigator !== 'undefined' ? navigator.userAgent : '')

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    saveLayoutTopology(topology)
    if (onTopologyChange) {
      onTopologyChange(topology)
    }
  }, [topology, onTopologyChange])

  useEffect(() => {
    saveOutputFormat(outputFormat)
  }, [outputFormat])

  const handleTopologyToggle = useCallback(() => {
    setTopology(prev => toggleTopology(prev))
  }, [])

  const handleSidebarToggle = useCallback(() => {
    setIsSidebarVisible(prev => !prev)
  }, [])

  const handleInputChange = useCallback((e) => {
    const newText = e.target.value
    setInputText(newText)
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      const bytes = countUtf8Bytes(newText)
      const lines = newText ? newText.split('\n').length : 0
      const words = newText.trim() ? newText.trim().split(/\s+/).length : 0
      setInputMetrics({ utf8Bytes: bytes, lines, words })
      
      if (displayState === DISPLAY_STATES.EMPTY && newText.trim()) {
        setDisplayState(DISPLAY_STATES.READY)
      }
    }, DEBOUNCE_DELAY_MS.DEFAULT)
  }, [displayState])

  const handleClearInput = useCallback(() => {
    setInputText('')
    setInputMetrics({ utf8Bytes: 0, lines: 0, words: 0 })
    if (onClearInput) {
      onClearInput()
    }
  }, [onClearInput])

  const handleClearOutput = useCallback(() => {
    setOutputText('')
    setOutputMetrics({ utf8Bytes: 0, lines: 0, words: 0 })
    setDisplayState(DISPLAY_STATES.EMPTY)
    if (onClearOutput) {
      onClearOutput()
    }
  }, [onClearOutput])

  const handleSwap = useCallback(() => {
    if (!allowSwap) return
    const temp = inputText
    setInputText(outputText)
    setOutputText(temp)
    
    const tempMetrics = inputMetrics
    setInputMetrics(outputMetrics)
    setOutputMetrics(tempMetrics)
    
    if (onSwap) {
      onSwap()
    }
  }, [inputText, outputText, inputMetrics, outputMetrics, allowSwap, onSwap])

  const handleCopyOutput = useCallback(async () => {
    if (!allowCopy || !outputText) return
    
    try {
      if (onCopy) {
        const success = await onCopy(outputText, '输出内容')
        if (success && onNotify) {
          onNotify({ type: 'success', message: '输出已复制到剪贴板' })
        }
      } else {
        await navigator.clipboard.writeText(outputText)
        if (onNotify) {
          onNotify({ type: 'success', message: '输出已复制到剪贴板' })
        }
      }
    } catch (err) {
      if (onNotify) {
        onNotify({ type: 'error', message: `复制失败: ${err.message}` })
      }
    }
  }, [outputText, allowCopy, onCopy, onNotify])

  const handleDownloadOutput = useCallback(() => {
    if (!allowDownload || !outputText) return
    
    if (onDownload) {
      onDownload({
        content: outputText,
        filename: `tool-output-${Date.now()}.txt`,
        mimeType: outputFormat === OUTPUT_FORMATS.JSON ? 'application/json' : 'text/plain;charset=utf-8',
      })
    } else {
      const blob = new Blob([outputText], {
        type: outputFormat === OUTPUT_FORMATS.JSON ? 'application/json' : 'text/plain;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tool-output-${Date.now()}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    
    if (onNotify) {
      onNotify({ type: 'success', message: '输出已下载' })
    }
  }, [outputText, outputFormat, allowDownload, onDownload, onNotify])

  const handleLoadExample = useCallback((size) => {
    const example = examples[size]
    if (!example) return
    
    setInputText(example.content)
    setSelectedExample(size)
    const bytes = countUtf8Bytes(example.content)
    const lines = example.content.split('\n').length
    const words = example.content.trim().split(/\s+/).length
    setInputMetrics({ utf8Bytes: bytes, lines, words })
    setDisplayState(DISPLAY_STATES.READY)
    
    if (onLoadExample) {
      onLoadExample({ size, content: example.content })
    }
    if (onNotify) {
      onNotify({ type: 'info', message: `已加载${example.label}` })
    }
  }, [examples, onLoadExample, onNotify])

  const handleInjectError = useCallback(() => {
    const errorExample = getValidationErrorExample()
    setInputText(errorExample)
    setSelectedExample('error')
    const bytes = countUtf8Bytes(errorExample)
    const lines = errorExample.split('\n').length
    setInputMetrics({ utf8Bytes: bytes, lines, words: 0 })
    
    if (onInjectError) {
      onInjectError()
    }
    if (onNotify) {
      onNotify({ type: 'warning', message: '已注入校验错误示例' })
    }
  }, [onInjectError, onNotify])

  const handleDangerAction = useCallback((actionId) => {
    setShowConfirmModal(actionId)
  }, [])

  const handleConfirmReset = useCallback(() => {
    handleClearInput()
    handleClearOutput()
    setSelectedExample(null)
    setShowConfirmModal(null)
    if (onNotify) {
      onNotify({ type: 'warning', message: '危险操作已执行' })
    }
  }, [onNotify, handleClearInput, handleClearOutput])

  const handleCancelReset = useCallback(() => {
    setShowConfirmModal(null)
  }, [])

  const handleOutputFormatChange = useCallback((format) => {
    setOutputFormat(format)
  }, [])

  const hasValidInput = inputText.trim().length > 0

  const handleSimulateProcessing = useCallback(() => {
    if (!hasValidInput) {
      return
    }
    setDisplayState(DISPLAY_STATES.LOADING)
    
    setTimeout(() => {
      try {
        const processed = JSON.stringify({
          inputLength: inputText.length,
          inputBytes: inputMetrics.utf8Bytes,
          timestamp: Date.now(),
          processed: true,
        }, null, 2)
        
        setOutputText(processed)
        const bytes = countUtf8Bytes(processed)
        const lines = processed.split('\n').length
        const words = processed.trim().split(/\s+/).length
        setOutputMetrics({ utf8Bytes: bytes, lines, words })
        setDisplayState(DISPLAY_STATES.READY)
        
        if (onNotify) {
          onNotify({ type: 'success', message: '处理完成' })
        }
      } catch (err) {
        setDisplayState(DISPLAY_STATES.ERROR)
        if (onNotify) {
          onNotify({ type: 'error', message: err.message })
        }
      }
    }, 800)
  }, [inputText, inputMetrics, onNotify, hasValidInput])

  const layoutClassName = deriveLayoutClassName(topology)
  const breakpointClass = getBreakpointClassByWidth(windowWidth)
  const narrowScreen = isNarrowScreen(windowWidth)
  const outputSizeCategory = getSizeCategory(
    outputMetrics.utf8Bytes,
    outputThresholds.WARN_SIZE_BYTES,
    outputThresholds.MAX_DISPLAY_SIZE_BYTES
  )
  const isOutputExceeded = outputSizeCategory === 'exceeded'

  const renderStateContent = () => {
    switch (displayState) {
      case DISPLAY_STATES.LOADING:
        return (
          <div className="wb-state wb-loading">
            <div className="wb-spinner"></div>
            <p>{loadingState.message}</p>
          </div>
        )
      case DISPLAY_STATES.ERROR:
        return (
          <div className="wb-state wb-error">
            <div className="wb-error-icon">⚠</div>
            <p>{errorState.message}</p>
            {errorState.errorCode && (
              <div className="wb-error-code">
                <span>错误码:</span>
                <code>{errorState.errorCode}</code>
              </div>
            )}
          </div>
        )
      case DISPLAY_STATES.READ_ONLY:
        return (
          <div className="wb-state wb-readonly">
            <p>{readOnlyState.message}</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`wb-container ${layoutClassName} ${breakpointClass} ${isTouch ? 'wb-touch' : ''}`}>
      <header className="wb-header">
        <h2 className="wb-title">{title}</h2>
        <div className="wb-header-actions">
          <button
            className="wb-btn wb-btn-secondary wb-btn-icon"
            onClick={handleTopologyToggle}
            title={topology === LAYOUT_TOPOLOGIES.SIDE_BY_SIDE ? '切换为上下布局' : '切换为双栏布局'}
          >
            {topology === LAYOUT_TOPOLOGIES.SIDE_BY_SIDE ? '⇅' : '⇄'}
          </button>
          <button
            className="wb-btn wb-btn-secondary wb-btn-icon"
            onClick={handleSidebarToggle}
            title={isSidebarVisible ? '隐藏日志' : '显示日志'}
          >
            {isSidebarVisible ? '◀' : '▶'}
          </button>
        </div>
      </header>

      {description && (
        <section className="wb-meta">
          <div className="wb-description">
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
        </section>
      )}

      <section className="wb-examples">
        <div className="wb-examples-header">
          <h3>示例数据</h3>
        </div>
        <div className="wb-examples-buttons">
          <button
            className={`wb-btn wb-btn-secondary wb-btn-small ${selectedExample === 'small' ? 'wb-btn-active' : ''}`}
            onClick={() => handleLoadExample('small')}
          >
            小文本示例
          </button>
          <button
            className={`wb-btn wb-btn-secondary wb-btn-small ${selectedExample === 'medium' ? 'wb-btn-active' : ''}`}
            onClick={() => handleLoadExample('medium')}
          >
            中文本示例
          </button>
          <button
            className={`wb-btn wb-btn-secondary wb-btn-small ${selectedExample === 'large' ? 'wb-btn-active' : ''}`}
            onClick={() => handleLoadExample('large')}
          >
            大文本示例
          </button>
          <button
            className={`wb-btn wb-btn-danger wb-btn-small ${selectedExample === 'error' ? 'wb-btn-active' : ''}`}
            onClick={handleInjectError}
          >
            {getValidationErrorExampleMetadata().label}
          </button>
        </div>
      </section>

      <div className="wb-main">
        <div className="wb-partition wb-input">
          <div className="wb-partition-header">
            <h3>输入</h3>
            <div className="wb-partition-stats">
              <span className="wb-stat">
                <span className="wb-stat-label">字节:</span>
                <span className="wb-stat-value">{formatSize(inputMetrics.utf8Bytes)}</span>
              </span>
              <span className="wb-stat">
                <span className="wb-stat-label">行:</span>
                <span className="wb-stat-value">{inputMetrics.lines}</span>
              </span>
              <span className="wb-stat">
                <span className="wb-stat-label">词:</span>
                <span className="wb-stat-value">{inputMetrics.words}</span>
              </span>
            </div>
            <div className="wb-partition-actions">
              <button
                className="wb-btn wb-btn-secondary wb-btn-small"
                onClick={handleClearInput}
              >
                清空
              </button>
              {allowSwap && (
                <button
                  className="wb-btn wb-btn-secondary wb-btn-small"
                  onClick={handleSwap}
                >
                  互换
                </button>
              )}
            </div>
          </div>
          <div className="wb-partition-content" style={{ minHeight: DEFAULT_PARTITION_MIN_HEIGHTS.input }}>
            {inputContent || (
              <textarea
                ref={inputTextareaRef}
                className="wb-textarea"
                value={inputText}
                onChange={handleInputChange}
                placeholder={inputPlaceholder}
                spellCheck={false}
              />
            )}
          </div>
        </div>

        <div className="wb-partition wb-output">
          <div className="wb-partition-header">
            <h3>输出</h3>
            <div className="wb-partition-stats">
              <span className="wb-stat">
                <span className="wb-stat-label">字节:</span>
                <span className={`wb-stat-value ${outputSizeCategory === 'exceeded' ? 'wb-stat-exceeded' : ''}`}>
                  {formatSize(outputMetrics.utf8Bytes)}
                </span>
              </span>
              <span className="wb-stat">
                <span className="wb-stat-label">行:</span>
                <span className="wb-stat-value">{outputMetrics.lines}</span>
              </span>
            </div>
            <div className="wb-partition-actions">
              <select
                className="wb-select"
                value={outputFormat}
                onChange={(e) => handleOutputFormatChange(e.target.value)}
              >
                <option value={OUTPUT_FORMATS.PLAIN_TEXT}>纯文本</option>
                <option value={OUTPUT_FORMATS.JSON}>JSON</option>
              </select>
              {allowCopy && (
                <button
                  className="wb-btn wb-btn-secondary wb-btn-small"
                  onClick={handleCopyOutput}
                  disabled={!outputText || isOutputExceeded}
                >
                  复制
                </button>
              )}
              {allowDownload && (
                <button
                  className="wb-btn wb-btn-secondary wb-btn-small"
                  onClick={handleDownloadOutput}
                  disabled={!outputText}
                >
                  下载
                </button>
              )}
              <button
                className="wb-btn wb-btn-secondary wb-btn-small"
                onClick={handleClearOutput}
              >
                清空
              </button>
            </div>
          </div>
          <div className="wb-partition-content" style={{ minHeight: DEFAULT_PARTITION_MIN_HEIGHTS.output }}>
            {isOutputExceeded ? (
              <div className="wb-state wb-exceeded">
                <div className="wb-exceeded-icon">⚠</div>
                <p>输出内容过大（超过 {formatSize(outputThresholds.MAX_DISPLAY_SIZE_BYTES)}）</p>
                <p>请使用「下载」按钮获取完整内容</p>
              </div>
            ) : displayState === DISPLAY_STATES.EMPTY && !outputText ? (
              <div className="wb-state wb-empty">
                <p>{emptyState.message}</p>
              </div>
            ) : renderStateContent() || (
              outputContent || (
                <pre className="wb-output-content">
                  {outputFormat === OUTPUT_FORMATS.JSON && outputText
                    ? outputText
                    : outputText}
                </pre>
              )
            )}
          </div>
        </div>

        {isSidebarVisible && (
          <aside className="wb-partition wb-sidebar" style={{ minHeight: DEFAULT_PARTITION_MIN_HEIGHTS.sidebar }}>
            <div className="wb-partition-header">
              <h3>日志</h3>
            </div>
            <div className="wb-partition-content">
              {sidebarContent || (
                <div className="wb-sidebar-empty">
                  <p>日志将显示在这里</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <section className="wb-actions">
        {actionsContent || (
          <div className="wb-actions-row">
            <button
              className="wb-btn wb-btn-primary"
              onClick={handleSimulateProcessing}
              disabled={displayState === DISPLAY_STATES.LOADING || !hasValidInput}
            >
              {displayState === DISPLAY_STATES.LOADING ? '处理中...' : '执行处理'}
            </button>
            
            <button
              className="wb-btn wb-btn-danger"
              onClick={() => handleDangerAction('reset')}
            >
              重置所有
            </button>
          </div>
        )}
      </section>

      {narrowScreen && (
        <div className="wb-narrow-warning">
          <p>当前视口较窄，操作按钮可能会折行显示</p>
        </div>
      )}

      {showConfirmModal === 'reset' && (
        <div className="wb-modal-overlay" onClick={handleCancelReset}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-header">
              <h3>确认重置</h3>
            </div>
            <div className="wb-modal-body">
              <p>此操作将清空所有输入和输出内容。是否继续？</p>
            </div>
            <div className="wb-modal-footer">
              <button className="wb-btn wb-btn-secondary" onClick={handleCancelReset}>
                取消
              </button>
              <button className="wb-btn wb-btn-danger" onClick={handleConfirmReset}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { ToolWorkbench }
export default ToolWorkbench
