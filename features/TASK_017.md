### 任务目标
1. 提供 Markdown 输入与即时预览界面，实现编辑内容的实时渲染展示。
2. 在前端本地实现 Markdown 预览与安全策略展示，输出预览结果和安全策略信息。
3. 对空输入、超长输入和净化失败等情况给出可读提示，并保留安全降级语义。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/markdown-safe-preview/`（Markdown 输入区、预览区、安全提示区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/markdown-safe-preview/logic/`（参数组装、净化说明映射、策略信息映射）。
- 测试文件夹：`devtools-web/src/tools/markdown-safe-preview/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 输入参数：`markdownSource`。
- 输出字段：`sourceSummary`、`previewHtml`、`securityPolicyVersion`、`sanitizationNotes`、`sourceLength`、`renderedLength`、`policyVersion`、`maxSourceLength`、`allowedProtocols`。
- 错误约定：处理并展示 `NULL_INPUT`、`SOURCE_EMPTY`、`SOURCE_TOO_LARGE`、`SANITIZATION_FAILED`、`INVALID_PARAMETER`。
### 任务约束
- 当前任务只允许读取和修改 `markdown-safe-preview` 目录下文件，不可读取、不可修改其他任务编号目录。
- 页面必须使用前端安全渲染与净化策略，不得放宽为不安全渲染模式。
### 验收标准
- 输入 Markdown 后可实时展示预览结果与净化说明。
- 错误时给出可读反馈，并保留安全降级提示。
- 纯 JS 函数单测通过，覆盖说明映射与错误文案映射。
