### 任务目标
- 针对 bash/sh（及常见 zsh 兼容约定可在说明区注明假设）对用户输入的自由文本给出「置入双引号字面量」「单引号字面量」「无引号时需规避」三套下的转义后预览字符串，并列示各场景下空格、换行、`$`、反引号、`\`、`!`、`#`、通配与其它元字符的规则说明与高亮风险提示。
- 提供正向「原文→可粘贴进脚本的字面量片段」与反向「从日志或终端复制的已转义/引号包裹片段→拆解释读与等价展开说明」的一体化工作台；可选展示按字符或按 token 的规则拆解视图。
- 附分类速查区（空格与换行、变量展开 `$VAR`/`${}`, 命令替换, glob, history expansion 等与所选 shell 假设相关的条目）及示例一键填入（危险字符合集、可疑命令片段与安全对照范例）、一键复制各类输出与说明节选。
- 空输入与仅空白、极长文本的防抖或分块上限提示、非法或无法无二义解码的反向输入之错误说明、以及明示「不进行真实 subprocess 执行、仅以字符串规则演示」的非安全边界声明齐备。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/shell-escape-reference/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/shell-escape-reference/logic/`
- 测试文件夹：`devtools-web/src/tools/shell-escape-reference/__tests__/`
### 前端实现说明
- 核心参数：`rawText`、`shellProfile`（POSIX_BASH_LITE 等由逻辑常量定义）、`primaryQuoteStrategy`、`inverseMode`、`maxInputChars`。
- 输出：`quotedDouble`、`quotedSingle`、`bareLineGuidance`、`explainedSpans`、`riskMarkers`、`inverseExplanation`、`errorCode`、`errorMessage`。
- 错误约定：`NULL_INPUT`、`EMPTY_INPUT`、`INPUT_TOO_LARGE`、`UNBALANCED_QUOTES`、`AMBIGUOUS_ESCAPE`、`UNSUPPORTED_SHELL_FEATURE`。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/shell-escape-reference/` 目录下文件，不可读取、不可修改其他任务工具目录。
- 视图与编排留在页面组件，字符串解析、映射与注释文案生成放在 `logic/`。
### 验收标准
- 任务目标四条均可逐条在页面上操作或核对（含示例填充与反向模式）。
- 规则说明与转义预览在典型与边界样例上一致且无静默失败。
- `logic/` 内纯函数单测通过并覆盖正反变换、超限与若干错误枚举。
