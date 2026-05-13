import {
    KEY_NAMESPACE,
    STORAGE_VERSIONS,
    MERGE_STRATEGIES,
    STORAGE_TYPE,
    ERROR_CODES,
    DOMAIN_PREFERENCES,
} from './constants.js';
import { createError, createSuccess, isQuotaExceededError } from './errors.js';
import {
    createPreferenceRecord,
    runMigrationPipeline,
    isValidPreferenceRecord,
} from './schema.js';
import {
    buildKey,
    isNamespaceKey,
    parseKey,
    getStorageForDomain,
    getAllNamespaceKeys,
    estimateByteSize,
    estimateSize,
    hasWindow,
    MemoryStorage,
    resetMemoryStorage,
} from './storage.js';
import { getLRUManager, resetLRUManager, LRUManager } from './lru.js';
import { mergeWithStrategy, deepMerge, shallowMerge } from './merge.js';
import {
    createExportPackage,
    serializeExportPackage,
    deserializeExportPackage,
    parseImportPackage,
    calculateChecksum,
    verifyChecksum,
    containsXssRisk,
} from './import-export.js';

class PreferenceStore {
    constructor(options = {}) {
        this._domain = options.domain || DOMAIN_PREFERENCES.LAYOUT;
        this._version = options.version || STORAGE_VERSIONS.LATEST;
        this._mergeStrategy = options.mergeStrategy || MERGE_STRATEGIES.SHALLOW;
        this._lruManager = options.lruManager || getLRUManager();
        this._customStorage = options.customStorage || null;
        this._storageInfo = null;
        this._initStorage();
    }
    
    _initStorage() {
        if (this._customStorage) {
            this._storageInfo = {
                type: STORAGE_TYPE.MEMORY,
                storage: this._customStorage,
                degraded: false,
                custom: true,
            };
        } else {
            this._storageInfo = getStorageForDomain(this._domain);
        }
    }
    
    get storageInfo() {
        return { ...this._storageInfo };
    }
    
    get key() {
        return buildKey(this._domain, this._version);
    }
    
    _serialize(data) {
        try {
            return JSON.stringify(data);
        } catch (error) {
            return createError(ERROR_CODES.SERIALIZATION_ERROR, {
                message: error.message,
            });
        }
    }
    
    _deserialize(str) {
        try {
            return createSuccess({ data: JSON.parse(str) });
        } catch (error) {
            return createError(ERROR_CODES.DESERIALIZATION_ERROR, {
                message: error.message,
            });
        }
    }
    
    _writeWithRetry(key, value) {
        const storage = this._storageInfo.storage;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                storage.setItem(key, value);
                this._lruManager.recordAccess(key);
                return createSuccess();
            } catch (error) {
                if (!isQuotaExceededError(error)) {
                    return createError(ERROR_CODES.UNKNOWN_ERROR, {
                        message: error.message,
                    });
                }
                
                const evictResult = this._lruManager.tryEvict(storage, estimateByteSize(value));
                if (!evictResult.success) {
                    return createError(ERROR_CODES.QUOTA_EXCEEDED, {
                        details: evictResult.details,
                    });
                }
                
                attempts++;
            }
        }
        
        return createError(ERROR_CODES.QUOTA_EXCEEDED, {
            reason: 'eviction_exhausted',
        });
    }
    
    _readRaw() {
        const key = this.key;
        const storage = this._storageInfo.storage;
        
        try {
            const raw = storage.getItem(key);
            if (raw === null) {
                return createSuccess({ data: null });
            }
            
            this._lruManager.recordAccess(key);
            return createSuccess({ data: raw });
        } catch (error) {
            return createError(ERROR_CODES.UNKNOWN_ERROR, {
                message: error.message,
            });
        }
    }
    
    save(data) {
        if (!hasWindow() && !this._customStorage) {
            return createError(ERROR_CODES.SSR_NO_WINDOW);
        }
        
        const record = createPreferenceRecord(data, this._version);
        const serialized = this._serialize(record);
        
        if (serialized && serialized.errorCode) {
            return serialized;
        }
        
        return this._writeWithRetry(this.key, serialized);
    }
    
    load() {
        if (!hasWindow() && !this._customStorage) {
            return createError(ERROR_CODES.SSR_NO_WINDOW);
        }
        
        const rawResult = this._readRaw();
        if (!rawResult.success) {
            return rawResult;
        }
        
        if (rawResult.data === null) {
            return createSuccess({ data: null, migrated: false });
        }
        
        const parsed = this._deserialize(rawResult.data);
        if (!parsed.success) {
            return parsed;
        }
        
        const rawRecord = parsed.data;
        
        if (!isValidPreferenceRecord(rawRecord)) {
            return createError(ERROR_CODES.DESERIALIZATION_ERROR, {
                reason: 'invalid_record',
            });
        }
        
        const migration = runMigrationPipeline(rawRecord);
        if (!migration.success) {
            return migration;
        }
        
        if (migration.migrated) {
            const newSerialized = this._serialize(migration.record);
            if (!newSerialized.errorCode) {
                this._writeWithRetry(this.key, newSerialized);
            }
        }
        
        return createSuccess({
            data: migration.record.data,
            migrated: migration.migrated,
            originalSnapshot: migration.originalSnapshot,
            diagnostics: migration.diagnostics,
        });
    }
    
    update(partialData) {
        const loadResult = this.load();
        if (!loadResult.success && loadResult.data !== null) {
            return loadResult;
        }
        
        const currentData = loadResult.data || {};
        const mergeResult = mergeWithStrategy(currentData, partialData, this._mergeStrategy);
        
        if (!mergeResult.success) {
            return mergeResult;
        }
        
        return this.save(mergeResult.data);
    }
    
    clear() {
        if (!hasWindow() && !this._customStorage) {
            return createError(ERROR_CODES.SSR_NO_WINDOW);
        }
        
        try {
            const key = this.key;
            this._storageInfo.storage.removeItem(key);
            return createSuccess();
        } catch (error) {
            return createError(ERROR_CODES.UNKNOWN_ERROR, {
                message: error.message,
            });
        }
    }
    
    estimateSize() {
        const rawResult = this._readRaw();
        if (!rawResult.success || rawResult.data === null) {
            return createSuccess({ bytes: 0, humanReadable: '0 B' });
        }
        
        const bytes = estimateByteSize(rawResult.data);
        return createSuccess({
            bytes,
            humanReadable: estimateSize(bytes),
        });
    }
}

function getAllNamespaceStats(storage) {
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
            parsed: parseKey(key),
        });
    }
    
    return {
        totalBytes,
        totalHumanReadable: estimateSize(totalBytes),
        keyCount: keys.length,
        keys: keyStats,
    };
}

function clearAllNamespace(storage) {
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

function generateLargeObject(sizeBytes = 1024 * 500) {
    const targetSize = sizeBytes;
    const data = {
        generatedAt: new Date().toISOString(),
        sizeBytes: targetSize,
        largeField: '',
        repeatedKeys: {},
    };
    
    let currentSize = estimateByteSize(data);
    const chunkSize = 1024;
    const chunk = 'x'.repeat(chunkSize);
    
    while (currentSize < targetSize) {
        const remaining = targetSize - currentSize;
        const toAdd = Math.min(chunkSize, remaining);
        data.largeField += chunk.substring(0, toAdd);
        currentSize = estimateByteSize(data);
    }
    
    for (let i = 0; i < 100; i++) {
        data.repeatedKeys[`key_${i}`] = {
            index: i,
            value: `test_value_${i}`,
        };
    }
    
    return {
        data,
        actualBytes: estimateByteSize(data),
        targetBytes: targetSize,
    };
}

export {
    PreferenceStore,
    getAllNamespaceStats,
    clearAllNamespace,
    generateLargeObject,
    createExportPackage,
    serializeExportPackage,
    deserializeExportPackage,
    parseImportPackage,
    calculateChecksum,
    verifyChecksum,
    containsXssRisk,
    deepMerge,
    shallowMerge,
    mergeWithStrategy,
    MemoryStorage,
    LRUManager,
    resetMemoryStorage,
    resetLRUManager,
};
