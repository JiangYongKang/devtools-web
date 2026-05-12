import { describe, test, expect } from 'vitest'
import {
  isValidKey,
  joinContinuationLines,
  stripComment,
  stripQuotes,
  checkQuotesClosed,
  parseEnvContent,
  formatAsSortedKeyList,
  formatAsTSV,
} from '../logic/parser.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('parser module - isValidKey', () => {
  test('should return true for valid keys', () => {
    expect(isValidKey('KEY')).toBe(true)
    expect(isValidKey('my_key')).toBe(true)
    expect(isValidKey('_private')).toBe(true)
    expect(isValidKey('KEY123')).toBe(true)
    expect(isValidKey('a')).toBe(true)
  })

  test('should return false for invalid keys', () => {
    expect(isValidKey('123key')).toBe(false)
    expect(isValidKey('my-key')).toBe(false)
    expect(isValidKey('my.key')).toBe(false)
    expect(isValidKey('')).toBe(false)
    expect(isValidKey(' ')).toBe(false)
  })
})

describe('parser module - joinContinuationLines', () => {
  test('should handle single line without continuation', () => {
    const result = joinContinuationLines(['KEY=value'])
    expect(result.lines).toEqual(['KEY=value'])
    expect(result.lineMappings).toEqual([{ mergedLines: [1] }])
  })

  test('should join two lines with continuation', () => {
    const result = joinContinuationLines(['KEY=value1 \\', 'value2'])
    expect(result.lines).toEqual(['KEY=value1 value2'])
    expect(result.lineMappings).toEqual([{ mergedLines: [1, 2] }])
  })

  test('should join multiple lines with continuation', () => {
    const result = joinContinuationLines([
      'KEY=line1 \\',
      'line2 \\',
      'line3',
      'OTHER=value'
    ])
    expect(result.lines).toEqual(['KEY=line1 line2 line3', 'OTHER=value'])
    expect(result.lineMappings).toEqual([
      { mergedLines: [1, 2, 3] },
      { mergedLines: [4] }
    ])
  })

  test('should handle trailing backslash at end of file', () => {
    const result = joinContinuationLines(['KEY=value \\'])
    expect(result.lines).toEqual(['KEY=value '])
    expect(result.lineMappings).toEqual([{ mergedLines: [1] }])
  })

  test('should track correct line numbers for continuation lines', () => {
    const result = joinContinuationLines([
      'FIRST=1',
      'SECOND=a \\',
      'b \\',
      'c',
      'THIRD=3'
    ])
    expect(result.lineMappings[1].mergedLines).toEqual([2, 3, 4])
  })
})

describe('parser module - stripComment', () => {
  test('should strip inline comment outside quotes', () => {
    expect(stripComment('value # comment')).toEqual({
      value: 'value',
      comment: 'comment'
    })
  })

  test('should not strip comment inside double quotes', () => {
    expect(stripComment('"value # not comment"')).toEqual({
      value: '"value # not comment"',
      comment: null
    })
  })

  test('should not strip comment inside single quotes', () => {
    expect(stripComment("'value # not comment'")).toEqual({
      value: "'value # not comment'",
      comment: null
    })
  })

  test('should handle escaped quotes', () => {
    expect(stripComment('"value \\" # real comment"')).toEqual({
      value: '"value \\" # real comment"',
      comment: null
    })
  })

  test('should return null comment when no comment', () => {
    expect(stripComment('simple value')).toEqual({
      value: 'simple value',
      comment: null
    })
  })

  test('should handle comment after value with spaces', () => {
    expect(stripComment('  spaced value  #   comment with spaces  ')).toEqual({
      value: '  spaced value',
      comment: 'comment with spaces'
    })
  })
})

describe('parser module - stripQuotes', () => {
  test('should strip double quotes', () => {
    expect(stripQuotes('"value"')).toBe('value')
  })

  test('should strip single quotes', () => {
    expect(stripQuotes("'value'")).toBe('value')
  })

  test('should not strip mismatched quotes', () => {
    expect(stripQuotes('"value')).toBe('"value')
    expect(stripQuotes("value'")).toBe("value'")
    expect(stripQuotes("'value\"")).toBe("'value\"")
  })

  test('should handle empty quoted value', () => {
    expect(stripQuotes('""')).toBe('')
    expect(stripQuotes("''")).toBe('')
  })

  test('should handle value without quotes', () => {
    expect(stripQuotes('value')).toBe('value')
  })

  test('should handle whitespace around quotes', () => {
    expect(stripQuotes('  "value"  ')).toBe('value')
  })
})

describe('parser module - checkQuotesClosed', () => {
  test('should return true for properly closed double quotes', () => {
    expect(checkQuotesClosed('"value"')).toBe(true)
  })

  test('should return true for properly closed single quotes', () => {
    expect(checkQuotesClosed("'value'")).toBe(true)
  })

  test('should return false for unclosed double quotes', () => {
    expect(checkQuotesClosed('"value')).toBe(false)
  })

  test('should return false for unclosed single quotes', () => {
    expect(checkQuotesClosed("'value")).toBe(false)
  })

  test('should handle escaped quotes', () => {
    expect(checkQuotesClosed('"value \\" still quoted"')).toBe(true)
    expect(checkQuotesClosed("'value \\' still quoted'")).toBe(true)
  })

  test('should handle nested different quotes', () => {
    expect(checkQuotesClosed('"it\'s working"')).toBe(true)
    expect(checkQuotesClosed("'say \"hello\"'")).toBe(true)
  })

  test('should return true for empty string', () => {
    expect(checkQuotesClosed('')).toBe(true)
  })
})

describe('parser module - parseEnvContent - basic parsing', () => {
  test('should parse simple key=value', () => {
    const result = parseEnvContent('KEY=value')
    expect(result.success).toBe(true)
    expect(result.entries.length).toBe(1)
    expect(result.entries[0].key).toBe('KEY')
    expect(result.entries[0].value).toBe('value')
  })

  test('should handle empty input', () => {
    const result = parseEnvContent('')
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  test('should ignore empty lines and comments', () => {
    const result = parseEnvContent(`
# this is a comment

KEY1=value1

# another comment
KEY2=value2
`)
    expect(result.success).toBe(true)
    expect(result.entries.length).toBe(2)
    expect(result.entries[0].key).toBe('KEY1')
    expect(result.entries[1].key).toBe('KEY2')
  })

  test('should strip export prefix', () => {
    const result = parseEnvContent(`
export KEY1=value1
export  KEY2=value2
KEY3=value3
`)
    expect(result.success).toBe(true)
    expect(result.entries.length).toBe(3)
    expect(result.entries[0].key).toBe('KEY1')
    expect(result.entries[0].hasExport).toBe(true)
    expect(result.entries[1].key).toBe('KEY2')
    expect(result.entries[1].hasExport).toBe(true)
    expect(result.entries[2].key).toBe('KEY3')
    expect(result.entries[2].hasExport).toBe(false)
  })

  test('should handle quoted values', () => {
    const result = parseEnvContent(`
DOUBLE="double quoted value"
SINGLE='single quoted value'
UNQUOTED=unquoted
`)
    expect(result.success).toBe(true)
    expect(result.entries[0].value).toBe('double quoted value')
    expect(result.entries[1].value).toBe('single quoted value')
    expect(result.entries[2].value).toBe('unquoted')
  })

  test('should handle empty values', () => {
    const result = parseEnvContent(`
EMPTY=
EMPTY_QUOTED=""
`)
    expect(result.success).toBe(true)
    expect(result.entries[0].value).toBe('')
    expect(result.entries[1].value).toBe('')
  })
})

describe('parser module - parseEnvContent - continuation lines', () => {
  test('should handle simple continuation', () => {
    const result = parseEnvContent(`
MULTI_LINE=first line \\
second line
`)
    expect(result.success).toBe(true)
    expect(result.entries.length).toBe(1)
    expect(result.entries[0].value).toBe('first line second line')
    expect(result.entries[0].lineNumbers).toEqual([2, 3])
  })

  test('should handle multiple continuation lines', () => {
    const result = parseEnvContent(`
MULTI_LINE=line1 \\
line2 \\
line3 \\
line4
`)
    expect(result.success).toBe(true)
    expect(result.entries.length).toBe(1)
    expect(result.entries[0].value).toBe('line1 line2 line3 line4')
    expect(result.entries[0].lineNumbers).toEqual([2, 3, 4, 5])
  })

  test('should track line numbers correctly with continuations', () => {
    const result = parseEnvContent(`
FIRST=1
SECOND=a \\
b \\
c
THIRD=3
`)
    expect(result.entries[0].lineNumbers).toEqual([2])
    expect(result.entries[1].lineNumbers).toEqual([3, 4, 5])
    expect(result.entries[2].lineNumbers).toEqual([6])
  })
})

describe('parser module - parseEnvContent - comments', () => {
  test('should strip inline comments', () => {
    const result = parseEnvContent(`
KEY=value # this is a comment
`)
    expect(result.success).toBe(true)
    expect(result.entries[0].value).toBe('value')
    expect(result.entries[0].comment).toBe('this is a comment')
  })

  test('should not strip comments inside double quotes', () => {
    const result = parseEnvContent(`
KEY="value # not a comment"
`)
    expect(result.success).toBe(true)
    expect(result.entries[0].value).toBe('value # not a comment')
  })

  test('should not strip comments inside single quotes', () => {
    const result = parseEnvContent(`
KEY='value # not a comment'
`)
    expect(result.success).toBe(true)
    expect(result.entries[0].value).toBe('value # not a comment')
  })
})

describe('parser module - parseEnvContent - duplicate keys', () => {
  test('should detect duplicate keys', () => {
    const result = parseEnvContent(`
APP_NAME=First
DEBUG=true
APP_NAME=Second
DEBUG=false
`)
    expect(result.success).toBe(true)
    expect(result.duplicates.length).toBe(2)
    expect(result.duplicates[0].key).toBe('APP_NAME')
    expect(result.duplicates[0].count).toBe(2)
    expect(result.duplicates[1].key).toBe('DEBUG')
    expect(result.duplicates[1].count).toBe(2)
  })

  test('should track all occurrences of duplicate keys', () => {
    const result = parseEnvContent(`
LOG_LEVEL=info
LOG_LEVEL=debug
LOG_LEVEL=warn
`)
    expect(result.duplicates[0].occurrences.length).toBe(3)
    expect(result.duplicates[0].occurrences[0].value).toBe('info')
    expect(result.duplicates[0].occurrences[1].value).toBe('debug')
    expect(result.duplicates[0].occurrences[2].value).toBe('warn')
  })

  test('should have last value as final value', () => {
    const result = parseEnvContent(`
APP=first
APP=second
APP=third
`)
    expect(result.duplicates[0].lastValue).toBe('third')
  })

  test('should add warning for duplicates', () => {
    const result = parseEnvContent(`
KEY=first
KEY=second
`)
    expect(result.warnings.length).toBe(1)
    expect(result.warnings[0].code).toBe('DUPLICATE_KEYS')
  })
})

describe('parser module - parseEnvContent - error handling', () => {
  test('should detect invalid key format', () => {
    const result = parseEnvContent(`
123KEY=value
`)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.INVALID_KEY_FORMAT)
  })

  test('should detect unclosed double quotes', () => {
    const result = parseEnvContent(`
KEY="unclosed
`)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.UNCLOSED_QUOTE)
  })

  test('should detect unclosed single quotes', () => {
    const result = parseEnvContent(`
KEY='unclosed
`)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.UNCLOSED_QUOTE)
  })

  test('should detect missing equals sign', () => {
    const result = parseEnvContent(`
KEY_NO_EQUALS
`)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.INVALID_LINE_FORMAT)
  })

  test('should respect line count limit', () => {
    const lines = []
    for (let i = 0; i < 1500; i++) {
      lines.push(`KEY${i}=value${i}`)
    }
    const result = parseEnvContent(lines.join('\n'))
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.LINE_COUNT_EXCEEDED)
  })

  test('should respect custom line count limit', () => {
    const result = parseEnvContent(`
K1=1
K2=2
K3=3
K4=4
K5=5
`, { maxLineCount: 3 })
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.LINE_COUNT_EXCEEDED)
  })

  test('should detect line length exceeded', () => {
    const longValue = 'a'.repeat(15000)
    const result = parseEnvContent(`KEY=${longValue}`)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.LINE_LENGTH_EXCEEDED)
  })
})

describe('parser module - formatAsSortedKeyList', () => {
  test('should format entries as sorted key list', () => {
    const entries = [
      { key: 'B', value: '2' },
      { key: 'A', value: '1' },
      { key: 'C', value: '3' }
    ]
    const result = formatAsSortedKeyList(entries)
    expect(result).toBe('A=1\nB=2\nC=3')
  })

  test('should handle empty array', () => {
    expect(formatAsSortedKeyList([])).toBe('')
  })
})

describe('parser module - formatAsTSV', () => {
  test('should format entries as TSV', () => {
    const entries = [
      { key: 'KEY', value: 'value', lineNumbers: [1], hasExport: false, comment: null }
    ]
    const result = formatAsTSV(entries)
    expect(result).toContain('Key\tValue\tLine(s)\tHas Export\tComment')
    expect(result).toContain('KEY\tvalue\t1\tNo\t')
  })

  test('should handle export prefix in TSV', () => {
    const entries = [
      { key: 'KEY', value: 'value', lineNumbers: [1], hasExport: true, comment: 'test' }
    ]
    const result = formatAsTSV(entries)
    expect(result).toContain('KEY\tvalue\t1\tYes\ttest')
  })
})

describe('parser module - stats', () => {
  test('should generate correct stats', () => {
    const result = parseEnvContent(`
# comment
KEY1=value1
KEY2=value2
KEY2=value2a
`)
    expect(result.stats.totalLines).toBe(6)
    expect(result.stats.processedLines).toBe(6)
    expect(result.stats.validEntries).toBe(3)
    expect(result.stats.uniqueKeys).toBe(2)
    expect(result.stats.duplicateCount).toBe(1)
  })
})

describe('parser module - integration', () => {
  test('should handle complex .env file', () => {
    const result = parseEnvContent(`# Database Configuration
DB_HOST=localhost
export DB_PORT=5432
DB_NAME="my_database"
DB_USER='db_user'
DB_PASS=secret # password here

# App Settings
APP_ENV=development
APP_DEBUG=true

# Long value with continuation
LONG_DESCRIPTION=This is a very long \\
description that spans \\
multiple lines

# Duplicate key
LOG_LEVEL=info
LOG_LEVEL=debug
`)
    expect(result.success).toBe(true)
    expect(result.entries.length).toBe(10)
    expect(result.uniqueEntries.length).toBe(9)
    expect(result.duplicates.length).toBe(1)

    const dbHost = result.uniqueEntries.find(e => e.key === 'DB_HOST')
    expect(dbHost.value).toBe('localhost')

    const dbPort = result.uniqueEntries.find(e => e.key === 'DB_PORT')
    expect(dbPort.hasExport).toBe(true)

    const dbName = result.uniqueEntries.find(e => e.key === 'DB_NAME')
    expect(dbName.value).toBe('my_database')

    const longDesc = result.uniqueEntries.find(e => e.key === 'LONG_DESCRIPTION')
    expect(longDesc.value).toBe('This is a very long description that spans multiple lines')

    const logLevel = result.duplicates.find(d => d.key === 'LOG_LEVEL')
    expect(logLevel.count).toBe(2)
    expect(logLevel.lastValue).toBe('debug')
  })
})
