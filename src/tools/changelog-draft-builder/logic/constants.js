const ITEM_TYPES = [
  { id: 'feat', label: 'feat', labelEn: 'Features', icon: '✨', description: '新功能' },
  { id: 'fix', label: 'fix', labelEn: 'Bug Fixes', icon: '🐛', description: 'Bug 修复' },
  { id: 'BREAKING', label: 'BREAKING', labelEn: 'BREAKING CHANGES', icon: '⚠️', description: '破坏性变更' },
  { id: 'refactor', label: 'refactor', labelEn: 'Refactor', icon: '♻️', description: '重构' },
  { id: 'perf', label: 'perf', labelEn: 'Performance', icon: '⚡', description: '性能优化' },
  { id: 'docs', label: 'docs', labelEn: 'Documentation', icon: '📝', description: '文档更新' },
  { id: 'style', label: 'style', labelEn: 'Styles', icon: '🎨', description: '样式调整' },
  { id: 'test', label: 'test', labelEn: 'Tests', icon: '🧪', description: '测试相关' },
  { id: 'ci', label: 'ci', labelEn: 'CI/CD', icon: '🔧', description: 'CI/CD 相关' },
  { id: 'chore', label: 'chore', labelEn: 'Chore', icon: '🔨', description: '构建/工具链' },
  { id: 'other', label: 'other', labelEn: 'Other', icon: '📌', description: '其他变更' },
]

const TYPE_ORDER = [
  'BREAKING', 'feat', 'fix', 'refactor', 'perf', 
  'docs', 'style', 'test', 'ci', 'chore', 'other'
]

const DATE_FORMATS = [
  { id: 'iso', label: 'ISO (YYYY-MM-DD)', formatFn: (d) => d.toISOString().split('T')[0] },
  { id: 'local', label: '本地短日期', formatFn: (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }},
  { id: 'timestamp', label: '时间戳 (ms)', formatFn: (d) => String(d.getTime()) },
  { id: 'timestamp_sec', label: '时间戳 (s)', formatFn: (d) => String(Math.floor(d.getTime() / 1000)) },
]

const MISSING_PLACEHOLDER_STRATEGIES = [
  { id: 'empty', label: '留空', description: '未填充的占位符将被替换为空字符串' },
  { id: 'tbd', label: '写 TBD', description: '未填充的占位符将被替换为 TBD' },
  { id: 'error', label: '标红错误', description: '未填充的占位符将标红并触发错误' },
]

const TEMPLATES = {
  keepachangelog: {
    id: 'keepachangelog',
    name: 'Keep a Changelog 风格',
    description: '符合 keepachangelog.com 规范的 Markdown 格式',
    template: `# Changelog

所有显著的变更将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

## [{{version}}] - {{date}}

{{sections}}

[{{version}}]: https://github.com/.../compare/v0.0.0...v{{version}}`,
  },
  simple_list: {
    id: 'simple_list',
    name: '简单日期列表',
    description: '简洁的按日期分组的变更列表',
    template: `# Changelog - {{version}}

发布日期: {{date}}

{{items}}`,
  },
  conventional_commits: {
    id: 'conventional_commits',
    name: 'Conventional Commits 聚合',
    description: '按 Conventional Commits 类型聚合的预览',
    template: `## {{version}} ({{date}})

{{sections}}`,
  },
  detailed: {
    id: 'detailed',
    name: '详细中英文双语',
    description: '包含中英文双语和 Scope 的详细格式',
    template: `# 版本 {{version}} - {{date}}

## 变更说明 / What's Changed

{{sections}}`,
  },
}

const ITEM_LINE_FORMAT = {
  keepachangelog: '{{scope}} {{content}} ({{issue}})',
  simple_list: '{{content}}{{issue}}',
  conventional_commits: '{{type}}{{scope}}: {{content}}',
  detailed: '{{content}} ({{scope}}) [{{issue}}]',
}

const PLACEHOLDER_DOCS = [
  { name: '{{version}}', description: '版本号，遵循 SemVer 规范' },
  { name: '{{date}}', description: '发布日期，支持多种格式' },
  { name: '{{sections}}', description: '按类型分组的所有变更内容' },
  { name: '{{items}}', description: '扁平化的所有变更条目列表' },
  { name: '{{type}}', description: '条目类型 (feat/fix/BREAKING 等)' },
  { name: '{{scope}}', description: '条目的 Scope' },
  { name: '{{content}}', description: '条目的主要内容' },
  { name: '{{issue}}', description: '关联的 Issue/PR 号' },
  { name: '{{index}}', description: '条目的序号（自动编号）' },
  { name: '{{content_en}}', description: '英文内容（双语时）' },
]

const COMMIT_EXTRACT_RULES = `## Commit 提取规则

本工具尝试从粘贴的 commit 文本中智能提取条目，规则如下：

### Conventional Commits 格式
\`type(scope)!: subject\`

- **type**: feat, fix, refactor, perf, docs, style, test, ci, chore
- **scope**: 可选，括号内的范围
- **!**: 可选，表示 BREAKING CHANGE
- **subject**: 提交信息

### 示例
- \`feat(api): add user authentication\` → 类型: feat, Scope: api
- \`fix(ui)!: fix login button layout\` → 类型: BREAKING, Scope: ui
- \`docs: update README\` → 类型: docs
- 无法识别的格式 → 类型: other，整段作为内容
`

const ISSUE_LINK_TEMPLATES = {
  github: {
    id: 'github',
    name: 'GitHub',
    template: '[#{{issue}}](https://github.com/org/repo/issues/{{issue}})',
  },
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    template: '[#{{issue}}](https://gitlab.com/org/repo/-/issues/{{issue}})',
  },
  jira: {
    id: 'jira',
    name: 'JIRA',
    template: '[{{issue}}](https://jira.example.com/browse/{{issue}})',
  },
  custom: {
    id: 'custom',
    name: '自定义',
    template: '#{{issue}}',
  },
}

export {
    COMMIT_EXTRACT_RULES, DATE_FORMATS, ISSUE_LINK_TEMPLATES, ITEM_LINE_FORMAT, ITEM_TYPES, MISSING_PLACEHOLDER_STRATEGIES, PLACEHOLDER_DOCS, TEMPLATES, TYPE_ORDER
}

