const DIRECTIVE_CATEGORIES = {
  FETCH: 'fetch',
  DOCUMENT: 'document',
  NAVIGATION: 'navigation',
  REPORTING: 'reporting',
  OTHER: 'other',
}

const STANDARD_DIRECTIVES = {
  'default-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '默认加载策略' },
  'script-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: 'JavaScript 源' },
  'script-src-elem': { category: DIRECTIVE_CATEGORIES.FETCH, description: '脚本元素源' },
  'script-src-attr': { category: DIRECTIVE_CATEGORIES.FETCH, description: '脚本属性源' },
  'style-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '样式表源' },
  'style-src-elem': { category: DIRECTIVE_CATEGORIES.FETCH, description: '样式元素源' },
  'style-src-attr': { category: DIRECTIVE_CATEGORIES.FETCH, description: '样式属性源' },
  'img-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '图像源' },
  'font-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '字体源' },
  'connect-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '连接源 (XHR, WebSocket)' },
  'media-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '媒体源 (audio, video)' },
  'object-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '插件源 (object, embed)' },
  'frame-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '框架源' },
  'child-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '子上下文源 (iframe, worker)' },
  'worker-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: 'Worker 源' },
  'manifest-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: 'Manifest 源' },
  'prefetch-src': { category: DIRECTIVE_CATEGORIES.FETCH, description: '预加载源' },
  'form-action': { category: DIRECTIVE_CATEGORIES.NAVIGATION, description: '表单提交目标' },
  'frame-ancestors': { category: DIRECTIVE_CATEGORIES.NAVIGATION, description: '父框架源' },
  'base-uri': { category: DIRECTIVE_CATEGORIES.DOCUMENT, description: 'base 标签 URI' },
  'sandbox': { category: DIRECTIVE_CATEGORIES.DOCUMENT, description: '沙箱限制' },
  'report-uri': { category: DIRECTIVE_CATEGORIES.REPORTING, description: '违规报告 URI (遗留)' },
  'report-to': { category: DIRECTIVE_CATEGORIES.REPORTING, description: '违规报告目标 (Reporting API)' },
  'upgrade-insecure-requests': { category: DIRECTIVE_CATEGORIES.OTHER, description: '升级 HTTP 请求为 HTTPS' },
  'block-all-mixed-content': { category: DIRECTIVE_CATEGORIES.OTHER, description: '阻止混合内容' },
  'require-trusted-types-for': { category: DIRECTIVE_CATEGORIES.OTHER, description: '要求可信类型' },
  'trusted-types': { category: DIRECTIVE_CATEGORIES.OTHER, description: '可信类型策略' },
}

const SPECIAL_SOURCES = {
  "'none'": { description: '不允许任何源' },
  "'self'": { description: '允许同源' },
  "'unsafe-inline'": { description: '允许内联脚本/样式' },
  "'unsafe-eval'": { description: '允许 eval() 等动态代码执行' },
  "'unsafe-hashes'": { description: '允许事件处理器中的哈希' },
  "'strict-dynamic'": { description: '信任已加载脚本加载的脚本' },
  "'report-sample'": { description: '在报告中包含违规样本' },
}

const SCHEME_SOURCES = [
  'http:',
  'https:',
  'data:',
  'blob:',
  'filesystem:',
  'mediastream:',
  'ws:',
  'wss:',
]

const CONFLICT_RULES = [
  {
    type: 'coverage',
    directives: ['script-src', 'default-src'],
    severity: 'warning',
    message: 'script-src 会覆盖 default-src 对脚本的控制，两者同时存在时脚本以 script-src 为准',
  },
  {
    type: 'coverage',
    directives: ['style-src', 'default-src'],
    severity: 'warning',
    message: 'style-src 会覆盖 default-src 对样式的控制，两者同时存在时样式以 style-src 为准',
  },
  {
    type: 'coverage',
    directives: ['img-src', 'default-src'],
    severity: 'warning',
    message: 'img-src 会覆盖 default-src 对图像的控制，两者同时存在时图像以 img-src 为准',
  },
  {
    type: 'coverage',
    directives: ['frame-src', 'child-src', 'default-src'],
    severity: 'warning',
    message: 'frame-src 优先级高于 child-src，child-src 优先级高于 default-src',
  },
  {
    type: 'mutex',
    directives: ['upgrade-insecure-requests', 'block-all-mixed-content'],
    severity: 'info',
    message: 'upgrade-insecure-requests 会先尝试升级请求，block-all-mixed-content 会直接阻止，建议只使用其中一个',
  },
  {
    type: 'replacement',
    directives: ['child-src', 'worker-src'],
    severity: 'info',
    message: 'worker-src 是 CSP Level 3 中用于替代 child-src 对 Worker 控制的更精确指令',
  },
  {
    type: 'replacement',
    directives: ['report-uri', 'report-to'],
    severity: 'info',
    message: 'report-to 是 Reporting API 的新标准，report-uri 是遗留标准，建议同时提供以兼容旧浏览器',
  },
]

const HASH_ALGORITHMS = ['sha256', 'sha384', 'sha512']

const EXAMPLE_POLICIES = {
  strict: {
    name: '严格策略 (推荐)',
    policy: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  },
  legacy: {
    name: '兼容策略 (宽松)',
    policy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
  },
  reportOnly: {
    name: '仅报告策略',
    policy: "default-src 'self'; script-src 'nonce-abc123' 'strict-dynamic'; style-src 'self'; img-src 'self'; report-uri /csp-report; report-to csp-endpoint",
  },
}

const SANDBOX_FLAGS = [
  'allow-forms',
  'allow-same-origin',
  'allow-scripts',
  'allow-popups',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-presentation',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
]

export {
  DIRECTIVE_CATEGORIES,
  STANDARD_DIRECTIVES,
  SPECIAL_SOURCES,
  SCHEME_SOURCES,
  CONFLICT_RULES,
  HASH_ALGORITHMS,
  EXAMPLE_POLICIES,
  SANDBOX_FLAGS,
}
