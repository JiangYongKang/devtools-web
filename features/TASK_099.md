### 任务目标
- 策略对象：实现 `createHttpClientPolicy({ baseTimeout, perAttemptTimeout, retries, retryOnStatuses, retryAfterHeader, cancelInherited, jitter })` 返回包装函数 `policyFetch(input, init)`，与原生 `fetch` 签名对齐；支持 `AbortController` 树（外层取消取消重试链）。
- 重试语义：仅对幂等方法默认重试或显式 `X-Idempotency-Key` 头时允许 POST 重试；尊重 `Retry-After` 秒与 HTTP-date；指数退避 + 全抖动；记录每次尝试 trace id。
- 可观测性：钩子 `onAttempt`/`onRetryDecision` 供 UI 展示时间线；错误归一化 `TimeoutError`、`AbortError`、`HttpError`、`NetworkError`。
- UI：配置面板 + 实时时间线 +「制造超时/429/随机重置」示例端点（内存 mock server 于 Worker 或主线程）。
- 单测：使用假 `fetch` 序列验证次数、退避上限、`Retry-After` 解析、取消后无额外调用；所有方法中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/outbound-http-resilience-policy/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/outbound-http-resilience-policy/logic/`
- 测试文件夹：`devtools-web/src/platform/outbound-http-resilience-policy/__tests__/`
### API 信息
- 默认不触网；示例 mock 可模拟响应头与延迟。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/outbound-http-resilience-policy/` 目录内文件；不得修改既有 HTTP 客户端目录实现（对接写 DOC）。
### 验收标准
- 策略面板驱动 mock 可演示成功、重试成功、耗尽失败、用户取消；单测覆盖幂等与 Retry-After；时间线事件数与尝试次数一致。
