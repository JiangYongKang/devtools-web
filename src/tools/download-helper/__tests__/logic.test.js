import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  ERROR_CODES,
  DEFAULT_MAX_FILENAME_LENGTH,
  DEFAULT_BLOB_SIZE_LIMIT,
  WINDOWS_RESERVED_NAMES,
} from '../logic/constants.js'
import {
  createError,
  getErrorMessage,
} from '../logic/errors.js'
import {
  sanitizeFilename,
  generateStableShortHash,
  percentEncodeFilename,
  parseContentDisposition,
  decodeFilenameStar,
} from '../logic/filenameUtils.js'
import {
  getExtensionFromFilename,
  inferMimeFromFilename,
  inferMimeFromContent,
  addUtf8Bom,
  shouldAddUtf8Bom,
} from '../logic/mimeUtils.js'
import {
  checkMemoryPressure,
  formatSize,
  buildDownloadDescriptor,
} from '../logic/downloadDescriptor.js'

describe('constants module', () => {
  test('ERROR_CODES should have all required codes', () => {
    expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
    expect(ERROR_CODES.INVALID_FORMAT).toBe('INVALID_FORMAT')
    expect(ERROR_CODES.MEMORY_PRESSURE).toBe('MEMORY_PRESSURE')
    expect(ERROR_CODES.UNSUPPORTED_PAYLOAD).toBe('UNSUPPORTED_PAYLOAD')
  })

  test('DEFAULT_MAX_FILENAME_LENGTH should be 255', () => {
    expect(DEFAULT_MAX_FILENAME_LENGTH).toBe(255)
  })

  test('WINDOWS_RESERVED_NAMES should include common reserved names', () => {
    expect(WINDOWS_RESERVED_NAMES.has('CON')).toBe(true)
    expect(WINDOWS_RESERVED_NAMES.has('NUL')).toBe(true)
    expect(WINDOWS_RESERVED_NAMES.has('COM1')).toBe(true)
    expect(WINDOWS_RESERVED_NAMES.has('LPT1')).toBe(true)
  })
})

describe('errors module', () => {
  test('getErrorMessage should return correct message', () => {
    expect(getErrorMessage(ERROR_CODES.EMPTY_INPUT)).toBe('输入不能为空')
  })

  test('getErrorMessage should return default for unknown codes', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('未知错误')
  })

  test('createError should create error with default message', () => {
    const result = createError(ERROR_CODES.EMPTY_INPUT)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(result.errorMessage).toBe('输入不能为空')
  })

  test('createError should accept custom message', () => {
    const customMsg = 'Custom message'
    const result = createError(ERROR_CODES.EMPTY_INPUT, customMsg)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(result.errorMessage).toBe(customMsg)
  })
})

describe('filenameUtils module - sanitizeFilename', () => {
  test('should return error for null/undefined/empty', () => {
    expect(sanitizeFilename(null).success).toBe(false)
    expect(sanitizeFilename(undefined).success).toBe(false)
    expect(sanitizeFilename('').success).toBe(false)
    expect(sanitizeFilename('   ').success).toBe(false)
  })

  test('should return error for null/undefined/empty with correct error code', () => {
    const result = sanitizeFilename('')
    expect(result.error?.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should strip Windows illegal characters', () => {
    expect(sanitizeFilename('normal"file".txt').sanitized).toBe('normalfile.txt')
    expect(sanitizeFilename('a<b>c:d/e\\f|g?h*i.txt').sanitized).toBe('abcdefghi.txt')
  })

  test('should strip control characters', () => {
    expect(sanitizeFilename('file\x00name.txt').sanitized).toBe('filename.txt')
  })

  test('should trim leading/trailing whitespace and dots', () => {
    expect(sanitizeFilename('  report.txt  ').sanitized).toBe('report.txt')
    expect(sanitizeFilename('..report.txt..').sanitized).toBe('report.txt')
    expect(sanitizeFilename('  ..report.txt..  ').sanitized).toBe('report.txt')
  })

  test('should handle Windows reserved names', () => {
    expect(sanitizeFilename('CON').sanitized).toBe('_CON_')
    expect(sanitizeFilename('NUL.txt').sanitized).toBe('_NUL_.txt')
    expect(sanitizeFilename('con').sanitized).toBe('_con_')
    expect(sanitizeFilename('COM1').sanitized).toBe('_COM1_')
  })

  test('should handle all whitespace/dots only case', () => {
    expect(sanitizeFilename('   . .   ').success).toBe(true)
    expect(sanitizeFilename('   . .   ').sanitized).toBe('download.txt')
  })

  test('should handle only dots case', () => {
    expect(sanitizeFilename('...').sanitized).toBe('download.txt')
  })

  test('should truncate long filenames', () => {
    const longName = 'a'.repeat(300) + '.txt'
    const result = sanitizeFilename(longName, { maxLength: 255 })
    expect(result.sanitized.length).toBeLessThanOrEqual(255)
    expect(result.sanitized.endsWith('.txt')).toBe(true)
  })

  test('should use hash suffix when truncating', () => {
    const longName = 'very_long_name_that_needs_to_be_truncated.txt'
    const result = sanitizeFilename(longName, { maxLength: 30 })
    expect(result.sanitized.length).toBeLessThanOrEqual(30)
    expect(result.sanitized.includes('-')).toBe(true)
  })

  test('should preserve extension when truncating', () => {
    const longName = 'a'.repeat(300) + '.json'
    const result = sanitizeFilename(longName, { maxLength: 50 })
    expect(result.sanitized.endsWith('.json')).toBe(true)
  })

  test('should preserve base name and extension separately', () => {
    const result = sanitizeFilename('my.report.v1.0.pdf')
    expect(result.baseName).toBe('my.report.v1.0')
    expect(result.extension).toBe('.pdf')
  })

  test('should handle single dot at start', () => {
    expect(sanitizeFilename('.gitignore').success).toBe(true)
  })

  test('should handle filenames with spaces', () => {
    expect(sanitizeFilename('my report 2024.pdf').sanitized).toBe('my report 2024.pdf')
  })

  test('should handle emoji and unicode', () => {
    expect(sanitizeFilename('📄报告_2024.csv').sanitized).toBe('📄报告_2024.csv')
    expect(sanitizeFilename('中文文件.txt').sanitized).toBe('中文文件.txt')
    expect(sanitizeFilename('🌍🌎🌏.txt').sanitized).toBe('🌍🌎🌏.txt')
  })
})

describe('filenameUtils module - generateStableShortHash', () => {
  test('should generate consistent hash for same input', () => {
    const hash1 = generateStableShortHash('test-filename')
    const hash2 = generateStableShortHash('test-filename')
    expect(hash1).toBe(hash2)
  })

  test('should generate different hash for different inputs', () => {
    const hash1 = generateStableShortHash('file-a')
    const hash2 = generateStableShortHash('file-b')
    expect(hash1).not.toBe(hash2)
  })

  test('should respect length parameter', () => {
    const hash = generateStableShortHash('test', 12)
    expect(hash.length).toBe(12)
  })

  test('should have minimum length of 1', () => {
    const hash = generateStableShortHash('test', 0)
    expect(hash.length).toBeGreaterThan(0)
  })

  test('should handle empty string', () => {
    expect(generateStableShortHash('')).toBeDefined()
    expect(typeof generateStableShortHash('')).toBe('string')
  })
})

describe('filenameUtils module - percentEncodeFilename', () => {
  test('should encode ASCII filename', () => {
    expect(percentEncodeFilename('report.csv')).toBe("UTF-8''report.csv")
  })

  test('should encode Chinese filename', () => {
    const result = percentEncodeFilename('中文文件.csv')
    expect(result.startsWith("UTF-8''")).toBe(true)
    expect(result.includes('%E4%B8%AD')).toBe(true)
  })

  test('should encode emoji', () => {
    const result = percentEncodeFilename('📄.txt')
    expect(result.startsWith("UTF-8''")).toBe(true)
  })

  test('should encode special characters', () => {
    const result = percentEncodeFilename('a!b(c)d*e.txt')
    expect(result).toBe("UTF-8''a%21b%28c%29d%2Ae.txt")
  })

  test('should handle space encoding', () => {
    const result = percentEncodeFilename('my file.txt')
    expect(result).toBe("UTF-8''my%20file.txt")
  })
})

describe('filenameUtils module - parseContentDisposition', () => {
  test('should return error for empty header', () => {
    const result = parseContentDisposition('')
    expect(result.success).toBe(false)
    expect(result.error?.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should parse simple ASCII filename', () => {
    const result = parseContentDisposition('attachment; filename="report.csv"')
    expect(result.success).toBe(true)
    expect(result.filename).toBe('report.csv')
  })

  test('should parse filename without quotes', () => {
    const result = parseContentDisposition('attachment; filename=report.csv')
    expect(result.success).toBe(true)
    expect(result.filename).toBe('report.csv')
  })

  test('should parse inline disposition', () => {
    const result = parseContentDisposition('inline; filename="file.txt"')
    expect(result.success).toBe(true)
    expect(result.filename).toBe('file.txt')
  })

  test('should parse filename* with UTF-8 encoding', () => {
    const header = "attachment; filename*=UTF-8''%E4%B8%AD%E6%96%87.csv"
    const result = parseContentDisposition(header)
    expect(result.success).toBe(true)
    expect(result.filenameStar).toBe("UTF-8''%E4%B8%AD%E6%96%87.csv")
    expect(result.decodedFilename).toBe('中文.csv')
  })

  test('should parse both filename and filename*', () => {
    const header = 'attachment; filename*=UTF-8\'\'%E4%B8%AD%E6%96%87.csv; filename="fallback.csv"'
    const result = parseContentDisposition(header)
    expect(result.success).toBe(true)
    expect(result.filename).toBe('fallback.csv')
    expect(result.decodedFilename).toBe('中文.csv')
  })

  test('should handle escaped quotes in filename', () => {
    const result = parseContentDisposition('attachment; filename="file\\"name.txt"')
    expect(result.success).toBe(true)
    expect(result.filename).toBe('file"name.txt')
  })

  test('should return error when no filename present', () => {
    const result = parseContentDisposition('attachment')
    expect(result.success).toBe(false)
  })

  test('should handle extra whitespace', () => {
    const result = parseContentDisposition('  attachment  ;  filename =  "test.txt"  ')
    expect(result.success).toBe(true)
    expect(result.filename).toBe('test.txt')
  })
})

describe('filenameUtils module - decodeFilenameStar', () => {
  test('should decode UTF-8 encoded filename', () => {
    const encoded = "UTF-8''%E4%B8%AD%E6%96%87.csv"
    expect(decodeFilenameStar(encoded)).toBe('中文.csv')
  })

  test('should handle plus sign as space', () => {
    const encoded = "UTF-8''my+file.txt"
    expect(decodeFilenameStar(encoded)).toBe('my file.txt')
  })

  test('should return null for invalid format', () => {
    expect(decodeFilenameStar('invalid')).toBeNull()
  })

  test('should handle non-UTF-8 charset', () => {
    const encoded = "ISO-8859-1''test.txt"
    expect(decodeFilenameStar(encoded)).toBe('test.txt')
  })

  test('should handle empty encoded value', () => {
    const encoded = "UTF-8''"
    expect(decodeFilenameStar(encoded)).toBe('')
  })
})

describe('mimeUtils module - getExtensionFromFilename', () => {
  test('should extract extension', () => {
    expect(getExtensionFromFilename('report.pdf')).toBe('pdf')
    expect(getExtensionFromFilename('data.json')).toBe('json')
    expect(getExtensionFromFilename('archive.tar.gz')).toBe('gz')
  })

  test('should handle files without extension', () => {
    expect(getExtensionFromFilename('README')).toBe('')
    expect(getExtensionFromFilename('Makefile')).toBe('')
  })

  test('should handle edge cases', () => {
    expect(getExtensionFromFilename('.gitignore')).toBe('')
    expect(getExtensionFromFilename('file.')).toBe('')
    expect(getExtensionFromFilename('')).toBe('')
    expect(getExtensionFromFilename(null)).toBe('')
  })
})

describe('mimeUtils module - inferMimeFromFilename', () => {
  test('should infer MIME from extension', () => {
    expect(inferMimeFromFilename('data.json')).toBe('application/json')
    expect(inferMimeFromFilename('report.csv')).toBe('text/csv;charset=utf-8')
    expect(inferMimeFromFilename('notes.txt')).toBe('text/plain;charset=utf-8')
  })

  test('should use fallback for unknown extensions', () => {
    expect(inferMimeFromFilename('file.unknown')).toBe('application/octet-stream')
  })

  test('should use custom fallback', () => {
    expect(inferMimeFromFilename('file.xyz', 'text/plain')).toBe('text/plain')
  })

  test('should handle no extension', () => {
    expect(inferMimeFromFilename('README')).toBe('application/octet-stream')
  })
})

describe('mimeUtils module - inferMimeFromContent', () => {
  test('should use overrideMime if provided', () => {
    const result = inferMimeFromContent('some content', { overrideMime: 'text/custom' })
    expect(result).toBe('text/custom')
  })

  test('should infer from filename first', () => {
    const result = inferMimeFromContent('not json', { filename: 'data.json' })
    expect(result).toBe('application/json')
  })

  test('should detect valid JSON content', () => {
    const jsonString = '{"name": "test", "value": 123}'
    expect(inferMimeFromContent(jsonString)).toBe('application/json')
  })

  test('should detect JSON array content', () => {
    const jsonString = '[{"a": 1}, {"b": 2}]'
    expect(inferMimeFromContent(jsonString)).toBe('application/json')
  })

  test('should detect HTML content', () => {
    const html = '<!DOCTYPE html><html><head></head></html>'
    expect(inferMimeFromContent(html)).toContain('text/html')
  })

  test('should detect XML content', () => {
    const xml = '<?xml version="1.0"?><root></root>'
    expect(inferMimeFromContent(xml)).toContain('application/xml')
  })

  test('should default to text/plain for plain text', () => {
    expect(inferMimeFromContent('Hello World')).toContain('text/plain')
  })

  test('should handle empty string', () => {
    expect(inferMimeFromContent('')).toContain('text/plain')
  })

  test('should handle invalid JSON (looks like JSON but not valid)', () => {
    const invalidJson = '{not valid json'
    expect(inferMimeFromContent(invalidJson)).toContain('text/plain')
  })
})

describe('mimeUtils module - addUtf8Bom', () => {
  test('should add BOM to string', () => {
    const result = addUtf8Bom('Hello')
    expect(result.startsWith('\uFEFF')).toBe(true)
    expect(result.endsWith('Hello')).toBe(true)
  })

  test('should handle null/undefined', () => {
    expect(addUtf8Bom(null)).toBeNull()
    expect(addUtf8Bom(undefined)).toBeUndefined()
  })

  test('should add BOM to Blob', () => {
    const blob = new Blob(['Hello'], { type: 'text/plain' })
    const result = addUtf8Bom(blob)
    expect(result).toBeInstanceOf(Blob)
    expect(result.size).toBe(blob.size + 3)
  })

  test('should add BOM to Uint8Array', () => {
    const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
    const result = addUtf8Bom(data)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(data.length + 3)
    expect(result[0]).toBe(0xEF)
    expect(result[1]).toBe(0xBB)
    expect(result[2]).toBe(0xBF)
  })

  test('should add BOM to ArrayBuffer', () => {
    const buffer = new ArrayBuffer(5)
    const view = new Uint8Array(buffer)
    view.set([0x48, 0x65, 0x6c, 0x6c, 0x6f])
    const result = addUtf8Bom(buffer)
    expect(result).toBeInstanceOf(ArrayBuffer)
    expect(result.byteLength).toBe(buffer.byteLength + 3)
  })
})

describe('mimeUtils module - shouldAddUtf8Bom', () => {
  test('should return true when forceBom is true', () => {
    expect(shouldAddUtf8Bom('text/plain', { forceBom: true })).toBe(true)
  })

  test('should return true for CSV MIME type', () => {
    expect(shouldAddUtf8Bom('text/csv')).toBe(true)
    expect(shouldAddUtf8Bom('text/csv;charset=utf-8')).toBe(true)
  })

  test('should respect addBomForCsv option', () => {
    expect(shouldAddUtf8Bom('text/csv', { addBomForCsv: false })).toBe(false)
  })

  test('should return false for other MIME types by default', () => {
    expect(shouldAddUtf8Bom('text/plain')).toBe(false)
    expect(shouldAddUtf8Bom('application/json')).toBe(false)
  })
})

describe('downloadDescriptor module - formatSize', () => {
  test('should format 0 bytes', () => {
    expect(formatSize(0)).toBe('0 B')
  })

  test('should format bytes', () => {
    expect(formatSize(500)).toBe('500.00 B')
  })

  test('should format KB', () => {
    expect(formatSize(1024)).toBe('1.00 KB')
    expect(formatSize(1536)).toBe('1.50 KB')
  })

  test('should format MB', () => {
    expect(formatSize(1024 * 1024)).toBe('1.00 MB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MB')
  })

  test('should format GB', () => {
    expect(formatSize(1024 * 1024 * 1024)).toBe('1.00 GB')
  })
})

describe('downloadDescriptor module - checkMemoryPressure', () => {
  test('should return isOverLimit=false for under limit', () => {
    const result = checkMemoryPressure(1000, 2000)
    expect(result.isOverLimit).toBe(false)
    expect(result.size).toBe(1000)
    expect(result.limit).toBe(2000)
  })

  test('should return isOverLimit=true for over limit', () => {
    const result = checkMemoryPressure(3000, 2000)
    expect(result.isOverLimit).toBe(true)
  })

  test('should return isOverLimit=false for exact limit', () => {
    const result = checkMemoryPressure(2000, 2000)
    expect(result.isOverLimit).toBe(false)
  })

  test('should include human-readable sizes', () => {
    const result = checkMemoryPressure(1024 * 1024, 2 * 1024 * 1024)
    expect(result.humanSize).toBe('1.00 MB')
    expect(result.humanLimit).toBe('2.00 MB')
  })

  test('should use default limit', () => {
    const result = checkMemoryPressure(1000)
    expect(result.limit).toBe(DEFAULT_BLOB_SIZE_LIMIT)
  })
})

describe('downloadDescriptor module - buildDownloadDescriptor', () => {
  test('should build descriptor from string payload', async () => {
    const descriptor = await buildDownloadDescriptor('Hello World', {
      filename: 'test.txt',
      revokeTimeout: 0,
    })

    expect(descriptor.success).toBe(true)
    expect(descriptor.filename).toBe('test.txt')
    expect(descriptor.mime).toContain('text/plain')
    expect(descriptor.blobSize).toBeGreaterThan(0)
    expect(typeof descriptor.revoke).toBe('function')
  })

  test('should build descriptor from Blob payload', async () => {
    const blob = new Blob(['Test content'], { type: 'text/plain' })
    const descriptor = await buildDownloadDescriptor(blob, {
      filename: 'blob.txt',
      revokeTimeout: 0,
    })

    expect(descriptor.success).toBe(true)
    expect(descriptor.filename).toBe('blob.txt')
    expect(descriptor.blobSize).toBe(blob.size)
  })

  test('should build descriptor from ArrayBuffer payload', async () => {
    const buffer = new ArrayBuffer(5)
    const view = new Uint8Array(buffer)
    view.set([0x48, 0x65, 0x6c, 0x6c, 0x6f])
    const descriptor = await buildDownloadDescriptor(buffer, {
      filename: 'data.bin',
      revokeTimeout: 0,
    })

    expect(descriptor.success).toBe(true)
    expect(descriptor.blobSize).toBe(5)
  })

  test('should use overrideMime if provided', async () => {
    const descriptor = await buildDownloadDescriptor('content', {
      filename: 'test.txt',
      overrideMime: 'application/custom-mime',
      revokeTimeout: 0,
    })

    expect(descriptor.mime).toBe('application/custom-mime')
  })

  test('should sanitize filename', async () => {
    const descriptor = await buildDownloadDescriptor('content', {
      filename: '  bad"file..  ',
      revokeTimeout: 0,
    })

    expect(descriptor.filename).not.toBe('  bad"file..  ')
    expect(descriptor.filename).not.toContain('"')
  })

  test('should return error for invalid filename', async () => {
    const descriptor = await buildDownloadDescriptor('content', {
      filename: '',
    })

    expect(descriptor.success).toBe(false)
    expect(descriptor.error?.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should enforce memory limit when memoryWarningOnly=false', async () => {
    const descriptor = await buildDownloadDescriptor('a'.repeat(1000), {
      filename: 'test.txt',
      memoryLimit: 500,
      memoryWarningOnly: false,
      revokeTimeout: 0,
    })

    expect(descriptor.success).toBe(false)
    expect(descriptor.error?.errorCode).toBe(ERROR_CODES.MEMORY_PRESSURE)
    expect(descriptor.memoryCheck).toBeDefined()
  })

  test('should allow over limit when memoryWarningOnly=true', async () => {
    const descriptor = await buildDownloadDescriptor('a'.repeat(1000), {
      filename: 'test.txt',
      memoryLimit: 500,
      memoryWarningOnly: true,
      revokeTimeout: 0,
    })

    expect(descriptor.success).toBe(true)
    expect(descriptor.memoryCheck.isOverLimit).toBe(true)
  })

  test('should add BOM for CSV content', async () => {
    const csvContent = 'name,age\nAlice,30\nBob,25'
    const descriptor = await buildDownloadDescriptor(csvContent, {
      filename: 'users.csv',
      revokeTimeout: 0,
    })

    expect(descriptor.success).toBe(true)
    expect(descriptor.mime).toContain('text/csv')
    expect(descriptor.blobSize).toBe(csvContent.length + 3)
  })

  test('should respect forceBom option', async () => {
    const content = 'Plain text content'
    const descriptor = await buildDownloadDescriptor(content, {
      filename: 'test.txt',
      forceBom: true,
      revokeTimeout: 0,
    })

    expect(descriptor.blobSize).toBe(content.length + 3)
  })

  test('should return isRevoked function', async () => {
    const descriptor = await buildDownloadDescriptor('test', {
      filename: 'test.txt',
      revokeTimeout: 0,
    })

    expect(typeof descriptor.isRevoked).toBe('function')
    expect(descriptor.isRevoked()).toBe(false)
  })

  test('should return clearRevokeTimeout function', async () => {
    const descriptor = await buildDownloadDescriptor('test', {
      filename: 'test.txt',
      revokeTimeout: 0,
    })

    expect(typeof descriptor.clearRevokeTimeout).toBe('function')
  })

  test('revoke function should mark as revoked', async () => {
    const descriptor = await buildDownloadDescriptor('test', {
      filename: 'test.txt',
      revokeTimeout: 0,
    })

    expect(descriptor.isRevoked()).toBe(false)
    if (descriptor.revoke) {
      descriptor.revoke()
      expect(descriptor.isRevoked()).toBe(true)
    }
  })

  test('should handle JSON payload with correct MIME', async () => {
    const jsonContent = '{"key": "value"}'
    const descriptor = await buildDownloadDescriptor(jsonContent, {
      filename: 'data.json',
      revokeTimeout: 0,
    })

    expect(descriptor.mime).toContain('application/json')
  })
})

describe('integration tests', () => {
  test('filename hash should be stable for same filename', async () => {
    const longName = 'a'.repeat(300) + '.txt'
    const result1 = sanitizeFilename(longName)
    const result2 = sanitizeFilename(longName)
    expect(result1.sanitized).toBe(result2.sanitized)
  })

  test('different long filenames should produce different hashes', async () => {
    const name1 = 'a'.repeat(300) + '.txt'
    const name2 = 'b'.repeat(300) + '.txt'
    const result1 = sanitizeFilename(name1)
    const result2 = sanitizeFilename(name2)
    expect(result1.sanitized).not.toBe(result2.sanitized)
  })

  test('Content-Disposition parse should work with sanitizeFilename', async () => {
    const header = "attachment; filename*=UTF-8''%E4%B8%AD%E6%96%87.csv"
    const parsed = parseContentDisposition(header)
    expect(parsed.success).toBe(true)

    if (parsed.decodedFilename) {
      const sanitized = sanitizeFilename(parsed.decodedFilename)
      expect(sanitized.success).toBe(true)
      expect(sanitized.sanitized).toBe('中文.csv')
    }
  })

  test('memory warning mode should still return valid descriptor', async () => {
    const largeContent = 'x'.repeat(2000)
    const descriptor = await buildDownloadDescriptor(largeContent, {
      filename: 'large.txt',
      memoryLimit: 1000,
      memoryWarningOnly: true,
      revokeTimeout: 0,
    })

    expect(descriptor.success).toBe(true)
    expect(descriptor.memoryCheck.isOverLimit).toBe(true)
    expect(descriptor.blobSize).toBe(2000)
  })

  test('filename extension should drive MIME inference', async () => {
    const plainText = 'Some plain text content'

    const csvDesc = await buildDownloadDescriptor(plainText, {
      filename: 'data.csv',
      revokeTimeout: 0,
    })
    expect(csvDesc.mime).toContain('text/csv')

    const jsonDesc = await buildDownloadDescriptor(plainText, {
      filename: 'data.json',
      revokeTimeout: 0,
    })
    expect(jsonDesc.mime).toBe('application/json')
  })
})
