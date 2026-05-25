### 任务目标
- Unary 调用：输入 gRPC-Web 或 Connect RPC 兼容 endpoint URL、service/method 名、Protobuf JSON 映射 request body、metadata 键值表；发起 unary 请求并展示 response JSON、grpc-status/trailers 或 Connect 错误详情；CORS 与 grpc-web 代理需求说明。
- 类型与映射：提供常用 well-known 类型 JSON 映射说明（Timestamp、Duration、Struct、Wrappers）；JSON 与 proto 字段名 camelCase/snake_case 切换提示；非法 JSON 行列定位。
- 错误码：映射 grpc-status code 到可读说明（OK/CANCELLED/INVALID_ARGUMENT/UNAVAILABLE 等）；Connect code 对照表；details 二进制字段 Base64 摘要展示。
- 示例：内置 echo/unary 风格 mock（本地 Connect-compatible handler 或文档化「需本地 proxy」两种路径择一实现并在 UI 标明）；health check 空 body 样例一键填充。
- 单测：覆盖 metadata 序列化、grpc-status 解析、Protobuf JSON 边界（int64 字符串、enum）；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/grpc-web-connect-playground/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/grpc-web-connect-playground/logic/`
- 测试文件夹：`devtools-web/src/tools/grpc-web-connect-playground/__tests__/`
### API 信息
- 用户指定 endpoint；若需 grpc-web 代理须在 TASK 实现说明中写清部署假设；禁止内置生产密钥。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/grpc-web-connect-playground/` 目录内文件；不得修改 HTTP 请求 Playground 或 GraphQL 工具其它任务目录。
### 验收标准
- request 构造、响应展示、错误码说明均可演示；单测覆盖 status 解析与 JSON 映射；示例与 CORS/代理限制在页面有明确说明。
