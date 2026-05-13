import {
  WINDOWS_RESERVED_NAMES,
  WINDOWS_ILLEGAL_CHARS,
  UNIX_ILLEGAL_CHARS,
  DEFAULT_MAX_FILENAME_LENGTH,
} from './constants.js'
import { createError, ERROR_CODES } from './errors.js'

function sanitizeFilename(rawName, options = {}) {
  const {
    maxLength = DEFAULT_MAX_FILENAME_LENGTH,
    crossPlatform = true,
    fallbackExtension = 'txt',
  } = options

  if (rawName == null || String(rawName).trim() === '') {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      sanitized: '',
    }
  }

  let name = String(rawName)

  name = name.replace(crossPlatform ? WINDOWS_ILLEGAL_CHARS : UNIX_ILLEGAL_CHARS, '')

  name = name.trim()
  name = name.replace(/^[.\s]+|[.\s]+$/g, '')

  const dotIndex = name.lastIndexOf('.')
  let baseName = name
  let extension = ''

  if (dotIndex > 0 && dotIndex < name.length - 1) {
    baseName = name.slice(0, dotIndex)
    extension = name.slice(dotIndex)
  }

  const upperBase = baseName.toUpperCase()
  if (WINDOWS_RESERVED_NAMES.has(upperBase)) {
    baseName = `_${baseName}_`
    name = extension ? `${baseName}${extension}` : baseName
  }

  if (name === '') {
    name = `download.${fallbackExtension}`
    baseName = 'download'
    extension = `.${fallbackExtension}`
  }

  const finalMaxLength = Math.max(1, maxLength)
  if (name.length > finalMaxLength) {
    const extLength = extension.length
    const maxBaseLength = finalMaxLength - extLength - 1

    if (maxBaseLength <= 0) {
      const extDotIndex = extension.lastIndexOf('.')
      if (extDotIndex > 0 && extDotIndex < extension.length - 1) {
        const shortExt = extension.slice(extDotIndex)
        extension = shortExt
        baseName = name.slice(0, name.length - extension.length)
      }
    }

    const hashSuffix = generateStableShortHash(baseName)
    const newMaxBase = finalMaxLength - extension.length - hashSuffix.length - 1

    if (newMaxBase > 0) {
      baseName = baseName.slice(0, newMaxBase) + '-' + hashSuffix
    } else {
      baseName = hashSuffix.slice(0, finalMaxLength - extension.length)
      if (baseName.length === 0) {
        baseName = 'file'
      }
    }

    name = extension ? `${baseName}${extension}` : baseName
  }

  return {
    success: true,
    sanitized: name,
    baseName,
    extension,
  }
}

function generateStableShortHash(input, length = 8) {
  const effectiveLength = Math.max(1, length)
  let result = ''
  let round = 0

  while (result.length < effectiveLength) {
    let hash = 2166136261 + round

    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i) + round
      hash = Math.imul(hash, 16777619)
    }

    const hex = (hash >>> 0).toString(16).padStart(8, '0')
    result += hex
    round++
  }

  return result.slice(0, effectiveLength)
}

function percentEncodeFilename(filename, charset = 'UTF-8') {
  const encoded = encodeURIComponent(filename)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

  return `${charset.toUpperCase()}''${encoded}`
}

function parseContentDisposition(header) {
  if (!header || typeof header !== 'string') {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      filename: null,
      filenameStar: null,
    }
  }

  const result = {
    success: true,
    filename: null,
    filenameStar: null,
    decodedFilename: null,
  }

  const parts = splitContentDispositionParts(header)

  for (const part of parts) {
    const { key, value } = parseContentDispositionPart(part)
    if (!key) continue

    const keyLower = key.toLowerCase()

    if (keyLower === 'filename' && result.filename === null) {
      result.filename = value
    } else if (keyLower === 'filename*' && result.filenameStar === null) {
      result.filenameStar = value
      const decoded = decodeFilenameStar(value)
      if (decoded !== null) {
        result.decodedFilename = decoded
      }
    }
  }

  if (!result.filename && !result.filenameStar) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_FORMAT, '未找到 filename 或 filename* 参数'),
      filename: null,
      filenameStar: null,
    }
  }

  return result
}

function splitContentDispositionParts(header) {
  const parts = []
  let current = ''
  let inQuotes = false
  let inExtVal = false
  let extValCharset = ''
  let extValLang = ''
  let extValStart = false

  for (let i = 0; i < header.length; i++) {
    const char = header[i]

    if (char === ';' && !inQuotes) {
      if (current.trim()) {
        parts.push(current.trim())
      }
      current = ''
      continue
    }

    if (char === '"' && !inQuotes) {
      inQuotes = true
    } else if (char === '"' && inQuotes && header[i - 1] !== '\\') {
      inQuotes = false
    }

    current += char
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}

function parseContentDispositionPart(part) {
  const eqIndex = part.indexOf('=')
  if (eqIndex === -1) {
    return { key: part.trim(), value: '' }
  }

  const key = part.slice(0, eqIndex).trim()
  let value = part.slice(eqIndex + 1).trim()

  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/\\"/g, '"')
  }

  return { key, value }
}

function decodeFilenameStar(encoded) {
  const parts = encoded.split("'")
  if (parts.length < 2) {
    return null
  }

  const [charset, lang, encodedValue] = parts

  try {
    if (charset.toUpperCase() === 'UTF-8') {
      return decodeURIComponent(encodedValue.replace(/\+/g, ' '))
    }
    return encodedValue
  } catch {
    return null
  }
}

export {
  sanitizeFilename,
  generateStableShortHash,
  percentEncodeFilename,
  parseContentDisposition,
  splitContentDispositionParts,
  parseContentDispositionPart,
  decodeFilenameStar,
}
