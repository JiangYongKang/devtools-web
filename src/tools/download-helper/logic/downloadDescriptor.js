import {
  DEFAULT_BLOB_SIZE_LIMIT,
  DEFAULT_REVOKE_TIMEOUT_MS,
} from './constants.js'
import { createError, ERROR_CODES } from './errors.js'
import { sanitizeFilename } from './filenameUtils.js'
import {
  inferMimeFromContent,
  addUtf8Bom,
  shouldAddUtf8Bom,
  normalizeMime,
} from './mimeUtils.js'

async function payloadToBlob(payload, options = {}) {
  const {
    forceBom = false,
    addBomForCsv = true,
    inferredMime = null,
  } = options

  let data = payload
  let mime = inferredMime || 'application/octet-stream'

  if (typeof payload === 'string') {
    mime = inferredMime || inferMimeFromContent(payload)
    if (shouldAddUtf8Bom(mime, { forceBom, addBomForCsv })) {
      data = addUtf8Bom(payload)
    }
    return new Blob([data], { type: mime })
  }

  if (payload instanceof Blob) {
    if (shouldAddUtf8Bom(mime, { forceBom, addBomForCsv })) {
      return new Blob([addUtf8Bom(payload)], { type: mime })
    }
    return payload
  }

  if (payload instanceof ArrayBuffer) {
    if (shouldAddUtf8Bom(mime, { forceBom, addBomForCsv })) {
      return new Blob([addUtf8Bom(payload)], { type: mime })
    }
    return new Blob([payload], { type: mime })
  }

  if (payload instanceof Uint8Array) {
    if (shouldAddUtf8Bom(mime, { forceBom, addBomForCsv })) {
      return new Blob([addUtf8Bom(payload)], { type: mime })
    }
    return new Blob([payload], { type: mime })
  }

  if (typeof ReadableStream !== 'undefined' && payload instanceof ReadableStream) {
    const reader = payload.getReader()
    const chunks = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }

    const combined = await concatChunksToBlob(chunks, mime)
    if (shouldAddUtf8Bom(mime, { forceBom, addBomForCsv })) {
      return new Blob([addUtf8Bom(combined)], { type: mime })
    }
    return combined
  }

  throw createError(
    ERROR_CODES.UNSUPPORTED_PAYLOAD,
    `不支持的 payload 类型: ${typeof payload}`
  )
}

async function concatChunksToBlob(chunks, mime) {
  if (chunks.length === 0) {
    return new Blob([], { type: mime })
  }

  return new Blob(chunks, { type: mime })
}

function checkMemoryPressure(blobSize, limit = DEFAULT_BLOB_SIZE_LIMIT) {
  return {
    isOverLimit: blobSize > limit,
    size: blobSize,
    limit,
    humanSize: formatSize(blobSize),
    humanLimit: formatSize(limit),
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function createManagedRevoke(url, blob, timeoutMs = DEFAULT_REVOKE_TIMEOUT_MS) {
  let revoked = false
  let timerId = null

  const revoke = () => {
    if (revoked) return
    revoked = true

    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }

    try {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url)
      }
    } catch {
    }
  }

  if (timeoutMs > 0) {
    timerId = setTimeout(revoke, timeoutMs)
  }

  return {
    revoke,
    isRevoked: () => revoked,
    clearTimeout: () => {
      if (timerId) {
        clearTimeout(timerId)
        timerId = null
      }
    },
  }
}

function createObjectURLSafe(blob) {
  if (typeof URL === 'undefined' || !URL.createObjectURL) {
    return null
  }

  try {
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

async function buildDownloadDescriptor(payload, options = {}) {
  const {
    filename = 'download.txt',
    overrideMime = null,
    forceBom = false,
    addBomForCsv = true,
    memoryLimit = DEFAULT_BLOB_SIZE_LIMIT,
    revokeTimeout = DEFAULT_REVOKE_TIMEOUT_MS,
    memoryWarningOnly = false,
    filenameOptions = {},
  } = options

  try {
    const sanitizedResult = sanitizeFilename(filename, filenameOptions)

    if (!sanitizedResult.success) {
      return {
        success: false,
        error: sanitizedResult.error,
      }
    }

    const finalFilename = sanitizedResult.sanitized

    const inferredMime = overrideMime || inferMimeFromContent(payload, {
      filename: finalFilename,
      overrideMime,
    })

    const blob = await payloadToBlob(payload, {
      forceBom,
      addBomForCsv,
      inferredMime,
    })

    const memoryCheck = checkMemoryPressure(blob.size, memoryLimit)

    if (memoryCheck.isOverLimit && !memoryWarningOnly) {
      return {
        success: false,
        error: createError(
          ERROR_CODES.MEMORY_PRESSURE,
          `数据大小 (${memoryCheck.humanSize}) 超过限制 (${memoryCheck.humanLimit})`
        ),
        memoryCheck,
      }
    }

    const url = createObjectURLSafe(blob)

    const managedRevoke = url ? createManagedRevoke(url, blob, revokeTimeout) : null

    const finalMime = normalizeMime(inferredMime)

    return {
      success: true,
      url,
      filename: finalFilename,
      mime: finalMime,
      blob,
      blobSize: blob.size,
      memoryCheck,
      revoke: managedRevoke ? managedRevoke.revoke : null,
      isRevoked: managedRevoke ? managedRevoke.isRevoked : () => false,
      clearRevokeTimeout: managedRevoke ? managedRevoke.clearTimeout : null,
    }
  } catch (err) {
    if (err && err.errorCode) {
      return {
        success: false,
        error: err,
      }
    }

    return {
      success: false,
      error: createError(
        ERROR_CODES.INVALID_FORMAT,
        err?.message || '构建下载描述符失败'
      ),
    }
  }
}

export {
  buildDownloadDescriptor,
  payloadToBlob,
  checkMemoryPressure,
  createManagedRevoke,
  createObjectURLSafe,
  formatSize,
}
