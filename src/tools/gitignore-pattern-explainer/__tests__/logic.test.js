import { describe, it, expect } from 'vitest'
import {
  MAX_PATTERNS,
  MAX_PATTERN_LENGTH,
  ERROR_CODES,
} from '../logic/constants.js'
import { validateInput } from '../logic/errors.js'
import {
  parseCharClass,
  tokenizePattern,
  analyzePattern,
  parseInput,
} from '../logic/parser.js'
import {
  generateTokenExplanation,
  generatePatternExplanation,
  generateAllExplanations,
} from '../logic/explanation.js'
import {
  matchSinglePattern,
  matchPatterns,
} from '../logic/matcher.js'
import { processGitignorePatterns } from '../logic/index.js'

describe('validateInput', () => {
  it('should reject null and undefined', () => {
    expect(validateInput(null).valid).toBe(false)
    expect(validateInput(null).errorCode).toBe(ERROR_CODES.NULL_INPUT)
    expect(validateInput(undefined).valid).toBe(false)
  })

  it('should reject empty strings', () => {
    expect(validateInput('').valid).toBe(false)
    expect(validateInput('').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
    expect(validateInput('   ').valid).toBe(false)
    expect(validateInput('   ').errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  it('should reject all comments', () => {
    const result = validateInput('# comment 1\n# comment 2\n   ')
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.ALL_COMMENTS)
  })

  it('should reject too many lines', () => {
    const manyLines = Array(MAX_PATTERNS + 1).fill('*.log').join('\n')
    const result = validateInput(manyLines, MAX_PATTERNS)
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.TOO_MANY_LINES)
  })

  it('should reject too long line', () => {
    const longLine = 'a'.repeat(MAX_PATTERN_LENGTH + 1)
    const result = validateInput(longLine, MAX_PATTERNS, MAX_PATTERN_LENGTH)
    expect(result.valid).toBe(false)
    expect(result.errorCode).toBe(ERROR_CODES.LINE_TOO_LONG)
  })

  it('should accept valid input', () => {
    expect(validateInput('*.log').valid).toBe(true)
    expect(validateInput('*.log\nnode_modules/').valid).toBe(true)
    expect(validateInput('# comment\n*.log').valid).toBe(true)
  })
})

describe('parseCharClass', () => {
  it('should parse simple char class', () => {
    const result = parseCharClass('[abc]', 0)
    expect(result.chars).toContain('a')
    expect(result.chars).toContain('b')
    expect(result.chars).toContain('c')
    expect(result.negated).toBe(false)
    expect(result.isComplete).toBe(true)
  })

  it('should parse char class with range', () => {
    const result = parseCharClass('[a-z]', 0)
    expect(result.ranges.length).toBe(1)
    expect(result.ranges[0].start).toBe('a')
    expect(result.ranges[0].end).toBe('z')
    expect(result.isComplete).toBe(true)
  })

  it('should parse negated char class', () => {
    const result1 = parseCharClass('[!abc]', 0)
    expect(result1.negated).toBe(true)

    const result2 = parseCharClass('[^abc]', 0)
    expect(result2.negated).toBe(true)
  })

  it('should detect incomplete char class', () => {
    const result = parseCharClass('[abc', 0)
    expect(result.isComplete).toBe(false)
  })
})

describe('tokenizePattern', () => {
  it('should tokenize double asterisk', () => {
    const tokens = tokenizePattern('**')
    expect(tokens.some(t => t.type === 'double_asterisk')).toBe(true)
  })

  it('should tokenize single asterisk', () => {
    const tokens = tokenizePattern('*')
    expect(tokens.some(t => t.type === 'asterisk')).toBe(true)
  })

  it('should tokenize question mark', () => {
    const tokens = tokenizePattern('?')
    expect(tokens.some(t => t.type === 'question_mark')).toBe(true)
  })

  it('should tokenize char class', () => {
    const tokens = tokenizePattern('[abc]')
    expect(tokens.some(t => t.type === 'char_class')).toBe(true)
  })

  it('should tokenize leading slash', () => {
    const tokens = tokenizePattern('/build')
    expect(tokens[0].type).toBe('leading_slash')
  })

  it('should tokenize trailing slash', () => {
    const tokens = tokenizePattern('dist/')
    expect(tokens[tokens.length - 1].type).toBe('trailing_slash')
  })

  it('should tokenize literals', () => {
    const tokens = tokenizePattern('file.txt')
    const literals = tokens.filter(t => t.type === 'literal')
    expect(literals.length).toBeGreaterThan(0)
  })
})

describe('analyzePattern', () => {
  it('should recognize empty lines', () => {
    const result = analyzePattern('  ', 1)
    expect(result.isEmpty).toBe(true)
    expect(result.isComment).toBe(false)
  })

  it('should recognize comments', () => {
    const result = analyzePattern('# this is a comment', 1)
    expect(result.isComment).toBe(true)
    expect(result.comment).toBe('# this is a comment')
  })

  it('should recognize negation', () => {
    const result = analyzePattern('!important.log', 1)
    expect(result.isNegative).toBe(true)
    expect(result.effectivePattern).toBe('important.log')
  })

  it('should recognize directory-only patterns', () => {
    const result = analyzePattern('node_modules/', 1)
    expect(result.isDirectoryOnly).toBe(true)
  })

  it('should recognize anchored patterns', () => {
    const result = analyzePattern('/README.md', 1)
    expect(result.isAnchored).toBe(true)
  })

  it('should extract features', () => {
    const result = analyzePattern('**/*.log', 1)
    expect(result.features.some(f => f.type === 'double_asterisk')).toBe(true)
    expect(result.features.some(f => f.type === 'asterisk')).toBe(true)
  })

  it('should warn about unsupported backslash', () => {
    const result = analyzePattern('file\\.txt', 1)
    expect(result.warnings.some(w => w.type === 'unsupported')).toBe(true)
  })

  it('should warn about unsupported brace expansion', () => {
    const result = analyzePattern('*.{js,ts}', 1)
    expect(result.warnings.some(w => w.type === 'unsupported')).toBe(true)
  })
})

describe('parseInput', () => {
  it('should parse multiple lines', () => {
    const input = '*.log\n# comment\nnode_modules/'
    const results = parseInput(input)
    expect(results.length).toBe(3)
    expect(results[1].isComment).toBe(true)
  })
})

describe('generatePatternExplanation', () => {
  it('should explain empty line', () => {
    const parsed = analyzePattern('  ', 1)
    const explanation = generatePatternExplanation(parsed)
    expect(explanation.type).toBe('empty')
    expect(explanation.summary).toBe('空行')
  })

  it('should explain comment', () => {
    const parsed = analyzePattern('# test comment', 1)
    const explanation = generatePatternExplanation(parsed)
    expect(explanation.type).toBe('comment')
    expect(explanation.summary).toBe('注释')
  })

  it('should explain negation pattern', () => {
    const parsed = analyzePattern('!important.log', 1)
    const explanation = generatePatternExplanation(parsed)
    expect(explanation.type).toBe('negation')
    expect(explanation.summary).toContain('否定')
  })

  it('should explain directory pattern', () => {
    const parsed = analyzePattern('node_modules/', 1)
    const explanation = generatePatternExplanation(parsed)
    expect(explanation.type).toBe('directory')
  })

  it('should generate segments with explanations', () => {
    const parsed = analyzePattern('*.log', 1)
    const explanation = generatePatternExplanation(parsed)
    expect(explanation.segments.length).toBeGreaterThan(0)
  })
})

describe('generateAllExplanations', () => {
  it('should aggregate summary stats', () => {
    const parsedPatterns = [
      analyzePattern('*.log', 1),
      analyzePattern('# comment', 2),
      analyzePattern('  ', 3),
      analyzePattern('node_modules/', 4),
      analyzePattern('!important.log', 5),
    ]
    const result = generateAllExplanations(parsedPatterns)
    expect(result.summary.validPatterns).toBe(3)
    expect(result.summary.commentLines).toBe(1)
    expect(result.summary.emptyLines).toBe(1)
    expect(result.summary.negationPatterns).toBe(1)
    expect(result.summary.directoryPatterns).toBe(1)
  })
})

describe('matchSinglePattern - basic patterns', () => {
  it('should match asterisk wildcard', () => {
    const parsed = analyzePattern('*.log', 1)
    expect(matchSinglePattern(parsed, 'error.log').matched).toBe(true)
    expect(matchSinglePattern(parsed, 'log.txt').matched).toBe(false)
  })

  it('should match question mark', () => {
    const parsed = analyzePattern('file?.txt', 1)
    expect(matchSinglePattern(parsed, 'file1.txt').matched).toBe(true)
    expect(matchSinglePattern(parsed, 'file.txt').matched).toBe(false)
  })

  it('should match char class', () => {
    const parsed = analyzePattern('file[0-9].txt', 1)
    expect(matchSinglePattern(parsed, 'file5.txt').matched).toBe(true)
    expect(matchSinglePattern(parsed, 'fileA.txt').matched).toBe(false)
  })

  it('should match double asterisk', () => {
    const parsed = analyzePattern('**/*.log', 1)
    expect(matchSinglePattern(parsed, 'logs/error.log').matched).toBe(true)
    expect(matchSinglePattern(parsed, 'a/b/c/debug.log').matched).toBe(true)
  })
})

describe('matchSinglePattern - negation and directory', () => {
  it('should flag negation patterns', () => {
    const parsed = analyzePattern('!important.log', 1)
    const result = matchSinglePattern(parsed, 'important.log')
    expect(result.isNegative).toBe(true)
  })

  it('should handle directory-only patterns', () => {
    const parsed = analyzePattern('node_modules/', 1)
    expect(matchSinglePattern(parsed, 'node_modules/lodash/index.js').matched).toBe(true)
  })
})

describe('matchPatterns - integration', () => {
  it('should apply patterns in order with negation', () => {
    const parsedPatterns = parseInput('*.log\n!important.log')
    const result1 = matchPatterns(parsedPatterns, 'error.log')
    expect(result1.shouldIgnore).toBe(true)

    const result2 = matchPatterns(parsedPatterns, 'important.log')
    expect(result2.shouldIgnore).toBe(false)
  })
})

describe('processGitignorePatterns - integration', () => {
  it('should handle null input', () => {
    const result = processGitignorePatterns({ rawText: null })
    expect(result.errorCode).toBe(ERROR_CODES.NULL_INPUT)
  })

  it('should handle empty input', () => {
    const result = processGitignorePatterns({ rawText: '' })
    expect(result.errorCode).toBe(ERROR_CODES.EMPTY_INPUT)
  })

  it('should handle all comments', () => {
    const result = processGitignorePatterns({ rawText: '# comment 1\n# comment 2' })
    expect(result.errorCode).toBe(ERROR_CODES.ALL_COMMENTS)
  })

  it('should process valid patterns', () => {
    const result = processGitignorePatterns({
      rawText: '*.log\nnode_modules/\n!important.log',
      enableMatching: true,
    })

    expect(result.errorCode).toBeNull()
    expect(result.explanations.length).toBe(3)
    expect(result.summary.validPatterns).toBe(3)
    expect(result.matchingResults.length).toBeGreaterThan(0)
  })

  it('should work without matching', () => {
    const result = processGitignorePatterns({
      rawText: '*.log',
      enableMatching: false,
    })

    expect(result.errorCode).toBeNull()
    expect(result.matchingResults.length).toBe(0)
  })

  it('should detect unsupported syntax warnings', () => {
    const result = processGitignorePatterns({
      rawText: 'file\\.txt\n*.{js,ts}',
      enableMatching: false,
    })

    expect(result.errorCode).toBeNull()
    expect(result.summary.hasUnsupported).toBe(true)
  })
})
