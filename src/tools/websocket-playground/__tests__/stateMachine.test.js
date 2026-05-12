import { describe, test, expect } from 'vitest'
import {
  SOCKET_STATES,
  ERROR_CODES,
  DEFAULT_PARAMS,
  validateUrl,
  checkMixedContent,
  normalizeParams,
  canSendMessage,
  getSendError,
  calculateReconnectDelay,
  shouldReconnect,
  createInitialState,
  transitionState,
} from '../logic/stateMachine.js'

describe('stateMachine', () => {
  describe('validateUrl', () => {
    test('should reject null URL', () => {
      const result = validateUrl(null)
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.NULL_URL)
    })

    test('should reject empty URL', () => {
      const result = validateUrl('')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.NULL_URL)
    })

    test('should reject whitespace only URL', () => {
      const result = validateUrl('   ')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.NULL_URL)
    })

    test('should reject invalid protocol', () => {
      const result = validateUrl('http://example.com')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_PROTOCOL)
    })

    test('should reject malformed URL', () => {
      const result = validateUrl('ws://')
      expect(result.valid).toBe(false)
      expect(result.error.code).toBe(ERROR_CODES.INVALID_URL)
    })

    test('should accept valid ws URL', () => {
      const result = validateUrl('ws://localhost:8080')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('should accept valid wss URL', () => {
      const result = validateUrl('wss://echo.websocket.org')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('should accept URL with path', () => {
      const result = validateUrl('wss://example.com/ws?token=123')
      expect(result.valid).toBe(true)
    })

    test('should trim whitespace from URL', () => {
      const result = validateUrl('  wss://example.com  ')
      expect(result.valid).toBe(true)
    })
  })

  describe('checkMixedContent', () => {
    test('should not block ws on http page', () => {
      const result = checkMixedContent('ws://example.com', false)
      expect(result.blocked).toBe(false)
    })

    test('should block ws on https page', () => {
      const result = checkMixedContent('ws://example.com', true)
      expect(result.blocked).toBe(true)
      expect(result.error.code).toBe(ERROR_CODES.MIXED_CONTENT_BLOCKED)
    })

    test('should not block wss on https page', () => {
      const result = checkMixedContent('wss://example.com', true)
      expect(result.blocked).toBe(false)
    })

    test('should not block wss on http page', () => {
      const result = checkMixedContent('wss://example.com', false)
      expect(result.blocked).toBe(false)
    })
  })

  describe('normalizeParams', () => {
    test('should return defaults when no params provided', () => {
      const result = normalizeParams()
      expect(result.url).toBe(DEFAULT_PARAMS.url)
      expect(result.protocols).toEqual(DEFAULT_PARAMS.protocols)
      expect(result.binaryType).toBe(DEFAULT_PARAMS.binaryType)
      expect(result.autoReconnect).toBe(DEFAULT_PARAMS.autoReconnect)
      expect(result.maxRetries).toBe(DEFAULT_PARAMS.maxRetries)
      expect(result.reconnectDelay).toBe(DEFAULT_PARAMS.reconnectDelay)
      expect(result.reconnectDelayMax).toBe(DEFAULT_PARAMS.reconnectDelayMax)
      expect(result.connectionTimeout).toBe(DEFAULT_PARAMS.connectionTimeout)
      expect(result.heartbeatEnabled).toBe(DEFAULT_PARAMS.heartbeatEnabled)
      expect(result.heartbeatInterval).toBe(DEFAULT_PARAMS.heartbeatInterval)
      expect(result.heartbeatMessage).toBe(DEFAULT_PARAMS.heartbeatMessage)
      expect(result.heartbeatType).toBe(DEFAULT_PARAMS.heartbeatType)
    })

    test('should use provided values over defaults', () => {
      const result = normalizeParams({
        url: 'wss://custom.com',
        protocols: ['chat'],
        binaryType: 'arraybuffer',
        autoReconnect: false,
        maxRetries: 3,
        reconnectDelay: 500,
        connectionTimeout: 5000,
        heartbeatEnabled: true,
        heartbeatInterval: 10000,
        heartbeatMessage: 'heartbeat',
        heartbeatType: 'binary',
      })
      expect(result.url).toBe('wss://custom.com')
      expect(result.protocols).toEqual(['chat'])
      expect(result.binaryType).toBe('arraybuffer')
      expect(result.autoReconnect).toBe(false)
      expect(result.maxRetries).toBe(3)
      expect(result.reconnectDelay).toBe(500)
      expect(result.connectionTimeout).toBe(5000)
      expect(result.heartbeatEnabled).toBe(true)
      expect(result.heartbeatInterval).toBe(10000)
      expect(result.heartbeatMessage).toBe('heartbeat')
      expect(result.heartbeatType).toBe('binary')
    })

    test('should handle partial params', () => {
      const result = normalizeParams({
        url: 'wss://custom.com',
        autoReconnect: false,
      })
      expect(result.url).toBe('wss://custom.com')
      expect(result.autoReconnect).toBe(false)
      expect(result.maxRetries).toBe(DEFAULT_PARAMS.maxRetries)
    })

    test('should normalize non-array protocols to empty array', () => {
      const result = normalizeParams({ protocols: 'invalid' })
      expect(result.protocols).toEqual([])
    })
  })

  describe('canSendMessage', () => {
    test('should return true for OPEN state', () => {
      expect(canSendMessage(SOCKET_STATES.OPEN)).toBe(true)
    })

    test('should return false for CONNECTING state', () => {
      expect(canSendMessage(SOCKET_STATES.CONNECTING)).toBe(false)
    })

    test('should return false for CLOSING state', () => {
      expect(canSendMessage(SOCKET_STATES.CLOSING)).toBe(false)
    })

    test('should return false for CLOSED state', () => {
      expect(canSendMessage(SOCKET_STATES.CLOSED)).toBe(false)
    })
  })

  describe('getSendError', () => {
    test('should return CONNECTING_STATE error', () => {
      const error = getSendError(SOCKET_STATES.CONNECTING)
      expect(error).not.toBeNull()
      expect(error.code).toBe(ERROR_CODES.CONNECTING_STATE)
    })

    test('should return CLOSING_STATE error', () => {
      const error = getSendError(SOCKET_STATES.CLOSING)
      expect(error).not.toBeNull()
      expect(error.code).toBe(ERROR_CODES.CLOSING_STATE)
    })

    test('should return NOT_CONNECTED error for CLOSED', () => {
      const error = getSendError(SOCKET_STATES.CLOSED)
      expect(error).not.toBeNull()
      expect(error.code).toBe(ERROR_CODES.NOT_CONNECTED)
    })

    test('should return null for OPEN state', () => {
      const error = getSendError(SOCKET_STATES.OPEN)
      expect(error).toBeNull()
    })
  })

  describe('calculateReconnectDelay', () => {
    test('should calculate exponential backoff', () => {
      const baseDelay = 1000
      const maxDelay = 30000

      const delay0 = calculateReconnectDelay(0, baseDelay, maxDelay)
      const delay1 = calculateReconnectDelay(1, baseDelay, maxDelay)
      const delay2 = calculateReconnectDelay(2, baseDelay, maxDelay)

      expect(delay0).toBeGreaterThanOrEqual(1000)
      expect(delay0).toBeLessThan(1100)
      expect(delay1).toBeGreaterThanOrEqual(2000)
      expect(delay1).toBeLessThan(2200)
      expect(delay2).toBeGreaterThanOrEqual(4000)
      expect(delay2).toBeLessThan(4400)
    })

    test('should respect max delay', () => {
      const baseDelay = 1000
      const maxDelay = 5000

      const delay = calculateReconnectDelay(10, baseDelay, maxDelay)
      expect(delay).toBeLessThanOrEqual(maxDelay * 1.1)
    })
  })

  describe('shouldReconnect', () => {
    test('should not reconnect after manual close', () => {
      const params = { autoReconnect: true, maxRetries: 5 }
      const result = shouldReconnect(params, 0, true)
      expect(result).toBe(false)
    })

    test('should not reconnect if autoReconnect is false', () => {
      const params = { autoReconnect: false, maxRetries: 5 }
      const result = shouldReconnect(params, 0, false)
      expect(result).toBe(false)
    })

    test('should not reconnect if maxRetries is 0', () => {
      const params = { autoReconnect: true, maxRetries: 0 }
      const result = shouldReconnect(params, 0, false)
      expect(result).toBe(false)
    })

    test('should reconnect if under max retries', () => {
      const params = { autoReconnect: true, maxRetries: 5 }
      expect(shouldReconnect(params, 0, false)).toBe(true)
      expect(shouldReconnect(params, 4, false)).toBe(true)
    })

    test('should not reconnect if max retries exceeded', () => {
      const params = { autoReconnect: true, maxRetries: 5 }
      const result = shouldReconnect(params, 5, false)
      expect(result).toBe(false)
    })
  })

  describe('createInitialState', () => {
    test('should create correct initial state', () => {
      const state = createInitialState()
      expect(state.socketState).toBe(SOCKET_STATES.CLOSED)
      expect(state.retryCount).toBe(0)
      expect(state.wasManualClose).toBe(false)
      expect(state.lastError).toBeNull()
      expect(state.lastCloseCode).toBeNull()
    })
  })

  describe('transitionState', () => {
    describe('CONNECT_REQUEST', () => {
      test('should transition from CLOSED to CONNECTING', () => {
        const state = createInitialState()
        const newState = transitionState(state, 'CONNECT_REQUEST')
        expect(newState.socketState).toBe(SOCKET_STATES.CONNECTING)
        expect(newState.wasManualClose).toBe(false)
      })

      test('should ignore if not CLOSED', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.CONNECTING }
        const newState = transitionState(state, 'CONNECT_REQUEST')
        expect(newState.socketState).toBe(SOCKET_STATES.CONNECTING)
      })
    })

    describe('CONNECT_SUCCESS', () => {
      test('should transition from CONNECTING to OPEN', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.CONNECTING, retryCount: 3 }
        const newState = transitionState(state, 'CONNECT_SUCCESS')
        expect(newState.socketState).toBe(SOCKET_STATES.OPEN)
        expect(newState.retryCount).toBe(0)
        expect(newState.lastError).toBeNull()
      })

      test('should ignore if not CONNECTING', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.CLOSED }
        const newState = transitionState(state, 'CONNECT_SUCCESS')
        expect(newState.socketState).toBe(SOCKET_STATES.CLOSED)
      })
    })

    describe('CONNECT_FAILED', () => {
      test('should transition from CONNECTING to CLOSED with error', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.CONNECTING }
        const error = { code: 'TEST_ERROR' }
        const newState = transitionState(state, 'CONNECT_FAILED', { error })
        expect(newState.socketState).toBe(SOCKET_STATES.CLOSED)
        expect(newState.lastError).toBe(error)
      })
    })

    describe('MANUAL_DISCONNECT', () => {
      test('should set wasManualClose and transition to CLOSING from OPEN', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.OPEN }
        const newState = transitionState(state, 'MANUAL_DISCONNECT')
        expect(newState.socketState).toBe(SOCKET_STATES.CLOSING)
        expect(newState.wasManualClose).toBe(true)
      })

      test('should set wasManualClose from CONNECTING', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.CONNECTING }
        const newState = transitionState(state, 'MANUAL_DISCONNECT')
        expect(newState.wasManualClose).toBe(true)
      })
    })

    describe('CLOSE_RECEIVED', () => {
      test('should transition to CLOSED', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.OPEN }
        const newState = transitionState(state, 'CLOSE_RECEIVED', { code: 1000 })
        expect(newState.socketState).toBe(SOCKET_STATES.CLOSED)
        expect(newState.lastCloseCode).toBe(1000)
      })

      test('should increment retry count if shouldRetry and not manual', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.OPEN, wasManualClose: false }
        const newState = transitionState(state, 'CLOSE_RECEIVED', { code: 1006, shouldRetry: true })
        expect(newState.retryCount).toBe(1)
      })

      test('should not increment retry count if manual', () => {
        const state = { ...createInitialState(), socketState: SOCKET_STATES.OPEN, wasManualClose: true }
        const newState = transitionState(state, 'CLOSE_RECEIVED', { code: 1000, shouldRetry: true })
        expect(newState.retryCount).toBe(0)
      })
    })

    describe('ERROR', () => {
      test('should set lastError', () => {
        const state = createInitialState()
        const error = { code: 'TEST' }
        const newState = transitionState(state, 'ERROR', { error })
        expect(newState.lastError).toBe(error)
      })
    })

    describe('RESET_RETRY', () => {
      test('should reset retry count to 0', () => {
        const state = { ...createInitialState(), retryCount: 5 }
        const newState = transitionState(state, 'RESET_RETRY')
        expect(newState.retryCount).toBe(0)
      })
    })

    test('should not mutate original state', () => {
      const original = createInitialState()
      const newState = transitionState(original, 'CONNECT_REQUEST')
      expect(original.socketState).toBe(SOCKET_STATES.CLOSED)
      expect(newState.socketState).toBe(SOCKET_STATES.CONNECTING)
    })
  })
})
