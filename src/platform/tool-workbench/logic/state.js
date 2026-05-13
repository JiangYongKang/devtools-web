import {
  SESSION_STORAGE_KEYS,
  OUTPUT_FORMATS,
  DISPLAY_STATES,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
} from './errors.js'

function readSessionStorage(key, defaultValue) {
  try {
    if (typeof sessionStorage === 'undefined') {
      return defaultValue
    }
    const raw = sessionStorage.getItem(key)
    if (raw == null) return defaultValue
    return JSON.parse(raw)
  } catch (err) {
    console.error(`Failed to read from sessionStorage: ${key}`, err)
    return defaultValue
  }
}

function writeSessionStorage(key, value) {
  try {
    if (typeof sessionStorage === 'undefined') {
      return false
    }
    sessionStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`Failed to write to sessionStorage: ${key}`, err)
    return false
  }
}

function clearSessionStorage(key) {
  try {
    if (typeof sessionStorage === 'undefined') {
      return false
    }
    sessionStorage.removeItem(key)
    return true
  } catch (err) {
    console.error(`Failed to clear sessionStorage: ${key}`, err)
    return false
  }
}

function loadLayoutTopology(defaultValue) {
  return readSessionStorage(SESSION_STORAGE_KEYS.LAYOUT_TOPOLOGY, defaultValue)
}

function saveLayoutTopology(topology) {
  return writeSessionStorage(SESSION_STORAGE_KEYS.LAYOUT_TOPOLOGY, topology)
}

function loadSidebarVisible(defaultValue = false) {
  return readSessionStorage(SESSION_STORAGE_KEYS.SIDEBAR_VISIBLE, defaultValue)
}

function saveSidebarVisible(visible) {
  return writeSessionStorage(SESSION_STORAGE_KEYS.SIDEBAR_VISIBLE, visible)
}

function loadOutputFormat(defaultValue = OUTPUT_FORMATS.PLAIN_TEXT) {
  return readSessionStorage(SESSION_STORAGE_KEYS.OUTPUT_FORMAT, defaultValue)
}

function saveOutputFormat(format) {
  return writeSessionStorage(SESSION_STORAGE_KEYS.OUTPUT_FORMAT, format)
}

function loadTreeCollapseState(defaultValue = {}) {
  return readSessionStorage(SESSION_STORAGE_KEYS.TREE_COLLAPSE_STATE, defaultValue)
}

function saveTreeCollapseState(state) {
  return writeSessionStorage(SESSION_STORAGE_KEYS.TREE_COLLAPSE_STATE, state)
}

function toggleTreeCollapseState(state, path) {
  const newState = { ...state }
  const pathStr = Array.isArray(path) ? path.join('.') : path
  if (newState[pathStr]) {
    delete newState[pathStr]
  } else {
    newState[pathStr] = true
  }
  return newState
}

function isPathCollapsed(state, path) {
  const pathStr = Array.isArray(path) ? path.join('.') : path
  return !!state[pathStr]
}

function validateDisplayState(state) {
  return Object.values(DISPLAY_STATES).includes(state)
}

function getDefaultDisplayState() {
  return DISPLAY_STATES.EMPTY
}

export {
  readSessionStorage,
  writeSessionStorage,
  clearSessionStorage,
  loadLayoutTopology,
  saveLayoutTopology,
  loadSidebarVisible,
  saveSidebarVisible,
  loadOutputFormat,
  saveOutputFormat,
  loadTreeCollapseState,
  saveTreeCollapseState,
  toggleTreeCollapseState,
  isPathCollapsed,
  validateDisplayState,
  getDefaultDisplayState,
}
