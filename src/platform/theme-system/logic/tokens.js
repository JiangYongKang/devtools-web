import { generateNeutralScale, generateSemanticColors } from './colorUtils.js'
import { CURRENT_THEME_SCHEMA_VERSION, DEFAULT_PRIMARY_HUE, DEFAULT_RADIUS, DOMAINS } from './constants.js'

export const SPACING_SCALE = {
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '3.5': '14px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
}

export const RADIUS_SCALE = {
  none: '0px',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
}

export const FONT_SCALE = {
  'xs': '0.75rem',
  'sm': '0.875rem',
  'base': '1rem',
  'lg': '1.125rem',
  'xl': '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
}

export const FONT_FAMILIES = {
  sans: "system-ui, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  mono: "ui-monospace, 'Cascadia Code', Consolas, monospace",
}

export const SHADOWS = {
  sm: '0 1px 2px rgba(15, 13, 20, 0.05)',
  base: '0 1px 2px rgba(15, 13, 20, 0.06), 0 8px 24px rgba(15, 13, 20, 0.06)',
  md: '0 4px 6px -1px rgba(15, 13, 20, 0.1), 0 2px 4px -1px rgba(15, 13, 20, 0.06)',
  lg: '0 10px 15px -3px rgba(15, 13, 20, 0.1), 0 4px 6px -2px rgba(15, 13, 20, 0.05)',
  xl: '0 20px 25px -5px rgba(15, 13, 20, 0.1), 0 10px 10px -5px rgba(15, 13, 20, 0.04)',
  '2xl': '0 25px 50px -12px rgba(15, 13, 20, 0.25)',
}

export const SHADOWS_DARK = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  base: '0 1px 2px rgba(0, 0, 0, 0.35), 0 8px 28px rgba(0, 0, 0, 0.45)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.45), 0 4px 6px -2px rgba(0, 0, 0, 0.25)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
}

export const MOTION = {
  '0': '0s',
  '75': '75ms',
  '100': '100ms',
  '150': '150ms',
  '200': '200ms',
  '300': '300ms',
  '500': '500ms',
  '700': '700ms',
  '1000': '1000ms',
}

export const Z_INDEX = {
  '0': '0',
  '10': '10',
  '20': '20',
  '30': '30',
  '40': '40',
  '50': '50',
}

function getSpacingWithPrefix(prefix) {
  const result = {}
  for (const [key, value] of Object.entries(SPACING_SCALE)) {
    result[`${prefix}-spacing-${key}`] = value
  }
  return result
}

function getRadiusWithPrefix(prefix, baseRadius = DEFAULT_RADIUS) {
  const result = {}
  const scale = baseRadius / DEFAULT_RADIUS
  
  for (const [key, value] of Object.entries(RADIUS_SCALE)) {
    if (key === 'none' || key === 'full') {
      result[`${prefix}-radius-${key}`] = value
    } else {
      const match = value.match(/(\d+(?:\.\d+)?)/)
      if (match) {
        const numValue = parseFloat(match[1])
        const scaledValue = Math.round(numValue * scale)
        result[`${prefix}-radius-${key}`] = value.replace(match[1], String(scaledValue))
      } else {
        result[`${prefix}-radius-${key}`] = value
      }
    }
  }
  return result
}

function getTypographyWithPrefix(prefix) {
  const result = {}
  for (const [key, value] of Object.entries(FONT_SCALE)) {
    result[`${prefix}-font-size-${key}`] = value
  }
  for (const [key, value] of Object.entries(FONT_FAMILIES)) {
    result[`${prefix}-font-family-${key}`] = value
  }
  return result
}

function getShadowsWithPrefix(prefix, isDark) {
  const shadows = isDark ? SHADOWS_DARK : SHADOWS
  const result = {}
  for (const [key, value] of Object.entries(shadows)) {
    result[`${prefix}-shadow-${key}`] = value
  }
  return result
}

function getMotionWithPrefix(prefix) {
  const result = {}
  for (const [key, value] of Object.entries(MOTION)) {
    result[`${prefix}-motion-${key}`] = value
  }
  return result
}

function getZIndexWithPrefix(prefix) {
  const result = {}
  for (const [key, value] of Object.entries(Z_INDEX)) {
    result[`${prefix}-z-${key}`] = value
  }
  return result
}

function generateColorTokens(baseHue, isDark) {
  const neutral = generateNeutralScale(isDark)
  const semantic = generateSemanticColors(baseHue, isDark)
  
  return {
    background: {
      default: isDark ? neutral[950] : neutral[50],
      muted: isDark ? neutral[900] : neutral[100],
      elevated: isDark ? neutral[800] : neutral[200],
    },
    surface: {
      default: isDark ? neutral[900] : neutral[50],
      elevated: isDark ? neutral[800] : neutral[100],
      elevatedHover: isDark ? neutral[700] : neutral[200],
      inset: isDark ? neutral[950] : neutral[200],
    },
    border: {
      default: isDark ? neutral[800] : neutral[200],
      muted: isDark ? neutral[700] : neutral[300],
      strong: isDark ? neutral[600] : neutral[400],
      divider: isDark ? `${neutral[700]}66` : `${neutral[200]}99`,
    },
    text: {
      default: isDark ? neutral[100] : neutral[800],
      muted: isDark ? neutral[400] : neutral[500],
      subtle: isDark ? neutral[500] : neutral[600],
      onPrimary: neutral[50],
      onInverse: isDark ? neutral[900] : neutral[50],
    },
    neutral,
    ...semantic,
  }
}

function flattenColorTokens(tokens, prefix) {
  const result = {}
  
  if (tokens.background) {
    for (const [key, value] of Object.entries(tokens.background)) {
      result[`${prefix}-background-${key}`] = value
    }
  }
  
  if (tokens.surface) {
    for (const [key, value] of Object.entries(tokens.surface)) {
      result[`${prefix}-surface-${key}`] = value
    }
  }
  
  if (tokens.border) {
    for (const [key, value] of Object.entries(tokens.border)) {
      result[`${prefix}-border-${key}`] = value
    }
  }
  
  if (tokens.text) {
    for (const [key, value] of Object.entries(tokens.text)) {
      result[`${prefix}-text-${key}`] = value
    }
  }
  
  if (tokens.neutral) {
    for (const [key, value] of Object.entries(tokens.neutral)) {
      result[`${prefix}-neutral-${key}`] = value
    }
  }
  
  for (const type of ['accent', 'success', 'warning', 'error', 'info']) {
    if (tokens[type]) {
      const semantic = tokens[type]
      if (semantic.scale) {
        for (const [key, value] of Object.entries(semantic.scale)) {
          result[`${prefix}-${type}-${key}`] = value
        }
      }
      for (const [key, value] of Object.entries(semantic)) {
        if (key !== 'scale') {
          result[`${prefix}-${type}-${key}`] = value
        }
      }
    }
  }
  
  return result
}

export function generateTokenSet(options = {}) {
  const {
    primaryHue = DEFAULT_PRIMARY_HUE,
    radiusBase = DEFAULT_RADIUS,
    isDark = false,
    domain = null,
  } = options
  
  const prefix = domain ? `${domain}` : ''
  
  const colorTokens = generateColorTokens(primaryHue, isDark)
  const flatColors = flattenColorTokens(colorTokens, prefix)
  
  const spacing = getSpacingWithPrefix(prefix)
  const radius = getRadiusWithPrefix(prefix, radiusBase)
  const typography = getTypographyWithPrefix(prefix)
  const shadows = getShadowsWithPrefix(prefix, isDark)
  const motion = getMotionWithPrefix(prefix)
  const zIndex = getZIndexWithPrefix(prefix)
  
  const tokens = {
    ...flatColors,
    ...spacing,
    ...radius,
    ...typography,
    ...shadows,
    ...motion,
    ...zIndex,
  }
  
  return tokens
}

export function generateLightTokenSet(options = {}) {
  return generateTokenSet({ ...options, isDark: false })
}

export function generateDarkTokenSet(options = {}) {
  return generateTokenSet({ ...options, isDark: true })
}

export function generateDomainTokenSets(domain, options = {}) {
  return {
    light: generateTokenSet({ ...options, isDark: false, domain }),
    dark: generateTokenSet({ ...options, isDark: true, domain }),
  }
}

export function getAllDomainsTokenSets(options = {}) {
  return {
    [DOMAINS.SHELL]: generateDomainTokenSets(DOMAINS.SHELL, options),
    [DOMAINS.TOOL]: generateDomainTokenSets(DOMAINS.TOOL, options),
    [DOMAINS.CODE]: generateDomainTokenSets(DOMAINS.CODE, options),
  }
}

export function tokensToCSSVars(tokens) {
  let css = ''
  for (const [key, value] of Object.entries(tokens)) {
    css += `  --${key}: ${value};\n`
  }
  return css.trim()
}

export function createThemeSchema(options = {}) {
  const {
    version = CURRENT_THEME_SCHEMA_VERSION,
    name = 'default',
    primaryHue = DEFAULT_PRIMARY_HUE,
    radiusBase = DEFAULT_RADIUS,
  } = options
  
  const lightTokens = generateLightTokenSet({ primaryHue, radiusBase })
  const darkTokens = generateDarkTokenSet({ primaryHue, radiusBase })
  
  return {
    version,
    name,
    primaryHue,
    radiusBase,
    tokens: {
      light: lightTokens,
      dark: darkTokens,
    },
    createdAt: new Date().toISOString(),
  }
}

export function getTokenKeys(tokens) {
  return Object.keys(tokens).sort()
}

export function validateTokenSetConsistency(tokens1, tokens2) {
  const keys1 = getTokenKeys(tokens1)
  const keys2 = getTokenKeys(tokens2)
  
  if (keys1.length !== keys2.length) {
    return {
      valid: false,
      missingIn2: keys1.filter(k => !keys2.includes(k)),
      missingIn1: keys2.filter(k => !keys1.includes(k)),
    }
  }
  
  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) {
      return {
        valid: false,
        mismatch: true,
      }
    }
  }
  
  return { valid: true }
}
