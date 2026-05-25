### 任务目标
- Collection 导入：粘贴 Postman Collection v2.1 JSON，校验 `info.schema` 与 `item` 树；解析 folder/request 层级、method、url（raw/host/path/query）、headers、body（raw/urlencoded/formdata）；非法 JSON 行列定位。
- 环境变量：粘贴 Postman Environment JSON，建立 `{{var}}` 替换表；预览替换前后 URL 与 body；未定义变量高亮并列出缺失键名。
- 编排预览：以表格或时间线展示 collection 内全部请求顺序；支持按 folder 折叠；单条请求展开 auth、pre-request 脚本摘要（仅展示不执行脚本）。
- 断言摘要：解析 test 脚本或 pm.test 常见模式（status/code、body 字段存在性）为可读断言列表；无法静态解析的脚本标注「需运行时验证」。
- 单测：覆盖 v2.1 结构校验、变量替换、url 解析（host+path+query）、断言摘要正则；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/postman-collection-importer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/postman-collection-importer/logic/`
- 测试文件夹：`devtools-web/src/tools/postman-collection-importer/__tests__/`
### API 信息
- 无外部 API；不执行 collection 内脚本与实际 HTTP 请求。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/postman-collection-importer/` 目录内文件；不得修改 OpenAPI 浏览器或 HTTP Playground 其它任务目录。
### 验收标准
- Collection 树、环境变量替换、编排列表与断言摘要均可演示；单测覆盖变量替换与 URL 解析；内置 mini collection+environment 示例可用。
