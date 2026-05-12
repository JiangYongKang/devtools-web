import { MESSAGE_DIRECTION, MESSAGE_TYPE, MAX_MESSAGE_SIZE } from './constants.js'
import { ERROR_CODES } from './constants.js'
import { createError } from './errors.js'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`
}

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function bytesToHex(bytes) {
  if (!bytes) return ''
  const arr = new Uint8Array(bytes)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
}

function bytesToHexWithOffset(bytes, bytesPerLine = 16) {
  if (!bytes) return { lines: [], total: 0 }
  const arr = new Uint8Array(bytes)
  const lines = []
  const total = arr.length
  
  for (let i = 0; i < arr.length; i += bytesPerLine) {
    const chunk = arr.slice(i, i + bytesPerLine)
    const hex = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
    
    const ascii = Array.from(chunk)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
      .join('')
    
    const offset = i.toString(16).padStart(8, '0')
    
    lines.push({
      offset,
      hex,
      ascii,
      start: i,
      end: Math.min(i + bytesPerLine, arr.length),
    })
  }
  
  return { lines, total }
}

function base64ToArrayBuffer(base64) {
  try {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return { success: true, data: bytes.buffer }
  } catch {
    return {
      success: false,
      error: createError(ERROR_CODES.ENCODE_FAILED, { reason: 'Invalid base64 string' }),
    }
  }
}

function arrayBufferToBase64(buffer) {
  try {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return { success: true, data: btoa(binary) }
  } catch {
    return {
      success: false,
      error: createError(ERROR_CODES.ENCODE_FAILED, { reason: 'Buffer conversion failed' }),
    }
  }
}

function textToArrayBuffer(text) {
  try {
    const encoder = new TextEncoder()
    return { success: true, data: encoder.encode(text).buffer }
  } catch {
    return {
      success: false,
      error: createError(ERROR_CODES.ENCODE_FAILED, { reason: 'Text encoding failed' }),
    }
  }
}

function arrayBufferToText(buffer) {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    return { success: true, data: decoder.decode(buffer) }
  } catch {
    return {
      success: false,
      error: createError(ERROR_CODES.DECODE_FAILED, { reason: 'Invalid UTF-8 data' }),
    }
  }
}

function blobToArrayBuffer(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({ success: true, data: reader.result })
    }
    reader.onerror = () => {
      resolve({
        success: false,
        error: createError(ERROR_CODES.DECODE_FAILED, { reason: 'Blob reading failed' }),
      })
    }
    reader.readAsArrayBuffer(blob)
  })
}

function fileToArrayBuffer(file) {
  return blobToArrayBuffer(file)
}

function getMessageSize(message) {
  if (typeof message === 'string') {
    const encoder = new TextEncoder()
    return encoder.encode(message).length
  }
  if (message instanceof ArrayBuffer) {
    return message.byteLength
  }
  if (message instanceof Blob) {
    return message.size
  }
  if (message instanceof Uint8Array) {
    return message.byteLength
  }
  return 0
}

function validateMessageSize(message) {
  const size = getMessageSize(message)
  if (size > MAX_MESSAGE_SIZE) {
    return {
      valid: false,
      size,
      limit: MAX_MESSAGE_SIZE,
    }
  }
  return { valid: true, size }
}

function createMessageEntry({
  direction,
  type,
  content,
  size = 0,
  isHeartbeat = false,
  collapsed = false,
}) {
  return {
    id: generateId(),
    direction,
    type,
    content,
    size: size || getMessageSize(content),
    timestamp: new Date(),
    formattedTime: formatTimestamp(),
    isHeartbeat,
    collapsed,
    rtt: null,
  }
}

function createSystemMessage(message, type = 'info') {
  return {
    id: generateId(),
    direction: MESSAGE_DIRECTION.SYSTEM,
    type: MESSAGE_TYPE.TEXT,
    content: message,
    size: 0,
    timestamp: new Date(),
    formattedTime: formatTimestamp(),
    isHeartbeat: false,
    collapsed: false,
    systemType: type,
  }
}

function shouldTruncateContent(size, previewLength = 1000) {
  return size > previewLength
}

function truncateText(text, maxLength = 1000) {
  if (!text || text.length <= maxLength) {
    return { truncated: false, content: text }
  }
  return {
    truncated: true,
    content: text.slice(0, maxLength),
    originalLength: text.length,
  }
}

function filterMessages(messages, keyword) {
  if (!keyword || !keyword.trim()) {
    return messages
  }
  
  const lowerKeyword = keyword.toLowerCase().trim()
  
  return messages.filter((msg) => {
    if (msg.direction === MESSAGE_DIRECTION.SYSTEM) {
      return String(msg.content).toLowerCase().includes(lowerKeyword)
    }
    
    if (typeof msg.content === 'string') {
      return msg.content.toLowerCase().includes(lowerKeyword)
    }
    
    return false
  })
}

function highlightText(text, keyword) {
  if (!keyword || !keyword.trim() || !text) {
    return escapeHtml(text)
  }
  
  const escaped = escapeHtml(text)
  const escapedKeyword = escapeHtml(keyword.trim())
  
  const regex = new RegExp(
    escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi'
  )
  
  return escaped.replace(
    regex,
    (match) => `<mark>${match}</mark>`
  )
}

function serializeMessageEntry(msg) {
  return {
    id: msg.id,
    direction: msg.direction,
    type: msg.type,
    content: typeof msg.content === 'string' ? msg.content : '[binary data]',
    size: msg.size,
    timestamp: msg.timestamp ? msg.timestamp.toISOString() : null,
    formattedTime: msg.formattedTime,
    isHeartbeat: msg.isHeartbeat,
    systemType: msg.systemType || null,
    rtt: msg.rtt || null,
  }
}

function serializeTimeline(messages) {
  return messages.map(serializeMessageEntry)
}

function exportTimelineAsJson(messages) {
  return JSON.stringify(serializeTimeline(messages), null, 2)
}

function downloadTimeline(messages, filename = 'websocket-messages.json') {
  const json = exportTimelineAsJson(messages)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export {
  MESSAGE_DIRECTION,
  MESSAGE_TYPE,
  MAX_MESSAGE_SIZE,
  ERROR_CODES,
  generateId,
  formatTimestamp,
  escapeHtml,
  bytesToHex,
  bytesToHexWithOffset,
  base64ToArrayBuffer,
  arrayBufferToBase64,
  textToArrayBuffer,
  arrayBufferToText,
  blobToArrayBuffer,
  fileToArrayBuffer,
  getMessageSize,
  validateMessageSize,
  createMessageEntry,
  createSystemMessage,
  shouldTruncateContent,
  truncateText,
  filterMessages,
  highlightText,
  serializeMessageEntry,
  serializeTimeline,
  exportTimelineAsJson,
  downloadTimeline,
}
