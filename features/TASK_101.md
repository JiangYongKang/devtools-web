### 任务目标
- 核心校验：双栏输入 JSON 实例与 JSON Schema，支持 draft-04 / draft-07 / draft-2019-09 / draft-2020-12 切换；输出通过/失败、错误总数与首错摘要；大文本采用分片校验或 Worker 可选路径并在 UI 说明阈值。
- 组合与引用：解析并校验 `allOf`/`anyOf`/`oneOf`/`not` 组合语义；内联与远程 `$ref`（远程 ref 默认仅支持用户粘贴的 `#/definitions` 片段或同文档相对 ref，禁止自动外呼）；`$ref` 循环检测与 `$dynamicRef` 在 2020-12 下的最小支持说明。
- 错误定位：将 ajv 或自研校验器错误归一化为树形路径（JSON Pointer + 实例路径）；点击节点高亮实例与 schema 对应片段；支持「仅显示叶子错误」与「展开组合分支」切换。
- 示例与导出：内置至少三组样例（通过、类型错误、oneOf 冲突）；一键填充；校验报告可复制为 Markdown 或下载 JSON；schema 与 instance 各自独立复制/清空。
- 单测：覆盖 `$ref` 解析、`allOf`/`oneOf` 冲突聚合、错误路径归一化、draft 关键字差异表驱动；所有纯函数中文注释；非法 JSON 须返回行列定位信息。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/json-schema-validator-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/json-schema-validator-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/json-schema-validator-workbench/__tests__/`
### API 信息
- 无自动外呼；远程 `$ref` 若用户粘贴完整嵌套 schema 则按内联处理，否则提示需手动合并。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/json-schema-validator-workbench/` 目录内文件；不得修改其它 JSON 工具任务目录。
### 验收标准
- 四版 draft 切换与组合关键字样例均可逐条验收；错误树点击可定位；单测覆盖 ref 与 oneOf；大文本策略在页面有明确说明且非法 JSON 有行列提示。
