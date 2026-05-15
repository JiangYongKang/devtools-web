### 任务目标
- 实现 Webhook 签名「算法步骤可视化」页：至少覆盖 HMAC-SHA256（通用）、Stripe `v1` 头、`GitHub-SHA256` 三代入场景的规范化串拼接规则；逐步展示「原始 body 字节」「签名串模板」「十六进制/ Base64 输出」三栏 diff 式对照，并给出常数时间比较（`timingSafeEqual` 概念）在前端演示中的局限说明（浏览器无原生 API 时的纯教育文案）。
- 交互与可复制性：用户粘贴 body 文本、密钥（仅内存，页面卸载清空）、时间戳或 `id` 头字段，一键生成中间态；每步可复制片段；内置示例按钮（Stripe 样例头、GitHub delivery、Slack 旧版可选其一）填充可运行最小样例；禁止「保存密钥」与任何 `localStorage` 写入密钥字段。
- 逻辑层：导出 `buildWebhookSignatureSteps(provider, parts)` 返回步骤数组（`{ title, formula, valuePreview, encoding }`），`provider` 枚举可扩展；对 body 哈希与串拼接提供 UTF-8 字节预览开关（截断上界并提示）；支持「原始 body vs minified JSON」切换以演示常见签名校验失败根因。
- 安全与合规卡片：说明密钥不得出现在 URL query、日志聚合字段；重放窗口与 `timestamp` 容差校验伪代码；对「第三方密钥保管」显式写「本工具不承担」并链接至任务边界；防 XSS：所有用户输入仅在转义文本节点或代码高亮组件中展示。
- 边界：超大 body（如 >512KiB）拒绝在 UI 全量展开并提示使用文件哈希思路；Worker 可选用于 SHA 计算（与 071 能力探测结果联动仅在文案层建议，不跨目录引用代码）；无 Web Crypto 时降级为「步骤说明-only」模式并禁用生成按钮。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/webhook-signature-playbook/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/webhook-signature-playbook/logic/`
- 测试文件夹：`devtools-web/src/platform/webhook-signature-playbook/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/webhook-signature-playbook/` 目录内文件；不得修改其它任务目录；不得在仓库中提交含真实生产密钥的固定位样例。
### 验收标准
- 任务目标五条均可逐条核对；单测覆盖三种 provider 的拼接差异、UTF-8 边界、截断策略、空 body；页面示例按钮与「密钥不落盘」行为可通过手工与单测双重验收。
