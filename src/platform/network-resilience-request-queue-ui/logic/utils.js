const generateId = (prefix = 'req') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max)
}

const calculateExponentialBackoff = (initialDelay, attempt, factor, maxDelay) => {
  const delay = initialDelay * Math.pow(factor, attempt)
  return Math.min(delay, maxDelay)
}

const applyJitter = (delay, jitterRatio) => {
  if (jitterRatio <= 0) return delay
  const jitter = delay * jitterRatio * (Math.random() * 2 - 1)
  return Math.max(0, delay + jitter)
}

const calculateNextBackoff = (retryCount, backoffConfig) => {
  const { initialDelayMs, maxDelayMs, factor, jitterRatio } = backoffConfig
  let delay = calculateExponentialBackoff(initialDelayMs, retryCount, factor, maxDelayMs)
  if (jitterRatio > 0) {
    delay = applyJitter(delay, jitterRatio)
  }
  return clamp(delay, 0, maxDelayMs)
}

const generateDedupeKey = (requestSpec) => {
  const { method, url, body } = requestSpec
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body || '')
  return `${method}:${url}:${hashString(bodyStr)}`
}

const hashString = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

const sanitizeHeaders = (headers, sensitiveKeys) => {
  if (!headers) return {}
  const sanitized = { ...headers }
  sensitiveKeys.forEach((key) => {
    const lowerKey = key.toLowerCase()
    Object.keys(sanitized).forEach((headerKey) => {
      if (headerKey.toLowerCase() === lowerKey) {
        sanitized[headerKey] = '***REDACTED***'
      }
    })
  })
  return sanitized
}

const estimateSizeInBytes = (obj) => {
  return new Blob([JSON.stringify(obj)]).size
}

const now = () => Date.now()

const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

export {
  generateId,
  clamp,
  calculateExponentialBackoff,
  applyJitter,
  calculateNextBackoff,
  generateDedupeKey,
  hashString,
  sanitizeHeaders,
  estimateSizeInBytes,
  now,
  formatDuration,
}
