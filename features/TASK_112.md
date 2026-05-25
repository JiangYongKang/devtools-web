### 任务目标
- cURL 解析：粘贴 cURL 命令（支持常见 `-X/-H/-d/--data-urlencode/-F/-u/-k/--proxy` 等），解析为统一请求模型（method、url、headers、query、body、auth、proxy、insecure）；语法错误定位至 token 片段。
- 代码生成：从请求模型生成 fetch（浏览器）、axios、got（Node）三种模板代码；可切换 async/await 与 Promise 风格；Header 与 body 类型映射说明（JSON/form/multipart 边界）。
- 反向转换：粘贴 fetch/axios/got 代码片段（限定常见子集），提取 URL、method、headers、body 草稿并生成等价 cURL；无法识别处标注需手动补全。
- 示例与交互：内置 GET+query、POST JSON、multipart 表单、Basic Auth 四组一键填充；各栏独立复制/清空；生成代码区语法高亮或等宽展示。
- 单测：覆盖 cURL token 解析、header 合并、body 类型推断、fetch/axios 往返关键字段；所有纯函数中文注释；不依赖 DOM。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/curl-http-code-converter/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/curl-http-code-converter/logic/`
- 测试文件夹：`devtools-web/src/tools/curl-http-code-converter/__tests__/`
### API 信息
- 无外部 API；代码生成仅为静态模板，不发起真实 HTTP 请求。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/curl-http-code-converter/` 目录内文件；不得修改 HTTP 请求 Playground 或 HAR 分析其它任务目录。
### 验收标准
- cURL→三语言与反向草稿均可演示；单测覆盖解析与生成；四组示例可用；multipart 与证书参数有边界说明。
