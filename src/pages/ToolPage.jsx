import { lazy, Suspense } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getToolById } from '../data/tools'

const IMPLEMENTED_TOOLS = {
  '151': lazy(() =>
    import('../tools/ansible-playbook-preview/AnsiblePlaybookPreviewTool.jsx'),
  ),
}

function ToolContent({ toolId }) {
  const ToolComponent = IMPLEMENTED_TOOLS[toolId]

  if (!ToolComponent) {
    return (
      <p className="placeholder-note">该工具页面尚未实现，后续将在此处提供交互。</p>
    )
  }

  return (
    <Suspense fallback={<div className="loading-placeholder">加载中...</div>}>
      <ToolComponent />
    </Suspense>
  )
}

export default function ToolPage() {
  const { toolId } = useParams()
  const tool = getToolById(toolId ?? '')

  if (!tool) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="page tool-page">
      <nav className="breadcrumb" aria-label="层级导航">
        <div className="breadcrumb-left">
          <Link to="/">首页</Link>
          <span className="sep" aria-hidden="true">
            /
          </span>
          <span className="current">{tool.name}</span>
        </div>
        <div className="breadcrumb-right">
          <Link className="back-link" to="/">
            返回首页
          </Link>
        </div>
      </nav>

      <article className="tool-detail">
        <header className="tool-header">
          <h1>{tool.name}</h1>
        </header>
        <p className="tool-summary-text">{tool.summary}</p>
        <ToolContent toolId={tool.id} />
      </article>
    </div>
  )
}
