import { describe, expect, test } from 'vitest'
import {
    SNAPSHOT_VERSIONS,
    MERGE_STRATEGIES,
    ERROR_CODES,
    CHECKSUM_ALGORITHM,
    createSnapshot,
    serializeSnapshot,
    deserializeSnapshot,
    calculateChecksum,
    verifyChecksum,
    measureDepth,
    countKeys,
    validateSnapshot,
    migrateV1ToV2,
    migrateV2ToV3,
    runMigrationPipeline,
    compareVersions,
    deepMerge,
    shallowMerge,
    overwriteMerge,
    mergeWithStrategy,
    diffObjects,
    diffSnapshots,
    formatDiff,
    groupDiffsByType,
    DIFF_TYPES,
    findSensitivePaths,
    redactSensitiveData,
    isSensitiveKey,
} from '../logic/index.js'

describe('constants module', () => {
    test('SNAPSHOT_VERSIONS should have v1, v2, v3, latest', () => {
        expect(SNAPSHOT_VERSIONS.V1).toBe('1.0.0')
        expect(SNAPSHOT_VERSIONS.V2).toBe('2.0.0')
        expect(SNAPSHOT_VERSIONS.V3).toBe('3.0.0')
        expect(SNAPSHOT_VERSIONS.LATEST).toBe('3.0.0')
    })

    test('MERGE_STRATEGIES should have merge and overwrite', () => {
        expect(MERGE_STRATEGIES.MERGE).toBe('merge')
        expect(MERGE_STRATEGIES.OVERWRITE).toBe('overwrite')
    })

    test('ERROR_CODES should have all required codes', () => {
        expect(ERROR_CODES.INVALID_JSON).toBeDefined()
        expect(ERROR_CODES.INVALID_SCHEMA).toBeDefined()
        expect(ERROR_CODES.VERSION_TOO_OLD).toBeDefined()
        expect(ERROR_CODES.VERSION_TOO_HIGH).toBeDefined()
        expect(ERROR_CODES.INVALID_CHECKSUM).toBeDefined()
        expect(ERROR_CODES.MIGRATION_FAILED).toBeDefined()
        expect(ERROR_CODES.VALIDATION_FAILED).toBeDefined()
        expect(ERROR_CODES.MAX_DEPTH_EXCEEDED).toBeDefined()
        expect(ERROR_CODES.MAX_KEYS_EXCEEDED).toBeDefined()
    })

    test('CHECKSUM_ALGORITHM should be simple-hash', () => {
        expect(CHECKSUM_ALGORITHM).toBe('simple-hash')
    })
})

describe('version comparison', () => {
    test('compareVersions should compare correctly', () => {
        expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0)
        expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0)
        expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
        expect(compareVersions('1.5.0', '1.10.0')).toBeLessThan(0)
        expect(compareVersions('3.0.0', '3.0.0')).toBe(0)
    })
})

describe('checksum module - 稳定性测试', () => {
    test('calculateChecksum should produce consistent hash for same data', () => {
        const data = { a: 1, b: 2, nested: { x: 3, y: 4 } }
        const hash1 = calculateChecksum(data)
        const hash2 = calculateChecksum(data)
        expect(hash1).toBe(hash2)
    })

    test('calculateChecksum should produce different hash for different data', () => {
        const data1 = { a: 1 }
        const data2 = { a: 2 }
        const hash1 = calculateChecksum(data1)
        const hash2 = calculateChecksum(data2)
        expect(hash1).not.toBe(hash2)
    })

    test('verifyChecksum should validate correctly', () => {
        const data = { test: 'value', nested: { deep: true } }
        const hash = calculateChecksum(data)
        expect(verifyChecksum(data, hash)).toBe(true)
        expect(verifyChecksum(data, 'wrong-hash')).toBe(false)
    })

    test('checksum should be stable for entries array', () => {
        const entries = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }]
        const hash1 = calculateChecksum({ entries })
        const hash2 = calculateChecksum({ entries: [...entries] })
        expect(hash1).toBe(hash2)
    })
})

describe('snapshot creation module', () => {
    test('createSnapshot should create valid snapshot structure', () => {
        const entries = [{ theme: 'dark', sidebar: true }]
        const snapshot = createSnapshot(entries)

        expect(snapshot.schemaVersion).toBe(SNAPSHOT_VERSIONS.LATEST)
        expect(snapshot.exportedAt).toBeDefined()
        expect(snapshot.checksum).toBeDefined()
        expect(snapshot.entries).toEqual(entries)
        expect(snapshot.checksumAlgorithm).toBe(CHECKSUM_ALGORITHM)
    })

    test('createSnapshot should accept custom version', () => {
        const entries = [{ data: 'test' }]
        const snapshot = createSnapshot(entries, { version: SNAPSHOT_VERSIONS.V2 })
        expect(snapshot.schemaVersion).toBe('2.0.0')
    })

    test('serializeSnapshot should produce valid JSON', () => {
        const snapshot = createSnapshot([{ test: 1 }])
        const json = serializeSnapshot(snapshot)
        const parsed = JSON.parse(json)
        expect(parsed.schemaVersion).toBe(snapshot.schemaVersion)
        expect(parsed.checksum).toBe(snapshot.checksum)
    })

    test('deserializeSnapshot should parse valid JSON', () => {
        const json = '{"schemaVersion": "3.0.0", "test": 1}'
        const result = deserializeSnapshot(json)
        expect(result.success).toBe(true)
        expect(result.data.schemaVersion).toBe('3.0.0')
    })

    test('deserializeSnapshot should reject invalid JSON', () => {
        const invalid = 'not valid json {'
        const result = deserializeSnapshot(invalid)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.INVALID_JSON)
    })
})

describe('validation module - 防爆测试', () => {
    test('measureDepth should calculate nesting depth', () => {
        const shallow = { a: 1 }
        const deep = { a: { b: { c: { d: { e: 1 } } } } }
        const array = { arr: [{ nested: true }] }

        expect(measureDepth(shallow)).toBe(1)
        expect(measureDepth(deep)).toBe(5)
        expect(measureDepth(array)).toBe(3)
    })

    test('countKeys should count all keys in nested object', () => {
        const obj = {
            a: 1,
            b: { c: 2, d: { e: 3, f: 4 } },
            g: 5,
        }
        expect(countKeys(obj)).toBe(7)
    })

    test('validateSnapshot should pass for valid snapshot', () => {
        const snapshot = createSnapshot([{ theme: 'dark' }])
        const result = validateSnapshot(snapshot)
        expect(result.success).toBe(true)
        expect(result.diagnostics).toBeDefined()
    })

    test('validateSnapshot should detect missing schemaVersion', () => {
        const invalid = {
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [{}],
        }
        const result = validateSnapshot(invalid)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCHEMA)
    })

    test('validateSnapshot should detect missing exportedAt', () => {
        const invalid = {
            schemaVersion: '3.0.0',
            checksum: 'abc123',
            entries: [{}],
        }
        const result = validateSnapshot(invalid)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCHEMA)
    })

    test('validateSnapshot should detect missing checksum', () => {
        const invalid = {
            schemaVersion: '3.0.0',
            exportedAt: new Date().toISOString(),
            entries: [{}],
        }
        const result = validateSnapshot(invalid)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCHEMA)
    })

    test('validateSnapshot should detect missing entries', () => {
        const invalid = {
            schemaVersion: '3.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
        }
        const result = validateSnapshot(invalid)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCHEMA)
    })

    test('validateSnapshot should detect invalid checksum', () => {
        const snapshot = createSnapshot([{ test: 'data' }])
        snapshot.checksum = 'tampered-checksum'
        const result = validateSnapshot(snapshot)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.INVALID_CHECKSUM)
    })

    test('validateSnapshot should detect excessive nesting depth', () => {
        const deepObj = {}
        let current = deepObj
        for (let i = 0; i < 25; i++) {
            current.level = {}
            current = current.level
        }

        const snapshot = createSnapshot([deepObj])
        const result = validateSnapshot(snapshot)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.MAX_DEPTH_EXCEEDED)
    })
})

describe('migration module - 迁移链测试', () => {
    test('migrateV1ToV2 should transform themeMode to theme.mode', () => {
        const v1Snapshot = {
            schemaVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [
                {
                    themeMode: 'dark',
                    sidebarCollapsed: true,
                    toolStates: { editor: 'open' },
                },
            ],
        }

        const result = migrateV1ToV2(v1Snapshot)
        expect(result.migrated).toBe(true)
        expect(result.snapshot.schemaVersion).toBe('2.0.0')
        expect(result.snapshot.entries[0].theme.mode).toBe('dark')
        expect(result.snapshot.entries[0].layout.sidebar.collapsed).toBe(true)
        expect(result.snapshot.entries[0].tools.editor).toBe('open')
    })

    test('migrateV1ToV2 should be idempotent', () => {
        const v1Snapshot = {
            schemaVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [{ themeMode: 'light' }],
        }

        const firstRun = migrateV1ToV2(v1Snapshot)
        expect(firstRun.migrated).toBe(true)

        const secondRun = migrateV1ToV2(firstRun.snapshot)
        expect(secondRun.migrated).toBe(false)
    })

    test('migrateV2ToV3 should remove user field and move workspaceData', () => {
        const v2Snapshot = {
            schemaVersion: '2.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [
                {
                    theme: { mode: 'dark' },
                    user: { id: 123, name: 'test' },
                    workspaceData: { path: '/home/project' },
                },
            ],
        }

        const result = migrateV2ToV3(v2Snapshot)
        expect(result.migrated).toBe(true)
        expect(result.snapshot.schemaVersion).toBe('3.0.0')
        expect(result.snapshot.entries[0].user).toBeUndefined()
        expect(result.snapshot.entries[0].workspace.settings.path).toBe('/home/project')
    })

    test('migrateV2ToV3 should be idempotent', () => {
        const v2Snapshot = {
            schemaVersion: '2.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [{ user: { id: 1 }, workspaceData: { path: '/' } }],
        }

        const firstRun = migrateV2ToV3(v2Snapshot)
        expect(firstRun.migrated).toBe(true)

        const secondRun = migrateV2ToV3(firstRun.snapshot)
        expect(secondRun.migrated).toBe(false)
    })

    test('runMigrationPipeline should migrate v1 to v3 in one pass', () => {
        const v1Snapshot = {
            schemaVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            checksum: calculateChecksum({
                entries: [{ themeMode: 'dark', sidebarCollapsed: false }],
            }),
            entries: [{ themeMode: 'dark', sidebarCollapsed: false }],
        }

        const result = runMigrationPipeline(v1Snapshot)
        expect(result.success).toBe(true)
        expect(result.migrated).toBe(true)
        expect(result.snapshot.schemaVersion).toBe('3.0.0')
        expect(result.breakingChanges.length).toBeGreaterThan(0)
    })

    test('runMigrationPipeline should reject version too high', () => {
        const futureSnapshot = {
            schemaVersion: '99.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [{}],
        }

        const result = runMigrationPipeline(futureSnapshot)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.VERSION_TOO_HIGH)
        expect(result.details.originalSnapshot).toBeDefined()
    })

    test('runMigrationPipeline should skip migration for latest version', () => {
        const v3Snapshot = {
            schemaVersion: '3.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [{ theme: { mode: 'dark' } }],
        }

        const result = runMigrationPipeline(v3Snapshot)
        expect(result.success).toBe(true)
        expect(result.migrated).toBe(false)
    })

    test('runMigrationPipeline should return original snapshot on failure', () => {
        const invalidSnapshot = null
        const result = runMigrationPipeline(invalidSnapshot)
        expect(result.success).toBe(false)
        expect(result.errorCode).toBe(ERROR_CODES.INVALID_SCHEMA)
        expect(result.details.originalSnapshot).toBeDefined()
    })

    test('runMigrationPipeline should preserve unknown fields during migration', () => {
        const v1Snapshot = {
            schemaVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [{ themeMode: 'dark', customField: 'should_preserve' }],
        }

        const result = runMigrationPipeline(v1Snapshot)
        expect(result.success).toBe(true)
        expect(result.snapshot.entries[0].customField).toBe('should_preserve')
    })
})

describe('merge strategies module', () => {
    test('shallowMerge should merge at top level only', () => {
        const target = { a: 1, nested: { x: 1 } }
        const source = { b: 2, nested: { y: 2 } }
        const result = shallowMerge(target, source)

        expect(result.a).toBe(1)
        expect(result.b).toBe(2)
        expect(result.nested).toEqual({ y: 2 })
    })

    test('deepMerge should merge nested objects recursively', () => {
        const target = { a: 1, nested: { x: 1, deep: { value: 1 } } }
        const source = { b: 2, nested: { y: 2, deep: { other: 2 } } }
        const result = deepMerge(target, source)

        expect(result.a).toBe(1)
        expect(result.b).toBe(2)
        expect(result.nested.x).toBe(1)
        expect(result.nested.y).toBe(2)
        expect(result.nested.deep.value).toBe(1)
        expect(result.nested.deep.other).toBe(2)
    })

    test('deepMerge should handle arrays by replacement', () => {
        const target = { arr: [1, 2, 3] }
        const source = { arr: [4, 5] }
        const result = deepMerge(target, source)
        expect(result.arr).toEqual([1, 2, 3, 4, 5])
    })

    test('overwriteMerge should completely replace target', () => {
        const target = { a: 1, nested: { x: 1 } }
        const source = { b: 2 }
        const result = overwriteMerge(target, source)
        expect(result).toEqual({ b: 2 })
    })

    test('mergeWithStrategy should support both strategies', () => {
        const target = { nested: { a: 1 } }
        const source = { nested: { b: 2 } }

        const overwriteResult = mergeWithStrategy(target, source, MERGE_STRATEGIES.OVERWRITE)
        expect(overwriteResult.success).toBe(true)
        expect(overwriteResult.data.nested).toEqual({ b: 2 })

        const mergeResult = mergeWithStrategy(target, source, MERGE_STRATEGIES.MERGE)
        expect(mergeResult.success).toBe(true)
        expect(mergeResult.data.nested.a).toBe(1)
        expect(mergeResult.data.nested.b).toBe(2)
    })
})

describe('diff algorithm module - 差异算法测试', () => {
    test('diffObjects should detect added fields', () => {
        const oldObj = { a: 1 }
        const newObj = { a: 1, b: 2 }
        const diffs = diffObjects(oldObj, newObj)

        expect(diffs.some(d => d.type === DIFF_TYPES.ADDED && d.path === 'b')).toBe(true)
    })

    test('diffObjects should detect removed fields', () => {
        const oldObj = { a: 1, b: 2 }
        const newObj = { a: 1 }
        const diffs = diffObjects(oldObj, newObj)

        expect(diffs.some(d => d.type === DIFF_TYPES.REMOVED && d.path === 'b')).toBe(true)
    })

    test('diffObjects should detect changed fields', () => {
        const oldObj = { a: 1, nested: { x: 10 } }
        const newObj = { a: 2, nested: { x: 20 } }
        const diffs = diffObjects(oldObj, newObj)

        expect(diffs.some(d => d.type === DIFF_TYPES.CHANGED && d.path === 'a')).toBe(true)
        expect(diffs.some(d => d.type === DIFF_TYPES.CHANGED && d.path === 'nested.x')).toBe(true)
    })

    test('diffObjects should detect nested path changes', () => {
        const oldObj = { level1: { level2: { value: 'old' } } }
        const newObj = { level1: { level2: { value: 'new' } } }
        const diffs = diffObjects(oldObj, newObj)

        expect(diffs.some(d => d.path === 'level1.level2.value')).toBe(true)
    })

    test('diffSnapshots should compare entries arrays', () => {
        const oldSnap = createSnapshot([{ a: 1, b: 2 }])
        const newSnap = createSnapshot([{ a: 1, b: 3, c: 4 }])

        const diffs = diffSnapshots(oldSnap, newSnap)
        expect(diffs.length).toBeGreaterThan(0)
    })

    test('formatDiff should produce human readable output', () => {
        const added = { type: DIFF_TYPES.ADDED, path: 'newField', newValue: 'value' }
        const removed = { type: DIFF_TYPES.REMOVED, path: 'oldField', oldValue: 'old' }
        const changed = { type: DIFF_TYPES.CHANGED, path: 'field', oldValue: 'a', newValue: 'b' }

        expect(formatDiff(added)).toContain('+')
        expect(formatDiff(removed)).toContain('-')
        expect(formatDiff(changed)).toContain('~')
    })

    test('groupDiffsByType should categorize diffs correctly', () => {
        const diffs = [
            { type: DIFF_TYPES.ADDED },
            { type: DIFF_TYPES.ADDED },
            { type: DIFF_TYPES.REMOVED },
            { type: DIFF_TYPES.CHANGED },
        ]

        const grouped = groupDiffsByType(diffs)
        expect(grouped.added.length).toBe(2)
        expect(grouped.removed.length).toBe(1)
        expect(grouped.changed.length).toBe(1)
    })
})

describe('sensitive data redaction module - 脱敏测试', () => {
    test('isSensitiveKey should detect sensitive key patterns', () => {
        expect(isSensitiveKey('password')).toBe(true)
        expect(isSensitiveKey('userPassword')).toBe(true)
        expect(isSensitiveKey('apiKey')).toBe(true)
        expect(isSensitiveKey('api_key')).toBe(true)
        expect(isSensitiveKey('secret')).toBe(true)
        expect(isSensitiveKey('token')).toBe(true)
        expect(isSensitiveKey('authToken')).toBe(true)
        expect(isSensitiveKey('username')).toBe(false)
        expect(isSensitiveKey('theme')).toBe(false)
    })

    test('findSensitivePaths should locate all sensitive fields', () => {
        const data = {
            password: 'secret123',
            apiKeys: {
                apiKey: 'sk-abc123',
                secretKey: 'gh_token_xyz',
            },
            auth: {
                token: 'jwt_token_here',
            },
            theme: 'dark',
        }

        const sensitive = findSensitivePaths(data)
        expect(sensitive.some(s => s.path === 'password')).toBe(true)
        expect(sensitive.some(s => s.path === 'apiKeys.apiKey')).toBe(true)
        expect(sensitive.some(s => s.path === 'apiKeys.secretKey')).toBe(true)
        expect(sensitive.some(s => s.path === 'auth.token')).toBe(true)
    })

    test('redactSensitiveData should replace sensitive values', () => {
        const data = {
            password: 'mysecretpassword',
            apiKey: 'sk-123456789',
            theme: 'dark',
            nested: {
                token: 'sensitive_jwt',
                safe: 'normal_value',
            },
        }

        const redacted = redactSensitiveData(data)
        expect(redacted.password).toBe('********')
        expect(redacted.apiKey).toBe('********')
        expect(redacted.nested.token).toBe('********')
        expect(redacted.theme).toBe('dark')
        expect(redacted.nested.safe).toBe('normal_value')
    })

    test('redactSensitiveData should only redact selected keys when specified', () => {
        const data = {
            password: 'secret',
            token: 'jwt',
            apiKey: 'key',
        }

        const selectedKeys = ['password']
        const redacted = redactSensitiveData(data, selectedKeys)

        expect(redacted.password).toBe('********')
        expect(redacted.token).toBe('jwt')
        expect(redacted.apiKey).toBe('key')
    })

    test('redactSensitiveData should handle arrays', () => {
        const data = {
            users: [
                { name: 'Alice', password: 'alice123' },
                { name: 'Bob', token: 'bob_token' },
            ],
        }

        const redacted = redactSensitiveData(data)
        expect(redacted.users[0].password).toBe('********')
        expect(redacted.users[1].token).toBe('********')
        expect(redacted.users[0].name).toBe('Alice')
    })
})

describe('integration tests - 集成测试', () => {
    test('full export-import cycle with migration', () => {
        const v1Data = {
            themeMode: 'dark',
            sidebarCollapsed: true,
            toolStates: { editor: 'open' },
            user: { id: 1 },
            password: 'should_redact',
        }

        const redactedV1 = redactSensitiveData(v1Data)
        const snapshot = createSnapshot([redactedV1], { version: SNAPSHOT_VERSIONS.V1 })
        snapshot.checksum = calculateChecksum({ entries: snapshot.entries })
        const validation = validateSnapshot(snapshot)
        expect(validation.success).toBe(true)

        const migration = runMigrationPipeline(snapshot)
        expect(migration.success).toBe(true)
        expect(migration.migrated).toBe(true)
        expect(migration.snapshot.schemaVersion).toBe(SNAPSHOT_VERSIONS.LATEST)

        expect(migration.snapshot.entries[0].password).toBe('********')
    })

    test('import with merge strategy and diff preview', () => {
        const current = { theme: { mode: 'light' }, layout: { sidebar: { collapsed: false } } }
        const imported = { theme: { mode: 'dark' }, newFeature: true }

        const merged = mergeWithStrategy(current, imported, MERGE_STRATEGIES.MERGE)
        expect(merged.success).toBe(true)

        const diffs = diffObjects(current, merged.data)
        expect(diffs.length).toBeGreaterThan(0)

        const grouped = groupDiffsByType(diffs)
        expect(grouped.changed.some(d => d.path === 'theme.mode')).toBe(true)
        expect(grouped.added.some(d => d.path === 'newFeature')).toBe(true)
    })

    test('multiple entry snapshots should migrate all entries', () => {
        const snapshot = {
            schemaVersion: '1.0.0',
            exportedAt: new Date().toISOString(),
            checksum: 'abc123',
            entries: [
                { themeMode: 'dark' },
                { themeMode: 'light' },
                { themeMode: 'system' },
            ],
        }

        const result = runMigrationPipeline(snapshot)
        expect(result.success).toBe(true)
        expect(result.snapshot.entries.length).toBe(3)
        result.snapshot.entries.forEach(entry => {
            expect(entry.theme.mode).toBeDefined()
        })
    })
})
