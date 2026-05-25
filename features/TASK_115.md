### 任务目标
- Envelope 解析：粘贴 SOAP 1.1/1.2 XML Envelope，解析 Header/Body 结构树；Body 首元素 QName 与文本摘要；非法 XML 行列定位；XXE 禁用（仅字符串解析，禁止外部实体）。
- WS-Security 摘要：识别 `wsse:Security` 下 UsernameToken、Timestamp、Signature 引用等常见子元素，字段表格展示（不验证签名有效性）；缺失命名空间前缀时提示绑定。
- WSDL/XSD 片段：可选第二栏粘贴 WSDL 或内联 XSD，提取 targetNamespace、message/portType/operation 与 body 元素 QName 对应关系；简单 XSD 类型校验（element 存在性、minOccurs）。
- 示例与导出：内置带 Header 的订单提交、Fault 响应、UsernameToken 三组一键填充；Body outerXML 复制；解析结果 JSON 摘要下载。
- 单测：覆盖 Envelope 命名空间、Fault 结构、WS-Security 字段提取、XXE 安全开关；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/soap-envelope-parser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/soap-envelope-parser/logic/`
- 测试文件夹：`devtools-web/src/tools/soap-envelope-parser/__tests__/`
### API 信息
- 无外部 API；禁止网络实体与 WSDL 自动下载。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/soap-envelope-parser/` 目录内文件；不得修改 XML XPath 查询其它任务目录。
### 验收标准
- Envelope 树、WS-Security 摘要、WSDL 片段 QName 映射均可验收；XXE 禁用可说明；单测覆盖 Fault 与 Security；示例可用。
