### 任务目标
- 内省查询：输入 GraphQL HTTP endpoint 与可选 headers（Authorization 等），发送标准 introspection query（或用户粘贴精简 query）；解析 `__schema` 为 types/queries/mutations/subscriptions 树；内省被禁用时的错误说明与替代方案（粘贴 SDL）。
- Schema 浏览：类型详情展示 fields、args、type、isDeprecated、deprecationReason；Query/Mutation 根字段列表搜索；点击字段生成示例 query 草稿（深度与参数 placeholder 可配置）。
- Deprecation：汇总全部 deprecated 字段列表；筛选仅 deprecated；生成迁移提示 Markdown（字段路径 + reason）。
- Cost 估算：基于用户可编辑的简单 cost 规则（scalar=1、object=子字段和、list=倍数）对当前 query 草稿做静态 cost 演示；说明与真实服务端 cost 插件可能不一致。
- 单测：覆盖 introspection 响应归一化、示例 query 生成、deprecation 收集、cost 递归计算上限；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/graphql-introspection-browser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/graphql-introspection-browser/logic/`
- 测试文件夹：`devtools-web/src/tools/graphql-introspection-browser/__tests__/`
### API 信息
- 用户指定 GraphQL endpoint；须处理 CORS 失败与 introspection 关闭场景；可选「仅 SDL 粘贴模式」无网络。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/graphql-introspection-browser/` 目录内文件；不得修改 GraphQL 查询排版（030）或其它 GraphQL 任务目录。
### 验收标准
- 内省树、示例 query 生成、deprecation 汇总与 cost 演示均可验收；SDL 离线模式可用；单测覆盖 query 生成与 cost；内置小型 schema JSON 示例可一键填充。
