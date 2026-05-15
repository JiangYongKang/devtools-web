import { ERROR_CODES } from './constants.js'
import { createFailure, createSuccess } from './errors.js'

const DANGEROUS_PATTERNS = [
  /<script[\s>]/gi,
  /<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
  /<iframe[\s>]/gi,
  /<object[\s>]/gi,
  /<embed[\s>]/gi,
  /<form[\s>]/gi,
  /document\s*\./gi,
  /window\s*\./gi,
  /alert\s*\(/gi,
  /prompt\s*\(/gi,
  /confirm\s*\(/gi,
]

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

function hasDangerousPatterns(text) {
  if (!text || typeof text !== 'string') {
    return false
  }

  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(text))
}

function escapeHtml(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

function sanitizeText(text) {
  if (text === null || text === undefined) {
    return createSuccess({ sanitized: '', original: '' })
  }

  const originalText = String(text)

  if (hasDangerousPatterns(originalText)) {
    return createFailure(ERROR_CODES.XSS_DETECTED, '输入内容包含危险字符', {
      originalLength: originalText.length,
    })
  }

  const sanitized = escapeHtml(originalText)

  return createSuccess({
    sanitized,
    original: originalText,
    wasEscaped: sanitized !== originalText,
  })
}

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return createSuccess({ sanitized: 'unknown', original: '' })
  }

  const originalFilename = String(filename)

  if (hasDangerousPatterns(originalFilename)) {
    return createFailure(ERROR_CODES.XSS_DETECTED, '文件名包含危险字符', {
      originalFilename,
    })
  }

  const sanitized = originalFilename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  return createSuccess({
    sanitized: sanitized || 'unknown',
    original: originalFilename,
    wasSanitized: sanitized !== originalFilename,
  })
}

function sanitizeColor(color) {
  if (!color || typeof color !== 'string') {
    return createSuccess({ sanitized: 'rgba(0, 0, 0, 0.3)', original: '' })
  }

  const originalColor = String(color).trim()

  if (hasDangerousPatterns(originalColor)) {
    return createFailure(ERROR_CODES.XSS_DETECTED, '颜色值包含危险字符', {
      originalColor,
    })
  }

  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
  const rgbPattern = /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
  const rgbaPattern = /^rgba\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([0-9.]+)\s*\)$/
  const hslPattern = /^hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/
  const hslaPattern = /^hsla\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*([0-9.]+)\s*\)$/
  const namedColors = /^(transparent|black|white|red|green|blue|yellow|cyan|magenta|gray|grey)$/i

  const isValid =
    hexPattern.test(originalColor) ||
    rgbPattern.test(originalColor) ||
    rgbaPattern.test(originalColor) ||
    hslPattern.test(originalColor) ||
    hslaPattern.test(originalColor) ||
    namedColors.test(originalColor)

  if (!isValid) {
    return createFailure(ERROR_CODES.INVALID_COLOR_FORMAT, '无效的颜色格式', {
      originalColor,
    })
  }

  return createSuccess({
    sanitized: originalColor,
    original: originalColor,
  })
}

function sanitizeFontFamily(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') {
    return createSuccess({ sanitized: 'Arial, sans-serif', original: '' })
  }

  const originalFont = String(fontFamily)

  if (hasDangerousPatterns(originalFont)) {
    return createFailure(ERROR_CODES.XSS_DETECTED, '字体名称包含危险字符', {
      originalFont,
    })
  }

  const sanitized = originalFont
    .replace(/[^a-zA-Z0-9\s,_\-']/g, '')
    .trim()

  return createSuccess({
    sanitized: sanitized || 'Arial, sans-serif',
    original: originalFont,
    wasSanitized: sanitized !== originalFont,
  })
}

export {
  hasDangerousPatterns,
  escapeHtml,
  sanitizeText,
  sanitizeFilename,
  sanitizeColor,
  sanitizeFontFamily,
}
