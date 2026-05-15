import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { OTP_STATES, OTP_EVENTS, TRANSITION_TABLE, createOtpStateMachine } from '../logic/index.js'

describe('OTP State Machine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should initialize with IDLE state', () => {
    const sm = createOtpStateMachine(null, 60)
    expect(sm.getState()).toBe(OTP_STATES.IDLE)
  })

  test('should have valid transition table structure', () => {
    expect(Object.keys(TRANSITION_TABLE)).toEqual(expect.arrayContaining(Object.values(OTP_STATES)))
  })

  test('should transition from IDLE to SENDING on SEND event', () => {
    const sm = createOtpStateMachine(null, 60)
    sm.transition(OTP_EVENTS.SEND)
    expect(sm.getState()).toBe(OTP_STATES.SENDING)
  })

  test('should transition from SENDING to COOLDOWN on SEND_SUCCESS event', () => {
    const sm = createOtpStateMachine(null, 60)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_SUCCESS)
    expect(sm.getState()).toBe(OTP_STATES.COOLDOWN)
  })

  test('should transition from SENDING to RESEND_READY on SEND_FAIL event', () => {
    const sm = createOtpStateMachine(null, 60)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_FAIL)
    expect(sm.getState()).toBe(OTP_STATES.RESEND_READY)
  })

  test('should automatically transition from COOLDOWN to RESEND_READY after cooldown period', async () => {
    const sm = createOtpStateMachine(null, 2)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_SUCCESS)

    expect(sm.getState()).toBe(OTP_STATES.COOLDOWN)

    await vi.advanceTimersByTimeAsync(2000)

    expect(sm.getState()).toBe(OTP_STATES.RESEND_READY)
  })

  test('should transition from COOLDOWN to LOCKED on RATE_LIMIT_HIT event', () => {
    const sm = createOtpStateMachine(null, 60)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_SUCCESS)
    sm.transition(OTP_EVENTS.RATE_LIMIT_HIT)
    expect(sm.getState()).toBe(OTP_STATES.LOCKED)
  })

  test('should transition from RESEND_READY to SENDING on SEND event', () => {
    const sm = createOtpStateMachine(null, 60)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_FAIL)
    sm.transition(OTP_EVENTS.SEND)
    expect(sm.getState()).toBe(OTP_STATES.SENDING)
  })

  test('should transition from LOCKED to IDLE on RESET event', () => {
    const sm = createOtpStateMachine(null, 60)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.RATE_LIMIT_HIT)
    expect(sm.getState()).toBe(OTP_STATES.LOCKED)

    sm.reset()
    expect(sm.getState()).toBe(OTP_STATES.IDLE)
  })

  test('should throw on invalid transition', () => {
    const sm = createOtpStateMachine(null, 60)
    expect(() => sm.transition(OTP_EVENTS.SEND_SUCCESS)).toThrow()
  })

  test('should update context on transitions', async () => {
    const sm = createOtpStateMachine(null, 60)

    sm.transition(OTP_EVENTS.SEND)
    expect(sm.getContext().lastSendStartTime).toBeDefined()

    sm.transition(OTP_EVENTS.SEND_SUCCESS)
    expect(sm.getContext().sendSuccessCount).toBe(1)
    expect(sm.getContext().cooldownStartTime).toBeDefined()

    await vi.advanceTimersByTimeAsync(60000)
    expect(sm.getState()).toBe(OTP_STATES.RESEND_READY)

    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_FAIL, { error: new Error('Test error') })
    expect(sm.getContext().sendFailCount).toBe(1)
    expect(sm.getContext().lastError).toBeDefined()
  })

  test('should get snapshot with valid cooldown state', () => {
    const sm = createOtpStateMachine(null, 60)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_SUCCESS)

    const snapshot = sm.getSnapshot()
    expect(snapshot.state).toBe(OTP_STATES.COOLDOWN)
    expect(snapshot.validTransitions).toBeDefined()
    expect(Array.isArray(snapshot.validTransitions)).toBe(true)
    expect(snapshot.validTransitions.length).toBeGreaterThan(0)
  })

  test('should notify subscribers on state change', () => {
    const sm = createOtpStateMachine(null, 60)
    const subscriber = vi.fn()
    sm.subscribe(subscriber)

    sm.transition(OTP_EVENTS.SEND)
    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ state: OTP_STATES.SENDING }))
  })

  test('should cleanup context on reset', async () => {
    const sm = createOtpStateMachine(null, 60)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_SUCCESS)

    await vi.advanceTimersByTimeAsync(60000)

    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_FAIL)

    sm.reset()
    const context = sm.getContext()
    expect(context.sendSuccessCount).toBe(0)
    expect(context.sendFailCount).toBe(0)
    expect(context.lastError).toBeNull()
  })

  test('cooldown should transition to RESEND_READY after cooldown period', async () => {
    const sm = createOtpStateMachine(null, 2)
    sm.transition(OTP_EVENTS.SEND)
    sm.transition(OTP_EVENTS.SEND_SUCCESS)

    expect(sm.getState()).toBe(OTP_STATES.COOLDOWN)

    await vi.advanceTimersByTimeAsync(2000)
    expect(sm.getState()).toBe(OTP_STATES.RESEND_READY)
  })
})
