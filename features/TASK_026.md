### 任务目标
- 离线解析 User-Agent 原始字符串，拆解出浏览器名称与主版本、渲染引擎、操作系统与设备类型（在规则库可覆盖范围内）、移动/桌面粗分、以及结构化键值表（从常见 `Key/Value` token 与括号片段中尽力抽取，未知段保留原样行）。
- 提供「原始」「展开表」「JSON 导出视图」三态切换；支持在展开表内就地搜索与高亮、一键复制各视图、以及对比模式（两条 UA 并排高亮差异字段）。
- 示例一键填入典型桌面、移动端、爬虫、空串与异常长串；超长 UA 的截断或虚拟列表策略与性能说明；对用户粘贴内容仅文本渲染防 XSS。
- 解析失败或不完整时返回 `errorCode` 与可读说明，并仍可展示原始全文与启发式分词；维护可单测的 UA 规则表或归一化管道于 `logic/`。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/user-agent-inspector/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/user-agent-inspector/logic/`
- 测试文件夹：`devtools-web/src/tools/user-agent-inspector/__tests__/`
### 前端实现说明
- 核心参数：`uaString`、`comparisonPairEnabled`、`secondUaString`、`searchToken`。
- 输出：`normalizedTable`、`summaryLine`、`jsonExportString`、`diffFields[]`、`errorCode`。
- 错误约定：`EMPTY_INPUT`、`MALFORMED`、`PARTIAL_PARSE`、`INPUT_TOO_LONG`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/user-agent-inspector/` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标四条均可逐条验收；示例与对比模式可用。
- 典型浏览器与机器人 UA 在当前规则下稳定出表；异常有提示。
- 纯逻辑单测覆盖归一化、对比 diff 与边界输入。
