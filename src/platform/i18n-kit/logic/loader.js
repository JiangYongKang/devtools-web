import {
  DEFAULT_LOAD_TIMEOUT_MS,
  DEFAULT_NAMESPACE,
  ERROR_CODES,
} from './constants.js'
import { createError } from './errors.js'
import { normalizeLocale, normalizeNamespace, registerBundleInStore } from './core.js'
import { validatePatch } from './validators.js'

export function buildUrl(baseUrl, locale, namespace) {
  const normalizedLocale = normalizeLocale(locale)
  const normalizedNs = normalizeNamespace(namespace)
  if (!normalizedLocale) {
    return null
  }
  let base = baseUrl || '/locales'
  if (base.endsWith('/')) {
    base = base.slice(0, -1)
  }
  return `${base}/${encodeURIComponent(normalizedLocale)}/${encodeURIComponent(normalizedNs)}.json`
}

async function fetchJsonWithTimeout(url, timeoutMs, abortSignal = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let signal = controller.signal
    if (abortSignal) {
      signal = abortSignal
      clearTimeout(timeoutId)
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal,
    })
    if (response.status === 304) {
      return { status: 304, data: null }
    }
    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json') || contentType.includes('json')
    if (response.status === 204) {
      return { status: 204, data: null }
    }
    if (!response.ok) {
      return { status: response.status, error: `HTTP ${response.status}`, data: null }
    }
    let data = null
    const text = await response.text()
    if (!text || text.trim().length === 0) {
      return { status: response.status, data: null }
    }
    if (isJson) {
      data = JSON.parse(text)
    } else {
      data = text
    }
    return { status: response.status, data, error: null }
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return { status: 0, error: '请求超时或取消', data: null }
    }
    return { status: 0, error: err ? err.message : '网络错误', data: null }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function loadNamespaceBundle(options = {}) {
  const {
    baseUrl = '/locales',
    locale,
    namespace = DEFAULT_NAMESPACE,
    timeoutMs = DEFAULT_LOAD_TIMEOUT_MS,
    validate = true,
    abortSignal = null,
    existingMeta = null,
    requireChecksum = false,
    requireVersion = false,
  } = options
  const normalizedLocale = normalizeLocale(locale)
  const normalizedNs = normalizeNamespace(namespace)
  if (!normalizedLocale) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_LOCALE, locale),
    }
  }
  const url = buildUrl(baseUrl, normalizedLocale, normalizedNs)
  const fetchResult = await fetchJsonWithTimeout(url, timeoutMs, abortSignal)
  if (fetchResult.status === 304) {
    return { success: true, notModified: true, data: null, locale: normalizedLocale, namespace: normalizedNs }
  }
  if (fetchResult.status === 204 || fetchResult.data === null) {
    return {
      success: false,
      error: createError(ERROR_CODES.LOAD_FAILED, `空响应 (${fetchResult.status})`),
    }
  }
  if (fetchResult.error) {
    return {
      success: false,
      error: createError(ERROR_CODES.NETWORK_ERROR, fetchResult.error),
    }
  }
  if (typeof fetchResult.data !== 'object') {
    return {
      success: false,
      error: createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '响应不是对象'),
    }
  }
  let patchValidation = null
  if (validate) {
    patchValidation = validatePatch(existingMeta, fetchResult.data, { requireChecksum, requireVersion })
    if (!patchValidation.valid) {
      return {
        success: false,
        error: patchValidation.error,
      }
    }
  }
  return {
    success: true,
    data: fetchResult.data,
    locale: normalizedLocale,
    namespace: normalizedNs,
    newVersion: patchValidation && patchValidation.newVersion,
  }
}


export async function ensureNamespace(store, options = {}) {
  const {
    baseUrl = '/locales',
    locale = store.locale,
    namespace = DEFAULT_NAMESPACE,
    timeoutMs = DEFAULT_LOAD_TIMEOUT_MS,
    validate = true,
    abortSignal = null,
    fallbackOnFailure = true,
    fallbackLocale = store.fallbackLocale,
  } = options
  const normalizedLocale = normalizeLocale(locale)
  const normalizedNs = normalizeNamespace(namespace)
  if (!normalizedLocale) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_LOCALE, locale),
    }
  }
  if (store.loaded[normalizedLocale] && store.loaded[normalizedLocale][normalizedNs]) {
    return { success: true, cached: true }
  }
  const loadOptions = {
    baseUrl,
    locale: normalizedLocale,
    namespace: normalizedNs,
    timeoutMs,
    validate,
    abortSignal,
    existingMeta:
      store.namespaceMeta[normalizedLocale] && store.namespaceMeta[normalizedLocale][normalizedNs],
  }
  const result = await loadNamespaceBundle(loadOptions)
  if (result.success && !result.notModified) {
    registerBundleInStore(
      store,
      result.locale,
      result.namespace,
      result.data,
      result.newVersion ? { version: result.newVersion } : {}
    )
  }
  if (!result.success && fallbackOnFailure) {
    const normalizedFallback = normalizeLocale(fallbackLocale)
    if (normalizedFallback && normalizedFallback !== normalizedLocale) {
      const fallbackResult = await ensureNamespace(store, {
        ...options,
        locale: normalizedFallback,
        fallbackOnFailure: false,
      })
      return {
        success: fallbackResult.success,
        fallbackUsed: true,
        fallbackLocale: normalizedFallback,
        originalError: result.error,
      }
    }
  }
  return result
}

export function unloadNamespace(store, locale, namespace) {
  const normalizedLocale = normalizeLocale(locale)
  const normalizedNs = normalizeNamespace(namespace)
  if (normalizedLocale && store.loaded[normalizedLocale]) {
    delete store.loaded[normalizedLocale][normalizedNs]
    if (store.namespaceMeta[normalizedLocale]) {
      delete store.namespaceMeta[normalizedLocale][normalizedNs]
    }
  }
}

export function clearStore(store) {
  store.loaded = {}
  store.namespaceMeta = {}
}
