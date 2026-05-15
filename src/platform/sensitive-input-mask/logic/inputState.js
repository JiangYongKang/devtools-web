import { maskText, maskTextWithRange, createRevealTimer, createVisibilityHandler, shouldSuppressReveal } from './masking.js'
import {
  DEFAULT_REVEAL_DURATION_SECONDS,
  REVEAL_STRATEGIES,
  MASK_CHAR,
  SHORTCUT_TOGGLE_KEY,
  SHORTCUT_DISABLE_KEYS,
} from './constants.js'

function createSensitiveInputState(options = {}) {
  const {
    initialValue = '',
    maskChar = MASK_CHAR,
    revealDurationSeconds = DEFAULT_REVEAL_DURATION_SECONDS,
    strategy = REVEAL_STRATEGIES.CLICK,
    onVisibilityChange = true,
    onChange = null,
  } = options

  let value = initialValue
  let isRevealed = false
  let isComposing = false
  let lastPasteTime = 0

  const state = {
    get value() { return value },
    get isRevealed() { return isRevealed },
    get isComposing() { return isComposing },
    get strategy() { return strategy },
    get maskChar() { return maskChar },
  }

  const timer = createRevealTimer(() => {
    isRevealed = false
    if (typeof onChange === 'function') {
      onChange({ type: 'mask', isRevealed: false })
    }
  }, { durationSeconds: revealDurationSeconds })

  let visibilityHandler = null
  if (onVisibilityChange) {
    visibilityHandler = createVisibilityHandler(() => {
      hide(true)
    })
  }

  function setValue(newValue) {
    value = newValue
    if (typeof onChange === 'function') {
      onChange({ type: 'value', value })
    }
    return { success: true }
  }

  function show() {
    if (strategy === REVEAL_STRATEGIES.DISABLED) {
      return { success: false, reason: 'disabled' }
    }
    if (isComposing) {
      return { success: false, reason: 'composing' }
    }

    isRevealed = true
    timer.start()

    if (typeof onChange === 'function') {
      onChange({ type: 'reveal', isRevealed: true })
    }
    return { success: true }
  }

  function hide(immediate = false) {
    isRevealed = false
    timer.clear()

    if (typeof onChange === 'function') {
      onChange({ type: 'mask', isRevealed: false, immediate })
    }
    return { success: true }
  }

  function toggle() {
    if (isRevealed) {
      return hide()
    }
    return show()
  }

  function extendReveal() {
    if (!isRevealed) {
      return { success: false, reason: 'not_revealed' }
    }
    timer.reset()
    return { success: true, remainingSeconds: timer.getRemainingSeconds() }
  }

  function handleCompositionStart(event) {
    if (shouldSuppressReveal(event)) {
      isComposing = true
      if (isRevealed) {
        hide()
      }
    }
    return { composing: isComposing }
  }

  function handleCompositionEnd() {
    isComposing = false
    return { composing: false }
  }

  function handlePaste(valueToPaste) {
    lastPasteTime = Date.now()
    if (typeof valueToPaste === 'string') {
      setValue(valueToPaste)
    }
    return {
      success: true,
      pasteTime: lastPasteTime,
      maskedValue: maskText(valueToPaste, maskChar),
    }
  }

  function shouldTriggerChangeEvent(isPasteOperation) {
    return !isPasteOperation
  }

  function getDisplayValue() {
    if (isRevealed) {
      return value
    }
    return maskText(value, maskChar)
  }

  function getAriaState() {
    return {
      'aria-pressed': isRevealed,
      'aria-expanded': isRevealed,
    }
  }

  function handleShortcut(event) {
    if (!event) return { handled: false }

    const key = event.key?.toUpperCase?.()
    if (key !== SHORTCUT_TOGGLE_KEY) {
      return { handled: false }
    }

    const hasModifier = SHORTCUT_DISABLE_KEYS.some((mod) => {
      if (mod === 'ctrl') return event.ctrlKey
      if (mod === 'meta') return event.metaKey
      return false
    })

    if (hasModifier && event.shiftKey) {
      toggle()
      return { handled: true, action: 'toggle' }
    }

    return { handled: false }
  }

  function attach() {
    if (visibilityHandler) {
      visibilityHandler.attach()
    }
    return { attached: true }
  }

  function detach() {
    timer.clear()
    if (visibilityHandler) {
      visibilityHandler.detach()
    }
    return { detached: true }
  }

  return {
    ...state,
    setValue,
    show,
    hide,
    toggle,
    extendReveal,
    handleCompositionStart,
    handleCompositionEnd,
    handlePaste,
    shouldTriggerChangeEvent,
    getDisplayValue,
    getAriaState,
    handleShortcut,
    attach,
    detach,
    get remainingSeconds() {
      return timer.getRemainingSeconds()
    },
  }
}

function createPasteAnimationHelper(options = {}) {
  const {
    durationMs = 250,
    highlightCount = 3,
  } = options

  let animationTimer = null
  let isAnimating = false

  function start(onComplete) {
    if (animationTimer) {
      clearInterval(animationTimer)
    }

    isAnimating = true
    let iterations = 0

    animationTimer = setInterval(() => {
      iterations++
      if (iterations >= highlightCount * 2) {
        clearInterval(animationTimer)
        animationTimer = null
        isAnimating = false
        if (typeof onComplete === 'function') {
          onComplete()
        }
      }
    }, durationMs / (highlightCount * 2))

    return { started: true, totalIterations: highlightCount * 2 }
  }

  function stop() {
    if (animationTimer) {
      clearInterval(animationTimer)
      animationTimer = null
    }
    isAnimating = false
    return { stopped: true }
  }

  return {
    start,
    stop,
    get isAnimating() {
      return isAnimating
    },
  }
}

export {
  createSensitiveInputState,
  createPasteAnimationHelper,
}
