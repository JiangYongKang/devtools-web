import {
    DEFAULT_DEBOUNCE_MS,
    HISTORY_MODES,
    HISTORY_PUSH_THRESHOLD,
    SCHEMA_TYPES,
    URL_LIMITS,
} from './constants.js'
import {
    ERROR_CODES,
    WARNING_CODES,
    createError,
    createWarning,
} from './errors.js'
import { getDefaults, zod } from './schema.js'
import {
    checkQueryLength,
    flattenObject,
    queryParamsToState,
    queryParamsToString,
    stateToQueryParams,
    stringToQueryParams,
} from './sharedEncoding.js'

function deepEqual(a, b) {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (typeof a === 'object') {
    if (Array.isArray(b)) return false
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }

  return false
}

function debounce(fn, delay) {
  let timerId = null
  const wrapped = (...args) => {
    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => fn(...args), delay)
  }
  wrapped.cancel = () => {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
  }
  wrapped.flush = () => {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
      fn()
    }
  }
  return wrapped
}

function mergeDefaults(state, defaults) {
  if (!defaults) return state || {}
  if (!state) return { ...defaults }

  const result = {}

  const allKeys = new Set([...Object.keys(defaults), ...Object.keys(state || {})])

  for (const key of allKeys) {
    const stateVal = state?.[key]
    const defaultVal = defaults[key]

    if (stateVal === undefined || stateVal === null) {
      if (defaultVal !== undefined) {
        result[key] = defaultVal
      }
      continue
    }

    if (
      typeof stateVal === 'object' &&
      stateVal !== null &&
      !Array.isArray(stateVal) &&
      !(stateVal instanceof Date) &&
      typeof defaultVal === 'object' &&
      defaultVal !== null &&
      !Array.isArray(defaultVal) &&
      !(defaultVal instanceof Date)
    ) {
      result[key] = mergeDefaults(stateVal, defaultVal)
    } else {
      result[key] = stateVal
    }
  }

  return result
}

function checkForFileOrBlobFields(state) {
  const errors = []
  
  function check(value, path = '') {
    if (value === null || value === undefined) return
    
    if (value instanceof File) {
      errors.push(createError(ERROR_CODES.FILE_FIELD_NOT_ALLOWED, path || 'root'))
      return
    }
    if (value instanceof Blob) {
      errors.push(createError(ERROR_CODES.BLOB_FIELD_NOT_ALLOWED, path || 'root'))
      return
    }
    
    if (Array.isArray(value)) {
      value.forEach((item, index) => check(item, `${path}[${index}]`))
      return
    }
    
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      for (const [key, val] of Object.entries(value)) {
        check(val, path ? `${path}.${key}` : key)
      }
    }
  }
  
  check(state)
  return errors
}

function formToQuery(formState, schema, options = {}) {
  const warnings = []
  const errors = []

  const fileErrors = checkForFileOrBlobFields(formState)
  if (fileErrors.length > 0) {
    errors.push(...fileErrors)
    return {
      queryString: '',
      params: {},
      warnings,
      errors,
      success: false,
    }
  }

  const params = stateToQueryParams(formState, schema, warnings)
  const queryString = queryParamsToString(params, { encode: true, sortKeys: true })

  const { maxLength = URL_LIMITS.MAX_QUERY_STRING_LENGTH, rejectOnExceed = false } = options
  const lengthCheck = checkQueryLength(queryString, maxLength)

  if (!lengthCheck.allowed) {
    if (rejectOnExceed) {
      errors.push(createError(ERROR_CODES.URL_LENGTH_EXCEEDED, null, lengthCheck.length))
      return {
        queryString,
        params,
        warnings,
        errors,
        success: false,
      }
    } else {
      warnings.push(
        createWarning(
          WARNING_CODES.URL_LENGTH_EXCEEDED,
          null,
          lengthCheck.length,
          `URL 查询串超过 ${maxLength} 字符限制`
        )
      )
    }
  }

  return {
    queryString,
    params,
    warnings,
    errors,
    success: true,
  }
}

function queryToForm(queryStringOrParams, schema, options = {}) {
  const { mergeWithDefaults = true } = options
  const warnings = []

  let params
  if (typeof queryStringOrParams === 'string') {
    params = stringToQueryParams(queryStringOrParams)
  } else {
    params = queryStringOrParams || {}
  }

  const state = queryParamsToState(params, schema, warnings)

  const merged = mergeWithDefaults
    ? mergeDefaults(state, getDefaults(schema))
    : state

  return {
    state: merged,
    rawParams: params,
    warnings,
  }
}

function partialUpdate(currentState, updates) {
  if (!updates || typeof updates !== 'object') {
    return { state: currentState, changed: false }
  }

  const newState = JSON.parse(JSON.stringify(currentState))
  let changed = false

  function applyUpdates(target, updateObj) {
    for (const [key, value] of Object.entries(updateObj)) {
      if (
        value !== null &&
        value !== undefined &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        target[key] !== null &&
        target[key] !== undefined &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key]) &&
        !(target[key] instanceof Date)
      ) {
        applyUpdates(target[key], value)
      } else {
        if (!deepEqual(target[key], value)) {
          target[key] = value
          changed = true
        }
      }
    }
  }

  applyUpdates(newState, updates)

  return {
    state: newState,
    changed,
  }
}

function isDirty(currentState, initialState) {
  return !deepEqual(currentState, initialState)
}

function getDirtyFields(currentState, initialState) {
  const dirtyFields = []

  function check(current, initial, path = '') {
    const allKeys = new Set([
      ...Object.keys(current || {}),
      ...Object.keys(initial || {}),
    ])

    for (const key of allKeys) {
      const currentVal = current?.[key]
      const initialVal = initial?.[key]
      const fullPath = path ? `${path}.${key}` : key

      if (
        currentVal !== null &&
        currentVal !== undefined &&
        typeof currentVal === 'object' &&
        !Array.isArray(currentVal) &&
        !(currentVal instanceof Date) &&
        initialVal !== null &&
        initialVal !== undefined &&
        typeof initialVal === 'object' &&
        !Array.isArray(initialVal) &&
        !(initialVal instanceof Date)
      ) {
        check(currentVal, initialVal, fullPath)
      } else if (!deepEqual(currentVal, initialVal)) {
        dirtyFields.push(fullPath)
      }
    }
  }

  check(currentState, initialState)
  return dirtyFields
}

function validateForm(formState, schema) {
  const warnings = []
  const errors = []

  function validate(value, fieldSchema, path = '') {
    if (fieldSchema?.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: path,
        message: `${path} 是必填字段`,
        type: 'required',
      })
      return
    }

    if (value === null || value === undefined) return

    if (fieldSchema?.type === SCHEMA_TYPES.NUMBER) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push({
          field: path,
          message: `${path} 必须是有效数字`,
          type: 'number',
        })
      }
    } else if (fieldSchema?.type === SCHEMA_TYPES.ENUM) {
      if (!fieldSchema.values?.includes(value)) {
        errors.push({
          field: path,
          message: `${path} 必须是 ${fieldSchema.values?.join(', ')} 之一`,
          type: 'enum',
        })
      }
    } else if (fieldSchema?.type === SCHEMA_TYPES.DATE) {
      const date = value instanceof Date ? value : new Date(value)
      if (isNaN(date.getTime())) {
        errors.push({
          field: path,
          message: `${path} 必须是有效日期`,
          type: 'date',
        })
      }
    }
  }

  const flatState = flattenObject(formState)
  const flatSchema = {}

  function flattenSchema(s, prefix = '') {
    if (!s) return
    if (s.type === SCHEMA_TYPES.OBJECT) {
      for (const [key, fieldSchema] of Object.entries(s.fields || {})) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (fieldSchema.type === SCHEMA_TYPES.OBJECT) {
          flattenSchema(fieldSchema, fullKey)
        } else {
          flatSchema[fullKey] = fieldSchema
        }
      }
    }
  }

  flattenSchema(schema)

  for (const [path, fieldSchema] of Object.entries(flatSchema)) {
    const parts = path.split('.')
    let value = formState
    for (const part of parts) {
      value = value?.[part]
    }
    validate(value, fieldSchema, path)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

function createAsyncValidator(delayMs = 300) {
  let currentController = null

  return async (value, validateFn) => {
    if (currentController) {
      currentController.abort()
    }

    const controller = new AbortController()
    currentController = controller

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (controller.signal.aborted) {
          reject({ aborted: true })
          return
        }

        try {
          const result = validateFn(value)
          resolve(result)
        } catch (err) {
          reject(err)
        } finally {
          if (currentController === controller) {
            currentController = null
          }
        }
      }, delayMs)

      controller.signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject({ aborted: true })
      })
    })
  }
}

function createFormQuerySync(options = {}) {
  const {
    schema,
    location,
    navigate,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    historyMode = HISTORY_MODES.PUSH,
    maxQueryLength = URL_LIMITS.MAX_QUERY_STRING_LENGTH,
    pushThreshold = HISTORY_PUSH_THRESHOLD,
  } = options

  let currentState = getDefaults(schema)
  let initialState = JSON.parse(JSON.stringify(currentState))
  let pushCount = 0
  let replaceCount = 0
  let syncLocked = false
  let lockReason = null

  function getLocation() {
    return location
  }

  function getNavigate() {
    return navigate
  }

  function hasHistorySupport() {
    return !!(getLocation() && getNavigate())
  }

  function getState() {
    return JSON.parse(JSON.stringify(currentState))
  }

  function getInitialState() {
    return JSON.parse(JSON.stringify(initialState))
  }

  function setInitialState(newInitial) {
    initialState = JSON.parse(JSON.stringify(newInitial))
  }

  function isDirty() {
    return !deepEqual(currentState, initialState)
  }

  function getDirtyFieldsWrapper() {
    return getDirtyFields(currentState, initialState)
  }

  function getStatistics() {
    return {
      pushCount,
      replaceCount,
      isLocked: syncLocked,
      lockReason,
    }
  }

  function lockSync(reason = '用户编辑中') {
    syncLocked = true
    lockReason = reason
  }

  function unlockSync() {
    syncLocked = false
    lockReason = null
  }

  function formToQueryWrapper(state, opts = {}) {
    return formToQuery(state, schema, {
      maxLength: maxQueryLength,
      rejectOnExceed: opts.rejectOnExceed || false,
    })
  }

  function queryToFormWrapper(queryStr, opts = {}) {
    return queryToForm(queryStr, schema, opts)
  }

  function readFromUrl() {
    if (!hasHistorySupport()) {
      return { state: getDefaults(schema), warnings: [] }
    }

    const loc = getLocation()
    const search = loc?.search || ''
    return queryToFormWrapper(search)
  }

  function writeToUrl(state, mode = historyMode) {
    if (syncLocked) {
      return {
        success: false,
        queryString: '',
        warnings: [],
        errors: [createError(ERROR_CODES.SYNC_LOCKED, null, null, lockReason)],
      }
    }

    const result = formToQueryWrapper(state, { rejectOnExceed: true })

    if (!result.success || result.errors.length > 0) {
      return result
    }

    if (!hasHistorySupport()) {
      return {
        ...result,
        success: false,
        warnings: [
          ...result.warnings,
          createWarning(WARNING_CODES.HISTORY_API_UNAVAILABLE),
        ],
      }
    }

    if (mode === HISTORY_MODES.PUSH) {
      pushCount++
      if (pushCount > pushThreshold) {
        result.warnings.push(
          createWarning(
            WARNING_CODES.HISTORY_PUSH_THRESHOLD_EXCEEDED,
            null,
            pushCount,
            `连续 push 次数 (${pushCount}) 超过阈值 (${pushThreshold})，可能污染后退栈`
          )
        )
      }
    } else {
      replaceCount++
    }

    const nav = getNavigate()
    nav(
      { search: result.queryString ? `?${result.queryString}` : '' },
      { replace: mode === HISTORY_MODES.REPLACE }
    )

    return {
      ...result,
      success: true,
    }
  }

  const debouncedWriteToUrl = debounce((state, mode) => {
    writeToUrl(state, mode)
  }, debounceMs)

  function setState(newState, opts = {}) {
    const {
      write = true,
      immediate = false,
      mode,
      updateInitial = false,
    } = opts

    if (deepEqual(newState, currentState)) {
      return { changed: false, state: currentState }
    }

    currentState = JSON.parse(JSON.stringify(newState))

    if (updateInitial) {
      initialState = JSON.parse(JSON.stringify(currentState))
    }

    if (write && !syncLocked) {
      if (immediate) {
        writeToUrl(currentState, mode || historyMode)
      } else {
        debouncedWriteToUrl(currentState, mode || historyMode)
      }
    }

    return { changed: true, state: currentState }
  }

  function updatePartial(updates, opts = {}) {
    const result = partialUpdate(currentState, updates)
    if (result.changed) {
      return setState(result.state, opts)
    }
    return { changed: false, state: currentState }
  }

  function reset(opts = {}) {
    return setState(initialState, { ...opts, updateInitial: false })
  }

  function hydrate() {
    const result = readFromUrl()
    const { state, warnings } = result

    currentState = JSON.parse(JSON.stringify(state))
    initialState = JSON.parse(JSON.stringify(state))

    return { success: true, state, warnings }
  }

  function cancelPendingWrite() {
    debouncedWriteToUrl.cancel()
  }

  function flushPendingWrite() {
    debouncedWriteToUrl.flush()
  }

  return {
    getState,
    getInitialState,
    setInitialState,
    isDirty,
    getDirtyFields: getDirtyFieldsWrapper,
    getStatistics,
    lockSync,
    unlockSync,
    formToQuery: formToQueryWrapper,
    queryToForm: queryToFormWrapper,
    readFromUrl,
    writeToUrl,
    setState,
    updatePartial,
    reset,
    hydrate,
    cancelPendingWrite,
    flushPendingWrite,
    validate: (state = currentState) => validateForm(state, schema),
  }
}

const ENCODING_DIFFERENCES = {
  formQuerySync: {
    nestedFormat: 'brackets',
    example: 'user[name]=test&user[age]=30',
    dateFormat: 'YYYY-MM-DD',
    arrayEncoding: 'repeated keys',
  },
  routeSync: {
    nestedFormat: 'dot notation',
    example: 'user.name=test&user.age=30',
    dateFormat: 'not supported',
    arrayEncoding: 'repeated keys',
  },
}

const EXAMPLES = {
  valid: {
    name: '合法查询串',
    queryString: 'username=admin&tags=react&tags=node&page=1',
  },
  withNested: {
    name: '包含嵌套字段',
    queryString: 'user[name]=admin&user[email]=admin@example.com&page=1',
  },
  withConflicts: {
    name: '包含冲突键',
    queryString: 'user=hello&user[name]=admin&tags=a&tags=a',
  },
  malicious: {
    name: '恶意超长查询串',
    queryString: 'name=' + 'a'.repeat(3000) + '&count=42',
  },
}

const HTTP_027_COMPATIBLE_SCHEMA = {
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: { 'Content-Type': 'application/json' },
  params: { page: 1, limit: 10 },
  body: null,
}

export {
    ENCODING_DIFFERENCES, ERROR_CODES, EXAMPLES, HISTORY_MODES, HTTP_027_COMPATIBLE_SCHEMA, SCHEMA_TYPES, URL_LIMITS,
    WARNING_CODES, createAsyncValidator,
    createFormQuerySync, debounce, deepEqual, formToQuery, getDefaults, getDirtyFields, isDirty, partialUpdate, queryToForm, validateForm, zod
}

