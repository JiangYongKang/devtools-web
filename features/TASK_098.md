### 任务目标
- 响应头解析：从 `fetch` 响应或用户粘贴的「状态行 + 头」文本解析 `Deprecation`、`Sunset`、`Link`（`rel="sunset"` / `deprecation`）、`Warning`、`Sunset-Date` 等非标准混用场景；归一化为 `DeprecationNotice` 结构（`effectiveAt`、`link`、`version`、`detail`）。
- 站内横幅：多级严重度（信息/警告/阻断）；支持 snooze 至会话结束或 N 分钟；多 API 聚合去重；与 CSP 兼容的内联样式或 CSS 变量主题。
- 开发者体验：展示「机器可读 + 人类可读」两列；复制 curl 复现模板；与任务 099 的策略对象对接钩子（类型契约在本目录定义）。
- 示例：内置三组模拟 `Headers` 对象（即将废弃、已废弃仍可用、已 sunset 硬失败）按钮注入。
- 单测：头解析各 RFC 子集与非法日期、多个 Link 逗号分隔；snooze 状态机；所有方法中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/http-deprecation-sunset-banner/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/http-deprecation-sunset-banner/logic/`
- 测试文件夹：`devtools-web/src/platform/http-deprecation-sunset-banner/__tests__/`
### API 信息
- 可选对用户指定 URL 发起单次 GET 以读取头（默认关闭）；不得跟随无限重定向。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/http-deprecation-sunset-banner/` 目录内文件；不得修改全局 HTTP 封装目录。
### 验收标准
- 解析与横幅交互可验收；单测覆盖日期解析与多 header 合并优先级；snooze 后重启会话行为有定义与测试。
