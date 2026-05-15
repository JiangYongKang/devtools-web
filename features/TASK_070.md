### 任务目标
- 敏感输入控件族：密码/令牌/恢复码字段默认遮罩（`type=password` 或自定义圆点渲染）；「短暂显示明文」按住或点击切换，自动恢复计时器（可配 3～15s）、在 `visibilitychange` 为 `hidden` 时立即恢复遮罩；支持粘贴检测与「粘贴后全选遮罩」动画（无真实密码落日志）。
- 复制与导出控制：一键复制须二次确认并仅在用户手势内调用剪贴板 API；禁止将值写入 `localStorage`（与 054 对齐：检测尝试写入敏感键名模式时拒绝并 `errorCode`）；提供「可记忆长度」元数据（仅长度与熵估算，不存原文）。
- 演示页与示例：多字段表单、不同 `autoReveal` 策略、模拟屏幕录制风险提示 banner；展示键盘快捷键（如 `Ctrl+Shift+L`）可关闭；提供 OWASP 口令强度提示（仅 zxcvbn 类启发式自包含轻量实现或纯规则集，禁止引入未审计的大型 wasm 除非 DOC 说明供应链）。
- 与任务 055 衔接：剪贴板写入路径须走「消毒+长度上限」包装函数（本任务逻辑层实现，不修改 clipboard-bridge）；读取剪贴板填充敏感框时默认不触发 `change` 事件链式校验泄漏（页内说明）。
- 边界：`autocomplete` 与浏览器密码管理器交互说明；IME 组合输入期间不误触 reveal；无障碍：`aria-pressed` 与 live 区域不朗读完整秘密（仅状态变化）；色弱模式下遮罩与边框对比度满足与 053 令牌衔接时的最小对比建议（页内文案）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/sensitive-input-mask/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/sensitive-input-mask/logic/`
- 测试文件夹：`devtools-web/src/platform/sensitive-input-mask/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/sensitive-input-mask/` 目录内文件；不得修改 `clipboard-bridge`、`preference-persistence` 等其它任务目录。
### 验收标准
- 任务目标五条均可演示；单测覆盖 reveal 计时器重置、hidden 恢复、长度熵元数据、敏感键写入拒绝、剪贴板包装长度截断。
