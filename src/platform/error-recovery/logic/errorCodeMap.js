import { ERROR_CODES } from './errors.js'

function normalizeName(name) {
    return (name || '').toLowerCase().replace(/\s+/g, '')
}

function matchByName(name, mapping) {
    const normalized = normalizeName(name)
    for (const [pattern, code] of Object.entries(mapping)) {
        if (normalized.includes(pattern.toLowerCase())) {
            return code
        }
    }
    return null
}

const DOM_EXCEPTION_MAPPING = {
    notfounderror: ERROR_CODES.DOM_EXCEPTION,
    securityerror: ERROR_CODES.DOM_EXCEPTION,
    syntaxerror: ERROR_CODES.DOM_EXCEPTION,
    typeerror: ERROR_CODES.DOM_EXCEPTION,
    quotaexceedederror: ERROR_CODES.DOM_EXCEPTION,
    invalidstateerror: ERROR_CODES.DOM_EXCEPTION,
    networkerror: ERROR_CODES.NETWORK_ERROR,
}

const STACK_PATTERN_MAPPING = {
    'render()': ERROR_CODES.RENDER_ERROR,
    'useeffect': ERROR_CODES.ASYNC_EFFECT_ERROR,
    'uselayouteffect': ERROR_CODES.ASYNC_EFFECT_ERROR,
}

function isNetworkError(error) {
    if (error instanceof TypeError) {
        const msg = (error.message || '').toLowerCase()
        return msg.includes('fetch') ||
            msg.includes('network') ||
            msg.includes('xmlhttprequest')
    }
    return false
}

function isPromiseRejection(eventType, error) {
    if (eventType === 'unhandledrejection') return true
    return error && typeof error === 'object' && error.constructor &&
        error.constructor.name === 'PromiseRejectionEvent'
}

export function mapToErrorCode(error, eventType = null) {
    if (!error) {
        return ERROR_CODES.UNKNOWN_ERROR
    }

    if (isPromiseRejection(eventType, error)) {
        const reason = error.reason || error
        if (reason instanceof DOMException) {
            return ERROR_CODES.DOM_EXCEPTION
        }
        return ERROR_CODES.PROMISE_REJECTION
    }

    if (error instanceof DOMException) {
        const code = matchByName(error.name, DOM_EXCEPTION_MAPPING)
        return code || ERROR_CODES.DOM_EXCEPTION
    }

    if (isNetworkError(error)) {
        return ERROR_CODES.NETWORK_ERROR
    }

    if (error.stack) {
        const stackLower = error.stack.toLowerCase()
        for (const [pattern, code] of Object.entries(STACK_PATTERN_MAPPING)) {
            if (stackLower.includes(pattern.toLowerCase())) {
                return code
            }
        }
    }

    if (error instanceof TypeError) {
        return ERROR_CODES.EVENT_HANDLER_ERROR
    }

    if (error instanceof SyntaxError) {
        return ERROR_CODES.DOM_EXCEPTION
    }

    if (error.message) {
        const msgLower = error.message.toLowerCase()
        if (msgLower.includes('render')) return ERROR_CODES.RENDER_ERROR
        if (msgLower.includes('effect')) return ERROR_CODES.ASYNC_EFFECT_ERROR
    }

    return ERROR_CODES.UNKNOWN_ERROR
}
