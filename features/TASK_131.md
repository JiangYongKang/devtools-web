### 任务目标
- AST 解析：粘贴 JavaScript/JSX 源码，支持 Esprima 与 Babel parser 双引擎切换（含 `sourceType: module`、jsx/ts 可选说明）；解析失败定位至行列与 token 期望；大文件分片或行数上限策略说明。
- 节点树：可展开 AST 树视图，展示 type、loc、关键字段摘要；点击节点在源码区高亮对应 span（start/end）；支持按 type 过滤与搜索节点（如 `CallExpression`）。
- 位置跳转：双向联动——源码光标移动时定位最近 enclosing 节点；选中节点 JSON 导出（可配置深度与省略 loc）；复制节点 path（如 `body.0.body.1`）。
- 示例：内置「函数声明+调用」「JSX 元素」「async/await」三组一键填充；非法语法与严格模式 reserved 词样例；导出 JSON 下载。
- 单测：覆盖双 parser 入口、节点 path 生成、loc 区间包含判定、JSON 导出深度截断；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/javascript-ast-visualizer/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/javascript-ast-visualizer/logic/`
- 测试文件夹：`devtools-web/src/tools/javascript-ast-visualizer/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/javascript-ast-visualizer/` 目录内文件；不得修改 JavaScript 格式化/压缩其它任务目录。
### 验收标准
- 双引擎解析、树展开、源码双向跳转、节点 JSON 导出均可演示；单测覆盖 path 与 loc；示例可用。
