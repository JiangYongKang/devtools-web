import { describe, it, expect } from 'vitest'
import {
  ERROR_CODES,
  MAX_LINES,
  MAX_LINE_LENGTH,
  DEFAULT_OPTIONS,
} from '../logic/constants.js'
import { validateInput } from '../logic/errors.js'
import {
  parseSinglePath,
  resolveDots,
  collapseEmptySegments,
  isWindowsReservedName,
  hasTrailingDot,
  splitExtension,
  parseWindowsDrive,
  parseUncPath,
  detectPlatform,
  hasDangerousTraversal,
  normalizeDriveLetter,
} from '../logic/parser.js'
import {
  processFilePaths,
  exportToForwardSlash,
  exportToBackslash,
  toFileUrl,
  buildStructuredJson,
} from '../logic/index.js'

describe('validateInput', () => {
  it('should reject null and undefined', () => {
    expect(validateInput(null).valid).toBe(false)
    expect(validateInput(null).errorCode).toBe(ERROR_CODES.NULL_INPUT)
    expect(validateInput(undefined).valid).toBe(false)
    expect(validateInput(undefined).errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  it('should reject empty strings', () => {
    expect(validateInput('').valid).toBe(false)
    expect(validateInput('').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  it('should reject all whitespace', () => {
    expect(validateInput('   ').valid).toBe(false)
    expect(validateInput('   ').errorCode).toBe(ERROR_CODES.ALL_WHITESPACE)
    expect(validateInput('  \n  \t  ').valid).toBe(false)
  })

  it('should reject too many lines', () => {
    const manyLines = Array(MAX_LINES + 1).fill('/path').join('\n')
    const result = validateInput(manyLines)
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.TOO_MANY_LINES)
  })

  it('should reject too long line', () => {
    const longLine = 'a'.repeat(MAX_LINE_LENGTH + 1)
    const result = validateInput(longLine)
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.LINE_TOO_LONG)
  })

  it('should accept valid input', () => {
    expect(validateInput('/home/user').valid).toBe(true)
    expect(validateInput('/home/user\nC:\\Windows').valid).toBe(true)
  })
})

describe('resolveDots', () => {
  it('should resolve . and .. in absolute paths', () => {
    const segments = ['home', 'user', '..', 'docs', '.', 'file.txt']
    const result = resolveDots(segments, true)
    expect(result).toEqual(['home', 'docs', 'file.txt'])
  })

  it('should resolve to root when going above', () => {
    const segments = ['home', '..', '..', 'file.txt']
    const result = resolveDots(segments, true)
    expect(result).toEqual(['file.txt'])
  })

  it('should keep .. in relative paths when needed', () => {
    const segments = ['..', '..', 'file.txt']
    const result = resolveDots(segments, false)
    expect(result).toEqual(['..', '..', 'file.txt'])
  })

  it('should handle mixed dots correctly', () => {
    const segments = ['.', 'a', '.', 'b', '..', 'c']
    const result = resolveDots(segments, false)
    expect(result).toEqual(['a', 'c'])
  })
})

describe('collapseEmptySegments', () => {
  it('should collapse multiple empty segments', () => {
    const segments = ['', '', 'home', '', '', 'user', '']
    const result = collapseEmptySegments(segments)
    expect(result).toEqual(['', 'home', 'user'])
  })

  it('should preserve leading empty for absolute paths', () => {
    const segments = ['', 'home', 'user']
    const result = collapseEmptySegments(segments)
    expect(result).toEqual(['', 'home', 'user'])
  })
})

describe('isWindowsReservedName', () => {
  it('should detect CON, PRN, AUX, NUL', () => {
    expect(isWindowsReservedName('CON')).toBe(true)
    expect(isWindowsReservedName('PRN')).toBe(true)
    expect(isWindowsReservedName('AUX')).toBe(true)
    expect(isWindowsReservedName('NUL')).toBe(true)
  })

  it('should detect COM and LPT ports', () => {
    expect(isWindowsReservedName('COM1')).toBe(true)
    expect(isWindowsReservedName('LPT1')).toBe(true)
    expect(isWindowsReservedName('COM9')).toBe(true)
    expect(isWindowsReservedName('LPT9')).toBe(true)
  })

  it('should detect reserved names with extensions', () => {
    expect(isWindowsReservedName('CON.txt')).toBe(true)
    expect(isWindowsReservedName('NUL.log')).toBe(true)
  })

  it('should be case insensitive', () => {
    expect(isWindowsReservedName('con')).toBe(true)
    expect(isWindowsReservedName('Con')).toBe(true)
  })

  it('should not detect non-reserved names', () => {
    expect(isWindowsReservedName('file.txt')).toBe(false)
    expect(isWindowsReservedName('COM10')).toBe(false)
    expect(isWindowsReservedName('LPT10')).toBe(false)
  })
})

describe('hasTrailingDot', () => {
  it('should detect trailing dots', () => {
    expect(hasTrailingDot('file.')).toBe(true)
    expect(hasTrailingDot('name...')).toBe(true)
  })

  it('should not detect non-trailing dots', () => {
    expect(hasTrailingDot('file.txt')).toBe(false)
    expect(hasTrailingDot('.')).toBe(false)
    expect(hasTrailingDot('')).toBe(false)
  })
})

describe('splitExtension', () => {
  it('should split simple extension', () => {
    const result = splitExtension('file.txt')
    expect(result.basename).toBe('file')
    expect(result.ext).toBe('.txt')
  })

  it('should handle no extension', () => {
    const result = splitExtension('file')
    expect(result.basename).toBe('file')
    expect(result.ext).toBe('')
  })

  it('should handle hidden files', () => {
    const result = splitExtension('.gitignore')
    expect(result.basename).toBe('.gitignore')
    expect(result.ext).toBe('')
  })

  it('should handle multi-dot with single dot mode (default)', () => {
    const result = splitExtension('archive.tar.gz')
    expect(result.basename).toBe('archive.tar')
    expect(result.ext).toBe('.gz')
  })

  it('should handle multi-dot with multi-dot mode', () => {
    const result = splitExtension('archive.tar.gz', true)
    expect(result.basename).toBe('archive')
    expect(result.ext).toBe('.tar.gz')
  })
})

describe('parseWindowsDrive', () => {
  it('should parse Windows drive letters', () => {
    expect(parseWindowsDrive('C:\\Windows').hasDrive).toBe(true)
    expect(parseWindowsDrive('C:\\Windows').drive).toBe('C')
    expect(parseWindowsDrive('d:/Users').drive).toBe('d')
  })

  it('should not parse non-drive paths', () => {
    expect(parseWindowsDrive('/home/user').hasDrive).toBe(false)
    expect(parseWindowsDrive('relative/path').hasDrive).toBe(false)
  })
})

describe('parseUncPath', () => {
  it('should parse UNC paths with backslash', () => {
    const result = parseUncPath('\\\\server\\share\\folder')
    expect(result.isUnc).toBe(true)
    expect(result.server).toBe('server')
    expect(result.share).toBe('share')
  })

  it('should parse UNC paths with forward slash', () => {
    const result = parseUncPath('//server/share/folder')
    expect(result.isUnc).toBe(true)
    expect(result.server).toBe('server')
    expect(result.share).toBe('share')
  })

  it('should not parse non-UNC paths', () => {
    expect(parseUncPath('/home/user').isUnc).toBe(false)
    expect(parseUncPath('C:\\Windows').isUnc).toBe(false)
  })
})

describe('detectPlatform', () => {
  it('should detect Windows paths', () => {
    expect(detectPlatform('C:\\Windows', DEFAULT_OPTIONS)).toBe('windows')
    expect(detectPlatform('\\\\server\\share', DEFAULT_OPTIONS)).toBe('windows')
    expect(detectPlatform('path\\to\\file', DEFAULT_OPTIONS)).toBe('windows')
  })

  it('should detect POSIX paths', () => {
    expect(detectPlatform('/home/user', DEFAULT_OPTIONS)).toBe('posix')
    expect(detectPlatform('./relative/path', DEFAULT_OPTIONS)).toBe('posix')
  })

  it('should respect strictPosix option', () => {
    expect(detectPlatform('C:\\Windows', { ...DEFAULT_OPTIONS, strictPosix: true })).toBe('posix')
  })
})

describe('hasDangerousTraversal', () => {
  it('should detect dangerous traversal', () => {
    expect(hasDangerousTraversal(['..', 'etc', 'passwd'])).toBe(true)
  })

  it('should not detect safe paths', () => {
    expect(hasDangerousTraversal(['home', 'user', 'file'])).toBe(false)
  })
})

describe('normalizeDriveLetter', () => {
  it('should uppercase when enabled', () => {
    expect(normalizeDriveLetter('c', true)).toBe('C')
    expect(normalizeDriveLetter('d', true)).toBe('D')
  })

  it('should preserve case when disabled', () => {
    expect(normalizeDriveLetter('c', false)).toBe('c')
  })
})

describe('parseSinglePath - POSIX paths', () => {
  it('should parse simple POSIX path', () => {
    const result = parseSinglePath('/home/user/file.txt', DEFAULT_OPTIONS)
    expect(result.isAbsolute).toBe(true)
    expect(result.detectedPlatform).toBe('posix')
    expect(result.segments).toEqual(['home', 'user', 'file.txt'])
    expect(result.basename).toBe('file')
    expect(result.ext).toBe('.txt')
  })

  it('should normalize .. in POSIX paths', () => {
    const result = parseSinglePath('/home/user/../docs/./file.txt', DEFAULT_OPTIONS)
    expect(result.normalizedPath).toBe('/home/docs/file.txt')
  })

  it('should handle relative POSIX paths', () => {
    const result = parseSinglePath('./docs/./file.txt', DEFAULT_OPTIONS)
    expect(result.isAbsolute).toBe(false)
    expect(result.normalizedPath).toBe('docs/file.txt')
  })

  it('should collapse multiple separators', () => {
    const result = parseSinglePath('/home//user///docs', DEFAULT_OPTIONS)
    expect(result.normalizedPath).toBe('/home/user/docs')
  })
})

describe('parseSinglePath - Windows paths', () => {
  it('should parse Windows drive path', () => {
    const result = parseSinglePath('C:\\Users\\name\\file.txt', DEFAULT_OPTIONS)
    expect(result.isAbsolute).toBe(true)
    expect(result.detectedPlatform).toBe('windows')
    expect(result.hasDrive).toBe(true)
    expect(result.normalizedDrive).toBe('C')
  })

  it('should normalize drive case', () => {
    const result = parseSinglePath('d:\\Users\\file.txt', DEFAULT_OPTIONS)
    expect(result.normalizedDrive).toBe('D')
    expect(result.normalizedPath.startsWith('D:')).toBe(true)
  })

  it('should parse UNC path', () => {
    const result = parseSinglePath('\\\\server\\share\\folder\\file.txt', DEFAULT_OPTIONS)
    expect(result.isUnc).toBe(true)
    expect(result.uncServer).toBe('server')
    expect(result.uncShare).toBe('share')
  })

  it('should normalize .. in Windows paths', () => {
    const result = parseSinglePath('C:\\Users\\..\\Windows\\.\\System32', DEFAULT_OPTIONS)
    expect(result.normalizedPath).toBe('C:\\Windows\\System32')
  })
})

describe('parseSinglePath - dangerous traversal', () => {
  it('should flag dangerous traversal when rejectDangerous is true', () => {
    const result = parseSinglePath('../etc/passwd', { ...DEFAULT_OPTIONS, rejectDangerous: true })
    expect(result.isDangerous).toBe(true)
    expect(result.errorCode).toBe(ERROR_CODES.DANGEROUS_TRAVERSAL)
  })

  it('should not flag when rejectDangerous is false', () => {
    const result = parseSinglePath('../etc/passwd', { ...DEFAULT_OPTIONS, rejectDangerous: false })
    expect(result.isDangerous).toBe(false)
  })
})

describe('parseSinglePath - diagnostics', () => {
  it('should detect Windows reserved names', () => {
    const result = parseSinglePath('C:\\Windows\\CON', DEFAULT_OPTIONS)
    expect(result.diagnostics.some(d => d.type === 'reserved_name')).toBe(true)
  })

  it('should detect trailing dots', () => {
    const result = parseSinglePath('/home/user/file..', DEFAULT_OPTIONS)
    expect(result.diagnostics.some(d => d.type === 'trailing_dot')).toBe(true)
  })
})

describe('export functions', () => {
  it('exportToForwardSlash should convert backslashes', () => {
    expect(exportToForwardSlash('C:\\Windows\\System32')).toBe('C:/Windows/System32')
  })

  it('exportToBackslash should convert forward slashes', () => {
    expect(exportToBackslash('/home/user/file')).toBe('\\home\\user\\file')
  })
})

describe('toFileUrl', () => {
  it('should convert POSIX path to file URL', () => {
    expect(toFileUrl('/home/user/file.txt', 'posix')).toBe('file:///home/user/file.txt')
  })

  it('should convert Windows path to file URL', () => {
    expect(toFileUrl('C:\\Users\\name\\file.txt', 'windows')).toBe('file:///C:/Users/name/file.txt')
  })

  it('should handle UNC paths in file URL', () => {
    expect(toFileUrl('\\\\server\\share\\file.txt', 'windows')).toBe('file://server/share/file.txt')
  })

  it('should encode spaces', () => {
    expect(toFileUrl('/home/user/my file.txt', 'posix')).toBe('file:///home/user/my%20file.txt')
  })
})

describe('processFilePaths - integration', () => {
  it('should handle null input', () => {
    const result = processFilePaths({ rawText: null })
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  it('should handle empty input', () => {
    const result = processFilePaths({ rawText: '' })
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  it('should handle all whitespace', () => {
    const result = processFilePaths({ rawText: '   \n   ' })
    expect(result.errorCode).toBe(ERROR_CODES.ALL_WHITESPACE)
  })

  it('should process multiple lines', () => {
    const result = processFilePaths({
      rawText: '/home/user/file.txt\nC:\\Windows\\System32',
      options: DEFAULT_OPTIONS,
    })

    expect(result.errorCode).toBeNull()
    expect(result.lines.length).toBe(2)
    expect(result.summary.totalLines).toBe(2)
    expect(result.summary.nonEmptyLines).toBe(2)
    expect(result.summary.posixPaths).toBe(1)
    expect(result.summary.windowsPaths).toBe(1)
  })

  it('should include summary statistics', () => {
    const result = processFilePaths({
      rawText: '/home/user/../docs\nC:\\Users\\..\\Windows\n./relative/path',
      options: DEFAULT_OPTIONS,
    })

    expect(result.summary.absolutePaths).toBe(2)
    expect(result.summary.relativePaths).toBe(1)
  })
})

describe('buildStructuredJson', () => {
  it('should build structured JSON from parsed result', () => {
    const parsed = parseSinglePath('/home/user/file.txt', DEFAULT_OPTIONS)
    const json = buildStructuredJson(parsed)

    expect(json.rawPath).toBe('/home/user/file.txt')
    expect(json.isAbsolute).toBe(true)
    expect(Array.isArray(json.segments)).toBe(true)
    expect(Array.isArray(json.normalizedSegments)).toBe(true)
    expect(json.basename).toBe('file')
    expect(json.ext).toBe('.txt')
  })

  it('should return null for null input', () => {
    expect(buildStructuredJson(null)).toBeNull()
  })
})
