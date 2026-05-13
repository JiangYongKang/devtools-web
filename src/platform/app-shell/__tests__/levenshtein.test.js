import { describe, expect, test } from 'vitest'
import {
  levenshteinDistance,
  getSimilarity,
  findSuggestions,
  prefixMatch,
} from '../logic/levenshtein.js'

describe('levenshtein module', () => {
  describe('levenshteinDistance', () => {
    test('should return 0 for identical strings', () => {
      expect(levenshteinDistance('', '')).toBe(0)
      expect(levenshteinDistance('test', 'test')).toBe(0)
    })

    test('should return length for completely different strings', () => {
      expect(levenshteinDistance('', 'test')).toBe(4)
      expect(levenshteinDistance('test', '')).toBe(4)
    })

    test('should calculate edit distance correctly', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3)
      expect(levenshteinDistance('001', '002')).toBe(1)
      expect(levenshteinDistance('abc', 'axc')).toBe(1)
    })

    test('should handle null/undefined', () => {
      expect(levenshteinDistance(null, null)).toBe(0)
      expect(levenshteinDistance(null, 'test')).toBe(4)
      expect(levenshteinDistance('test', undefined)).toBe(4)
    })
  })

  describe('getSimilarity', () => {
    test('should return 1 for identical strings', () => {
      expect(getSimilarity('test', 'test')).toBe(1)
      expect(getSimilarity('', '')).toBe(1)
    })

    test('should return 0 for empty vs non-empty', () => {
      expect(getSimilarity('', 'test')).toBe(0)
      expect(getSimilarity('test', '')).toBe(0)
    })

    test('should calculate similarity correctly', () => {
      expect(getSimilarity('001', '001')).toBe(1)
      expect(getSimilarity('001', '002')).toBeCloseTo(0.666, 2)
      expect(getSimilarity('kitten', 'sitting')).toBeCloseTo(0.571, 2)
    })
  })

  describe('findSuggestions', () => {
    const availableIds = ['001', '002', '003', '010', '011', '020', '100', '101']

    test('should return empty array for empty target', () => {
      expect(findSuggestions('', availableIds)).toEqual([])
    })

    test('should return empty array for empty availableIds', () => {
      expect(findSuggestions('001', [])).toEqual([])
    })

    test('should find similar ids with prefix match', () => {
      const suggestions = findSuggestions('00', availableIds, { maxSuggestions: 10 })
      const ids = suggestions.map((s) => s.id)
      expect(ids).toContain('001')
      expect(ids).toContain('002')
      expect(ids).toContain('003')
    })

    test('should find similar ids with edit distance', () => {
      const suggestions = findSuggestions('01', availableIds, { maxSuggestions: 10 })
      const ids = suggestions.map((s) => s.id)
      expect(ids).toContain('010')
      expect(ids).toContain('011')
      expect(ids).toContain('001')
    })

    test('should respect maxSuggestions', () => {
      const suggestions = findSuggestions('0', availableIds, { maxSuggestions: 3 })
      expect(suggestions.length).toBeLessThanOrEqual(3)
    })

    test('should return sorted by similarity descending', () => {
      const suggestions = findSuggestions('001', availableIds, { maxSuggestions: 10 })
      expect(suggestions[0].id).toBe('001')
      expect(suggestions[0].similarity).toBe(1)
    })

    test('should include similarity score', () => {
      const suggestions = findSuggestions('001', ['001', '002'], { maxSuggestions: 2 })
      expect(suggestions[0].similarity).toBe(1)
      expect(suggestions[1].similarity).toBeGreaterThan(0)
      expect(suggestions[1].similarity).toBeLessThan(1)
    })
  })

  describe('prefixMatch', () => {
    const availableIds = ['001', '002', '003', '010', '011', '020', '100', '101']

    test('should return empty array for empty prefix', () => {
      expect(prefixMatch('', availableIds)).toEqual([])
    })

    test('should return ids matching prefix', () => {
      const result = prefixMatch('00', availableIds)
      expect(result).toContain('001')
      expect(result).toContain('002')
      expect(result).toContain('003')
      expect(result).not.toContain('010')
    })

    test('should be case insensitive', () => {
      const ids = ['ABC', 'abd', 'ADE']
      expect(prefixMatch('ab', ids)).toContain('ABC')
      expect(prefixMatch('ab', ids)).toContain('abd')
    })

    test('should return sorted array', () => {
      const result = prefixMatch('0', availableIds)
      const expected = ['001', '002', '003', '010', '011', '020']
      expect(result).toEqual(expected)
    })
  })
})
