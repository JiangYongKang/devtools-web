
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  createLoadingStateManager,
  createOfflineDetector,
  createNotificationQueue,
  createVisibilityAwareTimer,
  debounce,
} from './logic/index.js'

const globalLoadingManager = createLoadingStateManager()
const globalNotificationQueue = createNotificationQueue()

function useGlobalLoading() {
  const [loadingState, setLoadingState] = useState(globalLoadingManager.getState())
  
  const startLoading = useCallback((token = null) => {
    const result = globalLoadingManager.start(token)
    setLoadingState(globalLoadingManager.getState())
    return result
  }, [])

  const finishLoading = useCallback((token = null) => {
    const result = globalLoadingManager.finish(token)
    setLoadingState(globalLoadingManager.getState())
    return result
  }, [])

  const failLoading = useCallback(() => {
    const result = globalLoadingManager.fail()
    setLoadingState(globalLoadingManager.getState())
    return result
  }, [])

  const resetLoading = useCallback(() => {
    const result = globalLoadingManager.reset()
    setLoadingState(globalLoadingManager.getState())
    return result
  }, [])

  return {
    ...loadingState,
    startLoading,
    finishLoading,
    failLoading,
    resetLoading,
  }
}

function useLocalLoading() {
  const managerRef = useRef(null)
  
  if (!managerRef.current) {
    managerRef.current = createLoadingStateManager()
  }

  const [loadingState, setLoadingState] = useState(managerRef.current.getState())
  
  const startLoading = useCallback((token = null) => {
    const result = managerRef.current.start(token)
    setLoadingState(managerRef.current.getState())
    return result
  }, [])

  const finishLoading = useCallback((token = null) => {
    const result = managerRef.current.finish(token)
    setLoadingState(managerRef.current.getState())
    return result
  }, [])

  const failLoading = useCallback(() => {
    const result = managerRef.current.fail()
    setLoadingState(managerRef.current.getState())
    return result
  }, [])

  const resetLoading = useCallback(() => {
    const result = managerRef.current.reset()
    setLoadingState(managerRef.current.getState())
    return result
  }, [])

  return {
    ...loadingState,
    startLoading,
    finishLoading,
    failLoading,
    resetLoading,
  }
}

function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const detectorRef = useRef(null)

  if (!detectorRef.current) {
    detectorRef.current = createOfflineDetector()
  }

  useEffect(() => {
    const detector = detectorRef.current
    const initResult = detector.init()
    setIsOnline(initResult.isOnline)

    const subscription = detector.subscribe(({ isOnline: newStatus }) => {
      setIsOnline(newStatus)
    })

    return () => {
      detector.unsubscribe(subscription.callback)
    }
  }, [])

  const checkStatus = useCallback(() => {
    const result = detectorRef.current.isOnline()
    setIsOnline(result.isOnline)
    return result.isOnline
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    checkStatus,
  }
}

function useNotificationQueue(options = {}) {
  const queueRef = useRef(null)
  
  if (!queueRef.current) {
    queueRef.current = options.useGlobal
      ? globalNotificationQueue
      : createNotificationQueue(options)
  }

  const [toasts, setToasts] = useState([])
  const [banners, setBanners] = useState([])

  useEffect(() => {
    const queue = queueRef.current
    const initial = queue.getNotifications()
    setToasts(initial.toasts)
    setBanners(initial.banners)

    const callback = (event) => {
      setToasts(event.toasts)
      setBanners(event.banners)
    }
    queue.subscribe(callback)

    return () => {
      queue.unsubscribe(callback)
    }
  }, [])

  const addToast = useCallback((notification, addOptions = {}) => {
    return queueRef.current.addNotification('toast', notification, addOptions)
  }, [])

  const addBanner = useCallback((notification, addOptions = {}) => {
    return queueRef.current.addNotification('banner', notification, addOptions)
  }, [])

  const removeToast = useCallback((id) => {
    return queueRef.current.removeNotification('toast', id)
  }, [])

  const removeBanner = useCallback((id) => {
    return queueRef.current.removeNotification('banner', id)
  }, [])

  const clearAll = useCallback((type = null) => {
    return queueRef.current.clearAll(type)
  }, [])

  return {
    toasts,
    banners,
    addToast,
    addBanner,
    removeToast,
    removeBanner,
    clearAll,
  }
}

function useVisibilityAwareTimer(callback, duration, autoStart = true) {
  const timerRef = useRef(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [remaining, setRemaining] = useState(duration)

  if (!timerRef.current) {
    timerRef.current = createVisibilityAwareTimer()
  }

  useEffect(() => {
    const timer = timerRef.current
    if (autoStart && callback) {
      const wrappedCallback = () => {
        setIsRunning(false)
        setIsPaused(false)
        setRemaining(0)
        callback()
      }
      timer.start(wrappedCallback, duration)
      setIsRunning(true)
      setIsPaused(false)
      setRemaining(duration)
    }

    return () => {
      timer.stop()
    }
  }, [callback, duration, autoStart])

  const pause = useCallback(() => {
    const result = timerRef.current.pause()
    if (result.success) {
      setIsPaused(true)
      setRemaining(result.remaining)
    }
    return result
  }, [])

  const resume = useCallback(() => {
    const result = timerRef.current.resume()
    if (result.success) {
      setIsPaused(false)
      setRemaining(result.remaining)
    }
    return result
  }, [])

  const stop = useCallback(() => {
    const result = timerRef.current.stop()
    setIsRunning(false)
    setIsPaused(false)
    setRemaining(0)
    return result
  }, [])

  const start = useCallback((customCallback = callback, customDuration = duration) => {
    const wrappedCallback = () => {
      setIsRunning(false)
      setIsPaused(false)
      setRemaining(0)
      if (customCallback) customCallback()
    }
    const result = timerRef.current.start(wrappedCallback, customDuration)
    if (result.success) {
      setIsRunning(true)
      setIsPaused(false)
      setRemaining(customDuration)
    }
    return result
  }, [callback, duration])

  return {
    isRunning,
    isPaused,
    remaining,
    start,
    pause,
    resume,
    stop,
  }
}

function useDebouncedCallback(callback, delay) {
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedFn = useMemo(() => {
    return debounce((...args) => callbackRef.current(...args), delay)
  }, [delay])

  return debouncedFn
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

export {
  useGlobalLoading,
  useLocalLoading,
  useOfflineStatus,
  useNotificationQueue,
  useVisibilityAwareTimer,
  useDebouncedCallback,
  usePrefersReducedMotion,
  globalLoadingManager,
  globalNotificationQueue,
}
