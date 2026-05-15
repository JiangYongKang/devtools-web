### 任务目标
- 交付 OAuth2/OIDC 浏览器端「壳层」演示：支持授权码 + PKCE（`S256`）完整参数表生成（`code_verifier`/`code_challenge`/`state`/`nonce`/`scope`），`state` 与 `nonce` 使用 `crypto.getRandomValues` 派生并仅存 `sessionStorage` 键名可配；展示授权 URL 构造、回调页查询参数解析、与「后端令牌端点」的契约说明区（入参字段表、成功/失败 JSON 形状、HTTP 状态约定），本任务前端不保存 `refresh_token` 于 `localStorage`（仅内存态或显式「登录后清空」按钮）。
- 回调页抽象：独立路由视图解析 `code`/`error`/`error_description`，校验 `state` 一致性（时序窗口与一次性消费标记）；错误分支映射到统一 `OAuthUiError` 码（`state_mismatch`、`missing_code`、`canceled` 等）并给出可操作的恢复建议；成功分支仅展示「可交换 code 的提示」与模拟 `POST` 载荷预览（不发起真实令牌请求，除非 TASK 后文 API 区声明的 mock 基址存在）。
- 发现与元数据：可选粘贴 OIDC `/.well-known/openid-configuration` JSON，逻辑层解析 `authorization_endpoint`、`token_endpoint`、`response_types_supported`、`code_challenge_methods_supported` 并高亮与本壳层不兼容项；对 `response_mode`、`prompt`、`max_age` 等高级参数提供受控表单与校验（拒绝换行与非法字符）。
- 示例与开发者体验：一键填充「虚构 IdP」样例配置（域名占位、client_id 演示值）；展示「重放攻击防护检查表」；提供「复制授权 URL」「复制 cURL 令牌交换模板」(模板内 `client_secret` 占位符须标红说明仅服务端使用)。
- 边界：iframe 内嵌登录禁止提示；`sessionStorage` 不可用时的内存降级与刷新丢失警告；CORS 预检差异说明；内容安全策略下禁止内联脚本的声明；无障碍：表单控件与错误摘要 `aria-live` 区域。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/oauth-oidc-browser-shell/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/oauth-oidc-browser-shell/logic/`
- 测试文件夹：`devtools-web/src/platform/oauth-oidc-browser-shell/__tests__/`
### API 信息
- 令牌交换为可选 mock：`POST /mock/token` 仅当环境变量或运行时配置显式开启时由页面调用，请求体与响应字段须在页面「契约」区列出；默认关闭网络，纯解析与展示。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/oauth-oidc-browser-shell/` 目录内文件；不得修改其它任务目录；不得引入真实第三方登录 SDK 或硬编码真实 client_secret。
### 验收标准
- 任务目标五条均可演示或单测；单测覆盖 PKCE 向量、`state` 校验、well-known 解析失败降级、错误码映射表完整性；验收时核对「不默认落盘 refresh_token」与 mock 开关默认关闭。
