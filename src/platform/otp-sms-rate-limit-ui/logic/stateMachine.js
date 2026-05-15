import { OTP_EVENTS, OTP_STATES, SCHEMA_VERSION } from './constants.js'
import { createInvalidStateTransitionError } from './errors.js'
import { createMonotonicClock, createSnapshot, msToSeconds, secondsToMs } from './utils.js'

export { OTP_STATES, OTP_EVENTS, SCHEMA_VERSION }

const TRANSITION_TABLE = {
  [OTP_STATES.IDLE]: {
    [OTP_EVENTS.SEND]: OTP_STATES.SENDING,
    [OTP_EVENTS.RATE_LIMIT_HIT]: OTP_STATES.LOCKED,
  },
  [OTP_STATES.SENDING]: {
    [OTP_EVENTS.SEND_SUCCESS]: OTP_STATES.COOLDOWN,
    [OTP_EVENTS.SEND_FAIL]: OTP_STATES.RESEND_READY,
    [OTP_EVENTS.RATE_LIMIT_HIT]: OTP_STATES.LOCKED,
  },
  [OTP_STATES.COOLDOWN]: {
    [OTP_EVENTS.COOLDOWN_END]: OTP_STATES.RESEND_READY,
    [OTP_EVENTS.RATE_LIMIT_HIT]: OTP_STATES.LOCKED,
    [OTP_EVENTS.RESET]: OTP_STATES.IDLE,
  },
  [OTP_STATES.RESEND_READY]: {
    [OTP_EVENTS.SEND]: OTP_STATES.SENDING,
    [OTP_EVENTS.RATE_LIMIT_HIT]: OTP_STATES.LOCKED,
    [OTP_EVENTS.RESET]: OTP_STATES.IDLE,
  },
  [OTP_STATES.LOCKED]: {
    [OTP_EVENTS.RESET]: OTP_STATES.IDLE,
  },
}

const SIDE_EFFECTS = {
  [OTP_EVENTS.SEND]: (context, eventData) => ({
    ...context,
    lastSendStartTime: eventData.timestamp,
    lastError: null,
  }),
  [OTP_EVENTS.SEND_SUCCESS]: (context, eventData) => ({
    ...context,
    cooldownStartTime: eventData.timestamp,
    sendSuccessCount: (context.sendSuccessCount || 0) + 1,
    lastError: null,
  }),
  [OTP_EVENTS.SEND_FAIL]: (context, eventData) => ({
    ...context,
    sendFailCount: (context.sendFailCount || 0) + 1,
    lastError: eventData.error,
  }),
  [OTP_EVENTS.COOLDOWN_END]: (context) => ({
    ...context,
    cooldownStartTime: null,
  }),
  [OTP_EVENTS.RATE_LIMIT_HIT]: (context, eventData) => ({
    ...context,
    lockedReason: eventData.reason,
    lockedAt: eventData.timestamp,
  }),
  [OTP_EVENTS.RESET]: () => createInitialContext(),
}

function createInitialContext() {
  return {
    sendSuccessCount: 0,
    sendFailCount: 0,
    lastSendStartTime: null,
    cooldownStartTime: null,
    lastError: null,
    lockedReason: null,
    lockedAt: null,
  }
}

function createOtpStateMachine(rateLimiter, cooldownSeconds = 60) {
  const clock = createMonotonicClock()
  let currentState = OTP_STATES.IDLE
  let context = createInitialContext()
  let subscribers = new Set()
  let cooldownTimer = null
  let cooldownMs = secondsToMs(cooldownSeconds)

  function notifySubscribers() {
    const snapshot = getSnapshot()
    subscribers.forEach((cb) => cb(snapshot))
  }

  function getValidTransitions() {
    return Object.keys(TRANSITION_TABLE[currentState] || {})
  }

  function canTransition(event) {
    return getValidTransitions().includes(event)
  }

  function transition(event, eventData = {}) {
    if (!canTransition(event)) {
      throw createInvalidStateTransitionError(currentState, event, {
        validTransitions: getValidTransitions(),
      })
    }

    const timestamp = clock.now()
    const dataWithTimestamp = { ...eventData, timestamp }

    const nextState = TRANSITION_TABLE[currentState][event]
    const sideEffect = SIDE_EFFECTS[event]

    if (sideEffect) {
      context = sideEffect(context, dataWithTimestamp)
    }

    currentState = nextState

    clearCooldownTimer()
    if (currentState === OTP_STATES.COOLDOWN) {
      startCooldownTimer()
    }

    notifySubscribers()
    return nextState
  }

  function startCooldownTimer() {
    if (!context.cooldownStartTime) {
      context.cooldownStartTime = clock.now()
    }
    const elapsed = clock.now() - context.cooldownStartTime
    const remaining = Math.max(0, cooldownMs - elapsed)

    cooldownTimer = setTimeout(() => {
      if (currentState === OTP_STATES.COOLDOWN) {
        transition(OTP_EVENTS.COOLDOWN_END)
      }
    }, remaining)
  }

  function clearCooldownTimer() {
    if (cooldownTimer) {
      clearTimeout(cooldownTimer)
      cooldownTimer = null
    }
  }

  function getCooldownRemaining() {
    if (currentState !== OTP_STATES.COOLDOWN || !context.cooldownStartTime) {
      return 0
    }
    const elapsed = clock.now() - context.cooldownStartTime
    return Math.max(0, cooldownMs - elapsed)
  }

  function refreshCooldownStatus() {
    if (currentState === OTP_STATES.COOLDOWN) {
      const remaining = getCooldownRemaining()
      if (remaining <= 0) {
        transition(OTP_EVENTS.COOLDOWN_END)
      } else {
        notifySubscribers()
      }
    }
  }

  function getSnapshot() {
    const remaining = getCooldownRemaining()
    return createSnapshot({
      state: currentState,
      context: { ...context },
      remainingCooldownMs: remaining,
      remainingCooldownSeconds: msToSeconds(remaining),
      validTransitions: getValidTransitions(),
      cooldownSeconds,
    })
  }

  function subscribe(callback) {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }

  function reset() {
    clearCooldownTimer()
    currentState = OTP_STATES.IDLE
    context = createInitialContext()
    notifySubscribers()
  }

  function getState() {
    return currentState
  }

  function getContext() {
    return { ...context }
  }

  function setCooldownSeconds(seconds) {
    cooldownMs = secondsToMs(seconds)
    cooldownSeconds = seconds
    refreshCooldownStatus()
  }

  return {
    canTransition,
    getContext,
    getCooldownRemaining,
    getSnapshot,
    getState,
    getValidTransitions,
    refreshCooldownStatus,
    reset,
    setCooldownSeconds,
    subscribe,
    transition,
  }
}

function exportToMermaid() {
  const lines = ['stateDiagram-v2']
  const states = Object.values(OTP_STATES)

  states.forEach((state) => {
    const transitions = TRANSITION_TABLE[state] || {}
    Object.entries(transitions).forEach(([event, nextState]) => {
      lines.push(`    ${state} --> ${nextState}: ${event}`)
    })
  })

  return lines.join('\n')
}

function exportTransitionTable() {
  return {
    version: SCHEMA_VERSION,
    states: Object.values(OTP_STATES),
    events: Object.values(OTP_EVENTS),
    transitions: TRANSITION_TABLE,
    description: 'OTP 发送状态机迁移表',
  }
}

export { createOtpStateMachine, exportToMermaid, exportTransitionTable, TRANSITION_TABLE }
