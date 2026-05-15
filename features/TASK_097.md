### 任务目标
- 配置模型：实现 `FeatureContext`（静态 JSON 或模拟远程拉取）包含 `flags:{key:boolean|string|number}`、`experiments:{name:{variant,bucket}}`、`rules:[{when,then}]` 最小规则引擎（无图灵完备）；支持按用户伪 ID 稳定分桶（可复现哈希）。
- UI 矩阵：表格列出组件片段在「基线 / 变体 A / B」下的渲染快照（纯展示用小组件，如价格、按钮文案、布局列数）；支持强制覆盖变体用于验收；展示当前激活规则链路与命中原因。
- 与渲染边界：SSR 友好说明（本 SPA 任务内用 `useMemo` 锁定首次渲染）；闪烁抑制（骨架屏直到配置就绪）；所有解析函数中文注释。
- 示例：三组远程配置 JSON（灰度放量、紧急关停、分层实验）一键切换；展示「关停后 304 缓存」模拟开关。
- 单测：分桶稳定性、规则优先级与冲突解决、`evaluateFlag(key, ctx)` 全覆盖；时间相关规则用注入时钟。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/experiment-flag-ui-matrix/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/experiment-flag-ui-matrix/logic/`
- 测试文件夹：`devtools-web/src/platform/experiment-flag-ui-matrix/__tests__/`
### API 信息
- 可选模拟 `fetch('/mock-flags')` 在本目录用 MSW 风格内存 stub，不依赖真实后端。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/experiment-flag-ui-matrix/` 目录内文件；不得修改全局 feature 消费任务目录。
### 验收标准
- 变体矩阵与规则命中说明可逐条验收；单测覆盖分桶与冲突；紧急关停示例可见 UI 立即收敛。
