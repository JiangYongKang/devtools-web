import {
    trimRecentTools,
    mergeRecentWithStrategy,
    createLRUEvictor,
    estimateRecentToolSize,
    estimateDataSize,
} from '../logic/lru.js';
import { MAX_RECENT_TOOLS } from '../logic/constants.js';

describe('LRU (Least Recently Used)', () => {
    describe('trimRecentTools', () => {
        it('should return same array when under limit', () => {
            const tools = [
                { slug: 'tool1', timestamp: Date.now(), accessCount: 1 },
                { slug: 'tool2', timestamp: Date.now() - 1000, accessCount: 2 },
            ];

            const result = trimRecentTools(tools, 10);

            expect(result.success).toBe(true);
            expect(result.trimmed).toHaveLength(2);
            expect(result.removed).toBe(0);
        });

        it('should trim to max count when over limit', () => {
            const tools = [];
            for (let i = 0; i < 50; i++) {
                tools.push({
                    slug: `tool${i}`,
                    timestamp: Date.now() - i * 1000,
                    accessCount: i + 1,
                });
            }

            const maxCount = 10;
            const result = trimRecentTools(tools, maxCount);

            expect(result.success).toBe(true);
            expect(result.trimmed).toHaveLength(maxCount);
            expect(result.removed).toBe(40);
        });

        it('should keep most recent tools first', () => {
            const tools = [
                { slug: 'oldest', timestamp: 1000, accessCount: 1 },
                { slug: 'middle', timestamp: 2000, accessCount: 2 },
                { slug: 'newest', timestamp: 3000, accessCount: 3 },
            ];

            const result = trimRecentTools(tools, 2);

            expect(result.success).toBe(true);
            expect(result.trimmed).toHaveLength(2);
            expect(result.trimmed[0].slug).toBe('newest');
            expect(result.trimmed[1].slug).toBe('middle');
            expect(result.removedSlugs).toContain('oldest');
        });

        it('should use default max count from constants', () => {
            const tools = [];
            for (let i = 0; i < MAX_RECENT_TOOLS + 10; i++) {
                tools.push({
                    slug: `tool${i}`,
                    timestamp: Date.now() + i,
                    accessCount: 1,
                });
            }

            const result = trimRecentTools(tools);

            expect(result.success).toBe(true);
            expect(result.trimmed).toHaveLength(MAX_RECENT_TOOLS);
        });

        it('should handle invalid input gracefully', () => {
            const result = trimRecentTools(null);

            expect(result.success).toBe(true);
            expect(result.trimmed).toEqual([]);
            expect(result.removed).toBe(0);
        });
    });

    describe('mergeRecentWithStrategy', () => {
        describe('keepLatest strategy', () => {
            it('should keep entry with latest timestamp', () => {
                const local = [
                    { slug: 'http-client', timestamp: 1000, accessCount: 3 },
                    { slug: 'json-formatter', timestamp: 2000, accessCount: 5 },
                ];

                const remote = [
                    { slug: 'http-client', timestamp: 3000, accessCount: 1 },
                    { slug: 'base64-encoder', timestamp: 4000, accessCount: 2 },
                ];

                const result = mergeRecentWithStrategy(local, remote, 'keepLatest');

                expect(result.success).toBe(true);
                expect(result.merged).toHaveLength(3);

                const httpClient = result.merged.find(t => t.slug === 'http-client');
                expect(httpClient.timestamp).toBe(3000);
                expect(httpClient.accessCount).toBe(1);
            });

            it('should include entries that exist only in local or remote', () => {
                const local = [
                    { slug: 'only-local', timestamp: 1000, accessCount: 1 },
                ];

                const remote = [
                    { slug: 'only-remote', timestamp: 2000, accessCount: 1 },
                ];

                const result = mergeRecentWithStrategy(local, remote, 'keepLatest');

                expect(result.success).toBe(true);
                expect(result.merged).toHaveLength(2);
            });
        });

        describe('unionTags strategy', () => {
            it('should sum access counts and take max timestamp', () => {
                const local = [
                    { slug: 'http-client', timestamp: 1000, accessCount: 3 },
                ];

                const remote = [
                    { slug: 'http-client', timestamp: 3000, accessCount: 5 },
                ];

                const result = mergeRecentWithStrategy(local, remote, 'unionTags');

                expect(result.success).toBe(true);
                const httpClient = result.merged.find(t => t.slug === 'http-client');
                expect(httpClient.timestamp).toBe(3000);
                expect(httpClient.accessCount).toBe(8);
            });
        });

        it('should sort merged results by timestamp descending', () => {
            const local = [
                { slug: 'tool1', timestamp: 1000, accessCount: 1 },
            ];

            const remote = [
                { slug: 'tool2', timestamp: 3000, accessCount: 1 },
                { slug: 'tool3', timestamp: 2000, accessCount: 1 },
            ];

            const result = mergeRecentWithStrategy(local, remote);

            expect(result.success).toBe(true);
            expect(result.merged[0].slug).toBe('tool2');
            expect(result.merged[1].slug).toBe('tool3');
            expect(result.merged[2].slug).toBe('tool1');
        });
    });

    describe('createLRUEvictor', () => {
        it('should create evictor with correct default size', () => {
            const evictor = createLRUEvictor();
            expect(typeof evictor.evict).toBe('function');
        });

        it('should evict least recently used items first', () => {
            const evictor = createLRUEvictor();

            const items = [
                { id: 1, lastAccess: 1000 },
                { id: 2, lastAccess: 3000 },
                { id: 3, lastAccess: 2000 },
            ];

            const result = evictor.evict(items, 2);

            expect(result.remaining).toHaveLength(2);
            expect(result.evicted).toHaveLength(1);
            expect(result.evicted[0].id).toBe(1);
        });

        it('should return correct evicted count', () => {
            const evictor = createLRUEvictor();

            const items = [
                { id: 1, lastAccess: 1000 },
                { id: 2, lastAccess: 2000 },
                { id: 3, lastAccess: 3000 },
            ];

            const result = evictor.evict(items, 1);

            expect(result.evictedCount).toBe(2);
        });

        it('should handle empty array', () => {
            const evictor = createLRUEvictor();
            const result = evictor.evict([], 5);

            expect(result.remaining).toHaveLength(0);
            expect(result.evicted).toHaveLength(0);
            expect(result.evictedCount).toBe(0);
        });

        it('should keep all items when under target size', () => {
            const evictor = createLRUEvictor();
            const items = [
                { id: 1, lastAccess: 1000 },
                { id: 2, lastAccess: 2000 },
            ];

            const result = evictor.evict(items, 10);

            expect(result.remaining).toHaveLength(2);
            expect(result.evicted).toHaveLength(0);
        });
    });

    describe('estimateRecentToolSize', () => {
        it('should return 0 for null/undefined', () => {
            expect(estimateRecentToolSize(null)).toBe(0);
            expect(estimateRecentToolSize(undefined)).toBe(0);
        });

        it('should return positive number for valid tool', () => {
            const tool = {
                slug: 'http-client',
                timestamp: Date.now(),
                accessCount: 5,
            };

            const size = estimateRecentToolSize(tool);
            expect(typeof size).toBe('number');
            expect(size).toBeGreaterThan(0);
        });

        it('should account for slug length', () => {
            const toolShort = { slug: 'a', timestamp: 1, accessCount: 1 };
            const toolLong = { slug: 'a'.repeat(100), timestamp: 1, accessCount: 1 };

            const sizeShort = estimateRecentToolSize(toolShort);
            const sizeLong = estimateRecentToolSize(toolLong);

            expect(sizeLong).toBeGreaterThan(sizeShort);
        });
    });

    describe('estimateDataSize', () => {
        it('should return 0 for empty data', () => {
            const emptyData = {
                recentTools: [],
                favorites: new Set(),
                tags: {},
                settings: {},
            };

            const size = estimateDataSize(emptyData);
            expect(size).toBe(0);
        });

        it('should account for recent tools', () => {
            const data = {
                recentTools: [
                    { slug: 'tool1', timestamp: 1, accessCount: 1 },
                    { slug: 'tool2', timestamp: 2, accessCount: 1 },
                ],
                favorites: new Set(),
                tags: {},
                settings: {},
            };

            const size = estimateDataSize(data);
            expect(size).toBeGreaterThan(0);
        });

        it('should account for favorites', () => {
            const data = {
                recentTools: [],
                favorites: new Set(['http-client', 'json-formatter', 'base64-encoder']),
                tags: {},
                settings: {},
            };

            const size = estimateDataSize(data);
            expect(size).toBeGreaterThan(0);
        });

        it('should account for tags', () => {
            const data = {
                recentTools: [],
                favorites: new Set(),
                tags: {
                    'http-client': ['api', 'test', 'network'],
                    'json-formatter': ['dev', 'format'],
                },
                settings: {},
            };

            const size = estimateDataSize(data);
            expect(size).toBeGreaterThan(0);
        });

        it('should correctly sum all components', () => {
            const dataWithAll = {
                recentTools: [
                    { slug: 'tool1', timestamp: 1, accessCount: 1 },
                    { slug: 'tool2', timestamp: 2, accessCount: 1 },
                ],
                favorites: new Set(['tool1', 'tool2']),
                tags: {
                    'tool1': ['tag1', 'tag2'],
                },
                settings: {},
            };

            const dataWithNone = {
                recentTools: [],
                favorites: new Set(),
                tags: {},
                settings: {},
            };

            const sizeWithAll = estimateDataSize(dataWithAll);
            const sizeWithNone = estimateDataSize(dataWithNone);

            expect(sizeWithAll).toBeGreaterThan(sizeWithNone);
        });
    });
});
