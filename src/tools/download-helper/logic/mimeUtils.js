import { MIME_INFERENCE_MAP, UTF8_BOM } from './constants.js'

function getExtensionFromFilename(filename) {
  if (!filename) return ''

  const name = String(filename).trim()
  const dotIndex = name.lastIndexOf('.')

  if (dotIndex <= 0 || dotIndex >= name.length - 1) {
    return ''
  }

  return name.slice(dotIndex + 1).toLowerCase()
}

function inferMimeFromFilename(filename, fallbackMime = 'application/octet-stream') {
  const ext = getExtensionFromFilename(filename)
  if (!ext) return fallbackMime

  const mapped = MIME_INFERENCE_MAP[ext]
  return mapped || fallbackMime
}

function inferMimeFromContent(content, options = {}) {
  const {
    filename = '',
    overrideMime = null,
  } = options

  if (overrideMime) {
    return normalizeMime(overrideMime)
  }

  if (filename) {
    const fromFile = inferMimeFromFilename(filename, null)
    if (fromFile) return fromFile
  }

  if (typeof content === 'string') {
    const trimmed = content.trim()

    if (trimmed.length === 0) {
      return 'text/plain;charset=utf-8'
    }

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        JSON.parse(trimmed)
        return 'application/json'
      } catch {
      }
    }

    const firstChar = trimmed[0]
    if (firstChar === '<') {
      if (trimmed.toLowerCase().includes('<html') || trimmed.toLowerCase().includes('<!doctype html')) {
        return 'text/html;charset=utf-8'
      }
      if (trimmed.toLowerCase().includes('<?xml')) {
        return 'application/xml;charset=utf-8'
      }
    }

    return 'text/plain;charset=utf-8'
  }

  return 'application/octet-stream'
}

function normalizeMime(mime) {
  if (!mime) return ''
  return String(mime).trim().toLowerCase()
}

function addUtf8Bom(data) {
  if (data == null) return data

  if (typeof data === 'string') {
    const bomString = String.fromCharCode(0xFEFF)
    return bomString + data
  }

  if (data instanceof Uint8Array) {
    const result = new Uint8Array(data.length + UTF8_BOM.length)
    result.set(UTF8_BOM, 0)
    result.set(data, UTF8_BOM.length)
    return result
  }

  if (data instanceof Blob) {
    return new Blob([UTF8_BOM, data], { type: data.type })
  }

  if (data instanceof ArrayBuffer) {
    const uint8 = new Uint8Array(data)
    const result = new Uint8Array(uint8.length + UTF8_BOM.length)
    result.set(UTF8_BOM, 0)
    result.set(uint8, UTF8_BOM.length)
    return result.buffer
  }

  return data
}

function shouldAddUtf8Bom(mime, options = {}) {
  const {
    forceBom = false,
    addBomForCsv = true,
  } = options

  if (forceBom) return true

  const normalized = normalizeMime(mime)

  if (addBomForCsv && normalized.includes('text/csv')) {
    return true
  }

  return false
}

export {
  getExtensionFromFilename,
  inferMimeFromFilename,
  inferMimeFromContent,
  normalizeMime,
  addUtf8Bom,
  shouldAddUtf8Bom,
}
