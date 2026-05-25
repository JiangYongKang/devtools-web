### 任务目标
- 高级匹配：在基础正则验证之上，支持命名捕获、Lookahead/Lookbehind、原子组（若引擎支持）对样本文本匹配；展示捕获组树与各组 span 高亮。
- 回溯说明：对匹配路径输出简化 step  trace（尝试位置、回溯次数）；嵌套量词场景标注「潜在灾难性回溯」启发式警告（如 `(a+)+`）。
- 可视化：Lookahead/Lookbehind 区间在文本上用不同色带标注断言边界；零宽匹配位置竖线标记；超时/步数上限中断并提示。
- 示例：内置「命名捕获」「正向前瞻」「灾难性回溯样例（小文本）」三组一键填充；与任务 008 差异说明（本任务侧重引擎 internals 教学）。
- 单测：覆盖捕获组提取、lookahead 边界计算、回溯步数计数、灾难性启发式；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/regex-engine-advanced-debugger/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/regex-engine-advanced-debugger/logic/`
- 测试文件夹：`devtools-web/src/tools/regex-engine-advanced-debugger/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/regex-engine-advanced-debugger/` 目录内文件；不得修改基础正则验证任务目录实现文件。
### 验收标准
- 捕获组高亮、回溯 trace、lookahead 可视化、灾难性警告均可演示；单测覆盖捕获与启发式；示例可用。
