import { DEFAULT_STORAGE_KEYS, STATE, NONCE, ERROR_CODES } from './constants.js'
import { createError } from './errors.js'
import { generateRandomString } from './pkce.js'

class MemoryStorage {
  constructor() {
    this._data = new Map()
  }

  getItem(key) {
    return this._data.get(key) ?? null
  }

  setItem(key, value) {
    this._data.set(key, value)
  }

  removeItem(key) {
    this._data.delete(key)
  }

  clear() {
    this._data.clear()
  }

  get length() {
    return this._data.size
  }

  key(index) {
    const keys = Array.from(this._data.keys())
    return keys[index] ?? null
  }
}

let storageInstance = null
let storageMode = 'sessionStorage'

export const isSessionStorageAvailable = () => {
  try {
    const testKey = '__oauth_test__'
    window.sessionStorage.setItem(testKey, testKey)
    window.sessionStorage.removeItem(testKey)
    return true
  } catch (e) {
    return false
  }
}

export const getStorage = () => {
  if (!storageInstance) {
    if (isSessionStorageAvailable()) {
      storageInstance = window.sessionStorage
      storageMode = 'sessionStorage'
    } else {
      storageInstance = new MemoryStorage()
      storageMode = 'memory'
    }
  }
  return storageInstance
}

export const getStorageMode = () => {
  getStorage()
  return storageMode
}

export const isMemoryFallback = () => {
  return getStorageMode() === 'memory'
}

export const generateState = (length = STATE.DEFAULT_LENGTH) => {
  return generateRandomString(length)
}

export const generateNonce = (length = NONCE.DEFAULT_LENGTH) => {
  return generateRandomString(length)
}

export const storeOAuthParams = (params, customKeys = {}) => {
  const storage = getStorage()
  const keys = { ...DEFAULT_STORAGE_KEYS, ...customKeys }

  const stateData = {
    value: params.state,
    createdAt: Date.now(),
    ttl: STATE.DEFAULT_TTL_MS,
    consumed: false,
  }

  storage.setItem(keys.STATE, JSON.stringify(stateData))

  if (params.nonce) {
    storage.setItem(keys.NONCE, params.nonce)
  }

  if (params.codeVerifier) {
    storage.setItem(keys.CODE_VERIFIER, params.codeVerifier)
  }

  storage.setItem(keys.AUTH_PARAMS, JSON.stringify({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    scope: params.scope,
  }))
}

export const getStoredState = (customKey) => {
  const storage = getStorage()
  const key = customKey || DEFAULT_STORAGE_KEYS.STATE
  const raw = storage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const getStoredNonce = (customKey) => {
  const storage = getStorage()
  const key = customKey || DEFAULT_STORAGE_KEYS.NONCE
  return storage.getItem(key)
}

export const getStoredCodeVerifier = (customKey) => {
  const storage = getStorage()
  const key = customKey || DEFAULT_STORAGE_KEYS.CODE_VERIFIER
  return storage.getItem(key)
}

export const getStoredAuthParams = (customKey) => {
  const storage = getStorage()
  const key = customKey || DEFAULT_STORAGE_KEYS.AUTH_PARAMS
  const raw = storage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const consumeState = (customKey) => {
  const storage = getStorage()
  const key = customKey || DEFAULT_STORAGE_KEYS.STATE
  const stateData = getStoredState(customKey)
  if (stateData) {
    stateData.consumed = true
    storage.setItem(key, JSON.stringify(stateData))
  }
}

export const validateState = (receivedState, customKey) => {
  const storedState = getStoredState(customKey)

  if (!storedState) {
    return { valid: false, error: createError(ERROR_CODES.STATE_MISMATCH, { reason: 'state_not_found' }) }
  }

  if (storedState.consumed) {
    return { valid: false, error: createError(ERROR_CODES.STATE_CONSUMED) }
  }

  if (storedState.value !== receivedState) {
    return { valid: false, error: createError(ERROR_CODES.STATE_MISMATCH, { reason: 'value_mismatch' }) }
  }

  const now = Date.now()
  if (storedState.createdAt + storedState.ttl < now) {
    return { valid: false, error: createError(ERROR_CODES.STATE_EXPIRED) }
  }

  return { valid: true }
}

export const clearOAuthParams = (customKeys = {}) => {
  const storage = getStorage()
  const keys = { ...DEFAULT_STORAGE_KEYS, ...customKeys }

  storage.removeItem(keys.STATE)
  storage.removeItem(keys.NONCE)
  storage.removeItem(keys.CODE_VERIFIER)
  storage.removeItem(keys.AUTH_PARAMS)
}

export const createSecureStorageWrapper = (options = {}) => {
  const { prefix = '', customKeys = {} } = options
  const keys = { ...DEFAULT_STORAGE_KEYS, ...customKeys }

  return {
    store: (params) => storeOAuthParams(params, keys),
    getState: () => getStoredState(keys.STATE),
    getNonce: () => getStoredNonce(keys.NONCE),
    getCodeVerifier: () => getStoredCodeVerifier(keys.CODE_VERIFIER),
    getAuthParams: () => getStoredAuthParams(keys.AUTH_PARAMS),
    validateState: (receivedState) => validateState(receivedState, keys.STATE),
    consumeState: () => consumeState(keys.STATE),
    clear: () => clearOAuthParams(keys),
    isMemoryFallback,
    getStorageMode,
  }
}
