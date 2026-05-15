import { ERROR_CODES, DRAG_STATES, DEFAULT_READ_CHUNK_SIZE, READ_MODES } from './constants.js'
import { createError } from './errors.js'
import {
  normalizeMime,
  getExtensionForMimeOrDefault,
  suggestFilenameFromMime,
  isImageMime,
  isTextBasedMime,
  getExtensionFromFilename,
  formatSize,
} from './mimeData.js'

function createDragStateMachine() {
  let counter = 0
  let state = DRAG_STATES.IDLE

  return {
    enter() {
      counter++
      state = DRAG_STATES.DRAGGING_OVER
      return state
    },
    leave() {
      counter = Math.max(0, counter - 1)
      if (counter === 0) {
        state = DRAG_STATES.IDLE
      }
      return state
    },
    drop() {
      counter = 0
      state = DRAG_STATES.IDLE
      return state
    },
    getState() {
      return state
    },
    isDragging() {
      return state === DRAG_STATES.DRAGGING_OVER
    },
    getCounter() {
      return counter
    },
    reset() {
      counter = 0
      state = DRAG_STATES.IDLE
      return state
    },
  }
}

async function extractFilesFromDataTransfer(dataTransfer) {
  const files = []
  const hasWebkitGetAsEntry =
    typeof dataTransfer !== 'undefined' &&
    dataTransfer.items &&
    dataTransfer.items.length > 0 &&
    typeof dataTransfer.items[0].webkitGetAsEntry === 'function'

  if (hasWebkitGetAsEntry) {
    try {
      for (const item of Array.from(dataTransfer.items)) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry) {
            if (entry.isFile) {
              const file = item.getAsFile()
              if (file) {
                files.push(file)
              }
            } else if (entry.isDirectory) {
              return {
                success: false,
                error: createError(ERROR_CODES.DIRECTORY_NOT_SUPPORTED),
                files: [],
                hasDirectory: true,
              }
            }
          }
        }
      }
    } catch {
    }
  }

  if (files.length === 0 && dataTransfer.files && dataTransfer.files.length > 0) {
    for (const file of Array.from(dataTransfer.files)) {
      files.push(file)
    }
  }

  if (files.length === 0) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT, '未检测到文件'),
      files: [],
    }
  }

  return {
    success: true,
    files,
    hasDirectory: false,
    supportsDirectoryDetection: hasWebkitGetAsEntry,
  }
}

async function readClipboardFiles(options = {}) {
  const {
    maxFiles = 10,
    includeTextAsFile = false,
    defaultTextExtension = 'txt',
  } = options

  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.read) {
      return {
        success: false,
        error: createError(ERROR_CODES.CLIPBOARD_READ_ERROR, '当前浏览器不支持 ClipboardItem 读取'),
        items: [],
        files: [],
      }
    }

    const clipboardItems = await navigator.clipboard.read()
    const files = []
    const items = []

    for (const clipboardItem of clipboardItems) {
      const itemTypes = clipboardItem.types
      const itemData = {}

      for (const type of itemTypes) {
        try {
          const blob = await clipboardItem.getType(type)
          itemData[type] = blob

          if (blob && blob instanceof Blob) {
            const isText = isTextBasedMime(type)
            const isImage = isImageMime(type)

            const suggestedName = suggestFilenameFromMime(
              type,
              `clipboard-${Date.now()}`
            )

            const file = new File([blob], suggestedName, {
              type: type,
            })

            files.push({
              file,
              type,
              isText,
              isImage,
              suggestedFilename: suggestedName,
              size: blob.size,
            })
          }
        } catch {
        }
      }

      items.push({
        types: itemTypes,
        data: itemData,
      })
    }

    if (files.length === 0 && includeTextAsFile) {
      try {
        if (navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText()
          if (text && text.length > 0) {
            const blob = new Blob([text], { type: 'text/plain' })
            const file = new File([blob], `clipboard-text-${Date.now()}.${defaultTextExtension}`, {
              type: 'text/plain',
            })
            files.push({
              file,
              type: 'text/plain',
              isText: true,
              isImage: false,
              suggestedFilename: file.name,
              size: blob.size,
            })
          }
        }
      } catch {
      }
    }

    if (files.length > maxFiles) {
      return {
        success: false,
        error: createError(ERROR_CODES.FILE_COUNT_EXCEEDED),
        items,
        files: files.slice(0, maxFiles),
        extraCount: files.length - maxFiles,
      }
    }

    return {
      success: true,
      items,
      files,
      count: files.length,
    }
  } catch (err) {
    return {
      success: false,
      error: createError(
        ERROR_CODES.CLIPBOARD_READ_ERROR,
        err?.message || '无法读取剪贴板'
      ),
      items: [],
      files: [],
    }
  }
}

function deduplicateFilenames(files) {
  const seenNames = new Map()
  const result = []

  for (const file of files) {
    const originalName = file.name
    let finalName = originalName

    let count = seenNames.get(originalName) || 0
    if (count > 0) {
      const ext = getExtensionFromFilename(originalName)
      const base = ext
        ? originalName.slice(0, originalName.length - ext.length - 1)
        : originalName

      if (ext) {
        finalName = `${base}_${count}.${ext}`
      } else {
        finalName = `${base}_${count}`
      }
    }

    seenNames.set(originalName, count + 1)

    result.push({
      originalFile: file,
      originalName,
      finalName,
      isDuplicate: count > 0,
      duplicateIndex: count,
    })
  }

  return result
}

function buildDownloadDescriptor(file, options = {}) {
  const {
    includeBlob = true,
    includeFileHandle = true,
  } = options

  const blob = file

  const descriptor = {
    url: null,
    filename: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    sizeHuman: formatSize(file.size),
    revoke: null,
    isRevoked: () => false,
    clearRevokeTimeout: null,
    fileHandle: includeFileHandle ? file : null,
    blob: includeBlob ? blob : null,
    extension: getExtensionFromFilename(file.name),
    lastModified: file.lastModified,
  }

  return descriptor
}

function buildDownloadDescriptors(files, options = {}) {
  return files.map((file) => buildDownloadDescriptor(file, options))
}

async function readFileWithProgress(file, options = {}) {
  const {
    chunkSize = DEFAULT_READ_CHUNK_SIZE,
    readMode = READ_MODES.READ_CONTENT,
    onProgress = null,
  } = options

  if (readMode === READ_MODES.VALIDATE_ONLY) {
    return {
      success: true,
      file,
      mode: READ_MODES.VALIDATE_ONLY,
      totalBytes: file.size,
      bytesRead: 0,
      content: null,
    }
  }

  let result
  const totalSize = file.size
  let bytesRead = 0

  if (typeof file.stream === 'function') {
    const stream = file.stream()
    const reader = stream.getReader()
    const chunks = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (value) {
        chunks.push(value)
        bytesRead += value.length

        if (onProgress) {
          onProgress({
            bytesRead,
            totalBytes: totalSize,
            progress: totalSize > 0 ? bytesRead / totalSize : 1,
          })
        }
      }
    }

    result = new Blob(chunks)
  } else {
    result = await new Promise((resolve, reject) => {
      const reader = new FileReader()

      let lastReported = 0
      reader.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          bytesRead = e.loaded
          const progress = e.total > 0 ? bytesRead / e.total : 1
          const shouldReport = chunkSize > 0
            ? Math.floor(bytesRead / chunkSize) > Math.floor(lastReported / chunkSize)
            : true

          if (shouldReport || bytesRead === e.total) {
            lastReported = bytesRead
            onProgress({
              bytesRead,
              totalBytes: e.total,
              progress,
            })
          }
        }
      }

      reader.onload = () => {
        resolve(new Blob([reader.result]))
      }

      reader.onerror = () => {
        reject(reader.error)
      }

      reader.readAsArrayBuffer(file)
    })

    bytesRead = totalSize
  }

  if (onProgress && totalSize > 0) {
    onProgress({
      bytesRead: totalSize,
      totalBytes: totalSize,
      progress: 1,
    })
  }

  return {
    success: true,
    file,
    blob: result,
    mode: READ_MODES.READ_CONTENT,
    totalBytes: totalSize,
    bytesRead,
  }
}

async function readFilesWithProgress(files, options = {}) {
  const {
    onFileStart = null,
    onFileProgress = null,
    onFileComplete = null,
  } = options

  const results = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (onFileStart) {
      onFileStart({ index: i, file, total: files.length })
    }

    const result = await readFileWithProgress(file, {
      ...options,
      onProgress: (progress) => {
        if (onFileProgress) {
          onFileProgress({ index: i, file, ...progress })
        }
      },
    })

    results.push(result)

    if (onFileComplete) {
      onFileComplete({ index: i, file, result })
    }
  }

  return {
    success: true,
    results,
    count: files.length,
  }
}

function isNonUtf8Filename(filename) {
  if (!filename) return false

  try {
    const encoder = new TextEncoder()
    const encoded = encoder.encode(filename)
    const decoder = new TextDecoder('utf-8', { fatal: true })
    decoder.decode(encoded)
    return false
  } catch {
    return true
  }
}

function createFileListFromFiles(files) {
  const dt = new DataTransfer()
  for (const file of files) {
    dt.items.add(file)
  }
  return dt.files
}

export {
  createDragStateMachine,
  extractFilesFromDataTransfer,
  readClipboardFiles,
  deduplicateFilenames,
  buildDownloadDescriptor,
  buildDownloadDescriptors,
  readFileWithProgress,
  readFilesWithProgress,
  isNonUtf8Filename,
  createFileListFromFiles,
}
