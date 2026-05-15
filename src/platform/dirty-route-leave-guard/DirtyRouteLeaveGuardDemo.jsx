import { useCallback, useEffect, useRef, useState } from 'react'
import DirtyConfirmDialog from './DirtyConfirmDialog.jsx'
import './DirtyRouteLeaveGuardDemo.css'
import {
    createBeforeUnloadGuard,
    createDirtyScope,
    createLeaseLock,
    createMiniRouter,
    createRouteGuard,
    DIALOG_ACTIONS,
    NAVIGATION_TYPES,
} from './logic/index.js'

const PAGES = [
    { id: '/home', name: '首页' },
    { id: '/form', name: '表单编辑' },
    { id: '/settings', name: '设置' },
]

const INITIAL_FORM_DATA = {
    name: '',
    email: '',
    description: '',
    updatedAt: 0,
}

function validateForm(formData) {
    const errors = {}

    if (!formData.name || formData.name.trim() === '') {
        errors.name = '姓名不能为空'
    }

    if (!formData.email || formData.email.trim() === '') {
        errors.email = '邮箱不能为空'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = '邮箱格式不正确'
    }

    if (!formData.description || formData.description.trim() === '') {
        errors.description = '描述不能为空'
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}

const DirtyRouteLeaveGuardDemo = () => {
    const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA })
    const [formErrors, setFormErrors] = useState({})
    const [showValidation, setShowValidation] = useState(false)

    const dirtyScopeRef = useRef(null)
    const beforeUnloadGuardRef = useRef(null)
    const routeGuardRef = useRef(null)
    const leaseLockRef = useRef(null)
    const routerRef = useRef(null)

    const [currentPage, setCurrentPage] = useState('/home')
    const [isDirty, setIsDirty] = useState(false)
    const [dirtyFields, setDirtyFields] = useState([])
    const [dialogVisible, setDialogVisible] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState(null)
    const [leaseInfo, setLeaseInfo] = useState({
        hasLease: false,
        otherClient: null,
    })
    const [navigationLog, setNavigationLog] = useState([])
    const logIdCounterRef = useRef(0)

    useEffect(() => {
        dirtyScopeRef.current = createDirtyScope({
            initialState: { ...INITIAL_FORM_DATA },
            ignorePaths: ['updatedAt'],
        })

        beforeUnloadGuardRef.current = createBeforeUnloadGuard(
            dirtyScopeRef.current
        )

        routeGuardRef.current = createRouteGuard(
            dirtyScopeRef.current,
            beforeUnloadGuardRef.current,
            {
                onBeforeBlock: ({ from, to }) => {
                    setPendingNavigation({ from, to })
                    setDialogVisible(true)
                },
                saveHandler: async () => {
                    const validation = validateForm(formData)
                    if (!validation.isValid) {
                        setFormErrors(validation.errors)
                        setShowValidation(true)
                        throw new Error('表单校验失败')
                    }
                    await new Promise((resolve) => setTimeout(resolve, 500))
                    addLog('已保存更改')
                },
                discardHandler: async () => {
                    addLog('已放弃更改')
                },
            }
        )

        leaseLockRef.current = createLeaseLock({
            leaseDuration: 10000,
            onLeaseLost: () => {
                addLog('编辑租约已丢失')
            },
            onOtherTabEditing: () => {
                addLog('检测到其他标签页正在编辑')
            },
        })

        routerRef.current = createMiniRouter({
            mode: 'hash',
        })

        const unsubscribeDirty = dirtyScopeRef.current.subscribe((event) => {
            setIsDirty(event.type === 'dirty')
            setDirtyFields(dirtyScopeRef.current.getDirtyFields())
        })

        const unsubscribeRouter = routerRef.current.subscribe((event) => {
            setCurrentPage(event.to)
            addLog(`路由变化: ${event.from || '初始'} → ${event.to} (${event.type})`)
        })

        const initialPath = routerRef.current.getCurrentPath()
        if (!PAGES.find(p => p.id === initialPath)) {
            routerRef.current.navigate('/home', { replace: true, triggerGuard: false })
        } else {
            setCurrentPage(initialPath)
        }

        const leaseInterval = setInterval(() => {
            if (leaseLockRef.current) {
                setLeaseInfo({
                    hasLease: leaseLockRef.current.hasActiveLease(),
                    otherClient: leaseLockRef.current.getOtherClientInfo(),
                })
            }
        }, 1000)

        return () => {
            unsubscribeDirty()
            unsubscribeRouter()
            clearInterval(leaseInterval)
            beforeUnloadGuardRef.current?.destroy()
            leaseLockRef.current?.destroy()
            routerRef.current?.destroy()
        }
    }, [])

    useEffect(() => {
        if (formData.email && formData.email.trim() !== '') {
            const validation = validateForm(formData)
            if (validation.errors.email) {
                setFormErrors(prev => ({ ...prev, email: validation.errors.email }))
            } else {
                setFormErrors(prev => {
                    const next = { ...prev }
                    delete next.email
                    return next
                })
            }
        }
    }, [formData.email])

    const addLog = useCallback((message) => {
        logIdCounterRef.current += 1
        setNavigationLog((prev) => [
            {
                id: logIdCounterRef.current,
                message,
                timestamp: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 9),
        ])
    }, [])

    const handleFormChange = useCallback(
        (e) => {
            const { name, value } = e.target
            const newFormData = {
                ...formData,
                [name]: value,
                updatedAt: Date.now(),
            }
            setFormData(newFormData)

            if (showValidation) {
                const validation = validateForm(newFormData)
                setFormErrors(validation.errors)
            }

            if (dirtyScopeRef.current) {
                dirtyScopeRef.current.setCurrent(newFormData)
                beforeUnloadGuardRef.current?.markUserEdited()
            }
        },
        [formData, showValidation]
    )

    const handleNavigation = useCallback(
        (targetPage, isProgrammatic = false) => {
            if (!routerRef.current) return

            const from = routerRef.current.getCurrentPath()

            if (isProgrammatic) {
                routerRef.current.setNavigationType(NAVIGATION_TYPES.PROGRAMMATIC)
                addLog(`程序化导航: ${from} → ${targetPage}`)
            } else {
                routerRef.current.setNavigationType(NAVIGATION_TYPES.USER)
                addLog(`用户点击导航: ${from} → ${targetPage}`)
            }

            const shouldBlock = routeGuardRef.current?.guard({
                from,
                to: targetPage,
                navigationType: isProgrammatic
                    ? NAVIGATION_TYPES.PROGRAMMATIC
                    : NAVIGATION_TYPES.USER,
            })

            if (!shouldBlock) {
                routerRef.current.navigate(targetPage)
            }
        },
        [addLog]
    )

    const handleDialogAction = useCallback(
        async (action) => {
            if (!routeGuardRef.current || !pendingNavigation || !routerRef.current) return

            try {
                await routeGuardRef.current.handleDialogAction(action)
                setDialogVisible(false)

                if (
                    action === DIALOG_ACTIONS.SAVE_AND_LEAVE ||
                    action === DIALOG_ACTIONS.DISCARD_AND_LEAVE
                ) {
                    routerRef.current.navigate(pendingNavigation.to)
                    setFormData(dirtyScopeRef.current?.getCurrent() || { ...INITIAL_FORM_DATA })
                }

                setPendingNavigation(null)
            } catch (error) {
                addLog('保存失败：' + error.message)
            }
        },
        [pendingNavigation, addLog]
    )

    const handleSave = useCallback(() => {
        const validation = validateForm(formData)
        setShowValidation(true)
        setFormErrors(validation.errors)

        if (!validation.isValid) {
            addLog('保存失败：表单校验未通过')
            return
        }

        dirtyScopeRef.current?.markClean()
        setIsDirty(false)
        setDirtyFields([])
        setShowValidation(false)
        addLog('手动保存成功')
    }, [formData, addLog])

    const handleReset = useCallback(() => {
        dirtyScopeRef.current?.reset({ ...INITIAL_FORM_DATA })
        setFormData({ ...INITIAL_FORM_DATA })
        setIsDirty(false)
        setDirtyFields([])
        setFormErrors({})
        setShowValidation(false)
        addLog('表单已重置')
    }, [addLog])

    const handleProgrammaticNavigate = useCallback(() => {
        const currentPath = routerRef.current?.getCurrentPath() || '/home'
        const nextPage = PAGES.find((p) => p.id !== currentPath)?.id || '/home'
        handleNavigation(nextPage, true)
    }, [handleNavigation])

    return (
        <div className="dirty-guard-demo">
            <div className="dirty-guard-container">
                <h1 className="demo-title">脏检测与路由离开守卫 Demo</h1>

                <div className="demo-grid">
                    <div className="main-content">
                        <div className="nav-section">
                            <h2 className="nav-title">导航栏</h2>
                            <div className="nav-buttons">
                                {PAGES.map((page) => (
                                    <button
                                        key={page.id}
                                        onClick={() => handleNavigation(page.id, false)}
                                        className={`nav-btn ${currentPage === page.id ? 'active' : ''}`}
                                    >
                                        {page.name}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleProgrammaticNavigate}
                                className="programmatic-nav-btn"
                            >
                                程序化导航（不弹窗）
                            </button>
                        </div>

                        {currentPage === '/form' && (
                            <div className="form-section">
                                <h2 className="form-title">编辑表单</h2>
                                <div className="form-group">
                                    <label className="form-label">
                                        姓名 <span className="required-mark">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        placeholder="请输入姓名"
                                        className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                                    />
                                    {formErrors.name && (
                                        <p className="error-message">{formErrors.name}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        邮箱 <span className="required-mark">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleFormChange}
                                        placeholder="请输入邮箱"
                                        className={`form-input ${formErrors.email ? 'input-error' : ''}`}
                                    />
                                    {formErrors.email && (
                                        <p className="error-message">{formErrors.email}</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        描述 <span className="required-mark">*</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleFormChange}
                                        placeholder="请输入描述"
                                        className={`form-textarea ${formErrors.description ? 'input-error' : ''}`}
                                    />
                                    {formErrors.description && (
                                        <p className="error-message">{formErrors.description}</p>
                                    )}
                                </div>
                                <div className="form-actions">
                                    <button onClick={handleSave} className="save-btn">
                                        保存
                                    </button>
                                    <button onClick={handleReset} className="reset-btn">
                                        重置
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentPage === '/home' && (
                            <div className="home-section">
                                <h2 className="home-title">首页</h2>
                                <p className="home-description">
                                    欢迎使用脏检测与路由离开守卫 Demo。
                                    请切换到「表单编辑」页面进行编辑，然后尝试导航离开来测试功能。
                                </p>
                            </div>
                        )}

                        {currentPage === '/settings' && (
                            <div className="settings-section">
                                <h2 className="settings-title">设置页面</h2>
                                <p className="settings-description">
                                    这是设置页面。如果您有未保存的更改，导航到这里时会提示确认。
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="sidebar">
                        <div className="status-panel">
                            <h2 className="status-title">状态面板</h2>
                            <div className="status-row">
                                <span className="status-label">表单状态:</span>
                                <span className={`dirty-badge ${isDirty ? 'dirty' : 'clean'}`}>
                                    {isDirty ? '有未保存更改' : '已保存'}
                                </span>
                            </div>
                            <div className="status-row">
                                <span className="status-label">当前页面:</span>
                                <span className="status-value">
                                    {PAGES.find((p) => p.id === currentPage)?.name}
                                </span>
                            </div>
                            <div className="status-row">
                                <span className="status-label">租约状态:</span>
                                <span className={`dirty-badge ${leaseInfo.hasLease ? 'clean' : 'dirty'}`}>
                                    {leaseInfo.hasLease ? '已获得' : '未获得'}
                                </span>
                            </div>
                            {leaseInfo.otherClient && (
                                <div className="lease-info">
                                    <p className="lease-warning">⚠️ 检测到其他标签页正在编辑</p>
                                </div>
                            )}
                        </div>

                        {dirtyFields.length > 0 && (
                            <div className="dirty-fields-panel">
                                <h2 className="dirty-fields-title">脏字段</h2>
                                <ul className="dirty-fields-list">
                                    {dirtyFields.map((field) => (
                                        <li key={field} className="dirty-field-item">
                                            • {field}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="log-panel">
                            <h2 className="log-title">导航日志</h2>
                            <div className="log-container">
                                {navigationLog.length === 0 ? (
                                    <p className="no-logs">暂无日志</p>
                                ) : (
                                    <ul className="log-list">
                                        {navigationLog.map((log) => (
                                            <li key={log.id} className="log-item">
                                                <span className="log-time">[{log.timestamp}]</span>
                                                <span className="log-message">{log.message}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DirtyConfirmDialog
                isOpen={dialogVisible}
                onSaveAndLeave={() => handleDialogAction(DIALOG_ACTIONS.SAVE_AND_LEAVE)}
                onDiscardAndLeave={() => handleDialogAction(DIALOG_ACTIONS.DISCARD_AND_LEAVE)}
                onStay={() => handleDialogAction(DIALOG_ACTIONS.STAY)}
            />
        </div>
    )
}

export default DirtyRouteLeaveGuardDemo
