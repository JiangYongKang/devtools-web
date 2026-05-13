import { describe, expect, test } from 'vitest'
import {
    addPrefixToItems,
    addPrefixToSelection,
    buildRenderVariables,
    bumpVersion,
    checkCircularReferences,
    createEmptyItem,
    ERROR_CODES,
    extractCommitFromText,
    findPlaceholders,
    formatDate,
    generateChangelogDraft,
    groupItemsByType,
    MAX_SAFE_ITEMS,
    MAX_SAFE_OUTPUT_SIZE,
    renderItem,
    renderItemsFlat,
    renderSections,
    renderTemplate,
    reorderItems,
    validateSemVer,
    validateTemplate,
} from '../logic/index.js'

describe('changelog-draft-builder logic', () => {
  describe('validateSemVer', () => {
    test('should validate valid SemVer versions', () => {
      expect(validateSemVer('1.0.0')).toBe(true)
      expect(validateSemVer('0.1.0')).toBe(true)
      expect(validateSemVer('2.1.3')).toBe(true)
      expect(validateSemVer('1.0.0-alpha')).toBe(true)
      expect(validateSemVer('1.0.0-alpha.1')).toBe(true)
      expect(validateSemVer('1.0.0+build.123')).toBe(true)
      expect(validateSemVer('1.0.0-alpha+001')).toBe(true)
    })

    test('should reject invalid SemVer versions', () => {
      expect(validateSemVer('')).toBe(false)
      expect(validateSemVer(null)).toBe(false)
      expect(validateSemVer(undefined)).toBe(false)
      expect(validateSemVer('1')).toBe(false)
      expect(validateSemVer('1.0')).toBe(false)
      expect(validateSemVer('v1.0.0')).toBe(false)
      expect(validateSemVer('1.0.0.0')).toBe(false)
      expect(validateSemVer('01.0.0')).toBe(false)
      expect(validateSemVer('1.01.0')).toBe(false)
      expect(validateSemVer('abc')).toBe(false)
    })
  })

  describe('bumpVersion', () => {
    test('should bump major version', () => {
      expect(bumpVersion('1.2.3', 'major')).toMatchObject({
        valid: true,
        version: '2.0.0',
      })
      expect(bumpVersion('0.1.0', 'major')).toMatchObject({
        valid: true,
        version: '1.0.0',
      })
    })

    test('should bump minor version', () => {
      expect(bumpVersion('1.2.3', 'minor')).toMatchObject({
        valid: true,
        version: '1.3.0',
      })
      expect(bumpVersion('2.0.0', 'minor')).toMatchObject({
        valid: true,
        version: '2.1.0',
      })
    })

    test('should bump patch version', () => {
      expect(bumpVersion('1.2.3', 'patch')).toMatchObject({
        valid: true,
        version: '1.2.4',
      })
      expect(bumpVersion('2.0.0', 'patch')).toMatchObject({
        valid: true,
        version: '2.0.1',
      })
    })

    test('should reset minor and patch when bumping major', () => {
      const result = bumpVersion('1.2.3', 'major')
      expect(result.version).toBe('2.0.0')
    })

    test('should reset patch when bumping minor', () => {
      const result = bumpVersion('1.2.3', 'minor')
      expect(result.version).toBe('1.3.0')
    })

    test('should return error for invalid version', () => {
      const result = bumpVersion('invalid', 'patch')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_VERSION)
    })

    test('should return error for invalid bump type', () => {
      const result = bumpVersion('1.0.0', 'invalid')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_VERSION)
    })
  })

  describe('formatDate', () => {
    test('should format date with local format', () => {
      const date = new Date('2024-01-15T10:00:00Z')
      const result = formatDate(date, 'local')
      expect(result.valid).toBe(true)
      expect(result.formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    test('should format date with ISO format', () => {
      const date = new Date('2024-01-15T10:00:00Z')
      const result = formatDate(date, 'iso')
      expect(result.valid).toBe(true)
      expect(result.formatted).toBe('2024-01-15')
    })

    test('should format date as timestamp', () => {
      const date = new Date('2024-01-15T10:00:00Z')
      const result = formatDate(date, 'timestamp')
      expect(result.valid).toBe(true)
      expect(result.formatted).toBe(String(date.getTime()))
    })

    test('should return error for invalid date', () => {
      const result = formatDate('invalid-date', 'local')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_DATE_FORMAT)
    })
  })

  describe('extractCommitFromText', () => {
    test('should extract conventional commits', () => {
      const text = `feat(api): add authentication
fix(ui)!: fix login button
docs: update readme
this is an unrecognized commit`

      const items = extractCommitFromText(text)
      expect(items.length).toBe(4)
      
      expect(items[0].type).toBe('feat')
      expect(items[0].scope).toBe('api')
      expect(items[0].content).toBe('add authentication')
      
      expect(items[1].type).toBe('BREAKING')
      expect(items[1].scope).toBe('ui')
      expect(items[1].content).toBe('fix login button')
      
      expect(items[2].type).toBe('docs')
      expect(items[2].scope).toBe('')
      expect(items[2].content).toBe('update readme')
      
      expect(items[3].type).toBe('other')
      expect(items[3].content).toBe('this is an unrecognized commit')
    })

    test('should extract issue numbers', () => {
      const text = `feat: add feature #123
fix: fix bug #456 #789`

      const items = extractCommitFromText(text)
      expect(items.length).toBe(2)
      expect(items[0].issue).toBe('123')
      expect(items[1].issue).toBe('456, 789')
    })

    test('should return empty array for empty text', () => {
      expect(extractCommitFromText('').length).toBe(0)
      expect(extractCommitFromText(null).length).toBe(0)
      expect(extractCommitFromText(undefined).length).toBe(0)
      expect(extractCommitFromText('   \n   ').length).toBe(0)
    })
  })

  describe('reorderItems', () => {
    test('should reorder items', () => {
      const items = [
        { id: '1', content: 'a' },
        { id: '2', content: 'b' },
        { id: '3', content: 'c' },
      ]
      
      const result = reorderItems(items, 0, 2)
      expect(result[0].id).toBe('2')
      expect(result[1].id).toBe('3')
      expect(result[2].id).toBe('1')
    })

    test('should handle invalid indices', () => {
      const items = [
        { id: '1', content: 'a' },
        { id: '2', content: 'b' },
      ]
      
      expect(reorderItems(items, -1, 0)).toEqual(items)
      expect(reorderItems(items, 0, 10)).toEqual(items)
      expect(reorderItems(items, 10, 0)).toEqual(items)
    })

    test('should not mutate original array', () => {
      const items = [
        { id: '1', content: 'a' },
        { id: '2', content: 'b' },
      ]
      const original = [...items]
      
      reorderItems(items, 0, 1)
      
      expect(items).toEqual(original)
    })
  })

  describe('groupItemsByType', () => {
    test('should group items by type', () => {
      const items = [
        { id: '1', type: 'feat', content: 'a' },
        { id: '2', type: 'fix', content: 'b' },
        { id: '3', type: 'feat', content: 'c' },
        { id: '4', type: 'other', content: 'd' },
      ]
      
      const groups = groupItemsByType(items)
      
      expect(groups.feat.length).toBe(2)
      expect(groups.fix.length).toBe(1)
      expect(groups.other.length).toBe(1)
    })

    test('should have all type keys even if empty', () => {
      const groups = groupItemsByType([])
      expect(Object.keys(groups).length).toBeGreaterThan(0)
      expect(Object.values(groups).every(g => Array.isArray(g))).toBe(true)
    })

    test('should put unknown types in "other"', () => {
      const items = [{ id: '1', type: 'unknown', content: 'test' }]
      const groups = groupItemsByType(items)
      expect(groups.other.length).toBe(1)
    })
  })

  describe('renderItem', () => {
    test('should render item in simple format', () => {
      const item = { type: 'feat', scope: 'api', content: 'test feature', issue: '123' }
      const result = renderItem(item, { format: 'simple' })
      expect(result).toContain('test feature')
      expect(result).toContain('api')
      expect(result).toContain('123')
    })

    test('should render item with index when numbered', () => {
      const item = { type: 'feat', content: 'test' }
      const result = renderItem(item, { format: 'simple', includeIndex: true, index: 3 })
      expect(result).toMatch(/^3\./)
    })

    test('should render item without scope or issue if not present', () => {
      const item = { type: 'feat', content: 'test' }
      const result = renderItem(item, { format: 'simple' })
      expect(result).toContain('test')
      expect(result).not.toContain('()')
    })

    test('should escape HTML in content', () => {
      const item = { type: 'feat', content: '<script>alert("xss")</script>' }
      const result = renderItem(item, { format: 'simple' })
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })
  })

  describe('renderSections', () => {
    test('should render sections grouped by type', () => {
      const items = [
        { id: '1', type: 'feat', content: 'feature 1' },
        { id: '2', type: 'feat', content: 'feature 2' },
        { id: '3', type: 'fix', content: 'fix 1' },
      ]
      
      const result = renderSections(items)
      expect(result).toContain('Features')
      expect(result).toContain('Bug Fixes')
      expect(result).toContain('feature 1')
      expect(result).toContain('feature 2')
      expect(result).toContain('fix 1')
    })

    test('should not include sections with no items', () => {
      const items = [{ id: '1', type: 'feat', content: 'feature 1' }]
      const result = renderSections(items)
      expect(result).toContain('Features')
    })
  })

  describe('renderItemsFlat', () => {
    test('should render items as flat list', () => {
      const items = [
        { id: '1', type: 'feat', content: 'a' },
        { id: '2', type: 'fix', content: 'b' },
      ]
      
      const result = renderItemsFlat(items)
      expect(result).toContain('a')
      expect(result).toContain('b')
      expect(result.split('\n').length).toBe(2)
    })

    test('should render numbered list', () => {
      const items = [
        { id: '1', type: 'feat', content: 'a' },
        { id: '2', type: 'fix', content: 'b' },
      ]
      
      const result = renderItemsFlat(items, { numbered: true })
      expect(result).toMatch(/^1\./m)
      expect(result).toMatch(/^2\./m)
    })
  })

  describe('findPlaceholders', () => {
    test('should find placeholders in template', () => {
      const template = 'Version: {{version}}, Date: {{date}}'
      const placeholders = findPlaceholders(template)
      
      expect(placeholders.length).toBe(2)
      expect(placeholders[0].key).toBe('version')
      expect(placeholders[1].key).toBe('date')
    })

    test('should handle escaped braces', () => {
      const template = 'Literal: \\{{not-a-var\\}}'
      const placeholders = findPlaceholders(template)
      expect(placeholders.length).toBe(0)
    })

    test('should return empty array for no placeholders', () => {
      const template = 'Plain text with no variables'
      expect(findPlaceholders(template).length).toBe(0)
    })

    test('should handle whitespace in placeholders', () => {
      const template = '{{ version }} and {{  date  }}'
      const placeholders = findPlaceholders(template)
      expect(placeholders.length).toBe(2)
      expect(placeholders[0].key).toBe('version')
      expect(placeholders[1].key).toBe('date')
    })
  })

  describe('validateTemplate', () => {
    test('should validate valid templates', () => {
      expect(validateTemplate('Hello {{name}}').valid).toBe(true)
      expect(validateTemplate('No placeholders').valid).toBe(true)
      expect(validateTemplate('').valid).toBe(true)
    })

    test('should reject unbalanced braces', () => {
      const result1 = validateTemplate('Hello {{name')
      expect(result1.valid).toBe(false)
      expect(result1.errorCode).toBe(ERROR_CODES.INVALID_TEMPLATE)

      const result2 = validateTemplate('Hello name}}')
      expect(result2.valid).toBe(false)
    })

    test('should validate null template', () => {
      const result = validateTemplate(null)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TEMPLATE)
    })
  })

  describe('checkCircularReferences', () => {
    test('should detect simple circular reference', () => {
      const variables = {
        a: '{{b}}',
        b: '{{a}}',
      }
      const result = checkCircularReferences(variables)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.CIRCULAR_REFERENCE)
    })

    test('should detect indirect circular reference', () => {
      const variables = {
        a: '{{b}}',
        b: '{{c}}',
        c: '{{a}}',
      }
      const result = checkCircularReferences(variables)
      expect(result.valid).toBe(false)
    })

    test('should pass for non-circular references', () => {
      const variables = {
        a: '{{b}} world',
        b: 'hello',
      }
      const result = checkCircularReferences(variables)
      expect(result.valid).toBe(true)
    })

    test('should pass for no references', () => {
      const variables = {
        a: 'hello',
        b: 'world',
      }
      const result = checkCircularReferences(variables)
      expect(result.valid).toBe(true)
    })
  })

  describe('renderTemplate', () => {
    test('should render template with variables', () => {
      const template = 'Hello {{name}}, you are {{age}} years old'
      const variables = { name: 'Alice', age: 30 }
      
      const result = renderTemplate(template, variables)
      expect(result.valid).toBe(true)
      expect(result.output).toBe('Hello Alice, you are 30 years old')
    })

    test('should handle missing placeholders with empty strategy', () => {
      const template = 'Hello {{name}}'
      const variables = {}
      
      const result = renderTemplate(template, variables, { missingPlaceholderStrategy: 'empty' })
      expect(result.valid).toBe(true)
      expect(result.output).toBe('Hello ')
      expect(result.missingPlaceholders).toContain('name')
    })

    test('should handle missing placeholders with tbd strategy', () => {
      const template = 'Version: {{version}}'
      const variables = {}
      
      const result = renderTemplate(template, variables, { missingPlaceholderStrategy: 'tbd' })
      expect(result.valid).toBe(true)
      expect(result.output).toBe('Version: TBD')
    })

    test('should handle missing placeholders with error strategy', () => {
      const template = 'Version: {{version}}'
      const variables = {}
      
      const result = renderTemplate(template, variables, { missingPlaceholderStrategy: 'error' })
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.MISSING_PLACEHOLDER)
    })

    test('should unescape escaped braces', () => {
      const template = 'Literal: \\{{escaped\\}}'
      const variables = {}
      
      const result = renderTemplate(template, variables)
      expect(result.output).toBe('Literal: {{escaped}}')
    })

    test('should detect circular references', () => {
      const template = '{{a}}'
      const variables = { a: '{{b}}', b: '{{a}}' }
      
      const result = renderTemplate(template, variables)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.CIRCULAR_REFERENCE)
    })

    test('should reject invalid templates', () => {
      const template = 'Hello {{name'
      const variables = { name: 'test' }
      
      const result = renderTemplate(template, variables)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TEMPLATE)
    })

    test('should reject output exceeding max size', () => {
      const template = '{{long}}'
      const variables = { long: 'x'.repeat(MAX_SAFE_OUTPUT_SIZE + 1) }
      
      const result = renderTemplate(template, variables)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.INPUT_TOO_LARGE)
    })

    test('should accept output at exactly max size', () => {
      const template = '{{long}}'
      const variables = { long: 'x'.repeat(MAX_SAFE_OUTPUT_SIZE) }
      
      const result = renderTemplate(template, variables)
      expect(result.valid).toBe(true)
    })
  })

  describe('addPrefixToItems', () => {
    test('should add prefix to all items', () => {
      const items = [
        { id: '1', content: 'a' },
        { id: '2', content: 'b' },
      ]
      
      const result = addPrefixToItems(items, '[PREFIX] ')
      expect(result[0].content).toBe('[PREFIX] a')
      expect(result[1].content).toBe('[PREFIX] b')
    })

    test('should return items unchanged if no prefix', () => {
      const items = [{ id: '1', content: 'a' }]
      const result = addPrefixToItems(items, '')
      expect(result[0].content).toBe('a')
    })
  })

  describe('addPrefixToSelection', () => {
    test('should add prefix only to selected items', () => {
      const items = [
        { id: '1', content: 'a' },
        { id: '2', content: 'b' },
        { id: '3', content: 'c' },
      ]
      
      const result = addPrefixToSelection(items, ['1', '3'], '[PREFIX] ')
      expect(result[0].content).toBe('[PREFIX] a')
      expect(result[1].content).toBe('b')
      expect(result[2].content).toBe('[PREFIX] c')
    })

    test('should return items unchanged if no selection', () => {
      const items = [{ id: '1', content: 'a' }]
      const result = addPrefixToSelection(items, [], '[PREFIX] ')
      expect(result[0].content).toBe('a')
    })
  })

  describe('generateChangelogDraft', () => {
    test('should generate changelog from items', () => {
      const template = '# Changelog\n\n## {{version}} - {{date}}\n\n{{sections}}'
      const items = [
        { id: '1', type: 'feat', content: 'new feature' },
        { id: '2', type: 'fix', content: 'bug fix' },
      ]
      
      const result = generateChangelogDraft({
        template,
        version: '1.0.0',
        date: '2024-01-15',
        items,
      })
      
      expect(result.valid).toBe(true)
      expect(result.output).toContain('1.0.0')
      expect(result.output).toContain('2024-01-15')
      expect(result.output).toContain('new feature')
      expect(result.output).toContain('bug fix')
    })

    test('should reject too many items', () => {
      const items = Array.from({ length: MAX_SAFE_ITEMS + 1 }, (_, i) => ({
        id: `id-${i}`,
        type: 'feat',
        content: `item ${i}`,
      }))
      
      const result = generateChangelogDraft({
        template: '{{items}}',
        version: '1.0.0',
        date: '2024-01-15',
        items,
      })
      
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe(ERROR_CODES.TOO_MANY_ITEMS)
    })

    test('should accept exactly max items', () => {
      const items = Array.from({ length: MAX_SAFE_ITEMS }, (_, i) => ({
        id: `id-${i}`,
        type: 'feat',
        content: `item ${i}`,
      }))
      
      const result = generateChangelogDraft({
        template: '{{items}}',
        version: '1.0.0',
        date: '2024-01-15',
        items,
      })
      
      expect(result.valid).toBe(true)
    })

    test('should handle flat vs grouped output', () => {
      const items = [
        { id: '1', type: 'feat', content: 'feature 1' },
        { id: '2', type: 'fix', content: 'fix 1' },
      ]

      const groupedResult = generateChangelogDraft({
        template: '{{sections}}',
        items,
        groupByType: true,
      })
      expect(groupedResult.output).toContain('Features')
      expect(groupedResult.output).toContain('Bug Fixes')

      const flatResult = generateChangelogDraft({
        template: '{{items}}',
        items,
        groupByType: false,
      })
      expect(flatResult.output).not.toContain('Features')
    })
  })

  describe('createEmptyItem', () => {
    test('should create an empty item with unique id', () => {
      const item1 = createEmptyItem()
      const item2 = createEmptyItem()
      
      expect(item1.id).toBeDefined()
      expect(item2.id).toBeDefined()
      expect(item1.id).not.toBe(item2.id)
      expect(item1.type).toBe('feat')
      expect(item1.scope).toBe('')
      expect(item1.content).toBe('')
      expect(item1.contentEn).toBe('')
      expect(item1.issue).toBe('')
    })
  })

  describe('buildRenderVariables', () => {
    test('should build variables object', () => {
      const items = [{ id: '1', type: 'feat', content: 'test' }]
      const variables = buildRenderVariables({
        version: '1.0.0',
        date: '2024-01-15',
        items,
      })
      
      expect(variables.version).toBe('1.0.0')
      expect(variables.date).toBe('2024-01-15')
      expect(variables.sections).toBeDefined()
      expect(variables.items).toBeDefined()
    })
  })
})
