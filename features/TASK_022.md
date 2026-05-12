### 任务目标
- 接收用户输入的单字符、转义序列（如 `\uXXXX`、`\UXXXXXXXX`）、字面码点写法（如 `U+1F600`）、或短文片段，离线解析出其 Unicode 标量码点序列，并展示 UTF-16/UTF-8 字节十六进制预览、是否在 BMP、代理对拆分等辅助列。
- 对接 Unicode 数据集能力：在浏览器可行方案下提供码点官方名称、通用类别、块（Block）与双向/组合类等相关字段（若bundle体积累过大则按需懒加载分包，但须在任务范围内完成加载路径与离线映射表组织）；未知码点也需稳定降级展示。
- 提供「在当前文本中查找码点或小段」的简单搜索与高亮跳转、按键或按钮逐码点遍历、ASCII/非 ASCII 分段统计摘要、以及与剪贴板复制当前选中码点信息与整表导出式复制。
- 示例一键填入（含 emoji、组合字符序列、中英文混排、RTL 示例片段）、空输入降级、超长输入节流或 Worker 化处理策略说明、以及对用户粘贴内容的纯文本展示防 XSS。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/unicode-codepoint-explorer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/unicode-codepoint-explorer/logic/`
- 测试文件夹：`devtools-web/src/tools/unicode-codepoint-explorer/__tests__/`
### 前端实现说明
- 核心参数：`sourceText`、`searchQuery`、`iterationIndex`、`preferHexBytes`。
- 输出：`scalars[]`（每项含码点整数、字形回退占位、名称、类目、区块、utf8Hex、utf16Units）、`statistics`、`hydrationWarnings`、`errorCode`。
- 错误约定：`NULL_INPUT`、`INVALID_ESCAPE`、`OUT_OF_RANGE_CODE_POINT`、`PROPERTY_LOOKUP_FAILED`（仍可展示码点整数值）。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/unicode-codepoint-explorer/` 目录下文件，不可读取、不可修改其他任务工具目录。
- 数据分包与惰性加载的实现细节由页面与 `logic/` 分层协作，不得在 JSX 中堆叠重量级解析函数。
### 验收标准
- 任务目标四条均可操作验证；示例与搜索遍历工作正常。
- 组合序列与代理对与未知字符场景下表格不崩溃且有可读降级。
- 纯逻辑单测覆盖码点拆分、字面量解析、统计与边界错误枚举。
