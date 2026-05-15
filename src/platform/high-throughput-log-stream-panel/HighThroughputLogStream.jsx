import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import './HighThroughputLogStream.css'
import {
  LOG_LEVELS,
  SAMPLING_STRATEGIES,
  DEFAULT_BUFFER_CAPACITY,
  DEFAULT_SAMPLE_SIZE,
  RingBuffer,
  ansiTokenize,
  ansiToStyleObject,
  stripAnsi,
  samplingPolicy,
  calculateInfoLossRate,
  createLogFilter,
  createLogStream,
  detectFoldType,
  expandFoldedContent,
  searchLogsSync,
  highlightText,
} from './logic/index.js'

function formatTimestamp(ts) {
  const date = new Date(ts)
  return date.toISOString().replace('T', ' ').substring(0, 23)
}

function AnsiText({ text }) {
  const tokens = useMemo(() => ansiTokenize(text), [text])

  return (
    <span className="ansi-text">
      {tokens.map((token, index) => {
        const style = ansiToStyleObject(token.styles)
        const className = []
        if (token.styles.bold) className.push('ansi-bold')
        if (token.styles.dim) className.push('ansi-dim')
        if (token.styles.italic) className.push('ansi-italic')
        if (token.styles.underline) className.push('ansi-underline')
        if (token.styles.strikethrough) className.push('ansi-strikethrough')

        return (
          <span key={index} style={style} className={className.join(' ')}>
            {token.content}
          </span>
        )
      })}
    </span>
  )
}

function LogLine({ log, index, searchMatches, isSelected, isFolded, onToggleFold, onClick }) {
  const foldType = detectFoldType(log)
  const hasFoldContent = foldType !== 'none'
  const expandedContent = isFolded ? [] : expandFoldedContent(log)

  const matches = searchMatches?.find((m) => m.index === index)?.matches || []
  const messageSegments = highlightText(stripAnsi(log.message || log.text || ''), matches)

  return (
    <>
      <div className={`log-line ${isSelected ? 'selected' : ''}`} onClick={() => onClick(index)}>
        <span className="line-number">{index + 1}</span>
        <span className="line-timestamp">{formatTimestamp(log.timestamp || Date.now())}</span>
        <span className={`line-level ${log.level || 'info'}`}>{(log.level || 'info').toUpperCase()}</span>
        <span className="line-module">{log.module || 'app'}</span>
        <span className="line-message">
          {hasFoldContent && (
            <button className="fold-button" onClick={(e) => {
              e.stopPropagation()
              onToggleFold(index)
            }}>
              {isFolded ? '▶' : '▼'}
            </button>
          )}
          {log.hasAnsi ? (
            <AnsiText text={log.message || log.text || ''} />
          ) : (
            messageSegments.map((seg, i) => (
              <span key={i} className={seg.isHighlight ? 'highlight' : ''}>
                {seg.text}
              </span>
            ))
          )}
        </span>
      </div>
      {!isFolded && expandedContent.length > 1 && (
        <div className="folded-content">
          {expandedContent.slice(1).map((line, i) => (
            <div key={i} className="log-line">
              <span className="line-number"></span>
              <span className="line-timestamp"></span>
              <span className="line-level"></span>
              <span className="line-module"></span>
              <span className="line-message">{line}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default function HighThroughputLogStream() {
  const [logs, setLogs] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamRate, setStreamRate] = useState(200)
  const [followLatest, setFollowLatest] = useState(true)
  const [selectedLine, setSelectedLine] = useState(null)
  const [foldedLines, setFoldedLines] = useState(new Set())
  const [bufferCapacity, setBufferCapacity] = useState(DEFAULT_BUFFER_CAPACITY)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [searchMatches, setSearchMatches] = useState([])

  const [minLevel, setMinLevel] = useState(LOG_LEVELS.TRACE)
  const [includeFilter, setIncludeFilter] = useState('')
  const [excludeFilter, setExcludeFilter] = useState('')

  const [samplingStrategy, setSamplingStrategy] = useState(SAMPLING_STRATEGIES.UNIFORM)
  const [sampleSize, setSampleSize] = useState(DEFAULT_SAMPLE_SIZE)
  const [samplingResult, setSamplingResult] = useState(null)

  const [totalReceived, setTotalReceived] = useState(0)
  const [logsPerSecond, setLogsPerSecond] = useState(0)

  const bufferRef = useRef(new RingBuffer(bufferCapacity))
  const streamRef = useRef(null)
  const viewportRef = useRef(null)
  const lpsCounterRef = useRef({ count: 0, lastTime: Date.now() })
  const rafRef = useRef(null)
  const pendingLogsRef = useRef([])

  const logFilter = useMemo(() => createLogFilter({
    minLevel,
    includes: includeFilter ? [includeFilter] : [],
    excludes: excludeFilter ? [excludeFilter] : [],
  }), [minLevel, includeFilter, excludeFilter])

  const filteredLogs = useMemo(() => {
    return logs.filter(logFilter)
  }, [logs, logFilter])

  const displayedLogs = useMemo(() => {
    if (!samplingResult) {
      return filteredLogs
    }
    return samplingResult.sampledLines
  }, [filteredLogs, samplingResult])

  useEffect(() => {
    if (!searchQuery) {
      setSearchMatches([])
      return
    }

    try {
      const matches = searchLogsSync(filteredLogs, searchQuery, {
        caseSensitive: searchCaseSensitive,
        useRegex,
      })
      setSearchMatches(matches)
    } catch (e) {
      setSearchMatches([])
    }
  }, [filteredLogs, searchQuery, searchCaseSensitive, useRegex])

  useEffect(() => {
    if (!isStreaming) {
      if (streamRef.current) {
        streamRef.current.stop()
        streamRef.current = null
      }
      return
    }

    streamRef.current = createLogStream({
      rate: streamRate,
      errorRate: 0.1,
      jsonRate: 0.2,
      stackTraceRate: 0.05,
      ansiRate: 0.3,
      onLog: (log) => {
        pendingLogsRef.current.push(log)
        lpsCounterRef.current.count++
      },
    })

    streamRef.current.start()

    const processLogs = () => {
      if (pendingLogsRef.current.length > 0) {
        const newLogs = pendingLogsRef.current
        pendingLogsRef.current = []

        setTotalReceived((prev) => prev + newLogs.length)

        let currentCount = bufferRef.current.getTotalPushed()
        for (const log of newLogs) {
          log.id = currentCount++
          bufferRef.current.push(log)
        }

        setLogs(bufferRef.current.toArray())
      }

      const now = Date.now()
      if (now - lpsCounterRef.current.lastTime >= 1000) {
        setLogsPerSecond(lpsCounterRef.current.count)
        lpsCounterRef.current.count = 0
        lpsCounterRef.current.lastTime = now
      }

      rafRef.current = requestAnimationFrame(processLogs)
    }

    rafRef.current = requestAnimationFrame(processLogs)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (streamRef.current) {
        streamRef.current.stop()
      }
    }
  }, [isStreaming, streamRate])

  useEffect(() => {
    if (!followLatest || !viewportRef.current) return

    const scrollToBottom = () => {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight
    }

    scrollToBottom()
  }, [displayedLogs.length, followLatest])

  const handleToggleFold = useCallback((index) => {
    setFoldedLines((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const handleStartStreaming = useCallback(() => {
    setIsStreaming(true)
  }, [])

  const handleStopStreaming = useCallback(() => {
    setIsStreaming(false)
    setLogsPerSecond(0)
  }, [])

  const handleClearLogs = useCallback(() => {
    bufferRef.current.clear()
    setLogs([])
    setTotalReceived(0)
    setLogsPerSecond(0)
    setSamplingResult(null)
    setSearchMatches([])
    setFoldedLines(new Set())
    setSelectedLine(null)
  }, [])

  const handleApplySampling = useCallback(() => {
    const result = samplingPolicy(filteredLogs, {
      strategy: samplingStrategy,
      sampleSize,
      headKeepCount: 100,
      errorContextLines: 5,
    })
    setSamplingResult(result)
  }, [filteredLogs, samplingStrategy, sampleSize])

  const handleClearSampling = useCallback(() => {
    setSamplingResult(null)
  }, [])

  const handleExportLogs = useCallback(() => {
    const exportData = displayedLogs.map((log, idx) => {
      return `[${idx + 1}] ${formatTimestamp(log.timestamp || Date.now())} [${log.level?.toUpperCase() || 'INFO'}] [${log.module || 'app'}] ${stripAnsi(log.message || log.text || '')}`
    }).join('\n')

    const blob = new Blob([exportData], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [displayedLogs])

  const handlePresetErrorStorm = useCallback(() => {
    const stream = createLogStream({
      rate: 500,
      errorRate: 0.8,
      jsonRate: 0.1,
      stackTraceRate: 0.3,
      ansiRate: 0.5,
    })
    const batch = stream.generateBatch(200)
    const currentCount = bufferRef.current.getTotalPushed()
    for (let i = 0; i < batch.length; i++) {
      batch[i].id = currentCount + i
      bufferRef.current.push(batch[i])
    }
    setLogs(bufferRef.current.toArray())
    setTotalReceived((prev) => prev + batch.length)
  }, [])

  const handlePresetJsonStream = useCallback(() => {
    const stream = createLogStream({
      rate: 300,
      errorRate: 0.05,
      jsonRate: 0.9,
      stackTraceRate: 0.02,
      ansiRate: 0.2,
    })
    const batch = stream.generateBatch(150)
    const currentCount = bufferRef.current.getTotalPushed()
    for (let i = 0; i < batch.length; i++) {
      batch[i].id = currentCount + i
      bufferRef.current.push(batch[i])
    }
    setLogs(bufferRef.current.toArray())
    setTotalReceived((prev) => prev + batch.length)
  }, [])

  const handleScroll = useCallback(() => {
    if (!viewportRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50

    if (!isAtBottom && followLatest) {
      setFollowLatest(false)
    } else if (isAtBottom && !followLatest) {
      setFollowLatest(true)
    }
  }, [followLatest])

  const handleJumpToLatest = useCallback(() => {
    setFollowLatest(true)
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight
    }
  }, [])

  return (
    <div className="high-throughput-log-stream">
      <div className="log-header">
        <div className="header-top">
          <div className="header-title">高吞吐量日志流面板</div>
          <div className="header-stats">
            <div className="stat-item">
              <span>总计:</span>
              <span className="stat-value">{totalReceived}</span>
            </div>
            <div className="stat-item">
              <span>显示:</span>
              <span className="stat-value">{displayedLogs.length}</span>
            </div>
            <div className="stat-item">
              <span>速率:</span>
              <span className="stat-value">{logsPerSecond}/s</span>
            </div>
            {searchQuery && (
              <div className="stat-item">
                <span>匹配:</span>
                <span className="stat-value">{searchMatches.length}</span>
              </div>
            )}
          </div>
        </div>

        <div className="header-controls">
          <div className="preset-buttons">
            <button className="preset-btn" onClick={handlePresetErrorStorm}>生成错误风暴</button>
            <button className="preset-btn" onClick={handlePresetJsonStream}>生成JSON交错流</button>
          </div>

          <div className="control-group">
            <button className={isStreaming ? 'danger' : 'primary'} onClick={isStreaming ? handleStopStreaming : handleStartStreaming}>
              {isStreaming ? '停止流' : '开始流'}
            </button>
            <button onClick={handleClearLogs}>清空</button>
            <button onClick={handleExportLogs}>导出</button>
          </div>

          <div className="control-group">
            <label className="control-label">速率:</label>
            <input
              type="number"
              value={streamRate}
              onChange={(e) => setStreamRate(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
              disabled={isStreaming}
              style={{ width: 60 }}
            />
          </div>

          <div className="control-group">
            <label className="control-label">级别:</label>
            <select value={minLevel} onChange={(e) => setMinLevel(e.target.value)}>
              {Object.values(LOG_LEVELS).map((level) => (
                <option key={level} value={level}>{level.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">采样:</label>
            <select value={samplingStrategy} onChange={(e) => setSamplingStrategy(e.target.value)}>
              <option value={SAMPLING_STRATEGIES.UNIFORM}>均匀采样</option>
              <option value={SAMPLING_STRATEGIES.HEAD_ONLY}>头部保留</option>
              <option value={SAMPLING_STRATEGIES.SMART_ERROR}>智能错误保留</option>
            </select>
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Math.max(100, parseInt(e.target.value) || 1000))}
              style={{ width: 60 }}
            />
            <button onClick={handleApplySampling}>应用</button>
          </div>

          <div className="control-group">
            <input
              type="text"
              className="search-box"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={searchCaseSensitive} onChange={(e) => setSearchCaseSensitive(e.target.checked)} />
              <span className="control-label">大小写</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} />
              <span className="control-label">正则</span>
            </label>
          </div>

          <div className="control-group">
            <input
              type="text"
              placeholder="包含..."
              value={includeFilter}
              onChange={(e) => setIncludeFilter(e.target.value)}
              style={{ width: 100 }}
            />
            <input
              type="text"
              placeholder="排除..."
              value={excludeFilter}
              onChange={(e) => setExcludeFilter(e.target.value)}
              style={{ width: 100 }}
            />
          </div>
        </div>
      </div>

      {samplingResult && samplingResult.infoLossRate > 0 && (
        <div className="info-loss-banner">
          <span>⚠️</span>
          <span className="sampling-info">
            采样模式: {samplingResult.strategy} | 信息丢失率: {(samplingResult.infoLossRate * 100).toFixed(1)}% |
            显示 {samplingResult.sampledCount} / {samplingResult.totalLines} 行
          </span>
          <button className="clear-sampling" onClick={handleClearSampling}>清除采样</button>
        </div>
      )}

      <div className="log-content">
        <div className="log-viewport" ref={viewportRef} onScroll={handleScroll}>
          {displayedLogs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-text">暂无日志，点击「开始流」按钮开始生成</div>
            </div>
          ) : (
            <div className="log-lines">
              {displayedLogs.map((log, index) => (
                <LogLine
                  key={index}
                  log={log}
                  index={index}
                  searchMatches={searchMatches}
                  isSelected={selectedLine === index}
                  isFolded={foldedLines.has(index)}
                  onToggleFold={handleToggleFold}
                  onClick={setSelectedLine}
                />
              ))}
            </div>
          )}
        </div>

        {!followLatest && displayedLogs.length > 0 && (
          <div className="follow-indicator">
            <span>⏸️ 已暂停跟随</span>
            <button className="pause-button" onClick={handleJumpToLatest}>跳转到最新</button>
          </div>
        )}
      </div>

      <div className="log-footer">
        <div className="stream-status">
          <span className={`status-dot ${isStreaming ? 'active' : ''}`}></span>
          <span>{isStreaming ? '流式传输中' : '已停止'}</span>
        </div>
        <div className="footer-actions">
          <span>缓冲区大小: {bufferCapacity.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
