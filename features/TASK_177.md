### 任务目标
- 连接：通过 WebSocket 连接用户指定 MQTT Broker（ws/wss，含路径）；支持用户名密码、Client ID、TLS 说明；连接/断开/重连状态机与 last error 展示；禁止硬编码生产凭据。
- 发布订阅：主题 publish（JSON/文本/hex payload）、subscribe/unsubscribe；QoS 0/1/2 选择与消息 ID 跟踪；retain 标志与 retained 消息捕获；Will/LWT 配置表单并在断线时演示（连接测试 broker 或本地 mock）。
- 主题引擎：实现 `+`/`#` 通配符匹配与订阅树可视化；过滤实时消息流；按主题/ QoS 统计吞吐（条/秒滑动窗口）。
- 调试辅助：MQTT 报文类型摘要（CONNECT/PUBLISH/SUBACK 等）十六进制可选；会话持久 clean session 对比说明；示例主题与 payload 剧本。
- 单测：覆盖主题匹配、QoS 状态转移表、payload 编解码；所有纯函数中文注释（网络层 mock）。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/mqtt-topic-debug-client/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/mqtt-topic-debug-client/logic/`
- 测试文件夹：`devtools-web/src/tools/mqtt-topic-debug-client/__tests__/`
### API 信息
- MQTT over WebSocket；须处理认证失败、CONNACK 拒绝码、心跳超时、CORS/wss 证书错误。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/mqtt-topic-debug-client/` 目录内文件；不得修改 WebSocket 测试（任务 028）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 连接、发布订阅、QoS/retain/will、通配符树与消息流均可演示；单测覆盖主题匹配与 QoS 表；示例可用。
