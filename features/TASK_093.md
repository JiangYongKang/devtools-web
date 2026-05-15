### 任务目标
- 通用并发池：实现 `createPool({ concurrency, taskTimeout })`，支持异步任务入队、`priority`、`signal` 取消、任务标签用于 UI；溢出策略 `block`/`drop-oldest`/`reject` 可配置；池级 metrics（运行中、等待、完成、超时、丢弃计数）。
- Worker 适配：同 API 驱动 `Worker` 任务包装（`postMessage` 往返带 id）、主线程降级；展示「CPU 密集 vs IO 密集」两组示例任务（质数筛选 / 延迟 fetch 打桩）。
- 背压可视化：实时条形图与事件日志；支持动态调并发（下一 tick 生效）与「排空队列」操作；所有对外方法中文注释。
- 公平性：可选「每来源令牌」限流，防止单用户霸占池；单测使用虚拟时钟或短 Promise 验证顺序与超时抢占。
- 示例：一键提交 N 个任务观察尾延迟；演示取消正在运行与取消排队任务差异。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/bounded-concurrency-task-queue/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/bounded-concurrency-task-queue/logic/`
- 测试文件夹：`devtools-web/src/platform/bounded-concurrency-task-queue/__tests__/`
### API 信息
- 示例 `fetch` 可为内存 mock，不依赖外网。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/bounded-concurrency-task-queue/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 并发上限与三种溢出策略可验收；取消与超时无悬挂 Promise（单测断言）；Worker 不可用时主线程路径仍通过单测与页面演示。
