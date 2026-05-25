### 任务目标
- 模块对比：输入「打包前 ESM 源码模块集合」（虚拟文件）与 entry 点，模拟 tree-shaking 前后 export 引用图；展示被保留/被剔除 export 列表与理由（sideEffects:false/true、未引用、re-export 链）。
- sideEffects 标记：package.json `sideEffects` 字段模拟（boolean/array glob）；切换标记即时重算剔除结果；说明与 Rollup 语义差异边界。
- 体积估算：按模块字符数或 configurable 字节权重估算 shaking 前后总量与节省比例；未引用 export 表格可导出 CSV。
- 示例：内置「barrel file 重导出」「副作用 top-level 语句」「sideEffects 数组 glob」三组一键填充；循环依赖检测警告。
- 单测：覆盖 export 图构建、sideEffects glob 匹配、剔除判定、体积估算；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/tree-shaking-module-diff/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/tree-shaking-module-diff/logic/`
- 测试文件夹：`devtools-web/src/tools/tree-shaking-module-diff/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/tree-shaking-module-diff/` 目录内文件；不得修改 bundle stats 分析其它任务目录。
### 验收标准
- export 保留/剔除、sideEffects 切换、体积估算均可演示；单测覆盖 glob 与剔除；示例可用。
