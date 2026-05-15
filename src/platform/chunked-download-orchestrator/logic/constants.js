export const ERROR_CODES = {
  SUCCESS: 'SUCCESS',
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_SOURCE_TYPE: 'INVALID_SOURCE_TYPE',
  EXCEEDS_MAX_BYTES: 'EXCEEDS_MAX_BYTES',
  USER_ABORTED: 'USER_ABORTED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_FILENAME: 'INVALID_FILENAME',
  UNSUPPORTED_BROWSER: 'UNSUPPORTED_BROWSER',
  SSR_ENVIRONMENT: 'SSR_ENVIRONMENT',
  RETRY_FAILED: 'RETRY_FAILED',
}

export const DEFAULT_CHUNK_SIZE = 1024 * 1024

export const DEFAULT_MAX_TOTAL_BYTES = 500 * 1024 * 1024

export const DEFAULT_PROGRESS_THROTTLE_MS = 100

export const DEFAULT_RETRY_COUNT = 1

export const DEFAULT_FILENAME_MAX_LENGTH = 255

export const FILENAME_ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1F]/g

export const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])

export const MIME_TYPES = {
  TEXT_PLAIN: 'text/plain;charset=utf-8',
  TEXT_CSV: 'text/csv;charset=utf-8',
  TEXT_HTML: 'text/html;charset=utf-8',
  JSON: 'application/json',
  XML: 'application/xml;charset=utf-8',
  BINARY: 'application/octet-stream',
}

export const BROWSER_FEATURES = {
  OBJECT_URL: 'objectUrl',
  READABLE_STREAM: 'readableStream',
  STREAM_SAVER: 'streamSaver',
  FILE_SYSTEM_ACCESS: 'fileSystemAccess',
  BLOB_CONSTRUCTOR: 'blobConstructor',
  TEXT_ENCODER: 'textEncoder',
}

export const DOWNLOAD_MODES = {
  OBJECT_URL_MERGE: 'objectUrlMerge',
  MULTI_BLOB_SEQUENTIAL: 'multiBlobSequential',
  STREAM_SAVER: 'streamSaver',
}

export const EMA_WINDOW_SIZE = 5

export const MAX_BEFOREUNLOAD_MESSAGE = '导出正在进行中，离开页面可能会中断下载。确定要离开吗？'
