import { STORAGE_KEYS, LEASE_DURATION_MS } from './constants.js'

function generateClientId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

function createLeaseLock(options = {}) {
    const {
        storageKey = STORAGE_KEYS.DIRTY_LEASE,
        leaseDuration = LEASE_DURATION_MS,
        onLeaseLost = null,
        onLeaseAcquired = null,
        onOtherTabEditing = null,
    } = options

    const clientId = generateClientId()
    let hasLease = false
    let renewalTimer = null
    let checkTimer = null
    let subscribers = []

    function getLeaseData() {
        try {
            const raw = localStorage.getItem(storageKey)
            return raw ? JSON.parse(raw) : null
        } catch (e) {
            return null
        }
    }

    function setLeaseData(data) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(data))
        } catch (e) {
            // ignore
        }
    }

    function clearLeaseData() {
        try {
            localStorage.removeItem(storageKey)
        } catch (e) {
            // ignore
        }
    }

    function isLeaseExpired(leaseData) {
        if (!leaseData) return true
        return Date.now() - leaseData.timestamp > leaseData.duration
    }

    function isLeaseOurs(leaseData) {
        return leaseData && leaseData.clientId === clientId
    }

    function acquireLease() {
        const leaseData = getLeaseData()

        if (isLeaseExpired(leaseData) || isLeaseOurs(leaseData)) {
            setLeaseData({
                clientId,
                timestamp: Date.now(),
                duration: leaseDuration,
            })

            if (!hasLease && onLeaseAcquired) {
                onLeaseAcquired()
            }

            hasLease = true
            return true
        }

        if (hasLease) {
            hasLease = false
            if (onLeaseLost) {
                onLeaseLost()
            }
            notifySubscribers({ type: 'lease_lost' })
        }

        if (onOtherTabEditing) {
            onOtherTabEditing(leaseData)
        }

        return false
    }

    function renewLease() {
        if (!hasLease) return false
        return acquireLease()
    }

    function releaseLease() {
        const leaseData = getLeaseData()
        if (isLeaseOurs(leaseData)) {
            clearLeaseData()
        }
        hasLease = false
        stopRenewal()
    }

    function startRenewal(intervalMs = leaseDuration / 2) {
        stopRenewal()
        renewalTimer = setInterval(() => {
            if (hasLease) {
                renewLease()
            }
        }, intervalMs)
    }

    function stopRenewal() {
        if (renewalTimer) {
            clearInterval(renewalTimer)
            renewalTimer = null
        }
    }

    function startChecking(intervalMs = leaseDuration / 2) {
        stopChecking()
        checkTimer = setInterval(() => {
            if (!hasLease) {
                acquireLease()
            }
        }, intervalMs)
    }

    function stopChecking() {
        if (checkTimer) {
            clearInterval(checkTimer)
            checkTimer = null
        }
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

    function getClientId() {
        return clientId
    }

    function hasActiveLease() {
        return hasLease
    }

    function getOtherClientInfo() {
        const leaseData = getLeaseData()
        if (leaseData && !isLeaseOurs(leaseData)) {
            return {
                clientId: leaseData.clientId,
                remainingTime: Math.max(0, leaseDuration - (Date.now() - leaseData.timestamp)),
            }
        }
        return null
    }

    function handleStorageEvent(event) {
        if (event.key === storageKey) {
            const leaseData = getLeaseData()
            if (hasLease && !isLeaseOurs(leaseData)) {
                hasLease = false
                if (onLeaseLost) {
                    onLeaseLost()
                }
                notifySubscribers({ type: 'lease_lost' })
            }
        }
    }

    function init() {
        acquireLease()
        startRenewal()
        startChecking()
        window.addEventListener('storage', handleStorageEvent)
    }

    function destroy() {
        releaseLease()
        stopRenewal()
        stopChecking()
        window.removeEventListener('storage', handleStorageEvent)
        subscribers = []
    }

    init()

    return {
        acquireLease,
        renewLease,
        releaseLease,
        hasActiveLease,
        getClientId,
        getOtherClientInfo,
        subscribe,
        destroy,
    }
}

export { createLeaseLock, generateClientId }
