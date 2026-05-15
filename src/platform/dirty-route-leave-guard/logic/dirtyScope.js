import { HASH_SEED } from './constants.js'
import { ERROR_CODES, createError } from './errors.js'

function defaultHashFn(obj) {
    try {
        const str = JSON.stringify(obj)
        let hash = HASH_SEED
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
        }
        return hash >>> 0
    } catch (e) {
        throw createError(ERROR_CODES.HASH_FUNCTION_ERROR, e.message)
    }
}

function deepEqual(a, b, ignorePaths = new Set(), currentPath = '') {
    if (ignorePaths.has(currentPath)) return true

    if (a === b) return true
    if (a === null || b === null) return false
    if (typeof a !== typeof b) return false

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false
        for (let i = 0; i < a.length; i++) {
            const path = currentPath ? `${currentPath}[${i}]` : `[${i}]`
            if (!deepEqual(a[i], b[i], ignorePaths, path)) return false
        }
        return true
    }

    if (typeof a === 'object') {
        if (Array.isArray(b)) return false
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        if (keysA.length !== keysB.length) return false
        for (const key of keysA) {
            if (!keysB.includes(key)) return false
            const path = currentPath ? `${currentPath}.${key}` : key
            if (!deepEqual(a[key], b[key], ignorePaths, path)) return false
        }
        return true
    }

    return false
}

function filterIgnoredPaths(obj, ignorePaths) {
    if (ignorePaths.size === 0) return obj

    const result = JSON.parse(JSON.stringify(obj))

    function removePath(target, pathParts) {
        if (pathParts.length === 0) return

        const current = pathParts[0]
        const remaining = pathParts.slice(1)

        if (current.startsWith('[') && current.endsWith(']')) {
            const index = parseInt(current.slice(1, -1), 10)
            if (remaining.length === 0) {
                if (Array.isArray(target)) {
                    target.splice(index, 1)
                }
            } else {
                if (target && Array.isArray(target)) {
                    removePath(target[index], remaining)
                }
            }
        } else {
            if (remaining.length === 0) {
                if (target && typeof target === 'object') {
                    delete target[current]
                }
            } else {
                if (target && typeof target === 'object' && target[current]) {
                    removePath(target[current], remaining)
                }
            }
        }
    }

    for (const path of ignorePaths) {
        const parts = path.replace(/\[(\d+)\]/g, '\[$1\]').split('.').map(p =>
            p.replace(/\\\[(\d+)\\\]/g, '[$1]')
        )
        removePath(result, parts)
    }

    return result
}

function createDirtyScope(options = {}) {
    const { hashFn = defaultHashFn, initialState = {}, ignorePaths = [] } = options

    const ignorePathSet = new Set(ignorePaths)

    let snapshot = JSON.parse(JSON.stringify(initialState))
    let current = JSON.parse(JSON.stringify(initialState))
    let subscribers = []
    let lastDirtyState = false
    let dirtyTransitionCount = 0

    function getSnapshot() {
        return JSON.parse(JSON.stringify(snapshot))
    }

    function getCurrent() {
        return JSON.parse(JSON.stringify(current))
    }

    function setCurrent(newState) {
        const prevDirty = isDirty()
        current = JSON.parse(JSON.stringify(newState))
        const nowDirty = isDirty()

        if (prevDirty !== nowDirty) {
            dirtyTransitionCount++
            notifySubscribers({
                type: nowDirty ? 'dirty' : 'clean',
                current,
                snapshot,
            })
        }

        lastDirtyState = nowDirty
    }

    function isDirty() {
        const filteredCurrent = filterIgnoredPaths(current, ignorePathSet)
        const filteredSnapshot = filterIgnoredPaths(snapshot, ignorePathSet)
        return !deepEqual(filteredCurrent, filteredSnapshot, ignorePathSet)
    }

    function getDirtyHash() {
        const filteredCurrent = filterIgnoredPaths(current, ignorePathSet)
        return hashFn(filteredCurrent)
    }

    function getSnapshotHash() {
        const filteredSnapshot = filterIgnoredPaths(snapshot, ignorePathSet)
        return hashFn(filteredSnapshot)
    }

    function markClean() {
        const wasDirty = isDirty()
        snapshot = JSON.parse(JSON.stringify(current))

        if (wasDirty) {
            dirtyTransitionCount++
            notifySubscribers({
                type: 'clean',
                current,
                snapshot,
            })
        }
        lastDirtyState = false
    }

    function reset(newInitialState = null) {
        const wasDirty = isDirty()

        if (newInitialState !== null) {
            snapshot = JSON.parse(JSON.stringify(newInitialState))
            current = JSON.parse(JSON.stringify(newInitialState))
        } else {
            current = JSON.parse(JSON.stringify(snapshot))
        }

        if (wasDirty) {
            dirtyTransitionCount++
            notifySubscribers({
                type: 'clean',
                current,
                snapshot,
            })
        }
        lastDirtyState = false
    }

    function subscribe(callback) {
        subscribers.push(callback)
        return () => {
            subscribers = subscribers.filter(cb => cb !== callback)
        }
    }

    function notifySubscribers(event) {
        for (const callback of subscribers) {
            callback(event)
        }
    }

    function getDirtyFields() {
        const dirtyFields = []

        function check(currentVal, snapshotVal, path = '') {
            if (ignorePathSet.has(path)) return

            if (
                currentVal !== null &&
                currentVal !== undefined &&
                typeof currentVal === 'object' &&
                !Array.isArray(currentVal) &&
                !(currentVal instanceof Date) &&
                snapshotVal !== null &&
                snapshotVal !== undefined &&
                typeof snapshotVal === 'object' &&
                !Array.isArray(snapshotVal) &&
                !(snapshotVal instanceof Date)
            ) {
                const allKeys = new Set([
                    ...Object.keys(currentVal || {}),
                    ...Object.keys(snapshotVal || {}),
                ])

                for (const key of allKeys) {
                    const fullPath = path ? `${path}.${key}` : key
                    check(currentVal?.[key], snapshotVal?.[key], fullPath)
                }
                return
            }

            if (Array.isArray(currentVal) && Array.isArray(snapshotVal)) {
                const maxLen = Math.max(currentVal.length, snapshotVal.length)
                for (let i = 0; i < maxLen; i++) {
                    const fullPath = `${path}[${i}]`
                    check(currentVal?.[i], snapshotVal?.[i], fullPath)
                }
                return
            }

            if (!deepEqual(currentVal, snapshotVal)) {
                dirtyFields.push(path)
            }
        }

        check(current, snapshot)
        return dirtyFields
    }

    function getStatistics() {
        return {
            isDirty: isDirty(),
            dirtyTransitionCount,
            lastDirtyState,
            ignorePaths: Array.from(ignorePathSet),
        }
    }

    function addIgnorePath(path) {
        ignorePathSet.add(path)
    }

    function removeIgnorePath(path) {
        ignorePathSet.delete(path)
    }

    return {
        getSnapshot,
        getCurrent,
        setCurrent,
        isDirty,
        getDirtyHash,
        getSnapshotHash,
        markClean,
        reset,
        subscribe,
        getDirtyFields,
        getStatistics,
        addIgnorePath,
        removeIgnorePath,
    }
}

export { createDirtyScope, deepEqual, defaultHashFn, filterIgnoredPaths }
