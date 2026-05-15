import {
    hasWindow,
    buildKey,
    isNamespaceKey,
    estimateByteSize,
    estimateSize,
    MemoryStorage,
    getGlobalMemoryStorage,
    resetGlobalMemoryStorage,
    getAllNamespaceKeys,
    getAllNamespaceStats,
    clearAllNamespace,
} from '../logic/storage.js';
import { KEY_NAMESPACE, STORAGE_VERSIONS } from '../logic/constants.js';

describe('Storage', () => {
    describe('hasWindow', () => {
        it('should return boolean', () => {
            expect(typeof hasWindow()).toBe('boolean');
        });
    });

    describe('buildKey', () => {
        it('should include namespace prefix', () => {
            const key = buildKey();
            expect(key.startsWith(KEY_NAMESPACE)).toBe(true);
        });

        it('should use latest version by default', () => {
            const key = buildKey();
            expect(key).toContain(STORAGE_VERSIONS.LATEST);
        });

        it('should accept custom version', () => {
            const customVersion = '1.2.3';
            const key = buildKey(customVersion);
            expect(key).toContain(customVersion);
        });
    });

    describe('isNamespaceKey', () => {
        it('should return true for namespace keys', () => {
            const validKeys = [
                buildKey(),
                KEY_NAMESPACE + 'custom',
                KEY_NAMESPACE + 'v1.0.0',
            ];

            validKeys.forEach(key => {
                expect(isNamespaceKey(key)).toBe(true);
            });
        });

        it('should return false for non-namespace keys', () => {
            const invalidKeys = [
                'other:key',
                'localStorageKey',
                '',
                null,
                undefined,
            ];

            invalidKeys.forEach(key => {
                expect(isNamespaceKey(key)).toBe(false);
            });
        });
    });

    describe('estimateByteSize', () => {
        it('should estimate string size correctly', () => {
            const shortStr = 'a';
            const longStr = 'a'.repeat(1000);

            const shortSize = estimateByteSize(shortStr);
            const longSize = estimateByteSize(longStr);

            expect(typeof shortSize).toBe('number');
            expect(longSize).toBeGreaterThan(shortSize);
        });

        it('should estimate object size by JSON serialization', () => {
            const obj = { test: 'value', number: 42, nested: { deep: true } };
            const size = estimateByteSize(obj);

            expect(typeof size).toBe('number');
            expect(size).toBeGreaterThan(0);
        });

        it('should return 0 for invalid input', () => {
            expect(estimateByteSize(null)).toBe(0);
            expect(estimateByteSize(undefined)).toBe(0);
        });
    });

    describe('estimateSize', () => {
        it('should return formatted string for bytes', () => {
            expect(estimateSize(100)).toBe('100 B');
        });

        it('should return formatted string for KB', () => {
            expect(estimateSize(1500)).toBe('1.5 KB');
        });

        it('should return formatted string for MB', () => {
            expect(estimateSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
        });
    });

    describe('MemoryStorage', () => {
        let storage;

        beforeEach(() => {
            storage = new MemoryStorage();
        });

        it('should initialize with empty data', () => {
            expect(storage.length).toBe(0);
        });

        it('should set and get items correctly', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');

            expect(storage.getItem('key1')).toBe('value1');
            expect(storage.getItem('key2')).toBe('value2');
            expect(storage.length).toBe(2);
        });

        it('should return null for non-existent keys', () => {
            expect(storage.getItem('non-existent')).toBe(null);
        });

        it('should remove items correctly', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');
            storage.removeItem('key1');

            expect(storage.getItem('key1')).toBe(null);
            expect(storage.getItem('key2')).toBe('value2');
            expect(storage.length).toBe(1);
        });

        it('should clear all items', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');
            storage.clear();

            expect(storage.length).toBe(0);
            expect(storage.getItem('key1')).toBe(null);
        });

        it('should return all items via getAll', () => {
            storage.setItem('key1', 'value1');
            storage.setItem('key2', 'value2');

            const all = storage.getAll();

            expect(all.key1).toBe('value1');
            expect(all.key2).toBe('value2');
            expect(Object.keys(all)).toHaveLength(2);
        });

        it('should convert values to strings', () => {
            storage.setItem('number', 42);
            storage.setItem('object', { test: 'value' });

            expect(storage.getItem('number')).toBe('42');
            expect(storage.getItem('object')).toBe('[object Object]');
        });
    });

    describe('getGlobalMemoryStorage', () => {
        beforeEach(() => {
            resetGlobalMemoryStorage();
        });

        it('should return same instance on multiple calls', () => {
            const instance1 = getGlobalMemoryStorage();
            const instance2 = getGlobalMemoryStorage();

            expect(instance1).toBe(instance2);
        });

        it('should return MemoryStorage instance', () => {
            const storage = getGlobalMemoryStorage();
            expect(storage instanceof MemoryStorage).toBe(true);
        });
    });

    describe('resetGlobalMemoryStorage', () => {
        it('should reset the global instance', () => {
            const before = getGlobalMemoryStorage();
            resetGlobalMemoryStorage();
            const after = getGlobalMemoryStorage();

            expect(before).not.toBe(after);
        });
    });

    describe('getAllNamespaceKeys', () => {
        it('should return only namespace keys from MemoryStorage', () => {
            const storage = new MemoryStorage();
            storage.setItem(buildKey(), 'data1');
            storage.setItem(buildKey(), 'data2');
            storage.setItem('other:key', 'other');
            storage.setItem('normalKey', 'value');

            const keys = getAllNamespaceKeys(storage);

            expect(keys).toHaveLength(2);
            keys.forEach(key => {
                expect(isNamespaceKey(key)).toBe(true);
            });
        });

        it('should return empty array if no namespace keys', () => {
            const storage = new MemoryStorage();
            storage.setItem('other:key', 'value');

            const keys = getAllNamespaceKeys(storage);

            expect(keys).toHaveLength(0);
        });
    });

    describe('getAllNamespaceStats', () => {
        it('should return correct stats for namespace keys', () => {
            const storage = new MemoryStorage();
            storage.setItem(buildKey(), 'a'.repeat(1000));
            storage.setItem(buildKey('v1.0.0'), 'b'.repeat(2000));
            storage.setItem('other:key', 'c'.repeat(500));

            const stats = getAllNamespaceStats(storage);

            expect(stats.keyCount).toBe(2);
            expect(stats.totalBytes).toBeGreaterThan(0);
            expect(typeof stats.totalHumanReadable).toBe('string');
            expect(stats.keys).toHaveLength(2);
        });

        it('should include individual key stats', () => {
            const storage = new MemoryStorage();
            storage.setItem(buildKey(), 'test data');

            const stats = getAllNamespaceStats(storage);

            expect(stats.keys[0]).toHaveProperty('key');
            expect(stats.keys[0]).toHaveProperty('bytes');
            expect(stats.keys[0]).toHaveProperty('humanReadable');
            expect(isNamespaceKey(stats.keys[0].key)).toBe(true);
        });

        it('should return zero stats for empty storage', () => {
            const storage = new MemoryStorage();
            const stats = getAllNamespaceStats(storage);

            expect(stats.keyCount).toBe(0);
            expect(stats.totalBytes).toBe(0);
        });
    });

    describe('clearAllNamespace', () => {
        it('should remove only namespace keys', () => {
            const storage = new MemoryStorage();
            storage.setItem(buildKey(), 'data1');
            storage.setItem(buildKey(), 'data2');
            storage.setItem('other:key', 'other');

            const result = clearAllNamespace(storage);

            expect(result.success).toBe(true);
            expect(result.removedKeys).toHaveLength(2);
            expect(storage.length).toBe(1);
            expect(storage.getItem('other:key')).toBe('other');
        });

        it('should return empty removedKeys if no namespace keys', () => {
            const storage = new MemoryStorage();
            storage.setItem('other:key', 'other');

            const result = clearAllNamespace(storage);

            expect(result.success).toBe(true);
            expect(result.removedKeys).toHaveLength(0);
        });

        it('should handle errors gracefully', () => {
            const badStorage = {
                removeItem: () => { throw new Error('test error'); },
            };

            const result = clearAllNamespace(badStorage);

            expect(result.success).toBe(true);
        });
    });
});
