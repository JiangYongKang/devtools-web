### 任务目标
- PKCE 参数：生成 `code_verifier`（43～128 字符随机）与 `code_challenge`（S256/plain 可选）；展示 Base64URL 编码步骤；支持手动粘贴 verifier 反算 challenge 校验。
- 授权 URL：编辑 client_id、redirect_uri、scope、state、authorization_endpoint；组装授权码模式 URL 并高亮 query 参数；state/nonce 随机生成与复制。
- 回调解析：粘贴 redirect 回调 URL 或 query 字符串，提取 code、state、error、error_description；state 与发起值比对结果；缺失 code 时的错误分支说明。
- Token 交换草稿：根据 code_verifier 生成 token 请求 body（application/x-www-form-urlencoded）与 fetch 模板；说明须在后端或可信环境完成 client_secret 交换（前端仅演示 public client PKCE）。
- 单测：覆盖 verifier 长度校验、S256 challenge 计算、回调 query 解析、state 比对；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/oauth2-pkce-flow-simulator/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/oauth2-pkce-flow-simulator/logic/`
- 测试文件夹：`devtools-web/src/tools/oauth2-pkce-flow-simulator/__tests__/`
### API 信息
- 无自动外呼授权服务器；token 交换仅为静态模板，不发送含 secret 的真实请求。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/oauth2-pkce-flow-simulator/` 目录内文件；不得修改 OAuth OIDC 浏览器壳（072）或其它认证任务目录。
### 验收标准
- PKCE 生成、授权 URL、回调解析与 token 草稿均可演示；单测覆盖 S256 与 state 校验；内置完整 flow 示例可一键填充。
