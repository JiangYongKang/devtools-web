### 任务目标
- 安全读取：实现 `getPath(obj, 'a.b[2].c', { default, strict })` 与 `setPathimmutable`（不修改原对象共享子树除外须文档说明策略）；支持 bracket 与混合转义；非法路径语法抛出带 offset 的诊断；禁止 `eval`。
- 表单绑定辅助：从扁平 `name="user.addresses[0].city"` 字符串双向映射到嵌套对象；数组通配 `items[].qty` 批量校验；集成轻量 schema（必填、类型、范围）并输出 `fieldErrors` 映射。
- 反查与 diff：给定新旧对象，输出变更路径列表（含数组 move 启发式或索引级 fallback）；支持「敏感字段路径」脱敏打印。
- 示例：三组 JSON（深嵌套、稀疏数组、Map-like 普通对象）一键加载；演示 strict 模式在 `null` 中间节点上的失败与默认分支。
- 单测：覆盖 Unicode 键、`__proto__` 污染防护、`constructor` 键、空路径、数组越界、`-0` 索引；所有导出函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/nested-property-path-toolkit/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/nested-property-path-toolkit/logic/`
- 测试文件夹：`devtools-web/src/platform/nested-property-path-toolkit/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/nested-property-path-toolkit/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 读写路径与表单映射可逐条验收；单测包含原型污染用例与 diff 输出稳定性；页面错误信息人类可读且可复制。
