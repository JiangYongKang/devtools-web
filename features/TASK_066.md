### 任务目标
- 实现可取消的轮询封装：`poll(fn, { intervalMs, jitterRatio, maxAttempts, isImmediate, signal })`，`fn` 返回 `{ done: boolean, value?: T }` 或 `Promise` 同形；支持「退避乘子」在连续失败后拉长间隔（上/下界 clamp）；所有计时器在 `signal` abort 时清理，最终 Promise 状态须为 `AbortError` 与稳定 `errorCode` 区分。
- 重试封装：对异步工厂 `operation` 支持 `retry({ retries, delayMs, backoffFactor, maxDelayMs, retryOn })`，`retryOn` 可基于 `Error`/`HTTP status`/自定义谓词；与 048 任务指数序列对齐时在 DOC 引用公式差异（本任务须自包含实现，不得 import `exponential-backoff-calculator` 工具目录）。
- 演示页与示例：模拟接口成功率滑块、展示每次尝试时间线（表格）、一键「注入 503 + Retry-After」观察退避；组合示例：「轮询直到拿到 `done` 或超时」；展示与 057 `HttpClient` 拦截器合并时如何避免重复 `setTimeout`（逻辑层导出 `disposable` 句柄）。
- 可观测性：导出 `getActivePolls()` 调试快照（仅开发模式或显式开关启用），生产默认关闭；快照须 O(1) 数量上界防泄漏。
- 边界：`intervalMs` 为 0 或 `NaN` 拒绝；`visibilityState` 为 `hidden` 时暂停轮询（可配置）；`Date.now` 回拨检测与单调时钟降级（`performance.now` 相对偏移）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/poll-retry-backoff/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/poll-retry-backoff/logic/`
- 测试文件夹：`devtools-web/src/platform/poll-retry-backoff/__tests__/`
### API 信息
- 演示 `fetch` 使用内存 mock 或可控 `Promise`；无强制后端。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/poll-retry-backoff/` 目录内文件；不得修改其他任务目录。
### 验收标准
- 任务目标五条均可演示；单测覆盖 jitter 分布边界、abort、visibility 暂停、Retry-After 解析、重试耗尽。
