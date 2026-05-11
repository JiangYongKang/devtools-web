### 任务目标
1. 提供 JWT 输入与解码展示页面，清晰展示 header、payload、signature 三段内容。
2. 在前端本地实现 JWT 解码流程，展示结构化 JSON、原始段内容和载荷截断状态等字段。
3. 在页面显式提示“仅解码未验签”，并对畸形 token 返回明确错误信息。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/task014/`（Token 输入、分段展示、JSON 展示、安全提示区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/task014/logic/`（段信息映射、警告文案、错误映射）。
- 测试文件夹：`devtools-web/src/tools/task014/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 输入参数：`token`。
- 输出字段：`isUnverifiedDecodeOnly`、`rawToken`、`headerSegment`、`headerJson`、`payloadSegment`、`payloadJson`、`payloadRaw`、`signatureSegment`、`securityWarning`、`payloadDisplayedLength`、`payloadTruncated`、`auditNote`。
- 错误约定：处理并展示 `NULL_INPUT`、`EMPTY_TOKEN`、`INVALID_SEGMENTS`、`MISSING_HEADER`、`MISSING_PAYLOAD`、`MISSING_SIGNATURE`、`BASE64URL_DECODE_FAILED`、`JSON_PARSE_FAILED`、`ALGORITHM_SEGMENT_INVALID`、`INVALID_PARAMETER`。
### 任务约束
- 当前任务只允许读取和修改 `task014` 目录下文件，不可读取、不可修改其他任务编号目录。
- 页面必须显式展示“仅解码未验签，不可用于安全决策”的提示，不允许弱化该边界。
### 验收标准
- 输入合法 JWT 时可展示三段内容和结构化 header/payload。
- 错误 token 场景可展示明确错误码与错误信息。
- 纯 JS 函数单测通过，覆盖分段渲染与安全提示文案逻辑。
