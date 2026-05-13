
import { useState, useEffect } from 'react'
import {
  useGlobalLoading,
  useLocalLoading,
  useOfflineStatus,
  useNotificationQueue,
  useDebouncedCallback,
} from './hooks.js'
import {
  Spinner,
  LocalLoader,
  GlobalOverlay,
  EmptyState,
  ToastContainer,
  BannerContainer,
  ensureStylesInjected,
} from './components.jsx'
import {
  EMPTY_STATE_TYPES,
  NOTIFICATION_SEVERITY,
} from './logic/index.js'

function FeedbackUITool() {
  ensureStylesInjected()
  
  const [mounted, setMounted] = useState(false)
  const [emptyStateType, setEmptyStateType] = useState(null)
  const [showLocalLoading, setShowLocalLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [simulatedOffline, setSimulatedOffline] = useState(false)
  
  const globalLoading = useGlobalLoading()
  const localLoading = useLocalLoading()
  const offlineStatus = useOfflineStatus()
  const notifications = useNotificationQueue({ maxToasts: 5, maxBanners: 3 })
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const debouncedRetry = useDebouncedCallback(async () => {
    setRetryCount(prev => prev + 1)
    notifications.addToast({
      id: 'retry-status',
      severity: NOTIFICATION_SEVERITY.INFO,
      message: '正在重试...',
      description: `第 ${retryCount + 1} 次重试尝试`,
      autoDismiss: true,
      duration: 2000,
    })
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    notifications.addToast({
      severity: NOTIFICATION_SEVERITY.SUCCESS,
      message: '重试成功',
      description: '数据已重新加载',
      autoDismiss: true,
      duration: 3000,
    })
  }, 500)
  
  const handleConcurrentLoading = async () => {
    const token1 = globalLoading.startLoading()
    const token2 = globalLoading.startLoading()
    const token3 = globalLoading.startLoading()
    
    notifications.addToast({
      severity: NOTIFICATION_SEVERITY.INFO,
      message: '并发加载开始',
      description: `当前加载计数: ${globalLoading.count}`,
      autoDismiss: true,
      duration: 1500,
    })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    globalLoading.finishLoading(token1.token)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    globalLoading.finishLoading(token2.token)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    globalLoading.finishLoading(token3.token)
    
    notifications.addToast({
      severity: NOTIFICATION_SEVERITY.SUCCESS,
      message: '全部加载完成',
      description: '所有并发请求已完成',
      autoDismiss: true,
      duration: 2000,
    })
  }
  
  const handleTokenLoading = async () => {
    const token = globalLoading.startLoading('my-custom-token')
    
    notifications.addToast({
      severity: NOTIFICATION_SEVERITY.INFO,
      message: 'Token 加载开始',
      description: `使用自定义 token: ${token.token}`,
      autoDismiss: true,
      duration: 2000,
    })
    
    const duplicateResult = globalLoading.startLoading('my-custom-token')
    if (duplicateResult.count === globalLoading.count) {
      notifications.addToast({
        severity: NOTIFICATION_SEVERITY.WARNING,
        message: 'Token 已存在',
        description: '相同 token 不会增加计数',
        autoDismiss: true,
        duration: 2000,
      })
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    globalLoading.finishLoading('my-custom-token')
    
    notifications.addToast({
      severity: NOTIFICATION_SEVERITY.SUCCESS,
      message: 'Token 加载完成',
      autoDismiss: true,
      duration: 2000,
    })
  }
  
  const handleLocalLoading = async () => {
    setShowLocalLoading(true)
    localLoading.startLoading()
    
    notifications.addToast({
      severity: NOTIFICATION_SEVERITY.INFO,
      message: '区域加载开始',
      description: '仅影响当前组件区域',
      autoDismiss: true,
      duration: 2000,
    })
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    localLoading.finishLoading()
    setShowLocalLoading(false)
    
    notifications.addToast({
      severity: NOTIFICATION_SEVERITY.SUCCESS,
      message: '区域加载完成',
      autoDismiss: true,
      duration: 2000,
    })
  }
  
  const handleShowEmptyState = (type) => {
    setEmptyStateType(type)
  }
  
  const handleSimulateOffline = () => {
    setSimulatedOffline(true)
    setEmptyStateType(EMPTY_STATE_TYPES.OFFLINE)
    
    notifications.addBanner({
      severity: NOTIFICATION_SEVERITY.WARNING,
      message: '已模拟离线状态',
      description: '点击「重试连接」可恢复',
      autoDismiss: false,
    })
  }
  
  const handleOfflineRetry = () => {
    setSimulatedOffline(false)
    setEmptyStateType(null)
    notifications.clearAll('banner')
    notifications.addToast({
      severity: NOTIFICATION_SEVERITY.SUCCESS,
      message: '已恢复在线',
      description: '网络连接已恢复',
      autoDismiss: true,
      duration: 3000,
    })
  }
  
  const handleAddMultipleToasts = () => {
    for (let i = 1; i <= 7; i++) {
      setTimeout(() => {
        notifications.addToast({
          id: `toast-${i % 3}`,
          severity: [
            NOTIFICATION_SEVERITY.SUCCESS,
            NOTIFICATION_SEVERITY.INFO,
            NOTIFICATION_SEVERITY.WARNING,
            NOTIFICATION_SEVERITY.ERROR,
          ][i % 4],
          message: `Toast ${i}`,
          description: `这是第 ${i} 个 toast 通知`,
          autoDismiss: i > 5,
          duration: 5000,
        })
      }, i * 300)
    }
  }
  
  const handleAddMergingToasts = () => {
    const sameId = 'upload-progress'
    
    for (let i = 0; i <= 100; i += 25) {
      setTimeout(() => {
        const result = notifications.addToast({
          id: sameId,
          severity: i === 100 ? NOTIFICATION_SEVERITY.SUCCESS : NOTIFICATION_SEVERITY.INFO,
          message: '上传进度',
          description: `${i}% 已完成`,
          autoDismiss: i === 100,
          duration: 3000,
        })
        
        if (result.merged) {
          console.log('Toast 已合并更新')
        }
      }, i * 100)
    }
  }
  
  const handleAddErrorWithRetry = () => {
    notifications.addToast({
      id: 'error-with-retry',
      severity: NOTIFICATION_SEVERITY.ERROR,
      message: '数据加载失败',
      description: '网络连接超时，请重试',
      action: () => debouncedRetry(),
      actionLabel: '重试',
      autoDismiss: false,
    })
  }
  
  const handleAddBanner = (severity) => {
    const messages = {
      [NOTIFICATION_SEVERITY.SUCCESS]: { message: '操作成功', description: '您的更改已保存' },
      [NOTIFICATION_SEVERITY.INFO]: { message: '系统提示', description: '有新的更新可用' },
      [NOTIFICATION_SEVERITY.WARNING]: { message: '注意', description: '您的会话即将过期' },
      [NOTIFICATION_SEVERITY.ERROR]: { message: '错误', description: '处理请求时发生错误' },
    }
    
    notifications.addBanner({
      severity,
      ...messages[severity],
      autoDismiss: severity !== NOTIFICATION_SEVERITY.ERROR,
      duration: 5000,
    })
  }
  
  const actualIsOffline = simulatedOffline || offlineStatus.isOffline
  
  return (
    <div className="fui-demo-container">
      {mounted && (
        <>
          <GlobalOverlay
            isLoading={globalLoading.isLoading}
            showCount={true}
            count={globalLoading.count}
            text="处理中"
          />
          <ToastContainer
            toasts={notifications.toasts}
            onClose={notifications.removeToast}
            onAction={(id, action) => {
              if (typeof action === 'function') action()
              notifications.removeToast(id)
            }}
          />
          <BannerContainer
            banners={notifications.banners}
            onClose={notifications.removeBanner}
          />
        </>
      )}
      
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
        反馈 UI 系统演示
      </h1>
      
      <div className="fui-demo-section">
        <h2 className="fui-demo-title">一、加载态演示</h2>
        
        <button
          className="fui-demo-button primary"
          onClick={handleConcurrentLoading}
          disabled={globalLoading.isLoading}
        >
          触发并发加载（3 个请求）
        </button>
        
        <button
          className="fui-demo-button"
          onClick={handleTokenLoading}
          disabled={globalLoading.isLoading}
        >
          Token 式引用演示
        </button>
        
        <button
          className="fui-demo-button"
          onClick={handleLocalLoading}
          disabled={showLocalLoading}
        >
          区域加载演示
        </button>
        
        <div className="fui-demo-status">
          <strong>全局加载状态:</strong> {globalLoading.isLoading ? '加载中' : '空闲'} | 
          <strong> 计数:</strong> {globalLoading.count} | 
          <strong> Token 数:</strong> {globalLoading.tokenCount}
        </div>
        
        <div className="fui-demo-empty-container">
          <LocalLoader isLoading={showLocalLoading} text="区域数据加载中...">
            {!showLocalLoading && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                点击上方「区域加载演示」按钮查看区域加载效果
              </div>
            )}
          </LocalLoader>
        </div>
      </div>
      
      <div className="fui-demo-section">
        <h2 className="fui-demo-title">二、空状态演示</h2>
        
        <button
          className="fui-demo-button"
          onClick={() => handleShowEmptyState(EMPTY_STATE_TYPES.NO_DATA)}
        >
          无数据
        </button>
        
        <button
          className="fui-demo-button"
          onClick={() => handleShowEmptyState(EMPTY_STATE_TYPES.NO_RESULTS)}
        >
          筛选无结果
        </button>
        
        <button
          className="fui-demo-button"
          onClick={() => handleShowEmptyState(EMPTY_STATE_TYPES.NO_PERMISSION)}
        >
          权限不足
        </button>
        
        <button
          className="fui-demo-button danger"
          onClick={handleSimulateOffline}
        >
          模拟离线状态
        </button>
        
        <button
          className="fui-demo-button"
          onClick={() => setEmptyStateType(null)}
        >
          清除空状态
        </button>
        
        <div className="fui-demo-status">
          <strong>实际网络状态:</strong> {offlineStatus.isOnline ? '在线' : '离线'} | 
          <strong> 模拟状态:</strong> {simulatedOffline ? '离线' : '正常'} | 
          <strong> 重试次数:</strong> {retryCount}
        </div>
        
        <div className="fui-demo-empty-container">
          {emptyStateType === EMPTY_STATE_TYPES.OFFLINE ? (
            <EmptyState
              type={EMPTY_STATE_TYPES.OFFLINE}
              primaryAction={handleOfflineRetry}
              primaryActionLabel="重试连接"
            />
          ) : emptyStateType === EMPTY_STATE_TYPES.NO_RESULTS ? (
            <EmptyState
              type={EMPTY_STATE_TYPES.NO_RESULTS}
              primaryAction={() => {
                setEmptyStateType(null)
                notifications.addToast({
                  severity: NOTIFICATION_SEVERITY.INFO,
                  message: '筛选条件已重置',
                  autoDismiss: true,
                  duration: 2000,
                })
              }}
              secondaryAction={() => setEmptyStateType(null)}
              secondaryActionLabel="取消"
            />
          ) : emptyStateType === EMPTY_STATE_TYPES.NO_PERMISSION ? (
            <EmptyState
              type={EMPTY_STATE_TYPES.NO_PERMISSION}
              primaryAction={() => {
                notifications.addToast({
                  severity: NOTIFICATION_SEVERITY.INFO,
                  message: '已向管理员发送请求',
                  autoDismiss: true,
                  duration: 2000,
                })
              }}
            />
          ) : emptyStateType === EMPTY_STATE_TYPES.NO_DATA ? (
            <EmptyState
              type={EMPTY_STATE_TYPES.NO_DATA}
              primaryAction={() => {
                setEmptyStateType(null)
                notifications.addToast({
                  severity: NOTIFICATION_SEVERITY.SUCCESS,
                  message: '添加数据功能已触发',
                  autoDismiss: true,
                  duration: 2000,
                })
              }}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              点击上方按钮查看不同类型的空状态
            </div>
          )}
        </div>
      </div>
      
      <div className="fui-demo-section">
        <h2 className="fui-demo-title">三、通知系统演示</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Toast 通知</h3>
          
          <button
            className="fui-demo-button"
            onClick={handleAddMultipleToasts}
          >
            队列溢出 + 合并演示
          </button>
          
          <button
            className="fui-demo-button"
            onClick={handleAddMergingToasts}
          >
            相同 ID 合并（上传进度）
          </button>
          
          <button
            className="fui-demo-button danger"
            onClick={handleAddErrorWithRetry}
          >
            错误通知带重试按钮
          </button>
          
          <button
            className="fui-demo-button"
            onClick={() => notifications.clearAll('toast')}
          >
            清除所有 Toast
          </button>
        </div>
        
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Inline Banner</h3>
          
          <button
            className="fui-demo-button"
            onClick={() => handleAddBanner(NOTIFICATION_SEVERITY.SUCCESS)}
            style={{ borderColor: '#10b981', color: '#065f46' }}
          >
            成功 Banner
          </button>
          
          <button
            className="fui-demo-button"
            onClick={() => handleAddBanner(NOTIFICATION_SEVERITY.INFO)}
            style={{ borderColor: '#3b82f6', color: '#1e40af' }}
          >
            信息 Banner
          </button>
          
          <button
            className="fui-demo-button"
            onClick={() => handleAddBanner(NOTIFICATION_SEVERITY.WARNING)}
            style={{ borderColor: '#f59e0b', color: '#92400e' }}
          >
            警告 Banner
          </button>
          
          <button
            className="fui-demo-button danger"
            onClick={() => handleAddBanner(NOTIFICATION_SEVERITY.ERROR)}
          >
            错误 Banner
          </button>
          
          <button
            className="fui-demo-button"
            onClick={() => notifications.clearAll('banner')}
          >
            清除所有 Banner
          </button>
        </div>
        
        <div className="fui-demo-status">
          <strong>当前 Toast 数:</strong> {notifications.toasts.length} | 
          <strong> 当前 Banner 数:</strong> {notifications.banners.length}
        </div>
      </div>
      
      <div className="fui-demo-section">
        <h2 className="fui-demo-title">四、无障碍检查清单</h2>
        <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.8' }}>
          <div>✅ <code>role="status"</code> - 加载态和空状态</div>
          <div>✅ <code>role="alert"</code> - 区域加载</div>
          <div>✅ <code>role="dialog"</code> + <code>aria-modal</code> - 全局遮罩</div>
          <div>✅ <code>aria-live</code> - Toast 和 Banner（error 用 assertive，其他用 polite）</div>
          <div>✅ <code>aria-label</code> - 关闭按钮</div>
          <div>✅ <code>aria-hidden</code> - 装饰性图标</div>
          <div>✅ <code>prefers-reduced-motion</code> 支持 - 减少脉冲动画</div>
          <div>✅ 键盘可访问 - 所有按钮可聚焦和操作</div>
          <div>✅ 颜色对比 - 使用语义化颜色且提供图标辅助</div>
        </div>
      </div>
      
      <div className="fui-demo-section">
        <h2 className="fui-demo-title">五、SSR & 可见性说明</h2>
        <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.8' }}>
          <div>✅ 通知容器使用 <code>useEffect</code> 延迟挂载，避免 SSR hydration mismatch</div>
          <div>✅ Toast 自动消失计时器在页面隐藏时自动暂停</div>
          <div>✅ 切换到其他标签页后再返回，计时器会从剩余时间继续</div>
          <div>✅ 可通过 <code>navigator.onLine</code> 和 <code>online/offline</code> 事件检测网络状态</div>
          <div>✅ 重试按钮使用防抖（500ms）防止重复点击</div>
          <div>✅ Toast 队列上限为 5，超出时会自动合并相同 ID 或移除最旧项</div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackUITool
