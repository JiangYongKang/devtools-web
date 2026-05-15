### 任务目标
- 脏检测模型：`createDirtyScope({ hashFn })` 跟踪表单/JSON 文档与初始快照差异；支持深度相等与「忽略路径集合」；导出 `markClean()`、`reset()`、`subscribe`。
- `beforeunload`：仅在「用户真实编辑后」注册一次性提示；区分「程序化导航」与「用户点击链接」场景（通过自定义路由包装示例）；对未捕获错误不误标脏。
- SPA 路由守卫：提供 `Prompt` 式组件或 headless hook 示例，在哈希路由与 History API 两模式下拦截（本目录内最小路由器实现即可）；支持「保存并离开」「丢弃」「留在当前页」三按钮文案可配置。
- 无障碍与多标签：可选 `localStorage` 租约锁提示另一标签已编辑；`aria-modal` 对话框示例。
- 单测：`hashFn` 稳定性、忽略路径、从脏到净的边沿；不依赖浏览器事件的纯逻辑全覆盖；所有方法中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/dirty-route-leave-guard/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/dirty-route-leave-guard/logic/`
- 测试文件夹：`devtools-web/src/platform/dirty-route-leave-guard/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/dirty-route-leave-guard/` 目录内文件；不得修改站点真实路由器配置目录（集成步骤写 DOC）。
### 验收标准
- 页面可演示脏检测、`beforeunload`、对话框拦截三条路径；单测覆盖 diff 与状态机；程序化导航不弹窗的行为有断言。
