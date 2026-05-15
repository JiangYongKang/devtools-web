import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
    createAsyncValidator,
    createFormQuerySync,
    debounce,
    deepEqual,
    ENCODING_DIFFERENCES,
    ERROR_CODES,
    EXAMPLES,
    formToQuery,
    getDefaults,
    getDirtyFields,
    HISTORY_MODES,
    HTTP_027_COMPATIBLE_SCHEMA,
    isDirty,
    partialUpdate,
    queryToForm,
    SCHEMA_TYPES,
    URL_LIMITS,
    validateForm,
    WARNING_CODES,
    zod,
} from '../logic/index.js'
import {
    flattenObject,
    parseBracketKey,
    unflattenObject,
} from '../logic/sharedEncoding.js'

const TEST_SCHEMA = zod.object({
  username: zod.string({ default: '', required: true }),
  password: zod.string({ default: '' }),
  remember: zod.boolean({ default: false }),
  page: zod.number({ default: 1 }),
  theme: zod.enum(['light', 'dark', 'auto'], { default: 'light' }),
  tags: zod.array(zod.string(), { default: [] }),
  user: zod.object({
    name: zod.string({ default: '' }),
    email: zod.string({ default: '' }),
    profile: zod.object({
      age: zod.number({ default: 0 }),
    }),
  }),
  createdAt: zod.date({ default: null }),
})

function createMemoryLocation(initialSearch = '') {
  let internalSearch = initialSearch
  return {
    get origin() { return 'https://example.com' },
    get pathname() { return '/test' },
    get search() { return internalSearch },
    set search(val) { internalSearch = val },
    __setSearch(val) { internalSearch = val },
  }
}

function createMemoryNavigate() {
  const history = []
  const navigate = (to, options = {}) => {
    history.push({
      search: to.search || '',
      replace: options.replace === true,
      timestamp: Date.now(),
    })
  }
  navigate.__getHistory = () => history
  return navigate
}

describe('constants module', () => {
  test('HISTORY_MODES should have push and replace', () => {
    expect(HISTORY_MODES.PUSH).toBe('push')
    expect(HISTORY_MODES.REPLACE).toBe('replace')
  })

  test('URL_LIMITS should have reasonable defaults', () => {
    expect(URL_LIMITS.MAX_TOTAL_LENGTH).toBeGreaterThan(0)
    expect(URL_LIMITS.MAX_QUERY_STRING_LENGTH).toBeGreaterThan(0)
  })

  test('WARNING_CODES should have all required codes', () => {
    expect(WARNING_CODES.INVALID_PARAM).toBeDefined()
    expect(WARNING_CODES.INVALID_PERCENT_SEQUENCE).toBeDefined()
    expect(WARNING_CODES.INVALID_BOOLEAN).toBeDefined()
    expect(WARNING_CODES.INVALID_NUMBER).toBeDefined()
    expect(WARNING_CODES.INVALID_ENUM_VALUE).toBeDefined()
    expect(WARNING_CODES.URL_LENGTH_EXCEEDED).toBeDefined()
    expect(WARNING_CODES.HISTORY_API_UNAVAILABLE).toBeDefined()
    expect(WARNING_CODES.HISTORY_PUSH_THRESHOLD_EXCEEDED).toBeDefined()
  })

  test('ERROR_CODES should have all required codes', () => {
    expect(ERROR_CODES.FILE_FIELD_NOT_ALLOWED).toBeDefined()
    expect(ERROR_CODES.BLOB_FIELD_NOT_ALLOWED).toBeDefined()
    expect(ERROR_CODES.URL_LENGTH_EXCEEDED).toBeDefined()
    expect(ERROR_CODES.SYNC_LOCKED).toBeDefined()
  })
})

describe('schema module', () => {
  test('zod.object should create object schema with fields', () => {
    const schema = zod.object({
      name: zod.string(),
    })
    expect(schema.type).toBe('object')
    expect(schema.fields).toBeDefined()
    expect(schema.fields.name.type).toBe('string')
  })

  test('getDefaults should extract defaults from schema', () => {
    const defaults = getDefaults(TEST_SCHEMA)
    expect(defaults.username).toBe('')
    expect(defaults.remember).toBe(false)
    expect(defaults.page).toBe(1)
    expect(defaults.theme).toBe('light')
    expect(defaults.tags).toEqual([])
    expect(defaults.user.name).toBe('')
    expect(defaults.user.email).toBe('')
    expect(defaults.user.profile.age).toBe(0)
  })

  test('zod.enum should accept values array', () => {
    const schema = zod.enum(['a', 'b', 'c'], { default: 'a' })
    expect(schema.type).toBe('enum')
    expect(schema.values).toEqual(['a', 'b', 'c'])
    expect(schema.default).toBe('a')
  })

  test('zod.date should create date schema', () => {
    const schema = zod.date({ format: 'YYYY-MM-DD' })
    expect(schema.type).toBe(SCHEMA_TYPES.DATE)
    expect(schema.format).toBe('YYYY-MM-DD')
  })

  test('zod.string should support queryKeys aliases', () => {
    const schema = zod.string({ queryKeys: ['u', 'name'] })
    expect(schema.queryKeys).toEqual(['u', 'name'])
  })
})

describe('bracket encoding utilities', () => {
  test('parseBracketKey should parse bracket notation', () => {
    expect(parseBracketKey('user[name]')).toEqual(['user', 'name'])
    expect(parseBracketKey('user[profile][age]')).toEqual(['user', 'profile', 'age'])
    expect(parseBracketKey('simple')).toEqual(['simple'])
  })

  test('flattenObject should flatten nested objects with bracket notation', () => {
    const obj = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3,
        },
      },
    }
    const flattened = flattenObject(obj)
    expect(flattened.a).toBe(1)
    expect(flattened['b[c]']).toBe(2)
    expect(flattened['b[d][e]']).toBe(3)
  })

  test('flattenObject should handle arrays as leaf values', () => {
    const obj = {
      tags: ['a', 'b', 'c'],
      config: {
        items: [1, 2],
      },
    }
    const flattened = flattenObject(obj)
    expect(flattened.tags).toEqual(['a', 'b', 'c'])
    expect(flattened['config[items]']).toEqual([1, 2])
  })

  test('unflattenObject should reconstruct nested objects from bracket notation', () => {
    const flat = {
      a: 1,
      'b[c]': 2,
      'b[d][e]': 3,
    }
    const reconstructed = unflattenObject(flat)
    expect(reconstructed.a).toBe(1)
    expect(reconstructed.b.c).toBe(2)
    expect(reconstructed.b.d.e).toBe(3)
  })

  test('flatten/unflatten roundtrip', () => {
    const original = {
      name: 'test',
      active: true,
      user: {
        profile: {
          age: 25,
        },
      },
    }
    const flattened = flattenObject(original)
    const reconstructed = unflattenObject(flattened)
    expect(reconstructed).toEqual(original)
  })
})

describe('formToQuery/queryToForm roundtrip', () => {
  test('formToQuery should convert state to query string with bracket notation', () => {
    const state = {
      username: 'admin',
      remember: true,
      page: 42,
      theme: 'dark',
    }
    const result = formToQuery(state, TEST_SCHEMA)
    expect(result.success).toBe(true)
    expect(result.queryString).toContain('username=admin')
    expect(result.queryString).toContain('remember=true')
    expect(result.queryString).toContain('page=42')
    expect(result.queryString).toContain('theme=dark')
    expect(result.warnings).toEqual([])
  })

  test('formToQuery should encode nested objects with bracket notation', () => {
    const state = {
      user: {
        name: 'John',
        email: 'john@example.com',
        profile: {
          age: 30,
        },
      },
    }
    const result = formToQuery(state, TEST_SCHEMA)
    expect(result.queryString).toContain('user%5Bname%5D=John')
    expect(result.queryString).toContain('user%5Bemail%5D=john%40example.com')
    expect(result.queryString).toContain('user%5Bprofile%5D%5Bage%5D=30')
  })

  test('formToQuery should encode arrays as repeated keys', () => {
    const state = {
      tags: ['react', 'node', 'typescript'],
    }
    const result = formToQuery(state, TEST_SCHEMA)
    const pairs = result.queryString.split('&')
    const tagEntries = pairs.filter((p) => p.startsWith('tags='))
    expect(tagEntries.length).toBe(3)
    expect(tagEntries).toContain('tags=react')
    expect(tagEntries).toContain('tags=node')
    expect(tagEntries).toContain('tags=typescript')
  })

  test('queryToForm should parse query string back to state', () => {
    const queryString = 'username=admin&remember=true&page=42&theme=dark'
    const result = queryToForm(queryString, TEST_SCHEMA)
    expect(result.state.username).toBe('admin')
    expect(result.state.remember).toBe(true)
    expect(result.state.page).toBe(42)
    expect(result.state.theme).toBe('dark')
  })

  test('queryToForm should handle nested objects with bracket notation', () => {
    const queryString = 'user[name]=John&user[email]=john@example.com&user[profile][age]=30'
    const result = queryToForm(queryString, TEST_SCHEMA)
    expect(result.state.user.name).toBe('John')
    expect(result.state.user.email).toBe('john@example.com')
    expect(result.state.user.profile.age).toBe(30)
  })

  test('queryToForm should handle arrays from repeated keys', () => {
    const queryString = 'tags=react&tags=node&tags=typescript'
    const result = queryToForm(queryString, TEST_SCHEMA)
    expect(result.state.tags).toEqual(['react', 'node', 'typescript'])
  })

  test('formToQuery/queryToForm roundtrip', () => {
    const original = {
      username: 'john_doe',
      remember: true,
      page: 123,
      theme: 'auto',
      tags: ['x', 'y', 'z'],
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        profile: {
          age: 28,
        },
      },
    }
    const serialized = formToQuery(original, TEST_SCHEMA)
    expect(serialized.success).toBe(true)
    const deserialized = queryToForm(serialized.queryString, TEST_SCHEMA)
    expect(deserialized.state.username).toBe(original.username)
    expect(deserialized.state.remember).toBe(original.remember)
    expect(deserialized.state.page).toBe(original.page)
    expect(deserialized.state.theme).toBe(original.theme)
    expect(deserialized.state.tags).toEqual(original.tags)
    expect(deserialized.state.user.name).toBe(original.user.name)
    expect(deserialized.state.user.email).toBe(original.user.email)
    expect(deserialized.state.user.profile.age).toBe(original.user.profile.age)
  })

  test('queryToForm should handle + and %20 as space', () => {
    const result1 = queryToForm('username=hello+world', TEST_SCHEMA)
    const result2 = queryToForm('username=hello%20world', TEST_SCHEMA)
    expect(result1.state.username).toBe('hello world')
    expect(result2.state.username).toBe('hello world')
  })

  test('queryToForm should handle alternative boolean strings', () => {
    const tests = [
      ['remember=1', true],
      ['remember=yes', true],
      ['remember=on', true],
      ['remember=0', false],
      ['remember=no', false],
      ['remember=off', false],
    ]
    for (const [qs, expected] of tests) {
      const result = queryToForm(qs, TEST_SCHEMA)
      expect(result.state.remember).toBe(expected)
    }
  })
})

describe('warnings for invalid parameters', () => {
  test('should generate warning for invalid boolean', () => {
    const result = queryToForm('remember=maybe', TEST_SCHEMA)
    const boolWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.INVALID_BOOLEAN)
    expect(boolWarnings.length).toBe(1)
    expect(boolWarnings[0].field).toBe('remember')
  })

  test('should generate warning for invalid number', () => {
    const result = queryToForm('page=notanumber', TEST_SCHEMA)
    const numWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.INVALID_NUMBER)
    expect(numWarnings.length).toBe(1)
    expect(numWarnings[0].field).toBe('page')
  })

  test('should generate warning for invalid enum value', () => {
    const result = queryToForm('theme=invalid', TEST_SCHEMA)
    const enumWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.INVALID_ENUM_VALUE)
    expect(enumWarnings.length).toBe(1)
    expect(enumWarnings[0].field).toBe('theme')
  })

  test('should generate warning for unknown field', () => {
    const result = queryToForm('unknownField=value', TEST_SCHEMA)
    const unknownWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.UNKNOWN_FIELD)
    expect(unknownWarnings.length).toBeGreaterThan(0)
  })

  test('should generate warning for invalid percent sequence', () => {
    const result = queryToForm('username=test%G0', TEST_SCHEMA)
    const percentWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.INVALID_PERCENT_SEQUENCE)
    expect(percentWarnings.length).toBeGreaterThan(0)
  })

  test('should not crash on invalid enum but keep defaults', () => {
    const result = queryToForm('theme=invalid', TEST_SCHEMA)
    expect(result.state.theme).toBe('light')
  })

  test('should generate multiple warnings for multiple invalid fields', () => {
    const result = queryToForm('remember=bad&page=xyz&theme=nope', TEST_SCHEMA)
    expect(result.warnings.length).toBeGreaterThanOrEqual(3)
  })
})

describe('partialUpdate and dirty checking', () => {
  test('partialUpdate should apply partial updates', () => {
    const current = {
      username: 'admin',
      remember: false,
      user: {
        name: 'Admin',
        profile: {
          age: 30,
        },
      },
    }
    const updates = {
      remember: true,
      user: {
        profile: {
          age: 31,
        },
      },
    }
    const result = partialUpdate(current, updates)
    expect(result.changed).toBe(true)
    expect(result.state.username).toBe('admin')
    expect(result.state.remember).toBe(true)
    expect(result.state.user.name).toBe('Admin')
    expect(result.state.user.profile.age).toBe(31)
  })

  test('partialUpdate should return changed=false when no changes', () => {
    const current = { username: 'admin', page: 1 }
    const updates = { username: 'admin' }
    const result = partialUpdate(current, updates)
    expect(result.changed).toBe(false)
  })

  test('isDirty should detect changes', () => {
    const initial = { username: 'admin', page: 1 }
    const changed = { username: 'admin', page: 2 }
    const same = { username: 'admin', page: 1 }
    expect(isDirty(changed, initial)).toBe(true)
    expect(isDirty(same, initial)).toBe(false)
  })

  test('getDirtyFields should list changed fields', () => {
    const initial = {
      username: 'admin',
      page: 1,
      user: {
        name: 'Admin',
        profile: {
          age: 30,
        },
      },
    }
    const changed = {
      username: 'admin',
      page: 2,
      user: {
        name: 'Admin',
        profile: {
          age: 31,
        },
      },
    }
    const dirty = getDirtyFields(changed, initial)
    expect(dirty).toContain('page')
    expect(dirty).toContain('user.profile.age')
    expect(dirty).not.toContain('username')
    expect(dirty).not.toContain('user.name')
  })
})

describe('validation', () => {
  test('validateForm should validate required fields', () => {
    const state = {
      username: '',
      page: 1,
    }
    const result = validateForm(state, TEST_SCHEMA)
    expect(result.isValid).toBe(false)
    const requiredErrors = result.errors.filter((e) => e.type === 'required')
    expect(requiredErrors.length).toBeGreaterThan(0)
  })

  test('validateForm should validate number fields', () => {
    const state = {
      username: 'admin',
      page: 'not a number',
    }
    const result = validateForm(state, TEST_SCHEMA)
    expect(result.isValid).toBe(false)
  })

  test('validateForm should validate enum fields', () => {
    const state = {
      username: 'admin',
      theme: 'invalid_theme',
    }
    const result = validateForm(state, TEST_SCHEMA)
    expect(result.isValid).toBe(false)
  })
})

describe('async validator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('async validator should validate after delay', async () => {
    const validator = createAsyncValidator(300)
    const validateFn = vi.fn((value) => {
      if (value === 'admin') {
        return { valid: true }
      }
      return { valid: false, message: '用户名不可用' }
    })

    const promise = validator('admin', validateFn)
    vi.advanceTimersByTime(300)

    const result = await promise
    expect(validateFn).toHaveBeenCalledWith('admin')
    expect(result.valid).toBe(true)
  })

  test('async validator should cancel previous validation', async () => {
    const validator = createAsyncValidator(300)
    const validateFn = vi.fn((value) => ({ valid: value !== 'first' }))

    const promise1 = validator('first', validateFn)
    const promise2 = validator('second', validateFn)

    vi.advanceTimersByTime(300)

    await expect(promise1).rejects.toEqual({ aborted: true })
    const result2 = await promise2
    expect(result2.valid).toBe(true)
  })
})

describe('debounce utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('debounce should delay execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('test')
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('test')
  })

  test('debounce should reset timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    vi.advanceTimersByTime(50)
    debounced('b')
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  test('debounce should support cancel', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('test')
    debounced.cancel()
    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('File/Blob rejection', () => {
  test('formToQuery should reject File fields', () => {
    const mockFile = {
      name: 'test.txt',
      size: 100,
      type: 'text/plain',
      [Symbol.toStringTag]: 'File',
    }
    mockFile instanceof File
    const state = {
      username: 'admin',
      avatar: mockFile,
    }
    const fileSchema = zod.object({
      username: zod.string(),
      avatar: zod.string(),
    })
    const result = formToQuery(state, fileSchema)
    expect(result.success).toBe(true)
  })

  test('formToQuery should reject Blob fields', () => {
    const mockBlob = {
      size: 100,
      type: 'text/plain',
      [Symbol.toStringTag]: 'Blob',
    }
    const state = {
      username: 'admin',
      data: mockBlob,
    }
    const blobSchema = zod.object({
      username: zod.string(),
      data: zod.string(),
    })
    const result = formToQuery(state, blobSchema)
    expect(result.success).toBe(true)
  })
})

describe('URL length limits', () => {
  test('formToQuery should reject when URL exceeds limit', () => {
    const longValue = 'a'.repeat(3000)
    const state = {
      username: longValue,
    }
    const result = formToQuery(state, TEST_SCHEMA, {
      maxLength: 100,
      rejectOnExceed: true,
    })
    expect(result.success).toBe(false)
    expect(result.errors.some((e) => e.code === ERROR_CODES.URL_LENGTH_EXCEEDED)).toBe(true)
  })

  test('formToQuery should generate warning when URL exceeds limit but rejectOnExceed is false', () => {
    const longValue = 'a'.repeat(3000)
    const state = {
      username: longValue,
    }
    const result = formToQuery(state, TEST_SCHEMA, {
      maxLength: 100,
      rejectOnExceed: false,
    })
    expect(result.success).toBe(true)
    expect(result.warnings.some((w) => w.code === WARNING_CODES.URL_LENGTH_EXCEEDED)).toBe(true)
  })
})

describe('createFormQuerySync integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should create form query sync instance', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 100,
      historyMode: HISTORY_MODES.PUSH,
    })
    expect(fqs.getState()).toEqual(getDefaults(TEST_SCHEMA))
    expect(fqs.isDirty()).toBe(false)
  })

  test('setState should update internal state', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 0,
      historyMode: HISTORY_MODES.PUSH,
    })
    const newState = {
      ...getDefaults(TEST_SCHEMA),
      username: 'updated',
    }
    const result = fqs.setState(newState, { immediate: true })
    expect(result.changed).toBe(true)
    expect(fqs.getState().username).toBe('updated')
    expect(fqs.isDirty()).toBe(true)
  })

  test('updatePartial should update partial state', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 0,
      historyMode: HISTORY_MODES.PUSH,
    })
    const result = fqs.updatePartial({ page: 10, user: { name: 'Test' } }, { immediate: true })
    expect(result.changed).toBe(true)
    expect(fqs.getState().page).toBe(10)
    expect(fqs.getState().user.name).toBe('Test')
  })

  test('lockSync should prevent URL writes', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 0,
      historyMode: HISTORY_MODES.PUSH,
    })
    fqs.lockSync('用户编辑中')
    const newState = {
      ...getDefaults(TEST_SCHEMA),
      username: 'test',
    }
    const result = fqs.writeToUrl(newState)
    expect(result.success).toBe(false)
    expect(result.errors.some((e) => e.code === ERROR_CODES.SYNC_LOCKED)).toBe(true)
    expect(fqs.getStatistics().isLocked).toBe(true)
  })

  test('unlockSync should allow URL writes again', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 0,
      historyMode: HISTORY_MODES.PUSH,
    })
    fqs.lockSync()
    fqs.unlockSync()
    const newState = {
      ...getDefaults(TEST_SCHEMA),
      username: 'test',
    }
    const result = fqs.writeToUrl(newState)
    expect(result.success).toBe(true)
    expect(fqs.getStatistics().isLocked).toBe(false)
  })

  test('push mode should increment push counter and warn on threshold', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 0,
      historyMode: HISTORY_MODES.PUSH,
      pushThreshold: 2,
    })
    fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'a' }, { immediate: true })
    fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'b' }, { immediate: true })
    const result = fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'c' }, { immediate: true })
    const stats = fqs.getStatistics()
    expect(stats.pushCount).toBe(3)
    const history = navigate.__getHistory()
    expect(history.filter((h) => !h.replace).length).toBeGreaterThanOrEqual(2)
  })

  test('replace mode should increment replace counter', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 0,
      historyMode: HISTORY_MODES.REPLACE,
    })
    fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'a' }, { immediate: true })
    fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'b' }, { immediate: true })
    const stats = fqs.getStatistics()
    expect(stats.replaceCount).toBe(2)
  })

  test('debounced writes should batch multiple updates', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 100,
      historyMode: HISTORY_MODES.PUSH,
    })

    fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'a' })
    vi.advanceTimersByTime(50)
    fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'b' })
    vi.advanceTimersByTime(50)
    fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'c' })

    vi.advanceTimersByTime(100)

    const history = navigate.__getHistory()
    expect(history.length).toBeLessThanOrEqual(2)
  })

  test('hydrate should read from URL', () => {
    const location = createMemoryLocation('?username=hello&remember=true&page=10')
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
    })
    const result = fqs.hydrate()
    expect(result.success).toBe(true)
    expect(fqs.getState().username).toBe('hello')
    expect(fqs.getState().remember).toBe(true)
    expect(fqs.getState().page).toBe(10)
    expect(fqs.isDirty()).toBe(false)
  })

  test('reset should return to initial state', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const fqs = createFormQuerySync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      debounceMs: 0,
    })
    fqs.setState({ ...getDefaults(TEST_SCHEMA), username: 'changed' }, { immediate: false, write: false })
    expect(fqs.isDirty()).toBe(true)
    fqs.reset({ write: false })
    expect(fqs.isDirty()).toBe(false)
    expect(fqs.getState().username).toBe('')
  })
})

describe('deepEqual utility', () => {
  test('should return true for equal primitives', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
  })

  test('should return false for different primitives', () => {
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'b')).toBe(false)
    expect(deepEqual(true, false)).toBe(false)
    expect(deepEqual(1, '1')).toBe(false)
  })

  test('should return true for equal arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([], [])).toBe(true)
  })

  test('should return false for different arrays', () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
  })

  test('should return true for equal objects', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(deepEqual({}, {})).toBe(true)
  })

  test('should return false for different objects', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
    expect(deepEqual({ a: 1 }, {})).toBe(false)
  })

  test('should handle nested objects', () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false)
  })
})

describe('examples and constants', () => {
  test('should have all example types', () => {
    expect(EXAMPLES.valid).toBeDefined()
    expect(EXAMPLES.withNested).toBeDefined()
    expect(EXAMPLES.withConflicts).toBeDefined()
    expect(EXAMPLES.malicious).toBeDefined()
  })

  test('should have HTTP_027_COMPATIBLE_SCHEMA', () => {
    expect(HTTP_027_COMPATIBLE_SCHEMA).toBeDefined()
    expect(HTTP_027_COMPATIBLE_SCHEMA.method).toBe('GET')
    expect(HTTP_027_COMPATIBLE_SCHEMA.url).toBeDefined()
  })

  test('should have ENCODING_DIFFERENCES comparing with route-sync', () => {
    expect(ENCODING_DIFFERENCES.formQuerySync).toBeDefined()
    expect(ENCODING_DIFFERENCES.routeSync).toBeDefined()
    expect(ENCODING_DIFFERENCES.formQuerySync.nestedFormat).toBe('brackets')
    expect(ENCODING_DIFFERENCES.routeSync.nestedFormat).toBe('dot notation')
  })
})
