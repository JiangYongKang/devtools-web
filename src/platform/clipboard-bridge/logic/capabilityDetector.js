import {
    CLIPBOARD_CAPABILITIES,
    FEATURE_CACHE_KEY,
    FEATURE_CACHE_TTL_MS,
} from './constants.js'

let cachedFeatures = null
let cacheTimestamp = 0

function getNowMs() {
  return Date.now()
}

function isCacheValid(ttl = FEATURE_CACHE_TTL_MS) {
  if (!cachedFeatures) return false
  return (getNowMs() - cacheTimestamp) < ttl
}

function loadFromStorage(storage = null) {
  try {
    if (!storage && typeof localStorage !== 'undefined') {
      storage = localStorage
    }
    if (!storage) return null

    const raw = storage.getItem(FEATURE_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.timestamp || !parsed.features) return null

    return parsed
  } catch {
    return null
  }
}

function saveToStorage(features, storage = null) {
  try {
    if (!storage && typeof localStorage !== 'undefined') {
      storage = localStorage
    }
    if (!storage) return false

    const data = {
      timestamp: getNowMs(),
      features,
    }
    storage.setItem(FEATURE_CACHE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

function clearCache(storage = null) {
  cachedFeatures = null
  cacheTimestamp = 0
  try {
    if (!storage && typeof localStorage !== 'undefined') {
      storage = localStorage
    }
    if (storage) {
      storage.removeItem(FEATURE_CACHE_KEY)
    }
  } catch {
  }
}

function getNavigator() {
  if (typeof navigator !== 'undefined') {
    return navigator
  }
  return null
}

function isSecureContext(env = null) {
  if (env && typeof env.isSecureContext !== 'undefined') {
    return env.isSecureContext
  }
  if (typeof isSecureContext !== 'undefined') {
    return isSecureContext
  }
  if (typeof location !== 'undefined') {
    const protocol = location.protocol
    const hostname = location.hostname
    return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1'
  }
  return false
}

function detectCapabilities(options = {}) {
  const {
    env = null,
    forceRefresh = false,
    cacheTtl = FEATURE_CACHE_TTL_MS,
    useStorage = true,
  } = options

  if (!forceRefresh && isCacheValid(cacheTtl)) {
    return {
      features: cachedFeatures,
      fromCache: true,
      cacheTimestamp,
    }
  }

  if (!forceRefresh && useStorage) {
    const stored = loadFromStorage()
    if (stored && (getNowMs() - stored.timestamp) < cacheTtl) {
      cachedFeatures = stored.features
      cacheTimestamp = stored.timestamp
      return {
        features: cachedFeatures,
        fromCache: true,
        fromStorage: true,
        cacheTimestamp,
      }
    }
  }

  const nav = env?.navigator || getNavigator()
  const secure = isSecureContext(env)

  const features = {
    [CLIPBOARD_CAPABILITIES.IS_SECURE_CONTEXT]: secure,
    [CLIPBOARD_CAPABILITIES.EXEC_COMMAND_COPY]: typeof document !== 'undefined' &&
      typeof document.execCommand === 'function',
  }

  if (nav && nav.clipboard) {
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_API] = true
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE_TEXT] =
      typeof nav.clipboard.writeText === 'function'
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ_TEXT] =
      typeof nav.clipboard.readText === 'function'
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE] =
      typeof nav.clipboard.write === 'function'
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ] =
      typeof nav.clipboard.read === 'function'
  } else {
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_API] = false
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE_TEXT] = false
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ_TEXT] = false
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE] = false
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ] = false
  }

  features[CLIPBOARD_CAPABILITIES.CLIPBOARD_ITEM] =
    typeof ClipboardItem !== 'undefined'

  if (!secure) {
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ] = false
    features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ_TEXT] = false
  }

  cachedFeatures = features
  cacheTimestamp = getNowMs()

  if (useStorage) {
    saveToStorage(features)
  }

  return {
    features,
    fromCache: false,
    cacheTimestamp,
  }
}

function hasFeature(feature, options = {}) {
  const { features } = detectCapabilities(options)
  return features[feature] === true
}

function getFeatureMatrix(options = {}) {
  const result = detectCapabilities(options)
  return {
    ...result,
    isSecureContext: result.features[CLIPBOARD_CAPABILITIES.IS_SECURE_CONTEXT],
    hasClipboardApi: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_API],
    supportsWriteText: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE_TEXT],
    supportsReadText: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ_TEXT],
    supportsWrite: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE],
    supportsRead: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ],
    supportsClipboardItem: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_ITEM],
    supportsExecCommand: result.features[CLIPBOARD_CAPABILITIES.EXEC_COMMAND_COPY],
    matrix: {
      secureContext: result.features[CLIPBOARD_CAPABILITIES.IS_SECURE_CONTEXT],
      modernClipboardApi: {
        available: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_API],
        writeText: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE_TEXT],
        readText: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ_TEXT],
        write: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_WRITE],
        read: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_READ],
      },
      clipboardItem: result.features[CLIPBOARD_CAPABILITIES.CLIPBOARD_ITEM],
      fallback: {
        execCommandCopy: result.features[CLIPBOARD_CAPABILITIES.EXEC_COMMAND_COPY],
      },
    },
  }
}

function getBrowserSummary(options = {}) {
  const { matrix } = getFeatureMatrix(options)

  const labels = []
  if (matrix.secureContext) {
    labels.push('安全上下文')
  } else {
    labels.push('非安全上下文（部分 API 不可用）')
  }

  if (matrix.modernClipboardApi.available) {
    labels.push('现代剪贴板 API')
    if (matrix.clipboardItem) {
      labels.push('支持富文本 (ClipboardItem)')
    }
  } else {
    labels.push('仅支持降级复制')
  }

  return {
    labels,
    canWriteRichText: matrix.modernClipboardApi.write && matrix.clipboardItem,
    canReadRichText: matrix.modernClipboardApi.read && matrix.clipboardItem,
    canReadText: matrix.modernClipboardApi.readText,
    canWriteText: matrix.modernClipboardApi.writeText || matrix.fallback.execCommandCopy,
  }
}

export {
    clearCache, CLIPBOARD_CAPABILITIES, detectCapabilities, FEATURE_CACHE_KEY,
    FEATURE_CACHE_TTL_MS, getBrowserSummary, getFeatureMatrix, hasFeature, isSecureContext,
    loadFromStorage,
    saveToStorage
}

