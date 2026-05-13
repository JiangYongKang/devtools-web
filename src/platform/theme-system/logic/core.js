import {
  THEMES,
  STORAGE_KEY,
  DEFAULT_PRIMARY_HUE,
  DEFAULT_RADIUS,
  SUPPORTED_SCHEMA_VERSIONS,
  ERROR_CODES,
} from './constants.js'
import { createError } from './errors.js'
import { isValidColor, extractHueFromColor } from './colorUtils.js'
import {
  generateLightTokenSet,
  generateDarkTokenSet,
  tokensToCSSVars,
  createThemeSchema,
  validateTokenSetConsistency,
} from './tokens.js'

export function resolveThemeMode(preference, systemDark) {
  if (preference === THEMES.SYSTEM) {
    return systemDark ? THEMES.DARK : THEMES.LIGHT
  }
  return preference
}

export function parseUrlParams(searchParams = {}) {
  const result = {
    theme: null,
    primaryHue: null,
    radiusBase: null,
    errors: [],
  }
  
  if (typeof searchParams.get === 'function') {
    const themeParam = searchParams.get('theme')
    const primaryColorParam = searchParams.get('primary')
    const radiusParam = searchParams.get('radius')
    
    if (themeParam !== null && themeParam !== undefined && themeParam !== '') {
      const normalized = themeParam.toLowerCase()
      if ([THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM].includes(normalized)) {
        result.theme = normalized
      } else {
        result.errors.push(createError(ERROR_CODES.INVALID_THEME, themeParam))
      }
    }
    
    if (primaryColorParam !== null && primaryColorParam !== undefined && primaryColorParam !== '') {
      if (isValidColor(primaryColorParam)) {
        result.primaryHue = extractHueFromColor(primaryColorParam)
      } else {
        result.errors.push(createError(ERROR_CODES.INVALID_COLOR, primaryColorParam))
      }
    }
    
    if (radiusParam !== null && radiusParam !== undefined && radiusParam !== '') {
      const radius = parseFloat(radiusParam)
      if (!isNaN(radius) && radius >= 0 && radius <= 9999) {
        result.radiusBase = radius
      } else {
        result.errors.push(createError(ERROR_CODES.INVALID_RADIUS, radiusParam))
      }
    }
  }
  
  return result
}

export function loadFromStorage(storage = null, key = STORAGE_KEY) {
  if (!storage || typeof storage.getItem !== 'function') {
    return null
  }
  
  try {
    const value = storage.getItem(key)
    if (!value) return null
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function saveToStorage(storage, data, key = STORAGE_KEY) {
  if (!storage || typeof storage.setItem !== 'function') {
    return { success: false }
  }
  
  try {
    storage.setItem(key, JSON.stringify(data))
    return { success: true }
  } catch {
    return { success: false }
  }
}

export function getSystemDarkPreference(windowObj = null) {
  if (!windowObj || typeof windowObj.matchMedia !== 'function') {
    return false
  }
  
  try {
    return windowObj.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function validateThemeSchema(themeData) {
  if (!themeData || typeof themeData !== 'object') {
    return { valid: false, ...createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '不是有效的对象') }
  }
  
  if (!themeData.version || !SUPPORTED_SCHEMA_VERSIONS.includes(themeData.version)) {
    return { valid: false, ...createError(ERROR_CODES.UNKNOWN_VERSION, themeData.version || 'undefined') }
  }
  
  if (!themeData.tokens || !themeData.tokens.light || !themeData.tokens.dark) {
    return { valid: false, ...createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '缺少 tokens 字段') }
  }
  
  const consistency = validateTokenSetConsistency(themeData.tokens.light, themeData.tokens.dark)
  if (!consistency.valid) {
    return { valid: false, ...createError(ERROR_CODES.SCHEMA_VALIDATION_FAILED, '亮/暗令牌键集不一致') }
  }
  
  return { valid: true }
}

export function resolveFinalConfig(options = {}) {
  const {
    urlParams = null,
    storageData = null,
    systemDark = false,
    defaults = {
      theme: THEMES.SYSTEM,
      primaryHue: DEFAULT_PRIMARY_HUE,
      radiusBase: DEFAULT_RADIUS,
    },
  } = options
  
  let themePreference = defaults.theme
  let primaryHue = defaults.primaryHue
  let radiusBase = defaults.radiusBase
  
  if (storageData) {
    if (storageData.theme) {
      themePreference = storageData.theme
    }
    if (typeof storageData.primaryHue === 'number') {
      primaryHue = storageData.primaryHue
    }
    if (typeof storageData.radiusBase === 'number') {
      radiusBase = storageData.radiusBase
    }
  }
  
  if (urlParams) {
    if (urlParams.theme) {
      themePreference = urlParams.theme
    }
    if (typeof urlParams.primaryHue === 'number') {
      primaryHue = urlParams.primaryHue
    }
    if (typeof urlParams.radiusBase === 'number') {
      radiusBase = urlParams.radiusBase
    }
  }
  
  const resolvedTheme = resolveThemeMode(themePreference, systemDark)
  
  return {
    themePreference,
    resolvedTheme,
    primaryHue,
    radiusBase,
    systemDark,
  }
}

export function generateThemeForMode(mode, options = {}) {
  const { primaryHue = DEFAULT_PRIMARY_HUE, radiusBase = DEFAULT_RADIUS } = options
  
  const isDark = mode === THEMES.DARK
  
  if (isDark) {
    return generateDarkTokenSet({ primaryHue, radiusBase })
  }
  return generateLightTokenSet({ primaryHue, radiusBase })
}

export function generateCssCustomProperties(tokens, selector = ':root') {
  const vars = tokensToCSSVars(tokens)
  return `${selector} {\n${vars}\n}`
}

export function getCriticalInlineScript(options = {}) {
  const { storageKey = STORAGE_KEY } = options
  
  return `
(function() {
  try {
    var key = '${storageKey}';
    var stored = null;
    
    try {
      stored = localStorage.getItem(key);
      if (stored) {
        stored = JSON.parse(stored);
      }
    } catch(e) {
      stored = null;
    }
    
    var theme = stored && stored.theme ? stored.theme : 'system';
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    
    var html = document.documentElement;
    html.setAttribute('data-theme', resolved);
    html.setAttribute('data-theme-preference', theme);
    
    if (stored && typeof stored.primaryHue === 'number') {
      html.setAttribute('data-primary-hue', stored.primaryHue);
    }
    if (stored && typeof stored.radiusBase === 'number') {
      html.setAttribute('data-radius', stored.radiusBase);
    }
  } catch(e) {}
})();
`.trim()
}

export function buildThemeManifest(options = {}) {
  return createThemeSchema(options)
}

export function extractTokensByCategory(tokens, category) {
  const categoryPrefixMap = {
    background: 'background-',
    surface: 'surface-',
    border: 'border-',
    semantic: ['accent-', 'success-', 'warning-', 'error-', 'info-'],
    spacing: 'spacing-',
    radius: 'radius-',
    typography: ['font-size-', 'font-family-'],
    shadow: 'shadow-',
    motion: 'motion-',
    zIndex: 'z-',
  }
  
  const prefixes = categoryPrefixMap[category]
  if (!prefixes) return {}
  
  const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes]
  const result = {}
  
  for (const [key, value] of Object.entries(tokens)) {
    for (const prefix of prefixList) {
      if (key.startsWith(prefix) || key.includes(prefix.replace('-', ''))) {
        result[key] = value
        break
      }
    }
  }
  
  return result
}

export function searchTokens(tokens, query) {
  if (!query || typeof query !== 'string') {
    return tokens
  }
  
  const q = query.toLowerCase().trim()
  if (!q) return tokens
  
  const result = {}
  for (const [key, value] of Object.entries(tokens)) {
    if (key.toLowerCase().includes(q) || value.toLowerCase().includes(q)) {
      result[key] = value
    }
  }
  
  return result
}

export function filterTokens(tokens, options = {}) {
  let result = { ...tokens }
  
  if (options.search) {
    result = searchTokens(result, options.search)
  }
  
  if (options.category) {
    result = extractTokensByCategory(result, options.category)
  }
  
  return result
}
