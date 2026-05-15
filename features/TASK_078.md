### 任务目标
- 同页多面板轻量事件总线：实现类型安全的 `createPanelBus<TMap>()`，`TMap` 为事件名到载荷 schema 的映射；支持 `emit`/`on`/`once`/`off`、按通道命名空间隔离（如 `editor:*` vs `preview:*`）、错误处理器捕获订阅回调异常并标记故障订阅者 ID；提供 Dev-only 环形缓冲日志（最大条数、可导出 JSON）用于排查事件风暴。
- 背压与性能：实现同步 `emit` 与微任务队列 `emitAsync` 两模式；可选「合并窗口」对高频 `scroll`/`resize` 类事件按 key 去抖合并最后一次载荷；暴露 `getSubscriberCount` 与 `dispose()` 防止泄漏；页面演示左右三面板：A 改文本 → B 高亮 → C 计数，断链中间面板后验证其余面板仍一致。
- 与 SSR/热更新：总线在模块重载时提供 `hotDispose` 钩子示例（文档说明）；禁止在载荷中传递非结构化克隆类型（检测并在开发模式抛错）；Worker 不可用时仅在主线程运行，不假装跨线程。
- 示例与契约：一键载入「多面板 Markdown 编辑-预览-统计」最小样例（不依赖任务 017 代码，自包含于本目录）；展示 TypeScript 类型收窄示例与 `zod`/`valibot` 风格手写校验器（二选一轻量实现）对载荷运行时校验失败时的拒收策略。
- 边界：最大监听数 per 事件名限制与溢出策略（丢弃最旧 vs 拒绝新注册并提示）；循环 emit 检测（深度计数器阈值）；无障碍：总线无关但演示面板须保留语义标题；不得读写其它任务目录。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/cross-panel-event-bus/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/cross-panel-event-bus/logic/`
- 测试文件夹：`devtools-web/src/platform/cross-panel-event-bus/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/cross-panel-event-bus/` 目录内文件；不得修改其它任务目录；不得被全局单例自动挂载到 `window`（仅演示页显式创建）。
### 验收标准
- 任务目标五条均可验证；单测覆盖订阅泄漏 dispose、异常隔离、合并窗口、循环检测阈值、载荷校验失败路径；示例三面板联动可手工走通完整故事。
