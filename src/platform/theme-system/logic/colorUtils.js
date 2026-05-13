import { ERROR_CODES, DEFAULT_PRIMARY_HUE, DEFAULT_PRIMARY_SATURATION } from './constants.js'
import { createError } from './errors.js'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function parseHex(input) {
  const trimmed = input.trim()
  const match = trimmed.match(/^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  if (!match) return null
  
  let hex = match[1]
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.split('').map(c => c + c).join('')
  }
  
  const hasAlpha = hex.length === 8
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const a = hasAlpha ? parseInt(hex.substring(6, 8), 16) / 255 : 1
  
  return { r, g, b, a }
}

function parseRgb(input) {
  const trimmed = input.trim()
  const rgbaMatch = trimmed.match(/^rgba?\(\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*(?:,\s*(\d+(?:\.\d+)?)\s*|\/\s*(\d+(?:\.\d+)?)\s*)?\)$/i)
  if (!rgbaMatch) return null
  
  const [, rStr, gStr, bStr, commaAlpha, slashAlpha] = rgbaMatch
  const alphaStr = commaAlpha || slashAlpha
  
  const parseValue = (str, max) => {
    if (str.endsWith('%')) {
      const val = parseFloat(str)
      return (val / 100) * max
    }
    return parseFloat(str)
  }
  
  const r = parseValue(rStr, 255)
  const g = parseValue(gStr, 255)
  const b = parseValue(bStr, 255)
  const a = alphaStr ? parseFloat(alphaStr) : 1
  
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255 || a < 0 || a > 1) {
    return null
  }
  
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a }
}

function parseHsl(input) {
  const trimmed = input.trim()
  const hslaMatch = trimmed.match(/^hsla?\(\s*(\d+(?:\.\d+)?)(?:deg)?\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*(\d+(?:\.\d+)?)\s*|\/\s*(\d+(?:\.\d+)?)\s*)?\)$/i)
  if (!hslaMatch) return null
  
  const [, hStr, sStr, lStr, commaAlpha, slashAlpha] = hslaMatch
  const alphaStr = commaAlpha || slashAlpha
  
  const h = parseFloat(hStr) % 360
  const s = parseFloat(sStr)
  const l = parseFloat(lStr)
  const a = alphaStr ? parseFloat(alphaStr) : 1
  
  if (h < 0 || s < 0 || s > 100 || l < 0 || l > 100 || a < 0 || a > 1) {
    return null
  }
  
  return { h: h < 0 ? h + 360 : h, s, l, a }
}

export function isValidColor(input) {
  if (!input || typeof input !== 'string') return false
  const trimmed = input.trim()
  if (!trimmed) return false
  
  if (parseHex(trimmed)) return true
  if (parseRgb(trimmed)) return true
  if (parseHsl(trimmed)) return true
  
  return false
}

export function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2
  
  if (max === min) {
    h = 0
    s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  }
}

export function rgbToHex(r, g, b, a = null) {
  const toHex = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')
  let hex = '#' + toHex(r) + toHex(g) + toHex(b)
  if (a !== null && a >= 0 && a < 1) {
    hex += toHex(a * 255)
  }
  return hex
}

export function normalizeColorToRgb(input) {
  if (!isValidColor(input)) {
    return { success: false, ...createError(ERROR_CODES.INVALID_COLOR, input) }
  }
  
  const trimmed = input.trim()
  
  const hex = parseHex(trimmed)
  if (hex) {
    return { success: true, ...hex }
  }
  
  const rgb = parseRgb(trimmed)
  if (rgb) {
    return { success: true, ...rgb }
  }
  
  const hsl = parseHsl(trimmed)
  if (hsl) {
    const rgbResult = hslToRgb(hsl.h, hsl.s, hsl.l)
    return { success: true, ...rgbResult, a: hsl.a }
  }
  
  return { success: false, ...createError(ERROR_CODES.INVALID_COLOR, input) }
}

export function extractHueFromColor(input) {
  const rgbResult = normalizeColorToRgb(input)
  if (!rgbResult.success) {
    return DEFAULT_PRIMARY_HUE
  }
  const hsl = rgbToHsl(rgbResult.r, rgbResult.g, rgbResult.b)
  return hsl.h
}

export function generateColorScale(baseHue, isDark = false) {
  const hue = clamp(baseHue, 0, 360)
  const saturation = DEFAULT_PRIMARY_SATURATION
  
  const scale = {}
  
  if (!isDark) {
    scale[50] = hslToRgb(hue, saturation, 97)
    scale[100] = hslToRgb(hue, saturation, 94)
    scale[200] = hslToRgb(hue, saturation, 86)
    scale[300] = hslToRgb(hue, saturation, 77)
    scale[400] = hslToRgb(hue, saturation, 66)
    scale[500] = hslToRgb(hue, saturation, 57)
    scale[600] = hslToRgb(hue, saturation, 48)
    scale[700] = hslToRgb(hue, saturation, 41)
    scale[800] = hslToRgb(hue, saturation, 34)
    scale[900] = hslToRgb(hue, saturation, 28)
    scale[950] = hslToRgb(hue, saturation, 18)
  } else {
    scale[50] = hslToRgb(hue, saturation, 98)
    scale[100] = hslToRgb(hue, saturation, 94)
    scale[200] = hslToRgb(hue, saturation, 88)
    scale[300] = hslToRgb(hue, saturation, 80)
    scale[400] = hslToRgb(hue, saturation, 70)
    scale[500] = hslToRgb(hue, saturation, 60)
    scale[600] = hslToRgb(hue, saturation, 52)
    scale[700] = hslToRgb(hue, saturation, 45)
    scale[800] = hslToRgb(hue, saturation, 38)
    scale[900] = hslToRgb(hue, saturation, 32)
    scale[950] = hslToRgb(hue, saturation, 22)
  }
  
  const hexScale = {}
  for (const [level, rgb] of Object.entries(scale)) {
    hexScale[level] = rgbToHex(rgb.r, rgb.g, rgb.b)
  }
  
  return hexScale
}

export function relativeLuminance(r, g, b) {
  const sRgb = [r, g, b].map(v => v / 255)
  const rgbLinear = sRgb.map(v => 
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  )
  return 0.2126 * rgbLinear[0] + 0.7152 * rgbLinear[1] + 0.0722 * rgbLinear[2]
}

export function contrastRatio(color1, color2) {
  const rgb1 = normalizeColorToRgb(color1)
  const rgb2 = normalizeColorToRgb(color2)
  
  if (!rgb1.success || !rgb2.success) {
    return { success: false, ratio: null }
  }
  
  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  const ratio = (lighter + 0.05) / (darker + 0.05)
  
  return {
    success: true,
    ratio: Number(ratio.toFixed(2)),
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  }
}

export function generateNeutralScale(isDark = false) {
  const scale = {}
  
  if (!isDark) {
    scale[50] = rgbToHex(252, 252, 253)
    scale[100] = rgbToHex(245, 244, 248)
    scale[200] = rgbToHex(232, 230, 236)
    scale[300] = rgbToHex(212, 208, 220)
    scale[400] = rgbToHex(168, 162, 180)
    scale[500] = rgbToHex(139, 132, 153)
    scale[600] = rgbToHex(107, 99, 123)
    scale[700] = rgbToHex(86, 78, 99)
    scale[800] = rgbToHex(63, 56, 74)
    scale[900] = rgbToHex(42, 37, 51)
    scale[950] = rgbToHex(24, 21, 31)
  } else {
    scale[50] = rgbToHex(248, 247, 250)
    scale[100] = rgbToHex(240, 238, 245)
    scale[200] = rgbToHex(224, 220, 232)
    scale[300] = rgbToHex(200, 194, 212)
    scale[400] = rgbToHex(152, 143, 170)
    scale[500] = rgbToHex(124, 115, 145)
    scale[600] = rgbToHex(92, 84, 109)
    scale[700] = rgbToHex(69, 63, 85)
    scale[800] = rgbToHex(48, 43, 60)
    scale[900] = rgbToHex(28, 25, 36)
    scale[950] = rgbToHex(15, 13, 20)
  }
  
  return scale
}

export function generateSemanticColors(baseHue, isDark = false) {
  const accentScale = generateColorScale(baseHue, isDark)
  
  const successHue = 142
  const warningHue = 38
  const errorHue = 0
  const infoHue = 217
  
  const successScale = generateColorScale(successHue, isDark)
  const warningScale = generateColorScale(warningHue, isDark)
  const errorScale = generateColorScale(errorHue, isDark)
  const infoScale = generateColorScale(infoHue, isDark)
  
  return {
    accent: {
      scale: accentScale,
      default: isDark ? accentScale[400] : accentScale[600],
      hover: isDark ? accentScale[300] : accentScale[700],
      active: isDark ? accentScale[500] : accentScale[800],
      surface: isDark ? `${accentScale[900]}1f` : `${accentScale[100]}cc`,
      border: isDark ? accentScale[800] : accentScale[200],
      text: isDark ? accentScale[200] : accentScale[700],
    },
    success: {
      scale: successScale,
      default: isDark ? successScale[400] : successScale[600],
      hover: isDark ? successScale[300] : successScale[700],
      active: isDark ? successScale[500] : successScale[800],
      surface: isDark ? `${successScale[900]}1f` : `${successScale[100]}cc`,
      border: isDark ? successScale[800] : successScale[200],
      text: isDark ? successScale[200] : successScale[700],
    },
    warning: {
      scale: warningScale,
      default: isDark ? warningScale[400] : warningScale[600],
      hover: isDark ? warningScale[300] : warningScale[700],
      active: isDark ? warningScale[500] : warningScale[800],
      surface: isDark ? `${warningScale[900]}1f` : `${warningScale[100]}cc`,
      border: isDark ? warningScale[800] : warningScale[200],
      text: isDark ? warningScale[200] : warningScale[700],
    },
    error: {
      scale: errorScale,
      default: isDark ? errorScale[400] : errorScale[600],
      hover: isDark ? errorScale[300] : errorScale[700],
      active: isDark ? errorScale[500] : errorScale[800],
      surface: isDark ? `${errorScale[900]}1f` : `${errorScale[100]}cc`,
      border: isDark ? errorScale[800] : errorScale[200],
      text: isDark ? errorScale[200] : errorScale[700],
    },
    info: {
      scale: infoScale,
      default: isDark ? infoScale[400] : infoScale[600],
      hover: isDark ? infoScale[300] : infoScale[700],
      active: isDark ? infoScale[500] : infoScale[800],
      surface: isDark ? `${infoScale[900]}1f` : `${infoScale[100]}cc`,
      border: isDark ? infoScale[800] : infoScale[200],
      text: isDark ? infoScale[200] : infoScale[700],
    },
  }
}
