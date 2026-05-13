const ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_FORMAT: 'INVALID_FORMAT',
  MEMORY_PRESSURE: 'MEMORY_PRESSURE',
  UNSUPPORTED_PAYLOAD: 'UNSUPPORTED_PAYLOAD',
  STORAGE_WRITE_ERROR: 'STORAGE_WRITE_ERROR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.EMPTY_INPUT]: '输入不能为空',
  [ERROR_CODES.INVALID_FORMAT]: '输入格式无效',
  [ERROR_CODES.MEMORY_PRESSURE]: '数据大小超过内存安全阈值',
  [ERROR_CODES.UNSUPPORTED_PAYLOAD]: '不支持的数据源类型',
  [ERROR_CODES.STORAGE_WRITE_ERROR]: '无法写入本地存储',
}

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])

const WINDOWS_ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1F]/g

const UNIX_ILLEGAL_CHARS = /[\x00\/]/g

const DEFAULT_MAX_FILENAME_LENGTH = 255

const DEFAULT_BLOB_SIZE_LIMIT = 100 * 1024 * 1024

const DEFAULT_REVOKE_TIMEOUT_MS = 60 * 1000

const MIME_INFERENCE_MAP = {
  json: 'application/json',
  csv: 'text/csv;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
  html: 'text/html;charset=utf-8',
  js: 'application/javascript;charset=utf-8',
  css: 'text/css;charset=utf-8',
}

const UTF8_BOM = new Uint8Array([0xEF, 0xBB, 0xBF])

const EXAMPLES = {
  smallText: `name,age,city
Alice,30,Beijing
Bob,25,Shanghai
Charlie,35,Shenzhen`,
  jsonText: JSON.stringify({
    users: [
      { id: 1, name: 'Alice', isActive: true },
      { id: 2, name: 'Bob', isActive: false },
    ],
    metadata: { timestamp: Date.now(), version: '1.0' },
  }, null, 2),
  emojiText: '你好 🌍 Hello 🗺️ こんにちは 🗾',
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  WINDOWS_RESERVED_NAMES,
  WINDOWS_ILLEGAL_CHARS,
  UNIX_ILLEGAL_CHARS,
  DEFAULT_MAX_FILENAME_LENGTH,
  DEFAULT_BLOB_SIZE_LIMIT,
  DEFAULT_REVOKE_TIMEOUT_MS,
  MIME_INFERENCE_MAP,
  UTF8_BOM,
  EXAMPLES,
}
