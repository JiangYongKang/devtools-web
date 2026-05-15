export const DIFF_TYPES = {
    ADDED: 'added',
    REMOVED: 'removed',
    CHANGED: 'changed',
};

/**
 * 比较两个对象的差异，检测新增、删除、变更的字段
 * @param {Object} oldObj - 原始对象
 * @param {Object} newObj - 新对象
 * @param {string} pathPrefix - 路径前缀，用于递归调用
 * @returns {Array} 差异数组，每项包含 type、path、oldValue、newValue
 */
export function diffObjects(oldObj, newObj, pathPrefix = '') {
    const diffs = [];

    if (!oldObj || typeof oldObj !== 'object') oldObj = {};
    if (!newObj || typeof newObj !== 'object') newObj = {};

    if (Array.isArray(oldObj) || Array.isArray(newObj)) {
        const oldStr = JSON.stringify(oldObj);
        const newStr = JSON.stringify(newObj);
        if (oldStr !== newStr) {
            diffs.push({
                type: DIFF_TYPES.CHANGED,
                path: pathPrefix || '.',
                oldValue: oldObj,
                newValue: newObj,
            });
        }
        return diffs;
    }

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
        const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
        const inOld = key in oldObj;
        const inNew = key in newObj;

        if (inOld && !inNew) {
            diffs.push({
                type: DIFF_TYPES.REMOVED,
                path: currentPath,
                oldValue: oldObj[key],
            });
        } else if (!inOld && inNew) {
            diffs.push({
                type: DIFF_TYPES.ADDED,
                path: currentPath,
                newValue: newObj[key],
            });
        } else {
            const oldVal = oldObj[key];
            const newVal = newObj[key];

            if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal && newVal) {
                diffs.push(...diffObjects(oldVal, newVal, currentPath));
            } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                diffs.push({
                    type: DIFF_TYPES.CHANGED,
                    path: currentPath,
                    oldValue: oldVal,
                    newValue: newVal,
                });
            }
        }
    }

    return diffs;
}

/**
 * 比较两个快照的差异
 * @param {Object} oldSnapshot - 旧快照
 * @param {Object} newSnapshot - 新快照
 * @returns {Array} 差异数组，包含 entries 数组的差异
 */
export function diffSnapshots(oldSnapshot, newSnapshot) {
    const diffs = [];

    if (oldSnapshot.schemaVersion !== newSnapshot.schemaVersion) {
        diffs.push({
            type: DIFF_TYPES.CHANGED,
            path: 'schemaVersion',
            oldValue: oldSnapshot.schemaVersion,
            newValue: newSnapshot.schemaVersion,
        });
    }

    const maxEntries = Math.max(oldSnapshot.entries?.length || 0, newSnapshot.entries?.length || 0);

    for (let i = 0; i < maxEntries; i++) {
        const oldEntry = oldSnapshot.entries?.[i];
        const newEntry = newSnapshot.entries?.[i];
        const entryPath = `entries[${i}]`;

        if (!oldEntry && newEntry) {
            diffs.push({
                type: DIFF_TYPES.ADDED,
                path: entryPath,
                newValue: newEntry,
            });
        } else if (oldEntry && !newEntry) {
            diffs.push({
                type: DIFF_TYPES.REMOVED,
                path: entryPath,
                oldValue: oldEntry,
            });
        } else {
            diffs.push(...diffObjects(oldEntry, newEntry, entryPath));
        }
    }

    return diffs;
}

/**
 * 格式化差异结果为易读的字符串
 * @param {Object} diff - 差异对象
 * @returns {string} 格式化后的差异描述
 */
export function formatDiff(diff) {
    switch (diff.type) {
        case DIFF_TYPES.ADDED:
            return `+ [新增] ${diff.path}: ${JSON.stringify(diff.newValue)}`;
        case DIFF_TYPES.REMOVED:
            return `- [删除] ${diff.path}: ${JSON.stringify(diff.oldValue)}`;
        case DIFF_TYPES.CHANGED:
            return `~ [变更] ${diff.path}: ${JSON.stringify(diff.oldValue)} → ${JSON.stringify(diff.newValue)}`;
        default:
            return `? [未知] ${diff.path}`;
    }
}

/**
 * 按类型分组差异数组
 * @param {Array} diffs - 差异数组
 * @returns {Object} 分组后的差异对象，包含 added、removed、changed 三个数组
 */
export function groupDiffsByType(diffs) {
    return {
        added: diffs.filter(d => d.type === DIFF_TYPES.ADDED),
        removed: diffs.filter(d => d.type === DIFF_TYPES.REMOVED),
        changed: diffs.filter(d => d.type === DIFF_TYPES.CHANGED),
    };
}
