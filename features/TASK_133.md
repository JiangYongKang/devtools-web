### 任务目标
- 类型查询：粘贴 TypeScript 源码片段与 tsconfig 片段（compilerOptions 子集 JSON），创建内存 Program；对光标处或指定标识符执行 `typeToString` 展示类型文本、flags 摘要与 symbol 名称。
- d.ts 草稿：对选中类型或接口生成声明草稿（export、泛型参数、成员列表）；可复制与下载；说明「非完整 emit，仅供阅读」。
- 诊断：展示 TS 语法/语义 diagnostic 列表（code、message、行列）；点击跳转源码位置；strict 相关选项开关即时重算。
- 示例：内置「泛型推断」「联合窄化」「模块 re-export」三组一键填充；无法解析的外部 `@types` 依赖说明边界。
- 单测：覆盖 tsconfig 合并、typeToString 包装、diagnostic 归一化、d.ts 草稿生成关键形状；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/typescript-type-query-playground/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/typescript-type-query-playground/logic/`
- 测试文件夹：`devtools-web/src/tools/typescript-type-query-playground/__tests__/`
### API 信息
- 无外部 API；类型检查在浏览器内 WASM/JS 完成，不触网拉取类型包。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/typescript-type-query-playground/` 目录内文件；不得修改 Babel/AST 其它任务目录。
### 验收标准
- 类型打印、diagnostic 跳转、d.ts 草稿、tsconfig 开关均可演示；单测覆盖 diagnostic 与草稿形状；示例可用。
