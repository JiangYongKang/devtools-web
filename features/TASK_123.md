### 任务目标
- 注册流程：分步展示 WebAuthn registration：RP ID、user.id/name、challenge（Base64URL）、pubKeyCredParams、authenticatorSelection；生成 `navigator.credentials.create()` 选项 JSON 预览；浏览器不支持时的 capability 检测说明。
- 断言流程：展示 authentication 选项（allowCredentials、userVerification）；`get()` 选项 JSON 预览；可选触发真实 ceremony（须 HTTPS/localhost）并解析返回的 clientDataJSON/attestationObject 外层字段。
- 字段摘要：解码 clientDataJSON（type、challenge、origin、crossOrigin）；CBOR attestationObject 外层 parse 为 authData 摘要（rpIdHash、flags、signCount、credentialId、公钥 COSE 关键字段）；不实现完整 attestation 证书链验证。
- 示例与说明：内置 passkey 注册/登录选项模板一键填充；常见错误（InvalidStateError、NotAllowedError）对照表；RP ID 与 effective domain 关系文档面板。
- 单测：覆盖 clientDataJSON 解析、authData 固定头解析、Base64URL 辅助、选项 JSON 校验；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/webauthn-fido2-explainer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/webauthn-fido2-explainer/logic/`
- 测试文件夹：`devtools-web/src/tools/webauthn-fido2-explainer/__tests__/`
### API 信息
- 真实 WebAuthn 调用依赖用户浏览器与本地环境；无后端 RP 模拟服务器。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/webauthn-fido2-explainer/` 目录内文件；不得修改 OAuth PKCE 或其它认证任务目录。
### 验收标准
- 注册/断言选项预览、clientDataJSON 与 authData 摘要均可演示；单测覆盖解析函数；capability 与 RP ID 说明在页面可见。
