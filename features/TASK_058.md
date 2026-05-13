### 任务目标
- 统一全局加载态：支持并发计数或 `token` 式引用，避免多层请求导致闪烁；提供区域加载（`Suspense` 边界可选）与全屏遮罩两种模式；与 `prefers-reduced-motion` 协调（减少脉冲动画）；在逻辑层导出状态机转移表供单测。
- 空状态组件族：无数据、筛选无结果、权限不足、离线（结合 `navigator.onLine` 与 `online`/`offline` 事件）四类模板，支持插槽图标与主/次操作；空态文案从逻辑层字典生成以支持后续 i18n。
- 轻量通知：toast 队列（上限、合并相同 `id` 策略）、inline banner（可固定于顶栏下方）、severity 四档；`aria-live` 区域配置 polite/assertive 规则；自动消失计时器在页面隐藏时暂停（`document.visibilityState`）。
- 演示页与示例：一键触发并发加载叠加、一键触发离线空态、一键触发队列溢出合并；提供「错误通知带操作按钮（重试）」样例且重试须走防抖。
- 边界：同屏最大 toast 数、堆叠高度超出视口时的滚动策略；SSR 下通知容器挂载延迟不得导致 hydration mismatch（演示页使用 `useEffect` 后挂载模式并在 DOC 说明）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/feedback-ui/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/feedback-ui/logic/`
- 测试文件夹：`devtools-web/src/platform/feedback-ui/__tests__/`
### API 信息
- 无 HTTP；若通知内容来自服务器错误体，仅消费结构化 `{ code, message }`，在本任务以类型定义约束。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/feedback-ui/` 目录内文件；不得修改其他任务工具目录。
### 验收标准
- 任务目标五条均可通过演示页手工验收；无障碍角色在审查清单中勾选。
- 单测覆盖加载并发计数、toast 队列合并、离线检测包装、可见性暂停计时器纯逻辑。
