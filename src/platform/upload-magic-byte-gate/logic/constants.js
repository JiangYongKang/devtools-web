const ISSUE_CODES = {
  EMPTY_FILE: 'EMPTY_FILE',
  FILE_SIZE_WARNING: 'FILE_SIZE_WARNING',
  FILE_SIZE_REJECT: 'FILE_SIZE_REJECT',
  MIME_MISMATCH: 'MIME_MISMATCH',
  OCTET_STREAM_MISMATCH: 'OCTET_STREAM_MISMATCH',
  UNKNOWN_EXTENSION: 'UNKNOWN_EXTENSION',
  DIRECTORY_DETECTED: 'DIRECTORY_DETECTED',
  ZIP_CONTAINER_WARNING: 'ZIP_CONTAINER_WARNING',
  EXECUTABLE_RISK: 'EXECUTABLE_RISK',
  READ_ERROR: 'READ_ERROR',
  CANCELLED: 'CANCELLED',
}

const SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
}

const FILE_STATES = {
  PENDING: 'pending',
  VALIDATING: 'validating',
  PASSED: 'passed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

const MAX_HEADER_BYTES = 512
const MIN_HEADER_BYTES = 64

const DEFAULT_SIZE_TIER = {
  softWarning: 10 * 1024 * 1024,
  hardReject: 100 * 1024 * 1024,
}

const MAX_PARALLEL_READS = 4

const EXECUTABLE_MIMES = new Set([
  'application/vnd.microsoft.portable-executable',
  'application/x-executable',
  'application/x-sharedlib',
  'application/wasm',
  'application/x-msdownload',
  'application/x-dosexec',
])

const RISK_MIME_CATEGORIES = {
  EXECUTABLE: 'executable',
  ARCHIVE: 'archive',
  DOCUMENT: 'document',
  MEDIA: 'media',
  TEXT: 'text',
  OTHER: 'other',
}

const DRAG_STATES = {
  IDLE: 'idle',
  DRAGGING_OVER: 'dragging_over',
}

export {
  ISSUE_CODES,
  SEVERITY,
  FILE_STATES,
  MAX_HEADER_BYTES,
  MIN_HEADER_BYTES,
  DEFAULT_SIZE_TIER,
  MAX_PARALLEL_READS,
  EXECUTABLE_MIMES,
  RISK_MIME_CATEGORIES,
  DRAG_STATES,
}
