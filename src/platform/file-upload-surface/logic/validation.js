import {
  ERROR_CODES,
  ALLOWED_EXTENSIONS_DEFAULT,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_SINGLE_FILE_SIZE,
  DEFAULT_MAX_TOTAL_SIZE,
  DEFAULT_ALLOW_EMPTY_FILE,
  DEFAULT_PARTIAL_PASS,
  MATCH_STATES,
} from './constants.js'
import { createError, createDiagnostic } from './errors.js'
import {
  normalizeExtension,
  getExtensionFromFilename,
  buildExtensionIndex,
  buildMimeIndex,
  MIME_TABLE,
  formatSize,
} from './mimeData.js'
import {
  checkMagicNumberForFile,
  compareWithExtension,
} from './magicNumbers.js'

const DEFAULT_OPTIONS = {
  allowedExtensions: ALLOWED_EXTENSIONS_DEFAULT,
  maxFiles: DEFAULT_MAX_FILES,
  maxSingleFileSize: DEFAULT_MAX_SINGLE_FILE_SIZE,
  maxTotalSize: DEFAULT_MAX_TOTAL_SIZE,
  allowEmptyFile: DEFAULT_ALLOW_EMPTY_FILE,
  partialPass: DEFAULT_PARTIAL_PASS,
  checkMagicNumber: true,
}

function validateOptions(options = {}) {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options }

  if (finalOptions.allowedExtensions instanceof Set) {
  } else if (Array.isArray(finalOptions.allowedExtensions)) {
    finalOptions.allowedExtensions = new Set(
      finalOptions.allowedExtensions.map((e) => normalizeExtension(e))
    )
  } else {
    finalOptions.allowedExtensions = new Set()
  }

  return finalOptions
}

function validateExtension(filename, allowedExtensions) {
  const ext = getExtensionFromFilename(filename)

  if (!ext) {
    return {
      success: false,
      diagnostic: createDiagnostic(ERROR_CODES.EXTENSION_NOT_ALLOWED, filename, {
        reason: '文件无扩展名',
      }),
    }
  }

  const normalizedExt = normalizeExtension(ext)

  if (!allowedExtensions.has(normalizedExt)) {
    return {
      success: false,
      diagnostic: createDiagnostic(ERROR_CODES.EXTENSION_NOT_ALLOWED, filename, {
        reason: '扩展名不在白名单中',
        extension: ext,
        allowedExtensions: Array.from(allowedExtensions),
      }),
    }
  }

  return {
    success: true,
    extension: normalizedExt,
  }
}

function validateSingleFileSize(file, maxSize) {
  if (file.size > maxSize) {
    return {
      success: false,
      diagnostic: createDiagnostic(ERROR_CODES.FILE_SIZE_EXCEEDED, file.name, {
        actualSize: file.size,
        maxSize,
        actualSizeHuman: formatSize(file.size),
        maxSizeHuman: formatSize(maxSize),
      }),
    }
  }

  return { success: true }
}

function validateEmptyFile(file, allowEmptyFile) {
  if (file.size === 0 && !allowEmptyFile) {
    return {
      success: false,
      diagnostic: createDiagnostic(ERROR_CODES.EMPTY_FILE, file.name, {
        reason: '空文件不被允许',
      }),
    }
  }

  return { success: true }
}

function validateFileCount(files, maxFiles) {
  if (files.length > maxFiles) {
    return {
      success: false,
      error: createError(ERROR_CODES.FILE_COUNT_EXCEEDED),
      details: {
        actualCount: files.length,
        maxCount: maxFiles,
      },
    }
  }
  return { success: true }
}

function validateTotalSize(files, maxTotalSize) {
  const total = files.reduce((sum, f) => sum + (f.size || 0), 0)

  if (total > maxTotalSize) {
    return {
      success: false,
      error: createError(ERROR_CODES.TOTAL_SIZE_EXCEEDED),
      details: {
        actualSize: total,
        maxSize: maxTotalSize,
        actualSizeHuman: formatSize(total),
        maxSizeHuman: formatSize(maxTotalSize),
      },
    }
  }
  return { success: true }
}

async function validateMagicNumber(file, extension, extIndex, mimeIndex, checkMagicNumber = true) {
  if (!checkMagicNumber) {
    return {
      success: true,
      matchState: MATCH_STATES.UNKNOWN,
      explanation: '魔数检查已跳过',
    }
  }

  const magicResult = await checkMagicNumberForFile(file)

  if (!magicResult.success) {
    return {
      success: false,
      diagnostic: createDiagnostic(ERROR_CODES.FILE_READ_ERROR, file.name, {
        reason: magicResult.error?.errorMessage || '无法读取文件头',
      }),
    }
  }

  if (magicResult.isEmptyFile) {
    return {
      success: true,
      matchState: MATCH_STATES.UNKNOWN,
      explanation: '空文件无法检测魔数',
      isEmptyFile: true,
    }
  }

  const compareResult = compareWithExtension(
    magicResult.matches,
    extension,
    extIndex,
    mimeIndex
  )

  if (compareResult.matchState === MATCH_STATES.CONFLICT) {
    return {
      success: false,
      matchState: MATCH_STATES.CONFLICT,
      diagnostic: createDiagnostic(ERROR_CODES.MIME_CONFLICT, file.name, {
        reason: compareResult.explanation,
        extensionMimes: compareResult.extensionMimes,
        inferredMimes: compareResult.inferredMimes,
        details: compareResult.details,
      }),
      matches: magicResult.matches,
    }
  }

  return {
    success: true,
    matchState: compareResult.matchState,
    explanation: compareResult.explanation,
    matches: magicResult.matches,
    isEmptyFile: magicResult.isEmptyFile,
  }
}

async function validateSingleFile(file, options, extIndex, mimeIndex) {
  const filename = file.name
  const diagnostics = []

  const extResult = validateExtension(filename, options.allowedExtensions)
  if (!extResult.success) {
    diagnostics.push(extResult.diagnostic)
    return {
      success: false,
      file,
      passed: false,
      diagnostics,
    }
  }

  const emptyResult = validateEmptyFile(file, options.allowEmptyFile)
  if (!emptyResult.success) {
    diagnostics.push(emptyResult.diagnostic)
    return {
      success: false,
      file,
      passed: false,
      diagnostics,
    }
  }

  const sizeResult = validateSingleFileSize(file, options.maxSingleFileSize)
  if (!sizeResult.success) {
    diagnostics.push(sizeResult.diagnostic)
    return {
      success: false,
      file,
      passed: false,
      diagnostics,
    }
  }

  const magicResult = await validateMagicNumber(
    file,
    extResult.extension,
    extIndex,
    mimeIndex,
    options.checkMagicNumber
  )

  if (!magicResult.success) {
    diagnostics.push(magicResult.diagnostic)
    return {
      success: false,
      file,
      passed: false,
      diagnostics,
    }
  }

  return {
    success: true,
    file,
    passed: true,
    extension: extResult.extension,
    matchState: magicResult.matchState,
    magicMatches: magicResult.matches,
    diagnostics: [],
  }
}

async function validateFiles(files, options = {}) {
  const opts = validateOptions(options)
  const extIndex = buildExtensionIndex(MIME_TABLE)
  const mimeIndex = buildMimeIndex(MIME_TABLE)

  const results = []
  const diagnostics = []
  const passedFiles = []
  const failedFiles = []
  let totalSize = 0
  let fileCount = 0

  const fileCountResult = validateFileCount(files, opts.maxFiles)
  if (!fileCountResult.success) {
    return {
      success: false,
      error: fileCountResult.error,
      details: fileCountResult.details,
      passedFiles: [],
      failedFiles: [],
      diagnostics: [],
      results: [],
    }
  }

  const totalSizeResult = validateTotalSize(files, opts.maxTotalSize)
  if (!totalSizeResult.success) {
    return {
      success: false,
      error: totalSizeResult.error,
      details: totalSizeResult.details,
      passedFiles: [],
      failedFiles: [],
      diagnostics: [],
      results: [],
    }
  }

  for (const file of files) {
    const result = await validateSingleFile(file, opts, extIndex, mimeIndex)
    results.push(result)

    if (result.passed) {
      passedFiles.push(file)
      totalSize += file.size
      fileCount++
    } else {
      failedFiles.push(file)
      diagnostics.push(...result.diagnostics)
    }
  }

  const hasFailures = failedFiles.length > 0
  const success = !hasFailures || opts.partialPass

  return {
    success,
    passedFiles,
    failedFiles,
    diagnostics,
    results,
    stats: {
      totalFiles: files.length,
      passedCount: passedFiles.length,
      failedCount: failedFiles.length,
      totalSize,
      totalSizeHuman: formatSize(totalSize),
    },
  }
}

function prepareUpload(fileMeta) {
  return {
    url: '/api/upload',
    fields: {},
    placeholder: true,
    note: '占位函数，未来迭代实现 OSS 直传签名',
  }
}

export {
  DEFAULT_OPTIONS,
  validateOptions,
  validateExtension,
  validateSingleFileSize,
  validateEmptyFile,
  validateFileCount,
  validateTotalSize,
  validateMagicNumber,
  validateSingleFile,
  validateFiles,
  prepareUpload,
}
