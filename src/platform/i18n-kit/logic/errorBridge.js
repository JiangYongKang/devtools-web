import { DEFAULT_NAMESPACE } from './constants.js'

export function localizeMappedError(i18nStore, mapped, options = {}) {
  const {
    namespace = DEFAULT_NAMESPACE,
    namespaceKeySeparator = ':',
    titleKeyPrefix = 'errors.',
    detailKeyPrefix = 'errors.',
  } = options
  if (!mapped) {
    return null
  }
  const result = { ...mapped }
  const errorCode = mapped.errorCode
  if (errorCode && typeof errorCode === 'string') {
    const tKey = `${namespace}${namespaceKeySeparator}${titleKeyPrefix}${errorCode}`
    const tDetailKey = `${namespace}${namespaceKeySeparator}${detailKeyPrefix}${errorCode}_detail`
    let hasTitleKey = false
    let hasDetailKey = false
    let keyToUse
    let detailKeyToUse
    const store = i18nStore
    const chain = [store.locale]
    if (store.fallbackLocale && store.fallbackLocale !== store.locale) {
      chain.push(store.fallbackLocale)
    }
    const normalizedNs = namespace
    if (store.loaded) {
      for (const loc of chain) {
        if (store.loaded[loc] && store.loaded[loc][normalizedNs]) {
          const nsData = store.loaded[loc][normalizedNs]
          const titlePath = `${titleKeyPrefix}${errorCode}`
          const detailPath = `${detailKeyPrefix}${errorCode}_detail`
          const checkPath = (obj, p) => {
            if (!obj || typeof obj !== 'object') return false
            if (p in obj) return true
            const parts = p.split('.')
            let current = obj
            for (const part of parts) {
              if (!current || typeof current !== 'object' || !(part in current)) {
                return false
              }
              current = current[part]
            }
            return true
          }
          if (!hasTitleKey && checkPath(nsData, titlePath)) {
            hasTitleKey = true
            keyToUse = tKey
          }
          if (!hasDetailKey && checkPath(nsData, detailPath)) {
            hasDetailKey = true
            detailKeyToUse = tDetailKey
          }
        }
      }
    }
    if (hasTitleKey && keyToUse) {
      const params = {}
      if (mapped.originalInput) {
        Object.assign(params, mapped.originalInput)
      }
      result.userTitle = resolveKey(i18nStore, keyToUse, params, options) || result.userTitle
    }
    if (hasDetailKey && detailKeyToUse) {
      const params = {}
      if (mapped.originalInput) {
        Object.assign(params, mapped.originalInput)
      }
      result.userDetail = resolveKey(i18nStore, detailKeyToUse, params, options) || result.userDetail
    }
  }
  return result
}

function resolveKey(store, key, params = {}, options = {}) {
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
  const chain = []
  if (locale) chain.push(locale)
  if (fallbackLocale && fallbackLocale !== locale) chain.push(fallbackLocale)
  const normalizedNs = actualNs
  const normalizedKey = actualKey
  if (!normalizedKey) {
    return null
  }
  for (const loc of chain) {
    if (store.loaded[loc] && store.loaded[loc][normalizedNs]) {
      const nsData = store.loaded[loc][normalizedNs]
      let value
      if (normalizedKey in nsData) {
        value = nsData[normalizedKey]
      } else {
        const parts = normalizedKey.split('.')
        let current = nsData
        let found = true
        for (const part of parts) {
          if (!current || typeof current !== 'object' || !(part in current)) {
            found = false
            break
          }
          current = current[part]
        }
        if (found) {
          value = current
        }
      }
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' && params && Object.keys(params).length > 0) {
          return value.replace(/\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g, (match, name) => {
            if (name in params) {
              const v = params[name]
              return v === null || v === undefined ? '' : String(v)
            }
            return match
          })
        }
        return String(value)
      }
    }
  }
  return null
}

export function localizeRecoveryHints(i18nStore, hints, options = {}) {
  if (!Array.isArray(hints)) {
    return hints
  }
  return hints.map((hint) => {
    if (typeof hint !== 'string') {
      return hint
    }
    const resolved = resolveKey(i18nStore, hint, {}, options)
    return resolved || hint
  })
}
