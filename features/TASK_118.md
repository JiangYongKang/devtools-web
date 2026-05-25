### 任务目标
- 响应头解析：粘贴 HTTP 响应头文本或 JSON 对象，提取 Retry-After（秒/HTTP-date）、X-RateLimit-Limit/Remaining/Reset、RateLimit-* 草案头；未知字段保留原始键值表。
- 重试时间线：根据 Retry-After 与客户端「收到响应时刻」计算最早可重试 UTC/本地时间；Remaining 归零时标注 hard stop；Reset 为 Unix 秒或 ISO 日期双格式解析。
- 配额可视化：剩余配额进度条（remaining/limit）；多窗口策略说明（固定窗口/滑动窗口常见模式文档，模拟器采用用户可选模型）；429 响应体可选粘贴展示。
- 策略建议：生成指数退避 + Respect Retry-After 的伪代码时间线（不执行请求）；导出 Markdown 摘要供值班记录。
- 单测：覆盖 Retry-After 双格式、X-RateLimit-Reset 秒/毫秒启发式、remaining 百分比、非法日期 fallback；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/rate-limit-header-parser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/rate-limit-header-parser/logic/`
- 测试文件夹：`devtools-web/src/tools/rate-limit-header-parser/__tests__/`
### API 信息
- 无外部 API；仅解析用户粘贴的响应头，不调用被限流服务。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/rate-limit-header-parser/` 目录内文件；不得修改指数退避计算器或 HTTP 客户端其它任务目录。
### 验收标准
- 头字段解析、重试时间线、配额进度条均可演示；单测覆盖 Retry-After 与 Reset；内置 GitHub/通用 429 样例头一键填充可用。
