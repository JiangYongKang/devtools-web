const ROUTER_MODES = {
    HASH: 'hash',
    HISTORY: 'history',
}

const NAVIGATION_TYPES = {
    USER: 'user',
    PROGRAMMATIC: 'programmatic',
}

const DIALOG_ACTIONS = {
    SAVE_AND_LEAVE: 'save_and_leave',
    DISCARD_AND_LEAVE: 'discard_and_leave',
    STAY: 'stay',
}

const STORAGE_KEYS = {
    DIRTY_LEASE: 'dirty_route_guard_lease',
}

const LEASE_DURATION_MS = 5000

const HASH_SEED = 5381

export {
    DIALOG_ACTIONS,
    HASH_SEED,
    LEASE_DURATION_MS,
    NAVIGATION_TYPES,
    ROUTER_MODES,
    STORAGE_KEYS,
}
