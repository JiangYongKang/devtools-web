import { DEFAULT_RATE_LIMITER_CONFIG } from './constants.js'
import { createInvalidConfigError, createRateLimitExceededError } from './errors.js'
import {
  clamp,
  createMonotonicClock,
  createSnapshot,
  msToSeconds,
  now,
  secondsToMs,
  validateConfig,
} from './utils.js'

function createRateLimiter(config = {}) {
  const validatedConfig = validateConfig(config, DEFAULT_RATE_LIMITER_CONFIG)
  const clock = createMonotonicClock()

  const {
    cooldownSeconds,
    maxSendAttempts,
    slidingWindowSeconds,
    slidingWindowMaxAttempts,
    tokenBucketCapacity,
    tokenRefillRatePerSecond,
  } = validatedConfig

  let subscribers = new Set()
  let attemptTimestamps = []
  let sendAttemptCount = 0
  let lastConsumeTime = null
  let tokenBucket = tokenBucketCapacity

  function notifySubscribers() {
    const snapshot = getSnapshot()
    subscribers.forEach((cb) => cb(snapshot))
  }

  function cleanupOldAttempts(currentTime) {
    const windowStartMs = currentTime - secondsToMs(slidingWindowSeconds)
    attemptTimestamps = attemptTimestamps.filter((ts) => ts >= windowStartMs)
  }

  function refillTokens(currentTime) {
    if (lastConsumeTime === null) {
      lastConsumeTime = currentTime
      return
    }
    const elapsedSeconds = (currentTime - lastConsumeTime) / 1000
    const tokensToAdd = elapsedSeconds * tokenRefillRatePerSecond
    tokenBucket = clamp(tokenBucket + tokensToAdd, 0, tokenBucketCapacity)
    lastConsumeTime = currentTime
  }

  function tryConsume() {
    const currentTime = clock.now()

    cleanupOldAttempts(currentTime)
    refillTokens(currentTime)

    if (sendAttemptCount >= maxSendAttempts) {
      throw createRateLimitExceededError({
        reason: 'max_send_attempts',
        sendAttemptCount,
        maxSendAttempts,
      })
    }

    if (attemptTimestamps.length >= slidingWindowMaxAttempts) {
      const oldestInWindow = attemptTimestamps[0]
      const remainingMs = oldestInWindow + secondsToMs(slidingWindowSeconds) - currentTime
      throw createRateLimitExceededError({
        reason: 'sliding_window_exceeded',
        remainingSeconds: msToSeconds(remainingMs),
        windowAttempts: attemptTimestamps.length,
        slidingWindowMaxAttempts,
      })
    }

    if (tokenBucket < 1) {
      const tokensNeeded = 1 - tokenBucket
      const secondsNeeded = tokensNeeded / tokenRefillRatePerSecond
      throw createRateLimitExceededError({
        reason: 'token_bucket_empty',
        remainingSeconds: Math.ceil(secondsNeeded),
        tokenBucket,
      })
    }

    tokenBucket -= 1
    sendAttemptCount += 1
    attemptTimestamps.push(currentTime)
    lastConsumeTime = currentTime

    notifySubscribers()
    return true
  }

  function getAttemptsInWindow() {
    const currentTime = clock.now()
    cleanupOldAttempts(currentTime)
    return attemptTimestamps.length
  }

  function getSnapshot() {
    const currentTime = clock.now()
    cleanupOldAttempts(currentTime)
    refillTokens(currentTime)

    return createSnapshot({
      config: validatedConfig,
      sendAttemptCount,
      attemptsInWindow: attemptTimestamps.length,
      tokenBucket: Math.round(tokenBucket * 100) / 100,
      tokenBucketCapacity,
      canSend:
        sendAttemptCount < maxSendAttempts &&
        attemptTimestamps.length < slidingWindowMaxAttempts &&
        tokenBucket >= 1,
    })
  }

  function subscribe(callback) {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }

  function reset() {
    sendAttemptCount = 0
    attemptTimestamps = []
    tokenBucket = tokenBucketCapacity
    lastConsumeTime = null
    notifySubscribers()
  }

  function getCooldownRemaining() {
    if (attemptTimestamps.length === 0) return 0
    const lastAttempt = attemptTimestamps[attemptTimestamps.length - 1]
    const currentTime = clock.now()
    const cooldownEnd = lastAttempt + secondsToMs(cooldownSeconds)
    return Math.max(0, cooldownEnd - currentTime)
  }

  function isInCooldown() {
    return getCooldownRemaining() > 0
  }

  return {
    getAttemptsInWindow,
    getCooldownRemaining,
    getSnapshot,
    isInCooldown,
    reset,
    subscribe,
    tryConsume,
  }
}

export { createRateLimiter }
