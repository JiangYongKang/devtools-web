### 任务目标
- 对用户输入的 GraphQL 查询/变更/订阅字符串进行离线缩进排版与压缩（去除多余空白与注释策略可选：保留 `#` 行注释或剥离须在 UI 可切换并说明对内联 string 的影响）、支持操作名与 fragment 块的基本结构对齐、以及错误定位到行列的语法粗校验（在自研或轻量解析器能力内尽力而为，无法 100% 语法完备时须在页内声明假设）。
- 提供关键字/名称/字符串/注释/变量定义区的语法高亮预览、折叠大纲（operation 与 fragment 列表）、全文与 selection 内搜索高亮、一键复制格式化与压缩结果、以及「diff」对比两次编辑内容（可复用项目内 diff 展示模式但实现须驻本目录）。
- 示例一键填入（含 fragment、变量、`@directive`、内联 fragment）、错误样例与修复提示、大体量查询的节流或 Worker 策略、以及将用户内容当纯文本渲染防 XSS。
- 对空输入、仅注释、非法括号/引号不平衡、重复 operation 名等给出 `errorCode` 与可读消息；所有列在任务目标内的 formatter 选项均有对应单测或快照级逻辑测试。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/graphql-query-formatter/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/graphql-query-formatter/logic/`
- 测试文件夹：`devtools-web/src/tools/graphql-query-formatter/__tests__/`
### 前端实现说明
- 核心参数：`source`、`mode`（FORMAT/COMPRESS）、`indentWidth`、`stripComments`、`validateOnly`。
- 输出：`formattedText`、`compressedText`、`highlights[]`、`outline[]`、`diagnostics[]`、`errorCode`。
- 错误约定：`EMPTY_INPUT`、`UNBALANCED_BRACKETS`、`UNTERMINATED_STRING`、`VALIDATION_FAILED`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/graphql-query-formatter/` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标四条均可逐条验收；示例与 diff 与高亮联动正确。
- 纯逻辑单测覆盖 format/compress/diagnose 主干与多条错误分支。
