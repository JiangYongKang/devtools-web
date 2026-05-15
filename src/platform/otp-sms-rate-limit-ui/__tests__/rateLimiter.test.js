import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { createRateLimiter, ERROR_CODES } from '../logic/index.js'

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should initialize with default config', () => {
    const limiter = createRateLimiter()
    const snapshot = limiter.getSnapshot()
    expect(snapshot.tokenBucket).toBe(5)
    expect(snapshot.canSend).toBe(true)
  })

  test('should initialize with custom config', () => {
    const limiter = createRateLimiter({
      tokenBucketCapacity: 10,
      maxSendAttempts: 10,
    })
    const snapshot = limiter.getSnapshot()
    expect(snapshot.tokenBucket).toBe(10)
  })

  test('should consume token on tryConsume', () => {
    const limiter = createRateLimiter()
    limiter.tryConsume()
    expect(limiter.getSnapshot().tokenBucket).toBe(4)
  })

  test('should throw when max send attempts exceeded', () => {
    const limiter = createRateLimiter({ maxSendAttempts: 2 })
    limiter.tryConsume()
    limiter.tryConsume()

    expect(() => limiter.tryConsume()).toThrow()
    try {
      limiter.tryConsume()
    } catch (e) {
      expect(e.details?.reason).toBe('max_send_attempts')
    }
  })

  test('should throw when sliding window limit exceeded', () => {
    const limiter = createRateLimiter({
      slidingWindowSeconds: 10,
      slidingWindowMaxAttempts: 2,
      maxSendAttempts: 10,
    })

    limiter.tryConsume()
    limiter.tryConsume()

    expect(() => limiter.tryConsume()).toThrow()
    try {
      limiter.tryConsume()
    } catch (e) {
      expect(e.details?.reason).toBe('sliding_window_exceeded')
    }
  })

  test('should throw when token bucket is empty', () => {
    const limiter = createRateLimiter({
      tokenBucketCapacity: 2,
      tokenRefillRatePerSecond: 0,
      maxSendAttempts: 10,
    })

    limiter.tryConsume()
    limiter.tryConsume()

    expect(() => limiter.tryConsume()).toThrow()
    try {
      limiter.tryConsume()
    } catch (e) {
      expect(e.details?.reason).toBe('token_bucket_empty')
    }
  })

  test('should refill tokens over time', async () => {
    const limiter = createRateLimiter({
      tokenBucketCapacity: 5,
      tokenRefillRatePerSecond: 1,
    })

    limiter.tryConsume()
    limiter.tryConsume()
    expect(limiter.getSnapshot().tokenBucket).toBe(3)

    await vi.advanceTimersByTimeAsync(2000)

    expect(limiter.getSnapshot().tokenBucket).toBe(5)
  })

  test('should not exceed token bucket capacity', async () => {
    const limiter = createRateLimiter({
      tokenBucketCapacity: 3,
      tokenRefillRatePerSecond: 1,
    })

    limiter.tryConsume()
    expect(limiter.getSnapshot().tokenBucket).toBe(2)

    await vi.advanceTimersByTimeAsync(5000)

    expect(limiter.getSnapshot().tokenBucket).toBe(3)
  })

  test('should cleanup old attempts from sliding window', async () => {
    const limiter = createRateLimiter({
      slidingWindowSeconds: 2,
      slidingWindowMaxAttempts: 2,
      maxSendAttempts: 10,
    })

    limiter.tryConsume()
    limiter.tryConsume()
    expect(limiter.getAttemptsInWindow()).toBe(2)

    await vi.advanceTimersByTimeAsync(3000)

    expect(limiter.getAttemptsInWindow()).toBe(0)
    expect(() => limiter.tryConsume()).not.toThrow()
  })

  test('should reset all state', () => {
    const limiter = createRateLimiter()
    limiter.tryConsume()
    limiter.tryConsume()

    limiter.reset()

    const snapshot = limiter.getSnapshot()
    expect(snapshot.tokenBucket).toBe(5)
    expect(snapshot.sendAttemptCount).toBe(0)
    expect(snapshot.attemptsInWindow).toBe(0)
  })

  test('should notify subscribers on change', () => {
    const limiter = createRateLimiter()
    const subscriber = vi.fn()
    limiter.subscribe(subscriber)

    limiter.tryConsume()
    expect(subscriber).toHaveBeenCalledTimes(1)

    limiter.reset()
    expect(subscriber).toHaveBeenCalledTimes(2)
  })

  test('should get cooldown remaining time', () => {
    const limiter = createRateLimiter({ cooldownSeconds: 10 })
    limiter.tryConsume()

    const remaining = limiter.getCooldownRemaining()
    expect(remaining).toBeGreaterThan(9000)
    expect(remaining).toBeLessThanOrEqual(10000)
  })

  test('should correctly detect cooldown state', () => {
    const limiter = createRateLimiter({ cooldownSeconds: 1 })
    expect(limiter.isInCooldown()).toBe(false)

    limiter.tryConsume()
    expect(limiter.isInCooldown()).toBe(true)
  })

  test('should exit cooldown after cooldown period', async () => {
    const limiter = createRateLimiter({ cooldownSeconds: 1 })
    limiter.tryConsume()
    expect(limiter.isInCooldown()).toBe(true)

    await vi.advanceTimersByTimeAsync(1100)
    expect(limiter.isInCooldown()).toBe(false)
  })

  test('snapshot should include version field', () => {
    const limiter = createRateLimiter()
    const snapshot = limiter.getSnapshot()
    expect(snapshot.version).toBeDefined()
    expect(snapshot.timestamp).toBeDefined()
  })
})
