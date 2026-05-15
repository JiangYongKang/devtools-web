### 任务目标
- 抽象「分享链接」模型：解析并归一化 `http(s)`、`mailto:`、`tel:`、自定义 scheme（可配置白名单）、含 fragment/query 的复杂 URL；输出 `{ canonical, displayHost, riskFlags[], openStrategy }`，对 punycode、IPv6 字面量、用户名密码嵌入、双斜杠畸形、控制字符给出分级风险与可复制修复建议。
- 展示与交互：表格或卡片列出原始串、规范化结果、主机、路径摘要、query 键数；支持「仅复制规范化」「复制带 UTM 剥离版本」「复制 Markdown 链接」；打开方式说明区分 `_blank`/`noopener`、桌面应用深链、移动端 universal link 限制（文案级，不真调起外部 App）。
- 短链与跳转语义（纯前端）：对已知短链域名列表（可配置 JSON）做「展开一层」的 HEAD/GET `fetch` 可选演示开关，默认关闭；开启时须 `AbortController`、超时、最大重定向次数、CORS 失败时的教育性说明；禁止自动跟踪用户剪贴板。
- 示例：内置 6+ 条构造样例（含 IDN、畸形端口、超长 query、OAuth `state` 仅展示哈希前缀）；示例按钮填充输入；所有解析函数中文注释。
- 边界：空输入、仅空白、超过长度上限的拒绝策略；国际化域名展示与 ASCII 形式并列；日志区不记录完整 token。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/share-link-renderer-playbook/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/share-link-renderer-playbook/logic/`
- 测试文件夹：`devtools-web/src/platform/share-link-renderer-playbook/__tests__/`
### API 信息
- 可选 `fetch` 用于用户显式开启的「短链展开」演示；须声明 CORS 限制非缺陷；超时与最大字节读取上限可配置。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/share-link-renderer-playbook/` 目录内文件；不得修改站点全局外链安全策略任务目录。
### 验收标准
- 五条目标均可验收；无网络模式下解析与复制功能仍完整；单测覆盖 punycode、畸形 URL、strip 规则、重定向计数递减逻辑；示例覆盖高风险 flag 与规范化差异。
