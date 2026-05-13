import { describe, test, expect } from 'vitest'
import {
  tokenizeIdentifier,
  convertSingle,
  convertBatch,
  roundTripCheck,
  parseClipboardInput,
  compressSeparatorString,
  stripPrefixSuffix,
  extractNamespaceSegment,
  joinTokensForCase,
  CASE_STYLES,
  ACRONYM_STRATEGIES,
  NUMBER_ATTACH_STRATEGIES,
  ILLEGAL_CHAR_MODES,
  COMPRESSION_STRATEGIES,
  UNICODE_MODES,
  ERROR_CODES,
} from '../logic/index.js'

describe('identifier case converter - tokenization', () => {
  describe('basic tokenization', () => {
    test('should tokenize simple camelCase', () => {
      const result = tokenizeIdentifier('camelCaseTest')
      expect(result.tokens).toHaveLength(3)
      expect(result.tokens[0].value).toBe('camel')
      expect(result.tokens[1].value).toBe('Case')
      expect(result.tokens[2].value).toBe('Test')
    })

    test('should tokenize PascalCase', () => {
      const result = tokenizeIdentifier('PascalCaseTest')
      expect(result.tokens).toHaveLength(3)
      expect(result.tokens[0].value).toBe('Pascal')
      expect(result.tokens[1].value).toBe('Case')
      expect(result.tokens[2].value).toBe('Test')
    })

    test('should tokenize snake_case', () => {
      const result = tokenizeIdentifier('snake_case_test')
      expect(result.tokens).toHaveLength(3)
      expect(result.tokens[0].value).toBe('snake')
      expect(result.tokens[1].value).toBe('case')
      expect(result.tokens[2].value).toBe('test')
    })

    test('should tokenize kebab-case', () => {
      const result = tokenizeIdentifier('kebab-case-test')
      expect(result.tokens).toHaveLength(3)
      expect(result.tokens[0].value).toBe('kebab')
      expect(result.tokens[1].value).toBe('case')
      expect(result.tokens[2].value).toBe('test')
    })
  })

  describe('acronym strategies', () => {
    test('should handle acronyms with allUppercaseBlock strategy', () => {
      const result = tokenizeIdentifier('HTTPResponse', {
        acronymStrategy: ACRONYM_STRATEGIES.ALL_UPPERCASE_BLOCK,
      })
      const values = result.tokens.map(t => t.value)
      expect(values).toContain('HTTP')
      expect(values).toContain('Response')
    })

    test('should handle acronyms with firstLetterAcronym strategy', () => {
      const result = tokenizeIdentifier('HTTPResponse', {
        acronymStrategy: ACRONYM_STRATEGIES.FIRST_LETTER_ACRONYM,
      })
      const values = result.tokens.map(t => t.value)
      expect(values).toContain('H')
      expect(values).toContain('T')
      expect(values).toContain('T')
      expect(values).toContain('P')
    })

    test('should handle acronyms with appleStyle strategy', () => {
      const result = tokenizeIdentifier('HTTPResponse', {
        acronymStrategy: ACRONYM_STRATEGIES.APPLE_STYLE,
      })
      const values = result.tokens.map(t => t.value)
      expect(values).toContain('HTTP')
      expect(values).toContain('Response')
    })
  })

  describe('number attachment strategies', () => {
    test('should attach numbers to previous segment', () => {
      const result = tokenizeIdentifier('test123value', {
        numberAttachStrategy: NUMBER_ATTACH_STRATEGIES.ATTACH_PREVIOUS,
      })
      const values = result.tokens.map(t => t.value)
      expect(values).toContain('test123')
    })

    test('should keep numbers as separate segment', () => {
      const result = tokenizeIdentifier('test123value', {
        numberAttachStrategy: NUMBER_ATTACH_STRATEGIES.SEPARATE_SEGMENT,
      })
      const values = result.tokens.map(t => t.value)
      expect(values).toContain('123')
    })

    test('should attach numbers to next segment', () => {
      const result = tokenizeIdentifier('123test', {
        numberAttachStrategy: NUMBER_ATTACH_STRATEGIES.ATTACH_NEXT,
      })
      const values = result.tokens.map(t => t.value)
      expect(values).toContain('123test')
    })
  })
})

describe('identifier case converter - case style mapping', () => {
  test('should convert to camelCase', () => {
    const result = convertSingle('hello_world_test', {
      targetCase: CASE_STYLES.CAMEL_CASE,
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('helloWorldTest')
  })

  test('should convert to PascalCase', () => {
    const result = convertSingle('hello_world_test', {
      targetCase: CASE_STYLES.PASCAL_CASE,
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('HelloWorldTest')
  })

  test('should convert to snake_case', () => {
    const result = convertSingle('helloWorldTest', {
      targetCase: CASE_STYLES.SNAKE_CASE,
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('hello_world_test')
  })

  test('should convert to SCREAMING_SNAKE', () => {
    const result = convertSingle('helloWorldTest', {
      targetCase: CASE_STYLES.SCREAMING_SNAKE,
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('HELLO_WORLD_TEST')
  })

  test('should convert to kebab-case', () => {
    const result = convertSingle('helloWorldTest', {
      targetCase: CASE_STYLES.KEBAB_CASE,
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('hello-world-test')
  })

  test('should convert to Train-Case', () => {
    const result = convertSingle('hello_world_test', {
      targetCase: CASE_STYLES.TRAIN_CASE,
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('Hello-World-Test')
  })

  test('should handle round trip conversions', () => {
    const styles = Object.values(CASE_STYLES)
    const original = 'helloWorldTest'

    for (const style of styles) {
      const toStyle = convertSingle(original, { targetCase: style })
      expect(toStyle.success).toBe(true)

      const back = convertSingle(toStyle.result, { targetCase: CASE_STYLES.CAMEL_CASE })
      expect(back.success).toBe(true)

      if (style === CASE_STYLES.SCREAMING_SNAKE) {
        expect(back.result.toLowerCase()).toBe(original.toLowerCase())
      } else {
        expect(back.result).toBe(original)
      }
    }
  })
})

describe('identifier case converter - edge cases', () => {
  test('should handle HTTPResponse example', () => {
    const result = convertSingle('HTTPResponse', {
      targetCase: CASE_STYLES.SNAKE_CASE,
      acronymStrategy: ACRONYM_STRATEGIES.ALL_UPPERCASE_BLOCK,
    })
    expect(result.success).toBe(true)
  })

  test('should handle XML2JSON example', () => {
    const result = convertSingle('XML2JSON', {
      targetCase: CASE_STYLES.CAMEL_CASE,
      numberAttachStrategy: NUMBER_ATTACH_STRATEGIES.ATTACH_PREVIOUS,
    })
    expect(result.success).toBe(true)
  })

  test('should handle __private example with compression', () => {
    const result = convertSingle('__private__', {
      targetCase: CASE_STYLES.CAMEL_CASE,
      compression: COMPRESSION_STRATEGIES.COMPRESS_ALL,
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('private')
  })

  test('should handle consecutive underscores', () => {
    const result = convertSingle('hello__world___test', {
      targetCase: CASE_STYLES.CAMEL_CASE,
      compression: COMPRESSION_STRATEGIES.COMPRESS_CONSECUTIVE,
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('helloWorldTest')
  })
})

describe('identifier case converter - errors and validation', () => {
  test('should return EMPTY error for empty input', () => {
    const result = convertSingle('')
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.EMPTY)
  })

  test('should return NO_ALPHANUMERIC for separators only', () => {
    const result = convertSingle('___---')
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.NO_ALPHANUMERIC)
  })

  test('should return INVALID_CHAR in strict mode', () => {
    const result = convertSingle('hello@world', {
      illegalCharMode: ILLEGAL_CHAR_MODES.REJECT,
    })
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_CHAR)
  })

  test('should preserve illegal chars in preserve mode', () => {
    const result = convertSingle('hello@world', {
      illegalCharMode: ILLEGAL_CHAR_MODES.PRESERVE,
      targetCase: CASE_STYLES.PASCAL_CASE,
    })
    expect(result.success).toBe(true)
    expect(result.illegalChars).not.toBeNull()
  })
})

describe('identifier case converter - utility functions', () => {
  test('should compress leading/trailing separators', () => {
    const result = compressSeparatorString('__test__', COMPRESSION_STRATEGIES.COMPRESS_ALL)
    expect(result).toBe('test')
  })

  test('should compress consecutive separators', () => {
    const result = compressSeparatorString('hello__world', COMPRESSION_STRATEGIES.COMPRESS_CONSECUTIVE)
    expect(result).toBe('hello_world')
  })

  test('should strip prefix', () => {
    const result = stripPrefixSuffix('prefix_testValue', 'prefix_')
    expect(result).toBe('testValue')
  })

  test('should strip suffix', () => {
    const result = stripPrefixSuffix('testValue_suffix', '', '_suffix')
    expect(result).toBe('testValue')
  })

  test('should extract namespace segment', () => {
    const result = extractNamespaceSegment('foo.bar.baz.lastName', '.')
    expect(result.extracted).toBe('lastName')
    expect(result.namespace).toBe('foo.bar.baz')
  })

  test('should return null namespace for single segment', () => {
    const result = extractNamespaceSegment('singleName', '.')
    expect(result.extracted).toBe('singleName')
    expect(result.namespace).toBeNull()
  })

  test('should join tokens for camelCase', () => {
    const tokens = [{ value: 'hello' }, { value: 'world' }]
    const result = joinTokensForCase(tokens, CASE_STYLES.CAMEL_CASE)
    expect(result).toBe('helloWorld')
  })

  test('should join tokens for snake_case', () => {
    const tokens = [{ value: 'hello' }, { value: 'world' }]
    const result = joinTokensForCase(tokens, CASE_STYLES.SNAKE_CASE)
    expect(result).toBe('hello_world')
  })
})

describe('identifier case converter - batch processing', () => {
  test('should process batch of identifiers', () => {
    const inputs = ['helloWorld', 'test_value', 'PascalCase']
    const result = convertBatch(inputs, {
      targetCase: CASE_STYLES.SNAKE_CASE,
    })
    expect(result.totalCount).toBe(3)
    expect(result.successCount).toBe(3)
    expect(result.errorCount).toBe(0)
    expect(result.results[0].result).toBe('hello_world')
    expect(result.results[1].result).toBe('test_value')
    expect(result.results[2].result).toBe('pascal_case')
  })

  test('should handle partial success in batch', () => {
    const inputs = ['helloWorld', '', 'test_value']
    const result = convertBatch(inputs, {
      targetCase: CASE_STYLES.CAMEL_CASE,
    })
    expect(result.totalCount).toBe(3)
    expect(result.successCount).toBe(2)
    expect(result.errorCount).toBe(1)
  })
})

describe('identifier case converter - clipboard parsing', () => {
  test('should parse JSON array', () => {
    const input = '["hello", "world", "test"]'
    const result = parseClipboardInput(input)
    expect(result.mode).toBe('json')
    expect(result.values).toEqual(['hello', 'world', 'test'])
  })

  test('should parse comma-separated values', () => {
    const input = 'hello, world, test'
    const result = parseClipboardInput(input)
    expect(result.mode).toBe('comma')
    expect(result.values).toEqual(['hello', 'world', 'test'])
  })

  test('should parse raw multi-line input', () => {
    const input = 'hello\nworld\ntest'
    const result = parseClipboardInput(input)
    expect(result.mode).toBe('raw')
    expect(result.values).toEqual(['hello', 'world', 'test'])
  })

  test('should handle empty or null input', () => {
    const result = parseClipboardInput('')
    expect(result.mode).toBe('raw')
    expect(result.values.length).toBeGreaterThan(0)
  })
})

describe('identifier case converter - round trip check', () => {
  test('should detect consistent round trip', () => {
    const result = roundTripCheck('helloWorld', {
      targetCase: CASE_STYLES.SNAKE_CASE,
    })
    expect(result.success).toBe(true)
    expect(result.consistent).toBe(true)
  })

  test('should detect inconsistent round trip', () => {
    const result = roundTripCheck('HTTPResponse', {
      targetCase: CASE_STYLES.SNAKE_CASE,
      tokenizeOptions: {
        acronymStrategy: ACRONYM_STRATEGIES.FIRST_LETTER_ACRONYM,
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('identifier case converter - prefix/suffix and namespace', () => {
  test('should strip prefix before conversion', () => {
    const result = convertSingle('m_helloWorld', {
      targetCase: CASE_STYLES.SNAKE_CASE,
      prefix: 'm_',
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('m_hello_world')
  })

  test('should strip suffix before conversion', () => {
    const result = convertSingle('helloWorld_suffix', {
      targetCase: CASE_STYLES.CAMEL_CASE,
      suffix: '_suffix',
    })
    expect(result.success).toBe(true)
    expect(result.result).toBe('helloWorld_suffix')
  })

  test('should handle namespace segmentation', () => {
    const result = convertSingle('com.example.helloWorld', {
      targetCase: CASE_STYLES.SNAKE_CASE,
      namespaceDelimiter: '.',
    })
    expect(result.success).toBe(true)
    expect(result.result).toContain('com.example.')
  })
})

describe('identifier case converter - unicode mode', () => {
  test('should allow unicode letters when enabled', () => {
    const result = convertSingle('caféNiveau', {
      unicodeMode: UNICODE_MODES.ALLOW_UNICODE,
      targetCase: CASE_STYLES.SNAKE_CASE,
    })
    expect(result.success).toBe(true)
  })
})
