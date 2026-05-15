import { STORAGE_VERSIONS, ERROR_CODES, DEFAULT_CHECK_ALGORITHM } from './constants.js';
import { createSuccess, createError } from './errors.js';
import { createStorageRecord, healCorruptedData } from './schema.js';

export function calculateChecksum(data, algorithm = DEFAULT_CHECK_ALGORITHM) {
    if (algorithm === 'simple') {
        const jsonStr = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    return '';
}

export function verifyChecksum(data, checksum, algorithm = DEFAULT_CHECK_ALGORITHM) {
    const calculated = calculateChecksum(data, algorithm);
    return calculated === checksum;
}

export function createExportPackage(dataRecord, options = {}) {
    const records = Array.isArray(dataRecord) ? dataRecord : [dataRecord];
    const algorithm = options.algorithm || DEFAULT_CHECK_ALGORITHM;

    const payload = {
        packageVersion: STORAGE_VERSIONS.LATEST,
        exportedAt: Date.now(),
        algorithm,
        records: records.map(r => ({
            schemaVersion: r.schemaVersion,
            timestamp: r.timestamp,
            data: r.data,
        })),
    };

    payload.checksum = calculateChecksum(payload.records, algorithm);

    return payload;
}

export function serializeExportPackage(pkg) {
    return JSON.stringify(pkg, null, 2);
}

export function deserializeExportPackage(jsonString) {
    try {
        const pkg = JSON.parse(jsonString);
        return createSuccess({ data: pkg });
    } catch (error) {
        return createError(ERROR_CODES.IMPORT_CORRUPTED, {
            originalError: error.message,
        });
    }
}

export function containsXssRisk(obj) {
    if (typeof obj === 'string') {
        const lower = obj.toLowerCase();
        return lower.includes('<script') ||
            lower.includes('javascript:') ||
            lower.includes('onclick=') ||
            lower.includes('onload=');
    }
    if (Array.isArray(obj)) {
        return obj.some(item => containsXssRisk(item));
    }
    if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            if (containsXssRisk(obj[key])) return true;
        }
    }
    return false;
}

export function parseImportPackage(pkg, options = {}) {
    const diagnostics = [];
    const quarantine = [];

    if (!pkg || typeof pkg !== 'object') {
        return createError(ERROR_CODES.IMPORT_CORRUPTED, {
            message: '导入包不是有效的对象',
        });
    }

    if (pkg.packageVersion > STORAGE_VERSIONS.LATEST) {
        diagnostics.push({
            type: 'version_warning',
            message: '导入包版本高于当前支持版本',
            found: pkg.packageVersion,
            supported: STORAGE_VERSIONS.LATEST,
        });
    }

    const checksumValid = verifyChecksum(
        pkg.records,
        pkg.checksum,
        pkg.algorithm || DEFAULT_CHECK_ALGORITHM
    );

    if (!checksumValid) {
        diagnostics.push({
            type: 'checksum_mismatch',
            message: '校验和验证失败，数据可能已被篡改',
        });
    }

    if (!Array.isArray(pkg.records)) {
        return createError(ERROR_CODES.IMPORT_CORRUPTED, {
            message: 'records 字段不是数组',
            diagnostics,
        });
    }

    const validRecords = [];

    for (let i = 0; i < pkg.records.length; i++) {
        const record = pkg.records[i];

        if (!record || !record.data) {
            quarantine.push({
                index: i,
                reason: 'invalid_record',
                record,
            });
            continue;
        }

        if (containsXssRisk(record.data)) {
            quarantine.push({
                index: i,
                reason: 'xss_risk',
                record,
            });
            continue;
        }

        const healing = healCorruptedData(record.data);
        if (healing.diagnostics && healing.diagnostics.length > 0) {
            diagnostics.push({
                type: 'healing_applied',
                index: i,
                details: healing.diagnostics,
            });
        }

        validRecords.push({
            schemaVersion: record.schemaVersion || STORAGE_VERSIONS.V1,
            timestamp: record.timestamp || Date.now(),
            data: healing.data,
        });
    }

    if (quarantine.length > 0) {
        diagnostics.push({
            type: 'quarantine',
            count: quarantine.length,
            message: `${quarantine.length} 条记录被隔离`,
        });
    }

    return createSuccess({
        records: validRecords,
        quarantine,
        diagnostics,
        hadMigration: pkg.packageVersion < STORAGE_VERSIONS.LATEST,
        checksumValid,
    });
}

export function mergeImportedRecords(localData, importedRecords, strategy = 'keepLatest') {
    const mergedRecent = new Map();
    const mergedFavorites = new Set(localData.favorites);
    const mergedTags = { ...localData.tags };

    for (const tool of localData.recentTools) {
        mergedRecent.set(tool.slug, { ...tool });
    }

    for (const record of importedRecords) {
        const importedData = record.data;

        if (importedData.recentTools && Array.isArray(importedData.recentTools)) {
            for (const tool of importedData.recentTools) {
                const existing = mergedRecent.get(tool.slug);
                if (!existing) {
                    mergedRecent.set(tool.slug, { ...tool });
                } else if (strategy === 'keepLatest') {
                    if (tool.timestamp > existing.timestamp) {
                        mergedRecent.set(tool.slug, { ...tool });
                    }
                } else if (strategy === 'unionTags') {
                    mergedRecent.set(tool.slug, {
                        ...existing,
                        timestamp: Math.max(existing.timestamp, tool.timestamp),
                        accessCount: existing.accessCount + tool.accessCount,
                    });
                }
            }
        }

        if (importedData.favorites && importedData.favorites instanceof Set) {
            for (const slug of importedData.favorites) {
                mergedFavorites.add(slug);
            }
        } else if (importedData.favorites && Array.isArray(importedData.favorites)) {
            for (const slug of importedData.favorites) {
                mergedFavorites.add(slug);
            }
        }

        if (importedData.tags && typeof importedData.tags === 'object') {
            for (const [slug, tags] of Object.entries(importedData.tags)) {
                if (Array.isArray(tags)) {
                    const existing = mergedTags[slug] || [];
                    mergedTags[slug] = [...new Set([...existing, ...tags])];
                }
            }
        }
    }

    return createSuccess({
        data: {
            recentTools: Array.from(mergedRecent.values()).sort((a, b) => b.timestamp - a.timestamp),
            favorites: mergedFavorites,
            tags: mergedTags,
            settings: localData.settings,
        },
    });
}
