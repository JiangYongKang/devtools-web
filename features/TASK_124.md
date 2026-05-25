### 任务目标
- 断言解码：粘贴 SAML 2.0 Response/Assertion Base64 或 DEFLATE 压缩 XML；解码为 XML 树；非法 Base64/XML 行列定位；XXE 禁用（字符串解析）。
- 核心字段：提取 Issuer、Subject NameID、Conditions（NotBefore/NotOnOrAfter/AudienceRestriction）、AuthnStatement SessionIndex；Signature 元素存在性摘要（不验证证书链）。
- 时效校验：以用户可调「当前时间」对比 NotBefore/NotOnOrAfter，输出 valid/expired/notYetValid；Audience 与期望 SP entity ID 比对。
- 示例与导出：内置 IdP 签发样例、过期断言、Audience 不匹配三组一键填充；Assertion XML 与字段 JSON 摘要复制/下载。
- 单测：覆盖 Base64/DEFLATE 双入口、Conditions 解析、时效判定、NameID 提取；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/saml-assertion-decoder/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/saml-assertion-decoder/logic/`
- 测试文件夹：`devtools-web/src/tools/saml-assertion-decoder/__tests__/`
### API 信息
- 无外部 API；禁止自动拉取 IdP metadata。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/saml-assertion-decoder/` 目录内文件；不得修改 SOAP/XML 其它任务目录。
### 验收标准
- 解码树、字段摘要、时效与 Audience 校验均可演示；单测覆盖 Conditions；三组示例可用。
