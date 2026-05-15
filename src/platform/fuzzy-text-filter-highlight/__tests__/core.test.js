import { describe, it, expect } from 'vitest'
import {
  levenshteinDistance,
  normalizeText,
  generateNgrams,
  tokenize,
  mergeRanges,
  findMatchRanges,
  calculateFuzzyScore,
  buildFuzzyIndex,
  searchFuzzy,
  STOPWORDS_DEFAULT,
  MAX_INDEX_ENTRIES,
  ERROR_CODES,
} from '../logic/index.js'

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('test', 'test')).toBe(0)
    expect(levenshteinDistance('', '')).toBe(0)
  })

  it('should return correct distance for single edit', () => {
    expect(levenshteinDistance('test', 'tes')).toBe(1)
    expect(levenshteinDistance('test', 'test1')).toBe(1)
    expect(levenshteinDistance('test', 'tesx')).toBe(1)
  })

  it('should respect maxDistance threshold', () => {
    expect(levenshteinDistance('abc', 'def', 2)).toBeGreaterThan(2)
  })

  it('should handle empty strings', () => {
    expect(levenshteinDistance('', 'test')).toBe(4)
    expect(levenshteinDistance('test', '')).toBe(4)
  })
})

describe('normalizeText', () => {
  it('should trim whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello')
  })

  it('should lowercase by default', () => {
    expect(normalizeText('HELLO World')).toBe('hello world')
  })

  it('should preserve case when caseFold is false', () => {
    expect(normalizeText('HELLO', { caseFold: false })).toBe('HELLO')
  })
})

describe('generateNgrams', () => {
  it('should generate bigrams by default', () => {
    const ngrams = generateNgrams('hello')
    expect(ngrams).toEqual(['he', 'el', 'll', 'lo'])
  })

  it('should handle short strings', () => {
    const ngrams = generateNgrams('hi')
    expect(ngrams).toEqual(['hi'])
  })

  it('should return whole string for shorter than n', () => {
    const ngrams = generateNgrams('a')
    expect(ngrams).toEqual(['a'])
  })
})

describe('tokenize', () => {
  it('should split on common separators', () => {
    const tokens = tokenize('hello, world! how are you?')
    expect(tokens).toContain('hello')
    expect(tokens).toContain('world')
  })

  it('should remove stopwords when enabled', () => {
    const tokens = tokenize('the quick brown fox', { removeStopwords: true })
    expect(tokens).not.toContain('the')
  })

  it('should include stopwords by default', () => {
    const tokens = tokenize('the quick brown fox')
    expect(tokens).toContain('the')
  })
})

describe('mergeRanges', () => {
  it('should merge overlapping ranges', () => {
    const ranges = [
      { start: 0, end: 5 },
      { start: 3, end: 8 },
    ]
    const merged = mergeRanges(ranges)
    expect(merged).toEqual([{ start: 0, end: 8 }])
  })

  it('should keep non-overlapping ranges separate', () => {
    const ranges = [
      { start: 0, end: 2 },
      { start: 5, end: 8 },
    ]
    const merged = mergeRanges(ranges)
    expect(merged).toHaveLength(2)
  })

  it('should handle empty input', () => {
    expect(mergeRanges([])).toEqual([])
    expect(mergeRanges(null)).toEqual([])
  })

  it('should sort before merging', () => {
    const ranges = [
      { start: 5, end: 8 },
      { start: 0, end: 2 },
    ]
    const merged = mergeRanges(ranges)
    expect(merged[0].start).toBe(0)
  })
})

describe('findMatchRanges', () => {
  it('should find exact matches', () => {
    const ranges = findMatchRanges('hello world', 'world')
    expect(ranges).toEqual([{ start: 6, end: 11 }])
  })

  it('should find multiple matches', () => {
    const ranges = findMatchRanges('hello hello hello', 'hello')
    expect(ranges).toHaveLength(3)
  })

  it('should return empty for no match', () => {
    const ranges = findMatchRanges('hello', 'world')
    expect(ranges).toEqual([])
  })
})

describe('calculateFuzzyScore', () => {
  it('should return 1 for exact match', () => {
    const result = calculateFuzzyScore('test', 'test')
    expect(result.score).toBe(1)
  })

  it('should return higher score for prefix match', () => {
    const result1 = calculateFuzzyScore('testing', 'test', { prefixBonus: true })
    const result2 = calculateFuzzyScore('xtesting', 'test', { prefixBonus: false })
    expect(result1.score).toBeGreaterThan(result2.score)
  })

  it('should include match ranges', () => {
    const result = calculateFuzzyScore('hello world', 'world')
    expect(result.ranges).toBeDefined()
    expect(result.ranges.length).toBeGreaterThan(0)
  })

  it('should handle empty query', () => {
    const result = calculateFuzzyScore('test', '')
    expect(result.score).toBe(1)
  })
})

describe('buildFuzzyIndex', () => {
  const corpus = [
    { id: '1', text: 'React Hooks', tags: ['React', 'Hooks'] },
    { id: '2', text: 'Vue Composition', tags: ['Vue'] },
    { id: '3', text: 'Angular Services', tags: ['Angular'] },
  ]

  it('should build index from corpus', () => {
    const index = buildFuzzyIndex(corpus)
    expect(index.items).toHaveLength(3)
    expect(index.ngramIndex).toBeDefined()
    expect(index.meta.totalItems).toBe(3)
  })

  it('should work with string array', () => {
    const stringCorpus = ['React', 'Vue', 'Angular']
    const index = buildFuzzyIndex(stringCorpus)
    expect(index.items).toHaveLength(3)
  })

  it('should throw error for oversized corpus', () => {
    const largeCorpus = Array(MAX_INDEX_ENTRIES + 100).fill(null).map((_, i) => ({
      id: String(i),
      text: `item ${i}`,
    }))
    expect(() => buildFuzzyIndex(largeCorpus)).toThrow()
  })

  it('should accept custom maxIndexEntries', () => {
    const largeCorpus = Array(2000).fill(null).map((_, i) => ({
      id: String(i),
      text: `item ${i}`,
    }))
    expect(() => buildFuzzyIndex(largeCorpus, { maxIndexEntries: 3000 })).not.toThrow()
  })
})

describe('searchFuzzy', () => {
  const corpus = [
    { id: '1', text: 'React Hooks 深度解析', tags: ['React', 'JavaScript'] },
    { id: '2', text: 'Vue 3 Composition API', tags: ['Vue', 'JavaScript'] },
    { id: '3', text: 'Angular 信号系统', tags: ['Angular', 'TypeScript'] },
    { id: '4', text: 'Node.js 性能优化', tags: ['Node.js', '性能'] },
    { id: '5', text: 'TypeScript 类型体操', tags: ['TypeScript'] },
  ]

  const index = buildFuzzyIndex(corpus)

  it('should return all items for empty query', () => {
    const results = searchFuzzy(index, '')
    expect(results).toHaveLength(5)
  })

  it('should find exact matches', () => {
    const results = searchFuzzy(index, 'React')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].text).toContain('React')
  })

  it('should find fuzzy matches with typos', () => {
    const results = searchFuzzy(index, 'Reat')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].text).toContain('React')
  })

  it('should sort by score then alphabetically', () => {
    const results = searchFuzzy(index, 'Script')
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
  })

  it('should respect limit option', () => {
    const results = searchFuzzy(index, '', { limit: 2 })
    expect(results).toHaveLength(2)
  })

  it('should support onlyFilter mode without highlights', () => {
    const results = searchFuzzy(index, 'React', { onlyFilter: true })
    expect(results[0].highlightRanges).toEqual([])
  })

  it('should match tags as well as text', () => {
    const results = searchFuzzy(index, 'TypeScript')
    const hasMatch = results.some((r) => r.tags.includes('TypeScript'))
    expect(hasMatch).toBe(true)
  })
})

describe('stopwords filtering', () => {
  it('should include default stopwords list', () => {
    expect(STOPWORDS_DEFAULT).toContain('the')
    expect(STOPWORDS_DEFAULT).toContain('的')
    expect(STOPWORDS_DEFAULT.length).toBeGreaterThan(0)
  })

  it('should apply stopword filtering during tokenization', () => {
    const tokens = tokenize('the quick brown fox jumps over the lazy dog', {
      removeStopwords: true,
    })
    expect(tokens).not.toContain('the')
    expect(tokens).toContain('quick')
  })
})
