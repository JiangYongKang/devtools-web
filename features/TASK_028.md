### 任务目标
- 在浏览器内使用 `WebSocket` 建立连接：可配置 `URL`、子协议列表、`binaryType`、连接/断连/重连（带最大重试与节流说明）、发送区支持文本与二进制（通过 base64 或 `File` 字节视图等明确方案并在 UI 注释）、消息时间线展示（方向、类型、长度、可折叠 payload）。
- 提供心跳辅助：可编辑心跳间隔与 heartbeat 文本/binary 模板、展示 RTT 估算、示例一键填入 echo 服务说明与本地 `ws://` 风险提示；支持清空时间线、导出为 JSON、按关键词过滤与高亮。
- 对 `onclose` 代码与原因、`onerror`、握手失败、超时未连上、发送队列在 `CONNECTING`/`CLOSING` 态的拒绝等均映射到可读 `errorCode` 与恢复建议；明示混合内容（https 页打开 `ws:`）被浏览器拦截的常见情形。
- 页面卸载或用户主动中断时关闭 socket 与定时器；大块消息分片显示与性能策略；用户输入与接收内容以安全方式展示（二进制以 hex 并排，不执行脚本）。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/websocket-playground/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/websocket-playground/logic/`
- 测试文件夹：`devtools-web/src/tools/websocket-playground/__tests__/`
### API 信息
- 直接消费浏览器 `WebSocket`；无自有 HTTP 接口。逻辑层负责状态机与消息归一化数据结构，单测不建立真实 socket（可测纯函数与 mock 事件处理器契约）。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/websocket-playground/` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标四条在可用 `wss`/`ws` 靶场下可手工验证；心跳与过滤导出可用。
- 纯逻辑单测覆盖状态迁移、消息条目序列化、关闭码解释表与错误映射。
