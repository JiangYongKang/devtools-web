import {
  DEFAULT_FILENAME_MAX_LENGTH,
  FILENAME_ILLEGAL_CHARS,
  WINDOWS_RESERVED_NAMES,
  EMA_WINDOW_SIZE,
} from './constants.js'

export function sanitizeFilename(filename, options = {}) {
  const {
    maxLength = DEFAULT_FILENAME_MAX_LENGTH,
    fallbackName = 'download',
    fallbackExt = 'txt',
  } = options

  if (!filename || typeof filename !== 'string') {
    return `${fallbackName}.${fallbackExt}`
  }

  let result = filename

  result = result.replace(FILENAME_ILLEGAL_CHARS, '')

  result = result.trim()

  result = result.replace(/^[.\s]+|[.\s]+$/g, '')

  if (result.length === 0) {
    return `${fallbackName}.${fallbackExt}`
  }

  const upperResult = result.toUpperCase()
  if (WINDOWS_RESERVED_NAMES.has(upperResult)) {
    return `_${result}_`
  }

  const hasDot = result.includes('.')
  const lastDot = result.lastIndexOf('.')
  let baseName = result
  let extension = ''

  if (lastDot > 0 && lastDot < result.length - 1) {
    baseName = result.slice(0, lastDot)
    extension = result.slice(lastDot)
  }

  if (!hasDot && result.length <= 5 && /^[a-z0-9]+$/i.test(result)) {
    extension = `.${result}`
    baseName = fallbackName
  }

  if (baseName.length === 0) {
    baseName = fallbackName
  }

  const upperBase = baseName.toUpperCase()
  if (WINDOWS_RESERVED_NAMES.has(upperBase)) {
    baseName = `_${baseName}_`
  }

  const totalMaxLength = Math.max(1, maxLength)

  if (extension.length > totalMaxLength - 5) {
    extension = `.${fallbackExt}`
  }

  const maxBaseLength = totalMaxLength - extension.length

  if (maxBaseLength <= 0) {
    return `${fallbackName}.${fallbackExt}`
  }

  if (baseName.length > maxBaseLength) {
    const suffix = `_${generateShortHash(baseName, 4)}`
    const truncatedBase = baseName.slice(0, maxBaseLength - suffix.length)
    baseName = truncatedBase + suffix
  }

  result = baseName + extension

  if (result.length > totalMaxLength) {
    result = result.slice(0, totalMaxLength)
  }

  return result || `${fallbackName}.${fallbackExt}`
}

export function generateShortHash(input, length = 8) {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return hex.slice(0, Math.max(1, length))
}

export function normalizeMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return 'application/octet-stream'
  }
  return mimeType.trim().toLowerCase()
}

export function inferMimeTypeFromFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'application/octet-stream'
  }

  const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()

  const mimeMap = {
    txt: 'text/plain;charset=utf-8',
    csv: 'text/csv;charset=utf-8',
    html: 'text/html;charset=utf-8',
    htm: 'text/html;charset=utf-8',
    json: 'application/json',
    xml: 'application/xml;charset=utf-8',
    js: 'application/javascript',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    zip: 'application/zip',
    md: 'text/markdown',
  }

  return mimeMap[ext] || 'application/octet-stream'
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B'

  const k = 1024
  const dm = Math.max(0, decimals)
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)

  const formatted = dm === 0
    ? Math.floor(value)
    : parseFloat(value.toFixed(dm))

  return formatted + ' ' + sizes[i]
}

export function formatETA(seconds) {
  if (seconds == null || !isFinite(seconds) || seconds < 0) {
    return '--:--'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  if (mins > 60) {
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}h ${remainingMins}m`
  }

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function calculateEMA(currentValue, previousEMA, windowSize = EMA_WINDOW_SIZE) {
  const alpha = 2 / (windowSize + 1)
  return alpha * currentValue + (1 - alpha) * previousEMA
}

export function createSpeedEstimator(windowSize = EMA_WINDOW_SIZE) {
  let lastTime = Date.now()
  let lastBytes = 0
  let emaSpeed = 0
  let initialized = false

  return {
    update: (currentBytes) => {
      const now = Date.now()
      const timeDelta = (now - lastTime) / 1000

      if (timeDelta > 0 && currentBytes >= lastBytes) {
        const instantSpeed = (currentBytes - lastBytes) / timeDelta

        if (!initialized) {
          emaSpeed = instantSpeed
          initialized = true
        } else {
          emaSpeed = calculateEMA(instantSpeed, emaSpeed, windowSize)
        }
      }

      lastTime = now
      lastBytes = currentBytes

      return emaSpeed
    },
    reset: () => {
      lastTime = Date.now()
      lastBytes = 0
      emaSpeed = 0
      initialized = false
    },
    getSpeed: () => emaSpeed,
  }
}

export function createRafThrottler() {
  let rafId = null
  let lastArgs = null
  let lastThis = null

  const throttled = function(fn, ...args) {
    lastArgs = args
    lastThis = this

    if (rafId !== null) {
      return
    }

    rafId = requestAnimationFrame(() => {
      fn.apply(lastThis, lastArgs)
      rafId = null
      lastArgs = null
      lastThis = null
    })
  }

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  return throttled
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function withDelay(fn, delayMs) {
  return async (...args) => {
    await delay(delayMs)
    return fn(...args)
  }
}

export function addUtf8Bom(data) {
  if (typeof data === 'string') {
    return '\uFEFF' + data
  }

  if (ArrayBuffer.isView(data) && data.constructor.name === 'Uint8Array') {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
    const result = new Uint8Array(bom.length + data.length)
    result.set(bom, 0)
    result.set(data, bom.length)
    return result
  }

  return data
}

export function shouldAddUtf8Bom(mimeType) {
  const normalized = normalizeMimeType(mimeType)
  return normalized.includes('text/csv') || normalized.includes('csv')
}
