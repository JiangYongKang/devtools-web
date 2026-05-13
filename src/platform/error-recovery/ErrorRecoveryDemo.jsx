import { useState, useEffect } from 'react'
import ErrorBoundary from './ErrorBoundary.jsx'
import GlobalErrorListener from './GlobalErrorListener.jsx'
import { getDefaultCollector } from './logic/reporter.js'
import { serializeDiagnosticPackage, copyToClipboard, clearDrafts, saveDrafts, loadDrafts } from './logic/index.js'
import { getEnvironmentInfo } from './logic/index.js'

const DESIGN_TOKENS = {
    font: {
        family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        sizes: {
            display: '28px',
            h1: '24px',
            h2: '18px',
            h3: '15px',
            body: '14px',
            small: '13px',
            tiny: '12px',
        },
        weights: {
            regular: 400,
            medium: 500,
            semibold: 600,
        },
    },
    color: {
        text: {
            primary: '#111827',
            secondary: '#4b5563',
            tertiary: '#6b7280',
            inverse: '#ffffff',
        },
        bg: {
            page: '#f8fafc',
            card: '#ffffff',
            surface: '#f9fafb',
        },
        border: '#e5e7eb',
        primary: {
            bg: '#2563eb',
            bgHover: '#1d4ed8',
            text: '#ffffff',
        },
        danger: {
            bg: '#dc2626',
            bgHover: '#b91c1c',
            text: '#ffffff',
        },
        warning: {
            bg: '#f59e0b',
            bgHover: '#d97706',
            text: '#ffffff',
        },
        success: {
            bg: '#10b981',
            bgHover: '#059669',
            text: '#ffffff',
        },
        purple: {
            bg: '#8b5cf6',
            bgHover: '#7c3aed',
            text: '#ffffff',
        },
        secondary: {
            bg: '#6b7280',
            bgHover: '#4b5563',
            text: '#ffffff',
        },
        info: {
            bg: '#f0f9ff',
            border: '#bae6fd',
            text: '#0369a1',
        },
    },
    spacing: {
        xxs: '4px',
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
    },
    radius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
    },
}

const pageLayout = {
    fontFamily: DESIGN_TOKENS.font.family,
    color: DESIGN_TOKENS.color.text.primary,
    fontSize: DESIGN_TOKENS.font.sizes.body,
    lineHeight: 1.6,
}

function buildButton(variant = 'primary', size = 'md', isActive = false) {
    const colors = DESIGN_TOKENS.color[variant] || DESIGN_TOKENS.color.primary
    const paddings = {
        sm: `${DESIGN_TOKENS.spacing.xs} ${DESIGN_TOKENS.spacing.sm}`,
        md: `${DESIGN_TOKENS.spacing.sm} ${DESIGN_TOKENS.spacing.md}`,
        lg: `${DESIGN_TOKENS.spacing.sm} ${DESIGN_TOKENS.spacing.lg}`,
    }
    const fonts = {
        sm: DESIGN_TOKENS.font.sizes.tiny,
        md: DESIGN_TOKENS.font.sizes.body,
        lg: DESIGN_TOKENS.font.sizes.h3,
    }

    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: DESIGN_TOKENS.spacing.xs,
        padding: paddings[size],
        fontSize: fonts[size],
        fontWeight: DESIGN_TOKENS.font.weights.medium,
        color: colors.text,
        background: isActive ? colors.bgHover : colors.bg,
        border: 'none',
        borderRadius: DESIGN_TOKENS.radius.md,
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
    }
}

const sectionCard = {
    background: DESIGN_TOKENS.color.bg.card,
    borderRadius: DESIGN_TOKENS.radius.lg,
    border: `1px solid ${DESIGN_TOKENS.color.border}`,
    padding: DESIGN_TOKENS.spacing.xl,
    marginBottom: DESIGN_TOKENS.spacing.xl,
}

const headingStyles = {
    display: 'block',
    margin: 0,
    marginBottom: DESIGN_TOKENS.spacing.lg,
    fontWeight: DESIGN_TOKENS.font.weights.semibold,
    lineHeight: 1.3,
}

function SyncErrorChild({ shouldThrow }) {
    if (shouldThrow) {
        throw new Error('这是一个同步渲染错误')
    }
    return (
        <div
            style={{
                fontSize: DESIGN_TOKENS.font.sizes.small,
                color: DESIGN_TOKENS.color.text.secondary,
                marginTop: DESIGN_TOKENS.spacing.sm,
            }}
        >
            子组件正常渲染
        </div>
    )
}

function AsyncEffectChild({ shouldThrow }) {
    useEffect(() => {
        if (shouldThrow) {
            const timer = setTimeout(() => {
                throw new Error('这是一个 useEffect 异步错误')
            }, 50)
            return () => clearTimeout(timer)
        }
    }, [shouldThrow])

    return (
        <div
            style={{
                fontSize: DESIGN_TOKENS.font.sizes.small,
                color: DESIGN_TOKENS.color.text.secondary,
                marginTop: DESIGN_TOKENS.spacing.sm,
            }}
        >
            异步副作用组件
        </div>
    )
}

function EventHandlerChild() {
    function handleClick() {
        throw new Error('这是一个事件处理器错误')
    }

    return (
        <div style={{ marginTop: DESIGN_TOKENS.spacing.sm }}>
            <button
                onClick={handleClick}
                style={buildButton('warning', 'md')}
            >
                点击触发事件处理器错误
            </button>
        </div>
    )
}

function SectionHeader({ number, title, subtitle }) {
    return (
        <div style={{ marginBottom: DESIGN_TOKENS.spacing.lg }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: DESIGN_TOKENS.spacing.sm,
                    marginBottom: DESIGN_TOKENS.spacing.xxs,
                }}
            >
                <span
                    style={{
                        fontSize: DESIGN_TOKENS.font.sizes.h3,
                        fontWeight: DESIGN_TOKENS.font.weights.semibold,
                        color: DESIGN_TOKENS.color.text.primary,
                    }}
                >
                    {number}.
                </span>
                <span
                    style={{
                        fontSize: DESIGN_TOKENS.font.sizes.h3,
                        fontWeight: DESIGN_TOKENS.font.weights.semibold,
                        color: DESIGN_TOKENS.color.text.primary,
                    }}
                >
                    {title}
                </span>
            </div>
            {subtitle && (
                <p
                    style={{
                        margin: 0,
                        fontSize: DESIGN_TOKENS.font.sizes.small,
                        color: DESIGN_TOKENS.color.text.tertiary,
                    }}
                >
                    {subtitle}
                </p>
            )}
        </div>
    )
}

function CodeBlock({ children }) {
    return (
        <pre
            style={{
                margin: 0,
                marginTop: DESIGN_TOKENS.spacing.sm,
                padding: DESIGN_TOKENS.spacing.md,
                background: DESIGN_TOKENS.color.bg.surface,
                borderRadius: DESIGN_TOKENS.radius.md,
                border: `1px solid ${DESIGN_TOKENS.color.border}`,
                fontSize: DESIGN_TOKENS.font.sizes.tiny,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                overflowX: 'auto',
                color: DESIGN_TOKENS.color.text.secondary,
            }}
        >
            {children}
        </pre>
    )
}

function ButtonRow({ children, style }) {
    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: DESIGN_TOKENS.spacing.sm,
                ...style,
            }}
        >
            {children}
        </div>
    )
}

function PromiseRejectionDemo() {
    const [result, setResult] = useState(null)

    function triggerDOMExceptionRejection() {
        setResult('触发中...')
        try {
            throw new DOMException('模拟网络请求被取消', 'AbortError')
        } catch (err) {
            setResult({
                type: 'DOMException',
                name: err.name,
                message: err.message,
            })
        }
    }

    function triggerCustomObjectRejection() {
        setResult('触发中...')
        setTimeout(() => {
            Promise.reject({
                errorCode: 'CUSTOM_ERROR_42',
                message: '自定义对象形式的 Promise 拒绝',
            })
        }, 50)
        setResult({
            type: 'CustomObject',
            info: 'Promise 已被拒绝（将被全局监听器捕获）',
        })
    }

    return (
        <div style={sectionCard}>
            <SectionHeader
                number="4"
                title="Promise 拒绝示例"
                subtitle="不会被 ErrorBoundary 捕获，由全局监听器处理"
            />
            <ButtonRow>
                <button onClick={triggerDOMExceptionRejection} style={buildButton('purple', 'md')}>
                    触发 DOMException
                </button>
                <button onClick={triggerCustomObjectRejection} style={buildButton('danger', 'md')}>
                    触发自定义对象拒绝
                </button>
            </ButtonRow>
            {result && (
                <CodeBlock>
                    {typeof result === 'string'
                        ? result
                        : JSON.stringify(result, null, 2)}
                </CodeBlock>
            )}
        </div>
    )
}

function CollectorsPanel({ collector }) {
    const [reports, setReports] = useState([])
    const [copiedIndex, setCopiedIndex] = useState(null)

    function refresh() {
        setReports(collector.getAll())
    }

    useEffect(() => {
        refresh()
        const interval = setInterval(refresh, 1000)
        return () => clearInterval(interval)
    }, [])

    async function copyReport(index) {
        const report = reports[index]
        const json = serializeDiagnosticPackage(report)
        const result = await copyToClipboard(json)
        if (result.success) {
            setCopiedIndex(index)
            setTimeout(() => setCopiedIndex(null), 2000)
        }
    }

    return (
        <div style={sectionCard}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: DESIGN_TOKENS.spacing.lg,
                }}
            >
                <h3
                    style={{
                        ...headingStyles,
                        fontSize: DESIGN_TOKENS.font.sizes.h3,
                        marginBottom: 0,
                    }}
                >
                    内存收集器
                </h3>
                <span
                    style={{
                        fontSize: DESIGN_TOKENS.font.sizes.small,
                        color: DESIGN_TOKENS.color.text.tertiary,
                        background: DESIGN_TOKENS.color.bg.surface,
                        padding: `${DESIGN_TOKENS.spacing.xxs} ${DESIGN_TOKENS.spacing.sm}`,
                        borderRadius: DESIGN_TOKENS.radius.sm,
                    }}
                >
                    {reports.length} 条记录
                </span>
            </div>

            {reports.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: DESIGN_TOKENS.spacing['2xl'],
                        color: DESIGN_TOKENS.color.text.tertiary,
                        fontSize: DESIGN_TOKENS.font.sizes.small,
                    }}
                >
                    暂无报告
                </div>
            ) : (
                <div
                    style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: DESIGN_TOKENS.spacing.md,
                    }}
                >
                    {reports.map((report, index) => (
                        <div
                            key={index}
                            style={{
                                padding: DESIGN_TOKENS.spacing.md,
                                background: DESIGN_TOKENS.color.bg.surface,
                                borderRadius: DESIGN_TOKENS.radius.md,
                                border: `1px solid ${DESIGN_TOKENS.color.border}`,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: DESIGN_TOKENS.spacing.md,
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: DESIGN_TOKENS.spacing.sm,
                                            marginBottom: DESIGN_TOKENS.spacing.xxs,
                                        }}
                                    >
                                        <span
                                            style={{
                                            fontSize: DESIGN_TOKENS.font.sizes.body,
                                            fontWeight: DESIGN_TOKENS.font.weights.medium,
                                            color: DESIGN_TOKENS.color.text.primary,
                                        }}
                                    >
                                        #{index + 1}
                                    </span>
                                        <span
                                            style={{
                                                fontSize: DESIGN_TOKENS.font.sizes.small,
                                                color: DESIGN_TOKENS.color.text.tertiary,
                                            }}
                                        >
                                            {report.source}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: DESIGN_TOKENS.font.sizes.small,
                                            color: DESIGN_TOKENS.color.text.secondary,
                                            marginBottom: DESIGN_TOKENS.spacing.xxs,
                                        }}
                                    >
                                        {report.errorCode}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: DESIGN_TOKENS.font.sizes.tiny,
                                            color: DESIGN_TOKENS.color.text.tertiary,
                                        }}
                                    >
                                        {report.error?.name}: {report.error?.message?.substring(0, 60)}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: DESIGN_TOKENS.font.sizes.tiny,
                                            color: DESIGN_TOKENS.color.text.tertiary,
                                            marginTop: DESIGN_TOKENS.spacing.xxs,
                                        }}
                                    >
                                        {new Date(report.timestamp.epoch).toLocaleTimeString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyReport(index)}
                                    style={buildButton('success', 'sm', copiedIndex === index)}
                                >
                                    {copiedIndex === index ? '已复制!' : '复制'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: DESIGN_TOKENS.spacing.lg }}>
                <button
                    onClick={() => {
                        collector.clear()
                        refresh()
                    }}
                    style={buildButton('secondary', 'sm')}
                >
                    清空收集器
                </button>
            </div>
        </div>
    )
}

function DraftsDemo() {
    const [drafts, setDrafts] = useState([])

    function refresh() {
        setDrafts(loadDrafts())
    }

    function addDraft() {
        const newDraft = {
            id: Date.now(),
            content: `草稿 ${new Date().toLocaleTimeString()}`,
            createdAt: Date.now(),
        }
        const current = loadDrafts()
        saveDrafts([...current, newDraft])
        refresh()
    }

    useEffect(() => {
        refresh()
    }, [])

    return (
        <div style={sectionCard}>
            <SectionHeader
                number="0"
                title="本地草稿管理"
                subtitle="与错误边界的「清空本地草稿」按钮共享存储键"
            />
            <ButtonRow>
                <button onClick={addDraft} style={buildButton('success', 'md')}>
                    添加草稿
                </button>
                <button
                    onClick={() => {
                        clearDrafts()
                        refresh()
                    }}
                    style={buildButton('warning', 'md')}
                >
                    手动清空
                </button>
            </ButtonRow>
            <div
                style={{
                    marginTop: DESIGN_TOKENS.spacing.md,
                    fontSize: DESIGN_TOKENS.font.sizes.small,
                    color: DESIGN_TOKENS.color.text.tertiary,
                }}
            >
                当前草稿数：
                <span
                    style={{
                        fontWeight: DESIGN_TOKENS.font.weights.medium,
                        color: DESIGN_TOKENS.color.text.secondary,
                        marginLeft: DESIGN_TOKENS.spacing.xxs,
                    }}
                >
                    {drafts.length}
                </span>
            </div>
        </div>
    )
}

function EnvironmentInfo() {
    const info = getEnvironmentInfo()
    return (
        <div
            style={{
                background: DESIGN_TOKENS.color.info.bg,
                border: `1px solid ${DESIGN_TOKENS.color.info.border}`,
                borderRadius: DESIGN_TOKENS.radius.lg,
                padding: DESIGN_TOKENS.spacing.xl,
                marginBottom: DESIGN_TOKENS.spacing['2xl'],
            }}
        >
            <h3
                style={{
                    margin: 0,
                    marginBottom: DESIGN_TOKENS.spacing.md,
                    fontSize: DESIGN_TOKENS.font.sizes.h3,
                    fontWeight: DESIGN_TOKENS.font.weights.semibold,
                    color: DESIGN_TOKENS.color.info.text,
                }}
            >
                Source Map 策略说明
            </h3>
            <ul
                style={{
                    margin: 0,
                    paddingLeft: DESIGN_TOKENS.spacing.lg,
                    fontSize: DESIGN_TOKENS.font.sizes.small,
                    color: DESIGN_TOKENS.color.info.text,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: DESIGN_TOKENS.spacing.xxs,
                }}
            >
                <li>
                    诊断包仅包含 <code>buildId</code> 占位符（当前：{info.buildId || 'null'}）
                </li>
                <li>环境：{info.environment}</li>
                <li>不内嵌 source map，仅提供环境变量读取接口</li>
                <li>生产环境下敏感源码路径会被替换为 [hidden_path]</li>
            </ul>
        </div>
    )
}

function ErrorBoundarySections({
    syncThrow,
    setSyncThrow,
    asyncThrow,
    setAsyncThrow,
    boundaryKey,
    onReset,
}) {
    return (
        <ErrorBoundary
            key={boundaryKey}
            onError={(error, info, pkg) => {
                console.log('ErrorBoundary caught:', { error, pkg })
            }}
        >
            <div style={sectionCard}>
                <SectionHeader
                    number="1"
                    title="同步渲染错误"
                    subtitle="ErrorBoundary 会捕获"
                />
                <ButtonRow>
                    <button
                        onClick={() => setSyncThrow(true)}
                        style={buildButton('danger', 'md')}
                    >
                        触发同步错误
                    </button>
                </ButtonRow>
                <SyncErrorChild shouldThrow={syncThrow} />
            </div>

            <div style={sectionCard}>
                <SectionHeader
                    number="2"
                    title="useEffect 异步错误"
                    subtitle="React 16+ 可以捕获"
                />
                <ButtonRow>
                    <button
                        onClick={() => setAsyncThrow(true)}
                        style={buildButton('purple', 'md')}
                    >
                        触发异步副作用错误
                    </button>
                </ButtonRow>
                <AsyncEffectChild shouldThrow={asyncThrow} />
            </div>

            <div style={sectionCard}>
                <SectionHeader
                    number="3"
                    title="事件处理器错误"
                    subtitle="同步调用的部分会被捕获"
                />
                <EventHandlerChild />
            </div>

            <div style={{ textAlign: 'center', paddingTop: DESIGN_TOKENS.spacing.lg }}>
                <button onClick={onReset} style={buildButton('primary', 'lg')}>
                    重置所有状态
                </button>
            </div>
        </ErrorBoundary>
    )
}

export default function ErrorRecoveryDemo() {
    const [syncThrow, setSyncThrow] = useState(false)
    const [asyncThrow, setAsyncThrow] = useState(false)
    const [boundaryKey, setBoundaryKey] = useState(0)
    const collector = getDefaultCollector()

    function resetAll() {
        setSyncThrow(false)
        setAsyncThrow(false)
        setBoundaryKey((k) => k + 1)
    }

    return (
        <div
            style={{
                ...pageLayout,
                minHeight: '100vh',
                background: DESIGN_TOKENS.color.bg.page,
                padding: DESIGN_TOKENS.spacing['2xl'],
            }}
        >
            <GlobalErrorListener />

            <div
                style={{
                    maxWidth: '1100px',
                    margin: '0 auto',
                }}
            >
                <header
                    style={{
                        textAlign: 'center',
                        marginBottom: DESIGN_TOKENS.spacing['2xl'],
                    }}
                >
                    <h1
                        style={{
                            margin: 0,
                            marginBottom: DESIGN_TOKENS.spacing.sm,
                            fontSize: DESIGN_TOKENS.font.sizes.h1,
                            fontWeight: DESIGN_TOKENS.font.weights.semibold,
                            color: DESIGN_TOKENS.color.text.primary,
                        }}
                    >
                        错误恢复系统演示
                    </h1>
                    <p
                        style={{
                            margin: 0,
                            fontSize: DESIGN_TOKENS.font.sizes.body,
                            color: DESIGN_TOKENS.color.text.secondary,
                        }}
                    >
                        展示 ErrorBoundary 与全局监听器的协作方式
                    </p>
                </header>

                <EnvironmentInfo />

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 360px',
                        gap: DESIGN_TOKENS.spacing['2xl'],
                        alignItems: 'start',
                    }}
                >
                    <main>
                        <h2
                            style={{
                                ...headingStyles,
                                fontSize: DESIGN_TOKENS.font.sizes.h2,
                            }}
                        >
                            错误触发演示
                        </h2>

                        <DraftsDemo />

                        <ErrorBoundarySections
                            syncThrow={syncThrow}
                            setSyncThrow={setSyncThrow}
                            asyncThrow={asyncThrow}
                            setAsyncThrow={setAsyncThrow}
                            boundaryKey={boundaryKey}
                            onReset={resetAll}
                        />

                        <PromiseRejectionDemo />
                    </main>

                    <aside
                        style={{
                            position: 'sticky',
                            top: DESIGN_TOKENS.spacing['2xl'],
                        }}
                    >
                        <CollectorsPanel collector={collector} />
                    </aside>
                </div>
            </div>
        </div>
    )
}
