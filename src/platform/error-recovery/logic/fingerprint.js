import { FINGERPRINT_WINDOW_MS, MAX_REPORTS_PER_WINDOW } from './constants.js'

function simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return String(Math.abs(hash))
}

function extractFingerprintComponents(error, componentStack = null) {
    const name = error?.name || 'UnknownError'
    const message = error?.message || ''
    const stack = error?.stack || ''

    const firstStackLine = stack.split('\n')[1] || stack.split('\n')[0] || ''

    const cleanStackLine = firstStackLine
        .replace(/@[^@]+$/, '')
        .replace(/\(.*\)/, '')
        .replace(/\s+at\s+/, '')
        .trim()

    return {
        name,
        message: message.substring(0, 200),
        stackKey: cleanStackLine,
        componentStack: componentStack ? componentStack.substring(0, 300) : null,
    }
}

export function generateFingerprint(error, componentStack = null) {
    if (!error) {
        return 'null-error'
    }

    const components = extractFingerprintComponents(error, componentStack)

    const fingerprintString = [
        components.name,
        components.stackKey,
        components.message,
        components.componentStack,
    ].filter(Boolean).join('||')

    return simpleHash(fingerprintString)
}

class ThrottleStore {
    constructor() {
        this.store = new Map()
    }

    get(fingerprint) {
        const entry = this.store.get(fingerprint)
        if (!entry) return null

        const now = Date.now()
        if (now - entry.windowStart > FINGERPRINT_WINDOW_MS) {
            this.store.delete(fingerprint)
            return null
        }

        return entry
    }

    increment(fingerprint) {
        let entry = this.get(fingerprint)
        const now = Date.now()

        if (!entry) {
            entry = {
                windowStart: now,
                count: 0,
            }
            this.store.set(fingerprint, entry)
        }

        entry.count += 1
        return entry.count
    }

    clear() {
        this.store.clear()
    }
}

export function createThrottleStore() {
    return new ThrottleStore()
}

export function shouldReport(fingerprint, store) {
    const entry = store.get(fingerprint)

    if (!entry) {
        return {
            shouldReport: true,
            count: 0,
        }
    }

    if (entry.count >= MAX_REPORTS_PER_WINDOW) {
        return {
            shouldReport: false,
            count: entry.count,
        }
    }

    return {
        shouldReport: true,
        count: entry.count,
    }
}

export function recordReport(fingerprint, store) {
    return store.increment(fingerprint)
}
