import {
    createEmptyData,
    createStorageRecord,
    isValidStorageRecord,
    isValidRecentTool,
    createRecentTool,
    migrateV1ToV2,
    runMigrationPipeline,
    healCorruptedData,
    deserializeWithFallback,
} from '../logic/schema.js';
import { STORAGE_VERSIONS } from '../logic/constants.js';

describe('Schema', () => {
    describe('createEmptyData', () => {
        it('should create empty data structure with correct fields', () => {
            const data = createEmptyData();

            expect(data).toHaveProperty('recentTools');
            expect(data).toHaveProperty('favorites');
            expect(data).toHaveProperty('tags');
            expect(data).toHaveProperty('settings');

            expect(Array.isArray(data.recentTools)).toBe(true);
            expect(data.recentTools).toHaveLength(0);
            expect(data.favorites instanceof Set).toBe(true);
            expect(data.favorites.size).toBe(0);
            expect(typeof data.tags).toBe('object');
            expect(Object.keys(data.tags)).toHaveLength(0);
            expect(typeof data.settings).toBe('object');
        });

        it('should have default merge strategy setting', () => {
            const data = createEmptyData();
            expect(data.settings.mergeStrategy).toBeDefined();
        });
    });

    describe('createStorageRecord', () => {
        it('should create valid storage record with metadata', () => {
            const data = createEmptyData();
            const record = createStorageRecord(data);

            expect(record).toHaveProperty('schemaVersion');
            expect(record).toHaveProperty('timestamp');
            expect(record).toHaveProperty('data');

            expect(record.schemaVersion).toBe(STORAGE_VERSIONS.LATEST);
            expect(typeof record.timestamp).toBe('number');
            expect(record.timestamp).toBeGreaterThan(0);
            expect(record.data).toBe(data);
        });

        it('should accept custom version', () => {
            const data = createEmptyData();
            const record = createStorageRecord(data, STORAGE_VERSIONS.V1);

            expect(record.schemaVersion).toBe(STORAGE_VERSIONS.V1);
        });
    });

    describe('isValidStorageRecord', () => {
        it('should return true for valid records', () => {
            const validRecord = {
                schemaVersion: STORAGE_VERSIONS.V2,
                timestamp: Date.now(),
                data: createEmptyData(),
            };

            expect(isValidStorageRecord(validRecord)).toBe(true);
        });

        it('should return false for invalid records', () => {
            const invalidCases = [
                null,
                undefined,
                {},
                { schemaVersion: STORAGE_VERSIONS.V2 },
                { schemaVersion: STORAGE_VERSIONS.V2, timestamp: Date.now() },
                { schemaVersion: STORAGE_VERSIONS.V2, data: {} },
                { timestamp: Date.now(), data: {} },
            ];

            invalidCases.forEach(case_ => {
                expect(isValidStorageRecord(case_)).toBe(false);
            });
        });
    });

    describe('isValidRecentTool', () => {
        it('should return true for valid recent tool entries', () => {
            const validTool = {
                slug: 'http-client',
                timestamp: Date.now(),
                accessCount: 5,
            };

            expect(isValidRecentTool(validTool)).toBe(true);
        });

        it('should return false for invalid recent tool entries', () => {
            const invalidCases = [
                null,
                undefined,
                {},
                { slug: 'test' },
                { slug: 'test', timestamp: Date.now() },
                { timestamp: Date.now(), accessCount: 1 },
                { slug: 123, timestamp: Date.now(), accessCount: 1 },
                { slug: 'test', timestamp: 'now', accessCount: 1 },
                { slug: 'test', timestamp: Date.now(), accessCount: 'many' },
            ];

            invalidCases.forEach(case_ => {
                expect(isValidRecentTool(case_)).toBe(false);
            });
        });
    });

    describe('createRecentTool', () => {
        it('should create valid recent tool entry', () => {
            const slug = 'http-client';
            const tool = createRecentTool(slug);

            expect(tool.slug).toBe(slug);
            expect(typeof tool.timestamp).toBe('number');
            expect(tool.accessCount).toBe(1);
            expect(isValidRecentTool(tool)).toBe(true);
        });

        it('should accept custom access count', () => {
            const tool = createRecentTool('json-formatter', 10);
            expect(tool.accessCount).toBe(10);
        });
    });

    describe('migrateV1ToV2', () => {
        it('should successfully migrate v1 data to v2', () => {
            const v1Data = {
                recentTools: [
                    { slug: 'http-client', lastUsed: Date.now() - 1000, useCount: 3 },
                    { slug: 'json-formatter', lastUsed: Date.now(), useCount: 5 },
                ],
                favorites: ['http-client'],
                tags: {
                    'http-client': ['api', 'test'],
                },
                settings: {
                    customSetting: 'value',
                },
            };

            const result = migrateV1ToV2(v1Data);

            expect(result.success).toBe(true);
            expect(Array.isArray(result.data.recentTools)).toBe(true);
            expect(result.data.recentTools).toHaveLength(2);
            expect(result.data.recentTools[0].accessCount).toBe(3);
            expect(result.data.recentTools[1].accessCount).toBe(5);
            expect(result.data.favorites instanceof Set).toBe(true);
            expect(result.data.favorites.has('http-client')).toBe(true);
            expect(result.data.tags['http-client']).toEqual(['api', 'test']);
            expect(result.data.settings.customSetting).toBe('value');
        });

        it('should deduplicate recent tools during migration', () => {
            const v1Data = {
                recentTools: [
                    { slug: 'http-client', lastUsed: Date.now() - 1000, useCount: 3 },
                    { slug: 'http-client', lastUsed: Date.now(), useCount: 5 },
                ],
                favorites: [],
                tags: {},
            };

            const result = migrateV1ToV2(v1Data);

            expect(result.success).toBe(true);
            expect(result.data.recentTools).toHaveLength(1);
        });

        it('should handle empty v1 data', () => {
            const result = migrateV1ToV2({});
            expect(result.success).toBe(true);
            expect(result.data.recentTools).toEqual([]);
            expect(result.data.favorites.size).toBe(0);
            expect(result.data.tags).toEqual({});
        });
    });

    describe('runMigrationPipeline', () => {
        it('should return same data if already latest version', () => {
            const originalData = createEmptyData();
            const record = createStorageRecord(originalData);

            const result = runMigrationPipeline(record);

            expect(result.success).toBe(true);
            expect(result.migrated).toBe(false);
            expect(result.record.schemaVersion).toBe(STORAGE_VERSIONS.LATEST);
        });

        it('should migrate from v1 to v2', () => {
            const v1Data = {
                recentTools: [{ slug: 'http-client', lastUsed: Date.now(), useCount: 1 }],
                favorites: [],
                tags: {},
                settings: {},
            };

            const v1Record = {
                schemaVersion: STORAGE_VERSIONS.V1,
                timestamp: Date.now(),
                data: v1Data,
            };

            const result = runMigrationPipeline(v1Record);

            expect(result.success).toBe(true);
            expect(result.migrated).toBe(true);
            expect(result.record.schemaVersion).toBe(STORAGE_VERSIONS.LATEST);
            expect(result.diagnostics.length).toBeGreaterThan(0);
        });

        it('should return error for version higher than latest', () => {
            const futureRecord = {
                schemaVersion: '999.0.0',
                timestamp: Date.now(),
                data: createEmptyData(),
            };

            const result = runMigrationPipeline(futureRecord);

            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('MIGRATION_VERSION_TOO_HIGH');
        });
    });

    describe('healCorruptedData', () => {
        it('should return empty data for null/undefined input', () => {
            const result1 = healCorruptedData(null);
            const result2 = healCorruptedData(undefined);

            expect(result1.success).toBe(true);
            expect(result1.data.recentTools).toEqual([]);
            expect(result2.success).toBe(true);
        });

        it('should filter invalid recent tools', () => {
            const corrupted = {
                recentTools: [
                    { slug: 'valid', timestamp: Date.now(), accessCount: 1 },
                    { slug: 'invalid-no-timestamp', accessCount: 1 },
                    null,
                    undefined,
                    { slug: 'invalid-string-timestamp', timestamp: 'now', accessCount: 1 },
                ],
                favorites: ['valid-fav', 123, null],
                tags: {
                    'valid-slug': ['tag1', 'tag2'],
                    'invalid-tags': 'not-an-array',
                },
            };

            const result = healCorruptedData(corrupted);

            expect(result.success).toBe(true);
            expect(result.data.recentTools).toHaveLength(1);
            expect(result.data.recentTools[0].slug).toBe('valid');
            expect(result.data.favorites.has('valid-fav')).toBe(true);
            expect(result.data.favorites.size).toBe(1);
            expect(result.data.tags['valid-slug']).toEqual(['tag1', 'tag2']);
            expect(result.data.tags['invalid-tags']).toBeUndefined();
        });

        it('should deduplicate recent tools', () => {
            const corrupted = {
                recentTools: [
                    { slug: 'duplicate', timestamp: Date.now(), accessCount: 1 },
                    { slug: 'duplicate', timestamp: Date.now(), accessCount: 2 },
                ],
            };

            const result = healCorruptedData(corrupted);

            expect(result.success).toBe(true);
            expect(result.data.recentTools).toHaveLength(1);
        });

        it('should include diagnostics for healed issues', () => {
            const corrupted = {
                recentTools: [
                    { slug: 'duplicate', timestamp: Date.now(), accessCount: 1 },
                    { slug: 'duplicate', timestamp: Date.now(), accessCount: 2 },
                    { invalid: 'tool' },
                ],
            };

            const result = healCorruptedData(corrupted);

            expect(result.diagnostics.length).toBeGreaterThan(0);
        });
    });

    describe('deserializeWithFallback', () => {
        it('should return empty data for null/undefined', () => {
            const result1 = deserializeWithFallback(null);
            const result2 = deserializeWithFallback(undefined);

            expect(result1.success).toBe(true);
            expect(result1.wasCorrupted).toBe(false);
            expect(result2.success).toBe(true);
        });

        it('should successfully deserialize valid JSON', () => {
            const validData = { test: 'value', number: 42 };
            const jsonString = JSON.stringify(validData);

            const result = deserializeWithFallback(jsonString);

            expect(result.success).toBe(true);
            expect(result.wasCorrupted).toBe(false);
            expect(result.data).toEqual(validData);
        });

        it('should fallback to empty data for corrupted JSON', () => {
            const corruptedJson = 'this is not valid JSON {{{';

            const result = deserializeWithFallback(corruptedJson);

            expect(result.success).toBe(true);
            expect(result.wasCorrupted).toBe(true);
            expect(result.data.recentTools).toEqual([]);
            expect(result.diagnostics.length).toBeGreaterThan(0);
        });

        it('should include diagnostics for corrupted JSON', () => {
            const result = deserializeWithFallback('invalid json');

            expect(result.diagnostics).toBeDefined();
            expect(result.diagnostics[0].type).toBe('corrupted');
        });
    });
});
