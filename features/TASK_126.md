### 任务目标
- CSP 解析：粘贴 Content-Security-Policy 或 meta http-equiv 内容，解析为指令→源列表表；支持 directive 重复合并与报告-only（Content-Security-Policy-Report-Only）双栏对比。
- 冲突检测：检测互斥或易混指令（如 script-src 与 default-src 覆盖关系、upgrade-insecure-requests 与 block-all-mixed-content）；未知指令警告；`'unsafe-inline'`/`'unsafe-eval'`/`nonce-`/`hash-` 语法校验。
- 违规模拟：用户构造 document URL、inline script、外联 script/img 源，模拟是否被策略允许；输出 violated-directive 与 effective-directive 草稿 JSON（对齐 report 结构）。
- report-uri：解析 report-uri/report-to 字段；生成示例 violation report JSON 可复制；说明 Reporting API 与 legacy report-uri 差异。
- 单测：覆盖 directive 分词、源匹配（host/path/scheme/nonce/hash）、冲突规则表；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/csp-directive-parser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/csp-directive-parser/logic/`
- 测试文件夹：`devtools-web/src/tools/csp-directive-parser/__tests__/`
### API 信息
- 无外部 API；不发送真实 violation report。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/csp-directive-parser/` 目录内文件；不得修改 CORS 或 SRI 其它安全任务目录。
### 验收标准
- 指令表、冲突检测、违规模拟与 report 样例均可演示；单测覆盖源匹配与 hash/nonce；内置 strict/legacy 策略示例可用。
