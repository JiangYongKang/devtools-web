import { DEFAULT_DEDUPE_TTL_MS } from './constants.js'
import { buildRequestSignature } from './hash.js'

function createDedupeManager(options = {}) {
  const { ttlMs = DEFAULT_DEDUPE_TTL_MS, maxEntries = 1000 } = options
  const pendingRequests = new Map()
  const cache = new Map()

  function getCacheKey(method, url, body, dedupeOptions = {}) {
    const { includeHeaders = false, headers = null } = dedupeOptions
    return buildRequestSignature(method, url, body, { includeHeaders, headers })
  }

  function getPending(key) {
    return pendingRequests.get(key)
  }

  function setPending(key, promise) {
    if (pendingRequests.size >= maxEntries) {
      const firstKey = pendingRequests.keys().next().value
      if (firstKey !== undefined) {
        pendingRequests.delete(firstKey)
      }
    }
    pendingRequests.set(key, promise)
  }

  function clearPending(key) {
    pendingRequests.delete(key)
  }

  function getCached(key) {
    const entry = cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      return null
    }

    return entry.value
  }

  function setCached(key, value, customTtl) {
    const ttl = customTtl != null ? customTtl : ttlMs

    if (ttl <= 0) return

    if (cache.size >= maxEntries) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) {
        cache.delete(firstKey)
      }
    }

    cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    })
  }

  function clearCache() {
    cache.clear()
    pendingRequests.clear()
  }

  function clearCacheKey(key) {
    cache.delete(key)
  }

  async function dedupe(method, url, body, fetcher, dedupeOptions = {}) {
    const { enabled = false, cacheTtl } = dedupeOptions

    if (!enabled) {
      return fetcher()
    }

    const key = getCacheKey(method, url, body, dedupeOptions)

    const cached = getCached(key)
    if (cached) {
      return cached
    }

    const pending = getPending(key)
    if (pending) {
      return pending
    }

    const promise = (async () => {
      try {
        const result = await fetcher()
        setCached(key, result, cacheTtl)
        return result
      } finally {
        clearPending(key)
      }
    })()

    setPending(key, promise)
    return promise
  }

  function getStats() {
    return {
      pendingCount: pendingRequests.size,
      cachedCount: cache.size,
      maxEntries,
    }
  }

  return {
    getCacheKey,
    getPending,
    setPending,
    clearPending,
    getCached,
    setCached,
    clearCache,
    clearCacheKey,
    dedupe,
    getStats,
  }
}

export { createDedupeManager }
