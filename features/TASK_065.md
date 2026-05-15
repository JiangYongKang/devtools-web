### 任务目标
- 交付大文本处理工具包：逻辑层导出「分片迭代器」（按 UTF-16 或 UTF-8 字节窗口可配）、防抖调度（leading/trailing 可配、`maxWait`）、以及「主线程 vs Web Worker」决策函数（基于字节阈值、当前 `hardwareConcurrency`、`SharedArrayBuffer` 可用性探测结果给出理由枚举）；页面演示对 1MB+ 生成字符串的性能对比表（`performance.now` 差分，页内声明不精确到微基准）。
- 长列表策略：虚拟列表高度缓存与 `overscan`、动态行高测量（二分查找锚点）、快速滚动时降采样渲染（`requestAnimationFrame` 合并）；提供「切换数据源规模」示例按钮（小/中/大数组）；大数据生成使用分帧 `scheduler.postTask` 或 `setTimeout(0)` 降级链。
- 示例与说明：内置 JSON 数组、日志行、表格行三类样本生成器；展示内存占用估算与「停止生成」取消令牌；Worker 内禁止 `DOM` 访问，通信协议为结构化克隆安全子集（`ArrayBuffer` 转移可选，须在 DOC 说明转移后主线程不可再读）。
- 与任务 052 衔接：导出 `attachLargeTextController(editorRef, options)` 的类型契约（本任务内最小 stub 实现或 noop+单测），明确 `options.onOverBudget` 回调；不得复制 `tool-workbench` 源码。
- 边界：`Worker` 构造失败、消息风暴（队列深度上界与合并策略）、`textEncoder.encode` 超大单次调用前的拒绝；`prefers-reduced-motion` 下关闭滚动惯性动画；SSR 仅导出纯函数子集。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/large-content-performance/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/large-content-performance/logic/`
- 测试文件夹：`devtools-web/src/platform/large-content-performance/__tests__/`
### API 信息
- 无 HTTP；若上报性能指标，仅预留 `reportSample` 空实现。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/large-content-performance/` 目录内文件；不得修改 `tool-workbench` 等其它任务目录。
### 验收标准
- 任务目标五条均可演示或单测；单测覆盖分片边界、防抖 `maxWait`、虚拟列表索引计算、Worker 协议版本字段。
