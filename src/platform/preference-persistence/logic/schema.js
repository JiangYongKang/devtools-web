import { STORAGE_VERSIONS, ERROR_CODES } from './constants.js';
import { createError, createSuccess } from './errors.js';

export function createPreferenceRecord(data, version = STORAGE_VERSIONS.LATEST) {
    return {
        schemaVersion: version,
        timestamp: Date.now(),
        data,
    };
}

export function extractVersion(record) {
    if (!record || !record.schemaVersion) {
        return null;
    }
    return record.schemaVersion;
}

export function compareVersions(v1, v2) {
    const parts1 = String(v1).split('.').map(Number);
    const parts2 = String(v2).split('.').map(Number);
    const maxLen = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLen; i++) {
        const n1 = parts1[i] || 0;
        const n2 = parts2[i] || 0;
        if (n1 < n2) return -1;
        if (n1 > n2) return 1;
    }
    return 0;
}

export function migrateV1toV2(record) {
    if (!record || !record.data) {
        return { migrated: false, record };
    }
    
    const version = extractVersion(record);
    if (version && compareVersions(version, STORAGE_VERSIONS.V2) >= 0) {
        return { migrated: false, record };
    }
    
    const newData = { ...record.data };
    
    if (typeof newData.theme === 'string') {
        newData.theme = {
            mode: newData.theme,
            customColors: {},
        };
    }
    
    if (newData.sidebarCollapsed !== undefined) {
        if (!newData.layout) {
            newData.layout = {};
        }
        newData.layout.sidebarCollapsed = newData.sidebarCollapsed;
        delete newData.sidebarCollapsed;
    }
    
    if (newData.toolStates && !newData.tools) {
        newData.tools = newData.toolStates;
        delete newData.toolStates;
    }
    
    return {
        migrated: true,
        record: {
            ...record,
            schemaVersion: STORAGE_VERSIONS.V2,
            data: newData,
            _migratedFrom: version || 'unknown',
        },
    };
}

export const MIGRATION_PIPELINE = [
    {
        from: STORAGE_VERSIONS.V1,
        to: STORAGE_VERSIONS.V2,
        migrate: migrateV1toV2,
    },
];

export function runMigrationPipeline(record) {
    const originalSnapshot = JSON.parse(JSON.stringify(record));
    let current = record;
    let migrated = false;
    let diagnostics = [];
    
    try {
        const version = extractVersion(current);
        if (!version) {
            return {
                ...createError(ERROR_CODES.MIGRATION_ERROR, {
                    reason: 'missing_version',
                    originalSnapshot,
                }),
                migrated: false,
            };
        }
        
        if (compareVersions(version, STORAGE_VERSIONS.LATEST) > 0) {
            return {
                ...createError(ERROR_CODES.MIGRATION_VERSION_TOO_HIGH, {
                    currentVersion: version,
                    supportedVersion: STORAGE_VERSIONS.LATEST,
                    originalSnapshot,
                }),
                migrated: false,
            };
        }
        
        if (compareVersions(version, STORAGE_VERSIONS.LATEST) === 0) {
            return {
                ...createSuccess({ record: current, diagnostics }),
                migrated: false,
            };
        }
        
        for (const step of MIGRATION_PIPELINE) {
            const from = step.from;
            const to = step.to;
            
            if (compareVersions(version, from) >= 0 && compareVersions(version, to) < 0) {
                const result = step.migrate(current);
                if (result.migrated) {
                    current = result.record;
                    migrated = true;
                    diagnostics.push({
                        step: `${from} -> ${to}`,
                        status: 'applied',
                    });
                }
            }
        }
        
        return {
            ...createSuccess({
                record: current,
                originalSnapshot: migrated ? originalSnapshot : null,
                diagnostics,
            }),
            migrated,
        };
        
    } catch (error) {
        return {
            ...createError(ERROR_CODES.MIGRATION_ERROR, {
                message: error.message,
                originalSnapshot,
            }),
            migrated: false,
        };
    }
}

export function isValidPreferenceRecord(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.schemaVersion) return false;
    if (!obj.data || typeof obj.data !== 'object') return false;
    return true;
}
