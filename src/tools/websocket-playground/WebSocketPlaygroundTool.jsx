import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SOCKET_STATES,
  SOCKET_STATE_CHINESE,
  MESSAGE_DIRECTION,
  MESSAGE_TYPE,
  DEFAULT_PARAMS,
  ECHO_SERVER_EXAMPLES,
  LARGE_MESSAGE_CHUNK_SIZE,
  validateUrl,
  checkMixedContent,
  normalizeParams,
  canSendMessage,
  getSendError,
  calculateReconnectDelay,
  shouldReconnect,
  createInitialState,
  transitionState,
  getCloseCodeDescription,
  createError,
  createMessageEntry,
  createSystemMessage,
  filterMessages,
  highlightText,
  bytesToHexWithOffset,
  base64ToArrayBuffer,
  textToArrayBuffer,
  arrayBufferToText,
  blobToArrayBuffer,
  validateMessageSize,
  exportTimelineAsJson,
  downloadTimeline,
  HeartbeatManager,
} from './logic/index.js'
import './WebSocketPlaygroundTool.css'

const PREVIEW_LENGTH = 1000

export default function WebSocketPlaygroundTool() {
  const [url, setUrl] = useState(DEFAULT_PARAMS.url)
  const [protocolsStr, setProtocolsStr] = useState('')
  const [binaryType, setBinaryType] = useState(DEFAULT_PARAMS.binaryType)
  const [autoReconnect, setAutoReconnect] = useState(DEFAULT_PARAMS.autoReconnect)
  const [maxRetries, setMaxRetries] = useState(DEFAULT_PARAMS.maxRetries)
  const [reconnectDelay, setReconnectDelay] = useState(DEFAULT_PARAMS.reconnectDelay)
  const [connectionTimeout, setConnectionTimeout] = useState(DEFAULT_PARAMS.connectionTimeout)
  
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(DEFAULT_PARAMS.heartbeatEnabled)
  const [heartbeatInterval, setHeartbeatInterval] = useState(DEFAULT_PARAMS.heartbeatInterval)
  const [heartbeatMessage, setHeartbeatMessage] = useState(DEFAULT_PARAMS.heartbeatMessage)
  const [heartbeatType, setHeartbeatType] = useState(DEFAULT_PARAMS.heartbeatType)
  
  const [socketState, setSocketState] = useState(SOCKET_STATES.CLOSED)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState(null)
  const [lastCloseCode, setLastCloseCode] = useState(null)
  const [closeCodeInfo, setCloseCodeInfo] = useState(null)
  
  const [messages, setMessages] = useState([])
  const [expandedMessages, setExpandedMessages] = useState(new Set())
  const [binaryViewMode, setBinaryViewMode] = useState(new Map())
  const [filterKeyword, setFilterKeyword] = useState('')
  const [sentCount, setSentCount] = useState(0)
  const [receivedCount, setReceivedCount] = useState(0)
  
  const [sendMode, setSendMode] = useState('text')
  const [sendText, setSendText] = useState('')
  const [sendBase64, setSendBase64] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  
  const [toast, setToast] = useState(null)
  const [rttStats, setRttStats] = useState(null)
  
  const wsRef = useRef(null)
  const heartbeatRef = useRef(new HeartbeatManager())
  const timeoutRef = useRef(null)
  const reconnectRef = useRef(null)
  const stateRef = useRef(createInitialState())
  const fileRef = useRef(null)
  const timelineEndRef = useRef(null)

  const isPageSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'

  const updateState = useCallback((event, data = {}) => {
    const newState = transitionState(stateRef.current, event, data)
    stateRef.current = newState
    setSocketState(newState.socketState)
    setRetryCount(newState.retryCount)
    if (newState.lastError) setLastError(newState.lastError)
    if (newState.lastCloseCode !== null) setLastCloseCode(newState.lastCloseCode)
  }, [])

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg])
    if (msg.direction === MESSAGE_DIRECTION.SENT) {
      setSentCount((prev) => prev + 1)
    } else if (msg.direction === MESSAGE_DIRECTION.RECEIVED) {
      setReceivedCount((prev) => prev + 1)
    }
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const cleanupSocket = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null
        wsRef.current.onmessage = null
        wsRef.current.onerror = null
        wsRef.current.onclose = null
        wsRef.current.close()
      } catch {}
      wsRef.current = null
    }
    heartbeatRef.current.stop()
  }, [])

  useEffect(() => {
    return () => {
      cleanupSocket()
    }
  }, [cleanupSocket])

  const attemptReconnect = useCallback((params) => {
    if (!shouldReconnect(params, stateRef.current.retryCount, stateRef.current.wasManualClose)) {
      if (!stateRef.current.wasManualClose) {
        addMessage(createSystemMessage('已达最大重试次数，停止自动重连', 'error'))
        updateState('ERROR', { error: createError('MAX_RETRIES_EXCEEDED') })
      }
      return
    }

    const delay = calculateReconnectDelay(
      stateRef.current.retryCount,
      params.reconnectDelay,
      DEFAULT_PARAMS.reconnectDelayMax
    )
    
    addMessage(createSystemMessage(
      `${stateRef.current.retryCount + 1}/${params.maxRetries} 秒后尝试重连 (${Math.round(delay)}ms)`
    ))

    reconnectRef.current = setTimeout(() => {
      connectInternal(params)
    }, delay)
  }, [addMessage, updateState])

  const connectInternal = useCallback((params) => {
    cleanupSocket()
    updateState('CONNECT_REQUEST')
    setLastError(null)
    setCloseCodeInfo(null)
    addMessage(createSystemMessage(`正在连接到 ${params.url}...`))

    const mixedContent = checkMixedContent(params.url, isPageSecure)
    if (mixedContent.blocked) {
      updateState('CONNECT_FAILED', { error: mixedContent.error })
      setLastError(mixedContent.error)
      addMessage(createSystemMessage(`混合内容被阻止: ${mixedContent.error.message}`, 'error'))
      return
    }

    try {
      const ws = params.protocols.length > 0
        ? new WebSocket(params.url, params.protocols)
        : new WebSocket(params.url)
      
      ws.binaryType = params.binaryType
      wsRef.current = ws

      timeoutRef.current = setTimeout(() => {
        addMessage(createSystemMessage(`连接超时 (${params.connectionTimeout}ms)`, 'error'))
        updateState('ERROR', { error: createError('CONNECTION_TIMEOUT') })
        setLastError(createError('CONNECTION_TIMEOUT'))
        cleanupSocket()
        if (params.autoReconnect) {
          attemptReconnect(params)
        }
      }, params.connectionTimeout)

      ws.onopen = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        updateState('CONNECT_SUCCESS')
        addMessage(createSystemMessage('连接已建立', 'success'))
        
        if (params.heartbeatEnabled) {
          heartbeatRef.current.start(params.heartbeatInterval, (heartbeatInfo) => {
            if (!wsRef.current || wsRef.current.readyState !== SOCKET_STATES.OPEN) return
            
            let payload
            if (params.heartbeatType === 'binary') {
              const result = textToArrayBuffer(params.heartbeatMessage)
              if (result.success) {
                payload = result.data
              } else {
                return
              }
            } else {
              payload = params.heartbeatMessage
            }
            
            const msg = createMessageEntry({
              direction: MESSAGE_DIRECTION.SENT,
              type: params.heartbeatType === 'binary' ? MESSAGE_TYPE.BINARY : MESSAGE_TYPE.TEXT,
              content: payload,
              isHeartbeat: true,
              collapsed: true,
            })
            msg.heartbeatId = heartbeatInfo.id
            msg.heartbeatSentAt = heartbeatInfo.sentAt
            
            addMessage(msg)
            wsRef.current.send(payload)
          })
          setRttStats(heartbeatRef.current.getStats())
          addMessage(createSystemMessage('心跳已启动'))
        }
      }

      ws.onmessage = async (event) => {
        const data = event.data
        let type = typeof data === 'string' ? MESSAGE_TYPE.TEXT : MESSAGE_TYPE.BINARY
        let content = data
        let size = 0

        if (data instanceof Blob) {
          const result = await blobToArrayBuffer(data)
          if (result.success) {
            content = result.data
            size = result.data.byteLength
          }
        } else if (data instanceof ArrayBuffer) {
          size = data.byteLength
        } else if (typeof data === 'string') {
          const encoder = new TextEncoder()
          size = encoder.encode(data).length
        }

        const msg = createMessageEntry({
          direction: MESSAGE_DIRECTION.RECEIVED,
          type,
          content,
          size,
          collapsed: size > PREVIEW_LENGTH,
        })

        if (type === MESSAGE_TYPE.TEXT && typeof content === 'string') {
          try {
            const parsed = JSON.parse(content)
            if (parsed && parsed.heartbeatId) {
              const rtt = heartbeatRef.current.onPong(parsed.heartbeatId)
              if (rtt !== null) {
                msg.rtt = rtt
                msg.isHeartbeat = true
                setRttStats(heartbeatRef.current.getStats())
              }
            }
          } catch {}
        }

        addMessage(msg)
      }

      ws.onerror = () => {
        const error = createError('CONNECT_FAILED')
        updateState('ERROR', { error })
        setLastError(error)
        addMessage(createSystemMessage('WebSocket 错误', 'error'))
      }

      ws.onclose = (event) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        heartbeatRef.current.stop()
        setRttStats(null)

        const closeInfo = getCloseCodeDescription(event.code)
        setCloseCodeInfo({ code: event.code, reason: event.reason, ...closeInfo })

        const shouldRetryAfter = !stateRef.current.wasManualClose && event.code !== 1000
        updateState('CLOSE_RECEIVED', { 
          code: event.code, 
          shouldRetry: shouldRetryAfter 
        })

        addMessage(createSystemMessage(
          `连接关闭: ${event.code} (${closeInfo.name})${event.reason ? ` - ${event.reason}` : ''}`,
          event.code === 1000 ? 'success' : 'error'
        ))

        cleanupSocket()

        if (shouldRetryAfter && autoReconnect) {
          attemptReconnect(normalizeParams({
            url,
            protocols: protocolsStr ? protocolsStr.split(',').map(p => p.trim()).filter(Boolean) : [],
            binaryType,
            autoReconnect,
            maxRetries,
            reconnectDelay,
            connectionTimeout,
            heartbeatEnabled,
            heartbeatInterval,
            heartbeatMessage,
            heartbeatType,
          }))
        }
      }
    } catch (e) {
      const error = createError('CONNECT_FAILED', { reason: e?.message })
      updateState('CONNECT_FAILED', { error })
      setLastError(error)
      addMessage(createSystemMessage(`创建连接失败: ${e?.message || '未知错误'}`, 'error'))
    }
  }, [addMessage, updateState, cleanupSocket, attemptReconnect, isPageSecure, url, protocolsStr, binaryType, autoReconnect, maxRetries, reconnectDelay, connectionTimeout, heartbeatEnabled, heartbeatInterval, heartbeatMessage, heartbeatType])

  const handleConnect = useCallback(() => {
    const validation = validateUrl(url)
    if (!validation.valid) {
      setLastError(validation.error)
      addMessage(createSystemMessage(`URL 验证失败: ${validation.error.message}`, 'error'))
      return
    }

    const params = normalizeParams({
      url,
      protocols: protocolsStr ? protocolsStr.split(',').map(p => p.trim()).filter(Boolean) : [],
      binaryType,
      autoReconnect,
      maxRetries,
      reconnectDelay,
      connectionTimeout,
      heartbeatEnabled,
      heartbeatInterval,
      heartbeatMessage,
      heartbeatType,
    })

    connectInternal(params)
  }, [url, protocolsStr, binaryType, autoReconnect, maxRetries, reconnectDelay, connectionTimeout, heartbeatEnabled, heartbeatInterval, heartbeatMessage, heartbeatType, connectInternal, addMessage])

  const handleDisconnect = useCallback(() => {
    updateState('MANUAL_DISCONNECT')
    addMessage(createSystemMessage('用户主动断开连接'))
    cleanupSocket()
    setSocketState(SOCKET_STATES.CLOSED)
  }, [updateState, cleanupSocket, addMessage])

  const handleSend = useCallback(async () => {
    const sendError = getSendError(socketState)
    if (sendError) {
      setLastError(sendError)
      addMessage(createSystemMessage(sendError.message, 'error'))
      return
    }

    let payload = null
    let type = MESSAGE_TYPE.TEXT
    let size = 0

    try {
      if (sendMode === 'text') {
        if (!sendText || sendText.trim() === '') {
          const err = createError('EMPTY_MESSAGE')
          setLastError(err)
          addMessage(createSystemMessage(err.message, 'error'))
          return
        }
        payload = sendText
        const encoder = new TextEncoder()
        size = encoder.encode(payload).length
        type = MESSAGE_TYPE.TEXT
      } else if (sendMode === 'base64') {
        if (!sendBase64 || sendBase64.trim() === '') {
          const err = createError('EMPTY_MESSAGE')
          setLastError(err)
          addMessage(createSystemMessage(err.message, 'error'))
          return
        }
        const result = base64ToArrayBuffer(sendBase64.trim())
        if (!result.success) {
          setLastError(result.error)
          addMessage(createSystemMessage(`Base64 解码失败: ${result.error.message}`, 'error'))
          return
        }
        payload = result.data
        size = result.data.byteLength
        type = MESSAGE_TYPE.BINARY
      } else if (sendMode === 'file') {
        const file = fileRef.current?.files?.[0]
        if (!file) {
          const err = createError('EMPTY_MESSAGE')
          setLastError(err)
          addMessage(createSystemMessage('请选择要发送的文件', 'error'))
          return
        }
        const result = await blobToArrayBuffer(file)
        if (!result.success) {
          setLastError(result.error)
          addMessage(createSystemMessage(`文件读取失败: ${result.error.message}`, 'error'))
          return
        }
        payload = result.data
        size = result.data.byteLength
        type = MESSAGE_TYPE.BINARY
      }
    } catch (e) {
      const err = createError('SEND_FAILED', { reason: e?.message })
      setLastError(err)
      addMessage(createSystemMessage(`准备发送失败: ${e?.message || '未知错误'}`, 'error'))
      return
    }

    const sizeValidation = validateMessageSize(payload)
    if (!sizeValidation.valid) {
      addMessage(createSystemMessage(
        `消息过大 (${(sizeValidation.size / 1024 / 1024).toFixed(2)}MB), 最大限制为 ${(sizeValidation.limit / 1024 / 1024).toFixed(0)}MB`,
        'error'
      ))
      return
    }

    try {
      if (size > LARGE_MESSAGE_CHUNK_SIZE * 2) {
        addMessage(createSystemMessage(`发送大消息 (${(size / 1024).toFixed(1)}KB)...`))
      }
      
      wsRef.current.send(payload)
      
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.SENT,
        type,
        content: payload,
        size,
        collapsed: size > PREVIEW_LENGTH,
      })
      addMessage(msg)
      
      if (sendMode === 'text') {
        setSendText('')
      } else if (sendMode === 'base64') {
        setSendBase64('')
      } else if (sendMode === 'file') {
        setFileInputKey(prev => prev + 1)
      }
    } catch (e) {
      const err = createError('SEND_FAILED', { reason: e?.message })
      setLastError(err)
      addMessage(createSystemMessage(`发送失败: ${e?.message || '未知错误'}`, 'error'))
    }
  }, [socketState, sendMode, sendText, sendBase64, addMessage])

  const handleClearTimeline = useCallback(() => {
    setMessages([])
    setSentCount(0)
    setReceivedCount(0)
    setExpandedMessages(new Set())
    heartbeatRef.current.clearHistory()
    setRttStats(null)
    showToast('时间线已清空')
  }, [showToast])

  const handleExport = useCallback(() => {
    if (messages.length === 0) {
      showToast('没有消息可导出', 'error')
      return
    }
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      downloadTimeline(messages, `websocket-messages-${timestamp}.json`)
      showToast(`已导出 ${messages.length} 条消息`)
    } catch (e) {
      showToast(`导出失败: ${e?.message || '未知错误'}`, 'error')
    }
  }, [messages, showToast])

  const toggleMessageExpand = useCallback((id) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleBinaryView = useCallback((id) => {
    setBinaryViewMode((prev) => {
      const next = new Map(prev)
      next.set(id, next.get(id) === 'hex' ? 'text' : 'hex')
      return next
    })
  }, [])

  const filteredMessages = filterMessages(messages, filterKeyword)

  const renderMessageContent = (msg) => {
    const isExpanded = expandedMessages.has(msg.id)
    const viewMode = binaryViewMode.get(msg.id) || 'hex'
    
    if (msg.direction === MESSAGE_DIRECTION.SYSTEM) {
      return (
        <div className={`system-info ${msg.systemType}`}>
          <span dangerouslySetInnerHTML={{ 
            __html: highlightText(String(msg.content), filterKeyword) 
          }} />
        </div>
      )
    }

    const isBinary = msg.type === MESSAGE_TYPE.BINARY
    const shouldTruncate = msg.size > PREVIEW_LENGTH && !isExpanded

    if (isBinary) {
      if (viewMode === 'hex') {
        const hexData = bytesToHexWithOffset(msg.content)
        const displayLines = shouldTruncate ? hexData.lines.slice(0, 5) : hexData.lines
        
        return (
          <div>
            <div className={`message-content binary ${shouldTruncate ? 'collapsed' : ''}`}>
              <div className="hex-view">
                {displayLines.map((line, idx) => (
                  <div key={idx} className="hex-line">
                    <span className="hex-offset">{line.offset}</span>
                    <span className="hex-bytes">{line.hex}</span>
                    <span className="hex-ascii">{line.ascii}</span>
                  </div>
                ))}
              </div>
            </div>
            {shouldTruncate && (
              <span className="input-hint">点击消息头展开查看完整内容 ({hexData.total} 字节)</span>
            )}
            <button 
              className="hex-toggle" 
              onClick={(e) => { e.stopPropagation(); toggleBinaryView(msg.id) }}
            >
              切换为文本视图
            </button>
          </div>
        )
      } else {
        const textResult = arrayBufferToText(msg.content)
        const displayText = textResult.success 
          ? (shouldTruncate ? textResult.data.slice(0, PREVIEW_LENGTH) : textResult.data)
          : `[无法解码为文本 - 总 ${msg.size} 字节]`
        
        return (
          <div>
            <div className={`message-content ${shouldTruncate ? 'collapsed' : ''}`}>
              <span dangerouslySetInnerHTML={{ 
                __html: highlightText(displayText, filterKeyword) 
              }} />
            </div>
            {shouldTruncate && (
              <span className="input-hint">点击消息头展开查看完整内容</span>
            )}
            <button 
              className="hex-toggle" 
              onClick={(e) => { e.stopPropagation(); toggleBinaryView(msg.id) }}
            >
              切换为十六进制视图
            </button>
          </div>
        )
      }
    }

    const textContent = String(msg.content)
    const displayContent = shouldTruncate ? textContent.slice(0, PREVIEW_LENGTH) : textContent

    return (
      <div>
        <div className={`message-content ${shouldTruncate ? 'collapsed' : ''}`}>
          <pre dangerouslySetInnerHTML={{ 
            __html: highlightText(displayContent, filterKeyword) 
          }} />
        </div>
        {shouldTruncate && (
          <span className="input-hint">
            已截断显示 (预览 {PREVIEW_LENGTH} 字符，共 {textContent.length} 字符)，点击展开查看完整内容
          </span>
        )}
      </div>
    )
  }

  const getStatusClass = () => {
    switch (socketState) {
      case SOCKET_STATES.CONNECTING: return 'status-connecting'
      case SOCKET_STATES.OPEN: return 'status-open'
      case SOCKET_STATES.CLOSING: return 'status-closing'
      case SOCKET_STATES.CLOSED: return 'status-closed'
      default: return 'status-closed'
    }
  }

  return (
    <div className="websocket-tool">
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <section className="ws-panel">
        <div className="ws-panel-header">
          <h3>连接设置</h3>
          <span className={`status-badge ${getStatusClass()}`}>
            {SOCKET_STATE_CHINESE[socketState]}
          </span>
        </div>

        <div className="form-group full-width">
          <label htmlFor="ws-url">WebSocket URL</label>
          <input
            id="ws-url"
            type="text"
            className={`form-input ${lastError?.code === 'NULL_URL' || lastError?.code === 'INVALID_URL' || lastError?.code === 'INVALID_PROTOCOL' ? 'error' : ''}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="wss://echo.websocket.org"
            spellCheck={false}
            autoComplete="off"
            disabled={socketState !== SOCKET_STATES.CLOSED}
          />
          <div className="input-hint">
            支持 ws:// 或 wss:// 协议。注意：https 页面只能连接 wss://
          </div>
          {isPageSecure && url.startsWith('ws://') && (
            <div className="danger-hint">
              <strong>警告：</strong>当前页面为 https，浏览器会阻止 ws:// 连接。请使用 wss:// 协议。
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ws-protocols">子协议 (逗号分隔)</label>
            <input
              id="ws-protocols"
              type="text"
              className="form-input"
              value={protocolsStr}
              onChange={(e) => setProtocolsStr(e.target.value)}
              placeholder="chat, binary"
              disabled={socketState !== SOCKET_STATES.CLOSED}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ws-binary-type">binaryType</label>
            <select
              id="ws-binary-type"
              className="form-select"
              value={binaryType}
              onChange={(e) => setBinaryType(e.target.value)}
              disabled={socketState !== SOCKET_STATES.CLOSED}
            >
              <option value="blob">Blob</option>
              <option value="arraybuffer">ArrayBuffer</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>示例服务</label>
          <div className="example-buttons">
            {ECHO_SERVER_EXAMPLES.map((example) => (
              <button
                key={example.url}
                type="button"
                className={`example-btn ${url === example.url ? 'active' : ''}`}
                onClick={() => setUrl(example.url)}
                title={example.description}
                disabled={socketState !== SOCKET_STATES.CLOSED}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section-divider" />

        <div className="form-row">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                disabled={socketState !== SOCKET_STATES.CLOSED}
              />
              自动重连
            </label>
          </div>
          <div className="form-group">
            <label htmlFor="max-retries">最大重试次数</label>
            <input
              id="max-retries"
              type="number"
              className="form-number"
              value={maxRetries}
              onChange={(e) => setMaxRetries(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              max="100"
              disabled={socketState !== SOCKET_STATES.CLOSED || !autoReconnect}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reconnect-delay">初始重连延迟 (ms)</label>
            <input
              id="reconnect-delay"
              type="number"
              className="form-number"
              value={reconnectDelay}
              onChange={(e) => setReconnectDelay(Math.max(100, parseInt(e.target.value) || 1000))}
              min="100"
              step="100"
              disabled={socketState !== SOCKET_STATES.CLOSED || !autoReconnect}
            />
          </div>
          <div className="form-group">
            <label htmlFor="conn-timeout">连接超时 (ms)</label>
            <input
              id="conn-timeout"
              type="number"
              className="form-number"
              value={connectionTimeout}
              onChange={(e) => setConnectionTimeout(Math.max(1000, parseInt(e.target.value) || 10000))}
              min="1000"
              step="1000"
              disabled={socketState !== SOCKET_STATES.CLOSED}
            />
          </div>
        </div>

        {retryCount > 0 && (
          <div className="input-hint" style={{ marginTop: '0.5rem' }}>
            已重试 {retryCount} 次
          </div>
        )}

        <div className="action-row">
          {socketState === SOCKET_STATES.CLOSED ? (
            <button
              className="primary-btn"
              onClick={handleConnect}
            >
              连接
            </button>
          ) : (
            <button
              className="danger-btn"
              onClick={handleDisconnect}
              disabled={socketState === SOCKET_STATES.CLOSING}
            >
              {socketState === SOCKET_STATES.CLOSING ? '断开中...' : '断开连接'}
            </button>
          )}
        </div>

        {lastError && (
          <div className="error-box">
            <div className="error-header">
              <span className="error-label">错误码</span>
              <code>{lastError.code}</code>
            </div>
            <p>{lastError.message}</p>
            {lastError.suggestion && (
              <p className="error-suggestion">
                <strong>建议：</strong>{lastError.suggestion}
              </p>
            )}
          </div>
        )}

        {closeCodeInfo && (
          <div className="close-code-info">
            <h4>关闭码信息</h4>
            <p><code>{closeCodeInfo.code}</code> - <strong>{closeCodeInfo.name}</strong></p>
            <p>{closeCodeInfo.meaning}</p>
            {closeCodeInfo.reason && <p><strong>原因：</strong>{closeCodeInfo.reason}</p>}
            <p className="suggestion">{closeCodeInfo.suggestion}</p>
          </div>
        )}
      </section>

      <section className="ws-panel">
        <div className="ws-panel-header">
          <h3>心跳设置</h3>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={heartbeatEnabled}
              onChange={(e) => setHeartbeatEnabled(e.target.checked)}
              disabled={socketState !== SOCKET_STATES.CLOSED}
            />
            启用心跳 (应用层，服务器需响应)
          </label>
          <div className="input-hint">
            心跳消息格式: {'{"heartbeatId": <timestamp>, "data": "<your message>"}'}。服务器需原样返回以计算 RTT。
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="heartbeat-interval">心跳间隔 (ms)</label>
            <input
              id="heartbeat-interval"
              type="number"
              className="form-number"
              value={heartbeatInterval}
              onChange={(e) => setHeartbeatInterval(Math.max(1000, parseInt(e.target.value) || 30000))}
              min="1000"
              step="1000"
              disabled={socketState !== SOCKET_STATES.CLOSED || !heartbeatEnabled}
            />
          </div>
          <div className="form-group">
            <label htmlFor="heartbeat-type">心跳类型</label>
            <select
              id="heartbeat-type"
              className="form-select"
              value={heartbeatType}
              onChange={(e) => setHeartbeatType(e.target.value)}
              disabled={socketState !== SOCKET_STATES.CLOSED || !heartbeatEnabled}
            >
              <option value="text">文本</option>
              <option value="binary">二进制</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="heartbeat-msg">心跳消息内容</label>
          <input
            id="heartbeat-msg"
            type="text"
            className="form-input"
            value={heartbeatMessage}
            onChange={(e) => setHeartbeatMessage(e.target.value)}
            placeholder="ping"
            disabled={socketState !== SOCKET_STATES.CLOSED || !heartbeatEnabled}
          />
        </div>

        {rttStats && (
          <div className="rtt-stats" style={{ marginTop: '1rem' }}>
            <div className="rtt-stat">
              <span className="rtt-label">最新 RTT</span>
              <span className="rtt-value">{rttStats.latestRtt ?? '--'} ms</span>
            </div>
            <div className="rtt-stat">
              <span className="rtt-label">平均 RTT</span>
              <span className="rtt-value">{rttStats.averageRtt ?? '--'} ms</span>
            </div>
            <div className="rtt-stat">
              <span className="rtt-label">最小 RTT</span>
              <span className="rtt-value">{rttStats.minRtt ?? '--'} ms</span>
            </div>
            <div className="rtt-stat">
              <span className="rtt-label">最大 RTT</span>
              <span className="rtt-value">{rttStats.maxRtt ?? '--'} ms</span>
            </div>
            <div className="rtt-stat">
              <span className="rtt-label">采样数</span>
              <span className="rtt-value">{rttStats.sampleCount}</span>
            </div>
          </div>
        )}
      </section>

      <section className="ws-panel">
        <div className="ws-panel-header">
          <h3>发送消息</h3>
          <span className="input-hint">
            二进制支持: Base64 字符串 或 File 上传
          </span>
        </div>

        <div className="send-mode-tabs">
          <button
            className={`send-mode-tab ${sendMode === 'text' ? 'active' : ''}`}
            onClick={() => setSendMode('text')}
          >
            文本
          </button>
          <button
            className={`send-mode-tab ${sendMode === 'base64' ? 'active' : ''}`}
            onClick={() => setSendMode('base64')}
          >
            Base64
          </button>
          <button
            className={`send-mode-tab ${sendMode === 'file' ? 'active' : ''}`}
            onClick={() => setSendMode('file')}
          >
            文件
          </button>
        </div>

        {sendMode === 'text' && (
          <div className="form-group">
            <textarea
              className="form-textarea"
              value={sendText}
              onChange={(e) => setSendText(e.target.value)}
              placeholder="输入要发送的文本消息..."
              disabled={!canSendMessage(socketState)}
            />
            <div className="input-hint">
              可以发送 JSON、纯文本等
            </div>
          </div>
        )}

        {sendMode === 'base64' && (
          <div className="form-group">
            <textarea
              className="form-textarea"
              value={sendBase64}
              onChange={(e) => setSendBase64(e.target.value)}
              placeholder="输入 Base64 编码的二进制数据..."
              disabled={!canSendMessage(socketState)}
            />
            <div className="input-hint">
              例如: SGVsbG8gV29ybGQ= 解码后为 "Hello World"
            </div>
          </div>
        )}

        {sendMode === 'file' && (
          <div className="form-group">
            <input
              key={fileInputKey}
              ref={fileRef}
              type="file"
              disabled={!canSendMessage(socketState)}
            />
            <div className="input-hint">
              选择文件后将以二进制形式发送
            </div>
          </div>
        )}

        <div className="action-row">
          <button
            className="primary-btn"
            onClick={handleSend}
            disabled={!canSendMessage(socketState)}
          >
            发送
          </button>
        </div>
      </section>

      <section className="ws-panel">
        <div className="ws-panel-header">
          <h3>消息时间线</h3>
          <div className="input-hint">
            总计: {messages.length} 条 | 发送: {sentCount} | 接收: {receivedCount}
          </div>
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">总消息</span>
            <span className="stat-value">{messages.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已发送</span>
            <span className="stat-value">{sentCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">已接收</span>
            <span className="stat-value">{receivedCount}</span>
          </div>
          {filterKeyword && (
            <div className="stat-item">
              <span className="stat-label">过滤后</span>
              <span className="stat-value">{filteredMessages.length}</span>
            </div>
          )}
        </div>

        <div className="filter-row">
          <input
            type="text"
            className="form-input"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="过滤消息 (文本内容)"
          />
          <button
            className="secondary-btn"
            onClick={handleClearTimeline}
            disabled={messages.length === 0}
          >
            清空
          </button>
          <button
            className="secondary-btn"
            onClick={handleExport}
            disabled={messages.length === 0}
          >
            导出 JSON
          </button>
        </div>

        <div className="timeline-container">
          {filteredMessages.length === 0 ? (
            <div className="timeline-empty">
              {messages.length === 0 ? '暂无消息' : '没有匹配的消息'}
            </div>
          ) : (
            <div>
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-item ${msg.direction}`}
                >
                  <div
                    className="message-header"
                    onClick={() => toggleMessageExpand(msg.id)}
                  >
                    <div className="message-meta">
                      <span className={`collapse-indicator ${expandedMessages.has(msg.id) ? 'expanded' : ''}`}>
                        ▶
                      </span>
                      <span className={`message-direction ${msg.direction}`}>
                        {msg.direction === MESSAGE_DIRECTION.SENT ? '发送' : 
                         msg.direction === MESSAGE_DIRECTION.RECEIVED ? '接收' : '系统'}
                      </span>
                      {msg.direction !== MESSAGE_DIRECTION.SYSTEM && (
                        <>
                          <span className="message-type">
                            {msg.type === MESSAGE_TYPE.TEXT ? 'TEXT' : 'BINARY'}
                          </span>
                          <span className="message-size">
                            {msg.size} bytes
                          </span>
                        </>
                      )}
                      {msg.isHeartbeat && (
                        <span className="message-type">💓 心跳</span>
                      )}
                      {msg.rtt !== null && (
                        <span className="message-rtt">RTT: {msg.rtt}ms</span>
                      )}
                    </div>
                    <span className="message-time">{msg.formattedTime}</span>
                  </div>
                  {renderMessageContent(msg)}
                </div>
              ))}
              <div ref={timelineEndRef} />
            </div>
          )}
        </div>
      </section>

      <section className="notes-section">
        <h3>使用说明</h3>
        <ul>
          <li>
            <strong>连接设置：</strong>URL 必须以 <code>ws://</code> 或 <code>wss://</code> 开头。
            在 https 页面上，浏览器会阻止 <code>ws://</code> 连接（混合内容策略）。
          </li>
          <li>
            <strong>自动重连：</strong>连接异常断开时，使用指数退避策略重试，最大延迟 30 秒。
            手动断开或到达最大重试次数后停止。
          </li>
          <li>
            <strong>心跳功能：</strong>这是应用层心跳，需要服务器原样返回包含 <code>heartbeatId</code> 的消息以计算 RTT。
            对于标准 WebSocket ping/pong，浏览器 API 不支持自定义。
          </li>
          <li>
            <strong>二进制消息：</strong>支持 Base64 编码字符串或文件上传。
            接收的二进制消息可在十六进制视图和文本视图间切换。
          </li>
          <li>
            <strong>安全展示：</strong>所有文本内容均经过 HTML 转义，
            不会执行任何脚本。大消息默认折叠显示。
          </li>
          <li>
            <strong>页面卸载：</strong>页面关闭或用户主动断开时，
            会自动关闭 socket 和清理定时器。
          </li>
        </ul>
        <h3>常见问题</h3>
        <ul>
          <li>
            <strong>1006 异常关闭：</strong>通常是网络中断、防火墙拦截或混合内容被阻止。
            检查 URL 协议和网络连接。
          </li>
          <li>
            <strong>混合内容被阻止：</strong>https 页面无法连接 ws:// URL。
            请使用 wss:// 或在 http 页面上测试。
          </li>
          <li>
            <strong>握手失败：</strong>服务器可能未正确响应 WebSocket 握手，
            或 SSL 证书无效（wss）。
          </li>
        </ul>
      </section>
    </div>
  )
}
