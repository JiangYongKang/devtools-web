import { lazy, Suspense } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getToolById } from '../data/tools'

const IMPLEMENTED_TOOLS = {
  '001': lazy(() => import('../components/TimestampConverter.jsx')),
  '002': lazy(() => import('../components/JsonTool.jsx')),
  '003': lazy(() => import('../components/XmlTool.jsx')),
  '004': lazy(() => import('../components/UrlTool.jsx')),
  '005': lazy(() => import('../tools/base64/Base64Tool.jsx')),
  '006': lazy(() => import('../tools/digest/DigestTool.jsx')),
  '007': lazy(() => import('../tools/uuid/UUIDTool.jsx')),
  '008': lazy(() => import('../tools/regex/RegexTool.jsx')),
  '009': lazy(() => import('../tools/html/HtmlTool.jsx')),
  '010': lazy(() => import('../tools/css/CSSTool.jsx')),
  '011': lazy(() => import('../tools/task011/JsTool.jsx')),
  '012': lazy(() => import('../tools/task012/CronTool.jsx')),
  '013': lazy(() => import('../tools/task013/ColorTool.jsx')),
  '014': lazy(() => import('../tools/task014/JwtTool.jsx')),
  '015': lazy(() => import('../tools/task015/QRTool.jsx')),
  '016': lazy(() => import('../tools/task016/DiffTool.jsx')),
  '017': lazy(() => import('../tools/markdown-safe-preview/MarkdownSafePreviewTool.jsx')),
  '018': lazy(() => import('../tools/task018/SqlFormatterTool.jsx')),
  '019': lazy(() => import('../tools/task019/YamlJsonTool.jsx')),
  '020': lazy(() => import('../tools/base-radix-converter/BaseRadixConverterTool.jsx')),
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
