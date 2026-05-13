import { Link } from 'react-router-dom'
import { findSuggestions } from './logic/index.js'

export default function NotFoundPage({
  path = '',
  toolId = '',
  availableIds = [],
}) {
  const suggestions = toolId
    ? findSuggestions(toolId, availableIds, { maxSuggestions: 5 })
    : []

  return (
    <div className="empty-state" role="region" aria-label="页面未找到">
      <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h2 className="empty-state-title">
        {toolId ? `工具 "${toolId}" 不存在` : '页面未找到'}
      </h2>
      <p className="empty-state-text">
        {path ? `请求的路径 "${path}" 无法找到。` : '您访问的页面不存在。'}
      </p>
      <Link to="/" className="empty-state-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        返回首页
      </Link>

      {suggestions.length > 0 && (
        <div style={{ marginTop: 24, width: '100%' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            您可能想找：
          </p>
          <ul className="suggestions-list" aria-label="建议的工具">
            {suggestions.map((s) => (
              <li key={s.id}>
                <Link to={`/tools/${s.id}`}>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{s.id}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ({Math.round(s.similarity * 100)}% 相似)
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
