import {
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_LINES,
  MAX_LINE_LENGTH,
  FRAME_SIZE,
  PLATFORM,
  PLATFORM_LABELS,
  EXAMPLE_CASES,
  PRESETS,
  DEFAULT_OPTIONS,
  STORAGE_KEY,
  STORAGE_VERSION,
} from './constants.js'
import { validateInput } from './errors.js'
import {
  parseSinglePath,
  computeDiff,
  highlightSeparators,
  joinPaths,
} from './parser.js'

function buildNormalizedOptions(options = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
  }
}

function buildErrorResult(errorCode, errorMessage = null) {
  return {
    rawText: null,
    lines: [],
    summary: null,
    errorCode,
    errorMessage: errorMessage || ERROR_MESSAGES[errorCode] || '未知错误',
  }
}

function processFilePaths(params = {}) {
  if (params?.rawText === null || params?.rawText === undefined) {
    return buildErrorResult(ERROR_CODES.NULL_INPUT)
  }

  const rawText = params.rawText
  const options = buildNormalizedOptions(params.options)

  const validation = validateInput(rawText, MAX_LINES, MAX_LINE_LENGTH)
  if (!validation.valid) {
    return buildErrorResult(validation.errorCode, validation.errorMessage)
  }

  const lines = rawText.split(/\r?\n/)
  const processedLines = []
  const summary = {
    totalLines: lines.length,
    nonEmptyLines: 0,
    uncPaths: 0,
    windowsPaths: 0,
    posixPaths: 0,
    absolutePaths: 0,
    relativePaths: 0,
    mixedSeparators: 0,
    pathsWithWarnings: 0,
    pathsWithErrors: 0,
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1
    const isEmpty = line.trim() === ''

    let parsed = null
    let diff = null
    let highlighted = null

    if (!isEmpty) {
      summary.nonEmptyLines++
      parsed = parseSinglePath(line, options)

      if (parsed.isUnc) summary.uncPaths++
      if (parsed.detectedPlatform === 'windows') summary.windowsPaths++
      if (parsed.detectedPlatform === 'posix') summary.posixPaths++
      if (parsed.isAbsolute) summary.absolutePaths++
      else summary.relativePaths++
      if (parsed.isMixedSeparators) summary.mixedSeparators++
      if (parsed.diagnostics.length > 0) summary.pathsWithWarnings++
      if (parsed.isDangerous) summary.pathsWithErrors++

      diff = computeDiff(line, parsed.normalizedPath)
      highlighted = highlightSeparators(line, parsed.detectedPlatform, options)
    }

    processedLines.push({
      lineNumber,
      rawText: line,
      isEmpty,
      parsed,
      diff,
      highlighted,
    })
  }

  return {
    rawText,
    lines: processedLines,
    summary,
    options,
    errorCode: null,
    errorMessage: null,
  }
}

function exportToForwardSlash(path) {
  return path.replace(/\\/g, '/')
}

function exportToBackslash(path) {
  return path.replace(/\//g, '\\')
}

function encodePathForFileUrl(path) {
  const encoded = path
    .replace(/%/g, '%25')
    .replace(/ /g, '%20')
    .replace(/\\/g, '/')
  return encoded
}

function toFileUrl(path, detectedPlatform) {
  if (!path) return ''

  const isWindows = detectedPlatform === 'windows' || /^[a-zA-Z]:/.test(path) || path.startsWith('\\\\')

  let normalized = exportToForwardSlash(path)

  if (normalized.startsWith('//')) {
    return 'file:' + encodePathForFileUrl(path)
  }

  if (isWindows) {
    const driveMatch = normalized.match(/^([a-zA-Z]):\/*(.*)$/)
    if (driveMatch) {
      const drive = driveMatch[1].toUpperCase()
      const rest = driveMatch[2]
      return `file:///${drive}:/${encodePathForFileUrl(rest)}`
    }
  }

  if (normalized.startsWith('/')) {
    return 'file://' + encodePathForFileUrl(normalized)
  }

  return 'file://' + encodePathForFileUrl('/' + normalized)
}

function buildStructuredJson(parsed) {
  if (!parsed) return null

  return {
    rawPath: parsed.rawPath,
    normalizedPath: parsed.normalizedPath,
    isAbsolute: parsed.isAbsolute,
    isUnc: parsed.isUnc,
    platform: parsed.detectedPlatform,
    root: parsed.root,
    segments: parsed.segments,
    normalizedSegments: parsed.normalizedSegments,
    basename: parsed.basename,
    ext: parsed.ext,
    fullBasename: parsed.fullBasename,
    hasDrive: parsed.hasDrive,
    drive: parsed.normalizedDrive,
    uncServer: parsed.uncServer,
    uncShare: parsed.uncShare,
    diagnostics: parsed.diagnostics,
    isDangerous: parsed.isDangerous,
  }
}

export {
  processFilePaths,
  parseSinglePath,
  computeDiff,
  highlightSeparators,
  joinPaths,
  exportToForwardSlash,
  exportToBackslash,
  toFileUrl,
  buildStructuredJson,
  buildNormalizedOptions,
  buildErrorResult,
  ERROR_CODES,
  ERROR_MESSAGES,
  MAX_LINES,
  MAX_LINE_LENGTH,
  FRAME_SIZE,
  PLATFORM,
  PLATFORM_LABELS,
  EXAMPLE_CASES,
  PRESETS,
  DEFAULT_OPTIONS,
  STORAGE_KEY,
  STORAGE_VERSION,
}
