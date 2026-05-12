import { SOCKET_STATES, ERROR_CODES, DEFAULT_PARAMS } from './constants.js'
import { createError } from './errors.js'

function validateUrl(url) {
  if (!url || url.trim() === '') {
    return { valid: false, error: createError(ERROR_CODES.NULL_URL) }
  }

  const trimmed = url.trim()
  
  if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
    return { valid: false, error: createError(ERROR_CODES.INVALID_PROTOCOL) }
  }

  try {
    const parsed = new URL(trimmed)
    if (!parsed.hostname) {
      return { valid: false, error: createError(ERROR_CODES.INVALID_URL) }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: createError(ERROR_CODES.INVALID_URL) }
  }
}

function checkMixedContent(url, isPageSecure) {
  if (!isPageSecure) return { blocked: false }
  
  const trimmed = url?.trim() || ''
  if (trimmed.startsWith('ws://')) {
    return {
      blocked: true,
      error: createError(ERROR_CODES.MIXED_CONTENT_BLOCKED),
    }
  }
  
  return { blocked: false }
}

function normalizeParams(params) {
  return {
    url: params?.url ?? DEFAULT_PARAMS.url,
    protocols: Array.isArray(params?.protocols) ? params.protocols : DEFAULT_PARAMS.protocols,
    binaryType: params?.binaryType ?? DEFAULT_PARAMS.binaryType,
    autoReconnect: params?.autoReconnect ?? DEFAULT_PARAMS.autoReconnect,
    maxRetries: params?.maxRetries ?? DEFAULT_PARAMS.maxRetries,
    reconnectDelay: params?.reconnectDelay ?? DEFAULT_PARAMS.reconnectDelay,
    reconnectDelayMax: params?.reconnectDelayMax ?? DEFAULT_PARAMS.reconnectDelayMax,
    connectionTimeout: params?.connectionTimeout ?? DEFAULT_PARAMS.connectionTimeout,
    heartbeatEnabled: params?.heartbeatEnabled ?? DEFAULT_PARAMS.heartbeatEnabled,
    heartbeatInterval: params?.heartbeatInterval ?? DEFAULT_PARAMS.heartbeatInterval,
    heartbeatMessage: params?.heartbeatMessage ?? DEFAULT_PARAMS.heartbeatMessage,
    heartbeatType: params?.heartbeatType ?? DEFAULT_PARAMS.heartbeatType,
  }
}

function canSendMessage(socketState) {
  return socketState === SOCKET_STATES.OPEN
}

function getSendError(socketState) {
  switch (socketState) {
    case SOCKET_STATES.CONNECTING:
      return createError(ERROR_CODES.CONNECTING_STATE)
    case SOCKET_STATES.CLOSING:
      return createError(ERROR_CODES.CLOSING_STATE)
    case SOCKET_STATES.CLOSED:
      return createError(ERROR_CODES.NOT_CONNECTED)
    default:
      return null
  }
}

function calculateReconnectDelay(attempt, baseDelay, maxDelay) {
  const delay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * delay
  return Math.min(delay + jitter, maxDelay)
}

function shouldReconnect(params, attemptCount, wasManualClose) {
  if (wasManualClose) return false
  if (!params.autoReconnect) return false
  if (params.maxRetries <= 0) return false
  return attemptCount < params.maxRetries
}

function createInitialState() {
  return {
    socketState: SOCKET_STATES.CLOSED,
    retryCount: 0,
    wasManualClose: false,
    lastError: null,
    lastCloseCode: null,
  }
}

function transitionState(currentState, event, data = {}) {
  const state = { ...currentState }
  
  switch (event) {
    case 'CONNECT_REQUEST':
      if (state.socketState === SOCKET_STATES.CLOSED) {
        state.socketState = SOCKET_STATES.CONNECTING
        state.wasManualClose = false
        state.lastError = null
        state.lastCloseCode = null
      }
      break

    case 'CONNECT_SUCCESS':
      if (state.socketState === SOCKET_STATES.CONNECTING) {
        state.socketState = SOCKET_STATES.OPEN
        state.retryCount = 0
        state.lastError = null
      }
      break

    case 'CONNECT_FAILED':
      if (state.socketState === SOCKET_STATES.CONNECTING) {
        state.socketState = SOCKET_STATES.CLOSED
        state.lastError = data.error || null
      }
      break

    case 'MANUAL_DISCONNECT':
      state.wasManualClose = true
      if (state.socketState !== SOCKET_STATES.CLOSED) {
        state.socketState = SOCKET_STATES.CLOSING
      }
      break

    case 'CLOSE_RECEIVED':
      state.socketState = SOCKET_STATES.CLOSED
      state.lastCloseCode = data.code || null
      state.lastError = data.error || null
      if (!state.wasManualClose && data.shouldRetry) {
        state.retryCount++
      }
      break

    case 'ERROR':
      state.lastError = data.error || null
      break

    case 'RESET_RETRY':
      state.retryCount = 0
      break
  }
  
  return state
}

export {
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
}
