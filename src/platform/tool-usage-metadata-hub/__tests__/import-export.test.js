import {
    calculateChecksum,
    verifyChecksum,
    createExportPackage,
    deserializeExportPackage,
    parseImportPackage,
    mergeImportedRecords,
    containsXssRisk,
} from '../logic/import-export.js';
import {
    createStorageRecord,
    createEmptyData,
    createRecentTool,
} from '../logic/schema.js';
import { STORAGE_VERSIONS } from '../logic/constants.js';

describe('Import/Export', () => {
    describe('calculateChecksum', () => {
        it('should generate consistent checksum for same input', () => {
            const data = { test: 'value', number: 42 };
            const checksum1 = calculateChecksum(data);
            const checksum2 = calculateChecksum(data);

            expect(checksum1).toBe(checksum2);
            expect(typeof checksum1).toBe('string');
            expect(checksum1.length).toBeGreaterThan(0);
        });

        it('should generate different checksums for different input', () => {
            const data1 = { test: 'value' };
            const data2 = { test: 'different' };

            const checksum1 = calculateChecksum(data1);
            const checksum2 = calculateChecksum(data2);

            expect(checksum1).not.toBe(checksum2);
        });
    });

    describe('verifyChecksum', () => {
        it('should return true for valid checksum', () => {
            const data = { test: 'value' };
            const checksum = calculateChecksum(data);

            expect(verifyChecksum(data, checksum)).toBe(true);
        });

        it('should return false for invalid checksum', () => {
            const data = { test: 'value' };

            expect(verifyChecksum(data, 'invalid-checksum')).toBe(false);
        });
    });

    describe('containsXssRisk', () => {
        it('should detect script tags', () => {
            const testCases = [
                { input: '<script>alert(1)</script>', shouldMatch: true },
                { input: '<SCRIPT>alert(1)</SCRIPT>', shouldMatch: true },
                { input: '<script src="bad.js"></script>', shouldMatch: true },
            ];

            testCases.forEach(({ input, shouldMatch }) => {
                expect(containsXssRisk(input)).toBe(shouldMatch);
            });
        });

        it('should detect javascript protocol', () => {
            expect(containsXssRisk('javascript:alert(1)')).toBe(true);
        });

        it('should detect event handlers', () => {
            expect(containsXssRisk('onclick=alert(1)')).toBe(true);
            expect(containsXssRisk('onload=alert(1)')).toBe(true);
        });

        it('should not flag safe content', () => {
            const safeCases = [
                'normal text',
                '<div>content</div>',
                'http://example.com',
                { safe: 'data' },
                ['normal', 'array'],
            ];

            safeCases.forEach(input => {
                expect(containsXssRisk(input)).toBe(false);
            });
        });

        it('should recursively check nested objects', () => {
            const nested = {
                level1: {
                    level2: {
                        malicious: '<script>alert(1)</script>',
                    },
                },
            };

            expect(containsXssRisk(nested)).toBe(true);
        });

        it('should recursively check arrays', () => {
            const arr = ['safe', 'also-safe', '<script>bad</script>'];

            expect(containsXssRisk(arr)).toBe(true);
        });
    });

    describe('createExportPackage', () => {
        it('should create export package with metadata', () => {
            const dataRecord = createStorageRecord(createEmptyData());
            const pkg = createExportPackage(dataRecord);

            expect(pkg).toHaveProperty('packageVersion');
            expect(pkg).toHaveProperty('exportedAt');
            expect(pkg).toHaveProperty('algorithm');
            expect(pkg).toHaveProperty('records');
            expect(pkg).toHaveProperty('checksum');

            expect(pkg.packageVersion).toBe(STORAGE_VERSIONS.LATEST);
            expect(typeof pkg.exportedAt).toBe('number');
            expect(Array.isArray(pkg.records)).toBe(true);
            expect(typeof pkg.checksum).toBe('string');
        });

        it('should accept array of records', () => {
            const records = [
                createStorageRecord(createEmptyData()),
                createStorageRecord(createEmptyData()),
            ];

            const pkg = createExportPackage(records);

            expect(pkg.records).toHaveLength(2);
        });

        it('should generate valid checksum', () => {
            const record = createStorageRecord(createEmptyData());
            const pkg = createExportPackage(record);

            const isValid = verifyChecksum(pkg.records, pkg.checksum);
            expect(isValid).toBe(true);
        });
    });

    describe('deserializeExportPackage', () => {
        it('should successfully deserialize valid JSON', () => {
            const record = createStorageRecord(createEmptyData());
            const pkg = createExportPackage(record);
            const jsonString = JSON.stringify(pkg);

            const result = deserializeExportPackage(jsonString);

            expect(result.success).toBe(true);
            expect(result.data.packageVersion).toBe(STORAGE_VERSIONS.LATEST);
        });

        it('should return error for invalid JSON', () => {
            const result = deserializeExportPackage('not valid json {{{');

            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('IMPORT_CORRUPTED');
        });
    });

    describe('parseImportPackage', () => {
        it('should successfully parse valid package', () => {
            const data = createEmptyData();
            data.recentTools.push(createRecentTool('http-client'));
            const record = createStorageRecord(data);
            const pkg = createExportPackage(record);

            const result = parseImportPackage(pkg);

            expect(result.success).toBe(true);
            expect(result.records).toHaveLength(1);
            expect(result.quarantine).toHaveLength(0);
            expect(result.checksumValid).toBe(true);
        });

        it('should quarantine records with XSS risk', () => {
            const maliciousData = {
                recentTools: [
                    { slug: '<script>alert(1)</script>', timestamp: Date.now(), accessCount: 1 },
                ],
                favorites: [],
                tags: {},
                settings: {},
            };

            const pkg = createExportPackage(createStorageRecord(maliciousData));

            const result = parseImportPackage(pkg);

            expect(result.quarantine.length).toBeGreaterThan(0);
            expect(result.diagnostics.some(d => d.type === 'quarantine')).toBe(true);
        });

        it('should return error if records is not an array', () => {
            const invalidPkg = {
                packageVersion: STORAGE_VERSIONS.LATEST,
                exportedAt: Date.now(),
                records: 'not-an-array',
                checksum: 'test',
            };

            const result = parseImportPackage(invalidPkg);

            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('IMPORT_CORRUPTED');
        });

        it('should handle version mismatch gracefully', () => {
            const pkg = {
                packageVersion: '999.0.0',
                exportedAt: Date.now(),
                algorithm: 'simple',
                records: [createStorageRecord(createEmptyData())],
                checksum: '',
            };

            const result = parseImportPackage(pkg);

            expect(result.success).toBe(true);
            expect(result.diagnostics.some(d => d.type === 'version_warning')).toBe(true);
        });

        it('should detect invalid checksum', () => {
            const pkg = {
                packageVersion: STORAGE_VERSIONS.LATEST,
                exportedAt: Date.now(),
                algorithm: 'simple',
                records: [createStorageRecord(createEmptyData())],
                checksum: 'invalid-checksum',
            };

            const result = parseImportPackage(pkg);

            expect(result.checksumValid).toBe(false);
            expect(result.diagnostics.some(d => d.type === 'checksum_mismatch')).toBe(true);
        });

        it('should apply healing to imported data', () => {
            const corruptedData = {
                recentTools: [
                    { slug: 'valid', timestamp: Date.now(), accessCount: 1 },
                    { slug: 'invalid' },
                ],
                favorites: ['valid', null, 123],
                tags: {},
            };

            const pkg = createExportPackage(createStorageRecord(corruptedData));

            const result = parseImportPackage(pkg);

            expect(result.success).toBe(true);
            expect(result.diagnostics.some(d => d.type === 'healing_applied')).toBe(true);
        });
    });

    describe('mergeImportedRecords', () => {
        it('should merge recent tools with keepLatest strategy', () => {
            const localData = createEmptyData();
            localData.recentTools.push({
                slug: 'http-client',
                timestamp: Date.now() - 1000,
                accessCount: 3,
            });

            const importedRecord = createStorageRecord({
                recentTools: [
                    { slug: 'http-client', timestamp: Date.now(), accessCount: 5 },
                    { slug: 'json-formatter', timestamp: Date.now(), accessCount: 2 },
                ],
                favorites: [],
                tags: {},
                settings: {},
            });

            const result = mergeImportedRecords(localData, [importedRecord], 'keepLatest');

            expect(result.success).toBe(true);
            expect(result.data.recentTools).toHaveLength(2);
            const httpClient = result.data.recentTools.find(t => t.slug === 'http-client');
            expect(httpClient.accessCount).toBe(5);
            expect(httpClient.timestamp).toBeGreaterThan(Date.now() - 2000);
        });

        it('should merge recent tools with unionTags strategy', () => {
            const localData = createEmptyData();
            localData.recentTools.push({
                slug: 'http-client',
                timestamp: Date.now() - 1000,
                accessCount: 3,
            });

            const importedRecord = createStorageRecord({
                recentTools: [
                    { slug: 'http-client', timestamp: Date.now(), accessCount: 5 },
                ],
                favorites: [],
                tags: {},
                settings: {},
            });

            const result = mergeImportedRecords(localData, [importedRecord], 'unionTags');

            expect(result.success).toBe(true);
            const httpClient = result.data.recentTools.find(t => t.slug === 'http-client');
            expect(httpClient.accessCount).toBe(8);
        });

        it('should merge favorites as union', () => {
            const localData = createEmptyData();
            localData.favorites.add('http-client');
            localData.favorites.add('json-formatter');

            const importedRecord = createStorageRecord({
                recentTools: [],
                favorites: ['json-formatter', 'base64-encoder'],
                tags: {},
                settings: {},
            });

            const result = mergeImportedRecords(localData, [importedRecord]);

            expect(result.success).toBe(true);
            expect(result.data.favorites.size).toBe(3);
            expect(result.data.favorites.has('http-client')).toBe(true);
            expect(result.data.favorites.has('json-formatter')).toBe(true);
            expect(result.data.favorites.has('base64-encoder')).toBe(true);
        });

        it('should merge tags as union per slug', () => {
            const localData = createEmptyData();
            localData.tags = {
                'http-client': ['api', 'test'],
                'json-formatter': ['dev'],
            };

            const importedRecord = createStorageRecord({
                recentTools: [],
                favorites: [],
                tags: {
                    'http-client': ['network', 'test'],
                    'base64-encoder': ['encode'],
                },
                settings: {},
            });

            const result = mergeImportedRecords(localData, [importedRecord]);

            expect(result.success).toBe(true);
            expect(result.data.tags['http-client']).toContain('api');
            expect(result.data.tags['http-client']).toContain('network');
            expect(result.data.tags['http-client']).toContain('test');
            expect(result.data.tags['json-formatter']).toEqual(['dev']);
            expect(result.data.tags['base64-encoder']).toEqual(['encode']);
        });

        it('should sort recent tools by timestamp descending', () => {
            const localData = createEmptyData();
            const importedRecord = createStorageRecord({
                recentTools: [
                    { slug: 'old', timestamp: Date.now() - 5000, accessCount: 1 },
                    { slug: 'new', timestamp: Date.now(), accessCount: 1 },
                ],
                favorites: [],
                tags: {},
                settings: {},
            });

            const result = mergeImportedRecords(localData, [importedRecord]);

            expect(result.success).toBe(true);
            expect(result.data.recentTools[0].slug).toBe('new');
            expect(result.data.recentTools[1].slug).toBe('old');
        });
    });
});
