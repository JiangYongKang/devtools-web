
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  LOADING_STATES,
  LOADING_STATE_TRANSITIONS,
  EMPTY_STATE_TYPES,
  EMPTY_STATE_DICTIONARY,
  NOTIFICATION_SEVERITY,
  NOTIFICATION_TYPES,
  DEFAULTS,
  ERROR_CODES,
  ERROR_MESSAGES,
  getErrorMessage,
  createError,
  transitionLoadingState,
  createLoadingStateManager,
  getEmptyStateText,
  createOfflineDetector,
  createNotificationQueue,
  createVisibilityAwareTimer,
  debounce,
} from '../logic/index.js'

describe('constants module', () => {
  test('LOADING_STATES should have all expected states', () => {
    expect(LOADING_STATES.IDLE).toBe('IDLE')
    expect(LOADING_STATES.LOADING).toBe('LOADING')
    expect(LOADING_STATES.SUCCESS).toBe('SUCCESS')
    expect(LOADING_STATES.ERROR).toBe('ERROR')
  })

  test('EMPTY_STATE_TYPES should have all four types', () => {
    expect(EMPTY_STATE_TYPES.NO_DATA).toBe('NO_DATA')
    expect(EMPTY_STATE_TYPES.NO_RESULTS).toBe('NO_RESULTS')
    expect(EMPTY_STATE_TYPES.NO_PERMISSION).toBe('NO_PERMISSION')
    expect(EMPTY_STATE_TYPES.OFFLINE).toBe('OFFLINE')
  })

  test('NOTIFICATION_SEVERITY should have four levels', () => {
    expect(NOTIFICATION_SEVERITY.SUCCESS).toBe('success')
    expect(NOTIFICATION_SEVERITY.INFO).toBe('info')
    expect(NOTIFICATION_SEVERITY.WARNING).toBe('warning')
    expect(NOTIFICATION_SEVERITY.ERROR).toBe('error')
  })

  test('DEFAULTS should have expected values', () => {
    expect(DEFAULTS.MAX_TOASTS).toBe(5)
    expect(DEFAULTS.MAX_BANNERS).toBe(3)
    expect(DEFAULTS.TOAST_DURATION).toBe(4000)
    expect(DEFAULTS.DEBOUNCE_DELAY).toBe(300)
  })

  test('LOADING_STATE_TRANSITIONS should define valid transitions', () => {
    expect(LOADING_STATE_TRANSITIONS.IDLE.START).toBe(LOADING_STATES.LOADING)
    expect(LOADING_STATE_TRANSITIONS.LOADING.SUCCEED).toBe(LOADING_STATES.SUCCESS)
    expect(LOADING_STATE_TRANSITIONS.LOADING.FAIL).toBe(LOADING_STATES.ERROR)
    expect(LOADING_STATE_TRANSITIONS.SUCCESS.RESET).toBe(LOADING_STATES.IDLE)
    expect(LOADING_STATE_TRANSITIONS.ERROR.RESET).toBe(LOADING_STATES.IDLE)
  })

  test('EMPTY_STATE_DICTIONARY should have text for all types', () => {
    Object.values(EMPTY_STATE_TYPES).forEach((type) => {
      expect(EMPTY_STATE_DICTIONARY[type]).toBeDefined()
      expect(typeof EMPTY_STATE_DICTIONARY[type].title).toBe('string')
      expect(EMPTY_STATE_DICTIONARY[type].title.length).toBeGreaterThan(0)
    })
  })
})

describe('errors module', () => {
  test('should have all required error codes', () => {
    expect(ERROR_CODES.INVALID_STATE_TRANSITION).toBeDefined()
    expect(ERROR_CODES.INVALID_EMPTY_STATE_TYPE).toBeDefined()
    expect(ERROR_CODES.INVALID_NOTIFICATION_TYPE).toBeDefined()
    expect(ERROR_CODES.INVALID_SEVERITY).toBeDefined()
    expect(ERROR_CODES.NOTIFICATION_QUEUE_FULL).toBeDefined()
    expect(ERROR_CODES.DUPLICATE_NOTIFICATION_ID).toBeDefined()
    expect(ERROR_CODES.INVALID_TOKEN).toBeDefined()
  })

  test('should have messages for all error codes', () => {
    Object.values(ERROR_CODES).forEach((code) => {
      expect(ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof ERROR_MESSAGES[code]).toBe('string')
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0)
    })
  })

  test('getErrorMessage should return correct message', () => {
    expect(getErrorMessage(ERROR_CODES.INVALID_STATE_TRANSITION)).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_STATE_TRANSITION])
  })

  test('getErrorMessage should return default for unknown codes', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('未知错误')
  })

  test('createError should create error with default message', () => {
    const result = createError(ERROR_CODES.INVALID_STATE_TRANSITION)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_STATE_TRANSITION)
    expect(result.errorMessage).toBe(ERROR_MESSAGES[ERROR_CODES.INVALID_STATE_TRANSITION])
  })

  test('createError should accept custom message', () => {
    const customMsg = 'Custom error message'
    const result = createError(ERROR_CODES.INVALID_STATE_TRANSITION, customMsg)
    expect(result.errorCode).toBe(ERROR_CODES.INVALID_STATE_TRANSITION)
    expect(result.errorMessage).toBe(customMsg)
  })
})

describe('loading state transitions', () => {
  test('should transition from IDLE to LOADING on START', () => {
    const result = transitionLoadingState(LOADING_STATES.IDLE, 'START')
    expect(result.success).toBe(true)
    expect(result.state).toBe(LOADING_STATES.LOADING)
  })

  test('should transition from LOADING to SUCCESS on SUCCEED', () => {
    const result = transitionLoadingState(LOADING_STATES.LOADING, 'SUCCEED')
    expect(result.success).toBe(true)
    expect(result.state).toBe(LOADING_STATES.SUCCESS)
  })

  test('should transition from LOADING to ERROR on FAIL', () => {
    const result = transitionLoadingState(LOADING_STATES.LOADING, 'FAIL')
    expect(result.success).toBe(true)
    expect(result.state).toBe(LOADING_STATES.ERROR)
  })

  test('should return error for invalid transition', () => {
    const result = transitionLoadingState(LOADING_STATES.IDLE, 'SUCCEED')
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_STATE_TRANSITION)
    expect(result.state).toBe(LOADING_STATES.IDLE)
  })
})

describe('loading state manager', () => {
  test('should initialize in IDLE state', () => {
    const manager = createLoadingStateManager()
    const state = manager.getState()
    expect(state.current).toBe(LOADING_STATES.IDLE)
    expect(state.count).toBe(0)
    expect(state.isLoading).toBe(false)
  })

  test('start should increment count and transition to LOADING', () => {
    const manager = createLoadingStateManager()
    const result = manager.start()
    expect(result.success).toBe(true)
    expect(result.isLoading).toBe(true)
    expect(result.count).toBe(1)
    
    const state = manager.getState()
    expect(state.current).toBe(LOADING_STATES.LOADING)
    expect(state.tokenCount).toBe(1)
  })

  test('concurrent loading should increment count without flickering', () => {
    const manager = createLoadingStateManager()
    
    const token1 = manager.start()
    expect(manager.getState().count).toBe(1)
    expect(manager.getState().isLoading).toBe(true)
    
    const token2 = manager.start()
    expect(manager.getState().count).toBe(2)
    expect(manager.getState().isLoading).toBe(true)
    
    const token3 = manager.start()
    expect(manager.getState().count).toBe(3)
    expect(manager.getState().isLoading).toBe(true)
    
    manager.finish(token1.token)
    expect(manager.getState().count).toBe(2)
    expect(manager.getState().isLoading).toBe(true)
    
    manager.finish(token2.token)
    expect(manager.getState().count).toBe(1)
    expect(manager.getState().isLoading).toBe(true)
    
    manager.finish(token3.token)
    expect(manager.getState().count).toBe(0)
    expect(manager.getState().isLoading).toBe(false)
    expect(manager.getState().current).toBe(LOADING_STATES.SUCCESS)
  })

  test('token-based reference should prevent duplicate counting', () => {
    const manager = createLoadingStateManager()
    const customToken = 'my-custom-token-123'
    
    const result1 = manager.start(customToken)
    expect(result1.count).toBe(1)
    
    const result2 = manager.start(customToken)
    expect(result2.count).toBe(1)
    expect(result2.token).toBe(customToken)
    
    expect(manager.getState().tokenCount).toBe(1)
    
    manager.finish(customToken)
    expect(manager.getState().count).toBe(0)
  })

  test('finish with invalid token should return error', () => {
    const manager = createLoadingStateManager()
    manager.start()
    
    const result = manager.finish('invalid-token')
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_TOKEN)
  })

  test('finish without token should clear all', () => {
    const manager = createLoadingStateManager()
    manager.start()
    manager.start()
    manager.start()
    
    expect(manager.getState().count).toBe(3)
    
    manager.finish()
    expect(manager.getState().count).toBe(0)
    expect(manager.getState().isLoading).toBe(false)
  })

  test('fail should clear all tokens and transition to ERROR', () => {
    const manager = createLoadingStateManager()
    manager.start()
    manager.start()
    
    const result = manager.fail()
    expect(result.success).toBe(true)
    expect(result.count).toBe(0)
    expect(manager.getState().current).toBe(LOADING_STATES.ERROR)
  })

  test('reset should return to IDLE state', () => {
    const manager = createLoadingStateManager()
    manager.start()
    manager.fail()
    
    expect(manager.getState().current).toBe(LOADING_STATES.ERROR)
    
    manager.reset()
    expect(manager.getState().current).toBe(LOADING_STATES.IDLE)
    expect(manager.getState().count).toBe(0)
  })
})

describe('empty state text', () => {
  test('should return text for valid type', () => {
    const result = getEmptyStateText(EMPTY_STATE_TYPES.NO_DATA)
    expect(result.success).toBe(true)
    expect(result.title).toBe(EMPTY_STATE_DICTIONARY[EMPTY_STATE_TYPES.NO_DATA].title)
    expect(result.description).toBe(EMPTY_STATE_DICTIONARY[EMPTY_STATE_TYPES.NO_DATA].description)
  })

  test('should return error for invalid type', () => {
    const result = getEmptyStateText('INVALID_TYPE')
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_EMPTY_STATE_TYPE)
  })

  test('should allow overriding text', () => {
    const customTitle = '自定义标题'
    const customDescription = '自定义描述'
    const customAction = '自定义操作'
    
    const result = getEmptyStateText(EMPTY_STATE_TYPES.NO_RESULTS, {
      title: customTitle,
      description: customDescription,
      action: customAction,
    })
    
    expect(result.success).toBe(true)
    expect(result.title).toBe(customTitle)
    expect(result.description).toBe(customDescription)
    expect(result.action).toBe(customAction)
  })

  test('should use defaults when only partial overrides provided', () => {
    const result = getEmptyStateText(EMPTY_STATE_TYPES.OFFLINE, {
      description: '网络似乎有点问题',
    })
    
    expect(result.success).toBe(true)
    expect(result.title).toBe(EMPTY_STATE_DICTIONARY[EMPTY_STATE_TYPES.OFFLINE].title)
    expect(result.description).toBe('网络似乎有点问题')
    expect(result.action).toBe(EMPTY_STATE_DICTIONARY[EMPTY_STATE_TYPES.OFFLINE].action)
  })
})

describe('offline detector', () => {
  test('should initialize with online status', () => {
    const detector = createOfflineDetector()
    const result = detector.init()
    expect(result.isOnline).toBeDefined()
  })

  test('should accept custom window reference', () => {
    const mockNavigator = { onLine: false }
    const mockWindow = { navigator: mockNavigator }
    
    const detector = createOfflineDetector(mockWindow)
    const result = detector.init()
    expect(result.isOnline).toBe(false)
  })

  test('should support subscription and unsubscription', () => {
    const mockWindow = {
      navigator: { onLine: true },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    
    const detector = createOfflineDetector(mockWindow)
    const callback = vi.fn()
    
    const subResult = detector.subscribe(callback)
    expect(subResult.success).toBe(true)
    
    const unsubResult = detector.unsubscribe(callback)
    expect(unsubResult.success).toBe(true)
  })

  test('should reject non-function subscriptions', () => {
    const detector = createOfflineDetector()
    const result = detector.subscribe('not a function')
    expect(result.success).toBe(false)
  })

  test('isOnline should return current status', () => {
    const mockWindow = {
      navigator: { onLine: true },
    }
    const detector = createOfflineDetector(mockWindow)
    
    const result = detector.isOnline()
    expect(result.isOnline).toBe(true)
  })
})

describe('notification queue', () => {
  test('should initialize empty', () => {
    const queue = createNotificationQueue()
    const result = queue.getNotifications()
    expect(result.success).toBe(true)
    expect(result.toasts).toEqual([])
    expect(result.banners).toEqual([])
  })

  test('should add toast notification', () => {
    const queue = createNotificationQueue()
    const notification = {
      message: 'Test toast',
      severity: NOTIFICATION_SEVERITY.INFO,
    }
    
    const result = queue.addNotification(NOTIFICATION_TYPES.TOAST, notification)
    expect(result.success).toBe(true)
    expect(result.merged).toBe(false)
    expect(result.count).toBe(1)
    expect(result.notification.message).toBe('Test toast')
    expect(result.notification.type).toBe(NOTIFICATION_TYPES.TOAST)
  })

  test('should add banner notification', () => {
    const queue = createNotificationQueue()
    const notification = {
      message: 'Test banner',
      severity: NOTIFICATION_SEVERITY.SUCCESS,
    }
    
    const result = queue.addNotification(NOTIFICATION_TYPES.BANNER, notification)
    expect(result.success).toBe(true)
    expect(result.count).toBe(1)
    expect(result.notification.type).toBe(NOTIFICATION_TYPES.BANNER)
  })

  test('should reject invalid severity', () => {
    const queue = createNotificationQueue()
    const notification = {
      message: 'Test',
      severity: 'invalid-severity',
    }
    
    const result = queue.addNotification(NOTIFICATION_TYPES.TOAST, notification)
    expect(result.success).toBe(false)
    expect(result.error.errorCode).toBe(ERROR_CODES.INVALID_SEVERITY)
  })

  test('should merge notifications with same id', () => {
    const queue = createNotificationQueue()
    const id = 'upload-progress'
    
    const result1 = queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      id,
      message: 'Uploading 0%',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    expect(result1.merged).toBe(false)
    expect(result1.count).toBe(1)
    
    const result2 = queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      id,
      message: 'Uploading 50%',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    expect(result2.merged).toBe(true)
    expect(result2.count).toBe(1)
    expect(result2.notifications[0].message).toBe('Uploading 50%')
    
    const result3 = queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      id,
      message: 'Upload complete',
      severity: NOTIFICATION_SEVERITY.SUCCESS,
    })
    expect(result3.merged).toBe(true)
    expect(result3.count).toBe(1)
    expect(result3.notifications[0].severity).toBe(NOTIFICATION_SEVERITY.SUCCESS)
  })

  test('should respect max toasts limit', () => {
    const queue = createNotificationQueue({ maxToasts: 3 })
    
    for (let i = 1; i <= 3; i++) {
      const result = queue.addNotification(NOTIFICATION_TYPES.TOAST, {
        message: `Toast ${i}`,
        severity: NOTIFICATION_SEVERITY.INFO,
      })
      expect(result.success).toBe(true)
    }
    
    const overflowResult = queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      message: 'Overflow toast',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    expect(overflowResult.success).toBe(false)
    expect(overflowResult.error.errorCode).toBe(ERROR_CODES.NOTIFICATION_QUEUE_FULL)
  })

  test('should auto dismiss oldest when option enabled', () => {
    const queue = createNotificationQueue({ maxToasts: 2 })
    
    queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      id: 'first',
      message: 'First',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      id: 'second',
      message: 'Second',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    
    const result = queue.addNotification(
      NOTIFICATION_TYPES.TOAST,
      {
        id: 'third',
        message: 'Third',
        severity: NOTIFICATION_SEVERITY.INFO,
      },
      { autoDismissOldest: true }
    )
    
    expect(result.success).toBe(true)
    const notifications = queue.getNotifications()
    expect(notifications.toasts.length).toBe(2)
    expect(notifications.toasts[0].id).toBe('second')
    expect(notifications.toasts[1].id).toBe('third')
  })

  test('should remove notification by id', () => {
    const queue = createNotificationQueue()
    const addResult = queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      id: 'test-id',
      message: 'Test',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    
    const removeResult = queue.removeNotification(NOTIFICATION_TYPES.TOAST, 'test-id')
    expect(removeResult.success).toBe(true)
    expect(removeResult.count).toBe(0)
    
    const notifications = queue.getNotifications()
    expect(notifications.toasts.length).toBe(0)
  })

  test('should clear all notifications', () => {
    const queue = createNotificationQueue()
    
    queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      message: 'Toast 1',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      message: 'Toast 2',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    queue.addNotification(NOTIFICATION_TYPES.BANNER, {
      message: 'Banner',
      severity: NOTIFICATION_SEVERITY.WARNING,
    })
    
    const result = queue.clearAll()
    expect(result.success).toBe(true)
    
    const notifications = queue.getNotifications()
    expect(notifications.toasts.length).toBe(0)
    expect(notifications.banners.length).toBe(0)
  })

  test('should support listeners', () => {
    const queue = createNotificationQueue()
    const callback = vi.fn()
    
    queue.subscribe(callback)
    queue.addNotification(NOTIFICATION_TYPES.TOAST, {
      message: 'Test',
      severity: NOTIFICATION_SEVERITY.INFO,
    })
    
    expect(callback).toHaveBeenCalled()
  })
})

describe('visibility aware timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should execute callback after duration', () => {
    const callback = vi.fn()
    const timer = createVisibilityAwareTimer()
    
    timer.start(callback, 1000)
    expect(callback).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('should pause and resume correctly', () => {
    const callback = vi.fn()
    const timer = createVisibilityAwareTimer()
    
    timer.start(callback, 2000)
    
    vi.advanceTimersByTime(500)
    timer.pause()
    
    const status1 = timer.getStatus()
    expect(status1.isPaused).toBe(true)
    expect(status1.remaining).toBeGreaterThan(0)
    
    vi.advanceTimersByTime(5000)
    expect(callback).not.toHaveBeenCalled()
    
    timer.resume()
    const status2 = timer.getStatus()
    expect(status2.isPaused).toBe(false)
    
    vi.advanceTimersByTime(1500)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('should stop timer on demand', () => {
    const callback = vi.fn()
    const timer = createVisibilityAwareTimer()
    
    timer.start(callback, 1000)
    timer.stop()
    
    vi.advanceTimersByTime(2000)
    expect(callback).not.toHaveBeenCalled()
  })

  test('should reject invalid start parameters', () => {
    const timer = createVisibilityAwareTimer()
    
    const result1 = timer.start('not a function', 1000)
    expect(result1.success).toBe(false)
    
    const result2 = timer.start(() => {}, 'not a number')
    expect(result2.success).toBe(false)
  })

  test('should return correct status', () => {
    const timer = createVisibilityAwareTimer()
    
    const status1 = timer.getStatus()
    expect(status1.isRunning).toBe(false)
    expect(status1.isPaused).toBe(false)
    
    timer.start(() => {}, 1000)
    const status2 = timer.getStatus()
    expect(status2.isRunning).toBe(true)
    expect(status2.isPaused).toBe(false)
    expect(status2.duration).toBe(1000)
    
    timer.pause()
    const status3 = timer.getStatus()
    expect(status3.isPaused).toBe(true)
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should delay execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 300)
    
    debounced('test')
    expect(fn).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledWith('test')
  })

  test('should reset timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 300)
    
    debounced('a')
    vi.advanceTimersByTime(100)
    
    debounced('b')
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
    
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  test('should use default delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn)
    
    debounced()
    vi.advanceTimersByTime(DEFAULTS.DEBOUNCE_DELAY)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
