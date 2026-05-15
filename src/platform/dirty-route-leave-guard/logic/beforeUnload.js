import { NAVIGATION_TYPES } from './constants.js'

function createBeforeUnloadGuard(dirtyScope, options = {}) {
    const {
        message = '您有未保存的更改，确定要离开吗？',
        enableOnUserEditOnly = true,
    } = options

    let isEnabled = false
    let lastNavigationType = NAVIGATION_TYPES.USER
    let hasUserEdited = false
    let unsubscribeScope = null

    function handleBeforeUnload(event) {
        if (!isEnabled) return
        if (enableOnUserEditOnly && !hasUserEdited) return

        const isDirtyNow = dirtyScope.isDirty()
        if (!isDirtyNow) return

        event.preventDefault()
        event.returnValue = message
        return message
    }

    function enable() {
        if (!isEnabled) {
            window.addEventListener('beforeunload', handleBeforeUnload)
            isEnabled = true
        }
    }

    function disable() {
        if (isEnabled) {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            isEnabled = false
        }
    }

    function markUserEdited() {
        hasUserEdited = true
        enable()
    }

    function markProgrammaticNavigation() {
        lastNavigationType = NAVIGATION_TYPES.PROGRAMMATIC
    }

    function markUserNavigation() {
        lastNavigationType = NAVIGATION_TYPES.USER
    }

    function getLastNavigationType() {
        return lastNavigationType
    }

    function shouldBlockNavigation() {
        if (!hasUserEdited && enableOnUserEditOnly) return false
        return dirtyScope.isDirty()
    }

    function resetEditFlag() {
        hasUserEdited = false
    }

    function init() {
        unsubscribeScope = dirtyScope.subscribe((event) => {
            if (event.type === 'dirty') {
                enable()
            } else if (event.type === 'clean') {
                disable()
            }
        })
    }

    function destroy() {
        disable()
        if (unsubscribeScope) {
            unsubscribeScope()
            unsubscribeScope = null
        }
    }

    init()

    return {
        enable,
        disable,
        markUserEdited,
        markProgrammaticNavigation,
        markUserNavigation,
        getLastNavigationType,
        shouldBlockNavigation,
        resetEditFlag,
        destroy,
        isEnabled: () => isEnabled,
        hasUserEdited: () => hasUserEdited,
    }
}

export { createBeforeUnloadGuard }
