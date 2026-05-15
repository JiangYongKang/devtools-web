import {
  ERROR_CODES,
  DEFAULT_MAX_LISTENERS_PER_EVENT,
  DEFAULT_CIRCULAR_EMIT_THRESHOLD,
  DEFAULT_MERGE_WINDOW_MS,
  OVERFLOW_STRATEGIES,
  NAMESPACE_SEPARATOR,
  WILDCARD,
} from './constants.js'
import {
  createError,
} from './errors.js'
import {
  createDevLogBuffer,
} from './ringBuffer.js'

let _subscriberIdCounter = 0
function generateSubscriberId() {
  return `sub_${++_subscriberIdCounter}_${Date.now()}`
}

function isSerializable(value, visited = new WeakSet()) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  
  if (typeof value !== 'object') return false
  
  if (visited.has(value)) return false
  visited.add(value)
  
  if (Array.isArray(value)) {
    return value.every(item => isSerializable(item, visited))
  }
  
  if (value instanceof Date) return true
  if (value instanceof RegExp) return true
  
  if (Object.prototype.toString.call(value) === '[object Object]') {
    return Object.keys(value).every(key => isSerializable(value[key], visited))
  }
  
  return false
}

function matchEventName(pattern, eventName) {
  if (pattern === eventName) return true
  
  const patternParts = pattern.split(NAMESPACE_SEPARATOR)
  const eventParts = eventName.split(NAMESPACE_SEPARATOR)
  
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === WILDCARD) return true
    if (patternParts[i] !== eventParts[i]) return false
  }
  
  return patternParts.length === eventParts.length
}

function createPanelBus(options = {}) {
  const {
    maxListenersPerEvent = DEFAULT_MAX_LISTENERS_PER_EVENT,
    overflowStrategy = OVERFLOW_STRATEGIES.REJECT_NEW,
    circularEmitThreshold = DEFAULT_CIRCULAR_EMIT_THRESHOLD,
    mergeWindowMs = DEFAULT_MERGE_WINDOW_MS,
    devLogBufferSize = 1000,
    devMode = process.env.NODE_ENV !== 'production',
    validators = {},
  } = options

  const _subscribers = new Map()
  const _onceSubscribers = new Set()
  const _failedSubscribers = new Set()
  const _mergePending = new Map()
  const _errorHandlers = new Set()
  
  let _emitDepth = 0
  let _disposed = false
  
  const _devLog = createDevLogBuffer({
    bufferSize: devLogBufferSize,
    enabled: devMode,
  })

  function _getSubscribersForEvent(eventName) {
    const matched = []
    for (const [pattern, subscribers] of _subscribers) {
      if (matchEventName(pattern, eventName)) {
        matched.push(...subscribers)
      }
    }
    return matched
  }

  function _validatePayload(eventName, payload) {
    const validator = validators[eventName]
    if (validator) {
      const result = validator.safeParse(payload)
      if (!result.success) {
        throw createError(ERROR_CODES.INVALID_PAYLOAD, result.error.message, {
          eventName,
          validationError: result.error,
        })
      }
      return result.data
    }
    return payload
  }

  function _checkSerializable(payload) {
    if (devMode && !isSerializable(payload)) {
      throw createError(ERROR_CODES.NON_SERIALIZABLE_PAYLOAD, 'Payload contains non-serializable values', {
        payloadType: typeof payload,
      })
    }
  }

  function _invokeSubscriber(subscriber, eventName, payload) {
    if (_failedSubscribers.has(subscriber.id)) return

    try {
      subscriber.callback(payload, eventName)
      
      _devLog.add({
        type: 'subscriber_success',
        eventName,
        subscriberId: subscriber.id,
      })
    } catch (error) {
      if (error.errorCode === ERROR_CODES.CIRCULAR_EMIT_DETECTED) {
        throw error
      }
      
      _failedSubscribers.add(subscriber.id)
      
      const busError = createError(ERROR_CODES.SUBSCRIBER_ERROR, error.message, {
        eventName,
        subscriberId: subscriber.id,
        originalError: error,
      })
      
      _devLog.add({
        type: 'subscriber_error',
        eventName,
        subscriberId: subscriber.id,
        error: error.message,
      })

      for (const handler of _errorHandlers) {
        try {
          handler(busError)
        } catch (e) {
          // Ignore handler errors
        }
      }
    }
  }

  function _emitInternal(eventName, payload) {
    const validatedPayload = _validatePayload(eventName, payload)
    _checkSerializable(payload)
    
    const subscribers = _getSubscribersForEvent(eventName)
    
    _devLog.add({
      type: 'emit',
      eventName,
      subscriberCount: subscribers.length,
    })

    for (const subscriber of subscribers) {
      _invokeSubscriber(subscriber, eventName, validatedPayload)
      
      if (_onceSubscribers.has(subscriber.id)) {
        off(subscriber.id)
        _onceSubscribers.delete(subscriber.id)
      }
    }
  }

  function emit(eventName, payload) {
    if (_disposed) return
    
    _emitDepth++
    try {
      if (_emitDepth >= circularEmitThreshold) {
        throw createError(ERROR_CODES.CIRCULAR_EMIT_DETECTED, 'Circular emit detected', {
          depth: _emitDepth,
          threshold: circularEmitThreshold,
        })
      }
      
      _emitInternal(eventName, payload)
    } finally {
      _emitDepth--
    }
  }

  function emitAsync(eventName, payload) {
    if (_disposed) return Promise.resolve()
    
    return Promise.resolve().then(() => {
      emit(eventName, payload)
    })
  }

  function emitMerged(eventName, payload, key = 'default') {
    if (_disposed) return
    
    const mergeKey = `${eventName}:${key}`
    
    if (!_mergePending.has(mergeKey)) {
      _mergePending.set(mergeKey, {
        latestPayload: payload,
        timer: setTimeout(() => {
          const pending = _mergePending.get(mergeKey)
          if (pending) {
            emit(eventName, pending.latestPayload)
            _mergePending.delete(mergeKey)
          }
        }, mergeWindowMs),
      })
    } else {
      const pending = _mergePending.get(mergeKey)
      pending.latestPayload = payload
    }
  }

  function on(pattern, callback) {
    if (_disposed) return null
    
    if (!_subscribers.has(pattern)) {
      _subscribers.set(pattern, [])
    }
    
    const subscribers = _subscribers.get(pattern)
    
    if (subscribers.length >= maxListenersPerEvent) {
      if (overflowStrategy === OVERFLOW_STRATEGIES.DROP_OLDEST) {
        subscribers.shift()
      } else {
        throw createError(ERROR_CODES.MAX_LISTENERS_EXCEEDED, `Max listeners (${maxListenersPerEvent}) exceeded for event pattern "${pattern}"`)
      }
    }
    
    const subscriberId = generateSubscriberId()
    const subscriber = {
      id: subscriberId,
      pattern,
      callback,
    }
    
    subscribers.push(subscriber)
    
    _devLog.add({
      type: 'subscribe',
      pattern,
      subscriberId,
    })
    
    return subscriberId
  }

  function once(pattern, callback) {
    if (_disposed) return null
    
    const subscriberId = on(pattern, callback)
    if (subscriberId) {
      _onceSubscribers.add(subscriberId)
    }
    return subscriberId
  }

  function off(subscriberId) {
    if (!subscriberId) return
    
    for (const [pattern, subscribers] of _subscribers) {
      const index = subscribers.findIndex(s => s.id === subscriberId)
      if (index !== -1) {
        subscribers.splice(index, 1)
        
        _devLog.add({
          type: 'unsubscribe',
          pattern,
          subscriberId,
        })
        
        if (subscribers.length === 0) {
          _subscribers.delete(pattern)
        }
        break
      }
    }
    
    _onceSubscribers.delete(subscriberId)
    _failedSubscribers.delete(subscriberId)
  }

  function onError(handler) {
    _errorHandlers.add(handler)
    return () => _errorHandlers.delete(handler)
  }

  function getSubscriberCount(pattern) {
    if (!pattern) {
      let total = 0
      for (const subscribers of _subscribers.values()) {
        total += subscribers.length
      }
      return total
    }
    
    let count = 0
    const isPatternWithWildcard = pattern.includes(WILDCARD)
    
    for (const [storedPattern, subscribers] of _subscribers) {
      if (isPatternWithWildcard) {
        if (storedPattern === WILDCARD) {
          count += subscribers.length
        } else if (matchEventName(pattern, storedPattern)) {
          count += subscribers.length
        } else if (storedPattern.includes(WILDCARD)) {
          const patternPrefix = pattern.split(WILDCARD)[0]
          const storedPrefix = storedPattern.split(WILDCARD)[0]
          if (storedPrefix.startsWith(patternPrefix) || patternPrefix.startsWith(storedPrefix)) {
            count += subscribers.length
          }
        }
      } else {
        if (storedPattern === pattern) {
          count += subscribers.length
        }
      }
    }
    
    return count
  }

  function getFailedSubscriberIds() {
    return Array.from(_failedSubscribers)
  }

  function dispose() {
    _disposed = true
    
    for (const pending of _mergePending.values()) {
      clearTimeout(pending.timer)
    }
    _mergePending.clear()
    
    _subscribers.clear()
    _onceSubscribers.clear()
    _failedSubscribers.clear()
    _errorHandlers.clear()
    
    _devLog.add({
      type: 'dispose',
    })
  }

  function hotDispose() {
    dispose()
  }

  function getDevLog() {
    return _devLog
  }

  return {
    emit,
    emitAsync,
    emitMerged,
    on,
    once,
    off,
    onError,
    getSubscriberCount,
    getFailedSubscriberIds,
    dispose,
    hotDispose,
    getDevLog,
  }
}

export {
  createPanelBus,
  isSerializable,
  matchEventName,
  generateSubscriberId,
}
