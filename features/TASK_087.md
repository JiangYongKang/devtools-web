### 任务目标
- 高频日志管线：模拟或接入本地生成器产生 ≥200 行/秒文本流；实现环形缓冲（可配容量）、按级别/正则/子字符串过滤器、反向时间轴「暂停跟随」与「跳转到最新」；CPU 预算内合并渲染（`requestAnimationFrame` 批处理）。
- 折叠与结构化：检测 JSON 行与 stack trace 多行折叠规则；点击行展开子行；支持「仅显示错误相邻 ±N 行上下文」；ANSI 颜色码解析为安全 span（禁止 innerHTML 直灌）。
- 采样策略：可切换「头部固定保留」「均匀采样」「智能保留错误与首尾」；采样变更时 UI 明示信息损失率；导出当前视图为 `.txt`。
- 高亮：关键字高亮、正则高亮、时间戳列对齐；大文件搜索用 Worker 或分片主线程搜索并可 `AbortSignal` 取消。
- 纯逻辑测试：`ringBufferPushPop`、`ansiTokenize`、`samplingPolicy(lines, cfg)` 全覆盖边界；所有方法中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/high-throughput-log-stream-panel/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/high-throughput-log-stream-panel/logic/`
- 测试文件夹：`devtools-web/src/platform/high-throughput-log-stream-panel/__tests__/`
### API 信息
- 无远端日志；可使用 `ReadableStream` 模拟或 `setInterval` 生成器，须可关闭。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/high-throughput-log-stream-panel/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 高频下 UI 仍可操作（DOC 给目标 FPS）；折叠/采样/过滤可组合使用；单测覆盖 ANSI、环形缓冲重写、采样信息率计算；示例一键生成错误风暴与 JSON 交错流。
