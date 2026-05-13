import { describe, test, expect } from 'vitest'
import {
  SMALL_EXAMPLE_TEXT,
  MEDIUM_EXAMPLE_TEXT,
  generateLargeExampleText,
  getExampleBySize,
  getValidationErrorExample,
  getAllExamples,
  getValidationErrorExampleMetadata,
} from '../logic/examples.js'
import { EXAMPLE_SIZES } from '../logic/constants.js'
import { ERROR_CODES } from '../logic/errors.js'

describe('examples.js', () => {
  describe('small example', () => {
    test('should be non-empty string', () => {
      expect(typeof SMALL_EXAMPLE_TEXT).toBe('string')
      expect(SMALL_EXAMPLE_TEXT.length).toBeGreaterThan(0)
    })

    test('should contain valid JSON structure', () => {
      const parsed = JSON.parse(SMALL_EXAMPLE_TEXT)
      expect(parsed.name).toBeDefined()
      expect(parsed.age).toBeDefined()
      expect(parsed.email).toBeDefined()
    })
  })

  describe('medium example', () => {
    test('should be larger than small example', () => {
      expect(MEDIUM_EXAMPLE_TEXT.length).toBeGreaterThan(SMALL_EXAMPLE_TEXT.length)
    })

    test('should be valid JSON array', () => {
      const parsed = JSON.parse(MEDIUM_EXAMPLE_TEXT)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(3)
    })
  })

  describe('generateLargeExampleText', () => {
    test('should generate text of approximate size', () => {
      const targetSize = 1000
      const result = generateLargeExampleText(targetSize)
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThanOrEqual(targetSize * 0.8)
      expect(result.length).toBeLessThanOrEqual(targetSize * 1.5)
    })

    test('should be valid JSON', () => {
      const result = generateLargeExampleText(500)
      expect(() => JSON.parse(result)).not.toThrow()
    })

    test('should use default size when not specified', () => {
      const result = generateLargeExampleText()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getExampleBySize', () => {
    test('should return small example', () => {
      const result = getExampleBySize(EXAMPLE_SIZES.SMALL)
      expect(result).toBe(SMALL_EXAMPLE_TEXT)
    })

    test('should return medium example', () => {
      const result = getExampleBySize(EXAMPLE_SIZES.MEDIUM)
      expect(result).toBe(MEDIUM_EXAMPLE_TEXT)
    })

    test('should return large example', () => {
      const result = getExampleBySize(EXAMPLE_SIZES.LARGE)
      expect(result.length).toBeGreaterThan(MEDIUM_EXAMPLE_TEXT.length)
    })

    test('should throw for invalid size', () => {
      expect(() => getExampleBySize('invalid')).toThrow()
    })
  })

  describe('getValidationErrorExample', () => {
    test('should return string that is invalid JSON', () => {
      const result = getValidationErrorExample()
      expect(typeof result).toBe('string')
      expect(() => JSON.parse(result)).toThrow()
    })

    test('should be repeatable', () => {
      const r1 = getValidationErrorExample()
      const r2 = getValidationErrorExample()
      expect(r1).toBe(r2)
    })
  })

  describe('getAllExamples', () => {
    test('should return all three sizes', () => {
      const examples = getAllExamples()
      expect(Object.keys(examples)).toHaveLength(3)
      expect(examples[EXAMPLE_SIZES.SMALL]).toBeDefined()
      expect(examples[EXAMPLE_SIZES.MEDIUM]).toBeDefined()
      expect(examples[EXAMPLE_SIZES.LARGE]).toBeDefined()
    })

    test('should include metadata', () => {
      const examples = getAllExamples()
      expect(examples[EXAMPLE_SIZES.SMALL].label).toBeDefined()
      expect(examples[EXAMPLE_SIZES.SMALL].size).toBeDefined()
      expect(examples[EXAMPLE_SIZES.SMALL].content).toBeDefined()
    })
  })

  describe('getValidationErrorExampleMetadata', () => {
    test('should return metadata', () => {
      const metadata = getValidationErrorExampleMetadata()
      expect(metadata.label).toBeDefined()
      expect(metadata.description).toBeDefined()
    })
  })
})
