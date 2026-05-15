import { useState, useEffect } from 'react'
import {
    createSnapshot,
    serializeSnapshot,
    deserializeSnapshot,
    compressToGzipBlob,
    decompressGzipBlob,
    downloadBlob,
    validateSnapshot,
    runMigrationPipeline,
    calculateChecksum,
    generateSampleData,
    findSensitivePaths,
    redactSensitiveData,
    diffSnapshots,
    formatDiff,
    groupDiffsByType,
    mergeWithStrategy,
    SNAPSHOT_VERSIONS,
    MERGE_STRATEGIES,
    ERROR_CODES,
} from './logic/index.js'
import './SettingsSnapshotMigrationDemo.css'

function Section({ title, description, children }) {
    return (
        <div className="ssm-section">
            <h3 className="ssm-section-title">{title}</h3>
            {description && <p className="ssm-section-desc">{description}</p>}
            {children}
        </div>
    )
}

function StatusBadge({ success, message, variant }) {
    const badgeClass = success
        ? 'ssm-badge-success'
        : variant === 'warning'
        ? 'ssm-badge-warning'
        : 'ssm-badge-error'

    return (
        <span className={`ssm-badge ${badgeClass}`}>
            {message}
        </span>
    )
}

function StyledButton({
    variant = 'primary',
    size = 'normal',
    onClick,
    children,
    disabled = false,
    className = '',
}) {
    const variantClasses = {
        primary: 'ssm-btn-primary',
        success: 'ssm-btn-success',
        warning: 'ssm-btn-warning',
        danger: 'ssm-btn-danger',
        secondary: 'ssm-btn-secondary',
        ghost: 'ssm-btn-ghost',
    }

    const currentVariant = variantClasses[variant] || variantClasses.primary
    const sizeClass = size === 'small' ? 'ssm-btn-small' : ''
    const disabledClass = disabled ? 'ssm-btn-disabled' : ''

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`ssm-btn-base ${sizeClass} ${currentVariant} ${disabledClass} ${className}`}
        >
            {children}
        </button>
    )
}

function StyledTextarea({
    value,
    onChange,
    placeholder,
    readOnly = false,
    className = '',
    rows = 6,
}) {
    const textareaClass = readOnly ? 'ssm-textarea-readonly' : ''
    return (
        <textarea
            value={value}
            onChange={readOnly ? undefined : onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`ssm-textarea ${textareaClass} ${className}`}
            rows={rows}
        />
    )
}

function FieldLabel({ children, className = '' }) {
    return (
        <div className={`ssm-field-label ${className}`}>{children}</div>
    )
}

function OutputBox({ children, variant = 'default', className = '' }) {
    const variantClasses = {
        default: '',
        success: 'ssm-output-success',
        error: 'ssm-output-error',
        warning: 'ssm-output-warning',
    }

    return (
        <pre className={`ssm-output ${variantClasses[variant]} ${className}`}>
            {children}
        </pre>
    )
}

function ResultCard({ success, title, message, children }) {
    const cardClass = success ? 'ssm-result-card-success' : 'ssm-result-card-error'
    const titleClass = success ? 'ssm-result-title-success' : 'ssm-result-title-error'

    return (
        <div className={`ssm-result-card ${cardClass}`}>
            <div className={`ssm-result-title ${titleClass}`}>
                {title}
            </div>
            {message && <div className="ssm-result-text">{message}</div>}
            {children}
        </div>
    )
}

function ExportSection() {
    const [sampleData, setSampleData] = useState(null)
    const [sensitiveKeys, setSensitiveKeys] = useState([])
    const [selectedKeys, setSelectedKeys] = useState([])
    const [snapshotJson, setSnapshotJson] = useState('')
    const [exportResult, setExportResult] = useState(null)
    const [checksumInfo, setChecksumInfo] = useState(null)

    useEffect(() => {
        const data = generateSampleData()
        setSampleData(data)
        const sensitive = findSensitivePaths(data)
        setSensitiveKeys(sensitive)
        setSelectedKeys(sensitive.map(k => k.path))
    }, [])

    function toggleKey(keyPath) {
        setSelectedKeys(prev =>
            prev.includes(keyPath)
                ? prev.filter(k => k !== keyPath)
                : [...prev, keyPath]
        )
    }

    function createRedactedSnapshot() {
        const redactedData = redactSensitiveData(sampleData, selectedKeys)
        const snapshot = createSnapshot([redactedData])
        const json = serializeSnapshot(snapshot, true)
        setSnapshotJson(json)
        setChecksumInfo({
            algorithm: snapshot.checksumAlgorithm,
            checksum: snapshot.checksum,
            payloadHash: calculateChecksum({ entries: snapshot.entries }),
        })
        setExportResult({ success: true, version: snapshot.schemaVersion })
    }

    async function downloadGzipSnapshot() {
        const redactedData = redactSensitiveData(sampleData, selectedKeys)
        const snapshot = createSnapshot([redactedData])
        const result = await compressToGzipBlob(snapshot)
        if (result.success) {
            downloadBlob(result.blob, 'settings-snapshot.gz')
            setExportResult({ success: true, message: 'Gzip 快照已下载' })
        } else {
            setExportResult({ success: false, message: '压缩失败' })
        }
    }

    function generateV1Snapshot() {
        const v1Data = {
            themeMode: 'dark',
            sidebarCollapsed: true,
            toolStates: { editor: 'open', preview: 'closed' },
            user: { id: 123, name: 'test' },
            apiKeys: { openai: 'sk-test-123' },
        }
        const redacted = redactSensitiveData(v1Data, selectedKeys)
        const snapshot = {
            schemaVersion: SNAPSHOT_VERSIONS.V1,
            exportedAt: new Date().toISOString(),
            checksum: calculateChecksum({ entries: [redacted] }),
            checksumAlgorithm: 'simple-hash',
            entries: [redacted],
        }
        setSnapshotJson(serializeSnapshot(snapshot, true))
        setExportResult({ success: true, version: snapshot.schemaVersion })
    }

    function generateV2Snapshot() {
        const v2Data = {
            theme: { mode: 'dark' },
            layout: { sidebar: { collapsed: true } },
            tools: { editor: 'open', preview: 'closed' },
            user: { id: 123, name: 'test' },
            workspaceData: { path: '/home/project' },
            apiKeys: { openai: 'sk-test-123' },
        }
        const redacted = redactSensitiveData(v2Data, selectedKeys)
        const snapshot = {
            schemaVersion: SNAPSHOT_VERSIONS.V2,
            exportedAt: new Date().toISOString(),
            checksum: calculateChecksum({ entries: [redacted] }),
            checksumAlgorithm: 'simple-hash',
            entries: [redacted],
        }
        setSnapshotJson(serializeSnapshot(snapshot, true))
        setExportResult({ success: true, version: snapshot.schemaVersion })
    }

    return (
        <Section
            title="1. 导出：敏感键脱敏与快照格式"
            description="快照格式包含 schemaVersion、exportedAt、checksum（对脱敏后 payload 的哈希）和 entries 树。支持 gzip 压缩下载。"
        >
            <div className="ssm-info-box">
                <div className="ssm-info-box-text">
                    <strong>快照结构:</strong>
                    <br />• schemaVersion: 快照版本号
                    <br />• exportedAt: 导出时间 ISO 字符串
                    <br />• checksum: entries 数据的哈希校验和
                    <br />• entries: 设置数据数组（可多选）
                </div>
            </div>

            <FieldLabel>检测到的敏感键（勾选脱敏）:</FieldLabel>
            <div className="ssm-checkbox-group">
                {sensitiveKeys.map(key => (
                    <label key={key.path} className="ssm-checkbox-label">
                        <input
                            type="checkbox"
                            checked={selectedKeys.includes(key.path)}
                            onChange={() => toggleKey(key.path)}
                        />
                        <code className="ssm-inline-code">{key.path}</code>
                        <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                            (原始值: {typeof key.value === 'string' ? key.value.substring(0, 20) + '...' : JSON.stringify(key.value)})
                        </span>
                    </label>
                ))}
            </div>

            <div className="ssm-row">
                <StyledButton variant="success" onClick={createRedactedSnapshot}>
                    生成脱敏快照 (JSON)
                </StyledButton>
                <StyledButton variant="primary" onClick={downloadGzipSnapshot}>
                    下载 gzip 快照
                </StyledButton>
            </div>

            <div className="ssm-row">
                <FieldLabel>生成历史版本快照:</FieldLabel>
                <StyledButton variant="warning" size="small" onClick={generateV1Snapshot}>
                    v1 快照
                </StyledButton>
                <StyledButton variant="warning" size="small" onClick={generateV2Snapshot}>
                    v2 快照
                </StyledButton>
            </div>

            {checksumInfo && (
                <div className="ssm-info-box" style={{ marginTop: '12px' }}>
                    <div className="ssm-info-box-text">
                        <strong>校验和信息:</strong>
                        <br />• 算法: {checksumInfo.algorithm}
                        <br />• 校验和: <code>{checksumInfo.checksum}</code>
                    </div>
                </div>
            )}

            {exportResult && (
                <ResultCard
                    success={exportResult.success}
                    title={exportResult.success ? `快照生成成功 (版本: ${exportResult.version || 'v3'})` : '导出失败'}
                    message={exportResult.message}
                />
            )}

            {snapshotJson && (
                <>
                    <FieldLabel style={{ marginTop: '12px' }}>生成的快照 JSON:</FieldLabel>
                    <StyledTextarea
                        value={snapshotJson}
                        readOnly
                        rows={10}
                    />
                </>
            )}
        </Section>
    )
}

function ImportSection() {
    const [importText, setImportText] = useState('')
    const [importResult, setImportResult] = useState(null)
    const [mergeStrategy, setMergeStrategy] = useState(MERGE_STRATEGIES.MERGE)
    const [isDragOver, setIsDragOver] = useState(false)
    const [previewDiffs, setPreviewDiffs] = useState(null)

    function generateSampleImport(version = SNAPSHOT_VERSIONS.V3) {
        const data = generateSampleData()
        const snapshot = createSnapshot([data], { version })
        setImportText(serializeSnapshot(snapshot, true))
        setImportResult(null)
    }

    function generateCorruptedImport(type) {
        switch (type) {
            case 'invalidJson':
                setImportText('this is not json {{{')
                break
            case 'missingVersion':
                setImportText(JSON.stringify({
                    exportedAt: new Date().toISOString(),
                    checksum: 'invalid',
                    entries: [{}],
                }, null, 2))
                break
            case 'invalidChecksum':
                const data = generateSampleData()
                const snapshot = createSnapshot([data])
                snapshot.checksum = 'tampered-checksum-value'
                setImportText(serializeSnapshot(snapshot, true))
                break
            case 'versionTooHigh':
                const highVersion = {
                    schemaVersion: '99.0.0',
                    exportedAt: new Date().toISOString(),
                    checksum: calculateChecksum({ entries: [{}] }),
                    checksumAlgorithm: 'simple-hash',
                    entries: [{}],
                }
                setImportText(serializeSnapshot(highVersion, true))
                break
            case 'deepNesting':
                const deepObj = {}
                let current = deepObj
                for (let i = 0; i < 25; i++) {
                    current.level = {}
                    current = current.level
                }
                const deepSnapshot = createSnapshot([deepObj])
                setImportText(serializeSnapshot(deepSnapshot, true))
                break
        }
        setImportResult(null)
    }

    async function handleFileDrop(e) {
        e.preventDefault()
        setIsDragOver(false)

        const file = e.dataTransfer.files[0]
        if (!file) return

        try {
            const blob = new Blob([await file.arrayBuffer()])
            const result = await decompressGzipBlob(blob)
            if (result.success) {
                setImportText(serializeSnapshot(result.data, true))
            } else {
                const text = await file.text()
                setImportText(text)
            }
        } catch (err) {
            const text = await file.text()
            setImportText(text)
        }
    }

    function runImport() {
        const parseResult = deserializeSnapshot(importText)
        if (!parseResult.success) {
            setImportResult({
                success: false,
                phase: 'deserialize',
                errorCode: parseResult.errorCode,
                message: 'JSON 解析失败',
            })
            return
        }

        const validation = validateSnapshot(parseResult.data)
        if (!validation.success) {
            setImportResult({
                success: false,
                phase: 'validation',
                errorCode: validation.errorCode,
                message: validation.details?.reason || '校验失败',
                diagnostics: validation.diagnostics,
            })
            return
        }

        const migration = runMigrationPipeline(validation.snapshot)
        if (!migration.success) {
            setImportResult({
                success: false,
                phase: 'migration',
                errorCode: migration.errorCode,
                message: migration.details?.message || '迁移失败',
                originalSnapshot: migration.originalSnapshot,
                breakingChanges: migration.breakingChanges,
            })
            return
        }

        const currentData = generateSampleData()
        const importedData = migration.snapshot.entries[0]
        const merged = mergeWithStrategy(currentData, importedData, mergeStrategy)

        const diffs = diffSnapshots(
            createSnapshot([currentData]),
            createSnapshot([merged.success ? merged.data : importedData])
        )

        setPreviewDiffs(diffs)
        setImportResult({
            success: true,
            migrated: migration.migrated,
            diagnostics: validation.diagnostics,
            breakingChanges: migration.breakingChanges,
            original: parseResult.data,
            final: migration.snapshot,
            mergedData: merged.data,
        })
    }

    const diffGroups = previewDiffs ? groupDiffsByType(previewDiffs) : null

    return (
        <Section
            title="2. 导入：拖拽解析、合并策略、预览 Diff"
            description="支持拖拽 gzip 压缩文件或粘贴 JSON 文本。导入时执行：结构校验 → 防爆检查 → 校验和验证 → 版本迁移 → 合并策略。"
        >
            <FieldLabel>快速生成测试用例:</FieldLabel>
            <div className="ssm-row" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
                <StyledButton variant="success" size="small" onClick={() => generateSampleImport(SNAPSHOT_VERSIONS.V3)}>
                    合法 v3 快照
                </StyledButton>
                <StyledButton variant="warning" size="small" onClick={() => generateSampleImport(SNAPSHOT_VERSIONS.V2)}>
                    v2 快照（需迁移）
                </StyledButton>
                <StyledButton variant="warning" size="small" onClick={() => generateSampleImport(SNAPSHOT_VERSIONS.V1)}>
                    v1 快照（需迁移）
                </StyledButton>
                <StyledButton variant="danger" size="small" onClick={() => generateCorruptedImport('invalidJson')}>
                    无效 JSON
                </StyledButton>
                <StyledButton variant="danger" size="small" onClick={() => generateCorruptedImport('missingVersion')}>
                    缺版本号
                </StyledButton>
                <StyledButton variant="danger" size="small" onClick={() => generateCorruptedImport('invalidChecksum')}>
                    校验和错误
                </StyledButton>
                <StyledButton variant="danger" size="small" onClick={() => generateCorruptedImport('versionTooHigh')}>
                    版本过高
                </StyledButton>
                <StyledButton variant="danger" size="small" onClick={() => generateCorruptedImport('deepNesting')}>
                    深度超标
                </StyledButton>
            </div>

            <div
                className={`ssm-dropzone ${isDragOver ? 'ssm-dropzone-hover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
            >
                <div className="ssm-dropzone-text">
                    拖拽 .json 或 .gz 文件到此处，或粘贴到下方文本框
                </div>
            </div>

            <FieldLabel className="ssm-field-label" style={{ marginTop: '16px' }}>导入内容:</FieldLabel>
            <StyledTextarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="粘贴快照 JSON 内容..."
                rows={6}
            />

            <FieldLabel className="ssm-field-label" style={{ marginTop: '12px' }}>合并策略:</FieldLabel>
            <div className="ssm-radio-group">
                <label className="ssm-radio-label">
                    <input
                        type="radio"
                        checked={mergeStrategy === MERGE_STRATEGIES.MERGE}
                        onChange={() => setMergeStrategy(MERGE_STRATEGIES.MERGE)}
                    />
                    合并 (Merge) - 递归合并嵌套对象
                </label>
                <label className="ssm-radio-label">
                    <input
                        type="radio"
                        checked={mergeStrategy === MERGE_STRATEGIES.OVERWRITE}
                        onChange={() => setMergeStrategy(MERGE_STRATEGIES.OVERWRITE)}
                    />
                    覆盖 (Overwrite) - 完全替换
                </label>
            </div>

            <StyledButton variant="primary" onClick={runImport}>
                验证并导入
            </StyledButton>

            {importResult && (
                <ResultCard
                    success={importResult.success}
                    title={importResult.success ? '导入成功' : `导入失败 (${importResult.errorCode})`}
                    message={importResult.message}
                >
                    {importResult.migrated && (
                        <div className="ssm-result-text" style={{ color: '#d97706', marginTop: '4px' }}>
                            🔄 已执行版本迁移
                        </div>
                    )}

                    {importResult.breakingChanges && importResult.breakingChanges.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            <div className="ssm-result-text" style={{ fontWeight: 600 }}>破坏性变更:</div>
                            {importResult.breakingChanges.map((change, i) => (
                                <div key={i} className="ssm-result-text" style={{ padding: '2px 0' }}>
                                    • {change.field}: {JSON.stringify(change)}
                                </div>
                            ))}
                        </div>
                    )}

                    {diffGroups && (
                        <div style={{ marginTop: '8px' }}>
                            <div className="ssm-result-text" style={{ fontWeight: 600 }}>
                                变更预览:
                                {diffGroups.added.length > 0 && (
                                    <StatusBadge success={true} message={`+${diffGroups.added.length} 新增`} variant="warning" />
                                )}
                                {diffGroups.removed.length > 0 && (
                                    <StatusBadge success={false} message={`-${diffGroups.removed.length} 删除`} />
                                )}
                                {diffGroups.changed.length > 0 && (
                                    <StatusBadge success={true} message={`~${diffGroups.changed.length} 修改`} variant="warning" />
                                )}
                            </div>
                            <OutputBox className="ssm-output" style={{ marginTop: '8px', maxHeight: '160px' }}>
                                {previewDiffs.map(formatDiff).join('\n')}
                            </OutputBox>
                        </div>
                    )}

                    {importResult.final && (
                        <OutputBox className="ssm-output" style={{ marginTop: '8px', maxHeight: '120px' }}>
                            最终版本: {importResult.final.schemaVersion}
                            {'\n'}
                            {JSON.stringify(importResult.mergedData || importResult.final.entries[0], null, 2)}
                        </OutputBox>
                    )}
                </ResultCard>
            )}
        </Section>
    )
}

function MigrationSection() {
    const [migrationResults, setMigrationResults] = useState([])

    function runFullMigrationChain() {
        const v1Data = {
            themeMode: 'dark',
            sidebarCollapsed: true,
            toolStates: { editor: 'open' },
            user: { id: 123 },
            workspaceData: { path: '/project' },
        }

        const snapshots = [
            { version: SNAPSHOT_VERSIONS.V1, data: v1Data, label: 'v1 原始' },
            {
                version: SNAPSHOT_VERSIONS.V2,
                data: {
                    theme: { mode: 'dark' },
                    layout: { sidebar: { collapsed: true } },
                    tools: { editor: 'open' },
                    user: { id: 123 },
                    workspaceData: { path: '/project' },
                },
                label: 'v2 原始',
            },
            {
                version: SNAPSHOT_VERSIONS.V3,
                data: {
                    theme: { mode: 'dark' },
                    layout: { sidebar: { collapsed: true } },
                    tools: { editor: 'open' },
                    workspace: { settings: { path: '/project' } },
                    meta: { createdAt: new Date().toISOString() },
                },
                label: 'v3 原始（无需迁移）',
            },
        ]

        const results = snapshots.map(({ version, data, label }) => {
            const snapshot = {
                schemaVersion: version,
                exportedAt: new Date().toISOString(),
                checksum: calculateChecksum({ entries: [data] }),
                checksumAlgorithm: 'simple-hash',
                entries: [data],
            }
            const result = runMigrationPipeline(snapshot)
            return { label, original: snapshot, ...result }
        })

        setMigrationResults(results)
    }

    useEffect(() => {
        runFullMigrationChain()
    }, [])

    return (
        <Section
            title="3. 版本迁移：函数链与破坏性变更"
            description="迁移函数链：migrateV1ToV2 → migrateV2ToV3，每个函数都是纯函数且幂等。未知高版本拒绝并给出升级指引。"
        >
            <div className="ssm-grid-3">
                <div className="ssm-info-box">
                    <div className="ssm-info-box-text">
                        <strong>v1 → v2 变更:</strong>
                        <br />• themeMode → theme.mode
                        <br />• sidebarCollapsed → layout.sidebar.collapsed
                        <br />• toolStates → tools
                    </div>
                </div>
                <div className="ssm-info-box">
                    <div className="ssm-info-box-text">
                        <strong>v2 → v3 变更:</strong>
                        <br />• 删除 user 字段
                        <br />• workspaceData → workspace.settings
                        <br />• 新增 meta.createdAt
                    </div>
                </div>
                <div className="ssm-info-box" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
                    <div className="ssm-info-box-text" style={{ color: '#991b1b' }}>
                        <strong>版本校验:</strong>
                        <br />• 高于 v3 → 拒绝，提示升级
                        <br />• v1/v2 → 自动迁移
                        <br />• 缺版本 → 拒绝
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '16px' }}>
                {migrationResults.map((result, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                        <FieldLabel>
                            {result.label}
                            {result.migrated && <StatusBadge success={true} message="已迁移" />}
                            {!result.migrated && result.success && <StatusBadge success={true} message="无需迁移" variant="warning" />}
                            {!result.success && <StatusBadge success={false} message="迁移失败" />}
                        </FieldLabel>
                        <div className="ssm-grid-2">
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                    原始 (v{result.original.schemaVersion})
                                </div>
                                <OutputBox variant="warning" className="ssm-output" style={{ maxHeight: '120px' }}>
                                    {JSON.stringify(result.original.entries[0], null, 2)}
                                </OutputBox>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                    结果 (v{result.snapshot?.schemaVersion || '?'})
                                </div>
                                <OutputBox variant={result.success ? 'success' : 'error'} className="ssm-output" style={{ maxHeight: '120px' }}>
                                    {result.success
                                        ? JSON.stringify(result.snapshot.entries[0], null, 2)
                                        : `错误: ${result.errorCode}`}
                                </OutputBox>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <StyledButton variant="secondary" onClick={runFullMigrationChain}>
                重新执行迁移
            </StyledButton>
        </Section>
    )
}

function ValidationSection() {
    const [testCase, setTestCase] = useState('')
    const [validationResult, setValidationResult] = useState(null)

    function runValidation() {
        const parseResult = deserializeSnapshot(testCase)
        if (!parseResult.success) {
            setValidationResult({
                success: false,
                phase: 'JSON 解析',
                error: parseResult.errorCode,
            })
            return
        }

        const result = validateSnapshot(parseResult.data)
        setValidationResult({
            success: result.success,
            phase: result.success ? '全部通过' : '校验失败',
            diagnostics: result.diagnostics,
            error: result.errorCode,
            details: result.details,
        })
    }

    return (
        <Section
            title="4. 校验：Schema、防爆、校验和"
            description="多层校验：JSON 格式 → 结构字段 → 最大嵌套深度 (20) → 键数 → 校验和验证。每个失败都有对应中文错误码。"
        >
            <div className="ssm-grid-2">
                <div className="ssm-info-box">
                    <div className="ssm-info-box-text">
                        <strong>校验顺序:</strong>
                        <br />1. JSON 格式解析
                        <br />2. 必需字段检查 (schemaVersion, exportedAt, checksum, entries)
                        <br />3. 嵌套深度防爆 (≤ 20 层)
                        <br />4. 键数统计
                        <br />5. checksum 校验和验证
                    </div>
                </div>
                <div className="ssm-info-box">
                    <div className="ssm-info-box-text">
                        <strong>错误码说明:</strong>
                        <br />• {ERROR_CODES.INVALID_JSON}: JSON 格式无效
                        <br />• {ERROR_CODES.INVALID_SCHEMA}: 缺少必需字段
                        <br />• {ERROR_CODES.MAX_DEPTH_EXCEEDED}: 嵌套过深
                        <br />• {ERROR_CODES.INVALID_CHECKSUM}: 校验和不匹配
                        <br />• {ERROR_CODES.VERSION_TOO_HIGH}: 版本过高
                    </div>
                </div>
            </div>

            <FieldLabel className="ssm-field-label" style={{ marginTop: '12px' }}>待校验 JSON:</FieldLabel>
            <StyledTextarea
                value={testCase}
                onChange={(e) => setTestCase(e.target.value)}
                placeholder="粘贴 JSON 进行校验..."
                rows={5}
            />

            <div className="ssm-row" style={{ marginTop: '12px' }}>
                <StyledButton variant="primary" onClick={runValidation}>
                    执行校验
                </StyledButton>
            </div>

            {validationResult && (
                <ResultCard
                    success={validationResult.success}
                    title={validationResult.success ? '校验通过' : `校验失败: ${validationResult.error}`}
                    message={`阶段: ${validationResult.phase}`}
                >
                    {validationResult.diagnostics && validationResult.diagnostics.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            <div className="ssm-result-text" style={{ fontWeight: 600 }}>诊断信息:</div>
                            {validationResult.diagnostics.map((d, i) => (
                                <div key={i} className="ssm-result-text" style={{ padding: '2px 0' }}>
                                    • {d.type}: {d.value !== undefined ? d.value : d.status}
                                </div>
                            ))}
                        </div>
                    )}
                    {validationResult.details && (
                        <OutputBox className="ssm-output" style={{ marginTop: '8px' }}>
                            {JSON.stringify(validationResult.details, null, 2)}
                        </OutputBox>
                    )}
                </ResultCard>
            )}
        </Section>
    )
}

function DiffSection() {
    const [oldJson, setOldJson] = useState('')
    const [newJson, setNewJson] = useState('')
    const [diffResult, setDiffResult] = useState(null)

    useEffect(() => {
        const oldData = generateSampleData()
        const newData = { ...oldData }
        newData.theme.mode = 'light'
        newData.layout.sidebar.collapsed = true
        newData.newField = 'added value'
        delete newData.tools

        setOldJson(JSON.stringify(createSnapshot([oldData]), null, 2))
        setNewJson(JSON.stringify(createSnapshot([newData]), null, 2))
    }, [])

    function runDiff() {
        try {
            const oldSnap = JSON.parse(oldJson)
            const newSnap = JSON.parse(newJson)
            const diffs = diffSnapshots(oldSnap, newSnap)
            setDiffResult({
                success: true,
                diffs,
                grouped: groupDiffsByType(diffs),
            })
        } catch (e) {
            setDiffResult({
                success: false,
                error: e.message,
            })
        }
    }

    return (
        <Section
            title="5. Diff 算法：新增/删除/变更路径"
            description="基于嵌套路径的深度比较，支持对象和数组差异检测，输出可解析的变更路径供 UI 渲染。"
        >
            <div className="ssm-grid-2">
                <div>
                    <FieldLabel>旧快照:</FieldLabel>
                    <StyledTextarea
                        value={oldJson}
                        onChange={(e) => setOldJson(e.target.value)}
                        rows={8}
                    />
                </div>
                <div>
                    <FieldLabel>新快照:</FieldLabel>
                    <StyledTextarea
                        value={newJson}
                        onChange={(e) => setNewJson(e.target.value)}
                        rows={8}
                    />
                </div>
            </div>

            <StyledButton variant="primary" onClick={runDiff}>
                执行比较
            </StyledButton>

            {diffResult && diffResult.success && (
                <ResultCard
                    success={true}
                    title="比较完成"
                    message={`发现 ${diffResult.diffs.length} 处变更`}
                >
                    <div style={{ marginTop: '8px' }}>
                        <div className="ssm-result-text" style={{ fontWeight: 600, marginBottom: '8px' }}>
                            变更统计:
                            {diffResult.grouped.added.length > 0 && (
                                <span className="ssm-badge ssm-badge-success" style={{ marginLeft: '8px' }}>
                                    +{diffResult.grouped.added.length} 新增
                                </span>
                            )}
                            {diffResult.grouped.removed.length > 0 && (
                                <span className="ssm-badge ssm-badge-error" style={{ marginLeft: '8px' }}>
                                    -{diffResult.grouped.removed.length} 删除
                                </span>
                            )}
                            {diffResult.grouped.changed.length > 0 && (
                                <span className="ssm-badge ssm-badge-warning" style={{ marginLeft: '8px' }}>
                                    ~{diffResult.grouped.changed.length} 修改
                                </span>
                            )}
                        </div>
                    </div>
                    <OutputBox className="ssm-output" style={{ marginTop: '8px', maxHeight: '200px' }}>
                        {diffResult.diffs.map(formatDiff).join('\n')}
                    </OutputBox>
                </ResultCard>
            )}

            {diffResult && !diffResult.success && (
                <ResultCard
                    success={false}
                    title="比较失败"
                    message={diffResult.error}
                />
            )}
        </Section>
    )
}

export default function SettingsSnapshotMigrationDemo() {
    return (
        <div className="ssm-container">
            <h1 className="ssm-header">设置快照导出/导入与版本迁移系统</h1>
            <p className="ssm-header-sub">
                快照格式: <code className="ssm-inline-code">schemaVersion + exportedAt + checksum + entries</code> |
                gzip 压缩下载 | 拖拽解析导入 | 纯函数迁移链 |
                多层校验防爆 | 脱敏勾选 | 合并策略可选
            </p>

            <ExportSection />
            <ImportSection />
            <MigrationSection />
            <ValidationSection />
            <DiffSection />
        </div>
    )
}
