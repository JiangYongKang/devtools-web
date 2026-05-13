
import {
  LOADING_STATES,
  LOADING_STATE_TRANSITIONS,
  EMPTY_STATE_TYPES,
  EMPTY_STATE_DICTIONARY,
  NOTIFICATION_SEVERITY,
  NOTIFICATION_TYPES,
  DEFAULTS,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
} from './errors.js'

let tokenCounter = 0

function generateToken() {
  return `loading-token-${++tokenCounter}-${Date.now()}`
}

function transitionLoadingState(currentState, action) {
  const transitions = LOADING_STATE_TRANSITIONS[currentState]
  if (!transitions || !transitions[action]) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_STATE_TRANSITION),
      state: currentState,
    }
  }
  return {
    success: true,
    state: transitions[action],
  }
}

function createLoadingStateManager() {
  const state = {
    current: LOADING_STATES.IDLE,
    count: 0,
    tokens: new Set(),
  }

  function getState() {
    return {
      current: state.current,
      count: state.count,
      isLoading: state.current === LOADING_STATES.LOADING,
      tokenCount: state.tokens.size,
    }
  }

  function start(token = null) {
    const useToken = token || generateToken()
    const isNewToken = !state.tokens.has(useToken)
    
    if (isNewToken) {
      state.tokens.add(useToken)
      state.count++
    }

    if (state.current !== LOADING_STATES.LOADING) {
      const result = transitionLoadingState(state.current, 'START')
      if (result.success) {
        state.current = result.state
      }
    }

    return {
      success: true,
      token: useToken,
      count: state.count,
      isLoading: true,
    }
  }

  function finish(token = null) {
    if (token) {
      if (!state.tokens.has(token)) {
        return {
          success: false,
          error: createError(ERROR_CODES.INVALID_TOKEN),
        }
      }
      state.tokens.delete(token)
      state.count = Math.max(0, state.count - 1)
    } else {
      state.tokens.clear()
      state.count = 0
    }

    if (state.count === 0 && state.current === LOADING_STATES.LOADING) {
      const result = transitionLoadingState(state.current, 'SUCCEED')
      if (result.success) {
        state.current = result.state
      }
    }

    return {
      success: true,
      count: state.count,
      isLoading: state.count > 0,
    }
  }

  function fail() {
    state.tokens.clear()
    state.count = 0
    const result = transitionLoadingState(state.current, 'FAIL')
    if (result.success) {
      state.current = result.state
    }
    return {
      success: true,
      count: 0,
      isLoading: false,
    }
  }

  function reset() {
    state.tokens.clear()
    state.count = 0
    state.current = LOADING_STATES.IDLE
    return {
      success: true,
      count: 0,
      isLoading: false,
    }
  }

  return {
    getState,
    start,
    finish,
    fail,
    reset,
    generateToken,
  }
}

function getEmptyStateText(type, overrides = {}) {
  if (!EMPTY_STATE_TYPES[type]) {
    return {
      success: false,
      error: createError(ERROR_CODES.INVALID_EMPTY_STATE_TYPE),
    }
  }

  const base = EMPTY_STATE_DICTIONARY[type]
  return {
    success: true,
    title: overrides.title || base.title,
    description: overrides.description || base.description,
    action: overrides.action || base.action,
  }
}

function createOfflineDetector(windowRef = null) {
  const state = {
    isOnline: true,
    listeners: [],
  }

  const getNavigator = () => {
    if (windowRef && windowRef.navigator) {
      return windowRef.navigator
    }
    if (typeof navigator !== 'undefined') {
      return navigator
    }
    return null
  }

  const getWindow = () => {
    if (windowRef) return windowRef
    if (typeof window !== 'undefined') return window
    return null
  }

  function init() {
    const nav = getNavigator()
    if (nav && typeof nav.onLine === 'boolean') {
      state.isOnline = nav.onLine
    }
    return { isOnline: state.isOnline }
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') {
      return { success: false }
    }
    state.listeners.push(callback)
    
    const win = getWindow()
    if (win && state.listeners.length === 1) {
      const handleOnline = () => {
        state.isOnline = true
        state.listeners.forEach(fn => fn({ isOnline: true }))
      }
      const handleOffline = () => {
        state.isOnline = false
        state.listeners.forEach(fn => fn({ isOnline: false }))
      }
      
      win.addEventListener('online', handleOnline)
      win.addEventListener('offline', handleOffline)
      
      state.cleanup = () => {
        win.removeEventListener('online', handleOnline)
        win.removeEventListener('offline', handleOffline)
      }
    }
    
    return { success: true, isOnline: state.isOnline }
  }

  function unsubscribe(callback) {
    const index = state.listeners.indexOf(callback)
    if (index !== -1) {
      state.listeners.splice(index, 1)
      
      if (state.listeners.length === 0 && state.cleanup) {
        state.cleanup()
        state.cleanup = null
      }
    }
    return { success: true }
  }

  function isOnline() {
    const nav = getNavigator()
    if (nav && typeof nav.onLine === 'boolean') {
      state.isOnline = nav.onLine
    }
    return { isOnline: state.isOnline }
  }

  return {
    init,
    subscribe,
    unsubscribe,
    isOnline,
  }
}

function createNotificationQueue(options = {}) {
  const config = {
    maxToasts: options.maxToasts || DEFAULTS.MAX_TOASTS,
    maxBanners: options.maxBanners || DEFAULTS.MAX_BANNERS,
    mergeSameId: options.mergeSameId !== false,
  }

  const state = {
    toasts: [],
    banners: [],
    listeners: [],
  }

  function generateId() {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  function notify(type) {
    state.listeners.forEach(callback => {
      callback({
        type,
        toasts: [...state.toasts],
        banners: [...state.banners],
      })
    })
  }

  function addNotification(type, notification, options = {}) {
    const severity = notification.severity || NOTIFICATION_SEVERITY.INFO
    const validSeverities = Object.values(NOTIFICATION_SEVERITY)
    
    if (!validSeverities.includes(severity)) {
      return {
        success: false,
        error: createError(ERROR_CODES.INVALID_SEVERITY),
      }
    }

    const array = type === NOTIFICATION_TYPES.TOAST ? state.toasts : state.banners
    const maxItems = type === NOTIFICATION_TYPES.TOAST ? config.maxToasts : config.maxBanners

    const id = notification.id || generateId()

    if (config.mergeSameId && notification.id) {
      const existingIndex = array.findIndex(n => n.id === notification.id)
      if (existingIndex !== -1) {
        array[existingIndex] = {
          ...array[existingIndex],
          ...notification,
          id,
          type,
          severity,
          createdAt: Date.now(),
        }
        notify('UPDATED')
        return {
          success: true,
          merged: true,
          count: array.length,
          notifications: [...array],
        }
      }
    }

    if (array.length >= maxItems) {
      if (options.autoDismissOldest) {
        array.shift()
      } else {
        return {
          success: false,
          error: createError(ERROR_CODES.NOTIFICATION_QUEUE_FULL),
        }
      }
    }

    const newNotification = {
      id,
      type,
      severity,
      message: notification.message || '',
      description: notification.description || '',
      action: notification.action || null,
      actionLabel: notification.actionLabel || null,
      autoDismiss: notification.autoDismiss !== false,
      duration: notification.duration || (type === NOTIFICATION_TYPES.TOAST 
        ? DEFAULTS.TOAST_DURATION 
        : DEFAULTS.BANNER_DURATION),
      createdAt: Date.now(),
    }

    array.push(newNotification)
    notify('ADDED')

    return {
      success: true,
      merged: false,
      count: array.length,
      notification: newNotification,
      notifications: [...array],
    }
  }

  function removeNotification(type, id) {
    const array = type === NOTIFICATION_TYPES.TOAST ? state.toasts : state.banners
    const index = array.findIndex(n => n.id === id)
    
    if (index !== -1) {
      array.splice(index, 1)
      notify('REMOVED')
      return {
        success: true,
        count: array.length,
        notifications: [...array],
      }
    }
    
    return {
      success: false,
      count: array.length,
      notifications: [...array],
    }
  }

  function clearAll(type = null) {
    if (type === NOTIFICATION_TYPES.TOAST || !type) {
      state.toasts = []
    }
    if (type === NOTIFICATION_TYPES.BANNER || !type) {
      state.banners = []
    }
    notify('CLEARED')
    return {
      success: true,
      toasts: [...state.toasts],
      banners: [...state.banners],
    }
  }

  function getNotifications(type = null) {
    return {
      success: true,
      toasts: type === NOTIFICATION_TYPES.BANNER ? [] : [...state.toasts],
      banners: type === NOTIFICATION_TYPES.TOAST ? [] : [...state.banners],
    }
  }

  function subscribe(callback) {
    if (typeof callback === 'function') {
      state.listeners.push(callback)
    }
    return { success: true }
  }

  function unsubscribe(callback) {
    const index = state.listeners.indexOf(callback)
    if (index !== -1) {
      state.listeners.splice(index, 1)
    }
    return { success: true }
  }

  return {
    addNotification,
    removeNotification,
    clearAll,
    getNotifications,
    subscribe,
    unsubscribe,
  }
}

function createVisibilityAwareTimer(windowRef = null) {
  const state = {
    timerId: null,
    startTime: null,
    remaining: null,
    duration: null,
    callback: null,
    isPaused: false,
  }

  const getDocument = () => {
    if (windowRef && windowRef.document) {
      return windowRef.document
    }
    if (typeof document !== 'undefined') {
      return document
    }
    return null
  }

  const getWindow = () => {
    if (windowRef) return windowRef
    if (typeof window !== 'undefined') return window
    return null
  }

  function start(callback, duration) {
    if (typeof callback !== 'function' || typeof duration !== 'number') {
      return { success: false }
    }

    state.callback = callback
    state.duration = duration
    state.remaining = duration
    state.startTime = Date.now()
    state.isPaused = false

    if (state.timerId) {
      clearTimeout(state.timerId)
    }

    state.timerId = setTimeout(() => {
      state.callback()
      state.timerId = null
      state.remaining = 0
    }, state.remaining)

    const doc = getDocument()
    const win = getWindow()
    
    if (doc && win && !state.visibilityHandler) {
      state.visibilityHandler = () => {
        if (doc.visibilityState === 'hidden') {
          pause()
        } else {
          resume()
        }
      }
      doc.addEventListener('visibilitychange', state.visibilityHandler)
    }

    return {
      success: true,
      duration: state.duration,
    }
  }

  function pause() {
    if (state.timerId && !state.isPaused) {
      clearTimeout(state.timerId)
      state.timerId = null
      state.remaining = state.duration - (Date.now() - state.startTime)
      state.isPaused = true
      return {
        success: true,
        remaining: state.remaining,
        isPaused: true,
      }
    }
    return { success: false }
  }

  function resume() {
    if (state.isPaused && state.remaining > 0) {
      state.startTime = Date.now()
      state.isPaused = false
      state.timerId = setTimeout(() => {
        state.callback()
        state.timerId = null
        state.remaining = 0
      }, state.remaining)
      return {
        success: true,
        remaining: state.remaining,
        isPaused: false,
      }
    }
    return { success: false }
  }

  function stop() {
    if (state.timerId) {
      clearTimeout(state.timerId)
      state.timerId = null
    }

    const doc = getDocument()
    if (doc && state.visibilityHandler) {
      doc.removeEventListener('visibilitychange', state.visibilityHandler)
      state.visibilityHandler = null
    }

    state.remaining = 0
    state.isPaused = false
    return { success: true }
  }

  function getStatus() {
    return {
      isRunning: state.timerId !== null,
      isPaused: state.isPaused,
      remaining: state.remaining,
      duration: state.duration,
    }
  }

  return {
    start,
    pause,
    resume,
    stop,
    getStatus,
  }
}

function debounce(fn, delay = DEFAULTS.DEBOUNCE_DELAY) {
  let timerId = null
  return (...args) => {
    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => {
      fn(...args)
      timerId = null
    }, delay)
  }
}

export {
  createLoadingStateManager,
  transitionLoadingState,
  generateToken,
  getEmptyStateText,
  createOfflineDetector,
  createNotificationQueue,
  createVisibilityAwareTimer,
  debounce,
}
