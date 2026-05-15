import { DEFAULT_FALLBACK_LOCALE, DEFAULT_LOCALE } from './constants.js'

export function preloadLocale() {
  return Promise.resolve({ success: true, preloaded: false, noop: true })
}

export function createSyncI18n(bundles, options = {}) {
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
  if (bundles && typeof bundles === 'object') {
    for (const [locale, namespaces] of Object.entries(bundles)) {
      if (namespaces && typeof namespaces === 'object') {
        store.loaded[locale] = {}
        store.namespaceMeta[locale] = {}
        for (const [ns, data] of Object.entries(namespaces)) {
          if (data && typeof data === 'object') {
            store.loaded[locale][ns] = data
            store.namespaceMeta[locale][ns] = {}
          }
        }
      }
    }
  }
  return {
    getLocale: () => store.locale,
    setLocale: (locale) => {
      if (locale && typeof locale === 'string') {
        store.locale = locale
      }
      return store.locale
    },
    t: (key, params = {}, opts = {}) => {
      const {
        namespace = 'common',
        locale = store.locale,
        fallbackLocale = store.fallbackLocale,
        namespaceKeySeparator = ':',
      } = opts
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
      for (const loc of chain) {
        if (store.loaded[loc] && store.loaded[loc][actualNs]) {
          const nsData = store.loaded[loc][actualNs]
          let value
          if (actualKey in nsData) {
            value = nsData[actualKey]
          } else {
            const parts = actualKey.split('.')
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
            const strValue = String(value)
            if (params && Object.keys(params).length > 0) {
              return strValue.replace(/\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g, (match, name) => {
                if (name in params) {
                  const v = params[name]
                  return v === null || v === undefined ? '' : String(v)
                }
                return match
              })
            }
            return strValue
          }
        }
      }
      return String(key)
    },
    hasKey: (key, opts = {}) => {
      const {
        namespace = 'common',
        locale = store.locale,
        fallbackLocale = store.fallbackLocale,
        namespaceKeySeparator = ':',
      } = opts
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
      for (const loc of chain) {
        if (store.loaded[loc] && store.loaded[loc][actualNs]) {
          const nsData = store.loaded[loc][actualNs]
          if (actualKey in nsData) {
            return true
          }
          const parts = actualKey.split('.')
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
            return true
          }
        }
      }
      return false
    },
  }
}
