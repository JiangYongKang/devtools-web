import { STORAGE_VERSIONS, ERROR_CODES, DEFAULT_CHECK_ALGORITHM, KEY_NAMESPACE } from './constants.js';
import { createError, createSuccess } from './errors.js';
import { runMigrationPipeline, isValidPreferenceRecord } from './schema.js';

export function calculateChecksum(data, algorithm = DEFAULT_CHECK_ALGORITHM) {
    if (algorithm === 'simple') {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return String(hash);
    }
    return 'unknown';
}

export function verifyChecksum(data, checksum, algorithm = DEFAULT_CHECK_ALGORITHM) {
    const calculated = calculateChecksum(data, algorithm);
    return calculated === checksum;
}

export function containsXssRisk(value) {
    if (typeof value === 'string') {
        const xssPatterns = [
            /<script[\s>]/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /data:text\/html/i,
        ];
        return xssPatterns.some(pattern => pattern.test(value));
    }
    
    if (Array.isArray(value)) {
        return value.some(item => containsXssRisk(item));
    }
    
    if (value && typeof value === 'object') {
        return Object.keys(value).some(key => {
            if (containsXssRisk(key)) return true;
            return containsXssRisk(value[key]);
        });
    }
    
    return false;
}

export function filterUnknownFields(data, knownFields = [], diagnostics = []) {
    if (!isPlainObject(data)) {
        return data;
    }
    
    const result = {};
    
    for (const key of Object.keys(data)) {
        if (knownFields.length > 0 && !knownFields.includes(key)) {
            diagnostics.push({
                type: 'unknown_field',
                path: key,
                action: 'ignored',
            });
            continue;
        }
        result[key] = data[key];
    }
    
    return result;
}

export function isPlainObject(value) {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    return Object.prototype.toString.call(value) === '[object Object]';
}

export function createExportPackage(records, options = {}) {
    const {
        checksumAlgorithm = DEFAULT_CHECK_ALGORITHM,
        generatedBy = 'preference-persistence',
    } = options;
    
    const exportData = {
        packageVersion: STORAGE_VERSIONS.LATEST,
        generatedAt: new Date().toISOString(),
        generatedBy,
        records,
    };
    
    const checksum = calculateChecksum(exportData, checksumAlgorithm);
    
    return {
        ...exportData,
        checksum,
        checksumAlgorithm,
    };
}

export function serializeExportPackage(pkg) {
    return JSON.stringify(pkg, null, 2);
}

export function deserializeExportPackage(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        return createSuccess({ data: parsed });
    } catch (error) {
        return createError(ERROR_CODES.DESERIALIZATION_ERROR, {
            message: error.message,
        });
    }
}

export function parseImportPackage(pkg, options = {}) {
    const diagnostics = [];
    const {
        checksumAlgorithm = DEFAULT_CHECK_ALGORITHM,
        knownFields = [],
        allowUnknownFields = true,
    } = options;
    
    if (!isPlainObject(pkg)) {
        return {
            ...createError(ERROR_CODES.IMPORT_CORRUPTED, { reason: 'not_an_object' }),
            diagnostics,
        };
    }
    
    if (!pkg.records || !Array.isArray(pkg.records)) {
        return {
            ...createError(ERROR_CODES.IMPORT_CORRUPTED, { reason: 'missing_records' }),
            diagnostics,
        };
    }
    
    if (!pkg.packageVersion) {
        return {
            ...createError(ERROR_CODES.IMPORT_VERSION_MISMATCH, { reason: 'missing_version' }),
            diagnostics,
        };
    }
    
    if (pkg.checksum) {
        const dataToVerify = {
            packageVersion: pkg.packageVersion,
            generatedAt: pkg.generatedAt,
            generatedBy: pkg.generatedBy,
            records: pkg.records,
        };
        
        if (!verifyChecksum(dataToVerify, pkg.checksum, pkg.checksumAlgorithm || checksumAlgorithm)) {
            return {
                ...createError(ERROR_CODES.IMPORT_INVALID_CHECKSUM),
                diagnostics,
            };
        }
    }
    
    const processedRecords = [];
    let hadMigration = false;
    
    for (const record of pkg.records) {
        if (!isValidPreferenceRecord(record)) {
            diagnostics.push({
                type: 'invalid_record',
                record,
                action: 'skipped',
            });
            continue;
        }
        
        if (containsXssRisk(record.data)) {
            return {
                ...createError(ERROR_CODES.IMPORT_XSS_DETECTED),
                diagnostics: [
                    ...diagnostics,
                    { type: 'xss_detected', action: 'rejected' },
                ],
            };
        }
        
        const migrationResult = runMigrationPipeline(record);
        if (!migrationResult.success) {
            diagnostics.push({
                type: 'migration_failed',
                errorCode: migrationResult.errorCode,
                action: 'skipped',
            });
            continue;
        }
        
        if (migrationResult.migrated) {
            hadMigration = true;
            diagnostics.push({
                type: 'migrated',
                from: record.schemaVersion,
                to: migrationResult.record.schemaVersion,
            });
        }
        
        let processedData = migrationResult.record.data;
        if (!allowUnknownFields && knownFields.length > 0) {
            processedData = filterUnknownFields(processedData, knownFields, diagnostics);
        }
        
        processedRecords.push({
            ...migrationResult.record,
            data: processedData,
        });
    }
    
    return {
        ...createSuccess({
            records: processedRecords,
            packageVersion: pkg.packageVersion,
            hadMigration,
        }),
        diagnostics,
    };
}
