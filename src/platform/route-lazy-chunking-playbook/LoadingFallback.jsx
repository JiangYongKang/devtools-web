export function LoadingFallback({ toolName, size = 'large' }) {
  const spinnerSize = size === 'large' ? 40 : 24

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: size === 'large' ? '60px 20px' : '20px',
      minHeight: size === 'large' ? '200px' : 'auto',
    }}>
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `3px solid #e9ecef`,
          borderTop: `3px solid #228be6`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      {toolName && (
        <p style={{
          marginTop: '16px',
          color: '#495057',
          fontSize: size === 'large' ? '16px' : '14px',
        }}>
          正在加载 {toolName}...
        </p>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default LoadingFallback
