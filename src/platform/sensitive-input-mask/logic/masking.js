import { MASK_CHAR, MIN_REVEAL_DURATION_SECONDS, MAX_REVEAL_DURATION_SECONDS, DEFAULT_REVEAL_DURATION_SECONDS } from './constants.js'

function clampDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return DEFAULT_REVEAL_DURATION_SECONDS
  }
  return Math.min(Math.max(seconds, MIN_REVEAL_DURATION_SECONDS), MAX_REVEAL_DURATION_SECONDS)
}

function createRevealTimer(onExpire, options = {}) {
  const {
    durationSeconds = DEFAULT_REVEAL_DURATION_SECONDS,
  } = options

  let timerId = null
  let remainingMs = 0
  let startTime = 0

  const clampedDuration = clampDuration(durationSeconds)

  function start() {
    clear()
    startTime = Date.now()
    remainingMs = clampedDuration * 1000
    timerId = setTimeout(() => {
      timerId = null
      remainingMs = 0
      if (typeof onExpire === 'function') {
        onExpire()
      }
    }, remainingMs)
    return { started: true, durationSeconds: clampedDuration }
  }

  function reset() {
    if (timerId) {
      clearTimeout(timerId)
    }
    startTime = Date.now()
    remainingMs = clampedDuration * 1000
    timerId = setTimeout(() => {
      timerId = null
      remainingMs = 0
      if (typeof onExpire === 'function') {
        onExpire()
      }
    }, remainingMs)
    return { reset: true, remainingSeconds: remainingMs / 1000 }
  }

  function clear() {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
    remainingMs = 0
    return { cleared: true }
  }

  function getRemainingSeconds() {
    if (!timerId) return 0
    const elapsed = Date.now() - startTime
    return Math.max(0, (remainingMs - elapsed) / 1000)
  }

  function isRunning() {
    return timerId !== null
  }

  return {
    start,
    reset,
    clear,
    getRemainingSeconds,
    isRunning,
    get durationSeconds() {
      return clampedDuration
    },
  }
}

function createVisibilityHandler(onHidden) {
  function handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      if (typeof onHidden === 'function') {
        onHidden()
      }
    }
  }

  function attach() {
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return { attached: true }
    }
    return { attached: false, reason: 'no_document' }
  }

  function detach() {
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      return { detached: true }
    }
    return { detached: false, reason: 'no_document' }
  }

  return { attach, detach, handleVisibilityChange }
}

function maskText(text, char = MASK_CHAR) {
  if (!text || typeof text !== 'string') {
    return ''
  }
  return char.repeat(text.length)
}

function maskTextWithRange(text, revealedRange, char = MASK_CHAR) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  if (!revealedRange) {
    return maskText(text, char)
  }

  const { start, end } = revealedRange
  const safeStart = Math.max(0, Math.min(start, text.length))
  const safeEnd = Math.max(0, Math.min(end, text.length))

  if (safeStart >= safeEnd) {
    return maskText(text, char)
  }

  return text.slice(0, safeStart) +
    char.repeat(safeEnd - safeStart) +
    text.slice(safeEnd)
}

function isIMECompositionEvent(event) {
  if (!event) return false
  return event.type === 'compositionstart' || event.type === 'compositionupdate'
}

function hasCompositionFlag(event) {
  if (!event) return false
  return event.isComposing === true
}

function shouldSuppressReveal(event) {
  return isIMECompositionEvent(event) || hasCompositionFlag(event)
}

export {
  clampDuration,
  createRevealTimer,
  createVisibilityHandler,
  maskText,
  maskTextWithRange,
  isIMECompositionEvent,
  hasCompositionFlag,
  shouldSuppressReveal,
}
