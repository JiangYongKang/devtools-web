import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  HISTORY_MODES,
  URL_LIMITS,
  WARNING_CODES,
  zod,
  debounce,
  flattenObject,
  unflattenObject,
  serializeState,
  deserializeState,
  saveToSessionStorage,
  loadFromSessionStorage,
  compressStateToQueryParams,
  compressStateToQueryString,
  getMinimalShareUrl,
  getFullShareUrl,
  createRouteSync,
  deepEqual,
  getDefaults,
  EXAMPLES,
} from '../logic/index.js'

const TEST_SCHEMA = zod.object({
  name: zod.string({ default: '' }),
  active: zod.boolean({ default: false }),
  count: zod.number({ default: 0 }),
  theme: zod.enum(['light', 'dark', 'auto'], { default: 'light' }),
  tags: zod.array(zod.string(), { default: [] }),
  config: zod.object({
    autoSave: zod.boolean({ default: true }),
    fontSize: zod.number({ default: 14 }),
  }),
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

function createMemoryStorage() {
  const store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value },
    removeItem: (key) => { delete store[key] },
  }
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
    expect(defaults.name).toBe('')
    expect(defaults.active).toBe(false)
    expect(defaults.count).toBe(0)
    expect(defaults.theme).toBe('light')
    expect(defaults.tags).toEqual([])
    expect(defaults.config.autoSave).toBe(true)
    expect(defaults.config.fontSize).toBe(14)
  })

  test('zod.enum should accept values array', () => {
    const schema = zod.enum(['a', 'b', 'c'], { default: 'a' })
    expect(schema.type).toBe('enum')
    expect(schema.values).toEqual(['a', 'b', 'c'])
    expect(schema.default).toBe('a')
  })

  test('zod.array should have items schema', () => {
    const itemSchema = zod.string()
    const schema = zod.array(itemSchema, { default: [] })
    expect(schema.type).toBe('array')
    expect(schema.items).toBe(itemSchema)
    expect(schema.default).toEqual([])
  })
})

describe('flatten/unflatten utilities', () => {
  test('flattenObject should flatten nested objects with dot notation', () => {
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
    expect(flattened['b.c']).toBe(2)
    expect(flattened['b.d.e']).toBe(3)
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
    expect(flattened['config.items']).toEqual([1, 2])
  })

  test('unflattenObject should reconstruct nested objects', () => {
    const flat = {
      a: 1,
      'b.c': 2,
      'b.d.e': 3,
    }
    const reconstructed = unflattenObject(flat)
    expect(reconstructed.a).toBe(1)
    expect(reconstructed.b.c).toBe(2)
    expect(reconstructed.b.d.e).toBe(3)
  })

  test('unflattenObject should skip invalid keys', () => {
    const warnings = []
    const flat = {
      a: 1,
      '123invalid': 2,
    }
    const reconstructed = unflattenObject(flat, warnings)
    expect(reconstructed.a).toBe(1)
    expect(reconstructed['123invalid']).toBeUndefined()
    expect(warnings.length).toBeGreaterThan(0)
  })

  test('flatten/unflatten roundtrip', () => {
    const original = {
      name: 'test',
      active: true,
      config: {
        autoSave: false,
        fontSize: 16,
      },
    }
    const flattened = flattenObject(original)
    const reconstructed = unflattenObject(flattened)
    expect(reconstructed).toEqual(original)
  })
})

describe('serialization/deserialization', () => {
  test('serializeState should convert state to query string', () => {
    const state = {
      name: 'test',
      active: true,
      count: 42,
      theme: 'dark',
    }
    const result = serializeState(state, TEST_SCHEMA)
    expect(result.queryString).toContain('name=test')
    expect(result.queryString).toContain('active=true')
    expect(result.queryString).toContain('count=42')
    expect(result.queryString).toContain('theme=dark')
    expect(result.warnings).toEqual([])
  })

  test('serializeState should encode nested objects with dot notation', () => {
    const state = {
      config: {
        autoSave: false,
        fontSize: 18,
      },
    }
    const result = serializeState(state, TEST_SCHEMA)
    expect(result.queryString).toContain('config.autoSave=false')
    expect(result.queryString).toContain('config.fontSize=18')
  })

  test('serializeState should encode arrays as repeated keys', () => {
    const state = {
      tags: ['a', 'b', 'c'],
    }
    const result = serializeState(state, TEST_SCHEMA)
    const pairs = result.queryString.split('&')
    const tagEntries = pairs.filter((p) => p.startsWith('tags='))
    expect(tagEntries.length).toBe(3)
    expect(tagEntries).toContain('tags=a')
    expect(tagEntries).toContain('tags=b')
    expect(tagEntries).toContain('tags=c')
  })

  test('deserializeState should parse query string back to state', () => {
    const queryString = 'name=test&active=true&count=42&theme=dark'
    const result = deserializeState(queryString, TEST_SCHEMA)
    expect(result.state.name).toBe('test')
    expect(result.state.active).toBe(true)
    expect(result.state.count).toBe(42)
    expect(result.state.theme).toBe('dark')
  })

  test('deserializeState should handle nested objects with dot notation', () => {
    const queryString = 'config.autoSave=false&config.fontSize=18'
    const result = deserializeState(queryString, TEST_SCHEMA)
    expect(result.state.config.autoSave).toBe(false)
    expect(result.state.config.fontSize).toBe(18)
  })

  test('deserializeState should handle arrays from repeated keys', () => {
    const queryString = 'tags=a&tags=b&tags=c'
    const result = deserializeState(queryString, TEST_SCHEMA)
    expect(result.state.tags).toEqual(['a', 'b', 'c'])
  })

  test('serialize/deserialize roundtrip', () => {
    const original = {
      name: 'hello world',
      active: true,
      count: 123,
      theme: 'auto',
      tags: ['x', 'y', 'z'],
      config: {
        autoSave: false,
        fontSize: 20,
      },
    }
    const serialized = serializeState(original, TEST_SCHEMA)
    const deserialized = deserializeState(serialized.queryString, TEST_SCHEMA)
    expect(deserialized.state.name).toBe(original.name)
    expect(deserialized.state.active).toBe(original.active)
    expect(deserialized.state.count).toBe(original.count)
    expect(deserialized.state.theme).toBe(original.theme)
    expect(deserialized.state.tags).toEqual(original.tags)
    expect(deserialized.state.config.autoSave).toBe(original.config.autoSave)
    expect(deserialized.state.config.fontSize).toBe(original.config.fontSize)
  })

  test('deserializeState should handle alternative boolean strings', () => {
    const tests = [
      ['active=1', true],
      ['active=yes', true],
      ['active=on', true],
      ['active=0', false],
      ['active=no', false],
      ['active=off', false],
    ]
    for (const [qs, expected] of tests) {
      const result = deserializeState(qs, TEST_SCHEMA)
      expect(result.state.active).toBe(expected)
    }
  })

  test('deserializeState should handle + and %20 as space', () => {
    const result1 = deserializeState('name=hello+world', TEST_SCHEMA)
    const result2 = deserializeState('name=hello%20world', TEST_SCHEMA)
    expect(result1.state.name).toBe('hello world')
    expect(result2.state.name).toBe('hello world')
  })
})

describe('warnings for invalid parameters', () => {
  test('should generate warning for invalid boolean', () => {
    const result = deserializeState('active=maybe', TEST_SCHEMA)
    const boolWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.INVALID_BOOLEAN)
    expect(boolWarnings.length).toBe(1)
    expect(boolWarnings[0].field).toBe('active')
  })

  test('should generate warning for invalid number', () => {
    const result = deserializeState('count=notanumber', TEST_SCHEMA)
    const numWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.INVALID_NUMBER)
    expect(numWarnings.length).toBe(1)
    expect(numWarnings[0].field).toBe('count')
  })

  test('should generate warning for invalid enum value', () => {
    const result = deserializeState('theme=invalid', TEST_SCHEMA)
    const enumWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.INVALID_ENUM_VALUE)
    expect(enumWarnings.length).toBe(1)
    expect(enumWarnings[0].field).toBe('theme')
  })

  test('should generate warning for invalid percent sequence', () => {
    const result = deserializeState('name=test%G0', TEST_SCHEMA)
    const percentWarnings = result.warnings.filter((w) => w.code === WARNING_CODES.INVALID_PERCENT_SEQUENCE)
    expect(percentWarnings.length).toBeGreaterThan(0)
  })

  test('should not crash on invalid enum but keep defaults', () => {
    const result = deserializeState('theme=invalid', TEST_SCHEMA)
    expect(result.state.theme).toBe('light')
  })

  test('should generate multiple warnings for multiple invalid fields', () => {
    const result = deserializeState('active=bad&count=xyz&theme=nope', TEST_SCHEMA)
    expect(result.warnings.length).toBeGreaterThanOrEqual(3)
  })
})

describe('URL length truncation', () => {
  test('serializeState should truncate query string when too long', () => {
    const longValue = 'a'.repeat(3000)
    const state = {
      name: longValue,
      active: true,
    }
    const result = serializeState(state, TEST_SCHEMA, { maxLength: 100 })
    expect(result.truncated).toBe(true)
    expect(result.warnings.some((w) => w.code === WARNING_CODES.URL_LENGTH_EXCEEDED)).toBe(true)
    expect(result.queryString.length).toBeLessThanOrEqual(100)
  })

  test('serializeState should not truncate when under limit', () => {
    const state = { name: 'short' }
    const result = serializeState(state, TEST_SCHEMA, { maxLength: 1000 })
    expect(result.truncated).toBe(false)
  })
})

describe('compression and minimal share URLs', () => {
  test('compressStateToQueryParams should exclude default values', () => {
    const state = getDefaults(TEST_SCHEMA)
    const compressed = compressStateToQueryParams(state, TEST_SCHEMA)
    expect(Object.keys(compressed).length).toBe(0)
  })

  test('compressStateToQueryParams should include only non-default values', () => {
    const state = {
      ...getDefaults(TEST_SCHEMA),
      name: 'test',
      theme: 'dark',
    }
    const compressed = compressStateToQueryParams(state, TEST_SCHEMA)
    expect(compressed.name).toBeDefined()
    expect(compressed.theme).toBeDefined()
    expect(compressed.active).toBeUndefined()
    expect(compressed.count).toBeUndefined()
  })

  test('getMinimalShareUrl should produce shorter URL than getFullShareUrl', () => {
    const location = {
      origin: 'https://example.com',
      pathname: '/test',
    }
    const state = getDefaults(TEST_SCHEMA)
    state.name = 'test'

    const warnings = []
    const full = getFullShareUrl(location, state, TEST_SCHEMA, warnings)
    const minimal = getMinimalShareUrl(location, state, TEST_SCHEMA, warnings)

    expect(minimal.length).toBeLessThanOrEqual(full.length)
  })

  test('compressStateToQueryString should be stable (sorted keys)', () => {
    const state = {
      name: 'a',
      theme: 'dark',
      count: 1,
    }
    const result1 = compressStateToQueryString(state, TEST_SCHEMA)
    const result2 = compressStateToQueryString(state, TEST_SCHEMA)
    expect(result1).toBe(result2)
  })
})

describe('session storage backup', () => {
  test('saveToSessionStorage should save state to storage', () => {
    const storage = createMemoryStorage()
    const state = { name: 'test' }
    const result = saveToSessionStorage(storage, state)
    expect(result.success).toBe(true)
    const loaded = loadFromSessionStorage(storage)
    expect(loaded.success).toBe(true)
    expect(loaded.state).toEqual(state)
  })

  test('loadFromSessionStorage should return null when no data', () => {
    const storage = createMemoryStorage()
    const result = loadFromSessionStorage(storage)
    expect(result.success).toBe(false)
    expect(result.state).toBeNull()
  })

  test('saveToSessionStorage should fail when no storage', () => {
    const result = saveToSessionStorage(null, {})
    expect(result.success).toBe(false)
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
})

describe('createRouteSync integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should create route sync instance', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      storage,
      debounceMs: 100,
      historyMode: HISTORY_MODES.PUSH,
    })
    expect(rs.getState()).toEqual(getDefaults(TEST_SCHEMA))
    expect(rs.getVersion()).toBe(0)
  })

  test('setState should update internal state', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      storage,
      debounceMs: 0,
      historyMode: HISTORY_MODES.PUSH,
    })
    const newState = {
      ...getDefaults(TEST_SCHEMA),
      name: 'updated',
    }
    const result = rs.setState(newState, { immediate: true })
    expect(result.changed).toBe(true)
    expect(rs.getState().name).toBe('updated')
    expect(rs.getVersion()).toBe(1)
  })

  test('setState should not update if state unchanged', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      storage,
      debounceMs: 0,
      historyMode: HISTORY_MODES.PUSH,
    })
    const current = rs.getState()
    const result = rs.setState(current, { immediate: true })
    expect(result.changed).toBe(false)
  })

  test('push mode should increment push counter', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      storage,
      debounceMs: 0,
      historyMode: HISTORY_MODES.PUSH,
    })
    rs.setState({ ...getDefaults(TEST_SCHEMA), name: 'a' }, { immediate: true })
    rs.setState({ ...getDefaults(TEST_SCHEMA), name: 'b' }, { immediate: true })
    rs.setState({ ...getDefaults(TEST_SCHEMA), name: 'c' }, { immediate: true })
    const stats = rs.getStatistics()
    expect(stats.pushCount).toBe(3)
    expect(stats.replaceCount).toBe(0)
  })

  test('replace mode should increment replace counter', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      storage,
      debounceMs: 0,
      historyMode: HISTORY_MODES.REPLACE,
    })
    rs.setState({ ...getDefaults(TEST_SCHEMA), name: 'a' }, { immediate: true })
    rs.setState({ ...getDefaults(TEST_SCHEMA), name: 'b' }, { immediate: true })
    const stats = rs.getStatistics()
    expect(stats.replaceCount).toBe(2)
    expect(stats.pushCount).toBe(0)
  })

  test('debounced writes should batch multiple updates', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      storage,
      debounceMs: 100,
      historyMode: HISTORY_MODES.PUSH,
    })

    rs.setState({ ...getDefaults(TEST_SCHEMA), name: 'a' })
    vi.advanceTimersByTime(50)
    rs.setState({ ...getDefaults(TEST_SCHEMA), name: 'b' })
    vi.advanceTimersByTime(50)
    rs.setState({ ...getDefaults(TEST_SCHEMA), name: 'c' })

    vi.advanceTimersByTime(100)

    const history = navigate.__getHistory()
    expect(history.length).toBeLessThanOrEqual(2)
  })

  test('hydrate should read from URL', () => {
    const location = createMemoryLocation('?name=hello&active=true&count=10')
    const navigate = createMemoryNavigate()
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      storage,
    })
    const result = rs.hydrate()
    expect(result.success).toBe(true)
    expect(rs.getState().name).toBe('hello')
    expect(rs.getState().active).toBe(true)
    expect(rs.getState().count).toBe(10)
  })

  test('should return warning when history API unavailable', () => {
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location: null,
      navigate: null,
      storage,
    })
    const newState = { ...getDefaults(TEST_SCHEMA), name: 'test' }
    const result = rs.writeToUrl(newState)
    expect(result.success).toBe(false)
    expect(result.warnings.some((w) => w.code === WARNING_CODES.HISTORY_API_UNAVAILABLE)).toBe(true)
  })

  test('generateShareUrls should return full and minimal URLs', () => {
    const location = createMemoryLocation()
    const navigate = createMemoryNavigate()
    const storage = createMemoryStorage()
    const rs = createRouteSync({
      schema: TEST_SCHEMA,
      location,
      navigate,
      storage,
    })
    const urls = rs.generateShareUrls()
    expect(urls.full).toBeDefined()
    expect(urls.minimal).toBeDefined()
    expect(urls.full.startsWith('https://')).toBe(true)
    expect(urls.minimal.startsWith('https://')).toBe(true)
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

describe('examples', () => {
  test('should have valid, partialInvalid, and malicious examples', () => {
    expect(EXAMPLES.valid).toBeDefined()
    expect(EXAMPLES.partialInvalid).toBeDefined()
    expect(EXAMPLES.malicious).toBeDefined()
  })

  test('valid example should deserialize without warnings', () => {
    const result = deserializeState(EXAMPLES.valid.queryString, TEST_SCHEMA)
    expect(result.state.name).toBeDefined()
  })

  test('partialInvalid example should generate some warnings', () => {
    const result = deserializeState(EXAMPLES.partialInvalid.queryString, TEST_SCHEMA)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  test('malicious example should be truncated', () => {
    const result = serializeState(
      { name: 'a'.repeat(3000) },
      TEST_SCHEMA,
      { maxLength: 200 }
    )
    expect(result.truncated).toBe(true)
  })
})
