import { describe, expect, test } from 'vitest'
import { createLogFilter, filterByLevel, filterBySubstring, filterByRegex, combineFilters } from '../logic/filters.js'
import { LOG_LEVELS } from '../logic/constants.js'

describe('createLogFilter', () => {
  test('应该按日志级别过滤', () => {
    const filter = createLogFilter({ minLevel: LOG_LEVELS.WARN })

    expect(filter({ level: LOG_LEVELS.TRACE, message: 'trace' })).toBe(false)
    expect(filter({ level: LOG_LEVELS.DEBUG, message: 'debug' })).toBe(false)
    expect(filter({ level: LOG_LEVELS.INFO, message: 'info' })).toBe(false)
    expect(filter({ level: LOG_LEVELS.WARN, message: 'warn' })).toBe(true)
    expect(filter({ level: LOG_LEVELS.ERROR, message: 'error' })).toBe(true)
    expect(filter({ level: LOG_LEVELS.FATAL, message: 'fatal' })).toBe(true)
  })

  test('应该按包含字符串过滤', () => {
    const filter = createLogFilter({ includes: ['error', 'fail'] })

    expect(filter({ message: 'System error occurred' })).toBe(true)
    expect(filter({ message: 'Test failed with error' })).toBe(true)
    expect(filter({ message: 'Operation completed successfully' })).toBe(false)
  })

  test('应该按排除字符串过滤', () => {
    const filter = createLogFilter({ excludes: ['debug', 'verbose'] })

    expect(filter({ message: 'Debug information' })).toBe(false)
    expect(filter({ message: 'Verbose logging' })).toBe(false)
    expect(filter({ message: 'Normal log entry' })).toBe(true)
  })

  test('应该按正则表达式过滤', () => {
    const filter = createLogFilter({ regexPatterns: ['ERR_\\d+', 'FATAL_\\d+'] })

    expect(filter({ message: 'Error: ERR_001 occurred' })).toBe(true)
    expect(filter({ message: 'FATAL_999 system crash' })).toBe(true)
    expect(filter({ message: 'INFO: operation completed' })).toBe(false)
  })

  test('应该组合多个过滤条件', () => {
    const filter = createLogFilter({
      minLevel: LOG_LEVELS.WARN,
      includes: ['database'],
      excludes: ['debug'],
    })

    expect(filter({ level: LOG_LEVELS.ERROR, message: 'Database connection failed' })).toBe(true)
    expect(filter({ level: LOG_LEVELS.WARN, message: 'Database pool low' })).toBe(true)
    expect(filter({ level: LOG_LEVELS.INFO, message: 'Database connected' })).toBe(false)
    expect(filter({ level: LOG_LEVELS.ERROR, message: 'debug database info' })).toBe(false)
  })

  test('应该处理字符串日志', () => {
    const filter = createLogFilter({ includes: ['error'] })

    expect(filter('This is an error message')).toBe(true)
    expect(filter('This is an info message')).toBe(false)
  })

  test('应该处理没有消息字段的对象', () => {
    const filter = createLogFilter({ includes: ['test'] })

    expect(filter({ text: 'test message' })).toBe(true)
    expect(filter({})).toBe(false)
  })
})

describe('filterByLevel', () => {
  test('应该按最小日志级别过滤', () => {
    const logs = [
      { level: LOG_LEVELS.TRACE, message: 'trace' },
      { level: LOG_LEVELS.DEBUG, message: 'debug' },
      { level: LOG_LEVELS.INFO, message: 'info' },
      { level: LOG_LEVELS.WARN, message: 'warn' },
      { level: LOG_LEVELS.ERROR, message: 'error' },
      { level: LOG_LEVELS.FATAL, message: 'fatal' },
    ]

    const result = filterByLevel(logs, LOG_LEVELS.WARN)

    expect(result).toHaveLength(3)
    expect(result.every((l) => l.level === LOG_LEVELS.WARN || l.level === LOG_LEVELS.ERROR || l.level === LOG_LEVELS.FATAL)).toBe(true)
  })

  test('应该默认INFO级别处理字符串日志', () => {
    const logs = ['error message', 'warning message']
    const result = filterByLevel(logs, LOG_LEVELS.INFO)

    expect(result).toHaveLength(2)
  })
})

describe('filterBySubstring', () => {
  test('应该按子字符串过滤', () => {
    const logs = [
      { message: 'Hello World' },
      { message: 'Hello Universe' },
      { message: 'Goodbye World' },
    ]

    const result = filterBySubstring(logs, 'Hello')

    expect(result).toHaveLength(2)
    expect(result.every((l) => l.message.includes('Hello'))).toBe(true)
  })

  test('应该大小写不敏感', () => {
    const logs = [{ message: 'HELLO' }, { message: 'hello' }, { message: 'Hello' }]
    const result = filterBySubstring(logs, 'hello')

    expect(result).toHaveLength(3)
  })

  test('应该支持大小写敏感模式', () => {
    const logs = [{ message: 'HELLO' }, { message: 'hello' }, { message: 'Hello' }]
    const result = filterBySubstring(logs, 'Hello', true)

    expect(result).toHaveLength(1)
    expect(result[0].message).toBe('Hello')
  })

  test('应该处理字符串日志', () => {
    const logs = ['error message', 'info message', 'warning message']
    const result = filterBySubstring(logs, 'error')

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('error message')
  })
})

describe('filterByRegex', () => {
  test('应该按正则表达式过滤', () => {
    const logs = [
      { message: 'User ID: 123' },
      { message: 'User ID: abc' },
      { message: 'User ID: 456' },
    ]

    const result = filterByRegex(logs, /User ID: \d+/)

    expect(result).toHaveLength(2)
  })

  test('应该支持字符串模式', () => {
    const logs = [{ message: 'test123' }, { message: 'testabc' }]
    const result = filterByRegex(logs, '\\d+')

    expect(result).toHaveLength(1)
    expect(result[0].message).toBe('test123')
  })

  test('应该处理字符串日志', () => {
    const logs = ['error 123', 'info abc', 'warning 456']
    const result = filterByRegex(logs, /\d+/)

    expect(result).toHaveLength(2)
  })
})

describe('combineFilters', () => {
  test('应该组合多个过滤器函数', () => {
    const logs = [
      { level: LOG_LEVELS.ERROR, message: 'Database error' },
      { level: LOG_LEVELS.ERROR, message: 'Network error' },
      { level: LOG_LEVELS.INFO, message: 'Database connected' },
      { level: LOG_LEVELS.WARN, message: 'Database pool low' },
    ]

    const filter1 = (l) => l.level === LOG_LEVELS.ERROR
    const filter2 = (l) => l.message.includes('Database')

    const result = combineFilters(logs, filter1, filter2)

    expect(result).toHaveLength(1)
    expect(result[0].message).toBe('Database error')
  })

  test('应该没有过滤器时返回所有日志', () => {
    const logs = [{ message: 'test1' }, { message: 'test2' }]
    const result = combineFilters(logs)

    expect(result).toHaveLength(2)
  })
})
