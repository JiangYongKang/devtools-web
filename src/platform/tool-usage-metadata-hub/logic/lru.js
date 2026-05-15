import { MAX_RECENT_TOOLS } from './constants.js';
import { createSuccess, createError } from './errors.js';

export function trimRecentTools(recentTools, maxCount = MAX_RECENT_TOOLS) {
    if (!Array.isArray(recentTools)) {
        return createSuccess({ trimmed: [], removed: 0 });
    }

    if (recentTools.length <= maxCount) {
        return createSuccess({ trimmed: [...recentTools], removed: 0 });
    }

    const sorted = [...recentTools].sort((a, b) => b.timestamp - a.timestamp);
    const trimmed = sorted.slice(0, maxCount);
    const removed = recentTools.length - maxCount;

    return createSuccess({
        trimmed,
        removed,
        removedSlugs: sorted.slice(maxCount).map(t => t.slug),
    });
}

export function mergeRecentWithStrategy(localRecent, remoteRecent, strategy = 'keepLatest') {
    const merged = new Map();

    for (const tool of localRecent) {
        merged.set(tool.slug, { ...tool });
    }

    for (const tool of remoteRecent) {
        const existing = merged.get(tool.slug);
        if (!existing) {
            merged.set(tool.slug, { ...tool });
        } else if (strategy === 'keepLatest') {
            if (tool.timestamp > existing.timestamp) {
                merged.set(tool.slug, { ...tool });
            }
        } else if (strategy === 'unionTags') {
            merged.set(tool.slug, {
                ...existing,
                timestamp: Math.max(existing.timestamp, tool.timestamp),
                accessCount: existing.accessCount + tool.accessCount,
            });
        }
    }

    const result = Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);

    return createSuccess({
        merged: result,
        count: result.length,
    });
}

export function createLRUEvictor(options = {}) {
    const maxSize = options.maxSize || 5 * 1024 * 1024;
    const getSize = options.getSize || ((item) => JSON.stringify(item).length);

    return {
        evict(items, targetSize) {
            const sorted = [...items].sort((a, b) => a.lastAccess - b.lastAccess);
            const evicted = [];
            let currentSize = sorted.reduce((sum, item) => sum + getSize(item), 0);

            for (const item of sorted) {
                if (currentSize <= targetSize) break;
                evicted.push(item);
                currentSize -= getSize(item);
            }

            return {
                remaining: sorted.slice(evicted.length),
                evicted,
                evictedCount: evicted.length,
            };
        },
    };
}

export function estimateRecentToolSize(tool) {
    if (!tool) return 0;
    return (
        (tool.slug?.length || 0) * 2 +
        8 +
        4
    );
}

export function estimateDataSize(data) {
    let size = 0;

    if (data.recentTools && Array.isArray(data.recentTools)) {
        for (const tool of data.recentTools) {
            size += estimateRecentToolSize(tool);
        }
    }

    if (data.favorites && data.favorites instanceof Set) {
        for (const slug of data.favorites) {
            size += slug.length * 2;
        }
    }

    if (data.tags && typeof data.tags === 'object') {
        for (const [slug, tags] of Object.entries(data.tags)) {
            size += slug.length * 2;
            if (Array.isArray(tags)) {
                for (const tag of tags) {
                    size += tag.length * 2;
                }
            }
        }
    }

    return size;
}
