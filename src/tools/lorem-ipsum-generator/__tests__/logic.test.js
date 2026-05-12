import { describe, expect, test } from 'vitest'
import { SeededRandom } from '../logic/generator.js'
import {
    buildParams,
    countCharacters,
    countWords,
    ERROR_CODES,
    generateLoremIpsum,
    GENERATION_MODES,
    getSuggestionForError,
    MAX_PARAGRAPHS,
    MAX_PRODUCT,
    MAX_TOTAL_WORDS,
    MAX_WORDS_PER_PARAGRAPH,
    MIN_PARAGRAPHS,
    MIN_TOTAL_WORDS,
    MIN_WORDS_PER_PARAGRAPH,
    PARAGRAPH_SEPARATION,
    SEED_MODES,
    validateParams,
} from '../logic/index.js'

describe('countWords', () => {
  test('should return 0 for empty string', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
    expect(countWords(null)).toBe(0)
    expect(countWords(undefined)).toBe(0)
  })

  test('should count single word', () => {
    expect(countWords('Hello')).toBe(1)
  })

  test('should count multiple words separated by single space', () => {
    expect(countWords('Hello World')).toBe(2)
    expect(countWords('Lorem ipsum dolor')).toBe(3)
  })

  test('should handle multiple spaces between words', () => {
    expect(countWords('Hello   World')).toBe(2)
    expect(countWords('Lorem   ipsum   dolor')).toBe(3)
  })

  test('should trim leading and trailing spaces', () => {
    expect(countWords('   Hello World   ')).toBe(2)
  })

  test('should handle newlines and tabs', () => {
    expect(countWords('Hello\nWorld')).toBe(2)
    expect(countWords('Hello\tWorld')).toBe(2)
  })
})

describe('countCharacters', () => {
  test('should return 0 for empty string', () => {
    expect(countCharacters('')).toBe(0)
    expect(countCharacters('', true)).toBe(0)
  })

  test('should exclude spaces by default', () => {
    expect(countCharacters('Hello World')).toBe(10)
    expect(countCharacters('H e l l o')).toBe(5)
  })

  test('should include spaces when specified', () => {
    expect(countCharacters('Hello World', true)).toBe(11)
    expect(countCharacters('H e l l o', true)).toBe(9)
  })

  test('should handle special characters and punctuation', () => {
    expect(countCharacters('Hello, World!')).toBe(12)
    expect(countCharacters('Hello, World!', true)).toBe(13)
  })

  test('should handle newlines and tabs', () => {
    expect(countCharacters('Hello\nWorld', false)).toBe(10)
    expect(countCharacters('Hello\nWorld', true)).toBe(11)
  })
})

describe('SeededRandom', () => {
  test('should produce same sequence for same seed', () => {
    const rng1 = new SeededRandom(42)
    const rng2 = new SeededRandom(42)

    const seq1 = []
    const seq2 = []

    for (let i = 0; i < 10; i++) {
      seq1.push(rng1.nextInt(0, 100))
      seq2.push(rng2.nextInt(0, 100))
    }

    expect(seq1).toEqual(seq2)
  })

  test('should produce different sequences for different seeds', () => {
    const rng1 = new SeededRandom(42)
    const rng2 = new SeededRandom(123)

    const seq1 = []
    const seq2 = []

    for (let i = 0; i < 10; i++) {
      seq1.push(rng1.nextInt(0, 100))
      seq2.push(rng2.nextInt(0, 100))
    }

    expect(seq1).not.toEqual(seq2)
  })

  test('should respect min and max bounds', () => {
    const rng = new SeededRandom(42)
    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(5, 15)
      expect(value).toBeGreaterThanOrEqual(5)
      expect(value).toBeLessThanOrEqual(15)
    }
  })

  test('should pick from array deterministically', () => {
    const arr = ['a', 'b', 'c', 'd', 'e']
    const rng1 = new SeededRandom(999)
    const rng2 = new SeededRandom(999)

    const picks1 = []
    const picks2 = []

    for (let i = 0; i < 5; i++) {
      picks1.push(rng1.pickFromArray(arr))
      picks2.push(rng2.pickFromArray(arr))
    }

    expect(picks1).toEqual(picks2)
  })
})

describe('buildParams', () => {
  test('should use defaults when params are missing', () => {
    const result = buildParams({})
    expect(result.mode).toBe(GENERATION_MODES.BY_PARAGRAPHS)
    expect(result.paragraphCount).toBe(3)
    expect(result.wordsPerParagraph).toBe(50)
    expect(result.totalWords).toBe(200)
    expect(result.includeTitle).toBe(false)
    expect(result.paragraphSeparation).toBe(PARAGRAPH_SEPARATION.DOUBLE_NEWLINE)
    expect(result.seedMode).toBe(SEED_MODES.RANDOM)
    expect(result.seed).toBe(42)
  })

  test('should use provided params', () => {
    const result = buildParams({
      mode: GENERATION_MODES.BY_WORD_COUNT,
      paragraphCount: 10,
      wordsPerParagraph: 100,
      totalWords: 500,
      includeTitle: true,
      paragraphSeparation: PARAGRAPH_SEPARATION.HTML_PARAGRAPH,
      seedMode: SEED_MODES.FIXED,
      seed: 12345,
    })
    expect(result.mode).toBe(GENERATION_MODES.BY_WORD_COUNT)
    expect(result.paragraphCount).toBe(10)
    expect(result.wordsPerParagraph).toBe(100)
    expect(result.totalWords).toBe(500)
    expect(result.includeTitle).toBe(true)
    expect(result.paragraphSeparation).toBe(PARAGRAPH_SEPARATION.HTML_PARAGRAPH)
    expect(result.seedMode).toBe(SEED_MODES.FIXED)
    expect(result.seed).toBe(12345)
  })
})

describe('validateParams', () => {
  test('should return no errors for valid by-paragraph params', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 5,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 42,
    })
    expect(errors).toHaveLength(0)
  })

  test('should return no errors for valid by-word-count params', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_WORD_COUNT,
      totalWords: 1000,
      paragraphSeparation: PARAGRAPH_SEPARATION.SINGLE_NEWLINE,
      seedMode: SEED_MODES.RANDOM,
    })
    expect(errors).toHaveLength(0)
  })

  test('should return error for invalid generation mode', () => {
    const errors = validateParams({
      mode: 'invalid-mode',
      paragraphCount: 5,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.INVALID_GENERATION_MODE)).toBe(true)
  })

  test('should return error for invalid paragraph separation', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 5,
      wordsPerParagraph: 100,
      paragraphSeparation: 'invalid-sep',
    })
    expect(errors.some(e => e.code === ERROR_CODES.INVALID_SEPARATION_MODE)).toBe(true)
  })

  test('should return error for paragraph count below min', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: MIN_PARAGRAPHS - 1,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.PARAGRAPH_COUNT_OUT_OF_RANGE)).toBe(true)
  })

  test('should return error for paragraph count above max', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: MAX_PARAGRAPHS + 1,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.PARAGRAPH_COUNT_OUT_OF_RANGE)).toBe(true)
  })

  test('should return error for words per paragraph below min', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 5,
      wordsPerParagraph: MIN_WORDS_PER_PARAGRAPH - 1,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.WORDS_PER_PARAGRAPH_OUT_OF_RANGE)).toBe(true)
  })

  test('should return error for words per paragraph above max', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 5,
      wordsPerParagraph: MAX_WORDS_PER_PARAGRAPH + 1,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.WORDS_PER_PARAGRAPH_OUT_OF_RANGE)).toBe(true)
  })

  test('should return error for total words below min', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_WORD_COUNT,
      totalWords: MIN_TOTAL_WORDS - 1,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.TOTAL_WORDS_OUT_OF_RANGE)).toBe(true)
  })

  test('should return error for total words above max', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_WORD_COUNT,
      totalWords: MAX_TOTAL_WORDS + 1,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.TOTAL_WORDS_OUT_OF_RANGE)).toBe(true)
  })

  test('should return PRODUCT_EXCEEDS_LIMIT error', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 200,
      wordsPerParagraph: 1000,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.PRODUCT_EXCEEDS_LIMIT)).toBe(true)
  })

  test('should not return PRODUCT_EXCEEDS_LIMIT for valid product', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 50,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })
    expect(errors.some(e => e.code === ERROR_CODES.PRODUCT_EXCEEDS_LIMIT)).toBe(false)
  })

  test('should return error for invalid seed', () => {
    const errors = validateParams({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 5,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 'invalid',
    })
    expect(errors.some(e => e.code === ERROR_CODES.INVALID_SEED)).toBe(true)
  })
})

describe('generateLoremIpsum seed reproducibility', () => {
  test('should produce identical output for same fixed seed (by-paragraphs)', () => {
    const params = {
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 3,
      wordsPerParagraph: 20,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 12345,
    }

    const result1 = generateLoremIpsum(params)
    const result2 = generateLoremIpsum(params)

    expect(result1.errorCode).toBeNull()
    expect(result2.errorCode).toBeNull()
    expect(result1.result.text).toBe(result2.result.text)
  })

  test('should produce identical output for same fixed seed (by-word-count)', () => {
    const params = {
      mode: GENERATION_MODES.BY_WORD_COUNT,
      totalWords: 200,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 999,
    }

    const result1 = generateLoremIpsum(params)
    const result2 = generateLoremIpsum(params)

    expect(result1.errorCode).toBeNull()
    expect(result2.errorCode).toBeNull()
    expect(result1.result.text).toBe(result2.result.text)
  })

  test('should produce different output for different fixed seeds', () => {
    const baseParams = {
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 3,
      wordsPerParagraph: 20,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
    }

    const result1 = generateLoremIpsum({ ...baseParams, seed: 1 })
    const result2 = generateLoremIpsum({ ...baseParams, seed: 2 })

    expect(result1.errorCode).toBeNull()
    expect(result2.errorCode).toBeNull()
    expect(result1.result.text).not.toBe(result2.result.text)
  })

  test('should include title when includeTitle is true', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 1,
      wordsPerParagraph: 10,
      includeTitle: true,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 42,
    })

    expect(result.errorCode).toBeNull()
    expect(result.result.title).toBeTruthy()
    expect(result.result.text).toContain(result.result.title)
  })
})

describe('generateLoremIpsum paragraph separation modes', () => {
  test('should use single newline for SINGLE_NEWLINE mode', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 3,
      wordsPerParagraph: 10,
      paragraphSeparation: PARAGRAPH_SEPARATION.SINGLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 42,
    })

    expect(result.errorCode).toBeNull()
    const lines = result.result.text.split('\n')
    const emptyLineCount = lines.filter(l => l.trim() === '').length
    expect(emptyLineCount).toBe(0)
  })

  test('should use double newline for DOUBLE_NEWLINE mode', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 3,
      wordsPerParagraph: 10,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 42,
    })

    expect(result.errorCode).toBeNull()
    expect(result.result.text).toContain('\n\n')
  })

  test('should use HTML p tags for HTML_PARAGRAPH mode', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 3,
      wordsPerParagraph: 10,
      paragraphSeparation: PARAGRAPH_SEPARATION.HTML_PARAGRAPH,
      seedMode: SEED_MODES.FIXED,
      seed: 42,
    })

    expect(result.errorCode).toBeNull()
    expect(result.result.text).toContain('<p>')
    expect(result.result.text).toContain('</p>')
    expect((result.result.text.match(/<p>/g) || []).length).toBe(3)
  })

  test('should use HTML h1 for title in HTML mode', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 1,
      wordsPerParagraph: 10,
      includeTitle: true,
      paragraphSeparation: PARAGRAPH_SEPARATION.HTML_PARAGRAPH,
      seedMode: SEED_MODES.FIXED,
      seed: 42,
    })

    expect(result.errorCode).toBeNull()
    expect(result.result.text).toContain('<h1>')
    expect(result.result.text).toContain('</h1>')
  })
})

describe('generateLoremIpsum word count accuracy', () => {
  test('should generate approximately correct word count for by-paragraphs mode', () => {
    const paragraphCount = 5
    const wordsPerParagraph = 30

    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount,
      wordsPerParagraph,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 123,
    })

    expect(result.errorCode).toBeNull()
    expect(result.result.wordStats.totalWords).toBeGreaterThanOrEqual(paragraphCount)
  })

  test('should generate approximately correct word count for by-word-count mode', () => {
    const totalWords = 500

    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_WORD_COUNT,
      totalWords,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 456,
    })

    expect(result.errorCode).toBeNull()
    const generatedCount = countWords(result.result.text)
    expect(generatedCount).toBeGreaterThanOrEqual(Math.floor(totalWords * 0.9))
    expect(generatedCount).toBeLessThanOrEqual(Math.ceil(totalWords * 1.1))
  })

  test('should include title word count in total', () => {
    const totalWords = 100

    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_WORD_COUNT,
      totalWords,
      includeTitle: true,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 789,
    })

    expect(result.errorCode).toBeNull()
    const titleWordCount = countWords(result.result.title)
    expect(titleWordCount).toBeGreaterThanOrEqual(2)
  })
})

describe('generateLoremIpsum error handling', () => {
  test('should return error code for invalid params', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 0,
      wordsPerParagraph: 50,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })

    expect(result.errorCode).toBe(ERROR_CODES.PARAGRAPH_COUNT_OUT_OF_RANGE)
    expect(result.result).toBeNull()
    expect(result.error).toBeDefined()
  })

  test('should return PRODUCT_EXCEEDS_LIMIT error', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 200,
      wordsPerParagraph: 300,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })

    expect(result.errorCode).toBe(ERROR_CODES.PRODUCT_EXCEEDS_LIMIT)
    expect(result.result).toBeNull()
  })

  test('should not generate anything when params are invalid', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_WORD_COUNT,
      totalWords: -1,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    })

    expect(result.errorCode).toBe(ERROR_CODES.TOTAL_WORDS_OUT_OF_RANGE)
    expect(result.result).toBeNull()
  })
})

describe('getSuggestionForError', () => {
  test('should return suggestion for PRODUCT_EXCEEDS_LIMIT', () => {
    const suggestion = getSuggestionForError(ERROR_CODES.PRODUCT_EXCEEDS_LIMIT, {
      paragraphCount: 100,
      wordsPerParagraph: 1000,
    })

    expect(suggestion).toBeDefined()
    expect(suggestion.maxProduct).toBe(MAX_PRODUCT)
    expect(suggestion.reduceParagraphs).toBeLessThan(100)
  })

  test('should return range for PARAGRAPH_COUNT_OUT_OF_RANGE', () => {
    const suggestion = getSuggestionForError(ERROR_CODES.PARAGRAPH_COUNT_OUT_OF_RANGE, {})
    expect(suggestion).toBeDefined()
    expect(suggestion.min).toBe(MIN_PARAGRAPHS)
    expect(suggestion.max).toBe(MAX_PARAGRAPHS)
  })

  test('should return range for WORDS_PER_PARAGRAPH_OUT_OF_RANGE', () => {
    const suggestion = getSuggestionForError(ERROR_CODES.WORDS_PER_PARAGRAPH_OUT_OF_RANGE, {})
    expect(suggestion).toBeDefined()
    expect(suggestion.min).toBe(MIN_WORDS_PER_PARAGRAPH)
    expect(suggestion.max).toBe(MAX_WORDS_PER_PARAGRAPH)
  })

  test('should return range for TOTAL_WORDS_OUT_OF_RANGE', () => {
    const suggestion = getSuggestionForError(ERROR_CODES.TOTAL_WORDS_OUT_OF_RANGE, {})
    expect(suggestion).toBeDefined()
    expect(suggestion.min).toBe(MIN_TOTAL_WORDS)
    expect(suggestion.max).toBe(MAX_TOTAL_WORDS)
  })

  test('should return null for unknown error code', () => {
    const suggestion = getSuggestionForError('UNKNOWN_ERROR', {})
    expect(suggestion).toBeNull()
  })
})

describe('generateLoremIpsum output safety', () => {
  test('should not contain external links', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 5,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 42,
    })

    expect(result.errorCode).toBeNull()
    expect(result.result.text).not.toMatch(/https?:\/\//i)
    expect(result.result.text).not.toMatch(/www\./i)
  })

  test('should not contain script tags', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 5,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
      seedMode: SEED_MODES.FIXED,
      seed: 100,
    })

    expect(result.errorCode).toBeNull()
    expect(result.result.text).not.toMatch(/<script/i)
    expect(result.result.text).not.toMatch(/javascript:/i)
  })

  test('should not contain on* event handlers', () => {
    const result = generateLoremIpsum({
      mode: GENERATION_MODES.BY_PARAGRAPHS,
      paragraphCount: 5,
      wordsPerParagraph: 100,
      paragraphSeparation: PARAGRAPH_SEPARATION.HTML_PARAGRAPH,
      seedMode: SEED_MODES.FIXED,
      seed: 200,
    })

    expect(result.errorCode).toBeNull()
    expect(result.result.text).not.toMatch(/on\w+=/i)
  })
})
