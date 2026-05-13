import { KEY_NAMESPACE, KEY_PRIORITY, ERROR_CODES, DOMAIN_PREFERENCES } from './constants.js';
import { createError, createSuccess } from './errors.js';
import { getAllNamespaceKeys, estimateByteSize, parseKey } from './storage.js';

export class LRUManager {
    constructor() {
        this.accessLog = new Map();
    }
    
    recordAccess(key) {
        this.accessLog.set(key, Date.now());
    }
    
    getLastAccess(key) {
        return this.accessLog.get(key) || 0;
    }
    
    getPriority(domain) {
        return KEY_PRIORITY[domain] || 0;
    }
    
    sortKeysForEviction(keys) {
        return keys.slice().sort((a, b) => {
            const parsedA = parseKey(a);
            const parsedB = parseKey(b);
            
            if (!parsedA || !parsedB) return 0;
            
            const priorityA = this.getPriority(parsedA.domain);
            const priorityB = this.getPriority(parsedB.domain);
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            const accessA = this.getLastAccess(a);
            const accessB = this.getLastAccess(b);
            
            return accessA - accessB;
        });
    }
    
    tryEvict(storage, requiredBytes = 0, maxAttempts = 10) {
        if (!storage) {
            return createError(ERROR_CODES.LRU_EVICTION_FAILED, { reason: 'no_storage' });
        }
        
        const keys = getAllNamespaceKeys(storage);
        if (keys.length === 0) {
            return createError(ERROR_CODES.LRU_EVICTION_FAILED, { reason: 'no_keys_to_evict' });
        }
        
        const sortedKeys = this.sortKeysForEviction(keys);
        const evicted = [];
        let freedBytes = 0;
        let attempts = 0;
        
        for (const key of sortedKeys) {
            if (attempts >= maxAttempts) break;
            if (freedBytes >= requiredBytes && requiredBytes > 0) break;
            
            try {
                const value = storage.getItem(key);
                const bytes = estimateByteSize(value);
                
                storage.removeItem(key);
                this.accessLog.delete(key);
                
                evicted.push({ key, bytes });
                freedBytes += bytes;
                attempts++;
            } catch (error) {
                continue;
            }
        }
        
        if (evicted.length === 0) {
            return createError(ERROR_CODES.LRU_EVICTION_FAILED, { reason: 'eviction_failed' });
        }
        
        return createSuccess({
            evicted,
            freedBytes,
            attempts,
        });
    }
}

let globalLRUManager = null;

export function getLRUManager() {
    if (!globalLRUManager) {
        globalLRUManager = new LRUManager();
    }
    return globalLRUManager;
}

export function resetLRUManager() {
    globalLRUManager = null;
}
