import React from 'react'

export class LazyRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy route loading failed:', error, errorInfo)
  }

  handleRetry = () => {
    const { onRetry } = this.props
    this.setState(
      (prev) => ({
        hasError: false,
        error: null,
        retryCount: prev.retryCount + 1,
      }),
      () => onRetry?.(this.state.retryCount)
    )
  }

  render() {
    const { hasError, error, retryCount } = this.state
    const { children, fallback, maxRetries = 3 } = this.props

    if (hasError) {
      if (retryCount < maxRetries) {
        return fallback || (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            background: '#fff5f5',
          }}>
            <h3 style={{ color: '#c92a2a', margin: '0 0 16px' }}>
              模块加载失败
            </h3>
            <p style={{ color: '#868e96', margin: '0 0 16px' }}>
              {error?.message || '网络连接异常，请重试'}
            </p>
            <p style={{ fontSize: '14px', color: '#adb5bd', margin: '0 0 16px' }}>
              重试次数: {retryCount} / {maxRetries}
            </p>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '10px 24px',
                background: '#228be6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              重新加载
            </button>
          </div>
        )
      }

      return fallback || (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          background: '#fff5f5',
        }}>
          <h3 style={{ color: '#c92a2a', margin: '0 0 16px' }}>
            加载失败
          </h3>
          <p style={{ color: '#868e96', margin: '0 0 16px' }}>
            已达到最大重试次数，请刷新页面或稍后再试
          </p>
          <p style={{ fontSize: '12px', color: '#adb5bd' }}>
            错误代码: {error?.code || 'UNKNOWN_ERROR'}
          </p>
        </div>
      )
    }

    return children
  }
}

export default LazyRouteErrorBoundary
