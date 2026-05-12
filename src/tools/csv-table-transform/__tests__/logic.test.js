import { describe, expect, test } from 'vitest'
import {
    ESCAPE_CHAR,
    QUOTE_CHAR,
} from '../logic/constants.js'
import {
    ERROR_CODES as ERROR_CONSTS,
    createError,
    getErrorMessage,
} from '../logic/errors.js'
import {
    EXAMPLES,
    INCONSISTENT_COLS_MODES,
    MAX_CELL_BYTES,
    MAX_COLS,
    MAX_ROWS,
    PRESET_DELIMITERS,
    processGenerateCsv,
    processInput,
    processTranspose,
    utf8ByteLength,
    validateInput,
    validateTable
} from '../logic/index.js'
import {
    detectDelimiter,
    escapeCell,
    normalizeCols,
    parseCsv,
    stringifyCsv,
    transposeTable,
} from '../logic/parser.js'

describe('errors module', () => {
  describe('ERROR_CODES', () => {
    test('should have all required error codes', () => {
      expect(ERROR_CONSTS.NULL_INPUT).toBe('NULL_INPUT')
      expect(ERROR_CONSTS.INPUT_TOO_LARGE).toBe('INPUT_TOO_LARGE')
      expect(ERROR_CONSTS.TOO_MANY_ROWS).toBe('TOO_MANY_ROWS')
      expect(ERROR_CONSTS.TOO_MANY_COLS).toBe('TOO_MANY_COLS')
      expect(ERROR_CONSTS.CELL_TOO_LARGE).toBe('CELL_TOO_LARGE')
      expect(ERROR_CONSTS.UNTERMINATED_QUOTE).toBe('UNTERMINATED_QUOTE')
      expect(ERROR_CONSTS.INCONSISTENT_COLS).toBe('INCONSISTENT_COLS')
      expect(ERROR_CONSTS.EMPTY_TABLE).toBe('EMPTY_TABLE')
      expect(ERROR_CONSTS.TRANSPOSE_SHAPE_INVALID).toBe('TRANSPOSE_SHAPE_INVALID')
      expect(ERROR_CONSTS.INVALID_DELIMITER).toBe('INVALID_DELIMITER')
    })
  })

  describe('createError', () => {
    test('should create error object with correct code and message', () => {
      const result = createError(ERROR_CONSTS.UNTERMINATED_QUOTE)
      expect(result.code).toBe(ERROR_CONSTS.UNTERMINATED_QUOTE)
      expect(result.message).toBeDefined()
    })

    test('should include details when provided', () => {
      const details = { position: 100, row: 5 }
      const result = createError(ERROR_CONSTS.INCONSISTENT_COLS, details)
      expect(result.details).toEqual(details)
    })
  })

  describe('getErrorMessage', () => {
    test('should return correct message for known error codes', () => {
      expect(getErrorMessage(ERROR_CONSTS.UNTERMINATED_QUOTE)).toBe('引号未闭合')
      expect(getErrorMessage(ERROR_CONSTS.INCONSISTENT_COLS)).toBe('列数不一致')
    })

    test('should return default message for unknown error codes', () => {
      expect(getErrorMessage('UNKNOWN_ERROR')).toBe('未知错误')
    })
  })
})

describe('utf8ByteLength function', () => {
  test('should calculate UTF-8 byte length correctly', () => {
    expect(utf8ByteLength('')).toBe(0)
    expect(utf8ByteLength('hello')).toBe(5)
    expect(utf8ByteLength('你好')).toBe(6)
    expect(utf8ByteLength('hello 世界')).toBe(12)
  })

  test('should handle multi-byte characters correctly', () => {
    expect(utf8ByteLength('🌍')).toBe(4)
    expect(utf8ByteLength('a🌍b')).toBe(6)
  })
})

describe('RFC4180 parsing - typical rows', () => {
  test('should parse simple comma-separated values', () => {
    const input = 'a,b,c\n1,2,3\n4,5,6'
    const result = parseCsv(input, { hasHeader: true })

    expect(result.errorCode).toBeUndefined()
    expect(result.header).toEqual(['a', 'b', 'c'])
    expect(result.table).toEqual([
      ['1', '2', '3'],
      ['4', '5', '6'],
    ])
    expect(result.rowCount).toBe(2)
    expect(result.colCount).toBe(3)
  })

  test('should parse CRLF line endings', () => {
    const input = 'a,b\r\n1,2\r\n3,4'
    const result = parseCsv(input, { hasHeader: true })

    expect(result.errorCode).toBeUndefined()
    expect(result.table.length).toBe(2)
  })

  test('should handle CR-only line endings', () => {
    const input = 'a,b\r1,2\r3,4'
    const result = parseCsv(input, { hasHeader: true })

    expect(result.errorCode).toBeUndefined()
    expect(result.table.length).toBe(2)
  })

  test('should parse without header row', () => {
    const input = '1,2,3\n4,5,6'
    const result = parseCsv(input, { hasHeader: false })

    expect(result.errorCode).toBeUndefined()
    expect(result.header).toBeNull()
    expect(result.table).toEqual([
      ['1', '2', '3'],
      ['4', '5', '6'],
    ])
  })

  test('should handle empty input', () => {
    const result = parseCsv('', { hasHeader: true })
    expect(result.table).toEqual([])
    expect(result.header).toBeNull()
    expect(result.rowCount).toBe(0)
    expect(result.colCount).toBe(0)
  })

  test('should handle tab-delimited (TSV)', () => {
    const input = 'a\tb\tc\n1\t2\t3'
    const result = parseCsv(input, {
      delimiter: PRESET_DELIMITERS.TAB,
      hasHeader: true,
    })

    expect(result.errorCode).toBeUndefined()
    expect(result.header).toEqual(['a', 'b', 'c'])
    expect(result.table).toEqual([['1', '2', '3']])
  })
})

describe('RFC4180 parsing - quoted fields', () => {
  test('should parse quoted fields with commas', () => {
    const input = 'name,description\n"Apple, Inc.","A tech company"'
    const result = parseCsv(input, { hasHeader: true })

    expect(result.errorCode).toBeUndefined()
    expect(result.table[0]).toEqual(['Apple, Inc.', 'A tech company'])
  })

  test('should parse quoted fields with newlines', () => {
    const input = `name,description
Apple,"A round
red fruit"
Banana,A yellow fruit`

    const result = parseCsv(input, { hasHeader: true })

    expect(result.errorCode).toBeUndefined()
    expect(result.rowCount).toBe(2)
    expect(result.table[0][1]).toContain('\n')
    expect(result.table[0][1]).toBe('A round\nred fruit')
    expect(result.table[1][0]).toBe('Banana')
  })

  test('should parse escaped quotes (double quotes)', () => {
    const input = 'name,note\n"John","He said ""Hello"""'
    const result = parseCsv(input, { hasHeader: true })

    expect(result.errorCode).toBeUndefined()
    expect(result.table[0][1]).toBe('He said "Hello"')
  })

  test('should handle empty quoted fields', () => {
    const input = 'a,"",c\n1,2,3'
    const result = parseCsv(input, { hasHeader: true })

    expect(result.errorCode).toBeUndefined()
    expect(result.header[1]).toBe('')
  })

  test('should detect unterminated quote', () => {
    const input = 'a,"unterminated,b\nc'
    const result = parseCsv(input, { hasHeader: true })

    expect(result.errorCode).toBe(ERROR_CONSTS.UNTERMINATED_QUOTE)
    expect(result.error).toBeDefined()
    expect(result.table).toBeNull()
  })
})

describe('escapeCell function', () => {
  test('should not quote simple values', () => {
    expect(escapeCell('hello', QUOTE_CHAR, ESCAPE_CHAR, ',')).toBe('hello')
    expect(escapeCell('123', QUOTE_CHAR, ESCAPE_CHAR, ',')).toBe('123')
    expect(escapeCell('', QUOTE_CHAR, ESCAPE_CHAR, ',')).toBe('')
  })

  test('should quote values containing delimiter', () => {
    expect(escapeCell('a,b', QUOTE_CHAR, ESCAPE_CHAR, ',')).toBe('"a,b"')
  })

  test('should quote values containing quotes', () => {
    expect(escapeCell('a"b', QUOTE_CHAR, ESCAPE_CHAR, ',')).toBe('"a""b"')
  })

  test('should quote values containing newlines', () => {
    expect(escapeCell('a\nb', QUOTE_CHAR, ESCAPE_CHAR, ',')).toBe('"a\nb"')
  })

  test('should handle null and undefined', () => {
    expect(escapeCell(null, QUOTE_CHAR, ESCAPE_CHAR, ',')).toBe('')
    expect(escapeCell(undefined, QUOTE_CHAR, ESCAPE_CHAR, ',')).toBe('')
  })
})

describe('stringifyCsv function', () => {
  test('should stringify simple table', () => {
    const table = [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]
    const header = ['a', 'b', 'c']

    const result = stringifyCsv(table, { header, delimiter: ',' })
    const lines = result.split('\n')

    expect(lines.length).toBe(3)
    expect(lines[0]).toBe('a,b,c')
    expect(lines[1]).toBe('1,2,3')
    expect(lines[2]).toBe('4,5,6')
  })

  test('should stringify without header', () => {
    const table = [['1', '2'], ['3', '4']]
    const result = stringifyCsv(table, { delimiter: ',' })
    const lines = result.split('\n')

    expect(lines.length).toBe(2)
  })

  test('should properly quote special characters', () => {
    const table = [
      ['with,comma', 'with"quote', 'with\nnewline'],
    ]
    const result = stringifyCsv(table, { delimiter: ',' })

    expect(result).toContain('"with,comma"')
    expect(result).toContain('"with""quote"')
    expect(result).toContain('"with\nnewline"')
  })

  test('should generate TSV correctly', () => {
    const table = [['1', '2', '3']]
    const result = stringifyCsv(table, {
      delimiter: PRESET_DELIMITERS.TAB,
    })

    expect(result).toBe('1\t2\t3')
  })
})

describe('detectDelimiter function', () => {
  test('should detect comma in CSV', () => {
    const input = 'a,b,c\n1,2,3\n4,5,6'
    const result = detectDelimiter(input)

    expect(result.delimiter).toBe(PRESET_DELIMITERS.COMMA)
    expect(result.wasFallback).toBe(false)
  })

  test('should detect tab in TSV', () => {
    const input = 'a\tb\tc\n1\t2\t3\n4\t5\t6'
    const result = detectDelimiter(input)

    expect(result.delimiter).toBe(PRESET_DELIMITERS.TAB)
    expect(result.wasFallback).toBe(false)
  })

  test('should detect semicolon', () => {
    const input = 'a;b;c\n1;2;3\n4;5;6'
    const result = detectDelimiter(input)

    expect(result.delimiter).toBe(PRESET_DELIMITERS.SEMICOLON)
  })

  test('should fallback for empty input', () => {
    const result = detectDelimiter('')
    expect(result.wasFallback).toBe(true)
    expect(result.delimiter).toBe(PRESET_DELIMITERS.COMMA)
  })

  test('should fallback when no clear delimiter detected', () => {
    const input = 'just plain text without clear delimiters'
    const result = detectDelimiter(input)

    expect(result.wasFallback).toBe(true)
    expect(result.fallbackReason).toBeDefined()
  })
})

describe('inconsistent columns handling', () => {
  test('should detect columns inconsistency', () => {
    const table = [
      ['a', 'b'],
      ['c', 'd', 'e'],
      ['f'],
    ]

    const result = normalizeCols(table, 'error')

    expect(result.issues.length).toBe(2)
    expect(result.maxCols).toBe(3)
  })

  test('should pad with empty strings when mode is padWithEmpty', () => {
    const table = [
      ['a', 'b'],
      ['c', 'd', 'e'],
      ['f'],
    ]

    const result = normalizeCols(table, INCONSISTENT_COLS_MODES.PAD_WITH_EMPTY)

    expect(result.normalized[0].length).toBe(3)
    expect(result.normalized[0][2]).toBe('')
    expect(result.normalized[2].length).toBe(3)
    expect(result.normalized[2][1]).toBe('')
    expect(result.normalized[2][2]).toBe('')
  })

  test('should truncate when mode is truncate', () => {
    const table = [
      ['a', 'b'],
      ['c', 'd', 'e'],
    ]

    const result = normalizeCols(table, INCONSISTENT_COLS_MODES.TRUNCATE)

    expect(result.normalized[1].length).toBe(2)
    expect(result.normalized[1]).toEqual(['c', 'd'])
  })

  test('processInput should return error for inconsistent cols in error mode', () => {
    const input = 'a,b,c\n1,2\n3,4,5,6'

    const result = processInput({
      input,
      delimiter: PRESET_DELIMITERS.COMMA,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CONSTS.INCONSISTENT_COLS)
  })

  test('processInput should handle inconsistent cols in pad mode', () => {
    const input = 'a,b,c\n1,2\n3,4,5,6'

    const result = processInput({
      input,
      delimiter: PRESET_DELIMITERS.COMMA,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.PAD_WITH_EMPTY,
    })

    expect(result.success).toBe(true)
    expect(result.result.inconsistentColsIssues.length).toBe(2)
    expect(result.result.table[0].length).toBe(3)
  })
})

describe('transposeTable function', () => {
  test('should transpose a simple table', () => {
    const table = [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]
    const header = ['col1', 'col2', 'col3']

    const result = transposeTable(table, header)

    expect(result.transposed.length).toBe(3)
    expect(result.transposed[0]).toEqual(['a', '1', '4'])
    expect(result.transposed[1]).toEqual(['b', '2', '5'])
    expect(result.transposed[2]).toEqual(['c', '3', '6'])

    expect(result.newHeader).toEqual(['col1', 'col2', 'col3'])
  })

  test('should transpose without header', () => {
    const table = [
      ['a', 'b'],
      ['1', '2'],
    ]

    const result = transposeTable(table, null)

    expect(result.transposed.length).toBe(2)
    expect(result.transposed[0]).toEqual(['a', '1'])
    expect(result.newHeader).toBeNull()
  })

  test('should handle empty table', () => {
    const result = transposeTable([], null)

    expect(result.transposed).toEqual([])
    expect(result.newRowCount).toBe(0)
    expect(result.newColCount).toBe(0)
  })

  test('should handle null table', () => {
    const result = transposeTable(null, null)

    expect(result.transposed).toEqual([])
    expect(result.newRowCount).toBe(0)
  })
})

describe('transpose shape guard', () => {
  test('should transpose uneven table correctly after padding', () => {
    const table = [
      ['a', 'b'],
      ['1'],
      ['x', 'y', 'z'],
    ]

    const result = transposeTable(table, null)

    expect(result.newRowCount).toBe(3)
    expect(result.newColCount).toBe(3)
    expect(result.transposed[0]).toEqual(['a', '1', 'x'])
    expect(result.transposed[1]).toEqual(['b', '', 'y'])
    expect(result.transposed[2]).toEqual(['', '', 'z'])
  })

  test('processTranspose should return error for empty table', () => {
    const result = processTranspose({
      table: [],
      header: null,
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CONSTS.EMPTY_TABLE)
  })

  test('processTranspose should handle null table', () => {
    const result = processTranspose({
      table: null,
      header: null,
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CONSTS.EMPTY_TABLE)
  })
})

describe('validateInput function', () => {
  test('should return error for null input', () => {
    const result = validateInput(null)
    expect(result.errorCode).toBe(ERROR_CONSTS.NULL_INPUT)
  })

  test('should return error for undefined input', () => {
    const result = validateInput(undefined)
    expect(result.errorCode).toBe(ERROR_CONSTS.NULL_INPUT)
  })

  test('should pass for valid input', () => {
    const result = validateInput('valid input')
    expect(result).toBeNull()
  })
})

describe('validateTable function', () => {
  test('should detect too many rows', () => {
    const table = []
    for (let i = 0; i < MAX_ROWS + 1; i++) {
      table.push(['a', 'b'])
    }

    const result = validateTable(table, null)
    expect(result.errorCode).toBe(ERROR_CONSTS.TOO_MANY_ROWS)
  })

  test('should detect too many columns', () => {
    const row = []
    for (let i = 0; i < MAX_COLS + 1; i++) {
      row.push('a')
    }
    const table = [row]

    const result = validateTable(table, null)
    expect(result.errorCode).toBe(ERROR_CONSTS.TOO_MANY_COLS)
  })

  test('should detect cell too large', () => {
    const largeCell = 'x'.repeat(MAX_CELL_BYTES + 1)
    const table = [[largeCell]]

    const result = validateTable(table, null)
    expect(result.errorCode).toBe(ERROR_CONSTS.CELL_TOO_LARGE)
  })

  test('should pass for valid table', () => {
    const table = [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]
    const header = ['col1', 'col2', 'col3']

    const result = validateTable(table, header)
    expect(result).toBeNull()
  })
})

describe('processInput integration', () => {
  test('should process RFC4180 compliant CSV', () => {
    const input = `name,description,count
"Apple","A round
red fruit",100
"Banana","A ""yellow"" fruit",50`

    const result = processInput({
      input,
      delimiter: PRESET_DELIMITERS.COMMA,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(true)
    expect(result.result.header).toEqual(['name', 'description', 'count'])
    expect(result.result.rowCount).toBe(2)
    expect(result.result.table[0][0]).toBe('Apple')
    expect(result.result.table[0][1]).toContain('\n')
    expect(result.result.table[1][1]).toBe('A "yellow" fruit')
  })

  test('should process TSV input', () => {
    const input = 'name\tage\tcity\nAlice\t25\tNew York\nBob\t30\tSan Francisco'

    const result = processInput({
      input,
      delimiter: PRESET_DELIMITERS.TAB,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(true)
    expect(result.result.header).toEqual(['name', 'age', 'city'])
    expect(result.result.rowCount).toBe(2)
  })

  test('should auto-detect delimiter', () => {
    const input = 'a,b,c\n1,2,3\n4,5,6'

    const result = processInput({
      input,
      delimiter: 'auto',
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(true)
    expect(result.result.autoDetectUsed).toBe(true)
    expect(result.result.detectedDelimiter).toBe(PRESET_DELIMITERS.COMMA)
  })

  test('should detect unterminated quote error', () => {
    const input = 'a,"unclosed,b\nc,d'

    const result = processInput({
      input,
      delimiter: PRESET_DELIMITERS.COMMA,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CONSTS.UNTERMINATED_QUOTE)
  })
})

describe('processGenerateCsv function', () => {
  test('should generate CSV from table', () => {
    const table = [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]
    const header = ['a', 'b', 'c']

    const result = processGenerateCsv({
      table,
      header,
      delimiter: PRESET_DELIMITERS.COMMA,
    })

    expect(result.success).toBe(true)
    expect(result.result.csv).toContain('a,b,c')
    expect(result.result.csv).toContain('1,2,3')
  })

  test('should generate TSV from table', () => {
    const table = [['1', '2', '3']]

    const result = processGenerateCsv({
      table,
      header: null,
      delimiter: PRESET_DELIMITERS.TAB,
    })

    expect(result.success).toBe(true)
    expect(result.result.csv).toBe('1\t2\t3')
  })
})

describe('bidirectional consistency', () => {
  test('parse and stringify should be consistent for simple CSV', () => {
    const original = 'a,b,c\n1,2,3\n4,5,6'

    const parseResult = parseCsv(original, { hasHeader: true })
    const stringifyResult = stringifyCsv(parseResult.table, {
      header: parseResult.header,
      delimiter: ',',
    })

    expect(stringifyResult).toBe(original)
  })

  test('parse and stringify should be consistent with special characters', () => {
    const original = `name,note
"Doe, John","He said ""Hello"""`

    const parseResult = parseCsv(original, { hasHeader: true })
    const stringifyResult = stringifyCsv(parseResult.table, {
      header: parseResult.header,
      delimiter: ',',
    })

    expect(parseResult.table[0][0]).toBe('Doe, John')
    expect(parseResult.table[0][1]).toBe('He said "Hello"')

    const reParse = parseCsv(stringifyResult, { hasHeader: true })
    expect(reParse.table[0][0]).toBe('Doe, John')
    expect(reParse.table[0][1]).toBe('He said "Hello"')
  })
})

describe('transpose consistency', () => {
  test('double transpose should restore original shape', () => {
    const original = [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]

    const once = transposeTable(original, null)
    const twice = transposeTable(once.transposed, null)

    expect(twice.transposed).toEqual(original)
  })

  test('transpose should maintain values', () => {
    const table = [
      ['hello', 'world'],
      ['123', '456'],
    ]

    const result = transposeTable(table, null)

    expect(result.transposed[0][0]).toBe('hello')
    expect(result.transposed[0][1]).toBe('123')
    expect(result.transposed[1][0]).toBe('world')
    expect(result.transposed[1][1]).toBe('456')
  })
})

describe('EXAMPLES validation', () => {
  test('QUOTE_WITH_NEWLINE example should parse correctly', () => {
    const result = processInput({
      input: EXAMPLES.QUOTE_WITH_NEWLINE,
      delimiter: PRESET_DELIMITERS.COMMA,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(true)
    expect(result.result.rowCount).toBe(3)
    expect(result.result.colCount).toBe(3)
  })

  test('IRREGULAR_COLS example should have inconsistent columns', () => {
    const result = processInput({
      input: EXAMPLES.IRREGULAR_COLS,
      delimiter: PRESET_DELIMITERS.COMMA,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CONSTS.INCONSISTENT_COLS)
  })

  test('IRREGULAR_COLS should parse with pad mode', () => {
    const result = processInput({
      input: EXAMPLES.IRREGULAR_COLS,
      delimiter: PRESET_DELIMITERS.COMMA,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.PAD_WITH_EMPTY,
    })

    expect(result.success).toBe(true)
    expect(result.result.inconsistentColsIssues.length).toBeGreaterThan(0)
  })

  test('MIXED_CONTENT example should parse correctly', () => {
    const result = processInput({
      input: EXAMPLES.MIXED_CONTENT,
      delimiter: PRESET_DELIMITERS.COMMA,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(true)
  })

  test('TSV_SAMPLE should parse with tab delimiter', () => {
    const result = processInput({
      input: EXAMPLES.TSV_SAMPLE,
      delimiter: PRESET_DELIMITERS.TAB,
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(true)
    expect(result.result.rowCount).toBe(3)
  })

  test('TSV_SAMPLE should auto-detect tab delimiter', () => {
    const result = processInput({
      input: EXAMPLES.TSV_SAMPLE,
      delimiter: 'auto',
      hasHeader: true,
      inconsistentColsMode: INCONSISTENT_COLS_MODES.ERROR,
    })

    expect(result.success).toBe(true)
    expect(result.result.detectedDelimiter).toBe(PRESET_DELIMITERS.TAB)
  })
})
