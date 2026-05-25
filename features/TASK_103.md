### 任务目标
- 查询引擎：JMESPath 与 JSONPath（实现子集：`$`、`.`、`[]`、`*`、`..`、过滤 `[?()]` 可选）双语法 Tab；对单文档求值输出 JSON 树，命中路径高亮并可一键复制路径字符串。
- 批量模式：多文档 JSON Lines 或 JSON 数组输入，同一表达式逐条求值，汇总成功/失败条数与失败行号列表；结果区支持表格视图（路径、值预览、类型）。
- 编辑器体验：表达式语法错误定位至字符偏移；常用片段插入（投影、过滤、排序 `sort_by` 若 JMESPath 库支持）；历史表达式 localStorage 可选持久化（键名在本目录 constants 声明）。
- 示例：内置 JMESPath 官方风格样例（嵌套数组、多投影、管道）与 JSONPath 样例；一键填充文档+表达式；空结果与 `null` 传播说明。
- 单测：覆盖两种语法核心路径、批量模式错误行号、路径复制辅助函数；非法 JSON 与空表达式边界；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/json-query-expression-editor/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/json-query-expression-editor/logic/`
- 测试文件夹：`devtools-web/src/tools/json-query-expression-editor/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/json-query-expression-editor/` 目录内文件；不得修改 JSON 格式化或其它查询工具目录。
### 验收标准
- 双语法求值、路径高亮复制、批量失败行列表均可演示；单测覆盖表达式错误与批量汇总；示例一键填充可用。
