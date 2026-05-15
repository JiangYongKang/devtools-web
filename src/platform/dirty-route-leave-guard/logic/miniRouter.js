import { ROUTER_MODES, NAVIGATION_TYPES, DIALOG_ACTIONS } from './constants.js'

function createMiniRouter(options = {}) {
    const { mode = ROUTER_MODES.HASH, basePath = '' } = options

    let currentPath = ''
    let subscribers = []
    let navigationGuard = null
    let lastNavigationType = NAVIGATION_TYPES.USER

    function getCurrentPath() {
        return currentPath
    }

    function parsePath() {
        if (mode === ROUTER_MODES.HASH) {
            return window.location.hash.replace('#', '') || '/'
        } else {
            return window.location.pathname.replace(basePath, '') || '/'
        }
    }

    function updatePath(path) {
        if (mode === ROUTER_MODES.HASH) {
            window.location.hash = path
        } else {
            window.history.pushState({}, '', basePath + path)
        }
        currentPath = path
    }

    function replacePath(path) {
        if (mode === ROUTER_MODES.HASH) {
            const url = new URL(window.location.href)
            url.hash = path
            window.history.replaceState({}, '', url.href)
        } else {
            window.history.replaceState({}, '', basePath + path)
        }
        currentPath = path
    }

    function navigate(path, options = {}) {
        const { replace = false, triggerGuard = true } = options

        if (triggerGuard && navigationGuard) {
            const shouldBlock = navigationGuard({
                from: currentPath,
                to: path,
                navigationType: lastNavigationType,
            })
            if (shouldBlock) {
                return false
            }
        }

        if (replace) {
            replacePath(path)
        } else {
            updatePath(path)
        }

        notifySubscribers({
            type: 'navigate',
            from: currentPath,
            to: path,
            navigationType: lastNavigationType,
        })

        return true
    }

    function setNavigationGuard(guard) {
        navigationGuard = guard
    }

    function removeNavigationGuard() {
        navigationGuard = null
    }

    function setNavigationType(type) {
        lastNavigationType = type
    }

    function getNavigationType() {
        return lastNavigationType
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

    function handlePopState() {
        const newPath = parsePath()
        const oldPath = currentPath

        if (newPath !== oldPath) {
            currentPath = newPath
            notifySubscribers({
                type: 'popstate',
                from: oldPath,
                to: newPath,
                navigationType: lastNavigationType,
            })
        }
    }

    function init() {
        currentPath = parsePath()
        window.addEventListener('popstate', handlePopState)
    }

    function destroy() {
        window.removeEventListener('popstate', handlePopState)
        subscribers = []
        navigationGuard = null
    }

    init()

    return {
        getCurrentPath,
        navigate,
        setNavigationGuard,
        removeNavigationGuard,
        setNavigationType,
        getNavigationType,
        subscribe,
        destroy,
    }
}

function createRouteGuard(dirtyScope, beforeUnloadGuard, options = {}) {
    const {
        onBeforeBlock = null,
        saveHandler = null,
        discardHandler = null,
    } = options

    let pendingNavigation = null
    let dialogVisible = false

    function guard(navigationInfo) {
        const { from, to, navigationType } = navigationInfo

        if (!beforeUnloadGuard.shouldBlockNavigation()) {
            return false
        }

        if (navigationType === NAVIGATION_TYPES.PROGRAMMATIC) {
            return false
        }

        pendingNavigation = { from, to, navigationType }
        dialogVisible = true

        if (onBeforeBlock) {
            onBeforeBlock({
                from,
                to,
                onAction: handleDialogAction,
            })
        }

        return true
    }

    async function handleDialogAction(action) {
        if (!pendingNavigation) return

        const { to } = pendingNavigation

        switch (action) {
            case DIALOG_ACTIONS.SAVE_AND_LEAVE:
                if (saveHandler) {
                    await saveHandler()
                }
                dirtyScope.markClean()
                beforeUnloadGuard.resetEditFlag()
                dialogVisible = false
                pendingNavigation = null
                return true

            case DIALOG_ACTIONS.DISCARD_AND_LEAVE:
                if (discardHandler) {
                    await discardHandler()
                }
                dirtyScope.reset()
                beforeUnloadGuard.resetEditFlag()
                dialogVisible = false
                pendingNavigation = null
                return true

            case DIALOG_ACTIONS.STAY:
            default:
                dialogVisible = false
                pendingNavigation = null
                return false
        }
    }

    function getPendingNavigation() {
        return pendingNavigation
    }

    function isDialogVisible() {
        return dialogVisible
    }

    return {
        guard,
        handleDialogAction,
        getPendingNavigation,
        isDialogVisible,
    }
}

export { createMiniRouter, createRouteGuard }
