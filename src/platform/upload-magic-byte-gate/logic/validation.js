import {
  ISSUE_CODES,
  SEVERITY,
  DEFAULT_SIZE_TIER,
  MAX_HEADER_BYTES,
  EXECUTABLE_MIMES,
} from './constants.js'
import {
  createIssue,
  createErrorIssue,
  createWarningIssue,
  createInfoIssue,
  ISSUE_FACTORIES,
  createValidationResult,
  formatSize,
} from './errors.js'
import {
  detectMimeFromBytes,
  isLikelyUtf8Text,
} from './magicNumbers.js'
import {
  normalizeExtension,
  getExtensionFromFilename,
  getMimeForExtension,
  isExecutableMime,
  isOctetStream,
} from './mimeData.js'

function validateFileSize(file, sizeTier = DEFAULT_SIZE_TIER) {
  const issues = []
  const size = file.size

  if (size === 0) {
    issues.push(ISSUE_FACTORIES.emptyFile())
  } else {
    if (sizeTier.hardReject != null && size > sizeTier.hardReject) {
      issues.push(ISSUE_FACTORIES.fileSizeReject(size, sizeTier.hardReject))
    } else if (sizeTier.softWarning != null && size > sizeTier.softWarning) {
      issues.push(ISSUE_FACTORIES.fileSizeWarning(size, sizeTier.softWarning))
    }
  }

  return {
    size,
    humanSize: formatSize(size),
    issues,
  }
}

function validateDeclaration(filename, declaredMime) {
  const issues = []
  const extension = getExtensionFromFilename(filename)
  const expectedMime = getMimeForExtension(extension)

  if (!extension) {
    issues.push(createWarningIssue(
      ISSUE_CODES.UNKNOWN_EXTENSION,
      '文件没有扩展名，将仅通过内容检测',
      '建议添加文件扩展名以便更好地识别文件类型',
      { filename }
    ))
  }

  return {
    filename,
    extension,
    declaredMime,
    expectedMime,
    issues,
  }
}

function validateMagicNumber(bytes, declaredMime, extension, options = {}) {
  const issues = []
  const detection = detectMimeFromBytes(bytes)
  const detectedMime = detection.primary?.mime || null
  const detectedDescription = detection.primary?.description || null
  const isContainer = detection.primary?.isContainer || false
  const category = detection.primary?.category || 'unknown'

  if (detectedMime && declaredMime) {
    const normalizedDeclared = declaredMime.toLowerCase()
    const normalizedDetected = detectedMime.toLowerCase()

    if (isOctetStream(declaredMime) && !isOctetStream(detectedMime)) {
      issues.push(ISSUE_FACTORIES.octetStreamMismatch(detectedMime))
    } else if (normalizedDeclared !== normalizedDetected &&
               !normalizedDeclared.startsWith(normalizedDetected.split('/')[0] + '/')) {
      issues.push(ISSUE_FACTORIES.mimeMismatch(declaredMime, detectedMime, extension))
    }
  }

  if (isContainer) {
    issues.push(ISSUE_FACTORIES.zipContainerWarning())
  }

  if (detectedMime && isExecutableMime(detectedMime)) {
    issues.push(ISSUE_FACTORIES.executableRisk(detectedMime, detectedDescription))
  }

  if (!detectedMime && bytes.length > 0 && options.checkUtf8 !== false) {
    if (isLikelyUtf8Text(bytes)) {
      issues.push(createInfoIssue(
        'LIKELY_TEXT_FILE',
        '未检测到已知的文件签名，但内容看起来是 UTF-8 文本',
        '可能是纯文本文件或无 BOM 的源代码文件',
        { category: 'text' }
      ))
    }
  }

  return {
    detection,
    detectedMime,
    detectedDescription,
    isContainer,
    category,
    bytesRead: bytes.length,
    issues,
  }
}

function validateSingleFilePipeline(file, bytes, options = {}) {
  const allIssues = []

  const sizeResult = validateFileSize(file, options.sizeTier)
  allIssues.push(...sizeResult.issues)

  const declResult = validateDeclaration(file.name, file.type)
  allIssues.push(...declResult.issues)

  const magicResult = validateMagicNumber(bytes, declResult.declaredMime, declResult.extension, options)
  allIssues.push(...magicResult.issues)

  const hasErrors = allIssues.some((issue) => issue.severity === SEVERITY.ERROR)
  const hasWarnings = allIssues.some((issue) => issue.severity === SEVERITY.WARNING)

  const result = createValidationResult(
    !hasErrors,
    allIssues,
    magicResult.detectedMime,
    declResult.declaredMime || declResult.expectedMime,
    {
      filename: file.name,
      extension: declResult.extension,
      size: sizeResult.size,
      humanSize: sizeResult.humanSize,
      detectedDescription: magicResult.detectedDescription,
      isContainer: magicResult.isContainer,
      category: magicResult.category,
      confidence: magicResult.detection.confidence,
      matches: magicResult.detection.matches,
      hasErrors,
      hasWarnings,
      bytes: bytes.slice(0, MAX_HEADER_BYTES),
    }
  )

  return result
}

function validateMultipleFilesPipeline(results, options = {}) {
  const allIssues = results.flatMap((r) => r.issues)
  const passedCount = results.filter((r) => r.ok).length
  const failedCount = results.filter((r) => !r.ok).length
  const totalSize = results.reduce((sum, r) => sum + r.size, 0)

  return {
    results,
    allIssues,
    summary: {
      totalFiles: results.length,
      passedCount,
      failedCount,
      totalSize,
      totalHumanSize: formatSize(totalSize),
      hasErrors: allIssues.some((i) => i.severity === SEVERITY.ERROR),
      hasWarnings: allIssues.some((i) => i.severity === SEVERITY.WARNING),
    },
    options,
  }
}

function isDirectory(file) {
  if (file.type === '' && file.size === 0) {
    return true
  }
  if (file.webkitRelativePath && file.webkitRelativePath.includes('/')) {
    return true
  }
  return false
}

export {
  validateFileSize,
  validateDeclaration,
  validateMagicNumber,
  validateSingleFilePipeline,
  validateMultipleFilesPipeline,
  isDirectory,
}
