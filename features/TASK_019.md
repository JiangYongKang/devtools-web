### 任务目标
1. 提供 YAML 与 JSON 双向转换界面，支持转换方向切换与格式参数设置。
2. 在前端本地实现 `json/toYaml` 与 `yaml/toJson` 两个转换流程，展示输出内容及处理统计字段。
3. 对解析失败返回的行号、列号和路径信息进行可读展示，帮助用户快速定位问题。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/task019/`（双栏输入输出、方向切换、参数区、错误定位区）。
- 纯逻辑函数文件夹：`devtools-web/src/tools/task019/logic/`（参数组装、成功结果映射、错误定位映射）。
- 测试文件夹：`devtools-web/src/tools/task019/__tests__/`（仅覆盖纯 JS 函数）。
### 前端实现说明
- 转换参数：`input`、`indentStyle`、`indentWidth`、`quoteStyle`、`inlineStyle`、`keyOrder`、`maxNestingDepth`。
- 成功字段：`output`、`processedBytes`、`nestingDepth`、`version`。
- 错误字段：`errorCode`、`errorMessage`、`line`、`column`、`jsonPath`、`version`。
- 错误约定：处理并展示 `NULL_INPUT`、`EMPTY_INPUT`、`PARSE_FAILED`、`INVALID_INDENT`、`DUPLICATE_KEY`、`UNSUPPORTED_ANCHOR`、`UNSUPPORTED_ALIAS`、`UNSUPPORTED_TAG`、`UNSUPPORTED_MULTIDOC`、`NESTING_DEPTH_EXCEEDED`、`INPUT_TOO_LARGE`、`INVALID_PARAMETER`。
### 任务约束
- 当前任务只允许读取和修改 `task019` 目录下文件，不可读取、不可修改其他任务编号目录。
- 转换方向切换与输出展示在页面层，参数与错误定位解析在纯逻辑层。
### 验收标准
- 支持 JSON→YAML 与 YAML→JSON 双向流程，结果可复制。
- 解析失败时可展示行列号与路径定位信息。
- 纯 JS 函数单测通过，覆盖请求生成与错误定位映射。
