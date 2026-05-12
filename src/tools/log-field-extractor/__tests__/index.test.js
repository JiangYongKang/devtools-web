import { describe, test, expect } from 'vitest'
import {
  extractLogFields,
  validateInput,
  buildInputParams,
  splitLines,
  generateTSV,
} from '../logic/index.js'
import { ERROR_CODES, MAX_LINE_COUNT, MAX_LINE_LENGTH } from '../logic/errors.js'

describe('index.js', () => {
  describe('buildInputParams', () => {
    test('should use defaults when params are missing', () => {
      const result = buildInputParams({ text: 'test' })
      expect(result.text).toBe('test')
      expect(result.timezone).toBe('UTC')
    })

    test('should handle null text', () => {
      const result = buildInputParams({})
      expect(result.text).toBeNull()
    })

    test('should accept custom timezone', () => {
      const result = buildInputParams({ text: 'test', timezone: 'local' })
      expect(result.timezone).toBe('local')
    })
  })

  describe('splitLines', () => {
    test('should split by LF', () => {
      const result = splitLines('line1\nline2\nline3')
      expect(result).toEqual(['line1', 'line2', 'line3'])
    })

    test('should split by CRLF', () => {
      const result = splitLines('line1\r\nline2\r\nline3')
      expect(result).toEqual(['line1', 'line2', 'line3'])
    })

    test('should return empty array for empty string', () => {
      const result = splitLines('')
      expect(result).toEqual([])
    })
  })

  describe('validateInput', () => {
    test('should return EMPTY_INPUT error for empty input', () => {
      const result = validateInput('')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return EMPTY_INPUT error for whitespace only', () => {
      const result = validateInput('   \n\t  \n  ')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should return TOO_MANY_LINES error when exceeding limit', () => {
      const lines = Array(MAX_LINE_COUNT + 10).fill('INFO test')
      const text = lines.join('\n')
      const result = validateInput(text)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.TOO_MANY_LINES)
    })

    test('should return LINE_TOO_LONG error when line exceeds limit', () => {
      const longLine = 'INFO ' + 'x'.repeat(MAX_LINE_LENGTH)
      const text = `INFO normal\n${longLine}\nINFO another`
      const result = validateInput(text)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.LINE_TOO_LONG)
    })

    test('should return valid for normal input', () => {
      const text = `INFO line1\nDEBUG line2\nERROR line3`
      const result = validateInput(text)
      expect(result.valid).toBe(true)
    })
  })

  describe('extractLogFields', () => {
    test('should return EMPTY_INPUT error for null text', () => {
      const result = extractLogFields({ text: null })
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
      expect(result.result).toBeNull()
    })

    test('should return EMPTY_INPUT error for empty text', () => {
      const result = extractLogFields({ text: '' })
      expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    })

    test('should parse simple level prefix format', () => {
      const text = `2025-05-10T14:30:01Z INFO Server started
2025-05-10T14:30:02Z DEBUG Connection established
2025-05-10T14:30:03Z WARN Memory warning
2025-05-10T14:30:04Z ERROR Request failed
2025-05-10T14:30:05Z FATAL System error`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.stats.totalLines).toBe(5)
      expect(result.result.stats.matchedLines).toBe(5)
      expect(result.result.lines[0].level).toBe('INFO')
      expect(result.result.lines[1].level).toBe('DEBUG')
      expect(result.result.lines[2].level).toBe('WARN')
      expect(result.result.lines[3].level).toBe('ERROR')
      expect(result.result.lines[4].level).toBe('FATAL')
      expect(result.result.lines[0].isTimeValid).toBe(true)
    })

    test('should parse JSON line logs', () => {
      const text = `{"timestamp":"2025-05-10T14:30:01.123Z","level":"INFO","message":"Server started"}
{"time":"2025-05-10T14:30:02.456+08:00","level":"DEBUG","msg":"DB connected"}
{"ts":"2025-05-10T14:30:03","level":"WARN","message":"High CPU"}
{"level":"ERROR","timestamp":1715351405000,"message":"timeout"}`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.stats.matchedLines).toBe(4)
      expect(result.result.lines[0].level).toBe('INFO')
      expect(result.result.lines[1].level).toBe('DEBUG')
      expect(result.result.lines[2].level).toBe('WARN')
      expect(result.result.lines[3].level).toBe('ERROR')
    })

    test('should parse key-value format', () => {
      const text = `level=INFO time="2025-05-10T14:30:01Z" msg="App started"
level=DEBUG time="2025-05-10 14:30:02" module=database msg="Connected"
level=WARN time=2025-05-10T14:30:03+08:00 msg="Slow query"`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.stats.matchedLines).toBe(3)
      expect(result.result.lines[0].level).toBe('INFO')
      expect(result.result.lines[1].level).toBe('DEBUG')
      expect(result.result.lines[2].level).toBe('WARN')
    })

    test('should parse Nginx access log format', () => {
      const text = `127.0.0.1 - - [10/May/2025:14:30:01 +0800] "GET / HTTP/1.1" 200 1234
192.168.1.100 - admin [10/May/2025:14:30:02 +0800] "POST /api HTTP/1.1" 200 567`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.lines[0].isTimeValid).toBe(true)
    })

    test('should handle unmatched lines', () => {
      const text = `2025-05-10T14:30:01Z INFO Valid line
This is a plain text without any format
Another random line
2025-05-10T14:30:02Z DEBUG Another valid line`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.stats.totalLines).toBe(4)
      expect(result.result.stats.matchedLines).toBe(2)
      expect(result.result.stats.unmatchedLines).toBe(2)

      expect(result.result.lines[0].matched).toBe(true)
      expect(result.result.lines[1].matched).toBe(false)
      expect(result.result.lines[2].matched).toBe(false)
      expect(result.result.lines[3].matched).toBe(true)

      expect(result.result.lines[1].unmatchedReason).toBe('NEITHER')
    })

    test('should handle lines with level but no time', () => {
      const text = `INFO Server started
DEBUG Connection pool
WARN Something happened
ERROR Failed to process`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.stats.matchedLines).toBe(0)
      expect(result.result.stats.unmatchedLines).toBe(4)
      expect(result.result.lines[0].unmatchedReason).toBe('NO_TIME')
      expect(result.result.lines[0].level).toBe('INFO')
    })

    test('should handle lines with time but no level', () => {
      const text = `2025-05-10T14:30:01Z Some random message
[2025-05-10 14:30:02] Another message without level
127.0.0.1 - - [10/May/2025:14:30:03 +0800] "GET / HTTP/1.1" 200 1234`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.stats.unmatchedLines).toBe(3)
      expect(result.result.lines[0].unmatchedReason).toBe('NO_LEVEL')
      expect(result.result.lines[0].isTimeValid).toBe(true)
    })

    test('should handle illegal timestamp format', () => {
      const text = `INFO time="not-a-valid-time" msg="test"
DEBUG time="2025-13-40T99:99:99Z" msg="invalid"`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.lines[0].unmatchedReason).toBe('ILLEGAL_TIME')
    })

    test('should support local timezone option', () => {
      const text = `2025-05-10T14:30:01Z INFO Server started
2025-05-10T14:30:02Z DEBUG Connected`

      const result = extractLogFields({ text, timezone: 'local' })
      expect(result.errorCode).toBeNull()
      expect(result.result.timezone).toBe('local')
    })

    test('should parse epoch timestamps', () => {
      const text = `{"timestamp":1715351401000,"level":"INFO","message":"epoch ms"}
{"timestamp":1715351402,"level":"DEBUG","message":"epoch sec"}`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.stats.matchedLines).toBe(2)
      expect(result.result.lines[0].isTimeValid).toBe(true)
      expect(result.result.lines[1].isTimeValid).toBe(true)
    })

    test('should parse various level aliases', () => {
      const text = `2025-05-10T14:30:01Z DBG Debug message
2025-05-10T14:30:02Z INF Info message
2025-05-10T14:30:03Z WRN Warning message
2025-05-10T14:30:04Z ERR Error message
2025-05-10T14:30:05Z FTL Fatal message`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.lines[0].level).toBe('DEBUG')
      expect(result.result.lines[1].level).toBe('INFO')
      expect(result.result.lines[2].level).toBe('WARN')
      expect(result.result.lines[3].level).toBe('ERROR')
      expect(result.result.lines[4].level).toBe('FATAL')
    })

    test('should handle mixed formats', () => {
      const text = `[2025-05-10 14:30:01] INFO: Server started
2025-05-10T14:30:02.123Z DEBUG Connection
level=ERROR time=2025-05-10T14:30:03+08:00 msg="Failed"
{"ts":"2025-05-10T14:30:04","lvl":"WARN","msg":"warning"}
Plain text no format`

      const result = extractLogFields({ text })
      expect(result.errorCode).toBeNull()
      expect(result.result.stats.matchedLines).toBe(4)
      expect(result.result.stats.unmatchedLines).toBe(1)
    })

    test('should return correct stats for mixed results', () => {
      const text = `2025-05-10T14:30:01Z INFO Match 1
2025-05-10T14:30:02Z DEBUG Match 2
No match here
2025-05-10T14:30:03Z ERROR Match 3
Another no match`

      const result = extractLogFields({ text })
      expect(result.result.stats.totalLines).toBe(5)
      expect(result.result.stats.matchedLines).toBe(3)
      expect(result.result.stats.unmatchedLines).toBe(2)
      expect(parseFloat(result.result.stats.matchRate)).toBeCloseTo(60.0, 0)
    })
  })

  describe('generateTSV', () => {
    test('should generate TSV from result', () => {
      const result = {
        timezone: 'UTC',
        stats: { totalLines: 2, matchedLines: 1, unmatchedLines: 1, matchRate: '50.0' },
        lines: [
          {
            lineNumber: 1,
            rawLine: '2025-05-10T14:30:01Z INFO Test',
            level: 'INFO',
            timeRaw: '2025-05-10T14:30:01Z',
            timeParsed: '2025-05-10T14:30:01.000Z',
            matched: true,
          },
          {
            lineNumber: 2,
            rawLine: 'No match',
            level: null,
            timeRaw: null,
            timeParsed: null,
            matched: false,
          },
        ],
      }

      const tsv = generateTSV(result)
      expect(tsv).toContain('行号')
      expect(tsv).toContain('级别')
      expect(tsv).toContain('INFO')
      expect(tsv).toContain('2025-05-10T14:30:01.000Z')
    })

    test('should return empty string for null result', () => {
      expect(generateTSV(null)).toBe('')
    })
  })
})
