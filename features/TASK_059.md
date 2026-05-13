### 任务目标
- 实现 React 错误边界组件：捕获渲染期异常，展示可折叠的技术摘要（组件栈、生产环境隐藏源码路径规则）、一键复制诊断包（含 `userAgent`、路由、时间戳，逻辑层组装 JSON）、「重试渲染」「返回首页」与「清空本地草稿」（若与任务 054 键名对齐则在 DOC 说明协作方式）操作。
- 全局 `unhandledrejection` 与 `error` 事件监听封装：去抖聚合重复信息、忽略已标记处理的 `reason`、将 `event.error` 映射为用户可读 `errorCode`；在开发模式可与现有 dev overlay 共存但不得重复弹窗（通过单例锁实现）。
- 提供演示页与示例：子组件内「抛出同步错误」「在 `useEffect` 异步抛出」「在事件处理器抛出」三类按钮，验证边界捕获范围与未捕获路径差异；示例 Promise 拒绝带 `DOMException` 与自定义对象两种形态。
- 与 Source Map 策略弱耦合：诊断包内仅包含 `buildId` 占位符与环境变量读取接口，不内嵌 map；对 CSP 限制下无法加载外链脚本的失败给出 inline 说明。
- 边界：错误 UI 自身渲染失败时的二次降级（极简文本）；防止死循环（同错指纹 60s 内最多上报 N 次，逻辑层实现指纹与计数）；禁止将完整用户输入回传至第三方日志（若留扩展点，默认关闭）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/error-recovery/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/error-recovery/logic/`
- 测试文件夹：`devtools-web/src/platform/error-recovery/__tests__/`
### API 信息
- 无 HTTP；若未来上报至采集端，TASK 仅定义 POST JSON 形状与超时，本迭代用内存收集器演示。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/error-recovery/` 目录内文件；不得修改其他任务工具目录；不得全局改写 `console.error` 默认行为（可追加监听但须可移除）。
### 验收标准
- 任务目标五条均可演示；二次降级与指纹限流可通过单测或可控计时器替身验证。
- 单测覆盖诊断包序列化、错误指纹、事件监听器注册/卸载、`errorCode` 映射表。
