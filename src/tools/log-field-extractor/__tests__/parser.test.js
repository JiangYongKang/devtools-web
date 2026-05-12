import { describe, test, expect } from 'vitest'
import {
  tryParseJSON,
  extractTimeFromLine,
  extractLevelFromLine,
  normalizeLevel,
  parseTimestamp,
  parseLogLine,
} from '../logic/parser.js'

describe('parser.js', () => {
  describe('tryParseJSON', () => {
    test('should parse valid JSON object', () => {
      const result = tryParseJSON('{"timestamp":"2025-05-10T14:30:01Z","level":"INFO"}')
      expect(result).toEqual({ timestamp: '2025-05-10T14:30:01Z', level: 'INFO' })
    })

    test('should return null for invalid JSON', () => {
      expect(tryParseJSON('not json')).toBeNull()
      expect(tryParseJSON('{invalid}')).toBeNull()
    })

    test('should return null for non-object JSON', () => {
      expect(tryParseJSON('"string"')).toBeNull()
      expect(tryParseJSON('[1, 2, 3]')).toBeNull()
    })

    test('should handle whitespace around JSON', () => {
      const result = tryParseJSON('  {"level":"INFO"}  ')
      expect(result).toEqual({ level: 'INFO' })
    })
  })

  describe('extractTimeFromLine', () => {
    test('should extract ISO8601 timestamp with Z', () => {
      const result = extractTimeFromLine('2025-05-10T14:30:01Z INFO test')
      expect(result).toBe('2025-05-10T14:30:01Z')
    })

    test('should extract ISO8601 timestamp with timezone', () => {
      const result = extractTimeFromLine('2025-05-10T14:30:01+08:00 INFO test')
      expect(result).toBe('2025-05-10T14:30:01+08:00')
    })

    test('should extract timestamp with milliseconds', () => {
      const result = extractTimeFromLine('2025-05-10T14:30:01.123Z INFO test')
      expect(result).toBe('2025-05-10T14:30:01.123Z')
    })

    test('should extract RFC3339 with nanoseconds', () => {
      const result = extractTimeFromLine('2025-05-10T14:30:01.123456789+08:00 INFO test')
      expect(result).toBe('2025-05-10T14:30:01.123456789+08:00')
    })

    test('should extract space-separated datetime', () => {
      const result = extractTimeFromLine('2025-05-10 14:30:01 INFO test')
      expect(result).toBe('2025-05-10 14:30:01')
    })

    test('should extract slash-separated datetime', () => {
      const result = extractTimeFromLine('2025/05/10 14:30:01 INFO test')
      expect(result).toBe('2025/05/10 14:30:01')
    })

    test('should extract bracketed datetime', () => {
      const result = extractTimeFromLine('[2025-05-10 14:30:01] INFO test')
      expect(result).toBe('2025-05-10 14:30:01')
    })

    test('should extract Nginx/Apache format', () => {
      const result = extractTimeFromLine('127.0.0.1 - - [10/May/2025:14:30:01 +0800] "GET / HTTP/1.1"')
      expect(result).toBe('10/May/2025:14:30:01 +0800')
    })

    test('should extract key-value time field', () => {
      const result = extractTimeFromLine('level=INFO time="2025-05-10T14:30:01Z" msg=test')
      expect(result).toBe('2025-05-10T14:30:01Z')
    })

    test('should extract from JSON timestamp field', () => {
      const result = extractTimeFromLine('{"timestamp":"2025-05-10T14:30:01Z","level":"INFO"}')
      expect(result).toBe('2025-05-10T14:30:01Z')
    })

    test('should extract from JSON time field', () => {
      const result = extractTimeFromLine('{"time":"2025-05-10T14:30:01Z","level":"INFO"}')
      expect(result).toBe('2025-05-10T14:30:01Z')
    })

    test('should extract from JSON ts field', () => {
      const result = extractTimeFromLine('{"ts":"2025-05-10T14:30:01Z","level":"INFO"}')
      expect(result).toBe('2025-05-10T14:30:01Z')
    })

    test('should return null for no time found', () => {
      expect(extractTimeFromLine('INFO no timestamp here')).toBeNull()
    })
  })

  describe('extractLevelFromLine', () => {
    test('should extract INFO level', () => {
      expect(extractLevelFromLine('2025-05-10T14:30:01Z INFO test')).toBe('INFO')
    })

    test('should extract DEBUG level', () => {
      expect(extractLevelFromLine('2025-05-10T14:30:01Z DEBUG test')).toBe('DEBUG')
    })

    test('should extract WARN level', () => {
      expect(extractLevelFromLine('2025-05-10T14:30:01Z WARN test')).toBe('WARN')
      expect(extractLevelFromLine('2025-05-10T14:30:01Z WARNING test')).toBe('WARN')
    })

    test('should extract ERROR level', () => {
      expect(extractLevelFromLine('2025-05-10T14:30:01Z ERROR test')).toBe('ERROR')
    })

    test('should extract FATAL level', () => {
      expect(extractLevelFromLine('2025-05-10T14:30:01Z FATAL test')).toBe('FATAL')
    })

    test('should extract TRACE level', () => {
      expect(extractLevelFromLine('2025-05-10T14:30:01Z TRACE test')).toBe('TRACE')
    })

    test('should extract level in brackets', () => {
      expect(extractLevelFromLine('[2025-05-10 14:30:01] [INFO] test')).toBe('INFO')
    })

    test('should extract level with colon', () => {
      expect(extractLevelFromLine('INFO: test message')).toBe('INFO')
      expect(extractLevelFromLine('ERROR: something failed')).toBe('ERROR')
    })

    test('should extract level from JSON', () => {
      expect(extractLevelFromLine('{"level":"INFO","timestamp":"2025-05-10T14:30:01Z"}')).toBe('INFO')
      expect(extractLevelFromLine('{"lvl":"DEBUG","ts":"2025-05-10T14:30:01Z"}')).toBe('DEBUG')
      expect(extractLevelFromLine('{"severity":"ERROR","time":"2025-05-10T14:30:01Z"}')).toBe('ERROR')
    })

    test('should extract level from key-value format', () => {
      expect(extractLevelFromLine('level=INFO time=2025-05-10T14:30:01Z')).toBe('INFO')
      expect(extractLevelFromLine('lvl=DEBUG msg="test"')).toBe('DEBUG')
      expect(extractLevelFromLine('severity=WARN error=test')).toBe('WARN')
    })

    test('should handle quoted level in key-value', () => {
      expect(extractLevelFromLine('level="INFO" time=test')).toBe('INFO')
      expect(extractLevelFromLine("level='ERROR' time=test")).toBe('ERROR')
    })

    test('should handle lowercase levels', () => {
      expect(extractLevelFromLine('2025-05-10T14:30:01Z info test')).toBe('INFO')
      expect(extractLevelFromLine('2025-05-10T14:30:01Z debug test')).toBe('DEBUG')
      expect(extractLevelFromLine('2025-05-10T14:30:01Z error test')).toBe('ERROR')
    })

    test('should return null for no level found', () => {
      expect(extractLevelFromLine('2025-05-10T14:30:01Z some random text')).toBeNull()
    })
  })

  describe('normalizeLevel', () => {
    test('should normalize INFO variants', () => {
      expect(normalizeLevel('INFO')).toBe('INFO')
      expect(normalizeLevel('info')).toBe('INFO')
      expect(normalizeLevel('Inf')).toBe('INFO')
      expect(normalizeLevel('INF')).toBe('INFO')
      expect(normalizeLevel('information')).toBe('INFO')
    })

    test('should normalize DEBUG variants', () => {
      expect(normalizeLevel('DEBUG')).toBe('DEBUG')
      expect(normalizeLevel('debug')).toBe('DEBUG')
      expect(normalizeLevel('DBG')).toBe('DEBUG')
      expect(normalizeLevel('dbg')).toBe('DEBUG')
    })

    test('should normalize WARN variants', () => {
      expect(normalizeLevel('WARN')).toBe('WARN')
      expect(normalizeLevel('WARNING')).toBe('WARN')
      expect(normalizeLevel('warn')).toBe('WARN')
      expect(normalizeLevel('WRN')).toBe('WARN')
    })

    test('should normalize ERROR variants', () => {
      expect(normalizeLevel('ERROR')).toBe('ERROR')
      expect(normalizeLevel('error')).toBe('ERROR')
      expect(normalizeLevel('ERR')).toBe('ERROR')
      expect(normalizeLevel('err')).toBe('ERROR')
    })

    test('should normalize FATAL variants', () => {
      expect(normalizeLevel('FATAL')).toBe('FATAL')
      expect(normalizeLevel('fatal')).toBe('FATAL')
      expect(normalizeLevel('CRITICAL')).toBe('FATAL')
      expect(normalizeLevel('CRIT')).toBe('FATAL')
      expect(normalizeLevel('FTL')).toBe('FATAL')
    })

    test('should normalize TRACE variants', () => {
      expect(normalizeLevel('TRACE')).toBe('TRACE')
      expect(normalizeLevel('trace')).toBe('TRACE')
      expect(normalizeLevel('TRC')).toBe('TRACE')
    })

    test('should return null for unknown levels', () => {
      expect(normalizeLevel('UNKNOWN')).toBeNull()
      expect(normalizeLevel('CUSTOM')).toBeNull()
      expect(normalizeLevel('')).toBeNull()
      expect(normalizeLevel(null)).toBeNull()
    })
  })

  describe('parseTimestamp', () => {
    test('should parse ISO8601 with Z', () => {
      const result = parseTimestamp('2025-05-10T14:30:01Z')
      expect(result.isValid).toBe(true)
      expect(result.timestamp).toBe(1746887401000)
    })

    test('should parse ISO8601 with timezone', () => {
      const result = parseTimestamp('2025-05-10T14:30:01+08:00')
      expect(result.isValid).toBe(true)
    })

    test('should parse with milliseconds', () => {
      const result = parseTimestamp('2025-05-10T14:30:01.123Z')
      expect(result.isValid).toBe(true)
      expect(result.timestamp).toBe(1746887401123)
    })

    test('should parse space-separated datetime', () => {
      const result = parseTimestamp('2025-05-10 14:30:01', 'UTC')
      expect(result.isValid).toBe(true)
    })

    test('should parse epoch milliseconds', () => {
      const result = parseTimestamp('1746887401000')
      expect(result.isValid).toBe(true)
      expect(result.timestamp).toBe(1746887401000)
    })

    test('should parse epoch seconds', () => {
      const result = parseTimestamp('1746887401')
      expect(result.isValid).toBe(true)
      expect(result.timestamp).toBe(1746887401000)
    })

    test('should parse Nginx format', () => {
      const result = parseTimestamp('10/May/2025:14:30:01 +0800')
      expect(result.isValid).toBe(true)
    })

    test('should return invalid for bad timestamp', () => {
      const result = parseTimestamp('not-a-time')
      expect(result.isValid).toBe(false)
      expect(result.timestamp).toBeNull()
    })

    test('should return invalid for invalid date', () => {
      const result = parseTimestamp('2025-13-40T99:99:99Z')
      expect(result.isValid).toBe(false)
    })

    test('should return formatted string', () => {
      const result = parseTimestamp('2025-05-10T14:30:01Z', 'UTC')
      expect(result.isValid).toBe(true)
      expect(result.formatted).toBeDefined()
      expect(typeof result.formatted).toBe('string')
    })

    test('should return null for null input', () => {
      expect(parseTimestamp(null)).toBeNull()
      expect(parseTimestamp('')).toBeNull()
    })
  })

  describe('parseLogLine', () => {
    test('should parse fully matched line', () => {
      const result = parseLogLine('2025-05-10T14:30:01Z INFO Server started')
      expect(result.matched).toBe(true)
      expect(result.level).toBe('INFO')
      expect(result.time.isValid).toBe(true)
      expect(result.unmatchedReason).toBeNull()
    })

    test('should mark line with only level as unmatched', () => {
      const result = parseLogLine('INFO Server started')
      expect(result.matched).toBe(false)
      expect(result.level).toBe('INFO')
      expect(result.time).toBeNull()
      expect(result.unmatchedReason).toBe('NO_TIME')
    })

    test('should mark line with only time as unmatched', () => {
      const result = parseLogLine('2025-05-10T14:30:01Z Some message')
      expect(result.matched).toBe(false)
      expect(result.level).toBeNull()
      expect(result.time.isValid).toBe(true)
      expect(result.unmatchedReason).toBe('NO_LEVEL')
    })

    test('should mark line with illegal time as unmatched', () => {
      const result = parseLogLine('INFO time="invalid-time" msg=test')
      expect(result.matched).toBe(false)
      expect(result.level).toBe('INFO')
      expect(result.time).toBeDefined()
      expect(result.time.isValid).toBe(false)
      expect(result.unmatchedReason).toBe('ILLEGAL_TIME')
    })

    test('should mark line with neither as unmatched', () => {
      const result = parseLogLine('This is plain text')
      expect(result.matched).toBe(false)
      expect(result.level).toBeNull()
      expect(result.time).toBeNull()
      expect(result.unmatchedReason).toBe('NEITHER')
    })

    test('should parse JSON line', () => {
      const result = parseLogLine('{"timestamp":"2025-05-10T14:30:01Z","level":"INFO","msg":"test"}')
      expect(result.matched).toBe(true)
      expect(result.level).toBe('INFO')
      expect(result.time.isValid).toBe(true)
    })

    test('should parse key-value line', () => {
      const result = parseLogLine('level=INFO time="2025-05-10T14:30:01Z" msg="test"')
      expect(result.matched).toBe(true)
      expect(result.level).toBe('INFO')
      expect(result.time.isValid).toBe(true)
    })

    test('should preserve raw line', () => {
      const line = '2025-05-10T14:30:01Z INFO Original message here'
      const result = parseLogLine(line)
      expect(result.rawLine).toBe(line)
    })

    test('should handle timezone option', () => {
      const result = parseLogLine('2025-05-10T14:30:01Z INFO test', { timezone: 'local' })
      expect(result.matched).toBe(true)
      expect(result.time.formatted).toBeDefined()
    })
  })
})
