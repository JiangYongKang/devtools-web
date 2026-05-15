import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import {
  createTextChunkIterator,
  createDebouncedFn,
  decideWorkerUsage,
  createHeightCache,
  calculateVisibleRange,
  shouldRender,
  createCancelToken,
  generateLargeString,
  generateDatasetAsync,
  generateJsonArrayItem,
  generateLogLine,
  generateTableRow,
  estimateMemoryUsage,
  estimateTextByteSize,
  ENCODING_MODES,
  DEFAULT_CONFIG,
  WORKER_DECISION_REASONS,
  attachLargeTextController,
} from './logic/index.js'

const styles = {
  container: {
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.5',
  },
  header: {
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.9375rem',
  },
  introCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    color: 'white',
  },
  introTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '1.125rem',
    fontWeight: 600,
  },
  introList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.9375rem',
    opacity: 0.95,
  },
  introListItem: {
    marginBottom: '0.375rem',
  },
  tabBar: {
    display: 'flex',
    gap: '0.25rem',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e5e7eb',
    flexWrap: 'wrap',
    overflowX: 'auto',
    paddingBottom: 0,
  },
  tab: {
    padding: '0.75rem 1.25rem',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '0.9375rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: '#667eea',
    borderBottom: '3px solid #667eea',
    background: 'rgba(102, 126, 234, 0.06)',
    borderRadius: '8px 8px 0 0',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '1rem',
  },
  cardTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#111827',
  },
  cardSubtitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(102, 126, 234, 0.3)',
  },
  buttonPrimaryHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  buttonPrimaryDisabled: {
    background: '#d1d5db',
    cursor: 'not-allowed',
    boxShadow: 'none',
    transform: 'none',
  },
  buttonDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  label: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    fontSize: '0.9375rem',
    color: '#374151',
  },
  input: {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.9375rem',
    background: 'white',
    minWidth: '100px',
  },
  select: {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.9375rem',
    background: 'white',
    cursor: 'pointer',
    minWidth: '140px',
  },
  infoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.375rem 0.75rem',
    background: '#f0f9ff',
    color: '#0369a1',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    fontWeight: 500,
  },
  mutedText: {
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  featureList: {
    margin: '0 0 1rem 0',
    paddingLeft: '1.25rem',
    color: '#4b5563',
    fontSize: '0.875rem',
    lineHeight: '1.7',
  },
  stepBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.75rem',
    height: '1.75rem',
    borderRadius: '9999px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginRight: '0.5rem',
  },
  section: {
    display: 'grid',
    gap: '1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
    color: '#6b7280',
    background: '#f9fafb',
    borderRadius: '12px',
    border: '2px dashed #e5e7eb',
  },
  emptyStateIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
    fontSize: '0.875rem',
  },
  tableHeader: {
    textAlign: 'left',
    padding: '0.75rem 1rem',
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: 600,
    color: '#374151',
  },
  tableCell: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f3f4f6',
    color: '#4b5563',
  },
  tableCellRight: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'right',
    fontFamily: 'SFMono-Regular, Consolas, monospace',
    color: '#111827',
    fontWeight: 500,
  },
  codeBlock: {
    background: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontFamily: 'SFMono-Regular, Consolas, monospace',
    overflow: 'auto',
    border: '1px solid #e5e7eb',
    lineHeight: '1.6',
    color: '#374151',
  },
  progressBar: {
    width: '100%',
    height: '10px',
    background: '#f3f4f6',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '9999px',
    transition: 'width 0.15s ease',
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.375rem',
    fontSize: '0.875rem',
    color: '#4b5563',
  },
  virtualListContainer: {
    height: '400px',
    overflow: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: 'white',
  },
  virtualListItem: {
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.875rem',
  },
  virtualListIndex: {
    color: '#9ca3af',
    width: '70px',
    fontFamily: 'SFMono-Regular, Consolas, monospace',
    fontSize: '0.8125rem',
  },
  virtualListContent: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#4b5563',
  },
}

function Button({ 
  children, 
  variant = 'primary', 
  disabled = false, 
  onClick,
  style = {} 
}) {
  const baseStyle = variant === 'danger' 
    ? styles.buttonDanger 
    : variant === 'secondary' 
    ? styles.buttonSecondary 
    : styles.buttonPrimary
  
  const disabledStyle = disabled ? styles.buttonPrimaryDisabled : {}
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...disabledStyle,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, variant === 'primary' ? styles.buttonPrimaryHover : {})
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, {
            ...baseStyle,
            ...disabledStyle,
            ...style,
          })
        }
      }}
    >
      {children}
    </button>
  )
}

function useLargeString(byteSize = 1024 * 1024) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [generationTime, setGenerationTime] = useState(0)

  const generate = useCallback(async () => {
    setLoading(true)
    const start = performance.now()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const generated = generateLargeString(byteSize, { pattern: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' })
    setText(generated)
    setGenerationTime(performance.now() - start)
    setLoading(false)
  }, [byteSize])

  return {
    text,
    loading,
    generationTime,
    byteSize,
    charCount: text.length,
    generate,
    setText,
  }
}

function PerformanceTable({ samples }) {
  if (samples.length === 0) {
    return (
      <div style={{ ...styles.emptyState, padding: '1.5rem', marginTop: '1rem' }}>
        <div style={styles.emptyStateIcon}>📊</div>
        <div style={{ fontSize: '0.9375rem' }}>暂无性能数据，点击上方按钮开始测试</div>
      </div>
    )
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.tableHeader}>测试名称</th>
          <th style={{ ...styles.tableHeader, textAlign: 'right' }}>耗时 (ms)</th>
          <th style={styles.tableHeader}>说明</th>
        </tr>
      </thead>
      <tbody>
        {samples.map((sample, i) => (
          <tr key={i}>
            <td style={styles.tableCell}>{sample.name}</td>
            <td style={styles.tableCellRight}>{sample.duration.toFixed(2)}</td>
            <td style={{ ...styles.tableCell, color: '#6b7280' }}>{sample.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function VirtualList({ items, itemHeight = 44, overscan = 5 }) {
  const containerRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)

  const heightCache = useMemo(() => createHeightCache(itemHeight), [itemHeight])

  const visibleRange = useMemo(() => {
    return calculateVisibleRange(
      scrollTop,
      containerHeight,
      items.length,
      heightCache,
      { overscan }
    )
  }, [scrollTop, containerHeight, items.length, heightCache, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, i) => ({
      index: visibleRange.start + i,
      item,
    }))
  }, [items, visibleRange])

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      style={styles.virtualListContainer}
      onScroll={handleScroll}
    >
      <div style={{ height: visibleRange.totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: visibleRange.offsetTop, left: 0, right: 0 }}>
          {visibleItems.map(({ index, item }) => (
            <div
              key={index}
              style={{ ...styles.virtualListItem, height: itemHeight }}
            >
              <span style={styles.virtualListIndex}>[{index}]</span>
              <span style={styles.virtualListContent}>
                {typeof item === 'string' ? item : JSON.stringify(item).slice(0, 120)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tab({ id, label, active, onClick, step }) {
  return (
    <button
      key={id}
      onClick={() => onClick(id)}
      style={{
        ...styles.tab,
        ...(active ? styles.tabActive : {}),
      }}
    >
      <span style={styles.stepBadge}>{step}</span>
      {label}
    </button>
  )
}

export default function LargeContentPerformanceDemo() {
  const [activeTab, setActiveTab] = useState('chunking')
  const [performanceSamples, setPerformanceSamples] = useState([])
  const [encodingMode, setEncodingMode] = useState(ENCODING_MODES.UTF_16)
  const [chunkSize, setChunkSize] = useState(DEFAULT_CONFIG.CHUNK_SIZE_UTF16)
  const [datasetSize, setDatasetSize] = useState('small')
  const [datasetItems, setDatasetItems] = useState([])
  const [datasetType, setDatasetType] = useState('json-array')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(null)
  const [workerDecision, setWorkerDecision] = useState(null)
  const [controllerState, setControllerState] = useState(null)

  const largeString = useLargeString(1024 * 1024)
  const cancelTokenRef = useRef(null)

  const runChunkingTest = useCallback(() => {
    if (!largeString.text) return

    const samples = []
    const text = largeString.text

    let start = performance.now()
    const iteratorUtf16 = createTextChunkIterator(text, {
      encoding: ENCODING_MODES.UTF_16,
      chunkSize: 16 * 1024,
    })
    const chunksUtf16 = iteratorUtf16.collectAll()
    samples.push({
      name: 'UTF-16 分片 (16KB)',
      duration: performance.now() - start,
      note: `分成 ${chunksUtf16.length} 个分片`,
    })

    start = performance.now()
    const iteratorUtf8 = createTextChunkIterator(text, {
      encoding: ENCODING_MODES.UTF_8,
      chunkSize: 32 * 1024,
    })
    const chunksUtf8 = iteratorUtf8.collectAll()
    samples.push({
      name: 'UTF-8 分片 (32KB)',
      duration: performance.now() - start,
      note: `分成 ${chunksUtf8.length} 个分片`,
    })

    start = performance.now()
    let totalChars = 0
    for (const chunk of createTextChunkIterator(text, { encoding: ENCODING_MODES.UTF_16, chunkSize: 4096 })) {
      totalChars += chunk.length
    }
    samples.push({
      name: '迭代器遍历 (4KB chunks)',
      duration: performance.now() - start,
      note: `共 ${totalChars} 字符`,
    })

    setPerformanceSamples(samples)
  }, [largeString.text])

  const runDebounceTest = useCallback(() => {
    const samples = []
    const results = { basic: 0, maxWait: 0, leading: 0 }

    return new Promise((resolve) => {
      const basicFn = createDebouncedFn((val) => {
        results.basic = val
      }, { wait: 50, maxWait: null })

      const maxWaitFn = createDebouncedFn((val) => {
        results.maxWait = val
      }, { wait: 100, maxWait: 150 })

      const leadingFn = createDebouncedFn((val) => {
        results.leading = val
      }, { wait: 50, leading: true, trailing: false })

      let start = performance.now()
      basicFn(1)
      setTimeout(() => {
        basicFn(2)
      }, 25)
      setTimeout(() => {
        samples.push({
          name: '基本防抖',
          duration: performance.now() - start,
          note: `最终值: ${results.basic}`,
        })

        start = performance.now()
        let i = 0
        const interval = setInterval(() => {
          maxWaitFn(i++)
          if (i >= 10) {
            clearInterval(interval)
          }
        }, 50)

        setTimeout(() => {
          samples.push({
            name: 'maxWait 防抖',
            duration: performance.now() - start,
            note: `最终值: ${results.maxWait}`,
          })

          start = performance.now()
          leadingFn('a')
          leadingFn('b')
          samples.push({
            name: 'leading 防抖',
            duration: performance.now() - start,
            note: `最终值: ${results.leading}`,
          })

          setPerformanceSamples(samples)
          resolve()
        }, 300)
      }, 100)
    })
  }, [])

  const checkWorkerDecision = useCallback(() => {
    const decisions = []

    const smallDecision = decideWorkerUsage(100 * 1024)
    decisions.push({
      name: '小负载 (100KB)',
      duration: 0,
      note: `${smallDecision.recommendation} - 理由: ${smallDecision.reason}`,
    })

    const largeDecision = decideWorkerUsage(2 * 1024 * 1024)
    decisions.push({
      name: '大负载 (2MB)',
      duration: 0,
      note: `${largeDecision.recommendation} - 理由: ${largeDecision.reason}`,
    })

    const borderDecision = decideWorkerUsage(700 * 1024)
    decisions.push({
      name: '边界负载 (700KB)',
      duration: 0,
      note: `${borderDecision.recommendation} - 理由: ${borderDecision.reason}`,
    })

    setWorkerDecision({
      small: smallDecision,
      large: largeDecision,
      border: borderDecision,
    })
    setPerformanceSamples(decisions)
  }, [])

  const generateDataset = useCallback(async () => {
    if (isGenerating) return

    setIsGenerating(true)
    setGenerationProgress(null)

    const token = createCancelToken()
    cancelTokenRef.current = token

    let generator = generateJsonArrayItem
    let itemType = 'json-array-item'

    if (datasetType === 'log-line') {
      generator = generateLogLine
      itemType = 'log-line'
    } else if (datasetType === 'table-row') {
      generator = generateTableRow
      itemType = 'table-row'
    }

    try {
      const start = performance.now()
      const items = await generateDatasetAsync(datasetSize, {
        generator,
        cancelToken: token,
        itemType,
        onProgress: (progress) => {
          setGenerationProgress(progress)
        },
      })

      const duration = performance.now() - start
      setDatasetItems(items)
      setPerformanceSamples([{
        name: `数据集生成 (${datasetSize})`,
        duration,
        note: `共 ${items.length} 项，约 ${estimateMemoryUsage(items.length, itemType).megabytes.toFixed(2)} MB`,
      }])
    } catch (e) {
      if (e.errorCode !== 'CANCELLED') {
        console.error(e)
      }
    } finally {
      setIsGenerating(false)
      setGenerationProgress(null)
      cancelTokenRef.current = null
    }
  }, [datasetSize, datasetType, isGenerating])

  const cancelGeneration = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel()
    }
  }, [])

  const testController = useCallback(() => {
    const editorRef = { current: document.createElement('textarea') }
    const controller = attachLargeTextController(editorRef, {
      thresholdBytes: 1024 * 1024,
      onOverBudget: (info) => {
        setControllerState({
          ...controller.getState(),
          budgetInfo: info,
        })
      },
    })
    setControllerState(controller.getState())
    setPerformanceSamples([{
      name: '控制器挂载测试',
      duration: 0,
      note: `已附加: ${controller.getState().isAttached}`,
    }])
  }, [])

  const tabs = [
    { id: 'chunking', label: '文本分片', step: '1' },
    { id: 'debounce', label: '防抖调度', step: '2' },
    { id: 'dataset', label: '数据生成', step: '3' },
    { id: 'virtual-list', label: '虚拟列表', step: '4' },
    { id: 'worker', label: 'Worker 决策', step: '5' },
    { id: 'controller', label: '控制器', step: '6' },
  ]

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>大文本处理工具包</h1>
        <p style={styles.subtitle}>
          专为处理大型文本和数据设计的工具集合，包含分片迭代器、防抖调度、Worker 决策、虚拟列表等核心功能
        </p>
      </header>

      <div style={styles.introCard}>
        <h3 style={styles.introTitle}>🚀 快速开始指南</h3>
        <ul style={styles.introList}>
          <li style={styles.introListItem}>
            <strong>步骤 1-2</strong>：文本分片与防抖调度 — 理解基础处理能力
          </li>
          <li style={styles.introListItem}>
            <strong>步骤 3</strong>：生成测试数据集 — 为虚拟列表准备数据
          </li>
          <li style={styles.introListItem}>
            <strong>步骤 4</strong>：体验虚拟列表 — 高效渲染大量数据项
          </li>
          <li style={styles.introListItem}>
            <strong>步骤 5-6</strong>：Worker 决策与控制器 — 高级性能优化
          </li>
        </ul>
      </div>

      <div style={styles.tabBar}>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            label={tab.label}
            step={tab.step}
            active={activeTab === tab.id}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {activeTab === 'chunking' && (
        <div style={styles.section}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>第一步：生成测试字符串</h3>
            <p style={styles.mutedText}>
              我们需要一个 1MB+ 的大文本字符串来测试分片功能。点击下方按钮生成。
            </p>
            <div style={{ marginTop: '1rem', ...styles.buttonRow }}>
              <Button onClick={largeString.generate} disabled={largeString.loading}>
                {largeString.loading ? '⏳ 生成中...' : '✨ 生成 1MB 测试字符串'}
              </Button>
              {largeString.text && (
                <span style={styles.infoBadge}>
                  ✅ 已生成
                </span>
              )}
            </div>
            {largeString.text && (
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                <strong>{largeString.charCount.toLocaleString()}</strong> 字符 · 
                <strong> {(largeString.byteSize / 1024).toFixed(1)} KB</strong> · 
                生成耗时 <strong>{largeString.generationTime.toFixed(2)} ms</strong>
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>分片参数配置</h3>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={styles.label}>
                编码模式:
                <select
                  value={encodingMode}
                  onChange={(e) => setEncodingMode(e.target.value)}
                  style={styles.select}
                >
                  <option value={ENCODING_MODES.UTF_16}>UTF-16 (字符单位)</option>
                  <option value={ENCODING_MODES.UTF_8}>UTF-8 (字节窗口)</option>
                </select>
              </label>
              <label style={styles.label}>
                分片大小 (KB):
                <input
                  type="number"
                  value={chunkSize / 1024}
                  onChange={(e) => setChunkSize(Number(e.target.value) * 1024)}
                  style={{ ...styles.input, width: '80px' }}
                  min="1"
                  max="1024"
                />
              </label>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>性能测试</h3>
            <p style={styles.mutedText}>
              对比不同编码模式下的分片性能，包含 UTF-16/UTF-8 两种模式。
            </p>
            <div style={{ marginTop: '1rem' }}>
              <Button 
                onClick={runChunkingTest} 
                disabled={!largeString.text}
              >
                {!largeString.text ? '🔒 请先生成字符串' : '⚡ 运行分片性能测试'}
              </Button>
            </div>
            <PerformanceTable samples={performanceSamples} />
            <p style={{ marginTop: '1rem', ...styles.mutedText }}>
              💡 注：此为页面内性能对比，不精确到微基准级别的测量
            </p>
          </div>
        </div>
      )}

      {activeTab === 'debounce' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>第二步：防抖与节流调度</h3>
          <div style={styles.featureList}>
            <li><strong>wait</strong>：等待时间（默认 100ms）— 调用后等待多久执行</li>
            <li><strong>maxWait</strong>：最大等待时间 — 确保函数在指定时间内至少执行一次</li>
            <li><strong>leading</strong>：开始时立即执行一次</li>
            <li><strong>trailing</strong>：结束后执行一次（默认开启）</li>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Button onClick={runDebounceTest}>
              🧪 运行防抖测试（basic + maxWait + leading）
            </Button>
          </div>
          <PerformanceTable samples={performanceSamples} />
        </div>
      )}

      {activeTab === 'dataset' && (
        <div style={styles.section}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>第三步：生成测试数据集</h3>
            <p style={styles.mutedText}>
              生成的数据集将用于后续的虚拟列表演示。支持三种数据类型和三种规模。
            </p>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
              <label style={styles.label}>
                数据规模:
                <select
                  value={datasetSize}
                  onChange={(e) => setDatasetSize(e.target.value)}
                  style={styles.select}
                >
                  <option value="small">小 ({DEFAULT_CONFIG.DATASET_SIZES.small.toLocaleString()} 项)</option>
                  <option value="medium">中 ({DEFAULT_CONFIG.DATASET_SIZES.medium.toLocaleString()} 项)</option>
                  <option value="large">大 ({DEFAULT_CONFIG.DATASET_SIZES.large.toLocaleString()} 项)</option>
                </select>
              </label>
              <label style={styles.label}>
                数据类型:
                <select
                  value={datasetType}
                  onChange={(e) => setDatasetType(e.target.value)}
                  style={styles.select}
                >
                  <option value="json-array">📋 JSON 数组</option>
                  <option value="log-line">📝 日志行</option>
                  <option value="table-row">📊 表格行</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: '1rem', ...styles.buttonRow }}>
              <Button onClick={generateDataset} disabled={isGenerating}>
                {isGenerating ? '⏳ 生成中...' : '🎯 开始生成数据集'}
              </Button>
              {isGenerating && (
                <Button onClick={cancelGeneration} variant="danger">
                  🛑 停止生成
                </Button>
              )}
              {datasetItems.length > 0 && (
                <span style={styles.infoBadge}>
                  ✅ 已生成 {datasetItems.length.toLocaleString()} 项
                </span>
              )}
            </div>

            {generationProgress && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={styles.progressText}>
                  <span>进度: {generationProgress.generated.toLocaleString()} / {generationProgress.total.toLocaleString()}</span>
                  <span>{generationProgress.percent.toFixed(1)}%</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${generationProgress.percent}%` }} />
                </div>
                <div style={{ marginTop: '0.5rem', ...styles.mutedText }}>
                  内存估算: <strong>{generationProgress.memory.megabytes.toFixed(2)} MB</strong>
                </div>
              </div>
            )}
          </div>

          {datasetItems.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardSubtitle}>数据预览 (前 5 项)</h3>
              <pre style={styles.codeBlock}>
{JSON.stringify(datasetItems.slice(0, 5), null, 2)}
                {'\n... (共 ' + datasetItems.length.toLocaleString() + ' 项)'}
              </pre>
              <PerformanceTable samples={performanceSamples} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'virtual-list' && (
        <div style={styles.section}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>第四步：虚拟列表</h3>
            <div style={styles.featureList}>
              <li><strong>高度缓存 + overscan</strong>：只渲染可视区域附近的元素</li>
              <li><strong>动态行高测量</strong>：二分查找锚点定位滚动位置</li>
              <li><strong>快速滚动优化</strong>：requestAnimationFrame 合并渲染</li>
              <li><strong>无障碍支持</strong>：prefers-reduced-motion 下关闭滚动惯性动画</li>
            </div>
          </div>

          {datasetItems.length > 0 ? (
            <div style={styles.card}>
              <h3 style={styles.cardSubtitle}>
                虚拟列表演示 — {datasetItems.length.toLocaleString()} 项数据
              </h3>
              <p style={styles.mutedText}>
                💡 尝试快速滚动，观察虚拟列表如何高效处理大量数据
              </p>
              <div style={{ marginTop: '1rem' }}>
                <VirtualList items={datasetItems} />
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>📦</div>
              <div style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>暂无数据</div>
              <div style={styles.mutedText}>
                请先前往 <strong>「第三步：数据生成」</strong> 标签页生成测试数据集
              </div>
              <div style={{ marginTop: '1rem' }}>
                <Button onClick={() => setActiveTab('dataset')}>
                  → 前往数据生成
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'worker' && (
        <div style={styles.section}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>第五步：Worker 决策引擎</h3>
            <p style={styles.mutedText}>
              基于三个因素自动决策是否使用 Web Worker：
            </p>
            <div style={styles.featureList}>
              <li><strong>字节阈值</strong>：超过阈值才考虑使用 Worker</li>
              <li><strong>hardwareConcurrency</strong>：CPU 核心数决定是否有富余资源</li>
              <li><strong>SharedArrayBuffer 可用性</strong>：影响数据传输效率</li>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Button onClick={checkWorkerDecision}>
                🔍 检查当前环境的 Worker 决策
              </Button>
            </div>
          </div>

          {workerDecision && (
            <div style={styles.card}>
              <h3 style={styles.cardSubtitle}>决策详情</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong>硬件环境信息:</strong>
                <pre style={{ ...styles.codeBlock, marginTop: '0.5rem' }}>
{JSON.stringify(workerDecision.small.details, null, 2)}
                </pre>
              </div>
              <PerformanceTable samples={performanceSamples} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'controller' && (
        <div style={styles.section}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>第六步：attachLargeTextController</h3>
            <p style={styles.mutedText}>
              与任务 052 衔接的类型契约（本任务内为最小 stub 实现）
            </p>
            <div style={styles.featureList}>
              <li><strong>onOverBudget 回调</strong>：文本内容超过阈值时触发</li>
              <li><strong>thresholdBytes</strong>：可配置的字节阈值</li>
              <li><strong>getState()</strong>：获取控制器当前状态</li>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Button onClick={testController}>
                🧪 测试控制器挂载
              </Button>
            </div>
          </div>

          {controllerState && (
            <div style={styles.card}>
              <h3 style={styles.cardSubtitle}>控制器状态</h3>
              <pre style={styles.codeBlock}>
{JSON.stringify(controllerState, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
