import { describe, expect, test } from 'vitest'
import {
  validateToolEntry,
  normalizeToolEntry,
  validateToolList,
  mergeToolLists,
} from '../logic/schema.js'
import { ERROR_CODES, TOOL_STATUSES } from '../logic/constants.js'

describe('schema module', () => {
  describe('validateToolEntry', () => {
    test('should reject null/undefined entries', () => {
      expect(validateToolEntry(null).valid).toBe(false)
      expect(validateToolEntry(undefined).valid).toBe(false)
      expect(validateToolEntry({}).valid).toBe(false)
    })

    test('should reject entries without id', () => {
      const result = validateToolEntry({ title: 'Test' })
      expect(result.valid).toBe(false)
      expect(result.errors[0].errorCode).toBe(ERROR_CODES.SCHEMA_VALIDATION_FAILED)
    })

    test('should reject entries without title or name', () => {
      const result = validateToolEntry({ id: '001' })
      expect(result.valid).toBe(false)
    })

    test('should reject entries with invalid status', () => {
      const result = validateToolEntry({ id: '001', title: 'Test', status: 'invalid' })
      expect(result.valid).toBe(false)
    })

    test('should reject entries with invalid tags type', () => {
      const result = validateToolEntry({ id: '001', title: 'Test', tags: 'not-an-array' })
      expect(result.valid).toBe(false)
    })

    test('should accept valid entries with id and title', () => {
      const entry = { id: '001', title: 'Test Tool', summary: 'A test tool', tags: ['test'] }
      const result = validateToolEntry(entry)
      expect(result.valid).toBe(true)
      expect(result.entry).toBeDefined()
    })

    test('should accept valid entries with id and name', () => {
      const entry = { id: '001', name: 'Test Tool' }
      const result = validateToolEntry(entry)
      expect(result.valid).toBe(true)
      expect(result.entry.title).toBe('Test Tool')
    })
  })

  describe('normalizeToolEntry', () => {
    test('should normalize entry with all fields', () => {
      const entry = {
        id: '001',
        title: 'Test',
        summary: 'Summary',
        tags: ['test'],
        status: TOOL_STATUSES.BETA,
        path: '/custom/001',
      }
      const normalized = normalizeToolEntry(entry)
      expect(normalized.id).toBe('001')
      expect(normalized.title).toBe('Test')
      expect(normalized.summary).toBe('Summary')
      expect(normalized.tags).toEqual(['test'])
      expect(normalized.status).toBe(TOOL_STATUSES.BETA)
      expect(normalized.path).toBe('/custom/001')
    })

    test('should provide default values for missing fields', () => {
      const entry = { id: '002', name: 'Test 2' }
      const normalized = normalizeToolEntry(entry)
      expect(normalized.title).toBe('Test 2')
      expect(normalized.summary).toBe('')
      expect(normalized.tags).toEqual([])
      expect(normalized.status).toBe(TOOL_STATUSES.STABLE)
      expect(normalized.path).toBe('/tools/002')
    })

    test('should normalize id to string', () => {
      const entry = { id: 123, title: 'Test' }
      const normalized = normalizeToolEntry(entry)
      expect(normalized.id).toBe('123')
    })
  })

  describe('validateToolList', () => {
    test('should reject non-array lists', () => {
      expect(validateToolList(null).valid).toBe(false)
      expect(validateToolList(undefined).valid).toBe(false)
      expect(validateToolList({}).valid).toBe(false)
    })

    test('should validate all entries and separate valid/invalid', () => {
      const list = [
        { id: '001', title: 'Valid 1' },
        { id: '002', title: 'Valid 2' },
        { id: null, title: 'Invalid' },
        { id: '003', name: 'Valid 3' },
        {},
      ]

      const result = validateToolList(list)
      expect(result.validEntries.length).toBe(3)
      expect(result.invalidEntries.length).toBe(2)
      expect(result.valid).toBe(false)
    })

    test('should detect duplicate ids', () => {
      const list = [
        { id: '001', title: 'First' },
        { id: '002', title: 'Second' },
        { id: '001', title: 'Duplicate' },
      ]

      const result = validateToolList(list)
      expect(result.validEntries.length).toBe(2)
      expect(result.invalidEntries.length).toBe(1)
      expect(result.invalidEntries[0].index).toBe(2)
    })

    test('should be valid when all entries are valid', () => {
      const list = [
        { id: '001', title: 'Valid 1' },
        { id: '002', title: 'Valid 2' },
      ]

      const result = validateToolList(list)
      expect(result.valid).toBe(true)
      expect(result.validEntries.length).toBe(2)
      expect(result.invalidEntries.length).toBe(0)
      expect(result.error).toBeNull()
    })
  })

  describe('mergeToolLists', () => {
    test('should merge two lists with default base-wins strategy', () => {
      const baseList = [
        { id: '001', title: 'Base 1', tags: ['base'] },
        { id: '002', title: 'Base 2' },
      ]
      const extraList = [
        { id: '001', title: 'Extra 1', tags: ['extra'] },
        { id: '003', title: 'Extra 3' },
      ]

      const result = mergeToolLists(baseList, extraList, 'base-wins')
      expect(result.mergedCount).toBe(3)
      const tool1 = result.entries.find((t) => t.id === '001')
      expect(tool1.title).toBe('Base 1')
      expect(tool1.tags).toEqual(['base'])
    })

    test('should use extra-wins strategy when specified', () => {
      const baseList = [{ id: '001', title: 'Base 1' }]
      const extraList = [{ id: '001', title: 'Extra 1' }]

      const result = mergeToolLists(baseList, extraList, 'extra-wins')
      const tool1 = result.entries.find((t) => t.id === '001')
      expect(tool1.title).toBe('Extra 1')
    })

    test('should merge tags with merge strategy', () => {
      const baseList = [{ id: '001', title: 'Base 1', tags: ['a', 'b'] }]
      const extraList = [{ id: '001', title: 'Extra 1', tags: ['b', 'c'] }]

      const result = mergeToolLists(baseList, extraList, 'merge')
      const tool1 = result.entries.find((t) => t.id === '001')
      expect(tool1.title).toBe('Extra 1')
      expect(tool1.tags).toContain('a')
      expect(tool1.tags).toContain('b')
      expect(tool1.tags).toContain('c')
    })

    test('should track invalid entries from both lists', () => {
      const baseList = [
        { id: '001', title: 'Valid' },
        null,
      ]
      const extraList = [
        {},
        { id: '002', title: 'Extra' },
      ]

      const result = mergeToolLists(baseList, extraList)
      expect(result.invalidEntries.length).toBe(2)
      expect(result.mergedCount).toBe(2)
    })
  })
})
