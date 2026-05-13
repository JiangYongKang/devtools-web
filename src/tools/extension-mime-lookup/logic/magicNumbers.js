import { MAGIC_NUMBERS, OFFICE_OPEN_XML_DETECTION } from './mimeData.js'
import { MATCH_STATES, MAX_FILE_HEADER_BYTES, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'
import { normalizeExtension, normalizeMime } from './core.js'

function matchesSignature(bytes, signature, offset = 0) {
  if (!bytes || bytes.length < signature.length + offset) {
    return false
  }
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) {
      return false
    }
  }
  return true
}

function inferMimeTypeFromBytes(bytes) {
  if (!bytes || bytes.length === 0) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      matches: [],
    }
  }

  const matches = []

  for (const magic of MAGIC_NUMBERS) {
    const offset = magic.offset || 0
    if (bytes.length < magic.signature.length + offset) {
      continue
    }

    if (!matchesSignature(bytes, magic.signature, offset)) {
      continue
    }

    if (magic.trailingCheck) {
      if (
        !matchesSignature(
          bytes,
          magic.trailingCheck.signature,
          magic.trailingCheck.offset
        )
      ) {
        continue
      }
    }

    matches.push({
      mime: magic.mime,
      description: magic.description,
      signature: Array.from(magic.signature),
      offset,
      canBeOfficeOpenXml: magic.canBeOfficeOpenXml || false,
    })
  }

  return {
    success: true,
    matches,
    bytesRead: Math.min(bytes.length, MAX_FILE_HEADER_BYTES),
  }
}

async function readFileHeader(file, maxBytes = MAX_FILE_HEADER_BYTES) {
  if (!file) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
    }
  }

  try {
    const slice = file.slice(0, maxBytes)
    const buffer = await slice.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    return {
      success: true,
      bytes,
      fileName: file.name,
      fileSize: file.size,
      bytesRead: bytes.length,
    }
  } catch (err) {
    return {
      success: false,
      error: createError(
        ERROR_CODES.FILE_READ_ERROR,
        err?.message || '无法读取文件头'
      ),
    }
  }
}

function getExtensionFromFilename(filename) {
  if (!filename) return ''
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return ''
  }
  return filename.slice(lastDot + 1)
}

function compareWithExtension(
  inferredMimeMatches,
  extension,
  extIndex,
  mimeIndex
) {
  const normalizedExt = normalizeExtension(extension)

  const result = {
    matchState: MATCH_STATES.UNKNOWN,
    explanation: '',
    extensionMimes: [],
    inferredMimes: inferredMimeMatches.map((m) => m.mime),
    details: [],
  }

  if (inferredMimeMatches.length === 0) {
    result.matchState = MATCH_STATES.UNKNOWN
    result.explanation = '无法从文件头推断 MIME 类型'
    if (normalizedExt) {
      const extResult = extIndex.get(normalizedExt) || []
      result.extensionMimes = extResult.map((e) => e.mime)
      if (extResult.length > 0) {
        result.explanation += '，但扩展名指向以下 MIME：' + extResult.map((e) => e.mime).join(', ')
      }
    }
    return result
  }

  if (!normalizedExt) {
    result.matchState = MATCH_STATES.UNKNOWN
    result.explanation = '文件无扩展名，无法比较。从文件头推断的 MIME：' +
      inferredMimeMatches.map((m) => `${m.mime}（${m.description}）`).join(', ')
    return result
  }

  const extLookup = extIndex.get(normalizedExt) || []
  result.extensionMimes = extLookup.map((e) => e.mime)

  if (extLookup.length === 0) {
    result.matchState = MATCH_STATES.UNKNOWN
    result.explanation = '扩展名未知，无法比较。从文件头推断的 MIME：' +
      inferredMimeMatches.map((m) => `${m.mime}（${m.description}）`).join(', ')
    return result
  }

  const inferredMimeSet = new Set(inferredMimeMatches.map((m) => normalizeMime(m.mime)))
  const extensionMimeSet = new Set(extLookup.map((e) => normalizeMime(e.mime)))

  const intersection = [...inferredMimeSet].filter((m) => extensionMimeSet.has(m))

  if (intersection.length > 0) {
    result.matchState = MATCH_STATES.MATCH
    result.explanation = '扩展名与文件头推断一致'
    result.details = intersection.map((mime) => {
      const inferred = inferredMimeMatches.find((m) => normalizeMime(m.mime) === mime)
      const fromExt = extLookup.find((e) => normalizeMime(e.mime) === mime)
      return {
        mime,
        inferredDescription: inferred?.description,
        fromExtension: fromExt?.extension,
        source: fromExt?.source,
      }
    })
    return result
  }

  result.matchState = MATCH_STATES.CONFLICT
  result.explanation = '扩展名与文件头推断存在冲突'
  result.details = {
    fromExtension: extLookup.map((e) => ({
      mime: e.mime,
      extension: e.extension,
      source: e.source,
      isRecommended: e.isRecommended,
    })),
    fromFileHeader: inferredMimeMatches.map((m) => ({
      mime: m.mime,
      description: m.description,
    })),
  }
  return result
}

function bytesToHexString(bytes, maxLen = 32) {
  if (!bytes || bytes.length === 0) return ''
  const displayBytes = bytes.slice(0, maxLen)
  return Array.from(displayBytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ')
}

export {
  matchesSignature,
  inferMimeTypeFromBytes,
  readFileHeader,
  getExtensionFromFilename,
  compareWithExtension,
  bytesToHexString,
}
