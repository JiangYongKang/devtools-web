import { useCallback, useEffect, useState } from 'react';
import {
    STORAGE_VERSIONS
} from './logic/constants.js';
import {
    ToolUsageRepository,
} from './logic/index.js';

const STYLES = {
    container: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 20px',
        color: '#1f2937',
    },
    header: {
        marginBottom: '24px',
    },
    title: {
        margin: '0 0 8px 0',
        fontSize: '28px',
        fontWeight: 700,
        color: '#111827',
    },
    subtitle: {
        margin: 0,
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: '1.6',
    },
    warningBanner: {
        padding: '12px 16px',
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    warningText: {
        fontSize: '14px',
        color: '#92400e',
        margin: 0,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px',
    },
    section: {
        padding: '20px',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    },
    sectionTitle: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 600,
        color: '#111827',
    },
    row: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '12px',
    },
    button: {
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 500,
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
    },
    buttonPrimary: {
        background: '#3b82f6',
        color: '#ffffff',
    },
    buttonSecondary: {
        background: '#6b7280',
        color: '#ffffff',
    },
    buttonSuccess: {
        background: '#10b981',
        color: '#ffffff',
    },
    buttonDanger: {
        background: '#ef4444',
        color: '#ffffff',
    },
    buttonWarning: {
        background: '#f59e0b',
        color: '#ffffff',
    },
    buttonGhost: {
        background: '#f3f4f6',
        color: '#374151',
    },
    buttonSmall: {
        padding: '6px 12px',
        fontSize: '12px',
    },
    input: {
        padding: '8px 12px',
        fontSize: '14px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: '#ffffff',
        outline: 'none',
    },
    select: {
        padding: '8px 12px',
        fontSize: '14px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: '#ffffff',
        outline: 'none',
        cursor: 'pointer',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px',
    },
    statCard: {
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '8px',
        textAlign: 'center',
    },
    statNumber: {
        fontSize: '24px',
        fontWeight: 700,
        color: '#111827',
        marginBottom: '4px',
    },
    statLabel: {
        fontSize: '12px',
        color: '#6b7280',
    },
    textarea: {
        width: '100%',
        minHeight: '120px',
        padding: '12px',
        fontSize: '12px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: '#ffffff',
        outline: 'none',
        resize: 'vertical',
        lineHeight: '1.5',
        boxSizing: 'border-box',
    },
    list: {
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
    },
    listItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #f3f4f6',
        cursor: 'pointer',
        transition: 'background 0.15s',
    },
    listItemSelected: {
        background: '#eff6ff',
    },
    listItemContent: {
        flex: 1,
    },
    toolSlug: {
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '4px',
    },
    toolMeta: {
        display: 'flex',
        gap: '12px',
        fontSize: '12px',
        color: '#6b7280',
    },
    tag: {
        display: 'inline-flex',
        padding: '2px 8px',
        fontSize: '11px',
        background: '#e0e7ff',
        color: '#4338ca',
        borderRadius: '4px',
        marginRight: '4px',
    },
    starButton: {
        padding: '4px 8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '18px',
    },
    checkbox: {
        marginRight: '12px',
        width: '18px',
        height: '18px',
        cursor: 'pointer',
    },
    badge: {
        display: 'inline-flex',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '6px',
    },
    badgeSuccess: {
        background: '#d1fae5',
        color: '#065f46',
    },
    badgeWarning: {
        background: '#fef3c7',
        color: '#92400e',
    },
    badgeError: {
        background: '#fee2e2',
        color: '#991b1b',
    },
    resultBox: {
        padding: '14px 16px',
        borderRadius: '8px',
        marginTop: '12px',
        fontSize: '13px',
    },
    resultSuccess: {
        background: '#ecfdf5',
        border: '1px solid #6ee7b7',
        color: '#065f46',
    },
    resultError: {
        background: '#fef2f2',
        border: '1px solid #fca5a5',
        color: '#991b1b',
    },
    emptyState: {
        padding: '40px 20px',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '14px',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 500,
        marginBottom: '6px',
        color: '#374151',
    },
};

export default function ToolUsageMetadataHubDemo() {
    const [repo, setRepo] = useState(null);
    const [tools, setTools] = useState([]);
    const [selectedTools, setSelectedTools] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagIntersection, setTagIntersection] = useState(true);
    const [sortBy, setSortBy] = useState('recent');
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [stats, setStats] = useState(null);
    const [allTags, setAllTags] = useState([]);
    const [isDegraded, setIsDegraded] = useState(false);
    const [importText, setImportText] = useState('');
    const [exportText, setExportText] = useState('');
    const [result, setResult] = useState(null);
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        const repository = new ToolUsageRepository({
            debounceMs: 100,
        });
        repository.load();
        setRepo(repository);
        setIsDegraded(repository.isDegraded);

        repository.on('tool_used', () => refreshData(repository));
        repository.on('favorite_added', () => refreshData(repository));
        repository.on('favorite_removed', () => refreshData(repository));
        repository.on('tags_added', () => refreshData(repository));
        repository.on('tags_removed', () => refreshData(repository));
        repository.on('imported', () => refreshData(repository));

        refreshData(repository);
    }, []);

    const refreshData = useCallback((repository) => {
        if (!repository) return;

        const queryResult = repository.query({
            search: searchQuery || undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            tagIntersection,
            sortBy,
            favoritesOnly,
        });

        if (queryResult.success) {
            setTools(queryResult.results);
        }

        const statsResult = repository.getStats();
        if (statsResult.success) {
            setStats(statsResult);
        }

        setAllTags(repository.getAllTags());
    }, [searchQuery, selectedTags, tagIntersection, sortBy, favoritesOnly]);

    useEffect(() => {
        if (repo) {
            refreshData(repo);
        }
    }, [repo, refreshData]);

    const handleCreateDemo = () => {
        if (!repo) return;
        const result = repo.createDemoData(true, false);
        setResult({
            type: 'success',
            message: `已创建 ${result.demoTools} 个示例工具数据，包含冲突示例`,
        });
        refreshData(repo);
    };

    const handleRecordUsage = (slug) => {
        if (!repo) return;
        repo.recordToolUsage(slug);
        setResult({
            type: 'success',
            message: `已记录工具使用: ${slug}`,
        });
    };

    const handleToggleFavorite = (slug, e) => {
        e.stopPropagation();
        if (!repo) return;
        const tool = tools.find(t => t.slug === slug);
        if (tool.isFavorite) {
            repo.removeFavorite(slug);
        } else {
            repo.addFavorite(slug);
        }
    };

    const handleBatchRemoveFavorites = () => {
        if (!repo || selectedTools.size === 0) return;
        repo.batchRemoveFavorites(Array.from(selectedTools));
        setSelectedTools(new Set());
        setResult({
            type: 'success',
            message: `已取消 ${selectedTools.size} 个工具的收藏`,
        });
    };

    const handleBatchAddTags = () => {
        if (!repo || selectedTools.size === 0 || !newTag.trim()) return;
        repo.batchAddTags(Array.from(selectedTools), [newTag.trim()]);
        setNewTag('');
        setSelectedTools(new Set());
        setResult({
            type: 'success',
            message: `已为 ${selectedTools.size} 个工具添加标签`,
        });
    };

    const handleSelectTool = (slug) => {
        const newSelected = new Set(selectedTools);
        if (newSelected.has(slug)) {
            newSelected.delete(slug);
        } else {
            newSelected.add(slug);
        }
        setSelectedTools(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedTools.size === tools.length) {
            setSelectedTools(new Set());
        } else {
            setSelectedTools(new Set(tools.map(t => t.slug)));
        }
    };

    const handleExport = () => {
        if (!repo) return;
        const result = repo.exportData();
        if (result.success) {
            setExportText(result.json);
            setResult({
                type: 'success',
                message: '导出成功！数据包含校验和与版本信息',
            });
        }
    };

    const handleImport = () => {
        if (!repo || !importText.trim()) return;
        const result = repo.importData(importText);
        if (result.success) {
            setResult({
                type: result.checksumValid ? 'success' : 'warning',
                message: `导入成功: ${result.imported} 条记录${result.quarantine.length > 0 ? `，隔离 ${result.quarantine.length} 条` : ''}`,
            });
        } else {
            setResult({
                type: 'error',
                message: `导入失败: ${result.errorCode}`,
            });
        }
    };

    const handleCreateInvalidImport = (type) => {
        switch (type) {
            case 'corrupted':
                setImportText('this is not valid JSON at all!!!');
                break;
            case 'invalid_record':
                setImportText(JSON.stringify({
                    packageVersion: STORAGE_VERSIONS.LATEST,
                    exportedAt: Date.now(),
                    checksum: 'invalid',
                    records: [
                        { schemaVersion: STORAGE_VERSIONS.LATEST, timestamp: Date.now(), data: null },
                        { invalid: 'data' },
                    ],
                }, null, 2));
                break;
            case 'xss':
                setImportText(JSON.stringify({
                    packageVersion: STORAGE_VERSIONS.LATEST,
                    exportedAt: Date.now(),
                    checksum: 'xss',
                    records: [
                        {
                            schemaVersion: STORAGE_VERSIONS.LATEST,
                            timestamp: Date.now(),
                            data: {
                                recentTools: [{ slug: '<script>alert(1)</script>', timestamp: Date.now(), accessCount: 1 }],
                                favorites: [],
                                tags: {},
                            },
                        },
                    ],
                }, null, 2));
                break;
        }
    };

    const handleClear = () => {
        if (!repo) return;
        repo.clear();
        setSelectedTools(new Set());
        setResult({
            type: 'success',
            message: '已清空所有数据',
        });
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        return `${Math.floor(diff / 86400000)} 天前`;
    };

    const toggleTagFilter = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <div style={STYLES.container}>
            <div style={STYLES.header}>
                <h1 style={STYLES.title}>工具使用元数据中心</h1>
                <p style={STYLES.subtitle}>
                    最近使用工具管理 | 标签分类 | 收藏夹 | 导入导出带校验和 | 存储配额自动裁剪
                </p>
            </div>

            {isDegraded && (
                <div style={STYLES.warningBanner}>
                    <span>⚠️</span>
                    <p style={STYLES.warningText}>
                        当前处于内存存储模式（隐私模式或 localStorage 不可用），数据不会持久化到磁盘
                    </p>
                </div>
            )}

            {stats && (
                <div style={STYLES.statsGrid}>
                    <div style={STYLES.statCard}>
                        <div style={STYLES.statNumber}>{stats.recentToolsCount}</div>
                        <div style={STYLES.statLabel}>最近使用</div>
                    </div>
                    <div style={STYLES.statCard}>
                        <div style={STYLES.statNumber}>{stats.favoritesCount}</div>
                        <div style={STYLES.statLabel}>收藏数</div>
                    </div>
                    <div style={STYLES.statCard}>
                        <div style={STYLES.statNumber}>{stats.taggedToolsCount}</div>
                        <div style={STYLES.statLabel}>已标记</div>
                    </div>
                    <div style={STYLES.statCard}>
                        <div style={STYLES.statNumber}>{stats.estimatedSize}</div>
                        <div style={STYLES.statLabel}>预估大小</div>
                    </div>
                </div>
            )}

            <div style={STYLES.grid}>
                <div style={STYLES.section}>
                    <h3 style={STYLES.sectionTitle}>工具列表</h3>

                    <div style={STYLES.row}>
                        <input
                            type="text"
                            placeholder="搜索工具名称或别名..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ ...STYLES.input, flex: 1 }}
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={STYLES.select}
                        >
                            <option value="recent">最近使用</option>
                            <option value="frequent">最常使用</option>
                            <option value="alphabetical">字母排序</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={favoritesOnly}
                                onChange={(e) => setFavoritesOnly(e.target.checked)}
                            />
                            <span style={{ fontSize: '13px' }}>仅显示收藏</span>
                        </label>
                    </div>

                    {allTags.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>标签筛选:</span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>匹配模式:</span>
                                    <button
                                        onClick={() => setTagIntersection(true)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            borderRadius: '4px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: tagIntersection ? '#4f46e5' : '#f3f4f6',
                                            color: tagIntersection ? '#ffffff' : '#374151',
                                            fontWeight: tagIntersection ? 500 : 400,
                                        }}
                                    >
                                        交集 (AND)
                                    </button>
                                    <button
                                        onClick={() => setTagIntersection(false)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            borderRadius: '4px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: !tagIntersection ? '#4f46e5' : '#f3f4f6',
                                            color: !tagIntersection ? '#ffffff' : '#374151',
                                            fontWeight: !tagIntersection ? 500 : 400,
                                        }}
                                    >
                                        并集 (OR)
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTagFilter(tag)}
                                        style={{
                                            ...STYLES.tag,
                                            background: selectedTags.includes(tag) ? '#4f46e5' : '#e0e7ff',
                                            color: selectedTags.includes(tag) ? '#ffffff' : '#4338ca',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ ...STYLES.row, justifyContent: 'space-between' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                            <input
                                type="checkbox"
                                checked={selectedTools.size === tools.length && tools.length > 0}
                                onChange={handleSelectAll}
                                style={{ marginRight: '8px' }}
                            />
                            全选 ({selectedTools.size}/{tools.length})
                        </label>
                        {selectedTools.size > 0 && (
                            <>
                                <button
                                    onClick={handleBatchRemoveFavorites}
                                    style={{ ...STYLES.button, ...STYLES.buttonSmall, ...STYLES.buttonWarning }}
                                >
                                    取消收藏
                                </button>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="标签名称"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        style={{ ...STYLES.input, width: '100px' }}
                                    />
                                    <button
                                        onClick={handleBatchAddTags}
                                        style={{ ...STYLES.button, ...STYLES.buttonSmall, ...STYLES.buttonPrimary }}
                                    >
                                        批量打标签
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div style={STYLES.list}>
                        {tools.length === 0 ? (
                            <div style={STYLES.emptyState}>
                                暂无工具数据，点击"创建示例数据"开始体验
                            </div>
                        ) : (
                            tools.map(tool => (
                                <div
                                    key={tool.slug}
                                    style={{
                                        ...STYLES.listItem,
                                        ...(selectedTools.has(tool.slug) ? STYLES.listItemSelected : {}),
                                    }}
                                    onClick={() => handleSelectTool(tool.slug)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedTools.has(tool.slug)}
                                        onChange={() => {}}
                                        style={STYLES.checkbox}
                                    />
                                    <div style={STYLES.listItemContent}>
                                        <div style={STYLES.toolSlug}>
                                            {tool.isFavorite && <span>⭐</span>} {tool.slug}
                                        </div>
                                        <div style={STYLES.toolMeta}>
                                            <span>访问 {tool.accessCount} 次</span>
                                            <span>{formatTime(tool.timestamp)}</span>
                                            {tool.tags.length > 0 && (
                                                <span>
                                                    {tool.tags.map(tag => (
                                                        <span key={tag} style={STYLES.tag}>{tag}</span>
                                                    ))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={(e) => handleToggleFavorite(tool.slug, e)}
                                            style={STYLES.starButton}
                                            title={tool.isFavorite ? '取消收藏' : '添加收藏'}
                                        >
                                            {tool.isFavorite ? '★' : '☆'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRecordUsage(tool.slug); }}
                                            style={{ ...STYLES.button, ...STYLES.buttonSmall, ...STYLES.buttonGhost }}
                                        >
                                            使用
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div style={STYLES.section}>
                    <h3 style={STYLES.sectionTitle}>数据管理</h3>

                    <div style={STYLES.row}>
                        <button onClick={handleCreateDemo} style={{ ...STYLES.button, ...STYLES.buttonPrimary }}>
                            创建示例数据
                        </button>
                        <button onClick={handleExport} style={{ ...STYLES.button, ...STYLES.buttonSuccess }}>
                            导出数据
                        </button>
                        <button onClick={handleClear} style={{ ...STYLES.button, ...STYLES.buttonDanger }}>
                            清空数据
                        </button>
                    </div>

                    {exportText && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={STYLES.label}>导出的 JSON (含校验和):</div>
                            <textarea value={exportText} readOnly style={STYLES.textarea} rows={6} />
                            <button
                                onClick={() => { setImportText(exportText); setExportText(''); }}
                                style={{ ...STYLES.button, ...STYLES.buttonSmall, ...STYLES.buttonSecondary, marginTop: '8px' }}
                            >
                                复制到导入区
                            </button>
                        </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                        <div style={STYLES.label}>快速导入示例:</div>
                        <div style={STYLES.row}>
                            <button
                                onClick={() => handleCreateInvalidImport('corrupted')}
                                style={{ ...STYLES.button, ...STYLES.buttonSmall, ...STYLES.buttonDanger }}
                            >
                                损坏 JSON
                            </button>
                            <button
                                onClick={() => handleCreateInvalidImport('invalid_record')}
                                style={{ ...STYLES.button, ...STYLES.buttonSmall, ...STYLES.buttonWarning }}
                            >
                                无效记录
                            </button>
                            <button
                                onClick={() => handleCreateInvalidImport('xss')}
                                style={{ ...STYLES.button, ...STYLES.buttonSmall, ...STYLES.buttonDanger }}
                            >
                                含 XSS 内容
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={STYLES.label}>导入 JSON:</div>
                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="粘贴要导入的 JSON 数据..."
                            style={STYLES.textarea}
                            rows={6}
                        />
                        <button
                            onClick={handleImport}
                            style={{ ...STYLES.button, ...STYLES.buttonPrimary, marginTop: '8px' }}
                            disabled={!importText.trim()}
                        >
                            执行导入
                        </button>
                    </div>

                    {result && (
                        <div style={{
                            ...STYLES.resultBox,
                            ...(result.type === 'success' ? STYLES.resultSuccess :
                                result.type === 'warning' ? { background: '#fffbeb', border: '1px solid #f59e0b', color: '#92400e' } :
                                    STYLES.resultError),
                        }}>
                            {result.type === 'success' ? '✅' : result.type === 'warning' ? '⚠️' : '❌'} {result.message}
                        </div>
                    )}
                </div>
            </div>

            <div style={STYLES.section}>
                <h3 style={STYLES.sectionTitle}>功能特性说明</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '13px' }}>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>📦 持久化存储</div>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
                            <li>localStorage 带版本前缀</li>
                            <li>隐私模式自动降级内存存储</li>
                            <li>配额溢出 LRU 自动裁剪</li>
                            <li>敏感 slug 拒绝记录</li>
                        </ul>
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>🔍 查询与管理</div>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
                            <li>标签交集/并集筛选</li>
                            <li>全文模糊匹配别名</li>
                            <li>三种排序方式</li>
                            <li>批量取消收藏/打标签</li>
                        </ul>
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>🔄 数据安全</div>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
                            <li>导入导出带校验和</li>
                            <li>Schema 版本迁移</li>
                            <li>损坏 JSON 自愈降级</li>
                            <li>XSS 风险自动检测隔离</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
