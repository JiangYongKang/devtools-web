### 任务目标
- 解析调试：粘贴 YAML 源码，解析为 AST/对象并展示锚点（`&`）、别名（`*`）、合并键（`<<`）绑定关系；引用链有向图可视化（节点为锚点名，边为引用次数）；检测循环 alias 并报错路径。
- 结构浏览：树形视图区分「解析后展开对象」与「原始键序」；点击 alias 节点跳转至锚点定义行；支持 YAML↔JSON 双向预览（导出 JSON 时合并键展开策略可配置：深合并/浅覆盖）。
- 校验与定位：YAML 语法错误行列定位；重复键、未定义 alias、禁止的循环合并提示；大文件抽样解析或行数上限说明。
- 示例：内置「锚点+别名」「合并键继承」「循环引用失败」三组一键填充；复制规范化 YAML 与 JSON 导出下载。
- 单测：覆盖 alias 解析、合并键展开、循环检测、YAML 错误行列；所有纯函数中文注释；不依赖 DOM。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/yaml-anchor-alias-debugger/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/yaml-anchor-alias-debugger/logic/`
- 测试文件夹：`devtools-web/src/tools/yaml-anchor-alias-debugger/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/yaml-anchor-alias-debugger/` 目录内文件；不得修改 YAML/JSON 互换其它任务目录。
### 验收标准
- 引用链图、循环检测、合并键导出策略均可验收；语法错误可定位行列；单测覆盖 alias 与循环；示例按钮可用。
