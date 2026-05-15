### 任务目标
- 网络画像：组合 `navigator.onLine`、`navigator.connection`（若存在）、最近 RTT 估计（对可配置健康检查 URL 的 `HEAD`/`no-cors` ping 或 `fetch` 预检失败分类）、`visibilityState` 与「用户上次交互距今」信号，输出离散态 `Online`/`Offline`/`Degraded` 与置信度。
- 请求队列 UI：实现内存队列 `enqueue(requestSpec)`，在离线或 degraded 时自动排队，恢复在线后按优先级与去重键重放；每条展示状态机、重试次数、下一次退避时间；支持用户手动取消单条或清空。
- 背压与持久化策略：声明「默认不落盘」与可选 `localStorage` 快照（大小上限、敏感头脱敏）；并发回放上限与「仅 Wi‑Fi 下回放」伪策略（基于 `connection.saveData` 提示）。
- 示例：`fetch` 打桩或指向公共只读端点（可配置关闭）演示成功/失败/排队；一键模拟离线（`dispatchEvent(new Event('offline'))`）与抖动网络（交替延迟）。
- 单测：纯函数 `classifyNetwork(snapshot)`、`scheduleReplay(backoffPolicy)` 的表驱动测试；所有方法中文注释；无 DOM 依赖。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/network-resilience-request-queue-ui/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/network-resilience-request-queue-ui/logic/`
- 测试文件夹：`devtools-web/src/platform/network-resilience-request-queue-ui/__tests__/`
### API 信息
- 可选对可配置 URL 发起真实轻量请求；须默认关闭或指向项目自有静态资源说明；CORS 失败须归类为「观测失败」非应用错误。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/network-resilience-request-queue-ui/` 目录内文件；不得修改全局 HTTP 客户端封装其它任务目录。
### 验收标准
- 三态网络与队列回放可演示；单测覆盖状态分类、退避、去重键；持久化若实现须通过单测校验脱敏与上限丢弃策略。
