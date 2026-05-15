import {
    STORAGE_VERSIONS,
    MERGE_STRATEGIES,
    ERROR_CODES,
    SENSITIVE_PATTERNS,
    DEFAULT_DEBOUNCE_MS,
    MAX_RECENT_TOOLS,
    TOOL_ALIASES,
} from './constants.js';
import { createSuccess, createError, isQuotaExceededError } from './errors.js';
import {
    createEmptyData,
    createStorageRecord,
    isValidStorageRecord,
    createRecentTool,
    runMigrationPipeline,
    healCorruptedData,
    deserializeWithFallback,
} from './schema.js';
import {
    buildKey,
    getStorage,
    MemoryStorage,
    getGlobalMemoryStorage,
    resetGlobalMemoryStorage,
    estimateByteSize,
    estimateSize,
    getAllNamespaceStats,
    clearAllNamespace,
} from './storage.js';
import { trimRecentTools, mergeRecentWithStrategy, estimateDataSize } from './lru.js';
import {
    calculateChecksum,
    verifyChecksum,
    createExportPackage,
    serializeExportPackage,
    deserializeExportPackage,
    parseImportPackage,
    mergeImportedRecords,
    containsXssRisk,
} from './import-export.js';

class ToolUsageRepository {
    constructor(options = {}) {
        this._customStorage = options.customStorage || null;
        this._debounceMs = options.debounceMs || DEFAULT_DEBOUNCE_MS;
        this._maxRecentTools = options.maxRecentTools || MAX_RECENT_TOOLS;
        this._eventListeners = new Map();
        this._storageInfo = null;
        this._data = null;
        this._saveTimeout = null;
        this._isLoaded = false;
        this._initStorage();
    }

    _initStorage() {
        if (this._customStorage) {
            this._storageInfo = {
                type: 'custom',
                storage: this._customStorage,
                degraded: false,
            };
        } else {
            this._storageInfo = getStorage();
        }
    }

    /**
     * 获取当前存储信息快照
     * @returns {Object} 存储类型、存储实例、是否降级
     */
    get storageInfo() {
        return { ...this._storageInfo };
    }

    /**
     * 检查是否处于降级模式（隐私模式或内存存储）
     * @returns {boolean} 是否降级
     */
    get isDegraded() {
        return this._storageInfo.degraded;
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 事件回调函数
     * @returns {Function} 取消订阅函数
     */
    on(event, callback) {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, []);
        }
        this._eventListeners.get(event).push(callback);
        return () => this.off(event, callback);
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 要取消的回调函数
     */
    off(event, callback) {
        const listeners = this._eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    _emit(event, data) {
        const listeners = this._eventListeners.get(event);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(data);
                } catch (e) {
                    console.error('Event listener error:', e);
                }
            }
        }
    }

    _serialize(data) {
        try {
            const record = createStorageRecord(data);
            record.data.favorites = Array.from(record.data.favorites);
            return createSuccess({ data: JSON.stringify(record) });
        } catch (error) {
            return createError(ERROR_CODES.SERIALIZATION_ERROR, {
                originalError: error.message,
            });
        }
    }

    _deserialize(str) {
        const parseResult = deserializeWithFallback(str);
        if (!parseResult.success) {
            return parseResult;
        }

        let data = parseResult.data;
        const diagnostics = [...(parseResult.diagnostics || [])];

        if (!isValidStorageRecord(data)) {
            const healed = healCorruptedData(data.data || data);
            diagnostics.push(...(healed.diagnostics || []));
            data = createStorageRecord(healed.data);
        }

        if (data.schemaVersion !== STORAGE_VERSIONS.LATEST) {
            const migration = runMigrationPipeline(data);
            if (!migration.success) {
                return migration;
            }
            data = migration.record;
            diagnostics.push(...(migration.diagnostics || []));
        }

        if (data.data && Array.isArray(data.data.favorites)) {
            data.data.favorites = new Set(data.data.favorites);
        }

        return createSuccess({
            data,
            wasCorrupted: parseResult.wasCorrupted,
            diagnostics,
        });
    }

    _saveImmediate() {
        if (!this._data) {
            return createError(ERROR_CODES.STORAGE_UNAVAILABLE, {
                message: '数据未加载',
            });
        }

        const key = buildKey();
        const serialized = this._serialize(this._data);
        if (!serialized.success) {
            return serialized;
        }

        const storage = this._storageInfo.storage;

        try {
            storage.setItem(key, serialized.data);
            this._emit('saved', { timestamp: Date.now() });
            return createSuccess();
        } catch (error) {
            if (isQuotaExceededError(error)) {
                const trimResult = trimRecentTools(this._data.recentTools, Math.floor(this._maxRecentTools / 2));
                this._data.recentTools = trimResult.trimmed;

                const retrySerialized = this._serialize(this._data);
                if (retrySerialized.success) {
                    try {
                        storage.setItem(key, retrySerialized.data);
                        this._emit('quota_evicted', {
                            removed: trimResult.removed,
                            timestamp: Date.now(),
                        });
                        return createSuccess({
                            quotaEvicted: true,
                            removedCount: trimResult.removed,
                        });
                    } catch (retryError) {
                    }
                }
            }
            return createError(ERROR_CODES.QUOTA_EXCEEDED, {
                originalError: error.message,
            });
        }
    }

    _debouncedSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => {
            this._saveImmediate();
            this._saveTimeout = null;
        }, this._debounceMs);
    }

    /**
     * 从存储加载数据，自动执行迁移和损坏恢复
     * @returns {Object} 加载结果，包含数据快照和诊断信息
     */
    load() {
        const key = buildKey();
        const storage = this._storageInfo.storage;

        try {
            const raw = storage.getItem(key);
            const deserializeResult = this._deserialize(raw);

            if (!deserializeResult.success) {
                return deserializeResult;
            }

            this._data = deserializeResult.data.data;
            this._isLoaded = true;

            this._emit('loaded', {
                wasCorrupted: deserializeResult.wasCorrupted,
                diagnostics: deserializeResult.diagnostics,
            });

            return createSuccess({
                data: this._getDataSnapshot(),
                wasCorrupted: deserializeResult.wasCorrupted,
                diagnostics: deserializeResult.diagnostics,
            });
        } catch (error) {
            this._data = createEmptyData();
            this._isLoaded = true;
            return createSuccess({
                data: this._getDataSnapshot(),
                wasCorrupted: true,
                diagnostics: [{ type: 'fallback', message: '读取存储失败，使用空数据' }],
            });
        }
    }

    _ensureLoaded() {
        if (!this._isLoaded) {
            this.load();
        }
    }

    _getDataSnapshot() {
        return {
            recentTools: [...this._data.recentTools],
            favorites: new Set(this._data.favorites),
            tags: JSON.parse(JSON.stringify(this._data.tags)),
            settings: { ...this._data.settings },
        };
    }

    /**
     * 记录工具使用，自动更新时间戳和访问次数
     * @param {string} slug - 工具标识
     * @returns {Object} 操作结果，敏感 slug 会返回错误
     */
    recordToolUsage(slug) {
        if (this._isSensitiveSlug(slug)) {
            return createError(ERROR_CODES.SENSITIVE_SLUG, { slug });
        }

        this._ensureLoaded();

        const existingIndex = this._data.recentTools.findIndex(t => t.slug === slug);

        if (existingIndex > -1) {
            this._data.recentTools[existingIndex].timestamp = Date.now();
            this._data.recentTools[existingIndex].accessCount += 1;
            const [moved] = this._data.recentTools.splice(existingIndex, 1);
            this._data.recentTools.unshift(moved);
        } else {
            this._data.recentTools.unshift(createRecentTool(slug));
            if (this._data.recentTools.length > this._maxRecentTools) {
                this._data.recentTools.pop();
            }
        }

        this._debouncedSave();
        this._emit('tool_used', { slug, timestamp: Date.now() });

        return createSuccess();
    }

    /**
     * 添加工具到收藏夹
     * @param {string} slug - 工具标识
     * @returns {Object} 操作结果
     */
    addFavorite(slug) {
        this._ensureLoaded();
        this._data.favorites.add(slug);
        this._debouncedSave();
        this._emit('favorite_added', { slug });
        return createSuccess();
    }

    /**
     * 从收藏夹移除工具
     * @param {string} slug - 工具标识
     * @returns {Object} 操作结果
     */
    removeFavorite(slug) {
        this._ensureLoaded();
        this._data.favorites.delete(slug);
        this._debouncedSave();
        this._emit('favorite_removed', { slug });
        return createSuccess();
    }

    /**
     * 为工具添加标签（自动去重）
     * @param {string} slug - 工具标识
     * @param {string[]} tags - 要添加的标签列表
     * @returns {Object} 操作结果
     */
    addTags(slug, tags) {
        this._ensureLoaded();
        if (!this._data.tags[slug]) {
            this._data.tags[slug] = [];
        }
        for (const tag of tags) {
            if (!this._data.tags[slug].includes(tag)) {
                this._data.tags[slug].push(tag);
            }
        }
        this._debouncedSave();
        this._emit('tags_added', { slug, tags });
        return createSuccess();
    }

    /**
     * 移除工具的指定标签
     * @param {string} slug - 工具标识
     * @param {string[]} tags - 要移除的标签列表
     * @returns {Object} 操作结果
     */
    removeTags(slug, tags) {
        this._ensureLoaded();
        if (this._data.tags[slug]) {
            this._data.tags[slug] = this._data.tags[slug].filter(t => !tags.includes(t));
            if (this._data.tags[slug].length === 0) {
                delete this._data.tags[slug];
            }
        }
        this._debouncedSave();
        this._emit('tags_removed', { slug, tags });
        return createSuccess();
    }

    /**
     * 获取指定工具的标签列表
     * @param {string} slug - 工具标识
     * @returns {string[]} 标签列表
     */
    getTags(slug) {
        this._ensureLoaded();
        return this._data.tags[slug] || [];
    }

    /**
     * 获取所有已使用的标签集合（去重）
     * @returns {string[]} 所有标签的数组
     */
    getAllTags() {
        this._ensureLoaded();
        const allTags = new Set();
        for (const tags of Object.values(this._data.tags)) {
            for (const tag of tags) {
                allTags.add(tag);
            }
        }
        return Array.from(allTags);
    }

    /**
     * 查询工具列表，支持搜索、标签过滤、排序和分页
     * @param {Object} options - 查询选项
     * @param {string} [options.search] - 搜索关键词（匹配 slug 和别名）
     * @param {string[]} [options.tags] - 标签过滤列表
     * @param {boolean} [options.tagIntersection=true] - true=交集(AND) false=并集(OR)
     * @param {boolean} [options.favoritesOnly] - 仅显示收藏
     * @param {string} [options.sortBy='recent'] - 排序方式 recent/frequent/alphabetical
     * @param {number} [options.offset] - 分页偏移量
     * @param {number} [options.limit] - 分页大小
     * @returns {Object} 查询结果，含分页信息
     */
    query(options = {}) {
        this._ensureLoaded();

        let results = [...this._data.recentTools];

        if (options.search) {
            const searchLower = options.search.toLowerCase();
            results = results.filter(tool => {
                if (tool.slug.toLowerCase().includes(searchLower)) return true;
                const aliases = TOOL_ALIASES[tool.slug] || [];
                return aliases.some(a => a.toLowerCase().includes(searchLower));
            });
        }

        if (options.tags && options.tags.length > 0) {
            const tagSet = new Set(options.tags);
            results = results.filter(tool => {
                const toolTags = this._data.tags[tool.slug] || [];
                if (options.tagIntersection !== false) {
                    return options.tags.every(t => toolTags.includes(t));
                } else {
                    return toolTags.some(t => tagSet.has(t));
                }
            });
        }

        if (options.favoritesOnly) {
            results = results.filter(tool => this._data.favorites.has(tool.slug));
        }

        switch (options.sortBy || 'recent') {
            case 'recent':
                results.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case 'frequent':
                results.sort((a, b) => b.accessCount - a.accessCount);
                break;
            case 'alphabetical':
                results.sort((a, b) => a.slug.localeCompare(b.slug));
                break;
        }

        const total = results.length;

        if (typeof options.offset === 'number') {
            results = results.slice(options.offset);
        }
        if (typeof options.limit === 'number') {
            results = results.slice(0, options.limit);
        }

        return createSuccess({
            results: results.map(tool => ({
                ...tool,
                isFavorite: this._data.favorites.has(tool.slug),
                tags: this._data.tags[tool.slug] || [],
            })),
            total,
            offset: options.offset || 0,
            limit: options.limit,
        });
    }

    /**
     * 批量取消收藏
     * @param {string[]} slugs - 要取消收藏的工具标识列表
     * @returns {Object} 操作结果，含处理数量
     */
    batchRemoveFavorites(slugs) {
        this._ensureLoaded();
        for (const slug of slugs) {
            this._data.favorites.delete(slug);
        }
        this._debouncedSave();
        this._emit('favorites_batch_removed', { slugs });
        return createSuccess({ count: slugs.length });
    }

    /**
     * 批量为多个工具添加相同标签
     * @param {string[]} slugs - 工具标识列表
     * @param {string[]} tags - 要添加的标签列表
     * @returns {Object} 操作结果，含处理数量
     */
    batchAddTags(slugs, tags) {
        this._ensureLoaded();
        for (const slug of slugs) {
            if (!this._data.tags[slug]) {
                this._data.tags[slug] = [];
            }
            for (const tag of tags) {
                if (!this._data.tags[slug].includes(tag)) {
                    this._data.tags[slug].push(tag);
                }
            }
        }
        this._debouncedSave();
        this._emit('tags_batch_added', { slugs, tags });
        return createSuccess({ count: slugs.length });
    }

    /**
     * 导出数据为带校验和的 JSON 包
     * @returns {Object} 导出结果，含导出对象和 JSON 字符串
     */
    exportData() {
        this._ensureLoaded();
        const record = createStorageRecord(this._getDataSnapshot());
        const pkg = createExportPackage(record);
        return createSuccess({
            package: pkg,
            json: serializeExportPackage(pkg),
        });
    }

    /**
     * 从 JSON 字符串导入数据，自动校验和隔离未知/损坏数据
     * @param {string} jsonString - 导出的 JSON 字符串
     * @param {Object} options - 导入选项
     * @returns {Object} 导入结果，含隔离列表和诊断信息
     */
    importData(jsonString, options = {}) {
        this._ensureLoaded();

        const deserializeResult = deserializeExportPackage(jsonString);
        if (!deserializeResult.success) {
            return deserializeResult;
        }

        const parseResult = parseImportPackage(deserializeResult.data, options);
        if (!parseResult.success) {
            return parseResult;
        }

        const strategy = this._data.settings.mergeStrategy || MERGE_STRATEGIES.KEEP_LATEST;
        const mergeResult = mergeImportedRecords(this._data, parseResult.records, strategy);

        if (!mergeResult.success) {
            return mergeResult;
        }

        this._data = mergeResult.data;
        this._debouncedSave();
        this._emit('imported', {
            recordsCount: parseResult.records.length,
            quarantineCount: parseResult.quarantine.length,
        });

        return createSuccess({
            imported: parseResult.records.length,
            quarantine: parseResult.quarantine,
            diagnostics: parseResult.diagnostics,
            checksumValid: parseResult.checksumValid,
        });
    }

    /**
     * 清空所有存储数据
     * @returns {Object} 操作结果
     */
    clear() {
        const key = buildKey();
        const storage = this._storageInfo.storage;
        storage.removeItem(key);
        this._data = createEmptyData();
        this._emit('cleared', { timestamp: Date.now() });
        return createSuccess();
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息，含数量、大小、是否降级
     */
    getStats() {
        this._ensureLoaded();
        return createSuccess({
            recentToolsCount: this._data.recentTools.length,
            favoritesCount: this._data.favorites.size,
            taggedToolsCount: Object.keys(this._data.tags).length,
            estimatedSizeBytes: estimateDataSize(this._data),
            estimatedSize: estimateSize(estimateDataSize(this._data)),
            isDegraded: this.isDegraded,
        });
    }

    _isSensitiveSlug(slug) {
        if (typeof slug !== 'string') return false;
        const lowerSlug = slug.toLowerCase();
        return SENSITIVE_PATTERNS.some(pattern => pattern.test(lowerSlug));
    }

    createDemoData(includeConflicts = true, includeCorrupted = false) {
        this._ensureLoaded();

        const demoSlugs = Object.keys(TOOL_ALIASES).slice(0, 20);
        const now = Date.now();

        for (let i = 0; i < demoSlugs.length; i++) {
            const slug = demoSlugs[i];
            this._data.recentTools.push({
                slug,
                timestamp: now - i * 3600000,
                accessCount: Math.floor(Math.random() * 50) + 1,
            });

            if (Math.random() > 0.6) {
                this._data.favorites.add(slug);
            }

            if (Math.random() > 0.5) {
                const tagCount = Math.floor(Math.random() * 3) + 1;
                const availableTags = ['工作', '开发', '设计', '工具', '常用', '收藏', '测试', '前端', '后端'];
                this._data.tags[slug] = [];
                for (let j = 0; j < tagCount; j++) {
                    const tag = availableTags[Math.floor(Math.random() * availableTags.length)];
                    if (!this._data.tags[slug].includes(tag)) {
                        this._data.tags[slug].push(tag);
                    }
                }
            }
        }

        if (includeConflicts) {
            this._data.recentTools.push({
                slug: 'http-client',
                timestamp: now + 86400000,
                accessCount: 999,
            });
        }

        this._debouncedSave();
        return createSuccess({
            demoTools: demoSlugs.length,
            includeConflicts,
            includeCorrupted,
        });
    }
}

export {
    ToolUsageRepository,
    MemoryStorage,
    getGlobalMemoryStorage,
    resetGlobalMemoryStorage,
    getAllNamespaceStats,
    clearAllNamespace,
    calculateChecksum,
    verifyChecksum,
    createExportPackage,
    serializeExportPackage,
    deserializeExportPackage,
    parseImportPackage,
    containsXssRisk,
    estimateByteSize,
    estimateSize,
    trimRecentTools,
    createEmptyData,
    createStorageRecord,
    runMigrationPipeline,
    healCorruptedData,
};
