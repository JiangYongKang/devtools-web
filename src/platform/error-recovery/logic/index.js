import { SOURCE_PATH_PRODUCTION_PATTERNS, STORAGE_KEY_DRAFTS, ENVIRONMENTS } from './constants.js'

function getEnvironment() {
    if (typeof process !== 'undefined' && process.env) {
        return process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT
    }
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.MODE || import.meta.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT
    }
    return ENVIRONMENTS.DEVELOPMENT
}

function getBuildId() {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.VITE_BUILD_ID ||
            import.meta.env.BUILD_ID ||
            null
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env.BUILD_ID ||
            process.env.VITE_BUILD_ID ||
            null
    }
    return null
}

function getUserAgent() {
    if (typeof navigator !== 'undefined') {
        return navigator.userAgent
    }
    return null
}

function getCurrentRoute() {
    if (typeof location !== 'undefined') {
        return {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            href: location.href,
        }
    }
    return null
}

function getTimestamp() {
    return {
        epoch: Date.now(),
        iso: new Date().toISOString(),
    }
}

function isProductionPath(path) {
    if (!path) return false
    return SOURCE_PATH_PRODUCTION_PATTERNS.some((pattern) => pattern.test(path))
}

function cleanStackTraceForProduction(stack) {
    if (!stack) return stack

    const lines = stack.split('\n')
    const cleanedLines = lines.map((line) => {
        const pathMatch = line.match(/\(([^)]+)\)|@([^\s]+)/)
        if (pathMatch) {
            const path = pathMatch[1] || pathMatch[2]
            if (isProductionPath(path)) {
                return line.substring(0, pathMatch.index) + '[hidden_path]'
            }
        }
        return line
    })

    return cleanedLines.join('\n')
}

function sanitizeComponentStack(componentStack) {
    if (!componentStack) return null
    return componentStack
}

function serializeError(error) {
    if (!error) return null

    const env = getEnvironment()
    const isProd = env === ENVIRONMENTS.PRODUCTION

    return {
        name: error.name || 'Error',
        message: error.message || '',
        stack: isProd
            ? cleanStackTraceForProduction(error.stack)
            : error.stack,
        cause: error.cause ? String(error.cause) : null,
        code: error.code || null,
    }
}

export function assembleDiagnosticPackage(options = {}) {
    const {
        error,
        componentStack = null,
        source,
        errorCode,
        errorMessage,
        customContext = null,
    } = options

    return {
        schemaVersion: '1.0.0',
        timestamp: getTimestamp(),
        buildId: getBuildId(),
        environment: getEnvironment(),
        userAgent: getUserAgent(),
        route: getCurrentRoute(),
        source,
        error: serializeError(error),
        errorCode,
        errorMessage,
        componentStack: sanitizeComponentStack(componentStack),
        customContext,
    }
}

export function serializeDiagnosticPackage(diagnosticPackage) {
    return JSON.stringify(diagnosticPackage, null, 2)
}

export async function copyToClipboard(text) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
        return { success: false, error: 'clipboard_not_available' }
    }

    try {
        await navigator.clipboard.writeText(text)
        return { success: true }
    } catch (err) {
        return { success: false, error: err.message || 'copy_failed' }
    }
}

export function getDraftsStorage() {
    if (typeof localStorage === 'undefined') return null
    return localStorage
}

export function loadDrafts(storage = null) {
    const targetStorage = storage || getDraftsStorage()
    if (!targetStorage) return []

    try {
        const raw = targetStorage.getItem(STORAGE_KEY_DRAFTS)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

export function saveDrafts(drafts, storage = null) {
    const targetStorage = storage || getDraftsStorage()
    if (!targetStorage) return { success: false, error: 'storage_unavailable' }

    try {
        targetStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts))
        return { success: true }
    } catch (err) {
        return { success: false, error: err.message || 'save_failed' }
    }
}

export function clearDrafts(storage = null) {
    const targetStorage = storage || getDraftsStorage()
    if (!targetStorage) return { success: false, error: 'storage_unavailable' }

    try {
        targetStorage.removeItem(STORAGE_KEY_DRAFTS)
        return { success: true }
    } catch (err) {
        return { success: false, error: err.message || 'clear_failed' }
    }
}

export function getEnvironmentInfo() {
    return {
        environment: getEnvironment(),
        buildId: getBuildId(),
        userAgent: getUserAgent(),
        route: getCurrentRoute(),
    }
}

export { cleanStackTraceForProduction, isProductionPath }
