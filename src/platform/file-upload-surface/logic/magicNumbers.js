import { MAGIC_NUMBERS } from './mimeData.js'
import { ERROR_CODES } from './constants.js'
import { createError } from './errors.js'
import { MAX_FILE_HEADER_BYTES, MATCH_STATES } from './constants.js'

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

function inferMimeTypeFromBytes(bytes, magicNumbers = MAGIC_NUMBERS) {
  if (!bytes || bytes.length === 0) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      matches: [],
    }
  }

  const matches = []

  for (const magic of magicNumbers) {
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
    let buffer

    if (typeof slice.arrayBuffer === 'function') {
      buffer = await slice.arrayBuffer()
    } else {
      buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(slice)
      })
    }

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

async function checkMagicNumberForFile(file, maxBytes = MAX_FILE_HEADER_BYTES) {
  const headerResult = await readFileHeader(file, maxBytes)

  if (!headerResult.success) {
    return headerResult
  }

  if (headerResult.bytes.length === 0) {
    return {
      success: true,
      matches: [],
      bytesRead: 0,
      isEmptyFile: true,
    }
  }

  const inferResult = inferMimeTypeFromBytes(headerResult.bytes)
  return {
    success: true,
    ...inferResult,
    bytesRead: headerResult.bytesRead,
    isEmptyFile: false,
  }
}

function compareWithExtension(inferredMimeMatches, extension, extIndex, mimeIndex) {
  const result = {
    matchState: MATCH_STATES.UNKNOWN,
    explanation: '',
    extensionMimes: [],
    inferredMimes: inferredMimeMatches.map((m) => m.mime),
  }

  if (inferredMimeMatches.length === 0) {
    result.matchState = MATCH_STATES.UNKNOWN
    result.explanation = '无法从文件头推断 MIME 类型'
    if (extension && extIndex) {
      const extResult = extIndex.get(extension) || []
      result.extensionMimes = extResult.map((e) => e.mime)
      if (extResult.length > 0) {
        result.explanation += '，但扩展名指向以下 MIME：' +
          extResult.map((e) => e.mime).join(', ')
      }
    }
    return result
  }

  if (!extension) {
    result.matchState = MATCH_STATES.UNKNOWN
    result.explanation = '文件无扩展名，无法比较。从文件头推断的 MIME：' +
      inferredMimeMatches.map((m) => `${m.mime}（${m.description}）`).join(', ')
    return result
  }

  if (!extIndex) {
    result.matchState = MATCH_STATES.UNKNOWN
    result.explanation = '无扩展名索引不可用。从文件头推断的 MIME：' +
      inferredMimeMatches.map((m) => `${m.mime}（${m.description}）`).join(', ')
    return result
  }

  const extLookup = extIndex.get(extension) || []
  result.extensionMimes = extLookup.map((e) => e.mime)

  if (extLookup.length === 0) {
    result.matchState = MATCH_STATES.UNKNOWN
    result.explanation = '扩展名未知，无法比较。从文件头推断的 MIME：' +
      inferredMimeMatches.map((m) => `${m.mime}（${m.description}）`).join(', ')
    return result
  }

  const inferredMimeSet = new Set(inferredMimeMatches.map((m) => m.mime))
  const extensionMimeSet = new Set(extLookup.map((e) => e.mime))

  const intersection = [...inferredMimeSet].filter((m) => extensionMimeSet.has(m))

  if (intersection.length > 0) {
    result.matchState = MATCH_STATES.MATCH
    result.explanation = '扩展名与文件头推断一致'
    result.details = intersection.map((mime) => {
      const inferred = inferredMimeMatches.find((m) => m.mime === mime)
      const fromExt = extLookup.find((e) => e.mime === mime)
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
  checkMagicNumberForFile,
  compareWithExtension,
  bytesToHexString,
}
