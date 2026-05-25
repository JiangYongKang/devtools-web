### 任务目标
- Diff 解析：粘贴 unified diff 或 git patch 文本，解析 file header（`---/+++`、`diff --git`）、hunk（`@@`）、行前缀 `+/-/ `；支持单文件与多文件 patch。
- 导航：hunk 列表侧边栏，点击跳转至对应 hunk 视图；检测文件重命名（`rename from/to` 或 similarity index 行）并标注。
- Apply 预览：对可选「目标文件原文」模拟 apply patch，输出合并结果或冲突列表（context 不匹配、hunk offset 失败）；不执行真实 git，纯文本层。
- 示例：内置「单文件修改」「多文件 patch」「apply 冲突」三组一键填充；非法 hunk header 定位；复制规范化 patch。
- 单测：覆盖 unified parse、hunk 行序列、rename 检测、apply 冲突分类；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/git-unified-diff-parser/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/git-unified-diff-parser/logic/`
- 测试文件夹：`devtools-web/src/tools/git-unified-diff-parser/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/git-unified-diff-parser/` 目录内文件；不得修改通用文本 diff 其它任务目录。
### 验收标准
- 多文件 parse、hunk 导航、rename 检测、apply 冲突预览均可演示；单测覆盖 parse 与 apply；示例可用。
