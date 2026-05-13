import { useState, useEffect } from 'react'
import {
    PreferenceStore,
    getAllNamespaceStats,
    clearAllNamespace,
    generateLargeObject,
    createExportPackage,
    serializeExportPackage,
    deserializeExportPackage,
    parseImportPackage,
    MemoryStorage,
    LRUManager,
    resetMemoryStorage,
    resetLRUManager,
} from './logic/index.js'
import {
    DOMAIN_PREFERENCES,
    STORAGE_VERSIONS,
    MERGE_STRATEGIES,
    ERROR_CODES,
} from './logic/constants.js'

const STYLES = {
    container: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '24px 20px',
        color: '#1f2937',
    },
    header: {
        margin: '0 0 8px 0',
        fontSize: '24px',
        fontWeight: 700,
        color: '#111827',
    },
    headerSub: {
        margin: '0 0 28px 0',
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: '1.6',
    },
    section: {
        marginBottom: '20px',
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
    sectionDesc: {
        margin: '0 0 16px 0',
        fontSize: '13px',
        color: '#6b7280',
        lineHeight: '1.5',
    },
    row: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '12px',
    },
    rowNoMargin: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center',
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '12px',
    },
    label: {
        fontSize: '13px',
        color: '#374151',
        fontWeight: 500,
    },
    input: {
        padding: '8px 12px',
        fontSize: '14px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: '#ffffff',
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ':focus': {
            borderColor: '#3b82f6',
            boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
        },
    },
    textarea: {
        width: '100%',
        minHeight: '120px',
        padding: '12px',
        fontSize: '13px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: '#ffffff',
        outline: 'none',
        resize: 'vertical',
        lineHeight: '1.5',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    textareaReadonly: {
        background: '#f9fafb',
        cursor: 'default',
    },
    output: {
        padding: '14px 16px',
        fontSize: '12px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: '1.5',
        maxHeight: '240px',
        overflow: 'auto',
    },
    outputSuccess: {
        background: '#ecfdf5',
        borderColor: '#6ee7b7',
    },
    outputError: {
        background: '#fef2f2',
        borderColor: '#fca5a5',
    },
    outputWarning: {
        background: '#fffbeb',
        borderColor: '#fcd34d',
    },
    btnBase: {
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 500,
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        lineHeight: '20px',
    },
    btnSmall: {
        padding: '6px 12px',
        fontSize: '12px',
    },
    btnPrimary: {
        background: '#3b82f6',
        color: '#ffffff',
    },
    btnPrimaryHover: {
        background: '#2563eb',
    },
    btnSuccess: {
        background: '#10b981',
        color: '#ffffff',
    },
    btnSuccessHover: {
        background: '#059669',
    },
    btnWarning: {
        background: '#f59e0b',
        color: '#ffffff',
    },
    btnWarningHover: {
        background: '#d97706',
    },
    btnDanger: {
        background: '#ef4444',
        color: '#ffffff',
    },
    btnDangerHover: {
        background: '#dc2626',
    },
    btnSecondary: {
        background: '#6b7280',
        color: '#ffffff',
    },
    btnSecondaryHover: {
        background: '#4b5563',
    },
    btnGhost: {
        background: '#f3f4f6',
        color: '#374151',
    },
    btnGhostHover: {
        background: '#e5e7eb',
    },
    btnInfo: {
        background: '#06b6d4',
        color: '#ffffff',
    },
    btnInfoHover: {
        background: '#0891b2',
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '6px',
        marginLeft: '8px',
    },
    badgeSuccess: {
        background: '#d1fae5',
        color: '#065f46',
    },
    badgeError: {
        background: '#fee2e2',
        color: '#991b1b',
    },
    fieldLabel: {
        display: 'block',
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '6px',
        fontWeight: 500,
    },
    fieldGroup: {
        marginBottom: '12px',
    },
    radioGroup: {
        display: 'flex',
        gap: '20px',
        marginBottom: '16px',
    },
    radioLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: '#374151',
        cursor: 'pointer',
    },
    resultCard: {
        marginTop: '12px',
        padding: '14px 16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
    },
    resultCardSuccess: {
        background: '#ecfdf5',
        borderColor: '#6ee7b7',
    },
    resultCardError: {
        background: '#fef2f2',
        borderColor: '#fca5a5',
    },
    resultTitle: {
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '8px',
    },
    resultTitleSuccess: {
        color: '#065f46',
    },
    resultTitleError: {
        color: '#991b1b',
    },
    resultText: {
        fontSize: '12px',
        color: '#6b7280',
        lineHeight: '1.5',
    },
    select: {
        padding: '8px 12px',
        fontSize: '14px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: '#ffffff',
        outline: 'none',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
    },
    statsItem: {
        fontSize: '13px',
        padding: '6px 0',
        borderBottom: '1px solid #f3f4f6',
        color: '#374151',
    },
    infoBox: {
        padding: '14px 16px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        marginBottom: '12px',
    },
    infoBoxText: {
        fontSize: '13px',
        color: '#1e40af',
        lineHeight: '1.5',
    },
    inlineCode: {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '12px',
        background: '#f3f4f6',
        padding: '2px 6px',
        borderRadius: '4px',
        color: '#1f2937',
    },
}

function useDemoStore(domain) {
    const [memoryStorage] = useState(() => new MemoryStorage())
    const [lruManager] = useState(() => new LRUManager())

    const store = new PreferenceStore({
        domain,
        customStorage: memoryStorage,
        lruManager,
    })

    return { store, memoryStorage, lruManager }
}

function Section({ title, description, children }) {
    return (
        <div style={STYLES.section}>
            <h3 style={STYLES.sectionTitle}>{title}</h3>
            {description && <p style={STYLES.sectionDesc}>{description}</p>}
            {children}
        </div>
    )
}

function StatusBadge({ success, message }) {
    return (
        <span style={{
            ...STYLES.badge,
            ...(success ? STYLES.badgeSuccess : STYLES.badgeError),
        }}>
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
    style = {},
}) {
    const [isHovered, setIsHovered] = useState(false)
    const [isActive, setIsActive] = useState(false)

    const variantStyles = {
        primary: { normal: STYLES.btnPrimary, hover: STYLES.btnPrimaryHover },
        success: { normal: STYLES.btnSuccess, hover: STYLES.btnSuccessHover },
        warning: { normal: STYLES.btnWarning, hover: STYLES.btnWarningHover },
        danger: { normal: STYLES.btnDanger, hover: STYLES.btnDangerHover },
        secondary: { normal: STYLES.btnSecondary, hover: STYLES.btnSecondaryHover },
        ghost: { normal: STYLES.btnGhost, hover: STYLES.btnGhostHover },
        info: { normal: STYLES.btnInfo, hover: STYLES.btnInfoHover },
    }

    const currentVariant = variantStyles[variant] || variantStyles.primary
    const sizeStyle = size === 'small' ? STYLES.btnSmall : {}

    const baseStyle = {
        ...STYLES.btnBase,
        ...sizeStyle,
        ...currentVariant.normal,
        ...style,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: isActive ? 'scale(0.98)' : 'scale(1)',
    }

    if (isHovered && !disabled) {
        Object.assign(baseStyle, currentVariant.hover)
    }

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={baseStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsActive(false) }}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
        >
            {children}
        </button>
    )
}

function StyledInput({
    value,
    onChange,
    placeholder,
    style = {},
    type = 'text',
}) {
    const [isFocused, setIsFocused] = useState(false)

    const inputStyle = {
        ...STYLES.input,
        ...style,
        borderColor: isFocused ? '#3b82f6' : '#d1d5db',
        boxShadow: isFocused ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
    }

    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            style={inputStyle}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
        />
    )
}

function StyledTextarea({
    value,
    onChange,
    placeholder,
    readOnly = false,
    style = {},
    rows = 6,
}) {
    const [isFocused, setIsFocused] = useState(false)

    const textareaStyle = {
        ...STYLES.textarea,
        ...(readOnly ? STYLES.textareaReadonly : {}),
        ...style,
        borderColor: isFocused && !readOnly ? '#3b82f6' : '#d1d5db',
        boxShadow: isFocused && !readOnly ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
    }

    return (
        <textarea
            value={value}
            onChange={readOnly ? undefined : onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            style={textareaStyle}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={rows}
        />
    )
}

function StyledSelect({ value, onChange, options, style = {} }) {
    const [isFocused, setIsFocused] = useState(false)

    const selectStyle = {
        ...STYLES.select,
        ...style,
        borderColor: isFocused ? '#3b82f6' : '#d1d5db',
        boxShadow: isFocused ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
    }

    return (
        <select
            value={value}
            onChange={onChange}
            style={selectStyle}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    )
}

function FieldLabel({ children, style = {} }) {
    return (
        <div style={{ ...STYLES.fieldLabel, ...style }}>{children}</div>
    )
}

function OutputBox({ children, variant = 'default', style = {} }) {
    const variantStyles = {
        default: {},
        success: STYLES.outputSuccess,
        error: STYLES.outputError,
        warning: STYLES.outputWarning,
    }

    return (
        <pre style={{
            ...STYLES.output,
            ...variantStyles[variant],
            ...style,
        }}>
            {children}
        </pre>
    )
}

function ResultCard({ success, title, message, children }) {
    return (
        <div style={{
            ...STYLES.resultCard,
            ...(success ? STYLES.resultCardSuccess : STYLES.resultCardError),
        }}>
            <div style={{
                ...STYLES.resultTitle,
                ...(success ? STYLES.resultTitleSuccess : STYLES.resultTitleError),
            }}>
                {title}
            </div>
            {message && <div style={STYLES.resultText}>{message}</div>}
            {children}
        </div>
    )
}

function BasicStorageDemo() {
    const { store } = useDemoStore(DOMAIN_PREFERENCES.LAYOUT)
    const [currentData, setCurrentData] = useState(null)
    const [status, setStatus] = useState(null)
    const [inputValue, setInputValue] = useState('')
    const [inputKey, setInputKey] = useState('testKey')

    function refresh() {
        const result = store.load()
        if (result.success) {
            setCurrentData(result.data)
        } else {
            setCurrentData(null)
        }
    }

    useEffect(() => {
        refresh()
    }, [])

    function handleSave() {
        const current = currentData || {}
        const newData = { ...current, [inputKey]: inputValue }
        const result = store.save(newData)
        setStatus({ success: result.success, message: result.success ? '保存成功' : '保存失败' })
        refresh()
        setTimeout(() => setStatus(null), 2000)
    }

    function handleUpdate() {
        const result = store.update({ [inputKey]: inputValue })
        setStatus({ success: result.success, message: result.success ? '更新成功' : '更新失败' })
        refresh()
        setTimeout(() => setStatus(null), 2000)
    }

    function handleClear() {
        const result = store.clear()
        setStatus({ success: result.success, message: result.success ? '已清空' : '清空失败' })
        refresh()
        setTimeout(() => setStatus(null), 2000)
    }

    return (
        <Section
            title="1. 基础读写操作"
            description="演示基本的保存、更新、读取和清空操作，数据存储在独立的 MemoryStorage 实例中。"
        >
            <div style={STYLES.row}>
                <StyledInput
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="键名 (例如: theme)"
                    style={{ flex: 1, minWidth: '120px' }}
                />
                <StyledInput
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="值 (例如: dark)"
                    style={{ flex: 2, minWidth: '150px' }}
                />
                <StyledButton variant="primary" onClick={handleSave}>保存</StyledButton>
                <StyledButton variant="secondary" onClick={handleUpdate}>更新</StyledButton>
                <StyledButton variant="danger" onClick={handleClear}>清空</StyledButton>
            </div>
            {status && <StatusBadge success={status.success} message={status.message} />}

            <FieldLabel style={{ marginTop: '16px' }}>当前存储数据:</FieldLabel>
            <OutputBox>
                {currentData ? JSON.stringify(currentData, null, 2) : '暂无数据'}
            </OutputBox>
        </Section>
    )
}

function MergeStrategyDemo() {
    const [strategy, setStrategy] = useState(MERGE_STRATEGIES.SHALLOW)
    const [targetJson, setTargetJson] = useState(JSON.stringify({ a: 1, nested: { x: 1 } }, null, 2))
    const [sourceJson, setSourceJson] = useState(JSON.stringify({ b: 2, nested: { y: 2 } }, null, 2))
    const [result, setResult] = useState(null)

    function runMerge() {
        try {
            const target = JSON.parse(targetJson)
            const source = JSON.parse(sourceJson)
            const store = new PreferenceStore({
                domain: DOMAIN_PREFERENCES.LAYOUT,
                customStorage: new MemoryStorage(),
                lruManager: new LRUManager(),
                mergeStrategy: strategy,
            })
            store.save(target)
            const updateResult = store.update(source)
            const loaded = store.load()
            setResult({
                success: updateResult.success,
                data: loaded.data,
            })
        } catch (e) {
            setResult({ success: false, error: e.message })
        }
    }

    return (
        <Section
            title="2. 合并策略（浅合并 vs 深合并）"
            description="浅合并 (Shallow): 仅合并顶层属性，嵌套对象直接覆盖。深合并 (Deep): 递归合并嵌套对象。"
        >
            <div style={STYLES.radioGroup}>
                <label style={STYLES.radioLabel}>
                    <input
                        type="radio"
                        checked={strategy === MERGE_STRATEGIES.SHALLOW}
                        onChange={() => setStrategy(MERGE_STRATEGIES.SHALLOW)}
                    />
                    浅合并 (Shallow)
                </label>
                <label style={STYLES.radioLabel}>
                    <input
                        type="radio"
                        checked={strategy === MERGE_STRATEGIES.DEEP}
                        onChange={() => setStrategy(MERGE_STRATEGIES.DEEP)}
                    />
                    深合并 (Deep)
                </label>
            </div>

            <div style={STYLES.grid2}>
                <div>
                    <FieldLabel>目标对象 (Target)</FieldLabel>
                    <StyledTextarea
                        value={targetJson}
                        onChange={(e) => setTargetJson(e.target.value)}
                        rows={8}
                    />
                </div>
                <div>
                    <FieldLabel>源对象 (Source)</FieldLabel>
                    <StyledTextarea
                        value={sourceJson}
                        onChange={(e) => setSourceJson(e.target.value)}
                        rows={8}
                    />
                </div>
            </div>

            <StyledButton variant="success" onClick={runMerge}>执行合并</StyledButton>

            {result && (
                <>
                    <FieldLabel style={{ marginTop: '16px' }}>合并结果:</FieldLabel>
                    <OutputBox variant={result.success ? 'success' : 'error'}>
                        {result.success ? JSON.stringify(result.data, null, 2) : `错误: ${result.error}`}
                    </OutputBox>
                </>
            )}
        </Section>
    )
}

function MigrationDemo() {
    const [migrationResult, setMigrationResult] = useState(null)

    function runMigration() {
        const storage = new MemoryStorage()
        const v1Record = {
            schemaVersion: STORAGE_VERSIONS.V1,
            timestamp: Date.now(),
            data: {
                theme: 'dark',
                sidebarCollapsed: true,
                toolStates: { toolA: 'open' },
            },
        }
        storage.setItem('devtools:layout:2.0.0', JSON.stringify(v1Record))

        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: storage,
            lruManager: new LRUManager(),
        })

        const loadResult = store.load()
        setMigrationResult({
            v1Data: v1Record.data,
            v2Data: loadResult.data,
            migrated: loadResult.migrated,
            success: loadResult.success,
        })
    }

    return (
        <Section
            title="3. 版本迁移 (v1 → v2)"
            description="迁移是幂等的 - 对同一数据多次执行迁移结果相同。迁移失败时会保留原始快照。"
        >
            <div style={STYLES.infoBox}>
                <div style={STYLES.infoBoxText}>
                    <strong>v1 → v2 变更:</strong>
                    <br />• theme 从字符串迁移到对象 {'{ mode, customColors }'}
                    <br />• sidebarCollapsed 从顶层迁移到 layout.sidebarCollapsed
                    <br />• toolStates 重命名为 tools
                </div>
            </div>

            <StyledButton variant="warning" onClick={runMigration}>执行 v1 → v2 迁移</StyledButton>

            {migrationResult && (
                <div style={STYLES.grid2}>
                    <div>
                        <FieldLabel>v1 原始数据</FieldLabel>
                        <OutputBox variant="warning">
                            {JSON.stringify(migrationResult.v1Data, null, 2)}
                        </OutputBox>
                    </div>
                    <div>
                        <FieldLabel>
                            v2 迁移后
                            {migrationResult.migrated && <StatusBadge success={true} message="已迁移" />}
                        </FieldLabel>
                        <OutputBox variant="success">
                            {JSON.stringify(migrationResult.v2Data, null, 2)}
                        </OutputBox>
                    </div>
                </div>
            )}
        </Section>
    )
}

function LargeObjectDemo() {
    const [size, setSize] = useState(1024 * 100)
    const [generated, setGenerated] = useState(null)

    function generate() {
        const result = generateLargeObject(size)
        setGenerated(result)
    }

    const sizeOptions = [
        { value: 1024 * 50, label: '50 KB' },
        { value: 1024 * 100, label: '100 KB' },
        { value: 1024 * 500, label: '500 KB' },
        { value: 1024 * 1024, label: '1 MB' },
    ]

    return (
        <Section
            title="4. 大对象生成（配额测试替身）"
            description="生成接近配额的大对象用于测试，采用重复键与体积计数器替身，不会真写满磁盘。"
        >
            <div style={STYLES.row}>
                <span style={STYLES.label}>目标大小:</span>
                <StyledSelect
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    options={sizeOptions}
                />
                <StyledButton variant="info" onClick={generate}>生成大对象</StyledButton>
            </div>

            {generated && (
                <div style={STYLES.infoBox}>
                    <div style={STYLES.infoBoxText}>
                        <strong>生成结果:</strong>
                        <br />• 目标大小: {generated.targetBytes.toLocaleString()} bytes
                        <br />• 实际大小: {generated.actualBytes.toLocaleString()} bytes
                        <br />• 重复键数量: {Object.keys(generated.data.repeatedKeys).length}
                        <br />• 大字段长度: {generated.data.largeField.length.toLocaleString()} 字符
                    </div>
                </div>
            )}
        </Section>
    )
}

function ImportExportDemo() {
    const [importText, setImportText] = useState('')
    const [importResult, setImportResult] = useState(null)
    const [exportJson, setExportJson] = useState(null)

    function createValidExport() {
        const records = [
            {
                schemaVersion: STORAGE_VERSIONS.V2,
                timestamp: Date.now(),
                data: {
                    theme: { mode: 'light' },
                    layout: { sidebarCollapsed: false },
                    layoutTopology: 'from-task-052',
                    sidebarCollapsed: true,
                },
            },
        ]
        const pkg = createExportPackage(records)
        setExportJson(serializeExportPackage(pkg))
    }

    function createInvalidImport(type) {
        switch (type) {
            case 'corrupted':
                setImportText('this is not valid json at all')
                break
            case 'semi':
                setImportText(JSON.stringify({
                    packageVersion: STORAGE_VERSIONS.V2,
                    records: [
                        { schemaVersion: STORAGE_VERSIONS.V2, timestamp: 123, data: { valid: true } },
                        { invalid: 'record' },
                    ],
                }, null, 2))
                break
            case 'xss':
                setImportText(JSON.stringify({
                    packageVersion: STORAGE_VERSIONS.V2,
                    records: [
                        {
                            schemaVersion: STORAGE_VERSIONS.V2,
                            timestamp: 123,
                            data: { malicious: '<script>alert(1)</script>' },
                        },
                    ],
                }, null, 2))
                break
            case 'unknownFields':
                setImportText(JSON.stringify({
                    packageVersion: STORAGE_VERSIONS.V2,
                    records: [
                        {
                            schemaVersion: STORAGE_VERSIONS.V2,
                            timestamp: 123,
                            data: {
                                known: 'value',
                                unknownField1: 'should_be_ignored',
                                unknownField2: 'also_ignored',
                            },
                        },
                    ],
                }, null, 2))
                break
            case 'v1AutoMigrate':
                setImportText(JSON.stringify({
                    packageVersion: STORAGE_VERSIONS.V2,
                    records: [
                        {
                            schemaVersion: STORAGE_VERSIONS.V1,
                            timestamp: 123,
                            data: { theme: 'dark', sidebarCollapsed: true },
                        },
                    ],
                }, null, 2))
                break
        }
        setImportResult(null)
    }

    function runImport() {
        const parseResult = deserializeExportPackage(importText)
        if (!parseResult.success) {
            setImportResult({
                success: false,
                phase: 'deserialize',
                errorCode: parseResult.errorCode,
                message: parseResult.errorMessage,
            })
            return
        }

        const importResult = parseImportPackage(parseResult.data, {
            knownFields: ['known', 'theme', 'layout', 'layoutTopology', 'sidebarCollapsed'],
            allowUnknownFields: false,
        })

        setImportResult({
            success: importResult.success,
            phase: importResult.success ? 'complete' : 'validate',
            errorCode: importResult.errorCode,
            message: importResult.errorMessage,
            records: importResult.records,
            diagnostics: importResult.diagnostics,
            hadMigration: importResult.hadMigration,
        })
    }

    return (
        <Section
            title="5. 导入/导出与校验"
            description="导出包包含版本号与校验和字段；导入时会执行校验和验证、XSS 检测、版本迁移，并将未知字段记录到诊断数组中。"
        >
            <FieldLabel>快速生成示例:</FieldLabel>
            <div style={{ ...STYLES.row, marginBottom: '16px' }}>
                <StyledButton variant="success" size="small" onClick={createValidExport}>生成合法导出包</StyledButton>
                <StyledButton variant="danger" size="small" onClick={() => createInvalidImport('corrupted')}>损坏 JSON</StyledButton>
                <StyledButton variant="warning" size="small" onClick={() => createInvalidImport('semi')}>半合法（部分记录无效）</StyledButton>
                <StyledButton variant="danger" size="small" onClick={() => createInvalidImport('xss')}>含 XSS 内容</StyledButton>
                <StyledButton variant="secondary" size="small" onClick={() => createInvalidImport('unknownFields')}>含未知字段</StyledButton>
                <StyledButton variant="primary" size="small" onClick={() => createInvalidImport('v1AutoMigrate')}>v1 自动迁移</StyledButton>
            </div>

            {exportJson && (
                <div style={STYLES.fieldGroup}>
                    <FieldLabel>生成的导出包（带校验和）:</FieldLabel>
                    <StyledTextarea value={exportJson} readOnly rows={5} />
                    <div style={{ marginTop: '8px' }}>
                        <StyledButton variant="info" size="small" onClick={() => { setImportText(exportJson); setExportJson(null); }}>
                            复制到导入区
                        </StyledButton>
                    </div>
                </div>
            )}

            <div style={STYLES.fieldGroup}>
                <FieldLabel>导入 JSON 内容:</FieldLabel>
                <StyledTextarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="粘贴 JSON 内容..."
                    rows={6}
                />
            </div>

            <StyledButton variant="primary" onClick={runImport}>解析导入</StyledButton>

            {importResult && (
                <ResultCard
                    success={importResult.success}
                    title={importResult.success ? '导入成功' : `导入失败 (${importResult.errorCode})`}
                    message={importResult.message}
                >
                    {importResult.hadMigration && (
                        <div style={{ ...STYLES.resultText, color: '#d97706', marginTop: '4px' }}>
                            🔄 已执行自动迁移
                        </div>
                    )}
                    {importResult.diagnostics && importResult.diagnostics.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ ...STYLES.resultText, fontWeight: 600 }}>诊断信息:</div>
                            {importResult.diagnostics.map((d, i) => (
                                <div key={i} style={{ ...STYLES.resultText, padding: '2px 0' }}>
                                    • {d.type}: {JSON.stringify(d)}
                                </div>
                            ))}
                        </div>
                    )}
                    {importResult.records && (
                        <OutputBox style={{ marginTop: '8px', maxHeight: '160px' }}>
                            {JSON.stringify(importResult.records, null, 2)}
                        </OutputBox>
                    )}
                </ResultCard>
            )}
        </Section>
    )
}

function QuotaDemo() {
    const [quotaResult, setQuotaResult] = useState(null)

    function simulateQuota() {
        const storage = new MemoryStorage()
        const lruManager = new LRUManager()

        let quotaHit = false
        const originalSetItem = storage.setItem.bind(storage)

        storage.setItem = function (key, value) {
            if (!quotaHit && key.includes('layout')) {
                quotaHit = true
                const err = new Error('Quota exceeded')
                err.name = 'QuotaExceededError'
                throw err
            }
            return originalSetItem(key, value)
        }

        storage.setItem('devtools:workspace:2.0.0', JSON.stringify({ temp: 'data' }))
        storage.setItem('devtools:theme:2.0.0', JSON.stringify({ mode: 'light' }))

        lruManager.recordAccess('devtools:workspace:2.0.0')
        lruManager.recordAccess('devtools:theme:2.0.0')

        const store = new PreferenceStore({
            domain: DOMAIN_PREFERENCES.LAYOUT,
            customStorage: storage,
            lruManager,
        })

        const beforeKeys = storage.getAll()
        const result = store.save({ new: 'data' })
        const afterKeys = storage.getAll()

        setQuotaResult({
            success: result.success,
            quotaHit,
            beforeKeys: Object.keys(beforeKeys),
            afterKeys: Object.keys(afterKeys),
            storageContents: afterKeys,
        })
    }

    return (
        <Section
            title="6. 配额溢出与 LRU 驱逐"
            description="当 QuotaExceededError 发生时，系统会自动按优先级驱逐低优先级键。优先级顺序：workspace (最低) → tools → layout → theme (最高)。"
        >
            <StyledButton variant="danger" onClick={simulateQuota}>模拟配额溢出并观察 LRU 恢复</StyledButton>

            {quotaResult && (
                <OutputBox variant={quotaResult.success ? 'success' : 'error'}>
                    {JSON.stringify(quotaResult, null, 2)}
                </OutputBox>
            )}
        </Section>
    )
}

function StorageStatsDemo() {
    const [stats, setStats] = useState(null)

    function refresh() {
        const storage = new MemoryStorage()
        storage.setItem('devtools:layout:2.0.0', JSON.stringify({ a: 1, b: 2, c: { nested: true } }))
        storage.setItem('devtools:theme:2.0.0', JSON.stringify({ mode: 'dark', customColors: { primary: '#3b82f6' } }))
        storage.setItem('devtools:workspace:2.0.0', JSON.stringify({ temp: 'data' }))
        storage.setItem('other_namespace:key', 'should not count')
        setStats(getAllNamespaceStats(storage))
    }

    useEffect(() => {
        refresh()
    }, [])

    function handleReset() {
        const storage = new MemoryStorage()
        storage.setItem('devtools:layout:2.0.0', 'test')
        const result = clearAllNamespace(storage)
        alert(`已清除 ${result.removedKeys.length} 个命名空间键`)
    }

    return (
        <Section
            title="7. 存储占用估算与危险操作"
            description="显示当前命名空间的存储占用估算（使用 Blob 字节长度近似），以及危险操作入口。"
        >
            {stats && (
                <>
                    <div style={STYLES.infoBox}>
                        <div style={STYLES.infoBoxText}>
                            <strong>总占用:</strong> {stats.totalHumanReadable} ({stats.totalBytes.toLocaleString()} bytes)
                            <br /><strong>键数量:</strong> {stats.keyCount}
                        </div>
                    </div>

                    <FieldLabel>命名空间键详情:</FieldLabel>
                    <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                        {stats.keys.map((k, i) => (
                            <div key={i} style={STYLES.statsItem}>
                                <code style={STYLES.inlineCode}>{k.key}</code>
                                <span style={{ marginLeft: '12px', color: '#6b7280' }}>{k.humanReadable}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div style={{ ...STYLES.row, marginTop: '16px' }}>
                <StyledButton variant="secondary" onClick={refresh}>刷新统计</StyledButton>
                <StyledButton variant="danger" onClick={handleReset}>
                    ⚠️ 重置本域（危险操作）
                </StyledButton>
            </div>
        </Section>
    )
}

export default function PreferencePersistenceDemo() {
    return (
        <div style={STYLES.container}>
            <h1 style={STYLES.header}>站点级偏好存储系统</h1>
            <p style={STYLES.headerSub}>
                键名命名空间: <code style={STYLES.inlineCode}>devtools:</code> + 领域 + 版本 |
                支持 localStorage/sessionStorage/memory 降级 |
                合并策略可配置 | 版本迁移幂等 | 导入导出带校验和与 XSS 防护
            </p>

            <BasicStorageDemo />
            <MergeStrategyDemo />
            <MigrationDemo />
            <LargeObjectDemo />
            <ImportExportDemo />
            <QuotaDemo />
            <StorageStatsDemo />
        </div>
    )
}
