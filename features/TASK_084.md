### 任务目标
- 状态机驱动的 OTP/短信场景：实现 `Idle`→`Sending`→`Cooldown`→`ResendReady`→`Locked` 等迁移，支持可配置冷却秒数、最大发送次数、滑动时间窗内次数上限（令牌桶简化版）；所有迁移条件与副作用在逻辑层表驱动并可导出为 Mermaid/JSON 供 UI 展示。
- 频率限制 UX：冷却环状进度、剩余秒数可读格式、到达上限后的「联系支持」文案槽位；防连点（发送中禁用）、键盘可达性、屏幕阅读器 `aria-live` 区域；支持「模拟网络失败」与「模拟 429」示例按钮以验证重试文案与退避显示。
- 多通道并行：同一页面可挂载「短信」「邮件 OTP」「TOTP 备用」三卡片共享全局速率配置或独立计数器；逻辑层 `createRateLimiter(config)` 返回 `{ tryConsume(), getSnapshot(), subscribe() }`。
- 时间与同步：使用单调时钟 `performance.now()` 计算剩余冷却，处理标签页休眠后的跳变校正；`document.visibilitychange` 时刷新展示；所有公共方法中文注释。
- 单测：覆盖冷却边界（最后一秒进位）、跨窗简单版本（可选 `BroadcastChannel` 若不可用则跳过并文档说明）、令牌桶耗尽恢复；快照 schema 带版本字段。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/otp-sms-rate-limit-ui/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/otp-sms-rate-limit-ui/logic/`
- 测试文件夹：`devtools-web/src/platform/otp-sms-rate-limit-ui/__tests__/`
### API 信息
- 无真实短信网关；发送动作为 `Promise` 模拟，延迟与失败率可配置。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/otp-sms-rate-limit-ui/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 状态机与限流语义可逐条验收；页面可演示成功、失败、429、耗尽锁定；单测覆盖迁移表、冷却进位、桶算法；无障碍属性可通过手工检查清单在 DOC 勾选。
