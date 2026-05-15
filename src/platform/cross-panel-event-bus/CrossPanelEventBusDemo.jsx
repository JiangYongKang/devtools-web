import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPanelBus, v } from './logic/index.js'
import './CrossPanelEventBusDemo.css'

function simpleMarkdownToHtml(text) {
  if (!text) return ''
  
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
  
  html = html.split('\n').map(line => {
    if (line.trim() === '') return '<br>'
    if (line.startsWith('> ')) return `<blockquote>${line.slice(2)}</blockquote>`
    if (line.startsWith('- ') || line.startsWith('* ')) return `<li>${line.slice(2)}</li>`
    if (/^\d+\. /.test(line)) return `<li>${line.replace(/^\d+\. /, '')}</li>`
    if (!line.startsWith('<')) return `<p>${line}</p>`
    return line
  }).join('\n')
  
  return html
}

function calculateStats(text) {
  if (!text) {
    return {
      characters: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
    }
  }
  
  const characters = text.length
  const words = text.split(/\s+/).filter(Boolean).length
  const lines = text.split('\n').length
  const paragraphs = text.split(/\n\n+/).filter(Boolean).length
  
  return { characters, words, lines, paragraphs }
}

const DEFAULT_MARKDOWN = `# 跨面板事件总线演示

这是一个 **轻量级** 事件总线系统，支持:

- 命名空间隔离（如 editor:*、preview:*）
- 同步/异步 emit 模式
- 合并窗口去抖
- 错误捕获与故障订阅者标记

## 使用说明

1. 在左侧面板编辑 Markdown
2. 中间面板实时预览
3. 右侧面板显示统计信息
4. 可以断开中间面板验证其余面板仍同步

> 这是一个引用块示例

\`const bus = createPanelBus()\`
`

function CrossPanelEventBusDemo() {
  const busRef = useRef(null)
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
  const [highlightedPanel, setHighlightedPanel] = useState(null)
  const [previewConnected, setPreviewConnected] = useState(true)
  const [statsConnected, setStatsConnected] = useState(true)
  const [lastEvent, setLastEvent] = useState(null)
  const stats = useMemo(() => calculateStats(markdown), [markdown])
  const previewHtml = useMemo(() => simpleMarkdownToHtml(markdown), [markdown])
  
  const editorSubIdRef = useRef(null)
  const previewSubIdRef = useRef(null)
  const statsSubIdRef = useRef(null)
  
  useEffect(() => {
    const validators = {
      'editor:textChanged': v.object({
        text: v.string(),
        sourcePanel: v.string(),
      }),
    }
    
    busRef.current = createPanelBus({
      validators,
      devMode: true,
    })
    
    return () => {
      busRef.current?.dispose()
    }
  }, [])
  
  useEffect(() => {
    if (!busRef.current) return
    
    const subId = busRef.current.on('editor:textChanged', (payload) => {
      setMarkdown(payload.text)
      setLastEvent({ type: 'editor:textChanged', payload })
      
      setHighlightedPanel('editor')
      setTimeout(() => setHighlightedPanel(null), 300)
    })
    
    editorSubIdRef.current = subId
    
    return () => {
      busRef.current?.off(subId)
    }
  }, [])
  
  useEffect(() => {
    if (!busRef.current) return
    
    if (previewConnected) {
      const subId = busRef.current.on('editor:textChanged', (payload) => {
        setHighlightedPanel('preview')
        setTimeout(() => setHighlightedPanel(null), 300)
      })
      
      previewSubIdRef.current = subId
      
      return () => {
        busRef.current?.off(subId)
      }
    } else {
      if (previewSubIdRef.current) {
        busRef.current.off(previewSubIdRef.current)
        previewSubIdRef.current = null
      }
    }
  }, [previewConnected])
  
  useEffect(() => {
    if (!busRef.current) return
    
    if (statsConnected) {
      const subId = busRef.current.on('editor:textChanged', (payload) => {
        setHighlightedPanel('stats')
        setTimeout(() => setHighlightedPanel(null), 300)
      })
      
      statsSubIdRef.current = subId
      
      return () => {
        busRef.current?.off(subId)
      }
    } else {
      if (statsSubIdRef.current) {
        busRef.current.off(statsSubIdRef.current)
        statsSubIdRef.current = null
      }
    }
  }, [statsConnected])
  
  const handleEditorChange = (e) => {
    const newText = e.target.value
    setMarkdown(newText)
    
    busRef.current?.emitMerged('editor:textChanged', {
      text: newText,
      sourcePanel: 'editor',
    })
  }
  
  const exportLog = () => {
    if (!busRef.current) return
    const logJson = busRef.current.getDevLog().exportToJSON()
    const blob = new Blob([logJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'event-bus-log.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const clearLog = () => {
    busRef.current?.getDevLog().clear()
  }
  
  const resetDemo = () => {
    setMarkdown(DEFAULT_MARKDOWN)
    setPreviewConnected(true)
    setStatsConnected(true)
    busRef.current?.getDevLog().clear()
  }
  
  return (
    <div className="cross-panel-demo">
      <header className="demo-header">
        <h1>跨面板事件总线演示 - Markdown 编辑器</h1>
        {lastEvent && (
          <p className="event-status">
            最后事件: {lastEvent.type}
          </p>
        )}
      </header>
      
      <div className="panels-container">
        <article className={`panel editor-panel ${highlightedPanel === 'editor' ? 'highlighted' : ''}`}>
          <header className="panel-header">
            <h2>A - 编辑器 (Editor)</h2>
          </header>
          <div className="panel-content">
            <textarea
              value={markdown}
              onChange={handleEditorChange}
              placeholder="在此输入 Markdown..."
              aria-label="Markdown 编辑器"
            />
          </div>
        </article>
        
        <article className={`panel preview-panel ${highlightedPanel === 'preview' ? 'highlighted' : ''}`}>
          <header className="panel-header">
            <h2>B - 预览 (Preview)</h2>
          </header>
          <div className="panel-content">
            {previewConnected ? (
              <div
                className="preview-content"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="panel-disconnected">
                面板已断开连接
              </div>
            )}
          </div>
          <div className="panel-controls">
            <button
              onClick={() => setPreviewConnected(!previewConnected)}
            >
              {previewConnected ? '断开预览面板' : '连接预览面板'}
            </button>
          </div>
        </article>
        
        <article className={`panel stats-panel ${highlightedPanel === 'stats' ? 'highlighted' : ''}`}>
          <header className="panel-header">
            <h2>C - 统计 (Stats)</h2>
          </header>
          <div className="panel-content">
            {statsConnected ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats.characters}</div>
                  <div className="stat-label">字符数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.words}</div>
                  <div className="stat-label">词数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.lines}</div>
                  <div className="stat-label">行数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.paragraphs}</div>
                  <div className="stat-label">段落数</div>
                </div>
              </div>
            ) : (
              <div className="panel-disconnected">
                面板已断开连接
              </div>
            )}
          </div>
          <div className="panel-controls">
            <button
              onClick={() => setStatsConnected(!statsConnected)}
            >
              {statsConnected ? '断开统计面板' : '连接统计面板'}
            </button>
          </div>
        </article>
      </div>
      
      <div className="debug-section">
        <h3>调试工具</h3>
        <div className="debug-actions">
          <button onClick={exportLog}>导出日志 JSON</button>
          <button onClick={clearLog}>清空日志</button>
          <button onClick={resetDemo}>重置演示</button>
          <button onClick={() => alert(`当前订阅数: ${busRef.current?.getSubscriberCount() || 0}`)}>
            显示订阅数
          </button>
        </div>
      </div>
    </div>
  )
}

export default CrossPanelEventBusDemo
