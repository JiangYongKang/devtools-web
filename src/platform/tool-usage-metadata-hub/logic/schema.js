import { STORAGE_VERSIONS, ERROR_CODES } from './constants.js';
import { createSuccess, createError } from './errors.js';

export function createEmptyData() {
    return {
        recentTools: [],
        favorites: new Set(),
        tags: {},
        settings: {
            mergeStrategy: 'keepLatest',
            maxRecentTools: 100,
        },
    };
}

export function createStorageRecord(data, version = STORAGE_VERSIONS.LATEST) {
    return {
        schemaVersion: version,
        timestamp: Date.now(),
        data,
    };
}

export function isValidStorageRecord(record) {
    if (!record || typeof record !== 'object') return false;
    if (!record.schemaVersion || !record.timestamp || !record.data) return false;
    if (typeof record.data !== 'object') return false;
    return true;
}

export function isValidRecentTool(tool) {
    if (!tool || typeof tool !== 'object') return false;
    if (typeof tool.slug !== 'string' || tool.slug.length === 0) return false;
    if (typeof tool.timestamp !== 'number' || tool.timestamp <= 0) return false;
    if (typeof tool.accessCount !== 'number' || tool.accessCount < 0) return false;
    return true;
}

export function createRecentTool(slug, accessCount = 1) {
    return {
        slug,
        timestamp: Date.now(),
        accessCount,
    };
}

export function migrateV1ToV2(v1Data) {
    try {
        const v2Data = createEmptyData();

        if (v1Data.recentTools && Array.isArray(v1Data.recentTools)) {
            const seenSlugs = new Set();
            v2Data.recentTools = v1Data.recentTools
                .filter(tool => tool && typeof tool.slug === 'string')
                .map(tool => ({
                    slug: tool.slug,
                    timestamp: tool.lastUsed || tool.timestamp || Date.now(),
                    accessCount: tool.useCount || tool.accessCount || 1,
                }))
                .filter(tool => {
                    if (seenSlugs.has(tool.slug)) return false;
                    seenSlugs.add(tool.slug);
                    return true;
                });
        }

        if (v1Data.favorites) {
            if (Array.isArray(v1Data.favorites)) {
                v2Data.favorites = new Set(v1Data.favorites);
            } else if (v1Data.favorites instanceof Set) {
                v2Data.favorites = new Set(v1Data.favorites);
            }
        }

        if (v1Data.tags && typeof v1Data.tags === 'object') {
            v2Data.tags = {};
            for (const [slug, tags] of Object.entries(v1Data.tags)) {
                if (Array.isArray(tags)) {
                    v2Data.tags[slug] = [...new Set(tags)];
                }
            }
        }

        if (v1Data.settings && typeof v1Data.settings === 'object') {
            v2Data.settings = {
                ...v2Data.settings,
                ...v1Data.settings,
            };
        }

        return createSuccess({ data: v2Data });
    } catch (error) {
        return createError(ERROR_CODES.MIGRATION_ERROR, {
            originalError: error.message,
        });
    }
}

export function runMigrationPipeline(record) {
    const originalSnapshot = JSON.parse(JSON.stringify(record));
    let migrated = false;
    let currentData = record.data;
    const diagnostics = [];

    try {
        const version = record.schemaVersion;

        if (version === STORAGE_VERSIONS.V2) {
            return createSuccess({
                record: createStorageRecord(currentData, STORAGE_VERSIONS.V2),
                migrated: false,
                originalSnapshot,
                diagnostics,
            });
        }

        if (version === STORAGE_VERSIONS.V1) {
            const migrationResult = migrateV1ToV2(currentData);
            if (!migrationResult.success) {
                return migrationResult;
            }
            currentData = migrationResult.data;
            migrated = true;
            diagnostics.push({
                type: 'migration',
                from: STORAGE_VERSIONS.V1,
                to: STORAGE_VERSIONS.V2,
                message: '成功执行 v1 → v2 迁移',
            });
        }

        if (version > STORAGE_VERSIONS.LATEST) {
            return createError(ERROR_CODES.MIGRATION_VERSION_TOO_HIGH, {
                foundVersion: version,
                supportedVersion: STORAGE_VERSIONS.LATEST,
                originalSnapshot,
            });
        }

        return createSuccess({
            record: createStorageRecord(currentData, STORAGE_VERSIONS.LATEST),
            migrated,
            originalSnapshot,
            diagnostics,
        });
    } catch (error) {
        return createError(ERROR_CODES.MIGRATION_ERROR, {
            originalError: error.message,
            originalSnapshot,
        });
    }
}

export function healCorruptedData(rawData) {
    const diagnostics = [];
    const healed = createEmptyData();

    try {
        if (!rawData || typeof rawData !== 'object') {
            diagnostics.push({ type: 'heal', message: '根数据无效，使用空集合' });
            return createSuccess({ data: healed, diagnostics });
        }

        if (rawData.recentTools) {
            if (Array.isArray(rawData.recentTools)) {
                const seenSlugs = new Set();
                healed.recentTools = rawData.recentTools
                    .filter(tool => isValidRecentTool(tool))
                    .filter(tool => {
                        if (seenSlugs.has(tool.slug)) {
                            diagnostics.push({ type: 'dedupe', slug: tool.slug });
                            return false;
                        }
                        seenSlugs.add(tool.slug);
                        return true;
                    });
            } else {
                diagnostics.push({ type: 'heal', field: 'recentTools', message: '不是数组，重置为空' });
            }
        }

        if (rawData.favorites) {
            if (Array.isArray(rawData.favorites)) {
                healed.favorites = new Set(rawData.favorites.filter(f => typeof f === 'string'));
            } else if (rawData.favorites instanceof Set) {
                healed.favorites = new Set([...rawData.favorites].filter(f => typeof f === 'string'));
            } else {
                diagnostics.push({ type: 'heal', field: 'favorites', message: '格式无效，重置为空' });
            }
        }

        if (rawData.tags && typeof rawData.tags === 'object') {
            for (const [slug, tags] of Object.entries(rawData.tags)) {
                if (Array.isArray(tags)) {
                    healed.tags[slug] = [...new Set(tags.filter(t => typeof t === 'string'))];
                }
            }
        }

        if (rawData.settings && typeof rawData.settings === 'object') {
            healed.settings = {
                ...healed.settings,
                ...rawData.settings,
            };
        }

        return createSuccess({ data: healed, diagnostics });
    } catch (error) {
        diagnostics.push({ type: 'heal_fatal', message: error.message });
        return createSuccess({ data: createEmptyData(), diagnostics });
    }
}

export function deserializeWithFallback(rawString) {
    if (rawString === null || rawString === undefined) {
        return createSuccess({
            data: createEmptyData(),
            wasCorrupted: false,
            diagnostics: [{ type: 'empty', message: '存储为空，使用默认数据' }],
        });
    }

    try {
        const parsed = JSON.parse(rawString);
        return createSuccess({
            data: parsed,
            wasCorrupted: false,
            diagnostics: [],
        });
    } catch (error) {
        return createSuccess({
            data: createEmptyData(),
            wasCorrupted: true,
            diagnostics: [{ type: 'corrupted', message: 'JSON 解析失败，已降级为空集合' }],
        });
    }
}
