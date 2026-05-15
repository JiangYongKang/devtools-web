import { DEFAULT_RETRY_CONFIG } from './constants'
import { createChunkLoadError, isRetriableError, ERROR_CODES } from './errors'

export function withRetry(loaderFn, config = {}) {
  const { maxRetries, initialDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  }

  let lastError = null
  let retryCount = 0

  async function attempt() {
    try {
      return await loaderFn()
    } catch (error) {
      lastError = error
      retryCount++

      if (retryCount > maxRetries || !isRetriableError(error)) {
        throw createChunkLoadError(
          error.code || ERROR_CODES.CHUNK_LOAD_FAILED,
          error.message,
          retryCount
        )
      }

      const delay = initialDelay * Math.pow(backoffMultiplier, retryCount - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))

      return attempt()
    }
  }

  return attempt()
}

export function getLastError() {
  return {
    error: lastError,
    retryCount,
    timestamp: Date.now(),
  }
}
