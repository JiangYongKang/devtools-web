import { DEBOUNCE_WINDOW_MS, HANDLED_MARKER } from './constants.js'

function isHandledEvent(event) {
    if (!event) return false
    if (event[HANDLED_MARKER]) return true
    const reason = event.reason || event.error
    if (reason && reason[HANDLED_MARKER]) return true
    return false
}

export function markHandled(value) {
    if (value && typeof value === 'object') {
        try {
            Object.defineProperty(value, HANDLED_MARKER, {
                value: true,
                enumerable: false,
                configurable: true,
            })
        } catch {
        }
    }
    return value
}

function normalizeEvent(event, eventType) {
    const result = {
        eventType,
        timestamp: Date.now(),
        isPromiseRejection: eventType === 'unhandledrejection',
    }

    if (eventType === 'unhandledrejection') {
        result.reason = event.reason
        result.promise = event.promise
    } else {
        result.error = event.error
        result.message = event.message
        result.filename = event.filename
        result.lineno = event.lineno
        result.colno = event.colno
    }

    return result
}

export function dedupeSimilar(normalizedEvents) {
    const seen = new Map()
    const result = []

    for (const event of normalizedEvents) {
        const error = event.isPromiseRejection ? event.reason : event.error
        const key = [
            event.eventType,
            error?.name || '',
            error?.message || '',
        ].join('||')

        if (!seen.has(key)) {
            seen.set(key, event)
            result.push(event)
        }
    }

    return result
}

function createDebouncedAggregator(callback, windowMs = DEBOUNCE_WINDOW_MS) {
    let queue = []
    let timer = null

    function flush() {
        if (queue.length === 0) return
        const events = dedupeSimilar(queue)
        queue = []
        timer = null
        callback(events)
    }

    return {
        add(event) {
            queue.push(event)
            if (!timer) {
                timer = setTimeout(flush, windowMs)
            }
        },
        flush,
        cancel() {
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
            queue = []
        },
        getQueueSize() {
            return queue.length
        },
    }
}

let singletonInstance = null

export function isListenerActive() {
    return singletonInstance !== null
}

export function createGlobalErrorListener(onEvents) {
    if (isListenerActive()) {
        return null
    }

    const aggregator = createDebouncedAggregator(onEvents)

    function handleGlobalError(event) {
        if (isHandledEvent(event)) return
        aggregator.add(normalizeEvent(event, 'error'))
    }

    function handleUnhandledRejection(event) {
        if (isHandledEvent(event)) return
        aggregator.add(normalizeEvent(event, 'unhandledrejection'))
    }

    const instance = {
        start() {
            if (typeof window !== 'undefined') {
                window.addEventListener('error', handleGlobalError)
                window.addEventListener('unhandledrejection', handleUnhandledRejection)
            }
        },
        stop() {
            if (typeof window !== 'undefined') {
                window.removeEventListener('error', handleGlobalError)
                window.removeEventListener('unhandledrejection', handleUnhandledRejection)
            }
            aggregator.cancel()
        },
        flush() {
            aggregator.flush()
        },
        getQueueSize() {
            return aggregator.getQueueSize()
        },
    }

    singletonInstance = instance
    return instance
}

export function clearSingleton() {
    singletonInstance = null
}
