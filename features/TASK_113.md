### 任务目标
- OpenAPI 浏览：粘贴 OpenAPI 3.0/3.1 JSON 或 YAML，解析为 paths、components.schemas、servers 树；语法错误定位行列；`$ref` 内联预览（同文档相对 ref，禁止自动外呼远程 URL）。
- 搜索与导航：按 path、method、operationId、schema 名全文搜索；点击 path 展示 parameters、requestBody、responses 摘要；schema 树展开 allOf/oneOf/enum/required。
- 示例请求：根据 operation 与 schema 生成示例 JSON body 与 query 参数表；可选 server 下拉切换 baseUrl；生成 fetch 草稿（不自动发送，仅复制）。
- Mock 预览：按 response schema 与 example 字段生成 mock JSON 预览；多 status code Tab 切换；缺失 schema 时提示并允许用户粘贴自定义 example。
- 单测：覆盖 YAML/JSON 双入口、path 索引、`$ref` 同文档解析、示例 body 生成；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/openapi-fragment-browser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/openapi-fragment-browser/logic/`
- 测试文件夹：`devtools-web/src/tools/openapi-fragment-browser/__tests__/`
### API 信息
- 无自动外呼；远程 `$ref` 须用户手动合并进文档后再解析。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/openapi-fragment-browser/` 目录内文件；不得修改 REST Mock 或 HTTP 客户端其它任务目录。
### 验收标准
- 文档树、搜索、示例请求与 mock 预览均可验收；单测覆盖 ref 与 path 索引；内置 Petstore 风格片段示例可用。
