const ERROR_CODES = {
  NULL_INPUT: 'NULL_INPUT',
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_FORMAT: 'INVALID_FORMAT',
  UNSUPPORTED_NOTATION: 'UNSUPPORTED_NOTATION',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  BATCH_SIZE_EXCEEDED: 'BATCH_SIZE_EXCEEDED',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.NULL_INPUT]: '输入值为 null 或 undefined',
  [ERROR_CODES.EMPTY_INPUT]: '输入值为空字符串',
  [ERROR_CODES.INVALID_FORMAT]: '颜色格式无效',
  [ERROR_CODES.UNSUPPORTED_NOTATION]: '不支持的目标格式',
  [ERROR_CODES.OUT_OF_RANGE]: '颜色值超出有效范围',
  [ERROR_CODES.BATCH_SIZE_EXCEEDED]: '批量转换数量超出限制',
  [ERROR_CODES.INVALID_PARAMETER]: '参数无效',
}

const NOTATIONS = {
  HEX: 'hex',
  RGB: 'rgb',
  RGBA: 'rgba',
  HSL: 'hsl',
  HSLA: 'hsla',
}

const SUPPORTED_TARGET_NOTATIONS = [
  NOTATIONS.HEX,
  NOTATIONS.RGB,
  NOTATIONS.RGBA,
  NOTATIONS.HSL,
  NOTATIONS.HSLA,
]

const ROUNDING_MODES = {
  ROUND: 'round',
  FLOOR: 'floor',
  CEIL: 'ceil',
  TRUNC: 'trunc',
}

const CLAMPING_MODES = {
  CLAMP: 'clamp',
  REJECT: 'reject',
}

const MAX_BATCH_SIZE = 100

function createError(code, details = null) {
  return {
    errorCode: code,
    errorMessage: details ? `${ERROR_MESSAGES[code]}: ${details}` : ERROR_MESSAGES[code],
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function roundValue(value, mode = ROUNDING_MODES.ROUND) {
  switch (mode) {
    case ROUNDING_MODES.FLOOR:
      return Math.floor(value)
    case ROUNDING_MODES.CEIL:
      return Math.ceil(value)
    case ROUNDING_MODES.TRUNC:
      return Math.trunc(value)
    case ROUNDING_MODES.ROUND:
    default:
      return Math.round(value)
  }
}

function isNumberInRange(value, min, max) {
  const num = parseFloat(value)
  return !isNaN(num) && num >= min && num <= max
}

function parseHex(input) {
  const trimmed = input.trim()
  const match = trimmed.match(/^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  
  if (!match) return null
  
  let hex = match[1]
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  } else if (hex.length === 4) {
    hex = hex.split('').map(c => c + c).join('')
  }
  
  const hasAlpha = hex.length === 8
  
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const a = hasAlpha ? parseInt(hex.substring(6, 8), 16) / 255 : 1
  
  return {
    valid: true,
    notation: hasAlpha ? NOTATIONS.RGBA : NOTATIONS.RGB,
    normalizedColor: hasAlpha ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`,
    hex: {
      value: '#' + hex.toLowerCase(),
      r,
      g,
      b,
      a: hasAlpha ? a : null,
    },
    rgb: {
      r,
      g,
      b,
      a: hasAlpha ? a : null,
    },
    hsl: null,
  }
}

function parseRgb(input) {
  const trimmed = input.trim()
  
  const rgbaMatch = trimmed.match(/^rgba?\(\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*(?:,\s*(\d+(?:\.\d+)?)\s*|\/\s*(\d+(?:\.\d+)?)\s*)?\)$/i)
  if (!rgbaMatch) return null
  
  const [, rStr, gStr, bStr, commaAlpha, slashAlpha] = rgbaMatch
  const alphaStr = commaAlpha || slashAlpha
  const isRgba = !!alphaStr
  
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
  
  if (!isNumberInRange(r, 0, 255) || !isNumberInRange(g, 0, 255) || !isNumberInRange(b, 0, 255)) {
    return {
      valid: false,
      ...createError(ERROR_CODES.OUT_OF_RANGE, 'RGB 值应在 0-255 范围内'),
    }
  }
  
  if (a < 0 || a > 1) {
    return {
      valid: false,
      ...createError(ERROR_CODES.OUT_OF_RANGE, 'Alpha 值应在 0-1 范围内'),
    }
  }
  
  const rInt = Math.round(r)
  const gInt = Math.round(g)
  const bInt = Math.round(b)
  
  const hexR = rInt.toString(16).padStart(2, '0')
  const hexG = gInt.toString(16).padStart(2, '0')
  const hexB = bInt.toString(16).padStart(2, '0')
  const hexA = a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''
  
  return {
    valid: true,
    notation: isRgba ? NOTATIONS.RGBA : NOTATIONS.RGB,
    normalizedColor: isRgba ? `rgba(${rInt}, ${gInt}, ${bInt}, ${a})` : `rgb(${rInt}, ${gInt}, ${bInt})`,
    hex: {
      value: '#' + hexR + hexG + hexB + hexA,
      r: rInt,
      g: gInt,
      b: bInt,
      a: isRgba ? a : null,
    },
    rgb: {
      r: rInt,
      g: gInt,
      b: bInt,
      a: isRgba ? a : null,
    },
    hsl: null,
  }
}

function parseHsl(input) {
  const trimmed = input.trim()
  
  const hslaMatch = trimmed.match(/^hsla?\(\s*(\d+(?:\.\d+)?)(?:deg)?\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*(\d+(?:\.\d+)?)\s*|\/\s*(\d+(?:\.\d+)?)\s*)?\)$/i)
  if (!hslaMatch) return null
  
  const [, hStr, sStr, lStr, commaAlpha, slashAlpha] = hslaMatch
  const alphaStr = commaAlpha || slashAlpha
  const isHsla = !!alphaStr
  
  const h = parseFloat(hStr) % 360
  const s = parseFloat(sStr)
  const l = parseFloat(lStr)
  const a = alphaStr ? parseFloat(alphaStr) : 1
  
  if (h < 0 || s < 0 || s > 100 || l < 0 || l > 100) {
    return {
      valid: false,
      ...createError(ERROR_CODES.OUT_OF_RANGE, 'HSL 值超出有效范围'),
    }
  }
  
  if (a < 0 || a > 1) {
    return {
      valid: false,
      ...createError(ERROR_CODES.OUT_OF_RANGE, 'Alpha 值应在 0-1 范围内'),
    }
  }
  
  return {
    valid: true,
    notation: isHsla ? NOTATIONS.HSLA : NOTATIONS.HSL,
    normalizedColor: isHsla ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`,
    hex: null,
    rgb: null,
    hsl: {
      h,
      s,
      l,
      a: isHsla ? a : null,
    },
  }
}

function hslToRgb(h, s, l) {
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

function rgbToHsl(r, g, b) {
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

function rgbToHex(r, g, b, a = null) {
  const toHex = (n) => n.toString(16).padStart(2, '0')
  let hex = '#' + toHex(r) + toHex(g) + toHex(b)
  if (a !== null && a < 1) {
    hex += toHex(Math.round(a * 255))
  }
  return hex
}

function normalizeColor(input) {
  if (input === null || input === undefined) {
    return {
      valid: false,
      ...createError(ERROR_CODES.NULL_INPUT),
    }
  }
  
  const trimmed = typeof input === 'string' ? input.trim() : String(input).trim()
  
  if (trimmed === '') {
    return {
      valid: false,
      ...createError(ERROR_CODES.EMPTY_INPUT),
    }
  }
  
  let result = parseHex(trimmed)
  if (result !== null) {
    if (result.valid) {
      const hsl = rgbToHsl(result.rgb.r, result.rgb.g, result.rgb.b)
      result.hsl = {
        ...hsl,
        a: result.rgb.a,
      }
    }
    return result
  }
  
  result = parseRgb(trimmed)
  if (result !== null) {
    if (result.valid) {
      const hsl = rgbToHsl(result.rgb.r, result.rgb.g, result.rgb.b)
      result.hsl = {
        ...hsl,
        a: result.rgb.a,
      }
    }
    return result
  }
  
  result = parseHsl(trimmed)
  if (result !== null) {
    if (result.valid) {
      const rgb = hslToRgb(result.hsl.h, result.hsl.s, result.hsl.l)
      result.rgb = {
        ...rgb,
        a: result.hsl.a,
      }
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b, result.hsl.a)
      result.hex = {
        value: hex,
        ...rgb,
        a: result.hsl.a,
      }
    }
    return result
  }
  
  return {
    valid: false,
    ...createError(ERROR_CODES.INVALID_FORMAT),
  }
}

function convertColor(input, options = {}) {
  const {
    targetNotation = NOTATIONS.HEX,
    includeAlpha = null,
  } = options
  
  if (!SUPPORTED_TARGET_NOTATIONS.includes(targetNotation)) {
    return {
      valid: false,
      ...createError(ERROR_CODES.UNSUPPORTED_NOTATION, targetNotation),
    }
  }
  
  const parsed = normalizeColor(input)
  
  if (!parsed.valid) {
    return {
      ...parsed,
      originalColor: input,
      originalNotation: null,
      targetNotation,
    }
  }
  
  const originalNotation = parsed.notation
  const { r, g, b } = parsed.rgb
  const alpha = parsed.rgb.a
  const hasAlpha = alpha !== null && alpha < 1
  const shouldIncludeAlpha = includeAlpha === null ? hasAlpha : includeAlpha
  
  let convertedColor
  let normalizedColor
  let hex
  let rgb
  let hsl
  
  const hslVals = rgbToHsl(r, g, b)
  
  switch (targetNotation) {
    case NOTATIONS.HEX:
      if (shouldIncludeAlpha) {
        convertedColor = rgbToHex(r, g, b, alpha)
        normalizedColor = `rgba(${r}, ${g}, ${b}, ${alpha})`
      } else {
        convertedColor = rgbToHex(r, g, b)
        normalizedColor = `rgb(${r}, ${g}, ${b})`
      }
      hex = { value: convertedColor, r, g, b, a: shouldIncludeAlpha ? alpha : null }
      rgb = { r, g, b, a: shouldIncludeAlpha ? alpha : null }
      hsl = { ...hslVals, a: shouldIncludeAlpha ? alpha : null }
      break
      
    case NOTATIONS.RGB:
      convertedColor = `rgb(${r}, ${g}, ${b})`
      normalizedColor = convertedColor
      hex = { value: rgbToHex(r, g, b), r, g, b, a: null }
      rgb = { r, g, b, a: null }
      hsl = { ...hslVals, a: null }
      break
      
    case NOTATIONS.RGBA:
      convertedColor = `rgba(${r}, ${g}, ${b}, ${shouldIncludeAlpha ? alpha : 1})`
      normalizedColor = convertedColor
      hex = { value: rgbToHex(r, g, b, shouldIncludeAlpha ? alpha : null), r, g, b, a: shouldIncludeAlpha ? alpha : null }
      rgb = { r, g, b, a: shouldIncludeAlpha ? alpha : 1 }
      hsl = { ...hslVals, a: shouldIncludeAlpha ? alpha : 1 }
      break
      
    case NOTATIONS.HSL:
      convertedColor = `hsl(${hslVals.h}, ${hslVals.s}%, ${hslVals.l}%)`
      normalizedColor = convertedColor
      hex = { value: rgbToHex(r, g, b), r, g, b, a: null }
      rgb = { r, g, b, a: null }
      hsl = { ...hslVals, a: null }
      break
      
    case NOTATIONS.HSLA:
      convertedColor = `hsla(${hslVals.h}, ${hslVals.s}%, ${hslVals.l}%, ${shouldIncludeAlpha ? alpha : 1})`
      normalizedColor = convertedColor
      hex = { value: rgbToHex(r, g, b, shouldIncludeAlpha ? alpha : null), r, g, b, a: shouldIncludeAlpha ? alpha : null }
      rgb = { r, g, b, a: shouldIncludeAlpha ? alpha : 1 }
      hsl = { ...hslVals, a: shouldIncludeAlpha ? alpha : 1 }
      break
  }
  
  return {
    valid: true,
    originalColor: input,
    originalNotation,
    targetNotation,
    convertedColor,
    normalizedColor,
    hex,
    rgb,
    hsl,
  }
}

function convertBatch(items, options = {}) {
  const {
    failFast = false,
    ...convertOptions
  } = options
  
  if (!Array.isArray(items)) {
    return {
      allSuccess: false,
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
      items: [],
      ...createError(ERROR_CODES.INVALID_PARAMETER, 'items 必须是数组'),
    }
  }
  
  if (items.length > MAX_BATCH_SIZE) {
    return {
      allSuccess: false,
      totalCount: items.length,
      successCount: 0,
      failureCount: items.length,
      items: [],
      ...createError(ERROR_CODES.BATCH_SIZE_EXCEEDED, `最多支持 ${MAX_BATCH_SIZE} 项`),
    }
  }
  
  const results = []
  let successCount = 0
  let failureCount = 0
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const result = convertColor(item, convertOptions)
    
    results.push({
      index: i,
      input: item,
      ...result,
    })
    
    if (result.valid) {
      successCount++
    } else {
      failureCount++
      if (failFast) {
        break
      }
    }
  }
  
  return {
    allSuccess: failureCount === 0,
    totalCount: items.length,
    successCount,
    failureCount,
    items: results,
  }
}

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  NOTATIONS,
  SUPPORTED_TARGET_NOTATIONS,
  ROUNDING_MODES,
  CLAMPING_MODES,
  MAX_BATCH_SIZE,
  normalizeColor,
  convertColor,
  convertBatch,
  escapeHtml,
  clamp,
  roundValue,
}
