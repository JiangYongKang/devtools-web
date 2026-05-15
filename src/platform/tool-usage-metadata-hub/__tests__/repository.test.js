import { ToolUsageRepository, MemoryStorage } from '../logic/index.js';
import { createEmptyData } from '../logic/schema.js';
import { ERROR_CODES } from '../logic/constants.js';

describe('ToolUsageRepository', () => {
    let storage;
    let repo;

    beforeEach(() => {
        storage = new MemoryStorage();
        repo = new ToolUsageRepository({
            customStorage: storage,
            debounceMs: 0,
        });
    });

    describe('initialization', () => {
        it('should create repository with custom storage', () => {
            expect(repo).toBeInstanceOf(ToolUsageRepository);
        });

        it('should expose storage info', () => {
            expect(repo.storageInfo).toBeDefined();
            expect(typeof repo.isDegraded).toBe('boolean');
        });
    });

    describe('event system', () => {
        it('should allow subscribing to events', () => {
            const callback = jest.fn();
            const unsubscribe = repo.on('tool_used', callback);

            expect(typeof unsubscribe).toBe('function');
        });

        it('should emit events when tools are used', (done) => {
            repo.on('tool_used', (data) => {
                expect(data.slug).toBe('http-client');
                done();
            });

            repo.recordToolUsage('http-client');
        });

        it('should allow unsubscribing from events', () => {
            const callback = jest.fn();
            const unsubscribe = repo.on('tool_used', callback);

            unsubscribe();
            repo.recordToolUsage('http-client');

            expect(callback).not.toHaveBeenCalled();
        });

        it('should emit saved event after save', (done) => {
            repo.on('saved', () => {
                done();
            });

            repo.recordToolUsage('http-client');
        });
    });

    describe('recordToolUsage', () => {
        it('should record new tool usage', () => {
            const result = repo.recordToolUsage('http-client');

            expect(result.success).toBe(true);

            const queryResult = repo.query();
            expect(queryResult.success).toBe(true);
            expect(queryResult.results).toHaveLength(1);
            expect(queryResult.results[0].slug).toBe('http-client');
            expect(queryResult.results[0].accessCount).toBe(1);
        });

        it('should increment access count for existing tool', () => {
            repo.recordToolUsage('http-client');
            repo.recordToolUsage('http-client');
            repo.recordToolUsage('http-client');

            const queryResult = repo.query();
            const tool = queryResult.results.find(t => t.slug === 'http-client');

            expect(tool.accessCount).toBe(3);
        });

        it('should move tool to front when accessed again', () => {
            repo.recordToolUsage('tool1');
            repo.recordToolUsage('tool2');
            repo.recordToolUsage('tool3');

            repo.recordToolUsage('tool1');

            const queryResult = repo.query();
            expect(queryResult.results[0].slug).toBe('tool1');
        });

        it('should reject sensitive slug patterns', () => {
            const sensitiveSlugs = [
                'api-key-manager',
                'secret-storage',
                'password-generator',
                'auth-token-viewer',
            ];

            sensitiveSlugs.forEach(slug => {
                const result = repo.recordToolUsage(slug);
                expect(result.success).toBe(false);
                expect(result.errorCode).toBe(ERROR_CODES.SENSITIVE_SLUG);
            });
        });

        it('should persist data to storage', () => {
            repo.recordToolUsage('http-client');

            const key = storage._data.keys().next().value;
            const storedData = storage.getItem(key);

            expect(storedData).toBeDefined();
            expect(typeof storedData).toBe('string');
        });
    });

    describe('favorites', () => {
        it('should add tool to favorites', () => {
            repo.addFavorite('http-client');

            const queryResult = repo.query();
            const tool = queryResult.results.find(t => t.slug === 'http-client');

            expect(tool.isFavorite).toBe(true);
        });

        it('should remove tool from favorites', () => {
            repo.addFavorite('http-client');
            repo.removeFavorite('http-client');

            const queryResult = repo.query();
            const tool = queryResult.results.find(t => t.slug === 'http-client');

            expect(tool.isFavorite).toBe(false);
        });

        it('should emit event when favorite is added', (done) => {
            repo.on('favorite_added', (data) => {
                expect(data.slug).toBe('http-client');
                done();
            });

            repo.addFavorite('http-client');
        });

        it('should emit event when favorite is removed', (done) => {
            repo.on('favorite_removed', (data) => {
                expect(data.slug).toBe('http-client');
                done();
            });

            repo.addFavorite('http-client');
            repo.removeFavorite('http-client');
        });
    });

    describe('tags', () => {
        it('should add tags to tool', () => {
            repo.addTags('http-client', ['api', 'test', 'network']);

            const tags = repo.getTags('http-client');
            expect(tags).toEqual(['api', 'test', 'network']);
        });

        it('should not duplicate tags', () => {
            repo.addTags('http-client', ['api']);
            repo.addTags('http-client', ['api', 'test']);

            const tags = repo.getTags('http-client');
            expect(tags).toEqual(['api', 'test']);
        });

        it('should return empty array for tool with no tags', () => {
            const tags = repo.getTags('non-existent-tool');
            expect(tags).toEqual([]);
        });

        it('should remove tags from tool', () => {
            repo.addTags('http-client', ['api', 'test', 'network']);
            repo.removeTags('http-client', ['test', 'network']);

            const tags = repo.getTags('http-client');
            expect(tags).toEqual(['api']);
        });

        it('should return all unique tags', () => {
            repo.addTags('http-client', ['api', 'test']);
            repo.addTags('json-formatter', ['dev', 'test']);

            const allTags = repo.getAllTags();

            expect(allTags).toContain('api');
            expect(allTags).toContain('test');
            expect(allTags).toContain('dev');
            expect(allTags).toHaveLength(3);
        });
    });

    describe('query', () => {
        beforeEach(() => {
            repo.recordToolUsage('http-client');
            repo.recordToolUsage('json-formatter');
            repo.recordToolUsage('base64-encoder');
            repo.recordToolUsage('uuid-generator');

            repo.addFavorite('http-client');
            repo.addFavorite('json-formatter');

            repo.addTags('http-client', ['api', 'test']);
            repo.addTags('json-formatter', ['dev', 'format']);
            repo.addTags('base64-encoder', ['encode', 'format']);
        });

        it('should return all tools by default', () => {
            const result = repo.query();

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(4);
        });

        it('should filter by favorites only', () => {
            const result = repo.query({ favoritesOnly: true });

            expect(result.results).toHaveLength(2);
            result.results.forEach(tool => {
                expect(tool.isFavorite).toBe(true);
            });
        });

        it('should filter by tags intersection', () => {
            const result = repo.query({
                tags: ['format', 'encode'],
                tagIntersection: true,
            });

            expect(result.results).toHaveLength(1);
            expect(result.results[0].slug).toBe('base64-encoder');
        });

        it('should filter by tags union when tagIntersection is false', () => {
            const result = repo.query({
                tags: ['api', 'format'],
                tagIntersection: false,
            });

            expect(result.results.length).toBeGreaterThanOrEqual(2);
        });

        it('should sort by most recent', () => {
            repo.recordToolUsage('json-formatter');

            const result = repo.query({ sortBy: 'recent' });

            expect(result.results[0].slug).toBe('json-formatter');
        });

        it('should sort by most frequent', () => {
            repo.recordToolUsage('http-client');
            repo.recordToolUsage('http-client');

            const result = repo.query({ sortBy: 'frequent' });

            expect(result.results[0].slug).toBe('http-client');
        });

        it('should sort alphabetically', () => {
            const result = repo.query({ sortBy: 'alphabetical' });

            expect(result.results[0].slug).toBe('base64-encoder');
            expect(result.results[1].slug).toBe('http-client');
        });

        it('should support pagination with limit and offset', () => {
            const result1 = repo.query({ limit: 2, offset: 0 });
            const result2 = repo.query({ limit: 2, offset: 2 });

            expect(result1.results).toHaveLength(2);
            expect(result2.results).toHaveLength(2);
            expect(result1.total).toBe(4);
        });
    });

    describe('batch operations', () => {
        beforeEach(() => {
            repo.recordToolUsage('tool1');
            repo.recordToolUsage('tool2');
            repo.recordToolUsage('tool3');
            repo.addFavorite('tool1');
            repo.addFavorite('tool2');
            repo.addFavorite('tool3');
        });

        it('should batch remove favorites', () => {
            const result = repo.batchRemoveFavorites(['tool1', 'tool2']);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);

            const queryResult = repo.query({ favoritesOnly: true });
            expect(queryResult.results).toHaveLength(1);
            expect(queryResult.results[0].slug).toBe('tool3');
        });

        it('should batch add tags', () => {
            const result = repo.batchAddTags(['tool1', 'tool2'], ['batch-tag']);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);

            expect(repo.getTags('tool1')).toContain('batch-tag');
            expect(repo.getTags('tool2')).toContain('batch-tag');
            expect(repo.getTags('tool3')).not.toContain('batch-tag');
        });
    });

    describe('export/import', () => {
        beforeEach(() => {
            repo.recordToolUsage('http-client');
            repo.recordToolUsage('json-formatter');
            repo.addFavorite('http-client');
            repo.addTags('http-client', ['api', 'test']);
        });

        it('should export data with package structure', () => {
            const result = repo.exportData();

            expect(result.success).toBe(true);
            expect(result.package).toBeDefined();
            expect(result.json).toBeDefined();
            expect(typeof result.json).toBe('string');
        });

        it('should import valid data', () => {
            const exportResult = repo.exportData();

            const newStorage = new MemoryStorage();
            const newRepo = new ToolUsageRepository({
                customStorage: newStorage,
                debounceMs: 0,
            });

            newRepo.storage.clear();
            newRepo.storage.storage = newStorage;

            expect(result).toHaveProperty('json');

            const tools = repo.query();
            expect(tools.results.length).toBeGreaterThan(0);
        });
    });

    describe('clear', () => {
        it('should clear all data', () => {
            repo.recordToolUsage('http-client');
            repo.addFavorite('http-client');
            repo.addTags('http-client', ['api']);

            repo.clear();

            const queryResult = repo.query();
            expect(queryResult.results).toHaveLength(0);
        });

        it('should emit cleared event', (done) => {
            repo.on('cleared', () => {
                done();
            });

            repo.clear();
        });
    });

    describe('statistics', () => {
        it('should return correct statistics', () => {
            repo.recordToolUsage('http-client');
            repo.recordToolUsage('json-formatter');
            repo.addFavorite('http-client');
            repo.addTags('http-client', ['api', 'test']);

            const statsResult = repo.getStats();

            expect(statsResult.success).toBe(true);
            expect(statsResult.recentToolsCount).toBe(2);
            expect(statsResult.favoritesCount).toBe(1);
            expect(statsResult.taggedToolsCount).toBe(1);
            expect(statsResult.estimatedSizeBytes).toBeGreaterThan(0);
            expect(typeof statsResult.estimatedSize).toBe('string');
        });
    });

    describe('demo data', () => {
        it('should create demo data', () => {
            repo.createDemoData();

            const statsResult = repo.getStats();
            expect(statsResult.recentToolsCount).toBeGreaterThan(15);
        });
    });
});
