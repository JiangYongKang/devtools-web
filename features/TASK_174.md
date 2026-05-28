### 任务目标
- 证书链解析：粘贴 PEM 证书链或上传 `.crt`/`.pem`（仅本地读取），解析 X.509 DER：Subject/Issuer、Serial、SKI/AKI、有效期（notBefore/notAfter）、签名算法 OID、公钥类型与长度、SAN/CN 列表。
- 时间线：多证书链按树形展示签发关系；剩余有效期进度条；已过期/即将过期（<30 天）分级警告；时钟 skew 容忍配置（分钟）。
- 弱点检测：标记 SHA-1 签名、RSA <2048、EC 曲线弱参数、缺失 SAN 的 CN-only、wildcard 过度匹配风险；TLS 版本与 cipher suite 列表（若粘贴 SSLLabs 风格文本）映射为弱 cipher 提示。
- 校验辅助：issuer/subject 匹配链完整性；basicConstraints CA:true 判定；keyUsage/digitalSignature 摘要；导出 PEM 顺序修复建议文本（不私钥上传）。
- 示例：内置「Let's Encrypt 三件套」「自签过期」「弱 SHA-1」三组 PEM；单测覆盖 ASN.1/Time 解析子集、链构建、弱点规则；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/tls-certificate-chain-inspector/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/tls-certificate-chain-inspector/logic/`
- 测试文件夹：`devtools-web/src/tools/tls-certificate-chain-inspector/__tests__/`
### API 信息
- 无外部 API；可选 Web Crypto `importKey` 仅用于 SPKI 长度探测，不上传文件。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/tls-certificate-chain-inspector/` 目录内文件；不得修改 PEM 证书摘要（任务 032）目录。
- 开发与验证：禁止为验证小改动反复执行全量打包、构建或端到端测试；`npm run build`、`npm test`、全量 lint 等同一会话内至多执行一次。
- 若首次执行失败，通过阅读报错与当前任务目录内单测定位修复，不得「改一行再跑打包碰运气」；优先依靠本任务纯 JS 单测与页面手工验证。
### 验收标准
- 链解析、时间线、弱点规则、SAN/CN 展示均可演示；单测覆盖解析与规则引擎；示例可用。
