### 任务目标
- 支持标识符在 `camelCase`、`PascalCase`、`snake_case`、`SCREAMING_SNAKE`、`kebab-case`、`Train-Case` 等可选集之间互转（页内固定支持列表与「不支持则灰显」规则）；选项含连续大写缩写拆分策略（全大写块、首字母缩略词、Apple 风格等至少两种可切换）、数字附着规则（附着前段/后段/独立段）、首尾与连续下划线/连字符压缩策略。
- 支持批量多行：每行一个标识符、独立错误列、部分成功导出；支持「保留原始非字母数字字符」与「严格拒绝非法字符」模式；支持前缀/后缀剥离后再转换、可选命名空间分段（如 `foo.bar` 仅转最后一段）；支持从剪贴板粘贴 `a,b,c` 或 JSON 字符串数组解析（解析规则页内声明）。
- 提供可视化分词：展示拆分后的 token 列表与每步规则命中原因（Tooltips 或折叠面板）；提供「往返一致性检查」按钮（A→B→A 是否与规范化后 A 一致）；提供示例一键填充（`HTTPResponse`、`XML2JSON`、`__private` 等边界样例）。
- 支持 Unicode 标识符可选切片（页内声明是否允许非 ASCII 字母作为「字母」）；支持 `errorCode` 如 `EMPTY`、`INVALID_CHAR`、`AMBIGUOUS_ACRONYM`；大体量输入节流；复制全部结果与下载 `.txt`。
- 可选将最近使用的风格组合存 `localStorage`；可选 URL 查询参数恢复选项；所有输出纯文本防 XSS；单测须覆盖分词与风格映射核心，页面仅编排。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/identifier-case-converter/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/identifier-case-converter/logic/`
- 测试文件夹：`devtools-web/src/tools/identifier-case-converter/__tests__/`
### API 信息
- 无后端 HTTP 调用；分词与风格转换均在浏览器内完成。
### 任务约束
- 当前任务只允许读取和修改 `identifier-case-converter` 目录下文件，不可读取、不可修改其他任务工具目录。
### 验收标准
- 任务目标中多风格、多缩写策略、批量与部分成功、分词可视化、往返检查、示例与错误码均可逐条验收。
- 纯 JS 单测覆盖各风格对、连续大写、数字附着、非法字符与批量解析等导出函数。
