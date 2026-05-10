import { Link } from 'react-router-dom'
import { tools } from '../data/tools'

export default function HomePage() {
  return (
    <div className="page home-page">
      <header className="site-header">
        <h1 className="site-title">开发者工具</h1>
        <p className="site-intro">
          选择下方工具进入对应页面（功能逐步实现中）。
        </p>
      </header>

      <ul className="tool-grid" aria-label="工具列表">
        {tools.map((tool) => (
          <li key={tool.id}>
            <Link className="tool-card" to={`/tools/${tool.id}`}>
              <span className="tool-title">
                <span className="tool-title-id">{tool.id}</span>
                <span className="tool-title-name">. {tool.name}</span>
              </span>
              <span className="tool-summary">{tool.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
