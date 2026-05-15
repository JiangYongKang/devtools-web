### 任务目标
- 实现请求关联标识注入：生成或透传 `X-Request-Id`（UUID v4 或 32 位 hex）、可选 `X-Session-Id`（来自逻辑层可插拔 `SessionProvider` 接口）、以及 `X-Trace-Parent` 风格 16+8+8 hex 占位（与 OpenTelemetry 兼容字段名可配）；同一用户手势触发的级联请求须可配置为共享 id 或派生子 span id（逻辑层导出派生算法与碰撞检测）。
- 客户端日志串联：内存环形缓冲（条数上界、单条 JSON 长度上界）记录「时间戳、级别、requestId、method、url 摘要（仅 origin+pathname+hash 剥离）、status、durationMs」；支持按 `requestId` 过滤导出为 NDJSON 下载；敏感 query（键名黑名单）不得落盘。
- 演示页与示例：一键发起串行三次 `fetch`（mock）观察 id 传递；演示「手动覆盖 Request-Id」与非法长度修正；展示与 057 拦截器组合的伪代码块（页面内只读，实现仍在逻辑层完成 `applyHeaders(init, context)`）。
- 与任务 058 衔接：提供 `emitLogForToast` 可选桥接类型，将 5xx 与 `NETWORK` 类错误以同一 `requestId` 推入通知元数据（本任务目录内用最小回调演示，不修改 feedback-ui 源码）。
- 边界：`window.crypto.randomUUID` 不可用时的降级；Worker 线程无 `window` 时的纯函数子集；禁止将完整 `Authorization` 写入日志缓冲；跨域预检失败时仍保证请求 id 在浏览器发起侧生成并可见于演示表。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/request-correlation/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/request-correlation/logic/`
- 测试文件夹：`devtools-web/src/platform/request-correlation/__tests__/`
### API 信息
- 无强制后端；若上报至采集端，TASK 约定 `POST /api/logs/batch` 数组元素含 `requestId`、`sessionId`、`entries`，401/413 须有 `errorCode`，本迭代以 mock `fetch` 单测。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/request-correlation/` 目录内文件；不得修改其他任务目录。
### 验收标准
- 任务目标五条均可演示或通过 mock 验证；单测覆盖 id 格式、派生、日志脱敏、环形缓冲溢出策略。
