### 任务目标
- JWT 解析：粘贴 JWT 字符串，拆分 header/payload/signature 三段 Base64URL 解码；JSON 格式化展示；malformed token 定位至段序号与解码错误。
- JWKS 导入：粘贴 JWKS JSON 或单 JWK，按 `kid`/`alg` 匹配验签密钥；RSA/EC/OKP 公钥导入 Web Crypto 或展示 n/e/crv/x/y 摘要；无匹配 kid 时列出可用键。
- 签名验证：选择 alg（RS256/ES256/HS256 等支持子集），用 JWKS 或对称 secret（HS 仅演示用途）验证 signature；输出 valid/invalid 与失败原因（alg 不匹配、exp 过期等可选 claims 规则）。
- Claims 规则：可配置 exp/nbf/iss/aud 校验与 clock skew 秒数；违规 claims 列表；不验证时仅解码展示。
- 单测：覆盖 Base64URL 解码、JWKS 键选择、HS256/RS256 验签 mock、exp+skew 判定；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/jwt-signature-verifier-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/jwt-signature-verifier-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/jwt-signature-verifier-workbench/__tests__/`
### API 信息
- 无自动外呼 JWKS URI；远程密钥须用户粘贴；禁止在页面持久化生产 secret。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/jwt-signature-verifier-workbench/` 目录内文件；不得修改 JWT 载荷解码（014）或其它认证任务目录。
### 验收标准
- 三段解析、JWKS 验签、claims+skew 规则均可演示；单测覆盖解码与 exp 校验；RS256/HS256 样例 JWT 一键填充可用。
