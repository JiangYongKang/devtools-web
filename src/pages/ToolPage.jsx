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
  '021': lazy(() => import('../tools/shell-escape-reference/ShellEscapeReferenceTool.jsx')),
  '022': lazy(() => import('../tools/unicode-codepoint-explorer/UnicodeCodepointExplorerTool.jsx')),
  '023': lazy(() => import('../tools/string-metrics-counter/StringMetricsCounterTool.jsx')),
  '024': lazy(() => import('../tools/ipv4-subnet-calculator/IPv4SubnetCalculatorTool.jsx')),
  '025': lazy(() => import('../tools/cidr-range-parser/CIDRRangeParserTool.jsx')),
  '026': lazy(() => import('../tools/user-agent-inspector/UserAgentInspectorTool.jsx')),
  '027': lazy(() => import('../tools/http-request-playground/HttpRequestPlaygroundTool.jsx')),
  '028': lazy(() => import('../tools/websocket-playground/WebSocketPlaygroundTool.jsx')),
  '029': lazy(() => import('../tools/webhook-debug-receiver/WebhookDebugReceiver.jsx')),
  '030': lazy(() => import('../tools/graphql-query-formatter/GraphQLQueryFormatterTool.jsx')),
  '031': lazy(() => import('../tools/hex-text-converter/HexTextConverterTool.jsx')),
  '032': lazy(() => import('../tools/pem-certificate-viewer/PemCertificateViewerTool.jsx')),
  '033': lazy(() => import('../tools/symmetric-crypto-demo/SymmetricCryptoDemoTool.jsx')),
  '034': lazy(() => import('../tools/password-generator/PasswordGeneratorTool.jsx')),
  '035': lazy(() => import('../tools/lorem-ipsum-generator/LoremIpsumGeneratorTool.jsx')),
  '036': lazy(() => import('../tools/log-field-extractor/LogFieldExtractorTool.jsx')),
  '037': lazy(() => import('../tools/csv-table-transform/CsvTableTransformTool.jsx')),
  '038': lazy(() => import('../tools/json-syntax-check/JsonSyntaxCheckTool.jsx')),
  '039': lazy(() => import('../tools/env-key-parser/EnvKeyParserTool.jsx')),
  '040': lazy(() => import('../tools/gitignore-pattern-explainer/GitignorePatternExplainerTool.jsx')),
  '041': lazy(() => import('../tools/semver-compare-sort/SemverCompareSortTool.jsx')),
  '042': lazy(() => import('../tools/changelog-draft-builder/ChangelogDraftBuilderTool.jsx')),
  '043': lazy(() => import('../tools/safe-url-path-joiner/SafeUrlPathJoinerTool.jsx')),
  '044': lazy(() => import('../tools/idn-punycode-converter/IdnPunycodeConverterTool.jsx')),
  '045': lazy(() => import('../tools/extension-mime-lookup/ExtensionMimeLookupTool.jsx')),
  '046': lazy(() => import('../tools/identifier-case-converter/IdentifierCaseConverterTool.jsx')),
  '047': lazy(() => import('../tools/filepath-normalizer/FilepathNormalizerTool.jsx')),
  '048': lazy(() => import('../tools/exponential-backoff-calculator/ExponentialBackoffCalculatorTool.jsx')),
  '049': lazy(() => import('../tools/rest-mock-rules-draft/RestMockRulesDraftTool.jsx')),
  '050': lazy(() => import('../tools/data-unit-converter/DataUnitConverterTool.jsx')),
  '051': lazy(() => import('../platform/app-shell/AppShellDemo.jsx')),
  '052': lazy(() => import('../platform/tool-workbench/ToolWorkbench.jsx')),
  '053': lazy(() => import('../platform/theme-system/ThemeSystem.jsx')),
  '054': lazy(() => import('../platform/preference-persistence/PreferencePersistenceDemo.jsx')),
  '055': lazy(() => import('../platform/clipboard-bridge/ClipboardBridgeTool.jsx')),
  '056': lazy(() => import('../tools/download-helper/DownloadHelperTool.jsx')),
  '057': lazy(() => import('../platform/http-client/HttpClientDemo.jsx')),
  '058': lazy(() => import('../platform/feedback-ui/FeedbackUITool.jsx')),
  '059': lazy(() => import('../platform/error-recovery/ErrorRecoveryDemo.jsx')),
  '060': lazy(() => import('../platform/route-sync/RouteSyncDemo.jsx')),
  '061': lazy(() => import('../platform/feature-remote-config/FeatureRemoteConfigDemo.jsx')),
  '062': lazy(() => import('../platform/request-correlation/RequestCorrelationDemo.jsx')),
  '063': lazy(() => import('../platform/form-query-sync/FormQuerySyncDemo.jsx')),
  '064': lazy(() => import('../platform/error-message-mapper/ErrorMessageMapperDemo.jsx')),
  '065': lazy(() => import('../platform/large-content-performance/LargeContentPerformanceDemo.jsx')),
  '066': lazy(() => import('../platform/poll-retry-backoff/PollRetryBackoffDemo.jsx')),
  '067': lazy(() => import('../platform/file-upload-surface/FileUploadSurface.jsx')),
  '068': lazy(() => import('../platform/i18n-kit/I18nKitDemo.jsx')),
  '069': lazy(() => import('../platform/safe-rich-text/SafeRichTextDemo.jsx')),
  '070': lazy(() => import('../platform/sensitive-input-mask/SensitiveInputMask.jsx')),
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
