import {
    KEY_NAMESPACE,
    STORAGE_TYPE,
    DOMAIN_PREFERENCES,
    STORAGE_TYPE_MATRIX,
    ERROR_CODES,
} from './constants.js';
import { createError, createSuccess, isQuotaExceededError, isPrivacyModeError } from './errors.js';

export class MemoryStorage {
    constructor() {
        this._store = new Map();
    }
    
    get length() {
        return this._store.size;
    }
    
    key(index) {
        const keys = Array.from(this._store.keys());
        return keys[index] || null;
    }
    
    getItem(key) {
        return this._store.get(key) || null;
    }
    
    setItem(key, value) {
        this._store.set(key, String(value));
    }
    
    removeItem(key) {
        this._store.delete(key);
    }
    
    clear() {
        this._store.clear();
    }
    
    getAll() {
        const result = {};
        this._store.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }
}

let globalMemoryStorage = null;

export function getMemoryStorage() {
    if (!globalMemoryStorage) {
        globalMemoryStorage = new MemoryStorage();
    }
    return globalMemoryStorage;
}

export function resetMemoryStorage() {
    globalMemoryStorage = null;
}

export function hasWindow() {
    return typeof window !== 'undefined';
}

export function detectStorageAvailability(type) {
    if (!hasWindow()) {
        return { available: false, reason: 'no_window' };
    }
    
    try {
        const storage = type === STORAGE_TYPE.LOCAL ? window.localStorage : window.sessionStorage;
        const testKey = `${KEY_NAMESPACE}test_${Date.now()}`;
        storage.setItem(testKey, 'test');
        storage.removeItem(testKey);
        return { available: true, storage };
    } catch (error) {
        if (isQuotaExceededError(error)) {
            return { available: false, reason: 'quota_exceeded', storage: null };
        }
        if (isPrivacyModeError(error)) {
            return { available: false, reason: 'privacy_mode', storage: null };
        }
        return { available: false, reason: 'unknown', storage: null };
    }
}

export function buildKey(domain, version) {
    return `${KEY_NAMESPACE}${domain}:${version}`;
}

export function isNamespaceKey(key) {
    return key && key.startsWith(KEY_NAMESPACE);
}

export function parseKey(key) {
    if (!isNamespaceKey(key)) {
        return null;
    }
    
    const withoutPrefix = key.slice(KEY_NAMESPACE.length);
    const parts = withoutPrefix.split(':');
    
    if (parts.length < 2) {
        return null;
    }
    
    const version = parts.pop();
    const domain = parts.join(':');
    
    return { domain, version, key };
}

export function getAllNamespaceKeys(storage) {
    if (!storage) return [];
    
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && isNamespaceKey(key)) {
            keys.push(key);
        }
    }
    return keys;
}

export function getStorageForDomain(domain) {
    if (!hasWindow()) {
        return {
            type: STORAGE_TYPE.NONE,
            storage: getMemoryStorage(),
            degraded: true,
            reason: 'no_window',
        };
    }
    
    const preferredType = STORAGE_TYPE_MATRIX[domain] || STORAGE_TYPE.LOCAL;
    
    const localCheck = detectStorageAvailability(STORAGE_TYPE.LOCAL);
    const sessionCheck = detectStorageAvailability(STORAGE_TYPE.SESSION);
    
    if (preferredType === STORAGE_TYPE.LOCAL && localCheck.available) {
        return {
            type: STORAGE_TYPE.LOCAL,
            storage: localCheck.storage,
            degraded: false,
        };
    }
    
    if (preferredType === STORAGE_TYPE.SESSION && sessionCheck.available) {
        return {
            type: STORAGE_TYPE.SESSION,
            storage: sessionCheck.storage,
            degraded: false,
        };
    }
    
    if (localCheck.available) {
        return {
            type: STORAGE_TYPE.LOCAL,
            storage: localCheck.storage,
            degraded: true,
            reason: 'fallback_from_' + preferredType,
        };
    }
    
    if (sessionCheck.available) {
        return {
            type: STORAGE_TYPE.SESSION,
            storage: sessionCheck.storage,
            degraded: true,
            reason: 'fallback_from_' + preferredType,
        };
    }
    
    return {
        type: STORAGE_TYPE.MEMORY,
        storage: getMemoryStorage(),
        degraded: true,
        reason: localCheck.reason || sessionCheck.reason || 'unknown',
    };
}

export function estimateSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function estimateByteSize(value) {
    if (value === null || value === undefined) return 0;
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (typeof Blob !== 'undefined') {
        return new Blob([str]).size;
    }
    return encodeURIComponent(str).replace(/%[0-9A-F]{2}/g, 'a').length;
}
