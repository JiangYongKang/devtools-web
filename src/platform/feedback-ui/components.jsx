
import { useState, useEffect, useRef } from 'react'
import {
  useGlobalLoading,
  useLocalLoading,
  useOfflineStatus,
  useNotificationQueue,
  useVisibilityAwareTimer,
  useDebouncedCallback,
  usePrefersReducedMotion,
} from './hooks.js'
import {
  EMPTY_STATE_TYPES,
  NOTIFICATION_SEVERITY,
  ARIA_LIVE_POLITE,
  ARIA_LIVE_ASSERTIVE,
  getEmptyStateText,
  createVisibilityAwareTimer,
} from './logic/index.js'

const styles = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideInTop {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fui-spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
}

.fui-spinner.small { width: 16px; height: 16px; border-width: 2px; }
.fui-spinner.large { width: 48px; height: 48px; border-width: 4px; }

.fui-spinner.animated { animation: spin 1s linear infinite; }
.fui-spinner.reduced-motion { animation: pulse 2s ease-in-out infinite; }
.fui-spinner.no-motion { border-top-color: #e5e7eb; }

.fui-local-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 200px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  gap: 1rem;
}

.fui-local-loader-text {
  font-size: 0.875rem;
  color: #6b7280;
}

.fui-global-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.fui-global-overlay-content {
  background: white;
  padding: 2rem 3rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.fui-global-overlay-text {
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
}

.fui-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: #6b7280;
  animation: fadeIn 0.3s ease-out;
}

.fui-empty-state-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.fui-empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.fui-empty-state-description {
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  max-width: 400px;
  line-height: 1.5;
}

.fui-empty-state-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.fui-empty-state-action {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.fui-empty-state-action.primary {
  background: #3b82f6;
  color: white;
}

.fui-empty-state-action.primary:hover {
  background: #2563eb;
}

.fui-empty-state-action.secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.fui-empty-state-action.secondary:hover {
  background: #e5e7eb;
}

.fui-toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 0.5rem;
  margin: -0.5rem;
}

.fui-toast {
  min-width: 300px;
  max-width: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  animation: slideInRight 0.3s ease-out;
  border-left: 4px solid;
}

.fui-toast.success { border-left-color: #10b981; }
.fui-toast.info { border-left-color: #3b82f6; }
.fui-toast.warning { border-left-color: #f59e0b; }
.fui-toast.error { border-left-color: #ef4444; }

.fui-toast-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.fui-toast-message {
  font-weight: 600;
  font-size: 0.875rem;
  color: #1f2937;
}

.fui-toast-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #9ca3af;
  padding: 0;
  line-height: 1;
  margin-left: 0.5rem;
}

.fui-toast-close:hover { color: #6b7280; }

.fui-toast-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.fui-toast-actions {
  display: flex;
  gap: 0.5rem;
}

.fui-toast-action {
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
  background: #f3f4f6;
  color: #374151;
  transition: background 0.2s;
}

.fui-toast-action:hover { background: #e5e7eb; }

.fui-banner-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.fui-banner {
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: slideInTop 0.3s ease-out;
}

.fui-banner.success { background: #ecfdf5; color: #065f46; border-bottom: 1px solid #6ee7b7; }
.fui-banner.info { background: #eff6ff; color: #1e40af; border-bottom: 1px solid #93c5fd; }
.fui-banner.warning { background: #fffbeb; color: #92400e; border-bottom: 1px solid #fcd34d; }
.fui-banner.error { background: #fef2f2; color: #991b1b; border-bottom: 1px solid #fca5a5; }

.fui-banner-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fui-banner-icon {
  font-size: 1.25rem;
}

.fui-banner-message {
  font-weight: 500;
  font-size: 0.875rem;
}

.fui-banner-description {
  font-size: 0.875rem;
  opacity: 0.8;
}

.fui-banner-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.6;
  padding: 0;
  line-height: 1;
}

.fui-banner-close:hover { opacity: 1; }

.fui-aria-live-region {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.fui-demo-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.fui-demo-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.fui-demo-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.fui-demo-button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
}

.fui-demo-button:hover {
  background: #f3f4f6;
}

.fui-demo-button.primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.fui-demo-button.primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.fui-demo-button.danger {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.fui-demo-button.danger:hover {
  background: #dc2626;
  border-color: #dc2626;
}

.fui-demo-status {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.75rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.fui-demo-empty-container {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  margin-top: 1rem;
  min-height: 250px;
}
`

function ensureStylesInjected() {
  const styleId = 'feedback-ui-styles'
  if (typeof document === 'undefined') return
  if (document.getElementById(styleId)) return
  
  const styleElement = document.createElement('style')
  styleElement.id = styleId
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}

function Spinner({ size = 'medium', animated = true }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  ensureStylesInjected()
  
  const animationClass = animated
    ? (prefersReducedMotion ? 'reduced-motion' : 'animated')
    : 'no-motion'
  
  return (
    <div
      className={`fui-spinner ${size} ${animationClass}`}
      role="status"
      aria-label="Loading"
    />
  )
}

function LocalLoader({ isLoading, text = '加载中...', children }) {
  ensureStylesInjected()
  
  if (!isLoading) {
    return children || null
  }
  
  return (
    <div className="fui-local-loader" role="alert" aria-live="polite">
      <Spinner size="large" />
      {text && <div className="fui-local-loader-text">{text}</div>}
    </div>
  )
}

function GlobalOverlay({ isLoading, text = '请稍候...', showCount = false, count = 0 }) {
  ensureStylesInjected()
  
  if (!isLoading) {
    return null
  }
  
  return (
    <div className="fui-global-overlay" role="dialog" aria-modal="true" aria-label="全局加载中">
      <div className="fui-global-overlay-content">
        <Spinner size="large" />
        <div className="fui-global-overlay-text">
          {text}
          {showCount && count > 0 && <span> ({count} 个任务)</span>}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  type,
  title,
  description,
  icon,
  primaryAction,
  primaryActionLabel,
  secondaryAction,
  secondaryActionLabel,
  customText = {},
}) {
  ensureStylesInjected()
  
  const textResult = getEmptyStateText(type, customText)
  const finalTitle = title || (textResult.success ? textResult.title : '无内容')
  const finalDescription = description || (textResult.success ? textResult.description : '')
  
  const icons = {
    [EMPTY_STATE_TYPES.NO_DATA]: '📭',
    [EMPTY_STATE_TYPES.NO_RESULTS]: '🔍',
    [EMPTY_STATE_TYPES.NO_PERMISSION]: '🔒',
    [EMPTY_STATE_TYPES.OFFLINE]: '📡',
  }
  
  const finalIcon = icon || icons[type] || '📭'
  
  return (
    <div className="fui-empty-state" role="status" aria-live="polite">
      <div className="fui-empty-state-icon" aria-hidden="true">{finalIcon}</div>
      <h3 className="fui-empty-state-title">{finalTitle}</h3>
      {finalDescription && (
        <p className="fui-empty-state-description">{finalDescription}</p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="fui-empty-state-actions">
          {primaryAction && (
            <button
              className="fui-empty-state-action primary"
              onClick={primaryAction}
            >
              {primaryActionLabel || (textResult.success ? textResult.action : '操作')}
            </button>
          )}
          {secondaryAction && (
            <button
              className="fui-empty-state-action secondary"
              onClick={secondaryAction}
            >
              {secondaryActionLabel || '取消'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Toast({ notification, onClose, onAction }) {
  ensureStylesInjected()
  
  const { id, message, description, severity, action, actionLabel, autoDismiss, duration } = notification
  const timerRef = useRef(null)
  
  useEffect(() => {
    if (!autoDismiss) return
    
    if (!timerRef.current) {
      timerRef.current = createVisibilityAwareTimer()
    }
    
    const handleTimeout = () => {
      if (onClose) onClose(id)
    }
    
    timerRef.current.start(handleTimeout, duration)
    
    return () => {
      if (timerRef.current) {
        timerRef.current.stop()
      }
    }
  }, [id, autoDismiss, duration, onClose])
  
  return (
    <div className={`fui-toast ${severity}`} role="alert" aria-live={severity === NOTIFICATION_SEVERITY.ERROR ? ARIA_LIVE_ASSERTIVE : ARIA_LIVE_POLITE}>
      <div className="fui-toast-header">
        <span className="fui-toast-message">{message}</span>
        <button className="fui-toast-close" onClick={() => onClose && onClose(id)} aria-label="关闭">
          ×
        </button>
      </div>
      {description && <div className="fui-toast-description">{description}</div>}
      {action && (
        <div className="fui-toast-actions">
          <button className="fui-toast-action" onClick={() => onAction && onAction(id, action)}>
            {actionLabel || '操作'}
          </button>
        </div>
      )}
    </div>
  )
}

function ToastContainer({ toasts, onClose, onAction }) {
  ensureStylesInjected()
  
  if (!toasts || toasts.length === 0) {
    return null
  }
  
  return (
    <div className="fui-toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          notification={toast}
          onClose={onClose}
          onAction={onAction}
        />
      ))}
    </div>
  )
}

function Banner({ notification, onClose }) {
  ensureStylesInjected()
  
  const { id, message, description, severity, autoDismiss, duration } = notification
  const timerRef = useRef(null)
  
  const icons = {
    [NOTIFICATION_SEVERITY.SUCCESS]: '✅',
    [NOTIFICATION_SEVERITY.INFO]: 'ℹ️',
    [NOTIFICATION_SEVERITY.WARNING]: '⚠️',
    [NOTIFICATION_SEVERITY.ERROR]: '❌',
  }
  
  useEffect(() => {
    if (!autoDismiss) return
    
    if (!timerRef.current) {
      timerRef.current = createVisibilityAwareTimer()
    }
    
    const handleTimeout = () => {
      if (onClose) onClose(id)
    }
    
    timerRef.current.start(handleTimeout, duration)
    
    return () => {
      if (timerRef.current) {
        timerRef.current.stop()
      }
    }
  }, [id, autoDismiss, duration, onClose])
  
  return (
    <div className={`fui-banner ${severity}`} role="alert" aria-live={severity === NOTIFICATION_SEVERITY.ERROR ? ARIA_LIVE_ASSERTIVE : ARIA_LIVE_POLITE}>
      <div className="fui-banner-content">
        <span className="fui-banner-icon" aria-hidden="true">{icons[severity] || 'ℹ️'}</span>
        <div>
          <span className="fui-banner-message">{message}</span>
          {description && <span className="fui-banner-description"> - {description}</span>}
        </div>
      </div>
      <button className="fui-banner-close" onClick={() => onClose && onClose(id)} aria-label="关闭">
        ×
      </button>
    </div>
  )
}

function BannerContainer({ banners, onClose }) {
  ensureStylesInjected()
  
  if (!banners || banners.length === 0) {
    return null
  }
  
  return (
    <div className="fui-banner-container">
      {banners.map((banner) => (
        <Banner
          key={banner.id}
          notification={banner}
          onClose={onClose}
        />
      ))}
    </div>
  )
}

function AriaLiveRegion({ polite = '', assertive = '' }) {
  ensureStylesInjected()
  
  return (
    <>
      <div
        className="fui-aria-live-region"
        aria-live="polite"
        aria-atomic="true"
      >
        {polite}
      </div>
      <div
        className="fui-aria-live-region"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertive}
      </div>
    </>
  )
}

export {
  Spinner,
  LocalLoader,
  GlobalOverlay,
  EmptyState,
  Toast,
  ToastContainer,
  Banner,
  BannerContainer,
  AriaLiveRegion,
  ensureStylesInjected,
}
