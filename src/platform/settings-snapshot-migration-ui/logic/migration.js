import { SNAPSHOT_VERSIONS, ERROR_CODES, BREAKING_CHANGES } from './constants.js';
import { createError, createSuccess } from './errors.js';
import { isPlainObject } from './snapshot.js';

/**
 * 比较两个语义化版本号
 * @param {string} v1 - 版本号1
 * @param {string} v2 - 版本号2
 * @returns {number} -1表示v1<v2, 0表示相等, 1表示v1>v2
 */
export function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 < p2) return -1;
        if (p1 > p2) return 1;
    }
    return 0;
}

/**
 * 深度克隆对象
 * @param {any} obj - 要克隆的对象
 * @returns {any} 克隆后的对象
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * 将快照从 v1 迁移到 v2
 * 变更说明：
 * - themeMode 重命名为 theme.mode
 * - sidebarCollapsed 重命名为 layout.sidebar.collapsed
 * - toolStates 重命名为 tools
 * @param {Object} snapshot - v1 版本快照
 * @returns {Object} 迁移结果，包含 migrated 标记和新快照
 */
export function migrateV1ToV2(snapshot) {
    if (compareVersions(snapshot.schemaVersion, SNAPSHOT_VERSIONS.V2) >= 0) {
        return { migrated: false, snapshot };
    }

    const newSnapshot = deepClone(snapshot);
    newSnapshot.schemaVersion = SNAPSHOT_VERSIONS.V2;

    newSnapshot.entries = newSnapshot.entries.map(entry => {
        const newEntry = { ...entry };

        if ('themeMode' in newEntry) {
            newEntry.theme = { mode: newEntry.themeMode };
            delete newEntry.themeMode;
        }

        if ('sidebarCollapsed' in newEntry) {
            if (!newEntry.layout) newEntry.layout = {};
            if (!newEntry.layout.sidebar) newEntry.layout.sidebar = {};
            newEntry.layout.sidebar.collapsed = newEntry.sidebarCollapsed;
            delete newEntry.sidebarCollapsed;
        }

        if ('toolStates' in newEntry) {
            newEntry.tools = newEntry.toolStates;
            delete newEntry.toolStates;
        }

        return newEntry;
    });

    return { migrated: true, snapshot: newSnapshot };
}

/**
 * 将快照从 v2 迁移到 v3
 * 变更说明：
 * - 删除 user 字段
 * - workspaceData 重命名为 workspace.settings
 * - 在 meta.createdAt 中记录创建时间
 * @param {Object} snapshot - v2 版本快照
 * @returns {Object} 迁移结果，包含 migrated 标记和新快照
 */
export function migrateV2ToV3(snapshot) {
    if (compareVersions(snapshot.schemaVersion, SNAPSHOT_VERSIONS.V3) >= 0) {
        return { migrated: false, snapshot };
    }

    const newSnapshot = deepClone(snapshot);
    newSnapshot.schemaVersion = SNAPSHOT_VERSIONS.V3;

    if (!newSnapshot.meta) newSnapshot.meta = {};
    newSnapshot.meta.createdAt = newSnapshot.exportedAt;

    newSnapshot.entries = newSnapshot.entries.map(entry => {
        const newEntry = { ...entry };

        if ('user' in newEntry) {
            delete newEntry.user;
        }

        if ('workspaceData' in newEntry) {
            if (!newEntry.workspace) newEntry.workspace = {};
            newEntry.workspace.settings = newEntry.workspaceData;
            delete newEntry.workspaceData;
        }

        return newEntry;
    });

    return { migrated: true, snapshot: newSnapshot };
}

/**
 * 运行完整的迁移流水线，自动将快照迁移到最新版本
 * @param {Object} snapshot - 待迁移的快照对象
 * @returns {Object} 迁移结果，包含 success、migrated、snapshot、breakingChanges 等属性
 */
export function runMigrationPipeline(snapshot) {
    if (!snapshot || !isPlainObject(snapshot)) {
        return createError(ERROR_CODES.INVALID_SCHEMA, {
            message: '快照对象无效',
            originalSnapshot: snapshot,
        });
    }

    const originalVersion = snapshot.schemaVersion;

    if (!originalVersion) {
        return createError(ERROR_CODES.INVALID_SCHEMA, {
            message: '缺少 schemaVersion 字段',
            originalSnapshot: snapshot,
        });
    }

    if (compareVersions(originalVersion, SNAPSHOT_VERSIONS.LATEST) > 0) {
        return createError(ERROR_CODES.VERSION_TOO_HIGH, {
            message: '快照版本过高，请升级应用',
            originalVersion,
            latestVersion: SNAPSHOT_VERSIONS.LATEST,
            upgradeGuide: '请更新到最新版本后再导入',
            originalSnapshot: snapshot,
        });
    }

    if (compareVersions(originalVersion, SNAPSHOT_VERSIONS.V1) < 0) {
        return createError(ERROR_CODES.VERSION_TOO_OLD, {
            message: '快照版本过低，无法迁移',
            originalVersion,
        });
    }

    let currentSnapshot = snapshot;
    let migrated = false;
    const breakingChanges = [];

    const migrations = [
        { versionKey: '1.0.0->2.0.0', targetVersion: SNAPSHOT_VERSIONS.V2, fn: migrateV1ToV2 },
        { versionKey: '2.0.0->3.0.0', targetVersion: SNAPSHOT_VERSIONS.V3, fn: migrateV2ToV3 },
    ];

    for (const migration of migrations) {
        const result = migration.fn(currentSnapshot);
        if (result.migrated) {
            migrated = true;
            currentSnapshot = result.snapshot;
            if (BREAKING_CHANGES[migration.versionKey]) {
                breakingChanges.push({
                    version: migration.targetVersion,
                    changes: BREAKING_CHANGES[migration.versionKey],
                });
            }
        }
    }

    return createSuccess({
        migrated,
        snapshot: currentSnapshot,
        originalVersion,
        finalVersion: currentSnapshot.schemaVersion,
        breakingChanges,
    });
}
