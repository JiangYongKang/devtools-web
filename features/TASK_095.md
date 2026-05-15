### 任务目标
- 健康检查配置：支持多条目 `target`（绝对 URL）、方法、`expectedStatus` 集合、`maxLatencyMs`、`insecureDevOk` 标记；分组与标签；导入/导出 JSON。
- 探测执行：并行扇出受全局并发上限约束；`AbortController` 超时；收集 TTFB、总耗时、HTTP/网络/CORS 错误分类；连续失败熔断与半开恢复策略可配置。
- UI：表格 +  sparkline（最近 N 次样本环形缓冲）；详情抽屉展示响应头子集（`server-timing` 若有）；一键「全部探测」与定时轮询（页签不可见时降频）。
- 安全：默认禁止 `file://` 与非 http(s)；CSP 与混合内容风险提示卡片；所有网络辅助函数中文注释。
- 单测：对 `classifyError`、`aggregateLatency`、`circuitBreaker` 纯逻辑表驱动测试；使用 `fetch` mock（不发起真实网络）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/service-health-ping-dashboard/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/service-health-ping-dashboard/logic/`
- 测试文件夹：`devtools-web/src/platform/service-health-ping-dashboard/__tests__/`
### API 信息
- 用户配置的 HTTP(S) 端点；须处理 CORS 失败为预期分类之一；不得存储凭证明文。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/service-health-ping-dashboard/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 多目标并行与熔断可演示；单测覆盖错误分类与半开恢复；页面在 CORS 失败时展示可读解释而非空白。
