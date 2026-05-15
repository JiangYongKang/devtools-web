import { MAX_HEADER_BYTES, MAX_PARALLEL_READS, FILE_STATES } from './constants.js'
import { ISSUE_FACTORIES } from './errors.js'
import {
  validateSingleFilePipeline,
  validateMultipleFilesPipeline,
  isDirectory,
} from './validation.js'

async function readFileHeader(file, maxBytes = MAX_HEADER_BYTES, signal = null) {
  if (!file) {
    return {
      success: false,
      bytes: new Uint8Array(),
      error: 'No file provided',
    }
  }

  try {
    if (signal?.aborted) {
      return {
        success: false,
        bytes: new Uint8Array(),
        cancelled: true,
        error: 'Read cancelled',
      }
    }

    const blobSlice = file.slice(0, maxBytes)
    let buffer

    if (typeof blobSlice.arrayBuffer === 'function') {
      if (signal) {
        const abortPromise = new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Read cancelled')), { once: true })
        })
        buffer = await Promise.race([blobSlice.arrayBuffer(), abortPromise])
      } else {
        buffer = await blobSlice.arrayBuffer()
      }
    } else {
      buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        if (signal) {
          signal.addEventListener('abort', () => {
            reader.abort()
            reject(new Error('Read cancelled'))
          }, { once: true })
        }
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(blobSlice)
      })
    }

    return {
      success: true,
      bytes: new Uint8Array(buffer),
      fileName: file.name,
      fileSize: file.size,
      bytesRead: Math.min(file.size, maxBytes),
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Read cancelled') {
      return {
        success: false,
        bytes: new Uint8Array(),
        cancelled: true,
        error: 'Read cancelled',
      }
    }
    return {
      success: false,
      bytes: new Uint8Array(),
      error: err?.message || 'Failed to read file header',
    }
  }
}

async function processSingleFile(file, options = {}, signal = null, onProgress = null) {
  const fileId = generateFileId(file)
  const result = {
    id: fileId,
    file,
    state: FILE_STATES.PENDING,
    validationResult: null,
    error: null,
  }

  try {
    result.state = FILE_STATES.VALIDATING

    if (isDirectory(file)) {
      result.state = FILE_STATES.FAILED
      result.validationResult = {
        ok: false,
        issues: [ISSUE_FACTORIES.directoryDetected()],
        detectedMime: null,
        declaredMime: null,
        filename: file.name,
        isDirectory: true,
      }
      return result
    }

    const readResult = await readFileHeader(file, options.maxHeaderBytes || MAX_HEADER_BYTES, signal)

    if (!readResult.success) {
      if (readResult.cancelled) {
        result.state = FILE_STATES.CANCELLED
        result.validationResult = {
          ok: false,
          issues: [ISSUE_FACTORIES.cancelled()],
          detectedMime: null,
          declaredMime: null,
          filename: file.name,
        }
      } else {
        result.state = FILE_STATES.FAILED
        result.validationResult = {
          ok: false,
          issues: [ISSUE_FACTORIES.readError(readResult.error)],
          detectedMime: null,
          declaredMime: null,
          filename: file.name,
        }
      }
      return result
    }

    const validationResult = validateSingleFilePipeline(file, readResult.bytes, options)
    result.validationResult = validationResult
    result.state = validationResult.ok ? FILE_STATES.PASSED : FILE_STATES.FAILED

    if (onProgress) {
      onProgress({ fileId, progress: 100, state: result.state })
    }

    return result
  } catch (err) {
    result.state = FILE_STATES.FAILED
    result.error = err.message
    result.validationResult = {
      ok: false,
      issues: [ISSUE_FACTORIES.readError(err.message)],
      detectedMime: null,
      declaredMime: null,
      filename: file.name,
    }
    return result
  }
}

async function processMultipleFiles(files, options = {}, signal = null, onProgress = null) {
  const fileArray = Array.from(files)
  const results = []
  const maxParallel = options.maxParallelReads || MAX_PARALLEL_READS
  let completed = 0

  for (let i = 0; i < fileArray.length; i += maxParallel) {
    if (signal?.aborted) {
      break
    }

    const chunk = fileArray.slice(i, i + maxParallel)
    const chunkPromises = chunk.map((file, index) => {
      const globalIndex = i + index
      return processSingleFile(
        file,
        options,
        signal,
        (progress) => {
          if (onProgress) {
            onProgress({
              fileIndex: globalIndex,
              totalFiles: fileArray.length,
              ...progress,
            })
          }
        }
      )
    })

    const chunkResults = await Promise.all(chunkPromises)
    results.push(...chunkResults)
    completed += chunk.length

    if (onProgress) {
      onProgress({
        overallProgress: Math.round((completed / fileArray.length) * 100),
        completed,
        total: fileArray.length,
      })
    }
  }

  const validationResults = results.map((r) => r.validationResult)
  const batchResult = validateMultipleFilesPipeline(validationResults, options)

  return {
    ...batchResult,
    fileResults: results,
  }
}

function generateFileId(file) {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9)
  const nameHash = file.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(36)
  return `${timestamp}-${random}-${nameHash}`
}

function checkShowOpenFilePickerSupport() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

function checkDragAndDropSupport() {
  return typeof window !== 'undefined' &&
         'DragEvent' in window &&
         'DataTransfer' in window
}

export {
  readFileHeader,
  processSingleFile,
  processMultipleFiles,
  generateFileId,
  checkShowOpenFilePickerSupport,
  checkDragAndDropSupport,
}
