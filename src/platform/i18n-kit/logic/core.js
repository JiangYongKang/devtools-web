import {
  DEFAULT_FALLBACK_LOCALE,
  DEFAULT_LOCALE,
  DEFAULT_NAMESPACE,
  ERROR_CODES,
  MAX_KEY_LENGTH,
  MAX_NAMESPACES,
  PLACEHOLDER_PATTERN,
  RTL_LOCALES,
} from './constants.js'
import { createError } from './errors.js'

function validateTranslationSchemaBasic(bundle) {
  if (bundle === null || bundle === undefined || typeof bundle !== 'object') {
    return {
      valid: false,
      error: createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '语言包必须是对象'),
    }
  }
  if (Array.isArray(bundle)) {
    return {
      valid: false,
      error: createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '语言包不能是数组'),
    }
  }
  return { valid: true }
}

export function normalizeLocale(locale) {
  if (!locale || typeof locale !== 'string') {
    return null
  }
  return locale.trim()
}

export function normalizeKey(key) {
  if (typeof key !== 'string') {
    return null
  }
  return key.trim()
}

export function normalizeNamespace(namespace) {
  if (!namespace || typeof namespace !== 'string') {
    return DEFAULT_NAMESPACE
  }
  return namespace.trim() || DEFAULT_NAMESPACE
}

export function validateKey(key) {
  if (key === null || key === undefined) {
    return { valid: false, error: createError(ERROR_CODES.INVALID_KEY, '键不能为 null 或 undefined') }
  }
  if (typeof key !== 'string') {
    return { valid: false, error: createError(ERROR_CODES.INVALID_KEY, '键必须是字符串') }
  }
  const normalized = key.trim()
  if (normalized.length === 0) {
    return { valid: false, error: createError(ERROR_CODES.EMPTY_KEY) }
  }
  if (normalized.length > MAX_KEY_LENGTH) {
    return { valid: false, error: createError(ERROR_CODES.KEY_TOO_LONG, `最大长度 ${MAX_KEY_LENGTH}`) }
  }
  return { valid: true }
}

export function isRTL(locale) {
  if (!locale || typeof locale !== 'string') {
    return false
  }
  const normalized = locale.trim()
  if (RTL_LOCALES.has(normalized)) {
    return true
  }
  const base = normalized.split('-')[0]
  return RTL_LOCALES.has(base)
}

export function getDirection(locale) {
  return isRTL(locale) ? 'rtl' : 'ltr'
}

export function interpolate(template, params = {}) {
  if (template === null || template === undefined) {
    return ''
  }
  if (typeof template !== 'string') {
    return String(template)
  }
  if (!params || Object.keys(params).length === 0) {
    return template
  }
  return template.replace(PLACEHOLDER_PATTERN, (match, name) => {
    if (name in params) {
      const value = params[name]
      return value === null || value === undefined ? '' : String(value)
    }
    return match
  })
}

export function extractPlaceholders(template) {
  if (typeof template !== 'string') {
    return []
  }
  const matches = []
  const pattern = new RegExp(PLACEHOLDER_PATTERN.source, 'g')
  let match
  while ((match = pattern.exec(template)) !== null) {
    matches.push(match[1])
  }
  return [...new Set(matches)]
}

export function getValueFromPath(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return undefined
  }
  if (path === null || path === undefined) {
    return undefined
  }
  if (typeof path === 'string') {
    if (path in obj) {
      return obj[path]
    }
    const parts = path.split('.')
    let current = obj
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined
      }
      if (part in current) {
        current = current[part]
      } else {
        return undefined
      }
    }
    return current
  }
  return undefined
}

export function buildFallbackChain(locale, fallbackLocale = DEFAULT_FALLBACK_LOCALE) {
  const chain = []
  const normalizedLocale = normalizeLocale(locale)
  const normalizedFallback = normalizeLocale(fallbackLocale)
  if (normalizedLocale) {
    chain.push(normalizedLocale)
    if (normalizedLocale.includes('-')) {
      const base = normalizedLocale.split('-')[0]
      if (!chain.includes(base)) {
        chain.push(base)
      }
    }
  }
  if (normalizedFallback) {
    if (!chain.includes(normalizedFallback)) {
      chain.push(normalizedFallback)
    }
    if (normalizedFallback.includes('-')) {
      const base = normalizedFallback.split('-')[0]
      if (!chain.includes(base)) {
        chain.push(base)
      }
    }
  }
  return [...new Set(chain)]
}

export function createI18nStore(options = {}) {
  const {
    defaultLocale = DEFAULT_LOCALE,
    fallbackLocale = DEFAULT_FALLBACK_LOCALE,
  } = options
  const store = {
    locale: defaultLocale,
    fallbackLocale,
    loaded: {},
    namespaceMeta: {},
  }
  return store
}

export function setLocale(store, locale) {
  const normalized = normalizeLocale(locale)
  if (!normalized) {
    return { success: false, error: createError(ERROR_CODES.INVALID_LOCALE, locale) }
  }
  store.locale = normalized
  return { success: true }
}

export function getLocale(store) {
  return store.locale
}

export function hasNamespace(store, locale, namespace) {
  const normalizedLocale = normalizeLocale(locale)
  const normalizedNs = normalizeNamespace(namespace)
  if (!normalizedLocale) {
    return false
  }
  return !!(store.loaded[normalizedLocale] && store.loaded[normalizedLocale][normalizedNs])
}

export function getNamespace(store, locale, namespace) {
  const normalizedLocale = normalizeLocale(locale)
  const normalizedNs = normalizeNamespace(namespace)
  if (!normalizedLocale) {
    return null
  }
  if (store.loaded[normalizedLocale] && store.loaded[normalizedLocale][normalizedNs]) {
    return store.loaded[normalizedLocale][normalizedNs]
  }
  return null
}

export function resolveKeyFromStore(store, key, options = {}) {
  const {
    namespace = DEFAULT_NAMESPACE,
    locale = store.locale,
    fallbackLocale = store.fallbackLocale,
    namespaceKeySeparator = ':',
  } = options
  let actualKey = key
  let actualNs = namespace
  if (typeof actualKey === 'string' && actualKey.includes(namespaceKeySeparator)) {
    const idx = actualKey.indexOf(namespaceKeySeparator)
    actualNs = actualKey.substring(0, idx)
    actualKey = actualKey.substring(idx + 1)
  }
  const chain = buildFallbackChain(locale, fallbackLocale)
  const normalizedNs = normalizeNamespace(actualNs)
  const normalizedKey = normalizeKey(actualKey)
  if (!normalizedKey) {
    return { found: false, value: key }
  }
  for (const loc of chain) {
    if (store.loaded[loc] && store.loaded[loc][normalizedNs]) {
      const nsData = store.loaded[loc][normalizedNs]
      const value = getValueFromPath(nsData, normalizedKey)
      if (value !== undefined && value !== null) {
        return { found: true, value, locale: loc, namespace: normalizedNs }
      }
    }
  }
  return { found: false, value: key }
}

export function t(store, key, params = {}, options = {}) {
  const result = resolveKeyFromStore(store, key, options)
  if (!result.found) {
    return String(key)
  }
  return interpolate(result.value, params)
}

export function hasKey(store, key, options = {}) {
  const result = resolveKeyFromStore(store, key, options)
  return result.found
}

export function registerBundleInStore(store, locale, namespace, bundle, meta = {}) {
  const normalizedLocale = normalizeLocale(locale)
  const normalizedNs = normalizeNamespace(namespace)
  if (!normalizedLocale) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_LOCALE, locale),
    }
  }
  const localeCount = Object.keys(store.loaded).length
  if (!store.loaded[normalizedLocale] && localeCount >= MAX_NAMESPACES) {
    return {
      success: false,
      error: createError(ERROR_CODES.LOAD_FAILED, '超出最大命名空间限制'),
    }
  }
  if (!store.loaded[normalizedLocale]) {
    store.loaded[normalizedLocale] = {}
    store.namespaceMeta[normalizedLocale] = {}
  }
  const validation = validateTranslationSchemaBasic(bundle)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    }
  }
  store.loaded[normalizedLocale][normalizedNs] = bundle
  store.namespaceMeta[normalizedLocale][normalizedNs] = meta
  return { success: true }
}
