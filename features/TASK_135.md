### 任务目标
- 多文件格式化：虚拟文件树输入（多 tab 或文件列表），每文件独立内容；选择 Prettier options profile（printWidth、semi、singleQuote、trailingComma 等）批量 format。
- Diff 视图：每文件展示 format 前后 diff，支持并排/统一模式切换；汇总变更文件数与总增删行；可逐文件「接受/跳过」format 结果。
- 忽略模式：`.prettierignore` 风格 glob 对虚拟路径过滤（minimatch）；被忽略文件标注原因；profile 可保存至 localStorage（键名在本目录 constants）。
- 示例：内置「JS+JSON+MD 三文件」「宽行 wrap」「ignore 命中」三组一键填充；解析失败文件单独报错不阻塞其它文件。
- 单测：覆盖 profile 序列化、ignore glob、单文件 diff hunk 生成、批量汇总统计；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/prettier-multi-file-diff/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/prettier-multi-file-diff/logic/`
- 测试文件夹：`devtools-web/src/tools/prettier-multi-file-diff/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/prettier-multi-file-diff/` 目录内文件；不得修改通用 diff 工具其它任务目录。
### 验收标准
- 多文件 format、diff 模式、ignore glob、逐文件接受均可演示；单测覆盖 ignore 与 diff 统计；示例可用。
