import { Link, useLocation } from 'react-router-dom'
import { highlightMatch } from './logic/index.js'

function ToolItem({ tool, searchQuery }) {
  const location = useLocation()
  const isActive = location.pathname === tool.path
  const titleHighlight = highlightMatch(tool.title, searchQuery)

  return (
    <li className="tool-item">
      <Link
        to={tool.path}
        className={`tool-link ${isActive ? 'active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="tool-item-id" aria-hidden="true">{tool.id}</span>
        <div className="tool-item-content">
          <div className="tool-item-title">
            {titleHighlight.parts.map((part, i) => (
              part.matched ? (
                <span key={i} className="highlight">{part.text}</span>
              ) : (
                <span key={i}>{part.text}</span>
              )
            ))}
          </div>
          {tool.summary && (
            <div className="tool-item-summary">{tool.summary}</div>
          )}
        </div>
        {tool.status && tool.status !== 'stable' && (
          <span className={`tool-status-badge ${tool.status}`}>{tool.status}</span>
        )}
      </Link>
    </li>
  )
}

export default function ToolList({ tools, searchQuery = '', totalCount, loadedCount }) {
  return (
    <nav aria-label="工具索引" className="sidebar-body" tabIndex={-1}>
      {tools.length > 0 ? (
        <>
          <ul className="tool-list" role="list">
            {tools.map((tool) => (
              <ToolItem key={tool.id} tool={tool} searchQuery={searchQuery} />
            ))}
          </ul>
          <div className="list-count" aria-live="polite">
            {loadedCount !== undefined && totalCount !== undefined
              ? `已加载 ${loadedCount} / ${totalCount} 个工具`
              : `共 ${tools.length} 个工具`}
          </div>
        </>
      ) : (
        <div className="empty-state" role="status">
          <p>没有找到匹配的工具</p>
        </div>
      )}
    </nav>
  )
}
