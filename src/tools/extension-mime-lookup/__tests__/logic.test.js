import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
    CATEGORIES,
    CURRENT_TABLE_VERSION,
    MATCH_STATES,
    MAX_FILE_HEADER_BYTES,
    SEARCH_MODES,
    STORAGE_KEY,
    TABLE_VERSIONS
} from '../logic/constants.js'
import {
    addOverride,
    buildExtensionIndex,
    buildMimeIndex,
    loadOverrides,
    lookupByExtension,
    lookupByMime,
    normalizeExtension,
    normalizeMime,
    parseBatchInput,
    removeOverride,
    saveOverrides,
} from '../logic/core.js'
import {
    ERROR_CODES,
    ERROR_MESSAGES,
    createError,
    getErrorMessage,
} from '../logic/errors.js'
import {
    debounce,
    downloadCsvFromResults,
    exportOverrides,
    exportTsvFromResults,
    importOverrides,
    processExtensionsLookup,
    processMimeLookup,
} from '../logic/index.js'
import {
    bytesToHexString,
    compareWithExtension,
    getExtensionFromFilename,
    inferMimeTypeFromBytes,
    matchesSignature,
} from '../logic/magicNumbers.js'

describe('constants module', () => {
  test('CATEGORIES should have all expected categories', () => {
    expect(CATEGORIES.WEB).toBe('web')
    expect(CATEGORIES.OFFICE).toBe('office')
    expect(CATEGORIES.COMPRESSION).toBe('compression')
    expect(CATEGORIES.MEDIA).toBe('media')
    expect(CATEGORIES.OTHER).toBe('other')
  })

  test('TABLE_VERSIONS should have v1 and v2', () => {
    expect(TABLE_VERSIONS.v1).toBe('v1')
    expect(TABLE_VERSIONS.v2).toBe('v2')
  })

  test('CURRENT_TABLE_VERSION should be v2', () => {
    expect(CURRENT_TABLE_VERSION).toBe('v2')
  })

  test('STORAGE_KEY should be fixed', () => {
    expect(STORAGE_KEY).toBe('extension_mime_lookup_overrides')
  })

  test('MATCH_STATES should have three states', () => {
    expect(MATCH_STATES.MATCH).toBe('match')
    expect(MATCH_STATES.CONFLICT).toBe('conflict')
    expect(MATCH_STATES.UNKNOWN).toBe('unknown')
  })

  test('MAX_FILE_HEADER_BYTES should be 512', () => {
    expect(MAX_FILE_HEADER_BYTES).toBe(512)
  })
})

describe('errors module', () => {
  test('should have all required error codes', () => {
    expect(ERROR_CODES.EMPTY_INPUT).toBe('EMPTY_INPUT')
    expect(ERROR_CODES.INVALID_FORMAT).toBe('INVALID_FORMAT')
    expect(ERROR_CODES.STORAGE_READ_ERROR).toBe('STORAGE_READ_ERROR')
    expect(ERROR_CODES.STORAGE_WRITE_ERROR).toBe('STORAGE_WRITE_ERROR')
    expect(ERROR_CODES.FILE_READ_ERROR).toBe('FILE_READ_ERROR')
    expect(ERROR_CODES.UNKNOWN_VERSION).toBe('UNKNOWN_VERSION')
    expect(ERROR_CODES.OVERFLOW).toBe('OVERFLOW')
    expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND')
    expect(ERROR_CODES.DUPLICATE_KEY).toBe('DUPLICATE_KEY')
  })

  test('should have messages for all error codes', () => {
    Object.values(ERROR_CODES).forEach((code) => {
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof ERROR_MESSAGES[code]).toBe('string')
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    })
  })

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
  })

  test('createError should accept custom message', () => {
    const customMsg = 'Custom message'
    const result = createError(ERROR_CODES.EMPTY_INPUT, customMsg)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(result.errorMessage).toBe(customMsg)
  })
})

describe('core normalization functions', () => {
  describe('normalizeExtension', () => {
    test('should handle null and undefined', () => {
      expect(normalizeExtension(null)).toBe('')
      expect(normalizeExtension(undefined)).toBe('')
    })

    test('should trim whitespace', () => {
      expect(normalizeExtension('  html  ')).toBe('html')
    })

    test('should remove leading dot', () => {
      expect(normalizeExtension('.html')).toBe('html')
      expect(normalizeExtension('..html')).toBe('.html')
    })

    test('should convert to lowercase', () => {
      expect(normalizeExtension('HTML')).toBe('html')
      expect(normalizeExtension('.JPG')).toBe('jpg')
    })

    test('should handle combined cases', () => {
      expect(normalizeExtension('  .PDF  ')).toBe('pdf')
    })

    test('should handle empty string', () => {
      expect(normalizeExtension('')).toBe('')
      expect(normalizeExtension('.')).toBe('')
    })
  })

  describe('normalizeMime', () => {
    test('should handle null and undefined', () => {
      expect(normalizeMime(null)).toBe('')
      expect(normalizeMime(undefined)).toBe('')
    })

    test('should trim whitespace', () => {
      expect(normalizeMime('  text/html  ')).toBe('text/html')
    })

    test('should convert to lowercase', () => {
      expect(normalizeMime('TEXT/HTML')).toBe('text/html')
      expect(normalizeMime('Application/JSON')).toBe('application/json')
    })

    test('should strip parameters after semicolon', () => {
      expect(normalizeMime('text/html; charset=utf-8')).toBe('text/html')
      expect(normalizeMime('application/javascript; charset=UTF-8')).toBe('application/javascript')
      expect(normalizeMime('text/plain; charset=us-ascii; format=flowed')).toBe('text/plain')
    })

    test('should handle combined cases', () => {
      expect(normalizeMime('  TEXT/HTML; CHARSET=UTF-8  ')).toBe('text/html')
    })
  })
})

describe('core index building', () => {
  describe('buildExtensionIndex', () => {
    test('should build index from table entries', () => {
      const table = [
        { extension: 'html', mime: 'text/html', category: CATEGORIES.WEB, priority: 100, isRecommended: true },
        { extension: 'htm', mime: 'text/html', category: CATEGORIES.WEB, priority: 90, isRecommended: false },
      ]
      const index = buildExtensionIndex(table)
      expect(index.has('html')).toBe(true)
      expect(index.has('htm')).toBe(true)
      expect(index.get('html').length).toBe(1)
      expect(index.get('html')[0].mime).toBe('text/html')
      expect(index.get('html')[0].source).toBe('builtin')
    })

    test('should merge overrides', () => {
      const table = [
        { extension: 'html', mime: 'text/html', category: CATEGORIES.WEB, priority: 100, isRecommended: true },
      ]
      const overrides = [
        { extension: 'custom', mime: 'application/x-custom', category: CATEGORIES.OTHER, priority: 100 },
      ]
      const index = buildExtensionIndex(table, overrides)
      expect(index.has('html')).toBe(true)
      expect(index.has('custom')).toBe(true)
      expect(index.get('custom')[0].source).toBe('override')
      expect(index.get('custom')[0].isOverride).toBe(true)
    })

    test('should sort entries correctly (override > recommended > priority > alphabetical)', () => {
      const table = [
        { extension: 'ext', mime: 'text/z', category: CATEGORIES.OTHER, priority: 50, isRecommended: false },
        { extension: 'ext', mime: 'text/b', category: CATEGORIES.OTHER, priority: 50, isRecommended: false },
        { extension: 'ext', mime: 'text/a', category: CATEGORIES.OTHER, priority: 100, isRecommended: true },
      ]
      const overrides = [
        { extension: 'ext', mime: 'text/override', category: CATEGORIES.OTHER, priority: 1 },
      ]
      const index = buildExtensionIndex(table, overrides)
      const entries = index.get('ext')
      expect(entries[0].mime).toBe('text/override')
      expect(entries[1].isRecommended).toBe(true)
      expect(entries[2].priority).toBe(50)
      expect(entries[2].mime).toBe('text/b')
      expect(entries[3].mime).toBe('text/z')
    })
  })

  describe('buildMimeIndex', () => {
    test('should build index from table entries', () => {
      const table = [
        { extension: 'html', mime: 'text/html', category: CATEGORIES.WEB, priority: 100, isRecommended: true },
        { extension: 'htm', mime: 'text/html', category: CATEGORIES.WEB, priority: 90, isRecommended: false },
        { extension: 'json', mime: 'application/json', category: CATEGORIES.WEB, priority: 100, isRecommended: true },
      ]
      const index = buildMimeIndex(table)
      expect(index.has('text/html')).toBe(true)
      expect(index.has('application/json')).toBe(true)
      expect(index.get('text/html').length).toBe(2)
    })

    test('should merge overrides and sort correctly', () => {
      const table = [
        { extension: 'txt', mime: 'text/plain', category: CATEGORIES.OTHER, priority: 100, isRecommended: true },
        { extension: 'log', mime: 'text/plain', category: CATEGORIES.OTHER, priority: 80, isRecommended: false },
      ]
      const overrides = [
        { extension: 'log', mime: 'text/plain', category: CATEGORIES.OTHER, priority: 1 },
      ]
      const index = buildMimeIndex(table, overrides)
      const entries = index.get('text/plain')
      expect(entries[0].extension).toBe('log')
      expect(entries[0].isOverride).toBe(true)
    })
  })
})

describe('core lookup functions', () => {
  const testTable = [
    { extension: 'html', mime: 'text/html', category: CATEGORIES.WEB, priority: 100, isRecommended: true },
    { extension: 'htm', mime: 'text/html', category: CATEGORIES.WEB, priority: 90, isRecommended: false },
    { extension: 'txt', mime: 'text/plain', category: CATEGORIES.OTHER, priority: 100, isRecommended: true },
    { extension: 'png', mime: 'image/png', category: CATEGORIES.MEDIA, priority: 100, isRecommended: true },
    { extension: 'pdf', mime: 'application/pdf', category: CATEGORIES.OFFICE, priority: 100, isRecommended: true },
  ]

  describe('lookupByExtension', () => {
    test('should return error for empty input', () => {
      const index = buildExtensionIndex(testTable)
      const result = lookupByExtension('', index)
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should perform exact lookup', () => {
      const index = buildExtensionIndex(testTable)
      const result = lookupByExtension('html', index)
      expect(result.success).toBe(true)
      expect(result.isFuzzy).toBe(false)
      expect(result.results.length).toBe(1)
      expect(result.results[0].mime).toBe('text/html')
    })

    test('should normalize extension before lookup', () => {
      const index = buildExtensionIndex(testTable)
      const result1 = lookupByExtension('.HTML', index)
      const result2 = lookupByExtension('  htm  ', index)
      expect(result1.success).toBe(true)
      expect(result1.results.length).toBe(1)
      expect(result2.success).toBe(true)
      expect(result2.results.length).toBe(1)
    })

    test('should filter by categories', () => {
      const index = buildExtensionIndex(testTable)
      const result = lookupByExtension('html', index, { categories: [CATEGORIES.OFFICE] })
      expect(result.success).toBe(true)
      expect(result.results.length).toBe(0)
    })

    test('should perform prefix fuzzy search', () => {
      const index = buildExtensionIndex(testTable)
      const result = lookupByExtension('ht', index, { fuzzy: true, fuzzyMode: 'prefix' })
      expect(result.success).toBe(true)
      expect(result.isFuzzy).toBe(true)
      expect(result.fuzzyMode).toBe('prefix')
      expect(result.results.length).toBe(2)
    })

    test('should perform substring fuzzy search', () => {
      const index = buildExtensionIndex(testTable)
      const result = lookupByExtension('t', index, { fuzzy: true, fuzzyMode: 'substring' })
      expect(result.success).toBe(true)
      const matchedExts = result.results.map((r) => r.matchedExtension)
      expect(matchedExts).toContain('html')
      expect(matchedExts).toContain('htm')
      expect(matchedExts).toContain('txt')
    })

    test('should respect maxResults limit', () => {
      const index = buildExtensionIndex(testTable)
      const result = lookupByExtension('t', index, { fuzzy: true, fuzzyMode: 'substring', maxResults: 2 })
      expect(result.results.length).toBeLessThanOrEqual(2)
    })
  })

  describe('lookupByMime', () => {
    test('should return error for empty input', () => {
      const index = buildMimeIndex(testTable)
      const result = lookupByMime('', index)
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should perform exact lookup', () => {
      const index = buildMimeIndex(testTable)
      const result = lookupByMime('text/html', index)
      expect(result.success).toBe(true)
      expect(result.results.length).toBe(2)
    })

    test('should normalize mime before lookup', () => {
      const index = buildMimeIndex(testTable)
      const result = lookupByMime(' TEXT/HTML; charset=UTF-8 ', index)
      expect(result.success).toBe(true)
      expect(result.results.length).toBe(2)
    })

    test('should perform fuzzy search', () => {
      const index = buildMimeIndex(testTable)
      const result = lookupByMime('text', index, { fuzzy: true })
      expect(result.success).toBe(true)
      expect(result.results.length).toBe(3)
    })
  })
})

describe('core batch input parsing', () => {
  test('should handle null and undefined', () => {
    expect(parseBatchInput(null)).toEqual([])
    expect(parseBatchInput(undefined)).toEqual([])
  })

  test('should split by newlines', () => {
    expect(parseBatchInput('a\nb\nc')).toEqual(['a', 'b', 'c'])
  })

  test('should split by commas', () => {
    expect(parseBatchInput('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  test('should split by semicolons', () => {
    expect(parseBatchInput('a;b;c')).toEqual(['a', 'b', 'c'])
  })

  test('should handle mixed separators', () => {
    expect(parseBatchInput('a\nb,c;d')).toEqual(['a', 'b', 'c', 'd'])
  })

  test('should trim and filter empty', () => {
    expect(parseBatchInput(' a , , b ; \n c ')).toEqual(['a', 'b', 'c'])
  })
})

describe('core storage functions', () => {
  test('loadOverrides should return empty array when no storage', () => {
    expect(loadOverrides(null)).toEqual([])
  })

  test('loadOverrides should parse JSON from storage', () => {
    const mockStorage = {
      getItem: vi.fn(() => JSON.stringify([{ extension: 'x', mime: 'y' }])),
    }
    const result = loadOverrides(mockStorage)
    expect(result.length).toBe(1)
    expect(result[0].extension).toBe('x')
  })

  test('loadOverrides should handle invalid JSON', () => {
    const mockStorage = {
      getItem: vi.fn(() => 'invalid json'),
    }
    expect(loadOverrides(mockStorage)).toEqual([])
  })

  test('loadOverrides should handle non-array values', () => {
    const mockStorage = {
      getItem: vi.fn(() => JSON.stringify({ not: 'array' })),
    }
    expect(loadOverrides(mockStorage)).toEqual([])
  })

  test('loadOverrides should filter invalid items', () => {
    const mockStorage = {
      getItem: vi.fn(() => JSON.stringify([
        { extension: 'x', mime: 'y' },
        null,
        { extension: 'z' },
        {},
      ])),
    }
    const result = loadOverrides(mockStorage)
    expect(result.length).toBe(1)
    expect(result[0].extension).toBe('x')
  })

  test('saveOverrides should fail when no storage', () => {
    const result = saveOverrides([], null)
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.STORAGE_WRITE_ERROR)
  })

  test('saveOverrides should stringify and save', () => {
    let stored = null
    const mockStorage = {
      setItem: vi.fn((key, value) => { stored = value }),
    }
    const testData = [{ extension: 'x', mime: 'y' }]
    const result = saveOverrides(testData, mockStorage)
    expect(result.success).toBe(true)
    expect(stored).toBe(JSON.stringify(testData))
  })

  test('saveOverrides should handle exceptions', () => {
    const mockStorage = {
      setItem: vi.fn(() => { throw new Error('full') }),
    }
    const result = saveOverrides([], mockStorage)
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.STORAGE_WRITE_ERROR)
  })
})

describe('core override management', () => {
  test('addOverride should fail with missing fields', () => {
    const existing = []
    expect(addOverride(existing, null).success).toBe(false)
    expect(addOverride(existing, {}).success).toBe(false)
    expect(addOverride(existing, { extension: 'x' }).success).toBe(false)
    expect(addOverride(existing, { mime: 'y' }).success).toBe(false)
  })

  test('addOverride should normalize and add', () => {
    const existing = []
    const result = addOverride(existing, { extension: ' .X ', mime: ' TEXT/HTML; charset=utf-8 ' })
    expect(result.success).toBe(true)
    expect(result.overrides.length).toBe(1)
    expect(result.overrides[0].extension).toBe('x')
    expect(result.overrides[0].mime).toBe('text/html')
  })

  test('addOverride should replace existing with same key', () => {
    const existing = [{ extension: 'x', mime: 'y' }]
    const result = addOverride(existing, { extension: 'X', mime: 'Y' })
    expect(result.overrides.length).toBe(1)
    expect(result.overrides[0].mime).toBe('y')
  })

  test('removeOverride should remove matching entry', () => {
    const existing = [
      { extension: 'a', mime: 'x' },
      { extension: 'b', mime: 'y' },
    ]
    const result = removeOverride(existing, 'A', 'X')
    expect(result.removed).toBe(true)
    expect(result.overrides.length).toBe(1)
    expect(result.overrides[0].extension).toBe('b')
  })

  test('removeOverride should return removed=false when not found', () => {
    const existing = [{ extension: 'a', mime: 'x' }]
    const result = removeOverride(existing, 'b', 'y')
    expect(result.removed).toBe(false)
    expect(result.overrides.length).toBe(1)
  })
})

describe('magic numbers module', () => {
  test('matchesSignature should match exact sequence', () => {
    expect(matchesSignature([0x25, 0x50, 0x44, 0x46], [0x25, 0x50, 0x44, 0x46])).toBe(true)
    expect(matchesSignature([0x25, 0x50, 0x44, 0x46], [0x25, 0x50])).toBe(true)
  })

  test('matchesSignature should respect offset', () => {
    expect(matchesSignature([0x00, 0x00, 0x25, 0x50], [0x25, 0x50], 2)).toBe(true)
  })

  test('matchesSignature should fail on mismatch', () => {
    expect(matchesSignature([0x25, 0x50, 0x44, 0x46], [0xFF, 0xD8])).toBe(false)
  })

  test('matchesSignature should fail when too short', () => {
    expect(matchesSignature([0x25], [0x25, 0x50])).toBe(false)
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

  test('getExtensionFromFilename should extract extension', () => {
    expect(getExtensionFromFilename('document.pdf')).toBe('pdf')
    expect(getExtensionFromFilename('image.tar.gz')).toBe('gz')
    expect(getExtensionFromFilename('README')).toBe('')
    expect(getExtensionFromFilename('config.')).toBe('')
    expect(getExtensionFromFilename('.gitignore')).toBe('')
    expect(getExtensionFromFilename('')).toBe('')
    expect(getExtensionFromFilename(null)).toBe('')
  })

  test('bytesToHexString should convert to hex', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    expect(bytesToHexString(bytes)).toBe('25 50 44 46')
  })

  test('bytesToHexString should respect maxLen', () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05])
    expect(bytesToHexString(bytes, 2)).toBe('01 02')
  })

  describe('compareWithExtension', () => {
    const testTable = [
      { extension: 'pdf', mime: 'application/pdf', category: CATEGORIES.OFFICE, priority: 100, isRecommended: true },
      { extension: 'png', mime: 'image/png', category: CATEGORIES.MEDIA, priority: 100, isRecommended: true },
    ]

    test('should return UNKNOWN when no inferred matches', () => {
      const extIndex = buildExtensionIndex(testTable)
      const mimeIndex = buildMimeIndex(testTable)
      const result = compareWithExtension([], 'pdf', extIndex, mimeIndex)
      expect(result.matchState).toBe(MATCH_STATES.UNKNOWN)
    })

    test('should return UNKNOWN when no extension', () => {
      const extIndex = buildExtensionIndex(testTable)
      const mimeIndex = buildMimeIndex(testTable)
      const inferred = [{ mime: 'application/pdf', description: 'PDF' }]
      const result = compareWithExtension(inferred, '', extIndex, mimeIndex)
      expect(result.matchState).toBe(MATCH_STATES.UNKNOWN)
    })

    test('should return MATCH when extension and inferred agree', () => {
      const extIndex = buildExtensionIndex(testTable)
      const mimeIndex = buildMimeIndex(testTable)
      const inferred = [{ mime: 'application/pdf', description: 'PDF' }]
      const result = compareWithExtension(inferred, 'pdf', extIndex, mimeIndex)
      expect(result.matchState).toBe(MATCH_STATES.MATCH)
    })

    test('should return CONFLICT when extension and inferred disagree', () => {
      const extIndex = buildExtensionIndex(testTable)
      const mimeIndex = buildMimeIndex(testTable)
      const inferred = [{ mime: 'image/png', description: 'PNG' }]
      const result = compareWithExtension(inferred, 'pdf', extIndex, mimeIndex)
      expect(result.matchState).toBe(MATCH_STATES.CONFLICT)
    })

    test('should return UNKNOWN for unknown extension', () => {
      const extIndex = buildExtensionIndex(testTable)
      const mimeIndex = buildMimeIndex(testTable)
      const inferred = [{ mime: 'application/pdf', description: 'PDF' }]
      const result = compareWithExtension(inferred, 'xyz', extIndex, mimeIndex)
      expect(result.matchState).toBe(MATCH_STATES.UNKNOWN)
    })
  })
})

describe('index module integration', () => {
  describe('processExtensionsLookup', () => {
    test('should return error for empty input', () => {
      const result = processExtensionsLookup('')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should process single extension', () => {
      const result = processExtensionsLookup('html')
      expect(result.success).toBe(true)
      expect(result.mode).toBe(SEARCH_MODES.EXTENSION_TO_MIME)
      expect(result.totalItems).toBe(1)
      expect(result.hitCount).toBe(1)
      expect(result.results[0].results[0].mime).toBe('text/html')
    })

    test('should process batch extensions', () => {
      const result = processExtensionsLookup('html,css,png,xyzunknown')
      expect(result.success).toBe(true)
      expect(result.totalItems).toBe(4)
      expect(result.hitCount).toBe(3)
      expect(result.missCount).toBe(1)
    })

    test('should respect table versions', () => {
      const resultV1 = processExtensionsLookup('png', { tableVersion: 'v1' })
      const resultV2 = processExtensionsLookup('png', { tableVersion: 'v2' })
      expect(resultV1.hitCount).toBe(0)
      expect(resultV2.hitCount).toBe(1)
    })

    test('should use overrides', () => {
      const overrides = [
        { extension: 'custom123', mime: 'application/x-custom', category: CATEGORIES.OTHER },
      ]
      const result = processExtensionsLookup('custom123', { overrides })
      expect(result.hitCount).toBe(1)
      expect(result.results[0].results[0].mime).toBe('application/x-custom')
      expect(result.results[0].results[0].isOverride).toBe(true)
    })
  })

  describe('processMimeLookup', () => {
    test('should return error for empty input', () => {
      const result = processMimeLookup('')
      expect(result.success).toBe(false)
    })

    test('should process single mime', () => {
      const result = processMimeLookup('text/html')
      expect(result.success).toBe(true)
      expect(result.mode).toBe(SEARCH_MODES.MIME_TO_EXTENSION)
      expect(result.hitCount).toBe(1)
    })

    test('should normalize mime and strip parameters', () => {
      const result = processMimeLookup('TEXT/HTML; charset=utf-8')
      expect(result.success).toBe(true)
      expect(result.results[0].normalized).toBe('text/html')
      expect(result.hitCount).toBe(1)
    })

    test('should return recommended extension', () => {
      const result = processMimeLookup('text/html')
      expect(result.results[0].recommendedExtension).toBeDefined()
      expect(result.results[0].recommendedExtension.extension).toBe('html')
      expect(result.results[0].recommendedExtension.isRecommended).toBe(true)
    })
  })

  describe('import/export', () => {
    test('exportOverrides should produce JSON', () => {
      const data = [{ extension: 'x', mime: 'y' }]
      const json = exportOverrides(data)
      expect(JSON.parse(json)).toEqual(data)
    })

    test('importOverrides should parse valid JSON', () => {
      const data = [{ extension: 'x', mime: 'y' }]
      const result = importOverrides(JSON.stringify(data))
      expect(result.success).toBe(true)
      expect(result.totalImported).toBe(1)
      expect(result.totalInvalid).toBe(0)
    })

    test('importOverrides should reject invalid JSON', () => {
      const result = importOverrides('not json')
      expect(result.success).toBe(false)
      expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_FORMAT)
    })

    test('importOverrides should reject non-array', () => {
      const result = importOverrides(JSON.stringify({ a: 1 }))
      expect(result.success).toBe(false)
    })

    test('importOverrides should count invalid entries', () => {
      const data = [{ extension: 'x', mime: 'y' }, null, { extension: 'z' }]
      const result = importOverrides(JSON.stringify(data))
      expect(result.success).toBe(true)
      expect(result.totalImported).toBe(1)
      expect(result.totalInvalid).toBe(2)
    })
  })

  describe('CSV/TSV export', () => {
    test('downloadCsvFromResults should return null for null', () => {
      expect(downloadCsvFromResults(null)).toBeNull()
    })

    test('downloadCsvFromResults should generate CSV for extension lookup', () => {
      const result = processExtensionsLookup('html')
      const csv = downloadCsvFromResults(result)
      expect(csv).toBeDefined()
      expect(csv).toContain('Query,Normalized')
      expect(csv).toContain('text/html')
    })

    test('downloadCsvFromResults should generate CSV for mime lookup', () => {
      const result = processMimeLookup('text/html')
      const csv = downloadCsvFromResults(result)
      expect(csv).toBeDefined()
      expect(csv).toContain('html')
    })

    test('exportTsvFromResults should generate TSV', () => {
      const result = processExtensionsLookup('html,css')
      const tsv = exportTsvFromResults(result)
      expect(tsv).toBeDefined()
      expect(tsv).toContain('\t')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('should delay execution', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      debounced('test')
      expect(fn).not.toHaveBeenCalled()
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledWith('test')
    })

    test('should reset timer on subsequent calls', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)
      debounced('a')
      vi.advanceTimersByTime(50)
      debounced('b')
      vi.advanceTimersByTime(99)
      expect(fn).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('b')
    })
  })
})

describe('end-to-end scenarios', () => {
  test('should override builtin entry and prioritize it', () => {
    const overrides = [{
      extension: 'html',
      mime: 'application/custom-html',
      category: CATEGORIES.OTHER,
      priority: 1,
    }]
    const result = processExtensionsLookup('html', { overrides })
    const entries = result.results[0].results
    expect(entries[0].mime).toBe('application/custom-html')
    expect(entries[0].isOverride).toBe(true)
    expect(entries[1].mime).toBe('text/html')
    expect(entries[1].isOverride).toBeUndefined()
  })

  test('fuzzy search should respect category filter', () => {
    const result = processExtensionsLookup('p', {
      fuzzy: true,
      fuzzyMode: 'prefix',
      categories: [CATEGORIES.MEDIA],
    })
    for (const item of result.results) {
      for (const entry of item.results) {
        expect(entry.category).toBe(CATEGORIES.MEDIA)
      }
    }
  })

  test('v1 vs v2 table version difference', () => {
    const v1Result = processExtensionsLookup('png', { tableVersion: 'v1' })
    const v2Result = processExtensionsLookup('png', { tableVersion: 'v2' })
    expect(v1Result.hitCount).toBe(0)
    expect(v2Result.hitCount).toBe(1)
  })
})
