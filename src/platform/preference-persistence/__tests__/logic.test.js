import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
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
} from '../logic/index.js'
import {
    ERROR_CODES,
    STORAGE_VERSIONS,
    MERGE_STRATEGIES,
    DOMAIN_PREFERENCES,
    KEY_NAMESPACE,
} from '../logic/constants.js'
import {
    runMigrationPipeline,
    migrateV1toV2,
    compareVersions,
} from '../logic/schema.js'

describe('constants module', () => {
    test('KEY_NAMESPACE should start with devtools:', () => {
        expect(KEY_NAMESPACE).toBe('devtools:')
    })

    test('STORAGE_VERSIONS should have v1, v2, latest', () => {
        expect(STORAGE_VERSIONS.V1).toBe('1.0.0')
        expect(STORAGE_VERSIONS.V2).toBe('2.0.0')
        expect(STORAGE_VERSIONS.LATEST).toBe('2.0.0')
    })

    test('DOMAIN_PREFERENCES should have expected domains', () => {
        expect(DOMAIN_PREFERENCES.LAYOUT).toBe('layout')
        expect(DOMAIN_PREFERENCES.WORKSPACE).toBe('workspace')
        expect(DOMAIN_PREFERENCES.THEME).toBe('theme')
        expect(DOMAIN_PREFERENCES.TOOLS).toBe('tools')
    })

    test('MERGE_STRATEGIES should have shallow and deep', () => {
        expect(MERGE_STRATEGIES.SHALLOW).toBe('shallow')
        expect(MERGE_STRATEGIES.DEEP).toBe('deep')
    })

    test('ERROR_CODES should have all required codes', () => {
        expect(ERROR_CODES.STORAGE_UNAVAILABLE).toBeDefined()
        expect(ERROR_CODES.QUOTA_EXCEEDED).toBeDefined()
        expect(ERROR_CODES.MIGRATION_ERROR).toBeDefined()
        expect(ERROR_CODES.IMPORT_CORRUPTED).toBeDefined()
        expect(ERROR_CODES.IMPORT_XSS_DETECTED).toBeDefined()
        expect(ERROR_CODES.LRU_EVICTION_FAILED).toBeDefined()
        expect(ERROR_CODES.SSR_NO_WINDOW).toBeDefined()
    })
})

describe('version comparison', () => {
    test('compareVersions should compare correctly', () => {
        expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0)
        expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0)
        expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
        expect(compareVersions('1.5.0', '1.10.0')).toBeLessThan(0)
        expect(compareVersions('2.0.0', '2.0.0-beta')).toBeGreaterThanOrEqual(0)
    })
})

describe('migration module', () => {
    test('migrateV1toV2 should be idempotent', () => {
        const v1Record = {
            schemaVersion: '1.0.0',
            timestamp: 12345,
            data: {
                theme: 'dark',
                sidebarCollapsed: true,
                toolStates: { tool1: 'open' },
            },
        }

        const firstRun = migrateV1toV2(v1Record)
        expect(firstRun.migrated).toBe(true)
        expect(firstRun.record.data.theme.mode).toBe('dark')
        expect(firstRun.record.data.layout.sidebarCollapsed).toBe(true)
        expect(firstRun.record.data.tools.tool1).toBe('open')
        expect(firstRun.record.schemaVersion).toBe('2.0.0')

        const secondRun = migrateV1toV2(firstRun.record)
        expect(secondRun.migrated).toBe(false)
        expect(secondRun.record.schemaVersion).toBe('2.0.0')
    })

    test('migrateV1toV2 should preserve snapshot on failure', () => {
        const invalidRecord = null
        const result = migrateV1toV2(invalidRecord)
        expect(result.migrated).toBe(false)
    })

    test('runMigrationPipeline should return error for version too high', () => {
        const futureRecord = {
            schemaVersion: '99.0.0',
            timestamp: 12345,
            data: {},
        }

        const result = runMigrationPipeline(futureRecord)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.MIGRATION_VERSION_TOO_HIGH)
        expect(result.details.originalSnapshot).toBeDefined()
    })

    test('runMigrationPipeline should skip migration for latest version', () => {
        const v2Record = {
            schemaVersion: '2.0.0',
            timestamp: 12345,
            data: { theme: { mode: 'light' } },
        }

        const result = runMigrationPipeline(v2Record)
        expect(result.success).toBe(true)
        expect(result.migrated).toBe(false)
    })
})

describe('merge strategies', () => {
    test('shallowMerge should merge at top level only', () => {
        const target = { a: 1, nested: { x: 1 } }
        const source = { b: 2, nested: { y: 2 } }
        const result = shallowMerge(target, source)

        expect(result.a).toBe(1)
        expect(result.b).toBe(2)
        expect(result.nested).toEqual({ y: 2 })
    })

    test('deepMerge should merge nested objects', () => {
        const target = { a: 1, nested: { x: 1 } }
        const source = { b: 2, nested: { y: 2 } }
        const result = deepMerge(target, source)

        expect(result.a).toBe(1)
        expect(result.b).toBe(2)
        expect(result.nested.x).toBe(1)
        expect(result.nested.y).toBe(2)
    })

    test('mergeWithStrategy should support both strategies', () => {
        const target = { nested: { a: 1 } }
        const source = { nested: { b: 2 } }

        const shallowResult = mergeWithStrategy(target, source, MERGE_STRATEGIES.SHALLOW)
        expect(shallowResult.success).toBe(true)
        expect(shallowResult.data.nested).toEqual({ b: 2 })

        const deepResult = mergeWithStrategy(target, source, MERGE_STRATEGIES.DEEP)
        expect(deepResult.success).toBe(true)
        expect(deepResult.data.nested.a).toBe(1)
        expect(deepResult.data.nested.b).toBe(2)
    })
})

describe('MemoryStorage', () => {
    test('should implement Storage interface', () => {
        const storage = new MemoryStorage()
        expect(storage.length).toBe(0)

        storage.setItem('key1', 'value1')
        expect(storage.length).toBe(1)
        expect(storage.getItem('key1')).toBe('value1')
        expect(storage.key(0)).toBe('key1')

        storage.removeItem('key1')
        expect(storage.length).toBe(0)
        expect(storage.getItem('key1')).toBeNull()

        storage.setItem('a', '1')
        storage.setItem('b', '2')
        storage.clear()
        expect(storage.length).toBe(0)
    })

    test('getAll should return all items', () => {
        const storage = new MemoryStorage()
        storage.setItem('a', '1')
        storage.setItem('b', '2')

        const all = storage.getAll()
        expect(all.a).toBe('1')
        expect(all.b).toBe('2')
    })
})

describe('LRUManager', () => {
    test('should sort keys by priority then access time', () => {
        const manager = new LRUManager()
        const storage = new MemoryStorage()

        storage.setItem('devtools:workspace:2.0.0', 'workspace_data')
        storage.setItem('devtools:layout:2.0.0', 'layout_data')
        storage.setItem('devtools:theme:2.0.0', 'theme_data')

        manager.recordAccess('devtools:workspace:2.0.0')
        manager.recordAccess('devtools:theme:2.0.0')
        manager.recordAccess('devtools:layout:2.0.0')

        const result = manager.tryEvict(storage, 0, 1)
        expect(result.success).toBe(true)
        expect(result.evicted[0].key).toBe('devtools:workspace:2.0.0')
    })

    test('tryEvict should return error when no keys', () => {
        const manager = new LRUManager()
        const storage = new MemoryStorage()

        const result = manager.tryEvict(storage)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.LRU_EVICTION_FAILED)
    })
})

describe('PreferenceStore basic operations', () => {
    let memoryStorage
    let lruManager

    beforeEach(() => {
        resetMemoryStorage()
        resetLRUManager()
        memoryStorage = new MemoryStorage()
        lruManager = new LRUManager()
    })

    test('should save and load data', () => {
        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: memoryStorage,
            lruManager,
        })

        const data = { sidebarCollapsed: true, panelSize: 300 }
        const saveResult = store.save(data)
        expect(saveResult.success).toBe(true)

        const loadResult = store.load()
        expect(loadResult.success).toBe(true)
        expect(loadResult.data.sidebarCollapsed).toBe(true)
        expect(loadResult.data.panelSize).toBe(300)
    })

    test('should generate correct namespace key', () => {
        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: memoryStorage,
            lruManager,
        })

        expect(store.key).toBe('devtools:layout:2.0.0')
    })

    test('should update with merge strategy', () => {
        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: memoryStorage,
            lruManager,
        })

        store.save({ a: 1, b: 2 })
        const updateResult = store.update({ b: 20, c: 3 })

        expect(updateResult.success).toBe(true)
        const loaded = store.load()
        expect(loaded.data.a).toBe(1)
        expect(loaded.data.b).toBe(20)
        expect(loaded.data.c).toBe(3)
    })

    test('should clear data', () => {
        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: memoryStorage,
            lruManager,
        })

        store.save({ test: 'value' })
        expect(store.load().data).not.toBeNull()

        store.clear()
        expect(store.load().data).toBeNull()
    })

    test('should estimate size', () => {
        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: memoryStorage,
            lruManager,
        })

        const emptySize = store.estimateSize()
        expect(emptySize.bytes).toBe(0)

        store.save({ test: 'data' })
        const sizeResult = store.estimateSize()
        expect(sizeResult.bytes).toBeGreaterThan(0)
    })

    test('should auto-migrate v1 data on load', () => {
        const v1Record = {
            schemaVersion: '1.0.0',
            timestamp: Date.now(),
            data: {
                theme: 'dark',
                sidebarCollapsed: false,
            },
        }

        memoryStorage.setItem('devtools:layout:2.0.0', JSON.stringify(v1Record))

        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: memoryStorage,
            lruManager,
        })

        const loadResult = store.load()
        expect(loadResult.success).toBe(true)
        expect(loadResult.migrated).toBe(true)
        expect(loadResult.data.theme.mode).toBe('dark')
        expect(loadResult.data.layout.sidebarCollapsed).toBe(false)
    })
})

describe('quota exceeded and LRU eviction path', () => {
    test('should trigger LRU eviction on quota error', () => {
        const storage = new MemoryStorage()
        const lruManager = new LRUManager()

        let quotaHit = false
        const originalSetItem = storage.setItem.bind(storage)

        storage.setItem = function (key, value) {
            if (!quotaHit && key.includes('layout')) {
                quotaHit = true
                const err = new Error('Quota exceeded')
                err.name = 'QuotaExceededError'
                throw err
            }
            return originalSetItem(key, value)
        }

        storage.setItem('devtools:workspace:2.0.0', JSON.stringify({ temp: 'data' }))
        storage.setItem('devtools:theme:2.0.0', JSON.stringify({ mode: 'light' }))

        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: storage,
            lruManager,
        })

        lruManager.recordAccess('devtools:workspace:2.0.0')
        lruManager.recordAccess('devtools:theme:2.0.0')

        const result = store.save({ new: 'data' })
        expect(result.success).toBe(true)
        expect(quotaHit).toBe(true)
    })
})

describe('checksum module', () => {
    test('calculateChecksum should produce consistent hash', () => {
        const data = { a: 1, b: 2 }
        const hash1 = calculateChecksum(data)
        const hash2 = calculateChecksum(data)
        expect(hash1).toBe(hash2)
    })

    test('verifyChecksum should validate', () => {
        const data = { test: 'value' }
        const hash = calculateChecksum(data)
        expect(verifyChecksum(data, hash)).toBe(true)
        expect(verifyChecksum(data, 'wrong-hash')).toBe(false)
    })
})

describe('XSS detection', () => {
    test('containsXssRisk should detect script tags', () => {
        expect(containsXssRisk('<script>alert(1)</script>')).toBe(true)
        expect(containsXssRisk('normal text')).toBe(false)
    })

    test('containsXssRisk should detect javascript: protocol', () => {
        expect(containsXssRisk('javascript:alert(1)')).toBe(true)
    })

    test('containsXssRisk should detect event handlers', () => {
        expect(containsXssRisk('<div onclick="alert(1)">')).toBe(true)
    })

    test('containsXssRisk should detect in nested objects', () => {
        expect(containsXssRisk({ nested: { value: '<script>' } })).toBe(true)
        expect(containsXssRisk({ nested: { value: 'safe' } })).toBe(false)
    })

    test('containsXssRisk should detect in arrays', () => {
        expect(containsXssRisk(['safe', 'javascript:bad'])).toBe(true)
    })
})

describe('import/export module', () => {
    test('createExportPackage should include checksum', () => {
        const records = [
            { schemaVersion: '2.0.0', timestamp: 123, data: { x: 1 } },
        ]

        const pkg = createExportPackage(records)
        expect(pkg.packageVersion).toBe('2.0.0')
        expect(pkg.checksum).toBeDefined()
        expect(pkg.records.length).toBe(1)
    })

    test('deserializeExportPackage should parse valid JSON', () => {
        const valid = '{"test": 1}'
        const result = deserializeExportPackage(valid)
        expect(result.success).toBe(true)
        expect(result.data.test).toBe(1)
    })

    test('deserializeExportPackage should reject invalid JSON', () => {
        const invalid = 'not valid json'
        const result = deserializeExportPackage(invalid)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.DESERIALIZATION_ERROR)
    })

    test('parseImportPackage should reject corrupted data', () => {
        const result = parseImportPackage('not an object')
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.IMPORT_CORRUPTED)
    })

    test('parseImportPackage should reject missing records', () => {
        const result = parseImportPackage({ packageVersion: '2.0.0' })
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.IMPORT_CORRUPTED)
    })

    test('parseImportPackage should reject XSS content', () => {
        const pkg = {
            packageVersion: '2.0.0',
            records: [
                {
                    schemaVersion: '2.0.0',
                    timestamp: 123,
                    data: { malicious: '<script>alert(1)</script>' },
                },
            ],
        }

        const result = parseImportPackage(pkg)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.IMPORT_XSS_DETECTED)
    })

    test('parseImportPackage should detect invalid checksum', () => {
        const records = [
            { schemaVersion: '2.0.0', timestamp: 123, data: { x: 1 } },
        ]

        const pkg = {
            packageVersion: '2.0.0',
            generatedAt: new Date().toISOString(),
            generatedBy: 'test',
            records,
            checksum: 'invalid-checksum',
            checksumAlgorithm: 'simple',
        }

        const result = parseImportPackage(pkg)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.IMPORT_INVALID_CHECKSUM)
    })

    test('parseImportPackage should ignore unknown fields in diagnostics', () => {
        const pkg = {
            packageVersion: '2.0.0',
            records: [
                {
                    schemaVersion: '2.0.0',
                    timestamp: 123,
                    data: {
                        known1: 'value',
                        unknownField: 'should_be_logged',
                        layoutTopology: 'external_key',
                        sidebarCollapsed: true,
                    },
                },
            ],
        }

        const result = parseImportPackage(pkg, {
            knownFields: ['known1', 'layoutTopology', 'sidebarCollapsed'],
            allowUnknownFields: false,
        })

        expect(result.success).toBe(true)
        expect(result.diagnostics).toBeDefined()
        
        const unknownFieldDiag = result.diagnostics.find(d => d.type === 'unknown_field')
        expect(unknownFieldDiag).toBeDefined()
        expect(unknownFieldDiag.path).toBe('unknownField')

        expect(result.records[0].data.known1).toBe('value')
        expect(result.records[0].data.unknownField).toBeUndefined()
    })

    test('parseImportPackage should auto-migrate v1 records', () => {
        const pkg = {
            packageVersion: '2.0.0',
            records: [
                {
                    schemaVersion: '1.0.0',
                    timestamp: 123,
                    data: {
                        theme: 'dark',
                        sidebarCollapsed: true,
                    },
                },
            ],
        }

        const result = parseImportPackage(pkg)
        expect(result.success).toBe(true)
        expect(result.hadMigration).toBe(true)
        expect(result.records[0].data.theme.mode).toBe('dark')
    })
})

describe('utility functions', () => {
    test('generateLargeObject should create sized data', () => {
        const result = generateLargeObject(50 * 1024)
        expect(result.targetBytes).toBe(50 * 1024)
        expect(result.actualBytes).toBeGreaterThanOrEqual(50 * 1024)
        expect(result.data.repeatedKeys).toBeDefined()
        expect(Object.keys(result.data.repeatedKeys).length).toBe(100)
    })

    test('getAllNamespaceStats should calculate totals', () => {
        const storage = new MemoryStorage()
        storage.setItem('devtools:layout:2.0.0', JSON.stringify({ a: 1 }))
        storage.setItem('devtools:theme:2.0.0', JSON.stringify({ mode: 'dark' }))
        storage.setItem('other_key', 'should_not_count')

        const stats = getAllNamespaceStats(storage)
        expect(stats.keyCount).toBe(2)
        expect(stats.totalBytes).toBeGreaterThan(0)
    })

    test('clearAllNamespace should only clear namespace keys', () => {
        const storage = new MemoryStorage()
        storage.setItem('devtools:layout:2.0.0', 'data1')
        storage.setItem('devtools:theme:2.0.0', 'data2')
        storage.setItem('other_key', 'data3')

        const result = clearAllNamespace(storage)
        expect(result.removedKeys.length).toBe(2)
        expect(storage.getItem('other_key')).toBe('data3')
    })
})

describe('PreferenceStore error paths', () => {
    test('should handle invalid JSON in storage', () => {
        const storage = new MemoryStorage()
        storage.setItem('devtools:layout:2.0.0', 'this is not json')

        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: storage,
            lruManager: new LRUManager(),
        })

        const result = store.load()
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.DESERIALIZATION_ERROR)
    })

    test('should handle invalid record structure', () => {
        const storage = new MemoryStorage()
        storage.setItem('devtools:layout:2.0.0', JSON.stringify({ not_a_record: true }))

        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: storage,
            lruManager: new LRUManager(),
        })

        const result = store.load()
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.DESERIALIZATION_ERROR)
    })
})

describe('storage type matrix and detection', () => {
    test('should respect custom storage override', () => {
        const storage = new MemoryStorage()
        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: storage,
            lruManager: new LRUManager(),
        })

        expect(store.storageInfo.custom).toBe(true)
    })
})
