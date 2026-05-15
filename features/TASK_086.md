### 任务目标
- 纯前端有向图编辑：节点拖拽、磁吸对齐、多选框选、缩放平移画布；边支持折线/贝塞尔切换、箭头标记、自环与重边的可视化偏移；MiniMap 与适应视图。
- 自动布局：实现分层（Sugiyama 简化版）与力导向两种算法切换，支持「约束：同层节点」「固定根」；布局计算在 `Worker` 内可选，主线程降级；大图迭代上限与 ε 收敛判定可配置。
- 数据交换：导入/导出 JSON graph schema（`{ nodes:[{id,x,y}], edges:[{from,to,kind}] }`）；校验环检测（DAG 模式开关）、孤立节点提示；撤销/重做栈。
- 示例：「CI 流水线」「微服务依赖」「状态机」三套示例图一键载入；展示布局耗时统计。
- 纯逻辑与测试：图论工具 `detectCycle`、`topologicalSortLayers`、`routeOrthogonalEdge(a,b, obstacles)` 的单元测试；所有算法入口中文注释；禁止依赖付费图表 SaaS SDK。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/flow-dependency-graph-canvas/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/flow-dependency-graph-canvas/logic/`
- 测试文件夹：`devtools-web/src/platform/flow-dependency-graph-canvas/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/flow-dependency-graph-canvas/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 交互与双布局可验收；DAG 模式下成环导入被拦截并提示；单测覆盖环检测、拓扑层、边路由至少一种障碍物场景；Worker 不可用时布局仍完成。
