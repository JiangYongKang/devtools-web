import { KEY_NAMESPACE, STORAGE_VERSIONS, STORAGE_TYPE, ERROR_CODES } from './constants.js';
import { createSuccess, createError, wrapError, isQuotaExceededError } from './errors.js';

export function hasWindow() {
    return typeof window !== 'undefined';
}

export function buildKey(version = STORAGE_VERSIONS.LATEST) {
    return `${KEY_NAMESPACE}v${version}`;
}

export function isNamespaceKey(key) {
    return typeof key === 'string' && key.startsWith(KEY_NAMESPACE);
}

export function estimateByteSize(value) {
    if (typeof value === 'string') {
        return new Blob([value]).size;
    }
    try {
        return new Blob([JSON.stringify(value)]).size;
    } catch {
        return 0;
    }
}

export function estimateSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class MemoryStorage {
    constructor() {
        this._data = new Map();
    }

    getItem(key) {
        return this._data.get(key) || null;
    }

    setItem(key, value) {
        this._data.set(key, String(value));
    }

    removeItem(key) {
        this._data.delete(key);
    }

    clear() {
        this._data.clear();
    }

    getAll() {
        const result = {};
        for (const [key, value] of this._data.entries()) {
            result[key] = value;
        }
        return result;
    }

    get length() {
        return this._data.size;
    }
}

let _globalMemoryStorage = null;

export function getGlobalMemoryStorage() {
    if (!_globalMemoryStorage) {
        _globalMemoryStorage = new MemoryStorage();
    }
    return _globalMemoryStorage;
}

export function resetGlobalMemoryStorage() {
    _globalMemoryStorage = null;
}

export function getStorage() {
    if (!hasWindow()) {
        return {
            type: STORAGE_TYPE.MEMORY,
            storage: getGlobalMemoryStorage(),
            degraded: true,
            reason: ERROR_CODES.STORAGE_UNAVAILABLE,
        };
    }

    try {
        const testKey = `${KEY_NAMESPACE}_test`;
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return {
            type: STORAGE_TYPE.LOCAL,
            storage: localStorage,
            degraded: false,
        };
    } catch (error) {
        return {
            type: STORAGE_TYPE.MEMORY,
            storage: getGlobalMemoryStorage(),
            degraded: true,
            reason: isQuotaExceededError(error) ? ERROR_CODES.QUOTA_EXCEEDED : ERROR_CODES.PRIVACY_MODE,
        };
    }
}

export function getAllNamespaceKeys(storage) {
    const keys = [];
    if (storage instanceof MemoryStorage) {
        for (const key of storage._data.keys()) {
            if (isNamespaceKey(key)) {
                keys.push(key);
            }
        }
    } else {
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (isNamespaceKey(key)) {
                keys.push(key);
            }
        }
    }
    return keys;
}

export function getAllNamespaceStats(storage) {
    const keys = getAllNamespaceKeys(storage);
    let totalBytes = 0;
    const keyStats = [];

    for (const key of keys) {
        const value = storage.getItem(key);
        const bytes = estimateByteSize(value);
        totalBytes += bytes;
        keyStats.push({
            key,
            bytes,
            humanReadable: estimateSize(bytes),
        });
    }

    return {
        totalBytes,
        totalHumanReadable: estimateSize(totalBytes),
        keyCount: keys.length,
        keys: keyStats,
    };
}

export function clearAllNamespace(storage) {
    const keys = getAllNamespaceKeys(storage);
    const removed = [];

    for (const key of keys) {
        try {
            storage.removeItem(key);
            removed.push(key);
        } catch (error) {
            continue;
        }
    }

    return {
        success: true,
        removedKeys: removed,
    };
}
