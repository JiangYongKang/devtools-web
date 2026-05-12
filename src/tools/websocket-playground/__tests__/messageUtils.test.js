import { describe, test, expect } from 'vitest'
import {
  MESSAGE_DIRECTION,
  MESSAGE_TYPE,
  MAX_MESSAGE_SIZE,
  escapeHtml,
  bytesToHex,
  bytesToHexWithOffset,
  base64ToArrayBuffer,
  arrayBufferToBase64,
  textToArrayBuffer,
  arrayBufferToText,
  getMessageSize,
  validateMessageSize,
  createMessageEntry,
  createSystemMessage,
  filterMessages,
  highlightText,
  serializeMessageEntry,
  serializeTimeline,
  exportTimelineAsJson,
} from '../logic/messageUtils.js'

describe('messageUtils', () => {
  describe('escapeHtml', () => {
    test('should return empty string for null or undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    test('should convert non-string values to string', () => {
      expect(escapeHtml(123)).toBe('123')
      expect(escapeHtml(0)).toBe('0')
      expect(escapeHtml(true)).toBe('true')
    })

    test('should escape special characters', () => {
      const html = '<script>alert("xss")</script>'
      const escaped = escapeHtml(html)
      expect(escaped).not.toContain('<script>')
      expect(escaped).toContain('&lt;script&gt;')
      expect(escaped).toContain('&quot;')
    })

    test('should escape all dangerous characters', () => {
      const result = escapeHtml('<>&"\'')
      expect(result).toBe('&lt;&gt;&amp;&quot;&#39;')
    })

    test('should return original string if no special characters', () => {
      expect(escapeHtml('hello world')).toBe('hello world')
      expect(escapeHtml('')).toBe('')
    })
  })

  describe('bytesToHex', () => {
    test('should return empty string for null or undefined', () => {
      expect(bytesToHex(null)).toBe('')
      expect(bytesToHex(undefined)).toBe('')
    })

    test('should convert bytes to hex string', () => {
      const buffer = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      expect(bytesToHex(buffer)).toBe('48 65 6c 6c 6f')
    })

    test('should handle ArrayBuffer', () => {
      const buffer = new ArrayBuffer(3)
      const view = new Uint8Array(buffer)
      view[0] = 0x01
      view[1] = 0x02
      view[2] = 0x03
      expect(bytesToHex(buffer)).toBe('01 02 03')
    })
  })

  describe('bytesToHexWithOffset', () => {
    test('should return empty result for null or undefined', () => {
      const result = bytesToHexWithOffset(null)
      expect(result.lines).toEqual([])
      expect(result.total).toBe(0)
    })

    test('should format hex with offset and ASCII', () => {
      const buffer = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
      const result = bytesToHexWithOffset(buffer, 8)
      expect(result.total).toBe(5)
      expect(result.lines.length).toBe(1)
      expect(result.lines[0].offset).toBe('00000000')
      expect(result.lines[0].hex).toContain('48 65 6c 6c 6f')
      expect(result.lines[0].ascii).toBe('Hello')
    })

    test('should split into multiple lines', () => {
      const buffer = new Uint8Array(32)
      for (let i = 0; i < 32; i++) buffer[i] = 0x41
      const result = bytesToHexWithOffset(buffer, 16)
      expect(result.lines.length).toBe(2)
      expect(result.lines[0].offset).toBe('00000000')
      expect(result.lines[1].offset).toBe('00000010')
    })

    test('should replace non-printable characters with dot', () => {
      const buffer = new Uint8Array([0x00, 0x01, 0x41, 0x7f])
      const result = bytesToHexWithOffset(buffer, 16)
      expect(result.lines[0].ascii).toBe('..A.')
    })
  })

  describe('base64ToArrayBuffer', () => {
    test('should decode valid base64', () => {
      const result = base64ToArrayBuffer('SGVsbG8=')
      expect(result.success).toBe(true)
      const view = new Uint8Array(result.data)
      expect(String.fromCharCode.apply(null, view)).toBe('Hello')
    })

    test('should fail on invalid base64', () => {
      const result = base64ToArrayBuffer('!!!invalid!!!')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('arrayBufferToBase64', () => {
    test('should encode to base64', () => {
      const buffer = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]).buffer
      const result = arrayBufferToBase64(buffer)
      expect(result.success).toBe(true)
      expect(result.data).toBe('SGVsbG8=')
    })
  })

  describe('textToArrayBuffer', () => {
    test('should encode text', () => {
      const result = textToArrayBuffer('Hello')
      expect(result.success).toBe(true)
      const view = new Uint8Array(result.data)
      expect(view.length).toBe(5)
    })
  })

  describe('arrayBufferToText', () => {
    test('should decode valid UTF-8', () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode('Hello World').buffer
      const result = arrayBufferToText(buffer)
      expect(result.success).toBe(true)
      expect(result.data).toBe('Hello World')
    })

    test('should fail on invalid UTF-8', () => {
      const buffer = new Uint8Array([0xff, 0xfe, 0xfd]).buffer
      const result = arrayBufferToText(buffer)
      expect(result.success).toBe(false)
    })
  })

  describe('getMessageSize', () => {
    test('should calculate string size in bytes', () => {
      expect(getMessageSize('Hello')).toBe(5)
      expect(getMessageSize('你好')).toBe(6)
    })

    test('should calculate ArrayBuffer size', () => {
      const buffer = new ArrayBuffer(100)
      expect(getMessageSize(buffer)).toBe(100)
    })

    test('should calculate Blob size', () => {
      const blob = new Blob(['test'])
      expect(getMessageSize(blob)).toBe(4)
    })

    test('should calculate Uint8Array size', () => {
      const arr = new Uint8Array(50)
      expect(getMessageSize(arr)).toBe(50)
    })

    test('should return 0 for unknown types', () => {
      expect(getMessageSize(null)).toBe(0)
      expect(getMessageSize(undefined)).toBe(0)
      expect(getMessageSize({})).toBe(0)
    })
  })

  describe('validateMessageSize', () => {
    test('should validate message under limit', () => {
      const result = validateMessageSize('small')
      expect(result.valid).toBe(true)
    })

    test('should reject message over limit', () => {
      const bigMsg = 'x'.repeat(MAX_MESSAGE_SIZE + 1)
      const result = validateMessageSize(bigMsg)
      expect(result.valid).toBe(false)
      expect(result.size).toBeGreaterThan(result.limit)
    })
  })

  describe('createMessageEntry', () => {
    test('should create message entry with correct fields', () => {
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.SENT,
        type: MESSAGE_TYPE.TEXT,
        content: 'Hello',
      })
      expect(msg.id).toBeDefined()
      expect(msg.direction).toBe(MESSAGE_DIRECTION.SENT)
      expect(msg.type).toBe(MESSAGE_TYPE.TEXT)
      expect(msg.content).toBe('Hello')
      expect(msg.size).toBe(5)
      expect(msg.timestamp).toBeInstanceOf(Date)
      expect(msg.formattedTime).toBeDefined()
      expect(msg.isHeartbeat).toBe(false)
      expect(msg.collapsed).toBe(false)
    })

    test('should mark as heartbeat', () => {
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.SENT,
        type: MESSAGE_TYPE.TEXT,
        content: 'ping',
        isHeartbeat: true,
      })
      expect(msg.isHeartbeat).toBe(true)
    })

    test('should accept custom size', () => {
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.RECEIVED,
        type: MESSAGE_TYPE.BINARY,
        content: new ArrayBuffer(100),
        size: 100,
      })
      expect(msg.size).toBe(100)
    })
  })

  describe('createSystemMessage', () => {
    test('should create system message', () => {
      const msg = createSystemMessage('Test message')
      expect(msg.direction).toBe(MESSAGE_DIRECTION.SYSTEM)
      expect(msg.type).toBe(MESSAGE_TYPE.TEXT)
      expect(msg.content).toBe('Test message')
      expect(msg.systemType).toBe('info')
    })

    test('should accept custom type', () => {
      const msg = createSystemMessage('Error', 'error')
      expect(msg.systemType).toBe('error')
    })
  })

  describe('filterMessages', () => {
    const messages = [
      { id: 1, direction: MESSAGE_DIRECTION.SENT, content: 'Hello World' },
      { id: 2, direction: MESSAGE_DIRECTION.RECEIVED, content: 'Goodbye' },
      { id: 3, direction: MESSAGE_DIRECTION.SYSTEM, content: 'System info' },
      { id: 4, direction: MESSAGE_DIRECTION.RECEIVED, content: 'Hello again' },
    ]

    test('should return all messages for empty keyword', () => {
      const result = filterMessages(messages, '')
      expect(result.length).toBe(4)
    })

    test('should return all messages for null keyword', () => {
      const result = filterMessages(messages, null)
      expect(result.length).toBe(4)
    })

    test('should filter by keyword', () => {
      const result = filterMessages(messages, 'Hello')
      expect(result.length).toBe(2)
      expect(result[0].content).toContain('Hello')
    })

    test('should filter case-insensitively', () => {
      const result = filterMessages(messages, 'hello')
      expect(result.length).toBe(2)
    })

    test('should filter system messages', () => {
      const result = filterMessages(messages, 'System')
      expect(result.length).toBe(1)
      expect(result[0].direction).toBe(MESSAGE_DIRECTION.SYSTEM)
    })

    test('should return empty array when no matches', () => {
      const result = filterMessages(messages, 'nonexistent')
      expect(result.length).toBe(0)
    })
  })

  describe('highlightText', () => {
    test('should escape HTML without keyword', () => {
      const result = highlightText('<test>', '')
      expect(result).toBe('&lt;test&gt;')
    })

    test('should highlight keyword', () => {
      const result = highlightText('Hello World', 'Hello')
      expect(result).toContain('<mark>Hello</mark>')
    })

    test('should highlight all occurrences', () => {
      const result = highlightText('Hello Hello Hello', 'Hello')
      const matches = (result.match(/<mark>/g) || []).length
      expect(matches).toBe(3)
    })

    test('should handle regex special characters in keyword', () => {
      const result = highlightText('test [abc] test', '[abc]')
      expect(result).toContain('<mark>')
    })

    test('should escape HTML and highlight', () => {
      const result = highlightText('<script>alert</script>', 'alert')
      expect(result).toContain('&lt;script&gt;')
      expect(result).toContain('<mark>alert</mark>')
    })
  })

  describe('serializeMessageEntry', () => {
    test('should serialize text message', () => {
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.SENT,
        type: MESSAGE_TYPE.TEXT,
        content: 'Hello',
      })
      const serialized = serializeMessageEntry(msg)
      expect(serialized.id).toBe(msg.id)
      expect(serialized.direction).toBe(MESSAGE_DIRECTION.SENT)
      expect(serialized.content).toBe('Hello')
      expect(serialized.timestamp).toBe(msg.timestamp.toISOString())
    })

    test('should serialize binary message content as placeholder', () => {
      const buffer = new ArrayBuffer(10)
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.RECEIVED,
        type: MESSAGE_TYPE.BINARY,
        content: buffer,
      })
      const serialized = serializeMessageEntry(msg)
      expect(serialized.content).toBe('[binary data]')
    })

    test('should serialize heartbeat messages', () => {
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.SENT,
        type: MESSAGE_TYPE.TEXT,
        content: 'ping',
        isHeartbeat: true,
      })
      msg.rtt = 100
      const serialized = serializeMessageEntry(msg)
      expect(serialized.isHeartbeat).toBe(true)
      expect(serialized.rtt).toBe(100)
    })

    test('should serialize system messages', () => {
      const msg = createSystemMessage('test', 'error')
      const serialized = serializeMessageEntry(msg)
      expect(serialized.systemType).toBe('error')
    })
  })

  describe('serializeTimeline', () => {
    test('should serialize all messages', () => {
      const msg1 = createMessageEntry({
        direction: MESSAGE_DIRECTION.SENT,
        type: MESSAGE_TYPE.TEXT,
        content: 'Hello',
      })
      const msg2 = createSystemMessage('test')
      
      const timeline = serializeTimeline([msg1, msg2])
      expect(timeline.length).toBe(2)
      expect(timeline[0].id).toBe(msg1.id)
      expect(timeline[1].id).toBe(msg2.id)
    })
  })

  describe('exportTimelineAsJson', () => {
    test('should produce valid JSON', () => {
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.SENT,
        type: MESSAGE_TYPE.TEXT,
        content: 'Hello',
      })
      const json = exportTimelineAsJson([msg])
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(1)
    })

    test('should produce formatted JSON', () => {
      const msg = createMessageEntry({
        direction: MESSAGE_DIRECTION.SENT,
        type: MESSAGE_TYPE.TEXT,
        content: 'Hello',
      })
      const json = exportTimelineAsJson([msg])
      expect(json).toContain('\n')
      expect(json).toContain('  ')
    })
  })
})
