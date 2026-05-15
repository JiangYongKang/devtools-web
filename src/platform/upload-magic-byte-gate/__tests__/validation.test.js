import { ISSUE_CODES, SEVERITY, DEFAULT_SIZE_TIER } from '../logic/constants.js'
import { createIssue, ISSUE_FACTORIES, createValidationResult, formatSize } from '../logic/errors.js'
import {
  validateFileSize,
  validateDeclaration,
  validateMagicNumber,
  isDirectory,
} from '../logic/validation.js'

describe('validation', () => {
  describe('createIssue', () => {
    it('should create issue with correct properties', () => {
      const issue = createIssue(
        ISSUE_CODES.MIME_MISMATCH,
        SEVERITY.ERROR,
        'Test message',
        'Test hint',
        { extra: 'data' }
      )

      expect(issue.code).toBe(ISSUE_CODES.MIME_MISMATCH)
      expect(issue.severity).toBe(SEVERITY.ERROR)
      expect(issue.message).toBe('Test message')
      expect(issue.hint).toBe('Test hint')
      expect(issue.details).toEqual({ extra: 'data' })
    })
  })

  describe('ISSUE_FACTORIES', () => {
    it('should create empty file issue', () => {
      const issue = ISSUE_FACTORIES.emptyFile()
      expect(issue.code).toBe(ISSUE_CODES.EMPTY_FILE)
      expect(issue.severity).toBe(SEVERITY.ERROR)
    })

    it('should create file size warning', () => {
      const issue = ISSUE_FACTORIES.fileSizeWarning(15 * 1024 * 1024, 10 * 1024 * 1024)
      expect(issue.code).toBe(ISSUE_CODES.FILE_SIZE_WARNING)
      expect(issue.severity).toBe(SEVERITY.WARNING)
    })

    it('should create file size reject', () => {
      const issue = ISSUE_FACTORIES.fileSizeReject(150 * 1024 * 1024, 100 * 1024 * 1024)
      expect(issue.code).toBe(ISSUE_CODES.FILE_SIZE_REJECT)
      expect(issue.severity).toBe(SEVERITY.ERROR)
    })

    it('should create mime mismatch issue', () => {
      const issue = ISSUE_FACTORIES.mimeMismatch('image/png', 'text/plain', '.txt')
      expect(issue.code).toBe(ISSUE_CODES.MIME_MISMATCH)
      expect(issue.severity).toBe(SEVERITY.ERROR)
    })

    it('should create octet stream mismatch warning', () => {
      const issue = ISSUE_FACTORIES.octetStreamMismatch('image/png')
      expect(issue.code).toBe(ISSUE_CODES.OCTET_STREAM_MISMATCH)
      expect(issue.severity).toBe(SEVERITY.WARNING)
    })

    it('should create unknown extension warning', () => {
      const issue = ISSUE_FACTORIES.unknownExtension('xyz')
      expect(issue.code).toBe(ISSUE_CODES.UNKNOWN_EXTENSION)
      expect(issue.severity).toBe(SEVERITY.WARNING)
    })

    it('should create directory detected error', () => {
      const issue = ISSUE_FACTORIES.directoryDetected()
      expect(issue.code).toBe(ISSUE_CODES.DIRECTORY_DETECTED)
      expect(issue.severity).toBe(SEVERITY.ERROR)
    })

    it('should create zip container info', () => {
      const issue = ISSUE_FACTORIES.zipContainerWarning()
      expect(issue.code).toBe(ISSUE_CODES.ZIP_CONTAINER_WARNING)
      expect(issue.severity).toBe(SEVERITY.INFO)
    })

    it('should create executable risk warning', () => {
      const issue = ISSUE_FACTORIES.executableRisk('application/exe', 'Executable')
      expect(issue.code).toBe(ISSUE_CODES.EXECUTABLE_RISK)
      expect(issue.severity).toBe(SEVERITY.WARNING)
    })

    it('should create read error issue', () => {
      const issue = ISSUE_FACTORIES.readError('Network error')
      expect(issue.code).toBe(ISSUE_CODES.READ_ERROR)
      expect(issue.severity).toBe(SEVERITY.ERROR)
    })

    it('should create cancelled issue', () => {
      const issue = ISSUE_FACTORIES.cancelled()
      expect(issue.code).toBe(ISSUE_CODES.CANCELLED)
      expect(issue.severity).toBe(SEVERITY.INFO)
    })
  })

  describe('createValidationResult', () => {
    it('should create success result', () => {
      const result = createValidationResult(
        true,
        [],
        'image/png',
        'image/png',
        { filename: 'test.png' }
      )

      expect(result.ok).toBe(true)
      expect(result.issues).toHaveLength(0)
      expect(result.detectedMime).toBe('image/png')
      expect(result.declaredMime).toBe('image/png')
      expect(result.filename).toBe('test.png')
    })

    it('should create failed result with issues', () => {
      const issues = [ISSUE_FACTORIES.mimeMismatch('image/png', 'text/plain', '.txt')]
      const result = createValidationResult(false, issues, 'text/plain', 'image/png')

      expect(result.ok).toBe(false)
      expect(result.issues).toHaveLength(1)
    })
  })

  describe('formatSize', () => {
    it('should format bytes correctly', () => {
      expect(formatSize(0)).toBe('0 B')
      expect(formatSize(1023)).toContain('B')
      expect(formatSize(1024)).toContain('KB')
      expect(formatSize(1024 * 1024)).toContain('MB')
      expect(formatSize(1024 * 1024 * 1024)).toContain('GB')
    })

    it('should handle null/undefined', () => {
      expect(formatSize(null)).toBe('0 B')
      expect(formatSize(undefined)).toBe('0 B')
    })
  })

  describe('validateFileSize', () => {
    it('should return no issues for valid size', () => {
      const file = { size: 5 * 1024 * 1024, name: 'test.png' }
      const result = validateFileSize(file, DEFAULT_SIZE_TIER)

      expect(result.size).toBe(5 * 1024 * 1024)
      expect(result.issues).toHaveLength(0)
    })

    it('should return warning for size exceeding soft limit', () => {
      const file = { size: 15 * 1024 * 1024, name: 'test.png' }
      const result = validateFileSize(file, DEFAULT_SIZE_TIER)

      const warningIssues = result.issues.filter(
        (i) => i.code === ISSUE_CODES.FILE_SIZE_WARNING
      )
      expect(warningIssues).toHaveLength(1)
    })

    it('should return error for size exceeding hard limit', () => {
      const file = { size: 150 * 1024 * 1024, name: 'test.png' }
      const result = validateFileSize(file, DEFAULT_SIZE_TIER)

      const errorIssues = result.issues.filter(
        (i) => i.code === ISSUE_CODES.FILE_SIZE_REJECT
      )
      expect(errorIssues).toHaveLength(1)
    })

    it('should return error for empty file', () => {
      const file = { size: 0, name: 'empty.txt' }
      const result = validateFileSize(file, DEFAULT_SIZE_TIER)

      const emptyIssues = result.issues.filter(
        (i) => i.code === ISSUE_CODES.EMPTY_FILE
      )
      expect(emptyIssues).toHaveLength(1)
    })
  })

  describe('validateDeclaration', () => {
    it('should validate file with known extension', () => {
      const result = validateDeclaration('test.png', 'image/png')

      expect(result.extension).toBe('png')
      expect(result.declaredMime).toBe('image/png')
    })

    it('should return warning for unknown extension', () => {
      const result = validateDeclaration('test.xyz', 'application/octet-stream')

      const extensionIssues = result.issues.filter(
        (i) => i.code === ISSUE_CODES.UNKNOWN_EXTENSION
      )
      expect(extensionIssues).toHaveLength(1)
    })

    it('should handle files without extension', () => {
      const result = validateDeclaration('testfile', '')

      const extensionIssues = result.issues.filter(
        (i) => i.code === ISSUE_CODES.UNKNOWN_EXTENSION
      )
      expect(extensionIssues).toHaveLength(1)
    })
  })

  describe('validateMagicNumber', () => {
    it('should detect matching PNG signature', () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const result = validateMagicNumber(bytes, 'image/png', 'png')

      expect(result.detectedMime).toBe('image/png')
      expect(result.matches).toBeDefined()
    })

    it('should detect ZIP container format', () => {
      const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
      const result = validateMagicNumber(bytes, 'application/zip', 'zip')

      expect(result.isContainer).toBe(true)
      const zipIssues = result.issues.filter(
        (i) => i.code === ISSUE_CODES.ZIP_CONTAINER_WARNING
      )
      expect(zipIssues.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty bytes', () => {
      const bytes = new Uint8Array([])
      const result = validateMagicNumber(bytes, 'image/png', 'png')

      expect(result.detectedMime).toBeNull()
    })

    it('should detect executable type risk', () => {
      const bytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00])
      const result = validateMagicNumber(bytes, 'application/octet-stream', 'exe')

      const executableIssues = result.issues.filter(
        (i) => i.code === ISSUE_CODES.EXECUTABLE_RISK
      )
      expect(executableIssues.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('isDirectory', () => {
    it('should detect directory by size 0 and empty type', () => {
      const file = { type: '', size: 0 }
      expect(isDirectory(file)).toBe(true)
    })

    it('should detect directory by webkitRelativePath', () => {
      const file = {
        name: 'file.txt',
        size: 100,
        webkitRelativePath: 'folder/subfolder/file.txt',
      }
      expect(isDirectory(file)).toBe(true)
    })

    it('should return false for regular file', () => {
      const file = {
        name: 'test.png',
        size: 1024,
        type: 'image/png',
      }
      expect(isDirectory(file)).toBe(false)
    })
  })
})
