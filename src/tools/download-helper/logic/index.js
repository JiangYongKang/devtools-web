import {
  EXAMPLES,
  DEFAULT_MAX_FILENAME_LENGTH,
  DEFAULT_BLOB_SIZE_LIMIT,
  DEFAULT_REVOKE_TIMEOUT_MS,
  ERROR_CODES,
} from './constants.js'
import { getErrorMessage } from './errors.js'
import {
  sanitizeFilename,
  generateStableShortHash,
  percentEncodeFilename,
  parseContentDisposition,
} from './filenameUtils.js'
import {
  getExtensionFromFilename,
  inferMimeFromFilename,
  inferMimeFromContent,
  addUtf8Bom,
  shouldAddUtf8Bom,
  normalizeMime,
} from './mimeUtils.js'
import {
  buildDownloadDescriptor,
  payloadToBlob,
  checkMemoryPressure,
  formatSize,
} from './downloadDescriptor.js'

async function triggerDownloadFromDescriptor(descriptor, options = {}) {
  const {
    mode = 'anchor',
    revokeAfter = true,
  } = options

  if (!descriptor || !descriptor.success) {
    return {
      success: false,
      error: descriptor?.error || { errorCode: ERROR_CODES.EMPTY_INPUT, errorMessage: '无效的下载描述符' },
    }
  }

  const { url, filename } = descriptor

  if (mode === 'anchor') {
    if (!url) {
      return {
        success: false,
        error: {
          errorCode: ERROR_CODES.INVALID_FORMAT,
          errorMessage: '当前环境不支持 createObjectURL',
        },
      }
    }

    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)

      if (revokeAfter) {
        if (descriptor.revoke) {
          descriptor.revoke()
        }
      }

      return { success: true, mode: 'anchor' }
    } catch (err) {
      return {
        success: false,
        error: {
          errorCode: ERROR_CODES.INVALID_FORMAT,
          errorMessage: err?.message || '下载触发失败',
        },
      }
    }
  }

  if (mode === 'filePicker') {
    if (typeof showSaveFilePicker === 'undefined') {
      return {
        success: false,
        error: {
          errorCode: ERROR_CODES.INVALID_FORMAT,
          errorMessage: '当前环境不支持 showSaveFilePicker',
        },
      }
    }

    try {
      const fileHandle = await showSaveFilePicker({
        suggestedName: filename,
      })

      const writable = await fileHandle.createWritable()
      await writable.write(descriptor.blob)
      await writable.close()

      if (revokeAfter) {
        if (descriptor.revoke) {
          descriptor.revoke()
        }
      }

      return { success: true, mode: 'filePicker' }
    } catch (err) {
      if (err?.name === 'AbortError') {
        return {
          success: true,
          mode: 'filePicker',
          aborted: true,
          info: '用户取消了保存对话框',
        }
      }

      return {
        success: false,
        error: {
          errorCode: ERROR_CODES.INVALID_FORMAT,
          errorMessage: err?.message || '保存文件失败',
        },
      }
    }
  }

  return {
    success: false,
    error: {
      errorCode: ERROR_CODES.INVALID_FORMAT,
      errorMessage: `不支持的下载模式: ${mode}`,
    },
  }
}

function generateLargeBlob(sizeInMB, options = {}) {
  const {
    pattern = 'x',
    chunkSize = 1024 * 1024,
  } = options

  const totalBytes = sizeInMB * 1024 * 1024
  const chunks = []
  const baseChunk = pattern.repeat(Math.ceil(chunkSize / pattern.length)).slice(0, chunkSize)

  let remaining = totalBytes
  while (remaining > 0) {
    const currentSize = Math.min(remaining, chunkSize)
    if (currentSize === chunkSize) {
      chunks.push(baseChunk)
    } else {
      chunks.push(baseChunk.slice(0, currentSize))
    }
    remaining -= currentSize
  }

  return new Blob(chunks, { type: 'text/plain;charset=utf-8' })
}

function debounce(fn, delay) {
  let timerId = null
  return (...args) => {
    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => fn(...args), delay)
  }
}

export {
  EXAMPLES,
  DEFAULT_MAX_FILENAME_LENGTH,
  DEFAULT_BLOB_SIZE_LIMIT,
  DEFAULT_REVOKE_TIMEOUT_MS,
  ERROR_CODES,
  getErrorMessage,
  sanitizeFilename,
  generateStableShortHash,
  percentEncodeFilename,
  parseContentDisposition,
  getExtensionFromFilename,
  inferMimeFromFilename,
  inferMimeFromContent,
  addUtf8Bom,
  shouldAddUtf8Bom,
  normalizeMime,
  buildDownloadDescriptor,
  triggerDownloadFromDescriptor,
  payloadToBlob,
  checkMemoryPressure,
  formatSize,
  generateLargeBlob,
  debounce,
}
