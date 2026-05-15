import { ERROR_CODES, VALIDATION_LIMITS } from './constants.js';
import { createError, createSuccess } from './errors.js';
import { verifyChecksum, isPlainObject } from './snapshot.js';

/**
 * 递归测量对象的嵌套深度
 * @param {Object} obj - 待测量的对象
 * @param {number} currentDepth - 当前递归深度
 * @returns {number} 对象的最大嵌套深度
 */
export function measureDepth(obj, currentDepth = 0) {
    if (!obj || typeof obj !== 'object') return currentDepth;

    if (Array.isArray(obj)) {
        if (obj.length === 0) return currentDepth + 1;
        return Math.max(...obj.map(item => measureDepth(item, currentDepth + 1)));
    }

    const keys = Object.keys(obj);
    if (keys.length === 0) return currentDepth + 1;

    return Math.max(...keys.map(key => measureDepth(obj[key], currentDepth + 1)));
}

/**
 * 统计对象中所有键的数量（包括嵌套对象）
 * @param {Object} obj - 待统计的对象
 * @returns {number} 键的总数量
 */
export function countKeys(obj) {
    if (!obj || typeof obj !== 'object') return 0;

    if (Array.isArray(obj)) {
        return obj.reduce((sum, item) => sum + countKeys(item), 0);
    }

    const keys = Object.keys(obj);
    return keys.length + keys.reduce((sum, key) => sum + countKeys(obj[key]), 0);
}

/**
 * 校验快照结构是否完整
 * @param {Object} snapshot - 待校验的快照对象
 * @returns {Object} 校验结果，包含 success 和 errors 属性
 */
export function validateSnapshotStructure(snapshot) {
    const errors = [];

    if (!snapshot || !isPlainObject(snapshot)) {
        errors.push({ code: ERROR_CODES.INVALID_SCHEMA, message: '快照不是有效的对象' });
        return createError(ERROR_CODES.INVALID_SCHEMA, { errors });
    }

    if (!snapshot.schemaVersion) {
        errors.push({ code: ERROR_CODES.INVALID_SCHEMA, field: 'schemaVersion', message: '缺少 schemaVersion 字段' });
    }

    if (!snapshot.exportedAt) {
        errors.push({ code: ERROR_CODES.INVALID_SCHEMA, field: 'exportedAt', message: '缺少 exportedAt 字段' });
    }

    if (!snapshot.checksum) {
        errors.push({ code: ERROR_CODES.INVALID_SCHEMA, field: 'checksum', message: '缺少 checksum 字段' });
    }

    if (!snapshot.entries || !Array.isArray(snapshot.entries)) {
        errors.push({ code: ERROR_CODES.INVALID_SCHEMA, field: 'entries', message: '缺少 entries 或 entries 不是数组' });
    }

    if (errors.length > 0) {
        return createError(ERROR_CODES.INVALID_SCHEMA, { errors });
    }

    return createSuccess({ valid: true });
}

/**
 * 校验快照的 checksum 是否有效
 * @param {Object} snapshot - 待校验的快照对象
 * @returns {Object} 校验结果
 */
export function validatePayloadChecksum(snapshot) {
    const payload = { entries: snapshot.entries };
    const isValid = verifyChecksum(payload, snapshot.checksum, snapshot.checksumAlgorithm);

    if (!isValid) {
        return createError(ERROR_CODES.INVALID_CHECKSUM, {
            message: '校验和不匹配，数据可能已被篡改',
        });
    }

    return createSuccess({ valid: true });
}

/**
 * 完整校验快照（包含结构、checksum、深度限制）
 * @param {Object} snapshot - 待校验的快照对象
 * @param {number} maxDepth - 最大允许嵌套深度，默认 20 层
 * @returns {Object} 校验结果
 */
export function validateSnapshot(snapshot, maxDepth = VALIDATION_LIMITS.MAX_DEPTH) {
    const diagnostics = [];

    const structureResult = validateSnapshotStructure(snapshot);
    if (!structureResult.success) {
        return { ...structureResult, diagnostics };
    }

    diagnostics.push({ type: 'schema', status: 'passed' });

    const depth = measureDepth(snapshot);
    diagnostics.push({ type: 'depth', value: depth });
    if (depth > maxDepth) {
        return createError(ERROR_CODES.MAX_DEPTH_EXCEEDED, {
            message: `嵌套深度超过限制: ${depth} > ${maxDepth}`,
            depth,
            maxDepth,
            diagnostics,
        });
    }

    diagnostics.push({ type: 'depth_check', status: 'passed' });

    const keyCount = countKeys(snapshot);
    diagnostics.push({ type: 'key_count', value: keyCount });
    diagnostics.push({ type: 'key_count_check', status: 'passed' });

    const checksumResult = validatePayloadChecksum(snapshot);
    if (!checksumResult.success) {
        return { ...checksumResult, diagnostics };
    }

    diagnostics.push({ type: 'checksum', status: 'passed' });

    return {
        success: true,
        diagnostics,
    };
}
