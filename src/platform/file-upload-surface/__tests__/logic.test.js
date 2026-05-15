import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  MATCH_STATES,
  DRAG_STATES,
  READ_MODES,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_SINGLE_FILE_SIZE,
  DEFAULT_MAX_TOTAL_SIZE,
  DEFAULT_ALLOW_EMPTY_FILE,
  DEFAULT_PARTIAL_PASS,
  ALLOWED_EXTENSIONS_DEFAULT,
  MAX_FILE_HEADER_BYTES,

  getErrorMessage,
  getRecoveryHint,
  createError,
  createDiagnostic,
  isValidErrorCode,

  MIME_TABLE,
  MAGIC_NUMBERS,
  MIME_TO_EXTENSION,
  buildExtensionIndex,
  buildMimeIndex,
  normalizeExtension,
  normalizeMime,
  getExtensionForMime,
  getExtensionForMimeOrDefault,
  suggestFilenameFromMime,
  isTextBasedMime,
  isImageMime,
  getExtensionFromFilename,
  formatSize,

  matchesSignature,
  inferMimeTypeFromBytes,
  compareWithExtension,
  bytesToHexString,

  DEFAULT_OPTIONS,
  validateOptions,
  validateExtension,
  validateSingleFileSize,
  validateEmptyFile,
  validateFileCount,
  validateTotalSize,
  validateFiles,
  prepareUpload,

  createDragStateMachine,
  deduplicateFilenames,
  buildDownloadDescriptor,
  buildDownloadDescriptors,
  isNonUtf8Filename,
} from '../logic/index.js'

function createMockFile(name, size, type = 'application/octet-stream', bytes = null) {
  const blob = bytes ? new Blob([bytes], { type }) : new Blob(['x'.repeat(size)], { type })
  Object.defineProperty(blob, 'name', { value: name, writable: false })
  Object.defineProperty(blob, 'lastModified', { value: Date.now(), writable: false })
  return blob
}

describe('constants module', () => {
  test('ERROR_CODES should have all expected codes', () => {
    expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
    expect(ERROR_CODES.EXTENSION_NOT_ALLOWED).toBe('EXTENSION_NOT_ALLOWED')
    expect(ERROR_CODES.MIME_CONFLICT).toBe('MIME_CONFLICT')
    expect(ERROR_CODES.FILE_SIZE_EXCEEDED).toBe('FILE_SIZE_EXCEEDED')
    expect(ERROR_CODES.TOTAL_SIZE_EXCEEDED).toBe('TOTAL_SIZE_EXCEEDED')
    expect(ERROR_CODES.FILE_COUNT_EXCEEDED).toBe('FILE_COUNT_EXCEEDED')
    expect(ERROR_CODES.FILE_READ_ERROR).toBe('FILE_READ_ERROR')
    expect(ERROR_CODES.EMPTY_FILE).toBe('EMPTY_FILE')
    expect(ERROR_CODES.DIRECTORY_NOT_SUPPORTED).toBe('DIRECTORY_NOT_SUPPORTED')
    expect(ERROR_CODES.NON_UTF8_FILENAME).toBe('NON_UTF8_FILENAME')
    expect(ERROR_CODES.CLIPBOARD_READ_ERROR).toBe('CLIPBOARD_READ_ERROR')
    expect(ERROR_CODES.UPLOAD_PREPARE_ERROR).toBe('UPLOAD_PREPARE_ERROR')
  })

  test('should have messages for all error codes', () => {
    Object.values(ERROR_CODES).forEach((code) => {
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof ERROR_MESSAGES[code]).toBe('string')
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    })
  })

  test('MATCH_STATES should have three states', () => {
    expect(MATCH_STATES.MATCH).toBe('match')
    expect(MATCH_STATES.CONFLICT).toBe('conflict')
    expect(MATCH_STATES.UNKNOWN).toBe('unknown')
  })

  test('DRAG_STATES should have two states', () => {
    expect(DRAG_STATES.IDLE).toBe('idle')
    expect(DRAG_STATES.DRAGGING_OVER).toBe('dragging_over')
  })

  test('READ_MODES should have two modes', () => {
    expect(READ_MODES.VALIDATE_ONLY).toBe('validate_only')
    expect(READ_MODES.READ_CONTENT).toBe('read_content')
  })

  test('DEFAULT values should be sane', () => {
    expect(DEFAULT_MAX_FILES).toBe(10)
    expect(DEFAULT_MAX_SINGLE_FILE_SIZE).toBe(50 * 1024 * 1024)
    expect(DEFAULT_MAX_TOTAL_SIZE).toBe(200 * 1024 * 1024)
    expect(DEFAULT_ALLOW_EMPTY_FILE).toBe(false)
    expect(DEFAULT_PARTIAL_PASS).toBe(true)
  })

  test('ALLOWED_EXTENSIONS_DEFAULT should contain common extensions', () => {
    expect(ALLOWED_EXTENSIONS_DEFAULT.has('txt')).toBe(true)
    expect(ALLOWED_EXTENSIONS_DEFAULT.has('json')).toBe(true)
    expect(ALLOWED_EXTENSIONS_DEFAULT.has('png')).toBe(true)
    expect(ALLOWED_EXTENSIONS_DEFAULT.has('jpg')).toBe(true)
    expect(ALLOWED_EXTENSIONS_DEFAULT.has('pdf')).toBe(true)
    expect(ALLOWED_EXTENSIONS_DEFAULT.has('zip')).toBe(true)
  })

  test('MAX_FILE_HEADER_BYTES should be 512', () => {
    expect(MAX_FILE_HEADER_BYTES).toBe(512)
  })
})

describe('errors module', () => {
  test('getErrorMessage should return correct message', () => {
    expect(getErrorMessage(ERROR_CODES.EMPTY_INPUT)).toBe(ERROR_MESSAGES[ERROR_CODES.EMPTY_INPUT])
  })

  test('getErrorMessage should return default for unknown codes', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('未知错误')
  })

  test('createError should create error with default message', () => {
    const result = createError(ERROR_CODES.EMPTY_INPUT)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.EMPTY_INPUT])
    expect(result.userMessage).toBe(ERROR_MESSAGES[ERROR_CODES.EMPTY_INPUT])
  })

  test('createError should accept custom message', () => {
    const customMsg = 'Custom message'
    const result = createError(ERROR_CODES.EMPTY_INPUT, customMsg)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(result.errorMessage).toBe(customMsg)
    expect(result.userMessage).toBe(customMsg)
  })

  test('createError should include filename', () => {
    const result = createError(ERROR_CODES.FILE_SIZE_EXCEEDED, null, 'test.txt')
    expect(result.filename).toBe('test.txt')
  })

  test('createDiagnostic should create diagnostic', () => {
    const result = createDiagnostic(ERROR_CODES.EXTENSION_NOT_ALLOWED, 'test.exe', { reason: 'test' })
    expect(result.errorCode).toBe(ERROR_CODES.EXTENSION_NOT_ALLOWED)
    expect(result.filename).toBe('test.exe')
    expect(result.details.reason).toBe('test')
  })

  test('isValidErrorCode should validate correctly', () => {
    expect(isValidErrorCode(ERROR_CODES.EMPTY_INPUT)).toBe(true)
    expect(isValidErrorCode('UNKNOWN')).toBe(false)
  })
})

describe('mimeData module', () => {
  test('normalizeExtension should handle null and undefined', () => {
    expect(normalizeExtension(null)).toBe('')
    expect(normalizeExtension(undefined)).toBe('')
  })

  test('normalizeExtension should trim whitespace and remove dot', () => {
    expect(normalizeExtension('  .PDF  ')).toBe('pdf')
  })

  test('normalizeExtension should convert to lowercase', () => {
    expect(normalizeExtension('PNG')).toBe('png')
  })

  test('normalizeMime should handle null and undefined', () => {
    expect(normalizeMime(null)).toBe('')
    expect(normalizeMime(undefined)).toBe('')
  })

  test('normalizeMime should strip parameters', () => {
    expect(normalizeMime('text/html; charset=utf-8')).toBe('text/html')
  })

  test('getExtensionForMime should return correct extension', () => {
    expect(getExtensionForMime('image/png')).toBe('png')
    expect(getExtensionForMime('application/pdf')).toBe('pdf')
  })

  test('getExtensionForMime should return null for unknown mime', () => {
    expect(getExtensionForMime('unknown/type')).toBeNull()
  })

  test('getExtensionForMimeOrDefault should return default for unknown', () => {
    expect(getExtensionForMimeOrDefault('unknown/type', 'bin')).toBe('bin')
  })

  test('suggestFilenameFromMime should generate filename', () => {
    const name = suggestFilenameFromMime('image/png', 'clip')
    expect(name).toBe('clip.png')
  })

  test('isTextBasedMime should detect text types', () => {
    expect(isTextBasedMime('text/plain')).toBe(true)
    expect(isTextBasedMime('application/json')).toBe(true)
    expect(isTextBasedMime('image/png')).toBe(false)
  })

  test('isImageMime should detect image types', () => {
    expect(isImageMime('image/png')).toBe(true)
    expect(isImageMime('text/plain')).toBe(false)
  })

  test('getExtensionFromFilename should extract extension', () => {
    expect(getExtensionFromFilename('document.pdf')).toBe('pdf')
    expect(getExtensionFromFilename('image.tar.gz')).toBe('gz')
    expect(getExtensionFromFilename('README')).toBe('')
    expect(getExtensionFromFilename('.gitignore')).toBe('')
  })

  test('formatSize should format bytes correctly', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(1024)).toBe('1.00 KB')
    expect(formatSize(1024 * 1024)).toBe('1.00 MB')
  })

  test('buildExtensionIndex should build index', () => {
    const table = [
      { extension: 'html', mime: 'text/html', priority: 100, isRecommended: true, category: 'web' },
      { extension: 'htm', mime: 'text/html', priority: 90, isRecommended: false, category: 'web' },
    ]
    const index = buildExtensionIndex(table)
    expect(index.has('html')).toBe(true)
    expect(index.has('htm')).toBe(true)
  })

  test('buildMimeIndex should build index', () => {
    const table = [
      { extension: 'html', mime: 'text/html', priority: 100, isRecommended: true, category: 'web' },
    ]
    const index = buildMimeIndex(table)
    expect(index.has('text/html')).toBe(true)
  })
})

describe('magicNumbers module', () => {
  test('matchesSignature should match exact sequence', () => {
    const pdfSignature = [0x25, 0x50, 0x44, 0x46]
    expect(matchesSignature([0x25, 0x50, 0x44, 0x46], pdfSignature)).toBe(true)
    expect(matchesSignature([0x25, 0x50], pdfSignature)).toBe(false)
    expect(matchesSignature([0x00, 0x00, 0x25, 0x50, 0x44, 0x46], pdfSignature, 2)).toBe(true)
  })

  test('inferMimeTypeFromBytes should return error for empty', () => {
    const result = inferMimeTypeFromBytes(new Uint8Array())
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('inferMimeTypeFromBytes should detect PDF', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34])
    const result = inferMimeTypeFromBytes(pdfBytes)
    expect(result.success).toBe(true)
    expect(result.matches.length).toBeGreaterThan(0)
    const pdfMatch = result.matches.find((m) => m.mime === 'application/pdf')
    expect(pdfMatch).toBeDefined()
  })

  test('inferMimeTypeFromBytes should detect PNG', () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00])
    const result = inferMimeTypeFromBytes(pngBytes)
    expect(result.success).toBe(true)
    const pngMatch = result.matches.find((m) => m.mime === 'image/png')
    expect(pngMatch).toBeDefined()
  })

  test('inferMimeTypeFromBytes should detect EXE', () => {
    const exeBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x00])
    const result = inferMimeTypeFromBytes(exeBytes)
    expect(result.success).toBe(true)
    const exeMatch = result.matches.find((m) => m.mime === 'application/vnd.microsoft.portable-executable')
    expect(exeMatch).toBeDefined()
  })

  test('compareWithExtension should return MATCH when consistent', () => {
    const extIndex = buildExtensionIndex(MIME_TABLE)
    const mimeIndex = buildMimeIndex(MIME_TABLE)
    const inferred = [{ mime: 'application/pdf', description: 'PDF' }]
    const result = compareWithExtension(inferred, 'pdf', extIndex, mimeIndex)
    expect(result.matchState).toBe(MATCH_STATES.MATCH)
  })

  test('compareWithExtension should return CONFLICT when inconsistent', () => {
    const extIndex = buildExtensionIndex(MIME_TABLE)
    const mimeIndex = buildMimeIndex(MIME_TABLE)
    const inferred = [{ mime: 'image/png', description: 'PNG' }]
    const result = compareWithExtension(inferred, 'pdf', extIndex, mimeIndex)
    expect(result.matchState).toBe(MATCH_STATES.CONFLICT)
  })

  test('compareWithExtension should return UNKNOWN when no inferred matches', () => {
    const extIndex = buildExtensionIndex(MIME_TABLE)
    const mimeIndex = buildMimeIndex(MIME_TABLE)
    const result = compareWithExtension([], 'pdf', extIndex, mimeIndex)
    expect(result.matchState).toBe(MATCH_STATES.UNKNOWN)
  })

  test('bytesToHexString should convert to hex', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    expect(bytesToHexString(bytes)).toBe('25 50 44 46')
  })
})

describe('validation module', () => {
  test('validateOptions should handle array of extensions', () => {
    const result = validateOptions({
      allowedExtensions: ['PDF', '.png', ' TXT '],
    })
    expect(result.allowedExtensions.has('pdf')).toBe(true)
    expect(result.allowedExtensions.has('png')).toBe(true)
    expect(result.allowedExtensions.has('txt')).toBe(true)
  })

  test('validateOptions should handle Set of extensions', () => {
    const result = validateOptions({
      allowedExtensions: new Set(['pdf', 'png']),
    })
    expect(result.allowedExtensions.has('pdf')).toBe(true)
    expect(result.allowedExtensions.has('png')).toBe(true)
  })

  test('validateExtension should reject unknown extension', () => {
    const result = validateExtension('test.exe', new Set(['txt', 'pdf']))
    expect(result.success).toBe(false)
    expect(result.diagnostic.errorCode).toBe(ERROR_CODES.EXTENSION_NOT_ALLOWED)
  })

  test('validateExtension should reject no extension', () => {
    const result = validateExtension('test', new Set(['txt']))
    expect(result.success).toBe(false)
  })

  test('validateExtension should accept valid extension', () => {
    const result = validateExtension('test.txt', new Set(['txt']))
    expect(result.success).toBe(true)
    expect(result.extension).toBe('txt')
  })

  test('validateSingleFileSize should reject oversized file', () => {
    const file = createMockFile('test.txt', 1000)
    const result = validateSingleFileSize(file, 500)
    expect(result.success).toBe(false)
    expect(result.diagnostic.errorCode).toBe(ERROR_CODES.FILE_SIZE_EXCEEDED)
  })

  test('validateSingleFileSize should accept valid size', () => {
    const file = createMockFile('test.txt', 100)
    const result = validateSingleFileSize(file, 500)
    expect(result.success).toBe(true)
  })

  test('validateEmptyFile should reject empty file when not allowed', () => {
    const file = createMockFile('test.txt', 0)
    const result = validateEmptyFile(file, false)
    expect(result.success).toBe(false)
    expect(result.diagnostic.errorCode).toBe(ERROR_CODES.EMPTY_FILE)
  })

  test('validateEmptyFile should accept empty file when allowed', () => {
    const file = createMockFile('test.txt', 0)
    const result = validateEmptyFile(file, true)
    expect(result.success).toBe(true)
  })

  test('validateFileCount should reject too many files', () => {
    const files = [{}, {}, {}]
    const result = validateFileCount(files, 2)
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.FILE_COUNT_EXCEEDED)
  })

  test('validateTotalSize should reject oversized total', () => {
    const files = [
      createMockFile('a.txt', 500),
      createMockFile('b.txt', 600),
    ]
    const result = validateTotalSize(files, 1000)
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.TOTAL_SIZE_EXCEEDED)
  })

  test('prepareUpload should return placeholder', () => {
    const result = prepareUpload({ name: 'test.txt', size: 100 })
    expect(result.placeholder).toBe(true)
    expect(result.url).toBeDefined()
  })
})

describe('fileHandling module', () => {
  test('createDragStateMachine should work correctly', () => {
    const machine = createDragStateMachine()

    expect(machine.getState()).toBe(DRAG_STATES.IDLE)
    expect(machine.isDragging()).toBe(false)

    machine.enter()
    expect(machine.getState()).toBe(DRAG_STATES.DRAGGING_OVER)
    expect(machine.isDragging()).toBe(true)
    expect(machine.getCounter()).toBe(1)

    machine.enter()
    expect(machine.getCounter()).toBe(2)

    machine.leave()
    expect(machine.getCounter()).toBe(1)
    expect(machine.isDragging()).toBe(true)

    machine.leave()
    expect(machine.getState()).toBe(DRAG_STATES.IDLE)
    expect(machine.isDragging()).toBe(false)

    machine.enter()
    machine.drop()
    expect(machine.getState()).toBe(DRAG_STATES.IDLE)
    expect(machine.getCounter()).toBe(0)
  })

  test('deduplicateFilenames should handle duplicates', () => {
    const files = [
      createMockFile('note.txt', 10),
      createMockFile('note.txt', 20),
      createMockFile('note.txt', 30),
    ]

    const result = deduplicateFilenames(files)

    expect(result.length).toBe(3)
    expect(result[0].originalName).toBe('note.txt')
    expect(result[0].finalName).toBe('note.txt')
    expect(result[0].isDuplicate).toBe(false)

    expect(result[1].finalName).toBe('note_1.txt')
    expect(result[1].isDuplicate).toBe(true)

    expect(result[2].finalName).toBe('note_2.txt')
    expect(result[2].isDuplicate).toBe(true)
  })

  test('deduplicateFilenames should handle files without extension', () => {
    const files = [
      createMockFile('readme', 10),
      createMockFile('readme', 20),
    ]

    const result = deduplicateFilenames(files)

    expect(result[0].finalName).toBe('readme')
    expect(result[1].finalName).toBe('readme_1')
  })

  test('buildDownloadDescriptor should create descriptor', () => {
    const file = createMockFile('test.txt', 100, 'text/plain')
    const descriptor = buildDownloadDescriptor(file)

    expect(descriptor.filename).toBe('test.txt')
    expect(descriptor.mime).toBe('text/plain')
    expect(descriptor.size).toBe(100)
    expect(descriptor.extension).toBe('txt')
    expect(descriptor.fileHandle).toBe(file)
  })

  test('buildDownloadDescriptors should create multiple descriptors', () => {
    const files = [
      createMockFile('a.txt', 10),
      createMockFile('b.txt', 20),
    ]
    const descriptors = buildDownloadDescriptors(files)
    expect(descriptors.length).toBe(2)
    expect(descriptors[0].filename).toBe('a.txt')
    expect(descriptors[1].filename).toBe('b.txt')
  })

  test('isNonUtf8Filename should return false for normal filenames', () => {
    expect(isNonUtf8Filename('test.txt')).toBe(false)
    expect(isNonUtf8Filename('中文.pdf')).toBe(false)
    expect(isNonUtf8Filename('file_123.png')).toBe(false)
  })

  test('isNonUtf8Filename should return false for empty or null', () => {
    expect(isNonUtf8Filename('')).toBe(false)
    expect(isNonUtf8Filename(null)).toBe(false)
    expect(isNonUtf8Filename(undefined)).toBe(false)
  })
})

describe('integration: validation pipeline', () => {
  test('validateFiles should validate multiple files', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const files = [
      createMockFile('valid.png', 1000, 'image/png', pngBytes),
      createMockFile('invalid.exe', 100, 'application/octet-stream'),
    ]

    const result = await validateFiles(files, {
      allowedExtensions: ['png', 'txt'],
      partialPass: true,
    })

    expect(result.stats.totalFiles).toBe(2)
    expect(result.stats.passedCount).toBe(1)
    expect(result.stats.failedCount).toBe(1)
    expect(result.success).toBe(true)
  })

  test('validateFiles should fail all when partialPass is false', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const files = [
      createMockFile('valid.png', 1000, 'image/png', pngBytes),
      createMockFile('invalid.exe', 100, 'application/octet-stream'),
    ]

    const result = await validateFiles(files, {
      allowedExtensions: ['png', 'txt'],
      partialPass: false,
    })

    expect(result.success).toBe(false)
    expect(result.stats.failedCount).toBe(1)
  })

  test('validateFiles should detect extension vs magic number conflict', async () => {
    const exeBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00])
    const files = [
      createMockFile('malicious.txt', 100, 'text/plain', exeBytes),
    ]

    const result = await validateFiles(files, {
      allowedExtensions: ['txt'],
      partialPass: true,
      checkMagicNumber: true,
    })

    const failedResult = result.results[0]
    expect(failedResult.passed).toBe(false)
    const conflictDiagnostic = failedResult.diagnostics.find(
      (d) => d.errorCode === ERROR_CODES.MIME_CONFLICT
    )
    expect(conflictDiagnostic).toBeDefined()
  })
})
