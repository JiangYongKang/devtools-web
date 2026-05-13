import { Component } from 'react'
import { ERROR_SOURCES } from './logic/constants.js'
import { mapToErrorCode } from './logic/errorCodeMap.js'
import { generateFingerprint, createThrottleStore, shouldReport, recordReport } from './logic/fingerprint.js'
import { assembleDiagnosticPackage, serializeDiagnosticPackage, copyToClipboard, clearDrafts, loadDrafts } from './logic/index.js'
import { sendToCollector, getDefaultCollector } from './logic/reporter.js'
import { markHandled } from './logic/listener.js'
import { useState } from 'react'

const DESIGN_TOKENS = {
    font: {
        family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        sizes: {
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
            danger: '#dc2626',
        },
        bg: {
            card: '#ffffff',
            surface: '#f9fafb',
            dangerSurface: '#fef2f2',
        },
        border: '#e5e7eb',
        dangerBorder: '#fecaca',
        primary: {
            bg: '#2563eb',
            text: '#ffffff',
        },
        danger: {
            bg: '#dc2626',
            text: '#ffffff',
        },
        warning: {
            bg: '#f59e0b',
            text: '#ffffff',
        },
        success: {
            bg: '#10b981',
            text: '#ffffff',
        },
        secondary: {
            bg: '#6b7280',
            text: '#ffffff',
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
    },
    radius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
    },
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
        background: colors.bg,
        border: 'none',
        borderRadius: DESIGN_TOKENS.radius.md,
        cursor: 'pointer',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
    }
}

function MinimalFallback() {
    return (
        <div
            style={{
                padding: DESIGN_TOKENS.spacing.xl,
                border: `2px solid ${DESIGN_TOKENS.color.danger.bg}`,
                borderRadius: DESIGN_TOKENS.radius.lg,
                background: DESIGN_TOKENS.color.bg.dangerSurface,
                color: DESIGN_TOKENS.color.text.danger,
                fontFamily: DESIGN_TOKENS.font.family,
                maxWidth: '600px',
                margin: `${DESIGN_TOKENS.spacing.xl} auto`,
            }}
        >
            <h2
                style={{
                    margin: 0,
                    marginBottom: DESIGN_TOKENS.spacing.sm,
                    fontSize: DESIGN_TOKENS.font.sizes.h3,
                    fontWeight: DESIGN_TOKENS.font.weights.semibold,
                }}
            >
                应用错误
            </h2>
            <p
                style={{
                    margin: 0,
                    fontSize: DESIGN_TOKENS.font.sizes.body,
                }}
            >
                渲染过程中发生错误，请刷新页面重试。
            </p>
        </div>
    )
}

function CodeBlock({ children }) {
    return (
        <pre
            style={{
                margin: 0,
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

function ErrorSummary({ error, componentStack, diagnosticPackage, onRetry, onGoHome, onClearDrafts }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        const json = serializeDiagnosticPackage(diagnosticPackage)
        const result = await copyToClipboard(json)
        if (result.success) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    async function handleClearDrafts() {
        const currentDrafts = loadDrafts()
        if (currentDrafts.length === 0) {
            return
        }
        const confirmed = window.confirm(
            `确定要清空所有本地草稿？当前有 ${currentDrafts.length} 个草稿。`
        )
        if (confirmed) {
            clearDrafts()
        }
    }

    return (
        <div
            style={{
                padding: DESIGN_TOKENS.spacing.xl,
                border: `2px solid ${DESIGN_TOKENS.color.danger.bg}`,
                borderRadius: DESIGN_TOKENS.radius.xl,
                background: DESIGN_TOKENS.color.bg.card,
                maxWidth: '700px',
                margin: `${DESIGN_TOKENS.spacing.xl} auto`,
                fontFamily: DESIGN_TOKENS.font.family,
            }}
        >
            <div style={{ marginBottom: DESIGN_TOKENS.spacing.lg }}>
                <h2
                    style={{
                        margin: 0,
                        marginBottom: DESIGN_TOKENS.spacing.sm,
                        fontSize: DESIGN_TOKENS.font.sizes.h2,
                        fontWeight: DESIGN_TOKENS.font.weights.semibold,
                        color: DESIGN_TOKENS.color.text.danger,
                    }}
                >
                    组件渲染发生错误
                </h2>
                <p
                    style={{
                        margin: 0,
                        fontSize: DESIGN_TOKENS.font.sizes.body,
                        color: DESIGN_TOKENS.color.text.secondary,
                    }}
                >
                    {error?.message || '发生未知错误'}
                </p>
            </div>

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: DESIGN_TOKENS.spacing.sm,
                    width: '100%',
                    padding: DESIGN_TOKENS.spacing.md,
                    marginBottom: DESIGN_TOKENS.spacing.lg,
                    background: DESIGN_TOKENS.color.bg.surface,
                    border: `1px solid ${DESIGN_TOKENS.color.border}`,
                    borderRadius: DESIGN_TOKENS.radius.md,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: DESIGN_TOKENS.font.sizes.body,
                    color: DESIGN_TOKENS.color.text.primary,
                    fontWeight: DESIGN_TOKENS.font.weights.medium,
                }}
            >
                <span>{isExpanded ? '▼' : '▶'}</span>
                <span>技术摘要</span>
            </button>

            {isExpanded && (
                <div
                    style={{
                        marginBottom: DESIGN_TOKENS.spacing.lg,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: DESIGN_TOKENS.spacing.md,
                    }}
                >
                    <div>
                        <h4
                            style={{
                                margin: 0,
                                marginBottom: DESIGN_TOKENS.spacing.xxs,
                                fontSize: DESIGN_TOKENS.font.sizes.small,
                                fontWeight: DESIGN_TOKENS.font.weights.medium,
                                color: DESIGN_TOKENS.color.text.primary,
                            }}
                        >
                            错误类型
                        </h4>
                        <CodeBlock>{error?.name || 'Error'}</CodeBlock>
                    </div>

                    {componentStack && (
                        <div>
                            <h4
                                style={{
                                    margin: 0,
                                    marginBottom: DESIGN_TOKENS.spacing.xxs,
                                    fontSize: DESIGN_TOKENS.font.sizes.small,
                                    fontWeight: DESIGN_TOKENS.font.weights.medium,
                                    color: DESIGN_TOKENS.color.text.primary,
                                }}
                            >
                                组件栈
                            </h4>
                            <CodeBlock>{componentStack}</CodeBlock>
                        </div>
                    )}

                    {error?.stack && (
                        <div>
                            <h4
                                style={{
                                    margin: 0,
                                    marginBottom: DESIGN_TOKENS.spacing.xxs,
                                    fontSize: DESIGN_TOKENS.font.sizes.small,
                                    fontWeight: DESIGN_TOKENS.font.weights.medium,
                                    color: DESIGN_TOKENS.color.text.primary,
                                }}
                            >
                                调用栈
                            </h4>
                            <div
                                style={{
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                }}
                            >
                                <CodeBlock>{error.stack}</CodeBlock>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: DESIGN_TOKENS.spacing.sm,
                }}
            >
                <button onClick={onRetry} style={buildButton('primary', 'md')}>
                    重试渲染
                </button>
                <button onClick={onGoHome} style={buildButton('secondary', 'md')}>
                    返回首页
                </button>
                <button onClick={handleClearDrafts} style={buildButton('warning', 'md')}>
                    清空本地草稿
                </button>
                <button
                    onClick={handleCopy}
                    style={{
                        ...buildButton('success', 'md'),
                        background: copied ? '#059669' : '#10b981',
                    }}
                >
                    {copied ? '已复制!' : '复制诊断包'}
                </button>
            </div>
        </div>
    )
}

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            diagnosticPackage: null,
            fallbackRenderFailed: false,
        }
        this.throttleStore = props.throttleStore || createThrottleStore()
        this.collector = props.collector || getDefaultCollector()
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        }
    }

    componentDidCatch(error, errorInfo) {
        markHandled(error)

        const fingerprint = generateFingerprint(error, errorInfo.componentStack)
        const throttleCheck = shouldReport(fingerprint, this.throttleStore)

        if (!throttleCheck.shouldReport) {
            return
        }

        recordReport(fingerprint, this.throttleStore)

        const errorCode = mapToErrorCode(error)

        const diagnosticPackage = assembleDiagnosticPackage({
            error,
            componentStack: errorInfo.componentStack,
            source: ERROR_SOURCES.BOUNDARY,
            errorCode,
            customContext: this.props.context,
        })

        this.setState({
            errorInfo,
            diagnosticPackage,
        })

        if (this.props.onError) {
            this.props.onError(error, errorInfo, diagnosticPackage)
        }

        sendToCollector(diagnosticPackage, this.collector)
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            diagnosticPackage: null,
            fallbackRenderFailed: false,
        })
    }

    handleGoHome = () => {
        if (typeof window !== 'undefined') {
            window.location.href = '/'
        }
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children
        }

        if (this.state.fallbackRenderFailed) {
            return <MinimalFallback />
        }

        try {
            const FallbackComponent = this.props.fallback || ErrorSummary
            return (
                <FallbackComponent
                    error={this.state.error}
                    componentStack={this.state.errorInfo?.componentStack}
                    diagnosticPackage={this.state.diagnosticPackage}
                    onRetry={this.handleRetry}
                    onGoHome={this.handleGoHome}
                    onClearDrafts={this.handleGoHome}
                    retry={this.handleRetry}
                    resetErrorBoundary={this.handleRetry}
                />
            )
        } catch {
            this.setState({ fallbackRenderFailed: true })
            return <MinimalFallback />
        }
    }
}

export default ErrorBoundary
