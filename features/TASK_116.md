### 任务目标
- SSE 连接：输入 EventSource URL（可带 query）；建立连接并流式展示 event（id、event 类型、data、retry）；连接状态机（connecting/open/closed/error）与重连次数计数；CORS 与 mixed content 错误友好说明。
- 断线重连：支持 Last-Event-ID 请求头续传演示（UI 展示将发送的头）；用户可配置重连间隔与最大重试；手动断开与清缓冲。
- 事件过滤：按 event 类型多选过滤；关键字搜索 data  payload；统计各类型条数与最近 N 条延迟（client 接收时间戳 - 可选 server 时间字段）。
- 模拟源：内置本地 Mock EventSource（定时推送 heartbeat、notification、error 类型）无需外网即可演示；可选连接用户提供的公开 SSE 测试端点（须 UI 声明 CORS 风险）。
- 单测：覆盖 SSE 行解析（data/id/event/retry 多行合并）、过滤逻辑、Mock 调度；所有纯函数中文注释；DOM 相关连接逻辑可集成测试或手工验收说明。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/sse-client-playground/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/sse-client-playground/logic/`
- 测试文件夹：`devtools-web/src/tools/sse-client-playground/__tests__/`
### API 信息
- 用户自选 SSE URL；默认不硬编码第三方密钥；Mock 模式无网络。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/sse-client-playground/` 目录内文件；不得修改 WebSocket Playground 其它任务目录。
### 验收标准
- Mock 流式接收、类型过滤、Last-Event-ID 头展示均可演示；单测覆盖 SSE 帧解析；连接失败与 CORS 有说明。
