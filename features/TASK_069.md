### 任务目标
- 安全富文本展示管线：默认「纯文本转义」模式；可选「白名单标签子集」模式（标签/属性/URL scheme 表在逻辑层集中，含 `rel`/`target` 自动补全规则）；禁止 `style` 属性与 `on*` 事件属性；所有 URL 经 `URL` 解析，仅允许 `http:`/`https:`/`mailto:`/`data:image/png;base64,`（长度上界）可配。
- 消毒与诊断：输入 HTML 字符串输出 `{ safeHtml, strippedTags[], strippedAttrs[], errors[] }`；对未知标签策略「剔除整节点 vs 仅 unwrap 子文本」可配置；提供与常见 XSS 向量（`svg onload`、`javascript:`、`data:text/html`）对应的单测向量文件（不含完整 exploit 二进制，仅短字符串）。
- 演示页与示例：双栏对照「原始 / 安全渲染 iframe sandbox」；一键载入 OWASP 常见样本子集；展示「降级为纯文本」开关与原因列表；支持复制消毒后 HTML 源码（转义展示区与可切换 raw）。
- 与任务 017/055 对齐：若复用 sanitize 思路须在本文档声明与 `markdown-safe-preview`、`clipboard-bridge` 的差异表，实现仍须限制在本任务目录内自包含，不得修改上述目录。
- 边界：`DOMParser` 不可用时的纯字符串 tokenizer 降级（功能子集须在 TASK 列明）；超大 HTML 字节阈值拒绝；`template`/`form` 标签默认剔除；CSP `nonce` 不由本任务生成（页内说明由宿主注入）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/safe-rich-text/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/safe-rich-text/logic/`
- 测试文件夹：`devtools-web/src/platform/safe-rich-text/__tests__/`
### API 信息
- 无 HTTP；远程策略包若存在则走 JSON schema，同 061 拒绝 `eval`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/safe-rich-text/` 目录内文件；不得修改 `markdown-safe-preview`、`clipboard-bridge` 等其它任务目录。
### 验收标准
- 任务目标五条均可演示；单测覆盖白名单、URL 拒绝、剥离诊断、大小拒绝、降级解析器。
