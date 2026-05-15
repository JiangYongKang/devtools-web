export * from './constants.js'
export * from './errors.js'
export * from './rateLimiter.js'
export * from './sendSimulator.js'
export * from './stateMachine.js'
export * from './utils.js'

import { OTP_EVENTS, OTP_STATES } from './constants.js'
import { ERROR_CODES, getErrorMessage, isOtpRateLimitError } from './errors.js'
import { createRateLimiter } from './rateLimiter.js'
import { createSendSimulator } from './sendSimulator.js'
import { createOtpStateMachine } from './stateMachine.js'
import { createSnapshot, msToSeconds, onVisibilityChange } from './utils.js'

function createOtpSender(config = {}) {
  const { rateLimiterConfig, sendSimulatorConfig, cooldownSeconds, channelType } = config

  const rateLimiter = createRateLimiter(rateLimiterConfig)
  const stateMachine = createOtpStateMachine(rateLimiter, cooldownSeconds || 60)
  const sendSimulator = createSendSimulator(sendSimulatorConfig)

  let subscribers = new Set()
  let lastError = null

  function notifySubscribers() {
    const snapshot = getSnapshot()
    subscribers.forEach((cb) => cb(snapshot))
  }

  async function send(identifier, options = {}) {
    const state = stateMachine.getState()
    if (
      state !== OTP_STATES.IDLE &&
      state !== OTP_STATES.RESEND_READY
    ) {
      throw new Error(`Cannot send from state: ${state}`)
    }

    try {
      rateLimiter.tryConsume()
    } catch (error) {
      if (isOtpRateLimitError(error) && error.code === ERROR_CODES.RATE_LIMIT_EXCEEDED) {
        stateMachine.transition(OTP_EVENTS.RATE_LIMIT_HIT, {
          reason: error.details?.reason,
        })
      }
      throw error
    }

    stateMachine.transition(OTP_EVENTS.SEND)
    notifySubscribers()

    try {
      const result = await sendSimulator.send(identifier, options)
      stateMachine.transition(OTP_EVENTS.SEND_SUCCESS)
      lastError = null
      notifySubscribers()
      return result
    } catch (error) {
      lastError = error
      if (isOtpRateLimitError(error) && error.code === ERROR_CODES.TOO_MANY_REQUESTS) {
        stateMachine.transition(OTP_EVENTS.RATE_LIMIT_HIT, {
          reason: 'rate429',
          retryAfter: error.details?.retryAfterSeconds,
        })
      } else {
        stateMachine.transition(OTP_EVENTS.SEND_FAIL, { error })
      }
      notifySubscribers()
      throw error
    }
  }

  function reset() {
    stateMachine.reset()
    rateLimiter.reset()
    lastError = null
    notifySubscribers()
  }

  function getSnapshot() {
    const stateSnapshot = stateMachine.getSnapshot()
    const rateSnapshot = rateLimiter.getSnapshot()

    return createSnapshot({
      channelType,
      state: stateSnapshot.state,
      remainingCooldownMs: stateSnapshot.remainingCooldownMs,
      remainingCooldownSeconds: stateSnapshot.remainingCooldownSeconds,
      validTransitions: stateSnapshot.validTransitions,
      context: stateSnapshot.context,
      rateLimiter: {
        sendAttemptCount: rateSnapshot.sendAttemptCount,
        attemptsInWindow: rateSnapshot.attemptsInWindow,
        tokenBucket: rateSnapshot.tokenBucket,
        canSend: rateSnapshot.canSend,
      },
      lastError: lastError ? getErrorMessage(lastError) : null,
      lastErrorCode: lastError?.code || null,
    })
  }

  function subscribe(callback) {
    subscribers.add(callback)
    const unsubscribeState = stateMachine.subscribe(() => callback(getSnapshot()))
    const unsubscribeRate = rateLimiter.subscribe(() => callback(getSnapshot()))

    return () => {
      subscribers.delete(callback)
      unsubscribeState()
      unsubscribeRate()
    }
  }

  const visibilityUnsubscribe = onVisibilityChange((visibilityState) => {
    if (visibilityState === 'visible') {
      stateMachine.refreshCooldownStatus()
    }
  })

  function destroy() {
    visibilityUnsubscribe()
    reset()
  }

  return {
    destroy,
    force429: sendSimulator.force429,
    forceFailure: sendSimulator.forceFailure,
    forceSuccess: sendSimulator.forceSuccess,
    getRateLimiterSnapshot: rateLimiter.getSnapshot,
    getSnapshot,
    getState: stateMachine.getState,
    isInCooldown: rateLimiter.isInCooldown,
    reset,
    send,
    subscribe,
  }
}

export { createOtpSender }
