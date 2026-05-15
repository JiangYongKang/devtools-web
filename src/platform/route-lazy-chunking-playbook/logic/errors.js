export class ChunkLoadError extends Error {
  constructor(message, code, retryCount = 0) {
    super(message)
    this.name = 'ChunkLoadError'
    this.code = code
    this.retryCount = retryCount
    this.timestamp = Date.now()
  }
}

export const ERROR_CODES = {
  CHUNK_LOAD_FAILED: 'CHUNK_LOAD_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  INVALID_MANIFEST: 'INVALID_MANIFEST',
}

export function createChunkLoadError(code, message, retryCount = 0) {
  return new ChunkLoadError(message || `Chunk load failed: ${code}`, code, retryCount)
}

export function isRetriableError(error) {
  if (!(error instanceof ChunkLoadError)) return false
  return [
    ERROR_CODES.CHUNK_LOAD_FAILED,
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.TIMEOUT,
  ].includes(error.code)
}
